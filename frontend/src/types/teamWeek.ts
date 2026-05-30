// Typen für die kombinierte Wochenansicht mehrerer Team-Mitglieder.
// dayIndex: 0 = Montag … 6 = Sonntag (wie in der bestehenden Wochenansicht).

export type MemberSlotState = 'active' | 'hidden' | 'deselected'

export interface CombinedWeekMember {
  id: string
  name: string
}

/**
 * Ein (wiederkehrender) Stundenplan-Slot eines Mitglieds, an Wochentag +
 * Uhrzeit gebunden (lokale Wandzeit, HH:MM).
 *
 * Filterregeln in der kombinierten Ansicht:
 *  - 'deselected' (abgewählt)  -> komplett herausgefiltert
 *  - 'hidden' (ausgeblendet)   -> weiterhin als belegt gewertet/dargestellt
 *  - 'active'                  -> belegt
 */
export interface MemberScheduleSlot {
  memberId: string
  dayIndex: number
  startTime: string
  endTime: string
  title?: string
  state?: MemberSlotState
}

/** Bestehender Termin (Story-Datenmodell) – Start/Ende als ISO-8601 in UTC. */
export interface CombinedAppointment {
  id: string
  title: string
  startsAt: string
  endsAt: string
}

/** Ergebnis-Slot aus der Terminsuche (eigener Layer). */
export interface CombinedSearchSlot {
  id: string
  dayIndex: number
  startTime: string
  endTime: string
  label?: string
  /** Absolute Start-/Endzeit (ISO 8601, UTC) – für den Termin-Erstell-Dialog. */
  startsAt?: string
  endsAt?: string
}

/** Eingabeparameter des Such-Formulars (an get_team_free_slots gebunden). */
export interface FreeSlotSearchParams {
  durationMinutes: number
  minStart: string
  maxEnd: string
  excludedWeekdays: number[]
}

/** Nutzlast des Termin-Erstell-Dialogs (Start/Ende ISO 8601, UTC). */
export interface NewAppointmentInput {
  title: string
  description: string | null
  startsAt: string
  endsAt: string
}

/**
 * Zusammengefasster Belegt-Block eines Wochentags: identische Zeitfenster
 * mehrerer Mitglieder werden zu einem Block mit der Menge der belegten
 * Mitglieder zusammengefasst (Minuten ab 00:00).
 */
export interface MergedBusyBlock {
  dayIndex: number
  start: number
  end: number
  startTime: string
  endTime: string
  memberIds: string[]
}

// ---- View-Modelle für das Grid (bereits positioniert) ----

export interface MemberChip {
  id: string
  initials: string
  color: string
  name: string
}

export interface BusyBlockView {
  id: string
  startTime: string
  endTime: string
  style: { top: string; height: string }
  members: MemberChip[]
  extraCount: number
}

export interface LayerBlockView {
  id: string
  label: string
  timeLabel: string
  style: { top: string; height: string }
}

export interface WeekColumnView {
  key: string
  weekdayLabel: string
  dateLabel: string
  isToday: boolean
  busy: BusyBlockView[]
  appointments: LayerBlockView[]
  searches: LayerBlockView[]
}
