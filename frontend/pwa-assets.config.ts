import { defineConfig } from '@vite-pwa/assets-generator/config'

// Generates the PWA install icons from a single source SVG (public/pwa-icon.svg).
// Run locally with `npm run generate:pwa-assets` whenever the icon changes.
// The output PNGs are committed to public/ and referenced statically by the
// manifest, so `npm run build` never invokes the native `sharp` rasteriser and
// the nginx runtime image (which ships only dist/) contains no `sharp` at all.
// (The Docker build stage's `npm ci` still installs this dev-only generator,
// but it is never executed during the build.)
//
// NOTE: favicon.ico is intentionally NOT generated here — it is the HTWG
// brand mark used for the browser tab and the in-app header logo, and must
// not be overwritten by the calendar install icon.
export default defineConfig({
  preset: {
    transparent: {
      sizes: [192, 512],
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: '#005ca9' },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: '#005ca9' },
    },
  },
  images: ['public/pwa-icon.svg'],
})
