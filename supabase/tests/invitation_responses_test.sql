-- ============================================================
-- pgTAP: Termin-Einladungen zusagen/absagen.
-- Eigene offene Einladungen, Persistenz, kein Doppel-Beantworten,
-- Mitgliedsname in get_team_appointments.
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

-- A legt zwei Termine an (A -> accepted, B -> pending)
DO $$ BEGIN PERFORM _login('userA'); END $$;
INSERT INTO ids(k, v)
SELECT 'appt1', (public.create_team_appointment(
  (SELECT v FROM ids WHERE k = 'team'), 'Termin 1', NULL,
  timestamptz '2026-06-01 09:00+00', timestamptz '2026-06-01 10:00+00')).id;
INSERT INTO ids(k, v)
SELECT 'appt2', (public.create_team_appointment(
  (SELECT v FROM ids WHERE k = 'team'), 'Termin 2', NULL,
  timestamptz '2026-06-02 09:00+00', timestamptz '2026-06-02 10:00+00')).id;

-- Bs Einladungs-IDs merken
INSERT INTO ids(k, v)
SELECT 'invB1', i.id FROM public.appointment_invitations i
JOIN public.team_members tm ON tm.id = i.team_member_id
WHERE i.appointment_id = (SELECT v FROM ids WHERE k = 'appt1')
  AND tm.user_id = (SELECT v FROM ids WHERE k = 'userB');
INSERT INTO ids(k, v)
SELECT 'invB2', i.id FROM public.appointment_invitations i
JOIN public.team_members tm ON tm.id = i.team_member_id
WHERE i.appointment_id = (SELECT v FROM ids WHERE k = 'appt2')
  AND tm.user_id = (SELECT v FROM ids WHERE k = 'userB');

-- 1) B hat zwei offene Einladungen
DO $$ BEGIN PERFORM _login('userB'); END $$;
SELECT is(
  (SELECT count(*) FROM public.get_my_appointment_invitations()),
  2::bigint, 'B sieht 2 offene Einladungen');

-- 2) A (Ersteller, accepted) hat keine offenen Einladungen
DO $$ BEGIN PERFORM _login('userA'); END $$;
SELECT is(
  (SELECT count(*) FROM public.get_my_appointment_invitations()),
  0::bigint, 'A (accepted) hat keine offenen Einladungen');

-- 3) get_team_appointments trägt den Mitgliedsnamen in den Einladungen
SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.get_team_appointments((SELECT v FROM ids WHERE k = 'team')) g,
         jsonb_array_elements(g.invitations) inv
    WHERE inv->>'name' = 'Userb'
  ),
  'Einladungen enthalten den Mitgliedsnamen');

-- 4) B sagt Termin 1 zu -> Status persistiert als accepted
DO $$ BEGIN PERFORM _login('userB'); END $$;
SELECT is(
  (public.respond_to_appointment_invitation((SELECT v FROM ids WHERE k = 'invB1'), 'accepted')).status::text,
  'accepted', 'B kann eine Einladung zusagen (persistiert)');

-- 5) Danach hat B nur noch eine offene Einladung
SELECT is(
  (SELECT count(*) FROM public.get_my_appointment_invitations()),
  1::bigint, 'beantwortete Einladung verschwindet aus der offenen Liste');

-- 6) Doppelte Beantwortung wird abgelehnt
SELECT throws_ok(
  format('SELECT public.respond_to_appointment_invitation(%L::uuid, %L)', (SELECT v FROM ids WHERE k = 'invB1'), 'declined'),
  'P0001', NULL, 'bereits beantwortete Einladung kann nicht erneut beantwortet werden');

-- 7) B sagt Termin 2 ab -> declined persistiert
SELECT is(
  (public.respond_to_appointment_invitation((SELECT v FROM ids WHERE k = 'invB2'), 'declined')).status::text,
  'declined', 'B kann eine Einladung absagen (persistiert)');

-- 8) Nach Absage keine offenen Einladungen mehr
SELECT is(
  (SELECT count(*) FROM public.get_my_appointment_invitations()),
  0::bigint, 'nach Zu-/Absage sind keine offenen Einladungen mehr offen');

SELECT * FROM finish();
ROLLBACK;
