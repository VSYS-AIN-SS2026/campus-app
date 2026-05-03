import Link from 'next/link'
import { getStudyPrograms } from '../../../features/study_programs/api/studyProgram.api'
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

export default async function StudyProgramsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const selectedStudyProgramId = getSingleSearchParam(resolvedSearchParams.studyProgramId)

  let studyPrograms: StudyProgram[] = []
  let errorMessage: string | null = null

  try {
    studyPrograms = await getStudyPrograms()
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Studiengänge konnten nicht geladen werden.'
  }

  const selectedStudyProgram = studyPrograms.find((program) => program.id === selectedStudyProgramId) ?? null

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
        <h1>Studiengang auswählen</h1>
        <p>
          Das Dropdown liest alle vorhandenen Einträge aus der Supabase-Tabelle
          <code> study_programs </code> und übergibt die Auswahl für diese Story zurück ins Profil.
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

              <p className="helper-text">
                Die Auswahl wird hier bewusst ohne Persistenz simuliert und nach dem Absenden im
                Profil angezeigt.
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
