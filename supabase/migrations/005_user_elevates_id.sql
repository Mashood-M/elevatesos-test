-- ============================================================================
-- Migration: 005_user_elevates_id.sql
-- Description: Adds a short, human-readable unique ID (`elevates_id`) to every
--              user profile so they can be found quickly in any search section.
--              Format: ELV-XXXXXX  (6 alphanumeric chars, uppercase)
-- ============================================================================

-- 1. Add column (nullable first, we'll backfill then make NOT NULL)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS elevates_id TEXT UNIQUE;

-- 2. Helper function – generates a unique 6-char alphanumeric token
CREATE OR REPLACE FUNCTION public.generate_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I confusion
  result TEXT    := '';
  i      INT;
  attempts INT   := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    -- Ensure no collision (extremely unlikely but safe)
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE elevates_id = 'ELV-' || result);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'generate_elevates_id: too many collisions';
    END IF;
  END LOOP;
  RETURN 'ELV-' || result;
END;
$$;

-- 3. Backfill existing profiles that don't have an elevates_id yet
UPDATE public.profiles
SET    elevates_id = public.generate_elevates_id()
WHERE  elevates_id IS NULL;

-- 4. Now enforce NOT NULL + UNIQUE
ALTER TABLE public.profiles
  ALTER COLUMN elevates_id SET NOT NULL;

-- (UNIQUE constraint already applied by column definition above)

-- 5. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_elevates_id ON public.profiles (elevates_id);

-- 6. Trigger: auto-assign elevates_id on INSERT if not supplied
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
