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
  id uuid primary key references auth.users(id) on delete cascade,
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
create policy "authenticated read organizations" on organizations for select to authenticated using (true);
create policy "authenticated read chapters" on chapters for select to authenticated using (true);
create policy "authenticated read profiles" on profiles for select to authenticated using (true);
create policy "users update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "authenticated read roles" on roles for select to authenticated using (true);
create policy "authenticated read permissions" on permissions for select to authenticated using (true);
create policy "authenticated read role_permissions" on role_permissions for select to authenticated using (true);
create policy "authenticated read user_roles" on user_roles for select to authenticated using (true);
create policy "authenticated read events" on events for select to authenticated using (true);
create policy "authenticated read registrations" on event_registrations for select to authenticated using (true);
create policy "authenticated read attendance" on attendance for select to authenticated using (true);
create policy "authenticated read certificates" on certificates for select to authenticated using (true);
create policy "public verify certificates" on certificates for select to anon using (true);
create policy "authenticated read clusters" on clusters for select to authenticated using (true);
create policy "authenticated read projects" on projects for select to authenticated using (true);
create policy "authenticated read resources" on resources for select to authenticated using (true);
create policy "authenticated read tasks" on tasks for select to authenticated using (true);
create policy "authenticated read reports" on reports for select to authenticated using (true);
create policy "authenticated read announcements" on announcements for select to authenticated using (true);
create policy "users read own notifications" on notifications for select to authenticated using (auth.uid() = user_id);
create policy "authenticated read activity_logs" on activity_logs for select to authenticated using (true);
create policy "authenticated read leadership_terms" on leadership_terms for select to authenticated using (true);
create policy "authenticated read leadership_assignments" on leadership_assignments for select to authenticated using (true);
