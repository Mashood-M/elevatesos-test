-- ============================================================================
-- Migration: 049_discord_link_codes.sql
-- Description:
--   Reversed Discord account-linking flow.
--   Previously the Discord bot generated a code and the user typed it into
--   the OS website (verify_discord_otp). Now the OS generates a short code
--   that the user copies into the Elevates Discord server. The Discord bot
--   reads this same table directly with its own service-role access to
--   complete the link — the OS has no "confirm" step.
--
--   This migration does NOT touch discord_verification_codes or its
--   associated verify_discord_otp / unlink_discord functions. Those remain
--   intact to avoid breaking any existing bot flows during the transition.
-- ============================================================================

-- 1. Create the new discord_link_codes table
CREATE TABLE IF NOT EXISTS public.discord_link_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code        TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'used', 'expired')),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_discord_link_codes_user
    ON public.discord_link_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_link_codes_code_pending
    ON public.discord_link_codes(code, status)
    WHERE status = 'pending';

-- 2. Row Level Security
ALTER TABLE public.discord_link_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read their own pending codes (for UI display)
DROP POLICY IF EXISTS "Users read own link codes" ON public.discord_link_codes;
CREATE POLICY "Users read own link codes"
    ON public.discord_link_codes
    FOR SELECT
    USING (user_id = auth.uid());

-- 3. Function: generate_discord_link_code
--    Called by the authenticated user on the OS website.
--    Character set: uppercase A-Z + digits 2-9, excluding 0/O and 1/I
--    to minimise transcription errors when reading from a screen.
CREATE OR REPLACE FUNCTION public.generate_discord_link_code(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_charset  TEXT      := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_code     TEXT      := '';
    v_expires  TIMESTAMPTZ;
    i          INT;
BEGIN
    -- Invalidate any existing pending code so only one active code exists per user
    UPDATE public.discord_link_codes
    SET    status = 'expired'
    WHERE  user_id = p_user_id
      AND  status  = 'pending';

    -- Generate a random 6-character code
    FOR i IN 1..6 LOOP
        v_code := v_code
            || substr(v_charset,
                      (floor(random() * length(v_charset)) + 1)::INT,
                      1);
    END LOOP;

    v_expires := now() + interval '5 minutes';

    INSERT INTO public.discord_link_codes (user_id, code, status, expires_at)
    VALUES (p_user_id, v_code, 'pending', v_expires);

    RETURN jsonb_build_object(
        'ok',         true,
        'code',       v_code,
        'expires_at', v_expires
    );
END;
$$;

-- Grant only to authenticated role; anonymous access is explicitly excluded
GRANT EXECUTE ON FUNCTION public.generate_discord_link_code(UUID)
    TO authenticated;

-- 4. Enable Realtime so the UI can react when the bot marks a code as 'used'
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_link_codes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
