-- ============================================================================
-- Migration 039: fix tables the code expects + dedicated Peer Labs schema
--
-- Safe to re-run (fully idempotent). Run AFTER 037_email_verification_support.sql.
--
--   1. cluster_members / project_members  -> normalise + backfill from arrays
--   2. cluster_tasks / task_submissions    -> tables the cluster weekly-task UI reads
--   3. Peer Labs                           -> own tables (phases, facilitators, enrollments)
--   4. users <-> profiles                  -> stop drift when a profile is deleted
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. cluster_members / project_members
--    These tables exist in your database but not in any earlier migration, so
--    their exact columns are unknown. Create if missing, add the columns the
--    API writes, and relax any extra NOT NULL column that would make inserts
--    fail (the API ignored those errors, which is why the tables stayed empty).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cluster_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cluster_members
  ADD COLUMN IF NOT EXISTS cluster_id UUID,
  ADD COLUMN IF NOT EXISTS user_id    UUID,
  ADD COLUMN IF NOT EXISTS role       TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS joined_at  TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS user_id    UUID,
  ADD COLUMN IF NOT EXISTS role       TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS joined_at  TIMESTAMPTZ DEFAULT now();

DO $$
DECLARE
  t TEXT;
  r RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['cluster_members', 'project_members'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    -- uuid id column without a default would reject inserts that omit id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'id'
        AND data_type = 'uuid' AND column_default IS NULL
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', t);
    END IF;

    -- any other NOT NULL column without a default would also reject the insert
    FOR r IN
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t
        AND is_nullable = 'NO' AND column_default IS NULL
        AND column_name NOT IN ('id', 'cluster_id', 'project_id', 'user_id')
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', t, r.column_name);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

DELETE FROM public.cluster_members a USING public.cluster_members b
 WHERE a.ctid < b.ctid AND a.cluster_id = b.cluster_id AND a.user_id = b.user_id;
DELETE FROM public.project_members a USING public.project_members b
 WHERE a.ctid < b.ctid AND a.project_id = b.project_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cluster_members_cluster_user
  ON public.cluster_members (cluster_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_project_user
  ON public.project_members (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_user ON public.cluster_members (user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members (user_id);

-- Backfill from the arrays already stored on clusters / projects
INSERT INTO public.cluster_members (cluster_id, user_id)
SELECT c.id, m.uid
FROM public.clusters c
CROSS JOIN LATERAL unnest(COALESCE(c.member_ids, '{}'::uuid[])) AS m(uid)
WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.uid)
ON CONFLICT DO NOTHING;

INSERT INTO public.project_members (project_id, user_id)
SELECT pr.id, m.uid
FROM public.projects pr
CROSS JOIN LATERAL unnest(COALESCE(pr.team_ids, '{}'::uuid[])) AS m(uid)
WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.uid)
ON CONFLICT DO NOTHING;

ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cluster_members_read" ON public.cluster_members;
CREATE POLICY "cluster_members_read" ON public.cluster_members
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_members_read" ON public.project_members;
CREATE POLICY "project_members_read" ON public.project_members
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 2. Cluster weekly tasks (the cluster page + Discord bot read these)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cluster_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'closed', 'archived')),
  forum_thread_id TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cluster_tasks_cluster_status
  ON public.cluster_tasks (cluster_id, status);

CREATE TABLE IF NOT EXISTS public.task_submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            UUID NOT NULL REFERENCES public.cluster_tasks(id) ON DELETE CASCADE,
  os_user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_message_id TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'rejected')),
  marked_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, os_user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON public.task_submissions (task_id, status);

DROP TRIGGER IF EXISTS trg_cluster_tasks_updated ON public.cluster_tasks;
CREATE TRIGGER trg_cluster_tasks_updated
  BEFORE UPDATE ON public.cluster_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.cluster_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cluster_tasks_read" ON public.cluster_tasks;
CREATE POLICY "cluster_tasks_read" ON public.cluster_tasks
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_submissions_read" ON public.task_submissions;
CREATE POLICY "task_submissions_read" ON public.task_submissions
  FOR SELECT TO authenticated USING (true);
-- Writes: service role only (Discord bot / OS API). No write policy on purpose.

-- ============================================================================
-- 3. PEER LABS — a first-class entity with its own tables
--
--   peer_labs                 the lab itself
--     chapter_id  -> chapters       host campus (NULL = network-wide)
--     cluster_id  -> clusters       optional linked interest cluster
--     created_by  -> profiles
--   peer_lab_phases           curriculum sessions
--     event_id    -> events         optional: a phase can BE a real event, so
--                                   registrations / attendance / certificates work
--   peer_lab_facilitators     who teaches
--     user_id     -> profiles       optional: external facilitators only need a name
--   peer_lab_enrollments      who joined (OS members or website applicants)
--     user_id     -> profiles       NULL for public-website applicants
-- ============================================================================
ALTER TABLE public.peer_labs
  ADD COLUMN IF NOT EXISTS cluster_id       UUID REFERENCES public.clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_participants INT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.peer_labs DROP CONSTRAINT IF EXISTS peer_labs_status_check;
