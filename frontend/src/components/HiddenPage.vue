<script setup lang="ts">
import { computed } from 'vue'

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

interface HiddenEntry {
  id: string
  seriesId: string
  isSeries: boolean
  title: string
  subtitle: string | null
  dayIndex: number
  dayLabel: string
  startTime: string
  endTime: string
}

const props = defineProps<{
  entries: HiddenEntry[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  back: []
  showSeries: [seriesId: string]
}>()

const sortedEntries = computed(() =>
  [...props.entries].sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime))
)

const groupedByDay = computed(() => {
  const groups: Record<number, HiddenEntry[]> = {}
  for (const entry of sortedEntries.value) {
    if (!groups[entry.dayIndex]) groups[entry.dayIndex] = []
    groups[entry.dayIndex].push(entry)
  }
  return groups
})

const dayKeys = computed(() => Object.keys(groupedByDay.value).map(Number).sort())
</script>

<template>
  <div class="hidden-page">
    <header class="hidden-page-header">
      <button type="button" class="back-btn" @click="emit('back')">
        ← Zurück zum Kalender
      </button>
      <h2 class="hidden-page-title">Ausgeblendete Einträge</h2>
    </header>

    <div v-if="loading" class="hidden-page-loading">
      <div class="spinner" />
      <p>Ausgeblendete Einträge werden geladen…</p>
    </div>

    <div v-else-if="error" class="hidden-page-error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!entries.length" class="hidden-page-empty">
      <p>Keine ausgeblendeten Einträge.</p>
    </div>

    <template v-else>
      <p class="hidden-page-count">{{ entries.length }} ausgeblendet</p>

      <div v-for="dayIndex in dayKeys" :key="dayIndex" class="day-group">
        <h3 class="day-heading">{{ WEEKDAY_LABELS[dayIndex] }}</h3>
        <div class="entry-list">
          <div v-for="entry in groupedByDay[dayIndex]" :key="entry.id" class="entry-card">
            <div class="entry-main">
              <span class="entry-title">{{ entry.title }}</span>
              <span v-if="entry.subtitle" class="entry-subtitle">{{ entry.subtitle }}</span>
            </div>
            <div class="entry-meta">
              <span v-if="entry.startTime" class="entry-time">{{ entry.startTime }}–{{ entry.endTime }}</span>
              <span class="entry-pattern">{{ entry.isSeries ? 'Wöchentlich' : 'Einmalig' }}</span>
            </div>
            <button type="button" class="unhide-btn" @click="emit('showSeries', entry.seriesId)">
              Einblenden
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hidden-page {
  max-width: 42rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.hidden-page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s;
}

.back-btn:hover {
  border-color: var(--color-primary);
}

.hidden-page-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}

.hidden-page-loading,
.hidden-page-error,
.hidden-page-empty {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.88rem;
}

.hidden-page-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin: 0 0 1rem;
}

.day-group {
  margin-bottom: 1.25rem;
}

.day-heading {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--color-border);
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface-raised);
}

.entry-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.entry-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  flex-shrink: 0;
}

.entry-time {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.entry-pattern {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.unhide-btn {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.unhide-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto 0.75rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
