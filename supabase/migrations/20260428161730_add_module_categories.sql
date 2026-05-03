-- 1. Tabelle für die Kategorien (Tags/Badges)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,       -- z.B. 'Pflichtmodul' oder 'Vertiefung KI'
    color TEXT NOT NULL DEFAULT '#E2E8F0', -- Hex-Code für die UI (z.B. '#FF0000' für Rot)
    type TEXT NOT NULL,              -- z.B. 'art', 'sprache', 'vertiefung' (Hilft beim Filtern)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger für updated_at bei Kategorien
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Verknüpfungstabelle: Ein Modul kann viele Kategorien haben
CREATE TABLE module_category_entries (
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    
    PRIMARY KEY (module_id, category_id)
);

-- 3. View aktualisieren, damit das Frontend die Kategorien direkt mitbekommt!
-- Wir nutzen json_agg, um ein Array von Kategorien direkt in der Modul-Zeile auszugeben.
DROP VIEW IF EXISTS view_modules_table;

CREATE VIEW view_modules_table AS
SELECT 
    m.id,
    m.code as kuerzel,
    m.name,
    m.start_semester,
    m.coordinator as koordinator,
    m.version,
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', c.id, 
                    'name', c.name, 
                    'color', c.color, 
                    'type', c.type
                )
            )
            FROM module_category_entries mce
            JOIN categories c ON mce.category_id = c.id
            WHERE mce.module_id = m.id
        ), 
        '[]'::json
    ) as categories
FROM modules m
ORDER BY m.start_semester ASC, m.code ASC;