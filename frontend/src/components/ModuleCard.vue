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
  border-left: 3px solid var(--color-warning);
}

.module-card-abgeschlossen {
  border-left: 3px solid var(--color-success);
}

.card-left { flex-shrink: 0; padding-top: 0.125em; }

.module-code {
  font-size: 72%;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-primary);
  background: var(--color-surface-raised);
  padding: 0.25em 0.375em;
  border-radius: 0.3em;
  display: inline-block;
  white-space: nowrap;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.44em;
}

.module-name {
  margin: 0;
  font-size: 95%;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
}

.tag {
  font-size: 68%;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.15em 0.5em;
  border-radius: 99em;
  white-space: nowrap;
  border: 1px solid transparent;
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
}

.tag-mandatory {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

.tag-optional {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-color: var(--color-warning-border);
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

.tag-course-übung, .tag-course-exercise, .tag-course-uebung {
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3em;
  flex-shrink: 0;
}

.status-badge {
  font-size: 70%;
  font-weight: 700;
  padding: 0.2em 0.5em;
  border-radius: var(--radius-control);
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-offen {
  background: var(--color-surface-raised);
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
  padding: 0.12em 0.5em;
  border-radius: var(--radius-control);
  white-space: nowrap;
}

.coordinator {
  font-size: 72%;
  color: var(--color-text-muted);
  white-space: nowrap;
  max-width: 7.5em;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
