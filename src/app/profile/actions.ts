'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSpos, getStudyPrograms } from '../../features/study_programs/api/studyProgram.api'
import { upsertDemoUserProfileSelection } from '../../features/users/api/user.api'

function getSingleFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()

  return trimmedValue || undefined
}

export async function saveStudyProfileSelection(formData: FormData) {
  const studyProgramId = getSingleFormValue(formData, 'studyProgramId')
  const spoId = getSingleFormValue(formData, 'spoId')

  if (!studyProgramId) {
    redirect('/study_programs/choose_program?save=missing-study-program')
  }

  let studyPrograms
  let spos

  try {
    ;[studyPrograms, spos] = await Promise.all([getStudyPrograms(), getSpos()])
  } catch (error) {
    console.error('Error preparing study profile selection:', error)
    redirect('/study_programs/choose_program?save=error')
  }

  const selectedStudyProgram = studyPrograms.find((program) => program.id === studyProgramId)

  if (!selectedStudyProgram) {
    redirect('/study_programs/choose_program?save=invalid-study-program')
  }

  if (spoId) {
    const selectedSpo = spos.find((spo) => spo.id === spoId)

    if (!selectedSpo || selectedSpo.study_program_id !== studyProgramId) {
      redirect(
        `/study_programs/choose_program?save=invalid-spo&studyProgramId=${encodeURIComponent(studyProgramId)}`
      )
    }
  }

  try {
    await upsertDemoUserProfileSelection({
      studyProgramId,
      spoId: spoId ?? null,
    })
  } catch (error) {
    console.error('Error saving study profile selection:', error)

    const params = new URLSearchParams({
      save: 'error',
      studyProgramId,
    })

    if (spoId) {
      params.set('spoId', spoId)
    }

    redirect(`/study_programs/choose_program?${params.toString()}`)
  }

  revalidatePath('/profile')
  revalidatePath('/study_programs/choose_program')

  redirect('/profile?save=success')
}
