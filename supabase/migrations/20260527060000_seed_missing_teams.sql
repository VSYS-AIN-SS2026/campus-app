-- Fehlende Seed-Teams einfügen (idempotent, kein Duplikat wenn schon vorhanden)
INSERT INTO public.teams (name, description)
SELECT 'Team Alpha', 'Entwicklung der Campus-App Frontend'
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Alpha');

INSERT INTO public.teams (name, description)
SELECT 'Team Beta', 'Backend und Datenbankentwicklung'
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Beta');

INSERT INTO public.teams (name, description)
SELECT 'Team Gamma', 'QA, Testing und Dokumentation'
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Gamma');
