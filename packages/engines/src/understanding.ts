import {
  type Account,
  addMonths,
  type CurrencyCode,
  calendarDate,
  calendarDateAt,
  dateOnly,
  daysBetween,
  endOfMonth,
  isProfileTimezone,
  type Money,
  type ReconciliationMatch,
  type RecurringSeries,
  type Transaction,
} from '@lilleri/domain'
import { money } from '@lilleri/money'
import { effectiveTransactions } from './index.js'

export const UNDERSTANDING_VERSION = 'observed-understanding-v1'
export class UnderstandingInputError extends Error {
  readonly code = 'invalid_understanding_input'
  constructor() {
    super('Financial understanding inputs are invalid')
    this.name = 'UnderstandingInputError'
  }
}
interface LedgerInput {
  readonly profileId: string
  readonly timezone: string
  readonly now: string
  readonly accounts: readonly Account[]
  readonly transactions: readonly Transaction[]
  readonly matches: readonly ReconciliationMatch[]
  /** Server-derived private/quiet set. Quiet identifiers never appear in returned evidence. */
  readonly excludedTransactionIds: readonly string[]
}
export type Coverage = 'complete' | 'partial' | 'unknown'
export interface MonthlyInsightsInput extends LedgerInput {
  readonly month?: string
  /** An absent knowledge row means unknown coverage, never an implied completed sync. */
  readonly coverageByAccount: Readonly<Record<string, Coverage>>
}
export interface MonthlyInsight {
  readonly id: string
  readonly profileId: string
  readonly algorithmVersion: typeof UNDERSTANDING_VERSION
  readonly type: 'monthly_summary'
  readonly month: string
  readonly currency: CurrencyCode
  readonly status: 'complete' | 'partial'
  readonly inputs: {
    readonly accountIds: readonly string[]
    readonly transactionIds: readonly string[]
    readonly incomeTransactionIds: readonly string[]
    readonly expenseTransactionIds: readonly string[]
    readonly refundTransactionIds: readonly string[]
    readonly unresolvedTransactionIds: readonly string[]
    readonly fromOn: string
    readonly throughOn: string
    readonly profileTimezone: string
  }
  readonly calculation: {
    readonly formula: 'net_spending = expenses - linked_refunds; net_flow = income - net_spending'
    readonly incomeMinor: bigint
    readonly expensesMinor: bigint
    readonly linkedRefundsMinor: bigint
    readonly unresolvedCreditsMinor: bigint
    readonly unresolvedDebitsMinor: bigint
    readonly bookedTransactionCount: number
  }
  readonly value: { readonly netSpending: Money; readonly netFlow: Money }
  readonly isEstimate: false
  /** No calibrated probability is available. The calculation is exact for its named inputs. */
  readonly confidence: null
  readonly reasons: readonly MonthlyInsightReason[]
  readonly explanationIt: string
}
export type MonthlyInsightReason =
  | 'coverage_partial'
  | 'coverage_unknown'
  | 'missing_booked_date'
  | 'unresolved_refund'
  | 'unresolved_cash_flow'
  | 'reconciliation_requires_review'
  | 'future_booked_date'

