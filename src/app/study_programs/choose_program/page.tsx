import Link from 'next/link'
import { saveStudyProfileSelection } from '../../profile/actions'
import { getSpos, getStudyPrograms } from '../../../features/study_programs/api/studyProgram.api'
import { StudyProgramSelectionForm } from '../../../features/study_programs/components/StudyProgramSelectionForm'
import { getDemoUserProfile } from '../../../features/users/api/user.api'
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

function getSaveMessage(saveState: string | undefined) {
  switch (saveState) {
    case 'missing-study-program':
      return 'Bitte wähle zuerst einen Studiengang aus.'
    case 'invalid-study-program':
      return 'Der gewählte Studiengang ist nicht mehr verfügbar.'
    case 'invalid-spo':
      return 'Die gewählte SPO passt nicht zum Studiengang.'
    case 'error':
      return 'Die Auswahl konnte gerade nicht gespeichert werden.'
    default:
      return null
  }
}

export default async function StudyProgramsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const saveState = getSingleSearchParam(resolvedSearchParams.save)

  let studyPrograms: StudyProgram[] = []
  let spos: Spo[] = []
  let demoUserProfile = null
  let errorMessage: string | null = null

  try {
    ;[studyPrograms, spos, demoUserProfile] = await Promise.all([
      getStudyPrograms(),
      getSpos(),
      getDemoUserProfile(),
    ])
  } catch (error) {
    console.error('Error loading study program selection page:', error)
    errorMessage = 'Die Studiengangsauswahl konnte gerade nicht geladen werden.'
  }

  const selectedStudyProgramId =
    getSingleSearchParam(resolvedSearchParams.studyProgramId) ?? demoUserProfile?.study_program_id ?? undefined
  const selectedSpoId =
    getSingleSearchParam(resolvedSearchParams.spoId) ?? demoUserProfile?.spo_id ?? undefined
  const selectedStudyProgram = studyPrograms.find((program) => program.id === selectedStudyProgramId) ?? null
  const availableSpos = getUniqueSposForStudyProgram(spos, selectedStudyProgramId)
  const selectedSpo = availableSpos.find((spo) => spo.id === selectedSpoId) ?? null
  const saveMessage = getSaveMessage(saveState)

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
          formAction={saveStudyProfileSelection}
          initialSpoId={selectedSpoId}
          initialStudyProgramId={selectedStudyProgramId}
          saveMessage={saveMessage}
          spos={spos}
          studyPrograms={studyPrograms}
        />
      )}
    </main>
  )
}
