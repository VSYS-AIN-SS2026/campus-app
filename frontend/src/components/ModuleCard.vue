<script setup lang="ts">
import { computed } from 'vue'
import type { ModuleEntry } from '../types'

const props = defineProps<{
  module: ModuleEntry
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

const totalEcts = computed(() =>
  props.module.courses.reduce((s, c) => s + (c.ects ?? 0), 0)
)
</script>

<template>
  <div class="module-card" role="button" tabindex="0" @click="emit('select', module)" @keydown.enter="emit('select', module)">
    <div class="card-left">
      <span class="module-code">{{ module.code }}</span>
    </div>
    <div class="card-body">
      <p class="module-name">{{ module.name }}</p>
      <div v-if="module.courses.length" class="courses">
        <span
          v-for="c in module.courses"
          :key="c.id"
          class="course-chip"
          :class="c.course_type.toLowerCase()"
        >
          {{ c.name }} · {{ c.ects }} ECTS
        </span>
      </div>
    </div>
    <div class="card-right">
      <span class="ects-badge">{{ totalEcts }} ECTS</span>
      <span class="coordinator">{{ module.coordinator }}</span>
    </div>
  </div>
</template>

<style scoped>
.module-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
  user-select: none;
}

.module-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.12);
}

.card-left {
  flex-shrink: 0;
  padding-top: 2px;
}

.module-code {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  padding: 4px 6px;
  border-radius: 5px;
  display: inline-block;
  white-space: nowrap;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.module-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.courses {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.course-chip {
  font-size: 0.72rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}

.course-chip.vorlesung {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border-color: rgba(99, 102, 241, 0.2);
}

.course-chip.praktikum {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.2);
}

.course-chip.seminar {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.2);
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.ects-badge {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-surface-raised);
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

.coordinator {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
