import { computed, type Ref } from 'vue'
import type {
  CombinedWeekMember,
  MemberScheduleSlot,
  MergedBusyBlock,
} from '../types/teamWeek'

// Feste Palette für Mitglieder-Icons (zyklisch).
const MEMBER_PALETTE = [
  '#2563eb', '#db2777', '#059669', '#d97706',
  '#7c3aed', '#0891b2', '#dc2626', '#65a30d',
]

function parseTime(value: string): number | null {
  const [hourRaw, minuteRaw] = value.split(':')
  const hour = Number.parseInt(hourRaw, 10)
  const minute = Number.parseInt(minuteRaw, 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null
  }
  return hour * 60 + minute
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * Fasst die Belegt-Zeiten mehrerer Mitglieder pro Wochentag zusammen.
 * Sweep-Line: an jeder Intervallgrenze wird die Menge der belegten
 * Mitglieder bestimmt; benachbarte Segmente mit identischer Mitglieder-
 * Menge werden zu einem Block verschmolzen (identische Slots → ein Block,
 * Teilüberlappungen → segmentierte Blöcke).
 */
export function useCombinedWeek(
  members: Ref<CombinedWeekMember[]>,
  slots: Ref<MemberScheduleSlot[]>,
) {
  const memberById = computed(
    () => new Map(members.value.map((member) => [member.id, member])),
  )

  const memberColor = computed(
    () => new Map(members.value.map((member, index) => [
      member.id,
      MEMBER_PALETTE[index % MEMBER_PALETTE.length],
    ])),
  )

  // 'deselected' (abgewählt) wird vollständig entfernt; 'hidden' und 'active'
  // zählen beide als belegt.
  const busySlots = computed(
    () => slots.value.filter((slot) => (slot.state ?? 'active') !== 'deselected'),
  )

  function mergeDay(dayIndex: number): MergedBusyBlock[] {
    const intervals = busySlots.value
      .filter((slot) => slot.dayIndex === dayIndex)
      .map((slot) => ({
        memberId: slot.memberId,
        start: parseTime(slot.startTime),
        end: parseTime(slot.endTime),
      }))
      .filter(
        (interval): interval is { memberId: string; start: number; end: number } =>
          interval.start != null && interval.end != null && interval.end > interval.start,
      )

    if (intervals.length === 0) {
      return []
    }

    const points = Array.from(
      new Set(intervals.flatMap((interval) => [interval.start, interval.end])),
    ).sort((first, second) => first - second)

    const segments: Array<{ start: number; end: number; memberIds: string[] }> = []

    for (let index = 0; index < points.length - 1; index += 1) {
      const segStart = points[index]
      const segEnd = points[index + 1]

      const memberIds = Array.from(
        new Set(
          intervals
            .filter((interval) => interval.start <= segStart && interval.end >= segEnd)
            .map((interval) => interval.memberId),
        ),
      ).sort()

      if (memberIds.length === 0) {
        continue
      }

      const previous = segments[segments.length - 1]
      if (previous && previous.end === segStart && sameMembers(previous.memberIds, memberIds)) {
        previous.end = segEnd
      } else {
        segments.push({ start: segStart, end: segEnd, memberIds })
      }
    }

    return segments.map((segment) => ({
      dayIndex,
      start: segment.start,
      end: segment.end,
      startTime: formatTime(segment.start),
      endTime: formatTime(segment.end),
      memberIds: segment.memberIds,
    }))
  }

  const mergedByWeekday = computed<MergedBusyBlock[][]>(
    () => Array.from({ length: 7 }, (_, dayIndex) => mergeDay(dayIndex)),
  )

  return { memberById, memberColor, mergedByWeekday }
}
