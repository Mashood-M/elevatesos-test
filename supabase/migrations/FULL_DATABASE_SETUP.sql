-- ============================================================================
-- ELEVATES OS — UNIFIED FULL DATABASE SCHEMA & SYSTEM SETUP
-- Target: Supabase PostgreSQL (Fresh Setup or Migration)
-- Instructions: Paste this entire SQL into your Supabase SQL Editor and click "Run".
-- ============================================================================

-- 0. REQUIRED EXTENSIONS
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
    elevates_id TEXT UNIQUE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    college TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    district TEXT,
    status TEXT NOT NULL DEFAULT 'onboarding', -- 'active', 'inactive', 'onboarding'
    published BOOLEAN DEFAULT false,
    applications_open BOOLEAN DEFAULT true,
    website_featured BOOLEAN DEFAULT true,
    allow_student_invite_codes BOOLEAN DEFAULT true,
    discord_channel_id TEXT,
    discord_role_id TEXT,
    custom_settings JSONB DEFAULT '{}'::jsonb,
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

-- Helper function: generate unique 6-char alphanumeric chapter token (CHP-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_chapter_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I confusion
  result TEXT    := '';
  i      INT;
  attempts INT   := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chapters WHERE elevates_id = 'CHP-' || result);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'generate_chapter_elevates_id: too many collisions';
    END IF;
  END LOOP;
  RETURN 'CHP-' || result;
END;
$$;

-- Trigger: auto-assign elevates_id on INSERT if not supplied
CREATE OR REPLACE FUNCTION public.assign_chapter_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.elevates_id IS NULL OR NEW.elevates_id = '' THEN
    NEW.elevates_id := public.generate_chapter_elevates_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_chapter_insert_assign_elevates_id ON public.chapters;
CREATE TRIGGER before_chapter_insert_assign_elevates_id
  BEFORE INSERT ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.assign_chapter_elevates_id();

-- ============================================================================
-- 2. PROFILES, ROLES & PERMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    elevates_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    department TEXT,
    year TEXT,
    section TEXT,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- 'active', 'disabled'
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
    discord_user_id TEXT,
    discord_username TEXT,
    points INT DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper function: generate unique 6-char alphanumeric user token (ELV-XXXXXX)
CREATE OR REPLACE FUNCTION public.generate_elevates_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT    := '';
  i      INT;
  attempts INT   := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE elevates_id = 'ELV-' || result);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'generate_elevates_id: too many collisions';
    END IF;
  END LOOP;
  RETURN 'ELV-' || result;
END;
$$;

-- Trigger: auto-assign elevates_id on INSERT for profiles
CREATE OR REPLACE FUNCTION public.assign_elevates_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.elevates_id IS NULL OR NEW.elevates_id = '' THEN
    NEW.elevates_id := public.generate_elevates_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_profile_insert_assign_elevates_id ON public.profiles;
CREATE TRIGGER before_profile_insert_assign_elevates_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_elevates_id();

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'chapter', -- 'hq' or 'chapter'
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
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    leadership_term_id UUID,
    is_permanent BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    discord_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

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
-- 4. LEADERSHIP TERMS, ASSIGNMENTS & APPLICATIONS
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
-- 5. CLUSTERS & PROJECTS
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
    applications_open BOOLEAN DEFAULT true,
    discord_channel_id TEXT,
    discord_role_id TEXT,
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
    vote_count INT DEFAULT 0,
    discord_thread_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. EVENTS, FORMS, REGISTRATIONS, ATTENDANCE & CERTIFICATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
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
    -- Button states and Discord/Web sync attributes
    is_registration_open BOOLEAN DEFAULT true,
    is_checkin_active BOOLEAN DEFAULT false,
    discord_sync_status TEXT DEFAULT 'synced',
    discord_event_id TEXT,
    discord_message_id TEXT,
    website_featured BOOLEAN DEFAULT true,
    live_stream_url TEXT,
    attendance_secret_code TEXT,
    managing_team_mode TEXT DEFAULT 'permanent',
    media_team_mode TEXT DEFAULT 'permanent',
    managing_student_ids UUID[] DEFAULT '{}',
    media_student_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

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
    accepting_responses BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    discord_webhook_url TEXT,
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
    checked_in BOOLEAN DEFAULT false,
    checkin_timestamp TIMESTAMPTZ,
    discord_notified BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
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

-- Attendance Compatibility View & Instead Of Insert Trigger
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

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id TEXT UNIQUE NOT NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT now(),
    verification_qr TEXT,
    digital_signature TEXT,
    pdf_url TEXT,
    is_revoked BOOLEAN DEFAULT false,
    download_count INT DEFAULT 0
);

-- ============================================================================
-- 7. PEER LABS, LEADS & INVITE TOKENS
-- ============================================================================
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

CREATE TABLE IF NOT EXISTS public.invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 day'),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================================
-- 8. RESOURCES, GUIDELINES, TASKS, REPORTS, ANNOUNCEMENTS & COMMUNICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapter_standard_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    standard_id TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chapter_id, standard_id)
);

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

CREATE TABLE IF NOT EXISTS public.outbound_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL DEFAULT 'in_app', -- 'email', 'whatsapp', 'in_app', 'discord'
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_address TEXT NOT NULL,
    template_key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'failed'
    related_entity TEXT,
    related_id TEXT,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- ============================================================================
-- 9. CROSS-PLATFORM STATE: BUTTON STATES, DISCORD & WEBSITE CMS
-- ============================================================================

