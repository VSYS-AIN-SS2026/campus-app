-- RPC: Team-Übersicht (legacy INTEGER version — always CREATE OR REPLACE, safe to re-run)
-- Skipped: the UUID-based get_teams() from 20260525100000 supersedes this.
-- Only create if the INTEGER-based teams table exists.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.get_teams_overview()
      RETURNS TABLE (
        id         INTEGER,
        name       TEXT,
        short_info TEXT
      )
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT t.id, t.name, t.short_info
        FROM public.teams t
        ORDER BY t.name;
      $body$;
    $fn$;

    REVOKE ALL ON FUNCTION public.get_teams_overview() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.get_teams_overview() TO anon;
    GRANT EXECUTE ON FUNCTION public.get_teams_overview() TO authenticated;
  END IF;
END $$;
