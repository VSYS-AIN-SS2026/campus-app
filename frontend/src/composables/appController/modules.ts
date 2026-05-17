import { supabase, supabaseConfigError } from '../../supabase'
import type { Category, ModuleEntry, ModuleStatus, UserProfile } from '../../types'
import type { AppControllerState } from './state'
import {
  beginModuleRequest,
  isActiveModuleRequest,
  type ModuleCategoryRow,
  type ModuleStatusRow,
  type WeeklyScheduleRpcRow,
  shouldReplaceModule,
} from './shared'

export function createModulesController(state: AppControllerState) {
  function setModuleStatus(moduleId: string, status: ModuleStatus) {
    const module = state.modules.value.find(entry => entry.id === moduleId)
    if (!module) return
    module.module_status = status
  }

  function setModuleCategories(moduleId: string, categories: Category[]) {
    const module = state.modules.value.find(entry => entry.id === moduleId)
    if (!module) return
    module.categories = categories
  }

  function applyModuleStatuses(statusRows: ModuleStatusRow[]) {
    const statusMap = new Map(statusRows.map(row => [row.module_id, row.status]))

    for (const module of state.modules.value) {
      module.module_status = statusMap.get(module.id) ?? 'offen'
    }
  }

  function applyModuleCategories(categoryRows: ModuleCategoryRow[]) {
    const categoryMap = new Map<string, Category[]>()

    for (const row of categoryRows) {
      const categories = categoryMap.get(row.module_id) ?? []
      categories.push({ id: row.category_id, name: row.name, color: row.color, type: row.type })
      categoryMap.set(row.module_id, categories)
    }

    for (const module of state.modules.value) {
      module.categories = categoryMap.get(module.id) ?? []
    }
  }

  async function fetchModuleStatuses(moduleIds: string[], requestId: number) {
    state.moduleStatusError.value = null

    if (!supabase) {
      state.moduleStatusError.value = supabaseConfigError
      return
    }

    if (!moduleIds.length || !isActiveModuleRequest(requestId)) {
      return
    }

    const { data, error } = await supabase.rpc('get_demo_user_module_statuses', {
      selected_module_ids: moduleIds,
    })

    if (!isActiveModuleRequest(requestId)) {
      return
    }

    if (error) {
      state.moduleStatusError.value = 'Der Modulstatus konnte nicht geladen werden.'
      return
    }

    applyModuleStatuses((data ?? []) as ModuleStatusRow[])
  }

  async function fetchModuleCategories(moduleIds: string[], requestId: number) {
    state.categoryError.value = null

    if (!supabase) {
      state.categoryError.value = supabaseConfigError
      return
    }

    if (!moduleIds.length || !isActiveModuleRequest(requestId)) {
      return
    }

    const { data, error } = await supabase.rpc('get_module_categories', {
      selected_module_ids: moduleIds,
    })

    if (!isActiveModuleRequest(requestId)) {
      return
    }

    if (error) {
      state.categoryError.value = 'Die Modulkategorien konnten nicht geladen werden.'
      return
    }

    applyModuleCategories((data ?? []) as ModuleCategoryRow[])
  }

  async function fetchWeeklySchedule(requestId?: number) {
    state.scheduleVisibilityError.value = null

    if (!supabase) {
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { data, error } = await supabase.rpc('get_demo_user_weekly_schedule', {
      selected_week_start: null,
      selected_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })

    if (requestId != null && !isActiveModuleRequest(requestId)) {
      return
    }

    if (error) {
      state.applyWeeklyScheduleRows([])
      state.scheduleVisibilityError.value = 'Die Wochenansicht konnte nicht geladen werden.'
      return
    }

    state.applyWeeklyScheduleRows((data ?? []) as WeeklyScheduleRpcRow[])
  }

  async function saveModuleStatus(moduleId: string, status: ModuleStatus) {
    if (!supabase) {
      state.moduleStatusError.value = supabaseConfigError
      return
    }

    if (!state.canEditModuleStatuses.value) {
      state.moduleStatusError.value = 'Speichere zuerst Studiengang und SPO im Demo-Profil, bevor du Modulstatus änderst.'
      return
    }

    if (state.savingModuleId.value) {
      return
    }

    const currentModule = state.modules.value.find(entry => entry.id === moduleId)

    if (!currentModule || currentModule.module_status === status) {
      return
    }

    const previousStatus = currentModule.module_status
    state.moduleStatusError.value = null
    state.savingModuleId.value = moduleId
    setModuleStatus(moduleId, status)

    const { data, error } = await supabase
      .rpc('save_demo_user_module_status', {
        selected_module_id: moduleId,
        selected_status: status,
      })
      .single()

    state.savingModuleId.value = null

    if (error) {
      setModuleStatus(moduleId, previousStatus)
      state.moduleStatusError.value = 'Der Modulstatus konnte nicht gespeichert werden.'
      return
    }

    const savedStatus = (data ?? null) as ModuleStatusRow | null

    if (savedStatus?.status) {
      setModuleStatus(moduleId, savedStatus.status)
    }

    await fetchWeeklySchedule()
  }

  async function saveModuleCategories(moduleId: string, categoryIds: string[]) {
    if (!supabase) {
      state.categoryError.value = supabaseConfigError
      return
    }

    if (!state.canEditModuleStatuses.value) {
      state.categoryError.value = 'Speichere zuerst Studiengang und SPO im Demo-Profil, bevor du Modulkategorien änderst.'
      return
    }

    if (state.savingCategoryModuleId.value) {
      return
    }

    const currentModule = state.modules.value.find(entry => entry.id === moduleId)

    if (!currentModule) {
      return
    }

    const previousCategories = currentModule.categories
    const optimisticCategories = state.allCategories.value.filter(category => categoryIds.includes(category.id))

    state.categoryError.value = null
    state.savingCategoryModuleId.value = moduleId
    setModuleCategories(moduleId, optimisticCategories)

    const { data, error } = await supabase.rpc('save_module_categories', {
      selected_module_id: moduleId,
      selected_category_ids: categoryIds,
    })

    state.savingCategoryModuleId.value = null

    if (error) {
      setModuleCategories(moduleId, previousCategories)
      state.categoryError.value = 'Die Modulkategorien konnten nicht gespeichert werden.'
      return
    }

    setModuleCategories(moduleId, ((data ?? []) as ModuleCategoryRow[]).map(row => ({
      id: row.category_id,
      name: row.name,
      color: row.color,
      type: row.type,
    })))
  }

  async function saveStudyProfileSelection() {
    state.clearSelectionMessages()

    if (!supabase) {
      state.profileError.value = supabaseConfigError
      return
    }

    if (!state.selectedStudyProgramId.value) {
      state.profileError.value = 'Bitte wähle zuerst einen Studiengang aus.'
      return
    }

    state.profileSaving.value = true

    const { data, error } = await supabase
      .rpc('save_demo_user_profile_selection', {
        selected_study_program_id: state.selectedStudyProgramId.value,
        selected_spo_id: state.selectedSpoId.value,
      })
      .single()

    state.profileSaving.value = false

    if (error) {
      state.profileError.value = 'Studiengang und SPO konnten nicht gespeichert werden.'
      return
    }

    state.demoUserProfile.value = (data ?? null) as UserProfile | null
    state.profileInfo.value = 'Studiengang und SPO wurden im Demo-Profil gespeichert.'
  }

  async function fetchModules(handbookIds: string[], requestId: number) {
    state.loading.value = true
    state.error.value = null
    state.moduleStatusError.value = null

    if (!supabase) {
      state.loading.value = false
      state.error.value = supabaseConfigError
      return
    }

    const { data, error } = await supabase
      .from('module_handbook_entries')
      .select(`
      recommended_semester,
      modules!module_handbook_entries_module_id_fkey (
        id, code, name, coordinator, start_semester, version, details,
        is_mandatory, is_specialization, specialization_name, language,
        courses (*)
      )
    `)
      .in('handbook_id', handbookIds)
      .order('recommended_semester', { nullsFirst: false })

    if (!isActiveModuleRequest(requestId)) {
      return
    }

    if (error) {
      state.loading.value = false
      state.error.value = error.message
      return
    }

    const uniqueModules = new Map<string, ModuleEntry>()

    for (const row of data as any[]) {
      const module = {
        ...row.modules,
        recommended_semester: row.recommended_semester,
        categories: [],
        courses: row.modules?.courses ?? [],
        module_status: 'offen',
      } as ModuleEntry

      const existingModule = uniqueModules.get(module.id)

      if (!existingModule || shouldReplaceModule(existingModule, module)) {
        uniqueModules.set(module.id, module)
      }
    }

    state.modules.value = Array.from(uniqueModules.values())

    const moduleIds = state.modules.value.map(module => module.id)

    await Promise.all([
      fetchModuleStatuses(moduleIds, requestId),
      fetchModuleCategories(moduleIds, requestId),
      fetchWeeklySchedule(requestId),
    ])

    if (!isActiveModuleRequest(requestId)) {
      return
    }

    state.loading.value = false
  }

  async function fetchModulesForSpo(spoId: string, requestId: number) {
    const matchingHandbooks = state.allHandbooks.value.filter(handbook => handbook.spo_id === spoId)

    if (!matchingHandbooks.length) {
      state.modules.value = []
      state.applyWeeklyScheduleRows([])
      state.error.value = 'Zur ausgewählten SPO wurde kein Modulhandbuch gefunden.'
      state.loading.value = false
      return
    }

    await fetchModules(matchingHandbooks.map(handbook => handbook.id), requestId)
  }

  return {
    beginModuleRequest,
    fetchModulesForSpo,
    saveModuleCategories,
    saveModuleStatus,
    saveStudyProfileSelection,
  }
}
