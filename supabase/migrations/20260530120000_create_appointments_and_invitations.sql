-- ============================================================
-- Datenmodell: Termin und TerminEinladung
--
-- Termin            -> public.team_appointments
-- TerminEinladung   -> public.appointment_invitations
--
-- Ein Termin gehoert zu einem Team (Team) und hat einen Ersteller
-- (Ersteller). Pro Termin koennen Team-Mitglieder eingeladen werden;
-- jede Einladung haelt den Antwort-Status (pending/accepted/declined).
--
-- Konventionen aus dem bestehenden Schema uebernommen:
--   * UUID-PKs mit gen_random_uuid()
--   * teams.id (UUID), profiles.id (= auth.users.id), team_members.id (UUID)
--   * invitation_status-Enum wird wiederverwendet (wie team_invitations)
--   * FK-Spalten der referenzierenden Seite werden explizit indiziert
-- ============================================================

-- ------------------------------------------------------------
-- Termin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_appointments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id)    ON DELETE CASCADE,  -- Team
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Ersteller
  title       TEXT        NOT NULL,                                                   -- Titel
  description TEXT,                                                                   -- Beschreibung
  starts_at   TIMESTAMPTZ NOT NULL,                                                   -- Start (UTC)
  ends_at     TIMESTAMPTZ NOT NULL,                                                   -- Ende (UTC)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_appointments_time_valid CHECK (ends_at > starts_at)
);

COMMENT ON TABLE public.team_appointments IS 'Termin: gemeinsamer Termin eines Teams (Start/Ende in UTC).';

CREATE INDEX IF NOT EXISTS team_appointments_team_id_idx
  ON public.team_appointments (team_id);
CREATE INDEX IF NOT EXISTS team_appointments_created_by_idx
  ON public.team_appointments (created_by);

-- ------------------------------------------------------------
-- TerminEinladung
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_invitations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL REFERENCES public.team_appointments(id) ON DELETE CASCADE,  -- Termin
  team_member_id UUID        NOT NULL REFERENCES public.team_members(id)      ON DELETE CASCADE,  -- Mitglied
  status         public.invitation_status NOT NULL DEFAULT 'pending',                            -- pending/accepted/declined
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at   TIMESTAMPTZ,
  -- Ein Mitglied wird pro Termin nur einmal eingeladen
  CONSTRAINT appointment_invitations_unique UNIQUE (appointment_id, team_member_id)
);

COMMENT ON TABLE public.appointment_invitations IS 'TerminEinladung: Einladung eines Team-Mitglieds zu einem Termin inkl. Antwort-Status.';

CREATE INDEX IF NOT EXISTS appointment_invitations_appointment_id_idx
  ON public.appointment_invitations (appointment_id);
CREATE INDEX IF NOT EXISTS appointment_invitations_team_member_id_idx
  ON public.appointment_invitations (team_member_id);

-- ------------------------------------------------------------
-- Row Level Security
-- Sichtbarkeit ueber Team-Mitgliedschaft (analog team_members /
-- team_invitations). team_members.user_id == auth.uid().
-- ------------------------------------------------------------
ALTER TABLE public.team_appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_invitations ENABLE ROW LEVEL SECURITY;

-- Termine: Team-Mitglieder duerfen Termine ihres Teams sehen
CREATE POLICY "appointments_select_team_members"
  ON public.team_appointments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_appointments.team_id
      AND tm.user_id = auth.uid()
  ));

-- Termine: nur Team-Mitglieder legen Termine an, und nur fuer sich als Ersteller
CREATE POLICY "appointments_insert_team_members"
  ON public.team_appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_appointments.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- Termine: nur der Ersteller darf aendern/loeschen
CREATE POLICY "appointments_update_creator"
  ON public.team_appointments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "appointments_delete_creator"
  ON public.team_appointments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Einladungen: sichtbar fuer alle Mitglieder des zugehoerigen Teams
CREATE POLICY "invitations_select_team_members"
  ON public.appointment_invitations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.team_appointments a
    JOIN public.team_members tm ON tm.team_id = a.team_id
    WHERE a.id = appointment_invitations.appointment_id
      AND tm.user_id = auth.uid()
  ));

-- Einladungen: nur der Ersteller des Termins darf einladen
CREATE POLICY "invitations_insert_appointment_creator"
  ON public.appointment_invitations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_appointments a
    WHERE a.id = appointment_invitations.appointment_id
      AND a.created_by = auth.uid()
  ));

-- Einladungen: das eingeladene Mitglied darf seinen Status beantworten
CREATE POLICY "invitations_update_invitee"
  ON public.appointment_invitations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = appointment_invitations.team_member_id
      AND tm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = appointment_invitations.team_member_id
      AND tm.user_id = auth.uid()
  ));

-- Einladungen: der Ersteller des Termins darf Einladungen entfernen
CREATE POLICY "invitations_delete_appointment_creator"
  ON public.appointment_invitations
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_appointments a
    WHERE a.id = appointment_invitations.appointment_id
      AND a.created_by = auth.uid()
  ));
