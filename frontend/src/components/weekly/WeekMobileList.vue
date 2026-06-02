<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { NormalizedWeekEvent, ScheduleDay } from '../../types/schedule'

const props = defineProps<{
  days: ScheduleDay[]
  eventsByDay: NormalizedWeekEvent[][]
  hourSlots: number[]
  formatTimeLabel: (minutes: number) => string
  currentDayIndex: number
  startHour: number
  totalMinutes: number
  eventStyle: (start: number, end: number) => { top: string; height: string }
}>()

const emit = defineEmits<{
  'reach-start-edge': []
  'reach-end-edge': []
  'selected-year-change': [year: number]
  'selected-day-label-change': [label: string]
  'hide-series': [payload: { seriesId: string; title: string }]
  'hide-occurrence': [occurrenceId: string]
}>()

const activeDayIndex = ref(0)
const dayTabsRef = ref<HTMLElement | null>(null)
const dayTabRefs = ref<Array<HTMLElement | null>>([])
const hasManualSelection = ref(false)
const selectedDayKey = ref<string | null>(null)
const touchStartX = ref<number | null>(null)
const pendingTargetDayKey = ref<string | null>(null)
const edgeRequestPending = ref(false)
const tabEdgeRequestPending = ref(false)
const tabEdgeEventLocked = ref(false)
const pendingLeftScrollRestore = ref<{ scrollLeft: number; scrollWidth: number } | null>(null)
const nowTimestamp = ref(Date.now())
let nowTimer: number | null = null
const fullDateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})
const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const localDayKeyFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: localTimeZone })

function dayKey(day: ScheduleDay | null | undefined) {
  return day ? localDayKeyFormatter.format(day.date) : null
}

function shiftDayKey(day: ScheduleDay, deltaDays: number) {
  const shiftedDate = new Date(day.date)
  shiftedDate.setDate(shiftedDate.getDate() + deltaDays)
  return localDayKeyFormatter.format(shiftedDate)
}

function setDayTabRef(element: Element | null, index: number) {
  if (!(element instanceof HTMLElement)) {
    return
  }

  dayTabRefs.value[index] = element
}

function normalizeIndex(index: number) {
  if (!props.days.length) {
    return 0
  }

  return Math.min(Math.max(index, 0), props.days.length - 1)
}

