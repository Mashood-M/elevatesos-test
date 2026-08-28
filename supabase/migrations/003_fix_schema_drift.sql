-- ============================================================================
-- Migration: 003_fix_schema_drift.sql
-- Description: Adds missing roles, permissions, role_permissions, peer_labs,
--              college_leads, join_leads tables, attendance view with INSTEAD OF
--              trigger, user_roles role_id reference, RLS policies, and seeds
--              the 6 login accounts with explicit role_id & role_key links.
-- ============================================================================

-- Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure base organization exists
INSERT INTO public.organizations (id, name, slug, tagline)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Elevates Foundation',
  'elevates',
  'Student-led tech movement'
)
ON CONFLICT (id) DO NOTHING;

-- 1. ROLES TABLE & SEED DATA
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    scope TEXT NOT NULL, -- 'hq' or 'chapter'
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.roles (key, name, scope, description)
VALUES
  ('founder', 'HQ Founder', 'hq', 'Elevates founder and HQ administrator.'),
  ('hq_admin', 'HQ Admin', 'hq', 'HQ administrator with org-wide management.'),
  ('hq_mentor', 'HQ Mentor', 'hq', 'HQ advisor and mentor for chapters.'),
  ('faculty_coordinator', 'Faculty Coordinator', 'chapter', 'Faculty advisor and chapter overseer.'),
  ('chairman', 'Chapter Chairman', 'chapter', 'Executive lead for chapter operations.'),
  ('vice_chairman', 'Vice Chairman', 'chapter', 'Deputy executive lead.'),
  ('secretary', 'Secretary', 'chapter', 'Chapter secretary and ops manager.'),
  ('joint_secretary', 'Joint Secretary', 'chapter', 'Assistant chapter secretary.'),
  ('elevates_coordinator', 'Elevates Coordinator', 'chapter', 'Overall chapter activity coordinator.'),
  ('technical_lead', 'Technical Lead', 'chapter', 'Lead for technical initiatives and projects.'),
  ('technical_team', 'Technical Team Member', 'chapter', 'Technical team contributor.'),
  ('media_lead', 'Media Lead', 'chapter', 'Lead for media and design.'),
  ('media_team', 'Media Team Member', 'chapter', 'Media team contributor.'),
  ('innovation_lead', 'Innovation Lead', 'chapter', 'Lead for innovation and cluster projects.'),
  ('innovation_team', 'Innovation Team Member', 'chapter', 'Innovation team contributor.'),
  ('class_representative', 'Class Representative', 'chapter', 'Class level representative and student liaison.'),
  ('student', 'Student Member', 'chapter', 'Active chapter student member.'),
  ('alumni', 'Alumni Member', 'chapter', 'Graduated chapter alumni.'),
  ('guest', 'Guest User', 'chapter', 'Guest or prospective community member.'),
  ('industry_mentor', 'Industry Mentor', 'hq', 'External industry mentor.')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  scope = EXCLUDED.scope,
  description = EXCLUDED.description;

