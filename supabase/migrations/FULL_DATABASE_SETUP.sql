-- Elevates OS Full Schema Migration (Fresh Supabase Account)
-- Paste this entire SQL into your new Supabase Project -> SQL Editor and click "Run".

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ORGANIZATIONS & CHAPTERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    tagline TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    brand_kit JSONB DEFAULT '{
      "logoUrl": "/logo.svg",
      "colors": {
        "accent": "#6366f1",
        "charcoal": "#1e293b",
        "sage": "#10b981",
        "indigo": "#4f46e5"
      }
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    college TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    district TEXT,
    status TEXT NOT NULL DEFAULT 'onboarding',
    published BOOLEAN DEFAULT false,
    health_score NUMERIC DEFAULT 0,
    member_count INT DEFAULT 0,
    event_count INT DEFAULT 0,
    project_count INT DEFAULT 0,
    founded_at TIMESTAMPTZ DEFAULT now(),
    faculty_id UUID,
    logo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.organizations (id, name, slug, tagline)
VALUES ('00000000-0000-0000-0000-000000000001', 'Elevates', 'elevates', 'Campus Operating System')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.chapters (
  id, organization_id, name, slug, college, city, status, published, health_score, member_count, event_count, project_count, founded_at, notes
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'Elevates Test Chapter',
  'test-chapter',
  'Elevates Sandbox Institute of Technology',
  'HQ Sandbox Campus',
  'active',
  true,
  98, 32, 8, 6,
  '2026-01-01T00:00:00.000Z',
  'Pinned test sandbox chapter for testing all chapter-wise features, roles, attendance, and forms in isolation.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. PROFILES & USER ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    is_public BOOLEAN DEFAULT false,
    phone TEXT,
    engagement_tier TEXT DEFAULT 'everyone',
    journey_stage TEXT DEFAULT 'awareness',
    skills TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    portfolio_url TEXT,
    resume_url TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    points INT DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'chapter',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'present',
    method TEXT DEFAULT 'qr',
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    checked_in_by UUID
);

-- Seed System Roles
INSERT INTO public.roles (id, key, name, scope, description)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'founder', 'HQ Founder', 'hq', 'Full platform administrative access across HQ and all campus chapters'),
  ('70000000-0000-0000-0000-000000000002', 'hq_admin', 'HQ Admin', 'hq', 'HQ operation and campus chapter management permissions'),
  ('70000000-0000-0000-0000-000000000003', 'chairman', 'Campus Executive', 'chapter', 'Chapter leadership, event management, and team oversight'),
  ('70000000-0000-0000-0000-000000000004', 'faculty_coordinator', 'Faculty Coordinator', 'chapter', 'Faculty window, event approvals, and academic coordination'),
  ('70000000-0000-0000-0000-000000000005', 'class_representative', 'Class Representative', 'chapter', 'Class cohort coordination, announcements, and student engagement'),
  ('70000000-0000-0000-0000-000000000006', 'student', 'Student', 'chapter', 'Student access, event registration, certificates, and portfolio')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    leadership_term_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. ACADEMIC STRUCTURE (DEPARTMENTS & CLASS COHORTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    section TEXT NOT NULL,
    rep_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. LEADERSHIP TERMS & ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leadership_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    handover_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leadership_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.leadership_terms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. EVENTS, FORMS & REGISTRATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    cluster_id UUID,
    title TEXT NOT NULL,
    slug TEXT,
    banner_emoji TEXT DEFAULT '🎉',
    banner_url TEXT,
    description TEXT,
    summary TEXT,
    venue TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    capacity INT DEFAULT 60,
    waitlist_capacity INT DEFAULT 15,
    visibility TEXT DEFAULT 'public',
    mode TEXT DEFAULT 'in_person',
    registration_start TIMESTAMPTZ DEFAULT now(),
    registration_end TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'draft',
    certificate_enabled BOOLEAN DEFAULT true,
    ticket_no TEXT,
    category TEXT DEFAULT 'Workshop',
    progress_stage TEXT,
    next_event_id UUID,
    published_at TIMESTAMPTZ,
    topics TEXT[] DEFAULT '{}',
    event_type TEXT DEFAULT 'standalone',
    parent_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    sub_event_ids UUID[] DEFAULT '{}',
    platform JSONB,
    case_study JSONB,
    attendance_sessions JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL DEFAULT 'registration',
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    questions JSONB DEFAULT '[]'::jsonb,
    schema JSONB DEFAULT '[]'::jsonb,
    logic_enabled BOOLEAN DEFAULT false,
    logic_rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    guest_email TEXT,
    guest_name TEXT,
    status TEXT DEFAULT 'pending',
    representative_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    answers JSONB DEFAULT '{}'::jsonb,
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'present',
    method TEXT DEFAULT 'qr',
    session_id TEXT,
    session_name TEXT,
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id TEXT UNIQUE NOT NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT now(),
    verification_qr TEXT,
    digital_signature TEXT
);

