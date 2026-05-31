<!-- src/components/TeamsManager.vue -->
<template>
  <div class="teams-manager">
    <header class="section-header">
      <h2>Meine Teams</h2>
      <div class="create-team-form">
        <input v-model="newTeamName" placeholder="Team Name" class="input-field" />
        <button @click="handleCreateTeam" :disabled="!newTeamName" class="primary-button">Team erstellen</button>
      </div>
    </header>

    <!-- Einladungen anzeigen -->
    <div v-if="invitations.length > 0" class="invitations-section">
    <h3>Offene Einladungen</h3>

    <div v-for="inv in invitations" :key="inv.id" class="invitation-card">
        <div>
        <strong>{{ inv.teams?.name || 'Unbekanntes Team' }}</strong>
        <p>
            Eingeladen von
            {{ inv.invited_by_user?.full_name || inv.invited_by_user?.email || 'Unbekannt' }}
        </p>
        </div>

        <div class="actions">
        <button @click="respondToInvitation(inv.id, inv.team_id, true)" class="accept-btn">
            ✓
        </button>
        <button @click="respondToInvitation(inv.id, inv.team_id, false)" class="reject-btn">
            ✕
        </button>
        </div>
    </div>
    </div>

    <!-- Team Liste -->
    <div v-if="loading" class="loading">Lädt...</div>
    <div v-else class="teams-list">
      <div v-for="team in teams" :key="team.id" class="team-card">
        <div class="team-header">
          <h3>{{ team.name }}</h3>
          <button v-if="team.created_by === currentUserId" @click="deleteTeam(team.id)" class="delete-btn">Löschen</button>
        </div>

        <div v-if="team.created_by === currentUserId" class="expiration-section">
          <label class="expiration-label">
            Ablaufdatum:
            <input
              type="date"
              :value="team.expires_at ? team.expires_at.substring(0, 10) : ''"
              @change="handleSetExpiration(team.id, ($event.target as HTMLInputElement).value)"
              class="input-field-sm"
            />
          </label>
          <span v-if="team.expires_at" class="expiration-info">
            Läuft ab am {{ new Date(team.expires_at).toLocaleDateString('de-DE') }}
          </span>
          <button v-if="team.expires_at" @click="handleSetExpiration(team.id, '')" class="ghost-button small">Ablaufdatum entfernen</button>
        </div>

            <button
            type="button"
            class="ghost-button"
            @click="toggleInviteForm(team.id)"
            >
            Nutzer einladen
            </button>

            <div v-if="inviteFormOpen[team.id]" class="invite-section">
            <input
                v-model="inviteEmails[team.id]"
                placeholder="Nutzer E-Mail"
                class="input-field-sm"
            />

            <button
                type="button"
                class="ghost-button"
                @click="handleInvite(team.id)"
            >
                Einladung senden
            </button>
        </div>
        
        <p v-if="inviteError === team.id" class="error-text small">{{ lastErrorMessage }}</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTeams } from '../composables/useTeams'
import { supabase } from '../supabase'

const { teams, invitations, loading, fetchTeams, fetchMyInvitations, createTeam, inviteUserByEmail, respondToInvitation, setTeamExpiration, deleteTeam } = useTeams()

const newTeamName = ref('')
const inviteEmails = ref<Record<string, string>>({})
const currentUserId = ref('')
const inviteError = ref<string | null>(null)
const lastErrorMessage = ref('')
const inviteFormOpen = ref<Record<string, boolean>>({})

function toggleInviteForm(teamId: string) {
  inviteFormOpen.value[teamId] = !inviteFormOpen.value[teamId]
}

onMounted(async () => {
  const client = supabase // Sicherheits-Konstante erstellen
  
  if (!client) {
    console.error("Supabase Client konnte nicht geladen werden.")
    return
  }

  // Ab hier weiß TypeScript: client ist nicht null
  const { data: { user } } = await client.auth.getUser()
  
  if (user) {
    currentUserId.value = user.id
  }

  // Da diese Funktionen aus useTeams() kommen, 
  // haben sie intern bereits ihre eigene Sicherheits-Logik
  fetchTeams()
  fetchMyInvitations()
})

async function handleCreateTeam() {
  await createTeam(newTeamName.value)
  newTeamName.value = ''
}

async function handleSetExpiration(teamId: string, value: string) {
  await setTeamExpiration(teamId, value || null)
}

async function handleInvite(teamId: string) {
  try {
    inviteError.value = null
    await inviteUserByEmail(teamId, inviteEmails.value[teamId])
    inviteEmails.value[teamId] = ''
    inviteFormOpen.value[teamId] = false
    alert('Einladung gesendet!')
  } catch (err: any) {
    inviteError.value = teamId
    lastErrorMessage.value = err.message
  }
}
</script>

<style scoped>
.teams-manager { display: flex; flex-direction: column; gap: 2rem; padding: 1rem; }
.team-card { border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; background: var(--color-surface); }
.team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.invite-section { display: flex; gap: 0.5rem; margin-top: 1rem; }
.input-field { padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--color-border); flex: 1; }
.input-field-sm { padding: 0.25rem 0.5rem; border-radius: 0.4rem; border: 1px solid var(--color-border); font-size: 0.85rem; }
.error-text { color: #ff4d4f; margin-top: 0.5rem; }
.small { font-size: 0.75rem; }
.accept-btn { background: #52c41a; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.4rem; cursor: pointer; }
.reject-btn { background: transparent; border: 1px solid #ff4d4f; color: #ff4d4f; padding: 0.4rem 0.8rem; border-radius: 0.4rem; cursor: pointer; }
.delete-btn { color: #ff4d4f; background: none; border: none; cursor: pointer; font-size: 0.8rem; text-decoration: underline; }
.expiration-section { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.expiration-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.expiration-info { font-size: 0.8rem; color: var(--color-text-secondary, #666); }
.ghost-button.small { font-size: 0.75rem; padding: 0.2rem 0.5rem; }
</style>