function scrollActiveTabIntoView() {
  const tabElement = dayTabRefs.value[activeDayIndex.value]

  if (!tabElement) {
    return
  }

  tabElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

function selectDay(index: number, userInitiated = true) {
  activeDayIndex.value = normalizeIndex(index)
  const activeDay = props.days[activeDayIndex.value]
  selectedDayKey.value = dayKey(activeDay)

  if (activeDay) {
    emit('selected-year-change', activeDay.date.getFullYear())
    emit('selected-day-label-change', fullDateFormatter.format(activeDay.date))
  }

  if (userInitiated) {
    hasManualSelection.value = true
    void nextTick(scrollActiveTabIntoView)
  }
}

function goPreviousDay() {
  if (!props.days.length) {
    return
  }

  if (activeDayIndex.value === 0) {
    if (edgeRequestPending.value || !selectedDay.value) {
      return
    }

    pendingTargetDayKey.value = shiftDayKey(selectedDay.value, -1)
    edgeRequestPending.value = true
    emit('reach-start-edge')
    return
  }

  selectDay(activeDayIndex.value - 1)
}

function goNextDay() {
  if (!props.days.length) {
    return
  }

  if (activeDayIndex.value === props.days.length - 1) {
    if (edgeRequestPending.value || !selectedDay.value) {
      return
    }

    pendingTargetDayKey.value = shiftDayKey(selectedDay.value, 1)
    edgeRequestPending.value = true
    emit('reach-end-edge')
    return
  }

  selectDay(activeDayIndex.value + 1)
}

function jumpToToday() {
  if (props.currentDayIndex >= 0) {
    selectDay(props.currentDayIndex, true)
  }
}

function onAgendaTouchStart(event: TouchEvent) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function onAgendaTouchEnd(event: TouchEvent) {
  if (touchStartX.value == null) {
    return
  }

  const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX.value
  const deltaX = touchEndX - touchStartX.value
  touchStartX.value = null

  if (Math.abs(deltaX) < 44) {
    return
  }

  if (deltaX > 0) {
    goPreviousDay()
    return
  }

  goNextDay()
}

function unlockTabEdgeEventsSoon() {
  window.setTimeout(() => {
    tabEdgeEventLocked.value = false
  }, 180)
}

function releaseTabEdgeRequestSoon() {
  window.setTimeout(() => {
    tabEdgeRequestPending.value = false
  }, 320)
}

function emitTabEdgeEvents() {
  if (!dayTabsRef.value || tabEdgeEventLocked.value || tabEdgeRequestPending.value) {
    return
  }

  const threshold = 36
  const { scrollLeft, clientWidth, scrollWidth } = dayTabsRef.value
  const remainingRight = scrollWidth - (scrollLeft + clientWidth)

  if (scrollLeft <= threshold) {
    tabEdgeRequestPending.value = true
    tabEdgeEventLocked.value = true
    pendingLeftScrollRestore.value = { scrollLeft, scrollWidth }
    emit('reach-start-edge')
    unlockTabEdgeEventsSoon()
    releaseTabEdgeRequestSoon()
    return
  }

  if (remainingRight <= threshold) {
    tabEdgeRequestPending.value = true
    tabEdgeEventLocked.value = true
    emit('reach-end-edge')
    unlockTabEdgeEventsSoon()
    releaseTabEdgeRequestSoon()
  }
}

function onDayTabsScroll() {
  emitTabEdgeEvents()
}

function requestHideSeries(event: NormalizedWeekEvent) {
  if (!event.seriesId) {
    return
  }

  emit('hide-series', {
    seriesId: event.seriesId,
    title: event.title,
  })
}

function requestHideOccurrence(event: NormalizedWeekEvent) {
  if (!event.occurrenceId) {
    return
  }

  emit('hide-occurrence', event.occurrenceId)
}

function isSingleWordTitle(title: string) {
  return !/\s/.test(title.trim())
}

const selectedDay = computed(() => props.days[activeDayIndex.value] ?? null)
const selectedEvents = computed(() => props.eventsByDay[activeDayIndex.value] ?? [])
const nowLineTopPercent = computed<number | null>(() => {
  if (!selectedDay.value?.isToday) {
    return null
  }

  const now = new Date(nowTimestamp.value)
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const startMinutes = props.startHour * 60
  const endMinutes = startMinutes + props.totalMinutes

  if (minutes < startMinutes || minutes > endMinutes) {
    return null
  }

  return ((minutes - startMinutes) / props.totalMinutes) * 100
})

watch(
  selectedDay,
  (day) => {
    if (!day) {
      return
    }

    emit('selected-year-change', day.date.getFullYear())
    emit('selected-day-label-change', fullDateFormatter.format(day.date))
  },
  { immediate: true }
)

watch(
  () => [props.currentDayIndex, props.days.length],
  () => {
    if (!props.days.length) {
      activeDayIndex.value = 0
      selectedDayKey.value = null
      return
    }

    if (hasManualSelection.value && selectedDayKey.value) {
      if (pendingTargetDayKey.value) {
        const pendingIndex = props.days.findIndex((day) => dayKey(day) === pendingTargetDayKey.value)

        if (pendingIndex >= 0) {
          selectDay(pendingIndex, false)
          pendingTargetDayKey.value = null
          edgeRequestPending.value = false
          return
        }

        edgeRequestPending.value = false
      }

      const matchingIndex = props.days.findIndex((day) => dayKey(day) === selectedDayKey.value)

      if (matchingIndex >= 0 && matchingIndex !== activeDayIndex.value) {
        selectDay(matchingIndex, false)
      } else if (matchingIndex < 0) {
        const fallbackIndex = props.currentDayIndex >= 0 ? props.currentDayIndex : Math.floor(props.days.length / 2)
        selectDay(fallbackIndex, false)
      }

      return
    }

    const fallbackIndex = props.days.length ? Math.floor(props.days.length / 2) : 0
    const nextIndex = props.currentDayIndex >= 0 ? props.currentDayIndex : fallbackIndex
    selectDay(nextIndex, false)
  },
  { immediate: true }
)

watch(
  () => props.days.length,
  (nextLength, previousLength) => {
    if (!dayTabsRef.value || nextLength === previousLength) {
      return
    }

    tabEdgeRequestPending.value = false

    if (!pendingLeftScrollRestore.value) {
      return
    }

    const { scrollLeft, scrollWidth } = pendingLeftScrollRestore.value

    void nextTick(() => {
      if (!dayTabsRef.value) {
        pendingLeftScrollRestore.value = null
        return
      }

      const widthDelta = dayTabsRef.value.scrollWidth - scrollWidth
      dayTabsRef.value.scrollLeft = scrollLeft + Math.max(widthDelta, 0)
      pendingLeftScrollRestore.value = null
    })
  }
)

defineExpose({
  jumpToToday,
})

const isMobile = ref(false)
let mobileQuery: MediaQueryList | null = null

onMounted(() => {
  nowTimer = window.setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)

  mobileQuery = window.matchMedia('(max-width: 45em)')
  isMobile.value = mobileQuery.matches
  mobileQuery.addEventListener('change', (e) => { isMobile.value = e.matches })
})

