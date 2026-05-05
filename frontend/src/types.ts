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

// ── enum-candidate value sets ────────────────────────────────────────────
//
// Treat the `KNOWN_*` arrays as advisory: a freshly scraped record may carry
// an unknown value if the upstream Modulhandbuch added one. Discovered
// values across the 1506-module crawl are listed; widen as new ones surface.

export const KNOWN_MODULE_TYPES = ['PM', 'WPM'] as const
export type ModuleType = (typeof KNOWN_MODULE_TYPES)[number]

/** Single-language values; mixed-language strings are decomposed into a `ModuleDetails.language_*` triple. */
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
/**
 * Lehrveranstaltungs-Typ atoms. A single course commonly carries several at
 * once; APEX renders them comma-joined ("V, Ü", "V, Ü, LÜ, W"). The
 * top-level `Course.course_type` string keeps that raw display string;
 * `CourseDetails.course_types` is the parsed list.
 */
export type CourseType = (typeof KNOWN_COURSE_TYPES)[number]

/**
 * Decomposed view of an APEX exam code such as "K90", "M", "SP",
 * "SP (LP, PR, AB)" or "SP (TE)".
 *
 *   - `form`         leading letters: K (Klausur), M (mündlich), SP (Studienprojekt), …
 *   - `duration_min` present only when the form is followed by digits (K90 → 90)
 *   - `components`   comma-split contents of the trailing parenthesis (LP, PR, AB, TE, …)
 *   - `raw`          original APEX string, always preserved
 */
export interface ExamCode {
  form: string | null
  duration_min: number | null
  components: string[] | null
  raw: string
}

/**
 * Typed contract for `modules.details` (JSONB). Holds everything the scrape
 * surfaces beyond what the SQL columns capture, plus parsed / derived views
 * of the top-level raw columns so consumers don't have to re-parse.
 */
export interface ModuleDetails {
  // ── parsed / derived views of top-level raw columns ──────────────────
  /** `coordinator` split into parts. `login` is null when the coordinator is a role (e.g. "Studiendekan*in / Studiengangsleiter*in AIN"). */
  coordinator_name: string
  coordinator_login: string | null
  /** Specialization-track id derived from `code`, e.g. "AI" / "SE" / "WB1". Null for non-specialization modules. */
  specialization_track: string | null
  /** Richer module-type than the boolean `is_mandatory` (allows null + future values like ZM). */
  module_type: ModuleType | string | null
  /** `language` decomposed: primary / optional secondary / whether the secondary is on-demand ("ggf."). */
  language_primary: LanguagePrimary | null
  language_secondary: LanguagePrimary | null
  language_secondary_optional: boolean
  /** Sortable form of `start_semester`. Null for cohort codes ("A", "B", "A/B"); equal min/max for a single integer. */
  start_semester_min: number | null
  start_semester_max: number | null

  // ── workload / scheduling ────────────────────────────────────────────
  contact_hours: number | null
  self_study_hours: number | null
  /** (contact + self_study) / 30. Authoritative ECTS = sum of `Course.ects`. */
  ects_total_computed: number | null
  semester_count: number | null
  /** When the module starts; both can be true (offered each semester). */
  start_phases: StartPhase[]

  // ── pedagogy ─────────────────────────────────────────────────────────
  learning_formats: (LearningFormat | string)[]
  /** APEX `_MISC` override, used by IPSS/BARB/etc. when no enum value applies. */
  learning_formats_misc: string | null

  // ── examination ──────────────────────────────────────────────────────
  exam_graded: ExamCode | null
  exam_ungraded: ExamCode | null
  performance_record: ExamCode | null
  grade_composition_rule: string | null
  grade_composition_misc: string | null

  // ── relations to other modules ───────────────────────────────────────
  /** Original German prose, retained verbatim. */
  prerequisites_text: string | null
  /** Module codes regex-extracted from the prose; loose, not yet FKs. */
  prerequisites_codes: string[]
  needed_for_text: string | null
  needed_for_codes: string[]
  combine_with_text: string | null
  combine_with_codes: string[]

  // ── free-text content ────────────────────────────────────────────────
  learning_objectives: string | null
  personal_competencies: string | null
  literature: string | null

  // ── provenance (so we can re-fetch / diff against APEX) ──────────────
  source_apex_mhid: number | null
  source_apex_mid: number | null
  source_handbook_label: string | null
  /** ISO date parsed from the German "DD.MM.YYYY" `Letzte Änderung` field. */
  last_updated: string | null
}

/**
 * Typed contract for `courses.details` (JSONB). Course-level metadata
 * surfaced beyond the SQL columns.
 */
export interface CourseDetails {
  /** `course_type` parsed into atoms; always check membership via `.includes('V')`. */
  course_types: (CourseType | string)[]
  /** `coordinator` split. `login` is null when the responsible is a role. */
  responsible_name: string | null
  responsible_login: string | null
  /** APEX `weitere Dozierende` — free-text list, not yet parsed into individuals. */
  additional_teachers: string | null
  exam_graded: ExamCode | null
  exam_ungraded: ExamCode | null
  performance_record: ExamCode | null
  /** "Lehrinhalt" — typically arrives as HTML (`<ul><li>…</li></ul>`). */
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
  /**
   * Typed JSONB. Always present (DB default `'{}'::jsonb`); fields inside
   * are individually nullable when the upstream data is absent.
   */
  details: CourseDetails
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
  /**
   * Typed JSONB. Always present (DB default `'{}'::jsonb`); fields inside
   * are individually nullable when the upstream data is absent.
   */
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

/**
 * Row returned by the `view_modules_table` Postgres view — the slim payload
 * designed for the modules-overview list page.
 *
 * The view aliases `code` → `kuerzel` and `coordinator` → `koordinator`
 * (German names from the SQL `AS` clauses); preserve those keys here so
 * Supabase result rows match this type without re-mapping.
 *
 * Source: supabase/migrations/20260428163153_update_modules_structure.sql
 */
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

export interface HandbookOption {
  id: string
  code: string
  label: string
}
