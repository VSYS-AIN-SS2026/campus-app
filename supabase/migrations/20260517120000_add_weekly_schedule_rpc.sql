create table if not exists public.user_hidden_schedule_occurrences (
  user_id uuid not null references public.users(id) on delete cascade,
  occurrence_id text not null,
  updated_at timestamp with time zone not null default now(),
  constraint user_hidden_schedule_occurrences_pkey primary key (user_id, occurrence_id),
  constraint user_hidden_schedule_occurrences_occurrence_id_check check (char_length(trim(occurrence_id)) > 0)
);

create index if not exists user_hidden_schedule_occurrences_occurrence_id_idx
  on public.user_hidden_schedule_occurrences (occurrence_id);

alter table public.user_hidden_schedule_occurrences enable row level security;

create policy "users can read own hidden occurrences"
  on public.user_hidden_schedule_occurrences
  for select
  to authenticated
  using (exists (
    select 1
    from public.users
    where users.id = user_hidden_schedule_occurrences.user_id
      and users.auth_user_id = auth.uid()
  ));

create policy "users can insert own hidden occurrences"
  on public.user_hidden_schedule_occurrences
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.users
    where users.id = user_hidden_schedule_occurrences.user_id
      and users.auth_user_id = auth.uid()
  ));

create or replace function public.get_demo_user_hidden_schedule_occurrence_ids()
returns table (
  occurrence_id text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
begin
  select * into resolved_user from public.resolve_dashboard_user();

  return query
  select
    user_hidden_schedule_occurrences.occurrence_id,
    user_hidden_schedule_occurrences.updated_at
  from public.user_hidden_schedule_occurrences
  where user_hidden_schedule_occurrences.user_id = resolved_user.id;
end;
$$;

create or replace function public.hide_demo_user_schedule_occurrence(
  selected_occurrence_id text
)
returns table (
  occurrence_id text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
  normalized_occurrence_id text;
  saved_row public.user_hidden_schedule_occurrences;
begin
  normalized_occurrence_id := trim(coalesce(selected_occurrence_id, ''));

  if normalized_occurrence_id = '' then
    raise exception 'occurrence id is required';
  end if;

  select * into resolved_user from public.resolve_dashboard_user();

  insert into public.user_hidden_schedule_occurrences (
    user_id,
    occurrence_id
  )
  values (
    resolved_user.id,
    normalized_occurrence_id
  )
  on conflict on constraint user_hidden_schedule_occurrences_pkey
  do update set
    updated_at = now()
  returning * into saved_row;

  return query
  select
    saved_row.occurrence_id,
    saved_row.updated_at;
end;
$$;

create or replace function public.show_demo_user_schedule_occurrence(
  selected_occurrence_id text
)
returns table (
  occurrence_id text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
  normalized_occurrence_id text;
begin
  normalized_occurrence_id := trim(coalesce(selected_occurrence_id, ''));

  if normalized_occurrence_id = '' then
    raise exception 'occurrence id is required';
  end if;

  select * into resolved_user from public.resolve_dashboard_user();

  delete from public.user_hidden_schedule_occurrences
  where user_hidden_schedule_occurrences.user_id = resolved_user.id
    and user_hidden_schedule_occurrences.occurrence_id = normalized_occurrence_id;

  return query
  select
    normalized_occurrence_id,
    now();
end;
$$;

create or replace function public.get_demo_user_weekly_schedule(
  selected_week_start date default null,
  selected_time_zone text default 'Europe/Berlin'
)
returns table (
  event_id text,
  occurrence_id text,
  series_id text,
  module_id uuid,
  module_code text,
  module_name text,
  module_status text,
  weekday_index integer,
  day_date date,
  start_time text,
  end_time text,
  start_time_minutes integer,
  end_time_minutes integer,
  title text,
  subtitle text,
  is_hidden_series boolean,
  is_hidden_occurrence boolean,
  is_hidden boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
  normalized_time_zone text;
  resolved_week_start date;
begin
  select * into resolved_user from public.resolve_dashboard_user();

  if not exists (
    select 1
    from pg_timezone_names
    where name = selected_time_zone
  ) then
    normalized_time_zone := 'Europe/Berlin';
  else
    normalized_time_zone := selected_time_zone;
  end if;

  resolved_week_start := coalesce(
    selected_week_start,
    date_trunc('week', now() at time zone normalized_time_zone)::date
  );

  if resolved_user.spo_id is null then
    return;
  end if;

  return query
  with enrolled_modules as (
    select
      modules.id as module_id,
      modules.code as module_code,
      modules.name as module_name,
      module_handbook_entries.recommended_semester,
      coalesce(
        sum(courses.ects) filter (where courses.ects is not null),
        0
      ) as total_ects,
      min(courses.name) as first_course_name,
      min(courses.course_type) as first_course_type
    from public.module_handbooks
    join public.module_handbook_entries
      on module_handbook_entries.handbook_id = module_handbooks.id
    join public.modules
      on modules.id = module_handbook_entries.module_id
    join public.user_module_statuses
      on user_module_statuses.module_id = modules.id
     and user_module_statuses.user_id = resolved_user.id
     and user_module_statuses.status = 'belegt'
    left join public.courses
      on courses.module_id = modules.id
    where module_handbooks.spo_id = resolved_user.spo_id
    group by
      modules.id,
      modules.code,
      modules.name,
      module_handbook_entries.recommended_semester
  ),
  ordered as (
    select
      enrolled_modules.*,
      row_number() over (
        order by
          coalesce(enrolled_modules.recommended_semester, 999),
          enrolled_modules.module_code,
          enrolled_modules.module_id
      ) as row_num
    from enrolled_modules
  ),
  scheduled as (
    select
      ordered.module_id,
      ordered.module_code,
      ordered.module_name,
      ((ordered.row_num - 1) % 5) as weekday_index,
      (
        (array[495, 600, 705, 810, 915])[((ordered.row_num - 1) % 5) + 1]
      ) as start_time_minutes,
      least(
        (
          (array[495, 600, 705, 810, 915])[((ordered.row_num - 1) % 5) + 1]
        )
        + case when ordered.total_ects >= 6 then 120 else 90 end,
        1185
      ) as end_time_minutes,
      ordered.module_name as title,
      trim(
        both ' · '
        from concat_ws(' · ', ordered.first_course_name, ordered.first_course_type, ordered.module_code)
      ) as subtitle,
      'module:' || ordered.module_id::text as series_id,
      ordered.module_id::text
        || ':' || ((ordered.row_num - 1) % 5)::text
        || ':' || (
          (array[495, 600, 705, 810, 915])[((ordered.row_num - 1) % 5) + 1]
        )::text as occurrence_id
    from ordered
  )
  select
    scheduled.occurrence_id as event_id,
    scheduled.occurrence_id,
    scheduled.series_id,
    scheduled.module_id,
    scheduled.module_code,
    scheduled.module_name,
    'belegt'::text as module_status,
    scheduled.weekday_index,
    resolved_week_start + scheduled.weekday_index as day_date,
    to_char(make_time(scheduled.start_time_minutes / 60, scheduled.start_time_minutes % 60, 0), 'HH24:MI') as start_time,
    to_char(make_time(scheduled.end_time_minutes / 60, scheduled.end_time_minutes % 60, 0), 'HH24:MI') as end_time,
    scheduled.start_time_minutes,
    scheduled.end_time_minutes,
    scheduled.title,
    nullif(scheduled.subtitle, '') as subtitle,
    hidden_series.series_id is not null as is_hidden_series,
    hidden_occurrences.occurrence_id is not null as is_hidden_occurrence,
    (hidden_series.series_id is not null or hidden_occurrences.occurrence_id is not null) as is_hidden
  from scheduled
  left join public.user_hidden_schedule_series as hidden_series
    on hidden_series.user_id = resolved_user.id
   and hidden_series.series_id = scheduled.series_id
  left join public.user_hidden_schedule_occurrences as hidden_occurrences
    on hidden_occurrences.user_id = resolved_user.id
   and hidden_occurrences.occurrence_id = scheduled.occurrence_id
  order by
    scheduled.weekday_index,
    scheduled.start_time_minutes,
    scheduled.module_code;
end;
$$;

revoke all on function public.get_demo_user_hidden_schedule_occurrence_ids() from public;
revoke all on function public.hide_demo_user_schedule_occurrence(text) from public;
revoke all on function public.show_demo_user_schedule_occurrence(text) from public;
revoke all on function public.get_demo_user_weekly_schedule(date, text) from public;

grant execute on function public.get_demo_user_hidden_schedule_occurrence_ids() to anon;
grant execute on function public.get_demo_user_hidden_schedule_occurrence_ids() to authenticated;
grant execute on function public.hide_demo_user_schedule_occurrence(text) to anon;
grant execute on function public.hide_demo_user_schedule_occurrence(text) to authenticated;
grant execute on function public.show_demo_user_schedule_occurrence(text) to anon;
grant execute on function public.show_demo_user_schedule_occurrence(text) to authenticated;
grant execute on function public.get_demo_user_weekly_schedule(date, text) to anon;
grant execute on function public.get_demo_user_weekly_schedule(date, text) to authenticated;
