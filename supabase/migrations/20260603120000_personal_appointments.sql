CREATE TABLE IF NOT EXISTS public.personal_appointments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL CHECK (char_length(trim(title)) >= 1),
  description TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ends_after_start CHECK (ends_at > starts_at)
);

ALTER TABLE public.personal_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner access"
  ON public.personal_appointments
  FOR ALL
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS personal_appointments_user_time_idx
  ON public.personal_appointments (user_id, starts_at, ends_at);

-- RPC: Eigene Termine für eine gegebene Woche abrufen.
-- p_week_start: Montag der gewünschten Woche (DATE).
-- Gibt alle persönlichen Termine zurück, die in diese Woche fallen (UTC-Vergleich).
CREATE OR REPLACE FUNCTION public.get_my_personal_appointments(p_week_start DATE)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  description TEXT,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.id, pa.title, pa.description, pa.starts_at, pa.ends_at
  FROM public.personal_appointments pa
  JOIN public.users u ON u.id = pa.user_id
  WHERE u.auth_user_id = auth.uid()
    AND pa.starts_at < (p_week_start + INTERVAL '7 days')
    AND pa.ends_at   > p_week_start::TIMESTAMPTZ;
$$;

REVOKE ALL ON FUNCTION public.get_my_personal_appointments(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_personal_appointments(DATE) TO authenticated;
