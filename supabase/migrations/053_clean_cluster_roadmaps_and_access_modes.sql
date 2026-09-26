-- ============================================================================
-- Migration: 053_clean_cluster_roadmaps_and_access_modes.sql
-- Description: Clean up existing cluster data in Supabase:
-- 1. Clears existing legacy roadmap weeks (sets roadmap to empty array '[]'::jsonb).
-- 2. Migrates any legacy 'challenge' access_mode to 'invite'.
-- 3. Sets standard column defaults on public.clusters.
-- ============================================================================

DO $$
BEGIN
  -- 1. Clear existing roadmaps/weeks from all existing clusters in Supabase
  UPDATE public.clusters
  SET roadmap = '[]'::jsonb
  WHERE roadmap IS NOT NULL AND roadmap <> '[]'::jsonb;

  -- 2. Update legacy 'challenge' access mode to 'invite'
  UPDATE public.clusters
  SET access_mode = 'invite'
  WHERE access_mode = 'challenge' OR access_mode IS NULL;

  -- 3. Ensure defaults on public.clusters
  ALTER TABLE public.clusters 
    ALTER COLUMN roadmap SET DEFAULT '[]'::jsonb,
    ALTER COLUMN access_mode SET DEFAULT 'invite';

END $$;
