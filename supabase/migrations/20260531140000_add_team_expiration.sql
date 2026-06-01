-- Add expiration date to teams for automatic deletion

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Allow team owners to update their teams (needed for setting expires_at)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'teams_update_owner'
  ) THEN
    CREATE POLICY "teams_update_owner" ON public.teams
      FOR UPDATE TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- Function that deletes all expired teams
CREATE OR REPLACE FUNCTION public.cleanup_expired_teams()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.teams
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Dev override: callable RPC to trigger cleanup manually
CREATE OR REPLACE FUNCTION public.trigger_team_cleanup()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.cleanup_expired_teams();
$$;

REVOKE ALL ON FUNCTION public.trigger_team_cleanup() FROM public;
GRANT EXECUTE ON FUNCTION public.trigger_team_cleanup() TO authenticated;

-- Schedule daily cleanup via pg_cron (runs at 03:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-expired-teams',
  '0 3 * * *',
  'SELECT public.cleanup_expired_teams();'
);