interface ValidatedLedger {
  readonly today: string
  readonly excluded: ReadonlySet<string>
  readonly accountsById: ReadonlyMap<string, Account>
  readonly transactionsById: ReadonlyMap<string, Transaction>
}
function instantMilliseconds(value: string): number {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    )
  )
    return Number.NaN
  try {
    dateOnly(value.slice(0, 10))
    return Date.parse(value)
  } catch {
    return Number.NaN
  }
}
const validCoverage = (value: string) => ['complete', 'partial', 'unknown'].includes(value)
function validateLedger(input: LedgerInput): ValidatedLedger {
  try {
    if (!input.profileId || !isProfileTimezone(input.timezone)) throw new UnderstandingInputError()
    const now = new Date(instantMilliseconds(input.now))
    if (!Number.isFinite(now.getTime())) throw new UnderstandingInputError()
    const today = calendarDateAt(now, input.timezone)
    const accountsById = new Map(input.accounts.map((row) => [row.id, row]))
    const transactionsById = new Map(input.transactions.map((row) => [row.id, row]))
    if (
      accountsById.size !== input.accounts.length ||
      transactionsById.size !== input.transactions.length ||
      input.accounts.some(
        (row) =>
          row.profileId !== input.profileId ||
          !['current', 'card', 'cash', 'savings'].includes(row.kind),
      )
    )
      throw new UnderstandingInputError()
    for (const row of input.transactions) {
      const account = accountsById.get(row.accountId)
      if (
        row.profileId !== input.profileId ||
        !account ||
        account.connectionId !== row.connectionId ||
        account.balance.currency !== row.amount.currency ||
        typeof row.amount.amountMinor !== 'bigint' ||
        !['pending', 'booked', 'reversed'].includes(row.status) ||
        !['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'].includes(
          row.kind,
        )
      )
        throw new UnderstandingInputError()
      if (row.bookedOn !== null) dateOnly(row.bookedOn)
      if (row.authorizedOn !== null) dateOnly(row.authorizedOn)
    }
    if (input.accounts.some((row) => typeof row.balance.amountMinor !== 'bigint'))
      throw new UnderstandingInputError()
    const matches = new Set<string>()
    for (const match of input.matches) {
      if (
        matches.has(match.id) ||
        match.transactionIds.length < 2 ||
        new Set(match.transactionIds).size !== match.transactionIds.length ||
        match.transactionIds.some((id) => !transactionsById.has(id))
      )
        throw new UnderstandingInputError()
      matches.add(match.id)
      const currencies = new Set(
        match.transactionIds.map((id) => transactionsById.get(id)?.amount.currency),
      )
      if (currencies.size !== 1) throw new UnderstandingInputError()
    }
    return {
      today,
      excluded: new Set(input.excludedTransactionIds),
      accountsById,
      transactionsById,
    }
  } catch {
    throw new UnderstandingInputError()
  }
}
const uniqueSorted = (values: Iterable<string>) => [...new Set(values)].sort()
const semanticKinds = new Set(['transfer', 'card_settlement', 'cash_withdrawal'])

