-- ============================================================================
-- AUDIT SEED USERS QUERY (READ-ONLY)
-- Lists any legacy test/seed accounts present in auth.users
-- ============================================================================

SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.updated_at,
  u.last_sign_in_at,
  p.full_name,
  ur.role_key
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN (
  'founder@elevates.live',
  'admin@elevates.live',
  'chairman@elevates.live',
  'faculty@elevates.live',
  'cr@elevates.live',
  'student@elevates.live'
)
ORDER BY u.created_at ASC;
