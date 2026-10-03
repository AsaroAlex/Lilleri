import type { DemoOverview, MoneyDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { fromJson, toDecimalString } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { MessageKey } from './src/i18n'
import { useI18n } from './src/i18n/context'
import {
  displayMessage,
  displayProblem,
  type UiMessage,
  UiValidationError,
} from './src/i18n/ui-message'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
interface Boundary {
  calculatedOn: string
  defaultHorizonOn: string
  maxHorizonOn: string
  policyVersion: string
}
interface MonthlyInsight {
  id: string
  currency: CurrencyCode
  status: 'complete' | 'partial'
  inputs: { transactionIds: string[]; fromOn: string; throughOn: string }
  calculation: {
    incomeMinor: string
    expensesMinor: string
    linkedRefundsMinor: string
    unresolvedCreditsMinor: string
    unresolvedDebitsMinor: string
    bookedTransactionCount: number
  }
  value: { netSpending: MoneyDto; netFlow: MoneyDto }
  reasons: string[]
  explanationIt: string
}
interface MonthlyResponse {
  month: string
  availableMonths: string[]
  profileTimezone: string
  insights: MonthlyInsight[]
  boundary: Boundary
  capture: {
    capturedAt: string
    inputDigest: string
    ledgerDigest: string
    privacyDigest: string
    policyVersion: string
  }
}
interface PreferenceValues {
  accountIds: string[]
  bufferByCurrency: Partial<Record<CurrencyCode, string>>
  horizon: { mode: 'month_end' } | { mode: 'date' | 'next_salary'; on: string }
}
interface Preferences {
  profileId: string
  revision: number
  digest: string
  updatedAt: string
  values: PreferenceValues
}
interface PreferenceEvent {
  id: string
  revision: number
  action: 'changed' | 'undone' | 'source_erased'
  payload: {
    before: PreferenceValues | null
    after: PreferenceValues
    undoOf: string | null
  } | null
}
interface PreferenceResponse {
  preferences: Preferences
  events: PreferenceEvent[]
}
interface SavedMonthly {
  id: string
  profileId: string
  capturedAt: string
  payload: {
    result: MonthlyResponse
    inputFacts: {
      transactions: {
        id: string
        amountMinor: string
        currency: CurrencyCode
        bookedOn: string | null
      }[]
    }
  } | null
}
interface SavedHistory {
  items: SavedMonthly[]
  nextCursor: string | null
}
interface SafeResult {
  currency: CurrencyCode
  status: 'available' | 'shortfall' | 'unavailable'
  value: MoneyDto | null
  horizonOn: string
  inputs: {
    pendingTransactionIds: string[]
    estimatedOccurrences: { seriesId: string; on: string; amountMinor: string }[]
    recurringEvidenceTransactionIds: string[]
    fulfilledOccurrenceTransactionIds: string[]
  }
  calculation: {
    includedBalanceMinor: string
    pendingOutflowsMinor: string | null
    estimatedUpcomingOutflowsMinor: string | null
    bufferMinor: string | null
    forecastIncomeAddedMinor: string
  }
  reasons: string[]
  explanationIt: string
}
interface SafeResponse {
  results: SafeResult[]
  boundary: Boundary
  observedLocalLedgerOnly: true
}
export interface UnderstandingPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly resetKey: string | number
  readonly onError?: (cause: unknown) => boolean
  readonly onOpenTransaction?: (id: string) => void
}
const reasonLabels: Readonly<Record<string, MessageKey>> = {
  coverage_partial: 'understanding.coveragePartial',
  coverage_unknown: 'understanding.coverageUnknown',
  missing_booked_date: 'understanding.missingDate',
  unresolved_refund: 'understanding.unresolvedRefund',
  unresolved_cash_flow: 'understanding.unresolvedFlow',
  reconciliation_requires_review: 'understanding.reconciliationReview',
  future_booked_date: 'understanding.futureDate',
  future_booked_data: 'understanding.futureDate',
  balance_meaning_unknown: 'understanding.balanceMeaning',
  balance_stale: 'understanding.balanceStale',
  balance_timestamp_invalid: 'understanding.balanceTimestamp',
  balance_timestamp_in_future: 'understanding.balanceFuture',
  card_balance_not_spendable_cash: 'understanding.cardBalance',
  pending_balance_semantics_unknown: 'understanding.pendingSemantics',
  private_outflow_coverage: 'understanding.privacyCoverage',
  private_recurring_coverage: 'understanding.privacyCoverage',
  unresolved_pending_reconciliation: 'understanding.pendingReconciliation',
  unresolved_recurring_occurrence: 'understanding.recurringReconciliation',
  overdue_recurring_occurrence: 'understanding.overdue',
  buffer_not_configured: 'understanding.bufferMissing',
  forecast_work_limit: 'understanding.workLimit',
}
function bufferMinor(value: string, currency: CurrencyCode) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized))
    throw new UiValidationError('understanding.invalidBuffer')
  try {
    return parseDecimal(normalized, currency).amountMinor.toString()
  } catch {
    throw new UiValidationError('understanding.bufferDecimals')
  }
}

