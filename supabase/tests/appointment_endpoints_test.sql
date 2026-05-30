-- ============================================================
-- Integration-Tests (pgTAP) fuer die Termin-/Einladungs-Endpunkte
--   supabase test db
-- Deckt ab: CRUD, Zeitraum-Read (UTC), Statuswechsel sowie
-- Authorisierung. Permission-Verletzungen werfen SQLSTATE 42501,
-- das PostgREST als HTTP 403 ausliefert.
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(21);

-- ------------------------------------------------------------
-- Setup (als postgres): 3 Nutzer (A=owner, B=member, C=outsider),
-- ein Team mit A und B als Mitgliedern.
-- ------------------------------------------------------------
CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
INSERT INTO ids(k, v) VALUES
  ('userA', gen_random_uuid()),
  ('userB', gen_random_uuid()),
  ('userC', gen_random_uuid()),
  ('team',  gen_random_uuid());

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
SELECT '00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated',
       k || '@test.local', '', now(), now(), now(),
       '{"provider":"email","providers":["email"]}', '{}'
FROM ids WHERE k IN ('userA', 'userB', 'userC');

INSERT INTO public.profiles (id, full_name, email, role, email_verified)
SELECT v, k, k || '@test.local', 'student', true
FROM ids WHERE k IN ('userA', 'userB', 'userC');

INSERT INTO public.users (id, full_name, email, auth_user_id)
SELECT v, k, k || '@test.local', v
FROM ids WHERE k IN ('userA', 'userB', 'userC');

INSERT INTO public.teams (id, name, created_by)
SELECT (SELECT v FROM ids WHERE k = 'team'), 'Test Team', (SELECT v FROM ids WHERE k = 'userA');

INSERT INTO public.team_members (id, team_id, user_id, role)
VALUES
  (gen_random_uuid(), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userA'), 'owner'),
  (gen_random_uuid(), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userB'), 'member');

INSERT INTO ids(k, v)
SELECT 'memberA', id FROM public.team_members
WHERE team_id = (SELECT v FROM ids WHERE k = 'team') AND user_id = (SELECT v FROM ids WHERE k = 'userA');
INSERT INTO ids(k, v)
SELECT 'memberB', id FROM public.team_members
WHERE team_id = (SELECT v FROM ids WHERE k = 'team') AND user_id = (SELECT v FROM ids WHERE k = 'userB');

-- Login-Helfer: setzt request.jwt.claims (auth.uid())
CREATE FUNCTION _login(p text) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT v FROM ids WHERE k = p), 'role', 'authenticated')::text, true);
END $fn$;
CREATE FUNCTION _logout() RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
END $fn$;

-- ------------------------------------------------------------
-- create_team_appointment (als Mitglied A) + Einladungen
-- ------------------------------------------------------------
DO $$ BEGIN PERFORM _login('userA'); END $$;

INSERT INTO ids(k, v)
SELECT 'appt1', (public.create_team_appointment(
  (SELECT v FROM ids WHERE k = 'team'),
  'Sprint Planning', 'Beschreibung',
  TIMESTAMPTZ '2026-06-02 09:00:00+00', TIMESTAMPTZ '2026-06-02 10:30:00+00'
)).id;

INSERT INTO ids(k, v)
SELECT 'invB', i.id FROM public.appointment_invitations i
WHERE i.appointment_id = (SELECT v FROM ids WHERE k = 'appt1')
  AND i.team_member_id = (SELECT v FROM ids WHERE k = 'memberB');

SELECT is(
  (SELECT count(*) FROM public.appointment_invitations
   WHERE appointment_id = (SELECT v FROM ids WHERE k = 'appt1')),
  2::bigint, 'create_team_appointment lädt alle Team-Mitglieder ein');

-- Ersteller (A) automatisch accepted, übrige (B) pending
SELECT is(
  (SELECT status::text FROM public.appointment_invitations
   WHERE appointment_id = (SELECT v FROM ids WHERE k = 'appt1')
     AND team_member_id = (SELECT v FROM ids WHERE k = 'memberA')),
  'accepted', 'Ersteller-Einladung ist direkt accepted');

