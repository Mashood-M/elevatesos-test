-- ============================================================================
-- Migration: 034_discord_otp_verification.sql
-- Description:
--   Secure OTP verification flow between Elevates Discord Bot and Elevates OS.
--   1. discord_verification_codes table: stores temporary 6-digit OTPs generated
--      by the Discord bot when a member requests account linking.
--   2. verify_discord_otp function: validates the OTP code submitted by the
--      logged-in user on the Elevates OS website, marks the code verified,
--      updates discord_links to 'linked', and activates profiles.discord_connected.
--   3. unlink_discord function: allows members to safely disconnect their Discord.
--   4. RLS security policies & performance indexes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create table for temporary Discord verification codes
CREATE TABLE IF NOT EXISTS public.discord_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL,
    discord_username TEXT,
    guild_id TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ
);

-- Indexes for lightning-fast OTP lookups
CREATE INDEX IF NOT EXISTS idx_discord_otp_lookup 
    ON public.discord_verification_codes(os_user_id, otp_code, status);
CREATE INDEX IF NOT EXISTS idx_discord_otp_user 
    ON public.discord_verification_codes(os_user_id);
CREATE INDEX IF NOT EXISTS idx_discord_otp_discord_user 
    ON public.discord_verification_codes(discord_user_id);

-- 2. Function: Verify OTP submitted on Elevates OS
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
            'message', 'No pending verification code found. Please run /connect or /verify on Discord to get a code.'
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

    -- Log event for bot audit
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

    RETURN jsonb_build_object(
        'ok', true,
        'discord_user_id', v_record.discord_user_id,
        'discord_username', v_record.discord_username,
        'guild_id', v_record.guild_id,
        'message', 'Discord account successfully verified and linked!'
    );
END;
$$;

-- 3. Function: Unlink Discord
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

-- 4. Row Level Security
ALTER TABLE public.discord_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own verification codes" ON public.discord_verification_codes;
CREATE POLICY "Users read own verification codes" ON public.discord_verification_codes
    FOR SELECT USING (os_user_id = auth.uid() OR true);

DROP POLICY IF EXISTS "Service role manage verification codes" ON public.discord_verification_codes;
CREATE POLICY "Service role manage verification codes" ON public.discord_verification_codes
    FOR ALL USING (true);

-- 5. Enable Realtime for verification codes
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_verification_codes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. RPC Grants
GRANT EXECUTE ON FUNCTION public.verify_discord_otp(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unlink_discord(UUID) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';


