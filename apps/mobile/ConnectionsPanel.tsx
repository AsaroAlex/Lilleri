import {
  type ApiClient,
  ApiError,
  type ConnectionAccountKind,
  type ConnectionConsentEventDto,
  type ConnectionInstitutionCatalogueDto,
  type ConnectionInstitutionDto,
  type ConnectionLifecycleDto,
  type DemoOverview,
} from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

type ThemeColors = typeof colors.light | typeof colors.dark
type ConnectionClient = Pick<
  ApiClient,
  | 'institutions'
  | 'connectInstitution'
  | 'connectionLifecycle'
  | 'connectionConsentEvents'
  | 'pauseConnection'
  | 'resumeConnection'
  | 'renewConnection'
  | 'sync'
>
export interface ConnectionsPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly api: ConnectionClient
  /** Identity epoch from the parent; session renewal/logout invalidates old responses too. */
  readonly resetKey: number | string
  readonly onRefresh: () => Promise<void>
  readonly onManualFallback: () => void
  readonly onError?: (cause: unknown) => boolean
}
const kindLabels: Readonly<Record<ConnectionAccountKind, string>> = {
  current: 'Conto corrente',
  savings: 'Risparmi',
  card: 'Carta',
  cash: 'Contanti',
}
const stateLabels: Readonly<Record<ConnectionLifecycleDto['state'], string>> = {
  active: 'Attivo',
  expiring: 'Da rinnovare a breve',
  expired: 'Autorizzazione scaduta',
  revoked: 'Scollegato',
  error: 'Richiede una verifica',
  paused: 'In pausa',
  unknown: 'Autorizzazione da verificare',
}
const eventLabels: Readonly<Record<ConnectionConsentEventDto['action'], string>> = {
  granted: 'Autorizzazione della fonte',
  renewed: 'Autorizzazione rinnovata',
  paused: 'Collegamento in pausa',
  resumed: 'Collegamento ripreso',
  revoked: 'Collegamento scollegato',
  provider_error: 'Problema segnalato dalla fonte',
  provider_recovered: 'Fonte nuovamente disponibile',
  legacy_imported: 'Storico precedente ricostruito',
}
function formatInstant(value: string | null, timezone: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Non comunicata dalla fonte'
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
}
function coverageLabel(institution: ConnectionInstitutionDto, kind: ConnectionAccountKind): string {
  const coverage = institution.accountTypes.find((item) => item.kind === kind)
  if (!coverage || coverage.availability === 'unknown' || coverage.evidence.status === 'unknown')
    return 'Copertura non verificata'
  if (coverage.availability === 'unavailable') return 'Non ancora collegabile'
  if (coverage.evidence.status === 'synthetic') return 'Disponibile solo nella simulazione'
  if (coverage.evidence.status === 'unverified') return 'Disponibilità dichiarata, non verificata'
  return coverage.evidence.environment === 'sandbox'
    ? 'Verificata nel solo ambiente di prova'
    : 'Copertura verificata nella configurazione'
}
function canConnectFixture(
  catalogue: ConnectionInstitutionCatalogueDto | null,
  institution: ConnectionInstitutionDto,
  kind: ConnectionAccountKind,
): boolean {
  const coverage = institution.accountTypes.find((item) => item.kind === kind)
  return (
    catalogue?.mode === 'synthetic' &&
    catalogue.environment === 'synthetic' &&
    institution.providerId === catalogue.providerId &&
    coverage?.availability === 'available' &&
    coverage.evidence.status === 'synthetic' &&
    coverage.evidence.environment === 'synthetic'
  )
}

