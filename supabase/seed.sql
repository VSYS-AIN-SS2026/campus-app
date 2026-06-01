-- ============================================================
-- Seed: Beispiel-Team mit Terminen und Einladungen
--
-- Legt ein vollstaendiges Beispiel an, um das Datenmodell aus
--   20260530120000_create_appointments_and_invitations.sql
-- zu testen: Demo-Benutzer -> Team -> Mitglieder -> Termine ->
-- TerminEinladungen (mit unterschiedlichen Status).
--
-- Idempotent: kann mehrfach ausgefuehrt werden (ON CONFLICT DO NOTHING).
-- Wird bei `supabase db reset` automatisch geladen ([db.seed] in
-- config.toml). Laeuft NICHT bei `supabase db push` und gelangt
-- damit nicht in die Remote-Datenbank.
-- ============================================================

-- ------------------------------------------------------------
-- Demo-Benutzer: auth.users -> profiles -> public.users
-- Identitaet eines Mitglieds ist die auth.users-ID
-- (team_members.user_id == auth.uid()).
-- ------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'a1a1a1a1-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'anna.demo@htwg-konstanz.de',  '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'b2b2b2b2-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ben.demo@htwg-konstanz.de',   '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', 'c3c3c3c3-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'carla.demo@htwg-konstanz.de', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, role, email_verified)
VALUES
  ('a1a1a1a1-0000-4000-8000-000000000001', 'Anna Demo',  'anna.demo@htwg-konstanz.de',  'student', true),
  ('b2b2b2b2-0000-4000-8000-000000000002', 'Ben Demo',   'ben.demo@htwg-konstanz.de',   'student', true),
  ('c3c3c3c3-0000-4000-8000-000000000003', 'Carla Demo', 'carla.demo@htwg-konstanz.de', 'student', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, full_name, email, auth_user_id)
VALUES
  ('a1a1a1a1-0000-4000-8000-000000000001', 'Anna Demo',  'anna.demo@htwg-konstanz.de',  'a1a1a1a1-0000-4000-8000-000000000001'),
  ('b2b2b2b2-0000-4000-8000-000000000002', 'Ben Demo',   'ben.demo@htwg-konstanz.de',   'b2b2b2b2-0000-4000-8000-000000000002'),
  ('c3c3c3c3-0000-4000-8000-000000000003', 'Carla Demo', 'carla.demo@htwg-konstanz.de', 'c3c3c3c3-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Beispiel-Team + Mitglieder
-- ------------------------------------------------------------
INSERT INTO public.teams (id, name, description, created_by)
VALUES (
  'd1d1d1d1-0000-4000-8000-000000000001',
  'Team Terminplanung',
  'Demo-Team fuer Terminvorschlaege und gemeinsame Termine.',
  'a1a1a1a1-0000-4000-8000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (id, team_id, user_id, role)
VALUES
  ('11111111-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001', 'owner'),
  ('22222222-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000001', 'b2b2b2b2-0000-4000-8000-000000000002', 'member'),
  ('33333333-0000-4000-8000-000000000003', 'd1d1d1d1-0000-4000-8000-000000000001', 'c3c3c3c3-0000-4000-8000-000000000003', 'member')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Termine (Start/Ende in UTC)
-- ------------------------------------------------------------
INSERT INTO public.team_appointments (id, team_id, created_by, title, description, starts_at, ends_at)
VALUES
  ('aaaa1111-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001',
   'Sprint Planning', 'Planung des naechsten Sprints',
   TIMESTAMPTZ '2026-06-02 09:00:00+00', TIMESTAMPTZ '2026-06-02 10:30:00+00'),
  ('aaaa2222-0000-4000-8000-000000000002', 'd1d1d1d1-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001',
   'Retrospektive', 'Rueckblick auf den abgeschlossenen Sprint',
   TIMESTAMPTZ '2026-06-09 14:00:00+00', TIMESTAMPTZ '2026-06-09 15:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- TerminEinladungen (gemischte Status: pending/accepted/declined)
-- ------------------------------------------------------------
INSERT INTO public.appointment_invitations (appointment_id, team_member_id, status, responded_at)
VALUES
  -- Sprint Planning
  ('aaaa1111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'accepted', now()),
  ('aaaa1111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', 'pending',  NULL),
  ('aaaa1111-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000003', 'declined', now()),
  -- Retrospektive
  ('aaaa2222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'accepted', now()),
  ('aaaa2222-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000002', 'pending',  NULL)
ON CONFLICT (appointment_id, team_member_id) DO NOTHING;