ALTER TABLE public.peer_labs
  ADD CONSTRAINT peer_labs_status_check
  CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'archived'));

CREATE INDEX IF NOT EXISTS idx_peer_labs_chapter ON public.peer_labs (chapter_id);
CREATE INDEX IF NOT EXISTS idx_peer_labs_status  ON public.peer_labs (status);

DROP TRIGGER IF EXISTS trg_peer_labs_updated ON public.peer_labs;
CREATE TRIGGER trg_peer_labs_updated
  BEFORE UPDATE ON public.peer_labs
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE TABLE IF NOT EXISTS public.peer_lab_phases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peer_lab_id UUID NOT NULL REFERENCES public.peer_labs(id) ON DELETE CASCADE,
  sort_order  INT NOT NULL DEFAULT 0,
  slug        TEXT,
  title       TEXT NOT NULL,
  date_label  TEXT,
  time_label  TEXT,
  location    TEXT,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_peer_lab_phases_lab ON public.peer_lab_phases (peer_lab_id, sort_order);

CREATE TABLE IF NOT EXISTS public.peer_lab_facilitators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peer_lab_id UUID NOT NULL REFERENCES public.peer_labs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Facilitator',
  sort_order  INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_peer_lab_facilitators_lab ON public.peer_lab_facilitators (peer_lab_id, sort_order);

CREATE TABLE IF NOT EXISTS public.peer_lab_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peer_lab_id UUID NOT NULL REFERENCES public.peer_labs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  college     TEXT,
  answers     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_peer_lab_enroll_user
  ON public.peer_lab_enrollments (peer_lab_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_peer_lab_enroll_email
  ON public.peer_lab_enrollments (peer_lab_id, lower(email)) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS trg_peer_lab_enroll_updated ON public.peer_lab_enrollments;
CREATE TRIGGER trg_peer_lab_enroll_updated
  BEFORE UPDATE ON public.peer_lab_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

-- peer_labs.enrolled_count is now derived, never typed in by hand
CREATE OR REPLACE FUNCTION public.recount_peer_lab(p_lab UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.peer_labs
     SET enrolled_count = (
       SELECT count(*) FROM public.peer_lab_enrollments e
        WHERE e.peer_lab_id = p_lab AND e.status IN ('pending', 'approved', 'completed')
     )
   WHERE id = p_lab;
$$;

CREATE OR REPLACE FUNCTION public.peer_lab_enrollment_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recount_peer_lab(OLD.peer_lab_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recount_peer_lab(NEW.peer_lab_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_peer_lab_enrollment_count ON public.peer_lab_enrollments;
CREATE TRIGGER trg_peer_lab_enrollment_count
  AFTER INSERT OR UPDATE OR DELETE ON public.peer_lab_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.peer_lab_enrollment_changed();

-- RLS: public can read published labs; every write goes through the API (service role)
ALTER TABLE public.peer_labs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_lab_phases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_lab_facilitators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_lab_enrollments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Peer Labs" ON public.peer_labs;
DROP POLICY IF EXISTS "Manage Peer Labs"      ON public.peer_labs;
DROP POLICY IF EXISTS "peer_labs_public_read" ON public.peer_labs;
CREATE POLICY "peer_labs_public_read" ON public.peer_labs
  FOR SELECT TO anon, authenticated
  USING (status IN ('upcoming', 'active', 'completed'));

DROP POLICY IF EXISTS "peer_lab_phases_public_read" ON public.peer_lab_phases;
CREATE POLICY "peer_lab_phases_public_read" ON public.peer_lab_phases
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.peer_labs l
     WHERE l.id = peer_lab_id AND l.status IN ('upcoming', 'active', 'completed')
  ));

DROP POLICY IF EXISTS "peer_lab_facilitators_public_read" ON public.peer_lab_facilitators;
CREATE POLICY "peer_lab_facilitators_public_read" ON public.peer_lab_facilitators
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.peer_labs l
     WHERE l.id = peer_lab_id AND l.status IN ('upcoming', 'active', 'completed')
  ));

DROP POLICY IF EXISTS "peer_lab_enrollments_own_read" ON public.peer_lab_enrollments;
CREATE POLICY "peer_lab_enrollments_own_read" ON public.peer_lab_enrollments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- 4. users <-> profiles drift (users had 25 rows vs 21 profiles)
--    The insert/update sync exists; deletes were never mirrored.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.remove_deleted_profile_from_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    DELETE FROM public.users WHERE id = OLD.id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_delete_users ON public.profiles;
CREATE TRIGGER trg_profiles_delete_users
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.remove_deleted_profile_from_users();

NOTIFY pgrst, 'reload schema';
