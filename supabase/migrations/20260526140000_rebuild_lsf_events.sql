drop table if exists neue_tabelle;

truncate table lsf_events restart identity cascade;

alter table lsf_events
  drop column if exists title,
  drop column if exists semester,
  drop column if exists lsf_course_id,
  drop column if exists lsf_group_id,
  drop column if exists notes,
  add column if not exists term text not null default 'unknown',
  add column if not exists module_id uuid null references modules(id),
  add column if not exists rhythm smallint not null default -1,
  add column if not exists study_semesters text null;

alter table lsf_events
  drop column if exists study_semesters;

create index if not exists lsf_events_module_id_idx on lsf_events(module_id);
create index if not exists lsf_events_term_idx on lsf_events(term);

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_type = 'PRIMARY KEY'
      and table_schema = 'public'
      and table_name = 'rooms'
  ) then
    alter table rooms add primary key (building, room_number);
  end if;

  if not exists (
    select 1 from information_schema.table_constraints tc
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'lsf_events'
      and exists (
        select 1 from information_schema.constraint_column_usage ccu
        where ccu.constraint_name = tc.constraint_name
          and ccu.table_schema = 'public'
          and ccu.table_name = 'rooms'
      )
  ) then
    alter table lsf_events
      add foreign key (room_building, room_number) references rooms(building, room_number);
  end if;
end $$;
