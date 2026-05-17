create table if not exists public.user_hidden_schedule_series (
  user_id uuid not null references public.users(id) on delete cascade,
  series_id text not null,
  updated_at timestamp with time zone not null default now(),
  constraint user_hidden_schedule_series_pkey primary key (user_id, series_id),
  constraint user_hidden_schedule_series_series_id_check check (char_length(trim(series_id)) > 0)
);

create index if not exists user_hidden_schedule_series_series_id_idx
  on public.user_hidden_schedule_series (series_id);

alter table public.user_hidden_schedule_series enable row level security;

create policy "users can read own hidden series"
  on public.user_hidden_schedule_series
  for select
  to authenticated
  using (exists (
    select 1
    from public.users
    where users.id = user_hidden_schedule_series.user_id
      and users.auth_user_id = auth.uid()
  ));

create policy "users can insert own hidden series"
  on public.user_hidden_schedule_series
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.users
    where users.id = user_hidden_schedule_series.user_id
      and users.auth_user_id = auth.uid()
  ));

create or replace function public.get_demo_user_hidden_schedule_series_ids()
returns table (
  series_id text,
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
    user_hidden_schedule_series.series_id,
    user_hidden_schedule_series.updated_at
  from public.user_hidden_schedule_series
  where user_hidden_schedule_series.user_id = resolved_user.id;
end;
$$;

create or replace function public.hide_demo_user_schedule_series(
  selected_series_id text
)
returns table (
  series_id text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
  normalized_series_id text;
  saved_row public.user_hidden_schedule_series;
begin
  normalized_series_id := trim(coalesce(selected_series_id, ''));

  if normalized_series_id = '' then
    raise exception 'series id is required';
  end if;

  select * into resolved_user from public.resolve_dashboard_user();

  insert into public.user_hidden_schedule_series (
    user_id,
    series_id
  )
  values (
    resolved_user.id,
    normalized_series_id
  )
  on conflict on constraint user_hidden_schedule_series_pkey
  do update set
    updated_at = now()
  returning * into saved_row;

  return query
  select
    saved_row.series_id,
    saved_row.updated_at;
end;
$$;

create or replace function public.show_demo_user_schedule_series(
  selected_series_id text
)
returns table (
  series_id text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
  normalized_series_id text;
begin
  normalized_series_id := trim(coalesce(selected_series_id, ''));

  if normalized_series_id = '' then
    raise exception 'series id is required';
  end if;

  select * into resolved_user from public.resolve_dashboard_user();

  delete from public.user_hidden_schedule_series
  where user_hidden_schedule_series.user_id = resolved_user.id
    and user_hidden_schedule_series.series_id = normalized_series_id;

  return query
  select
    normalized_series_id,
    now();
end;
$$;

revoke all on function public.get_demo_user_hidden_schedule_series_ids() from public;
revoke all on function public.hide_demo_user_schedule_series(text) from public;
revoke all on function public.show_demo_user_schedule_series(text) from public;

grant execute on function public.get_demo_user_hidden_schedule_series_ids() to anon;
grant execute on function public.get_demo_user_hidden_schedule_series_ids() to authenticated;
grant execute on function public.hide_demo_user_schedule_series(text) to anon;
grant execute on function public.hide_demo_user_schedule_series(text) to authenticated;
grant execute on function public.show_demo_user_schedule_series(text) to anon;
grant execute on function public.show_demo_user_schedule_series(text) to authenticated;
