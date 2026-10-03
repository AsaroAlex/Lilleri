import { ApiError, type DemoOverview } from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { MessageKey } from './src/i18n'
import { useI18n } from './src/i18n/context'
import { displayMessage, displayProblem, type UiMessage } from './src/i18n/ui-message'

interface PrivacySettings {
  readonly profileId: string
  readonly rulesOnly: boolean
  readonly revision: number
}
interface TransactionPrivacy {
  readonly profileId: string
  readonly transactionId: string
  readonly quiet: boolean
  readonly private: boolean
  readonly revision: number
}
interface PrivacyPermission {
  readonly profileId: string
  readonly purpose: 'P-AI' | 'C-ANALYTICS' | 'N-SERVICE'
  readonly revision: number
  readonly granted: boolean
  readonly localPreferenceEnabled: boolean
  readonly featureAvailable: boolean
  readonly disclosure: {
    readonly text: string
    readonly textVersion: string
    readonly textHash: string
    readonly noticeVersion: string
    readonly vendorListVersion: string | null
  }
}
export interface PrivacyControlsPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly resetKey: number | string
  readonly onChanged: () => Promise<void> | void
  readonly onError?: (cause: unknown) => boolean
}
interface PanelState {
  readonly epoch: number
  readonly settings: PrivacySettings | null
  readonly permissions: readonly PrivacyPermission[]
  readonly selectedId: string | null
  readonly flags: TransactionPrivacy | null
  readonly query: string
  readonly busy: boolean
  readonly transactionLoading: boolean
  readonly error: UiMessage | null
  readonly notice: MessageKey | null
}
const emptyState = (epoch: number): PanelState => ({
  epoch,
  settings: null,
  permissions: [],
  selectedId: null,
  flags: null,
  query: '',
  busy: true,
  transactionLoading: false,
  error: null,
  notice: null,
})

