<script setup lang="ts">
import { computed, ref } from 'vue'
import ModuleCard from './ModuleCard.vue'
import type { ModuleEntry, ModuleStatus } from '../types'

const props = defineProps<{
  modules: ModuleEntry[]
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

// Completed first, then in-progress, then still-open (matches "abgeschlossene
// und noch offene Module"). Completed is collapsed by default.
const STATUS_ORDER: ModuleStatus[] = ['abgeschlossen', 'belegt', 'offen']
const STATUS_LABEL: Record<ModuleStatus, string> = {
  abgeschlossen: 'Abgeschlossen',
  belegt: 'Belegt',
  offen: 'Offen',
}

function moduleEcts(m: ModuleEntry): number {
  return m.courses.reduce((sum, c) => sum + (c.ects ?? 0), 0)
}

const groups = computed(() =>
  STATUS_ORDER.map((status) => {
    const mods = props.modules.filter((m) => m.module_status === status)
    return {
      status,
      label: STATUS_LABEL[status],
      modules: mods,
      count: mods.length,
      ects: mods.reduce((sum, m) => sum + moduleEcts(m), 0),
    }
  }),
)

function group(status: ModuleStatus) {
  return groups.value.find((g) => g.status === status)!
}

const totalEcts = computed(() => props.modules.reduce((sum, m) => sum + moduleEcts(m), 0))
const completedEcts = computed(() => group('abgeschlossen').ects)
const progressPct = computed(() =>
  totalEcts.value > 0 ? Math.round((completedEcts.value / totalEcts.value) * 100) : 0,
)

function widthPct(ects: number): string {
  return totalEcts.value > 0 ? `${(ects / totalEcts.value) * 100}%` : '0%'
}

// Collapsible groups — completed collapsed by default, the rest expanded.
const collapsed = ref<Record<ModuleStatus, boolean>>({
  abgeschlossen: true,
  belegt: false,
  offen: false,
})

function toggle(status: ModuleStatus) {
  collapsed.value[status] = !collapsed.value[status]
}

// Quick-nav: expand the target group and scroll it into view.
function jumpTo(status: ModuleStatus) {
  collapsed.value[status] = false
  requestAnimationFrame(() => {
    document.getElementById(`module-group-${status}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <div class="status-list">
    <!-- Progress overview -->
    <section class="progress-card">
      <header class="progress-head">
        <h2 class="progress-title">Studienfortschritt</h2>
        <span class="progress-ects">{{ completedEcts }} / {{ totalEcts }} ECTS</span>
      </header>

      <div
        class="progress-track"
        role="progressbar"
        :aria-valuenow="progressPct"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`${progressPct}% der ECTS abgeschlossen`"
      >
        <div class="progress-fill progress-fill-abgeschlossen" :style="{ width: widthPct(group('abgeschlossen').ects) }" />
        <div class="progress-fill progress-fill-belegt" :style="{ width: widthPct(group('belegt').ects) }" />
      </div>

      <div class="quicknav">
        <button
          v-for="grp in groups"
          :key="grp.status"
          type="button"
          class="quicknav-chip"
          @click="jumpTo(grp.status)"
        >
          <span class="quicknav-dot" :class="`dot-${grp.status}`" />
          {{ grp.label }}
          <span class="quicknav-count">{{ grp.count }}</span>
        </button>
      </div>
    </section>

    <!-- Status groups -->
    <section
      v-for="grp in groups"
      :id="`module-group-${grp.status}`"
      :key="grp.status"
      class="status-group"
      :class="`status-group-${grp.status}`"
    >
      <button
        type="button"
        class="group-header"
        :aria-expanded="!collapsed[grp.status]"
        @click="toggle(grp.status)"
      >
        <span class="group-caret" :class="{ open: !collapsed[grp.status] }" aria-hidden="true">▸</span>
        <span class="group-name">{{ grp.label }}</span>
        <span class="group-meta">
          <span class="group-badge">{{ grp.count }} {{ grp.count === 1 ? 'Modul' : 'Module' }}</span>
          <span class="group-badge group-badge-ects">{{ grp.ects }} ECTS</span>
        </span>
      </button>

      <div v-show="!collapsed[grp.status]" class="group-modules">
        <p v-if="!grp.count" class="group-empty">Keine Module in dieser Kategorie.</p>
        <ModuleCard v-for="m in grp.modules" :key="m.id" :module="m" @select="emit('select', $event)" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.status-list {
  display: flex;
  flex-direction: column;
  gap: 1.1em;
}

/* ── Progress overview ── */
.progress-card {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: 0;
  padding: 0.9em 0.85em;
  display: flex;
  flex-direction: column;
  gap: 0.7em;
}

.progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;
}

.progress-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--color-text);
}

.progress-ects {
  font-size: 80%;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.progress-track {
  display: flex;
  height: 0.55em;
  background: var(--color-surface-raised);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.25s ease;
}

.progress-fill-abgeschlossen { background: rgba(16, 185, 129, 0.7); }
.progress-fill-belegt { background: rgba(245, 158, 11, 0.65); }

.quicknav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
}

.quicknav-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  font: inherit;
  font-size: 78%;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  border: 0.0625rem solid var(--color-border);
  padding: 0.25em 0.6em;
  border-radius: var(--radius-control);
  cursor: pointer;
}

.quicknav-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.quicknav-dot {
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-abgeschlossen { background: #10b981; }
.dot-belegt { background: #f59e0b; }
.dot-offen { background: var(--color-text-muted); }

.quicknav-count {
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

/* ── Collapsible status groups ── */
.status-group {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-left-width: 0.1875rem;
  border-radius: 0;
}

.status-group-abgeschlossen { border-left-color: rgba(16, 185, 129, 0.55); }
.status-group-belegt { border-left-color: rgba(245, 158, 11, 0.55); }
.status-group-offen { border-left-color: var(--color-border); }

.group-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.7em 0.75em;
  background: transparent;
  border: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--color-text);
}

.group-caret {
  display: inline-block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  transition: transform 0.15s ease;
}

.group-caret.open {
  transform: rotate(90deg);
}

.group-name {
  font-size: 0.95rem;
  font-weight: 700;
}

.group-meta {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4em;
}

.group-badge {
  font-size: 75%;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  border: 0.0625rem solid var(--color-border);
  padding: 0.15em 0.6em;
  border-radius: var(--radius-control);
}

.group-badge-ects {
  color: var(--color-primary);
  background: var(--color-surface);
  border-color: var(--color-primary-light);
}

.group-modules {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 0 0.75em 0.75em;
}

.group-empty {
  margin: 0;
  padding: 0.4em 0.2em;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

@media (max-width: 40em) {
  .group-header {
    flex-wrap: wrap;
  }

  .group-meta {
    width: 100%;
    justify-content: flex-start;
    margin-left: 1.3em;
  }
}
</style>
