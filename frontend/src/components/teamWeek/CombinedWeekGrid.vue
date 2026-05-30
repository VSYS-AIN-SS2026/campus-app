<script setup lang="ts">
import type { WeekColumnView } from '../../types/teamWeek'

defineProps<{
  columns: WeekColumnView[]
  hourSlots: number[]
  startHour: number
  totalMinutes: number
  formatTimeLabel: (minutes: number) => string
  currentDayIndex: number
  nowLineTopPercent: number | null
}>()

const emit = defineEmits<{
  'select-slot': [id: string]
}>()

const dayBodyHeightRem = (totalMinutes: number) => (totalMinutes / 60) * 3.5
</script>

<template>
  <div class="cw-grid-wrapper">
    <aside class="cw-time-axis">
      <div class="cw-time-spacer" aria-hidden="true" />
      <span
        v-for="slot in hourSlots"
        :key="slot"
        class="cw-time-label"
        :style="{ height: `${(dayBodyHeightRem(totalMinutes)) / Math.max(hourSlots.length - 1, 1)}rem` }"
      >
        {{ formatTimeLabel(slot) }}
      </span>
    </aside>

    <div class="cw-day-columns">
      <article
        v-for="(column, dayIndex) in columns"
        :key="column.key"
        class="cw-day-column"
        :class="{ 'cw-day-column--today': dayIndex === currentDayIndex }"
      >
        <header class="cw-day-header" :class="{ 'cw-day-header--today': column.isToday }">
          <span class="cw-day-name">{{ column.weekdayLabel }}</span>
          <span class="cw-day-date">{{ column.dateLabel }}</span>
        </header>

        <div class="cw-day-body" :style="{ height: `${dayBodyHeightRem(totalMinutes)}rem` }">
          <div
            v-for="slot in hourSlots"
            :key="`${column.key}-${slot}`"
            class="cw-slot-line"
            :style="{ top: `${((slot - startHour * 60) / totalMinutes) * 100}%` }"
          />

          <div
            v-if="dayIndex === currentDayIndex && nowLineTopPercent !== null"
            class="cw-now-line"
            :style="{ top: `${nowLineTopPercent}%` }"
          />

          <!-- Layer 1: zusammengefasste Belegt-Blöcke (Stundenpläne) -->
          <div
            v-for="block in column.busy"
            :key="block.id"
            class="cw-busy"
            :style="block.style"
          >
            <span class="cw-busy-time">{{ block.startTime }}–{{ block.endTime }}</span>
            <div class="cw-members" :aria-label="`${block.members.length + block.extraCount} Mitglieder belegt`">
              <span
                v-for="member in block.members"
                :key="member.id"
                class="cw-avatar"
                :style="{ background: member.color }"
                :title="member.name"
              >{{ member.initials }}</span>
              <span v-if="block.extraCount > 0" class="cw-avatar cw-avatar--more" title="weitere Mitglieder">
                +{{ block.extraCount }}
              </span>
            </div>
          </div>

          <!-- Layer 2: bestehende Termine -->
          <div
            v-for="appointment in column.appointments"
            :key="appointment.id"
            class="cw-appointment"
            :style="appointment.style"
          >
            <span class="cw-layer-tag">Termin</span>
            <strong class="cw-appointment-title">{{ appointment.label }}</strong>
            <span class="cw-layer-time">{{ appointment.timeLabel }}</span>
            <div v-if="appointment.members && appointment.members.length" class="cw-members">
              <span
                v-for="member in appointment.members"
                :key="member.id"
                class="cw-avatar"
                :style="{ background: member.color }"
                :title="member.name"
              >{{ member.initials }}</span>
            </div>
          </div>

          <!-- Layer 3: Such-Ergebnisse (Vorschläge) – klickbar -->
          <button
            v-for="result in column.searches"
            :key="result.id"
            type="button"
            class="cw-search"
            :style="result.style"
            :aria-label="`Vorschlag ${result.timeLabel} – Termin anlegen`"
            @click="emit('select-slot', result.id)"
          >
            <span class="cw-layer-tag cw-layer-tag--search">Vorschlag</span>
            <span class="cw-layer-time">{{ result.timeLabel }}</span>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.cw-grid-wrapper {
  --cw-header-height: 3rem;
  display: grid;
  grid-template-columns: clamp(2.75rem, 5vw, 3.5rem) minmax(0, 1fr);
  gap: 0.5rem;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.cw-time-axis {
  display: flex;
  flex-direction: column;
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--color-surface);
}

