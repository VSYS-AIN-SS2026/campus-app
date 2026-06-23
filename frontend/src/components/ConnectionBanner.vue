<script setup lang="ts">
defineProps<{
  isOnline: boolean
  justReconnected: boolean
}>()
</script>

<template>
  <Transition name="conn-banner">
    <div
      v-if="!isOnline || justReconnected"
      class="conn-banner"
      :class="isOnline ? 'conn-banner--online' : 'conn-banner--offline'"
      role="status"
      aria-live="polite"
    >
      <span class="conn-banner__icon" aria-hidden="true">
        {{ isOnline ? '✓' : '⚠' }}
      </span>
      <span class="conn-banner__text">
        {{ isOnline
          ? 'Verbindung wiederhergestellt.'
          : 'Keine Internetverbindung – einige Funktionen sind möglicherweise nicht verfügbar.'
        }}
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.conn-banner {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 16px color-mix(in srgb, black 18%, transparent);
  white-space: nowrap;
  max-width: calc(100vw - 2rem);
  white-space: normal;
  text-align: center;
}

.conn-banner--offline {
  background: var(--color-error-bg, #fee2e2);
  border: 1px solid var(--color-error-border, #fca5a5);
  color: var(--color-error, #dc2626);
}

.conn-banner--online {
  background: var(--color-success-bg, #dcfce7);
  border: 1px solid var(--color-success-border, #86efac);
  color: var(--color-success, #16a34a);
}

.conn-banner__icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.conn-banner-enter-active,
.conn-banner-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.conn-banner-enter-from,
.conn-banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(0.75rem);
}
</style>
