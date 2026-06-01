// ============================================================
// Zentrale Zeit-Logik (Querschnitt).
//
// Vertrag:
//   * Persistenz/Transport: ausschließlich UTC (timestamptz / ISO 8601 "Z").
//   * Anzeige: immer Browser-Zeitzone.
//   * Absolute Eingaben (datetime-local) werden hier nach UTC konvertiert,
//     bevor sie ans Backend gehen.
//   * Tageszeit-Eingaben der Suche (HH:MM) sind je Wochentag und werden
//     bewusst NICHT clientseitig zu einer festen UTC-Zeit gemacht
//     (DST-mehrdeutig). Stattdessen geht die Browser-Zeitzone mit; der
//     Endpoint rechnet pro Tag nach UTC um.
//
// Wochenansicht, Termin-Form und Benachrichtigungen nutzen diese Helfer.
// ============================================================

/** Die aufgelöste Browser-Zeitzone (z. B. "Europe/Berlin"). */
export const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const localDateKeyFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: BROWSER_TIME_ZONE })

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Montag (00:00 lokal) der Woche, in der `date` liegt. */
export function mondayOf(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

/** Lokaler Kalendertag als 'YYYY-MM-DD' (über die Browser-Zeitzone). */
export function localDateKey(date: Date): string {
  return localDateKeyFormatter.format(date)
}

/** 'YYYY-MM-DD' aus den lokalen Datumsteilen von `date`. */
export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Lokale Uhrzeit als 'HH:MM'. */
export function localHhMm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** Minuten seit lokal 00:00. */
export function localMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Wochentag-Index 0 = Montag … 6 = Sonntag (lokal). */
export function localWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** 'HH:MM' -> Minuten seit Mitternacht; null bei ungültiger Eingabe. */
export function parseHhMm(value: string): number | null {
  const [hourRaw, minuteRaw] = value.split(':')
  const hour = Number.parseInt(hourRaw, 10)
  const minute = Number.parseInt(minuteRaw, 10)
  return Number.isNaN(hour) || Number.isNaN(minute) ? null : hour * 60 + minute
}

/** Lokaler Wert für <input type="date"> ('YYYY-MM-DD'). */
export function dateInputValue(date: Date): string {
  return localDateString(date)
}

/** 'YYYY-MM-DD' (lokal) -> Montag der zugehörigen Woche; null bei ungültig. */
export function dateInputToMonday(value: string): Date | null {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))
  if ([year, month, day].some(Number.isNaN)) {
    return null
  }
  return mondayOf(new Date(year, month - 1, day))
}

/** Lokaler Wert für <input type="datetime-local"> ('YYYY-MM-DDTHH:MM'). */
export function dateTimeInputValue(date: Date): string {
  return `${localDateString(date)}T${localHhMm(date)}`
}

/** Lokaler datetime-local-Wert -> UTC ISO 8601. */
export function dateTimeInputToUtcIso(value: string): string {
  return new Date(value).toISOString()
}

/** UTC-Bereich [Montag 00:00 lokal, +7 Tage) als ISO-Strings. */
export function weekRangeUtc(weekStart: Date): { fromIso: string; toIso: string } {
  const monday = mondayOf(weekStart)
  const end = new Date(monday)
  end.setDate(end.getDate() + 7)
  return { fromIso: monday.toISOString(), toIso: end.toISOString() }
}
