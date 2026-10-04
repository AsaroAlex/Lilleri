import {
  ApiError,
  createApiClient,
  createSettingsClient,
  type DemoOverview,
  type MoneyDto,
  type TransactionDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import {
  addDays,
  CATEGORIES,
  type CategoryId,
  calendarDateAt,
  PROFILE_LOCALE,
  type ProfileLocale,
  type ProfileSettings,
} from '@lilleri/domain'
import { fromJson } from '@lilleri/money'
import { useFonts } from 'expo-font'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import { ConnectionsPanel } from './ConnectionsPanel'
import { ImportManualPanel } from './ImportManualPanel'
import { MappedImportPanel } from './MappedImportPanel'
import { MerchantPanel } from './MerchantPanel'
import { PrivacyControlsPanel } from './PrivacyControlsPanel'
import { RecurringPanel } from './RecurringPanel'
import {
  AccessibleDialog,
  AccessibleStatus,
  WebAccessibilityStyles,
} from './src/accessibility/AccessibilityPrimitives'
import { focusWebElement } from './src/accessibility/web-focus'
import { HomeQuickActions } from './src/HomeQuickActions'
import type { MessageKey } from './src/i18n'
import { I18nProvider, useI18n } from './src/i18n/context'
import type { LocalIdentitySession } from './src/identity-client'
import { EMPTY_LEDGER_FILTERS, LedgerSearchFilters } from './src/LedgerSearchFilters'
import { LocalIdentityPanel } from './src/LocalIdentityPanel'
import { NotificationsPanel } from './src/NotificationsPanel'
import {
  createWebOfflineCache,
  OFFLINE_CACHE_LIMITS,
  type OfflineDiscardReason,
} from './src/offline'
import { matchesVerifiedOverview, offlineGatedApi } from './src/offline-api'
import { RulesPanel } from './src/RulesPanel'
import { SettingsPanel } from './src/SettingsPanel'
import { SourceDecisionsPanel } from './src/SourceDecisionsPanel'
import { useLedgerSearch } from './src/useLedgerSearch'
import { UnderstandingPanel } from './UnderstandingPanel'

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string
    EXPO_PUBLIC_LOCAL_AUTH_MODE?: string
    EXPO_PUBLIC_HOSTED_AUTH_MODE?: string
    EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION?: string
    EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL?: string
  }
}
const hostedIdentityMode = process.env.EXPO_PUBLIC_HOSTED_AUTH_MODE === '1'
if (hostedIdentityMode && process.env.EXPO_PUBLIC_LOCAL_AUTH_MODE === '1')
  throw new Error('Select either local or hosted browser identity')
const identityMode = hostedIdentityMode || process.env.EXPO_PUBLIC_LOCAL_AUTH_MODE === '1'
const hostedIdentity = hostedIdentityMode
  ? {
      termsVersion: process.env.EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION ?? '',
      termsUrl: process.env.EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL ?? '',
    }
  : undefined
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (hostedIdentityMode && typeof window !== 'undefined' ? window.location.origin : undefined) ??
  (identityMode ? 'http://localhost:3001' : 'http://127.0.0.1:3001')
