-- Fix get_demo_user_events and insert_demo_user_events to use
-- resolve_dashboard_user() instead of hardcoding the demo user email.

create or replace function public.get_demo_user_events()
returns table (
  id            uuid,
  lsf_event_id  uuid,
  title         text,
  subtitle      text,
  day_index     smallint,
  start_time    time,
  end_time      time,
  series_id     text,
  status        text,
  created_at    timestamptz
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
  select ue.id, ue.lsf_event_id, ue.title, ue.subtitle,
         ue.day_index, ue.start_time, ue.end_time,
         ue.series_id, ue.status, ue.created_at
  from public.user_events ue
  where ue.user_id = resolved_user.id
  order by ue.created_at;
end;
$$;

create or replace function public.insert_demo_user_events(
  events jsonb
)
returns table (
  id            uuid,
  user_id       uuid,
  lsf_event_id  uuid,
  title         text,
  subtitle      text,
  day_index     smallint,
  start_time    time,
  end_time      time,
  series_id     text,
  status        text,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
  v_event jsonb;
begin
  select * into resolved_user from public.resolve_dashboard_user();

  if resolved_user.id is null then
    raise exception 'User not found';
  end if;

  for v_event in select * from jsonb_array_elements(events)
  loop
    return query
    insert into public.user_events (
      user_id, lsf_event_id, title, subtitle,
      day_index, start_time, end_time, series_id, status
    ) values (
      resolved_user.id,
      (v_event->>'lsf_event_id')::uuid,
      v_event->>'title',
      v_event->>'subtitle',
      (v_event->>'day_index')::smallint,
      (v_event->>'start_time')::time,
      (v_event->>'end_time')::time,
      v_event->>'series_id',
      coalesce(v_event->>'status', 'belegt')
    )
    returning *;
  end loop;
end;
$$;
