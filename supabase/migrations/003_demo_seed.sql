-- Seed org structure for Elevates OS (no auth.users dependency).
-- Profiles / user_roles require Auth users — create those in the dashboard, then link.

insert into organizations (id, name, slug, tagline)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Elevates',
  'elevates',
  'Learn. Build. Grow. Ship. Repeat.'
)
on conflict (slug) do nothing;

insert into chapters (id, organization_id, name, slug, college, city, status, health_score, founded_at)
values
  (
    'a0000000-0000-4000-8000-000000000101',
    'a0000000-0000-4000-8000-000000000001',
    'EKC Chapter',
    'ekc',
    'Eranad Knowledge City',
    'Manjeri',
    'active',
    94,
    '2023-01-15'
  ),
  (
    'a0000000-0000-4000-8000-000000000102',
    'a0000000-0000-4000-8000-000000000001',
    'MES Chapter',
    'mes',
    'MES College of Engineering',
    'Kuttippuram',
    'active',
    87,
    '2023-08-01'
  ),
  (
    'a0000000-0000-4000-8000-000000000103',
    'a0000000-0000-4000-8000-000000000001',
    'CUSAT Chapter',
    'cusat',
    'Cochin University of Science and Technology',
    'Kochi',
    'onboarding',
    72,
    '2025-11-01'
  )
on conflict (organization_id, slug) do nothing;

insert into roles (id, key, name, scope, description) values
  ('b0000000-0000-4000-8000-000000000001', 'founder', 'Founder', 'hq', 'Full HQ authority'),
  ('b0000000-0000-4000-8000-000000000002', 'hq_admin', 'HQ Admin', 'hq', 'Organization operations'),
  ('b0000000-0000-4000-8000-000000000003', 'hq_mentor', 'HQ Mentor', 'hq', 'Cross-chapter mentorship'),
  ('b0000000-0000-4000-8000-000000000004', 'faculty_coordinator', 'Faculty Coordinator', 'chapter', 'Faculty oversight'),
  ('b0000000-0000-4000-8000-000000000005', 'chairman', 'Chairman', 'chapter', 'Chapter executive lead'),
  ('b0000000-0000-4000-8000-000000000006', 'secretary', 'Secretary', 'chapter', 'Events & operations'),
  ('b0000000-0000-4000-8000-000000000007', 'class_representative', 'Class Representative', 'chapter', 'Registrations & attendance'),
  ('b0000000-0000-4000-8000-000000000008', 'student', 'Student', 'chapter', 'Member')
on conflict (key) do nothing;

insert into permissions (id, key, name, description) values
  ('c0000000-0000-4000-8000-000000000001', 'chapter.create', 'Create Chapter', 'Spin up chapters'),
  ('c0000000-0000-4000-8000-000000000002', 'event.create', 'Create Event', 'Draft events'),
  ('c0000000-0000-4000-8000-000000000003', 'event.approve', 'Approve Event', 'Faculty/HQ approve'),
  ('c0000000-0000-4000-8000-000000000004', 'report.submit', 'Submit Reports', 'Chapter reports'),
  ('c0000000-0000-4000-8000-000000000005', 'report.approve', 'Approve Reports', 'HQ review'),
  ('c0000000-0000-4000-8000-000000000006', 'announcement.publish', 'Publish Announcements', 'Broadcast'),
  ('c0000000-0000-4000-8000-000000000007', 'attendance.verify', 'Verify Attendance', 'Check-in'),
  ('c0000000-0000-4000-8000-000000000008', 'analytics.view', 'View Analytics', 'Dashboards')
on conflict (key) do nothing;
