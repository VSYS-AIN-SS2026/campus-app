<template>
  <div class="teams-manager">

    <!-- Header -->
    <div class="manager-header">
      <div>
        <h2 class="manager-title">Meine Teams</h2>
        <p class="manager-subtitle">Teams, denen du angehörst</p>
      </div>
      <button class="create-btn" @click="showCreateForm = !showCreateForm">
        <span class="create-btn-icon">+</span>
        Team erstellen
      </button>
    </div>

    <!-- Create Team Form (inline, collapsible) -->
    <div v-if="showCreateForm" class="create-form">
      <input
        v-model="newTeamName"
        placeholder="Teamname eingeben…"
        class="input-field"
        autofocus
        @keydown.enter="handleCreateTeam"
        @keydown.escape="showCreateForm = false"
      />
      <div class="create-form-actions">
        <button class="primary-button" :disabled="!newTeamName.trim()" @click="handleCreateTeam">
          Erstellen
        </button>
        <button class="ghost-button" @click="showCreateForm = false">Abbrechen</button>
      </div>
    </div>

    <!-- Pending Invitations -->
    <div v-if="invitations.length > 0" class="invitations-section">
      <h3 class="invitations-title">
        Offene Einladungen
        <span class="invitations-badge">{{ invitations.length }}</span>
      </h3>
      <div v-for="inv in invitations" :key="inv.id" class="invitation-card">
        <div class="invitation-info">
          <span class="invitation-team">{{ inv.teams?.name || 'Unbekanntes Team' }}</span>
          <span class="invitation-from">
            Eingeladen von {{ inv.invited_by_user?.full_name || inv.invited_by_user?.email || 'Unbekannt' }}
          </span>
        </div>
        <div class="invitation-actions">
          <button class="accept-btn" @click="respondToInvitation(inv.id, inv.team_id, true)">
            Zusagen
          </button>
          <button class="reject-btn" @click="respondToInvitation(inv.id, inv.team_id, false)">
            Absagen
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="manager-loading">
      <div class="spinner" />
      <span>Teams werden geladen…</span>
    </div>

    <!-- Empty State -->
    <p v-else-if="!loading && teams.length === 0" class="manager-empty">
      Du bist noch in keinem Team. Erstelle ein neues oder warte auf eine Einladung.
    </p>

    <!-- Teams List -->
    <div v-else class="teams-list">
      <div
        v-for="team in teams"
        :key="team.id"
        class="team-card"
        role="button"
        tabindex="0"
        @click="router.push(`/teams/${team.id}`)"
        @keydown.enter="router.push(`/teams/${team.id}`)"
      >

        <!-- Team Name + Delete -->
        <div class="team-top">
          <h3 class="team-name">{{ team.name }}</h3>
          <button
            v-if="team.created_by === currentUserId"
            class="delete-btn"
            title="Team löschen"
            @click.stop="deleteTeam(team.id)"
          >
            Löschen
          </button>
        </div>

        <!-- Member Preview -->
        <div class="member-preview">
          <template v-if="getMembersForTeam(team.id).length > 0">
            <span
              v-for="(member, idx) in getMembersForTeam(team.id).slice(0, MAX_PREVIEW)"
              :key="member.userId"
              class="member-avatar"
              :style="{ background: member.color, marginLeft: idx > 0 ? '-0.375rem' : '0' }"
              :title="member.name ?? member.userId"
            >
              {{ getInitials(member.name) }}
            </span>
            <span
              v-if="getMembersForTeam(team.id).length > MAX_PREVIEW"
              class="member-avatar member-avatar-more"
              :style="{ marginLeft: '-0.375rem' }"
            >
              +{{ getMembersForTeam(team.id).length - MAX_PREVIEW }}
            </span>
            <span class="member-count">
              {{ getMembersForTeam(team.id).length }}
              {{ getMembersForTeam(team.id).length === 1 ? 'Mitglied' : 'Mitglieder' }}
            </span>
          </template>
          <span v-else class="member-count">Keine Mitglieder</span>
        </div>

        <!-- Expiration Date (only for owners) — stop propagation so card click doesn't fire -->
        <div v-if="team.created_by === currentUserId" class="expiration-row" @click.stop>
          <label class="expiration-label">
            Ablaufdatum:
            <input
              type="date"
              :value="team.expires_at ? team.expires_at.substring(0, 10) : ''"
              class="input-field-sm"
              @change="handleSetExpiration(team.id, ($event.target as HTMLInputElement).value)"
            />
          </label>

          <button
            class="info-icon-btn"
            title="Was bedeutet das Ablaufdatum?"
            @click="toggleExpirationInfo(team.id)"
          >
            ⓘ
          </button>

          <button
            v-if="team.expires_at"
            class="ghost-button small"
            @click="handleSetExpiration(team.id, '')"
          >
            Entfernen
          </button>

          <div v-if="showExpirationInfo[team.id]" class="expiration-info-box">
            Teamprojekte laufen typischerweise ein Semester. Das Ablaufdatum hilft dabei,
            inaktive Teams und Projektlebenszyklen zu verwalten.
          </div>

          <span v-if="team.expires_at && !showExpirationInfo[team.id]" class="expiration-date-hint">
            Läuft ab am {{ new Date(team.expires_at).toLocaleDateString('de-DE') }}
          </span>
        </div>

        <!-- Invite Section — stop propagation so card click doesn't fire -->
        <div class="invite-controls" @click.stop>
          <button class="ghost-button invite-toggle-btn" @click="toggleInviteForm(team.id)">
            {{ inviteFormOpen[team.id] ? 'Einladung schließen' : 'Nutzer einladen' }}
          </button>

          <div v-if="inviteFormOpen[team.id]" class="invite-section">
            <input
              v-model="inviteEmails[team.id]"
              placeholder="E-Mail-Adresse"
              class="input-field invite-input"
              @keydown.enter="handleInvite(team.id)"
            />
            <button class="primary-button small" @click="handleInvite(team.id)">
              Senden
            </button>
          </div>

          <p v-if="inviteSuccess[team.id]" class="invite-feedback invite-feedback--success">
            ✓ {{ inviteSuccess[team.id] }}
          </p>
          <p v-if="inviteError[team.id]" class="invite-feedback invite-feedback--error">
            {{ inviteError[team.id] }}
          </p>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTeams } from '../composables/useTeams'
