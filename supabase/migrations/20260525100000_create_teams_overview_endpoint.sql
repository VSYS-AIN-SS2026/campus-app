-- VSYS26T4-54: Endpoint für Team-Übersicht
-- DTO: (id, name, short_info)

CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_teams()
RETURNS TABLE (
  id         UUID,
  name       TEXT,
  short_info TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    left(t.description, 120) AS short_info
  FROM public.teams t
  ORDER BY t.name;
$$;

REVOKE ALL ON FUNCTION public.get_teams() FROM public;
GRANT EXECUTE ON FUNCTION public.get_teams() TO anon;
GRANT EXECUTE ON FUNCTION public.get_teams() TO authenticated;

-- Seed-Daten
DO $$
DECLARE
  creator_id UUID;
BEGIN
  SELECT au.id INTO creator_id
  FROM auth.users au
  JOIN public.users pu ON lower(pu.email) = lower(au.email)
  LIMIT 1;

  IF creator_id IS NULL THEN
    SELECT id INTO creator_id FROM auth.users LIMIT 1;
  END IF;

  IF creator_id IS NOT NULL THEN
    INSERT INTO public.teams (id, name, description, created_by) VALUES
      ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
       'Team Alpha',
       'Arbeitet an Backend-Services und API-Design fuer das Campus-Verwaltungssystem.',
       creator_id),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
       'Team Beta',
       'Verantwortlich fuer Frontend-Entwicklung und UI/UX-Design.',
       creator_id),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
       'Team Gamma',
       'Zustaendig fuer Datenbankdesign und Performance-Optimierungen.',
       creator_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
