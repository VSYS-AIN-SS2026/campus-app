drop index if exists courses_lsf_veranstid_idx;

alter table courses drop column if exists lsf_veranstid;

alter table modules
  add column if not exists lsf_veranstid text null unique;

create index if not exists modules_lsf_veranstid_idx on modules(lsf_veranstid);
