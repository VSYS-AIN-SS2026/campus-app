comment on table public.user_hidden_schedule_series is
  'Per-User Hidden-Status für komplette Terminreihen. Eine Reihe blendet fachlich alle zugehörigen Einzeltermine aus.';

comment on column public.user_hidden_schedule_series.series_id is
  'Fachlicher Schlüssel einer Terminreihe, z. B. ein Modul- oder Serien-Identifier. Eindeutig pro Nutzer.';

comment on table public.user_hidden_schedule_occurrences is
  'Per-User Hidden-Status für einzelne Terminvorkommen. Ein Einzeltermin überschreibt keine Reihe, sondern ergänzt sie auf Occurrence-Ebene.';

comment on column public.user_hidden_schedule_occurrences.occurrence_id is
  'Fachlicher Schlüssel eines einzelnen Terminvorkommens. Eindeutig pro Nutzer.';

create or replace view public.user_hidden_schedule_entries as
  select
    user_hidden_schedule_series.user_id,
    'series'::text as hidden_scope,
    user_hidden_schedule_series.series_id as reference_id,
    user_hidden_schedule_series.series_id,
    null::text as occurrence_id,
    user_hidden_schedule_series.updated_at
  from public.user_hidden_schedule_series

  union all

  select
    user_hidden_schedule_occurrences.user_id,
    'occurrence'::text as hidden_scope,
    user_hidden_schedule_occurrences.occurrence_id as reference_id,
    null::text as series_id,
    user_hidden_schedule_occurrences.occurrence_id,
    user_hidden_schedule_occurrences.updated_at
  from public.user_hidden_schedule_occurrences;

comment on view public.user_hidden_schedule_entries is
  'Kanonische Sicht auf alle ausgeblendeten Termine eines Nutzers. hidden_scope unterscheidet fachlich zwischen Terminreihe und Einzeltermin.';

comment on column public.user_hidden_schedule_entries.hidden_scope is
  'Fachlicher Scope des Hidden-Eintrags: series für komplette Terminreihe, occurrence für einen Einzeltermin.';

comment on column public.user_hidden_schedule_entries.reference_id is
  'Normalisierte Referenz-ID innerhalb des jeweiligen hidden_scope. Zusammen mit user_id und hidden_scope fachlich eindeutig.';

create or replace function public.resolve_schedule_hidden_state(
  selected_user_id uuid,
  selected_series_id text default null,
  selected_occurrence_id text default null
)
returns table (
  is_hidden_series boolean,
  is_hidden_occurrence boolean,
  is_hidden boolean,
  hidden_by text
)
language sql
stable
set search_path = public
as $$
  with normalized as (
    select
      nullif(trim(coalesce(selected_series_id, '')), '') as normalized_series_id,
      nullif(trim(coalesce(selected_occurrence_id, '')), '') as normalized_occurrence_id
  ),
  flags as (
    select
      exists (
        select 1
        from public.user_hidden_schedule_series
        where user_hidden_schedule_series.user_id = selected_user_id
          and user_hidden_schedule_series.series_id = normalized.normalized_series_id
      ) as is_hidden_series,
      exists (
        select 1
        from public.user_hidden_schedule_occurrences
        where user_hidden_schedule_occurrences.user_id = selected_user_id
          and user_hidden_schedule_occurrences.occurrence_id = normalized.normalized_occurrence_id
      ) as is_hidden_occurrence
    from normalized
  )
  select
    flags.is_hidden_series,
    flags.is_hidden_occurrence,
    (flags.is_hidden_series or flags.is_hidden_occurrence) as is_hidden,
    case
      when flags.is_hidden_series and flags.is_hidden_occurrence then 'series+occurrence'
      when flags.is_hidden_series then 'series'
      when flags.is_hidden_occurrence then 'occurrence'
      else 'visible'
    end as hidden_by
  from flags;
$$;

comment on function public.resolve_schedule_hidden_state(uuid, text, text) is
  'Zentrale Auswertungsregel für Termin-Sichtbarkeit: sichtbar nur dann, wenn weder die Terminreihe noch das konkrete Einzelvorkommen für den Nutzer ausgeblendet ist.';

create or replace function public.get_demo_user_hidden_schedule_entries()
returns table (
  hidden_scope text,
  reference_id text,
  series_id text,
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
    user_hidden_schedule_entries.hidden_scope,
    user_hidden_schedule_entries.reference_id,
    user_hidden_schedule_entries.series_id,
    user_hidden_schedule_entries.occurrence_id,
    user_hidden_schedule_entries.updated_at
  from public.user_hidden_schedule_entries
  where user_hidden_schedule_entries.user_id = resolved_user.id
  order by
    user_hidden_schedule_entries.updated_at desc,
    user_hidden_schedule_entries.hidden_scope,
    user_hidden_schedule_entries.reference_id;
end;
$$;

comment on function public.get_demo_user_hidden_schedule_entries() is
  'Liefert alle ausgeblendeten Termine des aufgelösten Dashboard-Nutzers inklusive fachlicher Scope-Unterscheidung.';

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
    visibility.is_hidden_series,
    visibility.is_hidden_occurrence,
    visibility.is_hidden
  from scheduled
  left join lateral public.resolve_schedule_hidden_state(
    resolved_user.id,
    scheduled.series_id,
    scheduled.occurrence_id
  ) as visibility on true
  order by
    scheduled.weekday_index,
    scheduled.start_time_minutes,
    scheduled.module_code;
end;
$$;

revoke all on function public.get_demo_user_hidden_schedule_entries() from public;

grant execute on function public.get_demo_user_hidden_schedule_entries() to anon;
grant execute on function public.get_demo_user_hidden_schedule_entries() to authenticated;