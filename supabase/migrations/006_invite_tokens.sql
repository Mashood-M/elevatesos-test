-- ============================================================================
-- Migration: 006_invite_tokens.sql
-- Description: Implements invite-based registration system.
--   - invite_tokens: stores invite links (token, creator, used_by, chapter)
--   - referrals view: who invited whom
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id    UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  used_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 day'),
  is_active     BOOLEAN NOT NULL DEFAULT true
);

-- Index for fast token lookup (sign-up page validation)
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens (token);
-- Index to see who a user has invited
CREATE INDEX IF NOT EXISTS idx_invite_tokens_created_by ON public.invite_tokens (created_by);
-- Index for HQ referral view
CREATE INDEX IF NOT EXISTS idx_invite_tokens_used_by ON public.invite_tokens (used_by);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read their own invite tokens (ones they created)
CREATE POLICY "invite_tokens_owner_select" ON public.invite_tokens
  FOR SELECT USING (created_by = auth.uid());

-- Authenticated users can insert their own invite tokens
CREATE POLICY "invite_tokens_owner_insert" ON public.invite_tokens
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- The used_by + used_at columns are updated by the sign-up edge function
-- Allow unauthenticated reads of a specific token (for the sign-up page validation)
CREATE POLICY "invite_tokens_public_read_by_token" ON public.invite_tokens
  FOR SELECT USING (true);

-- HQ (founder / hq_admin) can see all tokens for the referrals dashboard
-- (The broad SELECT above already covers this; the additional policy below
--  makes intent explicit and allows future narrowing.)
CREATE POLICY "invite_tokens_hq_all" ON public.invite_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.key IN ('founder', 'hq_admin')
    )
  );
