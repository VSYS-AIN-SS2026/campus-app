<script setup lang="ts">
defineProps<{
  items: { id: string; label: string }[]
  modelValue: string | null
  loading?: boolean
  label?: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string | null]
}>()
</script>

<template>
  <div class="dropdown">
    <label v-if="label" :for="`select-${label}`">{{ label }}</label>
    <div class="select-wrapper">
      <select
        :id="`select-${label}`"
        :value="modelValue"
        :disabled="loading || (!items.length && !modelValue)"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">{{ placeholder ?? '— Auswählen —' }}</option>
        <option v-for="item in items" :key="item.id" :value="item.id">
          {{ item.label }}
        </option>
      </select>
      <span v-if="loading" class="select-spinner" />
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

select {
  appearance: none;
  width: 100%;
  padding: 10px 40px 10px 14px;
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-spinner {
  position: absolute;
  right: 36px;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
