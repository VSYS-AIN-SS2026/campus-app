import { describe, it, expect } from 'vitest'
import { moduleEcts, computeStudyProgress } from './progress'
import type { ModuleEntry } from '../types'

function mod(o: {
  id: string
  ectsTotal?: number | null
  courseEcts?: number[]
  mandatory?: boolean
  status?: ModuleEntry['module_status']
}): ModuleEntry {
  return {
    id: o.id,
    code: o.id,
    name: o.id,
    start_semester: '1',
    coordinator: '',
    version: 1,
    details: { ects_total_computed: o.ectsTotal ?? null } as ModuleEntry['details'],
    is_mandatory: o.mandatory ?? false,
    is_specialization: false,
    specialization_name: null,
    language: 'Deutsch',
    recommended_semester: null,
    categories: [],
    courses: (o.courseEcts ?? []).map(
      (e, i) => ({ id: `${o.id}-c${i}`, ects: e }) as ModuleEntry['courses'][number],
    ),
    module_status: o.status ?? 'offen',
  } as ModuleEntry
}

describe('moduleEcts', () => {
  it('prefers details.ects_total_computed over course sums', () => {
    expect(moduleEcts(mod({ id: 'a', ectsTotal: 8, courseEcts: [0, 0] }))).toBe(8)
  })
  it('falls back to summing course ects when the module total is missing', () => {
    expect(moduleEcts(mod({ id: 'b', ectsTotal: null, courseEcts: [2, 3] }))).toBe(5)
  })
  it('uses the module total even when courses also have ects', () => {
    expect(moduleEcts(mod({ id: 'c', ectsTotal: 6, courseEcts: [4] }))).toBe(6)
  })
  it('is 0 when neither source has ects', () => {
    expect(moduleEcts(mod({ id: 'd' }))).toBe(0)
  })
})

describe('computeStudyProgress', () => {
  // A small AIN-like SPO: Pflicht (Grundstudium) + Wahlpflicht per Vertiefung
  // (AI / SE / ES) + a chosen Studium-Generale module.
  const modules = [
    mod({ id: 'MAT1', mandatory: true, ectsTotal: 8, status: 'abgeschlossen' }),
    mod({ id: 'GDP', mandatory: true, ectsTotal: 7, status: 'belegt' }),
    mod({ id: 'ADS', mandatory: true, ectsTotal: 5, status: 'offen' }),
    mod({ id: 'KI', mandatory: false, ectsTotal: 6, status: 'abgeschlossen' }), // chosen WPM (AI)
    mod({ id: 'SE-WPM', mandatory: false, ectsTotal: 6, status: 'offen' }), // unchosen (SE)
    mod({ id: 'ES-WPM', mandatory: false, ectsTotal: 5, status: 'offen' }), // unchosen (ES)
    mod({ id: 'SG-Rhetorik', mandatory: false, courseEcts: [4], status: 'belegt' }), // chosen SG
  ]
  const p = computeStudyProgress(modules)

  it('plan = all Pflicht + chosen electives, excluding unchosen Wahlpflicht', () => {
    expect(p.plannedEcts).toBe(30) // 8+7+5 (PM) + 6 (KI) + 4 (SG); SE/ES offen excluded
  })
  it('completed = abgeschlossen ects', () => {
    expect(p.completedEcts).toBe(14) // MAT1 8 + KI 6
  })
  it('in progress = belegt ects', () => {
    expect(p.inProgressEcts).toBe(11) // GDP 7 + SG 4
  })
  it('percent = completed / planned', () => {
    expect(p.percent).toBe(47) // round(14 / 30 * 100)
  })
  it('Studium Generale contributes ects once chosen', () => {
    const withoutSg = computeStudyProgress(modules.filter((m) => m.id !== 'SG-Rhetorik'))
    expect(p.plannedEcts - withoutSg.plannedEcts).toBe(4)
    expect(p.inProgressEcts - withoutSg.inProgressEcts).toBe(4)
  })
  it('empty input yields zeros', () => {
    expect(computeStudyProgress([])).toEqual({
      completedEcts: 0,
      inProgressEcts: 0,
      plannedEcts: 0,
      percent: 0,
    })
  })
})
