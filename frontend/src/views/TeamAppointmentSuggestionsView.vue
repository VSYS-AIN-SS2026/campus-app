<script setup lang="ts">
import { useRoute } from 'vue-router'
import CombinedWeekView from '../components/teamWeek/CombinedWeekView.vue'
import type {
  CombinedAppointment,
  CombinedSearchSlot,
  CombinedWeekMember,
  MemberScheduleSlot,
} from '../types/teamWeek'

const route = useRoute()
const teamId = route.params.id as string

// =====================================================================
// DEMO-DATEN – ersetzt eine spätere Story durch echte Daten:
//   * Mitglieder-Stundenpläne (neuer Backend-Endpunkt nötig)
//   * Termine via get_team_appointments
//   * Suchergebnisse aus dem Such-Tool
// =====================================================================
const sampleMembers: CombinedWeekMember[] = [
  { id: 'm-anna', name: 'Anna Demo' },
  { id: 'm-ben', name: 'Ben Demo' },
  { id: 'm-carla', name: 'Carla Demo' },
]

const sampleSlots: MemberScheduleSlot[] = [
  // Montag: identischer Slot aller drei (wird zusammengefasst)
  { memberId: 'm-anna', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  { memberId: 'm-ben', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  { memberId: 'm-carla', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  // Montag: zwei Mitglieder
  { memberId: 'm-anna', dayIndex: 0, startTime: '10:00', endTime: '12:00', title: 'Übung' },
  { memberId: 'm-ben', dayIndex: 0, startTime: '10:00', endTime: '12:00', title: 'Übung' },
  // Montag: ein Mitglied
  { memberId: 'm-carla', dayIndex: 0, startTime: '13:00', endTime: '15:00', title: 'Labor' },
  // Dienstag: Teilüberlappung -> segmentierte Blöcke
  { memberId: 'm-anna', dayIndex: 1, startTime: '09:00', endTime: '11:00', title: 'Seminar' },
  { memberId: 'm-ben', dayIndex: 1, startTime: '10:00', endTime: '12:00', title: 'Seminar' },
  // Mittwoch: ausgeblendet zählt weiterhin als belegt
  { memberId: 'm-anna', dayIndex: 2, startTime: '08:00', endTime: '09:30', title: 'Tutorium', state: 'hidden' },
  { memberId: 'm-ben', dayIndex: 2, startTime: '08:00', endTime: '09:30', title: 'Tutorium' },
  // Mittwoch: abgewählt -> komplett herausgefiltert (erzeugt keinen Block)
  { memberId: 'm-carla', dayIndex: 2, startTime: '14:00', endTime: '16:00', title: 'Optional', state: 'deselected' },
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

// Termin-Datum relativ zur aktuellen Woche, Uhrzeit bewusst in UTC (Z),
// damit die UTC -> Browser-Zeit-Umrechnung sichtbar wird.
function isoOnThisWeek(dayOffset: number, utcTime: string): string {
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + dayOffset)
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}T${utcTime}Z`
}

const sampleAppointments: CombinedAppointment[] = [
  { id: 'appt-1', title: 'Sprint Planning', startsAt: isoOnThisWeek(0, '07:30:00'), endsAt: isoOnThisWeek(0, '09:00:00') },
  { id: 'appt-2', title: 'Retrospektive', startsAt: isoOnThisWeek(2, '12:00:00'), endsAt: isoOnThisWeek(2, '13:00:00') },
]

// Noch keine Suche durchgeführt -> Such-Ergebnis-Layer bleibt leer.
const sampleSearchResults: CombinedSearchSlot[] = []
</script>

<template>
  <section class="suggestions" :data-team-id="teamId">
    <header class="suggestions__intro">
      <h2 class="suggestions__heading">Terminvorschläge</h2>
      <p class="suggestions__subtitle">
        Finde gemeinsame freie Termine basierend auf den Wochenplänen der Team-Mitglieder.
      </p>
    </header>

    <div class="suggestions__layout">
      <!-- Container für das Such-Tool (Logik folgt in einer späteren Story) -->
      <aside class="suggestions__search" aria-label="Suchformular">
        <div class="placeholder-card">
          <h3 class="placeholder-card__title">Suche</h3>
          <p class="placeholder-card__hint">
            Das Suchformular (Zeitraum, Start-/Endzeit, ausgeschlossene Tage) folgt hier.
          </p>
        </div>
      </aside>

      <!-- Container für die kombinierte Wochenansicht -->
      <div class="suggestions__week" aria-label="Kombinierte Wochenansicht">
        <CombinedWeekView
          :members="sampleMembers"
          :slots="sampleSlots"
          :appointments="sampleAppointments"
          :search-results="sampleSearchResults"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.suggestions__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.suggestions__heading {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.suggestions__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

/* Layout-Container: Such-Form links, Wochenansicht rechts.
   Stapelt auf schmalen Viewports. */
.suggestions__layout {
  display: grid;
  grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  gap: var(--space-2xl);
  align-items: start;
}

@media (max-width: 48rem) {
  .suggestions__layout {
    grid-template-columns: 1fr;
  }
}

.suggestions__search {
  min-width: 0;
}

.suggestions__week {
  min-width: 0;
  min-height: 18rem;
  display: flex;
}

.placeholder-card {
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.placeholder-card__title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.placeholder-card__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}
</style>
