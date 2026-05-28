// src/composables/useTeams.ts
import { computed, ref } from 'vue'
import { supabase } from '../supabase' 



export function useTeams() {
    const teams = ref<any[]>([])
    const invitations = ref<any[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const invitationCount = computed(() => invitations.value.length)

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
    } else {
      teams.value = data
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
    .select('id, email')
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
}

  async function respondToInvitation(invitationId: string, teamId: string, accept: boolean) {
  const client = getClient()
  if (!client) return

  const { data: { user } } = await client.auth.getUser()
  if (!user) return

  if (accept) {
    const { error: memberErr } = await client
      .from('team_members')
      .insert([{ team_id: teamId, user_id: user.id, role: 'member' }])

    if (memberErr && memberErr.code !== '23505') {
      throw new Error(memberErr.message)
    }
  }

  const { error: deleteErr } = await client
    .from('team_invitations')
    .delete()
    .eq('id', invitationId)

  if (deleteErr) {
    throw new Error(deleteErr.message)
  }

  await fetchMyInvitations()
  await fetchTeams()
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

  return {
    teams,
    invitations,
    invitationCount,
    loading,
    error,
    fetchTeams,
    fetchMyInvitations,
    createTeam,
    inviteUserByEmail,
    respondToInvitation,
    deleteTeam
  }
}