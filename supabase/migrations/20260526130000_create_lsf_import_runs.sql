drop table if exists lsf_import_runs;

create table lsf_import_runs (
  id                  uuid primary key default gen_random_uuid(),
  study_program_code  text not null,
  lsf_abstgvnr        text not null,
  status              text not null,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz null,
  events_found        int null,
  events_inserted     int null,
  events_updated      int null,
  events_deactivated  int null,
  error_msg           text null
);
