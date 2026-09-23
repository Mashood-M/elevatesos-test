-- ============================================================================
-- Migration: 045_chapter_terms_and_handover_system.sql
-- Description: Chapter term and handover lifecycle system
--              1. terms: tracks chapter leadership terms and active campus lead
--              2. term_members: tracks executive members with free-text designation
--              3. handover_windows: per-chapter handover windows controlled by founders
--              4. executive_member role addition & permissions
--              5. Single-transaction term handover procedure
-- ============================================================================

-- Ensure public.users has all profiles so foreign keys are satisfied
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
ON CONFLICT (id) DO NOTHING;

-- 1. TERMS TABLE
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    term_year TEXT NOT NULL,
    campus_lead_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_terms_chapter_status ON public.terms(chapter_id, status);
CREATE INDEX IF NOT EXISTS idx_terms_campus_lead ON public.terms(campus_lead_id);

-- 2. TERM_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.term_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'executive_member' CHECK (role = 'executive_member'),
    designation TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_term_members_term ON public.term_members(term_id);
CREATE INDEX IF NOT EXISTS idx_term_members_user ON public.term_members(user_id);

-- 3. HANDOVER_WINDOWS TABLE
CREATE TABLE IF NOT EXISTS public.handover_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opened_by UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_handover_windows_chapter_status ON public.handover_windows(chapter_id, status);

-- 4. ADD 'executive_member' AS A VALID ROLE IN public.roles
INSERT INTO public.roles (key, name, scope, description)
VALUES (
    'executive_member',
    'Executive Member',
    'chapter',
    'Chapter executive committee member with operational management permissions'
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Grant standard campus lead operational permissions to executive_member in role_permissions
DO $$
DECLARE
    v_exec_role_id UUID;
    v_perm RECORD;
BEGIN
    SELECT id INTO v_exec_role_id FROM public.roles WHERE key = 'executive_member' LIMIT 1;
    IF v_exec_role_id IS NOT NULL THEN
        FOR v_perm IN
            SELECT id FROM public.permissions
            WHERE key IN (
                'event.create',
                'event.manage',
                'registration.review',
                'registration.approve',
                'attendance.verify',
                'attendance.view',
                'class.manage',
                'report.submit',
                'task.manage',
                'resource.upload',
                'announcement.publish',
                'analytics.view'
            )
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, allowed)
            VALUES (v_exec_role_id, v_perm.id, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = true;
        END LOOP;
    END IF;
END $$;

-- 5. UPDATE public.is_chapter_executive TO INCLUDE executive_member
CREATE OR REPLACE FUNCTION public.is_chapter_executive(ch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_hq_user() OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.chapter_id = ch_id
      AND ur.role_key IN (
        'campus_lead', 'chairman', 'vice_chairman', 'secretary', 'joint_secretary',
        'elevates_coordinator', 'technical_lead', 'technical_team', 'media_lead',
        'media_team', 'innovation_lead', 'innovation_team', 'class_representative',
        'faculty_coordinator', 'executive_member'
      )
  );
$$;

-- 6. UPDATE sync_user_roles_to_profile_designation TO HANDLE executive_member
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_profile_designation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_has_lead BOOLEAN := false;
    v_has_exec BOOLEAN := false;
    v_has_rep BOOLEAN := false;
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF v_user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id AND (
            ur.role_key IN ('campus_lead', 'chairman') 
            OR ur.role IN ('campus_lead', 'chairman') 
            OR r.key IN ('campus_lead', 'chairman')
        )
    ) INTO v_has_lead;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id AND (
            ur.role_key = 'executive_member' 
            OR ur.role = 'executive_member' 
            OR r.key = 'executive_member'
        )
    ) INTO v_has_exec;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_user_id AND (
            ur.role_key = 'class_representative' 
            OR ur.role = 'class_representative' 
            OR r.key = 'class_representative'
        )
    ) INTO v_has_rep;

    UPDATE public.profiles
    SET designation = CASE 
        WHEN v_has_lead THEN 'campus_lead'
        WHEN v_has_exec THEN 'executive_member'
        WHEN v_has_rep THEN 'class_rep'
        ELSE 'student'
    END,
    role = CASE
        WHEN v_has_lead THEN 'Campus Lead'
        WHEN v_has_exec THEN 'Executive Member'
        WHEN v_has_rep THEN 'Class Representative'
        ELSE 'Member'
    END
    WHERE id = v_user_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. UPDATE trg_enforce_faculty_and_student_roles TO TREAT executive_member AS STUDENT/CHAPTER ROLE
