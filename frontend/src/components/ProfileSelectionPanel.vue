<script setup lang="ts">
import { computed } from 'vue'
import SpoSelector from './SpoSelector.vue'
import type { Spo, StudyProgram, UserProfile } from '../types'

const props = defineProps<{
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

const hasStudyProgramSelection = computed(() => Boolean(props.selectedStudyProgramId))
const hasSpoSelection = computed(() => Boolean(props.selectedSpoId))

const flowStatusText = computed(() => {
  if (props.profileSaving) {
    return 'Speicherung läuft…'
  }

  if (!hasStudyProgramSelection.value) {
    return 'Schritt 1 von 3: Studiengang auswählen'
  }

  if (!hasSpoSelection.value) {
    return 'Schritt 2 von 3: SPO auswählen'
  }

  if (props.selectionDirty) {
    return 'Schritt 3 von 3: Auswahl speichern'
  }

  return 'Alles aktuell: Auswahl ist gespeichert'
})

const nextActionHint = computed(() => {
  if (!hasStudyProgramSelection.value) {
    return 'Wähle zuerst einen Studiengang, damit die passenden SPOs geladen werden.'
  }

  if (!hasSpoSelection.value) {
    return 'Wähle danach die passende SPO aus.'
  }

  if (props.selectionDirty) {
    return 'Speichere die Auswahl, damit Kalender und Modulstatus dauerhaft zu deinem Profil passen.'
  }

  return 'Du kannst jetzt direkt in Kalender oder Modulliste weiterarbeiten.'
})

const isSaveDisabled = computed(() => {
  return props.profileSaving || !hasStudyProgramSelection.value || !props.selectionDirty
})

const saveDisabledHint = computed(() => {
  if (props.profileSaving) {
    return null
  }

  if (!hasStudyProgramSelection.value) {
    return 'Zum Speichern wähle zuerst einen Studiengang aus.'
  }

  if (!hasSpoSelection.value) {
    return 'Zum Speichern wähle danach eine SPO aus.'
  }

  if (!props.selectionDirty) {
    return 'Es gibt aktuell keine neuen Änderungen zum Speichern.'
  }

  return null
})
</script>

<template>
  <div class="profile-selection-stack">
    <section class="profile-flow-card" aria-live="polite">
      <p class="panel-eyebrow">Status</p>
      <p class="profile-flow-status">{{ flowStatusText }}</p>
      <p class="helper-copy">{{ nextActionHint }}</p>

      <p class="panel-eyebrow">Aktuell gespeichert</p>
      <p class="profile-selection" :class="savedStudyProgram ? 'profile-selection-active' : ''">
        {{ savedStudyProgram ? `Studiengang: ${getStudyProgramLabel(savedStudyProgram)}` : 'Studiengang: noch nicht ausgewählt' }}
      </p>
      <p class="profile-selection profile-selection-secondary" :class="savedSpo ? 'profile-selection-active' : ''">
        {{ savedSpo ? `SPO: ${getSpoLabel(savedSpo)}` : savedStudyProgram ? 'SPO: noch nicht ausgewählt' : 'SPO: wähle zuerst einen Studiengang' }}
      </p>
      <p class="helper-copy">
        {{ selectionDirty ? 'Du hast Änderungen gemacht, die noch nicht gespeichert sind.' : 'Alles ist gespeichert. Du kannst direkt weiterarbeiten.' }}
      </p>
    </section>

    <section class="profile-panel">
      <p class="panel-eyebrow">Auswahl</p>
      <div class="controls-bar">
        <div class="control-step">
          <p class="panel-eyebrow">Schritt 1</p>
          <SpoSelector
            :model-value="selectedStudyProgramId"
            :items="studyProgramItems"
            :loading="loading && !studyProgramItems.length"
            label="Studiengang"
            placeholder="— Studiengang auswählen —"
            @update:model-value="emit('update:selectedStudyProgramId', $event)"
          />
        </div>
        <div class="control-step">
          <p class="panel-eyebrow">Schritt 2</p>
          <SpoSelector
            :model-value="selectedSpoId"
            :items="spoItems"
            :loading="false"
            label="SPO"
            placeholder="— SPO auswählen —"
            @update:model-value="emit('update:selectedSpoId', $event)"
          />
          <p class="control-hint">SPO = Studien- und Prüfungsordnung deines Studiengangs.</p>
        </div>
      </div>
    </section>

    <section class="selection-toolbar">
      <div class="selection-toolbar-inner">
        <div class="selection-toolbar-copy">
          <p class="selection-toolbar-title">Schritt 3: Auswahl speichern</p>
          <p class="helper-copy">
            Studiengang und SPO werden im Demo-Profil gespeichert.
          </p>
        </div>

        <button
          class="save-button"
          type="button"
          :disabled="isSaveDisabled"
          @click="emit('save')"
        >
          {{ profileSaving ? 'Wird gespeichert…' : 'Im Demo-Profil speichern' }}
        </button>
      </div>
      <p v-if="saveDisabledHint" class="save-disabled-hint">{{ saveDisabledHint }}</p>
    </section>

    <div v-if="profileError" class="error-banner">
      {{ profileError }}
    </div>

    <div v-if="profileInfo" class="success-banner">
      {{ profileInfo }}
    </div>
  </div>
</template>
