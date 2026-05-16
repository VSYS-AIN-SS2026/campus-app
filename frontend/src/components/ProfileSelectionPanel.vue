<script setup lang="ts">
import SpoSelector from './SpoSelector.vue'
import type { Spo, StudyProgram, UserProfile } from '../types'

defineProps<{
  demoUserProfile: UserProfile | null
  savedStudyProgram: StudyProgram | null
  savedSpo: Spo | null
  selectionDirty: boolean
  selectedStudyProgramId: string | null
  selectedSpoId: string | null
  studyProgramItems: { id: string; label: string }[]
  spoItems: { id: string; label: string }[]
  loading: boolean
  profileSaving: boolean
  profileError: string | null
  profileInfo: string | null
  getStudyProgramLabel: (program: StudyProgram) => string
  getSpoLabel: (spo: Spo) => string
}>()

const emit = defineEmits<{
  'update:selectedStudyProgramId': [value: string | null]
  'update:selectedSpoId': [value: string | null]
  save: []
}>()
</script>

<template>
  <div class="profile-grid">
    <section class="profile-panel">
      <span class="panel-eyebrow">Demo-Profil</span>
      <h2 class="panel-title">Alex Beispiel</h2>

      <div class="profile-meta">
        <div class="profile-meta-item">
          <span class="meta-label">E-Mail</span>
          <span class="meta-value">{{ demoUserProfile?.email ?? 'alex.beispiel@htwg-konstanz.de' }}</span>
        </div>
        <div class="profile-meta-item">
          <span class="meta-label">Hochschule</span>
          <span class="meta-value">HTWG Konstanz</span>
        </div>
      </div>
    </section>

    <section class="profile-panel">
      <span class="panel-eyebrow">Gespeicherte Auswahl</span>
      <h2 class="panel-title">Studiengang und SPO</h2>

      <p class="profile-selection" :class="savedStudyProgram ? 'profile-selection-active' : ''">
        {{ savedStudyProgram ? getStudyProgramLabel(savedStudyProgram) : 'Noch kein Studiengang gespeichert.' }}
      </p>
      <p class="profile-selection profile-selection-secondary" :class="savedSpo ? 'profile-selection-active' : ''">
        {{ savedSpo ? getSpoLabel(savedSpo) : savedStudyProgram ? 'Noch keine SPO gespeichert.' : 'Bitte zuerst eine Auswahl treffen.' }}
      </p>

      <p class="helper-copy">
        {{ selectionDirty ? 'Du hast Änderungen, die noch nicht im Demo-Profil gespeichert sind.' : 'Auswahl und Demo-Profil sind aktuell gleich.' }}
      </p>
    </section>
  </div>

  <div class="controls-bar">
    <SpoSelector
      :model-value="selectedStudyProgramId"
      :items="studyProgramItems"
      :loading="loading && !studyProgramItems.length"
      label="Studiengang"
      placeholder="— Studiengang auswählen —"
      @update:model-value="emit('update:selectedStudyProgramId', $event)"
    />
    <SpoSelector
      :model-value="selectedSpoId"
      :items="spoItems"
      :loading="false"
      label="SPO"
      placeholder="— SPO auswählen —"
      @update:model-value="emit('update:selectedSpoId', $event)"
    />
  </div>

  <div class="selection-toolbar">
    <div class="selection-toolbar-inner">
      <div class="selection-toolbar-copy">
        <p class="selection-toolbar-title">Auswahl speichern</p>
        <p class="helper-copy">
          Studiengang und SPO werden für den Demo-User in <code>users</code> gespeichert.
        </p>
      </div>

      <button
        class="save-button"
        type="button"
        :disabled="profileSaving || !selectedStudyProgramId || !selectionDirty"
        @click="emit('save')"
      >
        {{ profileSaving ? 'Wird gespeichert…' : 'Im Demo-Profil speichern' }}
      </button>
    </div>
  </div>

  <div v-if="profileError" class="error-banner">
    {{ profileError }}
  </div>

  <div v-if="profileInfo" class="success-banner">
    {{ profileInfo }}
  </div>
</template>
