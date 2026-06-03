-- resolve_dashboard_user() was syncing full_name from auth metadata on every login,
-- overwriting manual name changes made via update_user_profile_info.
-- full_name is now only set on the initial INSERT (same treatment as email).
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
          updated_at = now()
          -- full_name and email intentionally omitted: set once on INSERT, then managed
          -- via update_user_profile_info so manual profile edits are not overwritten.
        RETURNING * INTO resolved_user;

      EXCEPTION WHEN unique_violation THEN
        -- The email is already in public.users under a different auth_user_id
        -- (e.g. the user changed their profile email before confirming the auth
        -- email change, then signed in fresh with the new address).
        -- Re-link that row to the current auth account so the profile is preserved.
        UPDATE public.users
        SET
          auth_user_id = current_auth_user_id,
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
