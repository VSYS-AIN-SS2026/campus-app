export const KNOWN_MODULE_TYPES = ['PM', 'WPM'] as const
export type ModuleType = (typeof KNOWN_MODULE_TYPES)[number]

export const KNOWN_LANGUAGE_PRIMARIES = ['Deutsch', 'Englisch'] as const
export type LanguagePrimary = (typeof KNOWN_LANGUAGE_PRIMARIES)[number]

export const KNOWN_START_PHASES = ['Sommersemester', 'Wintersemester'] as const
export type StartPhase = (typeof KNOWN_START_PHASES)[number]

export const KNOWN_LEARNING_FORMATS = [
  'Vorlesung',
  'Übung',
  'Praktikum',
  'Seminar',
  'Selbststudium',
  'Labor',
  'Workshop/Seminar',
  'Projekt',
  'Hausarbeit',
  'E-Learning',
  'Exkursion',
  'Intensivsprachkurs',
] as const
export type LearningFormat = (typeof KNOWN_LEARNING_FORMATS)[number]

export const KNOWN_COURSE_TYPES = ['V', 'Ü', 'P', 'S', 'LÜ', 'W', 'PJ', 'PSS', 'X'] as const
export type CourseType = (typeof KNOWN_COURSE_TYPES)[number]

export interface ExamCode {
  form: string | null
  duration_min: number | null
  components: string[] | null
  raw: string
}

export interface ModuleDetails {
  coordinator_name: string
  coordinator_login: string | null
  specialization_track: string | null
  module_type: ModuleType | string | null
  language_primary: LanguagePrimary | null
  language_secondary: LanguagePrimary | null
  language_secondary_optional: boolean
  start_semester_min: number | null
  start_semester_max: number | null

  contact_hours: number | null
  self_study_hours: number | null
  ects_total_computed: number | null
  semester_count: number | null
  start_phases: StartPhase[]

  learning_formats: (LearningFormat | string)[]
  learning_formats_misc: string | null

  exam_graded: ExamCode | null
  exam_ungraded: ExamCode | null
  performance_record: ExamCode | null
  grade_composition_rule: string | null
  grade_composition_misc: string | null

  prerequisites_text: string | null
  prerequisites_codes: string[]
  needed_for_text: string | null
  needed_for_codes: string[]
  combine_with_text: string | null
  combine_with_codes: string[]

  learning_objectives: string | null
  personal_competencies: string | null
  literature: string | null

  source_apex_mhid: number | null
  source_apex_mid: number | null
  source_handbook_label: string | null
  last_updated: string | null
}

export interface CourseDetails {
  course_types: (CourseType | string)[]
  responsible_name: string | null
  responsible_login: string | null
  additional_teachers: string | null
  exam_graded: ExamCode | null
  exam_ungraded: ExamCode | null
  performance_record: ExamCode | null
  syllabus: string | null
  source_apex_cid: number | null
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
  details: CourseDetails
}

export interface ModuleCategory {
  id: string
  name: string
  color: string | null
  type: string | null
}

export interface Category {
  id: string
  name: string
  color: string
  type: string
}

export type ModuleStatus = 'offen' | 'belegt' | 'abgeschlossen'

export interface ModuleEntry {
  id: string
  code: string
  name: string
  start_semester: string
  coordinator: string
  version: number
  details: ModuleDetails
  is_mandatory: boolean
  is_specialization: boolean
  specialization_name: string | null
  language: string
  recommended_semester: number | null
  categories: Category[]
  courses: Course[]
  module_status: ModuleStatus
}

export interface ModuleListItem {
  id: string
  kuerzel: string
  name: string
  start_semester: string
  koordinator: string
  version: number
  is_mandatory: boolean
  is_specialization: boolean
  specialization_name: string | null
  language: string
}