CREATE OR REPLACE FUNCTION public.trg_enforce_faculty_and_student_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  student_role_uuid UUID;
BEGIN
  -- Case A: Faculty Coordinator role is being assigned (INSERT or UPDATE)
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.role_key = 'faculty_coordinator' THEN
    -- Delete all other roles for this user
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;

    -- Directly update profiles table
    UPDATE public.profiles
    SET role = 'faculty_coordinator',
        designation = 'faculty_coordinator'
    WHERE id = NEW.user_id;

    RETURN NEW;
  END IF;

  -- Case B: Student, Campus Lead, Class Rep, or Executive Member attempted while user has faculty_coordinator
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.role_key IN ('student', 'campus_lead', 'class_representative', 'chairman', 'executive_member') THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id
        AND role_key = 'faculty_coordinator'
    ) THEN
      DELETE FROM public.user_roles WHERE id = NEW.id;
      RETURN NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Case C: Faculty role is deleted
  IF TG_OP = 'DELETE' AND OLD.role_key = 'faculty_coordinator' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = OLD.user_id
    ) THEN
      SELECT id INTO student_role_uuid FROM public.roles WHERE key = 'student' LIMIT 1;
      IF student_role_uuid IS NOT NULL THEN
        INSERT INTO public.user_roles (id, user_id, role_key, role_id, chapter_id, organization_id, is_permanent)
        VALUES (
          gen_random_uuid(),
          OLD.user_id,
          'student',
          student_role_uuid,
          OLD.chapter_id,
          OLD.organization_id,
          true
        )
        ON CONFLICT DO NOTHING;

        UPDATE public.profiles
        SET role = 'student',
            designation = 'student'
        WHERE id = OLD.user_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. ROW-LEVEL SECURITY POLICIES

-- terms
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read terms" ON public.terms;
DROP POLICY IF EXISTS "Authenticated read terms" ON public.terms;
DROP POLICY IF EXISTS "Service role manage terms" ON public.terms;
DROP POLICY IF EXISTS "Founders manage terms" ON public.terms;

CREATE POLICY "Authenticated read terms"
ON public.terms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manage terms"
ON public.terms FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Founders manage terms"
ON public.terms FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'));

-- term_members
ALTER TABLE public.term_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read term_members" ON public.term_members;
DROP POLICY IF EXISTS "Authenticated read term_members" ON public.term_members;
DROP POLICY IF EXISTS "Service role manage term_members" ON public.term_members;
DROP POLICY IF EXISTS "Campus lead manage term_members" ON public.term_members;

CREATE POLICY "Authenticated read term_members"
ON public.term_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manage term_members"
ON public.term_members FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Campus lead manage term_members"
ON public.term_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.terms t
        WHERE t.id = term_members.term_id
          AND t.campus_lead_id = auth.uid()
          AND t.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.terms t
        WHERE t.id = term_members.term_id
          AND t.campus_lead_id = auth.uid()
          AND t.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'
    )
);

-- handover_windows
ALTER TABLE public.handover_windows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read handover_windows" ON public.handover_windows;
DROP POLICY IF EXISTS "Service role manage handover_windows" ON public.handover_windows;
DROP POLICY IF EXISTS "Founder insert handover_windows" ON public.handover_windows;
DROP POLICY IF EXISTS "Founder update handover_windows" ON public.handover_windows;

CREATE POLICY "Authenticated read handover_windows"
ON public.handover_windows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manage handover_windows"
ON public.handover_windows FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Founder insert handover_windows"
ON public.handover_windows FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'
    )
);

