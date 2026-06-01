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
import type { UserEventRow } from '../../types/schedule'
import {
  getSpoLabel,
  getStartOfCurrentWeek,
  getStudyProgramLabel,
  type HiddenOccurrenceRow,
  getUniqueSposForStudyProgram,
  type HiddenPageEntry,
  type HiddenSeriesRow,
  type PlannerView,
  type WeeklyScheduleRpcRow,
  type WeeklyScheduleEvent,
} from './shared'
import type { ModuleStatus } from '../../types'

export function createAppControllerState() {
  const studyPrograms = ref<StudyProgram[]>([])
  const allSpos = ref<Spo[]>([])
  const allHandbooks = ref<ModuleHandbook[]>([])
  const allCategories = ref<Category[]>([])
  const userProfile = ref<UserProfile | null>(null)

  const selectedStudyProgramId = ref<string | null>(localStorage.getItem('selectedStudyProgramId') || null)
  const selectedSpoId = ref<string | null>(localStorage.getItem('selectedSpoId') || null)

  const modules = ref<ModuleEntry[]>([])
  const selectedModule = ref<ModuleEntry | null>(null)
  const lsfImportModule = ref<ModuleEntry | null>(null)
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
  const userEvents = ref<UserEventRow[]>([])
  const showHiddenEvents = ref(false)
  const hiddenPageLoading = computed(() => !loadedUserId.value && loading.value)
  const hiddenPageError = ref<string | null>(null)

  const currentUserEmail = computed(() => currentUser.value?.email ?? '')
  const activePlannerView = ref<PlannerView>('week')
  const weekStartDate = ref<Date>(getStartOfCurrentWeek(new Date()))

  const studyProgramItems = computed(() =>
    studyPrograms.value.map(program => ({ id: program.id, label: getStudyProgramLabel(program) }))
  )

  const availableSpos = computed(() => getUniqueSposForStudyProgram(allSpos.value, selectedStudyProgramId.value))
  const spoItems = computed(() => availableSpos.value.map(spo => ({ id: spo.id, label: getSpoLabel(spo) })))

  const savedStudyProgram = computed(() =>
    studyPrograms.value.find(program => program.id === userProfile.value?.study_program_id) ?? null
  )

  const savedSpo = computed(() => allSpos.value.find(spo => spo.id === userProfile.value?.spo_id) ?? null)

  const selectionDirty = computed(() =>
    (selectedStudyProgramId.value ?? null) !== (userProfile.value?.study_program_id ?? null)
    || (selectedSpoId.value ?? null) !== (userProfile.value?.spo_id ?? null)
  )

  const canEditModuleStatuses = computed(() => !selectionDirty.value && !!userProfile.value?.spo_id)

  const weeklyScheduleEvents = ref<WeeklyScheduleEvent[]>([])

  const allScheduleEvents = computed<WeeklyScheduleEvent[]>(() => {
    const importedEvents: WeeklyScheduleEvent[] = userEvents.value.map(ue => ({
      id: ue.id,
      seriesId: ue.series_id,
      occurrenceId: ue.id,
      dayIndex: ue.day_index,
      title: ue.title,
      subtitle: ue.subtitle ?? undefined,
      startTime: ue.start_time.slice(0, 5),
      endTime: ue.end_time.slice(0, 5),
      status: ue.status as ModuleStatus,
    }))
    return [...weeklyScheduleEvents.value, ...importedEvents]
  })

  function applyHiddenSeries(rows: HiddenSeriesRow[]) {
    hiddenSeriesIds.value = new Set(rows.map(row => row.series_id.trim()).filter(Boolean))
    hiddenSeriesTitles.value = new Map(
      Array.from(hiddenSeriesIds.value).map((seriesId) => [seriesId, seriesId])
    )
  }

  function applyHiddenOccurrences(rows: HiddenOccurrenceRow[]) {
    hiddenEventIds.value = new Set(rows.map(row => row.occurrence_id.trim()).filter(Boolean))
  }

  function applyWeeklyScheduleRows(rows: WeeklyScheduleRpcRow[]) {
    weeklyScheduleEvents.value = rows
      .filter(row => row.weekday_index >= 0 && row.weekday_index <= 6)
      .map(row => ({
        id: row.event_id,
        seriesId: row.series_id,
        occurrenceId: row.occurrence_id,
        dayIndex: row.weekday_index,
        title: row.title,
        subtitle: row.subtitle ?? undefined,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.module_status,
      }))
  }

  const visibleWeeklyScheduleEvents = computed<WeeklyScheduleEvent[]>(() =>
    allScheduleEvents.value.filter(event =>
      !hiddenSeriesIds.value.has(event.seriesId)
      && (!event.occurrenceId || !hiddenEventIds.value.has(event.occurrenceId))
    )
  )

  function isEventHidden(event: WeeklyScheduleEvent): boolean {
    return hiddenSeriesIds.value.has(event.seriesId)
      || (!!event.occurrenceId && hiddenEventIds.value.has(event.occurrenceId))
  }

  const displayedWeeklyScheduleEvents = computed<WeeklyScheduleEvent[]>(() => {
    if (!showHiddenEvents.value) return visibleWeeklyScheduleEvents.value
    return weeklyScheduleEvents.value.map(event => ({ ...event, isHidden: isEventHidden(event) }))
  })

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

  const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  const hiddenPageEntries = computed<HiddenPageEntry[]>(() => {
    const entries: HiddenPageEntry[] = []
    const seenSeries = new Set<string>()

    for (const event of weeklyScheduleEvents.value) {
      const inSeries = hiddenSeriesIds.value.has(event.seriesId)
      const isSingleOccurrence = !inSeries && !!event.occurrenceId && hiddenEventIds.value.has(event.occurrenceId)

      if (!inSeries && !isSingleOccurrence) continue

      if (inSeries) {
        if (seenSeries.has(event.seriesId)) continue
        seenSeries.add(event.seriesId)
      }

      entries.push({
        id: inSeries ? event.seriesId : (event.occurrenceId ?? event.id),
        seriesId: event.seriesId,
        isSeries: inSeries,
        title: resolveHiddenSeriesTitle(event.seriesId, event.title),
        subtitle: event.subtitle ?? null,
        dayIndex: event.dayIndex,
        dayLabel: WEEKDAY_LABELS[event.dayIndex] ?? '',
        startTime: event.startTime,
        endTime: event.endTime,
      })
    }

    return entries
  })

  const hiddenOccurrenceItems = computed(() => {
    const allEvents = allScheduleEvents.value
    const byOccurrenceId = new Map(
      allEvents
        .filter(event => !!event.occurrenceId)
        .map(event => [event.occurrenceId as string, event])
    )

    return Array.from(hiddenEventIds.value)
      .sort((left, right) => left.localeCompare(right, 'de'))
      .map((occurrenceId) => {
        const event = byOccurrenceId.get(occurrenceId)
        const title = event
          ? `${event.startTime}–${event.endTime} · ${event.title}`
          : occurrenceId

        return {
          occurrenceId,
          title,
        }
      })
  })

  function clearSelectionMessages() {
    profileError.value = null
    profileInfo.value = null
  }

  function resetAppState() {
    studyPrograms.value = []
    allSpos.value = []
    allHandbooks.value = []
    userProfile.value = null
    modules.value = []
    weeklyScheduleEvents.value = []
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
    lsfImportModule.value = null
    hiddenSeriesIds.value = new Set()
    hiddenSeriesTitles.value = new Map()
    hiddenEventIds.value = new Set()
    lastHiddenSeries.value = null
    showHiddenEvents.value = false
  }

  return {
    activePlannerView,
    allCategories,
    allHandbooks,
    allSpos,
    applyHiddenOccurrences,
    applyHiddenSeries,
    applyWeeklyScheduleRows,
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
    userProfile,
    error,
    hiddenEventIds,
    hiddenOccurrenceItems,
    hiddenPageEntries,
    hiddenPageError,
    hiddenPageLoading,
    hiddenSeriesIds,
    hiddenSeriesItems,
    hiddenSeriesTitles,
    lastHiddenSeries,
    loadedUserId,
    loading,
    lsfImportModule,
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
    displayedWeeklyScheduleEvents,
    showHiddenEvents,
    userEvents,
    visibleWeeklyScheduleEvents,
    weekStartDate,
  }
}

export type AppControllerState = ReturnType<typeof createAppControllerState>
