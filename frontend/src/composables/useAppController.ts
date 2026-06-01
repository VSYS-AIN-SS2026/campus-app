import { createAuthController } from './appController/auth'
import { createModulesController } from './appController/modules'
import { createProfileController } from './appController/profile'
import { createScheduleController } from './appController/schedule'
import { getSpoLabel, getStudyProgramLabel } from './appController/shared'
import { createAppControllerState } from './appController/state'
import { magicLinkRedirectTo } from '../supabase'

export function useAppController() {
  const state = createAppControllerState()

  const modules = createModulesController(state)
  const profile = createProfileController(state, {
    beginModuleRequest: modules.beginModuleRequest,
    fetchModulesForSpo: modules.fetchModulesForSpo,
  })
  const auth = createAuthController(state, {
    fetchInitialData: profile.fetchInitialData,
  })
  const schedule = createScheduleController(state)

  profile.installSelectionWatchers()
  auth.bindLifecycle()

  return {
    activePlannerView: state.activePlannerView,
    allCategories: state.allCategories,
    authEmail: state.authEmail,
    authError: state.authError,
    authFirstName: state.authFirstName,
    authInfo: state.authInfo,
    authLastName: state.authLastName,
    authLoading: state.authLoading,
    authSending: state.authSending,
    canEditModuleStatuses: state.canEditModuleStatuses,
    categoryError: state.categoryError,
    currentUser: state.currentUser,
    currentUserEmail: state.currentUserEmail,
    userProfile: state.userProfile,
    error: state.error,
    hiddenOccurrenceItems: state.hiddenOccurrenceItems,
    hiddenPageEntries: state.hiddenPageEntries,
    hiddenPageError: state.hiddenPageError,
    hiddenPageLoading: state.hiddenPageLoading,
    hiddenSeriesItems: state.hiddenSeriesItems,
    lastHiddenSeries: state.lastHiddenSeries,
    loading: state.loading,
    lsfImportModule: state.lsfImportModule,
    modules: state.modules,
    moduleStatusError: state.moduleStatusError,
    profileError: state.profileError,
    profileInfo: state.profileInfo,
    profileSaving: state.profileSaving,
    savedSpo: state.savedSpo,
    savedStudyProgram: state.savedStudyProgram,
    savingCategoryModuleId: state.savingCategoryModuleId,
    savingModuleId: state.savingModuleId,
    scheduleVisibilityError: state.scheduleVisibilityError,
    scheduleVisibilityInfo: state.scheduleVisibilityInfo,
    selectedModule: state.selectedModule,
    selectedSpoId: state.selectedSpoId,
    selectedStudyProgramId: state.selectedStudyProgramId,
    selectionDirty: state.selectionDirty,
    spoItems: state.spoItems,
    studyProgramItems: state.studyProgramItems,
    displayedWeeklyScheduleEvents: state.displayedWeeklyScheduleEvents,
    showHiddenEvents: state.showHiddenEvents,
    visibleWeeklyScheduleEvents: state.visibleWeeklyScheduleEvents,
    weekStartDate: state.weekStartDate,
    magicLinkRedirectTo,
    getSpoLabel,
    getStudyProgramLabel,
    hideScheduleOccurrence: schedule.hideScheduleOccurrence,
    hideScheduleSeries: schedule.hideScheduleSeries,
    loadImportedEvents: schedule.loadImportedEvents,
    saveModuleCategories: modules.saveModuleCategories,
    saveModuleStatus: modules.saveModuleStatus,
    saveStudyProfileSelection: modules.saveStudyProfileSelection,
    sendMagicLink: auth.sendMagicLink,
    showAllScheduleOccurrences: schedule.showAllScheduleOccurrences,
    showAllScheduleSeries: schedule.showAllScheduleSeries,
    showScheduleOccurrence: schedule.showScheduleOccurrence,
    showScheduleSeries: schedule.showScheduleSeries,
    signOut: auth.signOut,
    undoHideScheduleSeries: schedule.undoHideScheduleSeries,
  }
}
