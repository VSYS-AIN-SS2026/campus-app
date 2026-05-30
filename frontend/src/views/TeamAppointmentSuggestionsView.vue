<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import CombinedWeekView from '../components/teamWeek/CombinedWeekView.vue'
import TeamAppointmentSearchForm from '../components/teamWeek/TeamAppointmentSearchForm.vue'
import CreateAppointmentDialog from '../components/teamWeek/CreateAppointmentDialog.vue'
import type {
  CombinedAppointment,
  CombinedSearchSlot,
  CombinedWeekMember,
  FreeSlotSearchParams,
  MemberScheduleSlot,
  NewAppointmentInput,
} from '../types/teamWeek'

const route = useRoute()
const teamId = route.params.id as string

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

// =====================================================================
// DEMO-DATEN – ersetzt eine spätere Story durch echte Daten:
//   * Mitglieder-Stundenpläne (neuer Backend-Endpunkt nötig)
//   * Termine via get_team_appointments
//   * Suchergebnisse aus dem Such-Tool
// =====================================================================
const sampleMembers: CombinedWeekMember[] = [
  { id: 'm-anna', name: 'Anna Demo' },
  { id: 'm-ben', name: 'Ben Demo' },
  { id: 'm-carla', name: 'Carla Demo' },
]

const sampleSlots: MemberScheduleSlot[] = [
  // Montag: identischer Slot aller drei (wird zusammengefasst)
  { memberId: 'm-anna', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  { memberId: 'm-ben', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  { memberId: 'm-carla', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  // Montag: zwei Mitglieder
  { memberId: 'm-anna', dayIndex: 0, startTime: '10:00', endTime: '12:00', title: 'Übung' },
  { memberId: 'm-ben', dayIndex: 0, startTime: '10:00', endTime: '12:00', title: 'Übung' },
  // Montag: ein Mitglied
  { memberId: 'm-carla', dayIndex: 0, startTime: '13:00', endTime: '15:00', title: 'Labor' },
  // Dienstag: Teilüberlappung -> segmentierte Blöcke
  { memberId: 'm-anna', dayIndex: 1, startTime: '09:00', endTime: '11:00', title: 'Seminar' },
  { memberId: 'm-ben', dayIndex: 1, startTime: '10:00', endTime: '12:00', title: 'Seminar' },
  // Mittwoch: ausgeblendet zählt weiterhin als belegt
  { memberId: 'm-anna', dayIndex: 2, startTime: '08:00', endTime: '09:30', title: 'Tutorium', state: 'hidden' },
  { memberId: 'm-ben', dayIndex: 2, startTime: '08:00', endTime: '09:30', title: 'Tutorium' },
  // Mittwoch: abgewählt -> komplett herausgefiltert (erzeugt keinen Block)
  { memberId: 'm-carla', dayIndex: 2, startTime: '14:00', endTime: '16:00', title: 'Optional', state: 'deselected' },
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

// Termin-Datum relativ zur aktuellen Woche, Uhrzeit bewusst in UTC (Z),
// damit die UTC -> Browser-Zeit-Umrechnung sichtbar wird.
function isoOnThisWeek(dayOffset: number, utcTime: string): string {
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + dayOffset)
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}T${utcTime}Z`
}

const sampleAppointments: CombinedAppointment[] = [
  { id: 'appt-1', title: 'Sprint Planning', startsAt: isoOnThisWeek(0, '07:30:00'), endsAt: isoOnThisWeek(0, '09:00:00') },
  { id: 'appt-2', title: 'Retrospektive', startsAt: isoOnThisWeek(2, '12:00:00'), endsAt: isoOnThisWeek(2, '13:00:00') },
]

// ===================== Suche (echter Endpoint) =====================
function mondayOf(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

const weekStart = ref<Date>(mondayOf(new Date()))
const loading = ref(false)
const error = ref<string | null>(null)
const searchPerformed = ref(false)
const searchResults = ref<CombinedSearchSlot[]>([])

interface FreeSlotRow {
  starts_at: string
  ends_at: string
  duration_minutes: number
}

function toSearchSlot(row: FreeSlotRow): CombinedSearchSlot {
  const start = new Date(row.starts_at)
  const end = new Date(row.ends_at)
  return {
    id: `${row.starts_at}-${row.ends_at}`,
    dayIndex: (start.getDay() + 6) % 7,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    label: 'frei',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }
}

// Wochenwechsel verwirft alte Ergebnisse (sie gälten für eine andere Woche).
watch(weekStart, () => {
  searchResults.value = []
  searchPerformed.value = false
  error.value = null
})

async function onSearch(params: FreeSlotSearchParams) {
  if (!supabase) {
    error.value = 'Supabase nicht konfiguriert.'
    return
  }

  const monday = mondayOf(weekStart.value)
  loading.value = true
  error.value = null

  const { data, error: rpcError } = await supabase.rpc('get_team_free_slots', {
    p_team_id: teamId,
    p_week_start: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
    p_duration_minutes: params.durationMinutes,
    p_min_start: params.minStart,
    p_max_end: params.maxEnd,
    p_excluded_weekdays: params.excludedWeekdays,
    p_time_zone: localTimeZone,
  })

  loading.value = false

  if (rpcError) {
    error.value = rpcError.message
    searchResults.value = []
    searchPerformed.value = false
    return
  }

  searchPerformed.value = true
  searchResults.value = ((data ?? []) as FreeSlotRow[]).map(toSearchSlot)
}

// ===================== Termin-Erstell-Dialog =====================
const dialogOpen = ref(false)
const dialogStart = ref<Date | null>(null)
const dialogEnd = ref<Date | null>(null)
const createLoading = ref(false)
const createError = ref<string | null>(null)

function onSelectSlot(id: string) {
  const slot = searchResults.value.find((entry) => entry.id === id)
  if (!slot?.startsAt || !slot.endsAt) {
    return
  }
  dialogStart.value = new Date(slot.startsAt)
  dialogEnd.value = new Date(slot.endsAt)
  createError.value = null
  dialogOpen.value = true
}

async function onCreate(payload: NewAppointmentInput) {
  if (!supabase) {
    createError.value = 'Supabase nicht konfiguriert.'
    return
  }

  createLoading.value = true
  createError.value = null

  const { error: rpcError } = await supabase.rpc('create_team_appointment', {
    p_team_id: teamId,
    p_title: payload.title,
    p_description: payload.description,
    p_starts_at: payload.startsAt,
    p_ends_at: payload.endsAt,
  })

  createLoading.value = false

  if (rpcError) {
    createError.value = rpcError.message
    return
  }

  dialogOpen.value = false
}
</script>

<template>
  <section class="suggestions" :data-team-id="teamId">
    <header class="suggestions__intro">
      <h2 class="suggestions__heading">Terminvorschläge</h2>
      <p class="suggestions__subtitle">
        Finde gemeinsame freie Termine basierend auf den Wochenplänen der Team-Mitglieder.
      </p>
    </header>

    <div class="suggestions__layout">
      <aside class="suggestions__search" aria-label="Suchformular">
        <TeamAppointmentSearchForm
          v-model:week-start="weekStart"
          :loading="loading"
          @submit="onSearch"
        />
        <p v-if="loading" class="search-status">Suche läuft…</p>
        <p v-else-if="error" class="search-status search-status--error" role="alert">{{ error }}</p>
      </aside>

      <!-- Container für die kombinierte Wochenansicht -->
      <div class="suggestions__week" aria-label="Kombinierte Wochenansicht">
        <CombinedWeekView
          v-model:week-start="weekStart"
          :members="sampleMembers"
          :slots="sampleSlots"
          :appointments="sampleAppointments"
          :search-results="searchResults"
          :search-performed="searchPerformed"
          @select-search-slot="onSelectSlot"
        />
      </div>
    </div>

    <CreateAppointmentDialog
      :open="dialogOpen"
      :start="dialogStart"
      :end="dialogEnd"
      :loading="createLoading"
      :error="createError"
      @close="dialogOpen = false"
      @submit="onCreate"
    />
  </section>
</template>

<style scoped>
.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.suggestions__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.suggestions__heading {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.suggestions__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

/* Layout-Container: Such-Form links, Wochenansicht rechts.
   Stapelt auf schmalen Viewports. */
.suggestions__layout {
  display: grid;
  grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  gap: var(--space-2xl);
  align-items: start;
}

@media (max-width: 48rem) {
  .suggestions__layout {
    grid-template-columns: 1fr;
  }
}

.suggestions__search {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.suggestions__week {
  min-width: 0;
  min-height: 18rem;
  display: flex;
}

.search-status {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.search-status--error {
  color: var(--color-error, #dc2626);
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-error-border, var(--color-border));
  border-radius: var(--radius-lg);
  background: var(--color-error-bg, transparent);
}
</style>
