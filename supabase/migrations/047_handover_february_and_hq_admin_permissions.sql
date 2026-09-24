-- ============================================================================
-- Migration: 047_handover_february_and_hq_admin_permissions.sql
-- Description: 
--   1. Allow HQ Admin alongside Founder to initialize chapter terms and control handover windows
--   2. Support automatic February term handover window in execute_term_handover
--   3. Synchronize profiles and close open handover window on handover completion
--   4. Update RLS policies on terms and handover_windows for HQ Admins
-- ============================================================================

-- 1. UPDATE RLS ON public.terms TO INCLUDE hq_admin
DROP POLICY IF EXISTS "Founders manage terms" ON public.terms;
CREATE POLICY "HQ manage terms"
ON public.terms FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
);

-- 2. UPDATE RLS ON public.handover_windows TO INCLUDE hq_admin
DROP POLICY IF EXISTS "Founder insert handover_windows" ON public.handover_windows;
DROP POLICY IF EXISTS "Founder update handover_windows" ON public.handover_windows;

CREATE POLICY "HQ insert handover_windows"
ON public.handover_windows FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
);

CREATE POLICY "HQ update handover_windows"
ON public.handover_windows FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role_key IN ('founder', 'hq_admin')
    )
);

-- 3. UPDATE open_chapter_handover_window TO PERMIT hq_admin
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
        SELECT 1 FROM public.user_roles WHERE user_id = p_acting_user_id AND role_key IN ('founder', 'hq_admin')
    ) THEN
        RAISE EXCEPTION 'Only HQ Admins and Founders can open handover windows';
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

-- 4. UPDATE close_chapter_handover_window TO PERMIT hq_admin
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
        SELECT 1 FROM public.user_roles WHERE user_id = p_acting_user_id AND role_key IN ('founder', 'hq_admin')
    ) THEN
        RAISE EXCEPTION 'Only HQ Admins and Founders can close handover windows';
    END IF;

    UPDATE public.handover_windows
    SET status = 'closed', closed_at = now()
    WHERE chapter_id = p_chapter_id AND status = 'open';

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. UPDATE create_first_chapter_term TO PERMIT hq_admin AND SYNC PROFILES
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
    -- Verify caller is founder or hq_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_acting_user_id AND ur.role_key IN ('founder', 'hq_admin')
    ) THEN
        RAISE EXCEPTION 'Only HQ Admins and Founders can initialize the first chapter term';
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

    -- Update profiles table
    UPDATE public.profiles
    SET role = 'Campus Lead',
        designation = 'campus_lead',
        chapter_id = p_chapter_id
    WHERE id = p_campus_lead_id;

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

                UPDATE public.profiles
                SET role = 'Executive Member',
                    designation = 'executive_member',
                    chapter_id = p_chapter_id
                WHERE id = v_target_user_id;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_term_id', v_new_term_id
    );
END;
$$;

-- 6. UPDATE execute_term_handover TO SUPPORT FEBRUARY AUTO-OPEN & COMPLETE PROFILE SYNC
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
    v_latest_window RECORD;
    v_is_window_open BOOLEAN := false;
    v_new_term_id UUID;
    v_member RECORD;
    v_student_role_id UUID;
    v_campus_lead_role_id UUID;
    v_exec_member_role_id UUID;
    v_item JSONB;
    v_target_user_id UUID;
    v_designation TEXT;
    v_is_february BOOLEAN := (EXTRACT(MONTH FROM now()) = 2);
    v_current_year INT := EXTRACT(YEAR FROM now())::INT;
    v_is_hq BOOLEAN := false;
