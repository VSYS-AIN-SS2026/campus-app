-- Marks individual event occurrences that LSF reports as cancelled (Ausfall).
-- The series_id / course_id relationship is preserved so the cancelled occurrence
-- can still be displayed in the timetable (e.g. greyed out or with a notice).
alter table lsf_events add column if not exists cancelled boolean not null default false;

create index if not exists lsf_events_cancelled_idx on lsf_events(cancelled) where cancelled = true;
