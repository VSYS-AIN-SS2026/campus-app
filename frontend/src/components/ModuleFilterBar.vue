<script lang="ts">
export interface ModuleFilterState {
  search: string
  kind: 'pflicht' | 'wahlpflicht' | 'sg' | null
  tags: string[]
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ModuleEntry } from '../types'

const SG_NAME = 'studium generale'

const props = defineProps<{
  modules: ModuleEntry[]
  filteredCount: number
}>()

const emit = defineEmits<{ change: [ModuleFilterState] }>()

const search = ref('')
const kind = ref<'pflicht' | 'wahlpflicht' | 'sg' | null>(null)
const tags = ref<string[]>([])

// Category tags present in the current module set (SG has its own chip).
const availableTags = computed(() => {
  const seen = new Map<string, string | undefined>()
  for (const m of props.modules) {
    for (const c of m.categories) {
      if (c.name.trim().toLowerCase() === SG_NAME) continue
      if (!seen.has(c.name)) seen.set(c.name, c.color)
    }
  }
  return [...seen.entries()]
    .map(([name, color]) => ({ name, color }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
})

const isFiltered = computed(
  () => search.value.trim() !== '' || kind.value !== null || tags.value.length > 0,
)

// Pflicht / Wahlpflicht / SG are mutually exclusive — one "kind" at a time.
function setKind(k: 'pflicht' | 'wahlpflicht' | 'sg') {
  kind.value = kind.value === k ? null : k
}

function toggleTag(name: string) {
  tags.value = tags.value.includes(name) ? tags.value.filter((x) => x !== name) : [...tags.value, name]
}

function reset() {
  search.value = ''
  kind.value = null
  tags.value = []
}

const criteria = computed<ModuleFilterState>(() => ({
  search: search.value.trim(),
  kind: kind.value,
  tags: [...tags.value],
}))

// Parent initialises its filter to the same all-pass defaults, so we only need
// to emit on actual changes (avoids emitting during the parent's first render).
watch(criteria, (value) => emit('change', value))
</script>

<template>
  <div class="filter-bar">
    <div class="filter-row">
      <input
        v-model="search"
        type="search"
        class="filter-search"
        placeholder="Modul suchen…"
        aria-label="Modul suchen"
      />

      <div class="filter-chips">
        <button
          type="button"
          class="filter-chip"
          :class="{ active: kind === 'pflicht' }"
          :aria-pressed="kind === 'pflicht'"
          @click="setKind('pflicht')"
        >
          Pflicht
        </button>
        <button
          type="button"
          class="filter-chip"
          :class="{ active: kind === 'wahlpflicht' }"
          :aria-pressed="kind === 'wahlpflicht'"
          @click="setKind('wahlpflicht')"
        >
          Wahlpflicht
        </button>
        <button
          type="button"
          class="filter-chip filter-chip-sg"
          :class="{ active: kind === 'sg' }"
          :aria-pressed="kind === 'sg'"
          @click="setKind('sg')"
        >
          ★ Studium Generale
        </button>

        <details v-if="availableTags.length" class="tags-dropdown">
          <summary class="filter-chip">
            Tags<span v-if="tags.length" class="chip-count">{{ tags.length }}</span>
            <span class="chip-caret" aria-hidden="true">▾</span>
          </summary>
          <div class="tags-panel">
            <label v-for="t in availableTags" :key="t.name" class="tag-option">
              <input
                type="checkbox"
                :checked="tags.includes(t.name)"
                @change="toggleTag(t.name)"
              />
              <span class="tag-dot" :style="t.color ? { background: t.color } : undefined" />
              <span class="tag-option-name">{{ t.name }}</span>
            </label>
          </div>
        </details>
      </div>
    </div>

    <div v-if="isFiltered" class="filter-meta">
      <span>{{ filteredCount }} von {{ modules.length }} Modulen</span>
      <button type="button" class="filter-reset" @click="reset">✕ Zurücksetzen</button>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  margin-top: 0.6em;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5em;
}

.filter-search {
  flex: 1 1 12em;
  min-width: 10em;
  font: inherit;
  font-size: 0.85rem;
  padding: 0.4em 0.7em;
  color: var(--color-text);
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control);
}

.filter-search:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4em;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35em 0.7em;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control);
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.filter-chip.active {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary-glow);
  color: var(--color-primary);
}

.filter-chip-sg.active {
  background: rgba(0, 128, 128, 0.12);
  border-color: #008080;
  color: #008080;
}

.chip-count {
  font-size: 90%;
  font-weight: 700;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 0 0.45em;
}

.chip-caret {
  font-size: 0.65rem;
}

.tags-dropdown {
  position: relative;
}

.tags-dropdown > summary {
  list-style: none;
}

.tags-dropdown > summary::-webkit-details-marker {
  display: none;
}

.tags-panel {
  position: absolute;
  z-index: 20;
  margin-top: 0.35em;
  min-width: 12em;
  max-height: 16em;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.1em;
  padding: 0.4em;
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow);
}

.tag-option {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.3em 0.4em;
  border-radius: var(--radius);
  font-size: 0.82rem;
  color: var(--color-text);
  cursor: pointer;
}

.tag-option:hover {
  background: var(--color-surface-raised);
}

.tag-dot {
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-text-muted);
}

.tag-option-name {
  overflow-wrap: anywhere;
}

.filter-meta {
  display: flex;
  align-items: center;
  gap: 0.75em;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.filter-reset {
  font: inherit;
  font-size: 0.78rem;
  color: var(--color-primary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.filter-reset:hover {
  text-decoration: underline;
}
</style>
