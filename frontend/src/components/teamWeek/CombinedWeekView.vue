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
  /** true, sobald eine Suche durchgeführt wurde (steuert den Empty-Hinweis). */
  searchPerformed?: boolean
  startHour?: number
  endHour?: number
}>(), {
  appointments: () => [],
  searchResults: () => [],
  searchPerformed: false,
  startHour: 7,
  endHour: 20,
})

const emit = defineEmits<{
  'update:weekStart': [value: Date]
  'select-search-slot': [id: string]
}>()

const MAX_AVATARS = 4

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
        color: '#475569',
      }))

    const view: LayerBlockView = {
      id: appointment.id,
      label: appointment.title,
      timeLabel: `${formatTimeLabel(startMin)}–${formatTimeLabel(endMin)}`,
      style: eventStyle(startMin, endMin),
      members,
    }
    const key = localDateKey(starts)
    const list = map.get(key) ?? []
    list.push(view)
    map.set(key, list)
  }
  return map
})

const searchByWeekday = computed<LayerBlockView[][]>(() => {
  const result: LayerBlockView[][] = Array.from({ length: 7 }, () => [])
  for (const slot of props.searchResults) {
    const startMin = parseHhMm(slot.startTime)
    const endMin = parseHhMm(slot.endTime)
    if (slot.dayIndex < 0 || slot.dayIndex > 6 || startMin == null || endMin == null || endMin <= startMin) {
      continue
    }
    result[slot.dayIndex].push({
      id: slot.id,
      label: slot.label ?? 'Vorschlag',
      timeLabel: `${formatTimeLabel(startMin)}–${formatTimeLabel(endMin)}`,
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
      startTime: block.startTime,
      endTime: block.endTime,
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

const showIdleHint = computed(() => !props.searchPerformed && props.searchResults.length === 0)
const showEmptyHint = computed(() => props.searchPerformed && props.searchResults.length === 0)

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

    <p v-if="showIdleHint" class="cw-search-empty">
      Noch keine Suche durchgeführt – die Stundenpläne der Mitglieder und bestehende Termine sind bereits sichtbar.
    </p>
    <p v-else-if="showEmptyHint" class="cw-search-empty cw-search-empty--none">
      Keine freien Slots gefunden – passe Dauer, Uhrzeiten oder ausgeschlossene Tage an.
    </p>

    <CombinedWeekGrid
      :columns="columns"
      :hour-slots="hourSlots"
      :start-hour="props.startHour"
      :total-minutes="totalMinutes"
      :format-time-label="formatTimeLabel"
      :current-day-index="currentDayIndex"
      :now-line-top-percent="nowLineTopPercent"
      @select-slot="emit('select-search-slot', $event)"
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
  border: 0.0625rem solid transparent;
}

.cw-key--busy::before {
  background: color-mix(in srgb, var(--color-primary-glow) 60%, transparent);
  border-color: color-mix(in srgb, var(--color-primary-light) 50%, transparent);
}

.cw-key--appointment::before {
  background: var(--color-surface);
  border-left: 0.1875rem solid var(--color-primary);
  border-radius: 0.125rem;
}

.cw-key--search::before {
  border: 0.125rem dashed var(--color-success-border, #16a34a);
  background: color-mix(in srgb, var(--color-success-bg, #16a34a) 22%, transparent);
}

.cw-search-empty {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding: var(--space-md);
  border: 0.0625rem dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.cw-search-empty--none {
  color: var(--color-text);
  border-style: solid;
  border-color: var(--color-warning-border, var(--color-border));
  background: color-mix(in srgb, var(--color-warning-bg, var(--color-surface)) 55%, var(--color-surface));
}
</style>
