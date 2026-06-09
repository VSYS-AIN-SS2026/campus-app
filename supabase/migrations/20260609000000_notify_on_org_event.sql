-- ============================================================
-- Trigger: Benachrichtigung an alle Mitglieder einer Organisation,
-- wenn ein neues Event in ihrer Organisation erstellt wird.
-- Design identisch zum Terminbenachrichtigungs-Muster
-- (20260530170000_notifications.sql / 20260602130000_notify_on_team_invitation.sql).
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_org_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name TEXT;
BEGIN
  SELECT name INTO v_org_name
  FROM public.organisations
  WHERE id = NEW.organisation_id;

  INSERT INTO public.notifications (recipient_id, type, title, body, payload, dedup_key)
  SELECT
    om.user_id,
    'organisation_event_created',
    'Neues Event: ' || NEW.title,
    format('"%s" in %s am %s.',
           NEW.title,
           COALESCE(v_org_name, 'deiner Organisation'),
           to_char(NEW.starts_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI')),
    jsonb_build_object(
      'organisation_id',   NEW.organisation_id,
      'organisation_name', v_org_name,
      'event_id',          NEW.id,
      'title',             NEW.title,
      'starts_at',         NEW.starts_at,
      'ends_at',           NEW.ends_at
    ),
    'org_event:' || NEW.id::text || ':' || om.user_id::text
  FROM public.organisation_members om
  WHERE om.organisation_id = NEW.organisation_id
    AND om.user_id <> NEW.created_by
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS org_event_notify ON public.organisation_events;
CREATE TRIGGER org_event_notify
  AFTER INSERT ON public.organisation_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_org_event();
