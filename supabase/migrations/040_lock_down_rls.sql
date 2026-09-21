-- ============================================================================
-- ELEVATES OS - MIGRATION 040: LOCK DOWN ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- WARNING: NEVER re-apply the whole of migration 009 or 010 to an existing
-- database. Migrations 009 and 010 contain blanket "GRANT ALL ON ALL TABLES
-- IN SCHEMA public TO anon, authenticated, service_role;" and overly permissive
-- RLS policies (e.g. "USING (true)") that completely undo security hardening.
-- If any tables/columns from 009, 010, or 033 are missing on an older database,
-- execute scripts/sql/repair_missing_009_010_033.sql instead.
--
-- SUMMARY OF HARDENING IN THIS MIGRATION:
-- 1. Restrict discord bot verification codes and internal bot state to service_role only.
-- 2. Restrict discord_links to authenticated users reading their own row, writes to service_role.
-- 3. Lock down leadership & volunteer tables: authenticated SELECT only, writes via service_role.
-- 4. Secure discord_integrations: remove public access, restrict writes/reads to service_role & HQ.
-- 5. Revoke anonymous profile reads: require authenticated session for SELECT on profiles.
-- 6. Lock down activity_logs: remove public SELECT and INSERT; SELECT for HQ only; service_role writes.
-- 7. Ensure system_ui_states, website_sections, chapter_standard_checks, and outbound_messages
--    allow writes via service_role only (removing FOR ALL USING (auth.uid() IS NOT NULL)).
--    system_ui_states and website_sections retain public SELECT; the others do not.
-- 8. Confirm all audit triggers and logging functions are declared SECURITY DEFINER.
-- ============================================================================

