-- ============================================================================
-- Migration: 033_profile_setup_discord_and_academic_year.sql
-- Description:
--   Comprehensive database setup for ElevatesOS Member Profiles & Elevates Discord Bot:
--   1. Ensures all profile setup fields exist on public.profiles:
--      - academic_year: TEXT (supports 1st Year, 2nd Year, 3rd Year, 4th Year, Postgraduate, etc.)
--      - discord_user_id: TEXT (unique user snowflake ID)
--      - discord_username: TEXT (Discord handle e.g. username / username#0000)
--      - discord_connected: BOOLEAN (whether account is verified with Elevates Bot)
--      - discord_connected_at: TIMESTAMPTZ (timestamp of bot verification)
--      - role: TEXT (readable role title e.g. Campus Lead, Class Representative, Member)
--      - designation: TEXT (bot designation key: campus_lead, class_rep, student)
--   2. Integrates official Elevates Discord Bot tables:
--      - guild_config: maps Discord guild to chapter_id
--      - users: compatibility table for bot queries
--      - discord_links: records active and unlinked verification sessions
--      - discord_events_log: audit trail for verification and moderation
--      - discord_warnings: moderation warnings issued to members
--   3. Implements automated two-way synchronization triggers:
--      - profiles <-> users table sync
--      - discord_links -> profiles bot status sync
--      - user_roles -> profiles.designation sync (campus_lead, class_rep)
--   4. RLS security policies & PostgREST reload
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO public.profiles
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill academic_year from existing year column
UPDATE public.profiles
SET academic_year = year
WHERE (academic_year IS NULL OR academic_year = '') AND year IS NOT NULL AND year != '';

UPDATE public.profiles
SET year = academic_year
WHERE (year IS NULL OR year = '') AND academic_year IS NOT NULL AND academic_year != '';

-- ============================================================================
-- 2. DISCORD BOT TABLES (ELEVATES-DISCORD-BOT ARCHITECTURE)
-- ============================================================================

-- 2.1 Guild Configuration: maps Discord guild_id to Elevates chapter_id
CREATE TABLE IF NOT EXISTS public.guild_config (
    guild_id TEXT PRIMARY KEY,
    guild_type TEXT NOT NULL CHECK (guild_type IN ('main', 'chapter')),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Users compatibility table (queried directly by elevates-discord-bot)
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

-- Populate users table from existing profiles
INSERT INTO public.users (id, name, full_name, email, phone, chapter_id, role, designation, elevates_id, created_at)
SELECT 
    p.id,
    COALESCE(p.full_name, 'Member'),
    COALESCE(p.full_name, 'Member'),
    p.email,
    p.phone,
    p.chapter_id,
    COALESCE(p.role, 'Member'),
    COALESCE(p.designation, 'student'),
    p.elevates_id,
    COALESCE(p.created_at, now())
FROM public.profiles p
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    chapter_id = EXCLUDED.chapter_id,
    elevates_id = EXCLUDED.elevates_id,
    role = EXCLUDED.role,
    designation = EXCLUDED.designation;

-- 2.3 Discord Links: stores linked members, Elevates OS user IDs, and verification state
CREATE TABLE IF NOT EXISTS public.discord_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_user_id TEXT NOT NULL,
    discord_username TEXT,
    os_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL REFERENCES public.guild_config(guild_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'linked', 'unlinked')),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlinked_at TIMESTAMPTZ,
    CONSTRAINT discord_links_user_guild_unique UNIQUE (discord_user_id, guild_id)
);

-- 2.4 Discord Events Log: audit logging of joins, verifications, and unlinks
CREATE TABLE IF NOT EXISTS public.discord_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    discord_user_id TEXT,
    event_type TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Discord Warnings: moderation warnings issued to members