-- 2. PERMISSIONS TABLE & SEED DATA
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.permissions (key, name, description)
VALUES
  ('org.manage', 'Manage Organization', 'Manage global organization settings and network'),
  ('chapter.create', 'Create Chapter', 'Initialize and onboard new college chapters'),
  ('chapter.manage', 'Manage Chapter', 'Configure chapter profile, settings, and status'),
  ('leadership.manage', 'Manage Leadership', 'Assign and manage chapter leadership terms'),
  ('class.manage', 'Manage Classes', 'Configure academic departments and class cohorts'),
  ('roles.manage', 'Manage Roles & Permissions', 'Configure role permissions and access matrices'),
  ('event.create', 'Create Events', 'Draft and propose new events'),
  ('event.approve', 'Approve Events', 'Approve chapter events for publishing'),
  ('event.manage', 'Manage Events', 'Edit event details, venues, and schedules'),
  ('registration.review', 'Review Registrations', 'Screen student event registration requests'),
  ('registration.approve', 'Approve Registrations', 'Approve student registrations and issue QR tickets'),
  ('attendance.verify', 'Verify Attendance', 'Scan QR codes and record event attendance'),
  ('certificate.issue', 'Issue Certificates', 'Generate and distribute certificates for events'),
  ('report.submit', 'Submit Reports', 'Create and submit chapter activity and event reports'),
  ('report.approve', 'Approve Reports', 'Review and approve chapter reports at HQ level'),
  ('report.download', 'Download Reports', 'Export and download report documents'),
  ('task.manage', 'Manage Tasks', 'Create and assign chapter operational tasks'),
  ('resource.upload', 'Upload Resources', 'Upload shared kits, templates, and media'),
  ('announcement.publish', 'Publish Announcements', 'Broadcast announcements to chapters or globally'),
  ('analytics.view', 'View Analytics', 'Access chapter and network analytics dashboards'),
  ('student.register', 'Register Students', 'Onboard and register students for events/chapters')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 3. ROLE_PERMISSIONS JOIN TABLE & SEED PERMISSION MATRIX
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    allowed BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (role_id, permission_id)
);

