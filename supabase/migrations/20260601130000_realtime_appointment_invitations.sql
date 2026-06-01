-- ============================================================
-- Supabase Realtime: appointment_invitations
--
-- 1. Add the table to the supabase_realtime publication so
--    row-level change events are broadcast to subscribers.
--
-- 2. Add an invitee-scoped SELECT policy alongside the existing
--    team-wide policy.  The existing policy grants every team
--    member visibility of all invitations for their team's
--    appointments (useful for coordinators / overview screens).
--    The new policy adds a direct, low-cost path that lets the
--    invited user read their own rows via team_member_id, which
--    Supabase Realtime evaluates per-row when filtering with
--    team_member_id=eq.<memberId>.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_invitations;

-- Invitee may always read their own invitation row directly.
-- More efficient for Realtime than the team-join policy because
-- it resolves in a single index lookup on team_members.id.
CREATE POLICY "invitations_select_own_invitee"
  ON public.appointment_invitations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id  = appointment_invitations.team_member_id
      AND tm.user_id = auth.uid()
  ));
