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

    state.scheduleVisibilityError.value = null
    state.scheduleVisibilityInfo.value = null

    const previousHiddenSeries = state.hiddenSeriesIds.value
    const previousHiddenSeriesTitles = new Map(state.hiddenSeriesTitles.value)
    const nextHiddenSeries = new Set(previousHiddenSeries)
    nextHiddenSeries.add(normalizedSeriesId)
    state.hiddenSeriesIds.value = nextHiddenSeries
    state.hiddenSeriesTitles.value.set(normalizedSeriesId, normalizedTitle || 'Unbenannte Reihe')
    state.lastHiddenSeries.value = { seriesId: normalizedSeriesId, title: normalizedTitle || 'Unbenannte Reihe' }

    if (state.isWeeklyPreviewMode.value) {
      state.scheduleVisibilityInfo.value = 'Terminreihe wurde ausgeblendet.'
      return
    }

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

    if (state.isWeeklyPreviewMode.value) {
      state.scheduleVisibilityInfo.value = `„${title}“ ist wieder sichtbar.`
      state.lastHiddenSeries.value = null
      return
    }

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

    if (state.isWeeklyPreviewMode.value) {
      return
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

  return {
    hideScheduleSeries,
    showAllScheduleSeries,
    showScheduleSeries,
    undoHideScheduleSeries,
  }
}