onUnmounted(() => {
  if (nowTimer != null) {
    window.clearInterval(nowTimer)
  }

  mobileQuery?.removeEventListener('change', () => {})
})
</script>

<template>
  <div class="mobile-days">
    <div class="mobile-topbar" />

    <Teleport to="#week-mobile-tabs-slot" :disabled="!isMobile">
      <div ref="dayTabsRef" class="mobile-day-tabs" aria-label="Tage wählen" @scroll.passive="onDayTabsScroll">
        <button
          v-for="(day, dayIndex) in days"
          :key="`mobile-tab-${day.date.toISOString()}`"
          :ref="(element) => setDayTabRef(element as Element | null, dayIndex)"
          type="button"
          class="mobile-day-tab"
          :class="{ 'mobile-day-tab-active': dayIndex === activeDayIndex, 'mobile-day-tab-today': day.isToday }"
          @click="selectDay(dayIndex)"
        >
          <span class="mobile-day-tab-weekday">{{ day.weekdayLabel.slice(0, 2) }}</span>
          <span class="mobile-day-tab-date">{{ day.dateLabel.slice(0, 2) }}</span>
        </button>
      </div>
    </Teleport>

    <article
      v-if="selectedDay"
      class="mobile-day-card"
      :class="selectedDay.isToday ? 'mobile-day-card-today' : ''"
      @touchstart.passive="onAgendaTouchStart"
      @touchend.passive="onAgendaTouchEnd"
    >
      <header class="mobile-day-header" :class="selectedDay.isToday ? 'day-header-today' : ''">
        <span>{{ selectedDay.weekdayLabel }}</span>
        <span>{{ selectedDay.dateLabel }}</span>
      </header>

      <section class="mobile-time-grid" :class="selectedDay.isToday ? 'mobile-time-grid-today' : ''" aria-label="Zeitachse">
        <div class="mobile-time-axis">
          <span v-for="slot in props.hourSlots" :key="`mobile-time-${slot}`" class="mobile-time-label">
            {{ props.formatTimeLabel(slot) }}
          </span>
        </div>
        <div class="mobile-time-body">
          <div
            v-if="nowLineTopPercent !== null"
            class="now-line"
            :style="{ top: `${nowLineTopPercent}%` }"
          />
          <span v-for="slot in props.hourSlots" :key="`mobile-slot-${slot}`" class="mobile-slot-line" />
          <div v-if="!selectedEvents.length" class="mobile-free">Keine Termine · Tag ist frei</div>
          <div
            v-for="event in selectedEvents"
            :key="`mobile-evt-${event.id}`"
            class="mobile-event"
            :class="[`event-${event.status}`, { 'event-hidden': event.isHidden }]"
            :style="{ ...props.eventStyle(event.start, event.end), position: 'absolute', left: '0.25rem', right: '0.25rem' }"
          >
            <strong class="event-title" :class="{ 'event-title-truncate': isSingleWordTitle(event.title) }">
              {{ event.title }}
            </strong>
            <span class="mobile-event-range">{{ event.startTime }}–{{ event.endTime }}</span>
            <span v-if="event.subtitle" class="event-subtitle">{{ event.subtitle }}</span>
            <span v-if="event.isHidden" class="event-hidden-label">Ausgeblendet</span>
            <!-- Reihe ausblenden: gestapelte Zeilen = ganze Terminreihe. -->
            <button
              v-if="event.seriesId"
              type="button"
              class="mobile-event-action mobile-event-action-series"
              title="Ganze Reihe ausblenden"
              aria-label="Ganze Reihe ausblenden (alle Termine dieser Reihe)"
              @click="requestHideSeries(event)"
            >
              <svg aria-hidden="true" class="mobile-event-action-icon" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="3" width="11" height="4" rx="1.25" stroke="currentColor" stroke-width="1.25" />
                <rect x="2.5" y="9" width="11" height="4" rx="1.25" stroke="currentColor" stroke-width="1.25" />
                <path d="M5.25 5L10.75 5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
              </svg>
            </button>
            <!-- Einzeltermin ausblenden: durchgestrichenes Auge = nur diesen Termin verbergen. -->
            <button
              v-if="event.occurrenceId"
              type="button"
              class="mobile-event-action mobile-event-action-occurrence"
              title="Diesen Termin ausblenden"
              aria-label="Diesen Termin ausblenden (nur dieser Einzeltermin)"
              @click="requestHideOccurrence(event)"
            >
              <svg aria-hidden="true" class="mobile-event-action-icon" viewBox="0 0 16 16" fill="none">
                <path d="M2.5 8C3.8 5.8 5.7 4.7 8 4.7s4.2 1.1 5.5 3.3c-1.3 2.2-3.2 3.3-5.5 3.3S3.8 10.2 2.5 8Z" stroke="currentColor" stroke-width="1.2" />
                <circle cx="8" cy="8" r="1.7" stroke="currentColor" stroke-width="1.2" />
                <path d="M3.2 12.8 12.8 3.2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<style scoped>
