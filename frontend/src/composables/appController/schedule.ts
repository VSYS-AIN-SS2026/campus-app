import { supabase, supabaseConfigError } from '../../supabase'
import type { AppControllerState } from './state'

function normalizeSeriesId(seriesId: string) {
  return seriesId.trim()
}

export function createScheduleController(state: AppControllerState) {
  async function hideScheduleSeries(seriesId: string, title: string) {
    const normalizedSeriesId = normalizeSeriesId(seriesId)
    const normalizedTitle = title.trim()

    if (!normalizedSeriesId || state.hiddenSeriesIds.value.has(normalizedSeriesId)) {
      return
    }

    const confirmed = window.confirm(
      `Alle aktuellen und zukünftigen Termine der Reihe „${normalizedTitle || 'Unbenannte Reihe'}“ ausblenden?`
    )

    if (!confirmed) {
      return
    }

    state.scheduleVisibilityError.value = null
    state.scheduleVisibilityInfo.value = null

    const previousHiddenSeries = state.hiddenSeriesIds.value
    const nextHiddenSeries = new Set(previousHiddenSeries)
    nextHiddenSeries.add(normalizedSeriesId)
    state.hiddenSeriesIds.value = nextHiddenSeries
    state.lastHiddenSeries.value = { seriesId: normalizedSeriesId, title: normalizedTitle || 'Unbenannte Reihe' }

    if (state.isWeeklyPreviewMode.value) {
      state.scheduleVisibilityInfo.value = 'Terminreihe wurde ausgeblendet.'
      return
    }

    if (!supabase) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('hide_demo_user_schedule_series', {
      selected_series_id: normalizedSeriesId,
    })

    if (error) {
      state.hiddenSeriesIds.value = previousHiddenSeries
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
    const nextHiddenSeries = new Set(previousHiddenSeries)
    nextHiddenSeries.delete(seriesId)

    state.hiddenSeriesIds.value = nextHiddenSeries
    state.scheduleVisibilityError.value = null

    if (state.isWeeklyPreviewMode.value) {
      state.scheduleVisibilityInfo.value = `„${title}“ ist wieder sichtbar.`
      state.lastHiddenSeries.value = null
      return
    }

    if (!supabase) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.scheduleVisibilityError.value = supabaseConfigError
      return
    }

    const { error } = await supabase.rpc('show_demo_user_schedule_series', {
      selected_series_id: seriesId,
    })

    if (error) {
      state.hiddenSeriesIds.value = previousHiddenSeries
      state.scheduleVisibilityError.value = 'Terminreihe konnte nicht wieder eingeblendet werden.'
      return
    }

    state.scheduleVisibilityInfo.value = `„${title}“ ist wieder sichtbar.`
    state.lastHiddenSeries.value = null
  }

  return {
    hideScheduleSeries,
    undoHideScheduleSeries,
  }
}
