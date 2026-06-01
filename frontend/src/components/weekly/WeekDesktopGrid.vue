<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { NormalizedWeekEvent, ScheduleDay } from '../../types/schedule'

const props = defineProps<{
  days: ScheduleDay[]
  eventsByDay: NormalizedWeekEvent[][]
  hourSlots: number[]
  startHour: number
  totalMinutes: number
  formatTimeLabel: (minutes: number) => string
  eventStyle: (start: number, end: number) => { top: string; height: string }
  currentDayIndex: number
  nowLineTopPercent: number | null
}>()

const emit = defineEmits<{
  'today-visibility-change': [isVisible: boolean]
  'reach-start-edge': []
  'reach-end-edge': []
  'hide-series': [payload: { seriesId: string; title: string }]
  'hide-occurrence': [occurrenceId: string]
}>()

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

const gridWrapper = ref<HTMLElement | null>(null)
const dayColumnsRef = ref<HTMLElement | null>(null)
const dayColumnRefs = ref<Array<HTMLElement | null>>([])
const edgeEventLocked = ref(false)

const hourCount = computed(() => props.hourSlots.length)
const dayBodyHeightRem = computed(() => (props.totalMinutes / 60) * 3.5)
const hourIntervalCount = computed(() => Math.max(hourCount.value - 1, 1))
const hourIntervalHeightRem = computed(() => dayBodyHeightRem.value / hourIntervalCount.value)

function getDayColumnsInset() {
  if (!gridWrapper.value || !dayColumnsRef.value) {
    return 0
  }

  const wrapperRect = gridWrapper.value.getBoundingClientRect()
  const dayColumnsRect = dayColumnsRef.value.getBoundingClientRect()

  return dayColumnsRect.left - wrapperRect.left
}

function setDayColumnRef(element: Element | null, index: number) {
  dayColumnRefs.value[index] = element instanceof HTMLElement ? element : null
}

function scrollToDay(index: number) {
  if (!gridWrapper.value || index < 0) {
    return
  }

  const liveColumn = dayColumnsRef.value?.children[index]
  const targetColumn = (liveColumn instanceof HTMLElement ? liveColumn : dayColumnRefs.value[index])

  if (!targetColumn) {
    return
  }

  gridWrapper.value.scrollTo({ left: targetColumn.offsetLeft, behavior: 'smooth' })
}

function getDayStepPx() {
  const first = dayColumnRefs.value[0]
  const second = dayColumnRefs.value[1]

  if (first && second) {
    return second.offsetLeft - first.offsetLeft
  }

  return first?.offsetWidth ?? 0
}

function scrollByDays(days: number, behavior: ScrollBehavior = 'auto') {
  if (!gridWrapper.value || days === 0) {
    return
  }

  gridWrapper.value.scrollBy({
    left: getDayStepPx() * days,
    behavior,
  })
}

function isDayVisible(index: number) {
  if (!gridWrapper.value || index < 0) {
    return false
  }

  const targetColumn = dayColumnRefs.value[index]

  if (!targetColumn) {
    return false
  }

  const wrapperRect = gridWrapper.value.getBoundingClientRect()
  const targetRect = targetColumn.getBoundingClientRect()
  const leftInset = getDayColumnsInset()
  const visibleLeft = wrapperRect.left + leftInset
  const visibleRight = wrapperRect.right

  return targetRect.left < visibleRight && targetRect.right > visibleLeft
}

function emitTodayVisibility() {
  emit('today-visibility-change', isDayVisible(props.currentDayIndex))
}

function unlockEdgeEventsSoon() {
  window.setTimeout(() => {
    edgeEventLocked.value = false
  }, 160)
}

