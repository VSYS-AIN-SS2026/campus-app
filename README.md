# Campus App

Eine Vue/Vite-Web-Anwendung für Campus-Verwaltung mit Supabase als Backend.

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

Der Root-Install lädt die CLI-Tools im Repo-Root und installiert danach automatisch die
Frontend-Abhängigkeiten in `frontend/`.

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

Lege lokal eine `frontend/.env.local` Datei an. Als Vorlage kannst du `.env.example` oder
`frontend/.env.example` verwenden.

Benötigt werden:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAGIC_LINK_REDIRECT_URL` (für Magic-Link Login, z. B. `http://127.0.0.1:4173`)

Beispiel:

```bash
cp .env.example frontend/.env.local
```

Danach kannst du mit `npm run dev` das Frontend starten.

### 8. Magic-Link Auth konfigurieren

1. Supabase Dashboard → **Authentication → URL Configuration**
2. `Site URL` setzen (lokal z. B. `http://127.0.0.1:4173`)
3. Unter **Redirect URLs** ebenfalls `http://127.0.0.1:4173` eintragen
4. Optional für echte Mails: **Authentication → SMTP Settings** konfigurieren (eigener Mail-Server)

Hinweis: Ohne eigenes SMTP nutzt Supabase den eingebauten Mail-Versand (mit Limits).

Die Anmeldung erfolgt ausschließlich über den Magic-Link. Jede:r Nutzer:in meldet sich
mit der eigenen E-Mail-Adresse an und arbeitet mit dem eigenen Profil (Studiengang, SPO,
Modulstatus, Kalender). Es gibt keinen Demo-/Bypass-Modus mehr.

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
import { supabase } from './supabase'

// Daten abrufen
const { data, error } = await supabase
  .from('study_programs')
  .select('id, code, name')

// RPC aufrufen
const { data: profile } = await supabase
  .rpc('get_demo_user_profile')
  .maybeSingle()
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
├── .env.example            # Vorlage für frontend/.env.local
├── frontend/
│   ├── src/
│   │   └── supabase.ts    # Supabase Client für das Vue-Frontend
│   └── package.json       # Vite/Vue Scripts und Dependencies
├── supabase/
│   ├── config.toml        # Supabase Konfiguration
│   └── migrations/        # Alle Datenbank-Änderungen (SQL)
├── deploy/                 # Droplet-Stack (Frontend + Uptime Kuma) → deploy/README.md
├── package.json            # Root-Scripts für Frontend und Supabase
└── README.md
```

## Status & Monitoring

Eine self-hosted **Uptime Kuma**-Instanz auf dem Droplet überwacht die Datenbank
(Supabase) und den Client-Server (Frontend) und speist das In-App-Status-Banner.
Kuma wird **unabhängig vom Client** deployt (eigener Compose-Stack), damit der
Status auch erreichbar bleibt, wenn der Client-Server down ist. Setup,
Compose-Stacks und Monitor-Konfiguration stehen in
[`deploy/README.md`](deploy/README.md). Das Frontend fragt den Status direkt auf
der `status.<domain>`-Subdomain ab und zeigt bei einer Störung ein Banner.
Konfiguration über `VITE_STATUS_PAGE_SLUG` / `VITE_STATUS_PAGE_URL` /
`VITE_STATUS_API_BASE`.

## Links

- **Supabase Dashboard:** https://app.supabase.com/project/yemmuitnxoyhxdsbfcfb
- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli

## Vorhandene Tabellen

- `study_programs` - Studiengänge
- `spos` - Studien- und Prüfungsordnungen
- `users` - Demo-Profil mit Auswahl
- `user_module_statuses` - Persistente Modulstatus pro User
- `module_handbooks`, `modules`, `courses` - Modulkatalog und Lehrveranstaltungen

Siehe `supabase/migrations/` für Details.

---

## LSF-Scraper (Stundenplandaten)

Der Scraper importiert Lehrveranstaltungstermine aus dem [HTWG-LSF](https://lsf.htwg-konstanz.de)
in die Supabase-Datenbank. Er läuft auf einem Self-hosted GitHub Actions Runner im HTWG-Netz
und wird automatisch zu Semesterbeginn getriggert.

### Voraussetzungen

- Node.js 22+
- VPN-Verbindung ins HTWG-Netz (LSF ist nicht öffentlich erreichbar)
- Supabase-Zugangsdaten (`SUPABASE_SERVICE_ROLE_KEY`)

### Setup

```bash
# Dependencies installieren (falls noch nicht geschehen)
npm install

