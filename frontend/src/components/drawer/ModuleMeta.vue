<script setup lang="ts">
import type { ModuleEntry } from '../../types'

defineProps<{
  module: ModuleEntry
  moduleTypeLabel: (module: ModuleEntry) => string
  formatExam: (code: ModuleEntry['details']['exam_graded'] | null | undefined) => string | null
}>()
</script>

<template>
  <div class="coordinator-row">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="icon-muted">
      <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.6"/>
      <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <span>{{ module.coordinator }}</span>
    <span class="text-muted">· ab {{ module.start_semester }}</span>
  </div>

  <section class="section">
    <div class="section-header">
      <h3 class="section-title">Kurzinfo</h3>
    </div>
    <dl class="kurzinfo-list">
      <div class="kurzinfo-row">
        <dt>Modultyp</dt>
        <dd>{{ moduleTypeLabel(module) }}</dd>
      </div>
      <div class="kurzinfo-row">
        <dt>Sprache</dt>
        <dd>{{ module.language || '—' }}</dd>
      </div>
      <div v-if="module.details?.start_phases?.length" class="kurzinfo-row">
        <dt>Start-Phase</dt>
        <dd>{{ module.details.start_phases.join(' / ') }}</dd>
      </div>
      <div v-if="module.details?.contact_hours != null || module.details?.self_study_hours != null" class="kurzinfo-row">
        <dt>Workload</dt>
        <dd>
          {{ module.details.contact_hours ?? '—' }} h Kontaktzeit + {{ module.details.self_study_hours ?? '—' }} h Selbststudium
          <span v-if="module.details.learning_formats_misc" class="text-muted"> · sonstiges: {{ module.details.learning_formats_misc }}</span>
        </dd>
      </div>
      <div class="kurzinfo-row">
        <dt>Prüfung</dt>
        <dd>
          {{ formatExam(module.details?.exam_graded) ?? formatExam(module.details?.exam_ungraded) ?? formatExam(module.details?.performance_record) ?? '—' }}
          <span v-if="module.details?.grade_composition_misc" class="text-muted"> · sonstiges: {{ module.details.grade_composition_misc }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>