.cw-time-spacer {
  height: var(--cw-header-height);
  flex-shrink: 0;
}

.cw-time-label {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: flex-start;
  padding-top: 0.125rem;
  box-sizing: border-box;
  flex-shrink: 0;
}

.cw-day-columns {
  min-width: max-content;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(clamp(7rem, 13vw, 9rem), 1fr);
  gap: 0.375rem;
}

.cw-day-column {
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.625rem;
  background: var(--color-surface-raised);
  overflow: hidden;
}

.cw-day-column--today {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
}

.cw-day-header {
  min-height: var(--cw-header-height);
  padding: 0.5rem;
  border-bottom: 0.0625rem solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.125rem;
  box-sizing: border-box;
}

.cw-day-header--today {
  background: var(--color-primary-glow);
}

.cw-day-name {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.cw-day-date {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-text);
}

.cw-day-body {
  position: relative;
  background: var(--color-surface);
}

.cw-slot-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 0.0625rem dashed color-mix(in srgb, var(--color-border) 75%, transparent);
}

.cw-now-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 0.125rem solid #ef4444;
  z-index: 4;
  pointer-events: none;
}

/* Layer 1: Belegt (Stundenpläne) */
.cw-busy {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--color-primary-glow) 60%, transparent);
  border: 0.0625rem solid color-mix(in srgb, var(--color-primary-light) 50%, transparent);
  border-radius: 0.375rem;
  padding: 0.25rem 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.cw-busy-time {
  font-size: 0.66rem;
  color: var(--color-text-muted);
}

.cw-members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1875rem;
}

.cw-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999rem;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
  box-shadow: 0 0 0 0.0625rem color-mix(in srgb, #000 12%, transparent);
}

.cw-avatar--more {
  background: var(--color-text-muted);
}

/* Layer 2: Termine */
.cw-appointment {
  position: absolute;
  left: 0.375rem;
  right: 0.375rem;
  z-index: 2;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  border-left: 0.1875rem solid var(--color-primary);
  border-top: 0.0625rem solid var(--color-primary-light);
  border-right: 0.0625rem solid var(--color-primary-light);
  border-bottom: 0.0625rem solid var(--color-primary-light);
  border-radius: 0.25rem;
  padding: 0.25rem 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  overflow: hidden;
}

.cw-appointment-title {
  font-size: 0.72rem;
  color: var(--color-text);
  line-height: 1.2;
}

/* Layer 3: Such-Ergebnisse (klickbar) */
.cw-search {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 3;
  border: 0.125rem dashed var(--color-success-border, #16a34a);
  background: color-mix(in srgb, var(--color-success-bg, #16a34a) 22%, transparent);
  border-radius: 0.375rem;
  padding: 0.25rem 0.375rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  overflow: hidden;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease;
}

.cw-search:hover {
  background: color-mix(in srgb, var(--color-success-bg, #16a34a) 38%, transparent);
  border-style: solid;
}

.cw-search:focus-visible {
  outline: none;
  box-shadow: 0 0 0 0.125rem var(--color-success, #16a34a);
}

.cw-search:active {
  transform: translateY(0.0625rem);
}

.cw-layer-tag {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.cw-layer-tag--search {
  color: var(--color-success, #16a34a);
}

.cw-layer-time {
  font-size: 0.64rem;
  color: var(--color-text-muted);
}
</style>
