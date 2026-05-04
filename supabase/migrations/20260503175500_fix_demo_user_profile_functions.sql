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

  insert into public.users (
    email,
    full_name,
    spo_id,
    study_program_id,
    updated_at
  )
  values (
    'alex.beispiel@htwg-konstanz.de',
    'Alex Beispiel',
    selected_spo_id,
    selected_study_program_id,
    now()
  )
  on conflict on constraint users_email_key
  do update set
    full_name = excluded.full_name,
    spo_id = excluded.spo_id,
    study_program_id = excluded.study_program_id,
    updated_at = now()
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
