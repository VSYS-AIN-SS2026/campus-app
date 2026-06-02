-- Enable Realtime for team_invitations so the frontend can subscribe
-- to INSERT events and update the invitation counter live.
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invitations;
