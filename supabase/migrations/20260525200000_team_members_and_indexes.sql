-- VSYS26T4-61: team_members-Tabelle und Indizes
-- team_members wird bereits in 20260524120000_create_teams.sql angelegt,
-- diese Migration ergänzt nur fehlende Indizes und einen Demo-Seed.

-- Indizes für effiziente FK-Auflösung (PostgreSQL legt bei FK-Spalten
-- auf der referenzierenden Seite keinen automatischen Index an)
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members (user_id);

-- Seed: Demo-User in Team Alpha eintragen (per Name-Lookup, kein hardcodierter UUID)
INSERT INTO public.team_members (team_id, user_id)
SELECT
  t.id,
  u.id
FROM public.teams t
JOIN public.users u ON lower(u.email) = 'alex.beispiel@htwg-konstanz.de'
WHERE t.name = 'Team Alpha'
  AND u.id IS NOT NULL
ON CONFLICT DO NOTHING;
