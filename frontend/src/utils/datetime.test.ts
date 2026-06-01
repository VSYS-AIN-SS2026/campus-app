import { describe, expect, it } from 'vitest'
import {
  BROWSER_TIME_ZONE,
  dateInputToMonday,
  dateInputValue,
  dateTimeInputToUtcIso,
  dateTimeInputValue,
  localDateKey,
  localDateString,
  localHhMm,
  localMinutesOfDay,
  localWeekdayIndex,
  mondayOf,
  parseHhMm,
  weekRangeUtc,
} from './datetime'

// Läuft unter TZ=Europe/Berlin (siehe package.json "test"-Skript).
// Deckt das E2E-Kriterium "nicht-UTC Browser-Zeitzone" ab.
describe('datetime (TZ=Europe/Berlin)', () => {
  it('läuft tatsächlich in einer nicht-UTC-Zone', () => {
    expect(BROWSER_TIME_ZONE).toBe('Europe/Berlin')
  })

  it('rendert UTC in Browser-Zeit (Sommerzeit, +02:00)', () => {
    const utc = new Date('2026-06-01T07:00:00Z')
    expect(localHhMm(utc)).toBe('09:00')
    expect(localMinutesOfDay(utc)).toBe(9 * 60)
  })

  it('rendert UTC in Browser-Zeit (Winterzeit, +01:00)', () => {
    expect(localHhMm(new Date('2026-01-15T08:00:00Z'))).toBe('09:00')
  })

  it('datetime-local-Wert ist lokale Wandzeit', () => {
    expect(dateTimeInputValue(new Date('2026-06-01T07:30:00Z'))).toBe('2026-06-01T09:30')
  })

  it('Eingabe -> UTC -> Eingabe ist driftfrei (Sommer & Winter)', () => {
    for (const iso of ['2026-06-01T07:30:00.000Z', '2026-01-15T08:30:00.000Z']) {
      const localValue = dateTimeInputValue(new Date(iso))
      expect(dateTimeInputToUtcIso(localValue)).toBe(iso)
    }
  })

  it('localDateKey nutzt den lokalen Kalendertag (Tagesgrenze)', () => {
    // 22:30 UTC am 01.06. ist in Berlin bereits 00:30 am 02.06.
    expect(localDateKey(new Date('2026-06-01T22:30:00Z'))).toBe('2026-06-02')
  })

  it('localWeekdayIndex: Montag = 0, Sonntag = 6', () => {
    expect(localWeekdayIndex(new Date('2026-06-01T09:00:00Z'))).toBe(0) // Montag
    expect(localWeekdayIndex(new Date('2026-06-07T09:00:00Z'))).toBe(6) // Sonntag
  })

  it('mondayOf liefert den Montag der Woche', () => {
    expect(localDateString(mondayOf(new Date(2026, 5, 3)))).toBe('2026-06-01') // Mi -> Mo
  })

  it('weekRangeUtc: Montag 00:00 Berlin -> 22:00 UTC des Vortags (Sommer)', () => {
    const { fromIso, toIso } = weekRangeUtc(new Date(2026, 5, 3))
    expect(fromIso).toBe('2026-05-31T22:00:00.000Z')
    expect(toIso).toBe('2026-06-07T22:00:00.000Z')
  })

  it('date-Input-Helfer', () => {
    expect(dateInputValue(new Date(2026, 5, 1))).toBe('2026-06-01')
    const monday = dateInputToMonday('2026-06-03')
    expect(monday && localDateString(monday)).toBe('2026-06-01')
  })

  it('parseHhMm', () => {
    expect(parseHhMm('09:30')).toBe(570)
    expect(parseHhMm('nope')).toBeNull()
  })
})