CREATE POLICY "Founder update handover_windows"
ON public.handover_windows FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key = 'founder'
    )
);

-- 9. SINGLE-TRANSACTION TERM HANDOVER STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.execute_term_handover(
    p_chapter_id UUID,
    p_acting_user_id UUID,
    p_next_campus_lead_id UUID,
    p_next_term_year TEXT,
    p_next_exec_members JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_term RECORD;
    v_handover_window RECORD;
    v_new_term_id UUID;
    v_member RECORD;
    v_student_role_id UUID;
    v_campus_lead_role_id UUID;
    v_exec_member_role_id UUID;
    v_item JSONB;
    v_target_user_id UUID;
    v_designation TEXT;
BEGIN
    -- Step 1: Verify that this chapter's handover_windows.status = 'open'
    SELECT * INTO v_handover_window
    FROM public.handover_windows
    WHERE chapter_id = p_chapter_id AND status = 'open'
    ORDER BY opened_at DESC
    LIMIT 1;

    IF v_handover_window IS NULL THEN
        RAISE EXCEPTION 'Handover window is not open for this chapter';
    END IF;

    -- Step 2: Find current active term
    SELECT * INTO v_active_term
    FROM public.terms
    WHERE chapter_id = p_chapter_id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;

    -- Step 3: Verify acting user is current active campus lead
    IF v_active_term IS NULL THEN
        RAISE EXCEPTION 'No active term exists for this chapter. Founders must initialize the first term.';
    END IF;

    IF v_active_term.campus_lead_id <> p_acting_user_id THEN
        -- Founder bypass allowed if needed, otherwise strict check
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_acting_user_id AND role_key = 'founder') THEN
            RAISE EXCEPTION 'Only the current active term campus lead can execute the handover';
        END IF;
    END IF;

    -- Resolve system role IDs
    SELECT id INTO v_student_role_id FROM public.roles WHERE key = 'student' LIMIT 1;
    SELECT id INTO v_campus_lead_role_id FROM public.roles WHERE key = 'campus_lead' LIMIT 1;
    SELECT id INTO v_exec_member_role_id FROM public.roles WHERE key = 'executive_member' LIMIT 1;

    -- a. Sets current terms row: status='closed', ended_at=now()
    IF v_active_term IS NOT NULL THEN
        UPDATE public.terms
        SET status = 'closed',
            ended_at = now()
        WHERE id = v_active_term.id;

        -- b. Sets outgoing campus lead's role -> 'student'
        DELETE FROM public.user_roles
        WHERE user_id = v_active_term.campus_lead_id
          AND chapter_id = p_chapter_id
          AND role_key IN ('campus_lead', 'chairman');

        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = v_active_term.campus_lead_id
              AND role_key = 'student'
              AND chapter_id = p_chapter_id
        ) THEN
            INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
            VALUES (v_active_term.campus_lead_id, 'student', v_student_role_id, p_chapter_id, true);
        END IF;

        -- c. Sets every current term_members user's role -> 'student'
        FOR v_member IN (SELECT user_id FROM public.term_members WHERE term_id = v_active_term.id) LOOP
            DELETE FROM public.user_roles
            WHERE user_id = v_member.user_id
              AND chapter_id = p_chapter_id
              AND role_key = 'executive_member';

            IF NOT EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = v_member.user_id
                  AND role_key = 'student'
                  AND chapter_id = p_chapter_id
            ) THEN
                INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
                VALUES (v_member.user_id, 'student', v_student_role_id, p_chapter_id, true);
            END IF;
        END LOOP;
    END IF;

    -- d. Inserts new terms row (chapter_id, term_year = next year, campus_lead_id = new pick, status='active', started_at=now())
    INSERT INTO public.terms (chapter_id, term_year, campus_lead_id, status, started_at)
    VALUES (p_chapter_id, p_next_term_year, p_next_campus_lead_id, 'active', now())
    RETURNING id INTO v_new_term_id;

    -- e. Sets new campus lead's role -> 'campus_lead'
    DELETE FROM public.user_roles
    WHERE user_id = p_next_campus_lead_id
      AND chapter_id = p_chapter_id
      AND role_key = 'executive_member';

    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_next_campus_lead_id
          AND role_key = 'campus_lead'
          AND chapter_id = p_chapter_id
    ) THEN
        INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
        VALUES (p_next_campus_lead_id, 'campus_lead', v_campus_lead_role_id, p_chapter_id, true);
    END IF;

    -- Update chapters table campus_lead_id
    UPDATE public.chapters
    SET campus_lead_id = p_next_campus_lead_id
    WHERE id = p_chapter_id;

    -- f. Inserts term_members rows for the new executive members, sets each of their user role -> 'executive_member'
    IF p_next_exec_members IS NOT NULL AND jsonb_typeof(p_next_exec_members) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_next_exec_members) LOOP
            v_target_user_id := (v_item->>'user_id')::UUID;
            v_designation := NULLIF(trim(v_item->>'designation'), '');

            IF v_target_user_id IS NOT NULL AND v_target_user_id <> p_next_campus_lead_id THEN
                INSERT INTO public.term_members (term_id, user_id, role, designation, added_at)
                VALUES (v_new_term_id, v_target_user_id, 'executive_member', v_designation, now());

                IF NOT EXISTS (
                    SELECT 1 FROM public.user_roles
                    WHERE user_id = v_target_user_id
                      AND role_key = 'executive_member'
                      AND chapter_id = p_chapter_id
                ) THEN
                    INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
                    VALUES (v_target_user_id, 'executive_member', v_exec_member_role_id, p_chapter_id, true);
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- g. Do NOT touch handover_windows.status here — Founders close it manually or via date logic

    RETURN jsonb_build_object(
        'success', true,
        'new_term_id', v_new_term_id
    );
