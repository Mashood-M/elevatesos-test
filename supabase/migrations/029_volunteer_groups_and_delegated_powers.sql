-- ============================================================================
-- Migration: 029_volunteer_groups_and_delegated_powers.sql
-- Description: Creates volunteer_groups, volunteer_group_members, and
--              volunteer_assignments tables with UUID foreign keys matching
--              public.chapters, public.profiles, and public.events.
-- ============================================================================

-- Clean up any partial definitions from failed runs
DROP TABLE IF EXISTS public.volunteer_assignments CASCADE;
DROP TABLE IF EXISTS public.volunteer_group_members CASCADE;
DROP TABLE IF EXISTS public.volunteer_groups CASCADE;

-- 1. Create volunteer_groups table
CREATE TABLE public.volunteer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'listed' CHECK (group_type IN ('listed', 'temp')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  powers JSONB NOT NULL DEFAULT '{"canTakeAttendance":true,"canScanQr":true,"canVerifyTickets":true,"canRegisterWalkins":false,"canManageTasks":false,"canViewdirectory":true}'::jsonb,
  member_ids UUID[] DEFAULT '{}',
  custom_member_powers JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create volunteer_group_members junction table
CREATE TABLE public.volunteer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.volunteer_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  custom_powers JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_volunteer_group_member UNIQUE (group_id, user_id)
);

-- 3. Create volunteer_assignments table for event & temporal tagging
CREATE TABLE public.volunteer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.volunteer_groups(id) ON DELETE SET NULL,
  tag TEXT DEFAULT 'Volunteer',
  powers JSONB NOT NULL DEFAULT '{"canTakeAttendance":true,"canScanQr":true,"canVerifyTickets":true,"canRegisterWalkins":false,"canManageTasks":false,"canViewdirectory":true}'::jsonb,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.volunteer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for volunteer_groups
DROP POLICY IF EXISTS "Public read volunteer_groups" ON public.volunteer_groups;
CREATE POLICY "Public read volunteer_groups" ON public.volunteer_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage volunteer_groups" ON public.volunteer_groups;
CREATE POLICY "Manage volunteer_groups" ON public.volunteer_groups FOR ALL USING (true) WITH CHECK (true);

-- 6. Policies for volunteer_group_members
DROP POLICY IF EXISTS "Public read volunteer_group_members" ON public.volunteer_group_members;
CREATE POLICY "Public read volunteer_group_members" ON public.volunteer_group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage volunteer_group_members" ON public.volunteer_group_members;
CREATE POLICY "Manage volunteer_group_members" ON public.volunteer_group_members FOR ALL USING (true) WITH CHECK (true);

-- 7. Policies for volunteer_assignments
DROP POLICY IF EXISTS "Public read volunteer_assignments" ON public.volunteer_assignments;
CREATE POLICY "Public read volunteer_assignments" ON public.volunteer_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage volunteer_assignments" ON public.volunteer_assignments;
CREATE POLICY "Manage volunteer_assignments" ON public.volunteer_assignments FOR ALL USING (true) WITH CHECK (true);

-- 8. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_volunteer_groups_chapter ON public.volunteer_groups(chapter_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_groups_event ON public.volunteer_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_group_members_group ON public.volunteer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_group_members_user ON public.volunteer_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_user ON public.volunteer_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_event ON public.volunteer_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_chapter ON public.volunteer_assignments(chapter_id);
