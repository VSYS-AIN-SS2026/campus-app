CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#2f79b8',
  type TEXT NOT NULL DEFAULT 'allgemein',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS module_category_entries (
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_module_category_entries_module_id
  ON module_category_entries (module_id);

CREATE INDEX IF NOT EXISTS idx_module_category_entries_category_id
  ON module_category_entries (category_id);

DROP VIEW IF EXISTS view_modules_table;

CREATE VIEW view_modules_table AS
SELECT
  m.id,
  m.code AS kuerzel,
  m.name,
  m.start_semester,
  m.coordinator AS koordinator,
  m.version,
  m.is_mandatory,
  m.is_specialization,
  m.specialization_name,
  m.language,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'color', c.color,
          'type', c.type
        )
        ORDER BY c.type, c.name
      )
      FROM module_category_entries mce
      JOIN categories c ON c.id = mce.category_id
      WHERE mce.module_id = m.id
    ),
    '[]'::json
  ) AS categories
FROM modules m
ORDER BY m.start_semester ASC, m.code ASC;
