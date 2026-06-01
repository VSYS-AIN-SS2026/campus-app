-- VSYS26T4-61: DB-Optimierungen evaluieren
-- team_members Tabelle + Indizes für effiziente FK-Auflösung

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id   UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Indizes: PostgreSQL legt bei FK-Spalten auf der referenzierenden Seite
-- keinen automatischen Index an. Ohne diese Indizes würde jeder Join
-- über team_members einen Full Table Scan auslösen.
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members (team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members (user_id);

-- Seed: Demo-User in Team Alpha (idempotent)
INSERT INTO public.team_members (team_id, user_id)
SELECT
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  u.auth_user_id
FROM public.users u
WHERE u.email = 'alex.beispiel@htwg-konstanz.de'
  AND u.auth_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
