-- ============================================================================
-- Migration: 038_discord_bot_restructure_sync_and_otp_fix.sql
-- Description:
--   1. Discord Bot Architecture Provisioning & Mappings:
--      - chapter_setup_tokens (campus lead onboarding tokens)
--      - cluster_discord_mappings (cluster category & role sync)
--      - chapter_log_channels (chapter management log channels in main guild)
--   2. Realtime Publication Support for core OS entities.
--   3. Database Fix for discord_links & verify_discord_otp:
--      - Adds created_at / updated_at columns to discord_links if missing.
--      - Updates verify_discord_otp and unlink_discord with robust error handling.
--      - Grants RPC execution permissions to authenticated, anon, and service_role.
-- ============================================================================

-- Ensure pgcrypto extension is present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROVISIONING & MAPPING TABLES (ELEVATES DISCORD BOT INTEGRATION)
-- ============================================================================

-- 1.1 Table for Chapter Provisioning Setup Tokens
CREATE TABLE IF NOT EXISTS public.chapter_setup_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    campus_lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    campus_lead_discord_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_setup_token_lookup
    ON public.chapter_setup_tokens(token, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_chapter_setup_lead
    ON public.chapter_setup_tokens(campus_lead_discord_id);

-- 1.2 Table for Cluster Discord Category and Role Mappings
CREATE TABLE IF NOT EXISTS public.cluster_discord_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL REFERENCES public.guild_config(guild_id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    member_role_id TEXT NOT NULL,
    host_role_id TEXT,
    discussion_channel_id TEXT,
    resources_channel_id TEXT,
    challenges_channel_id TEXT,
    projects_channel_id TEXT,
    voice_channel_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cluster_guild_unique UNIQUE (cluster_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_cluster_discord_lookup
    ON public.cluster_discord_mappings(cluster_id, guild_id);

-- 1.3 Table for Chapter Management Log Channels in Main Guild
CREATE TABLE IF NOT EXISTS public.chapter_log_channels (
    chapter_id UUID PRIMARY KEY REFERENCES public.chapters(id) ON DELETE CASCADE,
    main_guild_id TEXT NOT NULL REFERENCES public.guild_config(guild_id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES
-- ============================================================================
ALTER TABLE public.chapter_setup_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_discord_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_log_channels ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role manage setup tokens" ON public.chapter_setup_tokens;
CREATE POLICY "Service role manage setup tokens" ON public.chapter_setup_tokens FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role manage cluster mappings" ON public.cluster_discord_mappings;
CREATE POLICY "Service role manage cluster mappings" ON public.cluster_discord_mappings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role manage chapter log channels" ON public.chapter_log_channels;
CREATE POLICY "Service role manage chapter log channels" ON public.chapter_log_channels FOR ALL USING (true);

-- ============================================================================
-- 3. SCHEMA ALIGNMENT FOR discord_links
-- ============================================================================
-- Ensure discord_links has created_at and updated_at so migrations and RPC queries never fail
ALTER TABLE public.discord_links
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================================
-- 4. HARDENED DATABASE FUNCTIONS: verify_discord_otp & unlink_discord
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_discord_otp(
    p_user_id UUID,
    p_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_normalized_otp TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    v_normalized_otp := TRIM(p_otp);

    -- Find the most recent active OTP for this user
    SELECT * INTO v_record
    FROM public.discord_verification_codes
    WHERE os_user_id = p_user_id
      AND status = 'pending'
      AND expires_at > v_now
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no pending OTP was found
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false,
            'reason', 'no_pending_code',
            'message', 'No pending verification code found. Please run /connect in the Elevates Discord server to generate a code.'
        );
    END IF;

    -- Check attempt limit (max 5 tries)
    IF v_record.attempts >= 5 THEN
        UPDATE public.discord_verification_codes
        SET status = 'expired'
        WHERE id = v_record.id;

        RETURN jsonb_build_object(
            'ok', false,
            'reason', 'max_attempts',
            'message', 'Too many invalid attempts. Please generate a new code on Discord.'
        );
    END IF;

    -- Check if OTP matches
    IF v_record.otp_code <> v_normalized_otp THEN
        UPDATE public.discord_verification_codes
        SET attempts = attempts + 1
        WHERE id = v_record.id;

        RETURN jsonb_build_object(
            'ok', false,
            'reason', 'invalid_code',
            'attempts_left', 5 - (v_record.attempts + 1),
            'message', 'Incorrect verification code. Please check Discord and try again.'
        );
    END IF;

    -- OTP matches: Mark verification code as verified
    UPDATE public.discord_verification_codes
    SET status = 'verified',
        verified_at = v_now
    WHERE id = v_record.id;

    -- Upsert discord_links to 'linked'
    INSERT INTO public.discord_links (
        discord_user_id,
        discord_username,
        os_user_id,
        guild_id,
        status,
        linked_at,
        created_at,
        updated_at
    )
    VALUES (
        v_record.discord_user_id,
        v_record.discord_username,
        p_user_id,
        v_record.guild_id,
        'linked',
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (discord_user_id, guild_id)
    DO UPDATE SET
        os_user_id = p_user_id,
        discord_username = EXCLUDED.discord_username,
        status = 'linked',
        linked_at = v_now,
        unlinked_at = NULL,
        updated_at = v_now;

    -- Update profile
    UPDATE public.profiles
    SET 
        discord_user_id = v_record.discord_user_id,
        discord_username = v_record.discord_username,
        discord_connected = true,
        discord_connected_at = v_now,
        updated_at = v_now
    WHERE id = p_user_id;

    -- Log event for bot audit if table exists
    BEGIN
        INSERT INTO public.discord_events_log (
            guild_id,
            discord_user_id,
            os_user_id,
            event_type,
            detail,
            created_at
        )
        VALUES (
            v_record.guild_id,
            v_record.discord_user_id,
            p_user_id,
            'otp_verified_on_web',
            jsonb_build_object('discord_username', v_record.discord_username),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object(
        'ok', true,
        'discord_user_id', v_record.discord_user_id,
        'discord_username', v_record.discord_username,
        'guild_id', v_record.guild_id,
        'message', 'Discord account successfully verified and linked!'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_discord(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Update discord_links
    UPDATE public.discord_links
    SET status = 'unlinked',
        unlinked_at = v_now,
        updated_at = v_now
    WHERE os_user_id = p_user_id;

    -- Update profile
    UPDATE public.profiles
    SET 
        discord_connected = false,
        discord_user_id = NULL,
        discord_username = NULL,
        updated_at = v_now
    WHERE id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'message', 'Discord unlinked successfully.');
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.verify_discord_otp(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.unlink_discord(UUID) TO authenticated, anon, service_role;

-- ============================================================================
-- 5. REALTIME PUBLICATIONS
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clusters;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cluster_members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_links;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_verification_codes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
