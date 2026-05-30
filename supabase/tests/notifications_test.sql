-- ============================================================
-- pgTAP: In-App-Benachrichtigungen für Termine & Antworten.
-- Erstellung -> Mitglieder (außer Ersteller); Antwort -> Ersteller;
-- Templates (Titel/Zeit/Team); Idempotenz über dedup_key.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(8);

CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
INSERT INTO ids(k, v) VALUES
  ('userA', gen_random_uuid()),
  ('userB', gen_random_uuid()),
  ('team',  gen_random_uuid());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
SELECT '00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated',
       k || '@test.local', '', now(), now(), now(),
       '{"provider":"email","providers":["email"]}', '{}'
FROM ids WHERE k IN ('userA', 'userB');

INSERT INTO public.profiles (id, full_name, email, role, email_verified)
SELECT v, initcap(k), k || '@test.local', 'student', true FROM ids WHERE k IN ('userA', 'userB');

INSERT INTO public.users (id, full_name, email, auth_user_id)
SELECT v, initcap(k), k || '@test.local', v FROM ids WHERE k IN ('userA', 'userB');

INSERT INTO public.teams (id, name, created_by)
SELECT (SELECT v FROM ids WHERE k = 'team'), 'Inv Team', (SELECT v FROM ids WHERE k = 'userA');

INSERT INTO public.team_members (id, team_id, user_id, role)
VALUES
  (gen_random_uuid(), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userA'), 'owner'),
  (gen_random_uuid(), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userB'), 'member');

CREATE FUNCTION _login(p text) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT v FROM ids WHERE k = p), 'role', 'authenticated')::text, true);
END $fn$;

-- A legt einen Termin an
DO $$ BEGIN PERFORM _login('userA'); END $$;
INSERT INTO ids(k, v)
SELECT 'appt1', (public.create_team_appointment(
  (SELECT v FROM ids WHERE k = 'team'), 'Termin X', NULL,
  timestamptz '2026-06-01 09:00+00', timestamptz '2026-06-01 10:00+00')).id;

-- 1) Mitglied B wird benachrichtigt
SELECT is(
  (SELECT count(*) FROM public.notifications
   WHERE recipient_id = (SELECT v FROM ids WHERE k = 'userB') AND type = 'appointment_created'),
  1::bigint, 'eingeladenes Mitglied B erhält eine Benachrichtigung');

-- 2) Ersteller A wird NICHT über seine eigene Erstellung benachrichtigt
SELECT is(
  (SELECT count(*) FROM public.notifications
   WHERE recipient_id = (SELECT v FROM ids WHERE k = 'userA') AND type = 'appointment_created'),
  0::bigint, 'Ersteller erhält keine appointment_created-Benachrichtigung');

-- 3) Template enthält Titel, Team und eine Uhrzeit
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.notifications
    WHERE recipient_id = (SELECT v FROM ids WHERE k = 'userB')
      AND body LIKE '%Termin X%' AND body LIKE '%Inv Team%' AND body ~ '[0-9]{2}:[0-9]{2}'
  ),
  'Template enthält Termin-Titel, Team und Zeit');

-- 4) payload enthält strukturierte Daten
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.notifications
    WHERE recipient_id = (SELECT v FROM ids WHERE k = 'userB')
      AND payload ? 'team_name' AND payload ? 'starts_at' AND payload ? 'title'
  ),
  'payload enthält team_name, starts_at und title');

-- 5) dedup_key verhindert doppelte Benachrichtigungen (Retry-Schutz)
SELECT throws_ok(
  $$INSERT INTO public.notifications (recipient_id, type, title, body, dedup_key)
    SELECT recipient_id, type, title, body, dedup_key FROM public.notifications LIMIT 1$$,
  '23505', NULL, 'doppelter dedup_key wird abgelehnt (keine Duplikate bei Retries)');

-- B sagt zu -> Ersteller A wird benachrichtigt
DO $$ BEGIN PERFORM _login('userB'); END $$;
SELECT (public.respond_to_appointment_invitation(i.id, 'accepted')).id AS done
FROM public.appointment_invitations i
JOIN public.team_members tm ON tm.id = i.team_member_id
WHERE i.appointment_id = (SELECT v FROM ids WHERE k = 'appt1')
  AND tm.user_id = (SELECT v FROM ids WHERE k = 'userB') \gset

-- 6) Ersteller-Benachrichtigung mit Antwortendem + "zugesagt"
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.notifications
    WHERE recipient_id = (SELECT v FROM ids WHERE k = 'userA')
      AND type = 'invitation_accepted'
      AND body LIKE '%Userb%' AND body LIKE '%zugesagt%'
  ),
  'Ersteller wird über die Zusage (mit Name) benachrichtigt');

-- 7) get_my_notifications liefert dem Ersteller die Antwort
DO $$ BEGIN PERFORM _login('userA'); END $$;
SELECT is(
  (SELECT count(*) FROM public.get_my_notifications() WHERE type = 'invitation_accepted'),
  1::bigint, 'get_my_notifications liefert die Antwort-Benachrichtigung');

-- 8) Mitglied B sieht weiterhin nur die eigene Termin-Benachrichtigung
DO $$ BEGIN PERFORM _login('userB'); END $$;
SELECT is(
  (SELECT count(*) FROM public.get_my_notifications()),
  1::bigint, 'B sieht ausschließlich die eigene Benachrichtigung');

SELECT * FROM finish();
ROLLBACK;
