-- ============================================================
-- RPC: get_team_week_schedule(p_team_id)
--
-- Returns all team members and their recurring schedule slots
-- (user_events) for the group calendar (CombinedWeekView).
--
-- One row per (member, event). Members without events appear
-- once with NULL event columns so the legend shows all members.
--
-- member_id  = team_members.user_id (= auth.uid() of that member)
-- member_name = users.full_name ?? users.email
--
-- Authorization: caller must be a team member of p_team_id.
-- SECURITY DEFINER bypasses the user_events RLS policy that
-- normally restricts visibility to the owner's own rows.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_week_schedule(p_team_id UUID)
RETURNS TABLE (
  member_id   UUID,
  member_name TEXT,
  day_index   SMALLINT,
  start_time  TIME,
  end_time    TIME,
  title       TEXT
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
    ue.title
  FROM public.team_members tm
  JOIN public.users u ON u.auth_user_id = tm.user_id
  LEFT JOIN public.user_events ue ON ue.user_id = u.id
  WHERE tm.team_id = p_team_id
  ORDER BY u.full_name NULLS LAST, ue.day_index, ue.start_time;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_week_schedule(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_week_schedule(UUID) TO authenticated;
