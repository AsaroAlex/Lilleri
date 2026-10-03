import { PROFILE_LOCALE, type ProfileLocale } from '@lilleri/domain'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { createTranslator } from './index'

const DisplayPreferences = createContext({
  locale: PROFILE_LOCALE as ProfileLocale,
  timezone: 'Europe/Rome',
})
export interface I18nProviderProps {
  readonly locale: ProfileLocale
  readonly timezone: string
  readonly children: ReactNode
}
/** Display-only preferences; identity state and request callbacks stay with their existing owners. */
export function I18nProvider({ locale, timezone, children }: I18nProviderProps) {
  const value = useMemo(() => ({ locale, timezone }), [locale, timezone])
  return <DisplayPreferences.Provider value={value}>{children}</DisplayPreferences.Provider>
}
export function useI18n() {
  const { locale, timezone } = useContext(DisplayPreferences)
  return useMemo(() => createTranslator(locale, timezone), [locale, timezone])
}
