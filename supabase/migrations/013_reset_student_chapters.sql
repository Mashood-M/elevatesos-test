-- ============================================================================
-- Migration: 013_reset_student_chapters.sql
-- Description:
--   1. Reset all non-HQ users to have role 'student' and chapter_id = NULL
--      (founder@elevates.live and admin@elevates.live remain untouched).
--   2. Add short_code & campus_lead_id columns to public.chapters and populate
--      default 3-letter shortcodes:
--      - School of Science -> SOS
--      - National Institute of Technology / nit -> NIT
--      - Eranad Knowledge City -> EKC
--      - Malabar Christian College -> MCC
--      - Elevates Test Chapter -> ETC
--   3. Create public.chapter_invite_uses table to track every student who
--      joins using a chapter invite code permanently.
--   4. Recount chapter member counts (which will become 0 for all chapters).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add short_code & campus_lead_id columns to public.chapters
-- ----------------------------------------------------------------------------
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS short_code TEXT;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS campus_lead_id UUID;

COMMENT ON COLUMN public.chapters.short_code IS '3-letter uppercase shortform prefix for student invite codes (e.g. SOS, NIT, EKC)';

-- Populate 3-letter shortcodes for known chapters
UPDATE public.chapters
SET short_code = 'SOS',
    custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{short_code}', '"SOS"')
WHERE slug = 'school-of-science' OR LOWER(name) LIKE '%school of science%';

UPDATE public.chapters
SET short_code = 'NIT',
    custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{short_code}', '"NIT"')
WHERE slug = 'nit' OR LOWER(name) LIKE '%nit%';

UPDATE public.chapters
SET short_code = 'EKC',
    custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{short_code}', '"EKC"')
WHERE slug = 'eranad-knowledge-city' OR LOWER(name) LIKE '%eranad%';

UPDATE public.chapters
SET short_code = 'MCC',
    custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{short_code}', '"MCC"')
WHERE slug = 'malabar-christian-college' OR LOWER(name) LIKE '%malabar%';

UPDATE public.chapters
SET short_code = 'ETC',
    custom_settings = jsonb_set(COALESCE(custom_settings, '{}'::jsonb), '{short_code}', '"ETC"')
WHERE slug = 'test-chapter' OR LOWER(name) LIKE '%test chapter%';

-- Fallback for any other existing chapters without a shortcode (first 3 chars of name)
UPDATE public.chapters
SET short_code = UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3))
WHERE short_code IS NULL OR short_code = '';


-- ----------------------------------------------------------------------------
-- STEP 2: Create chapter_invite_uses table to store students joined per code
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_invite_uses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_token_id UUID REFERENCES public.invite_tokens(id) ON DELETE SET NULL,
  code            TEXT NOT NULL,
  chapter_id      UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department      TEXT,
  year            TEXT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chapter_invite_student UNIQUE (chapter_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_invite_uses_code ON public.chapter_invite_uses(code);
CREATE INDEX IF NOT EXISTS idx_chapter_invite_uses_chapter ON public.chapter_invite_uses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_invite_uses_user ON public.chapter_invite_uses(user_id);

ALTER TABLE public.chapter_invite_uses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/service role users to read and insert join usages
DROP POLICY IF EXISTS "chapter_invite_uses_read" ON public.chapter_invite_uses;
CREATE POLICY "chapter_invite_uses_read" ON public.chapter_invite_uses FOR SELECT USING (true);

DROP POLICY IF EXISTS "chapter_invite_uses_insert" ON public.chapter_invite_uses;
CREATE POLICY "chapter_invite_uses_insert" ON public.chapter_invite_uses FOR INSERT WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- STEP 3: Reset Student Chapter State in Supabase
--         Preserve HQ Founder (founder@elevates.live) & HQ Admin (admin@elevates.live)
-- ----------------------------------------------------------------------------

-- 1. Unassign all student profiles from chapters
UPDATE public.profiles
SET chapter_id = NULL,
    status = 'active'
WHERE email NOT IN ('founder@elevates.live', 'admin@elevates.live');

-- 2. Reset user roles to 'student' with no chapter assignment
UPDATE public.user_roles ur
SET chapter_id = NULL,
    role_key = 'student',
    role_id = (SELECT id FROM public.roles WHERE key = 'student' LIMIT 1)
WHERE ur.user_id IN (
  SELECT id FROM public.profiles 
  WHERE email NOT IN ('founder@elevates.live', 'admin@elevates.live')
);

-- 3. Clear leadership assignments for non-HQ users
DELETE FROM public.leadership_assignments
WHERE user_id IN (
  SELECT id FROM public.profiles 
  WHERE email NOT IN ('founder@elevates.live', 'admin@elevates.live')
);

-- 4. Clear class representative assignments (safely handles rep_ids array or class_rep_id column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'class_cohorts' AND column_name = 'rep_ids'
  ) THEN
    UPDATE public.class_cohorts SET rep_ids = '{}';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'class_cohorts' AND column_name = 'class_rep_id'
  ) THEN
    EXECUTE 'UPDATE public.class_cohorts SET class_rep_id = NULL;';
  END IF;
END $$;

-- 5. Clear campus lead & faculty coordinator on chapters
UPDATE public.chapters
SET campus_lead_id = NULL,
    faculty_id = NULL,
    custom_settings = COALESCE(custom_settings, '{}'::jsonb) - 'campus_lead_id' - 'campusLeadId' - 'faculty_id' - 'facultyId';

-- 6. Recount all chapter members (should all become 0 now)
UPDATE public.chapters c
SET member_count = (
  SELECT COUNT(*) FROM public.profiles p WHERE p.chapter_id = c.id
);


-- ----------------------------------------------------------------------------
-- STEP 4: Verification Queries (Check the result)
-- ----------------------------------------------------------------------------

-- Check all chapters: member counts should be 0 and short_code populated
SELECT id, name, slug, short_code, member_count,
       (SELECT COUNT(*) FROM public.profiles WHERE chapter_id = chapters.id) AS actual_profiles_count
FROM public.chapters
ORDER BY name ASC;

-- Check non-HQ profiles: all chapter_id should now be NULL
SELECT id, elevates_id, full_name, email, chapter_id
FROM public.profiles
ORDER BY email ASC;
