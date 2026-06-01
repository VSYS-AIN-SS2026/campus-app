-- ============================================================
-- Eigene zugesagte Termine des aktuellen Nutzers (über alle Teams).
--
-- Spiegelbild zu get_my_appointment_invitations (offene Einladungen),
-- liefert hier aber nur Einladungen mit status = 'accepted'. Damit kann
-- die persönliche Wochenansicht zugesagte Team-Termine einblenden.
--
-- Identität: auth.uid() == team_members.user_id. Zeitangaben in UTC.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_accepted_appointments(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  appointment_id UUID,
  invitation_id  UUID,
  title          TEXT,
  description    TEXT,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  team_id        UUID,
  team_name      TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, i.id, a.title, a.description, a.starts_at, a.ends_at, t.id, t.name
  FROM public.appointment_invitations i
  JOIN public.team_members tm     ON tm.id = i.team_member_id
  JOIN public.team_appointments a ON a.id = i.appointment_id
  JOIN public.teams t             ON t.id = a.team_id
  WHERE tm.user_id = auth.uid()
    AND i.status = 'accepted'::public.invitation_status
    AND (p_from IS NULL OR a.starts_at >= p_from)
    AND (p_to   IS NULL OR a.starts_at <  p_to)
  ORDER BY a.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_accepted_appointments(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_accepted_appointments(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
