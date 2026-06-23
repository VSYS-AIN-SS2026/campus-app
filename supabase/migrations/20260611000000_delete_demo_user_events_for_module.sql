-- Neue RPC: Löscht alle importierten LSF-Termine eines Moduls für den
-- aktuellen Nutzer. Wird aufgerufen, wenn ein Modul nicht mehr als "belegt"
-- markiert ist, damit die importierten Termine aus der Wochenansicht
-- verschwinden.
--
-- Join-Kette: user_events.lsf_event_id → lsf_events.course_id → courses.module_id

CREATE OR REPLACE FUNCTION public.delete_demo_user_events_for_module(
  p_module_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  DELETE FROM public.user_events ue
  WHERE ue.user_id = v_user_id
    AND EXISTS (
      SELECT 1
      FROM public.lsf_events le
      JOIN public.courses c ON c.id = le.course_id
      WHERE le.id = ue.lsf_event_id
        AND c.module_id = p_module_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_demo_user_events_for_module(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_demo_user_events_for_module(UUID) TO authenticated;