-- Ensure helper function for HQ role detection exists and is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_hq_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.key IN ('founder', 'hq_admin', 'operations_lead', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('Founder', 'HQ Admin', 'HQ Operations', 'super_admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- 1. DISCORD VERIFICATION CODES (SERVICE ROLE ONLY)
-- Dropping exact policy names from migration 034 & prior
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.discord_verification_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own verification codes" ON public.discord_verification_codes;
DROP POLICY IF EXISTS "Service role manage verification codes" ON public.discord_verification_codes;
DROP POLICY IF EXISTS "Allow service_role on discord_verification_codes" ON public.discord_verification_codes;
REVOKE ALL ON public.discord_verification_codes FROM anon, authenticated;
GRANT ALL ON public.discord_verification_codes TO service_role;

CREATE POLICY "Service role manage verification codes"
  ON public.discord_verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. BOT CONFIGURATION, QUEUE, AND LOG TABLES (SERVICE ROLE ONLY)
-- Dropping exact policy names from migration 009, 033, 038
-- ----------------------------------------------------------------------------

-- chapter_setup_tokens
ALTER TABLE IF EXISTS public.chapter_setup_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage setup tokens" ON public.chapter_setup_tokens;
DROP POLICY IF EXISTS "Public manage setup tokens" ON public.chapter_setup_tokens;
REVOKE ALL ON public.chapter_setup_tokens FROM anon, authenticated;
GRANT ALL ON public.chapter_setup_tokens TO service_role;

CREATE POLICY "Service role manage setup tokens"
  ON public.chapter_setup_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cluster_discord_mappings
ALTER TABLE IF EXISTS public.cluster_discord_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage cluster mappings" ON public.cluster_discord_mappings;
REVOKE ALL ON public.cluster_discord_mappings FROM anon, authenticated;
GRANT ALL ON public.cluster_discord_mappings TO service_role;

CREATE POLICY "Service role manage cluster mappings"
  ON public.cluster_discord_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- chapter_log_channels
ALTER TABLE IF EXISTS public.chapter_log_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage chapter log channels" ON public.chapter_log_channels;
REVOKE ALL ON public.chapter_log_channels FROM anon, authenticated;
GRANT ALL ON public.chapter_log_channels TO service_role;

CREATE POLICY "Service role manage chapter log channels"
  ON public.chapter_log_channels
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- guild_config
ALTER TABLE IF EXISTS public.guild_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read guild_config" ON public.guild_config;
DROP POLICY IF EXISTS "Manage guild_config" ON public.guild_config;
DROP POLICY IF EXISTS "Service role manage guild_config" ON public.guild_config;
REVOKE ALL ON public.guild_config FROM anon, authenticated;
GRANT ALL ON public.guild_config TO service_role;

CREATE POLICY "Service role manage guild_config"
  ON public.guild_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- discord_sync_queue
ALTER TABLE IF EXISTS public.discord_sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage discord sync queue" ON public.discord_sync_queue;
DROP POLICY IF EXISTS "Service role manage discord_sync_queue" ON public.discord_sync_queue;
REVOKE ALL ON public.discord_sync_queue FROM anon, authenticated;
GRANT ALL ON public.discord_sync_queue TO service_role;

CREATE POLICY "Service role manage discord_sync_queue"
  ON public.discord_sync_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- discord_warnings
ALTER TABLE IF EXISTS public.discord_warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read discord_warnings" ON public.discord_warnings;
DROP POLICY IF EXISTS "Insert discord_warnings" ON public.discord_warnings;
DROP POLICY IF EXISTS "Manage discord_warnings" ON public.discord_warnings;
DROP POLICY IF EXISTS "Service role manage discord_warnings" ON public.discord_warnings;
REVOKE ALL ON public.discord_warnings FROM anon, authenticated;
GRANT ALL ON public.discord_warnings TO service_role;

CREATE POLICY "Service role manage discord_warnings"
  ON public.discord_warnings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- discord_events_log
ALTER TABLE IF EXISTS public.discord_events_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read discord_events_log" ON public.discord_events_log;
DROP POLICY IF EXISTS "Insert discord_events_log" ON public.discord_events_log;
DROP POLICY IF EXISTS "Manage discord_events_log" ON public.discord_events_log;
DROP POLICY IF EXISTS "Service role manage discord_events_log" ON public.discord_events_log;
REVOKE ALL ON public.discord_events_log FROM anon, authenticated;
GRANT ALL ON public.discord_events_log TO service_role;

CREATE POLICY "Service role manage discord_events_log"
  ON public.discord_events_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. DISCORD LINKS (OWN ROW SELECT FOR AUTHENTICATED, WRITES SERVICE ROLE ONLY)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.discord_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own discord_links" ON public.discord_links;
DROP POLICY IF EXISTS "Manage discord_links" ON public.discord_links;
DROP POLICY IF EXISTS "Users read own discord_links" ON public.discord_links;
DROP POLICY IF EXISTS "Service role manage discord_links" ON public.discord_links;
REVOKE ALL ON public.discord_links FROM anon;

CREATE POLICY "Users read own discord_links"
  ON public.discord_links
  FOR SELECT
  TO authenticated
  USING (os_user_id = auth.uid());

CREATE POLICY "Service role manage discord_links"
  ON public.discord_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. LEADERSHIP TABLES (AUTHENTICATED READS, SERVICE ROLE WRITES)
-- Dropping exact policy names from migration 016, 027
-- ----------------------------------------------------------------------------

-- leadership_terms
ALTER TABLE IF EXISTS public.leadership_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read leadership_terms" ON public.leadership_terms;
DROP POLICY IF EXISTS "Manage leadership_terms" ON public.leadership_terms;
DROP POLICY IF EXISTS "Authenticated read leadership_terms" ON public.leadership_terms;
DROP POLICY IF EXISTS "Service role manage leadership_terms" ON public.leadership_terms;

CREATE POLICY "Authenticated read leadership_terms"
  ON public.leadership_terms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage leadership_terms"
  ON public.leadership_terms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- leadership_assignments
ALTER TABLE IF EXISTS public.leadership_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read leadership_assignments" ON public.leadership_assignments;
DROP POLICY IF EXISTS "Manage leadership_assignments" ON public.leadership_assignments;
DROP POLICY IF EXISTS "Class Rep Block Leadership Management" ON public.leadership_assignments;
DROP POLICY IF EXISTS "Authenticated read leadership_assignments" ON public.leadership_assignments;
DROP POLICY IF EXISTS "Service role manage leadership_assignments" ON public.leadership_assignments;

CREATE POLICY "Authenticated read leadership_assignments"
  ON public.leadership_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage leadership_assignments"
  ON public.leadership_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- leadership_applications
ALTER TABLE IF EXISTS public.leadership_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on leadership_applications" ON public.leadership_applications;
DROP POLICY IF EXISTS "Public read leadership_applications" ON public.leadership_applications;
DROP POLICY IF EXISTS "Manage leadership_applications" ON public.leadership_applications;
DROP POLICY IF EXISTS "Authenticated read leadership_applications" ON public.leadership_applications;
DROP POLICY IF EXISTS "Service role manage leadership_applications" ON public.leadership_applications;

CREATE POLICY "Authenticated read leadership_applications"
  ON public.leadership_applications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage leadership_applications"
  ON public.leadership_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. VOLUNTEER TABLES (AUTHENTICATED READS, SERVICE ROLE WRITES)
-- Dropping exact policy names from migration 029, 030, 031, 032
-- ----------------------------------------------------------------------------

-- volunteer_groups
ALTER TABLE IF EXISTS public.volunteer_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read volunteer_groups" ON public.volunteer_groups;
DROP POLICY IF EXISTS "Manage volunteer_groups" ON public.volunteer_groups;
DROP POLICY IF EXISTS "Authenticated read volunteer_groups" ON public.volunteer_groups;
DROP POLICY IF EXISTS "Service role manage volunteer_groups" ON public.volunteer_groups;

CREATE POLICY "Authenticated read volunteer_groups"
  ON public.volunteer_groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage volunteer_groups"
  ON public.volunteer_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- volunteer_group_members
ALTER TABLE IF EXISTS public.volunteer_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read volunteer_group_members" ON public.volunteer_group_members;
DROP POLICY IF EXISTS "Manage volunteer_group_members" ON public.volunteer_group_members;
DROP POLICY IF EXISTS "Authenticated read volunteer_group_members" ON public.volunteer_group_members;
DROP POLICY IF EXISTS "Service role manage volunteer_group_members" ON public.volunteer_group_members;

CREATE POLICY "Authenticated read volunteer_group_members"
  ON public.volunteer_group_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage volunteer_group_members"
  ON public.volunteer_group_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- volunteer_assignments
ALTER TABLE IF EXISTS public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read volunteer_assignments" ON public.volunteer_assignments;
DROP POLICY IF EXISTS "Manage volunteer_assignments" ON public.volunteer_assignments;
DROP POLICY IF EXISTS "Authenticated read volunteer_assignments" ON public.volunteer_assignments;
DROP POLICY IF EXISTS "Service role manage volunteer_assignments" ON public.volunteer_assignments;

CREATE POLICY "Authenticated read volunteer_assignments"
  ON public.volunteer_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage volunteer_assignments"
  ON public.volunteer_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. DISCORD INTEGRATIONS (NO PUBLIC READ, HQ SELECT, SERVICE ROLE ALL)
-- Dropping exact policy names from migration 009
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.discord_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read discord integrations" ON public.discord_integrations;
DROP POLICY IF EXISTS "HQ manage discord integrations" ON public.discord_integrations;
DROP POLICY IF EXISTS "Service role manage discord_integrations" ON public.discord_integrations;
DROP POLICY IF EXISTS "HQ read discord_integrations" ON public.discord_integrations;
REVOKE ALL ON public.discord_integrations FROM anon;

CREATE POLICY "Service role manage discord_integrations"
  ON public.discord_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "HQ read discord_integrations"
  ON public.discord_integrations
  FOR SELECT
  TO authenticated
  USING (public.is_hq_user());

-- ----------------------------------------------------------------------------
-- 7. PROFILES (AUTHENTICATED READS ONLY, NO ANONYMOUS ACCESS)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read profiles policy" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role manage profiles" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

CREATE POLICY "Authenticated read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manage profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 8. ACTIVITY LOGS (HQ SELECT ONLY, NO PUBLIC READ, SERVICE ROLE WRITES)
-- Dropping exact policy names from migration 009 & FULL_DATABASE_SETUP
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activity logs viewable by authenticated users" ON public.activity_logs;
DROP POLICY IF EXISTS "Activity logs viewable by all" ON public.activity_logs;
DROP POLICY IF EXISTS "Insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_hq" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_service_role_all" ON public.activity_logs;
REVOKE ALL ON public.activity_logs FROM anon;

CREATE POLICY "activity_logs_select_hq"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.is_hq_user());

CREATE POLICY "activity_logs_service_role_all"
  ON public.activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 9. SYSTEM UI STATES & WEBSITE SECTIONS (SERVICE ROLE WRITES, PUBLIC READS)
-- Dropping exact policy names from migration 009
-- ----------------------------------------------------------------------------

-- system_ui_states
ALTER TABLE IF EXISTS public.system_ui_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read system ui states" ON public.system_ui_states;
DROP POLICY IF EXISTS "HQ manage system ui states" ON public.system_ui_states;
DROP POLICY IF EXISTS "system_ui_states_public_select" ON public.system_ui_states;
DROP POLICY IF EXISTS "system_ui_states_service_role_all" ON public.system_ui_states;

CREATE POLICY "system_ui_states_public_select"
  ON public.system_ui_states
  FOR SELECT
  USING (true);

CREATE POLICY "system_ui_states_service_role_all"
  ON public.system_ui_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- website_sections
ALTER TABLE IF EXISTS public.website_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read website sections" ON public.website_sections;
DROP POLICY IF EXISTS "HQ manage website sections" ON public.website_sections;
DROP POLICY IF EXISTS "website_sections_public_select" ON public.website_sections;
DROP POLICY IF EXISTS "website_sections_service_role_all" ON public.website_sections;

CREATE POLICY "website_sections_public_select"
  ON public.website_sections
  FOR SELECT
  USING (true);

CREATE POLICY "website_sections_service_role_all"
  ON public.website_sections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 10. CHAPTER STANDARD CHECKS (AUTHENTICATED READS, SERVICE ROLE WRITES)
-- Dropping exact policy names from migration 009
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.chapter_standard_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read chapter standards" ON public.chapter_standard_checks;
DROP POLICY IF EXISTS "Manage chapter standards" ON public.chapter_standard_checks;
DROP POLICY IF EXISTS "chapter_standard_checks_authenticated_select" ON public.chapter_standard_checks;
DROP POLICY IF EXISTS "chapter_standard_checks_service_role_all" ON public.chapter_standard_checks;
REVOKE ALL ON public.chapter_standard_checks FROM anon;

CREATE POLICY "chapter_standard_checks_authenticated_select"
  ON public.chapter_standard_checks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chapter_standard_checks_service_role_all"
  ON public.chapter_standard_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 11. OUTBOUND MESSAGES (OWN ROW SELECT FOR AUTHENTICATED, SERVICE ROLE WRITES)
-- Dropping exact policy names from migration 009
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.outbound_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own outbound messages" ON public.outbound_messages;
DROP POLICY IF EXISTS "System insert outbound messages" ON public.outbound_messages;
DROP POLICY IF EXISTS "outbound_messages_select_own" ON public.outbound_messages;
DROP POLICY IF EXISTS "outbound_messages_service_role_all" ON public.outbound_messages;
REVOKE ALL ON public.outbound_messages FROM anon;

-- Ensure column exists (in case migration 009 was not fully applied)
ALTER TABLE public.outbound_messages
  ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "outbound_messages_select_own"
  ON public.outbound_messages
  FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid() OR public.is_hq_user());

