import { supabase, supabaseConfigError } from '../../supabase'
import type { UserEventRow } from '../../types/schedule'
import type { AppControllerState } from './state'

function normalizeSeriesId(seriesId: string) {
  return seriesId.trim()
}

function normalizeOccurrenceId(occurrenceId: string) {
  return occurrenceId.trim()
}

export function createScheduleController(state: AppControllerState) {
  async function hideScheduleSeries(seriesId: string, title: string) {
    const normalizedSeriesId = normalizeSeriesId(seriesId)
    const normalizedTitle = title.trim()

    if (!normalizedSeriesId || state.hiddenSeriesIds.value.has(normalizedSeriesId)) {
      return
    }

    state.scheduleVisibilityError.value = null
    state.scheduleVisibilityInfo.value = null

    const previousHiddenSeries = state.hiddenSeriesIds.value
    const previousHiddenSeriesTitles = new Map(state.hiddenSeriesTitles.value)
    const nextHiddenSeries = new Set(previousHiddenSeries)
    nextHiddenSeries.add(normalizedSeriesId)
    state.hiddenSeriesIds.value = nextHiddenSeries
    state.hiddenSeriesTitles.value.set(normalizedSeriesId, normalizedTitle || 'Unbenannte Reihe')
    state.lastHiddenSeries.value = { seriesId: normalizedSeriesId, title: normalizedTitle || 'Unbenannte Reihe' }
    // Nur eine Undo-Quelle gleichzeitig aktiv halten.
    state.lastHiddenOccurrence.value = null

    if (!supabase) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.hiddenSeriesTitles.value = previousHiddenSeriesTitles
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('hide_demo_user_schedule_series', {
      selected_series_id: normalizedSeriesId,
    })

    if (error) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.hiddenSeriesTitles.value = previousHiddenSeriesTitles
      state.lastHiddenSeries.value = null
      state.scheduleVisibilityError.value = 'Terminreihe konnte nicht ausgeblendet werden.'
      return
    }

    state.scheduleVisibilityInfo.value = 'Terminreihe wurde ausgeblendet.'
  }

  async function undoHideScheduleSeries() {
    if (!state.lastHiddenSeries.value) {
      return
    }

    const { seriesId, title } = state.lastHiddenSeries.value
    const previousHiddenSeries = state.hiddenSeriesIds.value
    const previousHiddenSeriesTitles = new Map(state.hiddenSeriesTitles.value)
    const nextHiddenSeries = new Set(previousHiddenSeries)
    nextHiddenSeries.delete(seriesId)

    state.hiddenSeriesIds.value = nextHiddenSeries
    state.hiddenSeriesTitles.value.delete(seriesId)
    state.scheduleVisibilityError.value = null

    if (!supabase) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.hiddenSeriesTitles.value = previousHiddenSeriesTitles
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('show_demo_user_schedule_series', {
      selected_series_id: seriesId,
    })

    if (error) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.hiddenSeriesTitles.value = previousHiddenSeriesTitles
      state.scheduleVisibilityError.value = 'Terminreihe konnte nicht wieder eingeblendet werden.'
      return
    }

    state.scheduleVisibilityInfo.value = `„${title}“ ist wieder sichtbar.`
    state.lastHiddenSeries.value = null
  }

  async function showScheduleSeries(seriesId: string) {
    const normalizedSeriesId = normalizeSeriesId(seriesId)

    if (!normalizedSeriesId || !state.hiddenSeriesIds.value.has(normalizedSeriesId)) {
      return
    }

    const previousHiddenSeries = state.hiddenSeriesIds.value
    const previousHiddenSeriesTitles = new Map(state.hiddenSeriesTitles.value)
    const nextHiddenSeries = new Set(previousHiddenSeries)
    nextHiddenSeries.delete(normalizedSeriesId)

    state.hiddenSeriesIds.value = nextHiddenSeries
    state.hiddenSeriesTitles.value.delete(normalizedSeriesId)
    state.scheduleVisibilityError.value = null

    // Stale gewordenes Undo-Ziel verwerfen, falls genau diese Reihe gemeint war.
    if (state.lastHiddenSeries.value?.seriesId === normalizedSeriesId) {
      state.lastHiddenSeries.value = null
    }

    if (!supabase) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.hiddenSeriesTitles.value = previousHiddenSeriesTitles
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('show_demo_user_schedule_series', {
      selected_series_id: normalizedSeriesId,
    })

    if (error) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.hiddenSeriesTitles.value = previousHiddenSeriesTitles
      state.scheduleVisibilityError.value = 'Terminreihe konnte nicht wieder eingeblendet werden.'
    }
  }

  async function showAllScheduleSeries() {
    const seriesIds = Array.from(state.hiddenSeriesIds.value)

    for (const seriesId of seriesIds) {
      await showScheduleSeries(seriesId)
    }
  }

  async function loadImportedEvents() {
    if (!supabase) return

    const { data, error } = await supabase.rpc('get_demo_user_events')

    if (!error && data) {
      state.userEvents.value = (data ?? []) as UserEventRow[]
    }
  }

  async function hideScheduleOccurrence(occurrenceId: string) {
    const normalizedOccurrenceId = normalizeOccurrenceId(occurrenceId)

    // Auch Team-Termine (occurrence_id "appointment:<id>") werden hier regulär
    // ausgeblendet (als hidden markiert), nicht abgelehnt. Das Ablehnen der
    // Einladung bleibt eine separate Aktion in der Team-Ansicht.
    if (!normalizedOccurrenceId || state.hiddenEventIds.value.has(normalizedOccurrenceId)) {
      return
    }

    const previousHiddenOccurrenceIds = state.hiddenEventIds.value
    const nextHiddenOccurrenceIds = new Set(previousHiddenOccurrenceIds)
    nextHiddenOccurrenceIds.add(normalizedOccurrenceId)
    state.hiddenEventIds.value = nextHiddenOccurrenceIds
    state.scheduleVisibilityError.value = null
    state.scheduleVisibilityInfo.value = null

    if (!supabase) {
      state.hiddenEventIds.value = previousHiddenOccurrenceIds
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('hide_demo_user_schedule_occurrence', {
      selected_occurrence_id: normalizedOccurrenceId,
    })

    if (error) {
      state.hiddenEventIds.value = previousHiddenOccurrenceIds
      state.scheduleVisibilityError.value = 'Einzeltermin konnte nicht ausgeblendet werden.'
      return
    }

    // Erfolgs-Feedback + Undo-Ziel setzen; nur eine Undo-Quelle aktiv halten.
    state.scheduleVisibilityInfo.value = 'Termin wurde ausgeblendet.'
    state.lastHiddenOccurrence.value = normalizedOccurrenceId
    state.lastHiddenSeries.value = null
  }

  async function undoHideScheduleOccurrence() {
    const occurrenceId = state.lastHiddenOccurrence.value

    if (!occurrenceId) {
      return
    }

    await showScheduleOccurrence(occurrenceId)

    if (!state.scheduleVisibilityError.value) {
      state.lastHiddenOccurrence.value = null
      state.scheduleVisibilityInfo.value = 'Termin ist wieder sichtbar.'
    }
  }

  async function showScheduleOccurrence(occurrenceId: string) {
    const normalizedOccurrenceId = normalizeOccurrenceId(occurrenceId)

    if (!normalizedOccurrenceId || !state.hiddenEventIds.value.has(normalizedOccurrenceId)) {
      return
    }

    const previousHiddenOccurrenceIds = state.hiddenEventIds.value
    const nextHiddenOccurrenceIds = new Set(previousHiddenOccurrenceIds)
    nextHiddenOccurrenceIds.delete(normalizedOccurrenceId)
    state.hiddenEventIds.value = nextHiddenOccurrenceIds
    state.scheduleVisibilityError.value = null

    // Stale gewordenes Undo-Ziel verwerfen, falls genau dieser Termin gemeint war.
    if (state.lastHiddenOccurrence.value === normalizedOccurrenceId) {
      state.lastHiddenOccurrence.value = null
    }

    if (!supabase) {
      state.hiddenEventIds.value = previousHiddenOccurrenceIds
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('show_demo_user_schedule_occurrence', {
      selected_occurrence_id: normalizedOccurrenceId,
    })

    if (error) {
      state.hiddenEventIds.value = previousHiddenOccurrenceIds
      state.scheduleVisibilityError.value = 'Einzeltermin konnte nicht eingeblendet werden.'
    }
  }

  async function showAllScheduleOccurrences() {
    const occurrenceIds = Array.from(state.hiddenEventIds.value)

    for (const occurrenceId of occurrenceIds) {
      await showScheduleOccurrence(occurrenceId)
    }
  }

  // Räumt alle ausgeblendeten Einträge eines Moduls auf. Wird aufgerufen, wenn der
  // Modulstatus auf "offen"/"abgeschlossen" wechselt: dann verschwinden die Termine
  // ohnehin aus dem Wochenplan, und ihre Hidden-Markierung soll nicht "kleben"
  // bleiben (sonst wären die Termine bei erneutem "belegt" weiterhin ausgeblendet).
  // Wochenplan-IDs: series_id = "module:<id>", occurrence_id = "<id>:<weekday>:<start>".
  async function clearHiddenForModule(moduleId: string) {
    const normalizedModuleId = moduleId.trim()

    if (!normalizedModuleId) {
      return
    }

    const seriesId = `module:${normalizedModuleId}`
    const occurrencePrefix = `${normalizedModuleId}:`
    const occurrenceIds = Array.from(state.hiddenEventIds.value).filter(
      (id) => id.startsWith(occurrencePrefix)
    )

    if (!state.hiddenSeriesIds.value.has(seriesId) && occurrenceIds.length === 0) {
      return
    }

    if (state.hiddenSeriesIds.value.has(seriesId)) {
      await showScheduleSeries(seriesId)
    }

    for (const occurrenceId of occurrenceIds) {
      await showScheduleOccurrence(occurrenceId)
    }
  }

  return {
    clearHiddenForModule,
    hideScheduleOccurrence,
    hideScheduleSeries,
    loadImportedEvents,
    showAllScheduleOccurrences,
    showAllScheduleSeries,
    showScheduleOccurrence,
    showScheduleSeries,
    undoHideScheduleOccurrence,
    undoHideScheduleSeries,
  }
}
