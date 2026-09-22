-- ============================================================================
-- scripts/sql/repair_missing_009_010_033.sql
-- ElevatesOS: Safe Idempotent Schema Repair for Migrations 009, 010, & 033
-- ============================================================================
-- WARNING: NEVER RE-APPLY raw 009_system_state_discord_and_audit_triggers.sql
-- OR 010_complete_spec_persistence_and_invitations.sql directly to an existing
-- database. Those legacy migrations contained overly-permissive RLS policies
-- (e.g. FOR ALL USING (true)) and blanket permissions that have been superseded
-- and secured in migration 040_lock_down_rls.sql.
--
-- This repair script provides an IDEMPOTENT, SAFE fallback to create any tables,
-- columns, and indexes introduced in migrations 009, 010, and 033 without reintroducing
-- insecure RLS policies or blanket grants.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. COLUMNS FROM MIGRATIONS 009, 010, & 033
-- ============================================================================

-- 1.1 Chapters (009)
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS applications_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_role_id TEXT,
  ADD COLUMN IF NOT EXISTS website_featured BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_student_invite_codes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_settings JSONB DEFAULT '{}'::jsonb;

-- 1.2 Profiles (009, 010, 033)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id ON public.profiles(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_academic_year ON public.profiles(academic_year);

-- 1.3 Events (009)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_checkin_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_sync_status TEXT DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS discord_event_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_message_id TEXT,
  ADD COLUMN IF NOT EXISTS website_featured BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS live_stream_url TEXT,
  ADD COLUMN IF NOT EXISTS attendance_secret_code TEXT,
  ADD COLUMN IF NOT EXISTS managing_team_mode TEXT DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS media_team_mode TEXT DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS managing_student_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_student_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1.4 Event Registrations (009)
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS discord_notified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1.5 Forms (009)
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS accepting_responses BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

-- 1.6 Clusters (009)
ALTER TABLE public.clusters
  ADD COLUMN IF NOT EXISTS applications_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_role_id TEXT;

-- 1.7 Projects (009, 010)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS discord_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awards TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'idea';

-- 1.8 User Roles (009)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role_key TEXT,
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discord_synced BOOLEAN DEFAULT false;

-- 1.9 Activity Logs (009)
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discord_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 1.10 Certificates (010)
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS achievement TEXT DEFAULT 'Participation',
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;

-- 1.11 Tasks (010)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'documentation',
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 1.12 Invite Tokens (010)
ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS role_key TEXT,
  ADD COLUMN IF NOT EXISTS uses_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 1;

-- ============================================================================
-- 2. TABLES FROM MIGRATIONS 009, 010, & 033 (WITH SECURE RLS POLICIES)
-- ============================================================================

-- 2.1 Chapter Standard Checks (009)
CREATE TABLE IF NOT EXISTS public.chapter_standard_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    standard_id TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chapter_id, standard_id)
);
ALTER TABLE public.chapter_standard_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "chapter_standard_checks_authenticated_read" ON public.chapter_standard_checks;
    DROP POLICY IF EXISTS "chapter_standard_checks_service_write" ON public.chapter_standard_checks;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "chapter_standard_checks_authenticated_read"
    ON public.chapter_standard_checks FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "chapter_standard_checks_service_write"
    ON public.chapter_standard_checks FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.2 Outbound Messages Queue (009)
CREATE TABLE IF NOT EXISTS public.outbound_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL DEFAULT 'in_app',
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_address TEXT NOT NULL,
    template_key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    related_entity TEXT,
    related_id TEXT,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "outbound_messages_select_own" ON public.outbound_messages;
    DROP POLICY IF EXISTS "outbound_messages_service_write" ON public.outbound_messages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "outbound_messages_select_own"
    ON public.outbound_messages FOR SELECT TO authenticated
    USING (
        to_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role_key IN ('founder', 'hq_admin')
        )
    );
CREATE POLICY "outbound_messages_service_write"
    ON public.outbound_messages FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.3 System UI States (009)
CREATE TABLE IF NOT EXISTS public.system_ui_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    section TEXT NOT NULL,
    component_id TEXT,
    state_type TEXT NOT NULL DEFAULT 'button',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    label TEXT,
    icon TEXT,
    tone TEXT DEFAULT 'default',
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    scope TEXT DEFAULT 'global',
    scope_id TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_ui_states ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "system_ui_states_public_read" ON public.system_ui_states;
    DROP POLICY IF EXISTS "system_ui_states_service_write" ON public.system_ui_states;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "system_ui_states_public_read"
    ON public.system_ui_states FOR SELECT TO anon, authenticated
    USING (true);
