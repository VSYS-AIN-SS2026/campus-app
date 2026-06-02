// src/composables/useTeams.ts
import { computed, ref } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../supabase'

// Module-level singletons: shared across all useTeams() callers.
const invitations = ref<any[]>([])
const invitationCount = computed(() => invitations.value.length)
let invChannel: RealtimeChannel | null = null

export function useTeams() {
    const teams = ref<any[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // teamId -> [userId, ...] (all members per team)
    const allTeamMembers = ref<Map<string, string[]>>(new Map())
    // userId -> full_name | null
    const memberProfiles = ref<Map<string, string | null>>(new Map())

  /**
   * Hilfsfunktion um sicherzustellen, dass der Client geladen ist
   */
  function getClient() {
    const client = supabase
    if (!client) {
      console.error("Supabase Client nicht initialisiert")
      return null
    }
    return client
  }

  async function fetchTeams() {
    const client = getClient()
    if (!client) return

    loading.value = true
    error.value = null
    
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      loading.value = false
      return
    }

    const { data, error: err } = await client
      .from('teams')
      .select(`
        *,
        team_members!inner (user_id, role),
        created_by_user:profiles!created_by (full_name)
      `)
      .eq('team_members.user_id', user.id)
    
    if (err) {
      error.value = err.message
      loading.value = false
      return
    }

    teams.value = data ?? []

    // Load member data via get_team_details (SECURITY DEFINER — bypasses RLS on team_members).
    // Direct queries on team_members return no rows because the UUID table has RLS enabled
    // without a permissive SELECT policy.
    const teamIds = (data ?? []).map((t: any) => t.id as string)
    if (teamIds.length > 0) {
      const detailResults = await Promise.all(
        teamIds.map((id) =>
          client.rpc('get_team_details', { p_team_id: id }).maybeSingle()
        )
      )

      const memberMap = new Map<string, string[]>()
      const profileMap = new Map<string, string | null>()

      teamIds.forEach((teamId, i) => {
        const detail = detailResults[i].data as { members?: Array<{ name: string; email: string }> } | null
        if (!detail) return
        const members = detail.members ?? []
        memberMap.set(teamId, members.map((m) => m.email))
        for (const m of members) {
          profileMap.set(m.email, m.name || null)
        }
      })

      allTeamMembers.value = memberMap
      memberProfiles.value = profileMap
    }

    loading.value = false
  }

  async function fetchMyInvitations() {
    const client = getClient()
    if (!client) return

    const { data: { user } } = await client.auth.getUser()
    if (!user) return

    const { data, error: err } = await client
      .from('team_invitations')
      .select(`
        *,
        teams (name),
        invited_by_user:profiles!invited_by (full_name, email)
      `)
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')

    if (err) {
      console.error('Einladungs-Fehler:', err.message)
    } else {
      invitations.value = data
    }
  }

  async function createTeam(name: string) {

    const client = getClient()
    if (!client) return

    loading.value = true
    const { data: { user } } = await client.auth.getUser()
    if (!user) return

    const { data: newTeam, error: teamErr } = await client
      .from('teams')
      .insert([{ name, created_by: user.id }])
      .select()
      .single()

    if (teamErr) {
      error.value = teamErr.message
      loading.value = false
      return
    }

    await client
      .from('team_members')
      .insert([{ team_id: newTeam.id, user_id: user.id, role: 'admin' }])

    await fetchTeams()
    loading.value = false
  }

  async function inviteUserByEmail(teamId: string, email: string) {
  const client = getClient()
  if (!client) return

  error.value = null

  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Bitte eine E-Mail eingeben.')
  }

  // 1. Eingeloggten Nutzer holen
  const { data: { user }, error: authErr } = await client.auth.getUser()

  if (authErr) throw new Error(authErr.message)
  if (!user) throw new Error('Du bist nicht eingeloggt.')

  // 2. Eingeladenen Nutzer in profiles suchen
  const { data: invitedUser, error: userErr } = await client
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (userErr) throw new Error(userErr.message)
  if (!invitedUser) throw new Error('Nutzer nicht gefunden.')

  // 3. Sich selbst einladen verhindern
  if (invitedUser.id === user.id) {
    throw new Error('Du kannst dich nicht selbst einladen.')
  }

  // 4. Prüfen, ob Nutzer bereits Mitglied ist
  const { data: existingMember, error: memberErr } = await client
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', invitedUser.id)
    .maybeSingle()

  if (memberErr) throw new Error(memberErr.message)

  if (existingMember) {
    throw new Error('Nutzer ist bereits im Team.')
  }

  // 5. Prüfen, ob Einladung bereits offen ist
  const { data: existingInvitation, error: invitationCheckErr } = await client
    .from('team_invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('invited_user_id', invitedUser.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (invitationCheckErr) throw new Error(invitationCheckErr.message)

  if (existingInvitation) {
    throw new Error('Einladung bereits ausstehend.')
  }

  // 6. Einladung erstellen
  const { error: insertErr } = await client
    .from('team_invitations')
    .insert([{
      team_id: teamId,
      invited_user_id: invitedUser.id,
      invited_by: user.id,
      status: 'pending'
    }])

  if (insertErr) {
    if (insertErr.code === '23505') {
      throw new Error('Einladung bereits ausstehend.')
    }

    if (insertErr.code === '23503') {
      throw new Error('Foreign-Key-Fehler: profiles/Team-Referenzen passen noch nicht zusammen.')
    }

    throw new Error(insertErr.message)
  }

  return (invitedUser.full_name as string | null) ?? normalizedEmail
}

  async function respondToInvitation(invitationId: string, teamId: string, accept: boolean) {
  const client = getClient()
  if (!client) return

  const { data: { user } } = await client.auth.getUser()
  if (!user) return

  // Optimistically remove from local state
  const removed = invitations.value.find((i) => i.id === invitationId)
  invitations.value = invitations.value.filter((i) => i.id !== invitationId)

  if (accept) {
    const { error: memberErr } = await client
      .from('team_members')
      .insert([{ team_id: teamId, user_id: user.id, role: 'member' }])

    if (memberErr && memberErr.code !== '23505') {
      // Restore on error
      if (removed) invitations.value.push(removed)
      throw new Error(memberErr.message)
    }
  }

  const { error: deleteErr } = await client
    .from('team_invitations')
    .delete()
    .eq('id', invitationId)

  if (deleteErr) {
    // Restore on error
    if (removed) invitations.value.push(removed)
    throw new Error(deleteErr.message)
  }

  await fetchTeams()
}

  async function setTeamExpiration(teamId: string, expiresAt: string | null) {
    const client = getClient()
    if (!client) return

    const { error: err } = await client
      .from('teams')
      .update({ expires_at: expiresAt })
      .eq('id', teamId)

    if (err) {
      error.value = err.message
    } else {
      await fetchTeams()
    }
  }

  async function triggerTeamCleanup() {
    const client = getClient()
    if (!client) return

    const { data, error: err } = await client.rpc('trigger_team_cleanup')

    if (err) {
      error.value = err.message
      return 0
    }

    await fetchTeams()
    return data as number
  }

  async function deleteTeam(teamId: string) {
    const client = getClient()
    if (!client) return

    if (!confirm('Team wirklich löschen?')) return
    
    loading.value = true
    const { error: err } = await client.from('teams').delete().eq('id', teamId)
    
    if (err) error.value = err.message
    else await fetchTeams()
    
    loading.value = false
  }

  // ===================== Realtime: team_invitations → refresh invitations =====================
  function subscribeToInvitations(userId: string) {
    const client = getClient()
    if (!client) return
    if (invChannel) {
      void client.removeChannel(invChannel)
      invChannel = null
    }
    invChannel = client
      .channel('my-invitations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_invitations',
          filter: `invited_user_id=eq.${userId}`,
        },
        async () => {
          await fetchMyInvitations()
        },
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[realtime:my-invitations]', status, err)
        }
      })
  }

  function unsubscribeFromInvitations() {
    const client = getClient()
    if (client && invChannel) {
      void client.removeChannel(invChannel)
      invChannel = null
    }
  }

  return {
    teams,
    invitations,
    invitationCount,
    loading,
    error,
    allTeamMembers,
    memberProfiles,
    fetchTeams,
    fetchMyInvitations,
    createTeam,
    inviteUserByEmail,
    respondToInvitation,
    setTeamExpiration,
    triggerTeamCleanup,
    deleteTeam,
    subscribeToInvitations,
    unsubscribeFromInvitations,
  }
}