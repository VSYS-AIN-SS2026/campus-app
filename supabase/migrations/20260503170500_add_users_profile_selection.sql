create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  study_program_id uuid,
  spo_id uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_email_key'
  ) then
    alter table public.users
      add constraint users_email_key unique (email);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'spos_id_study_program_id_key'
  ) then
    alter table public.spos
      add constraint spos_id_study_program_id_key unique (id, study_program_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_study_program_id_fkey'
  ) then
    alter table public.users
      add constraint users_study_program_id_fkey
      foreign key (study_program_id) references public.study_programs(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_spo_program_fkey'
  ) then
    alter table public.users
      add constraint users_spo_program_fkey
      foreign key (spo_id, study_program_id) references public.spos(id, study_program_id);
  end if;
end $$;

create index if not exists users_study_program_id_idx on public.users (study_program_id);
create index if not exists users_spo_id_idx on public.users (spo_id);