END;
$$;

-- 10. ASSIGN EXECUTIVE MEMBER STORED PROCEDURE
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
BEGIN
    -- Verify acting user has role 'campus_lead' for their own chapter only (or founder)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_acting_user_id
          AND ((ur.chapter_id = p_chapter_id AND ur.role_key IN ('campus_lead', 'chairman')) OR ur.role_key = 'founder')
    ) THEN
        RAISE EXCEPTION 'Only campus lead for this chapter can assign executive members';
    END IF;

    -- Find currently active term
    SELECT * INTO v_active_term
    FROM public.terms
    WHERE chapter_id = p_chapter_id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;

    -- If no active term exists, fail (Founders must create the first term)
    IF v_active_term IS NULL THEN
        RAISE EXCEPTION 'Cannot assign executive member: chapter has no active term. A founder must create the initial term first.';
    END IF;

    -- Verify acting user is current active campus lead (or founder)
    IF v_active_term.campus_lead_id <> p_acting_user_id AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_acting_user_id AND ur.role_key = 'founder'
    ) THEN
        RAISE EXCEPTION 'Only the active campus lead for this chapter can assign executive members';
    END IF;

    -- Insert into term_members
    INSERT INTO public.term_members (term_id, user_id, role, designation, added_at)
    VALUES (v_active_term.id, p_target_user_id, 'executive_member', NULLIF(trim(p_designation), ''), now())
    RETURNING id INTO v_new_member_id;

    -- Attach executive_member role
    SELECT id INTO v_exec_member_role_id FROM public.roles WHERE key = 'executive_member' LIMIT 1;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_target_user_id AND role_key = 'executive_member' AND chapter_id = p_chapter_id
    ) THEN
        INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
        VALUES (p_target_user_id, 'executive_member', v_exec_member_role_id, p_chapter_id, true);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'term_member_id', v_new_member_id,
        'term_id', v_active_term.id
    );
END;
$$;

