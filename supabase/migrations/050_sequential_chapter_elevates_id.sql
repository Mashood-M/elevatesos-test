-- ============================================================================
-- Migration: 050_sequential_chapter_elevates_id.sql
-- Description:
--   Enforces sequential Chapter Elevates ID generation:
--   1. Sequence 1 to 999: 4 digits zero-padded ('CHP-0001' .. 'CHP-0999')
--   2. Above 1,000 (1,000 to 26,999): First character rolls over to a letter (A through Z)
--      followed by 3 digits: 'CHP-A000' .. 'CHP-Z999' (26,000 chapters)
--   3. Above 27,000: Two letters + 2 digits: 'CHP-AA00' .. 'CHP-ZZ99' (67,600 chapters)
--   4. Existing chapters in your database are renumbered chronologically by creation date (created_at).
--   5. New chapters automatically receive the next sequential ID on insert via a Supabase sequence and trigger.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure sequence exists
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.chapters_elevates_id_seq START WITH 1;

-- ----------------------------------------------------------------------------
-- STEP 2: Function to format sequence number into sequential Chapter Elevates ID
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
  -- 1 to 999: 4 digits padded with zeros (CHP-0001 to CHP-0999)
  IF n < 1000 THEN
    RETURN 'CHP-' || LPAD(n::TEXT, 4, '0');

  -- 1,000 to 26,999: 1 letter + 3 digits (CHP-A000 to CHP-Z999 -> 26,000 chapters)
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;
    letter := chr(65 + letter_idx);
    rem := (n - 1000) % 1000;
    RETURN 'CHP-' || letter || LPAD(rem::TEXT, 3, '0');

  -- 27,000 to 94,599: 2 letters + 2 digits (CHP-AA00 to CHP-ZZ99 -> 67,600 chapters)
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
-- STEP 3: Sequence-Backed Generator Function (with collision protection)
-- ----------------------------------------------------------------------------
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
-- STEP 4: Trigger Function for Chapter Inserts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_chapter_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Assign sequential ID if:
  -- - missing / empty
  -- - or formatted as random legacy string instead of sequential CHP-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})
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
-- STEP 5: Renumber Existing Chapters Chronologically by created_at
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  seq_num INT := 0;
  new_chp_id TEXT;
BEGIN
  -- Temporarily drop unique index/constraints to avoid collisions during renumbering
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id_unique;
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id_lower;
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id;

  -- Renumber all chapters strictly chronologically by created_at, founded_at, name, id
  FOR r IN
    SELECT id, created_at, founded_at, elevates_id
    FROM public.chapters
    ORDER BY created_at ASC NULLS LAST, founded_at ASC NULLS LAST, name ASC, id ASC
  LOOP
    seq_num := seq_num + 1;
    new_chp_id := public.format_chapter_elevates_id(seq_num);

    UPDATE public.chapters
    SET elevates_id = new_chp_id
    WHERE id = r.id;

    RAISE NOTICE 'Renumbered chapter % (was %) -> %', r.id, r.elevates_id, new_chp_id;
  END LOOP;

  -- Set sequence to current count of chapters
  PERFORM setval(
    'public.chapters_elevates_id_seq',
    GREATEST(seq_num, (SELECT COUNT(*) FROM public.chapters), 1)
  );

  -- Re-create unique and performance indexes
  CREATE UNIQUE INDEX idx_chapters_elevates_id_unique ON public.chapters (elevates_id);
  CREATE INDEX idx_chapters_elevates_id_lower ON public.chapters (LOWER(elevates_id));
  CREATE INDEX idx_chapters_elevates_id ON public.chapters (elevates_id);
END $$;
