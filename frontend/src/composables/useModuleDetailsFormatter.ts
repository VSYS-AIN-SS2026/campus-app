import type { ExamCode, ModuleEntry } from '../types'

export type DetailKind = 'workload' | 'pruefung' | 'voraussetzungen' | 'html' | 'object' | 'text'

export interface DetailItem {
  key: string
  label: string
  kind: DetailKind
  raw: unknown
}

const TYPE_SHORT: Record<string, string> = {
  vorlesung: 'V',
  lecture: 'V',
  praktikum: 'P',
  seminar: 'S',
  'übung': 'Ü',
  exercise: 'Ü',
  uebung: 'Ü',
}

const TYPE_FULL: Record<string, string> = {
  vorlesung: 'Vorlesung',
  lecture: 'Vorlesung',
  praktikum: 'Praktikum',
  seminar: 'Seminar',
  'übung': 'Übung',
  exercise: 'Übung',
  uebung: 'Übung',
}

const WORKLOAD_KEYS = new Set(['workload'])
const PRUEFUNG_KEYS = new Set(['pruefung', 'prüfung', 'exam', 'pruefungsform', 'prüfungsform'])
const VORAUSS_KEYS = new Set(['voraussetzungen', 'prerequisites', 'voraussetzung'])

const KEY_LABELS: Record<string, string> = {
  beschreibung: 'Beschreibung',
  description: 'Beschreibung',
  lernziele: 'Lernziele',
  learning_objectives: 'Lernziele',
  voraussetzungen: 'Voraussetzungen',
  prerequisites: 'Voraussetzungen',
  voraussetzung: 'Voraussetzungen',
  literatur: 'Literatur',
  literature: 'Literatur',
  sprache: 'Sprache',
  language: 'Sprache',
  pruefung: 'Prüfung',
  'prüfung': 'Prüfung',
  exam: 'Prüfungsform',
  pruefungsform: 'Prüfungsform',
  'prüfungsform': 'Prüfungsform',
  workload: 'Workload',
  niveau: 'Niveau',
}

const HTML_RE = /<[a-z][\s\S]*>/i

const EXAM_FORM_LABELS: Record<string, string> = {
  K: 'Klausur',
  M: 'mündlich',
  H: 'Hausarbeit',
  R: 'Referat',
  SP: 'Studienprojekt',
  TE: 'Testate',
  LP: 'Laborprotokoll',
  PR: 'Präsentation',
  AB: 'Ausarbeitung',
}

const HANDLED_DETAIL_KEYS = new Set([
  'coordinator_name', 'coordinator_login', 'specialization_track', 'module_type',
  'language_primary', 'language_secondary', 'language_secondary_optional',
  'start_semester_min', 'start_semester_max', 'semester_count', 'start_phases',
  'contact_hours', 'self_study_hours', 'ects_total_computed',
  'learning_formats', 'learning_formats_misc',
  'exam_graded', 'exam_ungraded', 'performance_record',
  'grade_composition_rule', 'grade_composition_misc',
  'prerequisites_text', 'prerequisites_codes',
  'needed_for_text', 'needed_for_codes',
  'combine_with_text', 'combine_with_codes',
  'learning_objectives', 'personal_competencies', 'literature',
  'source_apex_mhid', 'source_apex_mid', 'source_handbook_label', 'last_updated',
])

function kindOf(key: string, value: unknown): DetailKind {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return 'object'
  if (typeof value === 'string' && HTML_RE.test(value)) return 'html'
  const lowered = key.toLowerCase()
  if (WORKLOAD_KEYS.has(lowered)) return 'workload'
  if (PRUEFUNG_KEYS.has(lowered)) return 'pruefung'
  if (VORAUSS_KEYS.has(lowered)) return 'voraussetzungen'
  return 'text'
}

export function useModuleDetailsFormatter() {
  function typeShort(value: string) {
    return TYPE_SHORT[value.toLowerCase()] ?? value.charAt(0).toUpperCase()
  }

  function typeFull(value: string) {
    return TYPE_FULL[value.toLowerCase()] ?? value
  }

  function statusLabel(status: 'offen' | 'belegt' | 'abgeschlossen'): string {
    switch (status) {
      case 'belegt':
        return 'Belegt'
      case 'abgeschlossen':
        return 'Abgeschlossen'
      default:
        return 'Offen'
    }
  }

  function formatKey(key: string): string {
    return KEY_LABELS[key.toLowerCase()] ?? key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  }

  function htmlToText(value: unknown): string {
    return String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .trim()
  }

  function parseWorkload(value: unknown): { hours: string; note: string } {
    const source = String(value ?? '').trim()
    const match = source.match(/^(\d+(?:[.,]\d+)?)\s*(h|std\.?|stunden?)?\s*(.*)$/i)
    if (match) {
      return { hours: `${match[1]} h`, note: (match[3] ?? '').trim() }
    }
    return { hours: source, note: '' }
  }

  function splitReqs(value: unknown): string[] {
    return String(value ?? '').split(/[,;\n]+/).map(part => part.trim()).filter(Boolean)
  }

  function objectEntries(raw: unknown): [string, unknown][] {
    return Object.entries(raw as Record<string, unknown>).filter(([, value]) => value != null && value !== '')
  }

  function formatExam(code: ExamCode | null | undefined): string | null {
    if (!code) return null
    if (!code.form) return code.raw
    if (code.form === 'K' && code.duration_min) {
      return `${code.raw} (${code.duration_min} Min Klausur)`
    }
    const formLabel = EXAM_FORM_LABELS[code.form]
    if (formLabel && !code.components) {
      return `${code.raw} (${formLabel})`
    }
    return code.raw
  }

  function moduleTypeLabel(module: ModuleEntry): string {
    const moduleType = module.details?.module_type
    if (moduleType === 'PM') return 'Pflichtmodul (PM)'
    if (moduleType === 'WPM') return 'Wahlpflichtmodul (WPM)'
    return module.is_mandatory ? 'Pflichtmodul (PM)' : 'Wahlpflichtmodul (WPM)'
  }

  function buildItems(details: Record<string, unknown>): DetailItem[] {
    return Object.entries(details)
      .filter(([key, value]) => value != null && value !== '' && !HANDLED_DETAIL_KEYS.has(key))
      .map(([key, value]) => ({ key, label: formatKey(key), kind: kindOf(key, value), raw: value }))
  }

  return {
    buildItems,
    formatExam,
    formatKey,
    htmlToText,
    moduleTypeLabel,
    objectEntries,
    parseWorkload,
    splitReqs,
    statusLabel,
    typeFull,
    typeShort,
  }
}
