-- ============================================================
-- Timetable Schema: raeume, termine, kalender_extra, kalender_archiv
--
-- Anpassungen gegenüber Konzept:
--   - users.study_program_id existiert bereits (20260503170500) → wird nicht erneut hinzugefügt
--   - modules.id ist UUID (20260421173736), kein SERIAL
--   - RLS nutzt users.auth_user_id = auth.uid() statt student_id = auth.uid(),
--     weil users.id eine interne UUID ist und kein direktes auth.uid()-Äquivalent
-- ============================================================

-- ------------------------------------------------------------
-- Räume
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raeume (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezeichnung TEXT NOT NULL,
  gebaeude    TEXT,
  kapazitaet  INT
);

-- ------------------------------------------------------------
-- Student-Profil erweitern
-- study_program_id existiert bereits (20260503170500)
-- Nur fachsemester wird neu hinzugefügt
-- ------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fachsemester INT CHECK (fachsemester BETWEEN 1 AND 14);

-- ------------------------------------------------------------
-- Termine
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE termin_art AS ENUM ('Vorlesung', 'Uebung', 'Pruefung');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS termine (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT        NOT NULL,
  art                    termin_art  NOT NULL,
  startdatum             DATE        NOT NULL,
  enddatum               DATE        NOT NULL,
  startzeit              TIME        NOT NULL,
  endzeit                TIME        NOT NULL,
  wiederholung_intervall TEXT        CHECK (wiederholung_intervall IN ('woechentlich', 'zweiwochentlich')),
  wiederholung_bis       DATE,
  gruppe                 TEXT,       -- z.B. 'UG-A', NULL bei Vorlesungen
  raum_id                UUID        REFERENCES raeume(id),
  modul_id               UUID        REFERENCES modules(id) ON DELETE CASCADE,
  CONSTRAINT check_serie CHECK (
    (wiederholung_intervall IS NULL) = (wiederholung_bis IS NULL)
  )
);

-- ------------------------------------------------------------
-- Kalender: nur ÜG-Wahlen + manuelle Extras
-- (Vorlesungen werden im Frontend aus `termine` deriviert)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kalender_extra (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  termin_id  UUID NOT NULL REFERENCES public.termine(id) ON DELETE CASCADE,
  reason     TEXT CHECK (reason IN ('ug_wahl', 'manuell')),
  UNIQUE (student_id, termin_id)
);

-- ------------------------------------------------------------
-- Archiv: ausgeblendete Termine
-- datum NULL  = gesamte Serie ausgeblendet
-- datum NOT NULL = nur dieses Vorkommen ausgeblendet
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kalender_archiv (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  termin_id  UUID NOT NULL REFERENCES public.termine(id) ON DELETE CASCADE,
  datum      DATE,
  UNIQUE (student_id, termin_id, datum)
);

-- ------------------------------------------------------------
-- Indexes für Wochenansicht-Queries
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS termine_modul_id_idx          ON termine (modul_id);
CREATE INDEX IF NOT EXISTS termine_datum_idx             ON termine (startdatum, enddatum);
CREATE INDEX IF NOT EXISTS kalender_extra_student_idx    ON kalender_extra (student_id);
CREATE INDEX IF NOT EXISTS kalender_archiv_student_idx   ON kalender_archiv (student_id, termin_id);

-- ------------------------------------------------------------
-- RLS aktivieren
-- ------------------------------------------------------------
ALTER TABLE raeume          ENABLE ROW LEVEL SECURITY;
ALTER TABLE termine         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalender_extra  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalender_archiv ENABLE ROW LEVEL SECURITY;

-- Räume: alle lesen (keine personenbezogenen Daten)
CREATE POLICY "raeume_read" ON raeume
  FOR SELECT USING (true);

-- Termine: alle eingeloggten User lesen
CREATE POLICY "termine_read" ON termine
  FOR SELECT TO authenticated
  USING (true);

-- ------------------------------------------------------------
-- kalender_extra: nur eigene Zeilen
-- student_id = users.id (interne UUID), daher JOIN auf auth_user_id
-- ------------------------------------------------------------
CREATE POLICY "kalender_extra_select_own" ON kalender_extra
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = kalender_extra.student_id
      AND users.auth_user_id = auth.uid()
  ));

CREATE POLICY "kalender_extra_insert_own" ON kalender_extra
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = kalender_extra.student_id
      AND users.auth_user_id = auth.uid()
  ));

CREATE POLICY "kalender_extra_delete_own" ON kalender_extra
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = kalender_extra.student_id
      AND users.auth_user_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- kalender_archiv: nur eigene Zeilen
-- gleiches auth_user_id-Pattern wie kalender_extra
-- ------------------------------------------------------------
CREATE POLICY "kalender_archiv_select_own" ON kalender_archiv
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = kalender_archiv.student_id
      AND users.auth_user_id = auth.uid()
  ));

CREATE POLICY "kalender_archiv_insert_own" ON kalender_archiv
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = kalender_archiv.student_id
      AND users.auth_user_id = auth.uid()
  ));

CREATE POLICY "kalender_archiv_delete_own" ON kalender_archiv
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = kalender_archiv.student_id
      AND users.auth_user_id = auth.uid()
  ));
