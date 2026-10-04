import {
  type ApiClient,
  ApiError,
  type ConnectionAccountKind,
  type ConnectionConsentEventDto,
  type ConnectionInstitutionCatalogueDto,
  type ConnectionInstitutionDto,
  type ConnectionLifecycleDto,
  type DemoOverview,
  type SyncJobDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { FinanceVisual } from './src/FinanceVisual'
import type { CONNECTION_MESSAGE_PAIRS } from './src/i18n/connection-messages'
import { useI18n } from './src/i18n/context'

type ConnectionMessageKey = keyof typeof CONNECTION_MESSAGE_PAIRS

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
  | 'startSync'
  | 'resumeSync'
  | 'syncJob'
  | 'connectionSyncJobs'
  | 'disconnect'
>
export interface ConnectionsPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly api: ConnectionClient
  /** Identity epoch from the parent; session renewal/logout invalidates old responses too. */
  readonly resetKey: number | string
  readonly onRefresh: () => Promise<void>
  readonly onManualFallback: () => void
  readonly onRecoverHistory?: (accountId: string) => void
  readonly onError?: (cause: unknown) => boolean
}
const kindLabels: Readonly<Record<ConnectionAccountKind, ConnectionMessageKey>> = {
  current: 'connections.kind.current',
  savings: 'connections.kind.savings',
  card: 'connections.kind.card',
  cash: 'connections.kind.cash',
}
const stateLabels: Readonly<Record<ConnectionLifecycleDto['state'], ConnectionMessageKey>> = {
  active: 'connections.state.active',
  expiring: 'connections.state.expiring',
  expired: 'connections.state.expired',
  revoked: 'connections.state.revoked',
  error: 'connections.state.error',
  paused: 'connections.state.paused',
  unknown: 'connections.state.unknown',
}
const eventLabels: Readonly<Record<ConnectionConsentEventDto['action'], ConnectionMessageKey>> = {
  granted: 'connections.event.granted',
  renewed: 'connections.event.renewed',
  paused: 'connections.event.paused',
  resumed: 'connections.event.resumed',
  revoked: 'connections.event.revoked',
  provider_error: 'connections.event.provider_error',
  provider_recovered: 'connections.event.provider_recovered',
  legacy_imported: 'connections.event.legacy_imported',
}

