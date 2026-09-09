-- ==============================================================================
-- 017: Waitlist & Exclusive Campus Lead Approval Policy
-- ==============================================================================
-- 1. Lock `registration.approve` permission strictly to `campus_lead` & `chairman`.
--    Revoke approval permissions from Class Representatives, Coordinators, Secretaries, etc.
-- 2. Deprecate legacy `registration.review` permission since event registrations
--    are auto-approved if seats remain, and waitlisted otherwise.
-- 3. Restrict database UPDATE permissions on `event_registrations`:
--    Only Campus Lead (and HQ/Founder) can set status to 'approved' and grant seat QR passes.
-- ==============================================================================

-- 1. PERMISSIONS UPDATE IN role_permissions
DO $$
DECLARE
    v_campus_lead_id UUID;
    v_chairman_id UUID;
    v_perm_approve_id UUID;
    v_perm_review_id UUID;
BEGIN
    -- Get or create 'registration.approve' permission
    SELECT id INTO v_perm_approve_id FROM public.permissions WHERE key = 'registration.approve';
    IF v_perm_approve_id IS NULL THEN
        INSERT INTO public.permissions (key, name, description, module)
        VALUES ('registration.approve', 'Approve Registration', 'Approve waitlisted registrations into confirmed seats', 'events')
        RETURNING id INTO v_perm_approve_id;
    END IF;

    -- Get or create 'registration.review' permission
    SELECT id INTO v_perm_review_id FROM public.permissions WHERE key = 'registration.review';

    -- Fetch role IDs
    SELECT id INTO v_campus_lead_id FROM public.roles WHERE key = 'campus_lead';
    SELECT id INTO v_chairman_id FROM public.roles WHERE key = 'chairman';

    -- Explicitly REVOKE registration.approve from all roles first
    IF v_perm_approve_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id, allowed)
        SELECT r.id, v_perm_approve_id, false
        FROM public.roles r
        WHERE r.key NOT IN ('campus_lead', 'chairman', 'founder', 'hq_admin')
        ON CONFLICT (role_id, permission_id)
        DO UPDATE SET allowed = false;

        -- Explicitly GRANT registration.approve to Campus Lead and Chairman
        IF v_campus_lead_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id, allowed)
            VALUES (v_campus_lead_id, v_perm_approve_id, true)
            ON CONFLICT (role_id, permission_id)
            DO UPDATE SET allowed = true;
        END IF;

        IF v_chairman_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id, allowed)
            VALUES (v_chairman_id, v_perm_approve_id, true)
            ON CONFLICT (role_id, permission_id)
            DO UPDATE SET allowed = true;
        END IF;
    END IF;

    -- Set registration.review to false across all roles since review stage is eliminated
    IF v_perm_review_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id, allowed)
        SELECT r.id, v_perm_review_id, false
        FROM public.roles r
        ON CONFLICT (role_id, permission_id)
        DO UPDATE SET allowed = false;
    END IF;
END $$;


-- 2. HELPER FUNCTION: Verify if the user is Campus Lead for a chapter
CREATE OR REPLACE FUNCTION public.is_campus_lead_user(p_chapter_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    -- HQ administrators have global authority
    IF public.is_hq_user() THEN
        RETURN TRUE;
    END IF;

    -- Check if user holds campus_lead or chairman role for this chapter
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (p_chapter_id IS NULL OR ur.chapter_id = p_chapter_id)
          AND ur.role_key IN ('campus_lead', 'chairman')
    );
END;
$$;


-- 3. RLS POLICIES FOR EVENT_REGISTRATIONS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Drop previous broad update policies if they exist
DROP POLICY IF EXISTS "Executive or HQ update event_registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Campus Lead approval or Executive update event_registrations" ON public.event_registrations;

-- New UPDATE policy:
-- 1. Users can update their own registration (e.g., cancel attendance)
-- 2. Chapter executives can update non-approval fields (e.g. details, notes)
-- 3. Only Campus Lead or HQ can set status to 'approved'
CREATE POLICY "Campus Lead approval or Executive update event_registrations"
ON public.event_registrations
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_hq_user()
    OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.is_chapter_executive(e.chapter_id)
    )
)
WITH CHECK (
    -- If status is NOT being changed to 'approved', allow standard executive or self update
    status <> 'approved'
    -- If status IS 'approved', user must be Campus Lead for the event's chapter or HQ
    OR public.is_hq_user()
    OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.is_campus_lead_user(e.chapter_id)
    )
);


-- 4. INTEGRITY TRIGGER: Reject any non-Campus Lead attempting to approve a waitlist registration
CREATE OR REPLACE FUNCTION public.enforce_campus_lead_registration_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_chapter_id UUID;
    v_actor_id UUID;
BEGIN
    -- Only inspect when status transitions to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
        -- Determine who is performing the approval
        v_actor_id := COALESCE(auth.uid(), NEW.approved_by);

        IF v_actor_id IS NOT NULL THEN
            -- Get the event's chapter
            SELECT chapter_id INTO v_chapter_id FROM public.events WHERE id = NEW.event_id;

            -- Check if actor has campus_lead, chairman, founder, or hq_admin role
            IF NOT EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = v_actor_id
                  AND ur.role_key IN ('campus_lead', 'chairman', 'founder', 'hq_admin')
            ) THEN
                RAISE EXCEPTION 'Access restricted: Only the Campus Lead has authority to approve registrations from the waiting list.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_campus_lead_approval ON public.event_registrations;
CREATE TRIGGER trg_enforce_campus_lead_approval
BEFORE UPDATE OF status ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_campus_lead_registration_approval();
