<script setup lang="ts">
import { computed } from 'vue'
import ModuleCard from './ModuleCard.vue'
import type { SpoModule } from '../types'

const props = defineProps<{
  modules: SpoModule[]
}>()

const bySemester = computed(() => {
  const map = new Map<number, SpoModule[]>()
  for (const m of props.modules) {
    const key = m.semester_recommendation ?? 99
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return [...map.entries()].sort(([a], [b]) => a - b)
})

function semesterLabel(sem: number): string {
  return sem === 99 ? 'Ohne Semesterzuordnung' : `${sem}. Semester`
}

function totalEcts(modules: SpoModule[]): number {
  return modules.reduce((sum, m) => sum + (m.ects ?? 0), 0)
}
</script>

<template>
  <div class="module-list">
    <div v-for="[sem, mods] in bySemester" :key="sem" class="semester-group">
      <div class="semester-header">
        <h2 class="semester-title">{{ semesterLabel(sem) }}</h2>
        <span class="semester-ects">{{ totalEcts(mods) }} ECTS</span>
      </div>
      <div class="semester-modules">
        <ModuleCard v-for="m in mods" :key="m.id" :module="m" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.semester-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.semester-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.semester-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.semester-ects {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  padding: 2px 10px;
  border-radius: 20px;
}

.semester-modules {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
