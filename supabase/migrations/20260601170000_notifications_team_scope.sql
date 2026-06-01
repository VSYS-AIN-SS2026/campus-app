-- ============================================================
-- notifications_team_scope
--
-- 1. Add nullable team_id column to notifications.
-- 2. Add composite index for fast per-team lookups.
-- 3. create_team_appointment: stamp team_id on inserted notifications.
-- 4. respond_to_appointment_invitation: stamp team_id on inserted notification.
-- 5. Replace get_my_notifications() – adds team_id to the return row.
-- 6. Add get_my_team_notifications(p_team_id) for team-scoped inbox.
-- ============================================================

-- ── 1. Schema ────────────────────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_team_idx
  ON public.notifications (recipient_id, team_id, created_at DESC);

-- ── 2. create_team_appointment (full replacement) ────────────
-- Adds team_id to the notifications INSERT so each notification
-- is scoped to the team the appointment belongs to.
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
  v_uid       UUID := auth.uid();
  v_appt      public.team_appointments;
  v_team_name TEXT;
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

  SELECT name INTO v_team_name FROM public.teams WHERE id = p_team_id;

  INSERT INTO public.team_appointments (team_id, created_by, title, description, starts_at, ends_at)
  VALUES (p_team_id, v_uid, p_title, p_description, p_starts_at, p_ends_at)
  RETURNING * INTO v_appt;

  -- Einladungen: Ersteller -> accepted, übrige -> pending
  INSERT INTO public.appointment_invitations (appointment_id, team_member_id, status, responded_at)
  SELECT
    v_appt.id, tm.id,
    CASE WHEN tm.user_id = v_uid THEN 'accepted'::public.invitation_status
         ELSE 'pending'::public.invitation_status END,
    CASE WHEN tm.user_id = v_uid THEN now() ELSE NULL END
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND (p_invitee_member_ids IS NULL OR tm.id = ANY (p_invitee_member_ids))
  ON CONFLICT (appointment_id, team_member_id) DO NOTHING;

  -- Benachrichtigungen an alle eingeladenen Mitglieder außer dem Ersteller
  INSERT INTO public.notifications
    (recipient_id, team_id, type, title, body, payload, dedup_key)
  SELECT
    tm.user_id,
    p_team_id,
    'appointment_created',
    'Neuer Termin: ' || v_appt.title,
    format('Du wurdest zum Termin "%s" (Team %s) am %s eingeladen.',
           v_appt.title, v_team_name,
           to_char(v_appt.starts_at AT TIME ZONE 'UTC', 'DD.MM.YYYY HH24:MI') || ' UTC'),
    jsonb_build_object(
      'appointment_id', v_appt.id, 'team_id', p_team_id, 'team_name', v_team_name,
      'title', v_appt.title, 'starts_at', v_appt.starts_at, 'ends_at', v_appt.ends_at),
    'appt_created:' || v_appt.id::text || ':' || tm.user_id::text
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.user_id <> v_uid
    AND (p_invitee_member_ids IS NULL OR tm.id = ANY (p_invitee_member_ids))
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN v_appt;
END;
$$;

-- ── 3. respond_to_appointment_invitation (full replacement) ──
-- Adds team_id to the notification so the responder's answer is
-- scoped to the same team as the appointment.
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
    WHERE tm.id = v_inv.team_member_id AND tm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: only the invited member may respond';
  END IF;

  IF v_inv.status <> 'pending'::public.invitation_status THEN
    RAISE EXCEPTION 'invitation already answered';
  END IF;

  UPDATE public.appointment_invitations
  SET status = p_status, responded_at = now()
  WHERE id = p_invitation_id
  RETURNING * INTO v_inv;

  -- Benachrichtigung an den Ersteller (nicht an sich selbst)
  INSERT INTO public.notifications
    (recipient_id, team_id, type, title, body, payload, dedup_key)
  SELECT
    a.created_by,
    a.team_id,
    'invitation_' || p_status::text,
    'Antwort auf Termin: ' || a.title,
    format('%s hat den Termin "%s" (Team %s) %s.',
           coalesce(u.full_name, 'Ein Mitglied'), a.title, t.name,
           CASE WHEN p_status = 'accepted'::public.invitation_status THEN 'zugesagt' ELSE 'abgesagt' END),
    jsonb_build_object(
      'appointment_id', a.id, 'team_id', a.team_id, 'team_name', t.name,
      'title', a.title, 'starts_at', a.starts_at, 'status', p_status, 'responder', u.full_name),
    'inv_response:' || v_inv.id::text || ':' || p_status::text
  FROM public.team_appointments a
  JOIN public.teams t ON t.id = a.team_id
  LEFT JOIN public.users u ON u.auth_user_id = auth.uid()
  WHERE a.id = v_inv.appointment_id
    AND a.created_by <> auth.uid()
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN v_inv;
END;
$$;

-- ── 4. get_my_notifications (return type changes → DROP first) ──
-- Return type now includes team_id; CREATE OR REPLACE cannot change
-- an existing function's return type, so we drop and recreate.
DROP FUNCTION IF EXISTS public.get_my_notifications();

CREATE OR REPLACE FUNCTION public.get_my_notifications()
RETURNS TABLE (
  id         UUID,
  team_id    UUID,
  type       TEXT,
  title      TEXT,
  body       TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ,
  read_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.team_id, n.type, n.title, n.body, n.payload, n.created_at, n.read_at
  FROM public.notifications n
  WHERE n.recipient_id = auth.uid()
  ORDER BY n.created_at DESC
  LIMIT 50;
END;
$$;

-- ── 5. get_my_team_notifications (new) ───────────────────────
CREATE OR REPLACE FUNCTION public.get_my_team_notifications(p_team_id UUID)
RETURNS TABLE (
  id         UUID,
  team_id    UUID,
  type       TEXT,
  title      TEXT,
  body       TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ,
  read_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.team_id, n.type, n.title, n.body, n.payload, n.created_at, n.read_at
  FROM public.notifications n
  WHERE n.recipient_id = auth.uid()
    AND n.team_id = p_team_id
  ORDER BY n.created_at DESC
  LIMIT 50;
END;
$$;

-- ── Grants ───────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_my_notifications()           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_team_notifications(UUID)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_notifications()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_notifications(UUID) TO authenticated;
