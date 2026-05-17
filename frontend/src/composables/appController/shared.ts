import type {
  ModuleEntry,
  ModuleStatus,
  Spo,
  StudyProgram,
} from '../../types'

export type ModuleStatusRow = {
  module_id: string
  status: ModuleStatus
  updated_at: string
}

export type ModuleCategoryRow = {
  module_id: string
  category_id: string
  name: string
  color: string
  type: string
}

export type PlannerView = 'week' | 'modules'

export type WeeklyScheduleEvent = {
  id: string
  seriesId: string
  occurrenceId?: string
  dayIndex: number
  title: string
  subtitle?: string
  startTime: string
  endTime: string
  status: ModuleStatus
}

export type HiddenSeriesRow = {
  series_id: string
  updated_at: string
}

export type HiddenOccurrenceRow = {
  occurrence_id: string
  updated_at: string
}

export type WeeklyScheduleRpcRow = {
  event_id: string
  occurrence_id: string
  series_id: string
  module_id: string
  module_code: string
  module_name: string
  module_status: ModuleStatus
  weekday_index: number
  day_date: string
  start_time: string
  end_time: string
  start_time_minutes: number
  end_time_minutes: number
  title: string
  subtitle: string | null
  is_hidden_series: boolean
  is_hidden_occurrence: boolean
  is_hidden: boolean
}

let activeModuleRequestId = 0

export function beginModuleRequest() {
  activeModuleRequestId += 1
  return activeModuleRequestId
}

export function isActiveModuleRequest(requestId: number) {
  return requestId === activeModuleRequestId
}

export function getStudyProgramLabel(program: StudyProgram) {
  return program.name ? `${program.code} - ${program.name}` : program.code
}

export function getSpoLabel(spo: Spo) {
  return spo.valid_from ? `${spo.version_name} · gültig ab ${spo.valid_from}` : spo.version_name
}

export function getUniqueSposForStudyProgram(spos: Spo[], studyProgramId: string | null) {
  if (!studyProgramId) {
    return []
  }

  const uniqueSpos = new Map<string, Spo>()

  for (const spo of spos) {
    if (spo.study_program_id !== studyProgramId) {
      continue
    }

    const key = `${spo.version_name.trim().toLowerCase()}::${spo.valid_from ?? ''}`

    if (!uniqueSpos.has(key)) {
      uniqueSpos.set(key, spo)
    }
  }

  return Array.from(uniqueSpos.values())
}

export function getStartOfCurrentWeek(referenceDate: Date) {
  const date = new Date(referenceDate)
  const weekday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - weekday)
  date.setHours(0, 0, 0, 0)
  return date
}

export function toTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function shouldReplaceModule(existingModule: ModuleEntry, nextModule: ModuleEntry) {
  if (existingModule.recommended_semester == null && nextModule.recommended_semester != null) {
    return true
  }

  if (
    existingModule.recommended_semester != null
    && nextModule.recommended_semester != null
    && nextModule.recommended_semester < existingModule.recommended_semester
  ) {
    return true
  }

  return false
}
