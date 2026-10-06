import type { ApiClient, BillingDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import {
  type BillingProblem,
  billingDate,
  billingProblem,
  formatPlanPrice,
  PLUS_CONFIRMATION_POLL_INTERVAL_MS,
  PLUS_CONFIRMATION_POLL_LIMIT_MS,
} from './hosted-flows'
import type { MessageKey } from './i18n'
import { useI18n } from './i18n/context'
import { PlusFoundersCard } from './PlusFoundersCard'
import { StorePlusCard } from './StorePlusCard'
import { leaveForSecureUrl } from './secure-redirect'
import { manageStoreSubscription } from './store-purchases'

export interface SubscriptionPanelProps {
  readonly api: Pick<
    ApiClient,
    | 'billing'
    | 'startCheckout'
    | 'openBillingPortal'
    | 'refreshStorePurchase'
    | 'plusWaitlist'
    | 'joinPlusWaitlist'
    | 'leavePlusWaitlist'
  >
  readonly theme: BrandTheme
  /** Identity epoch from the parent; a session change discards every pending billing read. */
  readonly resetKey: number | string
  /** Only the profile owner may buy or manage the subscription; the server enforces it too. */
  readonly owner: boolean
  /** A new value after a successful checkout waits for the payment webhook to switch the plan. */
  readonly confirmPlusRequest?: number
  /** Called whenever the server reports Plus, so stale "waiting for payment" notices can close. */
  readonly onPlusConfirmed?: () => void
  readonly onError?: (cause: unknown) => boolean
  /** Native apps: the profile store purchases belong to (RevenueCat app user id). */
  readonly profileId?: string | null
  /** Native apps: absolute Terms and Privacy links shown next to the store offer. */
  readonly legal?: { readonly termsUrl: string | null; readonly privacyUrl: string | null }
}
/** Apps sell Plus through the App Store / Google Play; the website uses Stripe Checkout. */
const NATIVE = Platform.OS !== 'web'
const STORE_LABELS = { app_store: 'App Store', play_store: 'Google Play' } as const
type Confirmation = 'waiting' | 'confirmed' | 'slow' | null
type Problem =
  | { readonly kind: Exclude<BillingProblem, 'unknown'> | 'unsafe_redirect' }
  | { readonly kind: 'unknown'; readonly code: string | null }
const paymentAttention = new Set(['past_due', 'unpaid', 'incomplete'])
const gratisFeatures: readonly MessageKey[] = [
  'subscription.gratisManual',
  'subscription.gratisImport',
  'subscription.gratisRules',
  'subscription.gratisExport',
  'subscription.gratisDeletion',
]
const plusFeatures: readonly MessageKey[] = [
  'subscription.plusBanks',
  'subscription.plusEverything',
]

/** Plan comparison, Stripe checkout and the billing portal. Prices always come from the server. */
export function SubscriptionPanel({
  api,
  theme,
  resetKey,
  owner,
  confirmPlusRequest = 0,
  onPlusConfirmed,
  onError,
  profileId = null,
  legal = { termsUrl: null, privacyUrl: null },
}: SubscriptionPanelProps) {
  const i18n = useI18n()
  const { t } = i18n
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const [attempt, setAttempt] = useState(0)
  const [billing, setBilling] = useState<{
    readonly scope: string
    readonly key: string
    readonly value: BillingDto | null
    readonly failed: boolean
  }>({ scope: '', key: '', value: null, failed: false })
  const [busy, setBusy] = useState<'month' | 'year' | 'portal' | null>(null)
  const [problemState, setProblemState] = useState<{ scope: string; value: Problem } | null>(null)
  const [confirmation, setConfirmation] = useState<{ key: string; state: Confirmation }>({
    key: '',
    state: null,
  })
  // A store purchase waits for the server to report Plus, like a Stripe checkout return.
  const [storeConfirm, setStoreConfirm] = useState(0)
  const confirmRequest = confirmPlusRequest || storeConfirm
  const scope = String(resetKey)
  const loadKey = `${scope}:${attempt}`
  const current = useRef({ scope, loadKey })
  current.current = { scope, loadKey }
  const problem = problemState?.scope === scope ? problemState.value : null
  const setProblem = (value: Problem | null) =>
    setProblemState(value ? { scope: current.current.scope, value } : null)
  const handlers = useRef({ onError, onPlusConfirmed })
  handlers.current = { onError, onPlusConfirmed }
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    const scopeAtStart = String(resetKey)
    const key = `${scopeAtStart}:${attempt}`
    void api.billing(abort.signal).then(
      (value) => {
        if (abort.signal.aborted || current.current.loadKey !== key) return
        setBilling({ scope: scopeAtStart, key, value, failed: false })
        if (value.plan === 'plus') handlers.current.onPlusConfirmed?.()
      },
      (cause: unknown) => {
        if (abort.signal.aborted || current.current.loadKey !== key) return
        if (handlers.current.onError?.(cause)) return
        setBilling({ scope: scopeAtStart, key, value: null, failed: true })
      },
    )
    return () => abort.abort()
  }, [api, resetKey, attempt])

  // After checkout, the plan switches when the payment webhook arrives: poll for a bounded time.
  useEffect(() => {
    if (!confirmRequest) return
    const scopeAtStart = String(resetKey)
    const key = `${scopeAtStart}:${confirmRequest}`
    const started = Date.now()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const live = () => !cancelled && mounted.current && current.current.scope === scopeAtStart
    setConfirmation({ key, state: 'waiting' })
    const poll = async () => {
      timer = null
      try {
        const value = await api.billing()
        if (!live()) return
        setBilling({ scope: scopeAtStart, key: current.current.loadKey, value, failed: false })
        if (value.plan === 'plus') {
          setConfirmation({ key, state: 'confirmed' })
          handlers.current.onPlusConfirmed?.()
          return
        }
      } catch (cause) {
        if (!live() || handlers.current.onError?.(cause)) return
      }
      if (Date.now() - started >= PLUS_CONFIRMATION_POLL_LIMIT_MS) {
        setConfirmation({ key, state: 'slow' })
        return
      }
      timer = setTimeout(() => void poll(), PLUS_CONFIRMATION_POLL_INTERVAL_MS)
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [api, resetKey, confirmRequest])
  // A page restored from the browser's back cache must not stay locked in "leaving".
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted && mounted.current) setBusy(null)
    }
    window.addEventListener('pageshow', restored)
    return () => window.removeEventListener('pageshow', restored)
  }, [])

  // A refresh keeps the last confirmed state of this profile visible until the new one arrives.
  const value = billing.scope === scope ? billing.value : null
  const failed = billing.key === loadKey && billing.failed
  const confirmationState =
    confirmation.key === `${scope}:${confirmRequest}` ? confirmation.state : null
  const plus = value?.plan === 'plus'
  const monthly = formatPlanPrice(i18n, value?.prices.month, 'month')
  const yearly = formatPlanPrice(i18n, value?.prices.year, 'year')
  const periodEnd = billingDate(value?.currentPeriodEnd)
  const notOwner = !owner || problem?.kind === 'not_owner'
  const purchaseDisabled = !value?.purchaseAvailable || notOwner || busy !== null
  const problemText = !problem
    ? null
    : problem.kind === 'unknown'
      ? i18n.problemMessage(problem.code ?? '')
      : problem.kind === 'unsafe_redirect'
        ? t('subscription.unsafeRedirect')
        : problem.kind === 'already_subscribed'
          ? t('subscription.alreadySubscribed')
          : problem.kind === 'no_billing_account'
            ? t('subscription.noBillingAccount')
            : null

  const leave = async (action: 'month' | 'year' | 'portal') => {
    if (busy || notOwner) return
    const scopeAtStart = current.current.scope
    setBusy(action)
    setProblem(null)
    let leaving = false
    try {
      const result =
        action === 'portal' ? await api.openBillingPortal() : await api.startCheckout(action)
      if (!mounted.current || current.current.scope !== scopeAtStart) return
      const outcome = leaveForSecureUrl(result?.url)
      leaving = outcome === 'left'
      if (outcome === 'blocked') setProblem({ kind: 'unsafe_redirect' })
    } catch (cause) {
      if (!mounted.current || current.current.scope !== scopeAtStart) return
      if (handlers.current.onError?.(cause)) return
      const kind = billingProblem(cause)
      setProblem(
        kind === 'unknown'
          ? {
              kind,
              code:
                cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : null,
            }
          : { kind },
      )
      if (kind === 'already_subscribed') setAttempt((previous) => previous + 1)
    } finally {
      if (mounted.current && current.current.scope === scopeAtStart && !leaving) setBusy(null)
    }
  }

  const button = (
    label: string,
    onPress: () => void,
    options: {
      primary?: boolean
      disabled?: boolean
      accessibilityLabel?: string
      testID?: string
    },
  ) => (
    <Pressable
      testID={options.testID}
      accessibilityRole="button"
      accessibilityLabel={options.accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!options.disabled }}
      aria-disabled={!!options.disabled}
      disabled={!!options.disabled}
      onPress={onPress}
      style={[
        s.button,
        options.primary ? s.primaryButton : s.secondaryButton,
        options.disabled && s.disabled,
      ]}
    >
      <Text style={options.primary ? s.primaryText : s.secondaryText}>{label}</Text>
    </Pressable>
  )
  const features = (keys: readonly MessageKey[]) => (
    <View style={s.features}>
      {keys.map((key) => (
        <View key={key} style={s.featureRow}>
          <Text aria-hidden={true} style={s.featureMark}>
            ✓
          </Text>
          <Text style={s.body}>{t(key)}</Text>
        </View>
      ))}
    </View>
  )

  if (!value)
    return (
      <View style={s.panel}>
        {failed ? (
          <AccessibleStatus urgent style={s.card}>
            <Text style={s.body}>{t('subscription.loadFailed')}</Text>
            {button(t('subscription.retry'), () => setAttempt((previous) => previous + 1), {})}
          </AccessibleStatus>
        ) : (
          <AccessibleStatus style={s.inline}>
            <ActivityIndicator color={c.primary} />
            <Text style={s.body}>{t('subscription.loading')}</Text>
          </AccessibleStatus>
        )}
      </View>
    )

  return (
    <View testID="subscription-panel" style={s.panel}>
      {confirmationState === 'waiting' && (
        <AccessibleStatus style={s.inline}>
          <ActivityIndicator color={c.primary} size="small" />
          <Text style={s.body}>{t('subscription.confirming')}</Text>
        </AccessibleStatus>
      )}
      {confirmationState === 'confirmed' && (
        <AccessibleStatus style={s.success}>
          <Text style={s.strong}>{t('subscription.confirmed')}</Text>
        </AccessibleStatus>
      )}
      {confirmationState === 'slow' && (
        <AccessibleStatus style={s.card}>
          <Text style={s.body}>{t('subscription.confirmSlow')}</Text>
          {button(t('subscription.refresh'), () => setAttempt((previous) => previous + 1), {})}
        </AccessibleStatus>
      )}
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
          {t('subscription.currentHeading')}
        </Text>
        <Text style={s.strong}>
          {t(
            !plus
              ? 'subscription.currentGratis'
              : value.interval === 'month'
                ? 'subscription.currentPlusMonthly'
                : value.interval === 'year'
                  ? 'subscription.currentPlusYearly'
                  : 'subscription.currentPlus',
          )}
        </Text>
        {plus &&
          (value.cancelAtPeriodEnd ? (
            <Text style={s.body}>
              {periodEnd
                ? t('subscription.endsAt', { date: periodEnd })
                : t('subscription.endsAtPeriodEnd')}
            </Text>
          ) : (
            periodEnd && <Text style={s.body}>{t('subscription.renews', { date: periodEnd })}</Text>
          ))}
        {plus && value.status && paymentAttention.has(value.status) && (
          <Text style={s.warning}>{t('subscription.paymentAttention')}</Text>
        )}
        {plus &&
          (value.channel === 'app_store' || value.channel === 'play_store' ? (
            NATIVE ? (
              button(
                t('subscription.manageStore', { store: STORE_LABELS[value.channel] }),
                () => void manageStoreSubscription(value.managementUrl).catch(() => {}),
                { primary: true, testID: 'subscription-store-manage' },
              )
            ) : (
              <Text style={s.caption}>
                {t('subscription.manageInStore', { store: STORE_LABELS[value.channel] })}
              </Text>
            )
          ) : value.channel === 'promotional' ? (
            <Text style={s.caption}>{t('subscription.promotional')}</Text>
          ) : NATIVE ? (
            // Store rules: the apps never link to the website's payment pages.
            <Text style={s.caption}>{t('subscription.manageOnWeb')}</Text>
          ) : (
            <>
              <Text style={s.caption}>{t('subscription.manageHelp')}</Text>
              {button(t('subscription.manage'), () => void leave('portal'), {
                primary: true,
                disabled: notOwner || busy !== null,
                testID: 'subscription-portal',
              })}
            </>
          ))}
      </View>
      <View style={s.plans}>
        <View style={[s.plan, !plus && s.currentPlan]}>
          <Text accessibilityRole="header" aria-level={3} style={s.planTitle}>
            {t('subscription.gratisTitle')}
          </Text>
          {!plus && <Text style={s.badge}>{t('subscription.currentBadge')}</Text>}
          <Text style={s.strong}>{t('subscription.gratisSummary')}</Text>
          {features(gratisFeatures)}
        </View>
        <View style={[s.plan, plus && s.currentPlan]}>
          <Text accessibilityRole="header" aria-level={3} style={s.planTitle}>
            {t('subscription.plusTitle')}
          </Text>
          {plus && <Text style={s.badge}>{t('subscription.currentBadge')}</Text>}
          <View style={s.prices}>
            <Text style={s.price} accessibilityLabel={monthly?.accessible}>
              {monthly?.text ?? t('subscription.priceUnavailable')}
            </Text>
            {yearly && (
              <Text style={s.price} accessibilityLabel={yearly.accessible}>
                {yearly.text}
              </Text>
            )}
            {(monthly || yearly) && <Text style={s.caption}>{t('subscription.vatIncluded')}</Text>}
          </View>
          {features(plusFeatures)}
          {!plus && NATIVE && (
            <StorePlusCard
              api={api}
              theme={theme}
              profileId={profileId}
              resetKey={resetKey}
              available={value.storePurchaseAvailable && !notOwner}
              legal={legal}
              onPurchased={() => setStoreConfirm(Date.now())}
              {...(onError ? { onError } : {})}
            />
          )}
          {!plus && !NATIVE && (
            <>
              {!value.purchaseAvailable ? (
                <Text style={s.body}>{t('subscription.notAvailable')}</Text>
              ) : (
                <Text style={s.caption}>{t('subscription.checkoutHelp')}</Text>
              )}
              <View style={s.actions}>
                {button(t('subscription.chooseMonthly'), () => void leave('month'), {
                  primary: true,
                  disabled: purchaseDisabled || !monthly,
                  testID: 'subscription-checkout-month',
                  accessibilityLabel: monthly
                    ? t('subscription.choosePriced', {
                        plan: t('subscription.chooseMonthly'),
                        price: monthly.accessible,
                      })
                    : t('subscription.chooseMonthly'),
                })}
                {button(t('subscription.chooseYearly'), () => void leave('year'), {
                  disabled: purchaseDisabled || !yearly,
                  testID: 'subscription-checkout-year',
                  accessibilityLabel: yearly
                    ? t('subscription.choosePriced', {
                        plan: t('subscription.chooseYearly'),
                        price: yearly.accessible,
                      })
                    : t('subscription.chooseYearly'),
                })}
              </View>
            </>
          )}
        </View>
      </View>
      {!plus && !(NATIVE ? value.storePurchaseAvailable : value.purchaseAvailable) && !notOwner && (
        <PlusFoundersCard
          api={api}
          theme={theme}
          resetKey={resetKey}
          {...(onError ? { onError } : {})}
        />
      )}
      {notOwner && (
        <AccessibleStatus>
          <Text style={s.body}>{t('subscription.ownerOnly')}</Text>
        </AccessibleStatus>
      )}
      {busy && (
        <AccessibleStatus style={s.inline}>
          <ActivityIndicator color={c.primary} size="small" />
          <Text style={s.body}>
            {t(busy === 'portal' ? 'subscription.portalRedirecting' : 'subscription.redirecting')}
          </Text>
        </AccessibleStatus>
      )}
      {problemText && (
        <AccessibleStatus urgent>
          <Text style={s.error}>{problemText}</Text>
        </AccessibleStatus>
      )}
    </View>
  )
}

