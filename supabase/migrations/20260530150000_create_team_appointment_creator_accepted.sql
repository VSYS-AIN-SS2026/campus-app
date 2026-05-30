-- ============================================================
-- create_team_appointment: Ersteller-Einladung direkt auf 'accepted',
-- alle übrigen Mitglieder auf 'pending'.
-- (Ersetzt die Funktion aus 20260530130000_appointment_endpoints.sql;
--  Grants bleiben bei CREATE OR REPLACE erhalten.)
-- ============================================================

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

  -- Einladungen anlegen: Ersteller -> accepted, übrige Mitglieder -> pending
  INSERT INTO public.appointment_invitations (appointment_id, team_member_id, status, responded_at)
  SELECT
    v_appt.id,
    tm.id,
    CASE WHEN tm.user_id = v_uid THEN 'accepted'::public.invitation_status
         ELSE 'pending'::public.invitation_status END,
    CASE WHEN tm.user_id = v_uid THEN now() ELSE NULL END
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND (p_invitee_member_ids IS NULL OR tm.id = ANY (p_invitee_member_ids))
  ON CONFLICT (appointment_id, team_member_id) DO NOTHING;

  RETURN v_appt;
END;
$$;
