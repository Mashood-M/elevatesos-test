-- Elevates OS core schema (multi-tenant HQ → Chapters)
create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text,
  created_at timestamptz not null default now()
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  college text not null,
  city text,
  status text not null default 'active' check (status in ('active','inactive','onboarding')),
  health_score numeric(5,2) not null default 0,
  founded_at date,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  avatar_url text,
  department text,
  year text,
  chapter_id uuid references chapters(id) on delete set null,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  portfolio_url text,
  resume_url text,
  github_url text,
  linkedin_url text,
  points integer not null default 0,
  badges text[] not null default '{}',
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  scope text not null check (scope in ('hq','chapter','cluster')),
  description text
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  allowed boolean not null default false,
  primary key (role_id, permission_id)
);

create table if not exists leadership_terms (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  academic_year text not null,
  title text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('upcoming','active','archived')),
  handover_notes text
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  leadership_term_id uuid references leadership_terms(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists leadership_assignments (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references leadership_terms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role_key text not null,
  title text not null
);

create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  leader_id uuid references profiles(id),
  faculty_id uuid references profiles(id),
  unique (chapter_id, slug)
);

create table if not exists cluster_members (
  cluster_id uuid not null references clusters(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (cluster_id, user_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  cluster_id uuid references clusters(id),
  title text not null,
  description text,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  faculty_id uuid references profiles(id),
  organizer_id uuid not null references profiles(id),
  capacity integer not null default 40,
  waitlist_capacity integer not null default 0,
  visibility text not null check (visibility in ('chapter_only','specific_chapters','all_chapters','public')),
  registration_start timestamptz,
  registration_end timestamptz,
  status text not null,
  certificate_enabled boolean not null default true,
  ticket_no text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists event_form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0
);

create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null,
  answers jsonb not null default '{}'::jsonb,
  qr_code text not null,
  reviewed_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  registration_id uuid not null references event_registrations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null,
  method text not null,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid not null references profiles(id)
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique,
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  issued_at timestamptz not null default now(),
  verification_qr text not null,
  digital_signature text not null
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  cluster_id uuid references clusters(id),
  title text not null,
  description text,
  stage text not null,
  mentor_id uuid references profiles(id),
  repository_url text,
  progress integer not null default 0,
  demo_url text,
  awards text[] not null default '{}'
);

create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  url text not null
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  title text not null,
  category text not null,
  assignee_id uuid not null references profiles(id),
  status text not null,
  due_date date
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  type text not null,
  title text not null,
  status text not null,
  submitted_by uuid not null references profiles(id),
  submitted_at timestamptz,
  hq_comment text,
  approved_by uuid references profiles(id)
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  chapter_id uuid references chapters(id) on delete cascade,
  cluster_id uuid references clusters(id) on delete cascade,
  title text not null,
  body text not null,
  author_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  href text,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  meta text,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;
alter table chapters enable row level security;
alter table profiles enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table leadership_terms enable row level security;
alter table leadership_assignments enable row level security;
alter table clusters enable row level security;
alter table cluster_members enable row level security;
alter table events enable row level security;
alter table event_form_fields enable row level security;
alter table event_registrations enable row level security;
alter table attendance enable row level security;
alter table certificates enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table resources enable row level security;
alter table tasks enable row level security;
alter table reports enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

-- Authenticated read policies (tighten per-role in later migrations)
drop policy if exists "authenticated read organizations" on organizations;
create policy "authenticated read organizations" on organizations for select to authenticated using (true);
drop policy if exists "authenticated read chapters" on chapters;
create policy "authenticated read chapters" on chapters for select to authenticated using (true);
drop policy if exists "authenticated read profiles" on profiles;
create policy "authenticated read profiles" on profiles for select to authenticated using (true);
drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles for update to authenticated using (auth.uid() = id);
drop policy if exists "authenticated read roles" on roles;
create policy "authenticated read roles" on roles for select to authenticated using (true);
drop policy if exists "authenticated read permissions" on permissions;
create policy "authenticated read permissions" on permissions for select to authenticated using (true);
drop policy if exists "authenticated read role_permissions" on role_permissions;
create policy "authenticated read role_permissions" on role_permissions for select to authenticated using (true);
drop policy if exists "authenticated read user_roles" on user_roles;
create policy "authenticated read user_roles" on user_roles for select to authenticated using (true);
drop policy if exists "authenticated read events" on events;
create policy "authenticated read events" on events for select to authenticated using (true);
drop policy if exists "authenticated read registrations" on event_registrations;
create policy "authenticated read registrations" on event_registrations for select to authenticated using (true);
drop policy if exists "authenticated read attendance" on attendance;
create policy "authenticated read attendance" on attendance for select to authenticated using (true);
drop policy if exists "authenticated read certificates" on certificates;
create policy "authenticated read certificates" on certificates for select to authenticated using (true);
drop policy if exists "public verify certificates" on certificates;
create policy "public verify certificates" on certificates for select to anon using (true);
drop policy if exists "authenticated read clusters" on clusters;
create policy "authenticated read clusters" on clusters for select to authenticated using (true);
drop policy if exists "authenticated read projects" on projects;
create policy "authenticated read projects" on projects for select to authenticated using (true);
drop policy if exists "authenticated read resources" on resources;
create policy "authenticated read resources" on resources for select to authenticated using (true);
drop policy if exists "authenticated read tasks" on tasks;
create policy "authenticated read tasks" on tasks for select to authenticated using (true);
drop policy if exists "authenticated read reports" on reports;
create policy "authenticated read reports" on reports for select to authenticated using (true);
drop policy if exists "authenticated read announcements" on announcements;
create policy "authenticated read announcements" on announcements for select to authenticated using (true);
drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications" on notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "authenticated read activity_logs" on activity_logs;
create policy "authenticated read activity_logs" on activity_logs for select to authenticated using (true);
drop policy if exists "authenticated read leadership_terms" on leadership_terms;
create policy "authenticated read leadership_terms" on leadership_terms for select to authenticated using (true);
drop policy if exists "authenticated read leadership_assignments" on leadership_assignments;
create policy "authenticated read leadership_assignments" on leadership_assignments for select to authenticated using (true);
-- Write policies + HQ/chapter helpers for Elevates OS
-- Requires 001_elevates_os_core.sql

create or replace function public.is_hq_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key in ('founder', 'hq_admin', 'hq_mentor')
  );
