-- ============================================================
-- RPC: delete_organisation(p_organisation_id)
-- Löscht eine Organisation vollständig inkl. aller Events und
-- Mitgliedschaften. Nur der Ersteller (role = 'owner') darf löschen.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_organisation(p_organisation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE organisation_id = p_organisation_id
      AND user_id = v_uid
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'forbidden: only the owner can delete the organisation';
  END IF;

  -- Gespeicherte Events müssen vor den Events selbst entfernt werden
  DELETE FROM public.saved_organisation_events
  WHERE event_id IN (
    SELECT id FROM public.organisation_events
    WHERE organisation_id = p_organisation_id
  );

  DELETE FROM public.organisation_events
  WHERE organisation_id = p_organisation_id;

  DELETE FROM public.organisation_members
  WHERE organisation_id = p_organisation_id;

  DELETE FROM public.organisations
  WHERE id = p_organisation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_organisation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_organisation(UUID) TO authenticated;
