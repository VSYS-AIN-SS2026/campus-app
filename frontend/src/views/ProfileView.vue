<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '../supabase'
import { getStudyProgramLabel, getSpoLabel } from '../composables/appController/shared'
import { normalizeError } from '../utils/normalizeError'
import type { Spo, StudyProgram, UserProfile } from '../types'

const profile = ref<UserProfile | null>(null)
const studyProgram = ref<StudyProgram | null>(null)
const spo = ref<Spo | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const editing = ref(false)
const editName = ref('')
const editMatrikelNr = ref('')
const editEmail = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveInfo = ref<string | null>(null)

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

onMounted(async () => {
  if (!supabase) {
    error.value = 'Datenbankverbindung nicht verfügbar.'
    loading.value = false
    return
  }

  const { data, error: rpcError } = await supabase.rpc('get_demo_user_profile').maybeSingle()

  if (rpcError) {
    error.value = 'Profil konnte nicht geladen werden.'
    loading.value = false
    return
  }

  const typedProfile = data as UserProfile | null
  profile.value = typedProfile

  if (!typedProfile) {
    loading.value = false
    return
  }

  const [spRes, spoRes] = await Promise.all([
    typedProfile.study_program_id
      ? supabase.from('study_programs').select('id, faculty_id, code, name').eq('id', typedProfile.study_program_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    typedProfile.spo_id
      ? supabase.from('spos').select('id, study_program_id, version_name, valid_from').eq('id', typedProfile.spo_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  studyProgram.value = spRes.data as StudyProgram | null
  spo.value = spoRes.data as Spo | null
  loading.value = false
})

function startEditing() {
  editName.value = profile.value?.full_name ?? ''
  editMatrikelNr.value = profile.value?.matrikel_nr ?? ''
  editEmail.value = profile.value?.email ?? ''
  saveError.value = null
  saveInfo.value = null
  editing.value = true
}

function cancelEditing() {
  editing.value = false
  saveError.value = null
}

async function saveProfile() {
  if (!supabase || !profile.value) return

  const trimmedEmail = editEmail.value.trim().toLowerCase()
  const emailChanged = trimmedEmail !== profile.value.email

  if (!trimmedEmail) {
    saveError.value = 'E-Mail-Adresse darf nicht leer sein.'
    return
  }

  saving.value = true
  saveError.value = null
  saveInfo.value = null

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const isAuthenticated = !!authUser

  const { data, error: rpcError } = await supabase
    .rpc('update_user_profile_info', {
      new_full_name: editName.value.trim(),
      new_matrikel_nr: editMatrikelNr.value.trim() || null,
      new_email: trimmedEmail,
    })
    .maybeSingle()

  if (rpcError) {
    saving.value = false
    if (rpcError.message.includes('leer')) {
      saveError.value = 'Name darf nicht leer sein.'
    } else if (rpcError.message.includes('email_bereits_vergeben')) {
      saveError.value = 'Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.'
    } else {
      saveError.value = 'Speichern fehlgeschlagen. Bitte versuche es erneut.'
    }
    return
  }

  if (isAuthenticated && emailChanged) {
    const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail })
    saving.value = false
    profile.value = data as UserProfile
    editing.value = false

    if (authError) {
      const normalized = normalizeError(authError)
      saveError.value = normalized === 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
        ? 'E-Mail konnte nicht geändert werden. Bitte versuche es erneut.'
        : normalized
      return
    }

    saveInfo.value = `Bestätigungslink wurde an ${trimmedEmail} gesendet. Die E-Mail-Adresse wird nach der Bestätigung aktualisiert.`
    return
  }

  saving.value = false
  profile.value = data as UserProfile
  editing.value = false
  saveInfo.value = 'Profil erfolgreich gespeichert.'
  setTimeout(() => { saveInfo.value = null }, 4000)
}

async function deleteProfile() {
  if (!supabase) return

  deleting.value = true
  deleteError.value = null

  const { error: rpcError } = await supabase.rpc('delete_user_profile')

  if (rpcError) {
    deleting.value = false
    deleteError.value = 'Profil konnte nicht gelöscht werden. Bitte versuche es erneut.'
    return
  }

  await supabase.auth.signOut()
  window.location.reload()
}
</script>

<template>
  <div class="profile-page">
    <header class="page-header">
      <h1 class="page-title">Mein Profil</h1>
    </header>

    <div v-if="loading" class="status-text">Profil wird geladen…</div>

    <div v-else-if="error" class="error-banner">{{ error }}</div>

    <div v-else-if="!profile" class="status-text">Kein Profil gefunden.</div>

    <template v-else>
      <div v-if="saveInfo" class="success-banner">{{ saveInfo }}</div>

      <section class="profile-card" aria-label="Profilinformationen">
        <div class="card-header">
          <p class="panel-eyebrow">Persönliche Daten</p>
          <button
            v-if="!editing"
            type="button"
            class="app-button edit-btn"
            @click="startEditing"
          >
            Bearbeiten
          </button>
        </div>

        <!-- View mode -->
        <dl v-if="!editing" class="profile-grid">
          <div class="profile-row">
            <dt class="profile-label">Name</dt>
            <dd class="profile-value">{{ profile.full_name || '—' }}</dd>
          </div>
          <div class="profile-row">
            <dt class="profile-label">Matrikelnummer</dt>
            <dd class="profile-value">{{ profile.matrikel_nr || 'Nicht hinterlegt' }}</dd>
          </div>
          <div class="profile-row">
            <dt class="profile-label">E-Mail</dt>
            <dd class="profile-value">{{ profile.email || '—' }}</dd>
          </div>
        </dl>

        <!-- Edit mode -->
        <form v-else class="edit-form" @submit.prevent="saveProfile">
          <div class="field">
            <label for="edit-name" class="field-label">Name</label>
            <input
              id="edit-name"
              v-model="editName"
              type="text"
              class="field-input"
              placeholder="Vor- und Nachname"
              autocomplete="name"
              required
            />
          </div>
          <div class="field">
            <label for="edit-matrikel" class="field-label">Matrikelnummer</label>
            <input
              id="edit-matrikel"
              v-model="editMatrikelNr"
              type="text"
              class="field-input"
              placeholder="z. B. 273245"
              autocomplete="off"
            />
          </div>
          <div class="field">
            <label for="edit-email" class="field-label">E-Mail</label>
            <input
              id="edit-email"
              v-model="editEmail"
              type="email"
              class="field-input"
              placeholder="name@beispiel.de"
              autocomplete="email"
              required
            />
          </div>

          <div v-if="saveError" class="error-banner">{{ saveError }}</div>

          <div class="edit-actions">
            <button type="submit" class="save-button save-btn-primary" :disabled="saving">
              {{ saving ? 'Wird gespeichert…' : 'Speichern' }}
            </button>
            <button type="button" class="app-button" :disabled="saving" @click="cancelEditing">
              Abbrechen
            </button>
          </div>
        </form>

        <div class="profile-divider" role="separator" />

        <p class="panel-eyebrow">Studium</p>
        <dl class="profile-grid">
          <div class="profile-row">
            <dt class="profile-label">Studiengang</dt>
            <dd class="profile-value">
              {{ studyProgram ? getStudyProgramLabel(studyProgram) : 'Noch nicht ausgewählt' }}
            </dd>
          </div>
          <div class="profile-row">
            <dt class="profile-label">SPO Version</dt>
            <dd class="profile-value">
              {{ spo ? getSpoLabel(spo) : studyProgram ? 'Noch nicht ausgewählt' : '—' }}
            </dd>
          </div>
        </dl>
      </section>

      <div class="delete-row">
        <button
          type="button"
          class="delete-btn"
          @click="showDeleteConfirm = true"
        >
          Profil löschen
        </button>
      </div>
    </template>
  </div>

  <!-- Bestätigungs-Modal -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <h2 id="delete-dialog-title" class="modal-title">Profil wirklich löschen?</h2>
        <p class="modal-body">
          Diese Aktion ist <strong>nicht rückgängig</strong> zu machen. Alle deine Daten — Modulstatus,
          Studiengang, Matrikelnummer und Stundenplan-Einträge — werden dauerhaft gelöscht.
        </p>

        <div v-if="deleteError" class="error-banner">{{ deleteError }}</div>

        <div class="modal-actions">
          <button
            type="button"
            class="delete-btn"
            :disabled="deleting"
            @click="deleteProfile"
          >
            {{ deleting ? 'Wird gelöscht…' : 'Ja, Profil löschen' }}
          </button>
          <button
            type="button"
            class="app-button"
            :disabled="deleting"
            @click="showDeleteConfirm = false"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.profile-page {
  padding: var(--space-4xl) var(--space-3xl);
  width: 100%;
  max-width: 40rem;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.page-header {
  margin-bottom: 0;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin: 0;
}

.status-text {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* .error-banner and .success-banner are global classes from app.css */

.profile-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: var(--space-3xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* .edit-btn extends the global .app-button */
.edit-btn {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.edit-btn:hover:enabled {
  background: var(--color-primary-subtle);
}

.profile-grid {
  display: flex;
  flex-direction: column;
}

.profile-row {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: var(--space-3xl);
  padding: var(--space-xl) 0;
  border-bottom: 1px solid var(--color-border);
}

.profile-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.profile-row:first-child {
  padding-top: 0;
}

.profile-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
}

.profile-value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.profile-divider {
  border: none;
  border-top: 1px solid var(--color-border);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-input {
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-surface-raised);
  border: var(--button-border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  padding: var(--button-padding-y) var(--button-padding-x-wide);
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 var(--button-focus-ring-width) var(--color-primary-glow);
}

.edit-actions {
  display: flex;
  gap: var(--space-xl);
}

/* .save-btn-primary extends the global .save-button with primary fill */
.save-btn-primary {
  background: var(--color-primary);
  color: var(--color-surface);
  border-color: var(--color-primary);
}

.save-btn-primary:hover:enabled {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.delete-row {
  display: flex;
  justify-content: flex-end;
}

.delete-btn {
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-danger, #e53e3e);
  background: transparent;
  border: var(--button-border-width) solid var(--color-danger, #e53e3e);
  border-radius: var(--radius-control);
  padding: var(--button-padding-y) var(--button-padding-x-wide);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.delete-btn:hover:enabled {
  background: var(--color-danger, #e53e3e);
  color: #fff;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-3xl);
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3xl);
  max-width: 30rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.modal-body {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: var(--space-xl);
}

@media (max-width: 45em) {
  .profile-page {
    padding: var(--space-2xl) var(--space-xl);
  }

  .profile-row {
    grid-template-columns: 1fr;
    gap: var(--space-sm);
  }

  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
