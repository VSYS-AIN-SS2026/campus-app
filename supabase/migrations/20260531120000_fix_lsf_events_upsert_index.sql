-- Replace partial unique index with a full unique index.
-- The partial index (WHERE series_id IS NOT NULL) is not recognized by PostgREST
-- for onConflict upserts. Since series_id is always populated by the scraper,
-- a standard unique index works and is compatible with Supabase JS upsert.

drop index if exists lsf_events_series_date_unique;

create unique index lsf_events_series_date_unique
  on lsf_events(series_id, start_date);
