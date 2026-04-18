# Setup Guide: Supabase, CLI & GitHub

Dieser Guide erklärt das komplette Setup für das Campus-App Projekt.

## Übersicht

Unser Projekt verwendet drei Hauptkomponenten:

1. **GitHub Repository** - Code-Versionierung und Zusammenarbeit
2. **Supabase Cloud** - Datenbank und Backend-Services
3. **Supabase CLI** - Lokales Tool für Datenbank-Management

```
GitHub Repo (Code)
    ↕
Lokales Projekt (dein Computer)
    ↕
Supabase Cloud (Datenbank)
```

---

## 1. GitHub Repository Setup

### Was ist GitHub?

GitHub speichert euren Code in der Cloud und ermöglicht es allen Teammitgliedern, zusammen am gleichen Projekt zu arbeiten.

### Einmaliges Setup

**Repository klonen:**
```bash
git clone git@github.com:VSYS-AIN-SS2026/campus-app.git
cd campus-app
```

**Git konfigurieren (falls noch nicht gemacht):**
```bash
git config --global user.name "Dein Name"
git config --global user.email "deine-email@example.com"
```

### Täglicher Workflow

**Änderungen holen (bevor du arbeitest):**
```bash
git pull
```

**Eigene Änderungen speichern:**
```bash
git add .
git commit -m "Beschreibung deiner Änderung"
git push
```

---

## 2. Supabase Cloud Projekt

### Was ist Supabase?

Supabase ist unsere Datenbank in der Cloud. Hier werden alle Daten (Students, Courses, etc.) gespeichert.

### Projekt-Details

- **Projekt-Name:** campus-app
- **Project Ref:** yemmuitnxoyhxdsbfcfb
- **Region:** Central EU (Frankfurt)
- **Dashboard:** https://app.supabase.com/project/yemmuitnxoyhxdsbfcfb

### Zugang

Jedes Teammitglied braucht:
1. Einen Supabase-Account (kostenlos)
2. Zugriff auf das Projekt (vom Projekt-Owner einladen lassen)

**Account erstellen:**
1. Gehe zu https://supabase.com
2. Klicke auf "Start your project"
3. Melde dich mit GitHub an

**Zum Projekt eingeladen werden:**
- Der Projekt-Owner muss dich einladen
- Du erhältst eine E-Mail mit dem Einladungslink

---

## 3. Supabase CLI Setup

### Was ist die Supabase CLI?

Die CLI (Command Line Interface) ist ein Tool, mit dem du:
- Datenbank-Änderungen erstellen kannst (Migrations)
- Migrations in die Cloud pushen kannst
- Lokale Tests durchführen kannst (optional)

### Installation

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
# Mit Scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Alternative (alle Betriebssysteme):**
```bash
npx supabase [command]
```
Funktioniert ohne Installation, ist aber langsamer.

### Überprüfen

```bash
supabase --version
```
Sollte die Version ausgeben (z.B. `2.90.0`)

### Anmeldung

```bash
supabase login
```
- Öffnet deinen Browser
- Melde dich mit deinem Supabase-Account an
- CLI ist jetzt authentifiziert

### Projekt verlinken

```bash
supabase link --project-ref yemmuitnxoyhxdsbfcfb
```

**Was passiert hier?**
- Verbindet dein lokales Projekt mit der Cloud-Datenbank
- Du kannst jetzt Migrations erstellen und pushen

**Überprüfen:**
```bash
supabase projects list
```
Du solltest `campus-app` mit einem Punkt (●) sehen - das bedeutet "verlinkt".

---

## 4. Wie alles zusammenarbeitet

### Database-as-Code Konzept

Alle Datenbank-Änderungen werden als SQL-Dateien (Migrations) gespeichert:

```
supabase/migrations/
├── 20260417180918_add_students_table.sql
└── 20260417181800_add_courses_table.sql
```

**Vorteile:**
- Jeder sieht genau, was sich geändert hat
- Änderungen sind nachvollziehbar (Git History)
- Keine "Wer hat was geändert?"-Probleme
- Automatische Synchronisation im Team

### Workflow für Datenbank-Änderungen

**Beispiel: Neue Tabelle erstellen**

**1. Migration erstellen**
```bash
supabase migration new add_teachers_table
```
Erstellt: `supabase/migrations/20260418_add_teachers_table.sql`

