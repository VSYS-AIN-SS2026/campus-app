-- ── 1. Stable upsert key for lsf_events ─────────────────────────────────────
-- (series_id, start_date) uniquely identifies one occurrence within a series.
-- Deduplicate any rows left by previous delete+insert runs first, then create
-- the unique index so future upserts can use it.

-- Keep the highest-id row for each (series_id, start_date) pair; delete rest.
delete from lsf_events a
using lsf_events b
where a.series_id is not null
  and a.series_id  = b.series_id
  and a.start_date = b.start_date
  and a.id < b.id;

create unique index if not exists lsf_events_series_date_unique
  on lsf_events(series_id, start_date)
  where series_id is not null;

-- ── 2. ABSTGVNR on study_programs ────────────────────────────────────────────
-- Stores the LSF study program version ID so the scraper can discover
-- all programs automatically without manual env configuration.
alter table study_programs
  add column if not exists lsf_abstgvnr text;

-- ── 3. SPO-based import check ─────────────────────────────────────────────────
-- Returns true if LSF data for the current semester already exists for the
-- study program linked to a given SPO. Called by the frontend after SPO selection.
create or replace function public.lsf_import_exists_for_spo(p_spo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lsf_import_runs r
    join study_programs sp on sp.code = r.study_program_code
    join spos s on s.study_program_id = sp.id
    where s.id = p_spo_id
      and r.status = 'success'
      -- current semester: SS = March–September, WS = October–February
      and r.term = case
        when extract(month from now()) between 3 and 9
          then 'SS' || extract(year from now())::text
        else 'WS' || extract(year from now())::text || '/'
             || lpad(((extract(year from now())::int + 1) % 100)::text, 2, '0')
      end
  )
$$;

grant execute on function public.lsf_import_exists_for_spo(uuid) to anon, authenticated;
