<script setup lang="ts">
import { computed } from 'vue'
import { useModuleDetailsFormatter } from '../../composables/useModuleDetailsFormatter'
import type { Course } from '../../types'

const props = defineProps<{
  course: Course
}>()

const {
  buildItems,
  formatKey,
  htmlToText,
  objectEntries,
  parseWorkload,
  splitReqs,
  typeFull,
} = useModuleDetailsFormatter()

const courseItems = computed(() => buildItems((props.course.details ?? {}) as unknown as Record<string, unknown>))
</script>

<template>
  <div class="hero">
    <span class="type-label" :class="course.course_type.toLowerCase()">{{ typeFull(course.course_type) }}</span>
    <h2 class="big-title">{{ course.name }}</h2>
    <div class="stat-row">
      <div class="stat-card">
        <span class="stat-number">{{ course.ects }}</span>
        <span class="stat-unit">ECTS</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-card">
        <span class="stat-number">{{ course.sws }}</span>
        <span class="stat-unit">SWS</span>
      </div>
    </div>
  </div>

  <div class="info-block">
    <div class="info-row">
      <span class="info-label">Kürzel</span>
      <span class="info-value mono">{{ course.code }}</span>
    </div>
    <div v-if="course.coordinator" class="info-row">
      <span class="info-label">Lehrperson</span>
      <span class="info-value">{{ course.coordinator }}</span>
    </div>
  </div>

  <section v-if="courseItems.length" class="section">
    <div class="section-header">
      <h3 class="section-title">Details</h3>
    </div>
    <div class="details-stack">
      <template v-for="item in courseItems" :key="item.key">
        <div v-if="item.kind === 'workload'" class="dcard dcard-workload">
          <div class="dcard-label">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            {{ item.label }}
          </div>
          <div class="workload-body">
            <span class="workload-hours">{{ parseWorkload(item.raw).hours }}</span>
            <span v-if="parseWorkload(item.raw).note" class="workload-note">{{ parseWorkload(item.raw).note }}</span>
          </div>
        </div>

        <div v-else-if="item.kind === 'pruefung'" class="dcard dcard-pruefung">
          <div class="dcard-label">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ item.label }}
          </div>
          <p class="dcard-text">{{ item.raw }}</p>
        </div>

        <div v-else-if="item.kind === 'voraussetzungen'" class="dcard dcard-vorauss">
          <div class="dcard-label">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M6 7.3l4-2.6M6 8.7l4 2.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            {{ item.label }}
          </div>
          <div v-if="splitReqs(item.raw).length > 1" class="req-chips">
            <span v-for="entry in splitReqs(item.raw)" :key="entry" class="req-chip">{{ entry }}</span>
          </div>
          <p v-else class="dcard-text">{{ item.raw }}</p>
        </div>

        <div v-else-if="item.kind === 'html'" class="dcard dcard-html">
          <div class="dcard-label">{{ item.label }}</div>
          <div class="html-content html-content-text">{{ htmlToText(item.raw) }}</div>
        </div>

        <div v-else-if="item.kind === 'object'" class="dcard dcard-object">
          <div class="dcard-label">{{ item.label }}</div>
          <dl class="obj-list">
            <div v-for="[ok, ov] in objectEntries(item.raw)" :key="ok" class="obj-row">
              <dt>{{ formatKey(ok) }}</dt>
              <dd>{{ ov }}</dd>
            </div>
          </dl>
        </div>

        <div v-else class="dtext-item">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.raw }}</dd>
        </div>
      </template>
    </div>
  </section>

  <div v-else-if="!course.coordinator" class="empty-hint">
    Keine weiteren Informationen verfügbar.
  </div>
</template>
