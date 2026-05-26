import { computed, ref } from 'vue'
import type {
  Category,
  Course,
  ModuleEntry,
  ModuleHandbook,
  Spo,
  StudyProgram,
  UserProfile,
} from '../../types'
import {
  getSpoLabel,
  getStartOfCurrentWeek,
  getStudyProgramLabel,
  getUniqueSposForStudyProgram,
  type HiddenSeriesRow,
  type PlannerView,
  toTimeString,
  type WeeklyScheduleEvent,
} from './shared'

export function createAppControllerState() {
  const studyPrograms = ref<StudyProgram[]>([])
  const allSpos = ref<Spo[]>([])
  const allHandbooks = ref<ModuleHandbook[]>([])
  const allCategories = ref<Category[]>([])
  const demoUserProfile = ref<UserProfile | null>(null)

  const selectedStudyProgramId = ref<string | null>(localStorage.getItem('selectedStudyProgramId') || null)
  const selectedSpoId = ref<string | null>(localStorage.getItem('selectedSpoId') || null)

  const modules = ref<ModuleEntry[]>([])
  const selectedModule = ref<ModuleEntry | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const moduleStatusError = ref<string | null>(null)
  const categoryError = ref<string | null>(null)
  const scheduleVisibilityError = ref<string | null>(null)
  const scheduleVisibilityInfo = ref<string | null>(null)
  const savingModuleId = ref<string | null>(null)
  const savingCategoryModuleId = ref<string | null>(null)
  const profileError = ref<string | null>(null)
  const profileInfo = ref<string | null>(null)
  const profileSaving = ref(false)
  const restoringProfileSelection = ref(false)

  const authLoading = ref(true)
  const authSending = ref(false)
  const authEmail = ref('')
  const authFirstName = ref('')
  const authLastName = ref('')
  const authError = ref<string | null>(null)
  const authInfo = ref<string | null>(null)
  const currentUser = ref<any>(null)
  const loadedUserId = ref<string | null>(null)

  const hiddenSeriesIds = ref<Set<string>>(new Set())
  const hiddenSeriesTitles = ref<Map<string, string>>(new Map())
  const hiddenEventIds = ref<Set<string>>(new Set())
  const lastHiddenSeries = ref<{ seriesId: string; title: string } | null>(null)

  const currentUserEmail = computed(() => currentUser.value?.email ?? '')
  const activePlannerView = ref<PlannerView>('week')
  const weekStartDate = ref<Date>(getStartOfCurrentWeek(new Date()))

  const DEV_WEEKLY_PREVIEW_QUERY_KEY = 'preview'
  const DEV_WEEKLY_PREVIEW_QUERY_VALUE = 'weekly'

  const isWeeklyPreviewMode = ref(
    new URLSearchParams(window.location.search).get(DEV_WEEKLY_PREVIEW_QUERY_KEY)?.toLowerCase() === DEV_WEEKLY_PREVIEW_QUERY_VALUE
  )

  const studyProgramItems = computed(() =>
    studyPrograms.value.map(program => ({ id: program.id, label: getStudyProgramLabel(program) }))
  )

  const availableSpos = computed(() => getUniqueSposForStudyProgram(allSpos.value, selectedStudyProgramId.value))
  const spoItems = computed(() => availableSpos.value.map(spo => ({ id: spo.id, label: getSpoLabel(spo) })))

  const savedStudyProgram = computed(() =>
    studyPrograms.value.find(program => program.id === demoUserProfile.value?.study_program_id) ?? null
  )

  const savedSpo = computed(() => allSpos.value.find(spo => spo.id === demoUserProfile.value?.spo_id) ?? null)

  const selectionDirty = computed(() =>
    (selectedStudyProgramId.value ?? null) !== (demoUserProfile.value?.study_program_id ?? null)
    || (selectedSpoId.value ?? null) !== (demoUserProfile.value?.spo_id ?? null)
  )

  const canEditModuleStatuses = computed(() => !selectionDirty.value && !!demoUserProfile.value?.spo_id)

  const weeklyPreviewEvents = ref<WeeklyScheduleEvent[]>([
    { id: 'preview-1', seriesId: 'preview-series-se', dayIndex: 0, title: 'Software Engineering', subtitle: 'V · Raum C203', startTime: '09:15', endTime: '10:45', status: 'belegt' },
    { id: 'preview-2', seriesId: 'preview-series-db', dayIndex: 1, title: 'Datenbanksysteme', subtitle: 'Ü · Raum B112', startTime: '11:00', endTime: '12:30', status: 'offen' },
    { id: 'preview-3', seriesId: 'preview-series-sec', dayIndex: 2, title: 'IT-Sicherheit', subtitle: 'V · Online', startTime: '13:30', endTime: '15:00', status: 'abgeschlossen' },
    { id: 'preview-4', seriesId: 'preview-series-ai', dayIndex: 3, title: 'Künstliche Intelligenz', subtitle: 'Praktikum · Labor L2', startTime: '10:00', endTime: '12:00', status: 'belegt' },
    { id: 'preview-5', seriesId: 'preview-series-prj', dayIndex: 4, title: 'Projektarbeit', subtitle: 'Team-Slot', startTime: '14:00', endTime: '16:00', status: 'offen' },
  ])

  const weeklyScheduleEvents = computed<WeeklyScheduleEvent[]>(() => {
    const slotStarts = [8 * 60 + 15, 10 * 60, 11 * 60 + 45, 13 * 60 + 30, 15 * 60 + 15]

    return modules.value.slice(0, 21).map((module, index) => {
      const dayIndex = index % 5
      const startMinutes = slotStarts[index % slotStarts.length]
      const ects = module.courses.reduce((sum, course) => sum + (course.ects ?? 0), 0)
      const duration = ects >= 6 ? 120 : 90
      const endMinutes = Math.min(startMinutes + duration, 19 * 60 + 45)
      const firstCourse = module.courses[0]

      return {
        id: `${module.id}-${dayIndex}-${startMinutes}`,
        seriesId: `module:${module.id}`,
        occurrenceId: `${module.id}-${dayIndex}-${startMinutes}`,
        dayIndex,
        title: module.name,
        subtitle: firstCourse ? `${firstCourse.name} · ${module.code}` : module.code,
        startTime: toTimeString(startMinutes),
        endTime: toTimeString(endMinutes),
        status: module.module_status,
      }
    })
  })

  function applyHiddenSeries(rows: HiddenSeriesRow[]) {
    hiddenSeriesIds.value = new Set(rows.map(row => row.series_id.trim()).filter(Boolean))
    hiddenSeriesTitles.value = new Map(
      Array.from(hiddenSeriesIds.value).map((seriesId) => [seriesId, seriesId])
    )
  }

  const visibleWeeklyScheduleEvents = computed<WeeklyScheduleEvent[]>(() =>
    weeklyScheduleEvents.value.filter(event =>
      !hiddenSeriesIds.value.has(event.seriesId)
      && (!event.occurrenceId || !hiddenEventIds.value.has(event.occurrenceId))
    )
  )

  const visibleWeeklyPreviewEvents = computed<WeeklyScheduleEvent[]>(() =>
    weeklyPreviewEvents.value.filter(event =>
      !hiddenSeriesIds.value.has(event.seriesId)
      && (!event.occurrenceId || !hiddenEventIds.value.has(event.occurrenceId))
    )
  )

  const EVENT_TYPE_LABELS: Record<string, string> = {
    lecture: 'Vorlesung',
    exercise: 'Übung',
    lab: 'Labor',
    seminar: 'Seminar',
  }

  function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }

  function findCourseInModules(courseId: string): { module: ModuleEntry; course: Course } | null {
    for (const mod of modules.value) {
      const course = mod.courses.find(c => c.id === courseId || c.code === courseId)
      if (course) return { module: mod, course }
    }
    return null
  }


  function resolveHiddenSeriesTitle(seriesId: string, fallback: string): string {
    if (seriesId.startsWith('module:')) {
      const moduleId = seriesId.slice('module:'.length)
      const mod = modules.value.find(m => m.id === moduleId)
      if (mod) return mod.name
    }
    if (seriesId.startsWith('lsf:')) {
      const parts = seriesId.split(':')
      if (parts.length >= 3) {
        const courseId = parts[1]
        const eventType = parts.slice(2).join(':')
        const typeLabel = EVENT_TYPE_LABELS[eventType] ?? eventType
        const found = findCourseInModules(courseId)
        if (found) return `${found.module.name} — ${typeLabel}`
        if (!isUuid(courseId)) return `${courseId} — ${typeLabel}`
        return typeLabel
      }
    }
    return fallback
  }

  const hiddenSeriesItems = computed(() =>
    Array.from(hiddenSeriesIds.value)
      .sort((left, right) => left.localeCompare(right, 'de'))
      .map((seriesId) => ({
        seriesId,
        title: resolveHiddenSeriesTitle(seriesId, hiddenSeriesTitles.value.get(seriesId) ?? seriesId),
      }))
  )

  function clearSelectionMessages() {
    profileError.value = null
    profileInfo.value = null
  }

  function resetAppState() {
    studyPrograms.value = []
    allSpos.value = []
    allHandbooks.value = []
    demoUserProfile.value = null
    modules.value = []
    selectedModule.value = null
    loading.value = false
    error.value = null
    moduleStatusError.value = null
    scheduleVisibilityError.value = null
    scheduleVisibilityInfo.value = null
    profileError.value = null
    profileInfo.value = null
    profileSaving.value = false
    savingModuleId.value = null
    loadedUserId.value = null
    hiddenSeriesIds.value = new Set()
    hiddenSeriesTitles.value = new Map()
    hiddenEventIds.value = new Set()
    lastHiddenSeries.value = null
  }

  return {
    activePlannerView,
    allCategories,
    allHandbooks,
    allSpos,
    applyHiddenSeries,
    authEmail,
    authError,
    authFirstName,
    authInfo,
    authLastName,
    authLoading,
    authSending,
    canEditModuleStatuses,
    categoryError,
    clearSelectionMessages,
    currentUser,
    currentUserEmail,
    demoUserProfile,
    error,
    hiddenEventIds,
    hiddenSeriesIds,
    hiddenSeriesItems,
    hiddenSeriesTitles,
    isWeeklyPreviewMode,
    lastHiddenSeries,
    loadedUserId,
    loading,
    moduleStatusError,
    modules,
    profileError,
    profileInfo,
    profileSaving,
    resetAppState,
    restoringProfileSelection,
    savedSpo,
    savedStudyProgram,
    savingCategoryModuleId,
    savingModuleId,
    scheduleVisibilityError,
    scheduleVisibilityInfo,
    selectedModule,
    selectedSpoId,
    selectedStudyProgramId,
    selectionDirty,
    spoItems,
    studyProgramItems,
    studyPrograms,
    visibleWeeklyPreviewEvents,
    visibleWeeklyScheduleEvents,
    weekStartDate,
  }
}

export type AppControllerState = ReturnType<typeof createAppControllerState>
