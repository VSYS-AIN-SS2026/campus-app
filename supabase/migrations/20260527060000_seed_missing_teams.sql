-- Fehlende Seed-Teams einfügen (idempotent, kein Duplikat wenn schon vorhanden)
DO $$
DECLARE
  v_creator_id UUID;
BEGIN
  SELECT id INTO v_creator_id FROM auth.users LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'Kein User gefunden – Seed übersprungen.';
    RETURN;
  END IF;

  INSERT INTO public.teams (name, description, created_by)
  SELECT 'Team Alpha', 'Entwicklung der Campus-App Frontend', v_creator_id
  WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Alpha');

  INSERT INTO public.teams (name, description, created_by)
  SELECT 'Team Beta', 'Backend und Datenbankentwicklung', v_creator_id
  WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Beta');

  INSERT INTO public.teams (name, description, created_by)
  SELECT 'Team Gamma', 'QA, Testing und Dokumentation', v_creator_id
  WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Gamma');
END $$;
