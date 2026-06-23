import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Derive the Supabase REST origin so the service worker can apply a
  // network-first runtime cache to it. The origin is baked into a RegExp
  // literal (NOT a closure) because Workbox serialises route patterns into
  // the generated service worker via toString() — a closed-over variable
  // would be undefined at SW runtime. Falls back gracefully when the env var
  // is absent (e.g. a build without Supabase configured): the rule is omitted.
  let supabaseOrigin: string | undefined
  try {
    if (env.VITE_SUPABASE_URL) supabaseOrigin = new URL(env.VITE_SUPABASE_URL).origin
  } catch {
    supabaseOrigin = undefined
  }

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const runtimeCaching = supabaseOrigin
    ? [
        {
          // Supabase REST reads: serve from network, fall back to the last
          // cached response when offline. Only GET on /rest/v1/ is cached —
          // never /auth/v1/ (sessions), /realtime/ (websocket) or mutations.
          urlPattern: new RegExp(`^${escapeRegExp(supabaseOrigin)}/rest/v1/`),
          handler: 'NetworkFirst' as const,
          method: 'GET' as const,
          options: {
            cacheName: 'supabase-rest',
            networkTimeoutSeconds: 10,
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ]
    : []

  return {
    plugins: [
      vue(),
      VitePWA({
        // 'prompt': the new service worker waits; the in-app PwaPrompt asks the
        // user before reloading, so we never swap the app out from under them.
        registerType: 'prompt',
        // Register the SW manually from PwaPrompt.vue (virtual:pwa-register/vue)
        // so the update / offline-ready UX lives in one component.
        injectRegister: false,
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          id: '/',
          name: 'Campus App',
          short_name: 'Campus',
          description: 'Stundenplan, Module und Teamtermine für den HTWG-Campus.',
          lang: 'de',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#f3f7fb',
          theme_color: '#ffffff',
          categories: ['education', 'productivity'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell is precached; SPA deep links fall back to index.html.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching,
        },
        // Run the service worker in `vite dev` too, so the app is installable
        // and the update/offline prompts can be exercised without a prod build.
        // Uses an ES-module dev SW; navigateFallback keeps SPA deep links working.
        // If the dev SW ever caches stale assets, unregister it in DevTools →
        // Application → Service Workers (or just use `npm run build && preview`).
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
          suppressWarnings: true,
        },
      }),
    ],
  }
})