import { supabase } from '../supabase'

const router = useRouter()

const {
  teams,
  invitations,
  loading,
  allTeamMembers,
  memberProfiles,
  fetchTeams,
  fetchMyInvitations,
  createTeam,
  inviteUserByEmail,
  respondToInvitation,
  setTeamExpiration,
  deleteTeam,
} = useTeams()

const MAX_PREVIEW = 4

const MEMBER_PALETTE = [
  '#2563eb', '#db2777', '#059669', '#d97706',
  '#7c3aed', '#0891b2', '#dc2626', '#65a30d',
]

const newTeamName = ref('')
const showCreateForm = ref(false)
const currentUserId = ref('')

const inviteEmails = ref<Record<string, string>>({})
const inviteFormOpen = ref<Record<string, boolean>>({})
const inviteSuccess = ref<Record<string, string>>({})
const inviteError = ref<Record<string, string>>({})
const showExpirationInfo = ref<Record<string, boolean>>({})

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getMembersForTeam(teamId: string) {
  const userIds = allTeamMembers.value.get(teamId) ?? []
  return userIds.map((userId, index) => ({
    userId,
    name: memberProfiles.value.get(userId) ?? null,
    color: MEMBER_PALETTE[index % MEMBER_PALETTE.length],
  }))
}

function toggleInviteForm(teamId: string) {
  inviteFormOpen.value[teamId] = !inviteFormOpen.value[teamId]
  inviteSuccess.value[teamId] = ''
  inviteError.value[teamId] = ''
}

function toggleExpirationInfo(teamId: string) {
  showExpirationInfo.value[teamId] = !showExpirationInfo.value[teamId]
}

onMounted(async () => {
  const client = supabase
  if (!client) return

  const { data: { user } } = await client.auth.getUser()
  if (user) currentUserId.value = user.id

  fetchTeams()
  fetchMyInvitations()
})

async function handleCreateTeam() {
  if (!newTeamName.value.trim()) return
  await createTeam(newTeamName.value.trim())
  newTeamName.value = ''
  showCreateForm.value = false
}

async function handleSetExpiration(teamId: string, value: string) {
  await setTeamExpiration(teamId, value || null)
}