-- ============================================================================
-- 6. CLUSTERS & PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    member_ids UUID[] DEFAULT '{}',
    roadmap JSONB DEFAULT '[]'::jsonb,
    access_mode TEXT DEFAULT 'invite',
    responsibilities TEXT[] DEFAULT '{}',
    challenge_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cluster_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nominated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    stage TEXT DEFAULT 'planning',
    project_type TEXT DEFAULT 'internal',
    team_ids UUID[] DEFAULT '{}',
    mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    repository_url TEXT,
    progress INT DEFAULT 0,
    demo_url TEXT,
    awards TEXT[] DEFAULT '{}',
    is_showcased BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leadership_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.leadership_terms(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'applied',
    statement TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. HQ RESOURCES, TASKS, REPORTS & ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    summary TEXT,
    sections TEXT[] DEFAULT '{}',
    body TEXT,
    status TEXT DEFAULT 'published',
    related_href TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'documentation',
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'event',
    title TEXT NOT NULL,
    summary TEXT,
    body_html TEXT,
    body_json JSONB,
    images JSONB DEFAULT '[]'::jsonb,
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'draft',
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    hq_comment TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audience TEXT DEFAULT 'global',
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES public.clusters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    href TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    meta TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER (FROM SUPABASE AUTH)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Organizations" ON public.organizations;
CREATE POLICY "Public Read Organizations" ON public.organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Chapters" ON public.chapters;
CREATE POLICY "Public Read Chapters" ON public.chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "HQ Manage Chapters" ON public.chapters;
CREATE POLICY "HQ Manage Chapters" ON public.chapters FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service Insert Profiles" ON public.profiles;
CREATE POLICY "Service Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read User Roles" ON public.user_roles;
CREATE POLICY "Public Read User Roles" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage User Roles" ON public.user_roles;
CREATE POLICY "Manage User Roles" ON public.user_roles FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Departments" ON public.departments;
CREATE POLICY "Public Read Departments" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Departments" ON public.departments;
CREATE POLICY "Manage Departments" ON public.departments FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Class Cohorts" ON public.class_cohorts;
CREATE POLICY "Public Read Class Cohorts" ON public.class_cohorts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Class Cohorts" ON public.class_cohorts;
CREATE POLICY "Manage Class Cohorts" ON public.class_cohorts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Events" ON public.events;
CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Events" ON public.events;
CREATE POLICY "Manage Events" ON public.events FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Forms" ON public.forms;
CREATE POLICY "Public Read Forms" ON public.forms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Forms" ON public.forms;
CREATE POLICY "Manage Forms" ON public.forms FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Form Responses Access" ON public.form_responses;
CREATE POLICY "Form Responses Access" ON public.form_responses FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Submit Form Responses" ON public.form_responses;
CREATE POLICY "Public Submit Form Responses" ON public.form_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Event Registrations Access" ON public.event_registrations;
CREATE POLICY "Event Registrations Access" ON public.event_registrations FOR ALL USING (true);

DROP POLICY IF EXISTS "Attendance Records Access" ON public.attendance_records;
CREATE POLICY "Attendance Records Access" ON public.attendance_records FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Clusters" ON public.clusters;
CREATE POLICY "Public Read Clusters" ON public.clusters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Clusters" ON public.clusters;
CREATE POLICY "Manage Clusters" ON public.clusters FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Projects" ON public.projects;
CREATE POLICY "Public Read Projects" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Projects" ON public.projects;
CREATE POLICY "Manage Projects" ON public.projects FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Resources" ON public.resources;
CREATE POLICY "Public Read Resources" ON public.resources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Resources" ON public.resources;
CREATE POLICY "Manage Resources" ON public.resources FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Guidelines" ON public.guidelines;
CREATE POLICY "Public Read Guidelines" ON public.guidelines FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Guidelines" ON public.guidelines;
CREATE POLICY "Manage Guidelines" ON public.guidelines FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tasks Access" ON public.tasks;
CREATE POLICY "Tasks Access" ON public.tasks FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Reports Access" ON public.reports;
CREATE POLICY "Reports Access" ON public.reports FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Announcements" ON public.announcements;
CREATE POLICY "Public Read Announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Announcements" ON public.announcements;
CREATE POLICY "Manage Announcements" ON public.announcements FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "User Read Notifications" ON public.notifications;
CREATE POLICY "User Read Notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 10. MEDIA STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('elevates-media', 'elevates-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Storage Media Select" ON storage.objects;
CREATE POLICY "Public Storage Media Select" ON storage.objects FOR SELECT USING (bucket_id = 'elevates-media');

DROP POLICY IF EXISTS "Authenticated Storage Media Upload" ON storage.objects;
CREATE POLICY "Authenticated Storage Media Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'elevates-media' AND auth.role() = 'authenticated');

-- ============================================================================
-- 11. INITIAL SEED USERS
-- ============================================================================
-- Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert auth.users
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, reauthentication_token
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'founder@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HQ Founder"}'::jsonb, 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'admin@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HQ Admin"}'::jsonb, 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'chairman@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Campus Chairman"}'::jsonb, 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', ''),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'faculty@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Faculty Coordinator"}'::jsonb, 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', ''),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'cr@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Class Representative"}'::jsonb, 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', ''),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'student@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Student"}'::jsonb, 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('123456', gen_salt('bf')),
  email = EXCLUDED.email,
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '';

