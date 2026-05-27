-- series_id groups recurring events belonging to the same Veranstaltungsserie
-- format: "{course_id}::{weekday}::{start_time}"
alter table lsf_events add column if not exists series_id text;

create index if not exists lsf_events_series_id_idx on lsf_events(series_id);
