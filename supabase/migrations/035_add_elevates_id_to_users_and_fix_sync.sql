-- Migration 035: Add all profile compatibility columns to users table, remove NOT NULL constraint on name, and fix sync trigger
-- Fixes: PostgreSQL Error 42703 (missing columns) and Error 23502 (NOT NULL constraint on name)

-- 1. Ensure all profile compatibility columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS elevates_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discord_user_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- 2. Drop the NOT NULL constraint on name so missing profile names never abort sign-up
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN name SET DEFAULT 'Member';

CREATE INDEX IF NOT EXISTS idx_users_elevates_id ON public.users(elevates_id);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON public.users(full_name);

-- 3. Automatic fallback trigger on users so name and full_name mirror each other
CREATE OR REPLACE FUNCTION public.handle_users_name_fallback()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.name IS NULL OR NEW.name = '' THEN
        NEW.name := COALESCE(NEW.full_name, 'Member');
    END IF;
    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        NEW.full_name := COALESCE(NEW.name, 'Member');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_name_fallback ON public.users;
CREATE TRIGGER trg_users_name_fallback
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_users_name_fallback();

-- 4. Replace sync_profile_to_users function to safely sync all fields with robust null handling
CREATE OR REPLACE FUNCTION public.sync_profile_to_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_display_name TEXT;
BEGIN
    v_display_name := COALESCE(NEW.full_name, 'Member');

    INSERT INTO public.users (
        id, name, full_name, email, phone, chapter_id, role, designation, 
        elevates_id, avatar_url, status, discord_user_id, discord_username, 
        academic_year, created_at, updated_at
    )
    VALUES (
        NEW.id,
        v_display_name,
        v_display_name,
        NEW.email,
        NEW.phone,
        NEW.chapter_id,
        COALESCE(NEW.role, 'Member'),
        COALESCE(NEW.designation, 'student'),
        NEW.elevates_id,
        NEW.avatar_url,
        COALESCE(NEW.status, 'active'),
        NEW.discord_user_id,
        NEW.discord_username,
        NEW.academic_year,
        COALESCE(NEW.created_at, now()),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, EXCLUDED.full_name, users.name, 'Member'),
        full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.name, users.full_name, 'Member'),
        email = COALESCE(EXCLUDED.email, users.email),
        phone = COALESCE(EXCLUDED.phone, users.phone),
        chapter_id = COALESCE(EXCLUDED.chapter_id, users.chapter_id),
        role = COALESCE(EXCLUDED.role, users.role),
        designation = COALESCE(EXCLUDED.designation, users.designation),
        elevates_id = COALESCE(EXCLUDED.elevates_id, users.elevates_id),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        status = COALESCE(EXCLUDED.status, users.status),
        discord_user_id = COALESCE(EXCLUDED.discord_user_id, users.discord_user_id),
        discord_username = COALESCE(EXCLUDED.discord_username, users.discord_username),
        academic_year = COALESCE(EXCLUDED.academic_year, users.academic_year),
        updated_at = now();
    RETURN NEW;
END;
$$;
