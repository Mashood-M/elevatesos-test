-- ============================================================================
-- Migration: 024_forms_and_event_forms_complete.sql
-- Description: Ensures full persistence for forms, event registration forms,
--              form responses, event registrations, and RLS policies in Supabase.
-- ============================================================================

-- 1. Ensure public.forms table exists with all required columns
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL DEFAULT 'registration',
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    questions JSONB DEFAULT '[]'::jsonb,
    schema JSONB DEFAULT '[]'::jsonb,
    logic_enabled BOOLEAN DEFAULT false,
    logic_rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely ensure all columns exist if the table was previously created with fewer columns
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'registration';
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Form';
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS schema JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS logic_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS logic_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Ensure public.form_responses table exists
CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Ensure public.event_registrations table exists
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    guest_email TEXT,
    guest_name TEXT,
    status TEXT DEFAULT 'pending',
    representative_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    answers JSONB DEFAULT '{}'::jsonb,
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 4. Helper table for individual form fields if used by external integrations
CREATE TABLE IF NOT EXISTS public.event_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'short_text',
    required BOOLEAN NOT NULL DEFAULT false,
    options JSONB DEFAULT '[]'::jsonb,
    placeholder TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_forms_event_id ON public.forms(event_id);
CREATE INDEX IF NOT EXISTS idx_forms_chapter_id ON public.forms(chapter_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_event_id ON public.form_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_form_fields_event_id ON public.event_form_fields(event_id);

-- 6. Row Level Security (RLS) & Access Policies
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_fields ENABLE ROW LEVEL SECURITY;

-- Forms RLS
DROP POLICY IF EXISTS "Public Read Forms" ON public.forms;
CREATE POLICY "Public Read Forms" ON public.forms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Forms" ON public.forms;
CREATE POLICY "Manage Forms" ON public.forms FOR ALL USING (auth.uid() IS NOT NULL);

-- Form Responses RLS
DROP POLICY IF EXISTS "Public Submit Form Responses" ON public.form_responses;
CREATE POLICY "Public Submit Form Responses" ON public.form_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Form Responses Access" ON public.form_responses;
CREATE POLICY "Form Responses Access" ON public.form_responses FOR ALL USING (auth.uid() IS NOT NULL);

-- Event Registrations RLS
DROP POLICY IF EXISTS "Public Register Events" ON public.event_registrations;
CREATE POLICY "Public Register Events" ON public.event_registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "View Registrations" ON public.event_registrations;
CREATE POLICY "View Registrations" ON public.event_registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Registrations" ON public.event_registrations;
CREATE POLICY "Manage Registrations" ON public.event_registrations FOR ALL USING (auth.uid() IS NOT NULL);

-- Event Form Fields RLS
DROP POLICY IF EXISTS "Public Read Event Form Fields" ON public.event_form_fields;
CREATE POLICY "Public Read Event Form Fields" ON public.event_form_fields FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Event Form Fields" ON public.event_form_fields;
CREATE POLICY "Manage Event Form Fields" ON public.event_form_fields FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Ensure all existing forms for published / registration_open events are set to 'open'
UPDATE public.forms
SET status = 'open'
WHERE event_id IN (
    SELECT id FROM public.events WHERE status = 'registration_open'
) AND status = 'draft';

