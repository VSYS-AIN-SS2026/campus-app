-- Add lecturer (Dozent) column to lsf_events and populate room_type on rooms.
-- Both fields were already present in the scraped HTML but not stored.

alter table lsf_events
  add column if not exists lecturer text null;

comment on column lsf_events.lecturer is
  'Per-event lecturer name scraped from the Termine table Dozent column';
