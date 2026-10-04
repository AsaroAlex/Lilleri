import {
  ApiError,
  createPendingLifecycleClient,
  type PendingLifecycleDto,
  type SourceRemovalDto,
  type TransactionDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { MessageKey } from './i18n'
import { useI18n } from './i18n/context'
import { displayMessage, displayProblem } from './i18n/ui-message'

interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly profileId: string
  readonly resetKey: number
  readonly transactions: readonly TransactionDto[]
  readonly theme: BrandTheme
  readonly disabled: boolean
  readonly onChanged: () => Promise<void> | void
  readonly onError: (cause: unknown) => boolean
}
interface State {
  epoch: number
  pending: readonly PendingLifecycleDto[]
  removals: readonly SourceRemovalDto[]
  loading: boolean
  busy: boolean
  error: unknown | null
  notice: MessageKey | null
  confirmId: string | null
  visible: number
}
const empty = (epoch: number): State => ({
  epoch,
  pending: [],
  removals: [],
  loading: true,
  busy: false,
  error: null,
  notice: null,
  confirmId: null,
  visible: 20,
})
const pendingState: Record<
  Exclude<PendingLifecycleDto['state'], 'amount_change_review'>,
  MessageKey
> = {
  active: 'source.active',
  replaced: 'source.replaced',
  expired: 'source.expired',
  cancelled: 'source.cancelled',
  reversed: 'source.reversed',
}

