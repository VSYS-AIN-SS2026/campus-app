CREATE OR REPLACE FUNCTION public.delete_notification(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_done BOOLEAN := FALSE;
BEGIN
  DELETE FROM public.notifications
  WHERE id = p_id AND recipient_id = auth.uid()
  RETURNING TRUE INTO v_done;
  RETURN COALESCE(v_done, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_notification(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_notification(UUID) TO authenticated;
