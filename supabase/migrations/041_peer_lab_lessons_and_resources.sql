-- ============================================================================
-- Migration 041: Peer Lab Multi-Day Lessons, Posters, and Gated Resources
--
-- Safe to re-run (fully idempotent).
--   1. events: lessons (JSONB), resources (JSONB), poster_url, thumbnail_url
--   2. peer_labs: poster_url, thumbnail_url
--   3. peer_lab_phases: link_url, icon_color, icon_shape
-- ============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS lessons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE public.peer_labs
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE public.peer_lab_phases
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT 'magenta',
  ADD COLUMN IF NOT EXISTS icon_shape TEXT DEFAULT 'clover';

NOTIFY pgrst, 'reload schema';