SELECT is(
  (SELECT status::text FROM public.appointment_invitations
   WHERE appointment_id = (SELECT v FROM ids WHERE k = 'appt1')
     AND team_member_id = (SELECT v FROM ids WHERE k = 'memberB')),
  'pending', 'übrige Mitglieder-Einladung bleibt pending');

SELECT is(
  (SELECT count(*) FROM public.get_team_appointments((SELECT v FROM ids WHERE k = 'team'))),
  1::bigint, 'Mitglied A sieht die Termine des Teams');

-- ------------------------------------------------------------
-- Lesen als Mitglied B (erlaubt)
-- ------------------------------------------------------------
DO $$ BEGIN PERFORM _login('userB'); END $$;

SELECT ok(
  (public.get_team_appointment((SELECT v FROM ids WHERE k = 'appt1'))).team_id
    = (SELECT v FROM ids WHERE k = 'team'),
  'Mitglied B kann einen einzelnen Termin lesen');

-- ------------------------------------------------------------
-- Outsider C: lesen/anlegen -> 403 (42501)
-- ------------------------------------------------------------
DO $$ BEGIN PERFORM _login('userC'); END $$;

SELECT throws_ok(
  format('SELECT * FROM public.get_team_appointment(%L::uuid)', (SELECT v FROM ids WHERE k = 'appt1')),
  '42501', NULL, 'Outsider darf einzelnen Termin NICHT lesen -> 403');

SELECT throws_ok(
  format('SELECT * FROM public.get_team_appointments(%L::uuid)', (SELECT v FROM ids WHERE k = 'team')),
  '42501', NULL, 'Outsider darf Termin-Liste NICHT lesen -> 403');

SELECT throws_ok(
  format('SELECT public.create_team_appointment(%L::uuid, %L, NULL, %L::timestamptz, %L::timestamptz)',
         (SELECT v FROM ids WHERE k = 'team'), 'Hack',
         '2026-06-03 09:00:00+00', '2026-06-03 10:00:00+00'),
  '42501', NULL, 'Outsider darf KEINEN Termin anlegen -> 403');

-- ------------------------------------------------------------
-- Unauthentifiziert: anlegen -> 403
-- ------------------------------------------------------------
DO $$ BEGIN PERFORM _logout(); END $$;

SELECT throws_ok(
  format('SELECT public.create_team_appointment(%L::uuid, %L, NULL, %L::timestamptz, %L::timestamptz)',
         (SELECT v FROM ids WHERE k = 'team'), 'Anon',
         '2026-06-03 09:00:00+00', '2026-06-03 10:00:00+00'),
  '42501', NULL, 'Unauthentifizierter Aufruf -> 403');

-- ------------------------------------------------------------
-- update_team_appointment: Ersteller A darf, Mitglied B nicht
-- ------------------------------------------------------------
DO $$ BEGIN PERFORM _login('userA'); END $$;

SELECT is(
  (public.update_team_appointment((SELECT v FROM ids WHERE k = 'appt1'), 'Neuer Titel')).title,
  'Neuer Titel', 'Ersteller A kann den Termin aktualisieren');

DO $$ BEGIN PERFORM _login('userB'); END $$;

SELECT throws_ok(
  format('SELECT public.update_team_appointment(%L::uuid, %L)', (SELECT v FROM ids WHERE k = 'appt1'), 'Nope'),
  '42501', NULL, 'Nicht-Ersteller darf NICHT aktualisieren -> 403');

-- ------------------------------------------------------------
-- respond_to_appointment_invitation: nur das eingeladene Mitglied
-- ------------------------------------------------------------
DO $$ BEGIN PERFORM _login('userB'); END $$;

SELECT is(
  (public.respond_to_appointment_invitation((SELECT v FROM ids WHERE k = 'invB'), 'accepted')).status::text,
  'accepted', 'Eingeladenes Mitglied B kann annehmen');

DO $$ BEGIN PERFORM _login('userA'); END $$;

