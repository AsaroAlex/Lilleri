/**
 * Calendar dates ("2026-10-02") as used by the ledger.
 *
 * PSD2 booking and value dates are calendar dates without a time or zone. Lilleri stores them as
 * `YYYY-MM-DD` strings (PostgreSQL `date`) and never converts them through timestamps, so a
 * transaction can never move across a day or month boundary because of time zones or DST.
 * Instants (sync times, audit events) are separate UTC timestamps.
 */
export type CalendarDate = string & { readonly __brand: 'CalendarDate' }

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

export class InvalidCalendarDateError extends Error {
  readonly code = 'INVALID_CALENDAR_DATE'
  constructor(readonly input: string) {
    super(`Invalid calendar date "${input}" (expected YYYY-MM-DD)`)
    this.name = 'InvalidCalendarDateError'
  }
}

export function isCalendarDate(value: string): value is CalendarDate {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [, y, mo, d] = m
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(mo) - 1 &&
    date.getUTCDate() === Number(d)
  )
}

export function calendarDate(value: string): CalendarDate {
  if (!isCalendarDate(value)) throw new InvalidCalendarDateError(value)
  return value
}

/** Days since 1970-01-01 for a calendar date (pure arithmetic, no zone involved). */
export function toEpochDay(date: CalendarDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS)
}

export function fromEpochDay(epochDay: number): CalendarDate {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10) as CalendarDate
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromEpochDay(toEpochDay(date) + days)
}

/** b - a in days (positive when b is later). */
export function diffDays(a: CalendarDate, b: CalendarDate): number {
  return toEpochDay(b) - toEpochDay(a)
}

export function compareDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  return a === b ? 0 : a < b ? -1 : 1
}

/** "2026-10" — the month bucket used for monthly analytics. */
export function monthKey(date: CalendarDate): string {
  return date.slice(0, 7)
}

export function startOfMonth(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 7)}-01` as CalendarDate
}

export function endOfMonth(date: CalendarDate): CalendarDate {
  const [y, m] = date.split('-').map(Number) as [number, number]
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${date.slice(0, 7)}-${String(last).padStart(2, '0')}` as CalendarDate
}

/** Adds calendar months, clamping the day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  const nd = Math.min(d, last)
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}` as CalendarDate
}

/** ISO weekday, Monday = 1 … Sunday = 7. */
export function isoWeekday(date: CalendarDate): number {
  const dow = new Date(toEpochDay(date) * DAY_MS).getUTCDay()
  return dow === 0 ? 7 : dow
}

/**
 * Extracts the calendar date from a provider value without shifting it. Providers send either a
 * plain date ("2026-09-22") or a midnight timestamp in their own zone ("2026-09-22T00:00:00Z",
 * "2026-09-22T00:00:00+02:00"); in both cases the intended booking day is the date part as
 * written. Converting "2026-09-22T00:00:00+02:00" to UTC would wrongly give 2026-09-21.
 */
export function calendarDateFromProvider(value: string): CalendarDate {
  return calendarDate(value.trim().slice(0, 10))
}

/**
 * The calendar date of an instant in a given IANA zone (default Europe/Rome), e.g. "today" for
 * the user. Uses Intl on the server; mobile clients receive dates from the API.
 */
export function calendarDateAt(instant: Date, timeZone = 'Europe/Rome'): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
  return calendarDate(parts)
}