/** Volatile owned connection state. Revision conflicts refresh evidence and require a new gesture. */
export function ConnectionsPanel({
  overview,
  theme,
  api,
  resetKey,
  onRefresh,
  onManualFallback,
  onError,
}: ConnectionsPanelProps) {
  const c = colors[theme]
  const s = useMemo(() => styles(c), [c])
  const scope = `${overview.profile.id}:${String(resetKey)}`
  const context = useRef({ scope, epoch: 0 })
  if (context.current.scope !== scope) context.current = { scope, epoch: context.current.epoch + 1 }
  const mounted = useRef(true)
  const busyEpoch = useRef<number | null>(null)
  const loadVersion = useRef(0)
  const historyVersion = useRef(0)
  const latestOverview = useRef(overview)
  latestOverview.current = overview
  const callbacks = useRef({ onRefresh, onError })
  callbacks.current = { onRefresh, onError }
  const [dataScope, setDataScope] = useState(scope)
  const [catalogue, setCatalogue] = useState<ConnectionInstitutionCatalogueDto | null>(null)
  const [lifecycles, setLifecycles] = useState<readonly ConnectionLifecycleDto[]>([])
  const [kind, setKind] = useState<ConnectionAccountKind>('current')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<{
    connectionId: string
    events: readonly ConnectionConsentEventDto[]
    loading: boolean
  } | null>(null)
  const connectionKey = overview.connections
    .filter((item) => item.providerId !== 'local-manual')
    .map((item) => `${item.id}:${item.status}:${item.lastSyncedAt}`)
    .join('|')
  const current = (epoch: number) => mounted.current && context.current.epoch === epoch
  const reload = async (epoch: number, extraIds: readonly string[] = []) => {
    const version = ++loadVersion.current
    const ids = [
      ...new Set([
        ...latestOverview.current.connections
          .filter((item) => item.providerId !== 'local-manual')
          .map((item) => item.id),
        ...extraIds,
      ]),
    ]
    const [institutions, states] = await Promise.all([
      api.institutions(),
      Promise.all(ids.map((id) => api.connectionLifecycle(id))),
    ])
    if (!current(epoch) || version !== loadVersion.current) return
    if (states.some((state) => state.profileId !== latestOverview.current.profile.id))
      throw new Error('Lo stato ricevuto non corrisponde al profilo corrente. Ricarica i dati.')
    setCatalogue(institutions)
    setLifecycles(states)
    setDataScope(context.current.scope)
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      loadVersion.current++
      historyVersion.current++
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reads are fenced by the explicit profile/session epoch and owned connection fingerprint; callback refs do not restart reads on every render.
  useEffect(() => {
    const epoch = context.current.epoch
    const handlers = callbacks.current
    if (dataScope !== scope) {
      setCatalogue(null)
      setLifecycles([])
      setHistory(null)
      setKind('current')
      setBusy(false)
      setError(null)
      setNotice(null)
      setDataScope(scope)
    }
    setLoading(true)
    let active = true
    reload(epoch)
      .catch((cause) => {
        if (!active || !current(epoch) || handlers.onError?.(cause)) return
        setError(
          cause instanceof Error ? cause.message : 'Non riesco a caricare i collegamenti. Riprova.',
        )
      })
      .finally(() => {
        if (active && current(epoch)) setLoading(false)
      })
    return () => {
      active = false
      loadVersion.current++
    }
  }, [api, scope, connectionKey])
  const run = async (
    action: () => Promise<readonly string[]> | Promise<void>,
    success: string | (() => string),
  ) => {
    const epoch = context.current.epoch
    if (busyEpoch.current === epoch) return
    busyEpoch.current = epoch
    const handlers = callbacks.current
    setBusy(true)
    setError(null)
    setNotice(null)
    setHistory(null)
    historyVersion.current++
    let saved = false
    try {
      const extraIds = await action()
      if (!current(epoch)) return
      saved = true
      await handlers.onRefresh()
      if (!current(epoch)) return
      await reload(epoch, extraIds ?? [])
      if (current(epoch)) setNotice(typeof success === 'function' ? success() : success)
    } catch (cause) {
      if (!current(epoch) || handlers.onError?.(cause)) return
      if (saved)
        setError(
          'La modifica è stata confermata, ma l’aggiornamento dei dati non è riuscito. Ricarica per vedere lo stato corrente.',
        )
      else if (cause instanceof ApiError && cause.status === 409) {
        try {
          await handlers.onRefresh()
          if (!current(epoch)) return
          await reload(epoch)
          if (current(epoch))
            setError(
              cause.code === 'consent_changed'
                ? 'Il collegamento è cambiato. Ho aggiornato i dati: controllali prima di scegliere di nuovo.'
                : cause.message,
            )
        } catch (refreshError) {
          if (!current(epoch) || handlers.onError?.(refreshError)) return
          setError(
            'Il collegamento richiede una verifica e non riesco ad aggiornare lo stato. Ricarica prima di continuare.',
          )
        }
      } else
        setError(
          cause instanceof Error
            ? cause.message
            : 'L’azione non è confermata. Controlla lo stato prima di riprovare.',
        )
    } finally {
      if (current(epoch)) {
        busyEpoch.current = null
        setBusy(false)
      }
    }
  }
  const showHistory = async (connectionId: string) => {
    const epoch = context.current.epoch
    const version = ++historyVersion.current
    const handlers = callbacks.current
    if (history?.connectionId === connectionId) {
      setHistory(null)
      return
    }
    setHistory({ connectionId, events: [], loading: true })
    setError(null)
    try {
      const events = await api.connectionConsentEvents(connectionId)
      if (!current(epoch) || version !== historyVersion.current) return
      if (
        events.some(
          (event) => event.profileId !== overview.profile.id || event.connectionId !== connectionId,
        )
      )
        throw new Error('Lo storico ricevuto non corrisponde al collegamento corrente.')
      setHistory({ connectionId, events, loading: false })
    } catch (cause) {
      if (!current(epoch) || version !== historyVersion.current || handlers.onError?.(cause)) return
      setHistory(null)
      setError(cause instanceof Error ? cause.message : 'Lo storico non è disponibile.')
    }
  }
  const button = (label: string, action: () => void, disabled = false, secondary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={action}
      style={[s.button, secondary && s.secondaryButton, (disabled || busy) && s.disabled]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryButtonText]}>{label}</Text>
    </Pressable>
  )
  if (dataScope !== scope)
    return (
      <View accessibilityLabel="Caricamento dei collegamenti del profilo corrente">
        <ActivityIndicator color={c.primary} />
      </View>
    )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.title}>
        Collegamenti
      </Text>
      <Text style={s.body}>
        Questa versione usa solo dati sintetici. Nessuna banca reale viene collegata. La fonte
        dimostrativa fornisce saldi e movimenti e non dispone pagamenti.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
        </Text>
      )}
      {loading && (
        <View style={s.inline}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.body}>Aggiornamento dello stato dei collegamenti…</Text>
        </View>
      )}
      <View style={s.card}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Disponibilità per tipo di conto
        </Text>
        <View style={s.row}>
          {(Object.keys(kindLabels) as ConnectionAccountKind[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              aria-checked={kind === value}
              aria-disabled={busy}
              accessibilityState={{ checked: kind === value, disabled: busy }}
              disabled={busy}
              onPress={() => setKind(value)}
              style={[s.choice, kind === value && s.selectedChoice]}
            >
              <Text style={s.body}>{kindLabels[value]}</Text>
            </Pressable>
          ))}
        </View>
        {catalogue?.institutions.map((institution) => {
          const permitted = canConnectFixture(catalogue, institution, kind)
          const linked = overview.connections.some(
            (connection) =>
              connection.institutionId === institution.id &&
              connection.providerId === institution.providerId &&
              connection.status !== 'revoked',
          )
          return (
            <View key={`${institution.providerId}:${institution.id}`} style={s.institution}>
              <Text style={s.subtitle}>{institution.name}</Text>
              <Text style={s.body}>
                {kindLabels[kind]} · {coverageLabel(institution, kind)}
              </Text>
              {permitted && (
                <Text style={s.body}>
                  Il collegamento include i conti della simulazione. L’elenco non indica banche
                  reali supportate.
                </Text>
              )}
              <View style={s.row}>
                {permitted ? (
                  button(
                    linked ? 'Fonte dimostrativa già collegata' : 'Collega la fonte dimostrativa',
                    () => {
                      void run(async () => {
                        const connection = await api.connectInstitution(institution.id, kind)
                        return [connection.id]
                      }, 'Fonte dimostrativa collegata. Controlla qui lo stato e l’ultima acquisizione.')
                    },
                    linked || loading,
                  )
                ) : (
                  <Text style={s.body}>Non ancora collegabile — aggiungi il saldo a mano.</Text>
                )}
                {button('Aggiungi il saldo a mano', onManualFallback, false, true)}
              </View>
            </View>
          )
        })}
        {!loading && catalogue !== null && !catalogue.institutions.length && (
          <Text style={s.body}>
            Nessuna copertura disponibile nella configurazione corrente. Puoi aggiungere un conto a
            mano.
          </Text>
        )}
        {!loading &&
          !catalogue?.institutions.length &&
          button('Usa un conto manuale', onManualFallback, false, true)}
      </View>
      {overview.connections
        .filter((connection) => connection.providerId !== 'local-manual')
        .map((connection) => {
          const lifecycle = lifecycles.find((item) => item.connectionId === connection.id)
          const institution = catalogue?.institutions.find(
            (item) =>
              item.id === connection.institutionId && item.providerId === connection.providerId,
          )
          const accounts = overview.accounts.filter(
            (account) => account.connectionId === connection.id,
          )
          const canSync = lifecycle?.state === 'active' || lifecycle?.state === 'expiring'
          const canPause = Boolean(
            lifecycle?.consentId && lifecycle.state !== 'revoked' && lifecycle.state !== 'unknown',
          )
          const canResume = Boolean(
            lifecycle?.paused &&
              lifecycle.state !== 'expired' &&
              lifecycle.authorization.state === 'active',
          )
          const canRenew = Boolean(
            lifecycle?.consentId &&
              lifecycle.state !== 'revoked' &&
              (lifecycle.providerMetadata?.renewal === 'supported' ||
                (lifecycle.source === 'legacy' && connection.providerId === 'mock-italian')),
          )
          return (
            <View key={connection.id} style={s.card}>
              <Text accessibilityRole="header" style={s.subtitle}>
                {institution?.name ?? 'Fonte dimostrativa'}
              </Text>
              <Text style={s.state}>
                {lifecycle ? stateLabels[lifecycle.state] : 'Stato non disponibile'}
              </Text>
              <Text style={s.body}>
                {accounts.length} conti inclusi
                {accounts.length ? `: ${accounts.map((account) => account.name).join(', ')}` : '.'}
              </Text>
              <Text style={s.body}>
                Ultima acquisizione:{' '}
                {formatInstant(
                  lifecycle?.lastSyncedAt ?? connection.lastSyncedAt,
                  overview.profile.timezone,
                )}
              </Text>
              {lifecycle && (
                <>
                  <Text style={s.body}>
                    Scadenza dell’autorizzazione:{' '}
                    {formatInstant(
                      lifecycle.authorization.consentExpiresAt,
                      overview.profile.timezone,
                    )}
                  </Text>
                  <Text style={s.body}>
                    Autenticazione richiesta dalla fonte:{' '}
                    {formatInstant(lifecycle.authorization.scaDueAt, overview.profile.timezone)}
                  </Text>
                  <Text style={s.body}>
                    Scadenza della sessione della fonte:{' '}
                    {formatInstant(
                      lifecycle.authorization.providerSessionExpiresAt,
                      overview.profile.timezone,
                    )}
                  </Text>
                  <Text style={s.body}>
                    Scadenza del token della fonte:{' '}
                    {formatInstant(
                      lifecycle.authorization.tokenExpiresAt,
                      overview.profile.timezone,
                    )}
                  </Text>
                  {lifecycle.source === 'legacy' && (
                    <Text style={s.body}>
                      Le date disponibili provengono dallo storico precedente; la fonte non ha
                      comunicato gli altri termini.
                    </Text>
                  )}
                  {lifecycle.paused && (
                    <Text style={s.body}>
                      La pausa interrompe gli aggiornamenti e conserva lo storico. L’autorizzazione
                      continua a seguire la sua scadenza.
                    </Text>
                  )}
                  {lifecycle.state === 'expired' && (
                    <Text style={s.body}>
                      I dati salvati restano visibili con la loro data. Rinnova l’autorizzazione
                      prima di aggiornare{lifecycle.paused ? ' o riprendere il collegamento' : ''}.
                    </Text>
                  )}
                  {lifecycle.state === 'revoked' && (
                    <Text style={s.body}>
                      Gli aggiornamenti sono interrotti. Lo storico resta disponibile; una nuova
                      autorizzazione richiede un’altra scelta esplicita.
                    </Text>
                  )}
                </>
              )}
              <View style={s.row}>
                {button(
                  'Aggiorna questa fonte',
                  () => {
                    let result: Awaited<ReturnType<ConnectionClient['sync']>> | undefined
                    void run(
                      async () => {
                        result = await api.sync(connection.id)
                      },
                      () =>
                        result
                          ? `${result.rejected ? 'Aggiornamento parziale' : 'Aggiornamento completato'}: ${result.inserted} nuovi, ${result.updated} aggiornati, ${result.unchanged} invariati${result.rejected ? `; ${result.rejected} non acquisiti` : ''}. L’orario mostra l’ultima acquisizione.`
                          : 'Controlla lo stato corrente della fonte.',
                    )
                  },
                  !canSync || loading,
                )}
                {lifecycle?.paused
                  ? button(
                      'Riprendi il collegamento',
                      () => {
                        void run(async () => {
                          await api.resumeConnection(connection.id, lifecycle.revision)
                        }, 'Collegamento ripreso. Puoi scegliere Aggiorna questa fonte.')
                      },
                      !canResume || loading,
                      true,
                    )
                  : button(
                      'Metti in pausa',
                      () => {
                        if (lifecycle)
                          void run(async () => {
                            await api.pauseConnection(connection.id, lifecycle.revision)
                          }, 'Collegamento in pausa. Lo storico e la scadenza sono conservati.')
                      },
                      !canPause || loading,
                      true,
                    )}
                {button(
                  'Rinnova autorizzazione dimostrativa',
                  () => {
                    if (lifecycle)
                      void run(async () => {
                        await api.renewConnection(connection.id, lifecycle.revision)
                      }, 'Rinnovo confermato dalla fonte dimostrativa. Controlla la scadenza comunicata qui sopra.')
                  },
                  !canRenew || loading,
                  true,
                )}
                {button(
                  history?.connectionId === connection.id
                    ? 'Chiudi storico autorizzazione'
                    : 'Storico autorizzazione',
                  () => {
                    void showHistory(connection.id)
                  },
                  loading,
                  true,
                )}
              </View>
              {history?.connectionId === connection.id && (
                <View style={s.history}>
                  {history.loading ? (
                    <ActivityIndicator color={c.primary} />
                  ) : history.events.length ? (
                    history.events.map((event) => (
                      <View key={event.id} style={s.historyItem}>
                        <Text style={s.body}>{eventLabels[event.action]}</Text>
                        <Text style={s.small}>
                          {formatInstant(event.occurredAt, overview.profile.timezone)} ·{' '}
                          {event.source === 'legacy'
                            ? 'Evento ricostruito dallo storico'
                            : event.source === 'user'
                              ? 'Scelta tua'
                              : 'Informazione della fonte'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={s.body}>
                      Nessun evento registrato. Lo stato precedente resta distinto da una nuova
                      autorizzazione.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )
        })}
      {!loading &&
        !overview.connections.some((connection) => connection.providerId !== 'local-manual') && (
          <Text style={s.body}>
            Non hai collegamenti. Puoi usare la fonte dimostrativa o aggiungere un saldo a mano.
          </Text>
        )}
      <View style={s.row}>
        {button(
          'Ricarica stato e disponibilità',
          () => {
            void run(async () => undefined, 'Stato e disponibilità aggiornati.')
          },
          false,
          true,
        )}
      </View>
    </View>
  )
}

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
      lineHeight: 30,
      fontWeight: '600',
    },
    subtitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '600',
    },
    body: {
      color: c.textSecondary,
      fontFamily: tokens.typography.fontUI,
      fontSize: 15,
      lineHeight: 23,
      flexShrink: 1,
    },
    small: {
      color: c.textSecondary,
      fontFamily: tokens.typography.fontUI,
      fontSize: 13,
      lineHeight: 20,
    },
    state: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '600',
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    inline: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    button: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 1,
    },
    buttonText: {
      fontFamily: 'GeistSemibold',
      color: c.onPrimary,
      fontWeight: '600',
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    secondaryButton: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    secondaryButtonText: { color: c.textPrimary },
    disabled: { opacity: 0.5 },
    choice: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      justifyContent: 'center',
    },
    selectedChoice: { borderColor: c.primary, backgroundColor: c.primarySoft },
    institution: { gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
    history: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
    historyItem: { gap: 2 },
    error: { color: c.danger, fontFamily: tokens.typography.fontUI, fontSize: 15, lineHeight: 23 },
    notice: {
      color: c.success,
      fontFamily: tokens.typography.fontUI,
      fontSize: 15,
      lineHeight: 23,
    },
  })
