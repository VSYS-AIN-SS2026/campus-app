-- ============================================================
-- Enrich get_team_appointments: add 'name' field to each
-- invitation object in the returned JSONB array.
--
-- Previously invitations only had { id, team_member_id, status,
-- responded_at }. The frontend needs 'name' to display attendee
-- chips in the group calendar view.
--
-- Join chain: appointment_invitations → team_members → users
-- (via users.auth_user_id = team_members.user_id).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_appointments(
  p_team_id UUID,
  p_from    TIMESTAMPTZ DEFAULT NULL,
  p_to      TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  team_id     UUID,
  created_by  UUID,
  title       TEXT,
  description TEXT,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ,
  invitations JSONB
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
    a.id, a.team_id, a.created_by, a.title, a.description,
    a.starts_at, a.ends_at, a.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',             i.id,
          'team_member_id', i.team_member_id,
          'name',           COALESCE(u.full_name, u.email),
          'status',         i.status,
          'responded_at',   i.responded_at
        ) ORDER BY i.created_at
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::jsonb
    ) AS invitations
  FROM public.team_appointments a
  LEFT JOIN public.appointment_invitations i  ON i.appointment_id = a.id
  LEFT JOIN public.team_members tm            ON tm.id = i.team_member_id
  LEFT JOIN public.users u                    ON u.auth_user_id = tm.user_id
  WHERE a.team_id = p_team_id
    AND (p_from IS NULL OR a.starts_at >= p_from)
    AND (p_to   IS NULL OR a.starts_at <  p_to)
  GROUP BY a.id
  ORDER BY a.starts_at;
END;
$$;

-- Permissions unchanged – keep the existing grants.
REVOKE ALL ON FUNCTION public.get_team_appointments(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_appointments(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
