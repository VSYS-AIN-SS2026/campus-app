-- RPC to update the user's own name and Matrikelnummer
CREATE OR REPLACE FUNCTION public.update_user_profile_info(
  new_full_name text,
  new_matrikel_nr text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  study_program_id uuid,
  spo_id uuid,
  matrikel_nr text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user public.users;
  trimmed_name text;
BEGIN
  trimmed_name := trim(coalesce(new_full_name, ''));

  IF char_length(trimmed_name) = 0 THEN
    RAISE EXCEPTION 'Name darf nicht leer sein';
  END IF;

  SELECT * INTO resolved_user FROM public.resolve_dashboard_user();

  UPDATE public.users
  SET
    full_name   = trimmed_name,
    matrikel_nr = nullif(trim(coalesce(new_matrikel_nr, '')), ''),
    updated_at  = now()
  WHERE users.id = resolved_user.id
  RETURNING * INTO resolved_user;

  RETURN QUERY
  SELECT
    resolved_user.id,
    resolved_user.full_name,
    resolved_user.email,
    resolved_user.study_program_id,
    resolved_user.spo_id,
    resolved_user.matrikel_nr,
    resolved_user.created_at,
    resolved_user.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile_info(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_user_profile_info(text, text) TO authenticated;
