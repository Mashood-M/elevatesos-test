-- ============================================================================
-- Migration: 009_system_state_discord_and_audit_triggers.sql
-- Description: 
--   1. Adds missing tables: chapter_standard_checks, outbound_messages,
--      system_ui_states, discord_integrations, discord_sync_queue, website_sections.
--   2. Adds button state & integration columns to existing tables (events, chapters,
--      profiles, forms, clusters, projects, user_roles, activity_logs).
--   3. Implements automated database-level triggers to record all major actions
--      directly into public.activity_logs for the Founder audit log dashboard.
--   4. Enables Supabase Realtime for live updates on Discord, Website, and Audit Log.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ALTER EXISTING TABLES TO SUPPORT BUTTON STATES & DISCORD/WEB SYNC
-- ============================================================================

-- 1.1 Chapters: Add button states & discord channels
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS applications_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_role_id TEXT,
  ADD COLUMN IF NOT EXISTS website_featured BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_student_invite_codes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_settings JSONB DEFAULT '{}'::jsonb;

-- 1.2 Profiles: Add Discord linking and metadata
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id ON public.profiles(discord_user_id);

-- 1.3 Events: Add button states, live checkin toggle, and Discord event IDs
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

-- 1.4 Event Registrations: Add checkin timestamps & discord notification status
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS discord_notified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1.5 Forms: Add response toggle (button state) & Discord webhook
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS accepting_responses BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;

-- 1.6 Clusters: Add application toggle & Discord channels
ALTER TABLE public.clusters
  ADD COLUMN IF NOT EXISTS applications_open BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_role_id TEXT;

-- 1.7 Projects: Add vote count & Discord thread ID
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS discord_thread_id TEXT,
  ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;

-- 1.8 User Roles: Add role_id, role_key, validity & discord sync flags
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role_key TEXT,
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discord_synced BOOLEAN DEFAULT false;

-- Sync role_key from role_id if role_key is missing
UPDATE public.user_roles ur
SET role_key = r.key
FROM public.roles r
WHERE ur.role_id = r.id AND (ur.role_key IS NULL OR ur.role_key = '');

-- Sync role_id from role_key if role_id is missing
UPDATE public.user_roles ur
SET role_id = r.id
FROM public.roles r
WHERE ur.role_key = r.key AND ur.role_id IS NULL;

-- 1.9 Activity Logs: Add severity, chapter relation, and Discord broadcast flags
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discord_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs (actor_id);

-- ============================================================================
-- 2. CREATE MISSING TABLES REQUIRED BY THE SYSTEM
-- ============================================================================

-- 2.1 Chapter Standard Checks
CREATE TABLE IF NOT EXISTS public.chapter_standard_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    standard_id TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chapter_id, standard_id)
);

-- 2.2 Outbound Messages Queue (Email / WhatsApp / Discord / In-App)
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

CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON public.outbound_messages(status);

-- 2.3 System UI States & Button States (Live cross-platform state for Web, OS, and Discord)
CREATE TABLE IF NOT EXISTS public.system_ui_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g. 'btn_event_registration', 'website_hero_cta', 'attendance_scanner_active'
    section TEXT NOT NULL, -- 'events', 'website', 'discord', 'attendance', 'founder_hub', 'chapter_portal'
    component_id TEXT, -- e.g. 'rsvp_button', 'checkin_toggle', 'banner_cta'
    state_type TEXT NOT NULL DEFAULT 'button', -- 'button', 'toggle', 'banner', 'input', 'badge', 'modal'
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    label TEXT, -- e.g. "Register for Event", "Registrations Closed", "Check-in Live"
    icon TEXT,
    tone TEXT DEFAULT 'default', -- 'cyan', 'orange', 'green', 'magenta', 'danger', 'mute'
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    scope TEXT DEFAULT 'global', -- 'global', 'chapter', 'event'
    scope_id TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_ui_states_key ON public.system_ui_states(key);
CREATE INDEX IF NOT EXISTS idx_system_ui_states_section ON public.system_ui_states(section);

-- 2.4 Discord Integrations
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
    button_actions_enabled BOOLEAN DEFAULT true, -- Allows Discord users to click buttons (RSVP, Check-In, Verify)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Discord Sync Queue & Outbound Messages
