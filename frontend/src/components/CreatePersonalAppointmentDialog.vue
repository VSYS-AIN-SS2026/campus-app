<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { dateTimeInputToUtcIso } from '../utils/datetime'
import type { NewPersonalAppointmentInput } from '../types/personalAppointments'

const props = withDefaults(defineProps<{
  open: boolean
  loading?: boolean
  error?: string | null
}>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  close: []
  submit: [payload: NewPersonalAppointmentInput]
}>()

const title = ref('')
const description = ref('')
const startInput = ref('')
const endInput = ref('')
const titleRef = ref<HTMLInputElement | null>(null)

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    return
  }
  title.value = ''
  description.value = ''
  startInput.value = ''
  endInput.value = ''
  void nextTick(() => titleRef.value?.focus())
})

const titleError = computed(() => (title.value.trim() === '' ? 'Titel ist erforderlich.' : null))
const timeError = computed(() =>
  startInput.value && endInput.value && endInput.value <= startInput.value
    ? 'Das Ende muss nach dem Start liegen.'
    : null,
)
const isValid = computed(
  () => !titleError.value && !timeError.value && !!startInput.value && !!endInput.value,
)

function onSubmit() {
  if (!isValid.value || props.loading) {
    return
  }
  emit('submit', {
    title: title.value.trim(),
    description: description.value.trim() || null,
    startsAt: dateTimeInputToUtcIso(startInput.value),
    endsAt: dateTimeInputToUtcIso(endInput.value),
  })
}
</script>

<template>
  <div
    v-if="open"
    class="dialog-overlay"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cpad-title">
      <h3 id="cpad-title" class="dialog__title">Eigenen Termin anlegen</h3>

      <form class="dialog__form" @submit.prevent="onSubmit">
        <label class="dialog__field">
          <span class="dialog__label">Titel</span>
          <input ref="titleRef" v-model="title" class="dialog__input" type="text" placeholder="z. B. Lerngruppe" />
        </label>

        <label class="dialog__field">
          <span class="dialog__label">Beschreibung (optional)</span>
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

        <p v-if="titleError" class="dialog__error">{{ titleError }}</p>
        <p v-if="timeError" class="dialog__error">{{ timeError }}</p>
        <p v-if="error" class="dialog__error" role="alert">{{ error }}</p>

        <div class="dialog__actions">
          <button type="button" class="app-button" @click="emit('close')">Abbrechen</button>
          <button type="submit" class="app-button dialog__submit" :disabled="!isValid || loading">
            {{ loading ? 'Wird angelegt…' : 'Anlegen' }}
          </button>
        </div>
      </form>
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

.dialog__submit {
  background: var(--color-personal, #7c3aed);
  border-color: var(--color-personal, #7c3aed);
  color: #fff;
}

.dialog__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
