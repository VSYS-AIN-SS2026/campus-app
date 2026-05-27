-- Step 1: Drop existing data and tables
truncate table lsf_events restart identity cascade;
drop table if exists rooms cascade;
drop table if exists lsf_events cascade;

-- Step 2: Create rooms
create table rooms (
  building     text not null,
  room_number  text not null,
  room_type    text null,
  created_at   timestamptz not null default now(),
  primary key (building, room_number)
);

-- Step 3: Create lsf_events
--
-- event_type mapping (use in scraper or as app-level enum):
--   'Vorlesung'        -> 'lecture'
--   'Übung'            -> 'exercise'
--   'Praktikum'        -> 'lab'
--   'Seminar'          -> 'seminar'
--   'Vorlesung/Übung'  -> 'mixed'
--   anything else      -> 'other'
--
create table lsf_events (
  id              uuid primary key default gen_random_uuid(),
  semester        text not null,
  lsf_course_id   text null,
  lsf_group_id    text null,
  title           text not null,
  event_type      text not null,
  weekday         text null,
  start_date      date not null,
  end_date        date not null,
  start_time      time not null,
  end_time        time not null,
  room_building   text null,
  room_number     text null,
  lecturer        text null,
  status          text null,
  notes           text null,
  source_url      text null,
  raw_payload     jsonb null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (room_building, room_number)
    references rooms(building, room_number)
);

create index on rooms(building, room_number);
create index on lsf_events(semester);
create index on lsf_events(room_building, room_number);
create index on lsf_events(start_date, end_date);
