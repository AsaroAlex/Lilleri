import { expect, test } from 'vitest'
import { formatProfileInstant, isProfileTimezone, PROFILE_LOCALE } from './profile-settings.js'

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
