-- Enable Realtime for the notifications table so that the frontend
-- can subscribe to INSERT events and refresh team invitations.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
