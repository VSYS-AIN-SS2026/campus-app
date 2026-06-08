-- Extends get_team_week_schedule to include personal appointments for the given
-- week alongside recurring timetable slots. Adds p_week_start and p_time_zone
-- parameters (both have defaults so existing callers keep working).

CREATE OR REPLACE FUNCTION public.get_team_week_schedule(
  p_team_id    UUID,
  p_week_start DATE DEFAULT CURRENT_DATE,
  p_time_zone  TEXT DEFAULT 'Europe/Berlin'
)
RETURNS TABLE (
  member_id   UUID,
  member_name TEXT,
  day_index   SMALLINT,
  start_time  TIME,
  end_time    TIME,
  title       TEXT,
  status      TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monday DATE;
BEGIN
  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: not a team member';
  END IF;

  v_monday := p_week_start - (EXTRACT(ISODOW FROM p_week_start)::INTEGER - 1);

  RETURN QUERY
  -- Recurring timetable slots (LEFT JOIN keeps members with no events in legend)
  SELECT
    tm.user_id                                        AS member_id,
    COALESCE(u.full_name, u.email)                    AS member_name,
    ue.day_index,
    ue.start_time,
    ue.end_time,
    ue.title,
    COALESCE(ue.status, 'belegt')::TEXT               AS status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  LEFT JOIN public.user_events ue ON ue.user_id = u.id
  WHERE tm.team_id = p_team_id

  UNION ALL

  -- Personal appointments for the given week
  SELECT
    tm.user_id                                                                          AS member_id,
    COALESCE(u.full_name, u.email)                                                      AS member_name,
    ((EXTRACT(ISODOW FROM (pa.starts_at AT TIME ZONE p_time_zone)) - 1)::SMALLINT)     AS day_index,
    (pa.starts_at AT TIME ZONE p_time_zone)::TIME                                       AS start_time,
    (pa.ends_at   AT TIME ZONE p_time_zone)::TIME                                       AS end_time,
    pa.title,
    'belegt'::TEXT                                                                      AS status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  JOIN public.personal_appointments pa ON pa.user_id = u.id
  WHERE tm.team_id = p_team_id
    AND (pa.starts_at AT TIME ZONE p_time_zone)::DATE >= v_monday
    AND (pa.starts_at AT TIME ZONE p_time_zone)::DATE <= v_monday + 6

  ORDER BY 2 NULLS LAST, 3 NULLS LAST, 4 NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) TO authenticated;