function makeStyles(c: (typeof colors)['light'] | (typeof colors)['dark']) {
  return StyleSheet.create({
    panel: { gap: 16, minWidth: 0 },
    card: {
      gap: 12,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    success: {
      padding: 16,
      gap: 8,
      borderLeftWidth: 3,
      borderColor: c.success,
      backgroundColor: c.surface,
    },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    sectionTitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 18,
      lineHeight: 26,
    },
    plans: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    plan: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 260,
      minWidth: 0,
      gap: 12,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    currentPlan: { borderColor: c.primary, borderWidth: 2 },
    planTitle: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 20, lineHeight: 28 },
    badge: {
      alignSelf: 'flex-start',
      color: c.primary,
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontFamily: 'GeistMedium',
      fontSize: 12,
      lineHeight: 18,
    },
    prices: { gap: 4 },
    price: {
      color: c.textPrimary,
      fontFamily: 'GeistMedium',
      fontSize: 18,
      lineHeight: 26,
      fontVariant: ['tabular-nums'],
    },
    features: { gap: 8 },
    featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    featureMark: { color: c.success, fontSize: 15, lineHeight: 23, width: 18 },
    body: {
      color: c.textSecondary,
      fontFamily: 'Geist',
      fontSize: 15,
      lineHeight: 23,
      flexShrink: 1,
    },
    strong: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 15,
      lineHeight: 23,
      flexShrink: 1,
    },
    caption: {
      color: c.textSecondary,
      fontFamily: 'Geist',
      fontSize: 13,
      lineHeight: 20,
      flexShrink: 1,
    },
    warning: { color: c.warning, fontFamily: 'GeistMedium', fontSize: 15, lineHeight: 23 },
    error: { color: c.danger, fontFamily: 'Geist', fontSize: 15, lineHeight: 23 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    button: {
      minHeight: 44,
      maxWidth: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    primaryButton: { backgroundColor: c.primary },
    secondaryButton: { borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
    disabled: { opacity: 0.5 },
    primaryText: {
      color: c.onPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    secondaryText: {
      color: c.primary,
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  })
}