BEGIN
    -- Check if acting user is founder or hq_admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_acting_user_id AND role_key IN ('founder', 'hq_admin')
    ) INTO v_is_hq;

    -- Fetch latest handover window record for this chapter
    SELECT * INTO v_latest_window
    FROM public.handover_windows
    WHERE chapter_id = p_chapter_id
    ORDER BY opened_at DESC
    LIMIT 1;

    -- Determine window openness:
    -- 1. Explicitly open in table
    IF v_latest_window IS NOT NULL AND v_latest_window.status = 'open' THEN
        IF v_latest_window.closed_at IS NULL OR v_latest_window.closed_at > now() THEN
            v_is_window_open := true;
        END IF;
    END IF;

    -- 2. February annual window (unless explicitly closed by HQ in current year)
    IF NOT v_is_window_open AND v_is_february THEN
        IF v_latest_window IS NULL OR v_latest_window.status <> 'closed' OR EXTRACT(YEAR FROM v_latest_window.closed_at) <> v_current_year THEN
            v_is_window_open := true;
        END IF;
    END IF;

    -- 3. HQ role override
    IF v_is_hq THEN
        v_is_window_open := true;
    END IF;

    IF NOT v_is_window_open THEN
        RAISE EXCEPTION 'Handover window is not open for this chapter';
    END IF;

    -- Step 2: Find current active term
    SELECT * INTO v_active_term
    FROM public.terms
    WHERE chapter_id = p_chapter_id AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1;

    -- Step 3: Verify acting user is current active campus lead (or HQ)
    IF v_active_term IS NULL THEN
        RAISE EXCEPTION 'No active term exists for this chapter. HQ Admins or Founders must initialize the first term.';
    END IF;

    IF v_active_term.campus_lead_id <> p_acting_user_id AND NOT v_is_hq THEN
        RAISE EXCEPTION 'Only the current active term campus lead can execute the handover';
    END IF;

    -- Resolve system role IDs
    SELECT id INTO v_student_role_id FROM public.roles WHERE key = 'student' LIMIT 1;
    SELECT id INTO v_campus_lead_role_id FROM public.roles WHERE key = 'campus_lead' LIMIT 1;
    SELECT id INTO v_exec_member_role_id FROM public.roles WHERE key = 'executive_member' LIMIT 1;

    -- a. Close current active term
    IF v_active_term IS NOT NULL THEN
        UPDATE public.terms
        SET status = 'closed',
            ended_at = now()
        WHERE id = v_active_term.id;

        -- b. Outgoing campus lead demoted to 'student'
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

        IF v_active_term.campus_lead_id <> p_next_campus_lead_id THEN
            UPDATE public.profiles
            SET role = 'Member',
                designation = 'student'
            WHERE id = v_active_term.campus_lead_id;
        END IF;

        -- c. Outgoing term_members demoted to 'student'
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

            IF v_member.user_id <> p_next_campus_lead_id THEN
                UPDATE public.profiles
                SET role = 'Member',
                    designation = 'student'
                WHERE id = v_member.user_id;
            END IF;
        END LOOP;
    END IF;

    -- d. Inserts new terms row
    INSERT INTO public.terms (chapter_id, term_year, campus_lead_id, status, started_at)
    VALUES (p_chapter_id, p_next_term_year, p_next_campus_lead_id, 'active', now())
    RETURNING id INTO v_new_term_id;

    -- e. Sets new campus lead's role -> 'campus_lead'
    DELETE FROM public.user_roles
    WHERE user_id = p_next_campus_lead_id
      AND chapter_id = p_chapter_id
      AND role_key IN ('executive_member', 'student');

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

    -- Update profiles for new campus lead
    UPDATE public.profiles
    SET role = 'Campus Lead',
        designation = 'campus_lead',
        chapter_id = p_chapter_id
    WHERE id = p_next_campus_lead_id;

    -- f. Inserts term_members rows for the new executive members
    IF p_next_exec_members IS NOT NULL AND jsonb_typeof(p_next_exec_members) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_next_exec_members) LOOP
            v_target_user_id := (v_item->>'user_id')::UUID;
            v_designation := NULLIF(trim(v_item->>'designation'), '');

            IF v_target_user_id IS NOT NULL AND v_target_user_id <> p_next_campus_lead_id THEN
                INSERT INTO public.term_members (term_id, user_id, role, designation, added_at)
                VALUES (v_new_term_id, v_target_user_id, 'executive_member', v_designation, now());

                DELETE FROM public.user_roles
                WHERE user_id = v_target_user_id
                  AND chapter_id = p_chapter_id
                  AND role_key = 'executive_member';

                INSERT INTO public.user_roles (user_id, role_key, role_id, chapter_id, is_permanent)
                VALUES (v_target_user_id, 'executive_member', v_exec_member_role_id, p_chapter_id, true);

                UPDATE public.profiles
                SET role = 'Executive Member',
                    designation = 'executive_member',
                    chapter_id = p_chapter_id
                WHERE id = v_target_user_id;
            END IF;
        END LOOP;
    END IF;

    -- g. Close any open handover window for this chapter now that handover is complete
    UPDATE public.handover_windows
    SET status = 'closed', closed_at = now()
    WHERE chapter_id = p_chapter_id AND status = 'open';

    RETURN jsonb_build_object(
        'success', true,
        'new_term_id', v_new_term_id
    );
END;
$$;
