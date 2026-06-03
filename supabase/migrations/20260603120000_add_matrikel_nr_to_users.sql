-- Add matrikel_nr to users table for student profile display
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS matrikel_nr TEXT;

-- Seed demo user with a fake Matrikelnummer
UPDATE public.users
SET matrikel_nr = '273245'
WHERE email = 'alex.beispiel@htwg-konstanz.de';

-- Update get_demo_user_profile to include matrikel_nr
-- Must drop first because the return type changes (new column matrikel_nr)
DROP FUNCTION IF EXISTS public.get_demo_user_profile();

CREATE FUNCTION public.get_demo_user_profile()
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
BEGIN
  SELECT * INTO resolved_user FROM public.resolve_dashboard_user();

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

GRANT EXECUTE ON FUNCTION public.get_demo_user_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.get_demo_user_profile() TO authenticated;