async function handleInvite(teamId: string) {
  inviteSuccess.value[teamId] = ''
  inviteError.value[teamId] = ''
  try {
    const recipientName = await inviteUserByEmail(teamId, inviteEmails.value[teamId] ?? '')
    inviteSuccess.value[teamId] = `Einladung erfolgreich gesendet an ${recipientName}.`
    inviteEmails.value[teamId] = ''
  } catch (err: any) {
    inviteError.value[teamId] = err.message
  }
}
</script>

<style scoped>
.teams-manager {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

/* Header */
.manager-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-xl);
}

.manager-title {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--space-xs);
}

.manager-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}

/* Create Button */
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-2xl);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.create-btn:hover {
  opacity: 0.88;
}

.create-btn-icon {
  font-size: 1.1em;
  font-weight: 400;
  line-height: 1;
}

/* Create Form */
.create-form {
  background: var(--color-surface-raised, var(--color-surface));
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.create-form-actions {
  display: flex;
  gap: var(--space-md);
}

/* Input Fields */
.input-field {
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  border: 0.0625rem solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.input-field-sm {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  border: 0.0625rem solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-xs);
}

/* Invitations */
.invitations-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.invitations-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.invitations-badge {
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 0.1em 0.45em;
  border-radius: 999rem;
  line-height: 1.5;
}

.invitation-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xl);
  padding: var(--space-xl) var(--space-2xl);
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.invitation-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.invitation-team {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
}

.invitation-from {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.invitation-actions {
  display: flex;
  gap: var(--space-md);
}

.accept-btn {
  padding: var(--space-sm) var(--space-xl);
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.accept-btn:hover { opacity: 0.85; }

.reject-btn {
  padding: var(--space-sm) var(--space-xl);
  background: transparent;
  border: 0.0625rem solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s;
}

.reject-btn:hover { border-color: #ef4444; }

/* Loading / Empty */
.manager-loading {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.manager-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
  padding: var(--space-3xl) 0;
}

/* Teams List */
.teams-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.team-card {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl) var(--space-3xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  user-select: none;
}

.team-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0.125rem 0.75rem 0 color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.team-card:focus-visible {
  outline: 0.125rem solid var(--color-primary);
  outline-offset: 0.125rem;
}

/* Team Top Row */
.team-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xl);
}

.team-name {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  transition: color 0.15s;
}

.team-card:hover .team-name {
  color: var(--color-primary);
}

.delete-btn {
  font-size: var(--font-size-xs);
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  flex-shrink: 0;
}

/* Member Preview */
.member-preview {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.member-avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999rem;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
  border: 0.125rem solid var(--color-surface);
  flex-shrink: 0;
  user-select: none;
}

.member-avatar-more {
  background: var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.55rem;
}

.member-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-left: var(--space-sm);
}

/* Expiration Row */
.expiration-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.expiration-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.info-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text-muted);
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
}

.info-icon-btn:hover {
  color: var(--color-primary);
}

.expiration-date-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.expiration-info-box {
  width: 100%;
  padding: var(--space-lg) var(--space-xl);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
  border: 0.0625rem solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* Invite Section */
.invite-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.invite-toggle-btn {
  align-self: flex-start;
  font-size: var(--font-size-xs);
}

.invite-section {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.invite-input {
  flex: 1;
  min-width: 0;
}

.invite-feedback {
  font-size: var(--font-size-xs);
  margin: 0;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-sm);
}

.invite-feedback--success {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
  border: 0.0625rem solid rgba(22, 163, 74, 0.25);
}

.invite-feedback--error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 0.0625rem solid rgba(239, 68, 68, 0.25);
}

/* Shared Buttons */
.primary-button {
  padding: var(--space-md) var(--space-2xl);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.primary-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.primary-button:not(:disabled):hover {
  opacity: 0.88;
}

.primary-button.small {
  padding: var(--space-sm) var(--space-xl);
  font-size: var(--font-size-xs);
}

.ghost-button {
  background: none;
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-xl);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s;
}

.ghost-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.ghost-button.small {
  font-size: var(--font-size-xs);
  padding: var(--space-xs) var(--space-md);
}

/* Spinner */
.spinner {
  width: 1.125rem;
  height: 1.125rem;
  border: 0.1875rem solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 40em) {
  .manager-header {
    flex-direction: column;
    align-items: stretch;
  }

  .create-btn {
    justify-content: center;
  }

  .team-top {
    flex-wrap: wrap;
  }

  .invite-section {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
