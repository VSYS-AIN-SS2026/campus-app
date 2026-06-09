import { supabase, supabaseConfigError } from '../../supabase'
import type { PersonalAppointment, NewPersonalAppointmentInput } from '../../types/personalAppointments'
import type { AppControllerState } from './state'
import { localDateKey } from '../../utils/datetime'

export function createPersonalAppointmentsController(state: AppControllerState) {
  async function loadPersonalAppointments(weekStart: Date) {
    if (!supabase) return

    const { data, error } = await supabase.rpc('get_my_personal_appointments', {
      p_week_start: localDateKey(weekStart),
    })

    if (!error && data) {
      state.personalAppointments.value = data as PersonalAppointment[]
    }
  }

  async function createPersonalAppointment(
    input: NewPersonalAppointmentInput,
    weekStart: Date,
    onError: (msg: string) => void,
  ) {
    if (!supabase) {
      onError(supabaseConfigError ?? 'Supabase ist nicht verfügbar.')
      return false
    }

    const { error } = await supabase.rpc('create_my_personal_appointment', {
      p_title: input.title,
      p_description: input.description,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
    })

    if (error) {
      console.error('[personalAppointments] create error:', error)
      onError(`Termin konnte nicht gespeichert werden. (${error.message})`)
      return false
    }

    await loadPersonalAppointments(weekStart)
    return true
  }

  async function deletePersonalAppointment(id: string, weekStart: Date) {
    if (!supabase) return

    const appointment = state.personalAppointments.value.find((pa) => pa.id === id)

    // Optimistic removal
    state.personalAppointments.value = state.personalAppointments.value.filter((pa) => pa.id !== id)

    // Store for undo; only one undo source active at a time
    state.lastDeletedPersonalAppointment.value = appointment ?? null
    state.scheduleVisibilityInfo.value = `Termin „${appointment?.title ?? 'Termin'}" gelöscht.`
    state.scheduleVisibilityError.value = null
    state.lastHiddenSeries.value = null
    state.lastHiddenOccurrence.value = null

    const { error } = await supabase.rpc('delete_my_personal_appointment', { p_id: id })

    if (error) {
      await loadPersonalAppointments(weekStart)
      state.lastDeletedPersonalAppointment.value = null
      state.scheduleVisibilityInfo.value = null
      state.scheduleVisibilityError.value = 'Termin konnte nicht gelöscht werden.'
    }
  }

  async function undoDeletePersonalAppointment(weekStart: Date) {
    const appointment = state.lastDeletedPersonalAppointment.value
    if (!appointment || !supabase) return

    state.lastDeletedPersonalAppointment.value = null
    state.scheduleVisibilityInfo.value = null

    const { error } = await supabase.rpc('create_my_personal_appointment', {
      p_title: appointment.title,
      p_description: appointment.description,
      p_starts_at: appointment.starts_at,
      p_ends_at: appointment.ends_at,
    })

    if (error) {
      state.scheduleVisibilityError.value = 'Termin konnte nicht wiederhergestellt werden.'
      return
    }

    await loadPersonalAppointments(weekStart)
    state.scheduleVisibilityInfo.value = `„${appointment.title}" wurde wiederhergestellt.`
  }

  return {
    loadPersonalAppointments,
    createPersonalAppointment,
    deletePersonalAppointment,
    undoDeletePersonalAppointment,
  }
}
