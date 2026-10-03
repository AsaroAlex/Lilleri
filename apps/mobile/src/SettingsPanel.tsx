import { ApiError, createSettingsClient, type SettingsResponse } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import {
  formatProfileInstant,
  PROFILE_LOCALE,
  type ProfileSettings,
  type ProfileSettingsValues,
} from '@lilleri/domain'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly theme: BrandTheme
  readonly onChanged: (settings: ProfileSettings) => Promise<void> | void
  readonly onError?: (cause: unknown) => boolean
}
const zoneOptions = [
  { value: 'Europe/Rome', label: 'Italia' },
  { value: 'Europe/London', label: 'Londra' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'UTC', label: 'UTC' },
]

/** Persisted profile preferences only; no dormant model knobs or commercial purchase flow. */
export function SettingsPanel({ request, theme, onChanged, onError }: Props) {
  const client = useMemo(() => createSettingsClient(request), [request]),
    c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const [response, setResponse] = useState<SettingsResponse | null>(null),
    [displayName, setDisplayName] = useState(''),
    [timezone, setTimezone] = useState('Europe/Rome'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null)
  const receive = useCallback((value: SettingsResponse) => {
    setResponse(value)
    setDisplayName(value.settings.displayName)
    setTimezone(value.settings.timezone)
  }, [])
  const reportFailure = useCallback(
    (cause: unknown) => {
      if (!onError?.(cause)) return false
      setResponse(null)
      setNotice(null)
      return true
    },
    [onError],
  )
  useEffect(() => {
    let active = true
    setResponse(null)
    setError(null)
    setNotice(null)
    setBusy(true)
    client
      .get()
      .then((value) => {
        if (active) receive(value)
      })
      .catch((cause: unknown) => {
        if (active && !reportFailure(cause))
          setError('Non riesco a caricare le impostazioni. Riprova.')
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [client, receive, reportFailure])
  const refresh = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      receive(await client.get())
    } catch (cause) {
      if (!reportFailure(cause)) setError('Non riesco ad aggiornare le impostazioni. Riprova.')
    } finally {
      setBusy(false)
    }
  }
  const save = async () => {
    if (busy || !response) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const values: ProfileSettingsValues = {
      displayName: displayName.trim(),
      locale: PROFILE_LOCALE,
      timezone,
    }
    try {
      const updated = await client.update(response.settings.revision, values)
      receive(updated)
      await onChanged(updated.settings)
      setNotice('Impostazioni salvate.')
    } catch (cause) {
      if (reportFailure(cause)) return
      if (cause instanceof ApiError && cause.code === 'settings_changed') {
        try {
          const current = await client.get()
          receive(current)
          await onChanged(current.settings)
          setError(
            'Le impostazioni sono cambiate. Ho aggiornato i dati: controllali prima di salvare di nuovo.',
          )
        } catch (refreshCause) {
          if (!reportFailure(refreshCause))
            setError('Le impostazioni sono cambiate. Non riesco ad aggiornarle: riprova.')
        }
      } else
        setError(
          cause instanceof Error ? cause.message : 'Non riesco a salvare le impostazioni. Riprova.',
        )
    } finally {
      setBusy(false)
    }
  }
  const button = (label: string, action: () => void, primary = false, selected = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, selected }}
      disabled={busy}
      onPress={action}
      style={[s.button, primary && s.primary, selected && s.selected]}
    >
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.heading}>
        Profilo e formato
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {notice}
        </Text>
      )}
      {busy && (
        <ActivityIndicator
          accessibilityLabel="Aggiornamento delle impostazioni"
          color={c.primary}
        />
      )}
      {response && (
        <View style={s.card}>
          <Text style={s.label}>Nome del profilo</Text>
          <TextInput
            accessibilityLabel="Nome del profilo"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!busy}
            maxLength={80}
            style={s.input}
          />
          <Text style={s.label}>Lingua e formato</Text>
          <Text style={s.text}>Italiano · € 1.234,56</Text>
          <Text style={s.label}>Fuso orario per gli aggiornamenti</Text>
          <View style={s.row}>
            {zoneOptions.map((option) =>
              button(
                option.label,
                () => setTimezone(option.value),
                false,
                timezone === option.value,
              ),
            )}
          </View>
          {!zoneOptions.some((option) => option.value === timezone) && (
            <Text style={s.text}>Fuso attuale: {timezone}</Text>
          )}
          <Text style={s.hint}>
            Il fuso cambia la visualizzazione degli orari. Le date di contabilizzazione dei
            movimenti restano quelle della fonte.
          </Text>
          <Text style={s.hint}>
            Ultima modifica:{' '}
            {formatProfileInstant(response.settings.updatedAt, {
              displayName,
              locale: PROFILE_LOCALE,
              timezone,
            })}
          </Text>
          <View style={s.row}>
            {button(
              'Salva impostazioni',
              () => {
                void save()
              },
              true,
            )}
            {button('Ripristina valori salvati', () => receive(response))}
          </View>
        </View>
      )}
      {button('Aggiorna impostazioni', () => {
        void refresh()
      })}
      {response?.entitlements.plan === 'closed_beta' && (
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.title}>
            Beta gratuita
          </Text>
          <Text style={s.text}>
            Stai usando dati sintetici. Questo prototipo non vende abbonamenti e non effettua
            addebiti.
          </Text>
          <Text style={s.hint}>
            Correggere i movimenti, usare le regole, controllare le corrispondenze, gestire la
            privacy, esportare ed eliminare i dati restano funzioni gratuite. Conti manuali e
            importazioni CSV non hanno un limite commerciale.
          </Text>
        </View>
      )}
    </View>
  )
}
function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
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
