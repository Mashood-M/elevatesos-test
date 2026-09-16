-- ============================================================================
-- Migration: 031_volunteer_presets_and_direct_assignment.sql
-- Description: Adds is_preset column to volunteer_groups for reusable student
--              volunteer presets, ensures automatic volunteer team creation on
--              events, and provides an RPC function to apply presets to events.
-- ============================================================================

-- 1. Add is_preset column to volunteer_groups
ALTER TABLE public.volunteer_groups 
ADD COLUMN IF NOT EXISTS is_preset BOOLEAN NOT NULL DEFAULT false;

-- Create index for fast preset filtering
CREATE INDEX IF NOT EXISTS idx_volunteer_groups_is_preset 
ON public.volunteer_groups(is_preset);

CREATE INDEX IF NOT EXISTS idx_volunteer_groups_chapter_preset 
ON public.volunteer_groups(chapter_id, is_preset);


-- 2. Trigger Function: Automatically create volunteer team with the event name
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
      is_preset,
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
      false,
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

-- Bind trigger to public.events table (runs AFTER INSERT)
DROP TRIGGER IF EXISTS trg_auto_create_event_volunteer_group ON public.events;
CREATE TRIGGER trg_auto_create_event_volunteer_group
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_event_volunteer_group();


-- 3. Backfill any existing events missing their volunteer squad
INSERT INTO public.volunteer_groups (
  id,
  chapter_id,
  name,
  description,
  group_type,
  is_preset,
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
  false,
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


-- 4. RPC Helper: Directly apply a volunteer preset to an event with 1-click
CREATE OR REPLACE FUNCTION public.apply_volunteer_preset_to_event(
  p_preset_id UUID,
  p_event_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preset RECORD;
  v_event RECORD;
  v_group_id UUID;
  v_member_id UUID;
  v_count INT := 0;
  v_new_member_ids UUID[];
BEGIN
  -- Fetch preset
  SELECT * INTO v_preset
  FROM public.volunteer_groups
  WHERE id = p_preset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Volunteer preset % not found', p_preset_id;
  END IF;

  -- Fetch event
  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_event_id;
  END IF;

  -- Resolve or create event squad
  SELECT id INTO v_group_id
  FROM public.volunteer_groups
  WHERE event_id = p_event_id
  LIMIT 1;

  IF v_group_id IS NULL THEN
    v_group_id := gen_random_uuid();
    INSERT INTO public.volunteer_groups (
      id,
      chapter_id,
      name,
      description,
      group_type,
      is_preset,
      event_id,
      valid_from,
      valid_to,
      powers,
      member_ids,
      created_by
    ) VALUES (
      v_group_id,
      v_event.chapter_id,
      trim(v_event.title) || ' Volunteers',
      'Official volunteer team for ' || v_event.title,
      'temp',
      false,
      v_event.id,
      v_event.starts_at,
      v_event.ends_at,
      v_preset.powers,
      COALESCE(v_preset.member_ids, '{}'),
      p_created_by
    );
  ELSE
    -- Merge members into existing squad
    UPDATE public.volunteer_groups
    SET
      member_ids = (
        SELECT ARRAY(
          SELECT DISTINCT unnest(COALESCE(member_ids, '{}') || COALESCE(v_preset.member_ids, '{}'))
        )
      ),
      updated_at = now()
    WHERE id = v_group_id;
  END IF;

  -- Create volunteer assignments for each preset member using event dates directly
  IF v_preset.member_ids IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY v_preset.member_ids LOOP
      -- Upsert assignment
      INSERT INTO public.volunteer_assignments (
        id,
        chapter_id,
        user_id,
        event_id,
        group_id,
        tag,
        powers,
        valid_from,
        valid_to,
        status,
        created_by
      ) VALUES (
        gen_random_uuid(),
        v_event.chapter_id,
        v_member_id,
        v_event.id,
        v_group_id,
        v_preset.name,
        v_preset.powers,
        v_event.starts_at,
        v_event.ends_at,
        'active',
        p_created_by
      )
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'group_id', v_group_id,
    'assigned_count', v_count
  );
END;
$$;
