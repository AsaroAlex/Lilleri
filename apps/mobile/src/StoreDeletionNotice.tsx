import type { ApiClient, BillingDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text } from 'react-native'
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import { useI18n } from './i18n/context'
import { manageStoreSubscription } from './store-purchases'

const STORES = { app_store: 'App Store', play_store: 'Google Play' } as const

/**
 * Before profile deletion: an App Store or Google Play subscription keeps billing through the store
 * (Lilleri cannot stop it), so the person is told and offered the store's management page first.
 */
export function StoreDeletionNotice({
  api,
  theme,
  resetKey,
}: {
  readonly api: Pick<ApiClient, 'billing'>
  readonly theme: BrandTheme
  readonly resetKey: number | string
}) {
  const { t } = useI18n()
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const scope = String(resetKey)
  const current = useRef(scope)
  current.current = scope
  const [billing, setBilling] = useState<{ scope: string; value: BillingDto } | null>(null)
  useEffect(() => {
    const abort = new AbortController()
    const scopeAtStart = String(resetKey)
    void api.billing(abort.signal).then(
      (value) => {
        if (!abort.signal.aborted && current.current === scopeAtStart)
          setBilling({ scope: scopeAtStart, value })
      },
      () => {},
    )
    return () => abort.abort()
  }, [api, resetKey])
  const value = billing?.scope === scope ? billing.value : null
  const channel = value?.plan === 'plus' ? value.channel : null
  if (!value || (channel !== 'app_store' && channel !== 'play_store')) return null
  const store = STORES[channel]
  return (
    <AccessibleStatus urgent style={s.notice} testID="store-deletion-notice">
      <Text style={s.body}>{t('subscription.deleteStoreWarning', { store })}</Text>
      {Platform.OS !== 'web' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void manageStoreSubscription(value.managementUrl).catch(() => {})}
          style={s.action}
        >
          <Text style={s.link}>{t('subscription.manageStore', { store })}</Text>
        </Pressable>
      )}
    </AccessibleStatus>
  )
}

function makeStyles(c: (typeof colors)['light'] | (typeof colors)['dark']) {
  return StyleSheet.create({
    notice: {
      gap: 8,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.warning,
      backgroundColor: c.surface,
    },
    body: { color: c.textPrimary, fontSize: 15, lineHeight: 22 },
    action: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    link: { color: c.primary, fontSize: 15, fontWeight: '600' },
  })
}
