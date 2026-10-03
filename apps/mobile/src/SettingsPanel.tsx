import { ApiError, createSettingsClient, type SettingsResponse } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import {
  PROFILE_LOCALE,
  type ProfileLocale,
  type ProfileSettings,
  type ProfileSettingsValues,
} from '@lilleri/domain'
import { money } from '@lilleri/money'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { type MessageKey, PROBLEM_MESSAGES } from './i18n'
import { useI18n } from './i18n/context'
import { LanguagePicker } from './LanguagePicker'

interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly theme: BrandTheme
  readonly resetKey?: number | string
  readonly onChanged: (settings: ProfileSettings) => Promise<void> | void
  readonly onError?: (cause: unknown) => boolean
}
type VisibleError = { readonly key: MessageKey } | { readonly code: string }
interface State {
  readonly epoch: number
  readonly response: SettingsResponse | null
  readonly displayName: string
  readonly locale: ProfileLocale
  readonly timezone: string
  readonly busy: boolean
  readonly error: VisibleError | null
  readonly notice: MessageKey | null
}
const empty = (epoch: number): State => ({
  epoch,
  response: null,
  displayName: '',
  locale: PROFILE_LOCALE,
  timezone: 'Europe/Rome',
  busy: true,
  error: null,
  notice: null,
})
const zoneOptions = [
  { value: 'Europe/Rome', key: 'settings.zoneRome' },
  { value: 'Europe/London', key: 'settings.zoneLondon' },
  { value: 'America/New_York', key: 'settings.zoneNewYork' },
  { value: 'Asia/Tokyo', key: 'settings.zoneTokyo' },
  { value: 'UTC', key: null },
] as const

