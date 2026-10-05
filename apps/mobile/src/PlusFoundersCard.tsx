import type { ApiClient, PlusWaitlistDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import { useI18n } from './i18n/context'

export interface PlusFoundersCardProps {
  readonly api: Pick<ApiClient, 'plusWaitlist' | 'joinPlusWaitlist' | 'leavePlusWaitlist'>
  readonly theme: BrandTheme
  /** Identity epoch from the parent; a session change discards every pending read. */
  readonly resetKey: number | string
  readonly onError?: (cause: unknown) => boolean
}

/**
 * "Plus Fondatori": while Plus cannot be bought, the owner can ask for a single e-mail when it
 * opens. Renders nothing when the list is not offered and the profile is not on it.
 */
export function PlusFoundersCard({ api, theme, resetKey, onError }: PlusFoundersCardProps) {
  const { t } = useI18n()
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const scope = String(resetKey)
  const [state, setState] = useState<{ scope: string; value: PlusWaitlistDto | null }>({
    scope: '',
    value: null,
  })
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const current = useRef(scope)
  current.current = scope
  const handlers = useRef({ onError })
  handlers.current = { onError }

  useEffect(() => {
    const abort = new AbortController()
    const scopeAtStart = String(resetKey)
    void api.plusWaitlist(abort.signal).then(
      (value) => {
        if (!abort.signal.aborted && current.current === scopeAtStart)
          setState({ scope: scopeAtStart, value })
      },
      (cause: unknown) => {
        if (abort.signal.aborted || current.current !== scopeAtStart) return
        handlers.current.onError?.(cause)
      },
    )
    return () => abort.abort()
  }, [api, resetKey])

  const value = state.scope === scope ? state.value : null
  if (!value || (!value.offered && !value.joined)) return null

  const change = async (action: 'join' | 'leave') => {
    if (busy) return
    const scopeAtStart = current.current
    setBusy(true)
    setFailed(null)
    try {
      const next = action === 'join' ? await api.joinPlusWaitlist() : await api.leavePlusWaitlist()
      if (current.current === scopeAtStart) setState({ scope: scopeAtStart, value: next })
    } catch (cause) {
      if (current.current !== scopeAtStart || handlers.current.onError?.(cause)) return
      setFailed(scopeAtStart)
    } finally {
      if (current.current === scopeAtStart) setBusy(false)
    }
  }

  return (
    <View testID="plus-founders" style={s.card}>
      <Text accessibilityRole="header" aria-level={3} style={s.title}>
        {t('founders.title')}
      </Text>
      {value.joined && !value.notified ? (
        <>
          <Text style={s.strong}>{t('founders.joined')}</Text>
          {value.position !== null && (
            <Text style={s.body}>{t('founders.position', { position: value.position })}</Text>
          )}
          <Text style={s.body}>{t('founders.waiting')}</Text>
          <Text style={s.caption}>{t('founders.promise')}</Text>
          <Pressable
            testID="plus-founders-leave"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            aria-disabled={busy}
            disabled={busy}
            onPress={() => void change('leave')}
            style={[s.quiet, busy && s.disabled]}
          >
            <Text style={s.quietText}>{t('founders.leave')}</Text>
          </Pressable>
        </>
      ) : value.joined ? (
        <Text style={s.body}>{t('founders.notified')}</Text>
      ) : (
        <>
          <Text style={s.body}>{t('founders.offer')}</Text>
          <Text style={s.caption}>{t('founders.promise')}</Text>
          <Pressable
            testID="plus-founders-join"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            aria-disabled={busy}
            disabled={busy}
            onPress={() => void change('join')}
            style={[s.primary, busy && s.disabled]}
          >
            <Text style={s.primaryText}>{t('founders.join')}</Text>
          </Pressable>
        </>
      )}
      {busy && (
        <AccessibleStatus style={s.inline}>
          <ActivityIndicator color={c.primary} size="small" />
          <Text style={s.body}>{t('founders.saving')}</Text>
        </AccessibleStatus>
      )}
      {failed === scope && (
        <AccessibleStatus urgent>
          <Text style={s.error}>{t('founders.failed')}</Text>
        </AccessibleStatus>
      )}
    </View>
  )
}

function makeStyles(c: (typeof colors)['light'] | (typeof colors)['dark']) {
  return StyleSheet.create({
    card: {
      gap: 10,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    title: { color: c.textPrimary, fontSize: 18, fontWeight: '600' },
    strong: { color: c.textPrimary, fontSize: 16, fontWeight: '600' },
    body: { color: c.textPrimary, fontSize: 15, lineHeight: 22 },
    caption: { color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    error: { color: c.danger, fontSize: 15, lineHeight: 22 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    primary: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    primaryText: { color: c.onPrimary, fontSize: 15, fontWeight: '600' },
    quiet: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    quietText: { color: c.primary, fontSize: 15, fontWeight: '600' },
    disabled: { opacity: 0.5 },
  })
}
