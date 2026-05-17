<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import HiddenSeriesPopover from './weekly/HiddenSeriesPopover.vue'
import WeekDesktopGrid from './weekly/WeekDesktopGrid.vue'
import WeekMobileList from './weekly/WeekMobileList.vue'
import { useWeeklySchedule } from '../composables/useWeeklySchedule'
import type { ScheduleDay, WeekEvent } from '../types/schedule'

type WeekDesktopGridExpose = {
  scrollToDay: (index: number) => void
  isDayVisible: (index: number) => boolean
  scrollByDays: (days: number, behavior?: ScrollBehavior) => void
}

type WeekMobileListExpose = {
  jumpToToday: () => void
}

const props = withDefaults(defineProps<{
  events: WeekEvent[]
  loading?: boolean
  error?: string | null
  hiddenSeriesItems?: Array<{ seriesId: string; title: string }>
  weekStart: Date
  startHour?: number
  endHour?: number
}>(), {
  loading: false,
  error: null,
  hiddenSeriesItems: () => [],
  startHour: 0,
  endHour: 24,
})

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const localDateKeyFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: localTimeZone })

function toLocalDateKey(value: Date): string {
  return localDateKeyFormatter.format(value)
}

const emit = defineEmits<{
  'hide-series': [payload: { seriesId: string; title: string }]
  'show-series': [seriesId: string]
  'show-all-series': []
}>()

function getTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const nowTimestamp = ref(Date.now())
let nowTimer: number | null = null
const desktopGridRef = ref<WeekDesktopGridExpose | null>(null)
const mobileListRef = ref<WeekMobileListExpose | null>(null)
const isTodayVisibleInViewport = ref(true)
const pivotDate = ref(getTodayStart())
const selectedYear = ref(getTodayStart().getFullYear())

const beforeDays = ref(0)
const afterDays = ref(7)
const dayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

const displayedWeekStart = computed(() => {
  const start = new Date(pivotDate.value)
  start.setDate(start.getDate() - beforeDays.value)
  return start
})

const canJumpToToday = computed(() => currentDayIndex.value < 0 || !isTodayVisibleInViewport.value)

function shiftVisibleWindow(days: number) {
  const shiftedStart = new Date(pivotDate.value)
  shiftedStart.setDate(shiftedStart.getDate() + days)
  pivotDate.value = shiftedStart
  selectedYear.value = shiftedStart.getFullYear()
  beforeDays.value = 0
  afterDays.value = 7

  void nextTick(() => {
    desktopGridRef.value?.scrollToDay(0)
  })
}

function previousWeek() {
  shiftVisibleWindow(-7)
}

function nextWeek() {
  shiftVisibleWindow(7)
}

function jumpToToday() {
  const today = getTodayStart()
  nowTimestamp.value = today.getTime()
  pivotDate.value = new Date(today)
  selectedYear.value = today.getFullYear()
  beforeDays.value = 0
  afterDays.value = 7

  void nextTick(() => {
    if (currentDayIndex.value >= 0) {
      desktopGridRef.value?.scrollToDay(currentDayIndex.value)
    }

    mobileListRef.value?.jumpToToday()
  })
}

const schedule = useWeeklySchedule(
  computed(() => props.events),
  displayedWeekStart,
  computed(() => props.startHour),
  computed(() => props.endHour)
)

const {
  eventsByDay,
  hourSlots,
  totalMinutes,
  hasEvents,
  formatTimeLabel,
  eventStyle,
} = schedule

const continuousDays = computed<ScheduleDay[]>(() => {
  const todayKey = toLocalDateKey(new Date(nowTimestamp.value))

  return Array.from({ length: beforeDays.value + afterDays.value }, (_, index) => {
    const date = new Date(displayedWeekStart.value)
    date.setDate(displayedWeekStart.value.getDate() + index)

    return {
      index,
      date,
      weekdayLabel: dayFormatter.format(date),
      dateLabel: dateFormatter.format(date),
      isToday: toLocalDateKey(date) === todayKey,
    }
  })
})

const continuousEventsByDay = computed(() => {
  return continuousDays.value.map((day) => {
    const weekdayIndex = (day.date.getDay() + 6) % 7
    return eventsByDay.value[weekdayIndex] ?? []
  })
})

const currentDayIndex = computed(() => {
  const todayKey = toLocalDateKey(new Date(nowTimestamp.value))
  return continuousDays.value.findIndex((day) => toLocalDateKey(day.date) === todayKey)
})

const currentYearLabel = computed(() => String(selectedYear.value))

function onSelectedYearChange(year: number) {
  selectedYear.value = year
}

watch(
  () => props.weekStart.getTime(),
  (nextWeekStartTs) => {
    const nextWeekStart = new Date(nextWeekStartTs)
    pivotDate.value = new Date(nextWeekStart)
    selectedYear.value = nextWeekStart.getFullYear()
  }
)