/** Draft display preferences; all async outcomes remain fenced to the originating session epoch. */
export function SettingsPanel({ request, theme, resetKey = 0, onChanged, onError }: Props) {
  const client = useMemo(() => createSettingsClient(request), [request])
  const i18n = useI18n(),
    c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const identity = useRef({ request, resetKey, epoch: 0 })
  const busyEpoch = useRef<number | null>(null)
  if (identity.current.request !== request || identity.current.resetKey !== resetKey) {
    identity.current = { request, resetKey, epoch: identity.current.epoch + 1 }
    busyEpoch.current = null
  }
  const epoch = identity.current.epoch
  const mounted = useRef(true)
  const callbacks = useRef({ onChanged, onError })
  callbacks.current = { onChanged, onError }
  const [state, setState] = useState(() => empty(epoch))
  const view = state.epoch === epoch ? state : empty(epoch)
  const current = (captured: number) => mounted.current && identity.current.epoch === captured
  const patch = (captured: number, values: Partial<State>) => {
    if (current(captured))
      setState((previous) => ({
        ...(previous.epoch === captured ? previous : empty(captured)),
        ...values,
        epoch: captured,
      }))
  }
  const receive = (captured: number, value: SettingsResponse) =>
    patch(captured, {
      response: value,
      displayName: value.settings.displayName,
      locale: value.settings.locale,
      timezone: value.settings.timezone,
    })
  const reportFailure = (captured: number, cause: unknown) => {
    if (!current(captured)) return true
    if (!callbacks.current.onError?.(cause)) return false
    patch(captured, { response: null, notice: null, error: null })
    return true
  }
  const problem = (cause: unknown): VisibleError => {
    const code =
      cause instanceof ApiError && Object.hasOwn(PROBLEM_MESSAGES, cause.code)
        ? cause.code
        : 'request_failed'
    return { code }
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Session/request epoch fences reads; callback and display-locale changes do not restart network requests.
  useEffect(() => {
    const captured = identity.current.epoch
    busyEpoch.current = captured
    setState(empty(captured))
    void client
      .get()
      .then((value) => receive(captured, value))
      .catch((cause: unknown) => {
        if (!reportFailure(captured, cause))
          patch(captured, { error: { key: 'settings.loadFailed' } })
      })
      .finally(() => {
        if (current(captured)) {
          busyEpoch.current = null
          patch(captured, { busy: false })
        }
      })
  }, [client, resetKey])
  const refresh = async () => {
    const captured = epoch
    if (!current(captured) || busyEpoch.current === captured) return
    busyEpoch.current = captured
    patch(captured, { busy: true, error: null, notice: null })
    try {
      const saved = await client.get()
      if (!current(captured)) return
      receive(captured, saved)
      await callbacks.current.onChanged(saved.settings)
    } catch (cause) {
      if (!reportFailure(captured, cause))
        patch(captured, { error: { key: 'settings.refreshFailed' } })
    } finally {
      if (current(captured)) {
        busyEpoch.current = null
        patch(captured, { busy: false })
      }
    }
  }
  const save = async () => {
    const captured = epoch
    if (!current(captured) || busyEpoch.current === captured || !view.response) return
    busyEpoch.current = captured
    patch(captured, { busy: true, error: null, notice: null })
    const values: ProfileSettingsValues = {
      displayName: view.displayName.trim(),
      locale: view.locale,
      timezone: view.timezone,
    }
    try {
      const updated = await client.update(view.response.settings.revision, values)
      if (!current(captured)) return
      receive(captured, updated)
      await callbacks.current.onChanged(updated.settings)
      if (current(captured)) patch(captured, { notice: 'settings.saved' })
    } catch (cause) {
      if (reportFailure(captured, cause)) return
      if (cause instanceof ApiError && cause.code === 'settings_changed') {
        try {
          const saved = await client.get()
          if (!current(captured)) return
          receive(captured, saved)
          await callbacks.current.onChanged(saved.settings)
          if (current(captured)) patch(captured, { error: { key: 'settings.changed' } })
        } catch (refreshCause) {
          if (!reportFailure(captured, refreshCause))
            patch(captured, { error: { key: 'settings.refreshFailed' } })
        }
      } else patch(captured, { error: problem(cause) })
    } finally {
      if (current(captured)) {
        busyEpoch.current = null
        patch(captured, { busy: false })
      }
    }
  }
  const button = (label: string, action: () => void, primary = false, selected = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={view.busy}
      aria-pressed={selected}
      accessibilityState={{ disabled: view.busy, selected }}
      disabled={view.busy}
      onPress={action}
      style={[s.button, primary && s.primary, selected && s.selected]}
    >
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.heading}>
        {i18n.t('settings.title')}
      </Text>
      {view.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {'key' in view.error ? i18n.t(view.error.key) : i18n.problemMessage(view.error.code)}
        </Text>
      )}
      {view.notice && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.text}>
          {i18n.t(view.notice)}
        </Text>
      )}
      {view.busy && (
        <ActivityIndicator accessibilityLabel={i18n.t('settings.loading')} color={c.primary} />
      )}
      {view.response && (
        <View style={s.card}>
          <Text style={s.label}>{i18n.t('settings.displayName')}</Text>
          <TextInput
            accessibilityLabel={i18n.t('settings.displayName')}
            value={view.displayName}
            onChangeText={(value) => patch(epoch, { displayName: value })}
            editable={!view.busy}
            maxLength={80}
            style={s.input}
          />
          <LanguagePicker
            locale={view.locale}
            theme={theme}
            disabled={view.busy}
            onChange={(locale) => patch(epoch, { locale })}
          />
          <Text style={s.label}>{i18n.t('settings.format')}</Text>
          <Text
            accessibilityLabel={i18n.accessibleMoney(money(123456n, 'EUR'))}
            style={[s.text, s.amount]}
          >
            {i18n.money(money(123456n, 'EUR'))}
          </Text>
          <Text style={s.label}>{i18n.t('settings.zoneForUpdates')}</Text>
          <View style={s.row}>
            {zoneOptions.map((option) =>
              button(
                option.key ? i18n.t(option.key) : 'UTC',
                () => patch(epoch, { timezone: option.value }),
                false,
                view.timezone === option.value,
              ),
            )}
          </View>
          {!zoneOptions.some((option) => option.value === view.timezone) && (
            <Text style={s.text}>
              {i18n.t('settings.currentZone', { timezone: view.timezone })}
            </Text>
          )}
          <Text style={s.hint}>{i18n.t('settings.zoneHelp')}</Text>
          <Text style={s.hint}>
            {i18n.t('settings.lastChange', {
              date: i18n.instant(view.response.settings.updatedAt, view.response.settings.timezone),
            })}
          </Text>
          <View style={s.row}>
            {button(
              i18n.t('settings.save'),
              () => {
                void save()
              },
              true,
            )}
            {button(i18n.t('settings.restore'), () => {
              if (view.response) receive(epoch, view.response)
            })}
          </View>
        </View>
      )}
      {button(i18n.t('settings.refresh'), () => {
        void refresh()
      })}
      {view.response?.entitlements.plan === 'closed_beta' && (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.title}>
            {i18n.t('settings.freeBetaTitle')}
          </Text>
          <Text style={s.text}>{i18n.t('settings.freeBetaCopy')}</Text>
          <Text style={s.hint}>{i18n.t('settings.freeBetaCapabilities')}</Text>
        </View>
      )}
    </View>
  )
}
function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    amount: { fontVariant: ['tabular-nums'] },
    panel: { gap: 16 },
    heading: { fontFamily: 'Newsreader', fontSize: 30, color: c.textPrimary },
    title: { fontFamily: 'Geist', fontSize: 18, fontWeight: '600', color: c.textPrimary },
    text: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.textPrimary },
    hint: { fontFamily: 'Geist', fontSize: 14, lineHeight: 21, color: c.textSecondary },
    label: { fontFamily: 'Geist', fontSize: 14, fontWeight: '600', color: c.textPrimary },
    error: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.danger },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      backgroundColor: c.surface,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      padding: 12,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      fontFamily: 'Geist',
      fontSize: 16,
    },
    button: {
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 10,
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
    },
    buttonText: { fontFamily: 'Geist', fontSize: 14, color: c.textPrimary },
    primary: { backgroundColor: c.primary, borderColor: c.primary },
    primaryText: { color: c.onPrimary, fontWeight: '600' },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary },
  })
}
