<script setup lang="ts">
import { computed } from 'vue'
import ModuleCard from './ModuleCard.vue'
import type { ModuleEntry } from '../types'

const props = defineProps<{
  modules: ModuleEntry[]
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

function semKey(m: ModuleEntry): number {
  if (m.recommended_semester != null) return m.recommended_semester

  // start_semester remains the fallback if handbook data is missing.
  const fromStart = parseInt(m.start_semester)
  if (!isNaN(fromStart) && fromStart > 0) return fromStart

  return 99
}

const bySemester = computed(() => {
  const map = new Map<number, ModuleEntry[]>()
  for (const m of props.modules) {
    const key = semKey(m)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return [...map.entries()].sort(([a], [b]) => a - b)
})

function semesterLabel(sem: number): string {
  return sem === 99 ? 'Ohne Semesterzuordnung' : `${sem}. Semester`
}

function totalEcts(mods: ModuleEntry[]): number {
  return mods.reduce((s, m) => s + m.courses.reduce((cs, c) => cs + (c.ects ?? 0), 0), 0)
}
</script>

<template>
  <div class="module-list">
    <div v-for="[sem, mods] in bySemester" :key="sem" class="semester-group">
      <div class="semester-header">
        <h2 class="semester-title">{{ semesterLabel(sem) }}</h2>
        <div class="semester-meta">
          <span class="semester-badge">{{ mods.length }} {{ mods.length === 1 ? 'Modul' : 'Module' }}</span>
          <span class="semester-badge semester-badge-ects">{{ totalEcts(mods) }} ECTS</span>
        </div>
      </div>
      <div class="semester-modules">
        <ModuleCard v-for="m in mods" :key="m.id" :module="m" @select="emit('select', $event)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-list {
  display: flex;
  flex-direction: column;
  gap: 1.1em;
}

.semester-group {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: 0.75em;
  display: flex;
  flex-direction: column;
  gap: 0.75em;
}

.semester-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75em;
  padding: 0.2em 0.2em 0.6em;
  border-bottom: 1px solid var(--color-border);
}

.semester-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--color-text);
}

.semester-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4em;
}

.semester-badge {
  font-size: 75%;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  padding: 0.15em 0.6em;
  border-radius: var(--radius-control);
}

.semester-badge-ects {
  color: var(--color-primary);
  background: var(--color-surface);
  border-color: var(--color-primary-light);
}

.semester-modules {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

@media (max-width: 640px) {
  .semester-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .semester-meta {
    justify-content: flex-start;
  }
}
</style>
