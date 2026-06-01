-- Marks courses that were auto-created from LSF with an unrecognised event type.
-- These need manual review to assign the correct course_type.
alter table courses add column if not exists faulty boolean not null default false;

create index if not exists courses_faulty_idx on courses(faulty) where faulty = true;
