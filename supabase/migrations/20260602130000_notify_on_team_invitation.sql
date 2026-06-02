-- Create a notification row whenever a team invitation is inserted,
-- so the notifications Realtime channel delivers it to the bell icon.
CREATE OR REPLACE FUNCTION public.notify_team_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_name TEXT;
  v_inviter_name TEXT;
BEGIN
  SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;
  SELECT full_name INTO v_inviter_name FROM public.profiles WHERE id = NEW.invited_by;

  INSERT INTO public.notifications (recipient_id, team_id, type, title, body, payload, dedup_key)
  VALUES (
    NEW.invited_user_id,
    NEW.team_id,
    'team_invitation',
    'Teameinladung: ' || COALESCE(v_team_name, 'Unbekannt'),
    format('%s hat dich zum Team "%s" eingeladen.',
           COALESCE(v_inviter_name, 'Ein Mitglied'), COALESCE(v_team_name, 'Unbekannt')),
    jsonb_build_object('team_id', NEW.team_id, 'team_name', v_team_name, 'invitation_id', NEW.id),
    'team_inv:' || NEW.id::text
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER team_invitation_notify
  AFTER INSERT ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_invitation();
