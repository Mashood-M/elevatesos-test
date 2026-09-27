-- ============================================================================
-- Migration: 054_direct_student_signup_and_remove_referrals.sql
-- Description:
--   1. Updates public.handle_new_user() trigger so every newly registered
--      student is directly saved as a normal student (chapter_id = NULL).
--   2. Automatically persists phone number and full name from user metadata.
--   3. Automatically assigns the default 'student' role in public.user_roles.
--   4. Records the student join event into public.activity_logs ('student_signup'),
--      replacing the previous referral-only attribution mechanism.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_student_role_id UUID;
  v_phone TEXT;
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  v_phone := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g'), '');

  -- 1. Insert or update profile as normal student (not chapter-bound)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    avatar_url,
    status,
    chapter_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_phone,
    NEW.raw_user_meta_data->>'avatar_url',
    'active',
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE 
        WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
        THEN EXCLUDED.full_name 
        ELSE public.profiles.full_name 
      END,
      phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
      status = 'active',
      updated_at = NOW();

  -- 2. Automatically assign default student role (chapter_id = NULL, normal student)
  SELECT id INTO v_student_role_id FROM public.roles WHERE key = 'student' LIMIT 1;
  IF v_student_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (
      id,
      user_id,
      role_id,
      role_key,
      chapter_id,
      organization_id,
      is_permanent,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      NEW.id,
      v_student_role_id,
      'student',
      NULL,
      '00000000-0000-0000-0000-000000000001'::uuid,
      true,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Record student signup activity log directly
  BEGIN
    INSERT INTO public.activity_logs (
      id,
      actor_id,
      action,
      entity,
      entity_id,
      meta,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      NEW.id,
      'student_signup',
      'profile',
      NEW.id::text,
      jsonb_build_object(
        'userId', NEW.id,
        'email', NEW.email,
        'fullName', v_name,
        'phone', v_phone,
        'role', 'student',
        'chapterId', NULL,
        'joinedAt', NOW()
      ),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Gracefully ignore logging errors so user creation never blocks
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
