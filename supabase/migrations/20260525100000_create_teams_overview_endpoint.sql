-- VSYS26T4-54: get_teams() RPC – gibt alle Teams als Übersicht zurück
-- teams-Tabelle wird bereits in 20260524120000_create_teams.sql angelegt (id SERIAL)

CREATE OR REPLACE FUNCTION public.get_teams()
RETURNS TABLE (
  id         INTEGER,
  name       TEXT,
  short_info TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    COALESCE(t.short_info, left(t.description, 120)) AS short_info
  FROM public.teams t
  ORDER BY t.name;
$$;

REVOKE ALL ON FUNCTION public.get_teams() FROM public;
GRANT EXECUTE ON FUNCTION public.get_teams() TO anon;
GRANT EXECUTE ON FUNCTION public.get_teams() TO authenticated;
