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

    state.personalAppointments.value = state.personalAppointments.value.filter(
      (pa) => pa.id !== id,
    )

    const { error } = await supabase.rpc('delete_my_personal_appointment', {
      p_id: id,
    })

    if (error) {
      await loadPersonalAppointments(weekStart)
    }
  }

  return {
    loadPersonalAppointments,
    createPersonalAppointment,
    deletePersonalAppointment,
  }
}
