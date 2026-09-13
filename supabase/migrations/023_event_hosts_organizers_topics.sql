-- ============================================================================
-- Migration: 023_event_hosts_organizers_topics.sql
-- Description: Adds missing columns for organizers, hosts, and topics in events table.
-- ============================================================================

-- 1. Ensure topics column exists as TEXT[]
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';

-- 2. Add hosts column as JSONB to store speaker/host details [{ "name": "...", "role": "..." }]
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS hosts JSONB DEFAULT '[]'::jsonb;

-- 3. Add organizers column as JSONB to store organizing entities/clubs [{ "name": "..." }]
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS organizers JSONB DEFAULT '[]'::jsonb;

-- 4. Ensure platform, case_study, and attendance_sessions columns exist as JSONB
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS platform JSONB;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS case_study JSONB;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS attendance_sessions JSONB;

-- Refresh schema cache if needed
COMMENT ON COLUMN public.events.hosts IS 'List of speakers/hosts [{name: string, role: string}]';
COMMENT ON COLUMN public.events.organizers IS 'List of co-organizing clubs/entities [{name: string}]';
COMMENT ON COLUMN public.events.topics IS 'Array of topic/tag labels';
