-- ============================================================================
-- Migration: 015_sequential_chapter_elevates_id.sql
-- Description:
--   Switches chapter elevates_id generation to sequential order:
--   1. Sequence 1 to 999: 4 digits zero-padded ('CHP-0001' .. 'CHP-0999')
--   2. Reaching 1,000: first digit becomes a letter ('CHP-A000' .. 'CHP-Z999' -> 26,000 chapters)
--   3. Above 27,000: 2 letters + 2 digits ('CHP-AA00' .. 'CHP-ZZ99' -> 676,000+ chapters)
--   4. Renumbers existing chapters chronologically by created_at / founded_at.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Function to format integer sequence into sequential Chapter Elevates ID
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

  -- 1000 to 26999: 1 letter + 3 digits (CHP-A000 to CHP-Z999, 26,000 chapters)
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;  -- 0 to 25
    letter := chr(65 + letter_idx);    -- 'A' to 'Z'
    rem := (n - 1000) % 1000;          -- 0 to 999
    RETURN 'CHP-' || letter || LPAD(rem::TEXT, 3, '0');

  -- 27000 to 702999: 2 letters + 2 digits (CHP-AA00 to CHP-ZZ99, 676,000 chapters)
  ELSIF n < 703000 THEN
    two_letter_offset := (n - 27000) / 100;
    first_letter := chr(65 + (two_letter_offset / 26));
    second_letter := chr(65 + (two_letter_offset % 26));
    rem := (n - 27000) % 100;
    RETURN 'CHP-' || first_letter || second_letter || LPAD(rem::TEXT, 2, '0');

  -- Fallback for > 700k+
  ELSE
    RETURN 'CHP-' || LPAD(n::TEXT, 6, '0');
  END IF;
END;
$$;


-- ----------------------------------------------------------------------------
-- STEP 2: Create sequence for chapter elevates_id
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.chapters_elevates_id_seq START WITH 1;


-- ----------------------------------------------------------------------------
-- STEP 3: Renumber existing chapters chronologically
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Temporarily drop unique constraints/indexes to avoid collision during renumbering
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id_unique;
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id_lower;
  DROP INDEX IF EXISTS public.idx_chapters_elevates_id;
  
  -- Renumber all chapters in chronological order
  WITH ordered_chapters AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY 
          created_at ASC NULLS LAST,
          founded_at ASC NULLS LAST,
          name ASC,
          id ASC
      ) AS row_num
    FROM public.chapters
  )
  UPDATE public.chapters c
  SET elevates_id = public.format_chapter_elevates_id(oc.row_num)
  FROM ordered_chapters oc
  WHERE c.id = oc.id;

  -- Re-create unique and performance indexes
  CREATE UNIQUE INDEX idx_chapters_elevates_id_unique ON public.chapters (elevates_id);
  CREATE INDEX idx_chapters_elevates_id_lower ON public.chapters (LOWER(elevates_id));
  CREATE INDEX idx_chapters_elevates_id ON public.chapters (elevates_id);
END $$;


-- ----------------------------------------------------------------------------
-- STEP 4: Set the sequence to the current count of chapters
-- ----------------------------------------------------------------------------
SELECT setval(
  'public.chapters_elevates_id_seq',
  GREATEST((SELECT COUNT(*) FROM public.chapters), 1)
);


-- ----------------------------------------------------------------------------
-- STEP 5: Update generate_chapter_elevates_id to use the sequence
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_chapter_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.chapters_elevates_id_seq');
  RETURN public.format_chapter_elevates_id(next_val);
END;
$$;


-- ----------------------------------------------------------------------------
-- STEP 6: Ensure trigger is active on INSERT
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_chapter_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.elevates_id IS NULL OR NEW.elevates_id = '' THEN
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
-- STEP 7: Verify updated chapters
-- ----------------------------------------------------------------------------
SELECT id, elevates_id, name, slug, short_code, created_at
FROM public.chapters
ORDER BY elevates_id ASC;
