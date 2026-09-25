-- ============================================================================
-- Migration: 048_executive_member_delegations.sql
-- Description:
--   1. Add 'permissions' array to public.term_members to store delegated Campus Lead powers per executive member
--   2. Ensure public.users has all profiles to prevent foreign key errors on term_members(user_id)
--   3. Update assign_chapter_executive_member stored procedure for robust Campus Lead verification
--   4. Update RLS policies on term_members so Campus Leads and Founders can update permissions
--   5. Enable Supabase Realtime publication on terms and term_members
-- ============================================================================

-- 1. ADD PERMISSIONS COLUMN TO term_members
ALTER TABLE IF EXISTS public.term_members 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- 2. ENSURE ALL PROFILES EXIST IN public.users (AVOID FK VIOLATIONS ON term_members.user_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        INSERT INTO public.users (id, name, full_name, email, phone, chapter_id, role, designation, elevates_id, created_at)
        SELECT 
            p.id,
            COALESCE(p.full_name, 'Student'),
            p.full_name,
            p.email,
            p.phone,
            p.chapter_id,
            COALESCE(p.role, 'Student'),
            p.designation,
            p.elevates_id,
            COALESCE(p.created_at, now())
        FROM public.profiles p
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            chapter_id = EXCLUDED.chapter_id;
    END IF;
END $$;

-- 3. ROBUST ASSIGN EXECUTIVE MEMBER STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.assign_chapter_executive_member(
    p_chapter_id UUID,
    p_acting_user_id UUID,
    p_target_user_id UUID,
    p_designation TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_term RECORD;
    v_exec_member_role_id UUID;
    v_new_member_id UUID;
    v_is_lead BOOLEAN := FALSE;
BEGIN
    -- Check if acting user is founder or lead in user_roles
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_acting_user_id
          AND ((ur.chapter_id = p_chapter_id AND ur.role_key IN ('campus_lead', 'chairman')) OR ur.role_key IN ('founder', 'hq_admin'))
    ) THEN
        v_is_lead := TRUE;
    END IF;

    -- Check if acting user is active campus_lead_id in terms or chapters
    IF NOT v_is_lead THEN
        IF EXISTS (
            SELECT 1 FROM public.terms t
            WHERE t.chapter_id = p_chapter_id AND t.status = 'active' AND t.campus_lead_id = p_acting_user_id
        ) OR EXISTS (
            SELECT 1 FROM public.chapters c
            WHERE c.id = p_chapter_id AND c.campus_lead_id = p_acting_user_id
        ) THEN
            v_is_lead := TRUE;
        END IF;
    END IF;

    IF NOT v_is_lead THEN
        RAISE EXCEPTION 'Only campus lead for this chapter can assign executive members';
    END IF;

    -- Find currently active term
    SELECT * INTO v_active_term
    FROM public.terms
    WHERE chapter_id = p_chapter_id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;

    -- If no active term exists, fail
    IF v_active_term IS NULL THEN
        RAISE EXCEPTION 'Cannot assign executive member: chapter has no active term. A founder must create the initial term first.';
    END IF;

    -- Ensure target user exists in public.users if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        INSERT INTO public.users (id, name, full_name, email, chapter_id, role, designation, created_at)
        SELECT p.id, COALESCE(p.full_name, 'Student'), p.full_name, p.email, p.chapter_id, 'executive_member', 'executive_member', now()
        FROM public.profiles p WHERE p.id = p_target_user_id
        ON CONFLICT (id) DO UPDATE SET role = 'executive_member', designation = 'executive_member';
    END IF;

    -- Insert into term_members
    INSERT INTO public.term_members (term_id, user_id, role, designation, added_at)
    VALUES (v_active_term.id, p_target_user_id, 'executive_member', NULLIF(trim(p_designation), ''), now())
    RETURNING id INTO v_new_member_id;

    -- Attach executive_member role
    SELECT id INTO v_exec_member_role_id FROM public.roles WHERE key = 'executive_member' LIMIT 1;

    INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
    VALUES (p_target_user_id, 'executive_member', v_exec_member_role_id, p_chapter_id, true)
    ON CONFLICT (user_id, chapter_id, role_key) DO NOTHING;

    -- Update profile
    UPDATE public.profiles
    SET role = 'Executive Member', designation = 'executive_member', chapter_id = p_chapter_id
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'term_member_id', v_new_member_id,
        'term_id', v_active_term.id
    );
END;
$$;

-- 4. ALLOW CAMPUS LEADS AND HQ TO MANAGE term_members (DELEGATIONS, DESIGNATIONS, APPOINTMENTS)
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

-- 5. ENABLE SUPABASE REALTIME PUBLICATION FOR TERMS & TERM_MEMBERS
ALTER TABLE IF EXISTS public.terms REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.term_members REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.handover_windows REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.terms;
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.term_members;
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.handover_windows;
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
