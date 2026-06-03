-- Fix 1: resolve_dashboard_user() used to sync email from auth.users on every call.
-- This caused a unique_violation on users_email_key when auth.users.email had changed to
-- an address already registered by a different public.users row (e.g. the user created a
-- second account with the new email before confirming the change on the original account).
-- Email is now only set on the initial INSERT; subsequent logins only sync full_name.
-- Email changes are managed explicitly via update_user_profile_info.
CREATE OR REPLACE FUNCTION public.resolve_dashboard_user()
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_auth_user_id uuid;
  current_auth_email   text;
  current_auth_name    text;
  resolved_user        public.users;
BEGIN
  current_auth_user_id := auth.uid();

  IF current_auth_user_id IS NOT NULL THEN
    SELECT
      lower(au.email),
      coalesce(
        nullif(trim(concat_ws(
          ' ',
          nullif(trim(coalesce(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'given_name', '')), ''),
          nullif(trim(coalesce(au.raw_user_meta_data->>'last_name', au.raw_user_meta_data->>'family_name', '')), '')
        )), ''),
        nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), '')
      )
    INTO
      current_auth_email,
      current_auth_name
    FROM auth.users AS au
    WHERE au.id = current_auth_user_id
    LIMIT 1;

    IF current_auth_name IS NOT NULL THEN
      BEGIN
        INSERT INTO public.users (auth_user_id, email, full_name, updated_at)
        VALUES (
          current_auth_user_id,
          coalesce(current_auth_email, current_auth_user_id::text || '@no-email.local'),
          current_auth_name,
          now()
        )
        ON CONFLICT ON CONSTRAINT users_auth_user_id_key
        DO UPDATE SET
          full_name  = excluded.full_name,
          updated_at = now()
          -- email intentionally omitted: set once on INSERT, then managed via
          -- update_user_profile_info to avoid unique_violation when the auth email
          -- changes to an address already used by another public.users row.
        RETURNING * INTO resolved_user;

      EXCEPTION WHEN unique_violation THEN
        -- The email is already in public.users under a different auth_user_id
        -- (e.g. the user changed their profile email before confirming the auth
        -- email change, then signed in fresh with the new address).
        -- Re-link that row to the current auth account so the profile is preserved.
        UPDATE public.users
        SET
          auth_user_id = current_auth_user_id,
          full_name    = current_auth_name,
          updated_at   = now()
        WHERE email = current_auth_email
        RETURNING * INTO resolved_user;
      END;

      RETURN resolved_user;
    END IF;
  END IF;

  -- Demo user fallback
  SELECT *
  INTO resolved_user
  FROM public.users
  WHERE users.email = 'alex.beispiel@htwg-konstanz.de'
  LIMIT 1;

  IF resolved_user.id IS NULL THEN
    INSERT INTO public.users (email, full_name, updated_at)
    VALUES ('alex.beispiel@htwg-konstanz.de', 'Alex Beispiel', now())
    ON CONFLICT ON CONSTRAINT users_email_key
    DO UPDATE SET updated_at = now()
    RETURNING * INTO resolved_user;
  END IF;

  RETURN resolved_user;
END;
$$;

-- Fix 2: update_user_profile_info now always updates public.users.email for all users
-- (previously it was only updated for the demo user; auth users got new_email = null).
-- A duplicate-email check raises a clear exception instead of leaking a raw DB error.
DROP FUNCTION IF EXISTS public.update_user_profile_info(text, text, text);

CREATE FUNCTION public.update_user_profile_info(
  new_full_name   text,
  new_matrikel_nr text DEFAULT NULL,
  new_email       text DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  full_name        text,
  email            text,
  study_program_id uuid,
  spo_id           uuid,
  matrikel_nr      text,
  created_at       timestamp with time zone,
  updated_at       timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_user   public.users;
  trimmed_name    text;
  trimmed_email   text;
  effective_email text;
  target_id       uuid;
BEGIN
  trimmed_name := trim(coalesce(new_full_name, ''));

  IF char_length(trimmed_name) = 0 THEN
    RAISE EXCEPTION 'Name darf nicht leer sein';
  END IF;

  trimmed_email := nullif(trim(lower(coalesce(new_email, ''))), '');

  SELECT * INTO resolved_user FROM public.resolve_dashboard_user();

  -- Guard against taking an email that belongs to a different account.
  IF trimmed_email IS NOT NULL AND trimmed_email IS DISTINCT FROM resolved_user.email THEN
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = trimmed_email
        AND u.id != resolved_user.id
    ) THEN
      RAISE EXCEPTION 'email_bereits_vergeben';
    END IF;
  END IF;

  -- Store into plain local variables to avoid "column reference is ambiguous" errors
  -- caused by the RETURNS TABLE OUT parameters sharing names with the target table
  -- columns (id, email, full_name, etc.).
  effective_email := coalesce(trimmed_email, resolved_user.email);
  target_id       := resolved_user.id;

  UPDATE public.users AS pu
  SET
    full_name   = trimmed_name,
    matrikel_nr = nullif(trim(coalesce(new_matrikel_nr, '')), ''),
    email       = effective_email,
    updated_at  = now()
  WHERE pu.id = target_id
  RETURNING pu.* INTO resolved_user;

  RETURN QUERY
  SELECT
    resolved_user.id,
    resolved_user.full_name,
    resolved_user.email,
    resolved_user.study_program_id,
    resolved_user.spo_id,
    resolved_user.matrikel_nr,
    resolved_user.created_at,
    resolved_user.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile_info(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_user_profile_info(text, text, text) TO authenticated;
