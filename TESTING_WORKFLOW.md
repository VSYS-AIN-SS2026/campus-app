# SQL Testen BEVOR es zu Supabase geht

## Problem
Syntaxfehler in SQL siehst du erst, wenn du `npx supabase db push` machst und es fehlschlägt.

## Lösung: Lokale Datenbank

### 1. Lokale Datenbank starten

```bash
npx supabase start
```

**Was passiert:**
- Startet PostgreSQL lokal auf deinem Computer (Docker)
- Dauert beim ersten Mal ~2 Minuten
- Gibt dir lokale URLs aus

**Wichtig:** Docker muss installiert sein!
- Mac: https://www.docker.com/products/docker-desktop
- Windows: https://www.docker.com/products/docker-desktop

### 2. Workflow mit lokalem Testen

```bash
# 1. Lokale DB starten (einmal am Anfang)
npx supabase start

# 2. Migration erstellen
npx supabase migration new add_neue_tabelle

# 3. SQL schreiben in VS Code
CREATE TABLE neue_tabelle (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

# 4. LOKAL testen (sieht Fehler sofort!)
npx supabase db reset

# Wenn Fehler:
# → Siehst du sie sofort
# → Fixe sie
# → npx supabase db reset (nochmal testen)

# 5. Wenn alles funktioniert, zu Cloud pushen
npx supabase db push
```

### 3. Vorteile

- **Syntaxfehler sofort sehen** - nicht erst beim Push
- **Schneller testen** - keine Internet-Verbindung nötig
- **Sicherer** - kaputte Migrations gehen nicht live
- **Rollback einfach** - lokale DB einfach neu starten

### 4. Nützliche Befehle

```bash
# Lokale DB starten
npx supabase start

# Lokale DB neu aufsetzen (alle Migrations nochmal anwenden)
npx supabase db reset

# Lokale DB stoppen
npx supabase stop

# Status anzeigen
npx supabase status
```

### 5. VS Code Extensions (empfohlen)

Installiere diese Extensions für SQL Syntax Highlighting:

1. **SQLTools** - Syntax Highlighting & Formatting
2. **PostgreSQL** - PostgreSQL Syntax Support

VS Code wird dich fragen, ob du empfohlene Extensions installieren willst → JA klicken!

## Workflow Vergleich

### Ohne lokales Testen (alt)
```
SQL schreiben → db push → FEHLER!
→ SQL fixen → db push → FEHLER!
→ SQL fixen → db push → Funktioniert
```

### Mit lokalem Testen (neu)
```
SQL schreiben → db reset (lokal) → FEHLER!
→ SQL fixen → db reset (lokal) → Funktioniert
→ db push → Funktioniert
```

## Quick Start

```bash
# Einmal setup:
npx supabase start

# Dann immer:
npx supabase migration new meine_migration
# SQL schreiben
npx supabase db reset  # Lokal testen!
npx supabase db push   # Zu Cloud pushen
```

## Troubleshooting

**"Docker is not running"**
→ Docker Desktop starten

**"Port already in use"**
→ `npx supabase stop` dann `npx supabase start`

**Migrations löschen und neu anfangen**
→ `npx supabase db reset`