const nowLineTopPercent = computed<number | null>(() => {
  if (currentDayIndex.value < 0) {
    return null
  }

  const now = new Date(nowTimestamp.value)
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const startMinutes = props.startHour * 60
  const endMinutes = props.endHour * 60

  if (minutes < startMinutes || minutes > endMinutes) {
    return null
  }

  return ((minutes - startMinutes) / totalMinutes.value) * 100
})

onMounted(() => {
  const today = getTodayStart()
  nowTimestamp.value = today.getTime()
  pivotDate.value = new Date(today)
  selectedYear.value = today.getFullYear()
  beforeDays.value = 0
  afterDays.value = 7

  nowTimer = window.setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)

  void nextTick(() => {
    if (currentDayIndex.value >= 0) {
      desktopGridRef.value?.scrollToDay(currentDayIndex.value)
    }
  })
})

onUnmounted(() => {
  if (nowTimer != null) {
    window.clearInterval(nowTimer)
  }
})
</script>

<template>
  <section class="week-view">
    <header class="week-header">
      <div>
        <h2 class="week-title">Kalender</h2>
        <span class="week-year">{{ currentYearLabel }}</span>
      </div>
      <div class="week-header-meta">
        <div class="week-nav" role="group" aria-label="Wochennavigation">
          <button type="button" class="week-nav-btn app-button" @click="previousWeek">←</button>
          <button
            type="button"
            class="week-nav-btn week-nav-btn-today app-button"
            :disabled="!canJumpToToday"
            @click="jumpToToday"
          >
            Heute
          </button>
          <button type="button" class="week-nav-btn app-button" @click="nextWeek">→</button>
        </div>
        <HiddenSeriesPopover
          v-if="props.hiddenSeriesItems.length"
          :items="props.hiddenSeriesItems"
          @show-series="emit('show-series', $event)"
          @show-all-series="emit('show-all-series')"
        />
      </div>
    </header>

    <div v-if="loading" class="week-state">
      <div class="spinner" />
      <p>Wochenansicht wird geladen…</p>
    </div>

    <div v-else-if="error" class="week-state week-state-error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!hasEvents" class="week-state">
      <p>Keine Termine in dieser Woche. Alle Zeitslots sind frei.</p>
    </div>

    <template v-else>

      <WeekDesktopGrid
        ref="desktopGridRef"
        :days="continuousDays"
        :events-by-day="continuousEventsByDay"
        :hour-slots="hourSlots"
        :start-hour="props.startHour"
        :total-minutes="totalMinutes"
        :format-time-label="formatTimeLabel"
        :event-style="eventStyle"
        :current-day-index="currentDayIndex"
        :now-line-top-percent="nowLineTopPercent"
        @today-visibility-change="isTodayVisibleInViewport = $event"
        @hide-series="emit('hide-series', $event)"
      />

      <WeekMobileList
        ref="mobileListRef"
        :days="continuousDays"
        :events-by-day="continuousEventsByDay"
        :hour-slots="hourSlots"
        :format-time-label="formatTimeLabel"
        :current-day-index="currentDayIndex"
        @selected-year-change="onSelectedYearChange"
        @hide-series="emit('hide-series', $event)"
      />
    </template>
  </section>
</template>

<style scoped>
.week-view {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: 0;
  padding: clamp(0.875rem, 2vw, 1rem);
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 1rem;
}

.week-header {
  position: sticky;
  top: 56px;
  z-index: 8;
  background: var(--color-surface);
  padding: 0.5rem 0 0.625rem;
  border-bottom: 0.0625rem solid var(--color-border);
  box-shadow: 0 0.375rem 0.5rem -0.5rem color-mix(in srgb, var(--color-border) 80%, transparent);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.week-header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.week-title {
  margin: 0;
  font-size: 1rem;
}

.week-year {
  display: inline-block;
  margin-top: 0.125rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.week-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.week-nav-btn {
  min-width: var(--button-min-width);
}

.week-nav-btn-today {
  min-width: var(--button-today-min-width);
}

.week-state {
  min-height: clamp(7rem, 20vh, 8.75rem);
  border: 0.0625rem dashed var(--color-border);
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.625rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: clamp(0.875rem, 2.4vw, 1.25rem);
}

.week-state-error {
  border-style: solid;
  border-color: var(--color-error-border);
  background: var(--color-error-bg);
  color: var(--color-error);
}

.spinner {
  width: 1.875rem;
  height: 1.875rem;
  border: 0.1875rem solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 45em) {
  .week-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .week-header-meta {
    width: 100%;
    align-items: stretch;
  }

  .week-nav {
    display: inline-flex;
    flex-wrap: wrap;
  }
}
</style>
