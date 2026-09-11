-- Migration 019: Instant Invite & Referral Revocation RPC and Policies
-- Ensures that when an invite code or referral token is revoked, it is immediately deactivated in Supabase.

-- 1. Security definer function for instant revocation bypassing RLS
CREATE OR REPLACE FUNCTION public.revoke_invite_code(target_val TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  v_clean TEXT;
BEGIN
  IF target_val IS NULL OR trim(target_val) = '' THEN
    RETURN FALSE;
  END IF;

  v_clean := trim(target_val);

  -- If it matches standard UUID format, update by primary key
  IF v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    UPDATE public.invite_tokens
    SET is_active = false
    WHERE id = v_clean::uuid;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  -- Also update case-insensitively by token code
  UPDATE public.invite_tokens
  SET is_active = false
  WHERE LOWER(token) = LOWER(v_clean);

  RETURN TRUE;
END;
$$;

-- 2. Add indexes for lightning-fast token matching and status lookup
CREATE INDEX IF NOT EXISTS idx_invite_tokens_lower_token ON public.invite_tokens(lower(token));
CREATE INDEX IF NOT EXISTS idx_invite_tokens_is_active ON public.invite_tokens(is_active);

-- 3. RLS update policies for invite tokens
DO $$ BEGIN
  DROP POLICY IF EXISTS "invite_tokens_owner_update" ON public.invite_tokens;
  DROP POLICY IF EXISTS "invite_tokens_campus_lead_update" ON public.invite_tokens;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Allow creator to deactivate/update their own tokens
CREATE POLICY "invite_tokens_owner_update" ON public.invite_tokens
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Allow campus leads and founders to deactivate chapter tokens
CREATE POLICY "invite_tokens_campus_lead_update" ON public.invite_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          (ur.chapter_id = public.invite_tokens.chapter_id AND ur.role_key = 'campus_lead')
          OR ur.role_key IN ('founder', 'hq_admin')
        )
    )
  );