CREATE POLICY "outbound_messages_service_role_all"
  ON public.outbound_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 12. AUDIT TRIGGER FUNCTIONS (ENSURE SECURITY DEFINER TO BYPASS RLS)
-- ----------------------------------------------------------------------------

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

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discord_sync_queue') THEN
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
    END IF;

    RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_audit_event_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
                auth.uid(),
                'event_status_' || NEW.status,
                'event',
                NEW.id::text,
                'Event status changed from ' || OLD.status || ' to ' || NEW.status,
                'info',
                NEW.chapter_id
            );
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.record_audit_log(
            auth.uid(),
            'event_deleted',
            'event',
            OLD.id::text,
            'Deleted event "' || OLD.title || '"',
            'warning',
            OLD.chapter_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_audit_chapter_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

CREATE OR REPLACE FUNCTION public.trigger_audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

CREATE OR REPLACE FUNCTION public.trigger_audit_ui_state_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

CREATE OR REPLACE FUNCTION public.audit_project_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.record_audit_log(
            auth.uid(),
            'project_created',
            'project',
            NEW.id::text,
            'Created project "' || NEW.title || '"',
            'info',
            NEW.chapter_id
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.stage IS DISTINCT FROM NEW.stage) THEN
            PERFORM public.record_audit_log(
                auth.uid(),
                'project_stage_' || NEW.stage,
                'project',
                NEW.id::text,
                'Project stage transitioned from ' || OLD.stage || ' to ' || NEW.stage,
                'info',
                NEW.chapter_id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_certificate_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- 13. RELOAD POSTGREST SCHEMA CACHE
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
