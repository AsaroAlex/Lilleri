import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { PROFILE_LOCALES, type ProfileLocale } from '@lilleri/domain'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { createTranslator } from './i18n'

export interface LanguagePickerProps {
  readonly locale: ProfileLocale
  readonly theme: BrandTheme
  readonly disabled?: boolean
  readonly onChange: (locale: ProfileLocale) => void
}
/** Emits a deliberate draft choice; the owner persists it with the current settings revision. */
export function LanguagePicker({ locale, theme, disabled = false, onChange }: LanguagePickerProps) {
  const c = colors[theme]
  const t = useMemo(() => createTranslator(locale).t, [locale])
  return (
    <View style={s.container}>
      <Text accessibilityRole="header" aria-level={3} style={[s.label, { color: c.textPrimary }]}>
        {t('settings.language')}
      </Text>
      <View accessibilityRole="radiogroup" aria-label={t('settings.language')} style={s.choices}>
        {PROFILE_LOCALES.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={t(value === 'it-IT' ? 'settings.italian' : 'settings.english')}
            aria-checked={locale === value}
            aria-disabled={disabled}
            accessibilityState={{ checked: locale === value, disabled }}
            disabled={disabled}
            onPress={() => {
              if (value !== locale) onChange(value)
            }}
            style={[
              s.choice,
              {
                borderColor: locale === value ? c.primary : c.borderStrong,
                backgroundColor: locale === value ? c.primarySoft : c.surfaceElevated,
              },
              disabled && s.disabled,
            ]}
          >
            <Text style={[s.label, { color: c.textPrimary }]}>
              {t(value === 'it-IT' ? 'settings.italian' : 'settings.english')}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.help, { color: c.textSecondary }]}>{t('settings.languageHelp')}</Text>
    </View>
  )
}
const s = StyleSheet.create({
  container: { gap: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    minHeight: 48,
    minWidth: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
  },
  label: { fontFamily: tokens.typography.fontUI, fontSize: 16, lineHeight: 24 },
  help: { fontFamily: tokens.typography.fontUI, fontSize: 14, lineHeight: 22 },
  disabled: { opacity: 0.5 },
})
