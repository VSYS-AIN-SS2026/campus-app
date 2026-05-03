import Link from 'next/link'
import { getSpos, getStudyPrograms } from '../../features/study_programs/api/studyProgram.api'
import type { Spo } from '../../features/study_programs/types/spo.types'
import type { StudyProgram } from '../../features/study_programs/types/studyProgram.types'

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

export default async function ProfilePage({ searchParams }: PageProps) {
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
  const selectedSpo = spos.find((spo) => spo.id === selectedSpoId && spo.study_program_id === selectedStudyProgramId) ?? null
  const chooseProgramHref = selectedStudyProgramId
    ? `/study_programs/choose_program?studyProgramId=${encodeURIComponent(selectedStudyProgramId)}${selectedSpoId ? `&spoId=${encodeURIComponent(selectedSpoId)}` : ''}`
    : '/study_programs/choose_program'

  return (
    <main className="app-shell">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/">Hauptseite</Link>
        <span>/</span>
        <span aria-current="page">Profil</span>
      </nav>

      <section className="hero hero-compact">
        <span className="eyebrow">Profil</span>
        <h1>Demo-Profil für die Studiengangauswahl</h1>
        <p>
          Diese Seite simuliert einen künftigen Profilbereich für Studierende. Die Auswahl des
          Studiengangs wird bewusst noch nicht persistiert, aber bereits sichtbar in den Flow
          eingebunden.
        </p>
      </section>

      <section className="card-grid two-columns">
        <article className="panel">
          <h2>Studierendenprofil</h2>
          <dl className="meta-list">
            <div className="meta-item">
              <dt>Name</dt>
              <dd>Alex Beispiel</dd>
            </div>
            <div className="meta-item">
              <dt>Hochschule</dt>
              <dd>HTWG Konstanz</dd>
            </div>
            <div className="meta-item">
              <dt>Status</dt>
              <dd>Simulation für VSYS26T4-37</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h2>Aktueller Studiengang</h2>
          {errorMessage ? (
            <p className="status status-error">{errorMessage}</p>
          ) : selectedStudyProgram ? (
            <p className="status status-success">{getStudyProgramLabel(selectedStudyProgram)}</p>
          ) : (
            <p className="status">Noch kein Studiengang ausgewählt.</p>
          )}

          <p className="helper-text">
            Dieser Baustein kann später direkt mit einem Student-Record, Login-Kontext oder einer
            Profil-Tabelle verknüpft werden.
          </p>

          <div className="selection-summary">
            <span className="summary-label">SPO</span>
            {errorMessage ? (
              <p className="status status-error">SPOs konnten nicht geladen werden.</p>
            ) : selectedSpo ? (
              <p className="status status-success">{getSpoLabel(selectedSpo)}</p>
            ) : selectedStudyProgram ? (
              <p className="status">Noch keine SPO ausgewählt.</p>
            ) : (
              <p className="status">SPO wird nach der Studiengangswahl verfügbar.</p>
            )}
          </div>

          <div className="actions">
            <Link className="button" href={chooseProgramHref}>
              Studiengang und SPO auswählen
            </Link>
            <Link className="button button-secondary" href="/">
              Zur Hauptseite
            </Link>
          </div>
        </article>
      </section>
    </main>
  )
}