$$;

create or replace function public.user_chapter_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select chapter_id
  from user_roles
  where user_id = auth.uid()
    and chapter_id is not null;
$$;

-- Chapters
drop policy if exists "hq insert chapters" on chapters;
create policy "hq insert chapters" on chapters
  for insert to authenticated
  with check (public.is_hq_user());

drop policy if exists "hq update chapters" on chapters;
create policy "hq update chapters" on chapters
  for update to authenticated
  using (public.is_hq_user());

-- Events
drop policy if exists "chapter insert events" on events;
create policy "chapter insert events" on events
  for insert to authenticated
  with check (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

drop policy if exists "chapter update events" on events;
create policy "chapter update events" on events
  for update to authenticated
  using (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

-- Registrations
drop policy if exists "insert own registrations" on event_registrations;
create policy "insert own registrations" on event_registrations
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_hq_user());

drop policy if exists "update registrations chapter" on event_registrations;
create policy "update registrations chapter" on event_registrations
  for update to authenticated
  using (
    public.is_hq_user()
    or exists (
      select 1 from events e
      where e.id = event_id
        and e.chapter_id in (select public.user_chapter_ids())
    )
  );

-- Attendance
drop policy if exists "insert attendance chapter" on attendance;
create policy "insert attendance chapter" on attendance
  for insert to authenticated
  with check (
    public.is_hq_user()
    or exists (
      select 1 from events e
      where e.id = event_id
        and e.chapter_id in (select public.user_chapter_ids())
    )
  );

-- Certificates
drop policy if exists "insert certificates chapter" on certificates;
create policy "insert certificates chapter" on certificates
  for insert to authenticated
  with check (
    public.is_hq_user()
    or exists (
      select 1 from events e
      where e.id = event_id
        and e.chapter_id in (select public.user_chapter_ids())
    )
  );

-- Tasks
drop policy if exists "update tasks chapter" on tasks;
create policy "update tasks chapter" on tasks
  for update to authenticated
  using (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

drop policy if exists "insert tasks chapter" on tasks;
create policy "insert tasks chapter" on tasks
  for insert to authenticated
  with check (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

-- Reports
drop policy if exists "insert reports chapter" on reports;
create policy "insert reports chapter" on reports
  for insert to authenticated
  with check (
    public.is_hq_user()
    or (
      submitted_by = auth.uid()
      and chapter_id in (select public.user_chapter_ids())
    )
  );

drop policy if exists "hq update reports" on reports;
create policy "hq update reports" on reports
  for update to authenticated
  using (public.is_hq_user());

-- Announcements
drop policy if exists "insert announcements" on announcements;
create policy "insert announcements" on announcements
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_hq_user()
      or chapter_id in (select public.user_chapter_ids())
      or chapter_id is null
    )
  );

-- Notifications
drop policy if exists "update own notifications" on notifications;
create policy "update own notifications" on notifications
  for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert notifications hq" on notifications;
create policy "insert notifications hq" on notifications
  for insert to authenticated
  with check (public.is_hq_user() or user_id = auth.uid());

-- Activity logs
drop policy if exists "insert activity logs" on activity_logs;
create policy "insert activity logs" on activity_logs
  for insert to authenticated
  with check (actor_id = auth.uid() or public.is_hq_user());

-- Resources
drop policy if exists "hq manage resources" on resources;
create policy "hq manage resources" on resources
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());
-- Public surface schema for Elevates Web ↔ OS connection
-- Requires 001_elevates_os_core.sql

