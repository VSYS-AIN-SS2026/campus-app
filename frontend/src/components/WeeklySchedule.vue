<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import WeekDesktopGrid from './weekly/WeekDesktopGrid.vue'
import WeekMobileList from './weekly/WeekMobileList.vue'
import { useWeeklySchedule, type ScheduleDay, type WeekEvent } from '../composables/useWeeklySchedule'

type WeekDesktopGridExpose = {
  scrollToDay: (index: number) => void
  isDayVisible: (index: number) => boolean
  scrollByDays: (days: number, behavior?: ScrollBehavior) => void
}

const props = withDefaults(defineProps<{
  events: WeekEvent[]
  loading?: boolean
  error?: string | null
  weekStart: Date
  startHour?: number
  endHour?: number
}>(), {
  loading: false,
  error: null,
  startHour: 0,
  endHour: 24,
})

const nowTimestamp = ref(Date.now())
let nowTimer: number | null = null
const desktopGridRef = ref<WeekDesktopGridExpose | null>(null)
const isTodayVisibleInViewport = ref(true)
const pivotDate = ref(new Date())
const selectedYear = ref(new Date().getFullYear())

const extensionStepDays = 28
const beforeDays = ref(14)
const afterDays = ref(28)
const dayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

const displayedWeekStart = computed(() => {
  const start = new Date(pivotDate.value)
  start.setDate(start.getDate() - beforeDays.value)
  return start
})

const canJumpToToday = computed(() => !isTodayVisibleInViewport.value)

function previousWeek() {
  desktopGridRef.value?.scrollByDays(-7, 'smooth')
}

function nextWeek() {
  desktopGridRef.value?.scrollByDays(7, 'smooth')
}

function jumpToToday() {
  void nextTick(() => {
    if (currentDayIndex.value >= 0) {
      desktopGridRef.value?.scrollToDay(currentDayIndex.value)
    }
  })
}

function extendRight() {
  afterDays.value += extensionStepDays
}

function extendLeft() {
  beforeDays.value += extensionStepDays
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
  return Array.from({ length: beforeDays.value + afterDays.value }, (_, index) => {
    const date = new Date(displayedWeekStart.value)
    date.setDate(displayedWeekStart.value.getDate() + index)

    return {
      index,
      date,
      weekdayLabel: dayFormatter.format(date),
      dateLabel: dateFormatter.format(date),
      isToday: date.toDateString() === new Date(nowTimestamp.value).toDateString(),
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
  const today = new Date(nowTimestamp.value)
  return continuousDays.value.findIndex((day) => day.date.toDateString() === today.toDateString())
})

const currentYearLabel = computed(() => String(selectedYear.value))

function onSelectedYearChange(year: number) {
  selectedYear.value = year
}

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
          <button type="button" class="week-nav-btn" @click="previousWeek">←</button>
          <button
            type="button"
            class="week-nav-btn week-nav-btn-today"
            :disabled="!canJumpToToday"
            @click="jumpToToday"
          >
            Heute
          </button>
          <button type="button" class="week-nav-btn" @click="nextWeek">→</button>
        </div>
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
        @reach-start-edge="extendLeft"
        @reach-end-edge="extendRight"
      />

      <WeekMobileList
        :days="continuousDays"
        :events-by-day="continuousEventsByDay"
        :current-day-index="currentDayIndex"
        @reach-start-edge="extendLeft"
        @reach-end-edge="extendRight"
        @selected-year-change="onSelectedYearChange"
      />
    </template>
  </section>
</template>

<style scoped>
.week-view {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.875rem;
  padding: clamp(0.875rem, 2vw, 1rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.week-header {
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
  border: 0.0625rem solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text);
  border-radius: 0.5rem;
  min-height: 2rem;
  min-width: 2rem;
  padding: 0.375rem 0.625rem;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.week-nav-btn:hover:enabled {
  border-color: var(--color-primary);
}

.week-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.week-nav-btn-today {
  min-width: 4.25rem;
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
    display: none;
  }
}
</style>
