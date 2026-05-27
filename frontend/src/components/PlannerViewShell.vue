<script setup lang="ts">
import type { ModuleEntry } from '../types'
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
  hiddenSeriesItems: Array<{ seriesId: string; title: string }>
  showHiddenEvents: boolean
  modules: ModuleEntry[]
  visibleWeeklyScheduleEvents: {
    id: string
    seriesId: string
    occurrenceId?: string
    dayIndex: number
    title: string
    subtitle?: string
    startTime: string
    endTime: string
    status: 'offen' | 'belegt' | 'abgeschlossen'
  }[]
  weekStartDate: Date
}>()

const emit = defineEmits<{
  'update:activePlannerView': [value: 'week' | 'modules']
  'hide-series': [payload: { seriesId: string; title: string }]
  'show-series': [seriesId: string]
  'show-all-series': []
  'toggle-show-hidden': []
  'navigate-to-hidden-page': []
  'undo-hide-series': []
  'select-module': [module: ModuleEntry]
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
      v-if="lastHiddenSeries"
      type="button"
      class="inline-action-button"
      @click="emit('undo-hide-series')"
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
      :show-hidden-events="showHiddenEvents"
      :loading="loading"
      :error="error"
      :week-start="weekStartDate"
      @hide-series="emit('hide-series', $event)"
      @show-series="emit('show-series', $event)"
      @show-all-series="emit('show-all-series')"
      @toggle-show-hidden="emit('toggle-show-hidden')"
      @navigate-to-hidden-page="emit('navigate-to-hidden-page')"
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
