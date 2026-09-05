-- Migration 007: Add settings JSONB column to organizations for event categories and future org-level config
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Seed default event categories into the existing org row
UPDATE public.organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{event_categories}',
  '["WORKSHOP","HACKATHON","MEETUP","LECTURE","LAB","SHOWCASE","CHALLENGE"]'::jsonb
)
WHERE settings IS NULL OR NOT (settings ? 'event_categories');