/** Explicit decisions use fresh source proofs; a conflict refreshes without replaying a write. */
export function SourceDecisionsPanel({
  request,
  profileId,
  resetKey,
  transactions,
  theme,
  disabled,
  onChanged,
  onError,
}: Props) {
  const i18n = useI18n(),
    { t } = i18n
  const c = colors[theme]
  const s = useMemo(
    () =>
      StyleSheet.create({
        panel: { gap: 12, marginVertical: 16 },
        card: { padding: 16, gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
        title: { color: c.textPrimary, fontSize: 18, fontWeight: '600' },
        body: { color: c.textPrimary, fontSize: 15 },
        caption: { color: c.textSecondary, fontSize: 13 },
        actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        button: {
          borderWidth: 1,
          borderColor: c.border,
          padding: 12,
          minHeight: 44,
          borderRadius: 8,
        },
        disabled: { opacity: 0.5 },
      }),
    [c],
  )
  const client = useMemo(() => createPendingLifecycleClient(request), [request])
  const scope = `${profileId}:${resetKey}`
  const identity = useRef({ scope, request, epoch: 0 })
  if (identity.current.scope !== scope || identity.current.request !== request)
    identity.current = { scope, request, epoch: identity.current.epoch + 1 }
  const epoch = identity.current.epoch
  const mounted = useRef(true),
    busy = useRef<number | null>(null)
  const handlers = useRef({ onChanged, onError })
  handlers.current = { onChanged, onError }
  const [state, setState] = useState(() => empty(epoch))
  const view = state.epoch === epoch ? state : empty(epoch)
  const current = useCallback(
    (captured: number) => mounted.current && identity.current.epoch === captured,
    [],
  )
  const patch = useCallback(
    (captured: number, update: Partial<State>) => {
      if (current(captured))
        setState((previous) => ({
          ...(previous.epoch === captured ? previous : empty(captured)),
          ...update,
          epoch: captured,
        }))
    },
    [current],
  )
  const report = useCallback(
    (captured: number, cause: unknown) => {
      if (!current(captured)) return
      if (handlers.current.onError(cause)) {
        patch(captured, { pending: [], removals: [], error: null, notice: null, confirmId: null })
        return
      }
      patch(captured, { error: cause })
    },
    [current, patch],
  )
  const reload = useCallback(
    async (captured: number) => {
      const [pending, removals] = await Promise.all([client.pending(), client.removals()])
      patch(captured, { pending, removals, confirmId: null })
    },
    [client, patch],
  )
  useEffect(() => {
    mounted.current = true
    void reload(epoch)
      .catch((cause) => report(epoch, cause))
      .finally(() => patch(epoch, { loading: false }))
    return () => {
      mounted.current = false
    }
  }, [epoch, reload, report, patch])
  const refresh = async () => {
    const captured = epoch
    patch(captured, { loading: true, error: null, notice: null })
    try {
      await reload(captured)
    } catch (cause) {
      report(captured, cause)
    } finally {
      patch(captured, { loading: false })
    }
  }
  const decide = async (action: () => Promise<unknown>) => {
    const captured = epoch
    if (disabled || busy.current === captured || !current(captured)) return
    busy.current = captured
    patch(captured, { busy: true, error: null, notice: null, confirmId: null })
    try {
      await action()
      if (!current(captured)) return
      await reload(captured)
      if (!current(captured)) return
      await handlers.current.onChanged()
      patch(captured, { notice: 'source.saved' })
    } catch (cause) {
      if (current(captured) && cause instanceof ApiError && cause.status === 409) {
        try {
          await reload(captured)
          patch(captured, { notice: 'source.stale' })
        } catch (failure) {
          report(captured, failure)
        }
      } else report(captured, cause)
    } finally {
      if (busy.current === captured) busy.current = null
      patch(captured, { busy: false })
    }
  }
  const button = (label: string, action: () => void, key = label) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || view.busy }}
      disabled={disabled || view.busy}
      onPress={action}
      style={[s.button, (disabled || view.busy) && s.disabled]}
    >
      <Text style={s.body}>{label}</Text>
    </Pressable>
  )
  const description = (id: string) =>
    transactions.find((row) => row.id === id)?.description || t('common.descriptionUnknown')
  const money = (minor: string, currency: string) =>
    i18n.money(fromJson({ amountMinor: minor, currency }))
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {t('source.title')}
      </Text>
      {view.loading && (
        <ActivityIndicator accessibilityLabel={t('common.loading')} color={c.primary} />
      )}
      {view.error !== null && (
        <View accessibilityRole="alert">
          <Text style={s.body}>
            {displayMessage(i18n, displayProblem(view.error, 'common.problem'))}
          </Text>
          {button(t('common.retry'), () => void refresh())}
        </View>
      )}
      {view.notice && (
        <Text accessibilityLiveRegion="polite" style={s.body}>
          {t(view.notice)}
        </Text>
      )}
      {!view.loading && !view.error && !view.pending.length && !view.removals.length && (
        <Text style={s.caption}>{t('source.empty')}</Text>
      )}
      {view.removals.slice(0, view.visible).map((row) => (
        <View key={`removal:${row.transactionId}`} style={s.card}>
          <Text style={s.title}>{t('source.removed')}</Text>
          <Text style={s.body}>{description(row.transactionId)}</Text>
          <Text style={s.caption}>{t('source.removedHelp')}</Text>
          {row.needsDecision ? (
            view.confirmId === row.transactionId ? (
              <>
                <Text style={s.body}>{t('source.confirmHelp')}</Text>
                <View style={s.actions}>
                  {button(
                    t('source.confirmRemove'),
                    () => void decide(() => client.decideRemoval(row, 'remove')),
                  )}
                  {button(t('common.cancel'), () => patch(epoch, { confirmId: null }))}
                </View>
              </>
            ) : (
              <View style={s.actions}>
                {button(
                  t('source.keep'),
                  () => void decide(() => client.decideRemoval(row, 'keep_manual')),
                )}
                {button(t('source.remove'), () => patch(epoch, { confirmId: row.transactionId }))}
              </View>
            )
          ) : (
            <>
              <Text style={s.body}>
                {t(row.choice === 'keep_manual' ? 'source.kept' : 'source.excluded')}
              </Text>
              {button(t('common.undo'), () => void decide(() => client.decideRemoval(row, 'undo')))}
            </>
          )}
        </View>
      ))}
      {view.pending.slice(0, view.visible).map((row) => (
        <View key={`pending:${row.transactionId}`} style={s.card}>
          <Text style={s.title}>
            {description(row.replacementTransactionId ?? row.transactionId)}
          </Text>
          <Text style={s.caption}>
            {t('source.firstSeen', { date: i18n.instant(row.firstSeenAt) })}
          </Text>
          {row.state === 'amount_change_review' && row.replacementAmountMinor !== null ? (
            <>
              <Text style={s.body}>
                {t('source.changed', {
                  pending: money(row.pendingAmountMinor, row.currency),
                  booked: money(row.replacementAmountMinor, row.currency),
                })}
              </Text>
              <Text style={s.caption}>{t('source.changedHelp')}</Text>
              {button(
                t('source.accept'),
                () => void decide(() => client.decidePending(row, 'accept')),
              )}
            </>
          ) : (
            row.state !== 'amount_change_review' && (
              <Text style={s.body}>{t(pendingState[row.state])}</Text>
            )
          )}
          {row.carried.length > 0 && <Text style={s.caption}>{t('source.carried')}</Text>}
          {row.state === 'replaced' &&
            row.replacementRevision !== null &&
            button(t('common.undo'), () => void decide(() => client.decidePending(row, 'undo')))}
        </View>
      ))}
      {(view.pending.length > view.visible || view.removals.length > view.visible) &&
        button(t('source.more'), () => patch(epoch, { visible: view.visible + 20 }))}
    </View>
  )
}