-- 11. OPEN/CLOSE HANDOVER WINDOW STORED PROCEDURES
CREATE OR REPLACE FUNCTION public.open_chapter_handover_window(
    p_chapter_id UUID,
    p_acting_user_id UUID,
    p_year TEXT,
    p_closed_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_window_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = p_acting_user_id AND role_key = 'founder'
    ) THEN
        RAISE EXCEPTION 'Only founders can open handover windows';
    END IF;

    -- Close any existing open windows for this chapter
    UPDATE public.handover_windows
    SET status = 'closed', closed_at = now()
    WHERE chapter_id = p_chapter_id AND status = 'open';

    INSERT INTO public.handover_windows (chapter_id, year, opened_at, closed_at, opened_by, status)
    VALUES (p_chapter_id, p_year, now(), p_closed_at, p_acting_user_id, 'open')
    RETURNING id INTO v_window_id;

    RETURN jsonb_build_object('success', true, 'window_id', v_window_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_chapter_handover_window(
    p_chapter_id UUID,
    p_acting_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = p_acting_user_id AND role_key = 'founder'
    ) THEN
        RAISE EXCEPTION 'Only founders can close handover windows';
    END IF;

    UPDATE public.handover_windows
    SET status = 'closed', closed_at = now()
    WHERE chapter_id = p_chapter_id AND status = 'open';

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. CREATE FIRST CHAPTER TERM STORED PROCEDURE (FOUNDER ONLY)
CREATE OR REPLACE FUNCTION public.create_first_chapter_term(
    p_chapter_id UUID,
    p_acting_user_id UUID,
    p_campus_lead_id UUID,
    p_term_year TEXT,
    p_exec_members JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_term RECORD;
    v_new_term_id UUID;
    v_campus_lead_role_id UUID;
    v_exec_member_role_id UUID;
    v_item JSONB;
    v_target_user_id UUID;
    v_designation TEXT;
BEGIN
    -- Verify caller is founder
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_acting_user_id AND ur.role_key = 'founder'
    ) THEN
        RAISE EXCEPTION 'Only founders can create the first chapter term';
    END IF;

    -- Verify no active term already exists
    SELECT * INTO v_active_term
    FROM public.terms
    WHERE chapter_id = p_chapter_id AND status = 'active'
    LIMIT 1;

    IF v_active_term IS NOT NULL THEN
        RAISE EXCEPTION 'An active term already exists for this chapter. Use term handover instead.';
    END IF;

    SELECT id INTO v_campus_lead_role_id FROM public.roles WHERE key = 'campus_lead' LIMIT 1;
    SELECT id INTO v_exec_member_role_id FROM public.roles WHERE key = 'executive_member' LIMIT 1;

    -- Insert first term
    INSERT INTO public.terms (chapter_id, term_year, campus_lead_id, status, started_at)
    VALUES (p_chapter_id, p_term_year, p_campus_lead_id, 'active', now())
    RETURNING id INTO v_new_term_id;

    -- Set campus lead role for this user & chapter
    DELETE FROM public.user_roles
    WHERE user_id = p_campus_lead_id
      AND chapter_id = p_chapter_id
      AND role_key IN ('executive_member', 'campus_lead', 'chairman');

    INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
    VALUES (p_campus_lead_id, 'campus_lead', v_campus_lead_role_id, p_chapter_id, true)
    ON CONFLICT DO NOTHING;

    -- Update chapters table campus_lead_id
    UPDATE public.chapters
    SET campus_lead_id = p_campus_lead_id
    WHERE id = p_chapter_id;

    -- Insert executive members
    IF p_exec_members IS NOT NULL AND jsonb_typeof(p_exec_members) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_exec_members) LOOP
            v_target_user_id := (v_item->>'user_id')::UUID;
            v_designation := NULLIF(trim(v_item->>'designation'), '');

            IF v_target_user_id IS NOT NULL AND v_target_user_id <> p_campus_lead_id THEN
                INSERT INTO public.term_members (term_id, user_id, role, designation, added_at)
                VALUES (v_new_term_id, v_target_user_id, 'executive_member', v_designation, now());

                DELETE FROM public.user_roles
                WHERE user_id = v_target_user_id
                  AND chapter_id = p_chapter_id
                  AND role_key = 'executive_member';

                INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
                VALUES (v_target_user_id, 'executive_member', v_exec_member_role_id, p_chapter_id, true)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_term_id', v_new_term_id
    );
END;
$$;

