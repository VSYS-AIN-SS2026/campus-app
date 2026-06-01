-- ============================================================
-- Backend-Endpunkte fuer Termine und Einladungen (RPCs)
--
-- Endpunkte (SECURITY DEFINER, ueber PostgREST als RPC erreichbar):
--   create_team_appointment   -> Termin anlegen (+ Einladungen)
--   get_team_appointment      -> einzelnen Termin lesen
--   get_team_appointments     -> alle Termine eines Teams im Zeitraum
--   update_team_appointment   -> Termin aendern
--   delete_team_appointment   -> Termin loeschen
--   respond_to_appointment_invitation -> Einladung accept/decline
--
-- Authorisierung:
--   * Nur Team-Mitglieder duerfen Termine ihres Teams lesen/anlegen.
--   * Nur der Ersteller darf einen Termin aendern/loeschen.
--   * Statuswechsel nur durch das eingeladene Mitglied selbst.
--   Verletzungen werfen SQLSTATE 42501 (insufficient_privilege),
--   was PostgREST als HTTP 403 ausliefert.
--
-- Identitaet: auth.uid() == auth.users.id == profiles.id und
-- team_members.user_id. Zeitangaben sind timestamptz (UTC-basiert).
-- ============================================================

-- ------------------------------------------------------------
-- Hilfsfunktion: ist der aktuelle Aufrufer Mitglied des Teams?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- Termin anlegen (+ Einladungen)
-- p_invitee_member_ids = NULL  -> alle aktuellen Team-Mitglieder
--                       sonst   -> nur die angegebenen team_members.id
--                                  (auf das Team beschraenkt)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_team_appointment(
  p_team_id            UUID,
  p_title              TEXT,
  p_description        TEXT,
  p_starts_at          TIMESTAMPTZ,
  p_ends_at            TIMESTAMPTZ,
  p_invitee_member_ids UUID[] DEFAULT NULL
)
RETURNS public.team_appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_appt public.team_appointments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: authentication required';
  END IF;

  IF NOT public.is_team_member(p_team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: not a team member';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'title is required';
  END IF;
  IF p_starts_at IS NULL OR p_ends_at IS NULL THEN
    RAISE EXCEPTION 'start and end are required';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'end must be after start';
  END IF;

  INSERT INTO public.team_appointments (team_id, created_by, title, description, starts_at, ends_at)
  VALUES (p_team_id, v_uid, p_title, p_description, p_starts_at, p_ends_at)
  RETURNING * INTO v_appt;

  -- Einladungen anlegen (alle oder die angegebene Teilmenge des Teams)
  INSERT INTO public.appointment_invitations (appointment_id, team_member_id)
  SELECT v_appt.id, tm.id
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND (p_invitee_member_ids IS NULL OR tm.id = ANY (p_invitee_member_ids))
  ON CONFLICT (appointment_id, team_member_id) DO NOTHING;

  RETURN v_appt;
END;
$$;

-- ------------------------------------------------------------
-- Einzelnen Termin lesen (nur Team-Mitglieder)
-- Nicht vorhanden -> NULL; fremdes Team -> 403
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_team_appointment(p_appointment_id UUID)
RETURNS public.team_appointments
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt public.team_appointments;
BEGIN
  SELECT * INTO v_appt FROM public.team_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_team_member(v_appt.team_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: not a team member';
  END IF;

  RETURN v_appt;
END;
$$;

-- ------------------------------------------------------------
-- Alle Termine eines Teams in einem Zeitraum (nur Team-Mitglieder)
-- Filter auf starts_at (UTC). p_from/p_to optional (NULL = offen).
-- Liefert je Termin die Einladungen als jsonb-Array.
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
          'status',         i.status,
          'responded_at',   i.responded_at
        ) ORDER BY i.created_at
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::jsonb
    ) AS invitations
  FROM public.team_appointments a
  LEFT JOIN public.appointment_invitations i ON i.appointment_id = a.id
  WHERE a.team_id = p_team_id
    AND (p_from IS NULL OR a.starts_at >= p_from)
    AND (p_to   IS NULL OR a.starts_at <  p_to)
  GROUP BY a.id
  ORDER BY a.starts_at;
END;
$$;

-- ------------------------------------------------------------
-- Termin aendern (nur Ersteller). NULL-Parameter = unveraendert.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_team_appointment(
  p_appointment_id UUID,
  p_title          TEXT        DEFAULT NULL,
  p_description    TEXT        DEFAULT NULL,
  p_starts_at      TIMESTAMPTZ DEFAULT NULL,
  p_ends_at        TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.team_appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt public.team_appointments;
BEGIN
  SELECT * INTO v_appt FROM public.team_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_appt.created_by <> auth.uid() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: only the creator may update';
  END IF;

  UPDATE public.team_appointments
  SET title       = COALESCE(p_title, title),
      description = COALESCE(p_description, description),
      starts_at   = COALESCE(p_starts_at, starts_at),
      ends_at     = COALESCE(p_ends_at, ends_at)
  WHERE id = p_appointment_id
  RETURNING * INTO v_appt;  -- CHECK (ends_at > starts_at) wird hier erzwungen

  RETURN v_appt;
END;
$$;

-- ------------------------------------------------------------
-- Termin loeschen (nur Ersteller). Einladungen werden kaskadiert.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_team_appointment(p_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt public.team_appointments;
BEGIN
  SELECT * INTO v_appt FROM public.team_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_appt.created_by <> auth.uid() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: only the creator may delete';
  END IF;

  DELETE FROM public.team_appointments WHERE id = p_appointment_id;
  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------
-- Einladung beantworten (accept/decline) - nur das eingeladene
-- Mitglied selbst.
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

  -- Nur das eingeladene Mitglied darf antworten
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = v_inv.team_member_id
      AND tm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: only the invited member may respond';
  END IF;

  UPDATE public.appointment_invitations
  SET status = p_status, responded_at = now()
  WHERE id = p_invitation_id
  RETURNING * INTO v_inv;

  RETURN v_inv;
END;
$$;

-- ------------------------------------------------------------
-- Rechte: nur fuer authentifizierte Nutzer (kein anon-Zugriff)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_team_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_team_appointment(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_team_appointment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_team_appointments(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_team_appointment(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_team_appointment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_appointment_invitation(UUID, public.invitation_status) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_appointment(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_appointment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_appointments(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_team_appointment(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team_appointment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_appointment_invitation(UUID, public.invitation_status) TO authenticated;
