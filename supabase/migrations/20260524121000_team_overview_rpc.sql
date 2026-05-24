-- RPC: Team-Übersicht
-- DTO: (id, name, short_info)
CREATE OR REPLACE FUNCTION public.get_teams_overview()
RETURNS TABLE (
  id         INTEGER,
  name       TEXT,
  short_info TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.short_info
  FROM public.teams t
  ORDER BY t.name;
$$;

REVOKE ALL ON FUNCTION public.get_teams_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teams_overview() TO anon;
GRANT EXECUTE ON FUNCTION public.get_teams_overview() TO authenticated;
