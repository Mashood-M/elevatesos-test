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

create policy "authenticated read forms" on forms
  for select to authenticated using (true);

create policy "public read open forms" on forms
  for select to anon using (is_public = true and status = 'open');

create policy "authenticated read form_responses" on form_responses
  for select to authenticated using (true);

create policy "public read published peer_labs" on peer_labs
  for select to anon using (status in ('upcoming','active','completed'));

create policy "authenticated read peer_labs" on peer_labs
  for select to authenticated using (true);

create policy "hq read college_leads" on college_leads
  for select to authenticated using (public.is_hq_user());

create policy "hq read join_leads" on join_leads
  for select to authenticated using (public.is_hq_user());
