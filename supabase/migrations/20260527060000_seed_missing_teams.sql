-- Fehlende Seed-Teams einfügen (idempotent, kein Duplikat wenn schon vorhanden)
INSERT INTO public.teams (name, description, short_info)
SELECT 'Team Alpha', 'Entwicklung der Campus-App Frontend', 'Frontend-Team'
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Alpha');

INSERT INTO public.teams (name, description, short_info)
SELECT 'Team Beta', 'Backend und Datenbankentwicklung', 'Backend-Team'
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Beta');

INSERT INTO public.teams (name, description, short_info)
SELECT 'Team Gamma', 'QA, Testing und Dokumentation', 'QA-Team'
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE name = 'Team Gamma');