-- 1. Addressable + publishable events
alter table events add column if not exists slug text;
alter table events add column if not exists published_at timestamptz;
alter table events add column if not exists summary text;
alter table events add column if not exists banner_url text;
alter table events add column if not exists mode text check (mode is null or mode in ('in_person','online','hybrid'));
alter table events add column if not exists progress_stage text;
alter table events add column if not exists next_event_id uuid references events(id) on delete set null;
alter table events add column if not exists banner_emoji text default '◆';

create unique index if not exists events_chapter_slug_idx
  on events (chapter_id, slug)
  where slug is not null;

-- 2. Public projection flags
alter table chapters add column if not exists published boolean not null default false;
alter table chapters add column if not exists logo_url text;
alter table chapters add column if not exists district text;
alter table chapters add column if not exists member_count integer not null default 0;
alter table chapters add column if not exists event_count integer not null default 0;
alter table chapters add column if not exists project_count integer not null default 0;
alter table chapters add column if not exists faculty_id uuid references profiles(id) on delete set null;
alter table chapters add column if not exists notes text;

alter table projects add column if not exists slug text;
alter table projects add column if not exists is_showcased boolean not null default false;
alter table projects add column if not exists project_type text;

create unique index if not exists projects_slug_idx
  on projects (slug)
  where slug is not null;

alter table profiles add column if not exists is_public boolean not null default false;
alter table profiles add column if not exists section text;
alter table profiles add column if not exists status text not null default 'active'
  check (status in ('active','disabled'));
alter table profiles add column if not exists engagement_tier text;
alter table profiles add column if not exists journey_stage text;
alter table profiles add column if not exists phone text;

alter table event_registrations add column if not exists representative_id uuid references profiles(id) on delete set null;
alter table event_registrations add column if not exists guest_email text;
alter table event_registrations add column if not exists guest_name text;

-- Allow guest RSVPs (user_id optional when guest fields present)
alter table event_registrations alter column user_id drop not null;

alter table organizations add column if not exists brand_kit jsonb;

alter table clusters add column if not exists roadmap jsonb not null default '[]'::jsonb;
alter table clusters add column if not exists access_mode text default 'open'
  check (access_mode in ('open','invite','challenge'));
alter table clusters add column if not exists responsibilities text[] not null default '{}';
alter table clusters add column if not exists challenge_prompt text;

alter table reports add column if not exists summary text;
alter table reports add column if not exists body_html text;
alter table reports add column if not exists body_json jsonb;
alter table reports add column if not exists event_id uuid references events(id) on delete set null;
alter table reports add column if not exists images text[] not null default '{}';
alter table reports add column if not exists source text;
alter table reports add column if not exists updated_at timestamptz;
alter table reports add column if not exists updated_by uuid references profiles(id);

-- 3. Forms engine (spec domain 4)
create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text,
  purpose text not null default 'custom'
    check (purpose in ('registration','feedback','custom','survey')),
  schema jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','open','closed')),
  is_public boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  respondent_id uuid references profiles(id),
  event_id uuid references events(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

-- 4. Web-facing entities
create table if not exists peer_labs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  track text,
  description text,
  syllabus jsonb not null default '[]'::jsonb,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','completed','archived')),
  applications_open boolean not null default false,
  chapter_id uuid references chapters(id) on delete set null,
  banner_url text,
  enrolled_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists college_leads (
  id uuid primary key default gen_random_uuid(),
  college text not null,
  contact_name text not null,
  email text not null,
  phone text,
  role text,
  message text,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','converted','closed')),
  source text not null default 'web',
  created_at timestamptz not null default now()
);

create table if not exists join_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  college text,
  year text,
  interests text[] not null default '{}',
  message text,
  chapter_slug text,
  status text not null default 'new'
    check (status in ('new','reviewed','invited','closed')),
  source text not null default 'web',
  created_at timestamptz not null default now()
);

