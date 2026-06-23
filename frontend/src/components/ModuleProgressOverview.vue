<script setup lang="ts">
import { computed } from 'vue'
import type { ModuleEntry, ModuleStatus } from '../types'
import { computeStudyProgress } from '../utils/progress'

// Study-progress summary. Always reflects the FULL module set it is given
// (the planner feeds it all SPO modules, unaffected by the search/filter bar).
const props = defineProps<{
  modules: ModuleEntry[]
}>()

const emit = defineEmits<{ jump: [ModuleStatus] }>()

const STATUS_ORDER: ModuleStatus[] = ['abgeschlossen', 'belegt', 'offen']
const STATUS_LABEL: Record<ModuleStatus, string> = {
  abgeschlossen: 'Abgeschlossen',
  belegt: 'Belegt',
  offen: 'Offen',
}

const progress = computed(() => computeStudyProgress(props.modules))

const groups = computed(() =>
  STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    count: props.modules.filter((m) => m.module_status === status).length,
  })),
)

function widthPct(ects: number): string {
  return progress.value.plannedEcts > 0 ? `${(ects / progress.value.plannedEcts) * 100}%` : '0%'
}
</script>

<template>
  <section class="progress-card">
    <header class="progress-head">
      <h2 class="progress-title">Studienfortschritt</h2>
      <span class="progress-ects">{{ progress.completedEcts }} / {{ progress.plannedEcts }} ECTS</span>
    </header>

    <div
      class="progress-track"
      role="progressbar"
      :aria-valuenow="progress.percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`${progress.percent}% der ECTS abgeschlossen`"
    >
      <div class="progress-fill progress-fill-abgeschlossen" :style="{ width: widthPct(progress.completedEcts) }" />
      <div class="progress-fill progress-fill-belegt" :style="{ width: widthPct(progress.inProgressEcts) }" />
    </div>

    <div class="quicknav">
      <button
        v-for="grp in groups"
        :key="grp.status"
        type="button"
        class="quicknav-chip"
        @click="emit('jump', grp.status)"
      >
        <span class="quicknav-dot" :class="`dot-${grp.status}`" />
        {{ grp.label }}
        <span class="quicknav-count">{{ grp.count }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.progress-card {
  margin-top: 0.6em;
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
</style>