const onlineApi = createApiClient(apiBaseUrl)
const tabs = ['Home', 'Movimenti', 'Da controllare', 'Ricorrenti', 'Privacy'] as const
type Tab = (typeof tabs)[number]
type ThemeColors = typeof colors.light | typeof colors.dark
type Scope = 'once' | 'merchant'
const tabMessages: Record<Tab, MessageKey> = {
  Home: 'nav.home',
  Movimenti: 'nav.transactions',
  'Da controllare': 'nav.review',
  Ricorrenti: 'nav.recurring',
  Privacy: 'nav.privacy',
}
const manageMessages = {
  rules: 'app.rules',
  import: 'app.import',
  'mapped-import': 'app.mappedImport',
  connections: 'app.connections',
  understanding: 'app.understanding',
  notifications: 'app.notifications',
  merchants: 'merchant.title',
} as const satisfies Record<string, MessageKey>
type DisplayPreferences = { readonly locale: ProfileLocale; readonly timezone: string }
const defaultDisplayPreferences: DisplayPreferences = {
  locale: PROFILE_LOCALE,
  timezone: 'Europe/Rome',
}
export default function App() {
  const [displayPreferences, setDisplayPreferences] =
    useState<DisplayPreferences>(defaultDisplayPreferences)
  return (
    <I18nProvider {...displayPreferences}>
      <AppSurface onDisplayPreferences={setDisplayPreferences} />
    </I18nProvider>
  )
}
function AppSurface({
  onDisplayPreferences,
}: {
  readonly onDisplayPreferences: (preferences: DisplayPreferences) => void
}) {
  const i18n = useI18n()
  const language = useRef(i18n)
  language.current = i18n
  const t = i18n.t
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined')
      document.documentElement.lang = i18n.locale
  }, [i18n.locale])
  const date = i18n.calendarDate
  const name = (transaction: TransactionDto) =>
    transaction.merchantName?.trim() ||
    transaction.description.trim() ||
    t('common.descriptionUnknown')
  const humanEvidence = (value: string, _explanation: string, merchant?: string) =>
    i18n.evidenceMessage(value, merchant)
  const amount = (value: MoneyDto, signed = false) =>
    i18n.money(fromJson(value), { symbolPosition: 'before', sign: signed ? 'exceptZero' : 'auto' })
  const accessibleAmount = (value: MoneyDto) => i18n.accessibleMoney(fromJson(value))
  const statusLabels = {
    pending: t('ledger.pending'),
    booked: t('ledger.booked'),
    reversed: t('ledger.reversed'),
  }
  const matchLabels = {
    pending_to_booked: t('app.match.pending'),
    duplicate: t('app.match.duplicate'),
    internal_transfer: t('app.match.transfer'),
    card_settlement: t('app.match.card'),
    refund: t('app.match.refund'),
    cash_transfer: t('app.match.cash'),
  }
  const matchStates = {
    suggested: t('app.match.suggested'),
    confirmed: t('app.match.confirmed'),
    rejected: t('app.match.rejected'),
    undone: t('app.match.undone'),
  }

  const systemTheme = useColorScheme()
  const [themeChoice, setThemeChoice] = useState<BrandTheme | null>(null)
  const theme = themeChoice ?? (systemTheme === 'dark' ? 'dark' : 'light')
  const c = colors[theme]
  const s = useMemo(() => styles(c), [c])
  const wide = useWindowDimensions().width >= 960
  const [fontsLoaded, fontError] = useFonts({
    Geist: require('../../packages/brand/fonts/Geist-Regular.ttf'),
    GeistMedium: require('../../packages/brand/fonts/Geist-Medium.ttf'),
    GeistSemibold: require('../../packages/brand/fonts/Geist-Semibold.ttf'),
    Newsreader: require('../../packages/brand/fonts/Newsreader-Variable.ttf'),
  })
  const [tab, setTab] = useState<Tab>('Home')
  const [data, setData] = useState<DemoOverview | null>(null)
  const datetime = (value: string | null | undefined) =>
    value ? i18n.instant(value) : t('app.notUpdated')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [retrievedAt, setRetrievedAt] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [ledgerFilters, setLedgerFilters] = useState(EMPTY_LEDGER_FILTERS)
  const [manage, setManage] = useState<
    | 'rules'
    | 'import'
    | 'mapped-import'
    | 'connections'
    | 'understanding'
    | 'notifications'
    | 'merchants'
    | null
  >(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'review'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [recoveryAccount, setRecoveryAccount] = useState<{
    readonly profileId: string
    readonly epoch: number
    readonly accountId: string
  } | null>(null)
  const [category, setCategory] = useState<CategoryId>('uncategorised')
  const [scope, setScope] = useState<Scope>('once')
  const [undoCategory, setUndoCategory] = useState<{ id: string; category: CategoryId } | null>(
    null,
  )
  const [confirm, setConfirm] = useState<
    { type: 'disconnect'; id: string } | { type: 'erase' } | null
  >(null)
  const [exported, setExported] = useState<string | null>(null)
  const [erased, setErased] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [reauthenticationRequested, setReauthenticationRequested] = useState(false)
  const [sessionLostVersion, setSessionLostVersion] = useState(0)
  const identityEpoch = useRef(0)
  const verifiedSession = useRef<LocalIdentitySession | null>(null)
  const verifiedSnapshot = useRef<string | null>(null)
  const offlineView = useRef(false)
  const networkBlocked = useRef(false)
  const [offlineSnapshot, setOfflineSnapshot] = useState<{
    readonly savedAt: string
    readonly expiresAt: string
  } | null>(null)
  const [networkUnavailable, setNetworkUnavailable] = useState(false)
  const cacheContext = useRef<string | null>(null)
  const cacheDiscard = useRef<(reason: OfflineDiscardReason) => void>(() => {})
  const offlineCache = useMemo(
    () =>
      createWebOfflineCache<DemoOverview>({
        validateSnapshot: (value) => matchesVerifiedOverview(value, verifiedSnapshot.current),
        onDiscard: (reason) => cacheDiscard.current(reason),
      }),
    [],
  )
  cacheDiscard.current = (reason) => {
    cacheContext.current = null
    verifiedSnapshot.current = null
    if (!offlineView.current || reason === 'profile_changed') return
    offlineView.current = false
    setOfflineSnapshot(null)
    identityEpoch.current++
    setData(null)
    setRetrievedAt(null)
    setDetailId(null)
    setConfirm(null)
    setUndoCategory(null)
    setExported(null)
    setManage(null)
    setRecoveryAccount(null)
    setNotice(null)
    setQuery('')
    setLedgerFilters(EMPTY_LEDGER_FILTERS)
    setLoading(false)
    setBusy(null)
    setError(language.current.t('app.offlineExpired'))
  }
  const api = useMemo(
    () =>
      offlineGatedApi(
        onlineApi,
        () =>
          networkBlocked.current ||
          (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine),
        () => language.current.t('app.offlineAction'),
        () => {
          void offlineCache.discard('deletion')
        },
      ),
    [offlineCache],
  )
  const settingsClient = useMemo(() => createSettingsClient(api.request), [api])
  const mutationsDisabled = !!busy || networkUnavailable || offlineSnapshot !== null
  const clearFinancialState = useCallback(
    (options?: { preserveNavigation: boolean }) => {
      identityEpoch.current++
      offlineView.current = false
      networkBlocked.current = false
      verifiedSession.current = null
      setOfflineSnapshot(null)
      setNetworkUnavailable(false)
      void offlineCache.discard('profile_changed')
      onDisplayPreferences(defaultDisplayPreferences)
      setSignedIn(false)
      setData(null)
      setRetrievedAt(null)
      setDetailId(null)
      setConfirm(null)
      setExported(null)
      setUndoCategory(null)
      setNotice(null)
      setError(null)
      setBusy(null)
      setLoading(false)
      setQuery('')
      setLedgerFilters(EMPTY_LEDGER_FILTERS)
      setManage(null)
      setRecoveryAccount(null)
      if (!options?.preserveNavigation) setTab('Home')
      setReauthenticationRequested(false)
      setCategory('uncategorised')
      setScope('once')
    },
    [onDisplayPreferences, offlineCache],
  )
  const identityFailure = useCallback(
    (cause: unknown) => {
      if (!(cause instanceof ApiError) || cause.status !== 401) return false
      void offlineCache.discard('unauthorized')
      if (!identityMode) {
        clearFinancialState()
        setError(language.current.problemMessage(cause))
        return true
      }
      if (cause.code === 'reauthentication_required') {
        setReauthenticationRequested(true)
        setConfirm(null)
        setError(language.current.t('app.reauthenticate'))
      } else {
        clearFinancialState()
        setSessionLostVersion((version) => version + 1)
      }
      return true
    },
    [clearFinancialState, offlineCache],
  )
  // Child requests keep the callbacks from the render that started them.
  const renderedIdentityEpoch = identityEpoch.current
  const panelIdentityFailure = useCallback(
    (cause: unknown) => renderedIdentityEpoch !== identityEpoch.current || identityFailure(cause),
    [renderedIdentityEpoch, identityFailure],
  )
  const scroll = useRef<ScrollView>(null)
  const contentHeading = useRef<Text>(null)
  const route = `${tab}:${manage ?? ''}:${detailId ?? ''}`
  const previousRoute = useRef(route)
  useEffect(() => {
    if (previousRoute.current === route) return
    previousRoute.current = route
    const captured = renderedIdentityEpoch
    if (!confirm && captured === identityEpoch.current) focusWebElement(contentHeading.current)
  }, [route, renderedIdentityEpoch, confirm])
  const profileId = data?.profile.id
  useEffect(() => {
    if (!profileId) return
    const epoch = renderedIdentityEpoch
    let cancelled = false
    void settingsClient
      .get()
      .then(({ settings }) => {
        if (!cancelled && epoch === identityEpoch.current)
          onDisplayPreferences({ locale: settings.locale, timezone: settings.timezone })
      })
      .catch((cause: unknown) => {
        if (!cancelled && epoch === identityEpoch.current) identityFailure(cause)
      })
    return () => {
      cancelled = true
    }
  }, [profileId, renderedIdentityEpoch, identityFailure, onDisplayPreferences, settingsClient])
  // biome-ignore lint/correctness/useExhaustiveDependencies: These state changes reveal the relevant route, confirmation, or feedback at the top of the screen.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false })
  }, [tab, detailId, confirm, notice, error])

  const cacheWriteTicket = useRef(0)
  const acceptOnlineOverview = useCallback(
    async (overview: DemoOverview, epoch: number) => {
      if (epoch !== identityEpoch.current) return
      const session = verifiedSession.current
      if (identityMode && session && session.principal.profileId !== overview.profile.id) {
        clearFinancialState()
        return
      }
      const ticket = ++cacheWriteTicket.current
      offlineView.current = false
      networkBlocked.current = false
      setOfflineSnapshot(null)
      setNetworkUnavailable(false)
      setData(overview)
      setRetrievedAt(new Date().toISOString())
      if (Platform.OS !== 'web' || (identityMode && !session)) return
      const context = JSON.stringify([
        epoch,
        overview.profile.id,
        session?.principal.sessionId ?? 'demo',
      ])
      if (cacheContext.current !== context) {
        const authorized = await offlineCache.authorize(
          identityMode && session
            ? { mode: 'authenticated', session, identityEpoch: epoch }
            : {
                mode: 'demo',
                profileId: overview.profile.id,
                sessionId: `synthetic-page-${epoch}`,
                identityEpoch: epoch,
                ttlMs: OFFLINE_CACHE_LIMITS.maxDemoTtlMs,
              },
        )
        if (!authorized || epoch !== identityEpoch.current || ticket !== cacheWriteTicket.current)
          return
        cacheContext.current = context
      }
      if (epoch !== identityEpoch.current || ticket !== cacheWriteTicket.current) return
      verifiedSnapshot.current = JSON.stringify(overview)
      await offlineCache.writeVerified(overview)
    },
    [clearFinancialState, offlineCache],
  )
  const showOfflineOverview = useCallback(
    async (epoch: number) => {
      networkBlocked.current = true
      setNetworkUnavailable(true)
      const cached = await offlineCache.read()
      if (epoch !== identityEpoch.current) return false
      setConfirm(null)
      setManage(null)
      setUndoCategory(null)
      setExported(null)
      setNotice(null)
      if (cached.status === 'ready') {
        offlineView.current = true
        setOfflineSnapshot({ savedAt: cached.savedAt, expiresAt: cached.expiresAt })
        setData(cached.snapshot)
        setRetrievedAt(cached.savedAt)
        setError(null)
        return true
      }
      offlineView.current = false
      setOfflineSnapshot(null)
      setData(null)
      setRetrievedAt(null)
      setDetailId(null)
      return false
    },
    [offlineCache],
  )
  const refreshTicket = useRef(0)
  const refresh = useCallback(async () => {
    const epoch = identityEpoch.current
    const ticket = ++refreshTicket.current
    setLoading(true)
    setError(null)
    try {
      const overview = await api.overview()
      if (epoch !== identityEpoch.current || ticket !== refreshTicket.current) return
      await acceptOnlineOverview(overview, epoch)
      if (epoch !== identityEpoch.current || ticket !== refreshTicket.current) return
      if (identityMode) setSignedIn(true)
    } catch (cause) {
      if (
        epoch !== identityEpoch.current ||
        ticket !== refreshTicket.current ||
        identityFailure(cause)
      )
        return
      if (cause instanceof ApiError && (cause.status === 404 || cause.status === 410)) {
        clearFinancialState()
        void offlineCache.discard('deletion')
        setErased(true)
        return
      }
      const networkFailure =
        cause instanceof TypeError ||
        (cause instanceof Error &&
          ['AbortError', 'TimeoutError', 'NetworkError'].includes(cause.name))
      if (networkFailure && (await showOfflineOverview(epoch))) return
      if (!networkFailure) {
        const verified = verifiedSession.current
        clearFinancialState()
        if (!(cause instanceof ApiError) || cause.status !== 403) verifiedSession.current = verified
        networkBlocked.current = true
        setNetworkUnavailable(true)
        setError(
          cause instanceof ApiError
            ? language.current.problemMessage(cause)
            : language.current.t('app.unavailable'),
        )
        return
      }
      if (epoch !== identityEpoch.current) return
      setError(
        cause instanceof Error && cause.name === 'ApiError'
          ? language.current.problemMessage(cause)
          : language.current.t('app.unavailable'),
      )
    } finally {
      if (epoch === identityEpoch.current && ticket === refreshTicket.current) setLoading(false)
    }
  }, [
    identityFailure,
    api,
    acceptOnlineOverview,
    showOfflineOverview,
    clearFinancialState,
    offlineCache,
  ])
  useEffect(() => {
    void refresh()
  }, [refresh])
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const lost = () => {
      networkBlocked.current = true
      setNetworkUnavailable(true)
      void refresh()
    }
    const restored = () => {
      if (networkBlocked.current) void refresh()
    }
    window.addEventListener('offline', lost)
    window.addEventListener('online', restored)
    return () => {
      window.removeEventListener('offline', lost)
      window.removeEventListener('online', restored)
      void offlineCache.discard('reload')
    }
  }, [refresh, offlineCache])
  const refreshAfterChange = useCallback(async () => {
    const epoch = identityEpoch.current
    try {
      const overview = await api.overview()
      if (epoch !== identityEpoch.current) return
      await acceptOnlineOverview(overview, epoch)
    } catch (cause) {
      if (epoch === identityEpoch.current) identityFailure(cause)
      throw cause
    }
  }, [identityFailure, api, acceptOnlineOverview])

  const mutate = async (
    key: string,
    action: () => Promise<unknown>,
    success: string,
    conflictTarget: 'match' | 'category' | null = null,
  ) => {
    if (busy || networkBlocked.current) return false
    const epoch = identityEpoch.current
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (epoch !== identityEpoch.current) return false
      const overview = await api.overview()
      if (epoch !== identityEpoch.current) return false
      await acceptOnlineOverview(overview, epoch)
      if (epoch !== identityEpoch.current) return false
      setNotice(success)
      return true
    } catch (cause) {
      if (epoch !== identityEpoch.current || identityFailure(cause)) return false
      if (cause instanceof ApiError && cause.status === 409) {
        setNotice(null)
        const matchChanged = conflictTarget === 'match' && cause.code === 'reconciliation_changed'
        const categoryChanged = conflictTarget === 'category' && cause.code === 'conflict'
        try {
          // Refresh evidence once; never replay the rejected action with a new revision.
          const overview = await api.overview()
          if (epoch !== identityEpoch.current) return false
          await acceptOnlineOverview(overview, epoch)
          if (epoch !== identityEpoch.current) return false
          if (categoryChanged) {
            setCategory(
              overview.analysis.classifications.find((item) => item.transactionId === detailId)
                ?.categoryId ?? 'uncategorised',
            )
            setScope('once')
            setUndoCategory(null)
          }
          setError(
            matchChanged
              ? t('app.matchChanged')
              : categoryChanged
                ? t('app.categoryChanged')
                : i18n.problemMessage(cause),
          )
        } catch (refreshFailure) {
          if (epoch !== identityEpoch.current || identityFailure(refreshFailure)) return false
          const subject = matchChanged
            ? t('app.matchChangedShort')
            : categoryChanged
              ? t('app.categoryChangedShort')
              : i18n.problemMessage(cause)
          setError(t('app.refreshConflict', { subject }))
        }
        return false
      }
      setError(
        cause instanceof Error && cause.name === 'ApiError'
          ? i18n.problemMessage(cause)
          : t('app.actionFailed'),
      )
      return false
    } finally {
      if (epoch === identityEpoch.current) setBusy(null)
    }
  }

  const classification = (id: string) =>
    data?.analysis.classifications.find((item) => item.transactionId === id)
  const openDetail = (transaction: TransactionDto) => {
    setDetailId(transaction.id)
    setCategory(classification(transaction.id)?.categoryId ?? 'uncategorised')
    setScope('once')
    setNotice(null)
  }
  const ledgerOffline = offlineSnapshot !== null || networkUnavailable
  const ledgerSearch = useLedgerSearch({
    api,
    enabled:
      tab === 'Movimenti' &&
      Boolean(data) &&
      !ledgerOffline &&
      (ledgerFilters.history90 ||
        [ledgerFilters.from, ledgerFilters.to].every((value) => !value || value.length === 10)),
    profileId: data?.profile.id,
    identityEpoch: renderedIdentityEpoch,
    refreshKey: data,
    query: {
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(filter === 'pending' ? { status: 'pending' as const } : {}),
      ...(ledgerFilters.accountId ? { accountId: ledgerFilters.accountId } : {}),
      ...(ledgerFilters.currency ? { currency: ledgerFilters.currency } : {}),
      ...(!ledgerFilters.history90 && ledgerFilters.from ? { from: ledgerFilters.from } : {}),
      ...(!ledgerFilters.history90 && ledgerFilters.to ? { to: ledgerFilters.to } : {}),
    },
    history90: ledgerFilters.history90,
    current: () =>
      renderedIdentityEpoch === identityEpoch.current &&
      !offlineView.current &&
      !networkBlocked.current &&
      data?.profile.id === profileId,
    identityFailure: panelIdentityFailure,
  })
  const selected =
    ledgerSearch.items.find((transaction) => transaction.id === detailId) ??
    data?.transactions.find((transaction) => transaction.id === detailId)
  const sorted = useMemo(
    () =>
      [...(data?.transactions ?? [])].sort((a, b) =>
        (b.bookedOn ?? b.authorizedOn ?? '').localeCompare(a.bookedOn ?? a.authorizedOn ?? ''),
      ),
    [data],
  )
  const dates = sorted
    .map((transaction) => transaction.bookedOn ?? transaction.authorizedOn)
    .filter((value): value is string => value !== null)
    .sort()
  const history = dates.length
    ? `${date(dates[0])} – ${date(dates[dates.length - 1])}`
    : t('app.noPeriod')
  const activeConnections =
    data?.connections.filter(
      (connection) => connection.status === 'active' && connection.providerId !== 'local-manual',
    ) ?? []
  const reviewCount = data?.analysis.reviewItems.length ?? 0
  const orderedMatches = [...(data?.analysis.matches ?? [])].sort((first, second) => {
    const awaiting = (state: string) => (state === 'suggested' || state === 'undone' ? 0 : 1)
    return awaiting(first.state) - awaiting(second.state)
  })
  const offlineToday = calendarDateAt(
    new Date(retrievedAt ?? Date.now()),
    data?.profile.timezone ?? 'Europe/Rome',
  )
  const offlineFrom = ledgerFilters.history90 ? addDays(offlineToday, -89) : ledgerFilters.from
  const offlineTo = ledgerFilters.history90 ? offlineToday : ledgerFilters.to
  const filtered = (ledgerOffline ? sorted : ledgerSearch.items).filter((transaction) => {
    const matchesSearch =
      `${name(transaction)} ${transaction.description} ${i18n.categoryLabel(classification(transaction.id)?.categoryId ?? 'uncategorised')}`
        .toLocaleLowerCase(i18n.locale)
        .includes(query.toLocaleLowerCase(i18n.locale))
    return (
      (!ledgerOffline ||
        (matchesSearch &&
          (!ledgerFilters.accountId || transaction.accountId === ledgerFilters.accountId) &&
          (!ledgerFilters.currency || transaction.amount.currency === ledgerFilters.currency) &&
          (!offlineFrom ||
            (transaction.bookedOn ?? transaction.authorizedOn ?? '') >= offlineFrom) &&
          (!offlineTo ||
            (Boolean(transaction.bookedOn ?? transaction.authorizedOn) &&
              (transaction.bookedOn ?? transaction.authorizedOn ?? '') <= offlineTo)))) &&
      (filter === 'all' ||
        (filter === 'pending' && transaction.status === 'pending') ||
        (filter === 'review' &&
          data?.analysis.reviewItems.some((item) => item.transactionIds.includes(transaction.id))))
    )
  })
  const go = (destination: Tab) => {
    setTab(destination)
    setDetailId(null)
    setConfirm(null)
    setManage(null)
  }

  const transactionRow = (transaction: TransactionDto) => {
    const categoryName = i18n.categoryLabel(
      classification(transaction.id)?.categoryId ?? 'uncategorised',
    )
    const account = data?.accounts.find((item) => item.id === transaction.accountId)
    const match = data?.analysis.matches.find(
      (item) => item.state === 'confirmed' && item.transactionIds.includes(transaction.id),
    )
    const excluded =
      match && ['internal_transfer', 'card_settlement', 'cash_transfer'].includes(match.type)
    return (
      <Pressable
        key={transaction.id}
        accessibilityRole="button"
        accessibilityLabel={t('app.openTransaction', {
          name: name(transaction),
          amount: accessibleAmount(transaction.amount),
          category: categoryName,
          status: statusLabels[transaction.status],
        })}
        onPress={() => openDetail(transaction)}
        style={({ pressed }) => [s.transaction, pressed && s.pressed]}
      >
        <View style={s.transactionTop}>
          <View style={s.merchantCircle}>
            <Text style={s.merchantLetter}>{name(transaction).slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={s.transactionName}>
            <Text style={s.strong}>{name(transaction)}</Text>
            <Text style={s.caption}>
              {date(transaction.bookedOn ?? transaction.authorizedOn)} ·{' '}
              {account?.name ?? t('app.demoAccount')}
            </Text>
          </View>
          <Text
            accessibilityLabel={accessibleAmount(transaction.amount)}
            style={[
              s.rowAmount,
              { color: BigInt(transaction.amount.amountMinor) > 0n ? c.positive : c.textPrimary },
            ]}
          >
            {amount(transaction.amount, true)}
          </Text>
        </View>
        <View style={s.transactionMeta}>
          <Text style={s.categoryLabel}>{categoryName}</Text>
          <Text style={[s.caption, transaction.status === 'pending' && { color: c.warning }]}>
            {statusLabels[transaction.status]}
            {excluded ? t('app.excludedSpend') : match ? t('app.confirmedMatch') : ''}
          </Text>
        </View>
      </Pressable>
    )
  }

  const saveCategory = async () => {
    if (!selected) return
    const previous = classification(selected.id)?.categoryId ?? 'uncategorised'
    const saved = await mutate(
      'category',
      () => api.correct(selected.id, category, scope, selected.revision),
      scope === 'merchant' ? t('app.categoryFutureSaved') : t('app.categorySaved'),
      'category',
    )
    if (saved) {
      setUndoCategory(scope === 'once' ? { id: selected.id, category: previous } : null)
      setDetailId(null)
    }
  }
  const undoCorrection = async () => {
    if (!undoCategory) return
    const transaction = data?.transactions.find((item) => item.id === undoCategory.id)
    if (
      transaction &&
      (await mutate(
        'undo-category',
        () => api.correct(transaction.id, undoCategory.category, 'once', transaction.revision),
        t('app.categoryRestored'),
        'category',
      ))
    )
      setUndoCategory(null)
  }
  const exportData = async () => {
    if (networkBlocked.current) return
    const epoch = identityEpoch.current
    setBusy('export')
    setError(null)
    try {
      const result = await api.exportData()
      if (epoch !== identityEpoch.current) return
      const payload = JSON.stringify(result, null, 2)
      setExported(payload)
      setNotice(t('app.exportReady'))
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'lilleri-dati-dimostrativi.json'
        anchor.click()
        URL.revokeObjectURL(url)
      }
    } catch (cause) {
      if (epoch !== identityEpoch.current || identityFailure(cause)) return
      setError(cause instanceof ApiError ? i18n.problemMessage(cause) : t('app.exportFailed'))
    } finally {
      if (epoch === identityEpoch.current) setBusy(null)
    }
  }
  const exportArchive = async () => {
    if (networkBlocked.current) return
    const epoch = identityEpoch.current
    setBusy('export')
    setError(null)
    try {
      const archive = await api.exportArchive()
      if (epoch !== identityEpoch.current) return
      const url = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'lilleri-dati-dimostrativi.zip'
      anchor.click()
      URL.revokeObjectURL(url)
      setNotice(t('app.archiveReady'))
    } catch (cause) {
      if (epoch !== identityEpoch.current || identityFailure(cause)) return
      setError(cause instanceof ApiError ? i18n.problemMessage(cause) : t('app.archiveFailed'))
    } finally {
      if (epoch === identityEpoch.current) setBusy(null)
    }
  }
  const confirmAction = async () => {
    if (!confirm || busy || networkBlocked.current) return
    if (confirm.type === 'disconnect') {
      if (await mutate('disconnect', () => api.disconnect(confirm.id), t('app.disconnected')))
        setConfirm(null)
    } else {
      const epoch = identityEpoch.current
      setBusy('erase')
      setError(null)
      try {
        await api.erase()
        if (epoch !== identityEpoch.current) return
        offlineView.current = false
        void offlineCache.discard('deletion')
        if (identityMode) {
          clearFinancialState()
          setSessionLostVersion((version) => version + 1)
        }
        setData(null)
        setErased(true)
        setConfirm(null)
        setDetailId(null)
        setExported(null)
        setNotice(null)
      } catch (cause) {
        if (epoch !== identityEpoch.current || identityFailure(cause)) return
        setError(cause instanceof Error ? i18n.problemMessage(cause) : t('app.eraseFailed'))
      } finally {
        if (epoch === identityEpoch.current) setBusy(null)
      }
    }
  }

  if (!fontsLoaded && !fontError)
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loader}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.body}>{t('app.preparing')}</Text>
        </View>
      </SafeAreaView>
    )

  return (
    <SafeAreaView style={s.root}>
      <WebAccessibilityStyles theme={theme} />
      {Platform.OS === 'web' && (
        <Pressable
          nativeID="lilleri-skip-content"
          accessibilityRole="button"
          accessibilityLabel={t('app.skipContent')}
          onPress={() => focusWebElement(contentHeading.current)}
          style={[s.button, { position: 'absolute', zIndex: 100 }]}
        >
          <Text style={s.buttonText}>{t('app.skipContent')}</Text>
        </Pressable>
      )}
      <View style={s.appHeader}>
        <Image
          source={
            theme === 'dark'
              ? require('../../packages/brand/png/lockup-dark.png')
              : require('../../packages/brand/png/lockup-light.png')
          }
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="Lilleri"
        />
        <View style={s.headerActions}>
          <Text style={s.demoBadge}>{t('app.demoBadge')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={theme === 'dark' ? t('app.lightTheme') : t('app.darkTheme')}
            onPress={() => setThemeChoice(theme === 'dark' ? 'light' : 'dark')}
            style={s.themeButton}
          >
            <Text style={s.themeGlyph}>{theme === 'dark' ? '☼' : '◐'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={[s.shell, wide && s.wideShell]}>
        {wide && (
          <View role="navigation" accessibilityLabel={t('app.navigation')} style={s.rail}>
            <Text style={s.railLabel}>{t('app.railLabel')}</Text>
            {tabs.map((destination, index) => (
              <Pressable
                key={destination}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === destination }}
                aria-current={tab === destination ? 'page' : undefined}
                accessibilityLabel={
                  destination === 'Da controllare'
                    ? t('nav.reviewCount', { count: reviewCount })
                    : t(tabMessages[destination])
                }
                onPress={() => go(destination)}
                style={[s.railTab, tab === destination && s.selectedTab]}
              >
                <Text style={[s.railNumber, tab === destination && s.selectedText]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text style={[s.navLabel, tab === destination && s.selectedText]}>
                  {t(tabMessages[destination])}
                  {destination === 'Da controllare' && reviewCount > 0 ? ` (${reviewCount})` : ''}
                </Text>
              </Pressable>
            ))}
            <View style={s.railFooter}>
              <Signature color={c.primary} />
              <Text style={s.caption}>{t('app.signature')}</Text>
            </View>
          </View>
        )}
        <ScrollView
          ref={scroll}
          role="main"
          aria-labelledby="lilleri-main-heading"
          style={s.scroll}
          contentContainerStyle={[s.content, wide && s.wideContent]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.pageHeading}>
            <View style={s.headingCopy}>
              <Text style={s.eyebrow}>{t('app.eyebrow')}</Text>
              <Text
                ref={contentHeading}
                nativeID="lilleri-main-heading"
                accessibilityRole="header"
                aria-level={1}
                style={s.heading}
              >
                {selected
                  ? t('app.transaction')
                  : manage
                    ? t(manageMessages[manage])
                    : tab === 'Home'
                      ? t('app.homeHeading')
                      : t(tabMessages[tab])}
              </Text>
            </View>
            {!erased && (
              <Button
                label={loading ? t('app.refreshing') : t('common.refresh')}
                onPress={() => void refresh()}
                quiet
                disabled={loading || !!busy}
                c={c}
                s={s}
              />
            )}
          </View>
          {!hostedIdentityMode && <Text style={s.demoIntro}>{t('app.intro')}</Text>}
          {identityMode && (
            <LocalIdentityPanel
              baseUrl={apiBaseUrl}
              {...(hostedIdentity ? { hostedIdentity } : {})}
              theme={theme}
              visible={!signedIn || tab === 'Privacy' || reauthenticationRequested}
              sessionLostVersion={sessionLostVersion}
              reauthenticationRequested={reauthenticationRequested}
              onSignedIn={async (session) => {
                verifiedSession.current = session
                setSignedIn(true)
                setErased(false)
                await refresh()
              }}
              onSignedOut={(reason) =>
                clearFinancialState({ preserveNavigation: reason === 'session-renewed' })
              }
              onReauthenticated={() => {
                setReauthenticationRequested(false)
                setError(null)
              }}
            />
          )}
          {fontError && (
            <AccessibleStatus urgent>
              <Text style={s.errorText}>{t('app.fontUnavailable')}</Text>
            </AccessibleStatus>
          )}
          {offlineSnapshot && (
            <AccessibleStatus style={s.notice}>
              <Text style={s.strong}>{t('app.offlineHeading')}</Text>
              <Text style={s.body}>
                {t('app.offlineCopy', {
                  savedAt: i18n.instant(offlineSnapshot.savedAt),
                  expiresAt: i18n.instant(offlineSnapshot.expiresAt),
                })}
              </Text>
            </AccessibleStatus>
          )}
          {error && (
            <AccessibleStatus urgent style={s.errorBanner}>
              <Text style={s.strong}>{t('app.errorHeading')}</Text>
              <Text style={s.body}>{error}</Text>
              {data && (
                <Text style={s.caption}>
                  {t('app.retrievedAt', { date: datetime(retrievedAt) })}
                </Text>
              )}
              <Button
                label={t('common.retry')}
                onPress={() => void refresh()}
                quiet
                disabled={loading || !!busy || erased}
                c={c}
                s={s}
              />
            </AccessibleStatus>
          )}
          {notice && (
            <AccessibleStatus style={s.notice}>
              <Text style={s.body}>{notice}</Text>
              {undoCategory && (
                <Button
                  label={t('app.undoCategory')}
                  onPress={() => void undoCorrection()}
                  quiet
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
              )}
            </AccessibleStatus>
          )}
          {busy && (
            <AccessibleStatus style={s.busy}>
              <ActivityIndicator color={c.primary} size="small" />
              <Text style={s.caption}>
                {busy === 'export'
                  ? t('app.exporting')
                  : busy === 'sync'
                    ? t('app.syncing')
                    : t('app.savingAction')}
              </Text>
            </AccessibleStatus>
          )}
          {confirm && (
            <AccessibleDialog
              style={s.confirmation}
              resetKey={renderedIdentityEpoch}
              isCurrent={() => renderedIdentityEpoch === identityEpoch.current}
              mayRestoreFocus={() => renderedIdentityEpoch === identityEpoch.current}
              title={
                confirm.type === 'erase' ? t('app.eraseQuestion') : t('app.disconnectQuestion')
              }
              description={
                confirm.type === 'erase'
                  ? t('app.eraseConsequences')
                  : t('app.disconnectConsequences')
              }
              headingStyle={s.sectionTitle}
              descriptionStyle={s.body}
              initialFocusSelector='[data-testid="confirmation-cancel"]'
              onDismiss={() => setConfirm(null)}
              canDismiss={() => !busy}
            >
              <View style={s.actions}>
                <Button
                  label={
                    confirm.type === 'erase' ? t('app.confirmErase') : t('app.confirmDisconnect')
                  }
                  onPress={() => void confirmAction()}
                  destructive
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
                <Button
                  testID="confirmation-cancel"
                  label={t('common.cancel')}
                  onPress={() => setConfirm(null)}
                  quiet
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
              </View>
            </AccessibleDialog>
          )}
          {erased ? (
            <View style={s.card}>
              <Signature color={c.primary} />
              <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                {t('app.erased')}
              </Text>
              <Text style={s.body}>
                {t('app.erasedCopy')}{' '}
                {hostedIdentityMode
                  ? t('identityPanel.hostedCreate')
                  : identityMode
                    ? t('app.newLocalProfile')
                    : t('app.newDemo')}
              </Text>
            </View>
          ) : identityMode && !signedIn ? null : !data ? (
            <View style={s.card}>
              {loading ? (
                <>
                  <ActivityIndicator color={c.primary} />
                  <Text accessibilityLiveRegion="polite" style={s.body}>
                    {t('app.loadingTransactions')}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.sectionTitle}>{t('app.notReady')}</Text>
                  <Text style={s.body}>{t('app.startService')}</Text>
                  <Button label={t('app.retrieve')} onPress={() => void refresh()} c={c} s={s} />
                </>
              )}
            </View>
          ) : manage ? (
            <>
              <Button
                label={
                  tab === 'Movimenti'
                    ? t('common.backToTransactions')
                    : t('app.backPage', { destination: t(tabMessages[tab]) })
                }
                onPress={() => setManage(null)}
                quiet
                c={c}
                s={s}
              />
              {networkUnavailable ? (
                <View style={s.card}>
                  <Text style={s.body}>{t('app.offlinePanel')}</Text>
                </View>
              ) : manage === 'mapped-import' ? (
                <MappedImportPanel
                  overview={data}
                  {...(recoveryAccount?.profileId === data.profile.id &&
                  recoveryAccount.epoch === renderedIdentityEpoch
                    ? { recoveryAccountId: recoveryAccount.accountId }
                    : {})}
                  theme={theme}
                  request={api.request}
                  resetKey={renderedIdentityEpoch}
                  onChanged={refreshAfterChange}
                  onError={panelIdentityFailure}
                />
              ) : manage === 'notifications' ? (
                <NotificationsPanel
                  theme={theme}
                  request={api.request}
                  resetKey={renderedIdentityEpoch}
                  onError={panelIdentityFailure}
                  onOpenPrivacy={() => {
                    setManage(null)
                    go('Privacy')
                  }}
                  onOpenDestination={(destination) => {
                    if (destination.screen === 'connections') setManage('connections')
                    else {
                      setManage(null)
                      go(
                        destination.screen === 'inbox'
                          ? 'Da controllare'
                          : destination.screen === 'overview'
                            ? 'Home'
                            : 'Privacy',
                      )
                    }
                  }}
                />
              ) : manage === 'understanding' ? (
                <UnderstandingPanel
                  overview={data}
                  theme={theme}
                  request={api.request}
                  resetKey={renderedIdentityEpoch}
                  onError={panelIdentityFailure}
                  onOpenTransaction={(id) => {
                    setManage(null)
                    setDetailId(id)
                  }}
                />
              ) : manage === 'connections' ? (
                <ConnectionsPanel
                  overview={data}
                  theme={theme}
                  api={api}
                  resetKey={renderedIdentityEpoch}
                  onRefresh={refreshAfterChange}
                  onManualFallback={() => setManage('import')}
                  onRecoverHistory={(accountId) => {
                    if (renderedIdentityEpoch !== identityEpoch.current) return
                    setRecoveryAccount({
                      profileId: data.profile.id,
                      epoch: renderedIdentityEpoch,
                      accountId,
                    })
                    setManage('mapped-import')
                  }}
                  onError={panelIdentityFailure}
                />
              ) : manage === 'merchants' ? (
                <MerchantPanel
                  overview={data}
                  theme={theme}
                  request={api.request}
                  resetKey={renderedIdentityEpoch}
                  disabled={loading || !!busy}
                  onChanged={refreshAfterChange}
                  onError={panelIdentityFailure}
                />
              ) : manage === 'rules' ? (
                <RulesPanel
                  request={api.request}
                  accounts={data.accounts}
                  transactions={data.transactions}
                  theme={theme}
                  onChanged={refreshAfterChange}
                  onError={panelIdentityFailure}
                />
              ) : (
                <ImportManualPanel
                  overview={data}
                  theme={theme}
                  request={api.request}
                  importCsv={api.importCsv}
                  onChanged={refreshAfterChange}
                  onError={panelIdentityFailure}
                />
              )}
            </>
          ) : selected ? (
            <>
              <Button
                label={t('app.backList')}
                onPress={() => setDetailId(null)}
                quiet
                c={c}
                s={s}
              />
              <View style={s.card}>
                <Text accessibilityRole="header" aria-level={2} style={s.detailMerchant}>
                  {name(selected)}
                </Text>
                <Text style={s.bigAmount}>{amount(selected.amount, true)}</Text>
                <Text style={s.caption}>
                  {statusLabels[selected.status]} ·{' '}
                  {date(selected.bookedOn ?? selected.authorizedOn)} ·{' '}
                  {data.accounts.find((account) => account.id === selected.accountId)?.name}
                </Text>
                <View style={s.divider} />
                <Text style={s.label}>{t('app.descriptionHeading')}</Text>
                <Text selectable style={s.body}>
                  {selected.description.trim() || t('common.descriptionUnknown')}
                </Text>
                <Text style={s.label}>{t('app.categoryWhy')}</Text>
                <Text style={s.body}>
                  {classification(selected.id)?.evidence[0]
                    ? humanEvidence(
                        classification(selected.id)?.evidence[0] ?? '',
                        '',
                        name(selected),
                      )
                    : t('app.chooseCategoryExplanation')}
                </Text>
                {classification(selected.id)?.evidence.map((item) => (
                  <Text key={item} style={s.caption}>
                    •{' '}
                    {humanEvidence(
                      item,
                      classification(selected.id)?.explanation ?? '',
                      name(selected),
                    )}
                  </Text>
                ))}
              </View>
              {data.analysis.matches
                .filter((match) => match.transactionIds.includes(selected.id))
                .map((match) => (
                  <View key={match.id} style={s.card}>
                    <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                      {matchLabels[match.type]}
                    </Text>
                    <Text style={s.stateBadge}>{matchStates[match.state]}</Text>
                    <Text style={s.body}>
                      {match.evidence[0]
                        ? humanEvidence(match.evidence[0], '')
                        : t('evidence.generic')}
                    </Text>
                    {match.evidence.map((item) => (
                      <Text key={item} style={s.caption}>
                        • {humanEvidence(item, match.explanation)}
                      </Text>
                    ))}
                    <Button
                      label={t('app.reviewMatch')}
                      onPress={() => go('Da controllare')}
                      quiet
                      c={c}
                      s={s}
                    />
                  </View>
                ))}
              <View style={s.card}>
                <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                  {t('app.chooseCategory')}
                </Text>
                <View style={s.categories}>
                  {(Object.entries(CATEGORIES) as [CategoryId, string][]).map(([id]) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: category === id,
                        disabled: networkUnavailable,
                      }}
                      aria-pressed={category === id}
                      aria-disabled={networkUnavailable}
                      disabled={networkUnavailable}
                      onPress={() => setCategory(id)}
                      style={[s.categoryOption, category === id && s.selectedOption]}
                    >
                      <Text style={[s.body, category === id && s.selectedText]}>
                        {i18n.categoryLabel(id)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.label}>{t('app.scopeHeading')}</Text>
                <View
                  role="radiogroup"
                  accessibilityLabel={t('app.scopeHeading')}
                  style={s.scopeChoices}
                >
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: scope === 'once', disabled: networkUnavailable }}
                    aria-checked={scope === 'once'}
                    aria-disabled={networkUnavailable}
                    disabled={networkUnavailable}
                    onPress={() => setScope('once')}
                    style={[s.scopeChoice, scope === 'once' && s.selectedOption]}
                  >
                    <Text style={s.strong}>
                      {scope === 'once' ? '● ' : '○ '}
                      {t('ledger.onlyThis')}
                    </Text>
                    <Text style={s.caption}>{t('app.otherCategories')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: scope === 'merchant',
                      disabled: !selected.merchantKey || networkUnavailable,
                    }}
                    aria-checked={scope === 'merchant'}
                    aria-disabled={!selected.merchantKey || networkUnavailable}
                    onPress={() => setScope('merchant')}
                    disabled={!selected.merchantKey || networkUnavailable}
                    style={[
                      s.scopeChoice,
                      scope === 'merchant' && s.selectedOption,
                      !selected.merchantKey && s.disabled,
                    ]}
                  >
                    <Text style={s.strong}>
                      {scope === 'merchant' ? '● ' : '○ '}
                      {t('app.futurePurchases')}
                    </Text>
                    <Text style={s.caption}>
                      {selected.merchantKey
                        ? t('app.futureCategory', { merchant: name(selected) })
                        : t('app.merchantUnknown')}
                    </Text>
                  </Pressable>
                </View>
                <Button
                  label={t('app.saveCategory')}
                  onPress={() => void saveCategory()}
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
              </View>
            </>
          ) : tab === 'Home' ? (
            <>
              <View style={s.attention}>
                <View style={s.attentionCopy}>
                  <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                    {reviewCount
                      ? t('app.reviewCount', { count: reviewCount })
                      : t('app.nothingReview')}
                  </Text>
                  <Text style={s.body}>
                    {reviewCount ? t('app.reviewHelp') : t('app.reviewHere')}
                  </Text>
                </View>
                {reviewCount > 0 && (
                  <Button
                    label={t('common.review')}
                    onPress={() => go('Da controllare')}
                    c={c}
                    s={s}
                  />
                )}
              </View>
              <View style={s.summary}>
                <View style={s.summaryHead}>
                  <Text style={s.label}>{t('app.spendingHeading')}</Text>
                  <Signature color={c.primary} />
                </View>
                <Text style={s.caption}>
                  {t('app.accountCoverage', { history, count: data.accounts.length })}
                </Text>
                {data.analysis.summaries.length ? (
                  data.analysis.summaries.map((summary) => (
                    <View key={summary.currency} style={s.currencySummary}>
                      <Text style={s.currency}>{summary.currency}</Text>
                      <Text
                        accessibilityLabel={t('app.spendLabel', {
                          amount: accessibleAmount(summary.spend),
                        })}
                        style={s.bigAmount}
                      >
                        {amount(summary.spend)}
                      </Text>
                      <View style={s.summaryDetails}>
                        <View style={s.metric}>
                          <Text style={s.caption}>{t('app.bookedIncome')}</Text>
                          <Text style={s.mediumAmount}>{amount(summary.income)}</Text>
                        </View>
                        <View style={s.metric}>
                          <Text style={s.caption}>{t('app.pendingBalance')}</Text>
                          <Text style={s.mediumAmount}>{amount(summary.pending)}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={s.body}>{t('app.noAmounts')}</Text>
                )}
                <Text style={s.summaryNote}>{t('app.summaryNote')}</Text>
                <Text style={s.caption}>
                  {t('app.lastRetrieved', { date: datetime(retrievedAt) })}
                </Text>
              </View>
              <Button
                label={t('app.understanding')}
                onPress={() => setManage('understanding')}
                c={c}
                s={s}
              />
              <HomeQuickActions
                theme={theme}
                reviewCount={reviewCount}
                disabled={mutationsDisabled}
                copy={{
                  title: t('quick.title'),
                  add: t('quick.add'),
                  addHelp: t('quick.addHelp'),
                  review: t('quick.review'),
                  reviewHelp: t('quick.reviewHelp', { count: reviewCount }),
                  transactions: t('quick.transactions'),
                  transactionsHelp: t('quick.transactionsHelp'),
                  summary: t('quick.summary'),
                  summaryHelp: t('quick.summaryHelp'),
                }}
                onAdd={() => setManage('import')}
                onReview={() => go('Da controllare')}
                onTransactions={() => go('Movimenti')}
                onSummary={() => setManage('understanding')}
              />
              <View style={s.sectionHeader}>
                <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                  {t('app.accountsHeading')}
                </Text>
                <Button label={t('app.manage')} onPress={() => go('Privacy')} quiet c={c} s={s} />
              </View>
              <View style={s.card}>
                {data.accounts.length ? (
                  data.accounts.map((account) => (
                    <View style={s.accountRow} key={account.id}>
                      <View style={s.accountName}>
                        <Text style={s.strong}>{account.name}</Text>
                        <Text style={s.caption}>
                          {t('app.accountObserved', {
                            institution: account.institutionName,
                            date: datetime(account.balanceUpdatedAt),
                          })}
                        </Text>
                      </View>
                      <Text style={s.mediumAmount}>{amount(account.balance)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={s.body}>{t('app.noAccounts')}</Text>
                )}
              </View>
              <View style={s.sectionHeader}>
                <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                  {t('app.latestTransactions')}
                </Text>
                <Button
                  label={t('app.viewAll')}
                  onPress={() => go('Movimenti')}
                  quiet
                  c={c}
                  s={s}
                />
              </View>
              <View style={s.list}>
                {sorted.slice(0, 4).map(transactionRow)}
                {!sorted.length && <Text style={s.body}>{t('app.transactionsHere')}</Text>}
              </View>
              <View style={s.footerNote}>
                <Signature color={c.primary} />
                <Text style={s.caption}>{t('app.syntheticNote')}</Text>
              </View>
            </>
          ) : tab === 'Movimenti' ? (
            <>
              <View style={s.actions}>
                <Button
                  label={t('app.rules')}
                  onPress={() => setManage('rules')}
                  quiet
                  c={c}
                  s={s}
                />
                <Button
                  label={t('app.mappedImport')}
                  onPress={() => setManage('mapped-import')}
                  quiet
                  c={c}
                  s={s}
                />
                <Button
                  label={t('app.import')}
                  onPress={() => setManage('import')}
                  quiet
                  c={c}
                  s={s}
                />
              </View>
              <Text style={s.caption}>
                {t('app.ledgerCoverage', { count: sorted.length, history })}
              </Text>
              <Text style={s.inputLabel}>{t('ledger.historySearch')}</Text>
              <TextInput
                accessibilityLabel={t('ledger.historySearch')}
                placeholder={t('ledger.searchFields')}
                placeholderTextColor={c.textTertiary}
                value={query}
                onChangeText={setQuery}
                style={s.input}
              />
              <LedgerSearchFilters
                accounts={data.accounts}
                value={ledgerFilters}
                onChange={setLedgerFilters}
                theme={theme}
                offline={ledgerOffline}
              />
              <View style={s.filters}>
                {(['all', 'pending', 'review'] as const).map((id) => (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === id }}
                    aria-pressed={filter === id}
                    onPress={() => setFilter(id)}
                    style={[s.filter, filter === id && s.selectedOption]}
                  >
                    <Text style={[s.body, filter === id && s.selectedText]}>
                      {id === 'all'
                        ? t('app.all')
                        : id === 'pending'
                          ? t('ledger.pending')
                          : t('nav.review')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.list}>
                {filtered.map(transactionRow)}
                {!ledgerOffline && ledgerSearch.loading && (
                  <AccessibleStatus>
                    <Text style={s.caption}>{t('common.loading')}</Text>
                  </AccessibleStatus>
                )}
                {!ledgerOffline && ledgerSearch.error !== null && (
                  <View style={s.empty}>
                    <Text accessibilityRole="alert" style={s.body}>
                      {ledgerSearch.error instanceof ApiError &&
                      ['ledger_changed', 'invalid_cursor'].includes(ledgerSearch.error.code)
                        ? t('ledger.changed')
                        : i18n.problemMessage(ledgerSearch.error)}
                    </Text>
                    <Button
                      label={t('common.retry')}
                      onPress={ledgerSearch.retry}
                      quiet
                      c={c}
                      s={s}
                    />
                  </View>
                )}
                {!ledgerOffline && ledgerSearch.nextCursor && !ledgerSearch.error && (
                  <Button
                    label={t(filtered.length ? 'ledger.moreTransactions' : 'ledger.continueSearch')}
                    onPress={ledgerSearch.more}
                    disabled={ledgerSearch.loading}
                    quiet
                    c={c}
                    s={s}
                  />
                )}
                {!filtered.length &&
                  (ledgerOffline ||
                    (!ledgerSearch.loading &&
                      ledgerSearch.error === null &&
                      ledgerSearch.searchComplete)) && (
                    <View style={s.empty}>
                      <Text style={s.sectionTitle}>
                        {sorted.length ? t('app.noResults') : t('app.transactionsPlaceholder')}
                      </Text>
                      <Text style={s.body}>
                        {sorted.length ? t('app.searchHelp') : t('app.emptyTransactions')}
                      </Text>
                      {sorted.length > 0 && (
                        <Button
                          label={t('app.clearSearch')}
                          onPress={() => {
                            setQuery('')
                            setFilter('all')
                            setLedgerFilters(EMPTY_LEDGER_FILTERS)
                          }}
                          quiet
                          c={c}
                          s={s}
                        />
                      )}
                    </View>
                  )}
              </View>
            </>
          ) : tab === 'Da controllare' ? (
            <>
              {!networkUnavailable && !offlineSnapshot && (
                <SourceDecisionsPanel
                  request={api.request}
                  profileId={data.profile.id}
                  resetKey={renderedIdentityEpoch}
                  transactions={data.transactions}
                  theme={theme}
                  disabled={mutationsDisabled}
                  onChanged={refreshAfterChange}
                  onError={panelIdentityFailure}
                />
              )}
              <Button
                label={t('merchant.title')}
                onPress={() => setManage('merchants')}
                quiet
                c={c}
                s={s}
              />
              <Text style={s.body}>{t('app.reviewIntro')}</Text>
              {data.analysis.reviewItems
                .filter((item) => item.type === 'classification')
                .map((item) => (
                  <View style={s.card} key={item.id}>
                    <Text style={s.eyebrow}>{t('app.categoryToChoose')}</Text>
                    <Text style={s.body}>
                      {item.type === 'balance'
                        ? t('app.balanceEvidence')
                        : t('app.categoryEvidence')}
                    </Text>
                    {item.transactionIds
                      .map((id) => data.transactions.find((transaction) => transaction.id === id))
                      .filter((transaction): transaction is TransactionDto => !!transaction)
                      .map(transactionRow)}
                  </View>
                ))}
              {orderedMatches.map((match) => (
                <View style={s.card} key={match.id}>
                  <View style={s.matchHeader}>
                    <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                      {matchLabels[match.type]}
                    </Text>
                    <Text style={s.stateBadge}>{matchStates[match.state]}</Text>
                  </View>
                  <Text style={s.body}>
                    {match.evidence[0]
                      ? humanEvidence(match.evidence[0], '')
                      : t('evidence.generic')}
                  </Text>
                  {match.evidence.map((item) => (
                    <Text key={item} style={s.caption}>
                      • {humanEvidence(item, match.explanation)}
                    </Text>
                  ))}
                  <View style={s.matchTransactions}>
                    {match.transactionIds
                      .map((id) => data.transactions.find((transaction) => transaction.id === id))
                      .filter((transaction): transaction is TransactionDto => !!transaction)
                      .map(transactionRow)}
                  </View>
                  <Text style={s.caption}>{t('app.confirmationEffect')}</Text>
                  <View style={s.actions}>
                    {match.state === 'suggested' || match.state === 'undone' ? (
                      <>
                        <Button
                          label={t('app.confirmMatch')}
                          onPress={() =>
                            void mutate(
                              match.id,
                              () => api.decideMatch(match.id, 'confirmed', match.revision),
                              t('app.matchSaved'),
                              'match',
                            )
                          }
                          disabled={mutationsDisabled}
                          c={c}
                          s={s}
                        />
                        <Button
                          label={t('app.reject')}
                          onPress={() =>
                            void mutate(
                              match.id,
                              () => api.decideMatch(match.id, 'rejected', match.revision),
                              t('app.matchRejected'),
                              'match',
                            )
                          }
                          quiet
                          disabled={mutationsDisabled}
                          c={c}
                          s={s}
                        />
                      </>
                    ) : (
                      <Button
                        label={t('app.undoDecision')}
                        onPress={() =>
                          void mutate(
                            match.id,
                            () => api.decideMatch(match.id, 'undone', match.revision),
                            t('app.decisionUndone'),
                            'match',
                          )
                        }
                        quiet
                        disabled={mutationsDisabled}
                        c={c}
                        s={s}
                      />
                    )}
                  </View>
                </View>
              ))}
              {data.analysis.reviewItems
                .filter((item) => item.type === 'balance')
                .map((item) => (
                  <View style={s.card} key={item.id}>
                    <Text style={s.sectionTitle}>{t('app.balanceReview')}</Text>
                    <Text style={s.body}>
                      {item.type === 'balance'
                        ? t('app.balanceEvidence')
                        : t('app.categoryEvidence')}
                    </Text>
                  </View>
                ))}
              {!reviewCount && (
                <View style={s.empty}>
                  <Signature color={c.primary} />
                  <Text style={s.sectionTitle}>{t('app.nothingReview')}</Text>
                  <Text style={s.body}>{t('app.priorDecisions')}</Text>
                </View>
              )}
            </>
          ) : tab === 'Ricorrenti' ? (
            offlineSnapshot ? (
              <View style={s.card}>
                <Text style={s.body}>{t('app.offlineRecurring')}</Text>
                {data.analysis.recurring.map((series) => (
                  <View key={series.id} style={s.currencySummary}>
                    <Text style={s.strong}>{series.merchantKey}</Text>
                    <Text style={s.body}>
                      {amount(series.expectedAmount)} · {date(series.nextOn)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <RecurringPanel
                overview={data}
                theme={theme}
                request={api.request}
                resetKey={renderedIdentityEpoch}
                disabled={mutationsDisabled}
                onChanged={refreshAfterChange}
                onError={panelIdentityFailure}
                onOpenTransaction={(id) => {
                  const transaction = data.transactions.find((item) => item.id === id)
                  if (transaction) openDetail(transaction)
                }}
              />
            )
          ) : networkUnavailable ? (
            <View style={s.card}>
              <Text style={s.body}>{t('app.offlinePanel')}</Text>
            </View>
          ) : (
            <>
              <Button
                label={t('app.notifications')}
                onPress={() => setManage('notifications')}
                c={c}
                s={s}
              />
              <Button
                label={t('app.connections')}
                onPress={() => setManage('connections')}
                c={c}
                s={s}
              />
              <Button
                label={t('merchant.title')}
                onPress={() => setManage('merchants')}
                quiet
                c={c}
                s={s}
              />
              <PrivacyControlsPanel
                overview={data}
                theme={theme}
                request={api.request}
                resetKey={renderedIdentityEpoch}
                onChanged={refreshAfterChange}
                onError={panelIdentityFailure}
              />
              <SettingsPanel
                request={api.request}
                theme={theme}
                resetKey={renderedIdentityEpoch}
                onChanged={async (settings: ProfileSettings) => {
                  if (renderedIdentityEpoch !== identityEpoch.current) return
                  onDisplayPreferences({ locale: settings.locale, timezone: settings.timezone })
                  await refreshAfterChange()
                }}
                onError={panelIdentityFailure}
              />
              <View style={s.card}>
                <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                  {t('app.demoDataHeading')}
                </Text>
                <Text style={s.body}>{t('app.demoOwnership', { name: data.profile.name })}</Text>
                <View style={s.divider} />
                <Text style={s.strong}>{t('app.realBankUnavailable')}</Text>
                <Text style={s.caption}>{t('app.simulatedSourceHelp')}</Text>
              </View>
              <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                {t('app.simulatedSource')}
              </Text>
              {data.connections
                .filter((connection) => connection.providerId !== 'local-manual')
                .map((connection) => (
                  <View style={s.card} key={connection.id}>
                    <Text style={s.strong}>
                      {t('app.sourceState', {
                        status:
                          connection.status === 'active'
                            ? t('app.active')
                            : connection.status === 'revoked'
                              ? t('app.disconnectedState')
                              : connection.status === 'expired'
                                ? t('app.expired')
                                : t('app.updateFailed'),
                      })}
                    </Text>
                    <Text style={s.caption}>
                      {t('app.sourceUpdatedAt', { date: datetime(connection.lastSyncedAt) })}
                    </Text>
                    <Text style={s.caption}>{t('app.simulatedAccess')}</Text>
                    <View style={s.actions}>
                      {connection.status === 'active' ? (
                        <>
                          <Button
                            label={t('app.updateSource')}
                            onPress={() =>
                              void mutate(
                                'sync',
                                async () => {
                                  const result = await api.sync(connection.id)
                                  setNotice(
                                    t('app.syncCounts', {
                                      inserted: result.inserted,
                                      updated: result.updated,
                                      unchanged: result.unchanged,
                                    }),
                                  )
                                  return result
                                },
                                t('app.sourceUpdated'),
                              )
                            }
                            disabled={mutationsDisabled}
                            c={c}
                            s={s}
                          />
                          <Button
                            label={t('app.disconnectSource')}
                            onPress={() => setConfirm({ type: 'disconnect', id: connection.id })}
                            quiet
                            disabled={mutationsDisabled}
                            c={c}
                            s={s}
                          />
                        </>
                      ) : (
                        <Text style={s.body}>{t('app.updatesStopped')}</Text>
                      )}
                    </View>
                  </View>
                ))}
              {!activeConnections.length && (
                <Button
                  label={t('app.activateSource')}
                  onPress={() =>
                    void mutate('connect', () => api.connectMock(), t('app.sourceActivated'))
                  }
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
              )}
              <View style={s.card}>
                <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                  {t('app.exportHeading')}
                </Text>
                <Text style={s.body}>{t('app.exportHelp')}</Text>
                <Button
                  label={t('app.exportData')}
                  onPress={() => void exportData()}
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
                {Platform.OS === 'web' && (
                  <Button
                    label={t('app.downloadArchive')}
                    onPress={() => void exportArchive()}
                    disabled={mutationsDisabled}
                    quiet
                    c={c}
                    s={s}
                  />
                )}
                {exported && (
                  <>
                    <Text accessibilityLiveRegion="polite" style={s.caption}>
                      {Platform.OS === 'web' ? t('app.downloadStarted') : t('app.exportCopy')}
                    </Text>
                    <ScrollView style={s.exportPreview} nestedScrollEnabled>
                      <Text selectable style={s.exportText}>
                        {exported}
                      </Text>
                    </ScrollView>
                  </>
                )}
              </View>
              <View style={s.card}>
                <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
                  {t('app.eraseHeading')}
                </Text>
                <Text style={s.body}>{t('app.eraseHelp')}</Text>
                <Button
                  label={t('app.eraseButton')}
                  onPress={() => setConfirm({ type: 'erase' })}
                  destructive
                  disabled={mutationsDisabled}
                  c={c}
                  s={s}
                />
              </View>
            </>
          )}
          <View style={s.pageEnd}>
            <Text style={s.caption}>{t('app.footer')}</Text>
            <Text style={s.caption}>
              {hostedIdentityMode
                ? t('identityPanel.hostedHelp')
                : identityMode
                  ? t('app.identityFooter')
                  : t('app.unavailableFooter')}
            </Text>
          </View>
        </ScrollView>
      </View>
      {!wide && (
        <View role="navigation" accessibilityLabel={t('app.navigation')} style={s.tabBar}>
          {tabs.map((destination, index) => (
            <Pressable
              key={destination}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === destination }}
              aria-current={tab === destination ? 'page' : undefined}
              accessibilityLabel={
                destination === 'Da controllare'
                  ? t('nav.reviewCount', { count: reviewCount })
                  : t(tabMessages[destination])
              }
              onPress={() => go(destination)}
              style={[s.tab, tab === destination && s.selectedTab]}
            >
              <Text
                accessibilityElementsHidden
                style={[s.tabIcon, tab === destination && s.selectedText]}
              >
                {['⌂', '≡', '✓', '↻', '◉'][index]}
              </Text>
              <Text style={[s.tabLabel, tab === destination && s.selectedText]}>
                {destination === 'Da controllare'
                  ? t('common.review')
                  : t(tabMessages[destination])}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  )
}

function Signature({ color }: { color: string }) {
  return (
    <View
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 16 }}
    >
      <View style={{ width: 24, height: 2, backgroundColor: color }} />
      <View style={{ width: 24, height: 2, backgroundColor: color }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  )
}

type Styles = ReturnType<typeof styles>
function Button({
  label,
  testID,
  onPress,
  quiet = false,
  destructive = false,
  disabled = false,
  c,
  s,
}: {
  label: string
  testID?: string
  onPress: () => void
  quiet?: boolean
  destructive?: boolean
  disabled?: boolean
  c: ThemeColors
  s: Styles
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet && s.quietButton,
        destructive && { backgroundColor: c.surface, borderColor: c.danger, borderWidth: 1 },
        pressed && s.pressed,
        disabled && s.disabled,
      ]}
    >
      <Text
        style={[s.buttonText, quiet && { color: c.primary }, destructive && { color: c.danger }]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function styles(c: ThemeColors) {
  const type = tokens.typography.scale
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    appHeader: {
      width: '100%',
      maxWidth: 1100,
      alignSelf: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 16,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    logo: { width: 122, height: 40 },
    headerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      flexShrink: 1,
    },
    demoBadge: {
      fontFamily: 'GeistMedium',
      fontSize: tokens.typography.scale.caption.size,
      lineHeight: 16,
      color: c.textSecondary,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexShrink: 1,
    },
    themeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    themeGlyph: { fontSize: 24, color: c.primary },
    shell: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
    wideShell: { flexDirection: 'row' },
    scroll: { flex: 1 },
    content: { padding: 24, gap: 16, paddingBottom: 40 },
    wideContent: { padding: 40, maxWidth: 820 },
    rail: { width: 220, padding: 24, gap: 8, borderRightWidth: 1, borderColor: c.border },
    railLabel: {
      fontFamily: 'GeistMedium',
      fontSize: tokens.typography.scale.caption.size,
      color: c.textTertiary,
      letterSpacing: 1.3,
      paddingBottom: 24,
      paddingTop: 16,
    },
    railTab: {
      minHeight: 52,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
    },
    railNumber: {
      color: c.textTertiary,
      fontFamily: 'Geist',
      fontSize: 11,
      fontVariant: ['tabular-nums'],
    },
    navLabel: { color: c.textSecondary, fontFamily: 'GeistMedium', fontSize: 14, flexShrink: 1 },
    railFooter: { marginTop: 'auto', gap: 16, paddingTop: 40 },
    pageHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    headingCopy: { gap: 8, flex: 1 },
    eyebrow: {
      fontFamily: 'GeistMedium',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      color: c.primary,
      letterSpacing: 1.1,
    },
    heading: {
      fontFamily: 'GeistSemibold',
      fontSize: type.h1.size,
      lineHeight: type.h1.lineHeight,
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    demoIntro: {
      fontFamily: 'Geist',
      fontSize: type.bodySmall.size,
      lineHeight: type.bodySmall.lineHeight,
      color: c.textSecondary,
      marginBottom: 8,
    },
    body: {
      fontFamily: 'Geist',
      fontSize: type.body.size,
      lineHeight: type.body.lineHeight,
      color: c.textPrimary,
      flexShrink: 1,
    },
    strong: {
      fontFamily: 'GeistSemibold',
      fontSize: type.body.size,
      lineHeight: type.body.lineHeight,
      color: c.textPrimary,
      flexShrink: 1,
    },
    caption: {
      fontFamily: 'Geist',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      color: c.textSecondary,
      flexShrink: 1,
    },
    label: {
      fontFamily: 'GeistMedium',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      color: c.textSecondary,
      letterSpacing: 0.9,
      marginTop: 8,
    },
    sectionTitle: {
      fontFamily: 'GeistSemibold',
      fontSize: type.title.size,
      lineHeight: type.title.lineHeight,
      color: c.textPrimary,
      flexShrink: 1,
    },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.lg,
      padding: 24,
      gap: 16,
    },
    summary: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.xl,
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    summaryHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    currencySummary: { gap: 8, paddingTop: 8 },
    currency: { fontFamily: 'GeistMedium', fontSize: 12, color: c.primary },
    bigAmount: {
      fontFamily: 'GeistMedium',
      fontSize: type.amountLarge.size,
      lineHeight: type.amountLarge.lineHeight,
      letterSpacing: type.amountLarge.letterSpacing,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    mediumAmount: {
      fontFamily: 'GeistMedium',
      fontSize: type.amountMedium.size,
      lineHeight: type.amountMedium.lineHeight,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    summaryDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingTop: 16 },
    metric: { gap: 8, minWidth: 140, flex: 1 },
    summaryNote: {
      fontFamily: 'Geist',
      fontSize: 12,
      lineHeight: 18,
      color: c.textSecondary,
      borderTopWidth: 1,
      borderColor: c.border,
      paddingTop: 16,
    },
    attention: {
      padding: 24,
      backgroundColor: c.primarySoft,
      borderRadius: tokens.radius.lg,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    attentionCopy: { flex: 1, minWidth: 160, gap: 8 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap',
      paddingTop: 8,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 20,
      paddingVertical: 12,
      minHeight: 48,
      minWidth: 48,
      maxWidth: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    quietButton: { backgroundColor: 'transparent', paddingHorizontal: 8 },
    buttonText: {
      fontFamily: 'GeistMedium',
      fontSize: type.label.size,
      lineHeight: type.label.lineHeight,
      color: c.onPrimary,
      textAlign: 'center',
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
    list: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    transaction: {
      padding: 16,
      gap: 8,
      borderBottomWidth: 1,
      borderColor: c.border,
      minHeight: 88,
    },
    transactionTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    merchantCircle: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.sm,
      backgroundColor: c.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    merchantLetter: { fontFamily: 'Newsreader', fontSize: 22, color: c.primary },
    transactionName: { flex: 1, minWidth: 120, gap: 4 },
    rowAmount: {
      fontFamily: 'GeistMedium',
      fontSize: 16,
      lineHeight: 24,
      fontVariant: ['tabular-nums'],
      color: c.textPrimary,
      flexShrink: 1,
    },
    transactionMeta: {
      marginLeft: 48,
      gap: 4,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryLabel: { fontFamily: 'GeistMedium', fontSize: 12, lineHeight: 18, color: c.primary },
    accountRow: {
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap',
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
    },
    accountName: { flex: 1, minWidth: 150, gap: 4 },
    footerNote: { gap: 16, paddingVertical: 24 },
    pageEnd: { gap: 4, paddingTop: 32, borderTopWidth: 1, borderColor: c.border, marginTop: 8 },
    detailMerchant: {
      fontFamily: 'GeistSemibold',
      fontSize: type.h2.size,
      lineHeight: type.h2.lineHeight,
      color: c.textPrimary,
    },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 8 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryOption: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.sm,
    },
    selectedOption: { backgroundColor: c.primarySoft, borderColor: c.primary },
    selectedText: { color: c.primary },
    scopeChoices: { gap: 12 },
    scopeChoice: {
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.md,
      minHeight: 64,
    },
    inputLabel: {
      color: c.textPrimary,
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },
    input: {
      fontFamily: 'Geist',
      fontSize: 16,
      color: c.textPrimary,
      padding: 16,
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
    },
    filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filter: {
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.sm,
    },
    empty: { padding: 24, gap: 16 },
    matchHeader: { gap: 12 },
    stateBadge: {
      fontFamily: 'GeistMedium',
      fontSize: 12,
      lineHeight: 18,
      color: c.primary,
      alignSelf: 'flex-start',
      backgroundColor: c.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: tokens.radius.pill,
    },
    matchTransactions: { borderTopWidth: 1, borderColor: c.border, marginHorizontal: -8 },
    actions: { gap: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    recurringAmount: { gap: 8 },
    errorBanner: {
      borderWidth: 1,
      borderColor: c.danger,
      backgroundColor: c.surface,
      padding: 20,
      borderRadius: tokens.radius.md,
      gap: 12,
    },
    errorText: { fontFamily: 'Geist', fontSize: 14, lineHeight: 20, color: c.danger },
    notice: {
      borderLeftWidth: 3,
      borderColor: c.success,
      padding: 16,
      backgroundColor: c.surface,
      gap: 8,
    },
    busy: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    confirmation: {
      borderWidth: 1,
      borderColor: c.danger,
      padding: 24,
      borderRadius: tokens.radius.lg,
      backgroundColor: c.surfaceElevated,
      gap: 16,
    },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
    exportPreview: {
      maxHeight: 220,
      padding: 16,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.sm,
    },
    exportText: { fontFamily: 'Geist', fontSize: 12, lineHeight: 18, color: c.textSecondary },
    tabBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: c.surfaceElevated,
      borderTopWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 4,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 2,
    },
    tab: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
      minWidth: 48,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 2,
      minHeight: 64,
      borderRadius: tokens.radius.md,
    },
    selectedTab: { backgroundColor: c.primarySoft },
    tabIcon: { fontFamily: 'Geist', fontSize: 22, lineHeight: 24, color: c.textSecondary },
    tabLabel: {
      color: c.textSecondary,
      fontFamily: 'GeistMedium',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      textAlign: 'center',
      flexShrink: 1,
    },
  })
}
