-- ============================================================================
-- Migration: 032_clean_volunteer_teams_and_sync.sql
-- Description: Disables automatic volunteer team generation on event creation,
--              cleans up empty auto-generated squads, and ensures volunteer_groups,
--              events, and attendance_records columns match the on-demand squad workflow.
-- ============================================================================

-- 1. Drop the automatic event volunteer squad trigger and function
DROP TRIGGER IF EXISTS trg_auto_create_event_volunteer_group ON public.events;
DROP FUNCTION IF EXISTS public.trg_auto_create_event_volunteer_group();

-- 2. Clean up any empty auto-generated squads created by legacy triggers
DELETE FROM public.volunteer_groups
WHERE name LIKE '% Volunteers'
  AND (member_ids IS NULL OR cardinality(member_ids) = 0)
  AND (is_preset IS FALSE OR is_preset IS NULL);

-- 3. Ensure events table has volunteer_student_ids column for direct roster sync
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS volunteer_student_ids TEXT[] DEFAULT '{}';

-- 4. Ensure volunteer_groups has all required columns for squads and presets
ALTER TABLE public.volunteer_groups
  ADD COLUMN IF NOT EXISTS is_preset BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.volunteer_groups
  ADD COLUMN IF NOT EXISTS member_ids UUID[] DEFAULT '{}';

ALTER TABLE public.volunteer_groups
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- 5. Ensure indexes exist for fast squad and chapter lookups
CREATE INDEX IF NOT EXISTS idx_volunteer_groups_chapter_preset
  ON public.volunteer_groups(chapter_id, is_preset);

CREATE INDEX IF NOT EXISTS idx_volunteer_groups_event
  ON public.volunteer_groups(event_id);

-- 6. Ensure attendance_records constraint accepts 'volunteer' status
DO $$
BEGIN
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS check_attendance_status;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('present', 'absent', 'volunteer', 'speaker'));
