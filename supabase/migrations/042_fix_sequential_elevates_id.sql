-- ============================================================================
-- Migration: 042_fix_sequential_elevates_id.sql
-- Description:
--   Permanently fixes Elevates ID generation across all sign-up pathways:
--   1. Ensures sequence public.profiles_elevates_id_seq exists and is synced.
--   2. Ensures public.format_elevates_id(n) correctly formats:
--        - 1..999    -> 'ELV-0001' .. 'ELV-0999' (e.g. 'ELV-0155')
--        - 1000..26999 -> 'ELV-A000' .. 'ELV-Z999'
--        - 27000..702999 -> 'ELV-AA00' .. 'ELV-ZZ99'
--   3. Replaces old random 6-char generator (which generated 'ELV-3VHC4E') with
--      the sequence-backed sequential generator.
--   4. Updates assign_elevates_id() trigger to sanitize and automatically replace
--      legacy random 6-character strings.
--   5. Fixes and renumbers any existing profiles in the database that have
--      legacy random IDs (such as 'ELV-3VHC4E').
--   6. Synchronizes updated elevates_id values to public.users table.
--   7. Also ensures chapters_elevates_id_seq & format_chapter_elevates_id are active.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure sequences exist
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.profiles_elevates_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.chapters_elevates_id_seq START WITH 1;

-- ----------------------------------------------------------------------------
-- STEP 2: Sequential Elevates ID Formatter for Users
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
  -- 1 to 999: 4 digits zero-padded (ELV-0001 to ELV-0999, e.g. ELV-0155)
  IF n < 1000 THEN
    RETURN 'ELV-' || LPAD(n::TEXT, 4, '0');

  -- 1,000 to 26,999: 1 letter + 3 digits (ELV-A000 to ELV-Z999 -> 26,000 members)
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;
    letter := chr(65 + letter_idx);
    rem := (n - 1000) % 1000;
    RETURN 'ELV-' || letter || LPAD(rem::TEXT, 3, '0');

  -- 27,000 to 702,999: 2 letters + 2 digits (ELV-AA00 to ELV-ZZ99 -> 676,000 members)
  ELSIF n < 703000 THEN
    two_letter_offset := (n - 27000) / 100;
    first_letter := chr(65 + (two_letter_offset / 26));
    second_letter := chr(65 + (two_letter_offset % 26));
    rem := (n - 27000) % 100;
    RETURN 'ELV-' || first_letter || second_letter || LPAD(rem::TEXT, 2, '0');

  -- Fallback for > 700k+
  ELSE
    RETURN 'ELV-' || LPAD(n::TEXT, 6, '0');
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 3: Sequential Elevates ID Formatter for Chapters
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
  IF n < 1000 THEN
    RETURN 'CHP-' || LPAD(n::TEXT, 4, '0');
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;
    letter := chr(65 + letter_idx);
    rem := (n - 1000) % 1000;
    RETURN 'CHP-' || letter || LPAD(rem::TEXT, 3, '0');
  ELSIF n < 703000 THEN
    two_letter_offset := (n - 27000) / 100;
    first_letter := chr(65 + (two_letter_offset / 26));
    second_letter := chr(65 + (two_letter_offset % 26));
    rem := (n - 27000) % 100;
    RETURN 'CHP-' || first_letter || second_letter || LPAD(rem::TEXT, 2, '0');
  ELSE
    RETURN 'CHP-' || LPAD(n::TEXT, 6, '0');
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 4: Sequence-Backed Generator Functions (with collision protection)
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
-- STEP 5: Trigger Functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Assign sequential ID if:
  -- - missing / empty
  -- - or formatted as legacy random 6-character string (e.g. ELV-3VHC4E) instead of sequential
  IF NEW.elevates_id IS NULL
     OR NEW.elevates_id = ''
     OR (NEW.elevates_id ~ '^ELV-[A-Z0-9]{6}$' AND NOT NEW.elevates_id ~ '^ELV-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})$') THEN
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
     OR (NEW.elevates_id ~ '^CHP-[A-Z0-9]{6}$' AND NOT NEW.elevates_id ~ '^CHP-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})$') THEN
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
-- STEP 6: Renumber / Fix Any Existing Profiles With Legacy Random IDs
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  new_seq_id TEXT;
  max_num INT := 0;
BEGIN
  -- First find max 4-digit sequential number currently in use
  SELECT COALESCE(MAX(SUBSTRING(elevates_id FROM 5)::INT), 0)
  INTO max_num
  FROM public.profiles
  WHERE elevates_id ~ '^ELV-[0-9]{4}$';

  -- Set sequence to at least the max 4-digit number or current count
  PERFORM setval(
    'public.profiles_elevates_id_seq',
    GREATEST(max_num, (SELECT COUNT(*) FROM public.profiles), 1)
  );

  -- Fix any profiles that have NULL, empty, or legacy random IDs (e.g. ELV-3VHC4E)
  FOR r IN
    SELECT id, email, elevates_id
    FROM public.profiles
    WHERE elevates_id IS NULL
       OR elevates_id = ''
       OR (elevates_id ~ '^ELV-[A-Z0-9]{6}$' AND NOT elevates_id ~ '^ELV-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})$')
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    new_seq_id := public.generate_elevates_id();
    
    UPDATE public.profiles
    SET elevates_id = new_seq_id
    WHERE id = r.id;

    -- Also keep public.users table in sync if present
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      UPDATE public.users
      SET elevates_id = new_seq_id
      WHERE id = r.id;
    END IF;

    RAISE NOTICE 'Fixed profile % (was %) -> new sequential ID: %', r.email, r.elevates_id, new_seq_id;
  END LOOP;

  -- Ensure chapter sequence is also synchronized
  PERFORM setval(
    'public.chapters_elevates_id_seq',
    GREATEST((SELECT COUNT(*) FROM public.chapters), 1)
  );
END $$;

-- ----------------------------------------------------------------------------
-- STEP 7: Re-verify indexes
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_elevates_id_unique ON public.profiles (elevates_id);
CREATE INDEX IF NOT EXISTS idx_profiles_elevates_id_lower ON public.profiles (LOWER(elevates_id));
CREATE INDEX IF NOT EXISTS idx_profiles_elevates_id ON public.profiles (elevates_id);
