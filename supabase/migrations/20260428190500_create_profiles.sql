-- Tabelle für anwendungsspezifische Profildaten von authentifizierten Benutzern
-- Auth-Daten (E-Mail, Passwort, etc.) bleiben in auth.users verwaltet
CREATE TABLE public.profiles (
  -- 1:1-Verknüpfung mit Supabase Auth User
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Anzeigename / Klarname des Users
  full_name TEXT,

  -- Rollenfeld für Autorisierung in der App
  role TEXT NOT NULL DEFAULT 'student',

  -- Erstellungszeitpunkt des Profils
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Rolle darf nicht leer oder nur Whitespace sein
  CONSTRAINT profiles_role_not_empty CHECK (char_length(trim(role)) > 0)
);

-- Index für häufige Rollen-Filter (z.B. student/admin)
CREATE INDEX profiles_role_idx ON public.profiles(role);

-- Index für zeitliche Sortierung/Abfragen nach Erstellungsdatum
CREATE INDEX profiles_created_at_idx ON public.profiles(created_at DESC);
