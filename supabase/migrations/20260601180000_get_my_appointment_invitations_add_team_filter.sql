-- ============================================================
-- Erweitere get_my_appointment_invitations um optionalen
-- p_team_id-Parameter, damit Team-kontextualisierte Ansichten
-- nur die Einladungen des aktuellen Teams laden.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_my_appointment_invitations();

CREATE OR REPLACE FUNCTION public.get_my_appointment_invitations(
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  invitation_id UUID,
  status        public.invitation_status,
  appointment_id UUID,
  title         TEXT,
  description   TEXT,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  team_id       UUID,
  team_name     TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.status, a.id, a.title, a.description, a.starts_at, a.ends_at, t.id, t.name
  FROM public.appointment_invitations i
  JOIN public.team_members tm     ON tm.id = i.team_member_id
  JOIN public.team_appointments a ON a.id = i.appointment_id
  JOIN public.teams t             ON t.id = a.team_id
  WHERE tm.user_id = auth.uid()
    AND i.status = 'pending'::public.invitation_status
    AND (p_team_id IS NULL OR a.team_id = p_team_id)
  ORDER BY a.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_appointment_invitations(p_team_id UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_appointment_invitations(p_team_id UUID) TO authenticated;
