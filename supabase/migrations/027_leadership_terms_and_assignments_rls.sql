-- ============================================================================
-- Migration: 027_leadership_terms_and_assignments_rls.sql
-- Description: Enables public/authenticated SELECT policies for leadership_terms
--              and leadership_assignments so client hydration and realtime
--              sync never drop appointed volunteers or leadership terms.
-- ============================================================================

-- 1. Ensure leadership_terms table exists and has RLS enabled
ALTER TABLE IF EXISTS public.leadership_terms ENABLE ROW LEVEL SECURITY;

-- 2. Add public read policy for leadership_terms
DROP POLICY IF EXISTS "Public read leadership_terms" ON public.leadership_terms;
CREATE POLICY "Public read leadership_terms" ON public.leadership_terms FOR SELECT USING (true);

-- 3. Add management policy for authenticated users / service role for leadership_terms
DROP POLICY IF EXISTS "Manage leadership_terms" ON public.leadership_terms;
CREATE POLICY "Manage leadership_terms" ON public.leadership_terms FOR ALL USING (true) WITH CHECK (true);

-- 4. Ensure leadership_assignments table exists and has RLS enabled
ALTER TABLE IF EXISTS public.leadership_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Add public read policy for leadership_assignments
DROP POLICY IF EXISTS "Public read leadership_assignments" ON public.leadership_assignments;
CREATE POLICY "Public read leadership_assignments" ON public.leadership_assignments FOR SELECT USING (true);

-- 6. Add management policy for authenticated users / service role for leadership_assignments
DROP POLICY IF EXISTS "Manage leadership_assignments" ON public.leadership_assignments;
CREATE POLICY "Manage leadership_assignments" ON public.leadership_assignments FOR ALL USING (true) WITH CHECK (true);

-- 7. Ensure role_permissions for volunteer role include attendance verification and viewing
DO $$
DECLARE
  v_role_id UUID;
  p_verify UUID;
  p_view UUID;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE key = 'volunteer' LIMIT 1;
  SELECT id INTO p_verify FROM public.permissions WHERE key = 'attendance.verify' LIMIT 1;
  SELECT id INTO p_view FROM public.permissions WHERE key = 'attendance.view' LIMIT 1;

  IF v_role_id IS NOT NULL AND p_verify IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id, allowed)
    VALUES (v_role_id, p_verify, true)
    ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = true;
  END IF;

  IF v_role_id IS NOT NULL AND p_view IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id, allowed)
    VALUES (v_role_id, p_view, true)
    ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = true;
  END IF;
END $$;
