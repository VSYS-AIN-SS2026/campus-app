-- Enrich get_demo_user_events to dynamically build subtitle with room + coordinator
-- from the linked lsf_event → course, so already-imported events show this info.

create or replace function public.get_demo_user_events()
returns table (
  id            uuid,
  lsf_event_id  uuid,
  title         text,
  subtitle      text,
  day_index     smallint,
  start_time    time,
  end_time      time,
  series_id     text,
  status        text,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_user public.users;
begin
  select * into resolved_user from public.resolve_dashboard_user();

  return query
  select
    ue.id,
    ue.lsf_event_id,
    ue.title,
    -- Build enriched subtitle: event_type · room · coordinator
    coalesce(
      nullif(
        concat_ws(' · ',
          nullif(ue.subtitle, ''),
          case
            when le.room_building is not null and le.room_number is not null
                 and ue.subtitle not like '%' || le.room_building || ' ' || le.room_number || '%'
            then le.room_building || ' ' || le.room_number
          end,
          case
            when c.coordinator is not null
                 and ue.subtitle not like '%' || c.coordinator || '%'
            then c.coordinator
          end
        ),
        ''
      ),
      ue.subtitle
    ) as subtitle,
    ue.day_index,
    ue.start_time,
    ue.end_time,
    ue.series_id,
    ue.status,
    ue.created_at
  from public.user_events ue
  left join public.lsf_events le on le.id = ue.lsf_event_id
  left join public.courses c on c.id = le.course_id
  where ue.user_id = resolved_user.id
  order by ue.created_at;
end;
$$;
