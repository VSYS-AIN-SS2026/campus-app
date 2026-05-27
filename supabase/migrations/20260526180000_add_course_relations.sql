alter table courses
  add column if not exists lsf_veranstid text null unique;

create index if not exists courses_lsf_veranstid_idx on courses(lsf_veranstid);

alter table modules
  add column if not exists study_program_id uuid null references study_programs(id);

create index if not exists modules_study_program_id_idx on modules(study_program_id);

alter table lsf_events
  drop column if exists module_id,
  drop column if exists lecturer,
  add column if not exists course_id uuid null references courses(id);

create index if not exists lsf_events_course_id_idx on lsf_events(course_id);