CREATE TABLE IF NOT EXISTS public.discord_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'event_created', 'event_published', 'announcement', 'audit_alert', 'button_click'
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    channel_id TEXT,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    discord_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_discord_sync_queue_status ON public.discord_sync_queue(status);

-- 2.6 Website Sections & Button States (Dynamic CMS on elevates.live)
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
-- 3. SEED DEFAULT UI STATES, BUTTON STATES & WEBSITE SECTIONS
-- ============================================================================

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
  is_visible = EXCLUDED.is_visible,
  metadata = EXCLUDED.metadata;

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
-- 4. AUTOMATED AUDIT LOGGING TRIGGERS (FOR FOUNDER AUDIT LOG DASHBOARD)
-- ============================================================================

-- Function: Generic audit logger
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
        id,
        actor_id,
        action,
        entity,
        entity_id,
        meta,
        severity,
        chapter_id,
        created_at
    ) VALUES (
        v_log_id,
        p_actor_id,
        p_action,
        p_entity,
        p_entity_id,
        p_meta,
        p_severity,
        p_chapter_id,
        now()
    );

    -- Also queue to Discord if Discord integration has audit sync enabled
    INSERT INTO public.discord_sync_queue (
        event_type,
        entity,
        entity_id,
        payload
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

-- Trigger Function: Events Audit Trigger
CREATE OR REPLACE FUNCTION public.trigger_audit_event_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.record_audit_log(
            NEW.organizer_id,
            'event_created',
            'event',
            NEW.id::text,
            'Created event "' || NEW.title || '" (' || NEW.status || ')',
            'info',
            NEW.chapter_id
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            PERFORM public.record_audit_log(
                NEW.organizer_id,
                'event_status_' || NEW.status,
                'event',
                NEW.id::text,
                'Event status changed from ' || OLD.status || ' to ' || NEW.status || ' for "' || NEW.title || '"',
                'warning',
                NEW.chapter_id
            );
        END IF;
        IF (OLD.is_registration_open IS DISTINCT FROM NEW.is_registration_open) THEN
            PERFORM public.record_audit_log(
                NEW.organizer_id,
                CASE WHEN NEW.is_registration_open THEN 'event_registration_opened' ELSE 'event_registration_closed' END,
                'event',
                NEW.id::text,
                'Registration button toggled ' || CASE WHEN NEW.is_registration_open THEN 'OPEN' ELSE 'CLOSED' END || ' for "' || NEW.title || '"',
                'info',
                NEW.chapter_id
            );
        END IF;
        IF (OLD.is_checkin_active IS DISTINCT FROM NEW.is_checkin_active) THEN
            PERFORM public.record_audit_log(
                NEW.organizer_id,
                CASE WHEN NEW.is_checkin_active THEN 'event_checkin_activated' ELSE 'event_checkin_deactivated' END,
                'event',
                NEW.id::text,
                'Live QR Attendance Scanner ' || CASE WHEN NEW.is_checkin_active THEN 'ACTIVATED' ELSE 'DEACTIVATED' END || ' for "' || NEW.title || '"',
                'info',
                NEW.chapter_id
            );
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.record_audit_log(
            NULL,
            'event_deleted',
            'event',
            OLD.id::text,
            'Deleted event "' || OLD.title || '"',
            'critical',
            OLD.chapter_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_events_trigger ON public.events;
CREATE TRIGGER audit_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_event_changes();

-- Trigger Function: Chapter Status Audit Trigger
CREATE OR REPLACE FUNCTION public.trigger_audit_chapter_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.record_audit_log(
            NULL,
            'chapter_created',
            'chapter',
            NEW.id::text,
            'Created new chapter "' || NEW.name || '" (' || NEW.slug || ') at ' || NEW.college,
            'info',
            NEW.id
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            PERFORM public.record_audit_log(
                NULL,
                'chapter_status_' || NEW.status,
                'chapter',
                NEW.id::text,
                'Chapter status changed from ' || OLD.status || ' to ' || NEW.status,
                'warning',
                NEW.id
            );
        END IF;
        IF (OLD.published IS DISTINCT FROM NEW.published) THEN
            PERFORM public.record_audit_log(
                NULL,
                CASE WHEN NEW.published THEN 'chapter_published' ELSE 'chapter_unpublished' END,
                'chapter',
                NEW.id::text,
                'Chapter published state toggled to ' || CASE WHEN NEW.published THEN 'PUBLISHED' ELSE 'UNPUBLISHED' END,
                'info',
                NEW.id
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

-- Trigger Function: User Roles Audit Trigger (Major security action for Founder)
CREATE OR REPLACE FUNCTION public.trigger_audit_role_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role_key TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_role_key := COALESCE(NEW.role_key, (SELECT key FROM public.roles WHERE id = NEW.role_id), 'assigned_role');
        PERFORM public.record_audit_log(
            auth.uid(),
            'role_assigned',
            'user_role',
            NEW.user_id::text,
            'Assigned role ' || v_role_key || ' to user ' || NEW.user_id::text,
            'critical',
            NEW.chapter_id
        );
    ELSIF (TG_OP = 'DELETE') THEN
        v_role_key := COALESCE(OLD.role_key, (SELECT key FROM public.roles WHERE id = OLD.role_id), 'revoked_role');
        PERFORM public.record_audit_log(
            auth.uid(),
            'role_revoked',
            'user_role',
            OLD.user_id::text,
            'Revoked role ' || v_role_key || ' from user ' || OLD.user_id::text,
            'critical',
            OLD.chapter_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_role_changes();

-- Trigger Function: UI States / Button State Audit Trigger
CREATE OR REPLACE FUNCTION public.trigger_audit_ui_state_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        PERFORM public.record_audit_log(
            NEW.updated_by,
            'ui_state_toggled',
            'system_ui_states',
            NEW.key,
            'State [' || NEW.key || '] (' || NEW.state_type || ') in ' || NEW.section || ' set: enabled=' || NEW.is_enabled::text || ', visible=' || NEW.is_visible::text || ', label="' || COALESCE(NEW.label, '') || '"',
            'info',
            NULL
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
-- 5. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ============================================================================

ALTER TABLE public.chapter_standard_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_ui_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;

-- Chapter standard checks
DROP POLICY IF EXISTS "Public read chapter standards" ON public.chapter_standard_checks;
CREATE POLICY "Public read chapter standards" ON public.chapter_standard_checks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage chapter standards" ON public.chapter_standard_checks;
CREATE POLICY "Manage chapter standards" ON public.chapter_standard_checks FOR ALL USING (auth.uid() IS NOT NULL);

-- Outbound messages
DROP POLICY IF EXISTS "Users read own outbound messages" ON public.outbound_messages;
CREATE POLICY "Users read own outbound messages" ON public.outbound_messages FOR SELECT USING (to_user_id = auth.uid() OR public.is_hq_user());
DROP POLICY IF EXISTS "System insert outbound messages" ON public.outbound_messages;
CREATE POLICY "System insert outbound messages" ON public.outbound_messages FOR INSERT WITH CHECK (true);

-- System UI & Button states
DROP POLICY IF EXISTS "Public read system ui states" ON public.system_ui_states;
CREATE POLICY "Public read system ui states" ON public.system_ui_states FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage system ui states" ON public.system_ui_states;
CREATE POLICY "HQ manage system ui states" ON public.system_ui_states FOR ALL USING (auth.uid() IS NOT NULL);

-- Discord integrations & sync queue
DROP POLICY IF EXISTS "Public read discord integrations" ON public.discord_integrations;
CREATE POLICY "Public read discord integrations" ON public.discord_integrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage discord integrations" ON public.discord_integrations;
CREATE POLICY "HQ manage discord integrations" ON public.discord_integrations FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Manage discord sync queue" ON public.discord_sync_queue;
CREATE POLICY "Manage discord sync queue" ON public.discord_sync_queue FOR ALL USING (auth.uid() IS NOT NULL);

-- Website sections
DROP POLICY IF EXISTS "Public read website sections" ON public.website_sections;
CREATE POLICY "Public read website sections" ON public.website_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "HQ manage website sections" ON public.website_sections;
CREATE POLICY "HQ manage website sections" ON public.website_sections FOR ALL USING (auth.uid() IS NOT NULL);

-- Activity logs RLS update (allow public or authenticated read for audit logs dashboard)
DROP POLICY IF EXISTS "Activity logs viewable by authenticated users" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by authenticated users" ON public.activity_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert activity logs" ON public.activity_logs;
CREATE POLICY "Insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 6. ENABLE SUPABASE REALTIME REPLICATION
-- ============================================================================
-- Enables live updates for website, Discord bot, and Founder Audit Log

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
-- 7. GRANT PERMISSIONS & SCHEMA RELOAD
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
