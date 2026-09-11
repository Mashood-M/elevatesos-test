-- Migration 018: Add updated_at column to profiles and chapters, ensure status index and system UI states
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE IF EXISTS public.chapters
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON public.chapters(status);

-- Ensure system_ui_states exists and has correct columns for button states
CREATE TABLE IF NOT EXISTS public.system_ui_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    section TEXT NOT NULL,
    component_id TEXT,
    state_type TEXT NOT NULL DEFAULT 'button',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    label TEXT,
    icon TEXT,
    tone TEXT DEFAULT 'default',
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    scope TEXT DEFAULT 'global',
    scope_id TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_ui_states_key ON public.system_ui_states(key);
CREATE INDEX IF NOT EXISTS idx_system_ui_states_section ON public.system_ui_states(section);
