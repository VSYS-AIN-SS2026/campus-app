<script setup lang="ts">
import { ref, watch } from 'vue'
import { dateTimeInputToUtcIso, dateTimeInputValue } from '../../utils/datetime'
import type { CombinedAppointment, NewAppointmentInput } from '../../types/teamWeek'

const props = withDefaults(defineProps<{
  open: boolean
  appointment: CombinedAppointment | null
  currentUserId: string | null
  loading?: boolean
  error?: string | null
}>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  close: []
  update: [payload: NewAppointmentInput]
  delete: [id: string]
}>()

const isEditing = ref(false)
const title = ref('')
const description = ref('')
const startInput = ref('')
const endInput = ref('')

const dateFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

function formatRange(a: string, b: string): string {
  return `${dateFmt.format(new Date(a))} – ${dateFmt.format(new Date(b))}`
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    isEditing.value = false
    return
  }
  const a = props.appointment
  if (!a) return
  title.value = a.title
  description.value = a.description ?? ''
  startInput.value = dateTimeInputValue(new Date(a.startsAt))
  endInput.value = dateTimeInputValue(new Date(a.endsAt))
})

function startEdit() {
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  const a = props.appointment
  if (!a) return
  title.value = a.title
  description.value = a.description ?? ''
  startInput.value = dateTimeInputValue(new Date(a.startsAt))
  endInput.value = dateTimeInputValue(new Date(a.endsAt))
}

function onSubmit() {
  if (!props.appointment || props.loading) return
  emit('update', {
    title: title.value.trim(),
    description: description.value.trim() || null,
    startsAt: dateTimeInputToUtcIso(startInput.value),
    endsAt: dateTimeInputToUtcIso(endInput.value),
  })
}

function onDelete() {
  if (!props.appointment) return
  if (!confirm('Termin wirklich löschen?')) return
  emit('delete', props.appointment.id)
}

const isCreator = () => props.currentUserId != null && props.appointment?.createdBy === props.currentUserId
</script>

<template>
  <div
    v-if="open && appointment"
    class="dialog-overlay"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <h3 id="add-title" class="dialog__title">{{ appointment.title }}</h3>

      <!-- Read-only view -->
      <template v-if="!isEditing">
        <p v-if="appointment.description" class="add-desc">{{ appointment.description }}</p>
        <p class="add-time">{{ formatRange(appointment.startsAt, appointment.endsAt) }}</p>

        <div v-if="appointment.attendees && appointment.attendees.length > 0" class="add-attendees">
          <span class="add-label">Teilnehmer</span>
          <ul class="add-attendee-list">
            <li v-for="att in appointment.attendees" :key="att.userId ?? att.name" class="add-attendee">
              <span class="add-attendee-name">{{ att.name }}</span>
              <span v-if="att.status === 'accepted'" class="status-badge status-badge--ok">zugesagt</span>
              <span v-else class="status-badge status-badge--pending">offen</span>
            </li>
          </ul>
        </div>

        <div class="dialog__actions">
          <button type="button" class="app-button" @click="emit('close')">Schließen</button>
          <button v-if="isCreator()" type="button" class="app-button dialog__edit" @click="startEdit">Bearbeiten</button>
          <button v-if="isCreator()" type="button" class="app-button dialog__delete" @click="onDelete">Löschen</button>
        </div>
      </template>

      <!-- Edit view -->
      <template v-else>
        <form class="dialog__form" @submit.prevent="onSubmit">
          <label class="dialog__field">
            <span class="dialog__label">Titel</span>
            <input v-model="title" class="dialog__input" type="text" />
          </label>

          <label class="dialog__field">
            <span class="dialog__label">Beschreibung</span>
            <textarea v-model="description" class="dialog__input" rows="3" />
          </label>

          <div class="dialog__row">
            <label class="dialog__field">
              <span class="dialog__label">Start</span>
              <input v-model="startInput" class="dialog__input" type="datetime-local" />
            </label>
            <label class="dialog__field">
              <span class="dialog__label">Ende</span>
              <input v-model="endInput" class="dialog__input" type="datetime-local" />
            </label>
          </div>

          <p v-if="error" class="dialog__error" role="alert">{{ error }}</p>

          <div class="dialog__actions">
            <button type="button" class="app-button" @click="cancelEdit">Abbrechen</button>
            <button type="submit" class="app-button dialog__submit" :disabled="loading">
              {{ loading ? 'Wird gespeichert…' : 'Speichern' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  background: color-mix(in srgb, #000 45%, transparent);
}

.dialog {
  width: min(28rem, 100%);
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  box-shadow: 0 1rem 2rem -0.75rem color-mix(in srgb, #000 40%, transparent);
}

.dialog__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
}

.add-desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.55;
}

.add-time {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.add-attendees {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.add-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.add-attendee-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.add-attendee {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-size: var(--font-size-sm);
}

.add-attendee-name {
  flex: 1;
  color: var(--color-text);
}

.status-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.375rem;
  border-radius: 999rem;
}

.status-badge--ok {
  background: color-mix(in srgb, #16a34a 14%, transparent);
  color: #16a34a;
}

.status-badge--pending {
  background: color-mix(in srgb, #d97706 14%, transparent);
  color: #d97706;
}

.dialog__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.dialog__row {
  display: flex;
  gap: var(--space-md);
}

.dialog__label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.dialog__input {
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control, 0.375rem);
  background: var(--color-surface-raised);
  color: var(--color-text);
  padding: 0.375rem 0.5rem;
  font: inherit;
  font-size: var(--font-size-sm);
  min-width: 0;
}

.dialog__error {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-error, #dc2626);
}

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-sm);
}

.dialog__edit {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.dialog__delete {
  background: transparent;
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.dialog__delete:hover {
  border-color: #ef4444;
}

.dialog__submit {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.dialog__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
