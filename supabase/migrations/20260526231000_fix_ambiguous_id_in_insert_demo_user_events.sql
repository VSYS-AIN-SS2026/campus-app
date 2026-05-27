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
  v_user_id uuid;
  v_event jsonb;
begin
  select public.users.id into v_user_id
  from public.users
  where email = 'alex.beispiel@htwg-konstanz.de';

  if v_user_id is null then
    raise exception 'Demo user not found';
  end if;

  for v_event in select * from jsonb_array_elements(events)
  loop
    return query
    insert into public.user_events (
      user_id, lsf_event_id, title, subtitle,
      day_index, start_time, end_time, series_id, status
    ) values (
      v_user_id,
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

revoke all on function public.insert_demo_user_events(jsonb) from public;
grant execute on function public.insert_demo_user_events(jsonb) to anon;
grant execute on function public.insert_demo_user_events(jsonb) to authenticated;
