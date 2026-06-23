import type { ModuleEntry } from '../types'

/**
 * ECTS for a single module.
 *
 * Prefers the authoritative module-level total from the handbook
 * (`details.ects_total_computed`). Falls back to summing the courses' `ects`,
 * which is what older code did — but LSF-scraped / stub courses carry `ects: 0`,
 * so that fallback alone undercounts. Returns 0 when neither source has a value.
 */
export function moduleEcts(module: Pick<ModuleEntry, 'details' | 'courses'>): number {
  const fromDetails = module.details?.ects_total_computed
  if (typeof fromDetails === 'number' && fromDetails > 0) return fromDetails
  return (module.courses ?? []).reduce((sum, c) => sum + (c.ects ?? 0), 0)
}

export interface StudyProgress {
  completedEcts: number // abgeschlossen
  inProgressEcts: number // belegt
  plannedEcts: number // denominator: Pflicht (always) + chosen electives
  percent: number // completedEcts / plannedEcts, 0–100
}

/**
 * Study progress in ECTS.
 *
 * Pflichtmodule (`is_mandatory`) always count toward the plan — they're the
 * Grundstudium everyone must do. Wahlpflicht-/Wahlmodule (incl. Studium
 * Generale) count toward the plan only once the student has *chosen* them
 * (status `belegt` or `abgeschlossen`), so unchosen electives from other
 * Vertiefungsrichtungen don't inflate the total.
 *
 * `completedEcts` counts `abgeschlossen` modules; `inProgressEcts` counts
 * `belegt`. The same calculation works whether `modules` contains only the
 * SPO catalog or also includes chosen Studium-Generale modules.
 */
export function computeStudyProgress(modules: ModuleEntry[]): StudyProgress {
  let completedEcts = 0
  let inProgressEcts = 0
  let plannedEcts = 0

  for (const m of modules) {
    const ects = moduleEcts(m)
    const chosen = m.module_status === 'belegt' || m.module_status === 'abgeschlossen'
    if (m.is_mandatory || chosen) plannedEcts += ects
    if (m.module_status === 'abgeschlossen') completedEcts += ects
    else if (m.module_status === 'belegt') inProgressEcts += ects
  }

  const percent = plannedEcts > 0 ? Math.round((completedEcts / plannedEcts) * 100) : 0
  return { completedEcts, inProgressEcts, plannedEcts, percent }
}
