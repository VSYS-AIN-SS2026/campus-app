-- VSYS26T4-57: get_team_details() RPC – Details + Mitglieder eines Teams
-- Ersetzt die Version aus 20260524122000 (gleiche Signatur, verbesserte JOIN-Logik)

CREATE OR REPLACE FUNCTION public.get_team_details(p_team_id INTEGER)
RETURNS TABLE (
  team_name        TEXT,
  description      TEXT,
  member_full_name TEXT,
  member_email     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.name        AS team_name,
    t.description,
    u.full_name   AS member_full_name,
    u.email       AS member_email
  FROM public.teams t
  LEFT JOIN public.team_members tm ON tm.team_id = t.id
  LEFT JOIN public.users u         ON u.id = tm.user_id
  WHERE t.id = p_team_id
  ORDER BY u.full_name NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_team_details(INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION public.get_team_details(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_team_details(INTEGER) TO authenticated;