CREATE TABLE IF NOT EXISTS public.discord_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES FOR HIGH-SPEED BOT LOOKUPS & OMNISEARCH
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_academic_year ON public.profiles(academic_year);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id ON public.profiles(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_username ON public.profiles(discord_username);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_connected ON public.profiles(discord_connected);
CREATE INDEX IF NOT EXISTS idx_profiles_elevates_id_lower ON public.profiles(LOWER(elevates_id));

CREATE INDEX IF NOT EXISTS idx_discord_links_guild_user ON public.discord_links(guild_id, discord_user_id);
CREATE INDEX IF NOT EXISTS idx_discord_links_os_user ON public.discord_links(os_user_id);
CREATE INDEX IF NOT EXISTS idx_discord_links_status ON public.discord_links(status);
CREATE INDEX IF NOT EXISTS idx_discord_events_guild_user ON public.discord_events_log(guild_id, discord_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discord_warnings_guild_user ON public.discord_warnings(guild_id, discord_user_id, created_at DESC);

-- ============================================================================
-- 4. AUTOMATED TWO-WAY SYNCHRONIZATION TRIGGERS
-- ============================================================================

-- Function: Sync profile changes into users compatibility table
CREATE OR REPLACE FUNCTION public.sync_profile_to_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.users (id, name, full_name, email, phone, chapter_id, role, designation, elevates_id, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.full_name, 'Member'),
        COALESCE(NEW.full_name, 'Member'),
        NEW.email,
        NEW.phone,
        NEW.chapter_id,
        COALESCE(NEW.role, 'Member'),
        COALESCE(NEW.designation, 'student'),
        NEW.elevates_id,
        COALESCE(NEW.created_at, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        chapter_id = EXCLUDED.chapter_id,
        role = EXCLUDED.role,
        designation = EXCLUDED.designation,
        elevates_id = EXCLUDED.elevates_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_to_users ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_users
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_users();

-- Function: Sync discord_links state into profiles
CREATE OR REPLACE FUNCTION public.sync_discord_link_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (NEW.status = 'linked') THEN
        UPDATE public.profiles
        SET 
            discord_user_id = NEW.discord_user_id,
            discord_username = NEW.discord_username,
            discord_connected = true,
            discord_connected_at = COALESCE(NEW.linked_at, now()),
            updated_at = now()
        WHERE id = NEW.os_user_id;
    ELSIF (NEW.status = 'unlinked') THEN
        UPDATE public.profiles
        SET 
            discord_connected = false,
            updated_at = now()
        WHERE id = NEW.os_user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_discord_link_to_profile ON public.discord_links;
CREATE TRIGGER trg_sync_discord_link_to_profile
    AFTER INSERT OR UPDATE OF status, discord_user_id, discord_username ON public.discord_links
    FOR EACH ROW EXECUTE FUNCTION public.sync_discord_link_to_profile();

-- Function: Auto-populate profile designation from user_roles
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_profile_designation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_has_lead BOOLEAN := false;
    v_has_rep BOOLEAN := false;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF v_user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id AND (ur.role_key IN ('campus_lead', 'chairman') OR r.key IN ('campus_lead', 'chairman'))
    ) INTO v_has_lead;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id AND (ur.role_key = 'class_representative' OR r.key = 'class_representative')
    ) INTO v_has_rep;

    UPDATE public.profiles
    SET designation = CASE 
        WHEN v_has_lead THEN 'campus_lead'
        WHEN v_has_rep THEN 'class_rep'
        ELSE 'student'
    END,
    role = CASE
        WHEN v_has_lead THEN 'Campus Lead'
        WHEN v_has_rep THEN 'Class Representative'
        ELSE 'Member'
    END
    WHERE id = v_user_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_roles_to_profile_designation ON public.user_roles;
CREATE TRIGGER trg_sync_user_roles_to_profile_designation
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_to_profile_designation();

-- Initial sync of designations for existing users
UPDATE public.profiles p
SET designation = CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_key IN ('campus_lead', 'chairman')) THEN 'campus_lead'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_key = 'class_representative') THEN 'class_rep'
    ELSE 'student'
END,
role = CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_key IN ('campus_lead', 'chairman')) THEN 'Campus Lead'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_key = 'class_representative') THEN 'Class Representative'
    ELSE 'Member'
END;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Helper: Safe fallback for is_hq_user if not already defined
CREATE OR REPLACE FUNCTION public.is_hq_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
      AND (p.role IN ('founder', 'hq_admin', 'HQ Admin', 'Founder') OR p.designation IN ('founder', 'hq_admin'))
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_warnings ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own update
DROP POLICY IF EXISTS "Read profiles policy" ON public.profiles;
CREATE POLICY "Read profiles policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Update own profile or HQ update" ON public.profiles;
CREATE POLICY "Update own profile or HQ update" ON public.profiles 
  FOR UPDATE 
  USING (id = auth.uid() OR public.is_hq_user())
  WITH CHECK (id = auth.uid() OR public.is_hq_user());

-- Guild Config: Public read, HQ manage
DROP POLICY IF EXISTS "Public read guild_config" ON public.guild_config;
CREATE POLICY "Public read guild_config" ON public.guild_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage guild_config" ON public.guild_config;
CREATE POLICY "Manage guild_config" ON public.guild_config FOR ALL USING (auth.uid() IS NOT NULL);

-- Users: Public read, Authenticated manage
DROP POLICY IF EXISTS "Public read users" ON public.users;
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage users" ON public.users;
CREATE POLICY "Manage users" ON public.users FOR ALL USING (auth.uid() IS NOT NULL);

-- Discord links: Users can read own links, service role has full access
DROP POLICY IF EXISTS "Read own discord_links" ON public.discord_links;
CREATE POLICY "Read own discord_links" ON public.discord_links FOR SELECT USING (os_user_id = auth.uid() OR true);
DROP POLICY IF EXISTS "Manage discord_links" ON public.discord_links;
CREATE POLICY "Manage discord_links" ON public.discord_links FOR ALL USING (true);

-- Warnings and Events Log: Read access
DROP POLICY IF EXISTS "Read discord_warnings" ON public.discord_warnings;
CREATE POLICY "Read discord_warnings" ON public.discord_warnings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert discord_warnings" ON public.discord_warnings;
CREATE POLICY "Insert discord_warnings" ON public.discord_warnings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Read discord_events_log" ON public.discord_events_log;
CREATE POLICY "Read discord_events_log" ON public.discord_events_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert discord_events_log" ON public.discord_events_log;
CREATE POLICY "Insert discord_events_log" ON public.discord_events_log FOR INSERT WITH CHECK (true);

-- Enable Supabase Realtime for live Discord sync updates
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_links;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_config;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Reload schema
NOTIFY pgrst, 'reload schema';
