import type { ModuleStatus } from './module'

export type WeekEventStatus = ModuleStatus

export interface WeekEvent {
  id: string
  seriesId: string
  occurrenceId?: string
  dayIndex: number
  /**
   * Lokaler Kalendertag ('YYYY-MM-DD'), an dem dieses Event stattfindet.
   * Gesetzt für datumsgebundene Events (z. B. Team-Termine), die nur in der
   * konkreten Woche erscheinen sollen. Ohne Wert gilt das Event als
   * wöchentlich wiederkehrend (über `dayIndex`).
   */
  date?: string
  title: string
  subtitle?: string
  startTime: string
  endTime: string
  status: WeekEventStatus
  isHidden?: boolean
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

export interface UserEvent {
  id: string
  lsf_event_id: string | null
  title: string
  subtitle: string | null
  day_index: number
  start_time: string
  end_time: string
  series_id: string
  status: string
  created_at: string
}

export type UserEventRow = {
  id: string
  lsf_event_id: string | null
  title: string
  subtitle: string | null
  day_index: number
  start_time: string
  end_time: string
  series_id: string
  status: string
  created_at: string
}
