export interface Faculty {
  id: string
  code: string
  name: string | null
}

export interface StudyProgram {
  id: string
  faculty_id: string
  code: string
  name: string | null
}

export interface Spo {
  id: string
  study_program_id: string
  version_name: string
  valid_from: string | null
}

export interface ModuleHandbook {
  id: string
  spo_id: string
  code: string
}

export interface UserProfile {
  id: string
  full_name: string
  email: string
  study_program_id: string | null
  spo_id: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  module_id: string
  code: string
  name: string
  course_type: string
  coordinator: string | null
  ects: number
  sws: number
  details: Record<string, unknown>
}

export interface ModuleCategory {
  id: string
  name: string
  color: string | null
  type: string | null
}

export type ModuleStatus = 'offen' | 'belegt' | 'abgeschlossen'

export interface ModuleEntry {
  id: string
  code: string
  name: string
  start_semester: string
  coordinator: string
  version: number
  details: Record<string, unknown>
  is_mandatory: boolean
  is_specialization: boolean
  specialization_name: string | null
  language: string
  categories: ModuleCategory[]
  recommended_semester: number | null
  courses: Course[]
  module_status: ModuleStatus
}

export interface HandbookOption {
  id: string
  code: string
  label: string
}
