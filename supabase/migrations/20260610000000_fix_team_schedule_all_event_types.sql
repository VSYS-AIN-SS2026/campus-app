-- Behebt get_team_week_schedule und get_team_free_slots, nachdem Migration
-- 20260609000002 die persönlichen Termine und den Mehrtages-Split entfernt hatte.
--
-- get_team_week_schedule vereint nun:
--   1. Wiederkehrende Stundenplan-Slots (user_events)
--   2. Persönliche Termine, pro Kalendertag aufgeteilt (n/last_n, hidden-Filter)
--   3. Gespeicherte Organisations-Events, pro Kalendertag aufgeteilt
--
-- get_team_free_slots behandelt nun zusätzlich gespeicherte Organisations-Events
-- als belegte Zeiträume.

-- ── get_team_week_schedule ────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_team_week_schedule(UUID);
DROP FUNCTION IF EXISTS public.get_team_week_schedule(UUID, DATE, TEXT);

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

  -- 1. Wiederkehrende Stundenplan-Slots (LEFT JOIN: auch Mitglieder ohne Events)
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

  -- 2. Persönliche Termine, pro Kalendertag aufgeteilt.
  --    n=0 → erster Tag, n=last_n → letzter Tag (Ganzzahlvergleich).
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
    AND NOT (g.n = g.last_n AND g.pa_end_time = '00:00'::TIME)
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

  UNION ALL

  -- 3. Gespeicherte Organisations-Events, pro Kalendertag aufgeteilt.
  SELECT
    tm.user_id                                                              AS member_id,
    COALESCE(u.full_name, u.email)                                          AS member_name,
    (EXTRACT(ISODOW FROM g.day_date) - 1)::SMALLINT                         AS day_index,
    CASE WHEN g.n = 0        THEN g.oe_start_time ELSE '00:00'::TIME END    AS start_time,
    CASE WHEN g.n = g.last_n THEN g.oe_end_time   ELSE '24:00'::TIME END    AS end_time,
    oe.title,
    'belegt'::TEXT                                                          AS status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  JOIN public.saved_organisation_events soe ON soe.user_id = tm.user_id
  JOIN public.organisation_events oe ON oe.id = soe.event_id
  CROSS JOIN LATERAL (
    SELECT
      n,
      (oe.starts_at AT TIME ZONE p_time_zone)::DATE + n               AS day_date,
      (oe.ends_at   AT TIME ZONE p_time_zone)::DATE
        - (oe.starts_at AT TIME ZONE p_time_zone)::DATE                AS last_n,
      (oe.starts_at AT TIME ZONE p_time_zone)::TIME                    AS oe_start_time,
      (oe.ends_at   AT TIME ZONE p_time_zone)::TIME                    AS oe_end_time
    FROM generate_series(
      0,
      (oe.ends_at   AT TIME ZONE p_time_zone)::DATE
        - (oe.starts_at AT TIME ZONE p_time_zone)::DATE,
      1
    ) n
  ) g
  WHERE tm.team_id = p_team_id
    AND g.day_date >= v_monday
    AND g.day_date <= v_monday + 6
    AND NOT (g.n = g.last_n AND g.oe_end_time = '00:00'::TIME)

  ORDER BY 2 NULLS LAST, 3 NULLS LAST, 4 NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_week_schedule(UUID, DATE, TEXT) TO authenticated;


