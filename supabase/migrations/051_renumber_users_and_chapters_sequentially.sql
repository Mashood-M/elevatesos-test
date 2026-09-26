-- ============================================================================
-- Migration: 051_renumber_users_and_chapters_sequentially.sql
-- Description:
--   1. Ensures sequences and formatting functions for Users (ELV-XXXX) and Chapters (CHP-XXXX).
--   2. Renumbers all existing users chronologically starting from 1 (ELV-0001, ELV-0002, ...).
--   3. Renumbers all existing chapters chronologically starting from 1 (CHP-0001, CHP-0002, ...).
--   4. Synchronizes sequences (profiles_elevates_id_seq & chapters_elevates_id_seq) to the
--      current counts so new signups/creations increment seamlessly from that number.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure Sequences Exist
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.profiles_elevates_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.chapters_elevates_id_seq START WITH 1;

-- ----------------------------------------------------------------------------
-- STEP 2: Sequential Formatter for User Elevates ID (ELV-XXXX)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.format_elevates_id(n BIGINT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  letter_idx INT;
  letter CHAR(1);
  rem INT;
  first_letter CHAR(1);
  second_letter CHAR(1);
  two_letter_offset INT;
BEGIN
  -- 1 to 999: Sequential 4 digits zero-padded ('ELV-0001' .. 'ELV-0999')
  IF n < 1000 THEN
    RETURN 'ELV-' || LPAD(n::TEXT, 4, '0');

  -- 1,000 to 26,999: 1 letter + 3 digits ('ELV-A000' .. 'ELV-Z999')
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;
    letter := chr(65 + letter_idx);
    rem := (n - 1000) % 1000;
    RETURN 'ELV-' || letter || LPAD(rem::TEXT, 3, '0');

  -- 27,000 to 94,599: 2 letters + 2 digits ('ELV-AA00' .. 'ELV-ZZ99')
  ELSIF n < 94600 THEN
    two_letter_offset := (n - 27000) / 100;
    first_letter := chr(65 + (two_letter_offset / 26));
    second_letter := chr(65 + (two_letter_offset % 26));
    rem := (n - 27000) % 100;
    RETURN 'ELV-' || first_letter || second_letter || LPAD(rem::TEXT, 2, '0');

  -- Fallback for >= 94,600
  ELSE
    RETURN 'ELV-' || LPAD(n::TEXT, 6, '0');
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 3: Sequential Formatter for Chapter Elevates ID (CHP-XXXX)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.format_chapter_elevates_id(n BIGINT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  letter_idx INT;
  letter CHAR(1);
  rem INT;
  first_letter CHAR(1);
  second_letter CHAR(1);
  two_letter_offset INT;
BEGIN
  -- 1 to 999: Sequential 4 digits zero-padded ('CHP-0001' .. 'CHP-0999')
  IF n < 1000 THEN
    RETURN 'CHP-' || LPAD(n::TEXT, 4, '0');

  -- 1,000 to 26,999: 1 letter + 3 digits ('CHP-A000' .. 'CHP-Z999')
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;
    letter := chr(65 + letter_idx);
    rem := (n - 1000) % 1000;
    RETURN 'CHP-' || letter || LPAD(rem::TEXT, 3, '0');

  -- 27,000 to 94,599: 2 letters + 2 digits ('CHP-AA00' .. 'CHP-ZZ99')
  ELSIF n < 94600 THEN
    two_letter_offset := (n - 27000) / 100;
    first_letter := chr(65 + (two_letter_offset / 26));
    second_letter := chr(65 + (two_letter_offset % 26));
    rem := (n - 27000) % 100;
    RETURN 'CHP-' || first_letter || second_letter || LPAD(rem::TEXT, 2, '0');

  -- Fallback for >= 94,600
  ELSE
    RETURN 'CHP-' || LPAD(n::TEXT, 6, '0');
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 4: Sequence-Backed Generator Functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  next_val BIGINT;
  candidate TEXT;
BEGIN
  LOOP
    next_val := nextval('public.profiles_elevates_id_seq');
    candidate := public.format_elevates_id(next_val);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE elevates_id = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_chapter_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  next_val BIGINT;
  candidate TEXT;
BEGIN
  LOOP
    next_val := nextval('public.chapters_elevates_id_seq');
    candidate := public.format_chapter_elevates_id(next_val);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chapters WHERE elevates_id = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 5: Trigger Functions & Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.elevates_id IS NULL
     OR NEW.elevates_id = ''
     OR (NOT NEW.elevates_id ~ '^ELV-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})$') THEN
    NEW.elevates_id := public.generate_elevates_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_profile_insert_assign_elevates_id ON public.profiles;
CREATE TRIGGER before_profile_insert_assign_elevates_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_elevates_id();

CREATE OR REPLACE FUNCTION public.assign_chapter_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.elevates_id IS NULL
     OR NEW.elevates_id = ''
     OR (NOT NEW.elevates_id ~ '^CHP-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})$') THEN
    NEW.elevates_id := public.generate_chapter_elevates_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_chapter_insert_assign_elevates_id ON public.chapters;
CREATE TRIGGER before_chapter_insert_assign_elevates_id
  BEFORE INSERT ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.assign_chapter_elevates_id();

-- ----------------------------------------------------------------------------
-- STEP 6: Clean Renumbering of Existing Users & Chapters
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  user_num INT := 0;
  chp_num INT := 0;
  new_id TEXT;
BEGIN
  -- 1. Temporarily drop unique constraints/indexes to prevent collisions during renumbering
  DROP INDEX IF EXISTS public.idx_profiles_elevates_id_unique;
  DROP INDEX IF EXISTS public.idx_profiles_elevates_id_lower;
  DROP INDEX IF EXISTS public.idx_profiles_elevates_id;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_elevates_id_key;

  DROP INDEX IF EXISTS public.idx_chapters_elevates_id_unique;
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id_lower;
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id;
  ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_elevates_id_key;

  -- 2. Stage temporary prefixes so no two rows collide while sequentially updating
  UPDATE public.profiles SET elevates_id = 'TEMP-' || id;
  UPDATE public.chapters SET elevates_id = 'TEMP-' || id;

  -- 3. Renumber all user profiles chronologically from 1 (ELV-0001, ELV-0002, ...)
  FOR r IN
    SELECT id, created_at
    FROM public.profiles
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    user_num := user_num + 1;
    new_id := public.format_elevates_id(user_num);

    UPDATE public.profiles
    SET elevates_id = new_id
    WHERE id = r.id;

    -- Synchronize public.users table if it exists in the schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      UPDATE public.users
      SET elevates_id = new_id
      WHERE id = r.id;
    END IF;
  END LOOP;

  -- Set profiles sequence so the next new signup receives exactly user_num + 1
  IF user_num > 0 THEN
    PERFORM setval('public.profiles_elevates_id_seq', user_num, true);
  ELSE
    PERFORM setval('public.profiles_elevates_id_seq', 1, false);
  END IF;

  -- 4. Renumber all chapters chronologically from 1 (CHP-0001, CHP-0002, ...)
  FOR r IN
    SELECT id, created_at, founded_at, name
    FROM public.chapters
    ORDER BY created_at ASC NULLS LAST, founded_at ASC NULLS LAST, name ASC, id ASC
  LOOP
    chp_num := chp_num + 1;
    new_id := public.format_chapter_elevates_id(chp_num);

    UPDATE public.chapters
    SET elevates_id = new_id
    WHERE id = r.id;
  END LOOP;

  -- Set chapters sequence so the next new chapter receives exactly chp_num + 1
  IF chp_num > 0 THEN
    PERFORM setval('public.chapters_elevates_id_seq', chp_num, true);
  ELSE
    PERFORM setval('public.chapters_elevates_id_seq', 1, false);
  END IF;

  -- 5. Recreate unique and performance indexes
  CREATE UNIQUE INDEX idx_profiles_elevates_id_unique ON public.profiles (elevates_id);
  CREATE INDEX idx_profiles_elevates_id_lower ON public.profiles (LOWER(elevates_id));
  CREATE INDEX idx_profiles_elevates_id ON public.profiles (elevates_id);

  CREATE UNIQUE INDEX idx_chapters_elevates_id_unique ON public.chapters (elevates_id);
  CREATE INDEX idx_chapters_elevates_id_lower ON public.chapters (LOWER(elevates_id));
  CREATE INDEX idx_chapters_elevates_id ON public.chapters (elevates_id);

  RAISE NOTICE 'SUCCESS: Renumbered % profiles and % chapters sequentially starting from 1.', user_num, chp_num;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 7: Status Verification Query
-- ----------------------------------------------------------------------------
SELECT 
  'Profiles (Users)' AS entity,
  COUNT(*) AS total_count,
  MIN(elevates_id) AS lowest_id,
  MAX(elevates_id) AS highest_id,
  last_value AS next_sequence_number
FROM public.profiles, public.profiles_elevates_id_seq
GROUP BY last_value
UNION ALL
SELECT 
  'Chapters' AS entity,
  COUNT(*) AS total_count,
  MIN(elevates_id) AS lowest_id,
  MAX(elevates_id) AS highest_id,
  last_value AS next_sequence_number
FROM public.chapters, public.chapters_elevates_id_seq
GROUP BY last_value;
