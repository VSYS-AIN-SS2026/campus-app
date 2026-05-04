create table if not exists public.user_module_statuses (
  user_id uuid not null references public.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  status text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, module_id),
  constraint user_module_statuses_status_check
    check (status in ('offen', 'belegt', 'abgeschlossen'))
);

create index if not exists user_module_statuses_module_id_idx
  on public.user_module_statuses (module_id);

create index if not exists user_module_statuses_user_status_idx
  on public.user_module_statuses (user_id, status);

drop trigger if exists update_user_module_statuses_updated_at on public.user_module_statuses;

create trigger update_user_module_statuses_updated_at
  before update on public.user_module_statuses
  for each row
  execute function public.update_updated_at_column();

alter table public.user_module_statuses enable row level security;

revoke all on table public.user_module_statuses from anon;
revoke all on table public.user_module_statuses from authenticated;

create or replace function public.get_demo_user_module_statuses(selected_module_ids uuid[] default null)
returns table (
  module_id uuid,
  status text,
  updated_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    user_module_statuses.module_id,
    user_module_statuses.status,
    user_module_statuses.updated_at
  from public.user_module_statuses
  join public.users
    on users.id = user_module_statuses.user_id
  where users.email = 'alex.beispiel@htwg-konstanz.de'
    and (
      selected_module_ids is null
      or user_module_statuses.module_id = any(selected_module_ids)
    );
$$;

create or replace function public.save_demo_user_module_status(
  selected_module_id uuid,
  selected_status text
)
returns table (
  module_id uuid,
  status text,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_user public.users;
  normalized_status text;
  saved_status public.user_module_statuses;
  selected_spo_id uuid;
begin
  if selected_module_id is null then
    raise exception 'module is required';
  end if;

  normalized_status := lower(trim(coalesce(selected_status, '')));

  if normalized_status not in ('offen', 'belegt', 'abgeschlossen') then
    raise exception 'invalid module status';
  end if;

  select users.spo_id
  into selected_spo_id
  from public.users
  where users.email = 'alex.beispiel@htwg-konstanz.de'
  limit 1;

  if selected_spo_id is null then
    raise exception 'demo user has no selected spo';
  end if;

  if not exists (
    select 1
    from public.module_handbooks
    join public.module_handbook_entries
      on module_handbook_entries.handbook_id = module_handbooks.id
    where module_handbooks.spo_id = selected_spo_id
      and module_handbook_entries.module_id = selected_module_id
  ) then
    raise exception 'invalid module for selected spo';
  end if;

  insert into public.users (
    email,
    full_name,
    updated_at
  )
  values (
    'alex.beispiel@htwg-konstanz.de',
    'Alex Beispiel',
    now()
  )
  on conflict on constraint users_email_key
  do update set
    full_name = excluded.full_name,
    updated_at = now()
  returning * into demo_user;

  insert into public.user_module_statuses (
    user_id,
    module_id,
    status
  )
  values (
    demo_user.id,
    selected_module_id,
    normalized_status
  )
  on conflict on constraint user_module_statuses_pkey
  do update set
    status = excluded.status,
    updated_at = now()
  returning * into saved_status;

  return query
  select
    saved_status.module_id,
    saved_status.status,
    saved_status.updated_at;
end;
$$;

revoke all on function public.get_demo_user_module_statuses(uuid[]) from public;
revoke all on function public.save_demo_user_module_status(uuid, text) from public;

grant execute on function public.get_demo_user_module_statuses(uuid[]) to anon;
grant execute on function public.get_demo_user_module_statuses(uuid[]) to authenticated;
grant execute on function public.save_demo_user_module_status(uuid, text) to anon;
grant execute on function public.save_demo_user_module_status(uuid, text) to authenticated;
