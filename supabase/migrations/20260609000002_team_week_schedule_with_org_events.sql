-- ============================================================
-- Erweitert get_team_week_schedule um einen optionalen Wochenparameter.
-- Wenn p_week_start angegeben ist, werden zusätzlich gespeicherte
-- Organisations-Events der Team-Mitglieder für diese Woche als
-- Stundenplan-Slots zurückgegeben (analog zu user_events).
-- Die alte Signatur (UUID) wird entfernt, damit der neue optionale
-- Parameter greifen kann.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_team_week_schedule(UUID);
DROP FUNCTION IF EXISTS public.get_team_week_schedule(UUID, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.get_team_week_schedule(
  p_team_id    UUID,
  p_week_start DATE DEFAULT NULL,
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
  v_monday   DATE;
  v_week_end DATE;
BEGIN
  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: not a team member';
  END IF;

  IF p_week_start IS NOT NULL THEN
    v_monday   := p_week_start - (EXTRACT(ISODOW FROM p_week_start)::INTEGER - 1);
    v_week_end := v_monday + 7;
  END IF;

  RETURN QUERY
  -- Wiederkehrende Stundenplan-Slots (user_events)
  SELECT
    tm.user_id                     AS member_id,
    COALESCE(u.full_name, u.email) AS member_name,
    ue.day_index,
    ue.start_time,
    ue.end_time,
    ue.title,
    ue.status
  FROM public.team_members tm
  JOIN  public.users u  ON u.auth_user_id = tm.user_id
  LEFT JOIN public.user_events ue ON ue.user_id = u.id
  WHERE tm.team_id = p_team_id

  UNION ALL

  -- Gespeicherte Organisations-Events der aktuellen Woche
  SELECT
    tm.user_id                                                                               AS member_id,
    COALESCE(u.full_name, u.email)                                                           AS member_name,
    ((EXTRACT(ISODOW FROM (oe.starts_at AT TIME ZONE p_time_zone))::INTEGER - 1)::SMALLINT) AS day_index,
    (oe.starts_at AT TIME ZONE p_time_zone)::TIME                                            AS start_time,
    (oe.ends_at   AT TIME ZONE p_time_zone)::TIME                                            AS end_time,
    oe.title                                                                                  AS title,
    'belegt'::TEXT                                                                            AS status
  FROM public.team_members tm
  JOIN  public.users u  ON u.auth_user_id = tm.user_id
  JOIN  public.saved_organisation_events soe ON soe.user_id = tm.user_id
  JOIN  public.organisation_events oe ON oe.id = soe.event_id
  WHERE tm.team_id = p_team_id
    AND p_week_start IS NOT NULL
    AND oe.starts_at >= (v_monday::TIMESTAMP AT TIME ZONE p_time_zone)
    AND oe.starts_at <  (v_week_end::TIMESTAMP AT TIME ZONE p_time_zone)
    -- Mehrtägige Events, die über Mitternacht gehen, ausschließen
    AND (oe.ends_at AT TIME ZONE p_time_zone)::TIME > (oe.starts_at AT TIME ZONE p_time_zone)::TIME

  ORDER BY 2 NULLS LAST, 3 NULLS LAST, 4 NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) TO authenticated;
