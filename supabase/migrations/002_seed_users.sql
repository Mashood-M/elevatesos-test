-- ============================================================================
-- ELEVATES OS - SEED DEMO / PRODUCTION USERS
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================================

-- 1. Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure base organization exists
INSERT INTO public.organizations (id, name, slug, logo_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Elevates Foundation',
  'elevates',
  '/logo.svg'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert auth.users (Supabase Authentication Table)
-- All accounts have password set to: 123456
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'founder@elevates.live',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"HQ Founder"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'admin@elevates.live',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"HQ Admin"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'chairman@elevates.live',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Campus Chairman"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'faculty@elevates.live',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Faculty Coordinator"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'cr@elevates.live',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Class Representative"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'student@elevates.live',
    crypt('123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Student"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('123456', gen_salt('bf')),
  email = EXCLUDED.email;

-- 4. Insert public.profiles
INSERT INTO public.profiles (id, email, full_name, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'founder@elevates.live', 'HQ Founder', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin@elevates.live', 'HQ Admin', now()),
  ('33333333-3333-3333-3333-333333333333', 'chairman@elevates.live', 'Campus Chairman', now()),
  ('44444444-4444-4444-4444-444444444444', 'faculty@elevates.live', 'Faculty Coordinator', now()),
  ('55555555-5555-5555-5555-555555555555', 'cr@elevates.live', 'Class Representative', now()),
  ('66666666-6666-6666-6666-666666666666', 'student@elevates.live', 'Student', now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- 5. Insert public.user_roles
INSERT INTO public.user_roles (id, user_id, role_key, organization_id)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'founder', '00000000-0000-0000-0000-000000000001'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'hq_admin', '00000000-0000-0000-0000-000000000001'),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'chairman', '00000000-0000-0000-0000-000000000001'),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'faculty_coordinator', '00000000-0000-0000-0000-000000000001'),
  ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'class_representative', '00000000-0000-0000-0000-000000000001'),
  ('a6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  role_key = EXCLUDED.role_key;
