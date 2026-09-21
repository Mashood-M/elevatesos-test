-- ============================================================================
-- scripts/sql/check_migrations_1_to_38.sql
-- ElevatesOS: Database Schema Integrity Verification (Migrations 001-038)
-- ============================================================================
-- Run this script in the Supabase SQL Editor to verify that all tables and
-- columns expected from migrations 001 through 038 exist in the database.
--
-- HEALTHY STATUS: 0 rows returned (empty result = healthy).
-- If any rows are returned, run scripts/sql/repair_missing_009_010_033.sql
-- or apply the missing migration.
-- ============================================================================

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'organizations',
    'chapters',
    'profiles',
    'roles',
    'user_roles',
    'clusters',
    'cluster_members',
    'projects',
    'project_members',
    'events',
    'event_registrations',
    'attendance_records',
    'certificates',
    'forms',
    'form_responses',
    'tasks',
    'reports',
    'announcements',
    'guidelines',
    'resources',
    'activity_logs',
    'notifications',
    'invite_tokens',
    'chapter_standard_checks',
    'outbound_messages',
    'system_ui_states',
    'discord_integrations',
    'discord_sync_queue',
    'website_sections',
    'leadership_applications',
    'departments',
    'class_cohorts',
    'event_form_fields',
    'event_reminders',
    'leadership_terms',
    'leadership_assignments',
    'volunteer_groups',
    'volunteer_group_members',
    'volunteer_assignments',
    'guild_config',
    'users',
    'discord_links',
    'discord_events_log',
    'discord_warnings',
    'discord_verifications',
    'email_verification_codes',
    'discord_bot_sync_queue',
    'discord_bot_events'
  ]) AS table_name
),
missing_tables AS (
  SELECT 
    'MISSING TABLE' AS issue_type,
    et.table_name,
    NULL::TEXT AS column_name,
    'Table expected from migrations 001-038 is missing' AS details
  FROM expected_tables et
  LEFT JOIN information_schema.tables t 
    ON t.table_schema = 'public' AND t.table_name = et.table_name
  WHERE t.table_name IS NULL
),
expected_columns AS (
  SELECT * FROM (VALUES
    -- 001 / 004 / 005 / 009 / 010 / 033 / 037 profiles
    ('profiles', 'elevates_id'),
    ('profiles', 'discord_user_id'),
    ('profiles', 'discord_username'),
    ('profiles', 'discord_connected'),
    ('profiles', 'discord_connected_at'),
    ('profiles', 'academic_year'),
    ('profiles', 'role'),
    ('profiles', 'designation'),
    ('profiles', 'resume_url'),
    ('profiles', 'email_verified'),
    ('profiles', 'email_confirmed_at'),

    -- 001 / 005 / 009 / 011 chapters
    ('chapters', 'elevates_id'),
    ('chapters', 'applications_open'),
    ('chapters', 'discord_channel_id'),
    ('chapters', 'discord_role_id'),
    ('chapters', 'website_featured'),
    ('chapters', 'allow_student_invite_codes'),
    ('chapters', 'custom_settings'),
    ('chapters', 'coordinates'),
    ('chapters', 'latitude'),
    ('chapters', 'longitude'),
    ('chapters', 'location'),
    ('chapters', 'map_url'),
    ('chapters', 'district'),
    ('chapters', 'state'),

    -- 001 / 009 / 017 / 020 / 023 / 025 / 026 / 027 events
    ('events', 'is_registration_open'),
    ('events', 'is_checkin_active'),
    ('events', 'discord_sync_status'),
    ('events', 'discord_event_id'),
    ('events', 'discord_message_id'),
    ('events', 'website_featured'),
    ('events', 'managing_student_ids'),
    ('events', 'media_student_ids'),
    ('events', 'waitlist_capacity'),
    ('events', 'check_in_secret'),
    ('events', 'attendance_window_minutes'),
    ('events', 'hosts'),
    ('events', 'organizers'),
    ('events', 'topics'),
    ('events', 'reminders'),
    ('events', 'directory_category'),
    ('events', 'speakers'),

    -- 001 / 009 / 017 event_registrations
    ('event_registrations', 'discord_notified'),
    ('event_registrations', 'checked_in'),
    ('event_registrations', 'checkin_timestamp'),
    ('event_registrations', 'approved_by'),
    ('event_registrations', 'reviewed_by'),

    -- 001 / 009 / 024 forms
    ('forms', 'accepting_responses'),
    ('forms', 'is_published'),
    ('forms', 'discord_webhook_url'),
    ('forms', 'purpose'),
    ('forms', 'questions'),
    ('forms', 'logic_enabled'),
    ('forms', 'logic_rules'),

    -- 001 / 024 form_responses
    ('form_responses', 'event_id'),

    -- 001 / 027 attendance_records
    ('attendance_records', 'session_id'),
    ('attendance_records', 'session_name'),

    -- 001 / 010 certificates
    ('certificates', 'is_revoked'),
    ('certificates', 'achievement'),
    ('certificates', 'pdf_url'),
    ('certificates', 'download_count'),

    -- 001 / 010 tasks
    ('tasks', 'category'),
    ('tasks', 'event_id'),
    ('tasks', 'due_date'),

    -- 001 / 009 / 010 projects
    ('projects', 'discord_thread_id'),
    ('projects', 'vote_count'),
    ('projects', 'team_ids'),
    ('projects', 'mentor_id'),
    ('projects', 'awards'),
    ('projects', 'stage'),

    -- 001 / 009 / 027 user_roles
    ('user_roles', 'role_id'),
    ('user_roles', 'role_key'),
    ('user_roles', 'chapter_id'),
    ('user_roles', 'organization_id'),
    ('user_roles', 'is_permanent'),
    ('user_roles', 'valid_from'),
    ('user_roles', 'valid_to'),
    ('user_roles', 'discord_synced'),
    ('user_roles', 'leadership_term_id'),

    -- 001 / 009 activity_logs
    ('activity_logs', 'severity'),
    ('activity_logs', 'chapter_id'),
    ('activity_logs', 'discord_synced'),
    ('activity_logs', 'ip_address'),
    ('activity_logs', 'user_agent'),

    -- 006 / 010 invite_tokens
    ('invite_tokens', 'invite_type'),
    ('invite_tokens', 'role_key'),
    ('invite_tokens', 'uses_count'),
    ('invite_tokens', 'max_uses'),

    -- 016 class_cohorts
    ('class_cohorts', 'rep_ids'),

    -- 027 leadership_terms
    ('leadership_terms', 'academic_year'),
    ('leadership_terms', 'handover_notes'),

    -- 029 volunteer_groups
    ('volunteer_groups', 'powers'),
    ('volunteer_groups', 'member_ids'),

    -- 033 discord_links
    ('discord_links', 'os_user_id'),
    ('discord_links', 'guild_id'),
    ('discord_links', 'status'),

    -- 037 email_verification_codes
    ('email_verification_codes', 'code'),
    ('email_verification_codes', 'status'),
    ('email_verification_codes', 'expires_at'),

    -- 038 discord_verifications
    ('discord_verifications', 'os_user_id'),
    ('discord_verifications', 'chapter_id')
  ) AS ec(table_name, column_name)
),
missing_columns AS (
  SELECT 
    'MISSING COLUMN' AS issue_type,
    ec.table_name,
    ec.column_name,
    'Column expected from migrations 001-038 is missing on existing table' AS details
  FROM expected_columns ec
  JOIN information_schema.tables t 
    ON t.table_schema = 'public' AND t.table_name = ec.table_name
  LEFT JOIN information_schema.columns c 
    ON c.table_schema = 'public' AND c.table_name = ec.table_name AND c.column_name = ec.column_name
  WHERE c.column_name IS NULL
)
SELECT * FROM missing_tables
UNION ALL
SELECT * FROM missing_columns
ORDER BY issue_type, table_name, column_name;
