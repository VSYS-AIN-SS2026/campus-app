-- RPC to delete the current user's profile data from public.users.
-- CASCADE constraints handle user_module_statuses, user_events, timetable entries, etc.
-- For the demo user this resets all personal data; resolve_dashboard_user() will recreate
-- a fresh demo record on the next request.
CREATE OR REPLACE FUNCTION public.delete_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user public.users;
BEGIN
  SELECT * INTO resolved_user FROM public.resolve_dashboard_user();

  DELETE FROM public.users
  WHERE users.id = resolved_user.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.delete_user_profile() TO authenticated;
