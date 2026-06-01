<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CombinedWeekGrid from './CombinedWeekGrid.vue'
import { useWeeklySchedule } from '../../composables/useWeeklySchedule'
import { memberInitials, useCombinedWeek } from '../../composables/useCombinedWeek'
import { localDateKey, localMinutesOfDay, mondayOf, parseHhMm } from '../../utils/datetime'
import type { WeekEvent } from '../../types/schedule'
import type {
  BusyBlockView,
  CombinedAppointment,
  CombinedSearchSlot,
  CombinedWeekMember,
  LayerBlockView,
  MemberChip,
  MemberFill,
  MemberScheduleSlot,
  WeekColumnView,
} from '../../types/teamWeek'

const props = withDefaults(defineProps<{
  members: CombinedWeekMember[]
  slots: MemberScheduleSlot[]
  appointments?: CombinedAppointment[]
  searchResults?: CombinedSearchSlot[]
  /** Kontrollierter Wochenstart (beliebiges Datum der Woche). Optional. */
  weekStart?: Date
  /** true, sobald eine Suche läuft (Idle-Hinweis wird sofort ausgeblendet). */
  loading?: boolean
  /** true, sobald eine Suche durchgeführt wurde (steuert den Empty-Hinweis). */
  searchPerformed?: boolean
  startHour?: number
  endHour?: number
}>(), {
  appointments: () => [],
  searchResults: () => [],
  loading: false,
  searchPerformed: false,
  startHour: 7,
  endHour: 20,
})

const emit = defineEmits<{
  'update:weekStart': [value: Date]
  'select-search-slot': [id: string]
  'select-appointment': [id: string]
}>()

const MAX_AVATARS = 4

/**
 * Sweep-line overlap layout: groups items that overlap in time and assigns each
 * a column within its overlap group so they render side by side.
 * Mutates `items` in place, adding `left` and `width` to each item's `style`.
 */
interface LayoutEntry {
  startMin: number
  endMin: number
  style: Record<string, string>
}
function applyOverlapLayout(items: LayoutEntry[]): void {
  if (items.length <= 1) {
    for (const item of items) {
      item.style.left = '0.25rem'
      item.style.width = 'calc(100% - 0.5rem)'
    }
    return
  }
  // Sort indices by start time, then end time
  const sorted = items
    .map((_, idx) => idx)
    .sort((a, b) => items[a].startMin - items[b].startMin || items[a].endMin - items[b].endMin)
  const columnOf = new Array(items.length).fill(-1)
  const columnEnds: number[] = []
  for (const idx of sorted) {
    const { startMin, endMin } = items[idx]
    let col = columnEnds.findIndex((end) => end <= startMin)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(0)
    }
    columnOf[idx] = col
    columnEnds[col] = endMin
  }
  const groupSize = Math.max(columnEnds.length, 1)
  for (let i = 0; i < items.length; i++) {
    const col = columnOf[i]
    items[i].style.left = `calc(${(col / groupSize) * 100}% + 0.125rem)`
    items[i].style.width = `calc(${100 / groupSize}% - 0.25rem)`
  }
}

const weekdayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })
const rangeEndFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Wochenstart: kontrolliert über die Prop, sonst intern verwaltet.
const internalWeek = ref(mondayOf(new Date()))
const weekStart = computed(() => (props.weekStart ? mondayOf(props.weekStart) : internalWeek.value))
const nowTimestamp = ref(Date.now())
let nowTimer: number | null = null

function setWeek(monday: Date) {
  internalWeek.value = monday
  emit('update:weekStart', monday)
}

function previousWeek() {
  const next = new Date(weekStart.value)
  next.setDate(next.getDate() - 7)
  setWeek(next)
}

function nextWeek() {
  const next = new Date(weekStart.value)
  next.setDate(next.getDate() + 7)
  setWeek(next)
}

function goToday() {
  setWeek(mondayOf(new Date()))
}

const startHourRef = computed(() => props.startHour)
const endHourRef = computed(() => props.endHour)
const emptyEvents = computed<WeekEvent[]>(() => [])

// Layout-Primitive aus der bestehenden Wochenansicht wiederverwenden.
const { hourSlots, totalMinutes, formatTimeLabel, eventStyle } = useWeeklySchedule(
  emptyEvents,
  computed(() => weekStart.value),
  startHourRef,
  endHourRef,
)

const { memberById, memberColor, mergedByWeekday } = useCombinedWeek(
  computed(() => props.members),
  computed(() => props.slots),
)

const days = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(weekStart.value)
  date.setDate(weekStart.value.getDate() + index)
  return { index, date, key: localDateKey(date) }
}))

const todayKey = computed(() => localDateKey(new Date(nowTimestamp.value)))
const currentDayIndex = computed(() => days.value.findIndex((day) => day.key === todayKey.value))

const weekRangeLabel = computed(() => {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 6)
  return `${dateFormatter.format(weekStart.value)} – ${rangeEndFormatter.format(end)}`
})

const canGoToday = computed(
  () => localDateKey(weekStart.value) !== localDateKey(mondayOf(new Date())),
)

