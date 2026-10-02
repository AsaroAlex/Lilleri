import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  calendarDate,
  calendarDateAt,
  calendarDateFromProvider,
  diffDays,
  endOfMonth,
  InvalidCalendarDateError,
  isCalendarDate,
  isoWeekday,
  monthKey,
  startOfMonth,
} from './calendar-date.js'

const d = calendarDate

describe('calendar dates', () => {
  it('validates real dates only', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true)
    expect(isCalendarDate('2028-02-29')).toBe(true)
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2026-13-01')).toBe(false)
    expect(isCalendarDate('26-10-02')).toBe(false)
    expect(() => calendarDate('02/10/2026')).toThrow(InvalidCalendarDateError)
  })

  it('does day arithmetic across month, year and DST boundaries', () => {
    expect(addDays(d('2026-10-31'), 1)).toBe('2026-11-01')
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01')
    // DST in Europe/Rome: 2026-03-29 (spring forward) and 2026-10-25 (fall back)
    expect(addDays(d('2026-03-28'), 1)).toBe('2026-03-29')
    expect(addDays(d('2026-03-29'), 1)).toBe('2026-03-30')
    expect(addDays(d('2026-10-24'), 2)).toBe('2026-10-26')
    expect(diffDays(d('2026-03-28'), d('2026-03-30'))).toBe(2)
    expect(diffDays(d('2026-10-30'), d('2026-10-25'))).toBe(-5)
  })

  it('computes month buckets', () => {
    expect(monthKey(d('2026-10-02'))).toBe('2026-10')
    expect(startOfMonth(d('2026-10-31'))).toBe('2026-10-01')
    expect(endOfMonth(d('2026-02-10'))).toBe('2026-02-28')
    expect(endOfMonth(d('2028-02-10'))).toBe('2028-02-29')
    expect(endOfMonth(d('2026-12-10'))).toBe('2026-12-31')
  })

  it('adds months with day clamping', () => {
    expect(addMonths(d('2026-01-31'), 1)).toBe('2026-02-28')
    expect(addMonths(d('2026-11-15'), 3)).toBe('2027-02-15')
    expect(addMonths(d('2026-03-31'), -1)).toBe('2026-02-28')
  })

  it('knows the weekday', () => {
    expect(isoWeekday(d('2026-10-02'))).toBe(5) // Friday
    expect(isoWeekday(d('2026-10-04'))).toBe(7) // Sunday
  })

  it('takes the provider date part without shifting zones', () => {
    expect(calendarDateFromProvider('2026-09-22')).toBe('2026-09-22')
    expect(calendarDateFromProvider('2026-09-22T00:00:00Z')).toBe('2026-09-22')
    expect(calendarDateFromProvider('2026-09-22T00:00:00+02:00')).toBe('2026-09-22')
  })

  it('computes the local date of an instant in Europe/Rome', () => {
    // 22:30 UTC on 31 Oct is 23:30 in Rome (CET, after DST ended) → still 31 Oct
    expect(calendarDateAt(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10-31')
    // 22:30 UTC on 30 Sep is 00:30 on 1 Oct in Rome (CEST) → month changes
    expect(calendarDateAt(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10-01')
  })
})
