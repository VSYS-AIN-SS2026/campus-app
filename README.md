# Campus App

Eine Web-Anwendung für Campus-Verwaltung mit Supabase als Backend.

## Erste Schritte (für neue Teammitglieder)

### 1. Repo klonen

```bash
git clone git@github.com:VSYS-AIN-SS2026/campus-app.git
cd campus-app
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Supabase CLI installieren

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Oder mit npx nutzen:**
```bash
npx supabase [command]
```

### 4. Bei Supabase anmelden (einmalig)

```bash
supabase login
```
→ Öffnet Browser für Login

### 5. Projekt mit Cloud verlinken (einmalig)

```bash
supabase link --project-ref yemmuitnxoyhxdsbfcfb
```
Jetzt ist dein lokales Projekt mit der Supabase Cloud verbunden!

### 6. Migrationen anwenden

```bash
supabase db push
```

### 7. Environment Variables

Die `.env.local` Datei ist bereits konfiguriert mit:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**Fertig!** Du kannst jetzt mit dem Projekt arbeiten.

## Datenbank-Workflow (wichtig für alle!)

### Neue Tabelle/Änderung erstellen

```bash
# 1. Migration erstellen
supabase migration new add_meine_tabelle
```
→ Erstellt eine neue SQL-Datei in `supabase/migrations/`

```bash
# 2. SQL schreiben in der erstellten Datei:
CREATE TABLE meine_tabelle (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL
);
```

```bash
# 3. Migration in die Cloud pushen
supabase db push
```
Tabelle ist jetzt live in Supabase!

### Mit dem Team arbeiten

**DU machst eine Änderung:**
```bash
# 1. Migration erstellen & SQL schreiben (siehe oben)
# 2. In Git committen:
git add supabase/migrations/
git commit -m "Add neue Tabelle"
git push
```

**ANDERE machen Änderungen:**
```bash
# 1. Änderungen holen:
git pull

# 2. Migrations in deine Cloud-DB übernehmen:
supabase db push
```

**Wichtig:** Immer `supabase db push` nach `git pull` ausführen!

## Supabase in Code verwenden

```typescript
import { supabase } from '@/lib/supabase'

// Daten abrufen
const { data, error } = await supabase
  .from('students')
  .select('*')

// Daten einfügen
const { data, error } = await supabase
  .from('students')
  .insert({ name: 'Max', email: 'max@example.com' })

// Daten aktualisieren
const { data, error } = await supabase
  .from('students')
  .update({ name: 'Maximilian' })
  .eq('id', 1)

// Daten löschen
const { data, error } = await supabase
  .from('students')
  .delete()
  .eq('id', 1)
```

## Nützliche Befehle

```bash
# Alle Migrationen anzeigen (lokal & remote)
supabase migration list --linked

# Unterschiede zwischen lokal & Cloud prüfen
supabase db diff --linked

# Migrations in Cloud pushen
supabase db push

# Neue Migration erstellen
supabase migration new mein_feature

# Projekt-Status anzeigen
supabase projects list
```

### Lokale Entwicklung (optional - braucht Docker Desktop)

```bash
# Lokale DB starten (alle Services lokal laufen lassen)
supabase start

# Lokale DB stoppen
supabase stop
```
**Hinweis:** Für normales Arbeiten braucht ihr das NICHT - arbeitet direkt mit der Cloud!

## Projekt-Struktur

```
campus-app/
├── .env.local              # Supabase Credentials
├── lib/
│   └── supabase.ts        # Supabase Client
├── supabase/
│   ├── config.toml        # Supabase Konfiguration
│   └── migrations/        # Alle Datenbank-Änderungen (SQL)
├── package.json
└── README.md
```

## Links

- **Supabase Dashboard:** https://app.supabase.com/project/yemmuitnxoyhxdsbfcfb
- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli

## Vorhandene Tabellen

- `students` - Studenten-Verwaltung
- `courses` - Kurs-Verwaltung

Siehe `supabase/migrations/` für Details.

---

## Häufige Probleme

### "command not found: supabase"
→ Supabase CLI nicht installiert. Führe aus:
```bash
brew install supabase/tap/supabase
```

### "Project not linked"
→ Projekt nicht verlinkt. Führe aus:
```bash
supabase link --project-ref yemmuitnxoyhxdsbfcfb
```

### "Remote database is ahead"
→ Andere haben Änderungen gemacht. Führe aus:
```bash
git pull
supabase db push
```

### "Migration failed"
→ Fehler in deinem SQL. Prüfe die Migration-Datei in `supabase/migrations/`

---

## Setup-Checkliste

- [ ] Repo geklont
- [ ] `npm install` ausgeführt
- [ ] Supabase CLI installiert (`brew install supabase/tap/supabase`)
- [ ] Bei Supabase angemeldet (`supabase login`)
- [ ] Projekt verlinkt (`supabase link --project-ref yemmuitnxoyhxdsbfcfb`)
- [ ] Migrationen gepusht (`supabase db push`)
- [ ] `.env.local` vorhanden

**Wenn alles abgehakt ist, kannst du loslegen!**