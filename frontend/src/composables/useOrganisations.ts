import { computed, ref } from 'vue'
import { supabase } from '../supabase'
import { loadSavedOrgEvents } from './savedOrgEventsStore'

import type {
  NewOrganisationEventInput,
  NewOrganisationInput,
  Organisation,
  OrganisationEvent,
  OrganisationMember,
  OrganisationWithState,
} from '../types/organisations'

export function useOrganisations() {
  const organisations = ref<Organisation[]>([])
  const memberships = ref<OrganisationMember[]>([])
  const events = ref<OrganisationEvent[]>([])
  const savedEventIds = ref<Set<string>>(new Set())

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const info = ref<string | null>(null)

  function getClient() {
    const client = supabase

    if (!client) {
      console.error('Supabase Client nicht initialisiert')
      return null
    }

    return client
  }

  const organisationsWithState = computed<OrganisationWithState[]>(() => {
    return organisations.value.map((organisation) => {
      const membership = memberships.value.find(
        item => item.organisation_id === organisation.id,
      )

      return {
        ...organisation,
        isMember: !!membership,
        isOwner: membership?.role === 'owner',
      }
    })
  })

  const myOrganisationIds = computed(() => {
    return new Set(memberships.value.map(item => item.organisation_id))
  })

  async function getCurrentUserId(): Promise<string> {
    const client = getClient()

    if (!client) {
      throw new Error('Supabase Client nicht initialisiert.')
    }

    const { data, error: authError } = await client.auth.getUser()

    if (authError || !data.user) {
      throw new Error('Du bist nicht angemeldet.')
    }

    return data.user.id
  }

  async function fetchOrganisations() {
    const client = getClient()
    if (!client) return

    loading.value = true
    error.value = null

    try {
      const userId = await getCurrentUserId()

      const [{ data: organisationData, error: organisationError }, { data: membershipData, error: membershipError }] =
        await Promise.all([
          client
            .from('organisations')
            .select('*')
            .order('name', { ascending: true }),

          client
            .from('organisation_members')
            .select('*')
            .eq('user_id', userId),
        ])

      if (organisationError) throw organisationError
      if (membershipError) throw membershipError

      organisations.value = organisationData ?? []
      memberships.value = membershipData ?? []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Organisationen konnten nicht geladen werden.'
    } finally {
      loading.value = false
    }
  }

  async function createOrganisation(input: NewOrganisationInput) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const userId = await getCurrentUserId()
      const name = input.name.trim()

      if (name.length < 2) {
        throw new Error('Der Organisationsname muss mindestens 2 Zeichen lang sein.')
      }

      const { error: insertError } = await client
        .from('organisations')
        .insert({
          name,
          description: input.description?.trim() || null,
          color: input.color ?? null,
          created_by: userId,
        })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Dieser Organisationsname ist bereits vergeben.')
        }

        throw insertError
      }

      info.value = 'Organisation wurde erstellt.'
      await fetchOrganisations()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Organisation konnte nicht erstellt werden.'
    } finally {
      saving.value = false
    }
  }

  async function joinOrganisation(organisationId: string) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const userId = await getCurrentUserId()

      const { error: insertError } = await client
        .from('organisation_members')
        .insert({
          organisation_id: organisationId,
          user_id: userId,
          role: 'member',
        })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Du bist dieser Organisation bereits beigetreten.')
        }

        throw insertError
      }

      info.value = 'Du bist der Organisation beigetreten.'
      await fetchOrganisations()
      await fetchOrganisationEvents()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.'
    } finally {
      saving.value = false
    }
  }

  async function leaveOrganisation(organisationId: string) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const userId = await getCurrentUserId()

      // Gespeicherte Events dieser Org aus der Wochenansicht entfernen
      const orgEventIds = events.value
        .filter(e => e.organisation_id === organisationId)
        .map(e => e.id)

      if (orgEventIds.length > 0) {
        await client
          .from('saved_organisation_events')
          .delete()
          .in('event_id', orgEventIds)
          .eq('user_id', userId)

        const next = new Set(savedEventIds.value)
        for (const id of orgEventIds) next.delete(id)
        savedEventIds.value = next
      }

      const { error: deleteError } = await client
        .from('organisation_members')
        .delete()
        .eq('organisation_id', organisationId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      info.value = 'Du hast die Organisation verlassen.'
      await fetchOrganisations()
      await fetchOrganisationEvents()
      await loadSavedOrgEvents()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Organisation konnte nicht verlassen werden.'
    } finally {
      saving.value = false
    }
  }

  async function fetchOrganisationEvents() {
    const client = getClient()
    if (!client) return

    error.value = null

    try {
      const { data, error: eventsError } = await client
        .from('organisation_events')
        .select('*')
        .order('starts_at', { ascending: true })

      if (eventsError) throw eventsError

      events.value = data ?? []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Events konnten nicht geladen werden.'
    }
  }

  async function fetchSavedEvents() {
    const client = getClient()
    if (!client) return

    error.value = null

    try {
      const userId = await getCurrentUserId()

      const { data, error: savedError } = await client
        .from('saved_organisation_events')
        .select('event_id')
        .eq('user_id', userId)

      if (savedError) throw savedError

      savedEventIds.value = new Set((data ?? []).map(item => item.event_id))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gespeicherte Events konnten nicht geladen werden.'
    }
  }

  async function createOrganisationEvent(input: NewOrganisationEventInput) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const userId = await getCurrentUserId()

      if (input.title.trim().length < 2) {
        throw new Error('Der Event-Titel muss mindestens 2 Zeichen lang sein.')
      }

      const { error: insertError } = await client
        .from('organisation_events')
        .insert({
          organisation_id: input.organisationId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          location: input.location?.trim() || null,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          created_by: userId,
        })

      if (insertError) throw insertError

      info.value = 'Event wurde erstellt.'
      await fetchOrganisationEvents()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Event konnte nicht erstellt werden.'
    } finally {
      saving.value = false
    }
  }

  async function saveEvent(eventId: string) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const userId = await getCurrentUserId()

      const { error: insertError } = await client
        .from('saved_organisation_events')
        .insert({
          event_id: eventId,
          user_id: userId,
        })

      if (insertError) {
        if (insertError.code === '23505') {
          return
        }

        throw insertError
      }

      savedEventIds.value = new Set([...savedEventIds.value, eventId])
      info.value = 'Event wurde zur Wochenansicht hinzugefügt.'
      await loadSavedOrgEvents()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Event konnte nicht gespeichert werden.'
    } finally {
      saving.value = false
    }
  }

  async function unsaveEvent(eventId: string) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const userId = await getCurrentUserId()

      const { error: deleteError } = await client
        .from('saved_organisation_events')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      const next = new Set(savedEventIds.value)
      next.delete(eventId)
      savedEventIds.value = next
      info.value = 'Event wurde aus der Wochenansicht entfernt.'
      await loadSavedOrgEvents()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Event konnte nicht entfernt werden.'
    } finally {
      saving.value = false
    }
  }

  async function deleteOrganisationEvent(eventId: string) {
    const client = getClient()
    if (!client) return

    saving.value = true
    error.value = null
    info.value = null

    try {
      const { error: deleteError } = await client
        .from('organisation_events')
        .delete()
        .eq('id', eventId)

      if (deleteError) throw deleteError

      events.value = events.value.filter(e => e.id !== eventId)

      if (savedEventIds.value.has(eventId)) {
        const next = new Set(savedEventIds.value)
        next.delete(eventId)
        savedEventIds.value = next
        await loadSavedOrgEvents()
      }

      info.value = 'Event wurde gelöscht.'
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Event konnte nicht gelöscht werden.'
    } finally {
      saving.value = false
    }
  }

  return {
    organisations,
    organisationsWithState,
    memberships,
    events,
    savedEventIds,
    myOrganisationIds,
    loading,
    saving,
    error,
    info,
    fetchOrganisations,
    fetchOrganisationEvents,
    fetchSavedEvents,
    createOrganisation,
    joinOrganisation,
    leaveOrganisation,
    createOrganisationEvent,
    deleteOrganisationEvent,
    saveEvent,
    unsaveEvent,
  }
}