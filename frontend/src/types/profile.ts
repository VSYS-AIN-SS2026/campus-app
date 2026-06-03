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
  matrikel_nr: string | null
  created_at: string
  updated_at: string
}

export interface HandbookOption {
  id: string
  code: string
  label: string
}
