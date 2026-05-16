# Module fixtures

Auto-generated example data for the `ModuleEntry` / `Course` / `ModuleListItem`
types defined in `../types.ts`. Used by frontend code that wants to render
real-shaped module data before the Supabase tables are populated.

## Layout

```
fixtures/
├── modules_list.json          # ModuleListItem[] (mirrors `view_modules_table`)
├── modules/                   # one module row per file (raw `modules.*` columns)
│   ├── MAT1-01.json
│   └── …
├── courses/                   # one Course[] per file (same basename as parent module)
│   ├── MAT1-01.json
│   └── …
└── index.ts                   # typed re-exports + the joined ModuleEntry[] form
```

Filename rule: parent module code with `/` → `-`. Synthesised `id`s use a
stable `fixture-<slug>` prefix so re-runs produce identical ids (safe to
hardcode in tests).

## Importing

```typescript
import {
  fixtureModuleEntries,      // ModuleEntry[] — joined modules + courses + defaults
  fixtureModulesList,        // ModuleListItem[] — slim list-page payload
  fixtureModulesByCode,      // Record<code, ModuleEntry>
} from './fixtures'
```

`fixtureModuleEntries` is what `App.vue` would normally assemble at runtime
from Supabase queries. Drop it straight into the `modules` ref to render
the UI without a database connection.

## What's covered

The 9 hand-picked modules each exercise a different schema corner —
single-int / range / cohort start_semester, mixed-language variants, sonstiges
overrides, role-based coordinators, multivalued course types, etc. See
`scripts/build_fixture.py` for the picks and rationale.

## Regenerating

```
scripts/.venv/bin/python scripts/build_per_module_fixtures.py
```

The script is idempotent. To pull in different modules, edit `PICKS` in
`scripts/build_fixture.py`, re-run that script, then re-run this one.