-- Real-time UI & Button states across Web, App, and Discord
CREATE TABLE IF NOT EXISTS public.system_ui_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g. 'btn_event_registration', 'website_hero_cta', 'attendance_scanner_active'
    section TEXT NOT NULL, -- 'events', 'website', 'discord', 'attendance', 'founder_hub', 'chapter_portal'
    component_id TEXT,
    state_type TEXT NOT NULL DEFAULT 'button', -- 'button', 'toggle', 'banner', 'input', 'badge', 'modal'
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    label TEXT,
    icon TEXT,
    tone TEXT DEFAULT 'default', -- 'cyan', 'orange', 'green', 'magenta', 'danger', 'mute'
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    scope TEXT DEFAULT 'global', -- 'global', 'chapter', 'event'
    scope_id TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discord_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL UNIQUE,
    guild_name TEXT,
    bot_status TEXT DEFAULT 'online', -- 'online', 'idle', 'dnd', 'offline'
    last_heartbeat TIMESTAMPTZ DEFAULT now(),
    announcements_channel_id TEXT,
    events_channel_id TEXT,
    audit_logs_channel_id TEXT, -- Direct stream of Founder audit logs into Discord channel!
    leads_channel_id TEXT,
    general_channel_id TEXT,
    webhook_url TEXT,
    audit_webhook_url TEXT,
    sync_events BOOLEAN DEFAULT true,
    sync_announcements BOOLEAN DEFAULT true,
    sync_audit_logs BOOLEAN DEFAULT true,
    sync_registrations BOOLEAN DEFAULT false,
    role_mappings JSONB DEFAULT '{
      "founder": "",
      "hq_admin": "",
      "campus_lead": "",
      "faculty_coordinator": "",
      "class_representative": "",
      "student": ""
    }'::jsonb,
    button_actions_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discord_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    channel_id TEXT,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    discord_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.website_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- 'home_hero', 'home_stats', 'for_colleges_tiers', 'for_colleges_faq', 'nav_cta'
    title TEXT NOT NULL,
    subtitle TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    primary_button_label TEXT,
    primary_button_url TEXT,
    primary_button_enabled BOOLEAN DEFAULT true,
    secondary_button_label TEXT,
    secondary_button_url TEXT,
    secondary_button_enabled BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. AUDIT LOGS & AUTOMATED FOUNDER AUDIT TRAIL TRIGGERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    meta TEXT,
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical', 'security'
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    discord_synced BOOLEAN DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs (entity, entity_id);

-- Central audit recorder function
CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_actor_id UUID,
    p_action TEXT,
    p_entity TEXT,
    p_entity_id TEXT,
    p_meta TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'info',
    p_chapter_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.activity_logs (
        id, actor_id, action, entity, entity_id, meta, severity, chapter_id, created_at
    ) VALUES (
        v_log_id, p_actor_id, p_action, p_entity, p_entity_id, p_meta, p_severity, p_chapter_id, now()
    );

    -- Queue to Discord if Discord integration has audit sync enabled
    INSERT INTO public.discord_sync_queue (
        event_type, entity, entity_id, payload
    )
    SELECT
        'audit_alert',
        'activity_logs',
        v_log_id::text,
        jsonb_build_object(
            'action', p_action,
            'entity', p_entity,
            'entity_id', p_entity_id,
            'severity', p_severity,
            'meta', p_meta,
            'timestamp', now()
        )
    FROM public.discord_integrations
    WHERE sync_audit_logs = true
    LIMIT 1;

    RETURN v_log_id;
END;
$$;

