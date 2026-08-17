-- Seed public surface content aligned with Elevates-web static data (EKC chapter + sample peer lab)
-- Apply after 003_demo_seed.sql + 004_public_surface.sql
-- Uses fixed UUIDs for idempotent upserts.

-- Ensure org exists (from 003) — mark EKC chapter published
update chapters
set
  published = true,
  district = coalesce(district, 'Malappuram'),
  logo_url = coalesce(logo_url, null),
  member_count = greatest(member_count, 120),
  event_count = greatest(event_count, 8),
  project_count = greatest(project_count, 3)
where slug = 'ekc';

-- Peer labs (web marketing content)
insert into peer_labs (id, slug, title, track, description, syllabus, status, applications_open, enrolled_count)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'operation-java',
    'Operation Java',
    'Software',
    'Multi-week hands-on Java fundamentals for campus builders.',
    '[{"week":1,"title":"JVM & Syntax"},{"week":2,"title":"OOP Lab"},{"week":3,"title":"Mini Project"}]'::jsonb,
    'active',
    true,
    28
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'cybersec-defense',
    'Cybersec Defense',
    'Security',
    'Defensive security labs — CTF warmups and secure coding.',
    '[{"week":1,"title":"Threat Model"},{"week":2,"title":"Web Basics"},{"week":3,"title":"CTF Night"}]'::jsonb,
    'active',
    true,
    22
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'spark-electronics',
    'Spark Electronics',
    'Hardware',
    'Intro electronics and embedded tinkering for campus makers.',
    '[{"week":1,"title":"Circuits"},{"week":2,"title":"Arduino"},{"week":3,"title":"Demo Day"}]'::jsonb,
    'upcoming',
    false,
    12
  )
on conflict (slug) do update set
  title = excluded.title,
  track = excluded.track,
  description = excluded.description,
  syllabus = excluded.syllabus,
  status = excluded.status,
  applications_open = excluded.applications_open,
  enrolled_count = excluded.enrolled_count;
