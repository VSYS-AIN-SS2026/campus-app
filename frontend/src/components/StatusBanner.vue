<script setup lang="ts">
import { computed, ref } from 'vue'
import { useServiceStatus } from '../composables/useServiceStatus'

const { dbUp, appUp, statusPageUrl } = useServiceStatus()

const dismissed = ref(false)

// Only the database being down is treated as a hard outage; the client server
// being unreachable usually means the user can't load the app at all, but we
// still surface it if the monitor reports it while the page is open.
const message = computed<string | null>(() => {
  if (dbUp.value === false) {
    return 'Die Datenbank ist aktuell nicht erreichbar. Einige Funktionen sind eingeschränkt.'
  }
  if (appUp.value === false) {
    return 'Der Server meldet eine Störung. Einige Funktionen sind eingeschränkt.'
  }
  return null
})

const visible = computed(() => message.value !== null && !dismissed.value)
</script>

<template>
  <div v-if="visible" class="status-banner" role="alert">
    <span class="status-banner-dot" aria-hidden="true" />
    <span class="status-banner-text">{{ message }}</span>
    <a
      v-if="statusPageUrl"
      class="status-banner-link"
      :href="statusPageUrl"
      target="_blank"
      rel="noopener noreferrer"
    >Statusseite</a>
    <button
      type="button"
      class="status-banner-close"
      aria-label="Hinweis schließen"
      @click="dismissed = true"
    >&times;</button>
  </div>
</template>

<style scoped>
.status-banner {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-3xl);
  background: var(--color-error-bg);
  border-bottom: 1px solid var(--color-error-border);
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.status-banner-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--color-error);
}

.status-banner-text {
  flex: 1;
  min-width: 0;
}

.status-banner-link {
  flex-shrink: 0;
  color: var(--color-error);
  font-weight: 700;
  text-decoration: underline;
}

.status-banner-close {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  background: none;
  border: none;
  color: var(--color-error);
  font-size: var(--font-size-lg);
  line-height: 1;
  cursor: pointer;
  border-radius: var(--radius);
}

.status-banner-close:hover {
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
}
</style>
