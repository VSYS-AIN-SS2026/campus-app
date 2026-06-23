import { ref } from 'vue'
import { supabase } from '../supabase'

export type SavedOrgEventRow = {
  event_id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  organisation_id: string
  organisation_name: string
  organisation_color: string | null
}

export const savedOrgEventsData = ref<SavedOrgEventRow[]>([])

export async function loadSavedOrgEvents(): Promise<void> {
  if (!supabase) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from('saved_organisation_events')
    .select(`
      event_id,
      organisation_events!inner (
        id,
        title,
        description,
        location,
        starts_at,
        ends_at,
        organisation_id,
        organisations!inner (
          name,
          color
        )
      )
    `)
    .eq('user_id', user.id)

  if (!data) return

  savedOrgEventsData.value = (data as any[]).map(row => ({
    event_id: row.event_id,
    title: row.organisation_events.title,
    description: row.organisation_events.description ?? null,
    location: row.organisation_events.location ?? null,
    starts_at: row.organisation_events.starts_at,
    ends_at: row.organisation_events.ends_at,
    organisation_id: row.organisation_events.organisation_id,
    organisation_name: row.organisation_events.organisations.name,
    organisation_color: row.organisation_events.organisations.color ?? null,
  }))
}

export function clearSavedOrgEvents(): void {
  savedOrgEventsData.value = []
}
