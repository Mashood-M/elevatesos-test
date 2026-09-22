-- ============================================================================
-- Migration: 043_fix_discord_links_guild_fk.sql
-- Description:
--   Fixes foreign key constraint violation on discord_links:
--   "insert or update on table discord_links violates foreign key constraint discord_links_guild_id_fkey"
--
-- Root Cause:
--   Migration 033 added `REFERENCES public.guild_config(guild_id)` to `discord_links.guild_id`.
--   When members verify their Discord account via /connect or /verify, the Discord
--   guild ID snowflake is not guaranteed to be pre-seeded into `guild_config`.
--   Furthermore, member profile links should never be cascadingly deleted if a guild
--   config row is changed or removed.
--
-- Actions:
--   1. Drop `discord_links_guild_id_fkey` constraint on `public.discord_links`.
--   2. Drop strict FK constraints on `cluster_discord_mappings` and `chapter_log_channels`.
--   3. Backfill any known guild IDs from verification codes, logs, and integrations
--      into `public.guild_config`.
--   4. Update `verify_discord_otp` function to auto-upsert into `guild_config` if it exists,
--      and perform robust upserts into `discord_links` without failing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Drop foreign key constraints on discord_links.guild_id
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.discord_links
    DROP CONSTRAINT IF EXISTS discord_links_guild_id_fkey;

-- Dynamically drop any foreign key on discord_links that references guild_config
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'discord_links'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'guild_config'
    ) LOOP
        EXECUTE 'ALTER TABLE public.discord_links DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Also relax guild_id foreign keys on cluster mappings & chapter log channels
ALTER TABLE IF EXISTS public.cluster_discord_mappings
    DROP CONSTRAINT IF EXISTS cluster_discord_mappings_guild_id_fkey;

ALTER TABLE IF EXISTS public.chapter_log_channels
    DROP CONSTRAINT IF EXISTS chapter_log_channels_main_guild_id_fkey;

-- ----------------------------------------------------------------------------
-- STEP 2: Backfill existing guild IDs into public.guild_config
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'guild_config'
    ) THEN
        INSERT INTO public.guild_config (guild_id, guild_type, created_at)
        SELECT DISTINCT guild_id, 'main', now()
        FROM (
            SELECT guild_id FROM public.discord_verification_codes WHERE guild_id IS NOT NULL AND TRIM(guild_id) <> ''
            UNION
            SELECT guild_id FROM public.discord_links WHERE guild_id IS NOT NULL AND TRIM(guild_id) <> ''
            UNION
            SELECT guild_id FROM public.discord_events_log WHERE guild_id IS NOT NULL AND TRIM(guild_id) <> ''
            UNION
            SELECT guild_id FROM public.discord_warnings WHERE guild_id IS NOT NULL AND TRIM(guild_id) <> ''
            UNION
            SELECT guild_id FROM public.discord_integrations WHERE guild_id IS NOT NULL AND TRIM(guild_id) <> ''
        ) g
        ON CONFLICT (guild_id) DO NOTHING;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 3: Recreate verify_discord_otp with auto-upsert & fault-tolerant linking
-- ----------------------------------------------------------------------------
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

    -- If guild_config exists, auto-upsert the guild_id so references stay consistent
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'guild_config'
        ) THEN
            INSERT INTO public.guild_config (guild_id, guild_type, created_at)
            VALUES (v_record.guild_id, 'main', v_now)
            ON CONFLICT (guild_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Upsert discord_links to 'linked'
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'discord_links upsert notice: %', SQLERRM;
    END;

    -- Update profile
    UPDATE public.profiles
    SET 
        discord_user_id = v_record.discord_user_id,
        discord_username = v_record.discord_username,
        discord_connected = true,
        discord_connected_at = v_now,
        updated_at = v_now
    WHERE id = p_user_id;

    -- Synchronize users table if exists
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN
            UPDATE public.users
            SET updated_at = v_now
            WHERE id = p_user_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Log event for bot audit if table exists
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'discord_events_log'
        ) THEN
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
        END IF;
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

-- ----------------------------------------------------------------------------
-- STEP 4: Grant execute permissions
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.verify_discord_otp(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.unlink_discord(UUID) TO authenticated, anon, service_role;