/** Owned, reversible metadata. Late responses and authentication errors cannot cross identities. */
export function PrivacyControlsPanel({
  overview,
  theme,
  request,
  resetKey,
  onChanged,
  onError,
}: PrivacyControlsPanelProps) {
  const i18n = useI18n()
  const i18nRef = useRef(i18n)
  i18nRef.current = i18n
  const c = colors[theme]
  const s = useMemo(() => styles(c), [c])
  const scope = `${overview.profile.id}:${String(resetKey)}`
  const identity = useRef({ scope, request, epoch: 0 })
  const busyEpoch = useRef<number | null>(null)
  const selectionVersion = useRef(0)
  if (identity.current.scope !== scope || identity.current.request !== request) {
    identity.current = { scope, request, epoch: identity.current.epoch + 1 }
    busyEpoch.current = null
    selectionVersion.current++
  }
  const mounted = useRef(true)
  const handlers = useRef({ onChanged, onError })
  handlers.current = { onChanged, onError }
  const [state, setState] = useState(() => emptyState(identity.current.epoch))
  const epoch = identity.current.epoch
  const view = state.epoch === epoch ? state : emptyState(epoch)
  const current = (captured: number) => mounted.current && identity.current.epoch === captured
  const patch = (captured: number, values: Partial<PanelState>) => {
    if (!current(captured)) return
    setState((previous) => ({
      ...(previous.epoch === captured ? previous : emptyState(captured)),
      ...values,
      epoch: captured,
    }))
  }
  const report = (captured: number, cause: unknown): boolean => {
    if (!current(captured)) return true
    if (!handlers.current.onError?.(cause)) return false
    patch(captured, { settings: null, permissions: [], flags: null, error: null, notice: null })
    return true
  }
  const reload = async (captured: number, transactionId: string | null = null) => {
    if (!current(captured)) return
    const [settings, result] = await Promise.all([
      request<PrivacySettings>('/v1/privacy/settings'),
      request<{ permissions: readonly PrivacyPermission[] }>('/v1/privacy/permissions'),
    ])
    if (!current(captured)) return
    if (
      settings.profileId !== overview.profile.id ||
      result.permissions.some((item) => item.profileId !== overview.profile.id)
    )
      throw new Error('privacy_identity_changed')
    patch(captured, { settings, permissions: result.permissions })
    if (transactionId) {
      const flags = await request<TransactionPrivacy>(
        `/v1/transactions/${encodeURIComponent(transactionId)}/privacy`,
      )
      if (!current(captured)) return
      if (flags.profileId !== overview.profile.id || flags.transactionId !== transactionId)
        throw new Error('privacy_identity_changed')
      patch(captured, { flags })
    }
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      selectionVersion.current++
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: The profile/session/request epoch fences every read; changing callback identities does not reload saved preferences.
  useEffect(() => {
    const captured = identity.current.epoch
    busyEpoch.current = captured
    setState(emptyState(captured))
    void reload(captured)
      .catch((cause: unknown) => {
        if (!report(captured, cause)) patch(captured, { error: 'privacyControls.loadFailed' })
      })
      .finally(() => {
        if (!current(captured)) return
        busyEpoch.current = null
        patch(captured, { busy: false })
      })
  }, [scope, request])
  const run = async (action: () => Promise<unknown>, notice: MessageKey, changed = true) => {
    const captured = identity.current.epoch
    if (busyEpoch.current === captured || !current(captured)) return
    busyEpoch.current = captured
    selectionVersion.current++
    const selectedId = view.selectedId
    patch(captured, { busy: true, transactionLoading: false, error: null, notice: null })
    try {
      await action()
      if (!current(captured)) return
      await reload(captured, selectedId)
      if (!current(captured)) return
      if (changed) await handlers.current.onChanged()
      if (current(captured)) patch(captured, { notice })
    } catch (cause) {
      if (report(captured, cause)) return
      if (
        cause instanceof ApiError &&
        ['privacy_changed', 'privacy_text_changed'].includes(cause.code)
      ) {
        try {
          await reload(captured, selectedId)
          if (!current(captured)) return
          await handlers.current.onChanged()
          if (current(captured))
            patch(captured, {
              error: 'privacyControls.changed',
            })
        } catch (refreshCause) {
          if (!report(captured, refreshCause))
            patch(captured, { error: 'privacyControls.refreshFailed' })
        }
      } else patch(captured, { error: displayProblem(cause, 'privacyControls.saveFailed') })
    } finally {
      if (current(captured)) {
        busyEpoch.current = null
        patch(captured, { busy: false })
      }
    }
  }
  const selectTransaction = async (transactionId: string) => {
    const captured = identity.current.epoch
    if (busyEpoch.current === captured || !current(captured)) return
    const version = ++selectionVersion.current
    patch(captured, {
      selectedId: transactionId,
      flags: null,
      transactionLoading: true,
      error: null,
      notice: null,
    })
    try {
      const flags = await request<TransactionPrivacy>(
        `/v1/transactions/${encodeURIComponent(transactionId)}/privacy`,
      )
      if (!current(captured) || version !== selectionVersion.current) return
      if (flags.profileId !== overview.profile.id || flags.transactionId !== transactionId)
        throw new Error('privacy_identity_changed')
      patch(captured, { flags })
    } catch (cause) {
      if (!current(captured) || version !== selectionVersion.current) return
      if (!report(captured, cause)) patch(captured, { error: 'privacyControls.transactionFailed' })
    } finally {
      if (current(captured) && version === selectionVersion.current)
        patch(captured, { transactionLoading: false })
    }
  }
  const toggle = (label: string, checked: boolean, action: () => void, unavailable = false) => (
    <Pressable
      key={label}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      aria-checked={checked}
      aria-disabled={view.busy || unavailable}
      accessibilityState={{ checked, disabled: view.busy || unavailable }}
      disabled={view.busy || unavailable}
      onPress={action}
      style={[s.button, checked && s.selected, (view.busy || unavailable) && s.disabled]}
    >
      <Text style={s.buttonText}>
        {checked ? '✓ ' : '○ '}
        {label}
      </Text>
    </Pressable>
  )
  const servicePermission = view.permissions.find((item) => item.purpose === 'N-SERVICE')
  const query = view.query.trim().toLocaleLowerCase('it-IT')
  const matches = overview.transactions.filter((item) =>
    `${item.merchantName ?? ''} ${item.description} ${item.bookedOn ?? ''}`
      .toLocaleLowerCase('it-IT')
      .includes(query),
  )
  const selected = overview.transactions.find((item) => item.id === view.selectedId)
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {i18nRef.current.t('privacyControls.title')}
      </Text>
      {view.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {displayMessage(i18n, view.error)}
        </Text>
      )}
      {view.notice && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.body}>
          {i18n.t(view.notice)}
        </Text>
      )}
      {view.busy && (
        <ActivityIndicator
          accessibilityLabel={i18nRef.current.t('privacyControls.loading')}
          color={c.primary}
        />
      )}
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
          {i18nRef.current.t('privacyControls.recognition')}
        </Text>
        <Text style={s.body}>{i18nRef.current.t('privacyControls.rulesHelp')}</Text>
        {view.settings &&
          toggle(i18nRef.current.t('privacyControls.rulesOnly'), view.settings.rulesOnly, () => {
            const saved = view.settings
            if (saved)
              void run(
                () =>
                  request('/v1/privacy/settings', {
                    method: 'PATCH',
                    body: JSON.stringify({ revision: saved.revision, rulesOnly: !saved.rulesOnly }),
                  }),
                'privacyControls.rulesSaved',
              )
          })}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
          {i18nRef.current.t('privacyControls.service')}
        </Text>
        <Text style={s.body}>{i18nRef.current.t('privacyControls.serviceHelp')}</Text>
        {servicePermission && (
          <>
            <Text style={s.hint}>
              {i18n.t('privacyControls.disclosureLanguage', {
                version: servicePermission.disclosure.textVersion,
              })}
            </Text>
            <Text style={s.hint}>{servicePermission.disclosure.text}</Text>
            {toggle(
              i18nRef.current.t('privacyControls.optional'),
              servicePermission.localPreferenceEnabled,
              () => {
                const proof = servicePermission.disclosure
                const choice = servicePermission.localPreferenceEnabled
                  ? { revision: servicePermission.revision, action: 'revoked' }
                  : {
                      revision: servicePermission.revision,
                      action: 'granted',
                      textVersion: proof.textVersion,
                      textHash: proof.textHash,
                      noticeVersion: proof.noticeVersion,
                      vendorListVersion: proof.vendorListVersion,
                    }
                void run(
                  () =>
                    request('/v1/privacy/permissions/N-SERVICE', {
                      method: 'PATCH',
                      body: JSON.stringify(choice),
                    }),
                  'privacyControls.serviceSaved',
                )
              },
              !servicePermission.featureAvailable,
            )}
            {servicePermission.granted && !servicePermission.localPreferenceEnabled && (
              <>
                <Text style={s.hint}>{i18nRef.current.t('privacyControls.previousChoice')}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={i18nRef.current.t('privacyControls.withdraw')}
                  aria-disabled={view.busy}
                  accessibilityState={{ disabled: view.busy }}
                  disabled={view.busy}
                  onPress={() => {
                    void run(
                      () =>
                        request('/v1/privacy/permissions/N-SERVICE', {
                          method: 'PATCH',
                          body: JSON.stringify({
                            revision: servicePermission.revision,
                            action: 'revoked',
                          }),
                        }),
                      'privacyControls.withdrawn',
                    )
                  }}
                  style={[s.button, view.busy && s.disabled]}
                >
                  <Text style={s.buttonText}>{i18nRef.current.t('privacyControls.withdraw')}</Text>
                </Pressable>
              </>
            )}
          </>
        )}
        <Text style={s.hint}>{i18nRef.current.t('privacyControls.unavailableFeatures')}</Text>
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
          {i18nRef.current.t('privacyControls.exclude')}
        </Text>
        <Text style={s.body}>{i18nRef.current.t('privacyControls.excludeHelp')}</Text>
        <TextInput
          accessibilityLabel={i18nRef.current.t('privacyControls.search')}
          placeholder={i18nRef.current.t('privacyControls.searchPlaceholder')}
          placeholderTextColor={c.textSecondary}
          value={view.query}
          onChangeText={(value) => patch(epoch, { query: value })}
          style={s.input}
        />
        {matches.slice(0, 50).map((transaction) => (
          <Pressable
            key={transaction.id}
            accessibilityRole="button"
            aria-pressed={view.selectedId === transaction.id}
            aria-disabled={view.busy}
            accessibilityState={{
              selected: view.selectedId === transaction.id,
              disabled: view.busy,
            }}
            disabled={view.busy}
            onPress={() => {
              void selectTransaction(transaction.id)
            }}
            style={[
              s.button,
              view.selectedId === transaction.id && s.selected,
              view.busy && s.disabled,
            ]}
          >
            <Text style={s.buttonText}>
              {transaction.bookedOn
                ? i18n.calendarDate(transaction.bookedOn)
                : i18nRef.current.t('privacyControls.dateUnknown')}{' '}
              · {transaction.merchantName ?? transaction.description}
            </Text>
          </Pressable>
        ))}
        {matches.length > 50 && (
          <Text style={s.hint}>{i18nRef.current.t('privacyControls.firstFifty')}</Text>
        )}
        {!matches.length && (
          <Text style={s.body}>{i18nRef.current.t('privacyControls.empty')}</Text>
        )}
        {view.transactionLoading && (
          <ActivityIndicator
            accessibilityLabel={i18nRef.current.t('privacyControls.transactionLoading')}
            color={c.primary}
          />
        )}
        {selected && view.flags && (
          <View style={s.detail}>
            <Text style={s.subtitle}>{selected.merchantName ?? selected.description}</Text>
            {overview.analysis.classifications.some(
              (item) => item.transactionId === selected.id && item.categoryId === 'health',
            ) && (
              <Text style={s.hint}>{i18nRef.current.t('privacyControls.healthProtection')}</Text>
            )}
            {(['quiet', 'private'] as const).map((field) =>
              toggle(
                field === 'quiet'
                  ? i18nRef.current.t('privacyControls.quiet')
                  : i18nRef.current.t('privacyControls.private'),
                view.flags?.[field] ?? false,
                () => {
                  const flags = view.flags
                  if (flags)
                    void run(
                      () =>
                        request(
                          `/v1/transactions/${encodeURIComponent(flags.transactionId)}/privacy`,
                          {
                            method: 'PATCH',
                            body: JSON.stringify({
                              revision: flags.revision,
                              quiet: flags.quiet,
                              private: flags.private,
                              [field]: !flags[field],
                            }),
                          },
                        ),
                      'privacyControls.transactionSaved',
                    )
                },
              ),
            )}
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        aria-disabled={view.busy}
        disabled={view.busy}
        accessibilityState={{ disabled: view.busy }}
        style={[s.button, view.busy && s.disabled]}
        onPress={() => {
          void run(async () => undefined, 'privacyControls.refreshed', false)
        }}
      >
        <Text style={s.buttonText}>{i18nRef.current.t('privacyControls.refresh')}</Text>
      </Pressable>
    </View>
  )
}
type ThemeColors = typeof colors.light | typeof colors.dark
const styles = (c: ThemeColors) =>
  StyleSheet.create({
    panel: { gap: 16 },
    card: {
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.surface,
    },
    title: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
    },
    subtitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
    },
    body: {
      color: c.textSecondary,
      fontFamily: tokens.typography.fontUI,
      fontSize: 16,
      lineHeight: 25,
    },
    hint: {
      color: c.textSecondary,
      fontFamily: tokens.typography.fontUI,
      fontSize: 14,
      lineHeight: 22,
    },
    error: { color: c.danger, fontFamily: tokens.typography.fontUI, fontSize: 16, lineHeight: 25 },
    button: {
      minHeight: 48,
      minWidth: 48,
      padding: 14,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 10,
      backgroundColor: c.surfaceElevated,
      justifyContent: 'center',
    },
    buttonText: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 15, lineHeight: 23 },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary },
    disabled: { opacity: 0.5 },
    input: {
      minHeight: 48,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 10,
      backgroundColor: c.surfaceElevated,
      color: c.textPrimary,
      fontFamily: tokens.typography.fontUI,
      fontSize: 16,
    },
    detail: { gap: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
  })
