-- ============================================================================
-- Migration: 022_faculty_attendance_view_only.sql
-- Description: Sets up view-only attendance access for Faculty (Faculty Coordinator & Advisor).
--              Faculty can view attendance registers, sessions, and metrics for all
--              chapter events, but CANNOT take attendance, scan QR codes, or alter logs.
-- ============================================================================

-- 1. Ensure 'attendance.view' exists in public.permissions
INSERT INTO public.permissions (key, name, description)
VALUES (
  'attendance.view',
  'View Attendance',
  'View chapter event attendance registers, checkpoint progress, and arrival statistics without take/edit permissions'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Grant 'attendance.view' to Faculty roles (faculty_coordinator and advisor)
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('faculty_coordinator', 'advisor')
  AND p.key = 'attendance.view'
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = true;

-- 3. Revoke 'attendance.verify' from Faculty roles to guarantee read-only enforcement
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, false
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('faculty_coordinator', 'advisor')
  AND p.key = 'attendance.verify'
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = false;

-- 4. Update has_event_attendance_permission to guarantee faculty cannot insert or update attendance records
CREATE OR REPLACE FUNCTION public.has_event_attendance_permission(evt_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_chapter_id UUID;
  v_is_faculty_only BOOLEAN;
BEGIN
  -- HQ users always have attendance rights
  IF public.is_hq_user() THEN
    RETURN true;
  END IF;

  -- Faculty role has view-only oversight; block take/edit attendance mutations
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_key IN ('faculty_coordinator', 'advisor')
      AND (ur.valid_to IS NULL OR ur.valid_to >= now())
  ) INTO v_is_faculty_only;

  IF v_is_faculty_only THEN
    RETURN false;
  END IF;

  -- Get event's chapter ID
  SELECT chapter_id INTO v_chapter_id FROM public.events WHERE id = evt_id;
  IF v_chapter_id IS NULL THEN
    RETURN false;
  END IF;

  -- Active chapter executives (Campus Lead, Chairman, Secretary, Leads, CR) have standing permission
  IF public.is_chapter_executive(v_chapter_id) THEN
    RETURN true;
  END IF;

  -- Check for explicit temporary event_permissions entry
  IF EXISTS (
    SELECT 1 FROM public.event_permissions ep
    WHERE ep.event_id = evt_id
      AND ep.user_id = auth.uid()
      AND ep.permission_type IN ('take_attendance', 'manage_event')
      AND (ep.expires_at IS NULL OR ep.expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 5. Ensure RLS on public.attendance_records allows SELECT for faculty in the event's chapter
DROP POLICY IF EXISTS "Read attendance_records policy" ON public.attendance_records;
CREATE POLICY "Read attendance_records policy" ON public.attendance_records FOR SELECT USING (
  public.is_hq_user() 
  OR user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_id 
      AND e.chapter_id = ANY(public.current_user_chapter_ids())
  )
);
