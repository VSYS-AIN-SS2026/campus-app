import type { ModuleStatus } from './module'

export type WeekEventStatus = ModuleStatus

export interface WeekEvent {
  id: string
  seriesId: string
  occurrenceId?: string
  dayIndex: number
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
