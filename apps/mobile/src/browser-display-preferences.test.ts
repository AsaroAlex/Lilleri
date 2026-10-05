import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  BROWSER_DISPLAY_PREFERENCES_KEY,
  type BrowserDisplayPreferenceStorage,
  type BrowserDisplayPreferences,
  readBrowserDisplayPreferences,
  writeBrowserDisplayPreferences,
} from './browser-display-preferences'

function storage(initial: string | null = null) {
  const values = new Map<string, string>()
  if (initial !== null) values.set(BROWSER_DISPLAY_PREFERENCES_KEY, initial)
  const store: BrowserDisplayPreferenceStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
  return { values, store }
}

afterEach(() => vi.unstubAllGlobals())

describe('browser display preferences', () => {
  test('returns only validated display fields and keeps valid fields independent', () => {
    const localeOnly = storage(JSON.stringify({ version: 1, locale: 'en-GB', timezone: 'invalid' }))
    expect(readBrowserDisplayPreferences(localeOnly.store)).toEqual({ locale: 'en-GB' })
    const timezoneOnly = storage(
      JSON.stringify({ version: 1, locale: 'en-US', timezone: 'America/New_York' }),
    )
    expect(readBrowserDisplayPreferences(timezoneOnly.store)).toEqual({
      timezone: 'America/New_York',
    })
    const unrelated = storage(
      JSON.stringify({
        version: 1,
        locale: 'it-IT',
        timezone: 'Europe/Rome',
        profileId: 'profile',
      }),
    )
    expect(readBrowserDisplayPreferences(unrelated.store)).toEqual({
      locale: 'it-IT',
      timezone: 'Europe/Rome',
    })
  })

  test.each([
    null,
    '',
    '{',
    'null',
    '[]',
    '"it-IT"',
    JSON.stringify({ version: 2, locale: 'it-IT', timezone: 'UTC' }),
    JSON.stringify({ version: 1, locale: 'it', timezone: null }),
    JSON.stringify({ version: 1, locale: 'it-IT', timezone: 'UTC', extra: 'x'.repeat(1100) }),
  ])('ignores absent, malformed, incompatible or oversized data: %s', (raw) => {
    expect(readBrowserDisplayPreferences(storage(raw).store)).toEqual({})
  })

  test('round trips only language and timezone without persisting unrelated data', () => {
    const local = storage()
    const preferences = {
      locale: 'en-GB' as const,
      timezone: 'UTC',
      accounts: ['not-to-be-stored'],
    }
    expect(writeBrowserDisplayPreferences(preferences, local.store)).toBe(true)
    expect([...local.values]).toEqual([
      [
        BROWSER_DISPLAY_PREFERENCES_KEY,
        JSON.stringify({ version: 1, locale: 'en-GB', timezone: 'UTC' }),
      ],
    ])
    expect(readBrowserDisplayPreferences(local.store)).toEqual({ locale: 'en-GB', timezone: 'UTC' })
  })

  test('does not overwrite valid preferences with unsupported runtime input', () => {
    const local = storage()
    const valid = { locale: 'it-IT' as const, timezone: 'Europe/Rome' }
    expect(writeBrowserDisplayPreferences(valid, local.store)).toBe(true)
    for (const invalid of [
      { locale: 'en-US', timezone: 'UTC' },
      { locale: 'it-IT', timezone: 'Not/A_Zone' },
      { locale: 'it-IT', timezone: 42 },
    ])
      expect(
        writeBrowserDisplayPreferences(
          invalid as unknown as BrowserDisplayPreferences,
          local.store,
        ),
      ).toBe(false)
    expect(readBrowserDisplayPreferences(local.store)).toEqual(valid)
  })

  test('handles blocked storage reads and quota failures', () => {
    const unavailable: BrowserDisplayPreferenceStorage = {
      getItem() {
        throw new Error('SecurityError')
      },
      setItem() {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readBrowserDisplayPreferences(unavailable)).toEqual({})
    expect(writeBrowserDisplayPreferences({ locale: 'it-IT', timezone: 'UTC' }, unavailable)).toBe(
      false,
    )
  })

  test('supports browser access being absent or denied', () => {
    vi.stubGlobal('window', undefined)
    expect(readBrowserDisplayPreferences()).toEqual({})
    expect(writeBrowserDisplayPreferences({ locale: 'it-IT', timezone: 'UTC' })).toBe(false)
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError')
      },
    })
    expect(readBrowserDisplayPreferences()).toEqual({})
    expect(writeBrowserDisplayPreferences({ locale: 'it-IT', timezone: 'UTC' })).toBe(false)
  })
})
