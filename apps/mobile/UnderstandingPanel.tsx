import { ApiError, type DemoOverview, type MoneyDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { formatMoney, fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

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
const reasonLabels: Readonly<Record<string, string>> = {
  coverage_partial: 'Il periodo contiene dati incompleti.',
  coverage_unknown: 'La completezza della fonte non è verificata.',
  missing_booked_date: 'Alcuni movimenti non hanno una data di contabilizzazione.',
  unresolved_refund: 'Un rimborso deve essere collegato al suo acquisto.',
  unresolved_cash_flow: 'Il tipo di alcuni movimenti richiede verifica.',
  reconciliation_requires_review: 'Ci sono collegamenti tra movimenti da controllare.',
  future_booked_date: 'La fonte riporta una contabilizzazione futura da verificare.',
  future_booked_data: 'La fonte riporta una contabilizzazione futura da verificare.',
  balance_meaning_unknown: 'La fonte non precisa come interpretare il saldo.',
  balance_stale: 'Il saldo deve essere aggiornato.',
  balance_timestamp_invalid: 'La data del saldo non è valida.',
  balance_timestamp_in_future: 'La data del saldo è futura.',
  card_balance_not_spendable_cash: 'Il saldo carta non è denaro disponibile da spendere.',
  pending_balance_semantics_unknown: 'Non è chiaro se il saldo comprende già le uscite in sospeso.',
  private_outflow_coverage: 'Una preferenza di privacy impedisce di completare questa stima.',
  private_recurring_coverage: 'Una preferenza di privacy impedisce di completare questa stima.',
  unresolved_pending_reconciliation: 'Una prenotazione e il suo addebito richiedono verifica.',
  unresolved_recurring_occurrence:
    'Un pagamento potrebbe essere una ricorrenza già prevista: verifica il collegamento.',
  overdue_recurring_occurrence: 'Una ricorrenza prevista non risulta ancora verificata.',
  buffer_not_configured: 'Indica un margine per questa valuta.',
  forecast_work_limit:
    'Il periodo comprende troppe ricorrenze per questa stima: scegli una data più vicina.',
}
const displayMoney = (amountMinor: string, currency: CurrencyCode) =>
  formatMoney(fromJson({ amountMinor, currency }), { symbolPosition: 'before' })
const displayDate = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
const displayMonth = (value: string) =>
  new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}-01T00:00:00Z`),
  )
function bufferMinor(value: string, currency: CurrencyCode) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized))
    throw new Error(
      'Indica un margine per ogni valuta: per esempio 0 oppure 10,50, senza separatori delle migliaia.',
    )
  try {
    return parseDecimal(normalized, currency).amountMinor.toString()
  } catch {
    throw new Error('Controlla le cifre decimali del margine per questa valuta.')
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
  const [selected, setSelected] = useState<string[]>([]),
    [buffers, setBuffers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false),
    [calculating, setCalculating] = useState(false),
    [error, setError] = useState<string | null>(null)
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
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Non riesco a caricare il riepilogo del mese. Riprova.',
          )
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
          setError(
            cause instanceof ApiError ? cause.message : 'Non riesco a calcolare la stima. Riprova.',
          )
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
  useEffect(() => {
    mounted.current = true
    setMonthly(null)
    setSafeResult(null)
    setMonth('')
    setHorizon('')
    setSelected([])
    setBuffers({})
    setOpenEvidence(null)
    setError(null)
    setCalculating(false)
    lastQuery.current = null
    selectedMonth.current = ''
    lastOverview.current = null
    safeTicket.current++
    void loadMonth()
    return () => {
      mounted.current = false
      monthTicket.current++
      safeTicket.current++
    }
  }, [loadMonth])
  useEffect(() => {
    const previous = lastOverview.current
    lastOverview.current = overview
    if (!previous || previous === overview) return
    void loadMonth(selectedMonth.current || undefined)
    setSafeResult(null)
    if (lastQuery.current) void loadEstimate(lastQuery.current)
  }, [overview, loadMonth, loadEstimate])
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
      setError('Scegli almeno un conto per questa stima.')
      return
    }
    let exactBuffers: Record<string, string>
    try {
      exactBuffers = Object.fromEntries(
        chosenCurrencies.map((code) => [code, bufferMinor(buffers[code] ?? '', code)]),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Controlla gli importi indicati.')
      return
    }
    const query = `accountIds=${encodeURIComponent(selected.join(','))}&horizonOn=${encodeURIComponent(horizon)}&bufferByCurrency=${encodeURIComponent(JSON.stringify(exactBuffers))}`
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
      {button(openEvidence === key ? 'Chiudi i movimenti' : 'Apri i movimenti usati', () =>
        setOpenEvidence(openEvidence === key ? null : key),
      )}
      {openEvidence === key &&
        (ids.length ? (
          [...new Set(ids)].map((id) => {
            const row = overview.transactions.find((value) => value.id === id)
            return row ? (
              <Pressable
                key={id}
                accessibilityRole={onOpenTransaction ? 'button' : 'text'}
                accessibilityLabel={`Movimento del ${row.bookedOn ?? row.authorizedOn ?? 'giorno non disponibile'}: ${row.merchantName || row.description}`}
                onPress={() => onOpenTransaction?.(id)}
                style={s.evidence}
              >
                <Text style={s.text}>{row.merchantName || row.description}</Text>
                <Text style={s.hint}>
                  {row.bookedOn ?? row.authorizedOn ?? 'Data non disponibile'} ·{' '}
                  {displayMoney(row.amount.amountMinor, row.amount.currency)}
                </Text>
              </Pressable>
            ) : (
              <Text key={id} style={s.hint}>
                Il movimento è cambiato: aggiorna i dati.
              </Text>
            )
          })
        ) : (
          <Text style={s.hint}>Nessun movimento contabilizzato nel periodo selezionato.</Text>
        ))}
    </View>
  )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.heading}>
        Il mese e il tuo margine
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <View style={s.card}>
        <Text style={s.title}>Cosa è successo nel mese</Text>
        <Text style={s.hint}>
          Totali dei movimenti contabilizzati disponibili, separati per valuta.
        </Text>
        {loading && (
          <ActivityIndicator
            color={c.primary}
            accessibilityLabel="Caricamento riepilogo del mese"
          />
        )}
        {currentMonthly && (
          <>
            <View style={s.row}>
              {currentMonthly.availableMonths.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Mostra ${displayMonth(value)}`}
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
            <Text style={s.label}>Altro mese · AAAA-MM</Text>
            <TextInput
              accessibilityLabel="Mese del riepilogo"
              autoCapitalize="none"
              value={month}
              onChangeText={setMonth}
              placeholder="2026-09"
              placeholderTextColor={c.textTertiary}
              style={s.input}
            />
            {button(
              'Mostra il mese',
              () => void loadMonth(month),
              loading || !/^\d{4}-\d{2}$/.test(month),
            )}
            {!currentMonthly.insights.length && (
              <Text style={s.text}>Aggiungi un conto per vedere il riepilogo dei movimenti.</Text>
            )}
            {currentMonthly.insights.map((item) => (
              <View key={item.id} style={s.stack}>
                <Text style={s.title}>
                  {item.currency} · {displayMonth(currentMonthly.month)}
                </Text>
                <Text style={s.hint}>
                  {displayDate(item.inputs.fromOn)} – {displayDate(item.inputs.throughOn)} ·{' '}
                  {item.status === 'partial'
                    ? 'Dati disponibili, copertura incompleta'
                    : 'Movimenti del registro locale'}
                </Text>
                <Text style={s.text}>
                  Entrate: {displayMoney(item.calculation.incomeMinor, item.currency)}
                </Text>
                <Text style={s.text}>
                  Spese: {displayMoney(item.calculation.expensesMinor, item.currency)}
                </Text>
                <Text style={s.text}>
                  Rimborsi collegati:{' '}
                  {displayMoney(item.calculation.linkedRefundsMinor, item.currency)}
                </Text>
                <Text style={s.label}>
                  Spesa netta: {displayMoney(item.value.netSpending.amountMinor, item.currency)}
                </Text>
                <Text style={s.hint}>
                  Spesa netta = spese − rimborsi collegati. Entrate − spesa netta:{' '}
                  {displayMoney(item.value.netFlow.amountMinor, item.currency)}.
                </Text>
                {(item.calculation.unresolvedCreditsMinor !== '0' ||
                  item.calculation.unresolvedDebitsMinor !== '0') && (
                  <Text style={s.hint}>
                    Da verificare, fuori dai totali: accrediti{' '}
                    {displayMoney(item.calculation.unresolvedCreditsMinor, item.currency)}; addebiti{' '}
                    {displayMoney(item.calculation.unresolvedDebitsMinor, item.currency)}.
                  </Text>
                )}
                {item.reasons.map((reason) => (
                  <Text key={reason} style={s.hint}>
                    {reasonLabels[reason] ?? 'Alcuni dati richiedono verifica.'}
                  </Text>
                ))}
                {evidence(item.id, item.inputs.transactionIds)}
              </View>
            ))}
          </>
        )}
        {!currentMonthly && !loading && button('Riprova il riepilogo', () => void loadMonth())}
      </View>
      <View style={s.card}>
        <Text style={s.title}>Quanto resta fino alla data scelta</Text>
        <Text style={s.hint}>
          Scegli i conti e un margine per ogni valuta. La stima usa solo il registro locale e non
          aggiunge entrate future.
        </Text>
        {!overview.accounts.length && (
          <Text style={s.text}>Aggiungi prima un conto manuale con il suo saldo.</Text>
        )}
        {overview.accounts.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="checkbox"
            accessibilityLabel={`Includi ${account.name} ${account.balance.currency}`}
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
            <Text style={s.label}>Fino al · AAAA-MM-GG</Text>
            <TextInput
              accessibilityLabel="Data finale della stima"
              autoCapitalize="none"
              value={horizon}
              onChangeText={(value) => {
                invalidateEstimate()
                setHorizon(value)
              }}
              placeholder={currentMonthly.boundary.defaultHorizonOn}
              placeholderTextColor={c.textTertiary}
              style={s.input}
            />
            <Text style={s.hint}>
              Dal {displayDate(currentMonthly.boundary.calculatedOn)} al{' '}
              {displayDate(currentMonthly.boundary.maxHorizonOn)}.
            </Text>
          </>
        )}
        {chosenCurrencies.map((code) => (
          <View key={code} style={s.stack}>
            <Text style={s.label}>Margine da tenere da parte · {code}</Text>
            <TextInput
              accessibilityLabel={`Margine ${code}`}
              keyboardType="decimal-pad"
              value={buffers[code] ?? ''}
              onChangeText={(value) => {
                invalidateEstimate()
                setBuffers((current) => ({ ...current, [code]: value }))
              }}
              placeholder="Per esempio 0 oppure 10,50"
              placeholderTextColor={c.textTertiary}
              style={s.input}
            />
          </View>
        ))}
        {button(
          calculating ? 'Calcolo in corso…' : 'Calcola il margine',
          () => void calculate(),
          calculating || !currentMonthly || !selected.length,
          true,
        )}
        {currentSafe?.results.map((item) => (
          <View key={item.currency} style={s.stack}>
            <Text style={s.title}>
              {item.value
                ? item.status === 'shortfall'
                  ? `Margine insufficiente: ${displayMoney(item.value.amountMinor, item.currency)}`
                  : `Circa ${displayMoney(item.value.amountMinor, item.currency)} fino al ${displayDate(item.horizonOn)}`
                : `${item.currency}: stima non disponibile`}
            </Text>
            <Text style={s.hint}>{item.explanationIt}</Text>
            <Text style={s.text}>
              Saldi scelti: {displayMoney(item.calculation.includedBalanceMinor, item.currency)}
            </Text>
            <Text style={s.text}>
              − Uscite in sospeso:{' '}
              {item.calculation.pendingOutflowsMinor === null
                ? 'da verificare'
                : displayMoney(item.calculation.pendingOutflowsMinor, item.currency)}
            </Text>
            <Text style={s.text}>
              − Ricorrenti stimate:{' '}
              {item.calculation.estimatedUpcomingOutflowsMinor === null
                ? 'da verificare'
                : displayMoney(item.calculation.estimatedUpcomingOutflowsMinor, item.currency)}
            </Text>
            <Text style={s.text}>
              − Margine:{' '}
              {item.calculation.bufferMinor === null
                ? 'non indicato'
                : displayMoney(item.calculation.bufferMinor, item.currency)}
            </Text>
            {item.inputs.estimatedOccurrences.map((occurrence) => (
              <Text key={`${occurrence.seriesId}:${occurrence.on}`} style={s.hint}>
                Prevista il {displayDate(occurrence.on)}: circa{' '}
                {displayMoney(occurrence.amountMinor, item.currency)}.
              </Text>
            ))}
            {item.reasons.map((reason) => (
              <Text key={reason} style={s.hint}>
                {reasonLabels[reason] ?? 'Alcuni dati richiedono verifica.'}
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
    title: { fontFamily: 'Geist', fontSize: 18, fontWeight: '600', color: c.textPrimary },
    text: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.textPrimary },
    hint: { fontFamily: 'Geist', fontSize: 14, lineHeight: 21, color: c.textSecondary },
    label: { fontFamily: 'Geist', fontSize: 15, fontWeight: '600', color: c.textPrimary },
    error: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.danger },
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
    buttonText: { fontFamily: 'Geist', fontSize: 14, color: c.textPrimary },
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
