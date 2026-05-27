-- ============================================================
-- user_events: stores imported LSF events for each demo user
-- The weekly calendar reads from this table via frontend state
-- ============================================================

create table if not exists public.user_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  lsf_event_id  uuid references public.lsf_events(id) on delete set null,
  title         text not null,
  subtitle      text,
  day_index     smallint not null check (day_index between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  series_id     text not null,
  status        text not null default 'belegt',
  created_at    timestamptz not null default now()
);

alter table public.user_events enable row level security;

create policy "user_events_select_own" on public.user_events
  for select to authenticated
  using (exists (
    select 1 from public.users
    where users.id = user_events.user_id
      and users.auth_user_id = auth.uid()
  ));

create policy "user_events_insert_own" on public.user_events
  for insert to authenticated
  with check (exists (
    select 1 from public.users
    where users.id = user_events.user_id
      and users.auth_user_id = auth.uid()
  ));

create policy "user_events_delete_own" on public.user_events
  for delete to authenticated
  using (exists (
    select 1 from public.users
    where users.id = user_events.user_id
      and users.auth_user_id = auth.uid()
  ));

-- RPC for demo user (same pattern as save_demo_user_module_status)
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

-- RPC to fetch user events for the demo user (same pattern as get_demo_user_hidden_schedule_series_ids)
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
begin
  return query
  select ue.id, ue.lsf_event_id, ue.title, ue.subtitle,
         ue.day_index, ue.start_time, ue.end_time,
         ue.series_id, ue.status, ue.created_at
  from public.user_events ue
  join public.users u on u.id = ue.user_id
  where u.email = 'alex.beispiel@htwg-konstanz.de'
  order by ue.created_at;
end;
$$;

revoke all on function public.get_demo_user_events() from public;
grant execute on function public.get_demo_user_events() to anon;
grant execute on function public.get_demo_user_events() to authenticated;
