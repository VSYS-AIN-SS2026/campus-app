<script setup lang="ts">
import { computed, ref } from 'vue'
import { dateInputToMonday, dateInputValue, mondayOf } from '../../utils/datetime'
import type { FreeSlotSearchParams } from '../../types/teamWeek'

const props = withDefaults(defineProps<{
  weekStart: Date
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:weekStart': [value: Date]
  submit: [params: FreeSlotSearchParams]
}>()

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const durationValue = ref(60)
const durationUnit = ref<'minutes' | 'hours'>('minutes')
const minStart = ref('08:00')
const maxEnd = ref('18:00')
const excludedWeekdays = ref<number[]>([])

const weekIso = computed(() => dateInputValue(mondayOf(props.weekStart)))

function onWeekChange(event: Event) {
  const monday = dateInputToMonday((event.target as HTMLInputElement).value)
  if (monday) {
    emit('update:weekStart', monday)
  }
}

function toggleDay(index: number) {
  const current = excludedWeekdays.value
  excludedWeekdays.value = current.includes(index)
    ? current.filter((day) => day !== index)
    : [...current, index]
}

const durationMinutes = computed(() =>
  durationUnit.value === 'hours'
    ? Math.round(durationValue.value * 60)
    : Math.round(durationValue.value),
)

const durationError = computed(() =>
  !(durationValue.value > 0) || durationMinutes.value <= 0
    ? 'Dauer muss größer als 0 sein.'
    : null,
)

const timeError = computed(() =>
  maxEnd.value <= minStart.value
    ? 'Die Endzeit muss nach der Startzeit liegen.'
    : null,
)

const isValid = computed(() => !durationError.value && !timeError.value)

function onSubmit() {
  if (!isValid.value || props.loading) {
    return
  }
  emit('submit', {
    durationMinutes: durationMinutes.value,
    minStart: minStart.value,
    maxEnd: maxEnd.value,
    excludedWeekdays: [...excludedWeekdays.value].sort((a, b) => a - b),
  })
}
</script>

<template>
  <form class="search-form" @submit.prevent="onSubmit">
    <h3 class="search-form__title">Suche</h3>

    <div class="field">
      <label class="field__label" for="sf-week">Woche</label>
      <input id="sf-week" class="field__input" type="date" :value="weekIso" @change="onWeekChange" />
    </div>

    <div class="field">
      <span class="field__label">Dauer</span>
      <div class="field__row">
        <input
          class="field__input field__input--num"
          type="number"
          min="1"
          step="1"
          v-model.number="durationValue"
          aria-label="Dauer"
        />
        <select v-model="durationUnit" class="field__input" aria-label="Einheit">
          <option value="minutes">Minuten</option>
          <option value="hours">Stunden</option>
        </select>
      </div>
      <p v-if="durationError" class="field__error">{{ durationError }}</p>
    </div>

    <div class="field__row">
      <div class="field">
        <label class="field__label" for="sf-min">Frühester Start</label>
        <input id="sf-min" class="field__input" type="time" v-model="minStart" />
      </div>
      <div class="field">
        <label class="field__label" for="sf-max">Spätestes Ende</label>
        <input id="sf-max" class="field__input" type="time" v-model="maxEnd" />
      </div>
    </div>
    <p v-if="timeError" class="field__error">{{ timeError }}</p>

    <div class="field">
      <span class="field__label">Ausgeschlossene Wochentage</span>
      <div class="weekdays">
        <label v-for="(label, index) in WEEKDAYS" :key="index" class="weekday">
          <input
            type="checkbox"
            :checked="excludedWeekdays.includes(index)"
            @change="toggleDay(index)"
          />
          {{ label }}
        </label>
      </div>
    </div>

    <button type="submit" class="app-button search-form__submit" :disabled="!isValid || loading">
      {{ loading ? 'Suche läuft…' : 'Freie Slots suchen' }}
    </button>
  </form>
</template>

<style scoped>
.search-form {
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.search-form__title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.field__label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.field__row {
  display: flex;
  gap: var(--space-md);
}

.field__input {
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control, 0.375rem);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0.375rem 0.5rem;
  font: inherit;
  font-size: var(--font-size-sm);
  min-width: 0;
}

.field__input--num {
  width: 5rem;
}

.field__error {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-error, #dc2626);
}

.weekdays {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.weekday {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--font-size-xs);
  color: var(--color-text);
}

.search-form__submit {
  margin-top: var(--space-sm);
}

.search-form__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
