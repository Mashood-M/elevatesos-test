-- ============================================================================
-- Migration: 048_executive_member_delegations.sql
-- Description:
--   1. Add 'permissions' array to public.term_members to store delegated Campus Lead powers per executive member
--   2. Update RLS policies on term_members so Campus Leads and Founders can update permissions
-- ============================================================================

-- 1. ADD PERMISSIONS COLUMN TO term_members
ALTER TABLE IF EXISTS public.term_members 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- 2. ALLOW CAMPUS LEADS AND HQ TO MANAGE term_members (DELEGATIONS, DESIGNATIONS, APPOINTMENTS)
DROP POLICY IF EXISTS "Campus leads update term_members" ON public.term_members;
DROP POLICY IF EXISTS "Campus lead manage term_members" ON public.term_members;

CREATE POLICY "Campus lead manage term_members"
ON public.term_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.terms t
        WHERE t.id = term_members.term_id
          AND (
            t.campus_lead_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.chapter_id = t.chapter_id
                  AND ur.user_id = auth.uid()
                  AND ur.role_key IN ('campus_lead', 'chairman')
            )
          )
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('Founder', 'HQ Admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.terms t
        WHERE t.id = term_members.term_id
          AND (
            t.campus_lead_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.chapter_id = t.chapter_id
                  AND ur.user_id = auth.uid()
                  AND ur.role_key IN ('campus_lead', 'chairman')
            )
          )
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('Founder', 'HQ Admin')
    )
);
