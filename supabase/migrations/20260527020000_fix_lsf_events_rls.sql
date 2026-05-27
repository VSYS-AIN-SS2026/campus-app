alter table lsf_events enable row level security;
alter table rooms enable row level security;

-- public read
drop policy if exists "Enable read access for all users" on lsf_events;
create policy "lsf_events_select" on lsf_events for select using (true);
create policy "rooms_select" on rooms for select using (true);

-- scraper writes (service_role bypasses RLS automatically;
-- this policy covers anon/authenticated for local test runs)
create policy "lsf_events_insert" on lsf_events for insert with check (true);
create policy "lsf_events_update" on lsf_events for update using (true);
create policy "lsf_events_delete" on lsf_events for delete using (true);
create policy "rooms_insert" on rooms for insert with check (true);
create policy "rooms_update" on rooms for update using (true);
