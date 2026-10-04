import {
  ApiError,
  createPendingLifecycleClient,
  type PendingLifecycleDto,
  type SourceRemovalDto,
  type TransactionDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { fromJson } from '@lilleri/money'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { FinanceVisual } from './FinanceVisual'
import type { MessageKey } from './i18n'
import { useI18n } from './i18n/context'
import { displayMessage, displayProblem } from './i18n/ui-message'

interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly profileId: string
  readonly resetKey: number
  readonly refreshKey: unknown
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
  details: readonly string[]
  historyOpen: boolean
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
  details: [],
  historyOpen: false,
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
  refreshKey,
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
        panel: { gap: 16, marginVertical: 16 },
        heading: { gap: 6 },
        decision: { paddingVertical: 20, gap: 12, borderBottomWidth: 1, borderColor: c.border },
        title: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 18, lineHeight: 24 },
        body: { color: c.textPrimary, fontFamily: 'Geist', fontSize: 14, lineHeight: 21 },
        caption: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 13, lineHeight: 20 },
        kind: { color: c.textSecondary, fontFamily: 'GeistMedium', fontSize: 13, lineHeight: 20 },
        transaction: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        transactionCopy: { flex: 1, minWidth: 0, gap: 3 },
        description: {
          color: c.textPrimary,
          fontFamily: 'GeistMedium',
          fontSize: 16,
          lineHeight: 23,
        },
        amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
        amountColumn: { flexGrow: 1, flexShrink: 0, flexBasis: 180, gap: 3 },
        amount: {
          color: c.textPrimary,
          fontFamily: 'GeistSemibold',
          fontSize: 22,
          lineHeight: 30,
          fontVariant: ['tabular-nums'],
        },
        explanation: { maxWidth: 660, gap: 4 },
        actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
        button: {
          justifyContent: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          minHeight: 44,
          borderRadius: 8,
        },
        primaryButton: { backgroundColor: c.primary },
        primaryButtonText: {
          color: c.onPrimary,
          fontFamily: 'GeistMedium',
          fontSize: 14,
          lineHeight: 21,
        },
        secondaryButton: { backgroundColor: c.primarySoft },
        secondaryButtonText: {
          color: c.primary,
          fontFamily: 'GeistMedium',
          fontSize: 14,
          lineHeight: 21,
        },
        quietButton: { paddingHorizontal: 0 },
        quietButtonText: {
          color: c.primary,
          fontFamily: 'GeistMedium',
          fontSize: 14,
          lineHeight: 21,
        },
        confirmation: {
          padding: 14,
          gap: 12,
          borderLeftWidth: 3,
          borderColor: c.warning,
          backgroundColor: c.surface,
        },
        historyButton: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 44,
          gap: 12,
        },
        historyRow: { paddingVertical: 14, gap: 5, borderBottomWidth: 1, borderColor: c.border },
        notice: { color: c.success, fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 21 },
        warningNotice: { color: c.warning },
        detail: { gap: 5, paddingTop: 4 },
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
  const readTicket = useRef(0)
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
      const ticket = ++readTicket.current
      try {
        const [pending, removals] = await Promise.all([client.pending(), client.removals()])
        if (ticket === readTicket.current) patch(captured, { pending, removals, confirmId: null })
      } catch (cause) {
        if (ticket === readTicket.current && current(captured)) throw cause
      }
    },
    [client, current, patch],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: A refreshed authoritative overview requires a new source read.
  useEffect(() => {
    mounted.current = true
    patch(epoch, { loading: true, error: null })
    const ticket = readTicket.current + 1
    void reload(epoch)
      .catch((cause) => report(epoch, cause))
      .finally(() => {
        if (ticket === readTicket.current) patch(epoch, { loading: false })
      })
    return () => {
      mounted.current = false
    }
  }, [epoch, reload, report, patch, refreshKey])
  const refresh = async () => {
    const captured = epoch
    const ticket = readTicket.current + 1
    patch(captured, { loading: true, error: null, notice: null })
    try {
      await reload(captured)
    } catch (cause) {
      report(captured, cause)
    } finally {
      if (ticket === readTicket.current) patch(captured, { loading: false })
    }
  }
  const decide = async (action: () => Promise<unknown>) => {
    const captured = epoch
    if (disabled || view.loading || busy.current === captured || !current(captured)) return
    busy.current = captured
    patch(captured, { busy: true, error: null, notice: null, confirmId: null })
    try {
      await action()
      if (!current(captured)) return
      await reload(captured)
      if (!current(captured)) return
      await handlers.current.onChanged()
      patch(captured, { notice: 'source.saved', historyOpen: true })
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
  const button = (
    label: string,
    action: () => void,
    variant: 'primary' | 'secondary' | 'quiet' = 'secondary',
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || view.busy || view.loading }}
      disabled={disabled || view.busy || view.loading}
      onPress={action}
      style={[
        s.button,
        variant === 'primary'
          ? s.primaryButton
          : variant === 'quiet'
            ? s.quietButton
            : s.secondaryButton,
        (disabled || view.busy || view.loading) && s.disabled,
      ]}
    >
      <Text
        style={
          variant === 'primary'
            ? s.primaryButtonText
            : variant === 'quiet'
              ? s.quietButtonText
              : s.secondaryButtonText
        }
      >
        {label}
      </Text>
    </Pressable>
  )
  const description = (id: string) =>
    transactions.find((row) => row.id === id)?.description || t('common.descriptionUnknown')
  const money = (minor: string, currency: string) =>
    i18n.money(fromJson({ amountMinor: minor, currency }))
  const detail = (id: string, content: ReactNode) => {
    const expanded = view.details.includes(id)
    return (
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() =>
            patch(epoch, {
              details: expanded ? view.details.filter((key) => key !== id) : [...view.details, id],
            })
          }
          style={[s.button, s.quietButton]}
        >
          <Text style={s.quietButtonText}>
            {t(expanded ? 'source.hideDetails' : 'source.details')}
          </Text>
        </Pressable>
        {expanded && <View style={s.detail}>{content}</View>}
      </View>
    )
  }
  const changedPending = (
    row: PendingLifecycleDto,
  ): row is PendingLifecycleDto & { readonly replacementAmountMinor: string } =>
    row.state === 'amount_change_review' && row.replacementAmountMinor !== null
  const attentionPending = view.pending.filter(changedPending)
  const attentionRemovals = view.removals.filter((row) => row.needsDecision)
  const settledPending = view.pending.filter((row) => !changedPending(row))
  const settledRemovals = view.removals.filter((row) => !row.needsDecision)
  const historyCount = settledPending.length + settledRemovals.length
  const removalRow = (row: SourceRemovalDto, history = false) => (
    <View
      key={`removal:${row.transactionId}`}
      role="group"
      accessibilityLabel={row.transaction.description || t('common.descriptionUnknown')}
      style={history ? s.historyRow : s.decision}
    >
      <Text style={s.kind}>{t('source.removed')}</Text>
      <View style={s.transaction}>
        <FinanceVisual kind="bank" size={40} mode={theme} />
        <View style={s.transactionCopy}>
          <Text style={s.description}>
            {row.transaction.description || t('common.descriptionUnknown')}
          </Text>
          <Text style={s.caption}>
            {i18n.calendarDate(row.transaction.bookedOn ?? row.transaction.authorizedOn)}
          </Text>
        </View>
      </View>
      <Text style={s.amount}>{money(row.transaction.amountMinor, row.transaction.currency)}</Text>
      {row.needsDecision ? (
        view.confirmId === row.transactionId ? (
          <View style={s.confirmation}>
            <Text style={s.description}>{t('source.confirmQuestion')}</Text>
            <Text style={s.body}>{t('source.confirmHelp')}</Text>
            <View style={s.actions}>
              {button(
                t('source.confirmRemove'),
                () => void decide(() => client.decideRemoval(row, 'remove')),
                'primary',
              )}
              {button(t('common.cancel'), () => patch(epoch, { confirmId: null }), 'quiet')}
            </View>
          </View>
        ) : (
          <>
            <View style={s.explanation}>
              <Text style={s.description}>{t('source.removedQuestion')}</Text>
              <Text style={s.body}>{t('source.removedGuide')}</Text>
              <Text style={s.caption}>{t('source.reversible')}</Text>
            </View>
            <View style={s.actions}>
              {button(
                t('source.keep'),
                () => void decide(() => client.decideRemoval(row, 'keep_manual')),
                'primary',
              )}
              {button(t('source.remove'), () => patch(epoch, { confirmId: row.transactionId }))}
            </View>
          </>
        )
      ) : (
        <>
          <Text style={s.body}>
            {t(row.choice === 'keep_manual' ? 'source.kept' : 'source.excluded')}
          </Text>
          {button(
            t('common.undo'),
            () => void decide(() => client.decideRemoval(row, 'undo')),
            'quiet',
          )}
        </>
      )}
      {row.transaction.reference &&
        detail(
          `removal:${row.transactionId}`,
          <Text style={s.caption}>{row.transaction.reference}</Text>,
        )}
    </View>
  )
  const pendingRow = (row: PendingLifecycleDto, history = false) => (
    <View
      key={`pending:${row.transactionId}`}
      role="group"
      accessibilityLabel={description(row.replacementTransactionId ?? row.transactionId)}
      style={history ? s.historyRow : s.decision}
    >
      {!history && <Text style={s.kind}>{t('source.changedTitle')}</Text>}
      <View style={s.transaction}>
        <FinanceVisual kind={history ? 'transfer' : 'review'} size={40} mode={theme} />
        <View style={s.transactionCopy}>
          <Text style={s.description}>
            {description(row.replacementTransactionId ?? row.transactionId)}
          </Text>
          {history && row.state !== 'amount_change_review' && (
            <Text style={s.caption}>{t(pendingState[row.state])}</Text>
          )}
        </View>
      </View>
      {changedPending(row) ? (
        <>
          <View style={s.amounts}>
            <View style={s.amountColumn}>
              <Text style={s.caption}>{t('source.pendingAmount')}</Text>
              <Text style={s.amount}>{money(row.pendingAmountMinor, row.currency)}</Text>
            </View>
            <View style={s.amountColumn}>
              <Text style={s.caption}>{t('source.bookedAmount')}</Text>
              <Text style={s.amount}>{money(row.replacementAmountMinor, row.currency)}</Text>
            </View>
          </View>
          <View style={s.explanation}>
            <Text style={s.body}>{t('source.replacementEffect')}</Text>
          </View>
          <View style={s.actions}>
            {button(
              t('source.accept'),
              () => void decide(() => client.decidePending(row, 'accept')),
              'primary',
            )}
          </View>
        </>
      ) : (
        <Text style={s.body}>
          {money(row.replacementAmountMinor ?? row.pendingAmountMinor, row.currency)}
        </Text>
      )}
      {row.carried.length > 0 && <Text style={s.caption}>{t('source.carried')}</Text>}
      {row.state === 'replaced' &&
        row.replacementTransactionId !== row.transactionId &&
        row.replacementRevision !== null &&
        button(
          t('common.undo'),
          () => void decide(() => client.decidePending(row, 'undo')),
          'quiet',
        )}
      {detail(
        `pending:${row.transactionId}`,
        <>
          {changedPending(row) && <Text style={s.caption}>{t('source.changedHelp')}</Text>}
          <Text style={s.caption}>
            {t('source.firstSeen', { date: i18n.instant(row.firstSeenAt) })}
          </Text>
          {row.replacementTransactionId && row.replacementTransactionId !== row.transactionId && (
            <Text style={s.caption}>
              {t('source.originalDescription', { description: description(row.transactionId) })}
            </Text>
          )}
        </>,
      )}
    </View>
  )
  return (
    <View style={s.panel}>
      <View style={s.heading}>
        <Text accessibilityRole="header" aria-level={2} style={s.title}>
          {t('source.title')}
        </Text>
        {(attentionPending.length > 0 || attentionRemovals.length > 0) && (
          <Text style={s.caption}>{t('source.reviewIntro')}</Text>
        )}
      </View>
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
        <Text
          accessibilityLiveRegion="polite"
          style={[s.notice, view.notice === 'source.stale' && s.warningNotice]}
        >
          {t(view.notice)}
        </Text>
      )}
      {!view.loading && !view.error && !view.pending.length && !view.removals.length && (
        <Text style={s.caption}>{t('source.empty')}</Text>
      )}
      {attentionRemovals.slice(0, view.visible).map((row) => removalRow(row))}
      {attentionPending.slice(0, view.visible).map((row) => pendingRow(row))}
      {historyCount > 0 && (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: view.historyOpen }}
            onPress={() => patch(epoch, { historyOpen: !view.historyOpen })}
            style={s.historyButton}
          >
            <Text style={s.description}>{t('source.history', { count: historyCount })}</Text>
            <Text style={s.quietButtonText}>
              {t(view.historyOpen ? 'source.hide' : 'source.show')}
            </Text>
          </Pressable>
          {view.historyOpen && (
            <>
              {settledRemovals.slice(0, view.visible).map((row) => removalRow(row, true))}
              {settledPending.slice(0, view.visible).map((row) => pendingRow(row, true))}
            </>
          )}
        </View>
      )}
      {(attentionPending.length > view.visible ||
        attentionRemovals.length > view.visible ||
        (view.historyOpen &&
          (settledPending.length > view.visible || settledRemovals.length > view.visible))) &&
        button(t('source.more'), () => patch(epoch, { visible: view.visible + 20 }), 'quiet')}
    </View>
  )
}
