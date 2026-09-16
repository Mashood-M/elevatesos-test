-- ============================================================================
-- Migration: 030_auto_create_event_volunteer_groups.sql
-- Description: Automatically creates a volunteer team (volunteer_groups record)
--              with the event's name whenever a new event is created.
--              Includes a trigger on public.events and backfill for existing events.
-- ============================================================================

-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.trg_auto_create_event_volunteer_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_group_id UUID;
  v_group_name TEXT;
  v_valid_from TIMESTAMPTZ;
  v_valid_to TIMESTAMPTZ;
BEGIN
  -- Determine volunteer squad name based on the event title
  v_group_name := trim(NEW.title) || ' Volunteers';

  -- Set validity window matching event start/end (or standard 30-day window)
  v_valid_from := COALESCE(NEW.starts_at, now());
  v_valid_to := COALESCE(NEW.ends_at, v_valid_from + interval '30 days');

  -- Avoid creating duplicates if a volunteer group for this event already exists
  SELECT id INTO v_existing_group_id
  FROM public.volunteer_groups
  WHERE event_id = NEW.id
  LIMIT 1;

  IF v_existing_group_id IS NULL THEN
    INSERT INTO public.volunteer_groups (
      id,
      chapter_id,
      name,
      description,
      group_type,
      event_id,
      valid_from,
      valid_to,
      powers,
      member_ids,
      custom_member_powers,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.chapter_id,
      v_group_name,
      'Official volunteer team for ' || NEW.title,
      'temp',
      NEW.id,
      v_valid_from,
      v_valid_to,
      '{"canTakeAttendance":true,"canScanQr":true,"canVerifyTickets":true,"canRegisterWalkins":false,"canManageTasks":false,"canViewRoster":true}'::jsonb,
      '{}'::UUID[],
      '{}'::JSONB,
      NEW.organizer_id,
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Bind trigger to public.events table (runs AFTER INSERT)
DROP TRIGGER IF EXISTS trg_auto_create_event_volunteer_group ON public.events;
CREATE TRIGGER trg_auto_create_event_volunteer_group
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_event_volunteer_group();

-- 3. Backfill existing events that do not yet have a linked volunteer group
INSERT INTO public.volunteer_groups (
  id,
  chapter_id,
  name,
  description,
  group_type,
  event_id,
  valid_from,
  valid_to,
  powers,
  member_ids,
  custom_member_powers,
  created_by,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  e.chapter_id,
  trim(e.title) || ' Volunteers',
  'Official volunteer team for ' || e.title,
  'temp',
  e.id,
  COALESCE(e.starts_at, now()),
  COALESCE(e.ends_at, COALESCE(e.starts_at, now()) + interval '30 days'),
  '{"canTakeAttendance":true,"canScanQr":true,"canVerifyTickets":true,"canRegisterWalkins":false,"canManageTasks":false,"canViewRoster":true}'::jsonb,
  '{}'::UUID[],
  '{}'::JSONB,
  e.organizer_id,
  now(),
  now()
FROM public.events e
WHERE NOT EXISTS (
  SELECT 1 FROM public.volunteer_groups vg WHERE vg.event_id = e.id
);
