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
create policy "hq insert chapters" on chapters
  for insert to authenticated
  with check (public.is_hq_user());

create policy "hq update chapters" on chapters
  for update to authenticated
  using (public.is_hq_user());

-- Events
create policy "chapter insert events" on events
  for insert to authenticated
  with check (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

create policy "chapter update events" on events
  for update to authenticated
  using (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

-- Registrations
create policy "insert own registrations" on event_registrations
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_hq_user());

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
create policy "update tasks chapter" on tasks
  for update to authenticated
  using (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

create policy "insert tasks chapter" on tasks
  for insert to authenticated
  with check (
    public.is_hq_user()
    or chapter_id in (select public.user_chapter_ids())
  );

-- Reports
create policy "insert reports chapter" on reports
  for insert to authenticated
  with check (
    public.is_hq_user()
    or (
      submitted_by = auth.uid()
      and chapter_id in (select public.user_chapter_ids())
    )
  );

create policy "hq update reports" on reports
  for update to authenticated
  using (public.is_hq_user());

-- Announcements
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
create policy "update own notifications" on notifications
  for update to authenticated
  using (auth.uid() = user_id);

create policy "insert notifications hq" on notifications
  for insert to authenticated
  with check (public.is_hq_user() or user_id = auth.uid());

-- Activity logs
create policy "insert activity logs" on activity_logs
  for insert to authenticated
  with check (actor_id = auth.uid() or public.is_hq_user());

-- Resources
create policy "hq manage resources" on resources
  for all to authenticated
  using (public.is_hq_user())
  with check (public.is_hq_user());
