-- ============================================================================
-- Migration: 004_role_based_system_and_rls.sql
-- Description: Adds campus_lead role, event_permissions table, user_roles
--              validity/permanency columns, event managing/media team columns,
--              and comprehensive chapter-scoped RLS policies.
-- ============================================================================

-- 1. ADD CAMPUS_LEAD ROLE
INSERT INTO public.roles (key, name, scope, description)
VALUES
  ('campus_lead', 'Campus Lead', 'chapter', 'Student lead with elevated chapter-level administrative permissions')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  scope = EXCLUDED.scope,
  description = EXCLUDED.description;

-- 2. UPDATE USER_ROLES TABLE
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT true;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;

-- 3. CREATE EVENT_PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.event_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('manage_event', 'take_attendance', 'manage_media')),
    is_temporary BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (event_id, user_id, permission_type)
);

-- 4. UPDATE EVENTS TABLE FOR MANAGING/MEDIA TEAMS
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS managing_team_mode TEXT DEFAULT 'permanent';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS media_team_mode TEXT DEFAULT 'permanent';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS managing_student_ids UUID[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS media_student_ids UUID[] DEFAULT '{}';

-- 5. RLS HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_role_keys()
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(ur.role_key), ARRAY[]::TEXT[])
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND (ur.is_permanent IS TRUE OR (
      (ur.valid_from IS NULL OR ur.valid_from <= now()) AND
      (ur.valid_to IS NULL OR ur.valid_to >= now())
    ));
$$;

CREATE OR REPLACE FUNCTION public.current_user_chapter_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(DISTINCT ur.chapter_id), ARRAY[]::UUID[])
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.chapter_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_hq_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_key IN ('founder', 'hq_admin', 'hq_mentor', 'industry_mentor')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_member(ch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.chapter_id = ch_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_executive(ch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.chapter_id = ch_id
      AND ur.role_key IN (
        'campus_lead', 'chairman', 'vice_chairman', 'secretary', 'joint_secretary',
        'elevates_coordinator', 'technical_lead', 'technical_team', 'media_lead',
        'media_team', 'innovation_lead', 'innovation_team', 'class_representative',
        'faculty_coordinator'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_event_attendance_permission(evt_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_chapter_id UUID;
BEGIN
  -- 1. Check if user is HQ
  IF public.is_hq_user() THEN
    RETURN true;
  END IF;

  -- Get event chapter
  SELECT chapter_id INTO v_chapter_id FROM public.events WHERE id = evt_id;
  IF v_chapter_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Permanent chapter executives (Campus Lead, Chairman, Sec, CR, etc) have standing permission
  IF public.is_chapter_executive(v_chapter_id) THEN
    RETURN true;
  END IF;

  -- 3. Check for active, non-expired temporary event_permissions entry
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

-- 6. ENABLE ROW LEVEL SECURITY AND DROP OLD POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 7. RE-CREATE GRANULAR STRICT RLS POLICIES FOR ALL TABLES

-- ORGANIZATIONS
DROP POLICY IF EXISTS "Allow authenticated users full access to organizations" ON public.organizations;
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "HQ manage organizations" ON public.organizations FOR ALL USING (public.is_hq_user());

-- CHAPTERS
DROP POLICY IF EXISTS "Allow authenticated users full access to chapters" ON public.chapters;
CREATE POLICY "Read chapters policy" ON public.chapters FOR SELECT USING (
  published = true OR status = 'active' OR public.is_hq_user() OR id = ANY(public.current_user_chapter_ids())
);
CREATE POLICY "HQ manage chapters" ON public.chapters FOR ALL USING (public.is_hq_user());

-- PROFILES
DROP POLICY IF EXISTS "Allow authenticated users full access to profiles" ON public.profiles;
CREATE POLICY "Read profiles policy" ON public.profiles FOR SELECT USING (
  id = auth.uid() OR public.is_hq_user() OR chapter_id = ANY(public.current_user_chapter_ids())
);
CREATE POLICY "Update own profile or HQ update" ON public.profiles FOR UPDATE USING (
  id = auth.uid() OR public.is_hq_user()
);
CREATE POLICY "HQ insert profile" ON public.profiles FOR INSERT WITH CHECK (
  public.is_hq_user() OR id = auth.uid() OR chapter_id = ANY(public.current_user_chapter_ids())
);

-- USER_ROLES
DROP POLICY IF EXISTS "Allow authenticated users full access to user_roles" ON public.user_roles;
CREATE POLICY "Read user_roles policy" ON public.user_roles FOR SELECT USING (
  user_id = auth.uid() OR public.is_hq_user() OR chapter_id = ANY(public.current_user_chapter_ids())
);
CREATE POLICY "Executive or HQ write user_roles" ON public.user_roles FOR ALL USING (
  public.is_hq_user() OR (chapter_id IS NOT NULL AND public.is_chapter_executive(chapter_id))
);

-- EVENTS
DROP POLICY IF EXISTS "Allow authenticated users full access to events" ON public.events;
CREATE POLICY "Read events policy" ON public.events FOR SELECT USING (
  visibility IN ('public', 'all_chapters') OR public.is_hq_user() OR chapter_id = ANY(public.current_user_chapter_ids())
);
CREATE POLICY "Executive or HQ write events" ON public.events FOR ALL USING (
  public.is_hq_user() OR public.is_chapter_executive(chapter_id)
);

-- EVENT_PERMISSIONS
CREATE POLICY "Read event_permissions policy" ON public.event_permissions FOR SELECT USING (
  public.is_hq_user() OR user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.chapter_id = ANY(public.current_user_chapter_ids())
  )
);
CREATE POLICY "Executive or HQ write event_permissions" ON public.event_permissions FOR ALL USING (
  public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_chapter_executive(e.chapter_id)
  )
);

-- ATTENDANCE_RECORDS
DROP POLICY IF EXISTS "Allow authenticated users full access to attendance_records" ON public.attendance_records;
CREATE POLICY "Read attendance_records policy" ON public.attendance_records FOR SELECT USING (
  public.is_hq_user() OR user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.chapter_id = ANY(public.current_user_chapter_ids())
  )
);
CREATE POLICY "Write attendance_records policy" ON public.attendance_records FOR INSERT WITH CHECK (
  public.has_event_attendance_permission(event_id)
);
CREATE POLICY "Update attendance_records policy" ON public.attendance_records FOR UPDATE USING (
  public.has_event_attendance_permission(event_id)
);

-- EVENT_REGISTRATIONS
DROP POLICY IF EXISTS "Allow authenticated users full access to event_registrations" ON public.event_registrations;
CREATE POLICY "Read event_registrations policy" ON public.event_registrations FOR SELECT USING (
  user_id = auth.uid() OR public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.chapter_id = ANY(public.current_user_chapter_ids())
  )
);
CREATE POLICY "Insert own event registration" ON public.event_registrations FOR INSERT WITH CHECK (
  user_id = auth.uid() OR public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_chapter_executive(e.chapter_id)
  )
);
CREATE POLICY "Executive or HQ update event_registrations" ON public.event_registrations FOR UPDATE USING (
  public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_chapter_executive(e.chapter_id)
  )
);
