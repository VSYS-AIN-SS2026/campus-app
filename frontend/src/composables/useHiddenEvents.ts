import { ref, computed } from 'vue'
import type { WeekEvent } from '../types/schedule'

export function useHiddenEvents(events: () => WeekEvent[]) {
  const hiddenSeriesIds = ref<string[]>([])
  const hiddenEventIds = ref<string[]>([])

  function hideSeries(seriesId: string) {
    if (!hiddenSeriesIds.value.includes(seriesId)) {
      hiddenSeriesIds.value.push(seriesId)
    }
  }

  function hideSingleEvent(eventId: string) {
    if (!hiddenEventIds.value.includes(eventId)) {
      hiddenEventIds.value.push(eventId)
    }
  }

  const visibleEvents = computed(() =>
    events().filter(ev =>
      (!ev.seriesId || !hiddenSeriesIds.value.includes(ev.seriesId)) &&
      !hiddenEventIds.value.includes(ev.id)
    )
  )

  return {
    hiddenSeriesIds,
    hiddenEventIds,
    hideSeries,
    hideSingleEvent,
    visibleEvents,
  }
}