-- 5. Certificate verification without exposing the table
create or replace function public.verify_certificate(cert_id text)
returns table (
  certificate_id text,
  holder text,
  event_title text,
  issued_at timestamptz,
  chapter_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.certificate_id,
    p.full_name,
    e.title,
    c.issued_at,
    ch.name
  from certificates c
  join profiles p on p.id = c.user_id
  join events e on e.id = c.event_id
  left join chapters ch on ch.id = e.chapter_id
  where c.certificate_id = cert_id;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- RLS for new tables
alter table forms enable row level security;
alter table form_responses enable row level security;
alter table peer_labs enable row level security;
alter table college_leads enable row level security;
alter table join_leads enable row level security;

drop policy if exists "authenticated read forms" on forms;
create policy "authenticated read forms" on forms
  for select to authenticated using (true);

drop policy if exists "public read open forms" on forms;
create policy "public read open forms" on forms
  for select to anon using (is_public = true and status = 'open');

drop policy if exists "authenticated read form_responses" on form_responses;
create policy "authenticated read form_responses" on form_responses
  for select to authenticated using (true);

drop policy if exists "public read published peer_labs" on peer_labs;
create policy "public read published peer_labs" on peer_labs
  for select to anon using (status in ('upcoming','active','completed'));

drop policy if exists "authenticated read peer_labs" on peer_labs;
create policy "authenticated read peer_labs" on peer_labs
  for select to authenticated using (true);

drop policy if exists "hq read college_leads" on college_leads;
create policy "hq read college_leads" on college_leads
  for select to authenticated using (public.is_hq_user());

drop policy if exists "hq read join_leads" on join_leads;
create policy "hq read join_leads" on join_leads
  for select to authenticated using (public.is_hq_user());
-- Tenant-scoped RLS — replaces permissive using(true) read policies
-- Requires 001 + 002 + 004

create or replace function public.is_chapter_member(p_chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_hq_user()
    or exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.chapter_id = p_chapter_id
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.chapter_id = p_chapter_id
    );
$$;

create or replace function public.can_read_profile(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_id
    or public.is_hq_user()
    or exists (
      select 1
      from profiles me
      join profiles them on them.id = target_id
      where me.id = auth.uid()
        and me.chapter_id is not null
        and me.chapter_id = them.chapter_id
        and exists (
          select 1 from user_roles ur
          join roles r on r.id = ur.role_id
          where ur.user_id = auth.uid()
            and ur.chapter_id = me.chapter_id
            and r.key in (
              'chairman','vice_chairman','secretary','joint_secretary',
              'faculty_coordinator','elevates_coordinator','class_representative'
            )
        )
    )
    or exists (
      select 1 from profiles p
      where p.id = target_id and p.is_public = true
    );
$$;

-- Drop permissive read policies from 001
drop policy if exists "authenticated read profiles" on profiles;
drop policy if exists "authenticated read registrations" on event_registrations;
drop policy if exists "authenticated read attendance" on attendance;
drop policy if exists "authenticated read certificates" on certificates;
drop policy if exists "public verify certificates" on certificates;
drop policy if exists "authenticated read tasks" on tasks;
drop policy if exists "authenticated read reports" on reports;
drop policy if exists "authenticated read activity_logs" on activity_logs;
drop policy if exists "authenticated read form_responses" on form_responses;
drop policy if exists "authenticated read forms" on forms;

-- Profiles: own row + same-chapter execs + public projection
drop policy if exists "scoped read profiles" on profiles;
create policy "scoped read profiles" on profiles
  for select to authenticated
  using (public.can_read_profile(id));

drop policy if exists "public read public profiles" on profiles;
create policy "public read public profiles" on profiles
  for select to anon
  using (is_public = true);

-- Event registrations: own + chapter members + HQ
drop policy if exists "scoped read registrations" on event_registrations;
create policy "scoped read registrations" on event_registrations
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hq_user()
    or exists (
      select 1 from events e
      where e.id = event_id
        and public.is_chapter_member(e.chapter_id)
    )
  );

-- Attendance: chapter-scoped
drop policy if exists "scoped read attendance" on attendance;
create policy "scoped read attendance" on attendance
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hq_user()
    or exists (
      select 1 from events e
      where e.id = event_id
        and public.is_chapter_member(e.chapter_id)
    )
  );

-- Certificates: own + chapter scoped (NO anon table select — use verify_certificate RPC)
drop policy if exists "scoped read certificates" on certificates;
create policy "scoped read certificates" on certificates
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hq_user()
    or exists (
      select 1 from events e
      where e.id = event_id
        and public.is_chapter_member(e.chapter_id)
    )
  );

-- Tasks
drop policy if exists "scoped read tasks" on tasks;
create policy "scoped read tasks" on tasks
  for select to authenticated
  using (
    assignee_id = auth.uid()
    or public.is_hq_user()
    or public.is_chapter_member(chapter_id)
  );

-- Reports
drop policy if exists "scoped read reports" on reports;
create policy "scoped read reports" on reports
  for select to authenticated
  using (
    submitted_by = auth.uid()
    or public.is_hq_user()
    or public.is_chapter_member(chapter_id)
  );

-- Activity logs — HQ only
drop policy if exists "hq read activity_logs" on activity_logs;
create policy "hq read activity_logs" on activity_logs
  for select to authenticated
  using (public.is_hq_user());

-- Forms — chapter members + public open forms
drop policy if exists "scoped read forms" on forms;
create policy "scoped read forms" on forms
  for select to authenticated
  using (
    public.is_hq_user()
    or chapter_id is null
    or public.is_chapter_member(chapter_id)
    or (is_public = true and status = 'open')
  );

