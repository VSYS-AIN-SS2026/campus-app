-- Mehrtägige persönliche Termine werden jetzt pro Kalendertag in einen eigenen
-- Segment-Datensatz aufgeteilt (analog zur Frontend-Lösung in state.ts):
--   * Erster Tag:  start_time = tatsächliche Startzeit, end_time = 24:00
--   * Mittlere Tage: start_time = 00:00, end_time = 24:00
--   * Letzter Tag: start_time = 00:00, end_time = tatsächliche Endzeit
-- Damit verschwinden beide Darstellungsfehler:
--   1. "Gleicher-Tag"-Bug: 09.06 14:00 – 10.06 15:00 wurde als 09.06 14:00–15:00 angezeigt.
--   2. "Unsichtbar"-Bug: 09.06 14:00 – 10.06 13:00 wurde komplett herausgefiltert,
--      weil end_time (13:00) < start_time (14:00) desselben Tages.
--
-- Enthält außerdem den ausgeblendet-Filter aus 20260609120000, da CREATE OR REPLACE
-- die vorherige Version vollständig ersetzt.

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

  -- Wiederkehrende Stundenplan-Slots (LEFT JOIN hält auch Mitglieder ohne Events)
  SELECT
    tm.user_id                             AS member_id,
    COALESCE(u.full_name, u.email)         AS member_name,
    ue.day_index,
    ue.start_time,
    ue.end_time,
    ue.title,
    COALESCE(ue.status, 'belegt')::TEXT    AS status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  LEFT JOIN public.user_events ue ON ue.user_id = u.id
  WHERE tm.team_id = p_team_id

  UNION ALL

  -- Persönliche Termine der Woche, pro Kalendertag aufgeteilt.
  -- Mehrtägige Termine erzeugen mehrere Zeilen (eine pro Tag im Fenster).
  SELECT
    tm.user_id                                                    AS member_id,
    COALESCE(u.full_name, u.email)                                AS member_name,
    (EXTRACT(ISODOW FROM g.day_date) - 1)::SMALLINT               AS day_index,
    CASE
      WHEN g.day_date = (pa.starts_at AT TIME ZONE p_time_zone)::DATE
      THEN (pa.starts_at AT TIME ZONE p_time_zone)::TIME
      ELSE '00:00'::TIME
    END                                                           AS start_time,
    CASE
      WHEN g.day_date = (pa.ends_at AT TIME ZONE p_time_zone)::DATE
      THEN (pa.ends_at AT TIME ZONE p_time_zone)::TIME
      ELSE '24:00'::TIME
    END                                                           AS end_time,
    pa.title,
    'belegt'::TEXT                                                AS status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  JOIN public.personal_appointments pa ON pa.user_id = u.id
  -- Einen Datensatz pro Kalendertag, den der Termin abdeckt
  CROSS JOIN LATERAL (
    SELECT gs::DATE AS day_date
    FROM generate_series(
      (pa.starts_at AT TIME ZONE p_time_zone)::DATE::TIMESTAMP,
      (pa.ends_at   AT TIME ZONE p_time_zone)::DATE::TIMESTAMP,
      '1 day'::INTERVAL
    ) gs
  ) g
  WHERE tm.team_id = p_team_id
    AND g.day_date >= v_monday
    AND g.day_date <= v_monday + 6
    -- Letztes Segment mit Länge 0 (Termin endet exakt um Mitternacht) überspringen
    AND NOT (
      g.day_date = (pa.ends_at AT TIME ZONE p_time_zone)::DATE
      AND (pa.ends_at AT TIME ZONE p_time_zone)::TIME = '00:00'::TIME
    )
    -- Ausgeblendete persönliche Termine nicht anzeigen
    AND NOT EXISTS (
      SELECT 1 FROM public.user_hidden_schedule_series uhss
      WHERE uhss.user_id = u.id
        AND uhss.series_id = 'personal:' || pa.id::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_hidden_schedule_occurrences uhso
      WHERE uhso.user_id = u.id
        AND uhso.occurrence_id = 'personal:' || pa.id::text
    )

  ORDER BY 2 NULLS LAST, 3 NULLS LAST, 4 NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) TO authenticated;
