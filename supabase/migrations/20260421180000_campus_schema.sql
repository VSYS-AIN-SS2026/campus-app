-- SPOs (Studienprüfungsordnungen)
CREATE TABLE spos (
  id   SERIAL PRIMARY KEY,
  name TEXT    NOT NULL,
  short_name TEXT NOT NULL,
  degree     TEXT NOT NULL DEFAULT 'B.Sc.',
  valid_from INTEGER
);

-- Module
CREATE TABLE modules (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  short_name  TEXT,
  ects        INTEGER NOT NULL,
  semester_recommendation INTEGER,
  description TEXT
);

-- Zuordnung SPO <-> Module
CREATE TABLE spo_modules (
  spo_id       INTEGER REFERENCES spos(id)    ON DELETE CASCADE,
  module_id    INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  module_group TEXT,
  PRIMARY KEY (spo_id, module_id)
);

-- Nutzerprofil (verknüpft mit Supabase Auth)
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_spo_id INTEGER REFERENCES spos(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Abschluss-Status pro Modul
CREATE TABLE user_module_completions (
  user_id    UUID    REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_id  INTEGER REFERENCES modules(id)       ON DELETE CASCADE,
  grade      NUMERIC(3,1),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, module_id)
);

-- ============================================================
-- Seed-Daten
-- ============================================================

INSERT INTO spos (name, short_name, degree, valid_from) VALUES
  ('Informatik B.Sc. SPO 2019', 'INF-19', 'B.Sc.', 2019),
  ('Informatik B.Sc. SPO 2022', 'INF-22', 'B.Sc.', 2022);

INSERT INTO modules (name, short_name, ects, semester_recommendation, description) VALUES
  -- Semester 1
  ('Mathematik I',                      'MAT1',  8, 1, 'Analysis und lineare Algebra Grundlagen'),
  ('Grundlagen der Programmierung',     'GDP',   8, 1, 'Einführung in imperative und objektorientierte Programmierung mit Java'),
  ('Technische Grundlagen',             'TGI',   5, 1, 'Digitaltechnik, Logik, Rechnerarchitektur'),
  ('Wissenschaftliches Arbeiten',       'WIA',   3, 1, 'Recherche, Zitieren, Präsentieren'),
  -- Semester 2
  ('Mathematik II',                     'MAT2',  8, 2, 'Differenzialrechnung, Integralrechnung, Statistik'),
  ('Algorithmen und Datenstrukturen',   'ADS',   8, 2, 'Grundlegende Algorithmen, Komplexität, Datenstrukturen'),
  ('Objektorientierte Programmierung',  'OOP',   5, 2, 'Vererbung, Polymorphismus, Design Patterns'),
  ('Betriebssysteme',                   'BSY',   5, 2, 'Prozesse, Threads, Speicherverwaltung'),
  -- Semester 3
  ('Mathematik III',                    'MAT3',  5, 3, 'Diskrete Mathematik, Wahrscheinlichkeitsrechnung'),
  ('Datenbanksysteme',                  'DBS',   6, 3, 'Relationale Datenbanken, SQL, ER-Modellierung'),
  ('Computernetzwerke',                 'CNW',   5, 3, 'TCP/IP, OSI-Modell, Protokolle'),
  ('Softwaretechnik',                   'SWT',   5, 3, 'Softwarelebenszyklus, UML, Agile Methoden'),
  -- Semester 4
  ('Verteilte Systeme',                 'VSY',   6, 4, 'Kommunikationsmuster, Konsistenz, Fehlertoleranz'),
  ('Web-Entwicklung',                   'WEB',   6, 4, 'HTML, CSS, JavaScript, REST APIs'),
  ('Projektmanagement',                 'PMG',   4, 4, 'Scrum, Kanban, Risikomanagement'),
  ('Formale Sprachen & Automaten',      'FSA',   5, 4, 'Reguläre Ausdrücke, Grammatiken, Turingmaschinen'),
  -- Semester 5 (Wahlpflicht)
  ('Künstliche Intelligenz',            'KI',    6, 5, 'Maschinelles Lernen, Neuronale Netze'),
  ('IT-Sicherheit',                     'ITS',   6, 5, 'Kryptographie, Angriffe, Sicherheitsarchitektur'),
  ('Mobile Entwicklung',                'MOB',   6, 5, 'Android/iOS Entwicklung, Cross-Platform'),
  ('Cloud Computing',                   'CLC',   6, 5, 'AWS, Azure, Container, Microservices'),
  ('Data Science',                      'DSC',   6, 5, 'Datenanalyse, Visualisierung, Python'),
  -- Semester 6
  ('Praxisprojekt',                     'PRP',  20, 6, 'Industrieprojekt in Zusammenarbeit mit einem Unternehmen'),
  -- Semester 7
  ('Bachelorarbeit',                    'BA',   12, 7, 'Selbstständige wissenschaftliche Abschlussarbeit'),
  ('Bachelorkolloquium',                'BAK',   3, 7, 'Präsentation und Verteidigung der Bachelorarbeit');

-- SPO 2019 Module-Zuordnung
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, true, 'Grundstudium'  FROM modules WHERE short_name IN ('MAT1','GDP','TGI','WIA');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, true, 'Hauptstudium'  FROM modules WHERE short_name IN ('MAT2','ADS','OOP','BSY');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, true, 'Hauptstudium'  FROM modules WHERE short_name IN ('MAT3','DBS','CNW','SWT');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, true, 'Hauptstudium'  FROM modules WHERE short_name IN ('VSY','WEB','PMG','FSA');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, false, 'Wahlpflicht'  FROM modules WHERE short_name IN ('KI','ITS','MOB','CLC','DSC');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, true, 'Praxis'        FROM modules WHERE short_name IN ('PRP');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 1, id, true, 'Abschluss'     FROM modules WHERE short_name IN ('BA','BAK');

-- SPO 2022 Module-Zuordnung (gleiche Module, aber ohne FSA, dafür kein Unterschied im Kern)
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, true, 'Grundstudium'  FROM modules WHERE short_name IN ('MAT1','GDP','TGI','WIA');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, true, 'Hauptstudium'  FROM modules WHERE short_name IN ('MAT2','ADS','OOP','BSY');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, true, 'Hauptstudium'  FROM modules WHERE short_name IN ('MAT3','DBS','CNW','SWT');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, true, 'Hauptstudium'  FROM modules WHERE short_name IN ('VSY','WEB','PMG');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, false, 'Wahlpflicht'  FROM modules WHERE short_name IN ('KI','ITS','MOB','CLC','DSC');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, true, 'Praxis'        FROM modules WHERE short_name IN ('PRP');
INSERT INTO spo_modules (spo_id, module_id, is_mandatory, module_group)
SELECT 2, id, true, 'Abschluss'     FROM modules WHERE short_name IN ('BA','BAK');
