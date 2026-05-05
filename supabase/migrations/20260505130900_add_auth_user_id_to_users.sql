alter table public.users
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_auth_user_id_fkey'
  ) then
    alter table public.users
      add constraint users_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_auth_user_id_key'
  ) then
    alter table public.users
      add constraint users_auth_user_id_key unique (auth_user_id);
  end if;
end $$;

update public.users as u
set auth_user_id = au.id
from auth.users as au
where u.auth_user_id is null
  and lower(u.email) = lower(au.email);
