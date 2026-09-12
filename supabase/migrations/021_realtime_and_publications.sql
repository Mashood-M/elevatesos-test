-- ============================================================================
-- Migration: 021_realtime_and_publications.sql
-- Description: Enables PostgreSQL replica identity and adds all core application
--              tables to the supabase_realtime publication for real-time reactivity.
-- ============================================================================

DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'profiles',
    'user_roles',
    'roles',
    'permissions',
    'role_permissions',
    'event_registrations',
    'attendance',
    'attendance_records',
    'events',
    'tasks',
    'reports',
    'announcements',
    'notifications',
    'chapters',
    'departments',
    'class_cohorts',
    'forms',
    'form_responses',
    'certificates',
    'clusters',
    'projects',
    'leadership_terms',
    'leadership_assignments',
    'leadership_applications',
    'event_permissions',
    'chapter_standard_checks',
    'organizations',
    'guidelines',
    'resources',
    'activity_logs',
    'system_ui_states'
  ];
BEGIN
  -- 1. Set REPLICA IDENTITY FULL where table exists so old values are captured in delete/update events
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS public.%I REPLICA IDENTITY FULL;', tbl);
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;

  -- 2. Add tables to supabase_realtime publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tbls LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      EXCEPTION
        WHEN duplicate_object THEN
          -- already in publication
          NULL;
        WHEN undefined_table THEN
          -- table does not exist in this environment
          NULL;
        WHEN OTHERS THEN
          NULL;
      END;
    END LOOP;
  END IF;
END $$;