function emitEdgeEvents() {
  if (!gridWrapper.value || edgeEventLocked.value) {
    return
  }

  const step = getDayStepPx()
  const threshold = step * 2
  const { scrollLeft, clientWidth, scrollWidth } = gridWrapper.value
  const remainingRight = scrollWidth - (scrollLeft + clientWidth)

  if (scrollLeft <= threshold) {
    edgeEventLocked.value = true
    emit('reach-start-edge')
    unlockEdgeEventsSoon()
    return
  }

  if (remainingRight <= threshold) {
    edgeEventLocked.value = true
    emit('reach-end-edge')
    unlockEdgeEventsSoon()
  }
}

function onGridScroll() {
  emitTodayVisibility()
  emitEdgeEvents()
}

watch(
  () => [props.currentDayIndex, props.days.length],
  () => {
    void nextTick(() => emitTodayVisibility())
  }
)

onMounted(() => {
  window.addEventListener('resize', emitTodayVisibility)
  void nextTick(() => {
    emitTodayVisibility()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', emitTodayVisibility)
})

defineExpose({
  scrollToDay,
  isDayVisible,
  scrollByDays,
})
</script>

<template>
  <div ref="gridWrapper" class="week-grid-wrapper" @scroll="onGridScroll">
    <aside class="time-axis">
      <div class="time-axis-spacer" aria-hidden="true" />
      <span v-for="slot in hourSlots" :key="slot" class="time-label" :style="{ height: `${hourIntervalHeightRem}rem` }">
        {{ formatTimeLabel(slot) }}
      </span>
    </aside>

    <div ref="dayColumnsRef" class="day-columns">
      <article
        v-for="(day, dayIndex) in days"
        :key="day.date.toISOString()"
        :ref="(element) => setDayColumnRef(element as Element | null, dayIndex)"
        class="day-column"
        :class="{ 'day-column-today': dayIndex === currentDayIndex }"
      >
        <header class="day-header" :class="day.isToday ? 'day-header-today' : ''">
          <span class="day-name">{{ day.weekdayLabel }}</span>
          <span class="day-date">{{ day.dateLabel }}</span>
        </header>

        <!--
          Off-screen sizer: trägt die vollständigen Titel/Untertitel im Normalfluss,
          damit die Spalte breit genug wird, um den ganzen Namen anzuzeigen. Die
          eigentlichen Event-Blöcke sind absolut positioniert und steuern die Breite
          deshalb nicht selbst.
        -->
        <div class="day-sizer" aria-hidden="true">
          <template v-for="event in eventsByDay[dayIndex]" :key="`sizer-${event.id}`">
            <span class="day-sizer-title">{{ event.title }}</span>
            <span v-if="event.subtitle" class="day-sizer-subtitle">{{ event.subtitle }}</span>
          </template>
        </div>

        <div class="day-body" :style="{ height: `${dayBodyHeightRem}rem` }">
          <div
            v-if="dayIndex === currentDayIndex && nowLineTopPercent !== null"
            class="now-line"
            :style="{ top: `${nowLineTopPercent}%` }"
          />

          <div
            v-for="slot in hourSlots"
            :key="`${dayIndex}-${slot}`"
            class="slot-line"
            :style="{ top: `${((slot - startHour * 60) / totalMinutes) * 100}%` }"
          />

          <div
            v-for="event in eventsByDay[dayIndex]"
            :key="event.id"
            class="event-block"
            :class="[`event-${event.status}`, { 'event-hidden': event.isHidden }]"
            :style="eventStyle(event.start, event.end)"
          >
            <span class="event-time">{{ event.startTime }}–{{ event.endTime }}</span>
            <strong class="event-title">
              {{ event.title }}
            </strong>
            <span v-if="event.subtitle" class="event-subtitle">{{ event.subtitle }}</span>
            <span v-if="event.isHidden" class="event-hidden-label">Ausgeblendet</span>
            <button
              v-if="event.seriesId"
              type="button"
              class="hide-series-btn"
              title="Terminreihe ausblenden (alle Termine dieser Reihe)"
              aria-label="Terminreihe ausblenden (alle Termine dieser Reihe)"
              @click.stop="requestHideSeries(event)"
            >
              <svg aria-hidden="true" class="hide-action-icon" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="3" width="11" height="4" rx="1.25" stroke="currentColor" stroke-width="1.25" />
                <rect x="2.5" y="9" width="11" height="4" rx="1.25" stroke="currentColor" stroke-width="1.25" />
                <path d="M5.25 5L10.75 5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
              </svg>
            </button>
            <button
              v-if="event.occurrenceId"
              type="button"
              class="hide-occurrence-btn"
              title="Einzeltermin ausblenden (nur diesen Termin)"
              aria-label="Einzeltermin ausblenden (nur diesen Termin)"
              @click.stop="requestHideOccurrence(event)"
            >
              <svg aria-hidden="true" class="hide-action-icon" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="4" width="11" height="8" rx="1.25" stroke="currentColor" stroke-width="1.25" />
                <path d="M5 8H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.week-grid-wrapper { --day-header-height: clamp(2.875rem, 4.8vh, 3.25rem); display: grid; grid-template-columns: clamp(2.75rem, 5vw, 3.875rem) minmax(0, 1fr); gap: 0.625rem; overflow-x: auto; overflow-y: auto; padding-bottom: 0.25rem; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; position: relative; flex: 1; min-height: 0; scrollbar-width: none; -ms-overflow-style: none; align-content: start; }
.week-grid-wrapper::-webkit-scrollbar { width: 0; height: 0; display: none; }
.time-axis { display: flex; flex-direction: column; position: sticky; left: 0; z-index: 7; min-width: clamp(2.75rem, 5vw, 3.875rem); background: var(--color-surface); box-shadow: 0.625rem 0 0.75rem -0.75rem color-mix(in srgb, var(--color-border) 85%, transparent), 0 0.625rem 0.75rem -0.75rem color-mix(in srgb, var(--color-border) 85%, transparent); overflow-y: hidden; }
.time-axis-spacer { height: var(--day-header-height); border-bottom: 0.0625rem solid transparent; flex-shrink: 0; }
.time-label { font-size: 0.72rem; color: var(--color-text-muted); display: flex; align-items: flex-start; padding-top: 0.125rem; box-sizing: border-box; flex-shrink: 0; }
.day-columns { --day-min-width: clamp(6rem, 14vw, 7.5rem); --day-max-width: 22rem; min-width: max-content; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(max-content, 1fr); gap: 0.375rem; }
.day-column { border: 0.0625rem solid var(--color-border); border-radius: 0.625rem; overflow: visible; background: var(--color-surface-raised); }
.day-column-today { border-color: color-mix(in srgb, #ef4444 55%, var(--color-border)); box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, #ef4444 45%, transparent); }
.day-header { position: relative; min-height: var(--day-header-height); padding: 0.625rem 0.5rem; border-bottom: 0.0625rem solid var(--color-border); display: flex; flex-direction: column; justify-content: center; gap: 0.125rem; background: var(--color-surface-raised); box-sizing: border-box; }
.day-header-today { background: var(--color-primary-glow); }
.day-name { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
.day-date { font-size: 0.84rem; font-weight: 600; color: var(--color-text); }
/*
 * Sizer im Normalfluss: 0 hoch (kein vertikaler Einfluss), aber seine Inhaltsbreite
 * bestimmt die max-content-Breite der Spalte. min-width = Mindestbreite der Spalte,
 * max-width = Kappung, damit ein extrem langer Titel die Spalte nicht sprengt.
 */
.day-sizer { height: 0; overflow: hidden; display: flex; flex-direction: column; padding-inline: 0.5rem; min-width: var(--day-min-width); box-sizing: border-box; }
.day-sizer-title, .day-sizer-subtitle { white-space: nowrap; max-width: var(--day-max-width); }
/* padding-right reserviert Platz für die Ausblenden-Buttons oben rechts. */
.day-sizer-title { font-size: 0.75rem; font-weight: 700; padding-right: 1.75rem; }
.day-sizer-subtitle { font-size: 0.68rem; }
.day-body { position: relative; background: var(--color-surface); }
.slot-line { position: absolute; left: 0; right: 0; border-top: 0.0625rem dashed color-mix(in srgb, var(--color-border) 75%, transparent); }
.now-line { position: absolute; left: 0; right: 0; border-top: 0.125rem solid #ef4444; z-index: 3; pointer-events: none; }
.now-line::before { content: ''; position: absolute; left: -0.0625rem; top: -0.3125rem; width: 0.5rem; height: 0.5rem; border-radius: 999rem; background: #ef4444; }
.event-block { position: absolute; left: 0; right: 0; border-radius: 0; border: 0.0625rem solid transparent; padding: 0.4375rem 0.5rem; display: flex; flex-direction: column; gap: 0.125rem; overflow: hidden; }
.event-offen { background: color-mix(in srgb, var(--color-warning-bg) 80%, transparent); border-color: color-mix(in srgb, var(--color-warning-border) 58%, transparent); }
.event-belegt { background: color-mix(in srgb, var(--color-primary-glow) 65%, transparent); border-color: color-mix(in srgb, var(--color-primary-light) 55%, transparent); }
.event-abgeschlossen { background: color-mix(in srgb, var(--color-success-bg) 80%, transparent); border-color: color-mix(in srgb, var(--color-success-border) 58%, transparent); }
.event-hidden { opacity: 0.4; border-style: dashed !important; }
.event-hidden-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); margin-top: auto; }
.event-time { font-size: 0.68rem; color: var(--color-text-muted); }
.event-title { font-size: 0.75rem; line-height: 1.25; color: var(--color-text); white-space: normal; overflow-wrap: break-word; word-break: normal; max-width: 100%; }
.event-subtitle { font-size: 0.68rem; color: var(--color-text-muted); line-height: 1.25; }
.hide-series-btn { position: absolute; top: 0.25rem; right: 0.25rem; width: 1.25rem; height: 1.25rem; border: 0.0625rem solid color-mix(in srgb, var(--color-border) 85%, transparent); border-radius: 999rem; background: color-mix(in srgb, var(--color-surface) 92%, transparent); color: var(--color-text-muted); font: inherit; font-size: 0.9rem; font-weight: 700; line-height: 1; display: inline-grid; place-items: center; padding: 0; cursor: pointer; opacity: 0; transform: translateY(-0.0625rem); transition: opacity 0.16s ease, transform 0.16s ease, color 0.16s ease, border-color 0.16s ease; }
.hide-occurrence-btn { position: absolute; top: 0.25rem; right: 1.75rem; width: 1.25rem; height: 1.25rem; border: 0.0625rem solid color-mix(in srgb, var(--color-border) 85%, transparent); border-radius: 999rem; background: color-mix(in srgb, var(--color-surface) 92%, transparent); color: var(--color-text-muted); font: inherit; font-size: 0.95rem; font-weight: 700; line-height: 1; display: inline-grid; place-items: center; padding: 0; cursor: pointer; opacity: 0; transform: translateY(-0.0625rem); transition: opacity 0.16s ease, transform 0.16s ease, color 0.16s ease, border-color 0.16s ease; }
.hide-action-icon { display: block; width: 0.875rem; height: 0.875rem; }
.event-block:hover .hide-series-btn,
.event-block:focus-within .hide-series-btn,
.event-block:hover .hide-occurrence-btn,
.event-block:focus-within .hide-occurrence-btn { opacity: 1; transform: translateY(0); }
.hide-series-btn:hover,
.hide-series-btn:focus-visible,
.hide-occurrence-btn:hover,
.hide-occurrence-btn:focus-visible { color: var(--color-primary); border-color: var(--color-primary-light); outline: none; }
@media (max-width: 56.25em) {
  .week-grid-wrapper { grid-template-columns: clamp(2.5rem, 5vw, 3rem) minmax(0, 1fr); }
  .day-columns { --day-min-width: clamp(5.6rem, 16vw, 6.4rem); }
}
@media (max-width: 45em) { .week-grid-wrapper { display: none; } }
</style>
