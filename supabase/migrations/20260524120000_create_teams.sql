-- Teams-Tabelle
CREATE TABLE public.teams (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  short_info  TEXT
);

-- Mitglieder-Verknüpfung: Studenten (users) <-> Teams
-- Foreign Keys stellen referenzielle Integrität sicher
CREATE TABLE public.team_members (
  team_id INTEGER NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

-- Index für effiziente Abfragen "Welche Teams hat ein Student?"
-- Der Primary Key (team_id, user_id) deckt Abfragen nach team_id bereits ab.
CREATE INDEX team_members_user_id_idx ON public.team_members(user_id);

-- RLS aktivieren
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO anon, authenticated USING (true);

-- Seed-Daten
INSERT INTO public.teams (name, description, short_info) VALUES
  ('Team Alpha', 'Entwicklung der Campus-App Frontend', 'Frontend-Team'),
  ('Team Beta',  'Backend und Datenbankentwicklung',    'Backend-Team'),
  ('Team Gamma', 'QA, Testing und Dokumentation',       'QA-Team');