drop policy if exists "scoped read form_responses" on form_responses;
create policy "scoped read form_responses" on form_responses
  for select to authenticated
  using (
    respondent_id = auth.uid()
    or public.is_hq_user()
    or exists (
      select 1 from forms f
      where f.id = form_id
        and (f.chapter_id is null or public.is_chapter_member(f.chapter_id))
    )
  );

-- Write policies for new tables
drop policy if exists "chapter manage forms" on forms;
create policy "chapter manage forms" on forms
  for all to authenticated
  using (
    public.is_hq_user()
    or (chapter_id is not null and public.is_chapter_member(chapter_id))
  )
  with check (
    public.is_hq_user()
    or (chapter_id is not null and public.is_chapter_member(chapter_id))
  );

drop policy if exists "insert form responses authenticated" on form_responses;
create policy "insert form responses authenticated" on form_responses
  for insert to authenticated
  with check (
    respondent_id = auth.uid()
    or public.is_hq_user()
  );

drop policy if exists "hq manage peer_labs" on peer_labs;
create policy "hq manage peer_labs" on peer_labs
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());

drop policy if exists "hq manage college_leads" on college_leads;
create policy "hq manage college_leads" on college_leads
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());

drop policy if exists "hq manage join_leads" on join_leads;
create policy "hq manage join_leads" on join_leads
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());

-- Published chapters readable by anon (public site projections use service role,
-- but allow anon for direct published reads if needed)
drop policy if exists "anon read published chapters" on chapters;
create policy "anon read published chapters" on chapters
  for select to anon
  using (published = true and status = 'active');

drop policy if exists "anon read published events" on events;
create policy "anon read published events" on events
  for select to anon
  using (published_at is not null and visibility = 'public');

drop policy if exists "anon read showcased projects" on projects;
create policy "anon read showcased projects" on projects
  for select to anon
  using (is_showcased = true);
-- ============================================================================
-- ELEVATES PLATFORM — MASTER SEED SCRIPT (Elevates Web Data -> Supabase)
-- Full data from Elevates-web (Chapters, Founders, Events, Projects, Peer Labs, Clusters)
-- Deterministic UUIDs for idempotent upserts.
-- ============================================================================

-- 1. ORGANIZATION
insert into organizations (id, name, slug, tagline, brand_kit)
values (
  'e1000000-0000-4000-8000-000000000001',
  'Elevates Foundation',
  'elevates',
  'Engineering Culture, Open Building & Tech Leadership across Campuses',
  '{"primaryColor": "#f26430", "secondaryColor": "#2d2d34", "logoUrl": "/images/logo.png"}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  brand_kit = excluded.brand_kit;

-- 2. CHAPTERS
insert into chapters (
  id, organization_id, name, slug, college, city, district, status, health_score, founded_at, published, member_count, event_count, project_count, notes
)
values (
  'c1000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'Eranad Knowledge City Chapter',
  'ekc',
  'Eranad Knowledge City Technical Campus',
  'Manjeri',
  'Malappuram',
  'active',
  98.5,
  '2025-09-01',
  true,
  128,
  15,
  8,
  'First flagship campus chapter. Active departments: CSE, AI&DS, CSBS, ECE, Civil, Mechanical.'
)
on conflict (organization_id, slug) do update set
  name = excluded.name,
  college = excluded.college,
  city = excluded.city,
  district = excluded.district,
  status = excluded.status,
  health_score = excluded.health_score,
  published = excluded.published,
  member_count = excluded.member_count,
  event_count = excluded.event_count,
  project_count = excluded.project_count,
  notes = excluded.notes;

-- 3. PROFILES (Founders, Core Team, Faculty, Leads)
-- Note: In production, profiles reference auth.users. When running seed in development/demo, we upsert into profiles.
insert into profiles (
  id, email, full_name, avatar_url, department, year, chapter_id, skills, interests, github_url, linkedin_url, portfolio_url, points, bio, is_public, status, engagement_tier, journey_stage
)
values
  (
    'd1000000-0000-4000-8000-000000000001',
    'sarhan@elevates.live',
    'Sarhan Qadir KVM',
    '/images/founders/sarhan-qadir.jpeg',
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'Systems Architecture'],
    array['Open Source', 'EdTech', 'Engineering Culture', 'Community Building'],
    'https://github.com/Elevates-Foundation',
    'https://www.linkedin.com/in/sqadirkvm/',
    'https://elevates.live',
    2500,
    'Founder & President · Elevates Foundation. Building open engineering culture.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'naseem@elevates.live',
    'Naseem Shan',
    '/images/founders/naseem-shan.jpeg',
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Backend', 'Systems', 'DevOps', 'Distributed Systems'],
    array['Infrastructure', 'Cloud', 'System Architecture'],
    'https://github.com/Elevates-Foundation',
    'https://www.linkedin.com/in/naseem-shan-b5039a255/',
    null,
    2100,
    'Founder · Backend Systems & Infrastructure Lead.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'nafih@elevates.live',
    'Muhammed Nafih P',
    '/images/founders/nafih.jpeg',
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['UI/UX Design', 'Figma', 'Brand Identity', 'Product Design', 'Frontend'],
    array['Design Systems', 'Motion Design', 'Typography'],
    null,
    'https://www.linkedin.com/in/muhammed-nafih-8777a2282/',
    null,
    1950,
    'Founder · Design Wizard & Brand Lead.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000004',
    'adhinan@elevates.live',
    'Adhinan K',
    null,
    'CSE',
    '4th Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Cybersecurity', 'Kali Linux', 'Penetration Testing', 'CTF', 'Network Defense'],
    array['InfoSec', 'Ethical Hacking', 'Reverse Engineering'],
    'https://github.com/Elevates-Foundation',
    'https://www.linkedin.com/company/elevates-in',
    null,
    1800,
    'Founder · Cybersecurity Lead & CTF Researcher.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000005',
    'jasira@ekc.edu.in',
    'Jasira KT',
    '/images/advisors/jasira-kt.jpeg',
    'Computer Science & Engineering',
    null,
    'c1000000-0000-4000-8000-000000000001',
    array['Curriculum Development', 'Academic Mentorship', 'Student Affairs'],
    array['Engineering Pedagogy', 'Industry-Academia Bridge'],
    null,
    null,
    null,
    1500,
    'Faculty Coordinator & CSE Faculty Head, Eranad Knowledge City Technical Campus.',
    true,
    'active',
    'leaders',
    'leadership'
  ),
  (
    'd1000000-0000-4000-8000-000000000006',
    'danish@ekc.edu.in',
    'Danish Gagarin',
    null,
    'Cyber Security',
    '2nd Year',
    'c1000000-0000-4000-8000-000000000001',
    array['Web Development', 'Bootstrap', 'HTML/CSS', 'Community Operations'],
    array['Web Design', 'Open Source', 'Outreach'],
    'https://github.com/Elevates-Foundation',
    null,
    null,
    1200,
    'Campus Chapter Lead · Eranad Knowledge City.',
    true,
    'active',
    'active',
    'cluster'
  )
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  department = excluded.department,
  year = excluded.year,
  skills = excluded.skills,
  interests = excluded.interests,
  github_url = excluded.github_url,
  linkedin_url = excluded.linkedin_url,
  points = excluded.points,
  bio = excluded.bio,
  is_public = excluded.is_public;