SELECT throws_ok(
  format('SELECT public.respond_to_appointment_invitation(%L::uuid, %L)',
         (SELECT v FROM ids WHERE k = 'invB'), 'declined'),
  '42501', NULL, 'Fremdes Mitglied darf Status NICHT ändern -> 403');

DO $$ BEGIN PERFORM _login('userB'); END $$;

SELECT throws_ok(
  format('SELECT public.respond_to_appointment_invitation(%L::uuid, %L)',
         (SELECT v FROM ids WHERE k = 'invB'), 'pending'),
  'P0001', NULL, 'Ungültiger Status (pending) wird abgelehnt');

-- ------------------------------------------------------------
-- delete_team_appointment: Nicht-Ersteller nein, Ersteller ja (+Cascade)
-- ------------------------------------------------------------
SELECT throws_ok(
  format('SELECT public.delete_team_appointment(%L::uuid)', (SELECT v FROM ids WHERE k = 'appt1')),
  '42501', NULL, 'Nicht-Ersteller darf NICHT löschen -> 403');

DO $$ BEGIN PERFORM _login('userA'); END $$;

SELECT is(
  public.delete_team_appointment((SELECT v FROM ids WHERE k = 'appt1')),
  true, 'Ersteller A kann den Termin löschen');

SELECT is(
  (SELECT count(*) FROM public.appointment_invitations
   WHERE appointment_id = (SELECT v FROM ids WHERE k = 'appt1')),
  0::bigint, 'Einladungen werden mit dem Termin gelöscht (Cascade)');

-- ------------------------------------------------------------
-- Zeitfilter auf UTC-Basis
-- Termin appt2 startet 2026-06-10 09:00:00 UTC.
-- ------------------------------------------------------------
INSERT INTO ids(k, v)
SELECT 'appt2', (public.create_team_appointment(
  (SELECT v FROM ids WHERE k = 'team'), 'UTC Test', NULL,
  TIMESTAMPTZ '2026-06-10 09:00:00+00', TIMESTAMPTZ '2026-06-10 10:00:00+00'
)).id;

SELECT is(
  (SELECT count(*) FROM public.get_team_appointments(
     (SELECT v FROM ids WHERE k = 'team'),
     TIMESTAMPTZ '2026-06-10 00:00:00+00', TIMESTAMPTZ '2026-06-11 00:00:00+00') g
   WHERE g.id = (SELECT v FROM ids WHERE k = 'appt2')),
  1::bigint, 'Termin liegt im UTC-Zeitfenster des Tages');

SELECT is(
  (SELECT count(*) FROM public.get_team_appointments(
     (SELECT v FROM ids WHERE k = 'team'),
     TIMESTAMPTZ '2026-06-10 09:00:01+00', NULL) g
   WHERE g.id = (SELECT v FROM ids WHERE k = 'appt2')),
  0::bigint, 'from nach Startzeitpunkt schließt den Termin aus');

-- Obergrenze als +02-Offset == 09:00:01 UTC -> Termin (09:00 UTC) eingeschlossen
SELECT is(
  (SELECT count(*) FROM public.get_team_appointments(
     (SELECT v FROM ids WHERE k = 'team'),
     NULL, TIMESTAMPTZ '2026-06-10 11:00:01+02') g
   WHERE g.id = (SELECT v FROM ids WHERE k = 'appt2')),
  1::bigint, 'Zeitzonen-Obergrenze wird korrekt nach UTC verglichen (eingeschlossen)');

-- Obergrenze als +02-Offset == 09:00:00 UTC == Startzeit -> ausgeschlossen (strikt <)
SELECT is(
  (SELECT count(*) FROM public.get_team_appointments(
     (SELECT v FROM ids WHERE k = 'team'),
     NULL, TIMESTAMPTZ '2026-06-10 11:00:00+02') g
   WHERE g.id = (SELECT v FROM ids WHERE k = 'appt2')),
  0::bigint, 'Zeitzonen-Obergrenze == Start (UTC) schließt strikt aus');

SELECT * FROM finish();
ROLLBACK;
