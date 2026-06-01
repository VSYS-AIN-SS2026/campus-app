-- semester-based skip-check requires term on import runs
alter table lsf_import_runs add column if not exists term text;

create index if not exists lsf_import_runs_term_idx on lsf_import_runs(term);
