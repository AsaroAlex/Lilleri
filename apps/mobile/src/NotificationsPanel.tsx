import { ApiError } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

type OptionalType =
  | 'inbox'
  | 'consent_reminder'
  | 'balance_mismatch'
  | 'connection_expired'
  | 'connection_paused'
  | 'summary_ready'
interface Notice {
  readonly id: string
  readonly type: string
  readonly title: string
  readonly textVersion: string
  readonly deliveredAt: string
  readonly seenAt: string | null
  readonly revision: number
}
interface Values {
  readonly types: Record<OptionalType, boolean>
  readonly quietHours: { readonly enabled: boolean; readonly start: string; readonly end: string }
}
interface Preferences extends Values {
  readonly revision: number
  readonly updatedAt: string | null
  readonly timezone: string
  readonly nativePushAvailable: false
  readonly osPermission: 'unknown'
}
interface Permission {
  readonly purpose: string
  readonly localPreferenceEnabled: boolean
}
interface PanelData {
  readonly preferences: Preferences
  readonly notices: readonly Notice[]
  readonly permission: boolean
}
export interface NotificationDestination {
  readonly screen: 'account' | 'privacy' | 'overview' | 'connections' | 'inbox'
  readonly action: string
  readonly connectionId?: string
}
interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly resetKey: string | number
  readonly theme: BrandTheme
  readonly onError?: (cause: unknown) => boolean
  readonly onOpenPrivacy?: () => void
  readonly onOpenDestination?: (destination: NotificationDestination) => void
}
const labels: Record<OptionalType, string> = {
  inbox: 'Movimenti da rivedere',
  consent_reminder: 'Collegamenti da rinnovare',
  balance_mismatch: 'Dati da verificare',
  connection_expired: 'Collegamenti scaduti',
  connection_paused: 'Collegamenti in pausa',
  summary_ready: 'Riepiloghi pronti',
}
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/** The parent passes its financial session epoch. Late responses cannot repopulate another profile. */
export function NotificationsPanel({
  request,
  resetKey,
  theme,
  onError,
  onOpenPrivacy,
  onOpenDestination,
}: Props) {
  const c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const identity = useRef({ request, resetKey, epoch: 0 })
  if (identity.current.request !== request || identity.current.resetKey !== resetKey)
    identity.current = { request, resetKey, epoch: identity.current.epoch + 1 }
  const epoch = identity.current.epoch
  const mounted = useRef(true),
    flight = useRef<symbol | null>(null),
    errorHandler = useRef(onError)
  errorHandler.current = onError
  const [state, setState] = useState<{
    epoch: number
    data: PanelData | null
    draft: Values | null
    busy: boolean
    error: string | null
    notice: string | null
  }>({ epoch, data: null, draft: null, busy: false, error: null, notice: null })
  const visible = state.epoch === epoch ? state : null
  const current = useCallback(
    (captured: number) => mounted.current && identity.current.epoch === captured,
    [],
  )
  const update = useCallback(
    (captured: number, patch: Partial<typeof state>) => {
      if (current(captured))
        setState((value) => ({
          ...(value.epoch === captured
            ? value
            : { epoch: captured, data: null, draft: null, busy: false, error: null, notice: null }),
          ...patch,
        }))
    },
    [current],
  )
  const read = useCallback(async (): Promise<PanelData> => {
    const [preferences, feed, permissions] = await Promise.all([
      request<Preferences>('/v1/notifications/preferences'),
      request<{ items: Notice[]; nativePushAvailable: false }>('/v1/notifications'),
      request<{ permissions: Permission[] }>('/v1/privacy/permissions'),
    ])
    return {
      preferences,
      notices: feed.items,
      permission:
        permissions.permissions.find((entry) => entry.purpose === 'N-SERVICE')
          ?.localPreferenceEnabled ?? false,
    }
  }, [request])
  const receive = useCallback(
    (captured: number, data: PanelData) =>
      update(captured, {
        data,
        draft: {
          types: { ...data.preferences.types },
          quietHours: { ...data.preferences.quietHours },
        },
      }),
    [update],
  )
  const failure = useCallback(
    (captured: number, cause: unknown) => {
      if (!current(captured)) return
      if (errorHandler.current?.(cause)) {
        update(captured, { data: null, draft: null, error: null, notice: null })
        return
      }
      update(captured, {
        error:
          cause instanceof ApiError && cause.code === 'notification_changed'
            ? 'Gli avvisi sono cambiati. Aggiorna e controlla prima di riprovare.'
            : 'Non riesco ad aggiornare gli avvisi. Riprova.',
      })
    },
    [current, update],
  )
  useEffect(() => {
    if (identity.current.resetKey !== resetKey) return
    mounted.current = true
    const captured = identity.current.epoch,
      token = Symbol('notification-load')
    flight.current = token
    setState({ epoch: captured, data: null, draft: null, busy: true, error: null, notice: null })
    void read()
      .then((data) => receive(captured, data))
      .catch((cause: unknown) => failure(captured, cause))
      .finally(() => {
        if (flight.current === token) flight.current = null
        update(captured, { busy: false })
      })
    return () => {
      mounted.current = false
      identity.current.epoch++
      flight.current = null
    }
    // The epoch boundary is the request principal, not changing presentation callbacks.
  }, [read, receive, failure, update, resetKey])
  const run = async (action: (captured: number) => Promise<void>) => {
    if (flight.current) return
    const captured = identity.current.epoch,
      token = Symbol('notification-action')
    flight.current = token
    update(captured, { busy: true, error: null, notice: null })
    try {
      await action(captured)
    } catch (cause) {
      failure(captured, cause)
    } finally {
      if (flight.current === token) flight.current = null
      update(captured, { busy: false })
    }
  }
  const refresh = () => run(async (captured) => receive(captured, await read()))
  const save = () =>
    run(async (captured) => {
      const draft = visible?.draft,
        data = visible?.data
      if (!draft || !data) return
      if (
        !timePattern.test(draft.quietHours.start) ||
        !timePattern.test(draft.quietHours.end) ||
        draft.quietHours.start === draft.quietHours.end
      ) {
        update(captured, { error: 'Inserisci due orari diversi nel formato 22:00.' })
        return
      }
      await request<Preferences>('/v1/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ ...draft, revision: data.preferences.revision }),
      })
      if (!current(captured)) return
      receive(captured, await read())
      update(captured, { notice: 'Preferenze degli avvisi salvate.' })
    })
  const seen = (item: Notice) =>
    run(async (captured) => {
      await request<Notice>(`/v1/notifications/${encodeURIComponent(item.id)}/seen`, {
        method: 'PATCH',
        body: JSON.stringify({ revision: item.revision }),
      })
      if (current(captured)) receive(captured, await read())
    })
  const open = (item: Notice) =>
    run(async (captured) => {
      const destination = await request<NotificationDestination>(
        `/v1/notifications/${encodeURIComponent(item.id)}/destination`,
      )
      if (current(captured)) onOpenDestination?.(destination)
    })
  const toggle = (key: OptionalType) => {
    if (visible?.draft && !visible.busy)
      update(epoch, {
        draft: {
          ...visible.draft,
          types: { ...visible.draft.types, [key]: !visible.draft.types[key] },
        },
      })
  }
  const quiet = (patch: Partial<Values['quietHours']>) => {
    if (visible?.draft && !visible.busy)
      update(epoch, {
        draft: { ...visible.draft, quietHours: { ...visible.draft.quietHours, ...patch } },
      })
  }
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || !!visible?.busy }}
      disabled={disabled || !!visible?.busy}
      onPress={action}
      style={s.button}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  )
  const format = (text: string) => {
    try {
      return new Intl.DateTimeFormat('it-IT', {
        timeZone: visible?.data?.preferences.timezone ?? 'Europe/Rome',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(text))
    } catch {
      return 'Data non disponibile'
    }
  }
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.heading}>
        Avvisi
      </Text>
      <Text style={s.text}>
        Gli avvisi restano in questa app. Le notifiche al dispositivo non sono attive.
      </Text>
      {visible?.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {visible.error}
        </Text>
      )}
      {visible?.notice && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {visible.notice}
        </Text>
      )}
      {visible?.busy && (
        <ActivityIndicator accessibilityLabel="Aggiornamento degli avvisi" color={c.primary} />
      )}
      {button('Aggiorna avvisi', () => {
        void refresh()
      })}
      {visible?.data && (
        <>
          <View style={s.card}>
            <Text accessibilityRole="header" style={s.subtitle}>
              Avvisi essenziali
            </Text>
            <Text style={s.text}>
              Avvisi di sicurezza e risposte su esportazione, eliminazione e dati restano sempre
              disponibili.
            </Text>
          </View>
          <View style={s.card}>
            <Text accessibilityRole="header" style={s.subtitle}>
              Avvisi facoltativi
            </Text>
            <Text style={s.text}>
              {visible.data.permission
                ? 'Il permesso per gli avvisi in-app è attivo.'
                : 'Attiva gli avvisi facoltativi in Permessi e privacy.'}
            </Text>
            {onOpenPrivacy && button('Apri Permessi e privacy', onOpenPrivacy)}
          </View>
          {visible.draft && (
            <View style={s.card}>
              <Text accessibilityRole="header" style={s.subtitle}>
                Quali avvisi vedere
              </Text>
              {(Object.keys(labels) as OptionalType[]).map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityLabel={labels[key]}
                  accessibilityState={{
                    checked: visible.draft?.types[key] ?? false,
                    disabled: visible.busy,
                  }}
                  aria-checked={visible.draft?.types[key] ?? false}
                  aria-disabled={visible.busy}
                  disabled={visible.busy}
                  onPress={() => toggle(key)}
                  style={s.choice}
                >
                  <Text style={s.text}>
                    {visible.draft?.types[key] ? '☑' : '☐'} {labels[key]}
                  </Text>
                </Pressable>
              ))}
              <Text accessibilityRole="header" style={s.subtitle}>
                Orari tranquilli
              </Text>
              <Text style={s.text}>
                Fuso del profilo: {visible.data.preferences.timezone}. Si cambia in Profilo e
                formato.
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Rispetta gli orari tranquilli"
                accessibilityState={{
                  checked: visible.draft.quietHours.enabled,
                  disabled: visible.busy,
                }}
                aria-checked={visible.draft.quietHours.enabled}
                aria-disabled={visible.busy}
                disabled={visible.busy}
                onPress={() => quiet({ enabled: !visible.draft?.quietHours.enabled })}
                style={s.choice}
              >
                <Text style={s.text}>
                  {visible.draft.quietHours.enabled ? '☑' : '☐'} Rispetta gli orari tranquilli
                </Text>
              </Pressable>
              <View style={s.row}>
                <View style={s.timeField}>
                  <Text style={s.label}>Dalle</Text>
                  <TextInput
                    accessibilityLabel="Inizio degli orari tranquilli"
                    value={visible.draft.quietHours.start}
                    onChangeText={(start) => quiet({ start })}
                    editable={!visible.busy}
                    maxLength={5}
                    placeholder="22:00"
                    style={s.input}
                  />
                </View>
                <View style={s.timeField}>
                  <Text style={s.label}>Alle</Text>
                  <TextInput
                    accessibilityLabel="Fine degli orari tranquilli"
                    value={visible.draft.quietHours.end}
                    onChangeText={(end) => quiet({ end })}
                    editable={!visible.busy}
                    maxLength={5}
                    placeholder="08:00"
                    style={s.input}
                  />
                </View>
              </View>
              {button('Salva preferenze avvisi', () => {
                void save()
              })}
            </View>
          )}
          <View style={s.card}>
            <Text accessibilityRole="header" style={s.subtitle}>
              Avvisi ricevuti
            </Text>
            {visible.data.notices.length === 0 ? (
              <Text style={s.text}>Non ci sono avvisi ricevuti.</Text>
            ) : (
              visible.data.notices.map((item) => (
                <View key={item.id} style={s.notice}>
                  <Text style={s.subtitle}>{item.title}</Text>
                  <Text style={s.hint}>
                    {format(item.deliveredAt)} · {item.seenAt ? 'Letto' : 'Da leggere'}
                  </Text>
                  <View style={s.row}>
                    {!item.seenAt &&
                      button('Segna come letto', () => {
                        void seen(item)
                      })}
                    {onOpenDestination &&
                      button('Apri avviso', () => {
                        void open(item)
                      })}
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </View>
  )
}
function styles(c: (typeof colors)[BrandTheme]) {
  return StyleSheet.create({
    panel: { gap: 12 },
    heading: { color: c.textPrimary, fontSize: 23, fontWeight: '600' },
    subtitle: { color: c.textPrimary, fontSize: 16, fontWeight: '600' },
    text: { color: c.textPrimary, fontSize: 15, lineHeight: 22 },
    hint: { color: c.textSecondary, fontSize: 13, lineHeight: 20 },
    label: { color: c.textSecondary, fontSize: 14 },
    card: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      backgroundColor: c.surface,
    },
    choice: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    button: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignSelf: 'flex-start',
    },
    buttonText: { color: c.primary, fontSize: 14, fontWeight: '600' },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 10,
      color: c.textPrimary,
      fontSize: 16,
    },
    timeField: { flexGrow: 1, minWidth: 100, gap: 6 },
    notice: { gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
    error: { color: c.negative, fontSize: 14, lineHeight: 21 },
  })
}
