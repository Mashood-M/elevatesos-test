-- Migration 036: Add role column to user_roles table and fix role triggers
-- Fixes: PostgreSQL Error 42703 (record "new" has no field "role") during role assignment

-- 1. Add role column to public.user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role TEXT;
UPDATE public.user_roles SET role = role_key WHERE role IS NULL;

-- 2. Automatic compatibility trigger on user_roles so role and role_key mirror each other
CREATE OR REPLACE FUNCTION public.handle_user_roles_compat()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.role IS NULL OR NEW.role = '' THEN
        NEW.role := NEW.role_key;
    END IF;
    IF NEW.role_key IS NULL OR NEW.role_key = '' THEN
        NEW.role_key := NEW.role;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_compat ON public.user_roles;
CREATE TRIGGER trg_user_roles_compat
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_roles_compat();

-- 3. Ensure audit_role_changes uses safe role resolution
CREATE OR REPLACE FUNCTION public.trigger_audit_role_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role_key TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_role_key := COALESCE(NEW.role_key, NEW.role, (SELECT key FROM public.roles WHERE id = NEW.role_id), 'assigned_role');
        PERFORM public.record_audit_log(
            auth.uid(),
            'role_assigned',
            'user_role',
            NEW.user_id::text,
            'Assigned role ' || v_role_key || ' to user ' || NEW.user_id::text,
            'critical',
            NEW.chapter_id
        );
    ELSIF (TG_OP = 'DELETE') THEN
        v_role_key := COALESCE(OLD.role_key, OLD.role, (SELECT key FROM public.roles WHERE id = OLD.role_id), 'revoked_role');
        PERFORM public.record_audit_log(
            auth.uid(),
            'role_revoked',
            'user_role',
            OLD.user_id::text,
            'Revoked role ' || v_role_key || ' from user ' || OLD.user_id::text,
            'critical',
            OLD.chapter_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Ensure sync_user_roles_to_profile_designation handles all cases safely
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_profile_designation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_has_lead BOOLEAN := false;
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
            ur.role_key = 'class_representative' 
            OR ur.role = 'class_representative' 
            OR r.key = 'class_representative'
        )
    ) INTO v_has_rep;

    UPDATE public.profiles
    SET designation = CASE 
        WHEN v_has_lead THEN 'campus_lead'
        WHEN v_has_rep THEN 'class_rep'
        ELSE 'student'
    END,
    role = CASE
        WHEN v_has_lead THEN 'Campus Lead'
        WHEN v_has_rep THEN 'Class Representative'
        ELSE 'Member'
    END
    WHERE id = v_user_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;
