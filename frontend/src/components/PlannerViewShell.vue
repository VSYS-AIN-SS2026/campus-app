<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ModuleEntry, ModuleStatus } from '../types'
import type { NewPersonalAppointmentInput } from '../types/personalAppointments'
import ModuleList from './ModuleList.vue'
import ModuleStatusList from './ModuleStatusList.vue'
import ModuleProgressOverview from './ModuleProgressOverview.vue'
import ModuleFilterBar, { type ModuleFilterState } from './ModuleFilterBar.vue'
import SgSuggestions from './SgSuggestions.vue'
import WeeklySchedule from './WeeklySchedule.vue'

const props = defineProps<{
  selectedStudyProgramId: string | null
  selectedSpoId: string | null
  activePlannerView: 'week' | 'modules' | 'sg'
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
  'update:activePlannerView': [value: 'week' | 'modules' | 'sg']
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

const moduleGrouping = ref<'semester' | 'status'>('semester')

const moduleFilter = ref<ModuleFilterState>({ search: '', kind: null, tags: [] })

function isSgModule(m: ModuleEntry): boolean {
  return m.categories.some((c) => c.name.trim().toLowerCase() === 'studium generale')
}

const filteredModules = computed(() => {
  const f = moduleFilter.value
  const q = f.search.toLowerCase()
  return props.modules.filter((m) => {
    const sg = isSgModule(m)
    // Pflicht / Wahlpflicht / SG are mutually exclusive. Default (no kind):
    // SPO modules + only *chosen* SG (unchosen SG stays in its own view).
    if (f.kind === 'sg') {
      if (!sg) return false
    } else if (f.kind === 'pflicht') {
      if (sg || !m.is_mandatory) return false
    } else if (f.kind === 'wahlpflicht') {
      if (sg || m.is_mandatory) return false
    } else if (sg && m.module_status === 'offen') {
      return false
    }
    if (q && !(m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))) return false
    if (f.tags.length) {
      const names = new Set(m.categories.map((c) => c.name))
      if (!f.tags.some((t) => names.has(t))) return false
    }
    return true
  })
})

// Quick-nav from the progress overview: switch to the status grouping and
// scroll the chosen status group into view.
function onJump(status: ModuleStatus) {
  moduleGrouping.value = 'status'
  nextTick(() => {
    document.getElementById(`module-group-${status}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
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
      <button
        type="button"
        class="planner-view-button"
        :class="activePlannerView === 'sg' ? 'planner-view-button-active' : ''"
        @click="emit('update:activePlannerView', 'sg')"
      >
        Studium Generale
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

    <div v-else-if="loading" class="loading-state">
      <div class="spinner" />
      <p>Module werden geladen…</p>
    </div>

    <SgSuggestions
      v-else-if="activePlannerView === 'sg'"
      :modules="modules"
      @select="emit('select-module', $event)"
    />

    <template v-else>
      <ModuleProgressOverview v-if="modules.length" :modules="modules" @jump="onJump" />

      <ModuleFilterBar
        v-if="modules.length"
        :modules="modules"
        :filtered-count="filteredModules.length"
        @change="moduleFilter = $event"
      />

      <div class="planner-view-switch module-grouping-switch" role="tablist" aria-label="Modulgruppierung">
        <button
          type="button"
          class="planner-view-button"
          :class="moduleGrouping === 'semester' ? 'planner-view-button-active' : ''"
          @click="moduleGrouping = 'semester'"
        >
          Nach Semester
        </button>
        <button
          type="button"
          class="planner-view-button"
          :class="moduleGrouping === 'status' ? 'planner-view-button-active' : ''"
          @click="moduleGrouping = 'status'"
        >
          Nach Status
        </button>
      </div>

      <p v-if="!filteredModules.length" class="modules-empty">
        {{ modules.length ? 'Keine Module entsprechen den Filtern.' : 'Keine Module vorhanden.' }}
      </p>
      <ModuleList
        v-else-if="moduleGrouping === 'semester'"
        :modules="filteredModules"
        @select="emit('select-module', $event)"
      />
      <ModuleStatusList
        v-else
        :modules="filteredModules"
        @select="emit('select-module', $event)"
      />
    </template>
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

<style scoped>
.module-grouping-switch {
  display: flex;
  width: fit-content;
  margin: 0.55em 0 0.9em;
}

.modules-empty {
  margin: 0;
  padding: 1.5em 0.5em;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>