/** Observed booked month only. Booking dates never pass through a timezone conversion. */
export function buildMonthlyInsights(input: MonthlyInsightsInput): MonthlyInsight[] {
  const { today, excluded } = validateLedger(input)
  if (
    input.accounts.some(
      (row) =>
        input.coverageByAccount[row.id] !== undefined &&
        !validCoverage(input.coverageByAccount[row.id] as string),
    )
  )
    throw new UnderstandingInputError()
  const month = input.month ?? today.slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) throw new UnderstandingInputError()
  let fromOn: string
  let throughOn: string
  try {
    fromOn = dateOnly(`${month}-01`)
    throughOn = endOfMonth(calendarDate(fromOn))
  } catch {
    throw new UnderstandingInputError()
  }
  if (fromOn > today) throw new UnderstandingInputError()
  if (throughOn > today) throughOn = today
  const visible = effectiveTransactions(input.transactions, input.matches).filter(
    (row) => !excluded.has(row.id),
  )
  const visibleIds = new Set(visible.map((row) => row.id))
  const linkedRefunds = new Set(
    input.matches
      .filter(
        (match) =>
          match.type === 'refund' &&
          match.state === 'confirmed' &&
          match.transactionIds.every((id) => visibleIds.has(id)),
      )
      .flatMap((match) => match.transactionIds),
  )
  const currencies = uniqueSorted([
    ...input.accounts.map((row) => row.balance.currency),
    ...visible.map((row) => row.amount.currency),
  ]) as CurrencyCode[]
  return currencies.map((currency) => {
    const accounts = input.accounts.filter((row) => row.balance.currency === currency)
    const booked = visible.filter(
      (row) =>
        row.amount.currency === currency &&
        row.status === 'booked' &&
        row.bookedOn !== null &&
        row.bookedOn >= fromOn &&
        row.bookedOn <= throughOn &&
        !semanticKinds.has(row.kind),
    )
    const income = booked.filter((row) => row.kind === 'income' && row.amount.amountMinor > 0n)
    const expenses = booked.filter((row) => row.kind === 'expense' && row.amount.amountMinor < 0n)
    const refunds = booked.filter(
      (row) => row.kind === 'refund' && row.amount.amountMinor > 0n && linkedRefunds.has(row.id),
    )
    const classified = new Set([...income, ...expenses, ...refunds].map((row) => row.id))
    const unresolved = booked.filter(
      (row) => row.amount.amountMinor !== 0n && !classified.has(row.id),
    )
    const reasons = new Set<MonthlyInsightReason>()
    if (accounts.some((row) => input.coverageByAccount[row.id] === 'partial'))
      reasons.add('coverage_partial')
    if (
      accounts.some(
        (row) => !input.coverageByAccount[row.id] || input.coverageByAccount[row.id] === 'unknown',
      )
    )
      reasons.add('coverage_unknown')
    if (
      visible.some(
        (row) =>
          row.amount.currency === currency && row.status === 'booked' && row.bookedOn === null,
      )
    )
      reasons.add('missing_booked_date')
    if (
      visible.some(
        (row) =>
          row.amount.currency === currency &&
          row.status === 'booked' &&
          row.bookedOn !== null &&
          row.bookedOn > throughOn &&
          row.bookedOn.slice(0, 7) === month,
      )
    )
      reasons.add('future_booked_date')
    if (unresolved.some((row) => row.kind === 'refund')) reasons.add('unresolved_refund')
    if (unresolved.some((row) => row.kind !== 'refund')) reasons.add('unresolved_cash_flow')
    const bookedIds = new Set(booked.map((row) => row.id))
    if (
      input.matches.some(
        (match) =>
          match.state === 'suggested' && match.transactionIds.some((id) => bookedIds.has(id)),
      )
    )
      reasons.add('reconciliation_requires_review')
    const incomeMinor = income.reduce((sum, row) => sum + row.amount.amountMinor, 0n)
    const expensesMinor = expenses.reduce((sum, row) => sum - row.amount.amountMinor, 0n)
    const linkedRefundsMinor = refunds.reduce((sum, row) => sum + row.amount.amountMinor, 0n)
    const netSpendingMinor = expensesMinor - linkedRefundsMinor
    return {
      id: `monthly:${input.profileId}:${month}:${currency}`,
      profileId: input.profileId,
      algorithmVersion: UNDERSTANDING_VERSION,
      type: 'monthly_summary',
      month,
      currency,
      status: reasons.size ? 'partial' : 'complete',
      inputs: {
        accountIds: uniqueSorted(accounts.map((row) => row.id)),
        transactionIds: uniqueSorted(booked.map((row) => row.id)),
        incomeTransactionIds: uniqueSorted(income.map((row) => row.id)),
        expenseTransactionIds: uniqueSorted(expenses.map((row) => row.id)),
        refundTransactionIds: uniqueSorted(refunds.map((row) => row.id)),
        unresolvedTransactionIds: uniqueSorted(unresolved.map((row) => row.id)),
        fromOn,
        throughOn,
        profileTimezone: input.timezone,
      },
      calculation: {
        formula: 'net_spending = expenses - linked_refunds; net_flow = income - net_spending',
        incomeMinor,
        expensesMinor,
        linkedRefundsMinor,
        unresolvedCreditsMinor: unresolved.reduce(
          (sum, row) => sum + (row.amount.amountMinor > 0n ? row.amount.amountMinor : 0n),
          0n,
        ),
        unresolvedDebitsMinor: unresolved.reduce(
          (sum, row) => sum - (row.amount.amountMinor < 0n ? row.amount.amountMinor : 0n),
          0n,
        ),
        bookedTransactionCount: booked.length,
      },
      value: {
        netSpending: money(netSpendingMinor, currency),
        netFlow: money(incomeMinor - netSpendingMinor, currency),
      },
      isEstimate: false,
      confidence: null,
      reasons: [...reasons].sort(),
      explanationIt: reasons.size
        ? 'Questi totali descrivono i movimenti contabilizzati disponibili nel periodo. Alcuni dati richiedono verifica; i rimborsi non collegati restano separati.'
        : 'Totali dei movimenti contabilizzati nel periodo: entrate e spese, con i rimborsi collegati indicati separatamente. I trasferimenti e i saldi carta non sono nuova spesa.',
    }
  })
}

