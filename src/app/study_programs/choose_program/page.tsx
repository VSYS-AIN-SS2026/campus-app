import Link from 'next/link'
import { getSpos, getStudyPrograms } from '../../../features/study_programs/api/studyProgram.api'
import { StudyProgramSelectionForm } from '../../../features/study_programs/components/StudyProgramSelectionForm'
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
        <StudyProgramSelectionForm
          initialSpoId={selectedSpoId}
          initialStudyProgramId={selectedStudyProgramId}
          spos={spos}
          studyPrograms={studyPrograms}
        />
      )}
    </main>
  )
}
