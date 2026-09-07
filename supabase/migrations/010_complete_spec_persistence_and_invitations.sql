-- ============================================================================
-- Migration 010: Complete Spec Persistence, Invitations, & Domain Operations
-- ============================================================================
-- Run this migration in Supabase SQL Editor to support all custom invite flows,
-- leadership applications, projects, tasks, certificates, and user profiles.

-- 1. ENHANCE INVITE TOKENS (Institutional Chapter Codes, Personal Referrals, Role Invites)
ALTER TABLE public.invite_tokens
    ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS role_key TEXT,
    ADD COLUMN IF NOT EXISTS uses_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_invite_tokens_type ON public.invite_tokens(invite_type);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_code ON public.invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_chapter ON public.invite_tokens(chapter_id);

-- 2. LEADERSHIP APPLICATIONS (Domain 1, Section 3)
CREATE TABLE IF NOT EXISTS public.leadership_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.leadership_terms(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'applied',
    statement TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadership_apps_term ON public.leadership_applications(term_id);
CREATE INDEX IF NOT EXISTS idx_leadership_apps_chapter ON public.leadership_applications(chapter_id);
CREATE INDEX IF NOT EXISTS idx_leadership_apps_user ON public.leadership_applications(user_id);

ALTER TABLE public.leadership_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all for authenticated on leadership_applications" ON public.leadership_applications;
    DROP POLICY IF EXISTS "Allow all for service_role on leadership_applications" ON public.leadership_applications;
    DROP POLICY IF EXISTS "Allow public read on leadership_applications" ON public.leadership_applications;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Allow public read on leadership_applications"
    ON public.leadership_applications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all for authenticated on leadership_applications"
    ON public.leadership_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service_role on leadership_applications"
    ON public.leadership_applications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. PROJECTS ENHANCEMENTS (Domain 4, Section 13)
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS team_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS awards TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'idea';

CREATE INDEX IF NOT EXISTS idx_projects_chapter ON public.projects(chapter_id);
CREATE INDEX IF NOT EXISTS idx_projects_cluster ON public.projects(cluster_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage);

-- 4. CERTIFICATES ENHANCEMENTS (Domain 3, Section 11)
ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS achievement TEXT DEFAULT 'Participation',
    ADD COLUMN IF NOT EXISTS pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON public.certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);

-- 5. TASKS ENHANCEMENTS (Domain 5, Section 15)
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'documentation',
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_tasks_chapter ON public.tasks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- 6. PROFILES RESUME & TALENT DISCOVERY (Domain 2, Section 5)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 7. AUDIT TRIGGER FOR LEADERSHIP APPLICATIONS
CREATE OR REPLACE FUNCTION public.audit_leadership_application_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            'leadership_application_submitted',
            'leadership_application',
            NEW.id::text,
            jsonb_build_object('term_id', NEW.term_id, 'role_key', NEW.role_key, 'title', NEW.title, 'chapter_id', NEW.chapter_id),
            now()
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            'leadership_application_' || NEW.status,
            'leadership_application',
            NEW.id::text,
            jsonb_build_object('term_id', NEW.term_id, 'role_key', NEW.role_key, 'old_status', OLD.status, 'new_status', NEW.status),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_leadership_application ON public.leadership_applications;
CREATE TRIGGER trg_audit_leadership_application
    AFTER INSERT OR UPDATE ON public.leadership_applications
    FOR EACH ROW EXECUTE FUNCTION public.audit_leadership_application_change();

-- 8. AUDIT TRIGGER FOR PROJECTS
CREATE OR REPLACE FUNCTION public.audit_project_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NULL,
            'project_created',
            'project',
            NEW.id::text,
            jsonb_build_object('title', NEW.title, 'stage', NEW.stage, 'chapter_id', NEW.chapter_id),
            now()
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NULL,
            'project_stage_changed',
            'project',
            NEW.id::text,
            jsonb_build_object('title', NEW.title, 'old_stage', OLD.stage, 'new_stage', NEW.stage),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_project ON public.projects;
CREATE TRIGGER trg_audit_project
    AFTER INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.audit_project_change();

-- 9. AUDIT TRIGGER FOR CERTIFICATES
CREATE OR REPLACE FUNCTION public.audit_certificate_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            'certificate_issued',
            'certificate',
            NEW.certificate_id,
            jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.user_id, 'achievement', NEW.achievement),
            now()
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.is_revoked IS DISTINCT FROM NEW.is_revoked) THEN
        INSERT INTO public.activity_logs (id, actor_id, action, entity, entity_id, meta, created_at)
        VALUES (
            gen_random_uuid(),
            NEW.user_id,
            CASE WHEN NEW.is_revoked THEN 'certificate_revoked' ELSE 'certificate_restored' END,
            'certificate',
            NEW.certificate_id,
            jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.user_id),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_certificate ON public.certificates;
CREATE TRIGGER trg_audit_certificate
    AFTER INSERT OR UPDATE ON public.certificates
    FOR EACH ROW EXECUTE FUNCTION public.audit_certificate_change();

-- 10. CHAPTER STANDARD CHECKS ENHANCEMENTS
ALTER TABLE public.chapter_standard_checks
    ADD COLUMN IF NOT EXISTS standard_id TEXT,
    ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS note TEXT;