/** Current observed month and an explicit cash estimate. Async state never crosses a principal epoch. */
export function UnderstandingPanel({
  overview,
  theme,
  request,
  resetKey,
  onError,
  onOpenTransaction,
}: UnderstandingPanelProps) {
  const i18n = useI18n()
  const i18nRef = useRef(i18n)
  i18nRef.current = i18n
  const displayMoney = (amountMinor: string, currency: CurrencyCode) =>
    i18n.money(fromJson({ amountMinor, currency }), { symbolPosition: 'before' })
  const readMoney = (amountMinor: string, currency: CurrencyCode) =>
    i18n.accessibleMoney(fromJson({ amountMinor, currency }))
  const displayDate = (value: string) => i18n.calendarDate(value)
  const displayMonth = (value: string) => i18n.calendarMonth(value)
  const c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const scopeKey = `${overview.profile.id}:${resetKey}`
  const epoch = useRef({ key: scopeKey, value: 0 })
  if (epoch.current.key !== scopeKey)
    epoch.current = { key: scopeKey, value: epoch.current.value + 1 }
  const mounted = useRef(true),
    monthTicket = useRef(0),
    safeTicket = useRef(0)
  const lastQuery = useRef<string | null>(null),
    lastOverview = useRef<DemoOverview | null>(overview),
    selectedMonth = useRef('')
  const currentOverview = useRef(overview)
  currentOverview.current = overview
  const [monthly, setMonthly] = useState<{
    key: string
    snapshot: DemoOverview
    data: MonthlyResponse
  } | null>(null)
  const [safeResult, setSafeResult] = useState<{
    key: string
    snapshot: DemoOverview
    data: SafeResponse
  } | null>(null)
  const [month, setMonth] = useState(''),
    [horizon, setHorizon] = useState('')
  const [horizonMode, setHorizonMode] = useState<'month_end' | 'date' | 'next_salary'>('month_end')
  const [selected, setSelected] = useState<string[]>([]),
    [buffers, setBuffers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false),
    [calculating, setCalculating] = useState(false),
    [error, setError] = useState<UiMessage | null>(null)
  const preferenceTicket = useRef(0),
    historyTicket = useRef(0),
    mutationBusy = useRef(false)
  const [persisting, setPersisting] = useState(false),
    [notice, setNotice] = useState<UiMessage | null>(null)
  const [savedPreferences, setSavedPreferences] = useState<{
    key: string
    data: PreferenceResponse
  } | null>(null)
  const [savedHistory, setSavedHistory] = useState<{
    key: string
    snapshot: DemoOverview
    data: SavedHistory
  } | null>(null)
  const currentPreferences = savedPreferences?.key === scopeKey ? savedPreferences.data : null
  const currentHistory =
    savedHistory?.key === scopeKey && savedHistory.snapshot === overview ? savedHistory.data : null
  const [openEvidence, setOpenEvidence] = useState<string | null>(null)
  const currentMonthly =
    monthly?.key === scopeKey && monthly.snapshot === overview ? monthly.data : null
  const currentSafe =
    safeResult?.key === scopeKey && safeResult.snapshot === overview ? safeResult.data : null
  const stillCurrent = useCallback(
    (captured: number) =>
      mounted.current && epoch.current.key === scopeKey && epoch.current.value === captured,
    [scopeKey],
  )
  const loadMonth = useCallback(
    async (requestedMonth?: string) => {
      const captured = epoch.current.value,
        ticket = ++monthTicket.current,
        snapshot = currentOverview.current
      setLoading(true)
      setError(null)
      try {
        const value = await request<MonthlyResponse>(
          `/v1/insights/monthly${requestedMonth ? `?month=${encodeURIComponent(requestedMonth)}` : ''}`,
        )
        if (
          !stillCurrent(captured) ||
          ticket !== monthTicket.current ||
          snapshot !== currentOverview.current
        )
          return
        setMonthly({ key: scopeKey, snapshot, data: value })
        setMonth(value.month)
        selectedMonth.current = value.month
        setHorizon((previous) => previous || value.boundary.defaultHorizonOn)
      } catch (cause) {
        if (
          stillCurrent(captured) &&
          ticket === monthTicket.current &&
          snapshot === currentOverview.current &&
          !onError?.(cause)
        )
          setError(displayProblem(cause, 'understanding.monthFailed'))
      } finally {
        if (
          stillCurrent(captured) &&
          ticket === monthTicket.current &&
          snapshot === currentOverview.current
        )
          setLoading(false)
      }
    },
    [request, scopeKey, stillCurrent, onError],
  )
  const loadEstimate = useCallback(
    async (query: string) => {
      const captured = epoch.current.value,
        ticket = ++safeTicket.current,
        snapshot = currentOverview.current
      setCalculating(true)
      setSafeResult(null)
      setError(null)
      try {
        const value = await request<SafeResponse>(`/v1/safe-to-spend?${query}`)
        if (
          stillCurrent(captured) &&
          ticket === safeTicket.current &&
          snapshot === currentOverview.current
        )
          setSafeResult({ key: scopeKey, snapshot, data: value })
      } catch (cause) {
        if (
          stillCurrent(captured) &&
          ticket === safeTicket.current &&
          snapshot === currentOverview.current &&
          !onError?.(cause)
        )
          setError(displayProblem(cause, 'understanding.estimateFailed'))
      } finally {
        if (
          stillCurrent(captured) &&
          ticket === safeTicket.current &&
          snapshot === currentOverview.current
        )
          setCalculating(false)
      }
    },
    [request, scopeKey, stillCurrent, onError],
  )
  const applyPreferences = useCallback(
    (value: PreferenceResponse) => {
      setSavedPreferences({ key: scopeKey, data: value })
      setSelected(value.preferences.values.accountIds)
      setBuffers(
        Object.fromEntries(
          Object.entries(value.preferences.values.bufferByCurrency).map(([currency, amount]) => [
            currency,
            toDecimalString(
              fromJson({ amountMinor: amount as string, currency: currency as CurrencyCode }),
            ),
          ]),
        ),
      )
      setHorizonMode(value.preferences.values.horizon.mode)
      setHorizon(
        value.preferences.values.horizon.mode === 'month_end'
          ? ''
          : value.preferences.values.horizon.on,
      )
      lastQuery.current = null
      safeTicket.current++
      setSafeResult(null)
    },
    [scopeKey],
  )
  const loadPreferences = useCallback(async () => {
    const captured = epoch.current.value,
      ticket = ++preferenceTicket.current
    try {
      const value = await request<PreferenceResponse>('/v1/understanding/preferences')
      if (stillCurrent(captured) && ticket === preferenceTicket.current) applyPreferences(value)
    } catch (cause) {
      if (stillCurrent(captured) && ticket === preferenceTicket.current && !onError?.(cause))
        setError(displayProblem(cause, 'understanding.preferencesFailed'))
    }
  }, [request, stillCurrent, onError, applyPreferences])
  const loadHistory = useCallback(
    async (cursor?: string) => {
      const captured = epoch.current.value,
        ticket = ++historyTicket.current,
        snapshot = currentOverview.current
      try {
        const value = await request<SavedHistory>(
          `/v1/insights/monthly/history${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`,
        )
        if (
          stillCurrent(captured) &&
          ticket === historyTicket.current &&
          snapshot === currentOverview.current
        )
          setSavedHistory((previous) => ({
            key: scopeKey,
            snapshot,
            data:
              cursor && previous?.key === scopeKey && previous.snapshot === snapshot
                ? { items: [...previous.data.items, ...value.items], nextCursor: value.nextCursor }
                : value,
          }))
      } catch (cause) {
        if (
          stillCurrent(captured) &&
          ticket === historyTicket.current &&
          snapshot === currentOverview.current &&
          !onError?.(cause)
        )
          setError(displayProblem(cause, 'understanding.historyFailed'))
      }
    },
    [request, scopeKey, stillCurrent, onError],
  )
  const mutatePersistence = async (
    action: () => Promise<unknown>,
    success: UiMessage,
    refreshPreferences = false,
  ) => {
    if (mutationBusy.current) return
    mutationBusy.current = true
    setPersisting(true)
    setNotice(null)
    setError(null)
    const captured = epoch.current.value,
      snapshot = currentOverview.current
    try {
      await action()
      if (!stillCurrent(captured) || snapshot !== currentOverview.current) return
      setNotice(success)
      if (refreshPreferences) await loadPreferences()
      await loadHistory()
    } catch (cause) {
      if (stillCurrent(captured) && snapshot === currentOverview.current) {
        const handled = onError?.(cause)
        if (cause && typeof cause === 'object' && 'status' in cause && cause.status === 409) {
          if (refreshPreferences) await loadPreferences()
          if (!stillCurrent(captured) || snapshot !== currentOverview.current) return
          await loadMonth(selectedMonth.current || undefined)
        }
        if (!handled && stillCurrent(captured) && snapshot === currentOverview.current)
          setError(displayProblem(cause, 'understanding.persistenceFailed'))
      }
    } finally {
      if (stillCurrent(captured)) {
        mutationBusy.current = false
        setPersisting(false)
      }
    }
  }
  useEffect(() => {
    mounted.current = true
    setMonthly(null)
    setSafeResult(null)
    setMonth('')
    setHorizon('')
    setSelected([])
    setBuffers({})
    setHorizonMode('month_end')
    setSavedPreferences(null)
    setSavedHistory(null)
    setNotice(null)
    setPersisting(false)
    mutationBusy.current = false
    preferenceTicket.current++
    historyTicket.current++
    setOpenEvidence(null)
    setError(null)
    setCalculating(false)
    lastQuery.current = null
    selectedMonth.current = ''
    lastOverview.current = null
    safeTicket.current++
    void loadMonth()
    void loadPreferences()
    void loadHistory()
    return () => {
      mounted.current = false
      monthTicket.current++
      safeTicket.current++
      preferenceTicket.current++
      historyTicket.current++
    }
  }, [loadMonth, loadPreferences, loadHistory])
  useEffect(() => {
    const previous = lastOverview.current
    lastOverview.current = overview
    if (!previous || previous === overview) return
    void loadMonth(selectedMonth.current || undefined)
    void loadHistory()
    setSafeResult(null)
    if (lastQuery.current) void loadEstimate(lastQuery.current)
  }, [overview, loadMonth, loadEstimate, loadHistory])
  const chosenCurrencies = [
    ...new Set(
      overview.accounts
        .filter((row) => selected.includes(row.id))
        .map((row) => row.balance.currency),
    ),
  ].sort()
  const invalidateEstimate = () => {
    lastQuery.current = null
    safeTicket.current++
    setSafeResult(null)
    setCalculating(false)
  }
  const calculate = async () => {
    if (calculating || !currentMonthly) return
    setError(null)
    setSafeResult(null)
    setOpenEvidence(null)
    if (!selected.length) {
      setError('understanding.chooseAccount')
      return
    }
    let exactBuffers: Record<string, string>
    try {
      exactBuffers = Object.fromEntries(
        chosenCurrencies.map((code) => [code, bufferMinor(buffers[code] ?? '', code)]),
      )
    } catch (cause) {
      setError(displayProblem(cause, 'understanding.checkAmounts'))
      return
    }
    const query = `accountIds=${encodeURIComponent(selected.join(','))}&horizonOn=${encodeURIComponent(horizonMode === 'month_end' ? currentMonthly.boundary.defaultHorizonOn : horizon)}&bufferByCurrency=${encodeURIComponent(JSON.stringify(exactBuffers))}`
    lastQuery.current = query
    await loadEstimate(query)
  }
  const button = (label: string, action: () => void, disabled = false, primary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={action}
      style={[s.button, primary && s.primary]}
    >
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  )
  const evidence = (key: string, ids: readonly string[]) => (
    <View style={s.stack}>
      {button(
        openEvidence === key
          ? i18nRef.current.t('understanding.closeEvidence')
          : i18nRef.current.t('understanding.openEvidence'),
        () => setOpenEvidence(openEvidence === key ? null : key),
      )}
      {openEvidence === key &&
        (ids.length ? (
          [...new Set(ids)].map((id) => {
            const row = overview.transactions.find((value) => value.id === id)
            return row ? (
              <Pressable
                key={id}
                accessibilityRole={onOpenTransaction ? 'button' : 'text'}
                accessibilityLabel={i18n.t('understanding.transactionAccessible', {
                  date:
                    row.bookedOn || row.authorizedOn
                      ? displayDate((row.bookedOn ?? row.authorizedOn) as string)
                      : i18n.t('understanding.unknownDay'),
                  merchant: row.merchantName || row.description,
                })}
                onPress={() => onOpenTransaction?.(id)}
                style={s.evidence}
              >
                <Text style={s.text}>{row.merchantName || row.description}</Text>
                <Text style={s.hint}>
                  {row.bookedOn || row.authorizedOn
                    ? displayDate((row.bookedOn ?? row.authorizedOn) as string)
                    : i18n.t('understanding.unknownDate')}{' '}
                  · {displayMoney(row.amount.amountMinor, row.amount.currency)}
                </Text>
              </Pressable>
            ) : (
              <Text key={id} style={s.hint}>
                {i18nRef.current.t('understanding.transactionChanged')}
              </Text>
            )
          })
        ) : (
          <Text style={s.hint}>{i18n.t('understanding.noBookedTransactions')}</Text>
        ))}
    </View>
  )
  const renderMonthlyInsight = (
    item: MonthlyInsight,
    insightMonth: string,
    referencePrefix: string,
  ) => (
    <View key={item.id} style={s.stack}>
      <Text style={s.title}>
        {item.currency} · {displayMonth(insightMonth)}
      </Text>
      <Text style={s.hint}>
        {displayDate(item.inputs.fromOn)} – {displayDate(item.inputs.throughOn)} ·{' '}
        {item.status === 'partial'
          ? i18nRef.current.t('understanding.partial')
          : i18nRef.current.t('understanding.localLedger')}
      </Text>
      <Text
        style={s.text}
        accessibilityLabel={i18n.t('understanding.incomeAmount', {
          amount: readMoney(item.calculation.incomeMinor, item.currency),
        })}
      >
        {i18n.t('understanding.incomeAmount', {
          amount: displayMoney(item.calculation.incomeMinor, item.currency),
        })}
      </Text>
      <Text
        style={s.text}
        accessibilityLabel={i18n.t('understanding.expensesAmount', {
          amount: readMoney(item.calculation.expensesMinor, item.currency),
        })}
      >
        {i18n.t('understanding.expensesAmount', {
          amount: displayMoney(item.calculation.expensesMinor, item.currency),
        })}
      </Text>
      <Text
        style={s.text}
        accessibilityLabel={i18n.t('understanding.refundsAmount', {
          amount: readMoney(item.calculation.linkedRefundsMinor, item.currency),
        })}
      >
        {i18n.t('understanding.refundsAmount', {
          amount: displayMoney(item.calculation.linkedRefundsMinor, item.currency),
        })}
      </Text>
      <Text
        style={s.label}
        accessibilityLabel={i18n.t('understanding.netAmount', {
          amount: readMoney(item.value.netSpending.amountMinor, item.currency),
        })}
      >
        {i18n.t('understanding.netAmount', {
          amount: displayMoney(item.value.netSpending.amountMinor, item.currency),
        })}
      </Text>
      <Text
        style={s.hint}
        accessibilityLabel={i18n.t('understanding.netFormulaAmount', {
          amount: readMoney(item.value.netFlow.amountMinor, item.currency),
        })}
      >
        {i18n.t('understanding.netFormulaAmount', {
          amount: displayMoney(item.value.netFlow.amountMinor, item.currency),
        })}
      </Text>
      {(item.calculation.unresolvedCreditsMinor !== '0' ||
        item.calculation.unresolvedDebitsMinor !== '0') && (
        <Text
          style={s.hint}
          accessibilityLabel={i18n.t('understanding.unresolvedAmounts', {
            credits: readMoney(item.calculation.unresolvedCreditsMinor, item.currency),
            debits: readMoney(item.calculation.unresolvedDebitsMinor, item.currency),
          })}
        >
          {i18n.t('understanding.unresolvedAmounts', {
            credits: displayMoney(item.calculation.unresolvedCreditsMinor, item.currency),
            debits: displayMoney(item.calculation.unresolvedDebitsMinor, item.currency),
          })}
        </Text>
      )}
      {item.reasons.map((reason) => (
        <Text key={reason} style={s.hint}>
          {i18n.t(
            Object.hasOwn(reasonLabels, reason)
              ? (reasonLabels[reason] as MessageKey)
              : 'understanding.genericReason',
          )}
        </Text>
      ))}
      {evidence(`${referencePrefix}:${item.id}`, item.inputs.transactionIds)}
    </View>
  )
  const savePreferences = () => {
    if (!currentPreferences || !currentMonthly) return
    let values: PreferenceValues
    try {
      values = {
        accountIds: selected,
        bufferByCurrency: Object.fromEntries(
          chosenCurrencies.map((code) => [code, bufferMinor(buffers[code] ?? '', code)]),
        ),
        horizon:
          horizonMode === 'month_end' ? { mode: 'month_end' } : { mode: horizonMode, on: horizon },
      }
    } catch (cause) {
      setError(displayProblem(cause, 'understanding.checkAmounts'))
      return
    }
    void mutatePersistence(
      () =>
        request('/v1/understanding/preferences', {
          method: 'PATCH',
          body: JSON.stringify({
            revision: currentPreferences.preferences.revision,
            expectedDigest: currentPreferences.preferences.digest,
            values,
          }),
        }),
      'understanding.preferencesSaved',
      true,
    )
  }
  const lastPreferenceEvent = currentPreferences?.events[0]
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.heading}>
        {i18nRef.current.t('understanding.title')}
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {displayMessage(i18n, error)}
        </Text>
      )}
      {notice && (
        <Text
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          aria-live="polite"
          style={s.hint}
        >
          {displayMessage(i18n, notice)}
        </Text>
      )}
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.title}>
          {i18nRef.current.t('understanding.monthTitle')}
        </Text>
        <Text style={s.hint}>{i18nRef.current.t('understanding.monthHelp')}</Text>
        {loading && (
          <ActivityIndicator
            color={c.primary}
            accessibilityLabel={i18nRef.current.t('understanding.monthLoading')}
          />
        )}
        {currentMonthly && (
          <>
            <View style={s.row}>
              {currentMonthly.availableMonths.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t('understanding.showMonthAccessible', {
                    month: displayMonth(value),
                  })}
                  accessibilityState={{
                    selected: currentMonthly.month === value,
                    disabled: loading,
                  }}
                  aria-disabled={loading}
                  disabled={loading}
                  onPress={() => void loadMonth(value)}
                  style={[s.button, currentMonthly.month === value && s.selected]}
                >
                  <Text style={s.buttonText}>{displayMonth(value)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>{i18nRef.current.t('understanding.anotherMonth')}</Text>
            <TextInput
              accessibilityLabel={i18nRef.current.t('understanding.monthInput')}
              autoCapitalize="none"
              value={month}
              onChangeText={setMonth}
              placeholder="2026-09"
              placeholderTextColor={c.textTertiary}
              style={s.input}
            />
            {button(
              i18nRef.current.t('understanding.showMonth'),
              () => void loadMonth(month),
              loading || !/^\d{4}-\d{2}$/.test(month),
            )}
            {!currentMonthly.insights.length && (
              <Text style={s.text}>{i18nRef.current.t('understanding.noAccounts')}</Text>
            )}
            {button(
              i18n.t('understanding.saveSnapshot'),
              () => {
                const capture = currentMonthly.capture
                void mutatePersistence(
                  () =>
                    request('/v1/insights/monthly/snapshots', {
                      method: 'POST',
                      body: JSON.stringify({
                        month: currentMonthly.month,
                        expectedInputDigest: capture.inputDigest,
                        policyVersion: capture.policyVersion,
                      }),
                    }),
                  'understanding.snapshotSaved',
                )
              },
              persisting || loading,
            )}
            {currentMonthly.insights.map((item) =>
              renderMonthlyInsight(item, currentMonthly.month, 'current'),
            )}
          </>
        )}
        {!currentMonthly &&
          !loading &&
          button(i18nRef.current.t('understanding.retryMonth'), () => void loadMonth())}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.title}>
          {i18n.t('understanding.historyTitle')}
        </Text>
        <Text style={s.hint}>{i18n.t('understanding.historyHelp')}</Text>
        {button(i18n.t('understanding.reloadHistory'), () => void loadHistory(), persisting)}
        {currentHistory?.items.map(
          (saved) =>
            saved.payload && (
              <View key={saved.id} style={s.stack}>
                <Text style={s.label}>
                  {i18n.t('understanding.capturedAt', {
                    month: displayMonth(saved.payload.result.month),
                    instant: i18n.instant(saved.capturedAt),
                  })}
                </Text>
                {saved.payload.result.insights.map((item) =>
                  renderMonthlyInsight(item, saved.payload?.result.month as string, saved.id),
                )}
                {saved.payload.inputFacts.transactions.map((fact) => (
                  <Text
                    key={fact.id}
                    style={s.hint}
                    accessibilityLabel={i18n.t('understanding.capturedFact', {
                      date: fact.bookedOn
                        ? displayDate(fact.bookedOn)
                        : i18n.t('understanding.unknownDay'),
                      amount: readMoney(fact.amountMinor, fact.currency),
                    })}
                  >
                    {i18n.t('understanding.capturedFact', {
                      date: fact.bookedOn
                        ? displayDate(fact.bookedOn)
                        : i18n.t('understanding.unknownDay'),
                      amount: displayMoney(fact.amountMinor, fact.currency),
                    })}
                  </Text>
                ))}
              </View>
            ),
        )}
        {currentHistory && !currentHistory.items.length && (
          <Text style={s.hint}>{i18n.t('understanding.historyEmpty')}</Text>
        )}
        {currentHistory?.nextCursor &&
          button(
            i18n.t('understanding.moreHistory'),
            () => void loadHistory(currentHistory.nextCursor as string),
            persisting,
          )}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.title}>
          {i18nRef.current.t('understanding.safeTitle')}
        </Text>
        <Text style={s.hint}>{i18nRef.current.t('understanding.safeHelp')}</Text>
        {!overview.accounts.length && (
          <Text style={s.text}>{i18nRef.current.t('understanding.addAccount')}</Text>
        )}
        {overview.accounts.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="checkbox"
            accessibilityLabel={i18n.t('understanding.includeAccount', {
              account: account.name,
              currency: account.balance.currency,
            })}
            accessibilityState={{ checked: selected.includes(account.id) }}
            aria-checked={selected.includes(account.id)}
            onPress={() => {
              invalidateEstimate()
              setSelected((values) =>
                values.includes(account.id)
                  ? values.filter((id) => id !== account.id)
                  : [...values, account.id],
              )
            }}
            style={[s.button, selected.includes(account.id) && s.selected]}
          >
            <Text style={s.buttonText}>
              {selected.includes(account.id) ? '✓ ' : ''}
              {account.name} · {account.balance.currency}
            </Text>
          </Pressable>
        ))}
        {currentMonthly && (
          <>
            <View style={s.row}>
              {(['month_end', 'date', 'next_salary'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  aria-checked={horizonMode === mode}
                  accessibilityState={{ checked: horizonMode === mode }}
                  accessibilityLabel={i18n.t(
                    mode === 'month_end'
                      ? 'understanding.horizonMonthEnd'
                      : mode === 'date'
                        ? 'understanding.horizonDate'
                        : 'understanding.horizonSalary',
                  )}
                  onPress={() => {
                    invalidateEstimate()
                    setHorizonMode(mode)
                    if (mode === 'month_end') setHorizon(currentMonthly.boundary.defaultHorizonOn)
                  }}
                  style={[s.button, horizonMode === mode && s.selected]}
                >
                  <Text style={s.buttonText}>
                    {i18n.t(
                      mode === 'month_end'
                        ? 'understanding.horizonMonthEnd'
                        : mode === 'date'
                          ? 'understanding.horizonDate'
                          : 'understanding.horizonSalary',
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>{i18nRef.current.t('understanding.throughDate')}</Text>
            <TextInput
              accessibilityLabel={i18nRef.current.t('understanding.horizon')}
              autoCapitalize="none"
              value={
                horizonMode === 'month_end' ? currentMonthly.boundary.defaultHorizonOn : horizon
              }
              onChangeText={(value) => {
                invalidateEstimate()
                setHorizonMode((previous) => (previous === 'month_end' ? 'date' : previous))
                setHorizon(value)
              }}
              placeholder={currentMonthly.boundary.defaultHorizonOn}
              placeholderTextColor={c.textTertiary}
              style={s.input}
            />
            <Text style={s.hint}>
              {i18n.t('understanding.range', {
                from: displayDate(currentMonthly.boundary.calculatedOn),
                through: displayDate(currentMonthly.boundary.maxHorizonOn),
              })}
            </Text>
          </>
        )}
        {chosenCurrencies.map((code) => (
          <View key={code} style={s.stack}>
            <Text style={s.label}>
              {i18n.t('understanding.bufferCurrency', { currency: code })}
            </Text>
            <TextInput
              accessibilityLabel={i18n.t('understanding.bufferAccessible', { currency: code })}
              keyboardType="decimal-pad"
              value={buffers[code] ?? ''}
              onChangeText={(value) => {
                invalidateEstimate()
                setBuffers((current) => ({ ...current, [code]: value }))
              }}
              placeholder={i18nRef.current.t('understanding.bufferExample')}
              placeholderTextColor={c.textTertiary}
              style={s.input}
            />
          </View>
        ))}
        {button(
          i18n.t('understanding.savePreferences'),
          savePreferences,
          persisting || !currentPreferences || !currentMonthly,
        )}
        {lastPreferenceEvent?.payload?.before &&
          lastPreferenceEvent.action !== 'source_erased' &&
          button(
            i18n.t('understanding.undoPreferences'),
            () => {
              if (!currentPreferences) return
              void mutatePersistence(
                () =>
                  request('/v1/understanding/preferences/undo', {
                    method: 'POST',
                    body: JSON.stringify({
                      revision: currentPreferences.preferences.revision,
                      expectedDigest: currentPreferences.preferences.digest,
                      eventId: lastPreferenceEvent.id,
                    }),
                  }),
                'understanding.preferencesUndone',
                true,
              )
            },
            persisting,
          )}
        <Text style={s.hint}>{i18n.t('understanding.preferencesHelp')}</Text>
        {button(
          calculating
            ? i18nRef.current.t('understanding.calculating')
            : i18nRef.current.t('understanding.calculate'),
          () => void calculate(),
          calculating || !currentMonthly || !selected.length,
          true,
        )}
        {currentSafe?.results.map((item) => (
          <View key={item.currency} style={s.stack}>
            <Text
              style={s.title}
              accessibilityLabel={
                item.value
                  ? item.status === 'shortfall'
                    ? i18n.t('understanding.shortfall', {
                        amount: readMoney(item.value.amountMinor, item.currency),
                      })
                    : i18n.t('understanding.available', {
                        amount: readMoney(item.value.amountMinor, item.currency),
                        date: displayDate(item.horizonOn),
                      })
                  : i18n.t('understanding.unavailable', { currency: item.currency })
              }
            >
              {item.value
                ? item.status === 'shortfall'
                  ? i18n.t('understanding.shortfall', {
                      amount: displayMoney(item.value.amountMinor, item.currency),
                    })
                  : i18n.t('understanding.available', {
                      amount: displayMoney(item.value.amountMinor, item.currency),
                      date: displayDate(item.horizonOn),
                    })
                : i18n.t('understanding.unavailable', { currency: item.currency })}
            </Text>
            <Text style={s.hint}>
              {i18n.t(
                item.value === null
                  ? 'understanding.estimateUnavailableHelp'
                  : 'understanding.estimateAvailableHelp',
              )}
            </Text>
            <Text
              style={s.text}
              accessibilityLabel={i18n.t('understanding.chosenAmount', {
                amount: readMoney(item.calculation.includedBalanceMinor, item.currency),
              })}
            >
              {i18n.t('understanding.chosenAmount', {
                amount: displayMoney(item.calculation.includedBalanceMinor, item.currency),
              })}
            </Text>
            <Text
              style={s.text}
              accessibilityLabel={i18n.t('understanding.pendingAmount', {
                amount:
                  item.calculation.pendingOutflowsMinor === null
                    ? i18n.t('understanding.toReview')
                    : readMoney(item.calculation.pendingOutflowsMinor, item.currency),
              })}
            >
              {i18n.t('understanding.pendingAmount', {
                amount:
                  item.calculation.pendingOutflowsMinor === null
                    ? i18n.t('understanding.toReview')
                    : displayMoney(item.calculation.pendingOutflowsMinor, item.currency),
              })}
            </Text>
            <Text
              style={s.text}
              accessibilityLabel={i18n.t('understanding.recurringAmount', {
                amount:
                  item.calculation.estimatedUpcomingOutflowsMinor === null
                    ? i18n.t('understanding.toReview')
                    : readMoney(item.calculation.estimatedUpcomingOutflowsMinor, item.currency),
              })}
            >
              {i18n.t('understanding.recurringAmount', {
                amount:
                  item.calculation.estimatedUpcomingOutflowsMinor === null
                    ? i18n.t('understanding.toReview')
                    : displayMoney(item.calculation.estimatedUpcomingOutflowsMinor, item.currency),
              })}
            </Text>
            <Text
              style={s.text}
              accessibilityLabel={i18n.t('understanding.bufferAmount', {
                amount:
                  item.calculation.bufferMinor === null
                    ? i18n.t('understanding.notEntered')
                    : readMoney(item.calculation.bufferMinor, item.currency),
              })}
            >
              {i18n.t('understanding.bufferAmount', {
                amount:
                  item.calculation.bufferMinor === null
                    ? i18n.t('understanding.notEntered')
                    : displayMoney(item.calculation.bufferMinor, item.currency),
              })}
            </Text>
            {item.inputs.estimatedOccurrences.map((occurrence) => (
              <Text
                key={`${occurrence.seriesId}:${occurrence.on}`}
                style={s.hint}
                accessibilityLabel={i18n.t('understanding.occurrence', {
                  date: displayDate(occurrence.on),
                  amount: readMoney(occurrence.amountMinor, item.currency),
                })}
              >
                {i18n.t('understanding.occurrence', {
                  date: displayDate(occurrence.on),
                  amount: displayMoney(occurrence.amountMinor, item.currency),
                })}
              </Text>
            ))}
            {item.reasons.map((reason) => (
              <Text key={reason} style={s.hint}>
                {i18n.t(
                  Object.hasOwn(reasonLabels, reason)
                    ? (reasonLabels[reason] as MessageKey)
                    : 'understanding.genericReason',
                )}
              </Text>
            ))}
            {evidence(`safe-${item.currency}`, [
              ...item.inputs.pendingTransactionIds,
              ...item.inputs.recurringEvidenceTransactionIds,
              ...item.inputs.fulfilledOccurrenceTransactionIds,
            ])}
          </View>
        ))}
      </View>
    </View>
  )
}
function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    panel: { gap: 20 },
    stack: { gap: 10 },
    heading: { fontFamily: 'Newsreader', fontSize: 28, color: c.textPrimary },
    title: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
    },
    text: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 16,
      lineHeight: 24,
      color: c.textPrimary,
    },
    hint: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      lineHeight: 21,
      color: c.textSecondary,
    },
    label: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    },
    error: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 16,
      lineHeight: 24,
      color: c.danger,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 16,
      padding: 16,
      gap: 14,
      backgroundColor: c.surface,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      padding: 12,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      fontFamily: 'Geist',
      fontSize: 16,
    },
    button: {
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 10,
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
    },
    buttonText: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      color: c.textPrimary,
    },
    primary: { backgroundColor: c.primary, borderColor: c.primary },
    primaryText: { color: c.onPrimary, fontWeight: '600' },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary },
    evidence: {
      minHeight: 48,
      borderTopWidth: 1,
      borderTopColor: c.borderStrong,
      paddingVertical: 12,
      gap: 4,
    },
  })
}
