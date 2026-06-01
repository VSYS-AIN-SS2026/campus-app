import { supabase, supabaseConfigError } from '../../supabase'
import type { UserEventRow } from '../../types/schedule'
import type { AppControllerState } from './state'
import type { AcceptedAppointmentRow } from './shared'

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

    // Team-Termin: Einladung ablehnen statt ausblenden
    if (normalizedOccurrenceId.startsWith('appointment:')) {
      const appointmentId = normalizedOccurrenceId.slice('appointment:'.length)
      const row = (state.acceptedAppointments.value as AcceptedAppointmentRow[]).find(
        r => r.appointment_id === appointmentId
      )
      if (!row || !supabase) return

      const { error } = await supabase.rpc('respond_to_appointment_invitation', {
        p_invitation_id: row.invitation_id,
        p_status: 'declined',
      })

      if (!error) {
        state.acceptedAppointments.value = (
          state.acceptedAppointments.value as AcceptedAppointmentRow[]
        ).filter(r => r.appointment_id !== appointmentId)
      }
      return
    }

    if (!normalizedOccurrenceId || state.hiddenEventIds.value.has(normalizedOccurrenceId)) {
      return
    }

    const previousHiddenOccurrenceIds = state.hiddenEventIds.value
    const nextHiddenOccurrenceIds = new Set(previousHiddenOccurrenceIds)
    nextHiddenOccurrenceIds.add(normalizedOccurrenceId)
    state.hiddenEventIds.value = nextHiddenOccurrenceIds
    state.scheduleVisibilityError.value = null

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

  return {
    hideScheduleOccurrence,
    hideScheduleSeries,
    loadImportedEvents,
    showAllScheduleOccurrences,
    showAllScheduleSeries,
    showScheduleOccurrence,
    showScheduleSeries,
    undoHideScheduleSeries,
  }
}
