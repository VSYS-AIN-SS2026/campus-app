-- 1. Wir löschen die alten Kategorie-Tabellen (da wir sie durch feste Spalten ersetzen)
DROP VIEW IF EXISTS view_modules_table;
DROP TABLE IF EXISTS module_category_entries;
DROP TABLE IF EXISTS categories;

-- 2. Wir fügen die neuen Spalten zur Tabelle 'modules' hinzu
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT true,  -- true = Pflicht, false = Wahlpflicht/Sonstiges
ADD COLUMN IF NOT EXISTS is_specialization BOOLEAN NOT NULL DEFAULT false, -- true = Ist eine Vertiefung
ADD COLUMN IF NOT EXISTS specialization_name TEXT,                    -- z.B. 'Software Engineering' (kann NULL sein)
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'Deutsch';     -- z.B. 'Deutsch' oder 'Englisch'

-- 3. Wir bauen die View für das Frontend neu, damit diese Felder direkt verfügbar sind
CREATE VIEW view_modules_table AS
SELECT 
    id,
    code as kuerzel,
    name,
    start_semester,
    coordinator as koordinator,
    version,
    is_mandatory,
    is_specialization,
    specialization_name,
    language
FROM modules
ORDER BY start_semester ASC, code ASC;