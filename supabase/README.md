# Supabase CLI Setup

## Status: Fast fertig! ✅

Der Supabase CLI Ordner ist jetzt richtig eingerichtet in `campus-app/supabase/`.

## Nächster Schritt: Mit deinem Cloud-Projekt verbinden

### Option 1: Vollständiges Setup (Empfohlen)

```bash
# 1. Login (öffnet Browser)
npx supabase login

# 2. Projekt verbinden
npx supabase link --project-ref yemmuitnxoyhxdsbfcfb

# 3. Fertig! Jetzt kannst du Migrations erstellen:
npx supabase migration new add_students_table
```

### Option 2: Ohne Linking (Einfacher für den Anfang)

Du kannst auch OHNE Link arbeiten:

```bash
# Migration erstellen (funktioniert immer)
npx supabase migration new add_students_table

# SQL schreiben in der erstellten Datei

# Dann im Supabase Dashboard ausführen:
# Dashboard → SQL Editor → SQL einfügen → Run
```

## Was sind Migrations?

Migrations = SQL-Dateien die Datenbank-Änderungen beschreiben

Beispiel: `supabase/migrations/20240417_add_students_table.sql`
```sql
CREATE TABLE students (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);
```

### Vorteile:
- ✅ Änderungen in Git
- ✅ Team sieht alle Änderungen
- ✅ Nachvollziehbar
- ✅ Können rückgängig gemacht werden

## Befehle die du brauchst

```bash
# Migration erstellen
npx supabase migration new <name>

# Migrations anwenden (wenn linked)
npx supabase db push

# Lokale Datenbank starten (für Tests)
npx supabase start

# Lokale Datenbank stoppen
npx supabase stop
```

## Empfehlung

Für den Anfang: **Option 2** (ohne Linking)
1. Erstelle Migrations in VS Code
2. Führe SQL manuell im Dashboard aus
3. Committe Migrations zu Git

Später: **Option 1** (mit Linking) für automatisches Pushen