-- 4. CLUSTERS
insert into clusters (
  id, chapter_id, name, slug, description, leader_id, faculty_id, access_mode, roadmap, responsibilities
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Web & Fullstack Engineering',
    'web-dev',
    'Modern web application architecture, Next.js, APIs, state management and cloud deployments.',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'open',
    '[{"week": 1, "topic": "HTML, CSS & Modern JS"}, {"week": 2, "topic": "React & Next.js Basics"}, {"week": 3, "topic": "State & Backend APIs"}, {"week": 4, "topic": "Production Deployments"}]'::jsonb,
    array['Host bi-weekly peer coding sprints', 'Review student pull requests', 'Deploy student projects to Vercel']
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'Cybersecurity & CTF',
    'cybersec',
    'Defensive security, Kali Linux, packet inspection, ethical hacking and CTF battles.',
    'd1000000-0000-4000-8000-000000000004',
    'd1000000-0000-4000-8000-000000000005',
    'invite',
    '[{"week": 1, "topic": "Terminal & Kali Linux"}, {"week": 2, "topic": "Wireshark Packet Analysis"}, {"week": 3, "topic": "Web Exploitation Vectors"}, {"week": 4, "topic": "Campus CTF"}]'::jsonb,
    array['Conduct network defense drills', 'Organize internal Capture The Flag competitions', 'Maintain security audit guides']
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'AI, Agents & Automation',
    'ai-agents',
    'LLM workflows, prompt engineering, n8n automations, autonomous agent development.',
    'd1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000005',
    'open',
    '[{"week": 1, "topic": "Prompting & LLM Architecture"}, {"week": 2, "topic": "n8n Webhook Automations"}, {"week": 3, "topic": "RAG & Vector Embeddings"}, {"week": 4, "topic": "Agent Deployment"}]'::jsonb,
    array['Build autonomous campus tools', 'Run no-code AI workshops', 'Explore multimodal AI systems']
  )
