-- Behebt den Fehler, dass der letzte Tag eines mehrtägigen persönlichen Termins
-- als 00:00–24:00 dargestellt wurde, obwohl er z. B. 00:00–15:00 sein sollte.
--
-- Ursache: Datumsvergleich (g.day_date = ends_at::DATE) im CASE-Ausdruck war
-- anfällig für Auswertungsreihenfolge/Typ-Probleme. Lösung: ganzzahliger
-- Tages-Offset (n = 0 → erster Tag, n = last_n → letzter Tag) statt
-- Datumsvergleich. Alle lokalen Zeitwerte werden einmal im LATERAL berechnet.
--
-- Enthält außerdem den ausgeblendet-Filter aus 20260609120000.

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

  -- Persönliche Termine, pro Kalendertag als eigene Zeile.
  -- Tages-Index n=0 → erster Tag, n=last_n → letzter Tag (Ganzzahlvergleich,
  -- kein fehleranfälliger Datumsvergleich im äußeren CASE-Ausdruck).
  SELECT
    tm.user_id                                                              AS member_id,
    COALESCE(u.full_name, u.email)                                          AS member_name,
    (EXTRACT(ISODOW FROM g.day_date) - 1)::SMALLINT                         AS day_index,
    CASE WHEN g.n = 0        THEN g.pa_start_time ELSE '00:00'::TIME END    AS start_time,
    CASE WHEN g.n = g.last_n THEN g.pa_end_time   ELSE '24:00'::TIME END    AS end_time,
    pa.title,
    'belegt'::TEXT                                                          AS status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  JOIN public.personal_appointments pa ON pa.user_id = u.id
  -- Alle lokalen Zeitwerte einmal berechnen; n läuft von 0 bis last_n (inkl.)
  CROSS JOIN LATERAL (
    SELECT
      n,
      (pa.starts_at AT TIME ZONE p_time_zone)::DATE + n               AS day_date,
      (pa.ends_at   AT TIME ZONE p_time_zone)::DATE
        - (pa.starts_at AT TIME ZONE p_time_zone)::DATE                AS last_n,
      (pa.starts_at AT TIME ZONE p_time_zone)::TIME                    AS pa_start_time,
      (pa.ends_at   AT TIME ZONE p_time_zone)::TIME                    AS pa_end_time
    FROM generate_series(
      0,
      (pa.ends_at   AT TIME ZONE p_time_zone)::DATE
        - (pa.starts_at AT TIME ZONE p_time_zone)::DATE,
      1
    ) n
  ) g
  WHERE tm.team_id = p_team_id
    AND g.day_date >= v_monday
    AND g.day_date <= v_monday + 6
    -- Letztes Segment mit Länge 0 überspringen (Termin endet exakt um Mitternacht)
    AND NOT (g.n = g.last_n AND g.pa_end_time = '00:00'::TIME)
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
