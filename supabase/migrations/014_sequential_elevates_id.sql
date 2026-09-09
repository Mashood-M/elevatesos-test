-- ============================================================================
-- Migration: 014_sequential_elevates_id.sql
-- Description:
--   Switches elevates_id generation to sequential order:
--   1. Sequence 1 to 999: 4 digits zero-padded ('ELV-0001' .. 'ELV-0999')
--   2. Reaching 1,000: first digit becomes a letter ('ELV-A000' .. 'ELV-Z999' -> 26,000 users)
--   3. Above 27,000: 2 letters + 2 digits ('ELV-AA00' .. 'ELV-ZZ99' -> 676,000+ users)
--   4. Renumbers existing profiles chronologically by created_at.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Function to format integer sequence into sequential Elevates ID
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
  -- 1 to 999: 4 digits padded with zeros (ELV-0001 to ELV-0999)
  IF n < 1000 THEN
    RETURN 'ELV-' || LPAD(n::TEXT, 4, '0');

  -- 1000 to 26999: 1 letter + 3 digits (ELV-A000 to ELV-Z999, 26,000 users)
  ELSIF n < 27000 THEN
    letter_idx := (n - 1000) / 1000;  -- 0 to 25
    letter := chr(65 + letter_idx);    -- 'A' to 'Z'
    rem := (n - 1000) % 1000;          -- 0 to 999
    RETURN 'ELV-' || letter || LPAD(rem::TEXT, 3, '0');

  -- 27000 to 702999: 2 letters + 2 digits (ELV-AA00 to ELV-ZZ99, 676,000 users)
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
-- STEP 2: Create sequence for user elevates_id
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.profiles_elevates_id_seq START WITH 1;


-- ----------------------------------------------------------------------------
-- STEP 3: Renumber existing profiles chronologically
--         (Founder gets ELV-0001, Admin gets ELV-0002, then all other users in order)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Temporarily drop unique constraints/indexes to avoid collision during renumbering
  DROP INDEX IF EXISTS public.idx_profiles_elevates_id_unique;
  DROP INDEX IF EXISTS public.idx_profiles_elevates_id_lower;
  DROP INDEX IF EXISTS public.idx_profiles_elevates_id;
  
  -- Renumber all profiles in chronological order
  WITH ordered_profiles AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE 
            WHEN email = 'founder@elevates.live' THEN 1
            WHEN email = 'admin@elevates.live' THEN 2
            ELSE 3
          END ASC,
          created_at ASC NULLS LAST,
          id ASC
      ) AS row_num
    FROM public.profiles
  )
  UPDATE public.profiles p
  SET elevates_id = public.format_elevates_id(op.row_num)
  FROM ordered_profiles op
  WHERE p.id = op.id;

  -- Re-create unique and performance indexes
  CREATE UNIQUE INDEX idx_profiles_elevates_id_unique ON public.profiles (elevates_id);
  CREATE INDEX idx_profiles_elevates_id_lower ON public.profiles (LOWER(elevates_id));
  CREATE INDEX idx_profiles_elevates_id ON public.profiles (elevates_id);
END $$;


-- ----------------------------------------------------------------------------
-- STEP 4: Set the sequence to the current count of profiles
-- ----------------------------------------------------------------------------
SELECT setval(
  'public.profiles_elevates_id_seq',
  GREATEST((SELECT COUNT(*) FROM public.profiles), 1)
);


-- ----------------------------------------------------------------------------
-- STEP 5: Update generate_elevates_id to use the sequence
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.profiles_elevates_id_seq');
  RETURN public.format_elevates_id(next_val);
END;
$$;


-- ----------------------------------------------------------------------------
-- STEP 6: Ensure trigger is active on INSERT
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- STEP 7: Verify updated profiles
-- ----------------------------------------------------------------------------
SELECT elevates_id, full_name, email, created_at
FROM public.profiles
ORDER BY elevates_id ASC;