-- Founder & HQ Admin get ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('founder', 'hq_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- HQ Mentor permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'hq_mentor'
  AND p.key IN ('analytics.view', 'report.download', 'resource.upload', 'announcement.publish')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Faculty Coordinator permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'faculty_coordinator'
  AND p.key IN ('event.approve', 'report.approve', 'report.download', 'analytics.view', 'chapter.manage', 'leadership.manage')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Chairman & Vice Chairman permissions (All Chapter operations)
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('chairman', 'vice_chairman')
  AND p.key IN (
    'chapter.manage', 'leadership.manage', 'class.manage', 'event.create', 'event.approve',
    'event.manage', 'registration.review', 'registration.approve', 'attendance.verify',
    'certificate.issue', 'report.submit', 'report.download', 'task.manage',
    'resource.upload', 'announcement.publish', 'analytics.view', 'student.register'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Secretary permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'secretary'
  AND p.key IN (
    'event.create', 'event.manage', 'registration.review', 'registration.approve',
    'attendance.verify', 'certificate.issue', 'report.submit', 'task.manage',
    'announcement.publish', 'analytics.view', 'student.register'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Joint Secretary & Elevates Coordinator permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('joint_secretary', 'elevates_coordinator')
  AND p.key IN (
    'event.create', 'event.manage', 'registration.review', 'attendance.verify',
    'task.manage', 'report.submit', 'student.register'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Technical, Media & Innovation Leads permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('technical_lead', 'media_lead', 'innovation_lead')
  AND p.key IN (
    'event.create', 'event.manage', 'attendance.verify', 'task.manage',
    'resource.upload', 'announcement.publish'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Technical, Media & Innovation Team Member permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('technical_team', 'media_team', 'innovation_team')
  AND p.key IN ('event.create', 'attendance.verify', 'task.manage')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Class Representative permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'class_representative'
  AND p.key IN ('student.register', 'attendance.verify', 'registration.review')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- Industry Mentor permissions
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'industry_mentor'
  AND p.key IN ('analytics.view', 'resource.upload')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- 4. USER_ROLES ROLE_ID COLUMN & BACKFILL
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);
UPDATE public.user_roles ur SET role_id = r.id FROM public.roles r WHERE ur.role_key = r.key AND ur.role_id IS NULL;

-- 5. ATTENDANCE VIEW & INSTEAD OF INSERT TRIGGER
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND table_type = 'BASE TABLE'
    ) THEN
        DROP TABLE public.attendance CASCADE;
    END IF;
END $$;

CREATE OR REPLACE VIEW public.attendance AS SELECT * FROM public.attendance_records;

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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attendance_instead_of_insert ON public.attendance;
CREATE TRIGGER attendance_instead_of_insert
INSTEAD OF INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.attendance_insert_trigger();

-- 6. PEER_LABS TABLE
CREATE TABLE IF NOT EXISTS public.peer_labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    track TEXT,
    description TEXT,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    syllabus JSONB DEFAULT '[]'::jsonb,
    phases JSONB DEFAULT '[]'::jsonb,
    facilitators JSONB DEFAULT '[]'::jsonb,
    resources JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'upcoming',
    applications_open BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT true,
    banner_url TEXT,
    enrolled_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. COLLEGE_LEADS AND JOIN_LEADS TABLES
CREATE TABLE IF NOT EXISTS public.college_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT,
    message TEXT,
    source TEXT DEFAULT 'web',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.join_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    college TEXT,
    year TEXT,
    interests TEXT[] DEFAULT '{}',
    message TEXT,
    chapter_slug TEXT,
    source TEXT DEFAULT 'web',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Roles" ON public.roles;
CREATE POLICY "Public Read Roles" ON public.roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage Roles" ON public.roles;
CREATE POLICY "Manage Roles" ON public.roles FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Permissions" ON public.permissions;
CREATE POLICY "Public Read Permissions" ON public.permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage Permissions" ON public.permissions;
CREATE POLICY "Manage Permissions" ON public.permissions FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Role Permissions" ON public.role_permissions;
CREATE POLICY "Public Read Role Permissions" ON public.role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage Role Permissions" ON public.role_permissions;
CREATE POLICY "Manage Role Permissions" ON public.role_permissions FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Peer Labs" ON public.peer_labs;
CREATE POLICY "Public Read Peer Labs" ON public.peer_labs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage Peer Labs" ON public.peer_labs;
CREATE POLICY "Manage Peer Labs" ON public.peer_labs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "College Leads Access" ON public.college_leads;
CREATE POLICY "College Leads Access" ON public.college_leads FOR ALL USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Public Submit College Leads" ON public.college_leads;
CREATE POLICY "Public Submit College Leads" ON public.college_leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Join Leads Access" ON public.join_leads;
CREATE POLICY "Join Leads Access" ON public.join_leads FOR ALL USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Public Submit Join Leads" ON public.join_leads;
CREATE POLICY "Public Submit Join Leads" ON public.join_leads FOR INSERT WITH CHECK (true);

-- 9. SEED THE 6 SYSTEM LOGIN ACCOUNTS & LINK BOTH ROLE_KEY AND ROLE_ID
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'founder@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HQ Founder"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'admin@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HQ Admin"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'chairman@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Campus Chairman"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'faculty@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Faculty Coordinator"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'cr@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Class Representative"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'student@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Student"}'::jsonb, 'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('123456', gen_salt('bf')),
  email = EXCLUDED.email;

INSERT INTO public.profiles (id, email, full_name, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'founder@elevates.live', 'HQ Founder', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin@elevates.live', 'HQ Admin', now()),
  ('33333333-3333-3333-3333-333333333333', 'chairman@elevates.live', 'Campus Chairman', now()),
  ('44444444-4444-4444-4444-444444444444', 'faculty@elevates.live', 'Faculty Coordinator', now()),
  ('55555555-5555-5555-5555-555555555555', 'cr@elevates.live', 'Class Representative', now()),
  ('66666666-6666-6666-6666-666666666666', 'student@elevates.live', 'Student', now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- Seed / Link user_roles with role_key AND role_id for all 6 accounts
INSERT INTO public.user_roles (id, user_id, role_key, role_id, organization_id)
SELECT 
  v.id::uuid,
  v.user_id::uuid,
  v.role_key,
  r.id,
  '00000000-0000-0000-0000-000000000001'::uuid
FROM (
  VALUES 
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'founder'),
    ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'hq_admin'),
    ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'chairman'),
    ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'faculty_coordinator'),
    ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'class_representative'),
    ('a6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'student')
) AS v(id, user_id, role_key)
JOIN public.roles r ON r.key = v.role_key
ON CONFLICT (id) DO UPDATE SET
  role_key = EXCLUDED.role_key,
  role_id = EXCLUDED.role_id;
