import { watch } from 'vue'
import { supabase, supabaseConfigError } from '../../supabase'
import type {
  Category,
  ModuleHandbook,
  Spo,
  StudyProgram,
  UserProfile,
} from '../../types'
import type { AppControllerState } from './state'
import type { HiddenSeriesRow } from './shared'

export function createProfileController(
  state: AppControllerState,
  deps: {
    beginModuleRequest: () => number
    fetchModulesForSpo: (spoId: string, requestId: number) => Promise<void>
  }
) {
  async function fetchInitialData() {
    if (!state.currentUser.value) {
      return
    }

    if (state.loadedUserId.value === state.currentUser.value.id) {
      return
    }

    state.loading.value = true
    state.error.value = null
    state.profileError.value = null

    if (!supabase) {
      state.loading.value = false
      state.error.value = supabaseConfigError
      return
    }

    const [spRes, spoRes, hbRes, categoryRes, profileRes, hiddenSeriesRes] = await Promise.all([
      supabase.from('study_programs').select('id, faculty_id, code, name').order('name').order('code'),
      supabase
        .from('spos')
        .select('id, study_program_id, version_name, valid_from')
        .order('study_program_id')
        .order('valid_from', { ascending: false, nullsFirst: false })
        .order('version_name'),
      supabase.from('module_handbooks').select('id, spo_id, code').order('code'),
      supabase.from('categories').select('id, name, color, type').order('type').order('name'),
      supabase.rpc('get_demo_user_profile').maybeSingle(),
      supabase.rpc('get_demo_user_hidden_schedule_series_ids'),
    ])

    state.loading.value = false

    if (spRes.error) { state.error.value = spRes.error.message; return }
    if (spoRes.error) { state.error.value = spoRes.error.message; return }
    if (hbRes.error) { state.error.value = hbRes.error.message; return }
    if (categoryRes.error) { state.categoryError.value = categoryRes.error.message }

    if (hiddenSeriesRes.error) {
      state.scheduleVisibilityError.value = 'Verborgene Terminreihen konnten nicht geladen werden.'
    }
    else {
      state.applyHiddenSeries((hiddenSeriesRes.data ?? []) as HiddenSeriesRow[])
    }

    state.studyPrograms.value = (spRes.data ?? []) as StudyProgram[]
    state.allSpos.value = (spoRes.data ?? []) as Spo[]
    state.allHandbooks.value = (hbRes.data ?? []) as ModuleHandbook[]
    state.allCategories.value = (categoryRes.data ?? []) as Category[]

    if (profileRes.error) {
      state.profileError.value = 'Das Demo-Profil konnte nicht geladen werden.'
    }
    else {
      state.demoUserProfile.value = (profileRes.data ?? null) as UserProfile | null
    }

    state.restoringProfileSelection.value = true

    if (state.demoUserProfile.value?.study_program_id) {
      state.selectedStudyProgramId.value = state.demoUserProfile.value.study_program_id
    }

    if (state.demoUserProfile.value?.spo_id) {
      state.selectedSpoId.value = state.demoUserProfile.value.spo_id
    }

    if (
      state.selectedStudyProgramId.value
      && !state.studyPrograms.value.some(program => program.id === state.selectedStudyProgramId.value)
    ) {
      state.selectedStudyProgramId.value = null
    }

    if (
      state.selectedSpoId.value
      && !state.allSpos.value.some(
        spo => spo.id === state.selectedSpoId.value && spo.study_program_id === state.selectedStudyProgramId.value
      )
    ) {
      state.selectedSpoId.value = null
    }

    state.restoringProfileSelection.value = false

    if (state.selectedSpoId.value) {
      await deps.fetchModulesForSpo(state.selectedSpoId.value, deps.beginModuleRequest())
    }

    state.loadedUserId.value = state.currentUser.value.id
  }

  function installSelectionWatchers() {
    watch(state.selectedStudyProgramId, (id) => {
      localStorage.setItem('selectedStudyProgramId', id ?? '')
      state.clearSelectionMessages()

      if (!state.selectedSpoId.value) {
        return
      }

      const selectedSpoIsAvailable = state.allSpos.value.some(
        spo => spo.id === state.selectedSpoId.value && spo.study_program_id === id
      )

      if (!selectedSpoIsAvailable) {
        state.selectedSpoId.value = null
      }
    })

    watch(state.selectedSpoId, (id) => {
      const requestId = deps.beginModuleRequest()

      localStorage.setItem('selectedSpoId', id ?? '')
      state.modules.value = []
      state.selectedModule.value = null
      state.moduleStatusError.value = null
      state.error.value = null
      state.clearSelectionMessages()

      if (state.restoringProfileSelection.value) {
        return
      }

      if (id) {
        state.activePlannerView.value = 'week'
        void deps.fetchModulesForSpo(id, requestId)
      }
      else {
        state.loading.value = false
        state.moduleStatusError.value = null
      }
    })
  }

  return {
    fetchInitialData,
    installSelectionWatchers,
  }
}
