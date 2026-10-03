import {
  addDays,
  addMonths,
  calendarDate,
  dateOnly,
  daysBetween,
  endOfMonth,
  type Money,
  type ReconciliationMatch,
  type Transaction,
} from '@lilleri/domain'
import { money } from '@lilleri/money'
import { effectiveTransactions } from './index.js'
import {
  RECURRING_FREQUENCIES,
  type RecurringFrequency,
  type RecurringPolicy,
} from './recurring-policy.js'

export const OBSERVED_RECURRING_VERSION = 'recurring-observed-v1'
export const RECURRING_KINDS = [
  'subscription',
  'recurring_bill',
  'salary',
  'recurring_transfer',
  'installment',
] as const
export type RecurringKind = (typeof RECURRING_KINDS)[number]
export interface RecurringEvidence {
  readonly merchantId?: string
  readonly merchantResolution?: 'resolved' | 'ambiguous' | 'unknown' | 'suppressed'
  readonly creditorId?: string
  readonly mandateReference?: string
  readonly purpose?: RecurringKind
  readonly savingsPlan?: boolean
  readonly installmentCount?: number
  readonly installmentIndex?: number
  readonly noticePeriod?: string
  readonly cancellationInstructions?: string
}
export interface RecurringSelector {
  readonly profileId: string
  readonly accountId: string
  readonly currency: Money['currency']
  readonly direction: 'outgoing' | 'incoming'
  readonly identityKind: 'mandate' | 'creditor' | 'merchant' | 'legacy_merchant'
  readonly identityValue: string
}
export interface RecurringChoice {
  readonly status: 'observed' | 'confirmed' | 'not_recurring'
  readonly kind: RecurringKind | null
  readonly frequency: RecurringFrequency | null
  readonly installmentCount: number | null
  readonly installmentIndex: number | null
}
export interface ObservedRecurringSeries {
  readonly stableKey: string
  readonly selector: RecurringSelector
  readonly kind: RecurringKind
  readonly frequency: RecurringFrequency
  readonly nextOn: string | null
  readonly expectedAmount: Money
  readonly variability: 'fixed' | 'variable'
  readonly status: RecurringChoice['status']
  readonly transactionIds: readonly string[]
  readonly firstOn: string
  readonly latestOn: string
  readonly statistics: {
    readonly observedCount: number
    readonly medianMethod: 'upper_absolute_minor'
    readonly minimumAmount: Money
    readonly maximumAmount: Money
    readonly dayOfMonthMedian: number
    readonly anchorDay: number
    readonly observedIntervalsDays: readonly number[]
    readonly amountOutsideBand: boolean
  }
  readonly remainingInstallments: number | null
  readonly noticePeriod: string | null
  readonly cancellationInstructions: string | null
  readonly isEstimate: true
  readonly confidence: null
  readonly confidenceWord: 'observed_pattern' | 'user_confirmed'
  readonly algorithmVersion: typeof OBSERVED_RECURRING_VERSION
  readonly policyVersion: string
  readonly evidence: readonly string[]
  readonly explanationIt: string
}
export class RecurringInputError extends Error {
  constructor() {
    super('Recurring inputs are invalid')
    this.name = 'RecurringInputError'
  }
}
const abs = (value: bigint) => (value < 0n ? -value : value)
const monthSteps: Partial<Record<RecurringFrequency, number>> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}
export function recurringStableKey(selector: RecurringSelector): string {
  return JSON.stringify([
    selector.profileId,
    selector.accountId,
    selector.currency,
    selector.direction,
    selector.identityKind,
    selector.identityValue,
  ])
}
function policyValid(policy: RecurringPolicy) {
  if (
    !policy.version ||
    !Number.isSafeInteger(policy.minimumOccurrences) ||
    policy.minimumOccurrences < 3 ||
    !Number.isSafeInteger(policy.longPeriodMinimumOccurrences) ||
    policy.longPeriodMinimumOccurrences < 2 ||
    !Number.isSafeInteger(policy.fixedAmountToleranceBps) ||
    policy.fixedAmountToleranceBps < 0 ||
    !Number.isSafeInteger(policy.variableAmountBandBps) ||
    policy.variableAmountBandBps < policy.fixedAmountToleranceBps ||
    !Number.isSafeInteger(policy.horizonDays) ||
    policy.horizonDays < 1 ||
    !Number.isSafeInteger(policy.maxProjectedOccurrences) ||
    policy.maxProjectedOccurrences < 1 ||
    RECURRING_FREQUENCIES.filter((frequency) => frequency !== 'irregular').some(
      (frequency) =>
        !Number.isSafeInteger(policy.toleranceDays[frequency]) ||
        policy.toleranceDays[frequency] < 0 ||
        policy.toleranceDays[frequency] > 31,
    )
  )
    throw new RecurringInputError()
}
export function advanceRecurringDate(
  date: string,
  frequency: RecurringFrequency,
  anchorDay: number,
): string | null {
  dateOnly(date)
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31)
    throw new RecurringInputError()
  if (frequency === 'irregular') return null
  if (frequency === 'weekly' || frequency === 'biweekly')
    return String(addDays(calendarDate(date), frequency === 'weekly' ? 7 : 14))
  const steps = monthSteps[frequency]
  if (!steps) throw new RecurringInputError()
  const next = String(addMonths(calendarDate(`${date.slice(0, 7)}-01`), steps))
  const lastDay = Number(String(endOfMonth(calendarDate(next))).slice(8))
  return `${next.slice(0, 7)}-${String(Math.min(anchorDay, lastDay)).padStart(2, '0')}`
}
function matchesPeriod(
  rows: readonly Transaction[],
  frequency: Exclude<RecurringFrequency, 'irregular'>,
  anchorDay: number,
  tolerance: number,
) {
  return rows.every((row, index) => {
    if (index === 0) return true
    const previous = rows[index - 1]?.bookedOn
    if (!previous || !row.bookedOn) return false
    const expected = advanceRecurringDate(previous, frequency, anchorDay)
    return expected !== null && Math.abs(daysBetween(expected, row.bookedOn)) <= tolerance
  })
}
export function detectObservedRecurring(input: {
  readonly profileId: string
  readonly asOfOn: string
  readonly transactions: readonly Transaction[]
  readonly matches: readonly ReconciliationMatch[]
  readonly evidenceByTransactionId?: Readonly<Record<string, RecurringEvidence>>
  readonly choices?: Readonly<Record<string, RecurringChoice>>
  readonly policy: RecurringPolicy
}): ObservedRecurringSeries[] {
  policyValid(input.policy)
  dateOnly(input.asOfOn)
  const owned = new Map(input.transactions.map((row) => [row.id, row]))
  if (
    !input.profileId ||
    owned.size !== input.transactions.length ||
    input.transactions.some((row) => row.profileId !== input.profileId) ||
    input.matches.some((match) => match.transactionIds.some((id) => !owned.has(id)))
  )
    throw new RecurringInputError()
  const hints = input.evidenceByTransactionId ?? {}
  const groups = new Map<string, { selector: RecurringSelector; rows: Transaction[] }>()
  const excludedMovements = new Set(
    input.matches
      .filter(
        (match) =>
          match.state === 'confirmed' &&
          ['internal_transfer', 'cash_transfer'].includes(match.type),
      )
      .flatMap((match) => match.transactionIds),
  )
  // Explicit savings plans may be transfers; identity overlays still count only once.
  const effective = effectiveTransactions(
    input.transactions,
    input.matches.filter((match) => !['internal_transfer', 'cash_transfer'].includes(match.type)),
  )
  for (const row of effective) {
    const hint = hints[row.id] ?? {}
    if (row.bookedOn !== null) dateOnly(row.bookedOn)
    if (
      row.status !== 'booked' ||
      !row.bookedOn ||
      row.bookedOn > input.asOfOn ||
      row.amount.amountMinor === 0n ||
      ['card_settlement', 'cash_withdrawal', 'refund'].includes(row.kind) ||
      (excludedMovements.has(row.id) &&
        !(hint.savingsPlan && hint.purpose === 'recurring_transfer')) ||
      (row.kind === 'transfer' && !(hint.savingsPlan && hint.purpose === 'recurring_transfer')) ||
      !['expense', 'income', 'transfer'].includes(row.kind)
    )
      continue
    const identity = hint.mandateReference
      ? {
          kind: 'mandate' as const,
          value: JSON.stringify([hint.creditorId ?? null, hint.mandateReference]),
        }
      : hint.creditorId
        ? { kind: 'creditor' as const, value: hint.creditorId }
        : hint.merchantId && hint.merchantResolution === 'resolved'
          ? { kind: 'merchant' as const, value: hint.merchantId }
          : row.merchantKey && !['ambiguous', 'suppressed'].includes(hint.merchantResolution ?? '')
            ? { kind: 'legacy_merchant' as const, value: row.merchantKey }
            : null
    if (!identity) continue
    const selector: RecurringSelector = {
      profileId: input.profileId,
      accountId: row.accountId,
      currency: row.amount.currency,
      direction: row.amount.amountMinor < 0n ? 'outgoing' : 'incoming',
      identityKind: identity.kind,
      identityValue: identity.value,
    }
    const key = recurringStableKey(selector),
      existing = groups.get(key)
    if (existing) existing.rows.push(row)
    else groups.set(key, { selector, rows: [row] })
  }
  const results: ObservedRecurringSeries[] = []
  for (const [stableKey, group] of groups) {
    const rows = group.rows.sort(
      (a, b) => (a.bookedOn ?? '').localeCompare(b.bookedOn ?? '') || a.id.localeCompare(b.id),
    )
    const choice = input.choices?.[stableKey]
    const explicit = choice?.status === 'confirmed' || choice?.status === 'not_recurring'
    if (rows.length < input.policy.longPeriodMinimumOccurrences && !explicit) continue
    const dates = rows.map((row) => row.bookedOn as string)
    if (new Set(dates).size !== dates.length) continue // Same-day competing debits require reconciliation.
    const values = rows
      .map((row) => abs(row.amount.amountMinor))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const median = values[Math.floor(values.length / 2)] as bigint
    const fixed = values.every(
      (value) =>
        abs(value - median) * 10_000n <= median * BigInt(input.policy.fixedAmountToleranceBps),
    )
    const days = dates.map((date) => Number(date.slice(8))).sort((a, b) => a - b)
    const maxDay = days[days.length - 1] as number
    const medianDay = days[Math.floor(days.length / 2)] as number
    const hasClampedShortMonth = dates.some(
      (date) => date === String(endOfMonth(calendarDate(date))) && Number(date.slice(8)) < maxDay,
    )
    const anchorDay = hasClampedShortMonth ? maxDay : medianDay
    const matching = RECURRING_FREQUENCIES.filter(
      (frequency): frequency is Exclude<RecurringFrequency, 'irregular'> =>
        frequency !== 'irregular',
    ).filter((frequency) => {
      const long = frequency === 'semiannual' || frequency === 'annual'
      const count = long
        ? input.policy.longPeriodMinimumOccurrences
        : input.policy.minimumOccurrences
      return (
        rows.length >= count &&
        (!long ||
          rows.length >= input.policy.minimumOccurrences ||
          fixed ||
          group.selector.identityKind === 'mandate') &&
        matchesPeriod(rows, frequency, anchorDay, input.policy.toleranceDays[frequency])
      )
    })
    let frequency: RecurringFrequency
    if (explicit && choice?.frequency) frequency = choice.frequency
    else if (matching.length === 1) frequency = matching[0] as RecurringFrequency
    else if (
      !matching.length &&
      rows.length >= input.policy.minimumOccurrences &&
      group.selector.identityKind === 'mandate'
    )
      frequency = 'irregular'
    else continue
    const purposes = [
      ...new Set(
        rows
          .map((row) => hints[row.id]?.purpose)
          .filter((kind): kind is RecurringKind => kind !== undefined),
      ),
    ]
    if (purposes.length > 1 && !choice?.kind) continue
    const kind =
      choice?.kind ??
      purposes[0] ??
      (group.selector.direction === 'outgoing' ? 'recurring_bill' : null)
    if (
      !kind ||
      (kind === 'subscription' && !fixed) ||
      (group.selector.direction === 'incoming' && kind !== 'salary') ||
      (group.selector.direction === 'outgoing' && kind === 'salary') ||
      (kind === 'recurring_transfer' && !rows.every((row) => hints[row.id]?.savingsPlan === true))
    )
      continue
    const latest = rows[rows.length - 1] as Transaction
    const latestHint = hints[latest.id] ?? {}
    const installmentCount = choice?.installmentCount ?? latestHint.installmentCount ?? null
    const installmentIndex = choice?.installmentIndex ?? latestHint.installmentIndex ?? null
    const installmentVerified =
      kind !== 'installment' ||
      !(
        !values.every((value) => value === median) ||
        installmentCount === null ||
        installmentIndex === null ||
        !Number.isInteger(installmentCount) ||
        !Number.isInteger(installmentIndex) ||
        installmentIndex < rows.length ||
        installmentIndex > installmentCount
      )
    if (!installmentVerified && !explicit) continue
    const remaining =
      kind === 'installment' &&
      installmentVerified &&
      installmentCount !== null &&
      installmentIndex !== null
        ? installmentCount - installmentIndex
        : null
    const nextOn =
      remaining === 0 || !installmentVerified
        ? null
        : advanceRecurringDate(latest.bookedOn as string, frequency, anchorDay)
    const expectedAmount = money(
      group.selector.direction === 'outgoing' ? -median : median,
      group.selector.currency,
    )
    results.push({
      stableKey,
      selector: group.selector,
      kind,
      frequency,
      nextOn,
      expectedAmount,
      variability: fixed ? 'fixed' : 'variable',
      status: choice?.status ?? 'observed',
      transactionIds: rows.map((row) => row.id),
      firstOn: dates[0] as string,
      latestOn: dates[dates.length - 1] as string,
      remainingInstallments: remaining,
      statistics: {
        observedCount: rows.length,
        medianMethod: 'upper_absolute_minor',
        minimumAmount: money(values[0] as bigint, group.selector.currency),
        maximumAmount: money(values[values.length - 1] as bigint, group.selector.currency),
        dayOfMonthMedian: medianDay,
        anchorDay,
        observedIntervalsDays: dates
          .slice(1)
          .map((date, index) => Math.abs(daysBetween(dates[index] as string, date))),
        amountOutsideBand:
          abs(abs(latest.amount.amountMinor) - median) * 10_000n >
          median * BigInt(input.policy.variableAmountBandBps),
      },
      noticePeriod: latestHint.noticePeriod ?? null,
      cancellationInstructions: latestHint.cancellationInstructions ?? null,
      isEstimate: true,
      confidence: null,
      confidenceWord: choice?.status === 'confirmed' ? 'user_confirmed' : 'observed_pattern',
      algorithmVersion: OBSERVED_RECURRING_VERSION,
      policyVersion: input.policy.version,
      evidence: [
        group.selector.identityKind === 'mandate'
          ? 'explicit-mandate-group'
          : group.selector.identityKind === 'creditor'
            ? 'explicit-creditor-group'
            : group.selector.identityKind === 'merchant'
              ? 'resolved-stable-merchant'
              : 'legacy-merchant-pattern',
        `${rows.length}-observed-booked-occurrences`,
        explicit ? 'explicit-user-choice' : 'period-within-configured-tolerance',
        'not-a-confirmed-contract',
        ...(!installmentVerified ? ['installment-evidence-requires-review'] : []),
      ],
      explanationIt:
        choice?.status === 'not_recurring'
          ? 'Hai escluso questa sequenza dalle ricorrenze. I movimenti originali restano nel registro.'
          : 'La data e l’importo previsti sono stime basate sui movimenti osservati e sulle tue eventuali correzioni; non confermano un contratto.',
    })
  }
  return results.sort((a, b) => a.stableKey.localeCompare(b.stableKey))
}

/** Shared calendar enumerator; unsupported/irregular horizons remain explicitly unknown. */
export function projectRecurringOccurrences(
  series: ObservedRecurringSeries,
  throughOn: string,
  limit: number,
) {
  dateOnly(throughOn)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RecurringInputError()
  if (
    series.frequency === 'irregular' ||
    (series.nextOn === null && series.remainingInstallments !== 0)
  )
    return { status: 'unknown' as const, occurrences: [] }
  const occurrences: { on: string; amount: Money }[] = []
  let on = series.nextOn,
    remaining = series.remainingInstallments
  while (on !== null && on <= throughOn && remaining !== 0) {
    if (occurrences.length >= limit) return { status: 'work_limit' as const, occurrences: [] }
    occurrences.push({ on, amount: series.expectedAmount })
    if (remaining !== null) remaining--
    on = advanceRecurringDate(on, series.frequency, series.statistics.anchorDay)
  }
  return { status: 'estimated' as const, occurrences }
}
