-- ============================================================================
-- Migration: 027_event_directory_speakers_attendance.sql
-- Description: Ensures columns, constraints, and indexes for event coordinators,
--              speakers (hosts), volunteers, and multi-status attendance tracking.
-- ============================================================================

-- 1. Ensure events table has hosts, organizers, topics, and managing teams
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS hosts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS organizers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attendance_sessions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS platform JSONB,
  ADD COLUMN IF NOT EXISTS case_study JSONB,
  ADD COLUMN IF NOT EXISTS managing_student_ids TEXT[] DEFAULT '{}';

-- 2. Update status constraint on attendance_records to allow volunteer and speaker
DO $$
BEGIN
  -- Drop legacy constraints if present
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS check_attendance_status;
END $$;

ALTER TABLE public.attendance_records 
  ADD CONSTRAINT attendance_records_status_check 
  CHECK (status IN ('present', 'absent', 'late', 'volunteer', 'speaker'));

-- 3. Ensure the attendance view and triggers support upsert with sessions and status
CREATE OR REPLACE VIEW public.attendance AS 
  SELECT * FROM public.attendance_records;

CREATE OR REPLACE FUNCTION public.attendance_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.attendance_records (
        id, event_id, registration_id, user_id, status, method, session_id, session_name, checked_in_at, checked_in_by
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.event_id,
        NEW.registration_id,
        NEW.user_id,
        COALESCE(NEW.status, 'present'),
        COALESCE(NEW.method, 'qr'),
        NEW.session_id,
        NEW.session_name,
        COALESCE(NEW.checked_in_at, now()),
        NEW.checked_in_by
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        method = EXCLUDED.method,
        session_id = EXCLUDED.session_id,
        session_name = EXCLUDED.session_name,
        checked_in_at = EXCLUDED.checked_in_at,
        checked_in_by = EXCLUDED.checked_in_by;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attendance_instead_of_insert ON public.attendance;
CREATE TRIGGER attendance_instead_of_insert
INSTEAD OF INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.attendance_insert_trigger();

-- 4. High performance indexes for event directory and presence lookups
CREATE INDEX IF NOT EXISTS idx_attendance_records_event_user 
  ON public.attendance_records(event_id, user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_event_reg 
  ON public.attendance_records(event_id, registration_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_status 
  ON public.attendance_records(status);

-- 5. Ensure tables are enabled in supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
