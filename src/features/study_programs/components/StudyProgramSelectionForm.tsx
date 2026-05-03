'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Spo } from '../types/spo.types'
import type { StudyProgram } from '../types/studyProgram.types'

type Props = {
  initialSpoId?: string
  initialStudyProgramId?: string
  spos: Spo[]
  studyPrograms: StudyProgram[]
}

function getStudyProgramLabel(program: StudyProgram) {
  return program.name ? `${program.code} - ${program.name}` : program.code
}

function getSpoLabel(spo: Spo) {
  return spo.valid_from ? `${spo.version_name} · gültig ab ${spo.valid_from}` : spo.version_name
}

function getUniqueSposForStudyProgram(spos: Spo[], studyProgramId: string | undefined) {
  if (!studyProgramId) {
    return []
  }

  const uniqueSpos = new Map<string, Spo>()

  for (const spo of spos) {
    if (spo.study_program_id !== studyProgramId) {
      continue
    }

    const key = spo.version_name.trim().toLowerCase()
    const existingSpo = uniqueSpos.get(key)

    if (!existingSpo) {
      uniqueSpos.set(key, spo)
      continue
    }

    if (!existingSpo.valid_from && spo.valid_from) {
      uniqueSpos.set(key, spo)
    }
  }

  return Array.from(uniqueSpos.values())
}

export function StudyProgramSelectionForm({
  initialSpoId,
  initialStudyProgramId,
  spos,
  studyPrograms,
}: Props) {
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState(initialStudyProgramId ?? '')
  const [selectedSpoId, setSelectedSpoId] = useState(initialSpoId ?? '')

  const availableSpos = useMemo(
    () => getUniqueSposForStudyProgram(spos, selectedStudyProgramId || undefined),
    [selectedStudyProgramId, spos]
  )

  useEffect(() => {
    if (!selectedSpoId) {
      return
    }

    const selectedSpoIsAvailable = availableSpos.some((spo) => spo.id === selectedSpoId)

    if (!selectedSpoIsAvailable) {
      setSelectedSpoId('')
    }
  }, [availableSpos, selectedSpoId])

  const selectedStudyProgram =
    studyPrograms.find((program) => program.id === selectedStudyProgramId) ?? null
  const selectedSpo = availableSpos.find((spo) => spo.id === selectedSpoId) ?? null

  return (
    <section className="card-grid two-columns">
      <article className="panel">
        <h2>Auswahl treffen</h2>
        <form action="/profile" method="GET">
          <div className="field">
            <label htmlFor="study-program-select">Studiengang</label>
            <select
              className="select"
              id="study-program-select"
              name="studyProgramId"
              onChange={(event) => {
                setSelectedStudyProgramId(event.target.value)
              }}
              value={selectedStudyProgramId}
            >
              <option value="">Studiengang auswählen</option>
              {studyPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {getStudyProgramLabel(program)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="spo-select">SPO</label>
            <select
              className="select"
              disabled={!selectedStudyProgram || availableSpos.length === 0}
              id="spo-select"
              name="spoId"
              onChange={(event) => {
                setSelectedSpoId(event.target.value)
              }}
              value={selectedSpoId}
            >
              <option value="">
                {selectedStudyProgram
                  ? availableSpos.length > 0
                    ? 'SPO auswählen'
                    : 'Keine SPOs verfügbar'
                  : 'Erst Studiengang auswählen'}
              </option>
              {availableSpos.map((spo) => (
                <option key={spo.id} value={spo.id}>
                  {getSpoLabel(spo)}
                </option>
              ))}
            </select>
          </div>

          <p className="helper-text">
            Studiengang und SPO können jetzt direkt in einem Schritt ausgewählt werden. Doppelte
            SPO-Einträge mit gleichem Namen werden in der Anzeige defensiv zusammengefasst.
          </p>

          <div className="actions">
            <button className="button" type="submit">
              Im Profil anzeigen
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h2>Vorschau</h2>
        {selectedStudyProgram ? (
          <p className="status status-success">{getStudyProgramLabel(selectedStudyProgram)}</p>
        ) : (
          <p className="status">Noch keine Auswahl getroffen.</p>
        )}
        <div className="selection-summary">
          <span className="summary-label">SPO</span>
          {selectedSpo ? (
            <p className="status status-success">{getSpoLabel(selectedSpo)}</p>
          ) : selectedStudyProgram ? (
            <p className="status">Noch keine SPO ausgewählt.</p>
          ) : (
            <p className="status">Wird nach der Studiengangswahl verfügbar.</p>
          )}
        </div>
        <p>
          Später kann hier eine echte Profilzuordnung mit Studierendenkonto, Immatrikulation und
          SPO-Version angeschlossen werden.
        </p>
      </article>
    </section>
  )
}
