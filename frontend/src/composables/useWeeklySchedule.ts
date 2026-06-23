import { computed, type ComputedRef } from 'vue'
import type { NormalizedWeekEvent, ScheduleDay, WeekEvent } from '../types/schedule'

export function useWeeklySchedule(
  eventsRef: ComputedRef<WeekEvent[]>,
  weekStartRef: ComputedRef<Date>,
  startHourRef: ComputedRef<number>,
  endHourRef: ComputedRef<number>
) {
  const dayFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
  const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

  function parseTime(value: string) {
    const [hourRaw, minuteRaw] = value.split(':')
    const hour = Number.parseInt(hourRaw, 10)
    const minute = Number.parseInt(minuteRaw, 10)

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null
    }

    return hour * 60 + minute
  }

  function formatTimeLabel(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const days = computed<ScheduleDay[]>(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStartRef.value)
      date.setDate(weekStartRef.value.getDate() + index)

      return {
        index,
        date,
        weekdayLabel: dayFormatter.format(date),
        dateLabel: dateFormatter.format(date),
        isToday: date.toDateString() === new Date().toDateString(),
      }
    })
  })

  const normalizedEvents = computed<NormalizedWeekEvent[]>(() => {
    return eventsRef.value
      .map((event) => {
        const start = parseTime(event.startTime)
        const end = parseTime(event.endTime)

        if (start == null || end == null || end <= start || event.dayIndex < 0 || event.dayIndex > 6) {
          return null
        }

        return { ...event, start, end, columnIndex: 0, columnCount: 1 }
      })
      .filter((event): event is NormalizedWeekEvent => !!event)
      .sort((first, second) => {
        if (first.dayIndex !== second.dayIndex) {
          return first.dayIndex - second.dayIndex
        }

        return first.start - second.start
      })
  })

  function assignColumns(events: NormalizedWeekEvent[]): NormalizedWeekEvent[] {
    const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end)
    const columns: number[] = []

    const withCol = sorted.map(event => {
      let col = columns.findIndex(endTime => endTime <= event.start)
      if (col === -1) {
        col = columns.length
        columns.push(0)
      }
      columns[col] = event.end
      return { ...event, columnIndex: col }
    })

    return withCol.map(event => {
      const columnCount = withCol.reduce((max, other) => {
        if (other.start < event.end && other.end > event.start) {
          return Math.max(max, other.columnIndex + 1)
        }
        return max
      }, 1)
      return { ...event, columnCount }
    })
  }

  const eventsByDay = computed(() => {
    return days.value.map(day => assignColumns(normalizedEvents.value.filter(event => event.dayIndex === day.index)))
  })

  const hourSlots = computed(() => {
    const slots: number[] = []

    for (let hour = startHourRef.value; hour <= endHourRef.value; hour += 1) {
      slots.push(hour * 60)
    }

    return slots
  })

  const totalMinutes = computed(() => (endHourRef.value - startHourRef.value) * 60)

  const hasEvents = computed(() => normalizedEvents.value.length > 0)

  function eventStyle(start: number, end: number, columnIndex = 0, columnCount = 1) {
    const gridStart = startHourRef.value * 60
    const effectiveStart = Math.max(start, gridStart)
    const effectiveEnd = Math.min(end, gridStart + totalMinutes.value)
    const startOffset = ((effectiveStart - gridStart) / totalMinutes.value) * 100
    const height = ((effectiveEnd - effectiveStart) / totalMinutes.value) * 100
    const width = 100 / columnCount
    const left = columnIndex * width

    return {
      top: `${startOffset}%`,
      height: `${Math.max(height, 3)}%`,
      left: `${left}%`,
      width: `${width}%`,
      right: 'auto',
    }
  }

  return {
    days,
    eventsByDay,
    hourSlots,
    totalMinutes,
    hasEvents,
    formatTimeLabel,
    eventStyle,
  }
}
