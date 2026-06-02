# Agent Context — campus-app (repo root)

> Full context including worktree workflow is one level up:
> `/Users/dominikmuller/Projects/GitHub/campus_app/AGENTS.md`
>
> This file is a code-level quick-reference for agents working directly
> inside this repo (`campus-app/`).

---

## Project

Vue 3 + TypeScript frontend (`frontend/src/`) backed by Supabase
(PostgreSQL + Realtime + Auth). Vite dev server. No SSR.

Supabase project ref: `yemmuitnxoyhxdsbfcfb`

```bash
npm run dev       # 127.0.0.1:4173
npm run build     # typecheck + build
npm run test      # Vitest, TZ=Europe/Berlin
supabase db push  # push migrations to cloud
```

---

## File structure

```
frontend/src/
├── App.vue                        # root — owns app-level controller + sidebar
├── router/index.ts                # vue-router; / and /schedule/hidden use AppShellHost
├── supabase.ts                    # Supabase client (reads VITE_* env vars)
├── composables/
│   ├── appController/             # auth, profile, schedule, state, modules
│   ├── useAppController.ts        # assembles and exports all controller slices
│   ├── useWeeklySchedule.ts       # overlap layout (assignColumns), event positioning
│   ├── useNotifications.ts        # fetch, mark-read, delete, Realtime subscribe
│   └── useTeams.ts                # team CRUD + invitation RPCs
├── views/                         # route-level components (Teams* views)
├── components/
│   ├── teamWeek/                  # CombinedWeekView, CombinedWeekGrid, AppointmentDetailDialog
│   └── weekly/                    # WeekDesktopGrid, hour/day columns
└── types/                         # schedule.ts, teamWeek.ts, supabase.ts
```

---

## Frontend conventions

- **Design tokens only** — `var(--space-*)`, `var(--font-size-*)`, `var(--color-*)`.
  Never hardcode px or hex colors.
- **SFC order**: `<script setup lang="ts">` → `<template>` → `<style scoped>`
- Every prop/emit used in `<template>` must be declared in `<script setup>`
- `max-width` always paired with `margin-inline: auto`
- No `console.log` in committed code

---

## Database conventions

Migrations: `supabase/migrations/YYYYMMDDHHMMSS_description.sql` — append only,
never edit existing files.

Every new RPC:
```sql
SECURITY DEFINER
SET search_path = public
-- + REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated;
```

Every INSERT into `notifications`: supply `dedup_key`, use `ON CONFLICT (dedup_key) DO NOTHING`.

`appointment_invitations.status` enum: `pending` | `accepted` | `declined`

---

## Known pitfalls

| Pitfall | Fix |
|---|---|
| Ambiguous `user_id` in multi-table query | Always qualify: `tm.user_id = auth.uid()` |
| Overlap not rendering | Use `assignColumns()` from `useWeeklySchedule` — do not recalculate |
| Sub-pixel gaps in calendar grid | Use rem positioning (`3.5rem/h`), not `%` |
| Merge conflict on `TeamsView.vue` | Print both sides, keep the branch version unless main has intentional additions |

---

## Do not

- Edit existing migrations
- Use `sampleSlots` / `sampleMembers` / demo data in any view
- Auto-resolve merge conflicts without printing both sides first
- Hardcode colors or px values
- Leave `console.log` in committed code
