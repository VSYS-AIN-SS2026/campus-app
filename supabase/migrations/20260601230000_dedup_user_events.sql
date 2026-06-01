-- ============================================================
-- Dedupliziere user_events und verhindere künftige Duplikate.
--
-- Problem: insert_demo_user_events hat kein ON CONFLICT und es
-- gibt keinen Unique-Constraint auf user_events. Wenn derselbe
-- LSF-Import zweimal ausgeführt wird (z.B. Modul-Status-Toggle
-- offen → belegt), entstehen doppelte Einträge.
--
-- Lösung:
--   1. Vorhandene Duplikate löschen (ältesten Eintrag behalten)
--   2. Unique Index auf (user_id, series_id, day_index, start_time, end_time)
--   3. insert_demo_user_events mit ON CONFLICT DO NOTHING
-- ============================================================

-- ── 1. Duplikate bereinigen ──────────────────────────────────
-- Behalte pro Gruppe den Eintrag mit der kleinsten ID.
DELETE FROM public.user_events
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.user_events
  GROUP BY user_id, series_id, day_index, start_time, end_time
);

-- ── 2. Unique Index für zukünftige Inserts ───────────────────
-- Der Index verhindert, dass zwei Events mit identischen
-- Nutzer-/Slot-Werten eingefügt werden können.
CREATE UNIQUE INDEX IF NOT EXISTS user_events_dedup_idx
  ON public.user_events (user_id, series_id, day_index, start_time, end_time);

-- ── 3. insert_demo_user_events mit ON CONFLICT ───────────────
CREATE OR REPLACE FUNCTION public.insert_demo_user_events(
  events jsonb
)
RETURNS TABLE (
  id            UUID,
  user_id       UUID,
  lsf_event_id  UUID,
  title         TEXT,
  subtitle      TEXT,
  day_index     SMALLINT,
  start_time    TIME,
  end_time      TIME,
  series_id     TEXT,
  status        TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user public.users;
  v_event jsonb;
BEGIN
  SELECT * INTO resolved_user FROM public.resolve_dashboard_user();

  IF resolved_user.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  FOR v_event IN SELECT * FROM jsonb_array_elements(events)
  LOOP
    RETURN QUERY
    INSERT INTO public.user_events (
      user_id, lsf_event_id, title, subtitle,
      day_index, start_time, end_time, series_id, status
    ) VALUES (
      resolved_user.id,
      (v_event->>'lsf_event_id')::UUID,
      v_event->>'title',
      v_event->>'subtitle',
      (v_event->>'day_index')::SMALLINT,
      (v_event->>'start_time')::TIME,
      (v_event->>'end_time')::TIME,
      v_event->>'series_id',
      COALESCE(v_event->>'status', 'belegt')
    )
    ON CONFLICT (user_id, series_id, day_index, start_time, end_time) DO NOTHING
    RETURNING *;
  END LOOP;
END;
$$;
