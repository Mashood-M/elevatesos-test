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
create policy "scoped read profiles" on profiles
  for select to authenticated
  using (public.can_read_profile(id));

create policy "public read public profiles" on profiles
  for select to anon
  using (is_public = true);

-- Event registrations: own + chapter members + HQ
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
create policy "scoped read tasks" on tasks
  for select to authenticated
  using (
    assignee_id = auth.uid()
    or public.is_hq_user()
    or public.is_chapter_member(chapter_id)
  );

-- Reports
create policy "scoped read reports" on reports
  for select to authenticated
  using (
    submitted_by = auth.uid()
    or public.is_hq_user()
    or public.is_chapter_member(chapter_id)
  );

-- Activity logs — HQ only
create policy "hq read activity_logs" on activity_logs
  for select to authenticated
  using (public.is_hq_user());

-- Forms — chapter members + public open forms
create policy "scoped read forms" on forms
  for select to authenticated
  using (
    public.is_hq_user()
    or chapter_id is null
    or public.is_chapter_member(chapter_id)
    or (is_public = true and status = 'open')
  );

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

create policy "insert form responses authenticated" on form_responses
  for insert to authenticated
  with check (
    respondent_id = auth.uid()
    or public.is_hq_user()
  );

create policy "hq manage peer_labs" on peer_labs
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());

create policy "hq manage college_leads" on college_leads
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());

create policy "hq manage join_leads" on join_leads
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());

-- Published chapters readable by anon (public site projections use service role,
-- but allow anon for direct published reads if needed)
create policy "anon read published chapters" on chapters
  for select to anon
  using (published = true and status = 'active');

create policy "anon read published events" on events
  for select to anon
  using (published_at is not null and visibility = 'public');

create policy "anon read showcased projects" on projects
  for select to anon
  using (is_showcased = true);
