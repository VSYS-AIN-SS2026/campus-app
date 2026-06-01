<script setup lang="ts">
import { computed } from 'vue'
import SpoSelector from './SpoSelector.vue'
import type { Spo, StudyProgram, UserProfile } from '../types'

const props = defineProps<{
  userProfile: UserProfile | null
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

      <div class="profile-card-divider" />

      <p class="panel-eyebrow">Aktuell gespeichert</p>
      <dl class="profile-saved-grid">
        <div class="profile-saved-row">
          <dt>Studiengang</dt>
          <dd :class="savedStudyProgram ? 'profile-selection-active' : ''">
            {{ savedStudyProgram ? getStudyProgramLabel(savedStudyProgram) : 'noch nicht ausgewählt' }}
          </dd>
        </div>
        <div class="profile-saved-row">
          <dt>SPO</dt>
          <dd :class="savedSpo ? 'profile-selection-active' : ''">
            {{ savedSpo ? getSpoLabel(savedSpo) : savedStudyProgram ? 'noch nicht ausgewählt' : 'wähle zuerst einen Studiengang' }}
          </dd>
        </div>
      </dl>

      <p class="helper-copy profile-state-hint">
        {{ selectionDirty ? 'Ungespeicherte Änderungen vorhanden.' : 'Alles ist gespeichert.' }}
      </p>
    </section>

    <section class="profile-panel">
      <p class="panel-eyebrow">Auswahl</p>
      <div class="controls-bar">
        <div class="control-step">
          <p class="control-step-label">1 · Studiengang</p>
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
          <p class="control-step-label">2 · SPO</p>
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
            Studiengang und SPO werden in deinem Profil gespeichert.
          </p>
        </div>

        <button
          class="save-button"
          type="button"
          :disabled="isSaveDisabled"
          @click="emit('save')"
        >
          {{ profileSaving ? 'Wird gespeichert…' : 'Auswahl speichern' }}
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
