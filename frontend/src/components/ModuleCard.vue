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

function courseTypeClassKey(courseType: string): string {
  return courseType
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')
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
      <div v-if="module.categories.length" class="category-row">
        <div class="category-list">
          <span
            v-for="category in module.categories"
            :key="category.id"
            class="tag tag-category"
            :style="category.color ? { borderColor: category.color, color: category.color } : undefined"
          >
            {{ category.name }}
          </span>
        </div>
      </div>

      <p class="module-name">{{ module.name }}</p>
      <p class="module-coordinator">{{ module.coordinator }}</p>

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

        <template v-if="module.courses.length">
          <span
            v-for="c in module.courses"
            :key="c.id"
            class="tag"
            :class="`tag-course-${courseTypeClassKey(c.course_type)}`"
          >
            {{ c.course_type }}
          </span>
        </template>
      </div>
    </div>

    <div class="card-right">
      <div class="metric-badges">
        <span class="status-badge" :class="`status-${module.module_status}`">
          {{ statusLabel(module.module_status) }}
        </span>
        <span class="ects-badge">{{ totalEcts }} ECTS</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-card {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.875em;
  padding: 0.875em 1.125em;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.625em;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.module-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow);
}

.module-card-offen {
  border-left: 3px solid var(--color-text-muted);
}

.module-card-belegt {
  border-left: 3px solid var(--color-primary-light);
}

.module-card-abgeschlossen {
  border-left: 3px solid var(--color-primary);
}

.card-left {
  width: 7.5rem;
  flex-shrink: 0;
  padding-top: 0.125em;
}

.module-code {
  font-size: 72%;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-primary);
  background: var(--color-surface-raised);
  padding: 0.25em 0.375em;
  border-radius: 0.3em;
  display: block;
  width: 100%;
  text-align: center;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.38em;
}

.module-name {
  margin: 0;
  font-size: 95%;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  min-height: 2.6em;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.module-coordinator {
  margin: 0;
  font-size: 0.76rem;
  color: var(--color-text-muted);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.category-row {
  min-width: 0;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 0.3em;
}

.tag {
  font-size: 68%;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.15em 0.5em;
  border-radius: var(--radius-control);
  white-space: nowrap;
  border: 1px solid transparent;
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  line-height: 1.3;
}

.tag-mandatory {
  background: var(--color-surface-raised);
  color: var(--color-primary-dark);
  border-color: var(--color-primary-light);
}

.tag-optional {
  background: var(--color-surface-raised);
  color: var(--color-primary-light);
  border-color: var(--color-primary-light);
}

.tag-specialization {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.tag-language {
  background: var(--color-surface-raised);
  color: var(--color-primary-light);
  border-color: var(--color-border);
}

.tag-category {
  background: var(--color-surface);
  border-color: var(--color-primary-light);
  color: var(--color-primary-light);
}

.tag-course-vorlesung, .tag-course-lecture {
  color: var(--color-primary);
  background: var(--color-surface-raised);
  border-color: var(--color-border);
}

.tag-course-praktikum {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

.tag-course-seminar {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: var(--color-warning-border);
}

.tag-course-exercise, .tag-course-uebung {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4em;
  flex-shrink: 0;
  min-width: 8.6em;
}

.metric-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.28em;
  width: 100%;
}

.status-badge {
  font-size: 70%;
  font-weight: 700;
  padding: 0.2em 0.55em;
  border-radius: var(--radius-control);
  border: 1px solid;
  white-space: nowrap;
  min-width: 7.6em;
  text-align: center;
}

.status-offen {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.status-belegt {
  background: var(--color-surface);
  border-color: var(--color-primary-light);
  color: var(--color-primary-light);
}

.status-abgeschlossen {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.ects-badge {
  font-size: 78%;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-primary-light);
  padding: 0.14em 0.55em;
  border-radius: var(--radius-control);
  white-space: nowrap;
  min-width: 7.6em;
  text-align: center;
}

@media (max-width: 760px) {
  .module-card {
    grid-template-columns: 6.2rem minmax(0, 1fr);
    row-gap: 0.6em;
  }

  .card-left {
    width: 6.2rem;
  }

  .category-row {
    flex-direction: column;
    gap: 0.25em;
  }

  .card-right {
    grid-column: 1 / -1;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    min-width: 0;
  }

  .metric-badges {
    flex-direction: row;
    align-items: center;
    width: auto;
    gap: 0.35em;
  }

  .status-badge,
  .ects-badge {
    min-width: 0;
  }
}
</style>
