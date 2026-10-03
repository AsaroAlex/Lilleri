export const PROFILE_LOCALE = 'it-IT' as const
export const DEFAULT_PROFILE_TIMEZONE = 'Europe/Rome'
export interface ProfileSettingsValues {
  readonly displayName: string
  readonly locale: typeof PROFILE_LOCALE
  readonly timezone: string
}
export interface ProfileSettings extends ProfileSettingsValues {
  readonly profileId: string
  readonly revision: number
  readonly updatedAt: string
}
export interface ProfileSettingsEvent {
  readonly id: string
  readonly profileId: string
  readonly revision: number
  readonly before: ProfileSettingsValues
  readonly after: ProfileSettingsValues
  readonly createdAt: string
}
/** Locale support is explicit. Changing a zone never changes a bank's calendar booking date. */
export function isProfileTimezone(value: string): boolean {
  if (!value || value.length > 100) return false
  try {
    new Intl.DateTimeFormat(PROFILE_LOCALE, { timeZone: value })
    return value === 'UTC' || value.includes('/')
  } catch {
    return false
  }
}
export function formatProfileInstant(instant: string, settings: ProfileSettingsValues): string {
  const value = new Date(instant)
  if (!Number.isFinite(value.getTime()) || !isProfileTimezone(settings.timezone))
    throw new Error('Invalid profile date or timezone')
  return new Intl.DateTimeFormat(settings.locale, {
    timeZone: settings.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}
