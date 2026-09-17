-- ============================================================================
-- Migration: 033_profile_setup_discord_and_academic_year.sql
-- Description:
--   1. Ensures all profile setup fields exist on public.profiles:
--      - academic_year: TEXT (supports 1st Year, 2nd Year, 3rd Year, 4th Year, etc.)
--      - discord_user_id: TEXT (unique user snowflake ID)
--      - discord_username: TEXT (Discord handle e.g. username / username#0000)
--      - discord_connected: BOOLEAN (whether account is verified with Elevates Bot)
--      - discord_connected_at: TIMESTAMPTZ (timestamp of bot verification)
--   2. Synchronizes academic_year with legacy year column.
--   3. Synchronizes discord_connected flag based on discord_user_id or username.
--   4. Creates fast search indexes for Discord and Academic Year.
--   5. Ensures RLS policies allow authenticated users to update their own profile.
-- ============================================================================

-- 1. Add missing profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_username TEXT,
  ADD COLUMN IF NOT EXISTS discord_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discord_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Backfill academic_year from year where missing
UPDATE public.profiles
SET academic_year = year
WHERE (academic_year IS NULL OR academic_year = '') AND year IS NOT NULL AND year != '';

-- 3. Backfill year from academic_year where missing
UPDATE public.profiles
SET year = academic_year
WHERE (year IS NULL OR year = '') AND academic_year IS NOT NULL AND academic_year != '';

-- 4. Backfill discord_connected = true for existing linked accounts
UPDATE public.profiles
SET 
  discord_connected = true,
  discord_connected_at = COALESCE(discord_connected_at, updated_at, now())
WHERE (discord_user_id IS NOT NULL AND discord_user_id != '')
   OR (discord_username IS NOT NULL AND discord_username != '');

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_academic_year ON public.profiles(academic_year);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_user_id ON public.profiles(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_username ON public.profiles(discord_username);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_connected ON public.profiles(discord_connected);

-- 6. Ensure RLS allows users to update their own profile and read profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Read profiles policy" ON public.profiles;
CREATE POLICY "Read profiles policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile or HQ update" ON public.profiles;
CREATE POLICY "Update own profile or HQ update" ON public.profiles 
  FOR UPDATE 
  USING (id = auth.uid() OR public.is_hq_user())
  WITH CHECK (id = auth.uid() OR public.is_hq_user());

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
