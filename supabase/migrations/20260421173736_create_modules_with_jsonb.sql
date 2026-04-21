-- 1. Die Haupt-Tabelle für Module
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- FIRST LEVEL DATA (Relational - Perfekt für die Tabelle im Screenshot)
  code TEXT NOT NULL,                  -- "Kürzel", z.B. 'ALG/01'
  name TEXT NOT NULL,                  -- "Name", z.B. 'Algebra'
  start_semester TEXT NOT NULL,        -- "Startsemester", z.B. '1/2' oder '1'
  coordinator TEXT NOT NULL,           -- "Koordinator", z.B. 'Axthelm, Rebekka [raxthelm]'
  
  -- VERSIONIERUNG
  version INTEGER NOT NULL DEFAULT 1,  -- Startet bei 1
  
  -- DEEP DATA (JSONB - Alle flexiblen Inhalte des Moduls)
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ein Kürzel kann mehrere Versionen haben, aber "ALG/01" Version 1 darf es nur einmal geben.
  UNIQUE(code, version) 
);

-- 2. VERKNÜPFUNGSTABELLE (Many-to-Many)
-- Ein Modulhandbuch enthält viele Module. Ein Modul kann in vielen Handbüchern stehen.
CREATE TABLE module_handbook_entries (
  handbook_id UUID NOT NULL REFERENCES module_handbooks(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  -- Optional: Semester, in dem das Modul in *diesem speziellen* Handbuch vorgesehen ist
  recommended_semester INTEGER, 
  
  PRIMARY KEY (handbook_id, module_id)
);

-- 3. View für das Frontend (Exakt dein Screenshot)
CREATE VIEW view_modules_table AS
SELECT 
  id,
  code as kuerzel,
  name,
  start_semester,
  coordinator as koordinator,
  version
FROM modules
ORDER BY start_semester ASC, code ASC;