-- Insert auth.identities (required by Supabase GoTrue Auth)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"founder@elevates.live"}'::jsonb, 'email', '11111111-1111-1111-1111-111111111111', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"admin@elevates.live"}'::jsonb, 'email', '22222222-2222-2222-2222-222222222222', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"chairman@elevates.live"}'::jsonb, 'email', '33333333-3333-3333-3333-333333333333', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"faculty@elevates.live"}'::jsonb, 'email', '44444444-4444-4444-4444-444444444444', now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub":"55555555-5555-5555-5555-555555555555","email":"cr@elevates.live"}'::jsonb, 'email', '55555555-5555-5555-5555-555555555555', now(), now(), now()),
  ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '{"sub":"66666666-6666-6666-6666-666666666666","email":"student@elevates.live"}'::jsonb, 'email', '66666666-6666-6666-6666-666666666666', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert public.profiles
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

-- Insert public.user_roles
INSERT INTO public.user_roles (id, user_id, role_id, role_key, organization_id)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', 'founder', '00000000-0000-0000-0000-000000000001'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '70000000-0000-0000-0000-000000000002', 'hq_admin', '00000000-0000-0000-0000-000000000001'),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '70000000-0000-0000-0000-000000000003', 'chairman', '00000000-0000-0000-0000-000000000001'),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '70000000-0000-0000-0000-000000000004', 'faculty_coordinator', '00000000-0000-0000-0000-000000000001'),
  ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '70000000-0000-0000-0000-000000000005', 'class_representative', '00000000-0000-0000-0000-000000000001'),
  ('a6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '70000000-0000-0000-0000-000000000006', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  role_key = EXCLUDED.role_key;

-- ============================================================================
-- 12. GRANT PERMISSIONS & RELOAD SCHEMA CACHE
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