# Umgebungsvariablen anlegen
cp .env.lsf.example .env
# Dann .env bearbeiten und Werte eintragen
```

Pflichtfelder in `.env`:

| Variable | Beschreibung |
|---|---|
| `SUPABASE_URL` | z. B. `https://xyz.supabase.co` oder `http://127.0.0.1:54321` lokal |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key aus dem Supabase Dashboard |
| `LSF_STUDY_PROGRAM` | Studiengang-Kürzel, z. B. `AIN` |
| `LSF_ABSTGVNR` | Numerische LSF-Studiengangs-ID (ABSTGVNR) |

`LSF_ABSTGVNR` steht in der LSF-URL unter Lehrveranstaltungen → Studiengangspläne:
`...&ABSTGVNR=4511` → `4511` für AIN.

#### Auth: eine der beiden Optionen

**Option A — Session-Cookie** (einfacher, für Tests):
1. Browser öffnen, via VPN ins LSF einloggen
2. DevTools → Network → beliebigen LSF-Request → Request-Header `Cookie` kopieren
3. In `.env` eintragen: `LSF_SESSION_COOKIE=<cookie-string>`

**Option B — Automatischer Login mit TOTP**:
```env
LSF_USERNAME=vorname.nachname
LSF_PASSWORD=dein-passwort
LSF_TOTP_SECRET=BASE32SECRET    # Base32-Secret aus der Authenticator-App-Einrichtung
```

### Scraper starten

```bash
# Normaler Import
npm run lsf:import

# Nur die ersten 3 Module (Smoke-Test)
LSF_LIMIT=3 npm run lsf:import

# Import erzwingen, auch wenn Semester schon importiert wurde
LSF_FORCE=true npm run lsf:import

# HTML-Dateien für Debugging speichern (scripts/data/)
LSF_DEBUG=true npm run lsf:import
```

Wenn `LSF_STUDY_PROGRAM` nicht gesetzt ist, liest der Scraper alle Studiengänge
aus `study_programs.lsf_abstgvnr` in der DB und importiert sie nacheinander.

### Verhalten bei Re-Imports

- Bereits vorhandene Events (`series_id` + `start_date` gleich) werden **nicht überschrieben** —
  so bleiben `user_events`-Verknüpfungen erhalten.
- Neue Events werden eingefügt.
- Abgesagte Termine (`fällt aus`, `entfällt` o. ä. im Status-Feld) werden als
  `cancelled = true` gespeichert, aber nicht gelöscht.

### GitHub Actions Workflow

Der Workflow [`.github/workflows/lsf-import.yml`](.github/workflows/lsf-import.yml) läuft:

- **Automatisch** am 1. März (Sommersemester) und 1. Oktober (Wintersemester)
- **Manuell** über GitHub → Actions → "LSF Import" → "Run workflow"

Benötigte Repository Secrets (Settings → Secrets and variables → Actions):

| Secret | Beschreibung |
|---|---|
| `SUPABASE_URL` | Supabase Projekt-URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key |
| `LSF_SESSION_COOKIE` | Cookie-Auth (Option A) |
| `LSF_USERNAME` / `LSF_PASSWORD` / `LSF_TOTP_SECRET` | Login-Auth (Option B) |

Um einen weiteren Studiengang hinzuzufügen:
1. `lsf_abstgvnr` in der `study_programs`-Tabelle eintragen
2. Eintrag zur Matrix in `.github/workflows/lsf-import.yml` hinzufügen (für Parallel-Ausführung)

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
- [ ] `frontend/.env.local` vorhanden

**Wenn alles abgehakt ist, kannst du loslegen!**
