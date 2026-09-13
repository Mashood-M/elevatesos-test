-- ============================================================================
-- Migration: 025_event_reminders_and_schedules.sql
-- Description: Creates the event_reminders table for scheduled reminders,
--              enables RLS policies, performance indexes, and persists reminders
--              directly in Supabase.
-- ============================================================================

-- 1. Ensure public.event_reminders table exists
CREATE TABLE IF NOT EXISTS public.event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT '24h_before',
    scheduled_for TIMESTAMPTZ NOT NULL,
    channel TEXT NOT NULL DEFAULT 'all',
    status TEXT NOT NULL DEFAULT 'scheduled',
    sent_at TIMESTAMPTZ,
    recipient_count INT DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely ensure columns exist if created previously
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE;
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Event Reminder';
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT '24h_before';
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'all';
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS recipient_count INT DEFAULT 0;
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Also ensure public.events has a reminders column cache
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminders JSONB DEFAULT '[]'::jsonb;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON public.event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_chapter_id ON public.event_reminders(chapter_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_status ON public.event_reminders(status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_scheduled_for ON public.event_reminders(scheduled_for);

-- 3. Row Level Security (RLS) & Policies
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Event Reminders" ON public.event_reminders;
CREATE POLICY "Public Read Event Reminders" ON public.event_reminders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Event Reminders" ON public.event_reminders;
CREATE POLICY "Manage Event Reminders" ON public.event_reminders FOR ALL USING (auth.uid() IS NOT NULL);
