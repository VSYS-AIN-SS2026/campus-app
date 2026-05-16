import { computed, type ComputedRef } from 'vue'

export type WeekEventStatus = 'offen' | 'belegt' | 'abgeschlossen'

export interface WeekEvent {
  id: string
  dayIndex: number
  title: string
  subtitle?: string
  startTime: string
  endTime: string
  status: WeekEventStatus
}

export interface NormalizedWeekEvent extends WeekEvent {
  start: number
  end: number
}

export interface ScheduleDay {
  index: number
  date: Date
  weekdayLabel: string
  dateLabel: string
  isToday: boolean
}

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

        return { ...event, start, end }
      })
      .filter((event): event is NormalizedWeekEvent => !!event)
      .sort((first, second) => {
        if (first.dayIndex !== second.dayIndex) {
          return first.dayIndex - second.dayIndex
        }

        return first.start - second.start
      })
  })

  const eventsByDay = computed(() => {
    return days.value.map(day => normalizedEvents.value.filter(event => event.dayIndex === day.index))
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

  function eventStyle(start: number, end: number) {
    const startOffset = ((start - startHourRef.value * 60) / totalMinutes.value) * 100
    const height = ((end - start) / totalMinutes.value) * 100

    return {
      top: `${Math.max(startOffset, 0)}%`,
      height: `${Math.max(height, 3)}%`,
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
