-- Fügt der organisations-Tabelle eine Farbspalte hinzu.
-- Die Farbe bestimmt, wie Events der Organisation in der Wochenansicht angezeigt werden.
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
