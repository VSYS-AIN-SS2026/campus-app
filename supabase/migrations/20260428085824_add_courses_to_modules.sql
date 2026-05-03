-- 1. Tabelle für Teilmodule / Lehrveranstaltungen (Courses)
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    
    -- FIRST LEVEL DATA (Für die schnelle Anzeige)
    code TEXT NOT NULL,                 -- z.B. 'DSYS-Ü' (Oft ähnlich dem Modulkürzel)
    name TEXT NOT NULL,                 -- z.B. 'Digitale Systeme Übungen'
    course_type TEXT NOT NULL,          -- z.B. 'V' (Vorlesung) oder 'LÜ' (Laborübung)
    coordinator TEXT,                   -- z.B. 'Schoppa, Irenäus'
    ects INTEGER NOT NULL DEFAULT 0,    -- z.B. 4
    sws INTEGER NOT NULL DEFAULT 0,     -- Semesterwochenstunden, z.B. 2
    
    -- DEEP DATA (JSONB - Alles Spezifische für DIESES Teilmodul)
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ein Kurs-Code pro Modul-ID sollte eindeutig sein
    UNIQUE(module_id, code)
);

-- 2. Trigger für updated_at (Best Practice für Supabase)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();