const legendMembers = computed<MemberChip[]>(() => props.members.map((member) => ({
  id: member.id,
  name: member.name,
  initials: memberInitials(member.name),
  color: memberColor.value.get(member.id) ?? '#64748b',
})))

function chipsFor(memberIds: string[]): { members: MemberChip[]; extraCount: number } {
  const shown = memberIds.slice(0, MAX_AVATARS)
  const members = shown.map((id) => {
    const member = memberById.value.get(id)
    return {
      id,
      name: member?.name ?? 'Unbekannt',
      initials: memberInitials(member?.name ?? '?'),
      color: memberColor.value.get(id) ?? '#64748b',
    }
  })
  return { members, extraCount: Math.max(memberIds.length - shown.length, 0) }
}

// Termine sind in UTC gespeichert -> über new Date() in Browser-Zeit umgerechnet
// und dem lokalen Kalendertag (+ Position) zugeordnet.
const appointmentsByKey = computed(() => {
  const map = new Map<string, LayerBlockView[]>()
  const raw = new Map<string, (LayoutEntry & { view: LayerBlockView })[]>()
  for (const appointment of props.appointments) {
    const starts = new Date(appointment.startsAt)
    const ends = new Date(appointment.endsAt)
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      continue
    }
    const startMin = localMinutesOfDay(starts)
    const endMin = localMinutesOfDay(ends)
    const members: MemberChip[] = (appointment.attendees ?? [])
      .filter((attendee) => attendee.status !== 'declined')
      .map((attendee, index) => ({
        id: `${appointment.id}-${index}`,
        name: attendee.name,
        initials: memberInitials(attendee.name),
        color: (attendee.userId ? memberColor.value.get(attendee.userId) : undefined) ?? '#64748b',
      }))

    const view: LayerBlockView = {
      id: appointment.id,
      label: appointment.title,
      timeLabel: `${formatTimeLabel(startMin)}–${formatTimeLabel(endMin)}`,
      style: eventStyle(startMin, endMin),
      members,
    }
    const key = localDateKey(starts)
    const list: (LayoutEntry & { view: LayerBlockView })[] = raw.get(key) ?? []
    list.push({ view, startMin, endMin, style: view.style })
    raw.set(key, list)
  }
  for (const [, entries] of raw) {
    applyOverlapLayout(entries)
  }
  for (const [key, entries] of raw) {
    map.set(key, entries.map((e) => e.view))
  }
  return map
})

const searchByWeekday = computed<LayerBlockView[][]>(() => {
  const raw: (LayoutEntry & { view: LayerBlockView })[][] = Array.from({ length: 7 }, () => [] as (LayoutEntry & { view: LayerBlockView })[])
  for (const slot of props.searchResults) {
    const startMin = parseHhMm(slot.startTime)
    const endMin = parseHhMm(slot.endTime)
    if (slot.dayIndex < 0 || slot.dayIndex > 6 || startMin == null || endMin == null || endMin <= startMin) {
      continue
    }
    const view: LayerBlockView = {
      id: slot.id,
      label: slot.label ?? 'Vorschlag',
      timeLabel: `${formatTimeLabel(startMin)}–${formatTimeLabel(endMin)}`,
      style: eventStyle(startMin, endMin),
    }
    raw[slot.dayIndex].push({ startMin, endMin, style: view.style, view })
  }
  for (const day of raw) {
    applyOverlapLayout(day)
  }
  return raw.map((day) => day.map((e) => e.view))
})

// Per-member fills: one coloured rectangle per raw slot (Layer 0).
const fillsByWeekday = computed<MemberFill[][]>(() => {
  const result: MemberFill[][] = Array.from({ length: 7 }, () => [])
  for (const slot of props.slots) {
    const startMin = parseHhMm(slot.startTime)
    const endMin = parseHhMm(slot.endTime)
    if (slot.dayIndex < 0 || slot.dayIndex > 6 || startMin == null || endMin == null || endMin <= startMin) {
      continue
    }
    const color = memberColor.value.get(slot.memberId) ?? '#64748b'
    result[slot.dayIndex].push({
      id: `fill-${slot.memberId}-${slot.dayIndex}-${slot.startTime}`,
      color,
      style: eventStyle(startMin, endMin),
    })
  }
  return result
})

const columns = computed<WeekColumnView[]>(() => days.value.map((day) => {
  const busy: BusyBlockView[] = mergedByWeekday.value[day.index].map((block) => {
    const { members, extraCount } = chipsFor(block.memberIds)
    return {
      id: `${day.key}-${block.start}-${block.end}-${block.memberIds.join('_')}`,
      style: eventStyle(block.start, block.end),
      members,
      extraCount,
    }
  })

  return {
    key: day.key,
    weekdayLabel: weekdayFormatter.format(day.date),
    dateLabel: dateFormatter.format(day.date),
    isToday: day.key === todayKey.value,
    fills: fillsByWeekday.value[day.index],
    busy,
    appointments: appointmentsByKey.value.get(day.key) ?? [],
    searches: searchByWeekday.value[day.index] ?? [],
  }
}))

