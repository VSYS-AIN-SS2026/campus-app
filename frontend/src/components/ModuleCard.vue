<script setup lang="ts">
import { computed } from 'vue'
import type { ModuleEntry, ModuleStatus } from '../types'
import { moduleEcts } from '../utils/progress'

const props = defineProps<{
  module: ModuleEntry
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

const totalEcts = computed(() => moduleEcts(props.module))

const isSg = computed(() =>
  props.module.categories.some((c) => c.name.trim().toLowerCase() === 'studium generale'),
)

// When the prominent SG chip is shown, drop the plain "Studium Generale" tag.
const displayCategories = computed(() =>
  isSg.value
    ? props.module.categories.filter((c) => c.name.trim().toLowerCase() !== 'studium generale')
    : props.module.categories,
)

const visibleCategories = computed(() => displayCategories.value.slice(0, 3))
const hiddenCategoryCount = computed(() => Math.max(displayCategories.value.length - visibleCategories.value.length, 0))

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
    :class="[`module-card-${module.module_status}`, { 'module-card-sg': isSg }]"
    role="button"
    tabindex="0"
    @click="emit('select', module)"
    @keydown.enter="emit('select', module)"
  >
    <div class="card-left">
      <span class="module-code">{{ module.code }}</span>
    </div>

    <div class="card-body">
      <span v-if="isSg" class="sg-chip">★ Studium Generale</span>

      <div v-if="displayCategories.length" class="category-row">
        <div class="category-list">
          <span
            v-for="category in displayCategories"
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

        <template v-if="displayCategories.length">
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
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.625em;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.module-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0.125rem 0.75rem var(--color-primary-glow);
}

.module-card-offen {
  border-left: 0.1875rem solid var(--color-border);
}

.module-card-belegt {
  border-left: 0.1875rem solid var(--color-primary);
}

.module-card-abgeschlossen {
  border-left: 0.1875rem solid var(--color-primary);
}

.module-card-sg {
  outline: 0.0625rem solid rgba(0, 128, 128, 0.55);
  outline-offset: -0.0625rem;
}

.sg-chip {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-size: 70%;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.2em 0.55em;
  border-radius: var(--radius-control);
  color: #008080;
  background: rgba(0, 128, 128, 0.12);
  border: 0.0625rem solid #008080;
  white-space: nowrap;
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
  border: 0.0625rem solid transparent;
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  line-height: 1.3;
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
  border: 0.0625rem solid;
  white-space: nowrap;
  min-width: 7.6em;
  text-align: center;
}

.status-offen {
  background: var(--color-surface-raised);
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.status-belegt {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.28);
  color: #f6b94b;
}

.status-abgeschlossen {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.28);
  color: #6ee7b7;
}

.ects-badge {
  font-size: 78%;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-primary-light);
  padding: 0.14em 0.55em;
  border-radius: var(--radius-control);
  white-space: nowrap;
  min-width: 7.6em;
  text-align: center;
}

@media (max-width: 47.5em) {
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