-- ── get_team_free_slots ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_team_free_slots(
  p_team_id           UUID,
  p_week_start        DATE,
  p_duration_minutes  INTEGER,
  p_min_start         TIME      DEFAULT '08:00',
  p_max_end           TIME      DEFAULT '20:00',
  p_excluded_weekdays INTEGER[] DEFAULT '{}',
  p_time_zone         TEXT      DEFAULT 'Europe/Berlin'
)
RETURNS TABLE (
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  duration_minutes INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_monday       DATE;
  v_excluded     INTEGER[] := COALESCE(p_excluded_weekdays, '{}'::INTEGER[]);
  v_day          INTEGER;
  v_date         DATE;
  v_win_start    TIMESTAMPTZ;
  v_win_end      TIMESTAMPTZ;
  v_pos          TIMESTAMPTZ;
  v_gap_end      TIMESTAMPTZ;
  rec            RECORD;
BEGIN
  IF v_uid IS NULL OR NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: not a team member';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'duration must be a positive number of minutes';
  END IF;

  IF p_max_end <= p_min_start THEN
    RETURN;
  END IF;

  v_monday := p_week_start - (EXTRACT(ISODOW FROM p_week_start)::INTEGER - 1);

  FOR v_day IN 0..6 LOOP
    CONTINUE WHEN v_day = ANY (v_excluded);

    v_date      := v_monday + v_day;
    v_win_start := (v_date + p_min_start) AT TIME ZONE p_time_zone;
    v_win_end   := (v_date + p_max_end)   AT TIME ZONE p_time_zone;
    v_pos       := v_win_start;

    FOR rec IN
      SELECT s, e
      FROM (
        SELECT GREATEST(c.c_start, v_win_start) AS s,
               LEAST(c.c_end,   v_win_end)      AS e
        FROM (
          -- Stundenplan-Slots aller Team-Mitglieder an diesem Wochentag
          SELECT (v_date + ue.start_time) AT TIME ZONE p_time_zone AS c_start,
                 (v_date + ue.end_time)   AT TIME ZONE p_time_zone AS c_end
          FROM public.team_members tm
          JOIN public.users u        ON u.auth_user_id = tm.user_id
          JOIN public.user_events ue ON ue.user_id = u.id
          WHERE tm.team_id = p_team_id
            AND ue.day_index = v_day

          UNION ALL

          -- Team-Termine mit pending/accepted-Einladung
          SELECT a.starts_at, a.ends_at
          FROM public.team_members my
          JOIN public.team_members anytm ON anytm.user_id = my.user_id
          JOIN public.appointment_invitations i
            ON i.team_member_id = anytm.id
           AND i.status IN ('pending', 'accepted')
          JOIN public.team_appointments a ON a.id = i.appointment_id
          WHERE my.team_id = p_team_id
            AND a.starts_at < v_win_end
            AND a.ends_at   > v_win_start

          UNION ALL

          -- Persönliche Termine aller Team-Mitglieder (ausgeblendete ausgeschlossen)
          SELECT pa.starts_at, pa.ends_at
          FROM public.team_members tm
          JOIN public.users u ON u.auth_user_id = tm.user_id
          JOIN public.personal_appointments pa ON pa.user_id = u.id
          WHERE tm.team_id = p_team_id
            AND pa.starts_at < v_win_end
            AND pa.ends_at   > v_win_start
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

          UNION ALL

          -- Gespeicherte Organisations-Events aller Team-Mitglieder
          SELECT oe.starts_at, oe.ends_at
          FROM public.team_members tm
          JOIN public.saved_organisation_events soe ON soe.user_id = tm.user_id
          JOIN public.organisation_events oe ON oe.id = soe.event_id
          WHERE tm.team_id = p_team_id
            AND oe.starts_at < v_win_end
            AND oe.ends_at   > v_win_start

        ) c
        WHERE c.c_end > v_win_start
          AND c.c_start < v_win_end
          AND c.c_end > c.c_start
      ) clipped
      WHERE e > s
      ORDER BY s, e
    LOOP
      IF rec.s > v_pos THEN
        v_gap_end := LEAST(rec.s, v_win_end);
        IF EXTRACT(EPOCH FROM (v_gap_end - v_pos)) / 60 >= p_duration_minutes THEN
          starts_at        := v_pos;
          ends_at          := v_gap_end;
          duration_minutes := ROUND(EXTRACT(EPOCH FROM (v_gap_end - v_pos)) / 60)::INTEGER;
          RETURN NEXT;
        END IF;
      END IF;

      IF rec.e > v_pos THEN
        v_pos := rec.e;
      END IF;

      EXIT WHEN v_pos >= v_win_end;
    END LOOP;

    IF v_pos < v_win_end
       AND EXTRACT(EPOCH FROM (v_win_end - v_pos)) / 60 >= p_duration_minutes THEN
      starts_at        := v_pos;
      ends_at          := v_win_end;
      duration_minutes := ROUND(EXTRACT(EPOCH FROM (v_win_end - v_pos)) / 60)::INTEGER;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_free_slots(UUID, DATE, INTEGER, TIME, TIME, INTEGER[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_free_slots(UUID, DATE, INTEGER, TIME, TIME, INTEGER[], TEXT) TO authenticated;
