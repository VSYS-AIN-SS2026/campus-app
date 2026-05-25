-- VSYS26T4-57: Endpoint für Team-Details
-- DTO: (name, description, members [{name, email}])

CREATE OR REPLACE FUNCTION public.get_team_details(p_team_id UUID)
RETURNS TABLE (
  name        TEXT,
  description TEXT,
  members     JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.name,
    t.description,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('name', pu.full_name, 'email', pu.email)
        ORDER BY pu.full_name
      ) FILTER (WHERE pu.id IS NOT NULL),
      '[]'::jsonb
    ) AS members
  FROM public.teams t
  LEFT JOIN public.team_members tm ON tm.team_id = t.id
  LEFT JOIN public.users pu ON pu.auth_user_id = tm.user_id
  WHERE t.id = p_team_id
  GROUP BY t.id, t.name, t.description;
$$;

REVOKE ALL ON FUNCTION public.get_team_details(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_team_details(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_team_details(UUID) TO authenticated;
