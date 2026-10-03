import { expect, test } from 'vitest'
import {
  formatProfileInstant,
  isProfileLocale,
  isProfileTimezone,
  PROFILE_LOCALE,
  PROFILE_LOCALES,
} from './profile-settings.js'

test('profile timezone changes instant formatting, including Rome summer time', () => {
  const values = {
    displayName: 'Profilo di prova',
    locale: PROFILE_LOCALE,
    timezone: 'Europe/Rome',
  }
  expect(formatProfileInstant('2026-07-02T23:30:00Z', values)).toMatch(/03\/07\/26, 01:30/)
  expect(formatProfileInstant('2026-07-02T23:30:00Z', { ...values, timezone: 'UTC' })).toMatch(
    /02\/07\/26, 23:30/,
  )
})
test('only valid IANA zones and UTC are accepted; invalid instants fail', () => {
  expect(isProfileTimezone('Europe/Rome')).toBe(true)
  expect(isProfileTimezone('UTC')).toBe(true)
  expect(isProfileTimezone('Europe/Invented')).toBe(false)
  expect(isProfileTimezone('')).toBe(false)
  expect(() =>
    formatProfileInstant('invalid', {
      displayName: 'Prova',
      locale: PROFILE_LOCALE,
      timezone: 'Europe/Rome',
    }),
  ).toThrow()
})
test('supports exactly the declared Italian and British English locales without guessing markets', () => {
  expect(PROFILE_LOCALES).toEqual(['it-IT', 'en-GB'])
  expect(Object.isFrozen(PROFILE_LOCALES)).toBe(true)
  expect(isProfileLocale('it-IT')).toBe(true)
  expect(isProfileLocale('en-GB')).toBe(true)
  for (const value of ['en-US', 'it', 'en', '', null]) expect(isProfileLocale(value)).toBe(false)
  expect(
    formatProfileInstant('2026-10-03T10:20:00.000Z', {
      displayName: 'Synthetic',
      locale: 'en-GB',
      timezone: 'UTC',
    }),
  ).toContain('03/10/2026')
})
