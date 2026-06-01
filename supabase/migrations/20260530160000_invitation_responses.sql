-- ============================================================
-- Termin-Einladungen: Zusagen/Absagen + eigene offene Einladungen.
--   * respond_to_appointment_invitation: bereits beantwortete
--     Einladungen können nicht erneut beantwortet werden.
--   * get_my_appointment_invitations: offene Einladungen des Nutzers.
--   * get_team_appointments: Einladungen tragen jetzt den Mitgliedsnamen,
--     damit die Wochenansicht Teilnehmer-Icons zeigen kann.
-- ============================================================

-- ------------------------------------------------------------
-- Antwort auf eine Einladung (nur eingeladenes Mitglied, nur einmal)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_appointment_invitation(
  p_invitation_id UUID,
  p_status        public.invitation_status
)
RETURNS public.appointment_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.appointment_invitations;
BEGIN
  IF p_status NOT IN ('accepted'::public.invitation_status, 'declined'::public.invitation_status) THEN
    RAISE EXCEPTION 'status must be accepted or declined';
  END IF;

  SELECT * INTO v_inv FROM public.appointment_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = v_inv.team_member_id
      AND tm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: only the invited member may respond';
  END IF;

  -- Bereits beantwortet -> nicht erneut beantwortbar
  IF v_inv.status <> 'pending'::public.invitation_status THEN
    RAISE EXCEPTION 'invitation already answered';
  END IF;

  UPDATE public.appointment_invitations
  SET status = p_status, responded_at = now()
  WHERE id = p_invitation_id
  RETURNING * INTO v_inv;

  RETURN v_inv;
END;
$$;

-- ------------------------------------------------------------
-- Offene Einladungen des aktuellen Nutzers (über alle Teams)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_appointment_invitations()
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
  ORDER BY a.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_appointment_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_appointment_invitations() TO authenticated;

-- ------------------------------------------------------------
-- get_team_appointments: Einladungen mit Mitgliedsnamen
-- (Signatur unverändert, nur erweiterte invitations-jsonb)
-- ------------------------------------------------------------
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
          'name',           u.full_name,
          'status',         i.status,
          'responded_at',   i.responded_at
        ) ORDER BY i.created_at
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::jsonb
    ) AS invitations
  FROM public.team_appointments a
  LEFT JOIN public.appointment_invitations i ON i.appointment_id = a.id
  LEFT JOIN public.team_members tm           ON tm.id = i.team_member_id
  LEFT JOIN public.users u                   ON u.auth_user_id = tm.user_id
  WHERE a.team_id = p_team_id
    AND (p_from IS NULL OR a.starts_at >= p_from)
    AND (p_to   IS NULL OR a.starts_at <  p_to)
  GROUP BY a.id
  ORDER BY a.starts_at;
END;
$$;
