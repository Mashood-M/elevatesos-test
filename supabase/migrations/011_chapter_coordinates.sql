-- Migration 011: Chapter location coordinates, map support & custom_settings
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS custom_settings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coordinates TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS map_url TEXT;

COMMENT ON COLUMN public.chapters.coordinates IS 'Formatted latitude and longitude string e.g. 11.321600, 75.933600';
COMMENT ON COLUMN public.chapters.location IS 'Campus area or landmark location name';
COMMENT ON COLUMN public.chapters.map_url IS 'External map link (Google Maps or OpenStreetMap)';
COMMENT ON COLUMN public.chapters.custom_settings IS 'JSON settings and metadata fallback';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