const nowLineTopPercent = computed<number | null>(() => {
  if (currentDayIndex.value < 0) {
    return null
  }
  const now = new Date(nowTimestamp.value)
  const minutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = props.startHour * 60
  const endMinutes = props.endHour * 60
  if (minutes < startMinutes || minutes > endMinutes) {
    return null
  }
  return ((minutes - startMinutes) / totalMinutes.value) * 100
})

// Idle: no search triggered yet (and not currently running).
const showIdleHint = computed(
  () => !props.searchPerformed && !props.loading && props.searchResults.length === 0,
)
// Empty: search completed with zero results.
const showEmptyHint = computed(
  () => props.searchPerformed && !props.loading && props.searchResults.length === 0,
)

onMounted(() => {
  nowTimer = window.setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  if (nowTimer != null) {
    window.clearInterval(nowTimer)
  }
})
</script>

<template>
  <section class="cw">
    <header class="cw-header">
      <div class="cw-nav" role="group" aria-label="Wochennavigation">
        <button type="button" class="app-button cw-nav-btn" aria-label="Vorherige Woche" @click="previousWeek">←</button>
        <button type="button" class="app-button cw-nav-btn" :disabled="!canGoToday" @click="goToday">Heute</button>
        <button type="button" class="app-button cw-nav-btn" aria-label="Nächste Woche" @click="nextWeek">→</button>
        <span class="cw-week-range">{{ weekRangeLabel }}</span>
      </div>

      <div class="cw-legend">
        <span v-for="member in legendMembers" :key="member.id" class="cw-legend-member">
          <span class="cw-avatar" :style="{ background: member.color }">{{ member.initials }}</span>
          {{ member.name }}
        </span>
      </div>
    </header>

    <p class="cw-layer-legend">
      <span class="cw-key cw-key--busy">Belegt (Stundenpläne)</span>
      <span class="cw-key cw-key--appointment">Termine</span>
      <span class="cw-key cw-key--search">Suchergebnisse</span>
    </p>

    <div v-if="showIdleHint" class="cw-hint cw-hint--idle" role="status">
      Noch keine Suche durchgeführt – die Stundenpläne der Mitglieder und bestehende Termine sind bereits sichtbar.
    </div>
    <div v-else-if="showEmptyHint" class="cw-hint cw-hint--empty" role="status">
      Keine freien Slots gefunden – passe Dauer, Uhrzeiten oder ausgeschlossene Tage an.
    </div>

    <CombinedWeekGrid
      :columns="columns"
      :hour-slots="hourSlots"
      :start-hour="props.startHour"
      :total-minutes="totalMinutes"
      :format-time-label="formatTimeLabel"
      :current-day-index="currentDayIndex"
      :now-line-top-percent="nowLineTopPercent"
      @select-slot="emit('select-search-slot', $event)"
      @select-appointment="emit('select-appointment', $event)"
    />
  </section>
</template>

<style scoped>
.cw {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
}

.cw-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.cw-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.cw-nav-btn {
  min-width: var(--button-min-width);
}

.cw-week-range {
  margin-left: 0.5rem;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.cw-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.cw-legend-member {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.cw-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999rem;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
  box-shadow: 0 0 0 0.0625rem color-mix(in srgb, #000 12%, transparent);
}

.cw-layer-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
}

.cw-key {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.cw-key::before {
  content: '';
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 0.1875rem;
  flex-shrink: 0;
}

/* Filled square — represents the per-member coloured fill blocks */
.cw-key--busy::before {
  background: color-mix(in srgb, #2563eb 28%, transparent);
  outline: 0.0625rem solid color-mix(in srgb, #2563eb 40%, transparent);
  outline-offset: -0.0625rem;
}

/* Solid left bar — matches the appointment block style */
.cw-key--appointment::before {
  background: var(--color-surface-raised, var(--color-surface));
  border-left: 0.1875rem solid var(--color-primary);
  border-top: 0.0625rem solid var(--color-primary-light);
  border-right: 0.0625rem solid var(--color-primary-light);
  border-bottom: 0.0625rem solid var(--color-primary-light);
  border-radius: 0.125rem;
}

/* Dashed outline — matches the search result block style */
.cw-key--search::before {
  border: 0.125rem dashed var(--color-success-border, #16a34a);
  background: color-mix(in srgb, var(--color-success-bg, #16a34a) 22%, transparent);
}

/* Info boxes — positioned above the grid, full width */
.cw-hint {
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: 1.55;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-lg);
}

/* Idle: "no search yet" — subtle solid border, neutral background */
.cw-hint--idle {
  color: var(--color-text-muted);
  border: 0.0625rem solid var(--color-border);
  background: var(--color-surface);
}

/* Empty: search returned zero results — amber/warning tint */
.cw-hint--empty {
  color: var(--color-text);
  border: 0.0625rem solid var(--color-warning-border, var(--color-border));
  background: color-mix(in srgb, var(--color-warning-bg, #fef3c7) 40%, var(--color-surface));
}
</style>
