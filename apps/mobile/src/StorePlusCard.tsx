import type { ApiClient } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import type { MessageKey } from './i18n'
import { useI18n } from './i18n/context'
import {
  purchaseStorePackage,
  restoreStorePurchases,
  STORE_NAME,
  STORE_PURCHASES,
  type StorePackage,
  storePackages,
} from './store-purchases'

export interface StorePlusCardProps {
  readonly api: Pick<ApiClient, 'refreshStorePurchase'>
  readonly theme: BrandTheme
  /** RevenueCat's app user id: the purchase belongs to this Lilleri profile. */
  readonly profileId: string | null
  /** Identity epoch from the parent; a session change discards pending store reads. */
  readonly resetKey: number | string
  /** The server allows a Plus purchase now (owner, no active subscription, capacity left). */
  readonly available: boolean
  /** Absolute links required next to an auto-renewable subscription offer. */
  readonly legal: { readonly termsUrl: string | null; readonly privacyUrl: string | null }
  /** A purchase or restore succeeded: the parent waits for the server to report Plus. */
  readonly onPurchased: () => void
  readonly onError?: (cause: unknown) => boolean
}
type Notice = { readonly key: MessageKey; readonly urgent?: boolean }

/** App Store / Google Play purchase of Plus through RevenueCat, with the store's own prices. */
export function StorePlusCard({
  api,
  theme,
  profileId,
  resetKey,
  available,
  legal,
  onPurchased,
  onError,
}: StorePlusCardProps) {
  const { t } = useI18n()
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const scope = `${resetKey}:${profileId ?? ''}`
  const current = useRef(scope)
  current.current = scope
  const handlers = useRef({ onError, onPurchased })
  handlers.current = { onError, onPurchased }
  const [offer, setOffer] = useState<{
    readonly scope: string
    readonly packages: readonly StorePackage[] | null
    readonly failed: boolean
  }>({ scope: '', packages: null, failed: false })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ readonly scope: string; readonly value: Notice } | null>(
    null,
  )
  const store = STORE_NAME ?? 'App Store'

  useEffect(() => {
    if (!STORE_PURCHASES || !profileId) return
    const scopeAtStart = `${resetKey}:${profileId}`
    let cancelled = false
    void storePackages(profileId).then(
      (packages) => {
        if (!cancelled && current.current === scopeAtStart)
          setOffer({ scope: scopeAtStart, packages, failed: false })
      },
      () => {
        if (!cancelled && current.current === scopeAtStart)
          setOffer({ scope: scopeAtStart, packages: null, failed: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [profileId, resetKey])

  if (!STORE_PURCHASES || !profileId)
    return <Text style={s.body}>{t('subscription.storeUnavailableHere')}</Text>
  const packages = offer.scope === scope ? offer.packages : null
  const failed = offer.scope === scope && offer.failed
  const shown = notice?.scope === scope ? notice.value : null
  const run = async (work: () => Promise<Notice | null>) => {
    if (busy) return
    const scopeAtStart = current.current
    setBusy(true)
    setNotice(null)
    try {
      const next = await work()
      if (current.current === scopeAtStart && next) setNotice({ scope: scopeAtStart, value: next })
    } catch (cause) {
      if (current.current !== scopeAtStart || handlers.current.onError?.(cause)) return
      setNotice({ scope: scopeAtStart, value: { key: 'subscription.storeFailed', urgent: true } })
    } finally {
      if (current.current === scopeAtStart) setBusy(false)
    }
  }
  // The server re-reads RevenueCat at once; if that is slow, the parent keeps polling the plan.
  const verify = async () => {
    try {
      return (await api.refreshStorePurchase()).plan
    } catch {
      return null
    }
  }
  const buy = (item: StorePackage) =>
    run(async () => {
      const outcome = await purchaseStorePackage(profileId, item.id)
      if (outcome === 'cancelled') return null
      if (outcome === 'pending') return { key: 'subscription.storePending' }
      await verify()
      handlers.current.onPurchased()
      return null
    })
  const restore = () =>
    run(async () => {
      await restoreStorePurchases(profileId)
      if ((await verify()) !== 'plus') return { key: 'subscription.storeNothingToRestore' }
      handlers.current.onPurchased()
      return { key: 'subscription.storeRestored' }
    })
  const link = (label: MessageKey, url: string | null) =>
    url ? (
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
        <Text style={s.link}>{t(label)}</Text>
      </Pressable>
    ) : null

  return (
    <View style={s.panel} testID="store-plus">
      {packages === null && !failed && (
        <AccessibleStatus style={s.inline}>
          <ActivityIndicator color={c.primary} size="small" />
          <Text style={s.body}>{t('subscription.storeLoading')}</Text>
        </AccessibleStatus>
      )}
      {failed && <Text style={s.body}>{t('subscription.storeOffersFailed')}</Text>}
      {packages && (
        <View style={s.actions}>
          {packages.map((item) => {
            const label = t(
              item.interval === 'month' ? 'subscription.storeMonthly' : 'subscription.storeYearly',
              { price: item.price },
            )
            const disabled = !available || busy
            return (
              <Pressable
                key={item.id}
                testID={`store-plus-${item.interval}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => void buy(item)}
                style={[
                  s.button,
                  item.interval === 'year' ? s.secondary : s.primary,
                  disabled && s.disabled,
                ]}
              >
                <Text style={item.interval === 'year' ? s.secondaryText : s.primaryText}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
      <Text style={s.caption}>{t('subscription.storeDisclosure', { store })}</Text>
      <View style={s.links}>
        {link('subscription.termsLink', legal.termsUrl)}
        {link('subscription.privacyLink', legal.privacyUrl)}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void restore()}
        style={s.quiet}
      >
        <Text style={s.link}>{t('subscription.storeRestore')}</Text>
      </Pressable>
      {busy && (
        <AccessibleStatus style={s.inline}>
          <ActivityIndicator color={c.primary} size="small" />
          <Text style={s.body}>{t('subscription.storeBusy', { store })}</Text>
        </AccessibleStatus>
      )}
      {shown && (
        <AccessibleStatus urgent={!!shown.urgent}>
          <Text style={shown.urgent ? s.error : s.body}>{t(shown.key, { store })}</Text>
        </AccessibleStatus>
      )}
    </View>
  )
}

function makeStyles(c: (typeof colors)['light'] | (typeof colors)['dark']) {
  return StyleSheet.create({
    panel: { gap: 12 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    body: { color: c.textPrimary, fontSize: 15, lineHeight: 22 },
    caption: { color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    error: { color: c.danger, fontSize: 15, lineHeight: 22 },
    actions: { gap: 10 },
    button: {
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 18,
      borderRadius: 10,
      borderWidth: 1,
    },
    primary: { backgroundColor: c.primary, borderColor: c.primary },
    secondary: { backgroundColor: c.surface, borderColor: c.border },
    primaryText: { color: c.onPrimary, fontSize: 15, fontWeight: '600' },
    secondaryText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
    disabled: { opacity: 0.5 },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    link: { color: c.primary, fontSize: 14, fontWeight: '600', paddingVertical: 8 },
    quiet: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  })
}
