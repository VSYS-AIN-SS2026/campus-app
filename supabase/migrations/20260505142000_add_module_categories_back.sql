create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null,
  color text not null default 'slate',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_categories_updated_at'
  ) then
    create trigger update_categories_updated_at
      before update on public.categories
      for each row
      execute function public.update_updated_at_column();
  end if;
end $$;

create table if not exists public.module_category_entries (
  module_id uuid not null references public.modules(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (module_id, category_id)
);

create index if not exists module_category_entries_category_id_idx
  on public.module_category_entries (category_id);

insert into public.categories (name, type, color)
values
  ('Studium Generale', 'kontext', 'teal'),
  ('Interdisziplinär', 'kontext', 'violet'),
  ('Praxisprojekt', 'kontext', 'blue'),
  ('Labor', 'kontext', 'green'),
  ('International', 'thema', 'cyan'),
  ('Nachhaltigkeit', 'thema', 'lime'),
  ('Ethik', 'thema', 'amber'),
  ('Soft Skills', 'thema', 'pink'),
  ('Gründung', 'thema', 'orange'),
  ('Forschung', 'kontext', 'indigo')
on conflict (name) do update set
  type = excluded.type,
  color = excluded.color,
  updated_at = now();

create or replace function public.get_module_categories(selected_module_ids uuid[] default null)
returns table (
  module_id uuid,
  category_id uuid,
  name text,
  color text,
  type text
)
language sql
security definer
set search_path = public
as $$
  select
    mce.module_id,
    c.id as category_id,
    c.name,
    c.color,
    c.type
  from public.module_category_entries mce
  join public.categories c on c.id = mce.category_id
  where selected_module_ids is null
    or mce.module_id = any(selected_module_ids)
  order by c.type, c.name;
$$;

create or replace function public.save_module_categories(
  selected_module_id uuid,
  selected_category_ids uuid[] default null
)
returns table (
  category_id uuid,
  name text,
  color text,
  type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_category_ids uuid[] := coalesce(selected_category_ids, array[]::uuid[]);
begin
  if selected_module_id is null then
    raise exception 'module id is required';
  end if;

  if not exists (
    select 1
    from public.modules
    where modules.id = selected_module_id
  ) then
    raise exception 'invalid module';
  end if;

  if exists (
    select 1
    from unnest(normalized_category_ids) as selected_category_id
    left join public.categories on categories.id = selected_category_id
    where categories.id is null
  ) then
    raise exception 'invalid category';
  end if;

  delete from public.module_category_entries
  where module_id = selected_module_id
    and (
      cardinality(normalized_category_ids) = 0
      or category_id <> all(normalized_category_ids)
    );

  insert into public.module_category_entries (module_id, category_id)
  select selected_module_id, selected_category_id
  from unnest(normalized_category_ids) as selected_category_id
  on conflict (module_id, category_id) do nothing;

  return query
  select
    c.id as category_id,
    c.name,
    c.color,
    c.type
  from public.module_category_entries mce
  join public.categories c on c.id = mce.category_id
  where mce.module_id = selected_module_id
  order by c.type, c.name;
end;
$$;

grant select on public.categories to anon;
grant select on public.categories to authenticated;
grant select on public.module_category_entries to anon;
grant select on public.module_category_entries to authenticated;

revoke all on function public.get_module_categories(uuid[]) from public;
revoke all on function public.save_module_categories(uuid, uuid[]) from public;

grant execute on function public.get_module_categories(uuid[]) to anon;
grant execute on function public.get_module_categories(uuid[]) to authenticated;
grant execute on function public.save_module_categories(uuid, uuid[]) to anon;
grant execute on function public.save_module_categories(uuid, uuid[]) to authenticated;