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
  <div
    class="module-card"
    role="button"
    tabindex="0"
    @click="emit('select', module)"
    @keydown.enter="emit('select', module)"
  >
    <div class="card-left">
      <span class="module-code">{{ module.code }}</span>
    </div>

    <div class="card-body">
      <p class="module-name">{{ module.name }}</p>

      <div class="tags">
        <!-- Pflicht / Wahlpflicht -->
        <span class="tag" :class="module.is_mandatory ? 'tag-mandatory' : 'tag-optional'">
          {{ module.is_mandatory ? 'Pflicht' : 'Wahlpflicht' }}
        </span>

        <!-- Vertiefung -->
        <span v-if="module.is_specialization" class="tag tag-specialization">
          {{ module.specialization_name ?? 'Vertiefung' }}
        </span>

        <!-- Sprache (nur wenn nicht Deutsch) -->
        <span v-if="module.language && module.language !== 'Deutsch'" class="tag tag-language">
          {{ module.language }}
        </span>

        <!-- Lehrveranstaltungs-Chips -->
        <template v-if="module.courses.length">
          <span
            v-for="c in module.courses"
            :key="c.id"
            class="tag"
            :class="`tag-course-${c.course_type.toLowerCase()}`"
          >
            {{ c.course_type }}
          </span>
        </template>
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
  gap: 14px;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.module-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.12);
}

/* ─── left col ─── */
.card-left { flex-shrink: 0; padding-top: 2px; }

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

/* ─── body ─── */
.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.module-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

/* ─── tags ─── */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 99px;
  white-space: nowrap;
  border: 1px solid transparent;
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
}

/* Pflicht */
.tag-mandatory {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.25);
}

/* Wahlpflicht */
.tag-optional {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.25);
}

/* Vertiefung */
.tag-specialization {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
  border-color: rgba(168, 85, 247, 0.25);
}

/* Sprache */
.tag-language {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.25);
}

/* Kurstypen */
.tag-course-vorlesung, .tag-course-lecture {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border-color: rgba(99, 102, 241, 0.2);
}
.tag-course-praktikum {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.18);
}
.tag-course-seminar {
  background: rgba(245, 158, 11, 0.08);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.18);
}
.tag-course-übung, .tag-course-exercise, .tag-course-uebung {
  background: rgba(236, 72, 153, 0.08);
  color: #ec4899;
  border-color: rgba(236, 72, 153, 0.18);
}

/* ─── right col ─── */
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
