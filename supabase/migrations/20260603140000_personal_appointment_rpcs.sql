-- Fixes get_my_personal_appointments to use resolve_dashboard_user() so that
-- the demo user fallback works and the users table is not queried directly.
-- Adds create_my_personal_appointment and delete_my_personal_appointment RPCs.

CREATE OR REPLACE FUNCTION public.get_my_personal_appointments(p_week_start DATE)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  description TEXT,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
BEGIN
  SELECT * INTO v_user FROM public.resolve_dashboard_user();

  RETURN QUERY
  SELECT pa.id, pa.title, pa.description, pa.starts_at, pa.ends_at
  FROM public.personal_appointments pa
  WHERE pa.user_id = v_user.id
    AND pa.starts_at < (p_week_start + INTERVAL '7 days')
    AND pa.ends_at   > p_week_start::TIMESTAMPTZ;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_my_personal_appointment(
  p_title       TEXT,
  p_starts_at   TIMESTAMPTZ,
  p_ends_at     TIMESTAMPTZ,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   public.users;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_user FROM public.resolve_dashboard_user();

  INSERT INTO public.personal_appointments (user_id, title, description, starts_at, ends_at)
  VALUES (v_user.id, trim(p_title), p_description, p_starts_at, p_ends_at)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_personal_appointment(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
BEGIN
  SELECT * INTO v_user FROM public.resolve_dashboard_user();

  DELETE FROM public.personal_appointments
  WHERE id = p_id AND user_id = v_user.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_personal_appointments(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_my_personal_appointment(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_personal_appointment(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_personal_appointments(DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_personal_appointments(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_personal_appointment(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_my_personal_appointment(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_personal_appointment(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_my_personal_appointment(UUID) TO authenticated;
