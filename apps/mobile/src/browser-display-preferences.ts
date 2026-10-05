import { isProfileLocale, isProfileTimezone, type ProfileLocale } from '@lilleri/domain'

export interface BrowserDisplayPreferences {
  readonly locale: ProfileLocale
  readonly timezone: string
}

export interface BrowserDisplayPreferenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const BROWSER_DISPLAY_PREFERENCES_KEY = 'lilleri.display-preferences.v1'
const MAX_STORED_LENGTH = 1024

function browserStorage(): BrowserDisplayPreferenceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Only valid display fields are returned; callers retain defaults for missing fields. */
export function readBrowserDisplayPreferences(
  storage: BrowserDisplayPreferenceStorage | null = browserStorage(),
): Partial<BrowserDisplayPreferences> {
  try {
    const raw = storage?.getItem(BROWSER_DISPLAY_PREFERENCES_KEY)
    if (!raw || raw.length > MAX_STORED_LENGTH) return {}
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const stored = value as Record<string, unknown>
    if (stored.version !== 1) return {}
    return {
      ...(isProfileLocale(stored.locale) ? { locale: stored.locale } : {}),
      ...(typeof stored.timezone === 'string' && isProfileTimezone(stored.timezone)
        ? { timezone: stored.timezone }
        : {}),
    }
  } catch {
    return {}
  }
}

/** Persists only language and time zone, without profile identifiers or financial data. */
export function writeBrowserDisplayPreferences(
  preferences: BrowserDisplayPreferences,
  storage: BrowserDisplayPreferenceStorage | null = browserStorage(),
): boolean {
  if (
    !storage ||
    !isProfileLocale(preferences.locale) ||
    typeof preferences.timezone !== 'string' ||
    !isProfileTimezone(preferences.timezone)
  )
    return false
  try {
    storage.setItem(
      BROWSER_DISPLAY_PREFERENCES_KEY,
      JSON.stringify({ version: 1, locale: preferences.locale, timezone: preferences.timezone }),
    )
    return true
  } catch {
    return false
  }
}
