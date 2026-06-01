-- ============================================================
-- Unit-/Integration-Tests (pgTAP) für get_team_free_slots.
-- Edge Cases: Rand-Slots, exkludierte Tage, überlagerte Konflikte,
-- kein Slot gefunden, Dauer-Filter, declined ignoriert, UTC/Zeitzone,
-- Authorisierung.
-- Referenzwoche: Montag 2026-06-01. tz 'UTC' (sofern nicht anders).
-- ============================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(12);

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
SELECT v, k, k || '@test.local', 'student', true FROM ids WHERE k IN ('userA', 'userB');

INSERT INTO public.users (id, full_name, email, auth_user_id)
SELECT v, k, k || '@test.local', v FROM ids WHERE k IN ('userA', 'userB');

INSERT INTO public.teams (id, name, created_by)
SELECT (SELECT v FROM ids WHERE k = 'team'), 'FreeSlot Team', (SELECT v FROM ids WHERE k = 'userA');

INSERT INTO public.team_members (id, team_id, user_id, role)
VALUES
  (gen_random_uuid(), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userA'), 'owner'),
  (gen_random_uuid(), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userB'), 'member');

-- Stundenpläne: Mo A 09-11, B 10-12 (überlappen -> belegt 09-12); Di A 08-09
INSERT INTO public.user_events (user_id, title, day_index, start_time, end_time, series_id, status)
VALUES
  ((SELECT v FROM ids WHERE k = 'userA'), 'A-Mo', 0, '09:00', '11:00', 's-a1', 'belegt'),
  ((SELECT v FROM ids WHERE k = 'userB'), 'B-Mo', 0, '10:00', '12:00', 's-b1', 'belegt'),
  ((SELECT v FROM ids WHERE k = 'userA'), 'A-Di', 1, '08:00', '09:00', 's-a2', 'belegt');

-- Termin X: Mo 13:00-14:00 UTC, A accepted (zählt). Termin Y: Mo 15:00-16:00 UTC, B declined (zählt NICHT)
INSERT INTO ids(k, v) VALUES ('apptX', gen_random_uuid()), ('apptY', gen_random_uuid());
INSERT INTO public.team_appointments (id, team_id, created_by, title, starts_at, ends_at)
VALUES
  ((SELECT v FROM ids WHERE k = 'apptX'), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userA'),
   'Termin X', timestamptz '2026-06-01 13:00:00+00', timestamptz '2026-06-01 14:00:00+00'),
  ((SELECT v FROM ids WHERE k = 'apptY'), (SELECT v FROM ids WHERE k = 'team'), (SELECT v FROM ids WHERE k = 'userA'),
   'Termin Y', timestamptz '2026-06-01 15:00:00+00', timestamptz '2026-06-01 16:00:00+00');
INSERT INTO public.appointment_invitations (appointment_id, team_member_id, status)
SELECT (SELECT v FROM ids WHERE k = 'apptX'), tm.id, 'accepted'
FROM public.team_members tm WHERE tm.user_id = (SELECT v FROM ids WHERE k = 'userA');
INSERT INTO public.appointment_invitations (appointment_id, team_member_id, status)
SELECT (SELECT v FROM ids WHERE k = 'apptY'), tm.id, 'declined'
FROM public.team_members tm WHERE tm.user_id = (SELECT v FROM ids WHERE k = 'userB');

CREATE FUNCTION _login(p text) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT v FROM ids WHERE k = p), 'role', 'authenticated')::text, true);
END $fn$;

DO $$ BEGIN PERFORM _login('userA'); END $$;

-- Basisaufruf: Montag, Dauer 60, Fenster 08-18 UTC
CREATE TEMP VIEW base AS
SELECT * FROM public.get_team_free_slots(
  (SELECT v FROM ids WHERE k = 'team'), date '2026-06-01', 60, time '08:00', time '18:00', '{}', 'UTC'
);

-- 1) Montag: 3 freie Slots (08-09, 12-13, 14-18)
SELECT is(
  (SELECT count(*) FROM base WHERE starts_at >= '2026-06-01 00:00+00' AND starts_at < '2026-06-02 00:00+00'),
  3::bigint, 'Montag liefert 3 freie Slots');

-- 2/3) Rand-Slot am Fensteranfang: exakt 08:00–09:00 UTC (Dauer == Mindestdauer)
SELECT is(
  (SELECT min(starts_at) FROM base WHERE starts_at >= '2026-06-01 00:00+00' AND starts_at < '2026-06-02 00:00+00'),
  timestamptz '2026-06-01 08:00:00+00', 'erster Montags-Slot startet am Fensterrand 08:00 UTC');
