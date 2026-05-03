import Link from 'next/link'
import { getSpos, getStudyPrograms } from '../../../features/study_programs/api/studyProgram.api'
import type { Spo } from '../../../features/study_programs/types/spo.types'
import type { StudyProgram } from '../../../features/study_programs/types/studyProgram.types'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSingleSearchParam(value: string | string[] | undefined) {
  const resolvedValue = Array.isArray(value) ? value[0] : value

  if (!resolvedValue) {
    return undefined
  }

  return resolvedValue.trim() ? resolvedValue : undefined
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

export default async function StudyProgramsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const selectedStudyProgramId = getSingleSearchParam(resolvedSearchParams.studyProgramId)
  const selectedSpoId = getSingleSearchParam(resolvedSearchParams.spoId)

  let studyPrograms: StudyProgram[] = []
  let spos: Spo[] = []
  let errorMessage: string | null = null

  try {
    ;[studyPrograms, spos] = await Promise.all([getStudyPrograms(), getSpos()])
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Studiengänge konnten nicht geladen werden.'
  }

  const selectedStudyProgram = studyPrograms.find((program) => program.id === selectedStudyProgramId) ?? null
  const availableSpos = getUniqueSposForStudyProgram(spos, selectedStudyProgramId)
  const selectedSpo = availableSpos.find((spo) => spo.id === selectedSpoId) ?? null

  return (
    <main className="app-shell">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/">Hauptseite</Link>
        <span>/</span>
        <Link href="/profile">Profil</Link>
        <span>/</span>
        <span aria-current="page">Studiengangauswahl</span>
      </nav>

      <section className="hero hero-compact">
        <span className="eyebrow">Profilpflege</span>
        <h1>Studiengang und SPO auswählen</h1>
        <p>
          Die Auswahl liest Studiengänge aus <code>study_programs</code> und dazu passende SPOs aus
          <code> spos</code>. Für diese Story wird beides zurück ins Profil gespiegelt.
        </p>
      </section>

      {errorMessage ? (
        <article className="panel">
          <p className="status status-error">{errorMessage}</p>
          <div className="actions">
            <Link className="button button-secondary" href="/profile">
              Zurück zum Profil
            </Link>
          </div>
        </article>
      ) : studyPrograms.length === 0 ? (
        <article className="panel">
          <p className="status">Keine Studiengänge gefunden.</p>
          <p>Prüfe, ob die Tabelle `study_programs` bereits Daten enthält.</p>
        </article>
      ) : (
        <section className="card-grid two-columns">
          <article className="panel">
            <h2>Auswahl treffen</h2>
            <form action="/profile" method="GET">
              <div className="field">
                <label htmlFor="study-program-select">Studiengang</label>
                <select
                  className="select"
                  defaultValue={selectedStudyProgramId ?? ''}
                  id="study-program-select"
                  name="studyProgramId"
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
                  defaultValue={selectedSpoId ?? ''}
                  disabled={!selectedStudyProgram || availableSpos.length === 0}
                  id="spo-select"
                  name="spoId"
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
                Die Auswahl wird hier weiter ohne Persistenz simuliert. Für die UI werden doppelte
                SPO-Einträge mit gleichem Namen defensiv zusammengefasst.
              </p>

              <div className="actions">
                <button className="button" type="submit">
                  Im Profil anzeigen
                </button>
                <Link className="button button-secondary" href="/profile">
                  Abbrechen
                </Link>
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
              Später kann hier eine echte Profilzuordnung mit Studierendenkonto, Immatrikulation
              und SPO-Version angeschlossen werden.
            </p>
          </article>
        </section>
      )}
    </main>
  )
}
