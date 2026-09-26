-- ============================================================================
-- Migration: 052_seed_test_chapter_if_missing.sql
-- Description: Ensures the dedicated Sandbox Test Chapter ('f59244b8-b5c9-4906-8ae8-9d1ee819ec75')
-- exists in public.chapters so role assignments and mutations never violate foreign key constraints.
-- ============================================================================

DO $$
BEGIN
  -- If a chapter with slug 'test-chapter' already exists with a different ID, synchronize its ID
  IF EXISTS (SELECT 1 FROM public.chapters WHERE slug = 'test-chapter' AND id <> 'f59244b8-b5c9-4906-8ae8-9d1ee819ec75'::uuid) THEN
    IF NOT EXISTS (SELECT 1 FROM public.chapters WHERE id = 'f59244b8-b5c9-4906-8ae8-9d1ee819ec75'::uuid) THEN
      UPDATE public.chapters
      SET id = 'f59244b8-b5c9-4906-8ae8-9d1ee819ec75'::uuid
      WHERE slug = 'test-chapter';
    END IF;
  END IF;

  -- If neither the ID nor the slug exists, insert the test chapter
  IF NOT EXISTS (SELECT 1 FROM public.chapters WHERE id = 'f59244b8-b5c9-4906-8ae8-9d1ee819ec75'::uuid OR slug = 'test-chapter') THEN
    INSERT INTO public.chapters (
      id,
      elevates_id,
      organization_id,
      name,
      slug,
      college,
      city,
      status,
      published,
      health_score,
      member_count,
      event_count,
      project_count,
      founded_at,
      notes
    ) VALUES (
      'f59244b8-b5c9-4906-8ae8-9d1ee819ec75'::uuid,
      'CHP-TEST01',
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Elevates Test Chapter',
      'test-chapter',
      'Elevates Sandbox Institute of Technology',
      'HQ Sandbox Campus',
      'active',
      true,
      98,
      32,
      8,
      6,
      '2026-01-01T00:00:00.000Z',
      'Pinned test sandbox chapter for testing all chapter-wise features, roles, attendance, and forms in isolation.'
    );
  END IF;
END $$;
