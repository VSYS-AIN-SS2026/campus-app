-- Tabelle für Fakultäten
CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,      -- z.B. 'IN'
  name TEXT,                      -- z.B. 'Informatik'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabelle für Studiengänge
CREATE TABLE study_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,      -- z.B. 'AIN'
  name TEXT,                      -- z.B. 'Angewandte Informatik'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabelle für Studien- und Prüfungsordnungen (SPO)
CREATE TABLE spos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_program_id UUID NOT NULL REFERENCES study_programs(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,     -- z.B. 'AIN SPO 4 (01.03.2024)'
  valid_from DATE,                -- z.B. '2024-03-01'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabelle für die eigentlichen Modulhandbücher
CREATE TABLE module_handbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spo_id UUID NOT NULL REFERENCES spos(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,      -- z.B. 'AIN-4-1'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View zur Ansicht
CREATE VIEW view_module_handbooks_list AS
SELECT 
  mh.id as handbook_id,
  mh.code as kuerzel,
  sp.code as studiengang,
  spo.version_name as spo_version,
  f.code as fakultaet
FROM module_handbooks mh
JOIN spos spo ON mh.spo_id = spo.id
JOIN study_programs sp ON spo.study_program_id = sp.id
JOIN faculties f ON sp.faculty_id = f.id;