on conflict (chapter_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  leader_id = excluded.leader_id,
  access_mode = excluded.access_mode,
  roadmap = excluded.roadmap,
  responsibilities = excluded.responsibilities;

-- 5. REAL EVENTS (From src/data/events.ts)
insert into events (
  id, chapter_id, title, slug, summary, description, venue, starts_at, ends_at, capacity, visibility, status, certificate_enabled, category, banner_url, banner_emoji, mode, progress_stage, published_at, organizer_id
)
values
  (
    'd1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'LET''S DECODE LINKEDIN',
    'decode-linkedin-shiju-mishal',
    'The LinkedIn Way · Professional Branding, Networking & Internships',
    'Full-day interactive workshop on unlocking the full potential of LinkedIn for personal branding, recruiter networking, and high-impact internship search with Shiju Roy & Mishal V P.',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-07-22 10:00:00+05:30',
    '2026-07-22 16:00:00+05:30',
    80,
    'public',
    'completed',
    true,
    'Workshop',
    '/images/events/decode-linkedin-shiju-mishal.jpeg',
    '💼',
    'in_person',
    'completed',
    '2026-07-01 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'CAREER CATALYST — WORKSHOP',
    'career-catalyst-baiju',
    'Want to Get Hired? Start Here · Employability, Resumes & Mock Interviews',
    'Full-day interactive employability and placement preparation workshop led by Prof. Baiju B S (Placement Head, MEA Engineering College).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-07-15 10:00:00+05:30',
    '2026-07-15 16:00:00+05:30',
    65,
    'public',
    'completed',
    true,
    'Workshop',
    '/images/events/career-catalyst-baiju.jpeg',
    '🚀',
    'in_person',
    'completed',
    '2026-07-01 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'VIBE CODING WORKSHOP',
    'vibe-coding-brototype',
    'Build, Create & Innovate · AI-Assisted Rapid Development with Brototype',
    'Full-day hands-on Vibe Coding workshop conducted by Brototype (Jobin Selvanose & Umar Muqthar) and powered by ELEVATES, featuring rapid prototyping with AI tools, Git, and Firebase.',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-26 10:00:00+05:30',
    '2026-03-26 16:00:00+05:30',
    70,
    'public',
    'completed',
    true,
    'Workshop',
    '/images/events/vibe-coding-brototype.jpeg',
    '⚡',
    'in_person',
    'completed',
    '2026-03-10 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000004',
    'c1000000-0000-4000-8000-000000000001',
    'REVAMP OF CSE ASSOCIATION',
    'cse-association-revamp-mehar',
    'Official Association Relaunch · Chief Guest Mehar M P (Co-Founder, TinkerHub)',
    'Official relaunch and revamp of the Computer Science Engineering Association at EKCTC with Chief Guest Mehar M P (Co-Founder & CEO, TinkerHub Foundation).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-25 14:00:00+05:30',
    '2026-03-25 16:00:00+05:30',
    80,
    'public',
    'completed',
    true,
    'Meetup',
    '/images/events/cse-association-revamp-mehar.jpeg',
    '🌟',
    'in_person',
    'completed',
    '2026-03-15 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000005',
    'c1000000-0000-4000-8000-000000000001',
    'AI & DS ASSOCIATION INAUGURATION',
    'aids-association-inauguration',
    'Inauguration & Industry Keynote · Guests from Elyst AI',
    'Inauguration ceremony of the AI & Data Science Association at EKCTC, featuring keynote sessions by Elyst AI Co-Founders Fathima Shirin P (CEO) and Nihal Anas (CAIO).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-12 10:00:00+05:30',
    '2026-03-12 13:00:00+05:30',
    68,
    'public',
    'completed',
    true,
    'Meetup',
    '/images/events/aids-association-inauguration.jpeg',
    '🤖',
    'in_person',
    'completed',
    '2026-03-01 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000006',
    'c1000000-0000-4000-8000-000000000001',
    'ELEVATES CAMPUS LAUNCH',
    'elevates-campus-launch-ekctc',
    'Official Chapter Opening & Leadership Handover · Chief Guest Shibili Rahman KP',
    'Official ELEVATES Campus Chapter Launch and leadership handover ceremony at EKCTC, featuring Chief Guest Shibili Rahman KP (Founder & Chairman, RAC Global).',
    'Seminar Hall, Eranad Knowledge City Technical Campus (EKCTC)',
    '2026-03-04 10:00:00+05:30',
    '2026-03-04 13:00:00+05:30',
    121,
    'public',
    'completed',
    true,
    'Meetup',
    '/images/events/campus-launch-ekctc.jpeg',
    '🚩',
    'in_person',
    'completed',
    '2026-02-20 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  ),
  (
    'd1000000-0000-4000-8000-000000000007',
    'c1000000-0000-4000-8000-000000000001',
    'CYBER RAID — CAPTURE THE FLAG',
    'cyber-raid-ctf',
    'Hack. Solve. Conquer · ₹1500 Prize Pool by ELEVATES',
    'Competitive Capture The Flag battlefield featuring binary exploitation, cryptic challenges, web exploitation, and network defense drills.',
    'Eranad Knowledge City Technical Campus (EKCTC)',
    '2025-10-09 10:00:00+05:30',
    '2025-10-09 16:30:00+05:30',
    45,
    'public',
    'completed',
    true,
    'Challenge',
    '/images/events/adhinan-ctf.jpeg',
    '🛡️',
    'in_person',
    'completed',
    '2025-09-25 00:00:00+05:30',
    'd1000000-0000-4000-8000-000000000001'
  )
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  description = excluded.description,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  capacity = excluded.capacity,
  visibility = excluded.visibility,
  status = excluded.status,
  certificate_enabled = excluded.certificate_enabled,
  category = excluded.category,
  banner_url = excluded.banner_url,
  banner_emoji = excluded.banner_emoji,
  mode = excluded.mode,
  progress_stage = excluded.progress_stage;

-- 6. REAL PROJECTS (From src/data/projects.ts)
insert into projects (
  id, chapter_id, title, slug, description, stage, repository_url, progress, demo_url, awards, is_showcased, project_type
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Celestia — CSE Association Website',
    'celestia',
    'A department website specified, coded, and deployed in 60 minutes with 5 junior builders and launched live on stage via Python gesture recognition.',
    'launched',
    null,
    100,
    'https://celestia-web-lti6.vercel.app',
    array['1-Hour Build Speed Record', 'Stage Gesture Launch'],
    true,
    'flagship'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'Vibranium Event Platform',
    'vibranium-event-platform',
    'Full event management and ticketing platform built in 5 days, handling 400,000 requests in 24 hours with zero downtime.',
    'launched',
    'https://github.com/Elevates-Foundation',
    100,
    'https://elevates.live',
    array['400k Requests / 24h', 'Zero Downtime'],
    true,
    'flagship'
  ),
  (
    'b1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'Elevates OS',
    'elevates-os',
    'Next.js 16 Finexy-style ERP operating system powering chapters, events, attendance, workflows, and automated certificate issuance.',
    'active',
    'https://github.com/Elevates-Foundation',
    95,
    'http://localhost:3001',
    array['Core Infrastructure'],
    true,
    'flagship'
  )
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  stage = excluded.stage,
  repository_url = excluded.repository_url,
  progress = excluded.progress,
  demo_url = excluded.demo_url,
  awards = excluded.awards,
  is_showcased = excluded.is_showcased,
  project_type = excluded.project_type;

-- 7. PEER LABS (From src/data/peer-labs.ts)
insert into peer_labs (
  id, slug, title, track, description, syllabus, status, applications_open, enrolled_count
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'cybersec-defense-lab',
    'Cybersecurity Lab',
    'Cybersecurity',
    '3-Phase Hands-on Kali Linux & Network Defense. Master terminal navigation, network mapping, vulnerability inspection, and defensive security drills.',
    '[{"phase": 1, "title": "Kali Linux & Network Defense"}, {"phase": 2, "title": "Terminal Fundamentals"}, {"phase": 3, "title": "Security & Ethical Hacking"}, {"phase": 4, "title": "Cyber Raid CTF Capstone"}]'::jsonb,
    'active',
    true,
    76
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'operation-java',
    'Operation Java',
    'Software',
    'Multi-week hands-on Java fundamentals, OOP design patterns, and full-stack software development for campus builders.',
    '[{"week": 1, "title": "JVM & Modern Syntax"}, {"week": 2, "title": "OOP Lab & Design Patterns"}, {"week": 3, "title": "Database Interfacing"}, {"week": 4, "title": "Mini Project Sprint"}]'::jsonb,
    'active',
    true,
    45
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'spark-electronics',
    'Spark Electronics Lab',
    'Hardware & IoT',
    'Intro electronics, semiconductor circuits, microcontrollers, and embedded hardware tinkering for campus makers.',
    '[{"week": 1, "title": "Circuits & Passive Components"}, {"week": 2, "title": "Semiconductors & Sensors"}, {"week": 3, "title": "Arduino & ESP32"}, {"week": 4, "title": "Hardware Demo Day"}]'::jsonb,
    'active',
    true,
    32
  )
on conflict (slug) do update set
  title = excluded.title,
  track = excluded.track,
  description = excluded.description,
  syllabus = excluded.syllabus,
  status = excluded.status,
  applications_open = excluded.applications_open,
  enrolled_count = excluded.enrolled_count;

-- 8. SAMPLE VERIFIABLE CERTIFICATE
insert into certificates (
  id, certificate_id, event_id, user_id, issued_at, verification_qr, digital_signature
)
values (
  'f1000000-0000-4000-8000-000000000001',
  'ELV-EKC-2026-90421',
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  '2026-07-22 17:00:00+05:30',
  'https://elevates.live/verify/certificate/ELV-EKC-2026-90421',
  'sig_sha256_elevates_ekc_decode_linkedin_verified'
)
on conflict (certificate_id) do update set
  issued_at = excluded.issued_at,
  verification_qr = excluded.verification_qr,
  digital_signature = excluded.digital_signature;
