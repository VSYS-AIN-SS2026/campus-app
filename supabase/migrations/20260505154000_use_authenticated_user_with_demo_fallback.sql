create or replace function public.resolve_dashboard_user()
returns public.users
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_user_id uuid;
  current_auth_email text;
  current_auth_name text;
  resolved_user public.users;
begin
  current_auth_user_id := auth.uid();

  if current_auth_user_id is not null then
    select
      lower(au.email),
      coalesce(
        nullif(trim(concat_ws(
          ' ',
          nullif(trim(coalesce(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'given_name', '')), ''),
          nullif(trim(coalesce(au.raw_user_meta_data->>'last_name', au.raw_user_meta_data->>'family_name', '')), '')
        )), ''),
        nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), '')
      )
    into
      current_auth_email,
      current_auth_name
    from auth.users as au
    where au.id = current_auth_user_id
    limit 1;

    if current_auth_name is not null then
      insert into public.users (
        auth_user_id,
        email,
        full_name,
        updated_at
      )
      values (
        current_auth_user_id,
        coalesce(current_auth_email, current_auth_user_id::text || '@no-email.local'),
        current_auth_name,
        now()
      )
      on conflict on constraint users_auth_user_id_key
      do update set
        email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now()
      returning * into resolved_user;

      return resolved_user;
    end if;
  end if;

  select *
  into resolved_user
  from public.users
  where users.email = 'alex.beispiel@htwg-konstanz.de'
  limit 1;

  if resolved_user.id is null then
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
      updated_at = now()
    returning * into resolved_user;
  end if;

  return resolved_user;
end;
$$;

create or replace function public.get_demo_user_profile()
returns table (
  id uuid,
  full_name text,
  email text,
  study_program_id uuid,
  spo_id uuid,
  created_at timestamp with time zone,
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
    resolved_user.id,
    resolved_user.full_name,
    resolved_user.email,
    resolved_user.study_program_id,
    resolved_user.spo_id,
    resolved_user.created_at,
    resolved_user.updated_at;
end;
$$;

create or replace function public.save_demo_user_profile_selection(
  selected_study_program_id uuid,
  selected_spo_id uuid
)
returns table (
  id uuid,
  full_name text,
  email text,
  study_program_id uuid,
  spo_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_user public.users;
begin
  if selected_study_program_id is null then
    raise exception 'study program is required';
  end if;

  if not exists (
    select 1
    from public.study_programs
    where study_programs.id = selected_study_program_id
  ) then
    raise exception 'invalid study program';
  end if;

  if selected_spo_id is not null and not exists (
    select 1
    from public.spos
    where spos.id = selected_spo_id
      and spos.study_program_id = selected_study_program_id
  ) then
    raise exception 'invalid spo';
  end if;

  select * into saved_user from public.resolve_dashboard_user();

  update public.users
  set
    study_program_id = selected_study_program_id,
    spo_id = selected_spo_id,
    updated_at = now()
  where users.id = saved_user.id
  returning * into saved_user;

  return query
  select
    saved_user.id,
    saved_user.full_name,
    saved_user.email,
    saved_user.study_program_id,
    saved_user.spo_id,
    saved_user.created_at,
    saved_user.updated_at;
end;
$$;

create or replace function public.get_demo_user_module_statuses(selected_module_ids uuid[] default null)
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
  resolved_user public.users;
begin
  select * into resolved_user from public.resolve_dashboard_user();

  return query
  select
    user_module_statuses.module_id,
    user_module_statuses.status,
    user_module_statuses.updated_at
  from public.user_module_statuses
  where user_module_statuses.user_id = resolved_user.id
    and (
      selected_module_ids is null
      or user_module_statuses.module_id = any(selected_module_ids)
    );
end;
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
  resolved_user public.users;
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

  select * into resolved_user from public.resolve_dashboard_user();
  selected_spo_id := resolved_user.spo_id;

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

  insert into public.user_module_statuses (
    user_id,
    module_id,
    status
  )
  values (
    resolved_user.id,
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

revoke all on function public.resolve_dashboard_user() from public;
revoke all on function public.get_demo_user_profile() from public;
revoke all on function public.save_demo_user_profile_selection(uuid, uuid) from public;
revoke all on function public.get_demo_user_module_statuses(uuid[]) from public;
revoke all on function public.save_demo_user_module_status(uuid, text) from public;

grant execute on function public.get_demo_user_profile() to anon;
grant execute on function public.get_demo_user_profile() to authenticated;
grant execute on function public.save_demo_user_profile_selection(uuid, uuid) to anon;
grant execute on function public.save_demo_user_profile_selection(uuid, uuid) to authenticated;
grant execute on function public.get_demo_user_module_statuses(uuid[]) to anon;
grant execute on function public.get_demo_user_module_statuses(uuid[]) to authenticated;
grant execute on function public.save_demo_user_module_status(uuid, text) to anon;
grant execute on function public.save_demo_user_module_status(uuid, text) to authenticated;
