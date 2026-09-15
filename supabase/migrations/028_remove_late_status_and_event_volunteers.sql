-- ============================================================================
-- Migration: 028_remove_late_status_and_event_volunteers.sql
-- Description: Updates attendance status check to remove 'late' and ensure
--              volunteers and speakers can be marked present, plus adds
--              volunteer_student_ids to events.
-- ============================================================================

-- 1. Add volunteer_student_ids column to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS volunteer_student_ids TEXT[] DEFAULT '{}';

-- 2. Migrate any legacy 'late' attendance records to 'present'
UPDATE public.attendance_records
SET status = 'present'
WHERE status = 'late';

-- 3. Update status constraint on attendance_records to remove 'late'
DO $$
BEGIN
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS check_attendance_status;
END $$;

ALTER TABLE public.attendance_records 
  ADD CONSTRAINT attendance_records_status_check 
  CHECK (status IN ('present', 'absent', 'volunteer', 'speaker'));
