import { type BrandTheme, colors } from '@lilleri/brand'
import type { ProfileLocale } from '@lilleri/domain'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { BrowserDisplayPreferences } from './browser-display-preferences'
import { LanguagePicker } from './LanguagePicker'

export interface LocalDisplayPreferencesPanelProps {
  readonly theme: BrandTheme
  readonly locale: ProfileLocale
  readonly timezone: string
  readonly onChanged: (preferences: BrowserDisplayPreferences) => void
}

const messages = {
  title: ['Lingua e orario', 'Language and time'],
  device: [
    'Queste preferenze riguardano la visualizzazione su questo dispositivo.',
    'These preferences control how information is displayed on this device.',
  ],
  timezone: ['Fuso orario', 'Time zone'],
  rome: ['Italia', 'Italy'],
  timezoneHelp: [
    'Il fuso cambia gli orari visualizzati. Le date dei movimenti restano quelle della fonte.',
    'The time zone changes displayed times. Transaction dates remain those from the source.',
  ],
} as const

export function LocalDisplayPreferencesPanel({
  theme,
  locale,
  timezone,
  onChanged,
}: LocalDisplayPreferencesPanelProps) {
  const c = colors[theme]
  const s = useMemo(() => styles(c), [c])
  const index = locale === 'it-IT' ? 0 : 1
  const copy = (key: keyof typeof messages) => messages[key][index]
  const zones = [
    { value: 'Europe/Rome', label: copy('rome') },
    { value: 'UTC', label: 'UTC' },
    ...(!['Europe/Rome', 'UTC'].includes(timezone) ? [{ value: timezone, label: timezone }] : []),
  ]

  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {copy('title')}
      </Text>
      <Text style={s.help}>{copy('device')}</Text>
      <LanguagePicker
        theme={theme}
        locale={locale}
        onChange={(value) => onChanged({ locale: value, timezone })}
      />
      <View style={s.group}>
        <Text accessibilityRole="header" aria-level={3} style={s.label}>
          {copy('timezone')}
        </Text>
        <View accessibilityRole="radiogroup" aria-label={copy('timezone')} style={s.choices}>
          {zones.map((zone) => (
            <Pressable
              key={zone.value}
              accessibilityRole="radio"
              accessibilityLabel={zone.label}
              accessibilityState={{ checked: timezone === zone.value }}
              aria-checked={timezone === zone.value}
              onPress={() => {
                if (timezone !== zone.value) onChanged({ locale, timezone: zone.value })
              }}
              style={[s.choice, timezone === zone.value && s.selected]}
            >
              <Text style={s.label}>{zone.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.help}>{copy('timezoneHelp')}</Text>
      </View>
    </View>
  )
}

function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    panel: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      gap: 20,
    },
    group: { gap: 10 },
    title: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 22, lineHeight: 28 },
    label: { color: c.textPrimary, fontFamily: 'GeistMedium', fontSize: 16, lineHeight: 24 },
    help: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 14, lineHeight: 22 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    choice: {
      minHeight: 48,
      minWidth: 48,
      paddingVertical: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
      borderColor: c.borderStrong,
      borderWidth: 1,
      borderRadius: 10,
    },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary },
  })
}