-- Trigger: Events changes
CREATE OR REPLACE FUNCTION public.trigger_audit_event_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.record_audit_log(
            NEW.organizer_id, 'event_created', 'event', NEW.id::text,
            'Created event "' || NEW.title || '" (' || NEW.status || ')', 'info', NEW.chapter_id
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            PERFORM public.record_audit_log(
                NEW.organizer_id, 'event_status_' || NEW.status, 'event', NEW.id::text,
                'Event status changed: ' || OLD.status || ' -> ' || NEW.status || ' for "' || NEW.title || '"', 'warning', NEW.chapter_id
            );
        END IF;
        IF (OLD.is_registration_open IS DISTINCT FROM NEW.is_registration_open) THEN
            PERFORM public.record_audit_log(
                NEW.organizer_id,
                CASE WHEN NEW.is_registration_open THEN 'event_registration_opened' ELSE 'event_registration_closed' END,
                'event', NEW.id::text,
                'Registration button toggled ' || CASE WHEN NEW.is_registration_open THEN 'OPEN' ELSE 'CLOSED' END, 'info', NEW.chapter_id
            );
        END IF;
        IF (OLD.is_checkin_active IS DISTINCT FROM NEW.is_checkin_active) THEN
            PERFORM public.record_audit_log(
                NEW.organizer_id,
                CASE WHEN NEW.is_checkin_active THEN 'event_checkin_activated' ELSE 'event_checkin_deactivated' END,
                'event', NEW.id::text,
                'Live Attendance Scanner ' || CASE WHEN NEW.is_checkin_active THEN 'ACTIVATED' ELSE 'DEACTIVATED' END, 'info', NEW.chapter_id
            );
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.record_audit_log(
            NULL, 'event_deleted', 'event', OLD.id::text,
            'Deleted event "' || OLD.title || '"', 'critical', OLD.chapter_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_events_trigger ON public.events;
CREATE TRIGGER audit_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_event_changes();

-- Trigger: Chapters changes
CREATE OR REPLACE FUNCTION public.trigger_audit_chapter_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.record_audit_log(
            NULL, 'chapter_created', 'chapter', NEW.id::text,
            'Created new chapter "' || NEW.name || '" (' || NEW.slug || ') at ' || NEW.college, 'info', NEW.id
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            PERFORM public.record_audit_log(
                NULL, 'chapter_status_' || NEW.status, 'chapter', NEW.id::text,
                'Chapter status changed: ' || OLD.status || ' -> ' || NEW.status, 'warning', NEW.id
            );
        END IF;
        IF (OLD.published IS DISTINCT FROM NEW.published) THEN
            PERFORM public.record_audit_log(
                NULL,
                CASE WHEN NEW.published THEN 'chapter_published' ELSE 'chapter_unpublished' END,
                'chapter', NEW.id::text,
                'Chapter published state toggled to ' || CASE WHEN NEW.published THEN 'PUBLISHED' ELSE 'UNPUBLISHED' END, 'info', NEW.id
            );
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_chapters_trigger ON public.chapters;
CREATE TRIGGER audit_chapters_trigger
    AFTER INSERT OR UPDATE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_chapter_changes();

-- Trigger: User Role changes (Founder security critical)
CREATE OR REPLACE FUNCTION public.trigger_audit_role_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.record_audit_log(
            auth.uid(), 'role_assigned', 'user_role', NEW.user_id::text,
            'Assigned role ' || NEW.role_key || ' to user ' || NEW.user_id::text, 'critical', NEW.chapter_id
        );
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.record_audit_log(
            auth.uid(), 'role_revoked', 'user_role', OLD.user_id::text,
            'Revoked role ' || OLD.role_key || ' from user ' || OLD.user_id::text, 'critical', OLD.chapter_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_role_changes();

-- Trigger: UI State & Button State Changes
CREATE OR REPLACE FUNCTION public.trigger_audit_ui_state_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        PERFORM public.record_audit_log(
            NEW.updated_by, 'ui_state_toggled', 'system_ui_states', NEW.key,
            'State [' || NEW.key || '] (' || NEW.state_type || ') in ' || NEW.section || ' set: enabled=' || NEW.is_enabled::text || ', visible=' || NEW.is_visible::text || ', label="' || COALESCE(NEW.label, '') || '"', 'info', NULL
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_system_ui_states_trigger ON public.system_ui_states;
CREATE TRIGGER audit_system_ui_states_trigger
    AFTER INSERT OR UPDATE ON public.system_ui_states
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_ui_state_changes();

-- ============================================================================
-- 11. AUTOMATIC PROFILE CREATION TRIGGER (FROM SUPABASE AUTH)
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
-- 12. RLS HELPER FUNCTIONS & GRANULAR POLICIES
-- ============================================================================
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
  IF public.is_hq_user() THEN
    RETURN true;
  END IF;

  SELECT chapter_id INTO v_chapter_id FROM public.events WHERE id = evt_id;
  IF v_chapter_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_chapter_executive(v_chapter_id) THEN
    RETURN true;
  END IF;

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

-- Enable RLS across all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_standard_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_ui_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read organizations" ON public.organizations;
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage organizations" ON public.organizations;
CREATE POLICY "HQ manage organizations" ON public.organizations FOR ALL USING (public.is_hq_user());

DROP POLICY IF EXISTS "Read chapters policy" ON public.chapters;
CREATE POLICY "Read chapters policy" ON public.chapters FOR SELECT USING (
  published = true OR status = 'active' OR public.is_hq_user() OR id = ANY(public.current_user_chapter_ids())
);
DROP POLICY IF EXISTS "HQ manage chapters" ON public.chapters;
CREATE POLICY "HQ manage chapters" ON public.chapters FOR ALL USING (public.is_hq_user());

DROP POLICY IF EXISTS "Read profiles policy" ON public.profiles;
CREATE POLICY "Read profiles policy" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Update own profile or HQ update" ON public.profiles;
CREATE POLICY "Update own profile or HQ update" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_hq_user());
DROP POLICY IF EXISTS "Service insert profiles" ON public.profiles;
CREATE POLICY "Service insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read roles" ON public.roles;
CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage roles" ON public.roles;
CREATE POLICY "HQ manage roles" ON public.roles FOR ALL USING (public.is_hq_user());

DROP POLICY IF EXISTS "Public read permissions" ON public.permissions;
CREATE POLICY "Public read permissions" ON public.permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage permissions" ON public.permissions;
CREATE POLICY "HQ manage permissions" ON public.permissions FOR ALL USING (public.is_hq_user());

DROP POLICY IF EXISTS "Public read role permissions" ON public.role_permissions;
CREATE POLICY "Public read role permissions" ON public.role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage role permissions" ON public.role_permissions;
CREATE POLICY "HQ manage role permissions" ON public.role_permissions FOR ALL USING (public.is_hq_user());

DROP POLICY IF EXISTS "Read user_roles policy" ON public.user_roles;
CREATE POLICY "Read user_roles policy" ON public.user_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Executive or HQ write user_roles" ON public.user_roles;
CREATE POLICY "Executive or HQ write user_roles" ON public.user_roles FOR ALL USING (
  public.is_hq_user() OR (chapter_id IS NOT NULL AND public.is_chapter_executive(chapter_id))
);

DROP POLICY IF EXISTS "Public read departments" ON public.departments;
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage departments" ON public.departments;
CREATE POLICY "Manage departments" ON public.departments FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read class cohorts" ON public.class_cohorts;
CREATE POLICY "Public read class cohorts" ON public.class_cohorts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage class cohorts" ON public.class_cohorts;
CREATE POLICY "Manage class cohorts" ON public.class_cohorts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read events" ON public.events;
CREATE POLICY "Read events policy" ON public.events FOR SELECT USING (
  visibility IN ('public', 'all_chapters', 'open_to_all') OR public.is_hq_user() OR chapter_id = ANY(public.current_user_chapter_ids())
);
DROP POLICY IF EXISTS "Executive or HQ write events" ON public.events;
CREATE POLICY "Executive or HQ write events" ON public.events FOR ALL USING (
  public.is_hq_user() OR public.is_chapter_executive(chapter_id)
);

DROP POLICY IF EXISTS "Event Registrations Access" ON public.event_registrations;
CREATE POLICY "Event Registrations Access" ON public.event_registrations FOR ALL USING (true);

DROP POLICY IF EXISTS "Attendance Records Access" ON public.attendance_records;
CREATE POLICY "Attendance Records Access" ON public.attendance_records FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Read Forms" ON public.forms;
CREATE POLICY "Public Read Forms" ON public.forms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage Forms" ON public.forms;
CREATE POLICY "Manage Forms" ON public.forms FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public Submit Form Responses" ON public.form_responses;
CREATE POLICY "Public Submit Form Responses" ON public.form_responses FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Form Responses Access" ON public.form_responses;
CREATE POLICY "Form Responses Access" ON public.form_responses FOR ALL USING (auth.uid() IS NOT NULL);

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

DROP POLICY IF EXISTS "Public read system ui states" ON public.system_ui_states;
CREATE POLICY "Public read system ui states" ON public.system_ui_states FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage system ui states" ON public.system_ui_states;
CREATE POLICY "HQ manage system ui states" ON public.system_ui_states FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read discord integrations" ON public.discord_integrations;
CREATE POLICY "Public read discord integrations" ON public.discord_integrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage discord integrations" ON public.discord_integrations;
CREATE POLICY "HQ manage discord integrations" ON public.discord_integrations FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Manage discord sync queue" ON public.discord_sync_queue;
CREATE POLICY "Manage discord sync queue" ON public.discord_sync_queue FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read website sections" ON public.website_sections;
CREATE POLICY "Public read website sections" ON public.website_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage website sections" ON public.website_sections;
CREATE POLICY "HQ manage website sections" ON public.website_sections FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Activity logs viewable by all" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by all" ON public.activity_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert activity logs" ON public.activity_logs;
CREATE POLICY "Insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 13. SEED SYSTEM ROLES & PERMISSIONS
-- ============================================================================
INSERT INTO public.roles (id, key, name, scope, description)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'founder', 'HQ Founder', 'hq', 'Full platform administrative access across HQ and all campus chapters'),
  ('70000000-0000-0000-0000-000000000002', 'hq_admin', 'HQ Admin', 'hq', 'HQ operation and campus chapter management permissions'),
  ('70000000-0000-0000-0000-000000000003', 'chairman', 'Campus Executive', 'chapter', 'Chapter leadership, event management, and team oversight'),
  ('70000000-0000-0000-0000-000000000004', 'faculty_coordinator', 'Faculty Coordinator', 'chapter', 'Faculty window, event approvals, and academic coordination'),
  ('70000000-0000-0000-0000-000000000005', 'class_representative', 'Class Representative', 'chapter', 'Class cohort coordination, announcements, and student engagement'),
  ('70000000-0000-0000-0000-000000000006', 'student', 'Student', 'chapter', 'Student access, event registration, certificates, and portfolio'),
  ('70000000-0000-0000-0000-000000000007', 'campus_lead', 'Campus Lead', 'chapter', 'Primary student lead driving chapter operations'),
  ('70000000-0000-0000-0000-000000000008', 'hq_mentor', 'HQ Mentor', 'hq', 'Advisory and mentorship across clusters and hackathons'),
  ('70000000-0000-0000-0000-000000000009', 'vice_chairman', 'Vice Chairman', 'chapter', 'Deputy chapter executive lead'),
  ('70000000-0000-0000-0000-000000000010', 'secretary', 'Secretary', 'chapter', 'Chapter operations, scheduling, and official records'),
  ('70000000-0000-0000-0000-000000000011', 'joint_secretary', 'Joint Secretary', 'chapter', 'Assistant secretary and logistics coordinator'),
  ('70000000-0000-0000-0000-000000000012', 'elevates_coordinator', 'Elevates Coordinator', 'chapter', 'Overall chapter activities and campus bridge'),
  ('70000000-0000-0000-0000-000000000013', 'technical_lead', 'Technical Lead', 'chapter', 'Software platforms, hackathons, and systems infra'),
  ('70000000-0000-0000-0000-000000000014', 'technical_team', 'Technical Team', 'chapter', 'Development, hardware and software contributors'),
  ('70000000-0000-0000-0000-000000000015', 'media_lead', 'Media Lead', 'chapter', 'Design, social channels, photography, and branding'),
  ('70000000-0000-0000-0000-000000000016', 'media_team', 'Media Team', 'chapter', 'Media coverage, visual identity, and social content'),
  ('70000000-0000-0000-0000-000000000017', 'innovation_lead', 'Innovation Lead', 'chapter', 'Cluster projects, patents, and startup initiatives'),
  ('70000000-0000-0000-0000-000000000018', 'innovation_team', 'Innovation Team', 'chapter', 'Cluster build contributors and challenge participants'),
  ('70000000-0000-0000-0000-000000000019', 'alumni', 'Alumni', 'chapter', 'Graduated member maintaining industry mentorship'),
  ('70000000-0000-0000-0000-000000000020', 'guest', 'Guest User', 'chapter', 'Prospective student or external guest visitor'),
  ('70000000-0000-0000-0000-000000000021', 'industry_mentor', 'Industry Mentor', 'hq', 'External industry specialist advising student projects')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

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
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Grant ALL permissions to Founder & HQ Admin
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key IN ('founder', 'hq_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- ============================================================================
-- 14. SEED ORGANIZATIONS, SYSTEM PRESETS & PINNED TEST CHAPTER
-- ============================================================================
INSERT INTO public.organizations (id, name, slug, tagline, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Elevates',
  'elevates',
  'Campus Operating System',
  $SETTINGS${"event_categories":["WORKSHOP","HACKATHON","MEETUP","LECTURE","LAB","SHOWCASE","CHALLENGE"],"standard_departments":["Computer Science & Engineering (CSE)","Artificial Intelligence & Data Science (AI & DS)","Information Technology (IT)","Electronics & Communication Engineering (ECE)","Electrical & Electronics Engineering (EEE)","Mechanical Engineering (ME)","Civil Engineering (CE)"],"resource_categories":[{"key":"sop","label":"SOP"},{"key":"workshop_kit","label":"Workshop Kit"},{"key":"ppt","label":"Presentation"},{"key":"poster","label":"Poster"},{"key":"logo","label":"Logo Pack"},{"key":"certificate","label":"Certificate"},{"key":"sponsor_deck","label":"Sponsor Deck"},{"key":"coding","label":"Coding"},{"key":"recording","label":"Recording"}],"guideline_categories":["Operations","Events","Members","Governance","Brand","Reporting"],"academic_years":["1st","2nd","3rd","4th"],"academic_divisions":["T1","T2","T3","A","B","C","D"],"executive_sub_teams":[{"id":"officers","label":"Core Officers","emoji":"👑","tone":"cyan","roles":["chairman","vice_chairman","secretary","joint_secretary"],"note":"Chairman (1) · Vice Chairmen (2+) · Secretary (1) · Joint Secretary"},{"id":"media","label":"Media Team","emoji":"📸","tone":"orange","roles":["media_lead","media_team"],"note":"2 Heads + 8 Members — Design, Photography, Social, Coverage"},{"id":"technical","label":"Technical Team","emoji":"💻","tone":"green","roles":["technical_lead","technical_team"],"note":"2 Heads + Members — Platform, Dev, Infra, Workshops"},{"id":"innovation","label":"Innovation Team","emoji":"🚀","tone":"cyan","roles":["innovation_lead","innovation_team"],"note":"2 Heads + Members — AI Labs, Hackathons, Idea Sprints"}],"founders":[{"id":"sarhan-qadir-kvm","num":"#01","name":"Sarhan Qadir KVM","tag":"Main Class Bunker","role":"Founder","proof":"Full-stack · Built elevates.live","linkedin":"https://linkedin.com/in/sarhanqadir","cohort":"2025-26","image":"/founders/sarhan-qadir.jpeg"},{"id":"naseem-shan","num":"#02","name":"Naseem Shan","tag":"Studies In Silence","role":"Founder","proof":"Backend · Systems & Infrastructure","linkedin":"https://linkedin.com/in/naseemshan","cohort":"2025-26","image":"/founders/naseem-shan.jpeg"},{"id":"muhammed-nafih-p","num":"#03","name":"Muhammed Nafih P","tag":"Design Wizard","role":"Founder","proof":"Design · Aaroh brand and UI","linkedin":"https://linkedin.com/in/nafihp","cohort":"2025-26","image":"/founders/nafih.jpeg"},{"id":"anil-das-p","num":"#04","name":"Anil Das P","tag":"Last Minute Committer","role":"Founder","proof":"Development · Ships right before deadline","linkedin":"https://linkedin.com/in/anildasp","cohort":"2025-26","image":"/founders/anil-das.jpeg"},{"id":"nadheem-roshan","num":"#05","name":"Nadheem Roshan","tag":"Coming For 75% Attendance","role":"Founder","proof":"IoT · Hardware & Embedded Systems","linkedin":"https://linkedin.com/in/nadheemroshan","cohort":"2025-26","image":"/founders/nadheem.jpg"},{"id":"muhammed-shanif-p","num":"#06","name":"Muhammed Shanif P","tag":"Hardware Hacker","role":"Founder","proof":"Embedded · Vibranium RFID check-in","linkedin":"https://linkedin.com/in/shanifp","cohort":"2025-26","image":"/founders/shanif.jpeg"},{"id":"adhinan-k","num":"#07","name":"Adhinan K","tag":"Terminal Addict","role":"Founder","proof":"DevOps · Linux & server infrastructure","linkedin":"https://linkedin.com/in/adhinank","cohort":"2025-26","image":"/founders/adhinan.png"},{"id":"mashood-m","num":"#08","name":"Mashood M","tag":"Unfinished Project Collector","role":"Founder","proof":"Development · Multiple ambitious WIPs","linkedin":"https://linkedin.com/in/mashoodm","cohort":"2025-26","image":"/founders/mashood.jpeg"},{"id":"mohammed-shahin-ek","num":"#09","name":"Mohammed Shahin E K","tag":"Late Night Shipper","role":"Founder","proof":"Backend · 400k requests, zero downtime","linkedin":"https://linkedin.com/in/shahinek","cohort":"2025-26","image":"/founders/shahin-ek.jpeg"},{"id":"shifna-kp","num":"#10","name":"Shifna K P","tag":"The Reason We Shipped","role":"Founder","proof":"Ops · Campus launch, 120 seats in 2 hours","linkedin":"https://linkedin.com/in/shifnakp","cohort":"2025-26","image":"/founders/shifna.jpeg"},{"id":"mohammed-mijvad","num":"#11","name":"Mohammed Mijvad","tag":"Lab Bench Resident","role":"Founder","proof":"Hardware · Lab systems & electronics","linkedin":"https://linkedin.com/in/mijvad","cohort":"2025-26","image":"/founders/mijvad.jpeg"},{"id":"sona-varghese","num":"#12","name":"Sona Varghese","tag":"Zero Stage Fright","role":"Founder","proof":"Events · Ran the first public showcase","linkedin":"https://linkedin.com/in/sonavarghese","cohort":"2025-26","image":"/founders/sona.jpg"},{"id":"ashith-mk","num":"#13","name":"Ashith MK","tag":"Bug Hunter","role":"Founder","proof":"Security · Ran the cybersecurity workshop","linkedin":"https://linkedin.com/in/ashithmk","cohort":"2025-26","image":"/founders/ashith.jpeg"},{"id":"arshak-perumballil","num":"#14","name":"Arshak Perumballil","tag":"PPT Specialist","role":"Founder","proof":"Comms · Every deck that got us in a room","linkedin":"https://linkedin.com/in/arshakp","cohort":"2025-26","image":"/founders/arshak.png"},{"id":"sinan-nooren","num":"#15","name":"Sinan Nooren","tag":"Quiet Builder","role":"Founder","proof":"Development · Builds first, talks later","linkedin":"https://linkedin.com/in/sinannooren","cohort":"2025-26","image":"/founders/sinan-nooren.png"},{"id":"muhammed-fiyas","num":"#16","name":"Muhammed Fiyas","tag":"Works On My Machine","role":"Founder","proof":"Development · Environment debugging specialist","linkedin":"https://linkedin.com/in/fiyas","cohort":"2025-26","image":"/founders/fiyas.png"},{"id":"adil-pt","num":"#17","name":"Adil P T","tag":"Back Bencher","role":"Founder","proof":"Dev · Quietly ships from the back row","linkedin":"https://linkedin.com/in/adilpt","cohort":"2025-26","image":"/founders/adil.jpeg"},{"id":"abdul-haadi","num":"#18","name":"Abdul Haadi","tag":"Front Bencher","role":"Founder","proof":"Python · Development & Backend","linkedin":"https://linkedin.com/in/abdulhaadi","cohort":"2025-26","image":"/founders/haadi.jpeg"}],"advisors":[{"id":"jasira-kt","name":"Jasira KT","role":"Faculty Head & Advisor","institution":"CSE, Eranad Knowledge City Technical Campus","image":"/faculaty/jasira-kt.jpeg"}],"founding_team_image":"/founders/founding-team.png","form_templates":[{"id":"event_registration","name":"Event registration","description":"Campus event signup with class representative routing — Elevates’ default registration pack.","purpose":"registration","suggestEvent":true,"previewQuestions":["Class representative","Full name","Phone","Department","Year"],"questions":[{"id":"f-rep","type":"short_text","title":"Class representative","required":false},{"id":"f-name","type":"short_text","title":"Full name","required":true},{"id":"f-phone","type":"short_text","title":"Phone","required":true},{"id":"f-dept","type":"short_text","title":"Department","required":true},{"id":"f-year","type":"short_text","title":"Year","required":true}]},{"id":"event_feedback","name":"Event feedback","description":"Post-session rating, takeaways, and suggestions.","purpose":"feedback","suggestEvent":true,"previewQuestions":["Overall rating","What did you build or learn?","Suggestions"],"questions":[{"id":"fb-rating","type":"rating","title":"How would you rate this session?","required":true},{"id":"fb-learn","type":"long_text","title":"What did you build or take away?","required":false},{"id":"fb-suggest","type":"long_text","title":"How can the chapter improve?","required":false}]},{"id":"workshop_signup","name":"Hands-on workshop signup","description":"Hardware/software prerequisites and track selection.","purpose":"registration","suggestEvent":true,"previewQuestions":["Track choice","Laptop / OS","GitHub or portfolio"],"questions":[{"id":"ws-track","type":"single_choice","title":"Track","required":true,"options":["Web / Full Stack","AI / ML","Systems / Embedded","Design / Product"]},{"id":"ws-laptop","type":"single_choice","title":"Will you bring a laptop?","required":true,"options":["Yes — Linux / macOS","Yes — Windows","Need lab machine"]},{"id":"ws-github","type":"short_text","title":"GitHub or portfolio URL","required":false}]},{"id":"chapter_survey","name":"Campus interest survey","description":"Gauge student demand for upcoming clusters and weekend sprints.","purpose":"survey","suggestEvent":false,"previewQuestions":["Topics you want next","Preferred sprint hours","Willingness to mentor"],"questions":[{"id":"cs-topics","type":"multiple_choice","title":"What topics excite you most?","required":true,"options":["Rust & Systems","Next.js & Cloud","LLMs & Agentic AI","Mobile / Flutter","Hardware & IoT"]},{"id":"cs-hours","type":"single_choice","title":"Best time for sprints?","required":true,"options":["Saturday mornings","Sunday afternoons","Weekday evenings"]},{"id":"cs-mentor","type":"single_choice","title":"Interested in peer mentoring?","required":true,"options":["Yes","Maybe later","Want to learn first"]}]},{"id":"volunteer_interest","name":"Chapter team volunteer interest","description":"Recruit volunteers for media, dev, logistics, and hospitality.","purpose":"volunteer","suggestEvent":false,"previewQuestions":["Team preference","Weekly availability","Past experience"],"questions":[{"id":"vol-team","type":"single_choice","title":"Preferred team","required":true,"options":["Media & Design","Tech & Infra","Logistics & Gate","Hospitality & Speakers"]},{"id":"vol-hours","type":"short_text","title":"Hours per week you can commit","required":true},{"id":"vol-exp","type":"long_text","title":"Briefly tell us what you have worked on before","required":false}]},{"id":"blank","name":"Blank form","description":"Start from scratch with title, description, and custom questions.","purpose":"custom","suggestEvent":false,"previewQuestions":["Add your own fields in the visual builder"],"questions":[]}],"doctrine":{"vision":"Build Kerala’s largest student innovation network.","mission":["Discover hidden talent.","Build confidence.","Create opportunities.","Develop industry-ready innovators."],"philosophy":["We don’t create talent.","We discover it.","We nurture it.","We showcase it."],"principles":["Open community","Learn by building","Technology for every department","Leadership through responsibility","Community before competition","Projects over certificates","Anyone can join anytime"],"pillars":[{"id":"open","title":"Open Community","body":"Every student belongs to Elevates. No fee, no department gate, no year restriction."},{"id":"talent","title":"Talent Discovery","body":"We find hidden talent — especially students who are often overlooked."},{"id":"cluster","title":"Cluster-Based Growth","body":"Committed students grow through advanced learning and real projects in clusters."},{"id":"build","title":"Build First","body":"Projects, products, and real-world experience matter more than certificates."},{"id":"lead","title":"Student Leadership","body":"Students lead the community, mentor others, and build a sustainable culture."}],"coreRules":["No membership fees for students — ever.","No department restrictions — technology is for all.","No year restrictions — first year to final year equal opportunity.","Open-source first — software built in Elevates belongs to community.","Merit-based advancement into clusters.","Respect faculty and campus rules while leading student innovation."],"communityTiers":[{"tier":"everyone","label":"Everyone","access":"Open events, workshops, campus announcements"},{"tier":"active_member","label":"Active Member","access":"Form submissions, hackathons, certificate verification"},{"tier":"cluster_fellow","label":"Cluster Fellow","access":"Project repo access, mentor pairing, sprint teams"},{"tier":"campus_lead","label":"Campus Lead","access":"Term management, attendance scan, event publishing"}],"journeyStages":[{"stage":"awareness","label":"Awareness","detail":"First contact via poster, workshop, or representative"},{"stage":"attendee","label":"Attendee","detail":"Completed at least one workshop or hands-on lab"},{"stage":"contributor","label":"Contributor","detail":"Contributed code or volunteer time to chapter projects"},{"stage":"fellow","label":"Fellow","detail":"Active cluster member leading projects"},{"stage":"lead","label":"Leader","detail":"Core officer or domain lead running chapter operations"}],"eventProgression":[{"stage":"awareness","title":"Campus Orientation & Tech Demos","format":"Meetup"},{"stage":"hands_on","title":"Hands-on Workshops & Labs","format":"Workshop"},{"stage":"sprint","title":"Hackathons & Build Challenges","format":"Hackathon"},{"stage":"showcase","title":"Demo Days & Product Launch","format":"Showcase"}],"activities":[{"title":"Weekly Dev Sprints","frequency":"Weekly","desc":"Collaborative project build sessions in campus labs"},{"title":"Open Mic Tech Talks","frequency":"Bi-weekly","desc":"Short 15-minute student lightning talks on emerging tools"},{"title":"Flagship Hackathons","frequency":"Per Semester","desc":"24h–36h multi-track hackathons with industry mentors"},{"title":"Peer Labs","frequency":"Monthly","desc":"Student-to-student deep dives on AI, Web3, Systems, Cloud"}],"chapterStandards":["At least 1 core workshop or lab conducted per month","Minimum 8 active executive team members across all domains","Regular attendance syncing via QR check-ins","Timely event reporting submitted to HQ after completion","Open cluster recruitment twice per academic year"],"clusterResponsibilities":["Design and execute hands-on curriculum for cluster fellows","Deliver minimum 1 functional production project per term","Mentor 1st and 2nd year students during chapter hackathons","Maintain cluster documentation and public GitHub repository"],"successMetrics":["Number of active students engaged across academic year","Number of production-ready projects built and deployed","Rate of successful student transitions into technical careers","Diversity of student representation across departments"],"playbookSections":[{"id":"vision","title":"01. Vision & Purpose"},{"id":"pillars","title":"02. Core Pillars"},{"id":"rules","title":"03. Non-Negotiable Rules"},{"id":"tiers","title":"04. Engagement Tiers"},{"id":"progression","title":"05. Journey & Progression"},{"id":"standards","title":"06. Chapter Standards"}]},"developer_scopes":[{"id":"events:read","label":"Read Events & Checkpoints"},{"id":"events:write","label":"Create / RSVP Events"},{"id":"chapters:read","label":"Read Chapters & Leadership"},{"id":"leads:write","label":"Submit Inquiries & Forms"},{"id":"webhooks:revalidate","label":"Trigger ISR Cache Purge"},{"id":"admin:full","label":"Full Administrative Access"}]}$SETTINGS$::jsonb
)
ON CONFLICT (slug) DO UPDATE SET settings = EXCLUDED.settings;

-- Seed Pinned Test Sandbox Chapter
INSERT INTO public.chapters (
  id, elevates_id, organization_id, name, slug, college, city, status, published, health_score, member_count, event_count, project_count, founded_at, notes
) VALUES (
  'e1e7a050-7e57-4c8a-9b12-a1b2c3d4e5f6',
  'CHP-TEST01',
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
) ON CONFLICT (slug) DO NOTHING;

-- Seed Default UI States & Button States
INSERT INTO public.system_ui_states (key, section, component_id, state_type, is_enabled, is_visible, label, tone, metadata)
VALUES
  ('btn_event_rsvp', 'events', 'event_rsvp_action', 'button', true, true, 'Register Now', 'cyan', '{"allow_guest": true, "show_qr_instant": true}'::jsonb),
  ('btn_event_checkin', 'attendance', 'live_attendance_scanner', 'toggle', true, true, 'Scanner Active', 'green', '{"method": "qr", "auto_verify": true}'::jsonb),
  ('btn_chapter_apply', 'chapter_portal', 'join_chapter_cta', 'button', true, true, 'Apply to Join Chapter', 'orange', '{"route": "/apply"}'::jsonb),
  ('btn_website_hero_primary', 'website', 'hero_cta_primary', 'button', true, true, 'Explore Chapters', 'orange', '{"url": "/chapters"}'::jsonb),
  ('btn_website_hero_secondary', 'website', 'hero_cta_secondary', 'button', true, true, 'Start an Elevates Chapter', 'mute', '{"url": "/for-colleges"}'::jsonb),
  ('toggle_discord_event_sync', 'discord', 'auto_sync_events', 'toggle', true, true, 'Sync Events to Discord', 'cyan', '{"notify_roles": ["student"]}'::jsonb),
  ('toggle_discord_audit_sync', 'discord', 'auto_sync_audit', 'toggle', true, true, 'Stream Audit Logs to Discord', 'magenta', '{"min_severity": "info"}'::jsonb),
  ('banner_maintenance_mode', 'general', 'global_maintenance_banner', 'banner', false, false, 'System undergoing scheduled maintenance', 'danger', '{}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  is_enabled = EXCLUDED.is_enabled,
  is_visible = EXCLUDED.is_visible;

-- Seed Default Website CMS Sections
INSERT INTO public.website_sections (slug, title, subtitle, primary_button_label, primary_button_url, primary_button_enabled, is_published, sort_order)
VALUES
  ('home_hero', 'Discover Hidden Talent. Build Kerala’s Future.', 'Kerala’s largest student innovation network and campus operating system.', 'Explore Chapters', '/chapters', true, true, 1),
  ('home_stats', 'Network at Scale', 'Real-time counters across all connected campuses', 'View Live Metrics', '/hq/analytics', true, true, 2),
  ('for_colleges_tiers', 'Four Tiers of Institutional Partnership', 'From campus kickoff to full innovation chapter integration.', 'Download Institutional Deck', '/elevates-for-colleges.pdf', true, true, 3),
  ('for_colleges_faq', 'Accreditation, KTU Activity Points & FAQs', 'How Elevates directly maps to student activity points and NAAC criteria.', 'Schedule a Campus Visit', '/for-colleges#contact', true, true, 4)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  primary_button_label = EXCLUDED.primary_button_label,
  primary_button_url = EXCLUDED.primary_button_url;

-- ============================================================================
-- 15. INITIAL SEED LOGIN ACCOUNTS (Password for all: 123456)
-- ============================================================================
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'founder@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HQ Founder"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'admin@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HQ Admin"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'chairman@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Campus Chairman"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'faculty@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Faculty Coordinator"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'cr@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Class Representative"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'student@elevates.live', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Student"}'::jsonb, 'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('123456', gen_salt('bf')),
  email = EXCLUDED.email;

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

-- ============================================================================
-- 16. MEDIA STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('elevates-media', 'elevates-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Storage Media Select" ON storage.objects;
CREATE POLICY "Public Storage Media Select" ON storage.objects FOR SELECT USING (bucket_id = 'elevates-media');

DROP POLICY IF EXISTS "Authenticated Storage Media Upload" ON storage.objects;
CREATE POLICY "Authenticated Storage Media Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'elevates-media' AND auth.role() = 'authenticated');

-- ============================================================================
-- 17. SUPABASE REALTIME REPLICATION (For Discord, Web & Live Audit)
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_ui_states;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_sync_queue;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.website_sections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 18. GRANT PERMISSIONS & RELOAD SCHEMA CACHE
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
-- ============================================================================
-- Migration 010: Complete Spec Persistence, Invitations, & Domain Operations
-- ============================================================================
-- Run this migration in Supabase SQL Editor to support all custom invite flows,
-- leadership applications, projects, tasks, certificates, and user profiles.

-- 1. ENHANCE INVITE TOKENS (Institutional Chapter Codes, Personal Referrals, Role Invites)
ALTER TABLE public.invite_tokens
    ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS role_key TEXT,
    ADD COLUMN IF NOT EXISTS uses_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_invite_tokens_type ON public.invite_tokens(invite_type);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_code ON public.invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_chapter ON public.invite_tokens(chapter_id);

-- 2. LEADERSHIP APPLICATIONS (Domain 1, Section 3)
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

CREATE INDEX IF NOT EXISTS idx_leadership_apps_term ON public.leadership_applications(term_id);
CREATE INDEX IF NOT EXISTS idx_leadership_apps_chapter ON public.leadership_applications(chapter_id);
CREATE INDEX IF NOT EXISTS idx_leadership_apps_user ON public.leadership_applications(user_id);

ALTER TABLE public.leadership_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all for authenticated on leadership_applications" ON public.leadership_applications;
    DROP POLICY IF EXISTS "Allow all for service_role on leadership_applications" ON public.leadership_applications;
    DROP POLICY IF EXISTS "Allow public read on leadership_applications" ON public.leadership_applications;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Allow public read on leadership_applications"
    ON public.leadership_applications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all for authenticated on leadership_applications"
    ON public.leadership_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service_role on leadership_applications"
    ON public.leadership_applications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. PROJECTS ENHANCEMENTS (Domain 4, Section 13)
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS team_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS awards TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'idea';

CREATE INDEX IF NOT EXISTS idx_projects_chapter ON public.projects(chapter_id);
CREATE INDEX IF NOT EXISTS idx_projects_cluster ON public.projects(cluster_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage);

-- 4. CERTIFICATES ENHANCEMENTS (Domain 3, Section 11)
ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS achievement TEXT DEFAULT 'Participation',
    ADD COLUMN IF NOT EXISTS pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON public.certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);

-- 5. TASKS ENHANCEMENTS (Domain 5, Section 15)
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'documentation',
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_tasks_chapter ON public.tasks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- 6. PROFILES RESUME & TALENT DISCOVERY (Domain 2, Section 5)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 7. AUDIT TRIGGER FOR LEADERSHIP APPLICATIONS
CREATE OR REPLACE FUNCTION public.audit_leadership_application_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            'leadership_application_submitted',
            'leadership_application',
            NEW.id::text,
            jsonb_build_object('term_id', NEW.term_id, 'role_key', NEW.role_key, 'title', NEW.title, 'chapter_id', NEW.chapter_id),
            now()
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            'leadership_application_' || NEW.status,
            'leadership_application',
            NEW.id::text,
            jsonb_build_object('term_id', NEW.term_id, 'role_key', NEW.role_key, 'old_status', OLD.status, 'new_status', NEW.status),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_leadership_application ON public.leadership_applications;
CREATE TRIGGER trg_audit_leadership_application
    AFTER INSERT OR UPDATE ON public.leadership_applications
    FOR EACH ROW EXECUTE FUNCTION public.audit_leadership_application_change();

-- 8. AUDIT TRIGGER FOR PROJECTS
CREATE OR REPLACE FUNCTION public.audit_project_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NULL,
            'project_created',
            'project',
            NEW.id::text,
            jsonb_build_object('title', NEW.title, 'stage', NEW.stage, 'chapter_id', NEW.chapter_id),
            now()
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NULL,
            'project_stage_changed',
            'project',
            NEW.id::text,
            jsonb_build_object('title', NEW.title, 'old_stage', OLD.stage, 'new_stage', NEW.stage),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_project ON public.projects;
CREATE TRIGGER trg_audit_project
    AFTER INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.audit_project_change();

-- 9. AUDIT TRIGGER FOR CERTIFICATES
CREATE OR REPLACE FUNCTION public.audit_certificate_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            'certificate_issued',
            'certificate',
            NEW.certificate_id,
            jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.user_id, 'achievement', NEW.achievement),
            now()
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.is_revoked IS DISTINCT FROM NEW.is_revoked) THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            CASE WHEN NEW.is_revoked THEN 'certificate_revoked' ELSE 'certificate_restored' END,
            'certificate',
            NEW.certificate_id,
            jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.user_id),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_certificate ON public.certificates;
CREATE TRIGGER trg_audit_certificate
    AFTER INSERT OR UPDATE ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.audit_certificate_change();

-- 10. CHAPTER STANDARD CHECKS ENHANCEMENTS
ALTER TABLE public.chapter_standard_checks
    ADD COLUMN IF NOT EXISTS standard_id TEXT,
    ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS note TEXT;


