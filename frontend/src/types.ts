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

export interface ModuleEntry {
  id: string
  code: string
  name: string
  start_semester: string
  coordinator: string
  version: number
  details: Record<string, unknown>
  recommended_semester: number | null
  courses: Course[]
}

export interface HandbookOption {
  id: string
  code: string
  label: string
}