export interface AccountKnowledge {
  readonly accountId: string
  readonly balanceMeaning: 'booked' | 'available' | 'unknown'
  readonly pendingOutflowsIncluded: boolean | null
  readonly coverage: Coverage
}
export interface RecurringOccurrenceBinding {
  /** A verified provider/user relationship, never inferred merely from amount similarity. */
  readonly seriesId: string
  readonly transactionId: string
}
export interface SafeToSpendPolicy {
  readonly version: string
  readonly horizonOn: string
  readonly maxBalanceAgeMs: number
  readonly occurrenceToleranceDays: number
  readonly maxForecastOccurrences: number
  readonly bufferByCurrency: Readonly<Partial<Record<CurrencyCode, bigint>>>
}
export interface SafeToSpendInput extends LedgerInput {
  readonly recurring: readonly RecurringSeries[]
  readonly includedAccountIds: readonly string[]
  readonly accountKnowledge: readonly AccountKnowledge[]
  readonly occurrenceBindings: readonly RecurringOccurrenceBinding[]
  readonly policy: SafeToSpendPolicy
}
export type SafeToSpendReason =
  | 'balance_meaning_unknown'
  | 'balance_stale'
  | 'balance_timestamp_invalid'
  | 'balance_timestamp_in_future'
  | 'coverage_partial'
  | 'coverage_unknown'
  | 'card_balance_not_spendable_cash'
  | 'pending_balance_semantics_unknown'
  | 'private_outflow_coverage'
  | 'private_recurring_coverage'
  | 'unresolved_pending_reconciliation'
  | 'unresolved_recurring_occurrence'
  | 'overdue_recurring_occurrence'
  | 'buffer_not_configured'
  | 'forecast_work_limit'
  | 'future_booked_data'

export interface SafeToSpendResult {
  readonly currency: CurrencyCode
  readonly algorithmVersion: typeof UNDERSTANDING_VERSION
  readonly policyVersion: string
  readonly status: 'available' | 'shortfall' | 'unavailable'
  readonly value: Money | null
  readonly isEstimate: true
  readonly confidence: null
  readonly horizonOn: string
  readonly calculatedOn: string
  readonly inputs: {
    readonly accountIds: readonly string[]
    readonly pendingTransactionIds: readonly string[]
    readonly estimatedSeriesIds: readonly string[]
    readonly estimatedOccurrences: readonly {
      readonly seriesId: string
      readonly on: string
      readonly amountMinor: bigint
    }[]
    readonly recurringEvidenceTransactionIds: readonly string[]
    readonly fulfilledOccurrenceTransactionIds: readonly string[]
  }
  readonly calculation: {
    readonly formula: 'safe_to_spend = included_balances - pending_outflows - estimated_upcoming_outflows - buffer'
    readonly includedBalanceMinor: bigint
    readonly pendingOutflowsMinor: bigint | null
    readonly estimatedUpcomingOutflowsMinor: bigint | null
    readonly bufferMinor: bigint | null
    readonly forecastIncomeAddedMinor: 0n
  }
  readonly reasons: readonly SafeToSpendReason[]
  readonly explanationIt: string
}

