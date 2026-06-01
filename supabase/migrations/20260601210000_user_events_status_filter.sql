-- ============================================================
-- Add status filtering to team schedule and free slot RPCs.
--
-- user_events.status:
--   'belegt'       → busy (default)
--   'ausgeblendet' → busy  (hidden — counts as occupied)
--   'abgewählt'    → NOT busy (deselected — excluded)
-- ============================================================

-- 1) Return status from get_team_week_schedule so the frontend
--    can correctly map to MemberScheduleSlot.state.
DROP FUNCTION IF EXISTS public.get_team_week_schedule(UUID);
CREATE OR REPLACE FUNCTION public.get_team_week_schedule(p_team_id UUID)
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
BEGIN
  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: not a team member';
  END IF;

  RETURN QUERY
  SELECT
    tm.user_id                     AS member_id,
    COALESCE(u.full_name, u.email) AS member_name,
    ue.day_index,
    ue.start_time,
    ue.end_time,
    ue.title,
    ue.status
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  LEFT JOIN public.user_events ue ON ue.user_id = u.id
  WHERE tm.team_id = p_team_id
  ORDER BY u.full_name NULLS LAST, ue.day_index, ue.start_time;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_week_schedule(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_week_schedule(UUID) TO authenticated;


-- 2) Exclude 'abgewählt' events from free-slot conflict detection.
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

    v_date := v_monday + v_day;
    v_win_start := (v_date + p_min_start) AT TIME ZONE p_time_zone;
    v_win_end   := (v_date + p_max_end)   AT TIME ZONE p_time_zone;
    v_pos := v_win_start;

    FOR rec IN
      SELECT s, e
      FROM (
        SELECT GREATEST(c.c_start, v_win_start) AS s,
               LEAST(c.c_end, v_win_end)        AS e
        FROM (
          -- Stundenplan-Slots aller Team-Mitglieder an diesem Wochentag
          SELECT (v_date + ue.start_time) AT TIME ZONE p_time_zone AS c_start,
                 (v_date + ue.end_time)   AT TIME ZONE p_time_zone AS c_end
          FROM public.team_members tm
          JOIN public.users u        ON u.auth_user_id = tm.user_id
          JOIN public.user_events ue ON ue.user_id = u.id
          WHERE tm.team_id = p_team_id
            AND ue.day_index = v_day
            AND ue.status IS DISTINCT FROM 'abgewählt'

          UNION ALL

          -- Bestehende Team-Termine (nur aus diesem Team, da die
          -- Wochenansicht keine terminkonflikte aus anderen Teams anzeigt).
          SELECT a.starts_at, a.ends_at
          FROM public.team_appointments a
          WHERE a.team_id = p_team_id
            AND a.starts_at < v_win_end
            AND a.ends_at   > v_win_start
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
          starts_at := v_pos;
          ends_at := v_gap_end;
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
      starts_at := v_pos;
      ends_at := v_win_end;
      duration_minutes := ROUND(EXTRACT(EPOCH FROM (v_win_end - v_pos)) / 60)::INTEGER;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_free_slots(UUID, DATE, INTEGER, TIME, TIME, INTEGER[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_free_slots(UUID, DATE, INTEGER, TIME, TIME, INTEGER[], TEXT) TO authenticated;
