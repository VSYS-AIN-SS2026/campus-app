<script setup lang="ts">
import type { ModuleEntry } from '../types'
import type { NewPersonalAppointmentInput } from '../types/personalAppointments'
import ModuleList from './ModuleList.vue'
import WeeklySchedule from './WeeklySchedule.vue'

const props = defineProps<{
  selectedStudyProgramId: string | null
  selectedSpoId: string | null
  activePlannerView: 'week' | 'modules'
  canEditModuleStatuses: boolean
  loading: boolean
  error: string | null
  moduleStatusError: string | null
  categoryError: string | null
  scheduleVisibilityError: string | null
  scheduleVisibilityInfo: string | null
  lastHiddenSeries: { seriesId: string; title: string } | null
  lastHiddenOccurrence: string | null
  lastDeletedPersonalAppointment: { id: string; title: string } | null
  hiddenSeriesItems: Array<{ seriesId: string; title: string }>
  hiddenOccurrenceItems: Array<{ occurrenceId: string; title: string }>
  showHiddenEvents: boolean
  modules: ModuleEntry[]
  visibleWeeklyScheduleEvents: {
    id: string
    seriesId: string
    occurrenceId?: string
    dayIndex: number
    date?: string
    title: string
    subtitle?: string
    startTime: string
    endTime: string
    status: 'offen' | 'belegt' | 'abgeschlossen'
  }[]
  weekStartDate: Date
  savingPersonalAppointment?: boolean
  personalAppointmentError?: string | null
}>()

const emit = defineEmits<{
  'update:activePlannerView': [value: 'week' | 'modules']
  'hide-series': [payload: { seriesId: string; title: string }]
  'hide-occurrence': [occurrenceId: string]
  'show-series': [seriesId: string]
  'show-occurrence': [occurrenceId: string]
  'show-all-occurrences': []
  'show-all-series': []
  'toggle-show-hidden': []
  'navigate-to-hidden-page': []
  'undo-hide': []
  'select-module': [module: ModuleEntry]
  'create-personal-appointment': [payload: NewPersonalAppointmentInput]
  'clear-personal-appointment-error': []
  'delete-personal-appointment': [occurrenceId: string]
}>()
</script>

<template>
  <div v-if="error" class="error-banner">
    {{ error }}
  </div>

  <div v-if="moduleStatusError" class="info-banner">
    {{ moduleStatusError }}
  </div>

  <div v-if="scheduleVisibilityError" class="info-banner">
    {{ scheduleVisibilityError }}
  </div>

  <div v-if="scheduleVisibilityInfo" class="success-banner success-banner-inline">
    <span>{{ scheduleVisibilityInfo }}</span>
    <button
      v-if="lastHiddenSeries || lastHiddenOccurrence || lastDeletedPersonalAppointment"
      type="button"
      class="inline-action-button"
      @click="emit('undo-hide')"
    >
      Rückgängig
    </button>
  </div>

  <div v-if="categoryError" class="info-banner">
    {{ categoryError }}
  </div>

  <div v-if="selectedSpoId && !canEditModuleStatuses" class="info-banner">
    Speichere zuerst die aktuelle Studiengang- und SPO-Auswahl im Demo-Profil, damit Modulstatus und Kategorien persistent geändert werden können.
  </div>

  <template v-if="selectedSpoId">
    <div class="planner-view-switch" role="tablist" aria-label="Ansicht auswählen">
      <button
        type="button"
        class="planner-view-button"
        :class="activePlannerView === 'week' ? 'planner-view-button-active' : ''"
        @click="emit('update:activePlannerView', 'week')"
      >
        Wochenansicht
      </button>
      <button
        type="button"
        class="planner-view-button"
        :class="activePlannerView === 'modules' ? 'planner-view-button-active' : ''"
        @click="emit('update:activePlannerView', 'modules')"
      >
        Modulliste
      </button>
    </div>

    <WeeklySchedule
      v-if="activePlannerView === 'week'"
      :events="visibleWeeklyScheduleEvents"
      :hidden-series-items="hiddenSeriesItems"
      :hidden-occurrence-items="hiddenOccurrenceItems"
      :show-hidden-events="showHiddenEvents"
      :loading="loading"
      :error="error"
      :week-start="weekStartDate"
      :saving-personal-appointment="savingPersonalAppointment"
      :personal-appointment-error="personalAppointmentError"
      @hide-series="emit('hide-series', $event)"
      @hide-occurrence="emit('hide-occurrence', $event)"
      @show-series="emit('show-series', $event)"
      @show-occurrence="emit('show-occurrence', $event)"
      @show-all-occurrences="emit('show-all-occurrences')"
      @show-all-series="emit('show-all-series')"
      @toggle-show-hidden="emit('toggle-show-hidden')"
      @navigate-to-hidden-page="emit('navigate-to-hidden-page')"
      @create-personal-appointment="emit('create-personal-appointment', $event)"
      @clear-personal-appointment-error="emit('clear-personal-appointment-error')"
      @delete-personal-appointment="emit('delete-personal-appointment', $event)"
    />

    <ModuleList v-else-if="!loading" :modules="modules" @select="emit('select-module', $event)" />

    <div v-else class="loading-state">
      <div class="spinner" />
      <p>Module werden geladen…</p>
    </div>
  </template>

  <div v-else-if="!selectedStudyProgramId" class="empty-state">
    <div class="empty-icon"></div>
    <p>Wähle einen Studiengang aus, um fortzufahren.</p>
  </div>

  <div v-else-if="!selectedSpoId" class="empty-state">
    <div class="empty-icon"></div>
    <p>Wähle eine SPO aus, um die zugehörigen Module anzuzeigen.</p>
  </div>
</template>