/** Exact, conservative estimate. It cannot turn incomplete account/provider data into free cash. */
export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult[] {
  const { today, excluded, accountsById, transactionsById } = validateLedger(input)
  const { policy } = input
  if (
    !policy.version ||
    !Number.isSafeInteger(policy.maxBalanceAgeMs) ||
    policy.maxBalanceAgeMs < 0 ||
    !Number.isSafeInteger(policy.occurrenceToleranceDays) ||
    policy.occurrenceToleranceDays < 0 ||
    !Number.isSafeInteger(policy.maxForecastOccurrences) ||
    policy.maxForecastOccurrences < 1
  )
    throw new UnderstandingInputError()
  try {
    dateOnly(policy.horizonOn)
  } catch {
    throw new UnderstandingInputError()
  }
  if (policy.horizonOn < today) throw new UnderstandingInputError()
  const selectedIds = new Set(input.includedAccountIds)
  if (
    selectedIds.size !== input.includedAccountIds.length ||
    [...selectedIds].some((id) => !accountsById.has(id))
  )
    throw new UnderstandingInputError()
  const knowledge = new Map(input.accountKnowledge.map((row) => [row.accountId, row]))
  if (
    knowledge.size !== input.accountKnowledge.length ||
    [...knowledge.keys()].some((id) => !accountsById.has(id)) ||
    input.accountKnowledge.some(
      (row) =>
        !['booked', 'available', 'unknown'].includes(row.balanceMeaning) ||
        !validCoverage(row.coverage) ||
        (row.pendingOutflowsIncluded !== null && typeof row.pendingOutflowsIncluded !== 'boolean'),
    )
  )
    throw new UnderstandingInputError()
  const seriesById = new Map(input.recurring.map((series) => [series.id, series]))
  if (seriesById.size !== input.recurring.length) throw new UnderstandingInputError()
  for (const series of input.recurring) {
    try {
      dateOnly(series.nextOn)
    } catch {
      throw new UnderstandingInputError()
    }
    const evidence = series.transactionIds.map((id) => transactionsById.get(id))
    const first = evidence[0]
    if (
      !first ||
      evidence.some(
        (row) =>
          !row ||
          row.accountId !== first.accountId ||
          row.amount.currency !== series.expectedAmount.currency ||
          row.merchantKey !== series.merchantKey,
      ) ||
      typeof series.expectedAmount.amountMinor !== 'bigint'
    )
      throw new UnderstandingInputError()
  }
  const bindings = new Map<string, Transaction>()
  const boundTransactions = new Set<string>()
  for (const binding of input.occurrenceBindings) {
    const series = seriesById.get(binding.seriesId)
    const transaction = transactionsById.get(binding.transactionId)
    const first = series ? transactionsById.get(series.transactionIds[0] ?? '') : undefined
    const observedOn = transaction?.bookedOn ?? transaction?.authorizedOn
    if (
      !series ||
      !transaction ||
      !first ||
      !observedOn ||
      bindings.has(series.id) ||
      boundTransactions.has(transaction.id) ||
      transaction.status === 'reversed' ||
      transaction.accountId !== first.accountId ||
      transaction.amount.currency !== series.expectedAmount.currency ||
      transaction.merchantKey !== series.merchantKey ||
      transaction.amount.amountMinor >= 0n ||
      daysBetween(observedOn, series.nextOn) > policy.occurrenceToleranceDays
    )
      throw new UnderstandingInputError()
    bindings.set(series.id, transaction)
    boundTransactions.add(transaction.id)
  }
  // Cash availability differs from spending. Pending transfers/settlements still consume selected
  // cash until settled; positive pending transfers never add forecast cash. Only identity overlays
  // and duplicate suppression apply here, so a card payment is not accidentally forgotten.
  const cashRows = effectiveTransactions(
    input.transactions,
    input.matches.filter(
      (match) =>
        match.type === 'duplicate' || match.type === 'pending_to_booked' || match.type === 'refund',
    ),
  )
  const cashIds = new Set(cashRows.map((row) => row.id))
  const accounts = input.accounts.filter((row) => selectedIds.has(row.id))
  const currencies = uniqueSorted(accounts.map((row) => row.balance.currency)) as CurrencyCode[]
  return currencies.map((currency) => {
    const selected = accounts.filter((row) => row.balance.currency === currency)
    const currencyIds = new Set(selected.map((row) => row.id))
    const reasons = new Set<SafeToSpendReason>()
    const nowMs = instantMilliseconds(input.now)
    for (const account of selected) {
      const known = knowledge.get(account.id)
      if (!known || known.balanceMeaning === 'unknown') reasons.add('balance_meaning_unknown')
      if (known?.coverage === 'partial') reasons.add('coverage_partial')
      if (!known || known.coverage === 'unknown') reasons.add('coverage_unknown')
      if (account.kind === 'card') reasons.add('card_balance_not_spendable_cash')
      const updated = instantMilliseconds(account.balanceUpdatedAt)
      if (!Number.isFinite(updated)) reasons.add('balance_timestamp_invalid')
      else if (updated > nowMs) reasons.add('balance_timestamp_in_future')
      else if (nowMs - updated > policy.maxBalanceAgeMs) reasons.add('balance_stale')
    }
    const pending = cashRows.filter(
      (row) =>
        row.status === 'pending' && row.amount.amountMinor < 0n && currencyIds.has(row.accountId),
    )
    const visiblePending = pending.filter((row) => !excluded.has(row.id))
    if (
      cashRows.some(
        (row) =>
          currencyIds.has(row.accountId) &&
          row.status === 'booked' &&
          row.bookedOn !== null &&
          row.bookedOn > today,
      )
    )
      reasons.add('future_booked_data')
    if (pending.some((row) => excluded.has(row.id))) reasons.add('private_outflow_coverage')
    if (pending.some((row) => knowledge.get(row.accountId)?.pendingOutflowsIncluded == null))
      reasons.add('pending_balance_semantics_unknown')
    if (
      input.matches.some(
        (match) =>
          match.state === 'suggested' &&
          ['duplicate', 'pending_to_booked'].includes(match.type) &&
          match.transactionIds.some((id) => pending.some((row) => row.id === id)),
      )
    )
      reasons.add('unresolved_pending_reconciliation')
    let estimatedUpcoming = 0n
    const estimatedSeries = new Set<string>()
    const recurringEvidence = new Set<string>()
    const fulfilled = new Set<string>()
    const estimatedOccurrences: { seriesId: string; on: string; amountMinor: bigint }[] = []
    let forecastWork = 0
    for (const series of input.recurring) {
      const first = transactionsById.get(series.transactionIds[0] ?? '')
      if (
        !first ||
        !currencyIds.has(first.accountId) ||
        series.expectedAmount.amountMinor >= 0n ||
        series.nextOn > policy.horizonOn
      )
        continue
      const bound = bindings.get(series.id)
      if (
        series.transactionIds.some((id) => excluded.has(id)) ||
        (bound && excluded.has(bound.id))
      ) {
        reasons.add('private_recurring_coverage')
        continue
      }
      const representative =
        bound && !cashIds.has(bound.id)
          ? input.matches
              .filter(
                (match) =>
                  match.state === 'confirmed' &&
                  ['duplicate', 'pending_to_booked'].includes(match.type) &&
                  match.transactionIds.includes(bound.id),
              )
              .flatMap((match) => match.transactionIds)
              .find((id) => cashIds.has(id))
          : bound?.id
      if (representative && excluded.has(representative)) {
        reasons.add('private_recurring_coverage')
        continue
      }
      const firstMonth = Number(series.nextOn.slice(0, 4)) * 12 + Number(series.nextOn.slice(5, 7))
      const lastMonth =
        Number(policy.horizonOn.slice(0, 4)) * 12 + Number(policy.horizonOn.slice(5, 7))
      for (let offset = 0; offset <= lastMonth - firstMonth; offset++) {
        const occurrenceOn = addMonths(calendarDate(series.nextOn), offset)
        if (occurrenceOn > policy.horizonOn) break
        if (++forecastWork > policy.maxForecastOccurrences) {
          reasons.add('forecast_work_limit')
          break
        }
        const representativeRow = representative ? transactionsById.get(representative) : undefined
        const representativeOn = representativeRow?.bookedOn ?? representativeRow?.authorizedOn
        if (
          offset === 0 &&
          representative &&
          representativeOn &&
          cashIds.has(representative) &&
          daysBetween(representativeOn, occurrenceOn) <= policy.occurrenceToleranceDays
        ) {
          fulfilled.add(representative)
          continue
        }
        const candidates = cashRows.filter((row) => {
          const observedOn = row.bookedOn ?? row.authorizedOn
          return (
            row.accountId === first.accountId &&
            row.merchantKey === series.merchantKey &&
            row.amount.amountMinor < 0n &&
            observedOn !== null &&
            !series.transactionIds.includes(row.id) &&
            daysBetween(observedOn, occurrenceOn) <= policy.occurrenceToleranceDays
          )
        })
        if (candidates.length) {
          reasons.add(
            candidates.some((row) => excluded.has(row.id))
              ? 'private_recurring_coverage'
              : 'unresolved_recurring_occurrence',
          )
          continue
        }
        if (occurrenceOn < today) {
          reasons.add('overdue_recurring_occurrence')
          continue
        }
        estimatedUpcoming -= series.expectedAmount.amountMinor
        estimatedSeries.add(series.id)
        estimatedOccurrences.push({
          seriesId: series.id,
          on: occurrenceOn,
          amountMinor: -series.expectedAmount.amountMinor,
        })
        for (const id of series.transactionIds) recurringEvidence.add(id)
      }
    }
    const pendingHidden =
      reasons.has('private_outflow_coverage') || reasons.has('pending_balance_semantics_unknown')
    const forecastHidden =
      reasons.has('private_recurring_coverage') ||
      reasons.has('unresolved_recurring_occurrence') ||
      reasons.has('overdue_recurring_occurrence') ||
      reasons.has('forecast_work_limit')
    const pendingMinor = pendingHidden
      ? null
      : visiblePending.reduce(
          (sum, row) =>
            sum +
            (knowledge.get(row.accountId)?.pendingOutflowsIncluded === false
              ? -row.amount.amountMinor
              : 0n),
          0n,
        )
    const buffer = policy.bufferByCurrency[currency]
    if (buffer === undefined) reasons.add('buffer_not_configured')
    else if (typeof buffer !== 'bigint' || buffer < 0n) throw new UnderstandingInputError()
    const includedBalance = selected.reduce((sum, row) => sum + row.balance.amountMinor, 0n)
    const value =
      reasons.size || pendingMinor === null || buffer === undefined
        ? null
        : money(includedBalance - pendingMinor - estimatedUpcoming - buffer, currency)
    return {
      currency,
      algorithmVersion: UNDERSTANDING_VERSION,
      policyVersion: policy.version,
      status: value === null ? 'unavailable' : value.amountMinor < 0n ? 'shortfall' : 'available',
      value,
      isEstimate: true,
      confidence: null,
      horizonOn: policy.horizonOn,
      calculatedOn: today,
      inputs: {
        accountIds: uniqueSorted(selected.map((row) => row.id)),
        pendingTransactionIds: uniqueSorted(visiblePending.map((row) => row.id)),
        estimatedSeriesIds: uniqueSorted(estimatedSeries),
        estimatedOccurrences: estimatedOccurrences.sort(
          (first, second) =>
            first.on.localeCompare(second.on) || first.seriesId.localeCompare(second.seriesId),
        ),
        recurringEvidenceTransactionIds: uniqueSorted(recurringEvidence),
        fulfilledOccurrenceTransactionIds: uniqueSorted(fulfilled),
      },
      calculation: {
        formula:
          'safe_to_spend = included_balances - pending_outflows - estimated_upcoming_outflows - buffer',
        includedBalanceMinor: includedBalance,
        pendingOutflowsMinor: pendingMinor,
        estimatedUpcomingOutflowsMinor: forecastHidden ? null : estimatedUpcoming,
        bufferMinor: buffer ?? null,
        forecastIncomeAddedMinor: 0n,
      },
      reasons: [...reasons].sort(),
      explanationIt:
        value === null
          ? 'La stima non è disponibile: verifica i dati e i collegamenti indicati. Un dato mancante non viene trattato come zero.'
          : 'È una stima fino alla data indicata: saldo dei conti scelti meno uscite in sospeso, uscite ricorrenti stimate e margine. Le entrate future non sono aggiunte; nuove spese e imprevisti possono cambiarla.',
    }
  })
}

/** Calendar helpers keep salary/month-end horizon selection visible to the caller. */
export function understandingHorizon(input: {
  now: string
  timezone: string
  nextSalaryOn: string | null
}): string {
  try {
    if (!isProfileTimezone(input.timezone)) throw new UnderstandingInputError()
    const today = calendarDateAt(new Date(instantMilliseconds(input.now)), input.timezone)
    if (input.nextSalaryOn !== null) {
      const salary = dateOnly(input.nextSalaryOn)
      if (salary <= today) throw new UnderstandingInputError()
      return salary
    }
    return endOfMonth(today)
  } catch {
    throw new UnderstandingInputError()
  }
}
