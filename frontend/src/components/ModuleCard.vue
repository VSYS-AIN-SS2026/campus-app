<script setup lang="ts">
import { computed } from 'vue'
import type { ModuleEntry, ModuleStatus } from '../types'

const props = defineProps<{
  module: ModuleEntry
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

const totalEcts = computed(() =>
  props.module.courses.reduce((s, c) => s + (c.ects ?? 0), 0)
)

const visibleCategories = computed(() => props.module.categories.slice(0, 3))
const hiddenCategoryCount = computed(() => Math.max(props.module.categories.length - visibleCategories.value.length, 0))

function statusLabel(status: ModuleStatus): string {
  switch (status) {
    case 'belegt':
      return 'Belegt'
    case 'abgeschlossen':
      return 'Abgeschlossen'
    default:
      return 'Offen'
  }
}
</script>

<template>
  <div
    class="module-card"
    :class="`module-card-${module.module_status}`"
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
        <span class="tag" :class="module.is_mandatory ? 'tag-mandatory' : 'tag-optional'">
          {{ module.is_mandatory ? 'Pflicht' : 'Wahlpflicht' }}
        </span>

        <span v-if="module.is_specialization" class="tag tag-specialization">
          {{ module.specialization_name ?? 'Vertiefung' }}
        </span>

        <span v-if="module.language && module.language !== 'Deutsch'" class="tag tag-language">
          {{ module.language }}
        </span>

        <template v-if="module.categories.length">
          <span
            v-for="category in visibleCategories"
            :key="category.id"
            class="tag tag-category"
          >
            {{ category.name }}
          </span>

          <span v-if="hiddenCategoryCount" class="tag tag-category-more">
            +{{ hiddenCategoryCount }}
          </span>
        </template>

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
      <span class="status-badge" :class="`status-${module.module_status}`">
        {{ statusLabel(module.module_status) }}
      </span>
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
  box-shadow: 0 2px 12px var(--color-primary-glow);
}

.module-card-offen {
  border-left: 3px solid var(--color-border);
}

.module-card-belegt {
  border-left: 3px solid var(--color-primary);
}

.module-card-abgeschlossen {
  border-left: 3px solid var(--color-primary);
}

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

.tag-mandatory {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  border-color: var(--color-primary-glow);
}

.tag-optional {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.tag-specialization {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  border-color: var(--color-primary-glow);
}

.tag-language {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  border-color: var(--color-primary-glow);
}

.tag-category {
  border-style: solid;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  border-color: var(--color-border);
}

.tag-category-more {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.tag-course-vorlesung, .tag-course-lecture {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  border-color: var(--color-primary-glow);
}

.tag-course-praktikum {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.tag-course-seminar {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.tag-course-übung, .tag-course-exercise, .tag-course-uebung {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-offen {
  background: var(--color-surface-raised);
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.status-belegt {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary-glow);
  color: var(--color-primary);
}

.status-abgeschlossen {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary-glow);
  color: var(--color-primary);
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
