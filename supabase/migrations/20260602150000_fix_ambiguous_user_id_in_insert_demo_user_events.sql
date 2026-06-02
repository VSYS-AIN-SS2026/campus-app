-- ============================================================
-- Fix "column reference user_id is ambiguous" in
-- insert_demo_user_events ON CONFLICT clause.
--
-- Root cause: RETURNS TABLE (user_id UUID, ...) creates an
-- implicit OUT parameter named user_id. PostgreSQL resolves
-- bare column references in ON CONFLICT against PL/pgSQL
-- variables first (use_variable default), causing ambiguity
-- between the OUT parameter and the table column.
--
-- Fix: add #variable_conflict use_column directive so that
-- column names take precedence over variable names in the
-- ON CONFLICT clause.
-- ============================================================

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
#variable_conflict use_column
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
