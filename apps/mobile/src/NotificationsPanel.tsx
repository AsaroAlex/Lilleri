import { ApiError } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { MessageKey } from './i18n'
import { useI18n } from './i18n/context'
import { displayMessage, displayProblem, type UiMessage } from './i18n/ui-message'

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
const labels: Record<OptionalType, MessageKey> = {
  inbox: 'notifications.inbox',
  consent_reminder: 'notifications.consentReminder',
  balance_mismatch: 'notifications.mismatch',
  connection_expired: 'notifications.expired',
  connection_paused: 'notifications.paused',
  summary_ready: 'notifications.summary',
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
  const i18n = useI18n()
  const i18nRef = useRef(i18n)
  i18nRef.current = i18n
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
    error: UiMessage | null
    notice: MessageKey | null
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
            ? 'notifications.changed'
            : displayProblem(cause, 'notifications.failed'),
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
        update(captured, { error: 'notifications.invalidHours' })
        return
      }
      await request<Preferences>('/v1/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ ...draft, revision: data.preferences.revision }),
      })
      if (!current(captured)) return
      receive(captured, await read())
      update(captured, { notice: 'notifications.saved' })
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
      aria-disabled={disabled || !!visible?.busy}
      disabled={disabled || !!visible?.busy}
      onPress={action}
      style={s.button}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  )
  const format = (text: string) => {
    try {
      return i18n.instant(text, visible?.data?.preferences.timezone)
    } catch {
      return i18nRef.current.t('notifications.dateUnavailable')
    }
  }
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.heading}>
        {i18nRef.current.t('notifications.title')}
      </Text>
      <Text style={s.text}>{i18nRef.current.t('notifications.localOnly')}</Text>
      {visible?.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {displayMessage(i18n, visible.error)}
        </Text>
      )}
      {visible?.notice && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.text}>
          {i18n.t(visible.notice)}
        </Text>
      )}
      {visible?.busy && (
        <ActivityIndicator
          accessibilityLabel={i18nRef.current.t('notifications.loading')}
          color={c.primary}
        />
      )}
      {button(i18nRef.current.t('notifications.refresh'), () => {
        void refresh()
      })}
      {visible?.data && (
        <>
          <View style={s.card}>
            <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
              {i18nRef.current.t('notifications.essential')}
            </Text>
            <Text style={s.text}>{i18nRef.current.t('notifications.essentialHelp')}</Text>
          </View>
          <View style={s.card}>
            <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
              {i18nRef.current.t('notifications.optional')}
            </Text>
            <Text style={s.text}>
              {visible.data.permission
                ? i18nRef.current.t('notifications.permissionEnabled')
                : i18nRef.current.t('notifications.enableInPrivacy')}
            </Text>
            {onOpenPrivacy && button(i18nRef.current.t('notifications.openPrivacy'), onOpenPrivacy)}
          </View>
          {visible.draft && (
            <View style={s.card}>
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {i18nRef.current.t('notifications.which')}
              </Text>
              {(Object.keys(labels) as OptionalType[]).map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityLabel={i18n.t(labels[key])}
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
                    {visible.draft?.types[key] ? '☑' : '☐'} {i18n.t(labels[key])}
                  </Text>
                </Pressable>
              ))}
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {i18nRef.current.t('notifications.quiet')}
              </Text>
              <Text style={s.text}>
                {i18n.t('notifications.timezone', { timezone: visible.data.preferences.timezone })}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={i18nRef.current.t('notifications.respectQuiet')}
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
                  {visible.draft.quietHours.enabled ? '☑' : '☐'}
                  {i18nRef.current.t('notifications.respectQuiet')}
                </Text>
              </Pressable>
              <View style={s.row}>
                <View style={s.timeField}>
                  <Text style={s.label}>{i18nRef.current.t('notifications.from')}</Text>
                  <TextInput
                    accessibilityLabel={i18nRef.current.t('notifications.quietStart')}
                    value={visible.draft.quietHours.start}
                    onChangeText={(start) => quiet({ start })}
                    editable={!visible.busy}
                    maxLength={5}
                    placeholder="22:00"
                    style={s.input}
                  />
                </View>
                <View style={s.timeField}>
                  <Text style={s.label}>{i18nRef.current.t('notifications.through')}</Text>
                  <TextInput
                    accessibilityLabel={i18nRef.current.t('notifications.quietEnd')}
                    value={visible.draft.quietHours.end}
                    onChangeText={(end) => quiet({ end })}
                    editable={!visible.busy}
                    maxLength={5}
                    placeholder="08:00"
                    style={s.input}
                  />
                </View>
              </View>
              {button(i18nRef.current.t('notifications.save'), () => {
                void save()
              })}
            </View>
          )}
          <View style={s.card}>
            <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
              {i18nRef.current.t('notifications.received')}
            </Text>
            {visible.data.notices.length === 0 ? (
              <Text style={s.text}>{i18nRef.current.t('notifications.empty')}</Text>
            ) : (
              visible.data.notices.map((item) => (
                <View key={item.id} style={s.notice}>
                  <Text style={s.subtitle}>
                    {i18n.notificationTitle(item.type, item.textVersion)}
                  </Text>
                  <Text style={s.hint}>
                    {format(item.deliveredAt)} ·{' '}
                    {item.seenAt
                      ? i18nRef.current.t('notifications.seen')
                      : i18nRef.current.t('notifications.unseen')}
                  </Text>
                  <View style={s.row}>
                    {!item.seenAt &&
                      button(i18nRef.current.t('notifications.markSeen'), () => {
                        void seen(item)
                      })}
                    {onOpenDestination &&
                      button(i18nRef.current.t('notifications.open'), () => {
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
