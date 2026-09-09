-- ============================================================================
-- Migration: 012_chapter_members_sync.sql
-- Description: Synchronizes chapter members from profiles to chapters, creates
--              automatic counting triggers, ensures unique elevates_id / member
--              numbers, and establishes RLS policies for chapter member access.
-- ============================================================================

-- 1. Ensure columns and indexes exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS elevates_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_chapter_id ON public.profiles (chapter_id);
CREATE INDEX IF NOT EXISTS idx_profiles_elevates_id ON public.profiles (elevates_id);

-- 2. Ensure member_count column exists on public.chapters
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;

-- 3. Helper function: generate unique 6-character elevates_id (ELV-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars    TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- unambiguous characters
  result   TEXT := '';
  i        INT;
  attempts INT  := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE elevates_id = 'ELV-' || result);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'generate_elevates_id: too many collisions';
    END IF;
  END LOOP;
  RETURN 'ELV-' || result;
END;
$$;

-- 4. Backfill any existing profiles missing elevates_id
UPDATE public.profiles
SET elevates_id = public.generate_elevates_id()
WHERE elevates_id IS NULL OR elevates_id = '';

-- 5. Trigger to automatically assign elevates_id before profile insertion if missing
CREATE OR REPLACE FUNCTION public.assign_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.elevates_id IS NULL OR NEW.elevates_id = '' THEN
    NEW.elevates_id := public.generate_elevates_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_profile_insert_assign_elevates_id ON public.profiles;
CREATE TRIGGER before_profile_insert_assign_elevates_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_elevates_id();

-- 6. Trigger to automatically keep chapters.member_count synchronized with public.profiles
CREATE OR REPLACE FUNCTION public.sync_chapter_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.chapter_id IS NOT NULL THEN
    UPDATE public.chapters
    SET member_count = (
      SELECT count(*) FROM public.profiles WHERE chapter_id = NEW.chapter_id
    )
    WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.chapter_id IS DISTINCT FROM NEW.chapter_id THEN
      IF OLD.chapter_id IS NOT NULL THEN
        UPDATE public.chapters
        SET member_count = (
          SELECT count(*) FROM public.profiles WHERE chapter_id = OLD.chapter_id
        )
        WHERE id = OLD.chapter_id;
      END IF;
      IF NEW.chapter_id IS NOT NULL THEN
        UPDATE public.chapters
        SET member_count = (
          SELECT count(*) FROM public.profiles WHERE chapter_id = NEW.chapter_id
        )
        WHERE id = NEW.chapter_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.chapter_id IS NOT NULL THEN
    UPDATE public.chapters
    SET member_count = (
      SELECT count(*) FROM public.profiles WHERE chapter_id = OLD.chapter_id
    )
    WHERE id = OLD.chapter_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chapter_member_count ON public.profiles;
CREATE TRIGGER trg_sync_chapter_member_count
  AFTER INSERT OR UPDATE OF chapter_id OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_chapter_member_count();

-- 7. Immediate Data Synchronization: update member_count for all existing chapters
UPDATE public.chapters c
SET member_count = COALESCE(
  (SELECT count(*) FROM public.profiles p WHERE p.chapter_id = c.id),
  0
);

-- 8. Ensure authenticated users can read chapter members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Allow authenticated users to read chapter profiles'
  ) THEN
    CREATE POLICY "Allow authenticated users to read chapter profiles"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- 9. Verification Query (Inspect member counts and profiles)
-- Run this in Supabase SQL editor to verify your chapters and profile numbers:
-- SELECT c.id, c.name, c.slug, c.member_count AS stored_count, count(p.id) AS actual_profiles
-- FROM public.chapters c
-- LEFT JOIN public.profiles p ON p.chapter_id = c.id
-- GROUP BY c.id, c.name, c.slug, c.member_count
-- ORDER BY c.name;
