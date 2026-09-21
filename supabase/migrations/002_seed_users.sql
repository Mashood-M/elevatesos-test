-- ============================================================================
-- ELEVATES OS - INITIAL BASE SEED
-- ============================================================================

-- 1. Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure base organization exists
INSERT INTO public.organizations (id, name, slug, tagline)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Elevates Foundation',
  'elevates',
  'Student-led tech movement'
)
ON CONFLICT (id) DO NOTHING;
