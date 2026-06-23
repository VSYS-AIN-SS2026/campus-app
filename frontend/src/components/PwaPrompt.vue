<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// Check for a new service worker every hour while the tab stays open.
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

let updateTimer: ReturnType<typeof setInterval> | undefined

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_swScriptUrl, registration) {
    if (!registration) return
    updateTimer = setInterval(() => {
      // Skip the network poll while offline — it would only error.
      if (navigator.onLine) registration.update()
    }, UPDATE_INTERVAL_MS)
  },
})

function reload() {
  // skipWaiting on the waiting SW, then reload into the new version.
  updateServiceWorker(true)
}

function dismiss() {
  offlineReady.value = false
  needRefresh.value = false
}

onUnmounted(() => {
  if (updateTimer) clearInterval(updateTimer)
})
</script>

<template>
  <!--
    The live region is mounted permanently (empty when idle) so screen readers
    are already watching it when a message appears — a region inserted together
    with its text in one DOM mutation is not reliably announced.
  -->
  <div class="pwa-toast" role="status" aria-live="polite" aria-atomic="true">
    <div v-if="needRefresh" class="success-banner pwa-toast__row">
      <span>Neue Version verfügbar.</span>
      <span class="pwa-toast__actions">
        <button type="button" class="inline-action-button" @click="reload">Neu laden</button>
        <button type="button" class="pwa-toast__dismiss" aria-label="Hinweis schließen" @click="dismiss">✕</button>
      </span>
    </div>

    <div v-else-if="offlineReady" class="info-banner pwa-toast__row">
      <span>App ist offline einsatzbereit.</span>
      <button type="button" class="pwa-toast__dismiss" aria-label="Hinweis schließen" @click="dismiss">✕</button>
    </div>
  </div>
</template>

<style scoped>
/* Positioned live-region container only — no visible box, so the permanently
   mounted wrapper is invisible while idle. The shadow lives on the banner. */
.pwa-toast {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1000;
  max-width: min(22rem, calc(100vw - 2rem));
}

.pwa-toast__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  /* Banner classes supply the radius; the shadow hugs that visible element. */
  box-shadow: var(--shadow);
}

.pwa-toast__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pwa-toast__dismiss {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  line-height: 1;
  padding: 4px;
  border-radius: 999px;
  cursor: pointer;
  opacity: 0.7;
}

.pwa-toast__dismiss:hover {
  opacity: 1;
}
</style>
