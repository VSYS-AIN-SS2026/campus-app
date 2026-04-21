export interface Spo {
  id: number
  name: string
  short_name: string
  degree: string
  valid_from: number | null
}

export interface Module {
  id: number
  name: string
  short_name: string | null
  ects: number
  semester_recommendation: number | null
  description: string | null
}

export interface SpoModule extends Module {
  is_mandatory: boolean
  module_group: string | null
}
