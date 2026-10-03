import { ApiError, type DemoOverview } from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

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
  readonly error: string | null
  readonly notice: string | null
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
        if (!report(captured, cause))
          patch(captured, { error: 'Non riesco a caricare le preferenze. Riprova.' })
      })
      .finally(() => {
        if (!current(captured)) return
        busyEpoch.current = null
        patch(captured, { busy: false })
      })
  }, [scope, request])
  const run = async (action: () => Promise<unknown>, notice: string, changed = true) => {
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
              error:
                'Le preferenze sono cambiate. Ho aggiornato i dati: controllali e scegli di nuovo.',
            })
        } catch (refreshCause) {
          if (!report(captured, refreshCause))
            patch(captured, { error: 'Non riesco ad aggiornare le preferenze. Riprova.' })
        }
      } else patch(captured, { error: 'Non riesco a salvare le preferenze. Riprova.' })
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
      if (!report(captured, cause))
        patch(captured, { error: 'Non riesco a caricare questo movimento. Riprova.' })
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
      <Text accessibilityRole="header" style={s.title}>
        Le tue preferenze di riservatezza
      </Text>
      {view.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {view.error}
        </Text>
      )}
      {view.notice && (
        <Text accessibilityLiveRegion="polite" style={s.body}>
          {view.notice}
        </Text>
      )}
      {view.busy && (
        <ActivityIndicator accessibilityLabel="Aggiornamento preferenze" color={c.primary} />
      )}
      <View style={s.card}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Come riconosciamo i movimenti
        </Text>
        <Text style={s.body}>
          Usa solo le tue regole per rinunciare ai suggerimenti del dizionario degli esercenti. Le
          correzioni e le regole che hai scelto restano attive.
        </Text>
        {view.settings &&
          toggle('Usa solo le mie regole', view.settings.rulesOnly, () => {
            const saved = view.settings
            if (saved)
              void run(
                () =>
                  request('/v1/privacy/settings', {
                    method: 'PATCH',
                    body: JSON.stringify({ revision: saved.revision, rulesOnly: !saved.rulesOnly }),
                  }),
                'Preferenza di riconoscimento salvata.',
              )
          })}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Avvisi di servizio nell’app
        </Text>
        <Text style={s.body}>
          Puoi scegliere gli avvisi facoltativi. Gli avvisi essenziali di sicurezza e le
          informazioni sull’esportazione o sulla cancellazione restano disponibili.
        </Text>
        {servicePermission && (
          <>
            <Text style={s.hint}>{servicePermission.disclosure.text}</Text>
            {toggle(
              'Ricevi gli avvisi facoltativi nell’app',
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
                  'Preferenza degli avvisi salvata.',
                )
              },
              !servicePermission.featureAvailable,
            )}
            {servicePermission.granted && !servicePermission.localPreferenceEnabled && (
              <>
                <Text style={s.hint}>
                  La scelta precedente non abilita questi avvisi. Puoi revocarla subito, oppure
                  leggere il testo qui sopra e scegliere di nuovo.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Revoca la scelta precedente"
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
                      'Scelta precedente revocata.',
                    )
                  }}
                  style={[s.button, view.busy && s.disabled]}
                >
                  <Text style={s.buttonText}>Revoca la scelta precedente</Text>
                </Pressable>
              </>
            )}
          </>
        )}
        <Text style={s.hint}>
          Questa scelta riguarda l’app. Non abilita notifiche del telefono. Le funzioni di AI
          esterna e di analisi identificata non sono disponibili nella configurazione attuale.
        </Text>
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Scegli i movimenti da escludere dai riepiloghi
        </Text>
        <Text style={s.body}>
          Un movimento riservato o quieto resta nella tua lista e nella tua esportazione, ma viene
          escluso dai riepiloghi e dalle stime di spesa. La scelta non cancella il movimento.
        </Text>
        <TextInput
          accessibilityLabel="Cerca un movimento per le preferenze di riservatezza"
          placeholder="Cerca descrizione, esercente o data"
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
              {transaction.bookedOn ?? 'Data non comunicata'} ·{' '}
              {transaction.merchantName ?? transaction.description}
            </Text>
          </Pressable>
        ))}
        {matches.length > 50 && (
          <Text style={s.hint}>
            Mostro i primi 50 risultati. Cerca per trovare gli altri movimenti.
          </Text>
        )}
        {!matches.length && <Text style={s.body}>Nessun movimento corrisponde alla ricerca.</Text>}
        {view.transactionLoading && (
          <ActivityIndicator
            accessibilityLabel="Caricamento preferenze del movimento"
            color={c.primary}
          />
        )}
        {selected && view.flags && (
          <View style={s.detail}>
            <Text style={s.subtitle}>{selected.merchantName ?? selected.description}</Text>
            {overview.analysis.classifications.some(
              (item) => item.transactionId === selected.id && item.categoryId === 'health',
            ) && (
              <Text style={s.hint}>
                I movimenti classificati come salute sono già esclusi dai riepiloghi. Queste scelte
                aggiungono una tua preferenza riservata e non rimuovono quella protezione.
              </Text>
            )}
            {(['quiet', 'private'] as const).map((field) =>
              toggle(
                field === 'quiet' ? 'Movimento quieto' : 'Movimento riservato',
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
                      'Preferenza del movimento salvata.',
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
          void run(async () => undefined, 'Preferenze aggiornate.', false)
        }}
      >
        <Text style={s.buttonText}>Ricarica le preferenze</Text>
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