SELECT is(
  (SELECT ends_at FROM base WHERE starts_at = '2026-06-01 08:00:00+00'),
  timestamptz '2026-06-01 09:00:00+00', 'Rand-Slot endet 09:00 (genau Mindestdauer)');

-- 4) Slot zwischen überlagertem Stundenplan (Ende 12:00) und Termin X (13:00)
SELECT is(
  (SELECT count(*) FROM base WHERE starts_at = '2026-06-01 12:00:00+00' AND ends_at = '2026-06-01 13:00:00+00'),
  1::bigint, 'Lücke 12:00–13:00 zwischen Belegt-Block und Termin');

-- 5) Slot nach Termin X bis Fensterende; Termin Y (declined) wird ignoriert
SELECT is(
  (SELECT count(*) FROM base WHERE starts_at = '2026-06-01 14:00:00+00' AND ends_at = '2026-06-01 18:00:00+00'),
  1::bigint, 'durchgehender Slot 14:00–18:00 (declined-Termin Y ignoriert)');

-- 6) Überlagerte Konflikte verschmolzen: kein Slot startet zwischen 09:00 und 12:00
SELECT is(
  (SELECT count(*) FROM base WHERE starts_at > '2026-06-01 09:00:00+00' AND starts_at < '2026-06-01 12:00:00+00'),
  0::bigint, 'überlappende Stundenplan-Slots (09-11 & 10-12) sind zu 09-12 verschmolzen');

-- 7) Exkludierte Tage: Montag (0) ausgeschlossen -> keine Montags-Slots
SELECT is(
  (SELECT count(*) FROM public.get_team_free_slots(
     (SELECT v FROM ids WHERE k = 'team'), date '2026-06-01', 60, time '08:00', time '18:00', '{0}', 'UTC')
   WHERE starts_at >= '2026-06-01 00:00+00' AND starts_at < '2026-06-02 00:00+00'),
  0::bigint, 'ausgeschlossener Wochentag liefert keine Slots');

-- 8) Kein Slot gefunden: Dauer 600 in engem Fenster 08-12 -> keine Lücke lang genug
SELECT is(
  (SELECT count(*) FROM public.get_team_free_slots(
     (SELECT v FROM ids WHERE k = 'team'), date '2026-06-01', 600, time '08:00', time '12:00', '{}', 'UTC')),
  0::bigint, 'kein freier Slot wenn Mindestdauer das Fenster übersteigt');

-- 9) Zeitzone: 09:00 Europe/Berlin (Juni, DST +02) == 07:00 UTC am konfliktfreien Mittwoch
SELECT is(
  (SELECT count(*) FROM public.get_team_free_slots(
     (SELECT v FROM ids WHERE k = 'team'), date '2026-06-01', 60, time '09:00', time '17:00', '{}', 'Europe/Berlin')
   WHERE starts_at = '2026-06-03 07:00:00+00'),
  1::bigint, 'Zeitzonen-Umrechnung: 09:00 Berlin -> 07:00 UTC');

-- 10) Authorisierung: Outsider -> 42501
DO $$ BEGIN PERFORM set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}', true); END $$;
SELECT throws_ok(
  format('SELECT * FROM public.get_team_free_slots(%L::uuid, date ''2026-06-01'', 60)', (SELECT v FROM ids WHERE k = 'team')),
  '42501', NULL, 'Nicht-Mitglied erhält 403 (42501)');

-- 11) Ungültige Dauer -> Fehler
DO $$ BEGIN PERFORM _login('userA'); END $$;
SELECT throws_ok(
  format('SELECT * FROM public.get_team_free_slots(%L::uuid, date ''2026-06-01'', 0)', (SELECT v FROM ids WHERE k = 'team')),
  'P0001', NULL, 'Dauer <= 0 wird abgelehnt');

-- 12) min_start >= max_end -> leeres Ergebnis (kein Fehler)
SELECT is(
  (SELECT count(*) FROM public.get_team_free_slots(
     (SELECT v FROM ids WHERE k = 'team'), date '2026-06-01', 60, time '18:00', time '08:00', '{}', 'UTC')),
  0::bigint, 'leeres Tagesfenster (min >= max) liefert keine Slots');

SELECT * FROM finish();
ROLLBACK;