CREATE POLICY "system_ui_states_service_write"
    ON public.system_ui_states FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.4 Discord Integrations (009)
CREATE TABLE IF NOT EXISTS public.discord_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL UNIQUE,
    guild_name TEXT,
    bot_status TEXT DEFAULT 'online',
    last_heartbeat TIMESTAMPTZ DEFAULT now(),
    announcements_channel_id TEXT,
    events_channel_id TEXT,
    audit_logs_channel_id TEXT,
    leads_channel_id TEXT,
    general_channel_id TEXT,
    webhook_url TEXT,
    audit_webhook_url TEXT,
    sync_events BOOLEAN DEFAULT true,
    sync_announcements BOOLEAN DEFAULT true,
    sync_audit_logs BOOLEAN DEFAULT true,
    sync_registrations BOOLEAN DEFAULT false,
    role_mappings JSONB DEFAULT '{}'::jsonb,
    button_actions_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.discord_integrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "discord_integrations_hq_read" ON public.discord_integrations;
    DROP POLICY IF EXISTS "discord_integrations_service_write" ON public.discord_integrations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "discord_integrations_hq_read"
    ON public.discord_integrations FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role_key IN ('founder', 'hq_admin')
        )
    );
CREATE POLICY "discord_integrations_service_write"
    ON public.discord_integrations FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.5 Discord Sync Queue (009)
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
ALTER TABLE public.discord_sync_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "discord_sync_queue_service_all" ON public.discord_sync_queue;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "discord_sync_queue_service_all"
    ON public.discord_sync_queue FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.6 Website Sections (009)
CREATE TABLE IF NOT EXISTS public.website_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
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
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "website_sections_public_read" ON public.website_sections;
    DROP POLICY IF EXISTS "website_sections_service_write" ON public.website_sections;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "website_sections_public_read"
    ON public.website_sections FOR SELECT TO anon, authenticated
    USING (is_published = true);
CREATE POLICY "website_sections_service_write"
    ON public.website_sections FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.7 Leadership Applications (010)
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
ALTER TABLE public.leadership_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "leadership_applications_read" ON public.leadership_applications;
    DROP POLICY IF EXISTS "leadership_applications_insert_own" ON public.leadership_applications;
    DROP POLICY IF EXISTS "leadership_applications_service_all" ON public.leadership_applications;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "leadership_applications_read"
    ON public.leadership_applications FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND (
                  ur.role_key IN ('founder', 'hq_admin')
                  OR (ur.chapter_id = leadership_applications.chapter_id AND ur.role_key IN ('campus_lead', 'chairman'))
              )
        )
    );
CREATE POLICY "leadership_applications_insert_own"
    ON public.leadership_applications FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "leadership_applications_service_all"
    ON public.leadership_applications FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2.8 Discord Bot Tables (033)
CREATE TABLE IF NOT EXISTS public.guild_config (
    guild_id TEXT PRIMARY KEY,
    guild_type TEXT NOT NULL CHECK (guild_type IN ('main', 'chapter')),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.guild_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    role TEXT,
    designation TEXT,
    elevates_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.discord_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_user_id TEXT NOT NULL,
    discord_username TEXT,
    os_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'linked', 'unlinked')),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlinked_at TIMESTAMPTZ,
    CONSTRAINT discord_links_user_guild_unique UNIQUE (discord_user_id, guild_id)
);
ALTER TABLE public.discord_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.discord_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    discord_user_id TEXT,
    event_type TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discord_events_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.discord_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discord_warnings ENABLE ROW LEVEL SECURITY;

-- Service role access on Discord bot tables
DO $$ BEGIN
    DROP POLICY IF EXISTS "guild_config_service_all" ON public.guild_config;
    DROP POLICY IF EXISTS "users_service_all" ON public.users;
    DROP POLICY IF EXISTS "discord_links_service_all" ON public.discord_links;
    DROP POLICY IF EXISTS "discord_events_log_service_all" ON public.discord_events_log;
    DROP POLICY IF EXISTS "discord_warnings_service_all" ON public.discord_warnings;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "guild_config_service_all" ON public.guild_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_service_all" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "discord_links_service_all" ON public.discord_links FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "discord_events_log_service_all" ON public.discord_events_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "discord_warnings_service_all" ON public.discord_warnings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read for own discord links
DO $$ BEGIN
    DROP POLICY IF EXISTS "discord_links_read_own" ON public.discord_links;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "discord_links_read_own" ON public.discord_links FOR SELECT TO authenticated
    USING (os_user_id = auth.uid());
