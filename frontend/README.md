# Campus App – Frontend

Vue 3 + Vite + TypeScript single-page app for the HTWG campus (schedule,
modules, team appointments), backed by Supabase. Ships as an installable
**Progressive Web App** with offline app-shell support.

## Development

```bash
npm install
npm run dev        # Vite dev server on http://127.0.0.1:4173
npm run typecheck  # vue-tsc
npm run test       # vitest
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

Environment variables (see `.env.example`, put local values in `.env.local`):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (also used to scope the service-worker cache) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_MAGIC_LINK_REDIRECT_URL` | Optional magic-link redirect; defaults to the current origin |

## PWA

The app is installable and works offline at the shell level via
[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox `generateSW`):

- **App shell** (HTML/JS/CSS/icons) is precached, so the app loads offline and
  any deep link falls back to `index.html`.
- **Supabase reads** (`GET /rest/v1/`) use a network-first cache, so the last
  response is still available offline. Auth, realtime and mutations are never
  cached.
- **Updates** use a prompt strategy: when a new build is deployed, an in-app
  toast (`src/components/PwaPrompt.vue`) offers a reload instead of swapping the
  app out from under the user.

The service worker is **disabled in `vite dev`** — test it with
`npm run build && npm run preview`.

### Icons

Install icons are pre-generated and committed under `public/` so the build
needs no native image tooling. To regenerate them after changing the source
`public/pwa-icon.svg`:

```bash
npm run generate:pwa-assets
```

> `public/favicon.ico` is the **HTWG brand mark** used for the browser tab and
> the in-app header logo. It is intentionally *not* produced by the generator —
> don't overwrite it with the install icon.