.mobile-days { display: none; }
.mobile-topbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 0.75rem; }
.mobile-topbar-meta { display: flex; flex-direction: column; gap: 0.125rem; }
.mobile-topbar-date { font-size: 1rem; line-height: 1.15; color: var(--color-text); text-transform: capitalize; }
.mobile-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 0.375rem; }
.mobile-nav-btn { border: 0.0625rem solid var(--color-border); background: var(--color-surface-raised); color: var(--color-text); border-radius: 999rem; min-height: 2rem; min-width: 2rem; padding: 0.375rem 0.625rem; font: inherit; font-size: 0.82rem; font-weight: 700; touch-action: manipulation; }
.mobile-nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mobile-nav-btn-today { min-width: 4rem; }
.mobile-day-tabs { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; padding: 0.125rem 0.0625rem; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
.mobile-day-tabs::-webkit-scrollbar { width: 0; height: 0; display: none; }
.mobile-day-tab { border: 0.0625rem solid var(--color-border); border-radius: 999rem; background: var(--color-surface-raised); color: var(--color-text); padding: 0.375rem 0.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.0625rem; font: inherit; width: 100%; }
.mobile-day-tab-weekday { font-size: 0.62rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.mobile-day-tab-date { font-size: 0.82rem; font-weight: 700; line-height: 1; }
.mobile-day-tab-today { border-color: color-mix(in srgb, #ef4444 50%, var(--color-border)); }
.mobile-day-tab-active { border-color: var(--color-primary); background: var(--color-primary-glow); }
.mobile-day-card { border: 0.0625rem solid var(--color-border); border-radius: 0.875rem; padding: 0.75rem; background: var(--color-surface-raised); display: flex; flex-direction: column; gap: 0.625rem; }
.mobile-day-card-today {
  border-color: color-mix(in srgb, #ef4444 55%, var(--color-border));
  box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, #ef4444 45%, transparent);
}
.mobile-day-header { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; font-weight: 600; color: var(--color-text); padding-bottom: 0.375rem; border-bottom: 0.0625rem solid var(--color-border); }
.day-header-today { background: var(--color-primary-glow); border-radius: 0.375rem; padding: 0.25rem 0.375rem; margin: -0.25rem -0.375rem 0; }
.mobile-time-grid { display: grid; grid-template-columns: 2.75rem minmax(0, 1fr); gap: 0; border: 0.0625rem solid var(--color-border); border-radius: 0.625rem; overflow: hidden; background: var(--color-surface); }
.mobile-time-grid-today { border-color: color-mix(in srgb, #ef4444 55%, var(--color-border)); }
.mobile-time-axis { display: flex; flex-direction: column; padding: 0.25rem 0; }
.mobile-time-label { height: 2.5rem; display: flex; align-items: flex-start; justify-content: flex-end; padding-right: 0.375rem; font-size: 0.62rem; color: var(--color-text-muted); line-height: 1; font-variant-numeric: tabular-nums; }
.mobile-time-body { position: relative; display: flex; flex-direction: column; padding: 0.25rem 0; }
.mobile-slot-line { height: 2.5rem; border-top: 0.0625rem dashed color-mix(in srgb, var(--color-border) 75%, transparent); }
.now-line { position: absolute; left: 0; right: 0; border-top: 0.125rem solid #ef4444; z-index: 3; pointer-events: none; }
.now-line::before { content: ''; position: absolute; left: -0.0625rem; top: -0.3125rem; width: 0.5rem; height: 0.5rem; border-radius: 999rem; background: #ef4444; }
.mobile-free { position: absolute; inset: 0.5rem; font-size: 0.82rem; color: var(--color-text-muted); border: 0.0625rem dashed var(--color-border); border-radius: 0.75rem; padding: 0.75rem; text-align: center; display: flex; align-items: center; justify-content: center; }
.mobile-event { position: relative; border-radius: 0.375rem; border: 0.0625rem solid transparent; padding: 0.25rem 3.5rem 0.25rem 0.375rem; display: flex; flex-direction: column; gap: 0.125rem; overflow: hidden; }
.mobile-event-range { font-size: 0.7rem; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.event-offen { background: color-mix(in srgb, var(--color-warning-bg) 80%, transparent); border-color: color-mix(in srgb, var(--color-warning-border) 58%, transparent); }
.event-belegt { background: color-mix(in srgb, var(--color-primary-glow) 65%, transparent); border-color: color-mix(in srgb, var(--color-primary-light) 55%, transparent); }
.event-abgeschlossen { background: color-mix(in srgb, var(--color-success-bg) 80%, transparent); border-color: color-mix(in srgb, var(--color-success-border) 58%, transparent); }
.event-hidden { opacity: 0.4; border-style: dashed !important; }
.event-hidden-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); }
.event-title { font-size: 0.75rem; line-height: 1.25; color: var(--color-text); white-space: normal; overflow-wrap: break-word; word-break: normal; max-width: 100%; }
.event-title-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-subtitle { font-size: 0.68rem; color: var(--color-text-muted); line-height: 1.25; }
.mobile-event-action { position: absolute; top: 0.25rem; width: 1.375rem; height: 1.375rem; border: 0.0625rem solid var(--color-border); background: var(--color-surface); color: var(--color-text); border-radius: 999rem; font: inherit; font-size: 0.92rem; font-weight: 700; line-height: 1; padding: 0; display: inline-grid; place-items: center; }
.mobile-event-action-series { right: 0.25rem; }
.mobile-event-action-occurrence { right: 1.875rem; }
.mobile-event-action-icon { display: block; width: 0.875rem; height: 0.875rem; }
.mobile-event-action:hover { border-color: var(--color-primary); }
@media (max-width: 45em) {
  .mobile-days { display: grid; grid-template-columns: 1fr; gap: 0.625rem; }
}
</style>
