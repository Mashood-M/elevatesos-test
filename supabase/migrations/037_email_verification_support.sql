-- ============================================================================
-- Migration: 037_email_verification_support.sql
-- Description:
--   Support for in-profile email verification workflow.
--   1. Adds email_verified and email_confirmed_at to public.profiles.
--   2. Creates public.email_verification_codes table for OTP verification.
--   3. Syncs email confirmation status from auth.users to public.profiles.
--   4. Adds trigger on auth.users to keep public.profiles.email_verified in sync.
-- ============================================================================

-- 1. Add email verification columns to public.profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- 2. Create table for temporary email verification codes
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verification_lookup
    ON public.email_verification_codes(email, code, status);

CREATE INDEX IF NOT EXISTS idx_email_verification_user
    ON public.email_verification_codes(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own codes
DROP POLICY IF EXISTS "Users can view own email verification codes" ON public.email_verification_codes;
CREATE POLICY "Users can view own email verification codes"
    ON public.email_verification_codes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Service role bypasses RLS
DROP POLICY IF EXISTS "Service role full access on email verification" ON public.email_verification_codes;
CREATE POLICY "Service role full access on email verification"
    ON public.email_verification_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Initial sync from auth.users for existing confirmed accounts
DO $$
BEGIN
    UPDATE public.profiles p
    SET email_verified = true,
        email_confirmed_at = COALESCE(u.email_confirmed_at, u.confirmed_at, now())
    FROM auth.users u
    WHERE p.id = u.id
      AND (u.email_confirmed_at IS NOT NULL OR u.confirmed_at IS NOT NULL);
EXCEPTION WHEN OTHERS THEN
    -- In case direct access to auth.users is restricted during migration
    NULL;
END;
$$;

-- 4. Trigger to sync email confirmation when Supabase auth confirms user email
CREATE OR REPLACE FUNCTION public.sync_auth_email_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (NEW.email_confirmed_at IS NOT NULL OR NEW.confirmed_at IS NOT NULL) THEN
        UPDATE public.profiles
        SET email_verified = true,
            email_confirmed_at = COALESCE(NEW.email_confirmed_at, NEW.confirmed_at, now())
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_email_confirmed ON auth.users;
CREATE TRIGGER trg_sync_auth_email_confirmed
    AFTER UPDATE OF email_confirmed_at, confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_auth_email_confirmed();