function coverageLabel(
  institution: ConnectionInstitutionDto,
  kind: ConnectionAccountKind,
): ConnectionMessageKey {
  const coverage = institution.accountTypes.find((item) => item.kind === kind)
  if (!coverage || coverage.availability === 'unknown' || coverage.evidence.status === 'unknown')
    return 'connections.coverage.unknown'
  if (coverage.availability === 'unavailable') return 'connections.coverage.unavailable'
  if (coverage.evidence.status === 'synthetic') return 'connections.coverage.synthetic'
  if (coverage.evidence.status === 'unverified') return 'connections.coverage.unverified'
  return coverage.evidence.environment === 'sandbox'
    ? 'connections.coverage.sandbox'
    : 'connections.coverage.verified'
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
  onRecoverHistory,
  onError,
}: ConnectionsPanelProps) {
  const i18n = useI18n(),
    { t } = i18n
  const formatInstant = (value: string | null, timezone: string) =>
    value && Number.isFinite(Date.parse(value))
      ? i18n.instant(value, timezone)
      : t('connections.dateUnknown')
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
  const [jobs, setJobs] = useState<Readonly<Record<string, readonly SyncJobDto[]>>>({})
  const startRequests = useRef({ epoch: context.current.epoch, ids: new Map<string, string>() })
  if (startRequests.current.epoch !== context.current.epoch)
    startRequests.current = { epoch: context.current.epoch, ids: new Map() }
  const [catalogue, setCatalogue] = useState<ConnectionInstitutionCatalogueDto | null>(null)
  const [lifecycles, setLifecycles] = useState<readonly ConnectionLifecycleDto[]>([])
  const [kind, setKind] = useState<ConnectionAccountKind>('current')
  const emptyFixtures = 'fixtureMode' in overview && overview.fixtureMode === 'empty'
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [disconnectChoice, setDisconnectChoice] = useState<{
    connectionId: string
    data: 'retain' | 'erase'
    acknowledged: boolean
  } | null>(null)
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
    const [institutions, states, jobGroups] = await Promise.all([
      api.institutions(),
      Promise.all(ids.map((id) => api.connectionLifecycle(id))),
      Promise.all(ids.map(async (id) => ({ id, jobs: await api.connectionSyncJobs(id) }))),
    ])
    if (!current(epoch) || version !== loadVersion.current) return
    if (states.some((state) => state.profileId !== latestOverview.current.profile.id))
      throw new Error('Lo stato ricevuto non corrisponde al profilo corrente. Ricarica i dati.')
    if (
      jobGroups.some((group) =>
        group.jobs.some(
          (job) =>
            job.profileId !== latestOverview.current.profile.id || job.connectionId !== group.id,
        ),
      )
    )
      throw new Error('Invalid owned sync job response')
    setJobs(Object.fromEntries(jobGroups.map((group) => [group.id, group.jobs])))
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
      setJobs({})
      setDisconnectChoice(null)
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
        setError(i18n.problemMessage(cause))
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
      if (saved) setError(t('connections.savedRefreshFailed'))
      else if (cause instanceof ApiError && cause.status === 409) {
        try {
          await handlers.onRefresh()
          if (!current(epoch)) return
          await reload(epoch)
          if (current(epoch))
            setError(
              cause.code === 'consent_changed'
                ? t('connections.changed')
                : i18n.problemMessage(cause),
            )
        } catch (refreshError) {
          if (!current(epoch) || handlers.onError?.(refreshError)) return
          setError(t('connections.refreshFailed'))
        }
      } else setError(i18n.problemMessage(cause))
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
      setError(i18n.problemMessage(cause))
    }
  }
  const rememberJob = (job: SyncJobDto) => {
    if (
      job.profileId !== latestOverview.current.profile.id ||
      !latestOverview.current.connections.some((connection) => connection.id === job.connectionId)
    )
      throw new Error('Invalid owned sync job response')
    setJobs((previous) => ({
      ...previous,
      [job.connectionId]: [
        job,
        ...(previous[job.connectionId] ?? []).filter((existing) => existing.id !== job.id),
      ],
    }))
  }
  const runSync = async (connectionId: string, jobId?: string) => {
    const epoch = context.current.epoch
    if (busyEpoch.current === epoch) return
    busyEpoch.current = epoch
    setBusy(true)
    setError(null)
    setNotice(null)
    const handlers = callbacks.current
    let completed = false
    try {
      let result: SyncJobDto
      if (jobId) result = await api.resumeSync(jobId)
      else {
        let requestId = startRequests.current.ids.get(connectionId)
        if (!requestId) {
          requestId =
            globalThis.crypto?.randomUUID?.() ??
            `connection_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
          startRequests.current.ids.set(connectionId, requestId)
        }
        result = await api.startSync({ connectionId, requestId, mode: 'user_present' })
        if (!current(epoch)) return
        rememberJob(result)
        startRequests.current.ids.delete(connectionId)
        if (result.state === 'queued') result = await api.resumeSync(result.id)
      }
      if (!current(epoch)) return
      rememberJob(result)
      if (result.state === 'completed') {
        completed = true
        await handlers.onRefresh()
        if (!current(epoch)) return
        await reload(epoch)
      }
    } catch (cause) {
      if (!current(epoch) || handlers.onError?.(cause)) return
      setError(completed ? t('connections.savedRefreshFailed') : i18n.problemMessage(cause))
      if (cause instanceof ApiError && cause.status === 409) {
        try {
          await reload(epoch)
        } catch (refreshError) {
          if (current(epoch) && !handlers.onError?.(refreshError))
            setError(i18n.problemMessage(refreshError))
        }
      }
    } finally {
      if (current(epoch)) {
        busyEpoch.current = null
        setBusy(false)
      }
    }
  }
  const checkJobs = async (connectionId: string) => {
    const epoch = context.current.epoch
    if (busyEpoch.current === epoch) return
    busyEpoch.current = epoch
    setBusy(true)
    setError(null)
    const handlers = callbacks.current
    try {
      const fresh = await api.connectionSyncJobs(connectionId)
      if (!current(epoch)) return
      if (
        fresh.some(
          (job) =>
            job.profileId !== latestOverview.current.profile.id ||
            job.connectionId !== connectionId,
        )
      )
        throw new Error('Invalid owned sync job response')
      setJobs((previous) => ({ ...previous, [connectionId]: fresh }))
      const latestCompleted = fresh.find((job) => job.state === 'completed')
      if (
        latestCompleted &&
        (latestCompleted.report.syncedAt !==
          latestOverview.current.connections.find((connection) => connection.id === connectionId)
            ?.lastSyncedAt ||
          !jobs[connectionId]?.some(
            (prior) => prior.id === latestCompleted.id && prior.state === 'completed',
          ))
      ) {
        await handlers.onRefresh()
        if (current(epoch)) await reload(epoch)
      }
    } catch (cause) {
      if (current(epoch) && !handlers.onError?.(cause)) setError(i18n.problemMessage(cause))
    } finally {
      if (current(epoch)) {
        busyEpoch.current = null
        setBusy(false)
      }
    }
  }
  const button = (label: string, action: () => void, disabled = false, secondary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      aria-disabled={disabled || busy}
      disabled={disabled || busy}
      onPress={action}
      style={[s.button, secondary && s.secondaryButton, (disabled || busy) && s.disabled]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryButtonText]}>{label}</Text>
    </Pressable>
  )
  if (dataScope !== scope)
    return (
      <View accessibilityLabel={t('connections.loadingProfile')}>
        <ActivityIndicator color={c.primary} />
      </View>
    )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {t('connections.title')}
      </Text>
      <Text style={s.body}>
        {t(emptyFixtures ? 'connections.setupHelp' : 'connections.syntheticDisclosure')}
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
          <Text style={s.body}>{t('connections.loading')}</Text>
        </View>
      )}
      {emptyFixtures ? (
        <View style={s.card}>
          <FinanceVisual kind="bank" size={80} mode={theme} />
          <Text style={s.subtitle}>{t('connections.setupTitle')}</Text>
          {(
            [
              ['connections.setupIdentity', 'connections.setupPending'],
              ['connections.setupProvider', 'connections.setupPending'],
              ['connections.setupConsent', 'connections.setupWaiting'],
            ] as const
          ).map(([label, state], index) => (
            <View key={label} style={s.inline}>
              <Text style={s.body}>
                {index + 1}. {t(label)}
              </Text>
              <Text style={s.body}>· {t(state)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
            {t('connections.availableKinds')}
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
                <Text style={s.body}>{t(kindLabels[value])}</Text>
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
                  {t(kindLabels[kind])} · {t(coverageLabel(institution, kind))}
                </Text>
                {permitted && <Text style={s.body}>{t('connections.syntheticKinds')}</Text>}
                <View style={s.row}>
                  {permitted ? (
                    button(
                      linked ? t('connections.linked') : t('connections.connect'),
                      () => {
                        void run(async () => {
                          const connection = await api.connectInstitution(institution.id, kind)
                          return [connection.id]
                        }, t('connections.connected'))
                      },
                      linked || loading,
                    )
                  ) : (
                    <Text style={s.body}>{t('connections.manualUnavailable')}</Text>
                  )}
                  {button(t('connections.manual'), onManualFallback, false, true)}
                </View>
              </View>
            )
          })}
          {!loading && catalogue !== null && !catalogue.institutions.length && (
            <Text style={s.body}>{t('connections.noCoverage')}</Text>
          )}
          {!loading &&
            !catalogue?.institutions.length &&
            button(t('connections.useManual'), onManualFallback, false, true)}
        </View>
      )}
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
          const sourceJobs = jobs[connection.id] ?? []
          const activeJob = sourceJobs.find((job) =>
            ['queued', 'running', 'partial', 'retry_wait'].includes(job.state),
          )
          const canContinue =
            activeJob?.mode === 'user_present' &&
            Date.parse(activeJob.availableAt) <= Date.now() &&
            (activeJob.state !== 'running' ||
              !activeJob.leaseExpiresAt ||
              Date.parse(activeJob.leaseExpiresAt) <= Date.now())
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
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {institution?.name ?? t('connections.source')}
              </Text>
              <Text style={s.state}>
                {lifecycle ? t(stateLabels[lifecycle.state]) : t('connections.state.unavailable')}
              </Text>
              <Text style={s.body}>
                {t('connections.accounts', {
                  count: accounts.length,
                  names: accounts.length
                    ? `: ${accounts.map((account) => account.name).join(', ')}`
                    : '.',
                })}
              </Text>
              <Text style={s.body}>
                {t('connections.lastAcquisition', {
                  date: formatInstant(
                    lifecycle?.lastSyncedAt ?? connection.lastSyncedAt,
                    overview.profile.timezone,
                  ),
                })}
              </Text>
              {lifecycle && (
                <>
                  <Text style={s.body}>
                    {t('connections.consentExpiry', {
                      date: formatInstant(
                        lifecycle.authorization.consentExpiresAt,
                        overview.profile.timezone,
                      ),
                    })}
                  </Text>
                  <Text style={s.body}>
                    {t('connections.scaDue', {
                      date: formatInstant(
                        lifecycle.authorization.scaDueAt,
                        overview.profile.timezone,
                      ),
                    })}
                  </Text>
                  <Text style={s.body}>
                    {t('connections.sessionExpiry', {
                      date: formatInstant(
                        lifecycle.authorization.providerSessionExpiresAt,
                        overview.profile.timezone,
                      ),
                    })}
                  </Text>
                  <Text style={s.body}>
                    {t('connections.tokenExpiry', {
                      date: formatInstant(
                        lifecycle.authorization.tokenExpiresAt,
                        overview.profile.timezone,
                      ),
                    })}
                  </Text>
                  {lifecycle.historyRecovery && lifecycle.historyRecovery.status !== 'covered' && (
                    <View style={s.institution}>
                      <Text style={s.body}>
                        {t('connections.historyInterruption', {
                          from: formatInstant(
                            lifecycle.historyRecovery.interruptedAt,
                            overview.profile.timezone,
                          ),
                          to: formatInstant(
                            lifecycle.historyRecovery.renewedAt,
                            overview.profile.timezone,
                          ),
                        })}
                      </Text>
                      {lifecycle.historyRecovery.status === 'unverified' ? (
                        <Text style={s.body}>{t('connections.historyUnverified')}</Text>
                      ) : (
                        lifecycle.historyRecovery.intervals.map((interval) => (
                          <Text key={`${interval.from}:${interval.to}`} style={s.body}>
                            {t('connections.historyBankGap', {
                              from: i18n.calendarDate(interval.from),
                              to: i18n.calendarDate(interval.to),
                            })}
                          </Text>
                        ))
                      )}
                      {onRecoverHistory &&
                        accounts.map((account) => (
                          <View key={account.id}>
                            {button(
                              t('connections.recoverImport', { name: account.name }),
                              () => onRecoverHistory(account.id),
                              false,
                              true,
                            )}
                          </View>
                        ))}
                    </View>
                  )}
                  {lifecycle.source === 'legacy' && (
                    <Text style={s.body}>{t('connections.legacyDates')}</Text>
                  )}
                  {lifecycle.paused && <Text style={s.body}>{t('connections.pausedHelp')}</Text>}
                  {lifecycle.state === 'expired' && (
                    <Text style={s.body}>
                      {t('connections.expiredHelp', {
                        resume: lifecycle.paused ? t('connections.orResume') : '',
                      })}
                    </Text>
                  )}
                  {lifecycle.state === 'revoked' && (
                    <Text style={s.body}>{t('connections.revokedHelp')}</Text>
                  )}
                </>
              )}
              <View style={s.row}>
                {button(
                  t('connections.update'),
                  () => {
                    void runSync(connection.id)
                  },
                  !canSync || loading || Boolean(activeJob),
                )}
                {activeJob &&
                  activeJob.mode === 'user_present' &&
                  button(
                    t('connections.syncContinue'),
                    () => {
                      void runSync(connection.id, activeJob.id)
                    },
                    !canSync || loading || !canContinue,
                    true,
                  )}
                {button(
                  t('connections.syncCheck'),
                  () => {
                    void checkJobs(connection.id)
                  },
                  loading,
                  true,
                )}
                {lifecycle?.paused
                  ? button(
                      t('connections.resume'),
                      () => {
                        void run(async () => {
                          await api.resumeConnection(connection.id, lifecycle.revision)
                        }, t('connections.resumed'))
                      },
                      !canResume || loading,
                      true,
                    )
                  : button(
                      t('connections.pause'),
                      () => {
                        if (lifecycle)
                          void run(async () => {
                            await api.pauseConnection(connection.id, lifecycle.revision)
                          }, t('connections.paused'))
                      },
                      !canPause || loading,
                      true,
                    )}
                {button(
                  t('connections.renew'),
                  () => {
                    if (lifecycle)
                      void run(async () => {
                        await api.renewConnection(connection.id, lifecycle.revision)
                      }, t('connections.renewed'))
                  },
                  !canRenew || loading,
                  true,
                )}
                {button(
                  history?.connectionId === connection.id
                    ? t('connections.closeHistory')
                    : t('connections.history'),
                  () => {
                    void showHistory(connection.id)
                  },
                  loading,
                  true,
                )}
                {button(
                  t('connections.disconnectChoice'),
                  () => {
                    setDisconnectChoice({
                      connectionId: connection.id,
                      data: 'retain',
                      acknowledged: false,
                    })
                    setError(null)
                    setNotice(null)
                  },
                  loading,
                  true,
                )}
              </View>
              {disconnectChoice?.connectionId === connection.id && (
                <View style={s.history}>
                  <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                    {t('connections.disconnectQuestion')}
                  </Text>
                  <Text style={s.body}>{t('connections.disconnectMandate')}</Text>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={t('connections.dataChoiceLabel')}
                    style={s.row}
                  >
                    {(['retain', 'erase'] as const).map((data) => {
                      const label = t(
                        data === 'retain' ? 'connections.retainChoice' : 'connections.eraseChoice',
                      )
                      return (
                        <Pressable
                          key={data}
                          accessibilityRole="radio"
                          accessibilityLabel={label}
                          accessibilityState={{
                            checked: disconnectChoice.data === data,
                            disabled: busy,
                          }}
                          aria-checked={disconnectChoice.data === data}
                          aria-disabled={busy}
                          disabled={busy}
                          onPress={() =>
                            setDisconnectChoice({
                              connectionId: connection.id,
                              data,
                              acknowledged: false,
                            })
                          }
                          style={[
                            s.choice,
                            disconnectChoice.data === data && s.selectedChoice,
                            busy && s.disabled,
                          ]}
                        >
                          <Text style={s.body}>{label}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                  <Text style={s.body}>
                    {t(
                      disconnectChoice.data === 'retain'
                        ? 'connections.retainExplanation'
                        : 'connections.eraseExplanation',
                    )}
                  </Text>
                  {disconnectChoice.data === 'erase' && (
                    <>
                      <Text style={s.body}>{t('connections.sharedKeyDisclosure')}</Text>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={t('connections.eraseAcknowledgement')}
                        accessibilityState={{
                          checked: disconnectChoice.acknowledged,
                          disabled: busy,
                        }}
                        aria-checked={disconnectChoice.acknowledged}
                        aria-disabled={busy}
                        disabled={busy}
                        onPress={() =>
                          setDisconnectChoice({
                            ...disconnectChoice,
                            acknowledged: !disconnectChoice.acknowledged,
                          })
                        }
                        style={[
                          s.choice,
                          disconnectChoice.acknowledged && s.selectedChoice,
                          busy && s.disabled,
                        ]}
                      >
                        <Text style={s.body}>{t('connections.eraseAcknowledgement')}</Text>
                      </Pressable>
                    </>
                  )}
                  <View style={s.row}>
                    {button(
                      t(
                        disconnectChoice.data === 'erase'
                          ? 'connections.confirmErase'
                          : 'connections.confirmRetain',
                      ),
                      () => {
                        const data = disconnectChoice.data,
                          epoch = context.current.epoch
                        void run(
                          async () => {
                            await api.disconnect(connection.id, data)
                            if (current(epoch)) setDisconnectChoice(null)
                          },
                          t(data === 'erase' ? 'connections.erased' : 'connections.disconnected'),
                        )
                      },
                      disconnectChoice.data === 'erase' && !disconnectChoice.acknowledged,
                    )}
                    {button(
                      t('connections.cancelDisconnect'),
                      () => setDisconnectChoice(null),
                      false,
                      true,
                    )}
                  </View>
                </View>
              )}
              <View style={s.history}>
                <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                  {t('connections.syncHistory')}
                </Text>
                {!sourceJobs.length && <Text style={s.body}>{t('connections.syncNone')}</Text>}
                {sourceJobs.slice(0, 10).map((job) => (
                  <View key={job.id} style={s.historyItem}>
                    <Text style={s.state}>{t(`connections.job.${job.state}`)}</Text>
                    <Text style={s.small}>
                      {formatInstant(job.updatedAt, overview.profile.timezone)}
                    </Text>
                    <Text style={s.body}>
                      {t('connections.syncProgress', {
                        pages: job.report.pages,
                        done: job.report.windowsCompleted,
                        total: job.report.windowsTotal,
                      })}
                    </Text>
                    {job.reason && (
                      <Text style={s.body}>{t(`connections.reason.${job.reason}`)}</Text>
                    )}
                    {job.state !== 'completed' && (
                      <Text style={s.body}>{t('connections.syncFinancialUnchanged')}</Text>
                    )}
                    {job.state === 'retry_wait' && (
                      <Text style={s.body}>
                        {t('connections.syncRetryAt', {
                          date: formatInstant(job.availableAt, overview.profile.timezone),
                        })}
                      </Text>
                    )}
                    {job.mode === 'unattended' &&
                      ['queued', 'running', 'partial', 'retry_wait'].includes(job.state) && (
                        <Text style={s.body}>{t('connections.syncAutomatic')}</Text>
                      )}
                    {job.state === 'completed' && (
                      <>
                        <Text style={s.body}>
                          {t('connections.syncCompleted', {
                            inserted: job.report.inserted,
                            updated: job.report.updated,
                            unchanged: job.report.unchanged,
                            rejected: job.report.rejected,
                          })}
                        </Text>
                        <Text style={s.body}>
                          {t(
                            job.report.coverage === 'complete_requested_interval'
                              ? 'connections.syncCoverageComplete'
                              : 'connections.syncCoverageUnknown',
                          )}
                        </Text>
                        {job.report.pendingUnresolved > 0 && (
                          <Text style={s.body}>
                            {t('connections.syncPendingUnknown', {
                              count: job.report.pendingUnresolved,
                            })}
                          </Text>
                        )}
                        {job.report.removedBySource > 0 && (
                          <Text style={s.body}>
                            {t('connections.syncSourceRemoval', {
                              count: job.report.removedBySource,
                            })}
                          </Text>
                        )}
                        {job.report.balances.map((balance) => (
                          <View key={balance.accountId} style={s.historyItem}>
                            <Text style={s.body}>
                              {overview.accounts.find((account) => account.id === balance.accountId)
                                ?.name ?? t('connections.source')}
                            </Text>
                            <Text style={s.small}>
                              {i18n.money({
                                amountMinor: BigInt(balance.providerAmountMinor),
                                currency: balance.currency,
                              })}
                            </Text>
                            <Text style={s.body}>
                              {t(
                                balance.result === 'equal'
                                  ? 'connections.syncBalanceEqual'
                                  : balance.result === 'mismatch'
                                    ? 'connections.syncBalanceMismatch'
                                    : 'connections.syncBalanceUnknown',
                              )}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                ))}
              </View>
              {history?.connectionId === connection.id && (
                <View style={s.history}>
                  {history.loading ? (
                    <ActivityIndicator color={c.primary} />
                  ) : history.events.length ? (
                    history.events.map((event) => (
                      <View key={event.id} style={s.historyItem}>
                        <Text style={s.body}>{t(eventLabels[event.action])}</Text>
                        <Text style={s.small}>
                          {formatInstant(event.occurredAt, overview.profile.timezone)} ·{' '}
                          {event.source === 'legacy'
                            ? t('connections.eventLegacy')
                            : event.source === 'user'
                              ? t('connections.eventUser')
                              : t('connections.eventProvider')}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={s.body}>{t('connections.noEvents')}</Text>
                  )}
                </View>
              )}
            </View>
          )
        })}
      {!loading &&
        !overview.connections.some((connection) => connection.providerId !== 'local-manual') && (
          <Text style={s.body}>{t('connections.noConnections')}</Text>
        )}
      <View style={s.row}>
        {button(
          t('connections.reloadAvailability'),
          () => {
            void run(async () => undefined, t('connections.availabilityUpdated'))
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
