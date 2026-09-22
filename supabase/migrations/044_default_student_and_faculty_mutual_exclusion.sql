-- ============================================================================
-- Migration: 044_default_student_and_faculty_mutual_exclusion.sql
-- Description:
--   1. Enforces student role as default for all accounts.
--   2. Ensures mutual exclusivity between faculty_coordinator and student / campus_lead / class_representative:
--      when faculty role is assigned to a user, student and leadership roles are removed
--      automatically, chapter campus_lead and class rep assignments are cleared,
--      and only the faculty role remains.
--   3. When faculty role is held, student, campus_lead, and class_representative roles
--      are NOT assignable.
--   4. If faculty role is removed, the account automatically reverts to student.
-- ============================================================================

-- 1. CLEAN UP EXISTING ROLES DRIFT
-- For any user who has faculty_coordinator, remove any student or leadership roles
DELETE FROM public.user_roles
WHERE role_key IN ('student', 'campus_lead', 'class_representative', 'chairman')
  AND user_id IN (
    SELECT user_id FROM public.user_roles WHERE role_key = 'faculty_coordinator'
  );

-- Clear campus_lead_id on chapters for faculty coordinators
UPDATE public.chapters
SET campus_lead_id = NULL
WHERE campus_lead_id IN (
  SELECT user_id FROM public.user_roles WHERE role_key = 'faculty_coordinator'
);

-- Clear representative_id on class_cohorts for faculty coordinators
UPDATE public.class_cohorts
SET representative_id = NULL
WHERE representative_id IN (
  SELECT user_id FROM public.user_roles WHERE role_key = 'faculty_coordinator'
);

-- For any profile that does not have faculty_coordinator and does not have student, backfill student role
INSERT INTO public.user_roles (id, user_id, role_key, role_id, chapter_id, organization_id, is_permanent)
SELECT
  gen_random_uuid(),
  p.id,
  'student',
  (SELECT id FROM public.roles WHERE key = 'student' LIMIT 1),
  p.chapter_id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_key = 'faculty_coordinator'
)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_key = 'student'
);

-- 2. TRIGGER FUNCTION: ENFORCE MUTUAL EXCLUSIVITY ON USER_ROLES
CREATE OR REPLACE FUNCTION public.trg_enforce_faculty_and_student_roles()
RETURNS TRIGGER AS $$
DECLARE
  student_role_uuid UUID;
  user_chapter UUID;
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Case A: Faculty role is assigned/updated
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.role_key = 'faculty_coordinator' THEN
    -- Delete any other roles for this user (student, campus_lead, class_representative, etc.) so ONLY faculty remains
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND id <> NEW.id;

    -- Update profile designation/role
    UPDATE public.profiles
    SET role = 'faculty_coordinator'
    WHERE id = NEW.user_id;

    -- Clean up any chapter campus_lead or class cohort rep assignments
    UPDATE public.chapters
    SET campus_lead_id = NULL
    WHERE campus_lead_id = NEW.user_id;

    UPDATE public.class_cohorts
    SET representative_id = NULL
    WHERE representative_id = NEW.user_id;

    RETURN NEW;
  END IF;

  -- Case B: Student, Campus Lead, or Class Rep role attempted while user has faculty_coordinator
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.role_key IN ('student', 'campus_lead', 'class_representative', 'chairman') THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id
        AND role_key = 'faculty_coordinator'
        AND id <> NEW.id
    ) THEN
      -- Faculty accounts cannot hold student, campus lead, or class rep roles; purge this row
      DELETE FROM public.user_roles WHERE id = NEW.id;
      RETURN NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Case C: Faculty role is deleted
  IF TG_OP = 'DELETE' AND OLD.role_key = 'faculty_coordinator' THEN
    -- If no user_roles remain for this user, automatically restore default student role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = OLD.user_id
    ) THEN
      SELECT id INTO student_role_uuid FROM public.roles WHERE key = 'student' LIMIT 1;
      SELECT chapter_id INTO user_chapter FROM public.profiles WHERE id = OLD.user_id;

      INSERT INTO public.user_roles (id, user_id, role_key, role_id, chapter_id, organization_id, is_permanent)
      VALUES (
        gen_random_uuid(),
        OLD.user_id,
        'student',
        student_role_uuid,
        user_chapter,
        COALESCE(OLD.organization_id, '00000000-0000-0000-0000-000000000001'::uuid),
        true
      );

      UPDATE public.profiles
      SET role = 'student'
      WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_faculty_student_exclusivity ON public.user_roles;
CREATE TRIGGER trg_faculty_student_exclusivity
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_faculty_and_student_roles();

-- 3. TRIGGER FUNCTION: AUTO-ASSIGN DEFAULT STUDENT ROLE ON NEW PROFILE CREATION
CREATE OR REPLACE FUNCTION public.trg_auto_assign_default_student_role()
RETURNS TRIGGER AS $$
DECLARE
  student_role_uuid UUID;
BEGIN
  -- If user has no roles yet, assign default student role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  ) THEN
    SELECT id INTO student_role_uuid FROM public.roles WHERE key = 'student' LIMIT 1;

    INSERT INTO public.user_roles (id, user_id, role_key, role_id, chapter_id, organization_id, is_permanent)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      'student',
      student_role_uuid,
      NEW.chapter_id,
      '00000000-0000-0000-0000-000000000001'::uuid,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_student_on_profile ON public.profiles;
CREATE TRIGGER trg_auto_assign_student_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_assign_default_student_role();
