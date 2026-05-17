<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  items: Array<{ seriesId: string; title: string }>
  occurrenceItems?: Array<{ occurrenceId: string; title: string }>
}>()

const emit = defineEmits<{
  'show-series': [seriesId: string]
  'show-all-series': []
  'show-occurrence': [occurrenceId: string]
  'show-all-occurrences': []
}>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const countLabel = computed(() => `${props.items.length} ausgeblendet`)
const occurrenceCountLabel = computed(() => `${props.occurrenceItems?.length ?? 0} ausgeblendet`)

function togglePopover() {
  isOpen.value = !isOpen.value
}

function closePopover() {
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target

  if (!(target instanceof Node) || !rootRef.value) {
    return
  }

  if (!rootRef.value.contains(target)) {
    closePopover()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="rootRef" class="hidden-series">
    <button type="button" class="hidden-series-trigger app-button" @click="togglePopover">
      Verborgene Reihen · {{ countLabel }}
    </button>

    <section v-if="isOpen" class="hidden-series-popover" role="dialog" aria-label="Verborgene Reihen">
      <header class="hidden-series-header">
        <strong>Verborgene Reihen</strong>
        <button type="button" class="hidden-series-link" @click="emit('show-all-series')">
          Alle einblenden
        </button>
      </header>

      <ul class="hidden-series-list">
        <li v-for="item in items" :key="item.seriesId" class="hidden-series-row">
          <span class="hidden-series-title">{{ item.title }}</span>
          <button type="button" class="hidden-series-link" @click="emit('show-series', item.seriesId)">
            Einblenden
          </button>
        </li>
      </ul>

      <template v-if="props.occurrenceItems?.length">
        <header class="hidden-series-header hidden-series-subheader">
          <strong>Verborgene Einzeltermine · {{ occurrenceCountLabel }}</strong>
          <button type="button" class="hidden-series-link" @click="emit('show-all-occurrences')">
            Alle einblenden
          </button>
        </header>

        <ul class="hidden-series-list">
          <li
            v-for="item in props.occurrenceItems"
            :key="item.occurrenceId"
            class="hidden-series-row"
          >
            <span class="hidden-series-title">{{ item.title }}</span>
            <button
              type="button"
              class="hidden-series-link"
              @click="emit('show-occurrence', item.occurrenceId)"
            >
              Einblenden
            </button>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<style scoped>
.hidden-series { position: relative; }
.hidden-series-trigger { min-width: max-content; }
.hidden-series-popover {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  width: min(23rem, calc(100vw - 2rem));
  max-height: 18rem;
  overflow: auto;
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--color-surface) 90%, white);
  box-shadow: 0 0.75rem 2rem -1rem color-mix(in srgb, black 24%, transparent);
  padding: 0.625rem;
  z-index: 25;
}
.hidden-series-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.hidden-series-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.375rem; }
.hidden-series-subheader {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 0.0625rem solid var(--color-border);
}
.hidden-series-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: var(--color-surface-raised);
}
.hidden-series-title {
  font-size: 0.8rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hidden-series-link {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.hidden-series-link:hover { text-decoration: underline; }
@media (max-width: 45em) {
  .hidden-series-popover {
    right: auto;
    left: 0;
    width: min(22rem, calc(100vw - 2rem));
  }
}
</style>