**2. SQL schreiben**
```sql
CREATE TABLE teachers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. Zur Cloud pushen**
```bash
supabase db push
```
Die Tabelle ist jetzt in der Supabase Cloud live!

**4. In Git speichern**
```bash
git add supabase/migrations/
git commit -m "Add teachers table"
git push
```

**5. Teammitglieder holen die Änderung**
```bash
git pull
supabase db push
```
Jetzt haben alle die neue Tabelle!

---

## 5. Environment Variables

### Was sind Environment Variables?

Geheime Schlüssel, die deine App braucht, um mit Supabase zu kommunizieren.

### .env.local Datei

Im Projekt-Root gibt es eine `.env.local` Datei:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yemmuitnxoyhxdsbfcfb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

**Wichtig:**
- Diese Datei ist bereits konfiguriert
- Sie wird NICHT in Git eingecheckt (.gitignore)
- Jedes Teammitglied muss sie haben

**Falls die Datei fehlt:**
1. Hole dir die Werte vom Projekt-Owner
2. Oder finde sie im Supabase Dashboard unter "Settings" → "API"

---

## 6. Migrations-Status prüfen

### Lokale vs. Cloud Migrations

**Alle Migrations anzeigen:**
```bash
supabase migration list --linked
```

Ausgabe:
```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260417180918 | 20260417180918 | 2026-04-17 18:09:18
   20260417181800 | 20260417181800 | 2026-04-17 18:18:00
```

- **Local** = auf deinem Computer
- **Remote** = in der Cloud

**Wenn beide Spalten gleich sind:** Alles synchronisiert!

**Unterschiede prüfen:**
```bash
supabase db diff --linked
```

---

## 7. Häufige Probleme

### "command not found: supabase"

**Problem:** CLI nicht installiert oder nicht im PATH

**Lösung:**
```bash
brew install supabase/tap/supabase
```

### "Project not linked"

**Problem:** Projekt nicht mit Cloud verbunden

**Lösung:**
```bash
supabase link --project-ref yemmuitnxoyhxdsbfcfb
```

### "Remote database is ahead"

**Problem:** Jemand hat Änderungen gemacht, die du nicht hast

**Lösung:**
```bash
git pull
supabase db push
```

### "Migration already exists"

**Problem:** Jemand hat eine Migration mit gleichem Namen erstellt

**Lösung:**
- Migrations haben Timestamps im Namen
- Einfach `git pull` machen und weitermachen
- Deine lokale Migration wird automatisch einen neuen Timestamp bekommen

### "Permission denied"

**Problem:** Du hast keinen Zugriff auf das Supabase-Projekt

**Lösung:**
- Frag den Projekt-Owner, dich einzuladen
- Prüfe ob du mit dem richtigen Account eingeloggt bist

---

## 8. Best Practices

### Do's

- Immer `git pull` BEVOR du eine neue Migration erstellst
- Immer `supabase db push` NACH `git pull`
- Aussagekräftige Migration-Namen verwenden
- Kleine, fokussierte Migrations erstellen

### Don'ts

- Nie direkt in der Supabase Dashboard Tabellen ändern
- Nie alte Migrations bearbeiten (die schon gepusht wurden)
- Nie `.env.local` in Git committen
- Nie ohne `git pull` starten zu arbeiten

---

## 9. Setup-Checkliste

Gehe diese Liste durch, um sicherzustellen, dass alles funktioniert:

- [ ] Git installiert (`git --version`)
- [ ] GitHub Repo geklont
- [ ] Node.js installiert (`node --version`)
- [ ] Dependencies installiert (`npm install`)
- [ ] Supabase CLI installiert (`supabase --version`)
- [ ] Bei Supabase angemeldet (`supabase login`)
- [ ] Projekt verlinkt (`supabase link --project-ref yemmuitnxoyhxdsbfcfb`)
- [ ] Migrations synchronisiert (`supabase db push`)
- [ ] `.env.local` vorhanden
- [ ] Zugriff auf Supabase Dashboard

**Wenn alles abgehakt ist, bist du ready!**

---

## 10. Nützliche Links

- **GitHub Repo:** https://github.com/VSYS-AIN-SS2026/campus-app
- **Supabase Dashboard:** https://app.supabase.com/project/yemmuitnxoyhxdsbfcfb
- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **Git Basics:** https://git-scm.com/book/en/v2/Getting-Started-Git-Basics

---

## 11. Support

**Bei Problemen:**
1. Prüfe diesen Guide nochmal
2. Schau in die "Häufige Probleme" Sektion
3. Frag im Team-Chat
4. Schau in die Supabase Docs
