-- ============================================================================
-- Migration: 026_event_ongoing_and_attendance_window.sql
-- Description: Adds database support, performance indexes, and stored procedures
--              for real-time "ongoing" event status and attendance window enforcement.
-- ============================================================================

-- 1. Performance index for event lifecycle queries (status, starts_at, ends_at)
CREATE INDEX IF NOT EXISTS idx_events_status_lifecycle 
ON public.events(status, starts_at, ends_at);

-- 2. Stored Procedure: sync_ongoing_events
-- Automatically transitions events to 'ongoing' when real-time matches/passes starts_at
-- and transitions 'ongoing' events to 'completed' when real-time passes ends_at.
CREATE OR REPLACE FUNCTION public.sync_ongoing_events()
RETURNS TABLE (
  started_count INT,
  completed_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_started INT := 0;
  v_completed INT := 0;
BEGIN
  -- Transition scheduled/approved events whose starts_at has arrived into 'ongoing'
  WITH updated_start AS (
    UPDATE public.events
    SET status = 'ongoing'
    WHERE status IN ('registration_open', 'registration_closed', 'approved')
      AND starts_at <= now()
      AND ends_at > now()
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO v_started FROM updated_start;

  -- Transition ongoing events whose ends_at has passed into 'completed'
  WITH updated_end AS (
    UPDATE public.events
    SET status = 'completed'
    WHERE status = 'ongoing'
      AND ends_at <= now()
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO v_completed FROM updated_end;

  RETURN QUERY SELECT v_started, v_completed;
END;
$$;

-- 3. Run an immediate sync for any currently active events in the database
SELECT * FROM public.sync_ongoing_events();

-- 4. Fast lookup index on base table public.attendance_records
CREATE INDEX IF NOT EXISTS idx_attendance_records_event_id ON public.attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);
