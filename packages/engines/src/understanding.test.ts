import type { Account, ReconciliationMatch, RecurringSeries, Transaction } from '@lilleri/domain'
import { money } from '@lilleri/money'
import { describe, expect, test } from 'vitest'
import { detectRecurring, reconcile } from './index.js'
import {
  buildMonthlyInsights,
  calculateSafeToSpend,
  type MonthlyInsightsInput,
  type SafeToSpendInput,
  UnderstandingInputError,
  understandingHorizon,
} from './understanding.js'

const account = (id = 'a', overrides: Partial<Account> = {}): Account => ({
  id,
  profileId: 'p',
  connectionId: 'c',
  providerAccountId: id,
  name: 'Conto sintetico',
  institutionName: 'Istituto sintetico',
  kind: 'current',
  balance: money(100_000n, 'EUR'),
  balanceUpdatedAt: '2026-10-03T11:00:00.000Z',
  ...overrides,
})
const transaction = (id: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  profileId: 'p',
  accountId: 'a',
  connectionId: 'c',
  providerId: 'mock',
  providerTransactionId: id,
  revision: 1,
  source: 'bank',
  status: 'booked',
  amount: money(-1_000n, 'EUR'),
  description: 'Pagamento sintetico',
  merchantName: 'Esercente sintetico',
  merchantKey: 'synthetic',
  bookedOn: '2026-10-02',
  authorizedOn: null,
  observedAt: '2026-10-03T11:00:00.000Z',
  kind: 'expense',
  reference: null,
  relatedTransactionId: null,
  relatedAccountId: null,
  ...overrides,
})
function monthly(overrides: Partial<MonthlyInsightsInput> = {}): MonthlyInsightsInput {
  return {
    profileId: 'p',
    timezone: 'Europe/Rome',
    now: '2026-10-03T12:00:00.000Z',
    accounts: [account()],
    transactions: [],
    matches: [],
    excludedTransactionIds: [],
    coverageByAccount: { a: 'complete' },
    ...overrides,
  }
}
function safe(overrides: Partial<SafeToSpendInput> = {}): SafeToSpendInput {
  return {
    profileId: 'p',
    timezone: 'Europe/Rome',
    now: '2026-10-03T12:00:00.000Z',
    accounts: [account()],
    transactions: [],
    matches: [],
    excludedTransactionIds: [],
    recurring: [],
    includedAccountIds: ['a'],
    accountKnowledge: [
      {
        accountId: 'a',
        balanceMeaning: 'booked',
        pendingOutflowsIncluded: false,
        coverage: 'complete',
      },
    ],
    occurrenceBindings: [],
    policy: {
      version: 'synthetic-policy-v1',
      horizonOn: '2026-10-31',
      maxBalanceAgeMs: 86_400_000,
      occurrenceToleranceDays: 3,
      maxForecastOccurrences: 100,
      bufferByCurrency: { EUR: 5_000n },
    },
    ...overrides,
  }
}
function recurringFixture() {
  const rows = ['2026-07-10', '2026-08-10', '2026-09-10'].map((bookedOn, index) =>
    transaction(`subscription-${index}`, {
      bookedOn,
      amount: money(-1_200n, 'EUR'),
      merchantKey: 'netflix',
    }),
  )
  const series = detectRecurring(rows)
  if (series.length !== 1) throw new Error('Synthetic recurrence fixture failed')
  return { rows, series: series as RecurringSeries[] }
}
const json = (value: unknown) =>
  JSON.stringify(value, (_, entry) => (typeof entry === 'bigint' ? entry.toString() : entry))

describe('observed monthly insights', () => {
  test('profile timezone selects today/month, without shifting provider booking dates', () => {
    const now = '2026-09-30T22:30:00.000Z'
    const rows = [
      transaction('sept', { bookedOn: '2026-09-30' }),
      transaction('oct', { bookedOn: '2026-10-01' }),
    ]
    const rome = buildMonthlyInsights(monthly({ now, transactions: rows }))[0]
    const utc = buildMonthlyInsights(monthly({ now, timezone: 'UTC', transactions: rows }))[0]
    expect(rome).toMatchObject({
      month: '2026-10',
      inputs: { transactionIds: ['oct'], throughOn: '2026-10-01' },
    })
    expect(utc).toMatchObject({
      month: '2026-09',
      inputs: { transactionIds: ['sept'], throughOn: '2026-09-30' },
    })
    expect(rows[0]?.bookedOn).toBe('2026-09-30')
  })

  test('income, gross expenses and linked refunds retain exact separate evidence and a current-month net', () => {
    const rows = [
      transaction('salary', { amount: money(200_000n, 'EUR'), kind: 'income' }),
      transaction('purchase', { amount: money(-5_000n, 'EUR') }),
      transaction('refund', {
        amount: money(1_200n, 'EUR'),
        kind: 'refund',
        relatedTransactionId: 'purchase',
      }),
      transaction('pending', {
        status: 'pending',
        bookedOn: null,
        authorizedOn: '2026-10-02',
        amount: money(-9_000n, 'EUR'),
      }),
    ]
    const matches = reconcile([account()], rows)
    const result = buildMonthlyInsights(monthly({ transactions: rows, matches }))[0]
    expect(result).toMatchObject({
      isEstimate: false,
      confidence: null,
      status: 'complete',
      calculation: {
        incomeMinor: 200_000n,
        expensesMinor: 5_000n,
        linkedRefundsMinor: 1_200n,
        bookedTransactionCount: 3,
      },
      value: { netSpending: money(3_800n, 'EUR'), netFlow: money(196_200n, 'EUR') },
    })
    expect(result?.inputs.refundTransactionIds).toEqual(['refund'])
    expect(result?.inputs.transactionIds).not.toContain('pending')
  })

  test('a refund of a prior-month purchase reduces current net spending rather than inventing earned income', () => {
    const rows = [
      transaction('purchase', { bookedOn: '2026-09-29' }),
      transaction('refund', {
        kind: 'refund',
        amount: money(1_000n, 'EUR'),
        relatedTransactionId: 'purchase',
      }),
    ]
    const result = buildMonthlyInsights(
      monthly({ transactions: rows, matches: reconcile([account()], rows) }),
    )[0]
    expect(result?.calculation.incomeMinor).toBe(0n)
    expect(result?.value.netSpending.amountMinor).toBe(-1_000n)
    expect(result?.inputs.transactionIds).toEqual(['refund'])
  })

  test('unlinked refunds and unexplained credits stay separate from income and reduce no expense', () => {
    const result = buildMonthlyInsights(
      monthly({
        transactions: [
          transaction('unlinked-refund', { kind: 'refund', amount: money(700n, 'EUR') }),
          transaction('unexplained-credit', { kind: 'expense', amount: money(300n, 'EUR') }),
        ],
      }),
    )[0]
    expect(result).toMatchObject({
      status: 'partial',
      calculation: { incomeMinor: 0n, linkedRefundsMinor: 0n, unresolvedCreditsMinor: 1_000n },
      value: { netSpending: money(0n, 'EUR') },
    })
    expect(result?.reasons).toContain('unresolved_refund')
    expect(result?.reasons).toContain('unresolved_cash_flow')
  })

  test('confirmed duplicates/overlays, reversals and semantic transfers/settlements are counted once or excluded', () => {
    const rows = [
      transaction('bank', { reference: 'duplicate' }),
      transaction('csv', { source: 'csv', reference: 'duplicate' }),
      transaction('pending', {
        status: 'pending',
        bookedOn: null,
        authorizedOn: '2026-10-02',
        reference: 'overlay',
      }),
      transaction('booked', { reference: 'overlay', relatedTransactionId: 'pending' }),
      transaction('transfer', { kind: 'transfer', amount: money(-20_000n, 'EUR') }),
      transaction('settlement', { kind: 'card_settlement', amount: money(-50_000n, 'EUR') }),
      transaction('withdrawal', { kind: 'cash_withdrawal', amount: money(-10_000n, 'EUR') }),
      transaction('reversed', { status: 'reversed' }),
    ]
    const result = buildMonthlyInsights(
      monthly({ transactions: rows, matches: reconcile([account()], rows) }),
    )[0]
    expect(result?.calculation.expensesMinor).toBe(2_000n)
    expect(result?.inputs.transactionIds).toEqual(['bank', 'booked'])
  })

  test('quiet records and their relationship identifiers never appear in monthly insight evidence', () => {
    const rows = [
      transaction('private-purchase'),
      transaction('visible-refund', {
        kind: 'refund',
        amount: money(1_000n, 'EUR'),
        relatedTransactionId: 'private-purchase',
      }),
      transaction('visible'),
    ]
    const result = buildMonthlyInsights(
      monthly({
        transactions: rows,
        matches: reconcile([account()], rows),
        excludedTransactionIds: ['private-purchase'],
      }),
    )[0]
    expect(json(result)).not.toContain('private-purchase')
    expect(result?.calculation.expensesMinor).toBe(1_000n)
    expect(result?.calculation.linkedRefundsMinor).toBe(0n)
    expect(result?.reasons).toContain('unresolved_refund')
  })

  test('coverage gaps and missing booking dates flag an observed subtotal instead of fabricated complete history', () => {
    const result = buildMonthlyInsights(
      monthly({
        transactions: [transaction('known'), transaction('undated', { bookedOn: null })],
        coverageByAccount: {},
      }),
    )[0]
    expect(result).toMatchObject({ status: 'partial', calculation: { expensesMinor: 1_000n } })
    expect(result?.reasons).toEqual(['coverage_unknown', 'missing_booked_date'])
  })

  test('historical months end on the calendar boundary and current/future booked rows cannot inflate observed-to-date totals', () => {
    const rows = [
      transaction('feb', { bookedOn: '2024-02-29' }),
      transaction('future', { bookedOn: '2026-10-30' }),
    ]
    expect(
      buildMonthlyInsights(monthly({ month: '2024-02', transactions: rows }))[0]?.inputs.throughOn,
    ).toBe('2024-02-29')
    expect(
      buildMonthlyInsights(monthly({ transactions: rows }))[0]?.calculation.expensesMinor,
    ).toBe(0n)
    expect(() => buildMonthlyInsights(monthly({ month: '2026-11' }))).toThrow(
      UnderstandingInputError,
    )
  })

  test('EUR, JPY and KWD remain separate exact bigint results beyond the JavaScript safe integer limit', () => {
    const accounts = [
      account(),
      account('jpy', { balance: money(90071992547409930n, 'JPY') }),
      account('kwd', { balance: money(12345n, 'KWD') }),
    ]
    const rows = [
      transaction('jpy-out', { accountId: 'jpy', amount: money(-9007199254740993n, 'JPY') }),
      transaction('kwd-out', { accountId: 'kwd', amount: money(-1234n, 'KWD') }),
    ]
    const result = buildMonthlyInsights(
      monthly({
        accounts,
        transactions: rows,
        coverageByAccount: { a: 'complete', jpy: 'complete', kwd: 'complete' },
      }),
    )
    expect(result.map((row) => row.currency)).toEqual(['EUR', 'JPY', 'KWD'])
    expect(result.find((row) => row.currency === 'JPY')?.value.netSpending.amountMinor).toBe(
      9007199254740993n,
    )
    expect(result.find((row) => row.currency === 'KWD')?.value.netSpending.amountMinor).toBe(1234n)
  })
})

describe('conservative safe-to-spend calculation', () => {
  test('visible formula reserves pending outflows, future estimated expenses and the explicit buffer without adding forecast income', () => {
    const { rows, series } = recurringFixture()
    const salaryRows = rows.map((row) => ({
      ...row,
      id: `salary-${row.id}`,
      merchantKey: 'salary',
      amount: money(200_000n, 'EUR'),
      kind: 'income' as const,
    }))
    const salarySeries = detectRecurring(salaryRows)
    const result = calculateSafeToSpend(
      safe({
        transactions: [
          ...rows,
          ...salaryRows,
          transaction('pending', {
            status: 'pending',
            bookedOn: null,
            authorizedOn: '2026-10-03',
            amount: money(-2_000n, 'EUR'),
          }),
        ],
        recurring: [...series, ...salarySeries],
      }),
    )[0]
    expect(result).toMatchObject({
      status: 'available',
      value: money(91_800n, 'EUR'),
      isEstimate: true,
      confidence: null,
      calculation: {
        includedBalanceMinor: 100_000n,
        pendingOutflowsMinor: 2_000n,
        estimatedUpcomingOutflowsMinor: 1_200n,
        bufferMinor: 5_000n,
        forecastIncomeAddedMinor: 0n,
      },
    })
    expect(result?.inputs.estimatedSeriesIds).toEqual([series[0]?.id])
  })

  test('provider available balances that already include pending outflows are not reduced a second time', () => {
    const result = calculateSafeToSpend(
      safe({
        transactions: [
          transaction('pending', { status: 'pending', amount: money(-2_000n, 'EUR') }),
        ],
        accountKnowledge: [
          {
            accountId: 'a',
            balanceMeaning: 'available',
            pendingOutflowsIncluded: true,
            coverage: 'complete',
          },
        ],
      }),
    )[0]
    expect(result?.calculation.pendingOutflowsMinor).toBe(0n)
    expect(result?.value?.amountMinor).toBe(95_000n)
  })

  test('pending-to-booked overlays remove the pending hold instead of subtracting an already booked payment again', () => {
    const rows = [
      transaction('pending', { status: 'pending', reference: 'overlay' }),
      transaction('booked', { reference: 'overlay', relatedTransactionId: 'pending' }),
    ]
    const result = calculateSafeToSpend(
      safe({ transactions: rows, matches: reconcile([account()], rows) }),
    )[0]
    expect(result?.calculation.pendingOutflowsMinor).toBe(0n)
    expect(result?.inputs.pendingTransactionIds).toEqual([])
  })

  test('verified pending or booked occurrence bindings suppress the same estimated recurring payment', () => {
    const { rows, series } = recurringFixture()
    const seriesId = series[0]?.id as string
    for (const status of ['pending', 'booked'] as const) {
      const observed = transaction('observed', {
        status,
        bookedOn: status === 'booked' ? '2026-10-10' : null,
        authorizedOn: '2026-10-10',
        merchantKey: 'netflix',
        amount: money(-1_200n, 'EUR'),
      })
      const result = calculateSafeToSpend(
        safe({
          now: '2026-10-10T12:00:00.000Z',
          accounts: [account('a', { balanceUpdatedAt: '2026-10-10T11:00:00.000Z' })],
          transactions: [...rows, observed],
          recurring: series,
          occurrenceBindings: [{ seriesId, transactionId: observed.id }],
        }),
      )[0]
      expect(result?.calculation.estimatedUpcomingOutflowsMinor).toBe(0n)
      expect(result?.value?.amountMinor).toBe(status === 'pending' ? 93_800n : 95_000n)
      expect(result?.inputs.fulfilledOccurrenceTransactionIds).toEqual(['observed'])
    }
  })

  test('a verified old pending binding follows its booked representative once', () => {
    const { rows, series } = recurringFixture()
    const pending = transaction('pending-occurrence', {
      status: 'pending',
      bookedOn: null,
      authorizedOn: '2026-10-10',
      merchantKey: 'netflix',
      reference: 'same-occurrence',
      amount: money(-1_200n, 'EUR'),
    })
    const booked = transaction('booked-occurrence', {
      bookedOn: '2026-10-10',
      merchantKey: 'netflix',
      reference: 'same-occurrence',
      amount: money(-1_200n, 'EUR'),
      relatedTransactionId: pending.id,
    })
    const all = [...rows, pending, booked]
    const result = calculateSafeToSpend(
      safe({
        now: '2026-10-10T12:00:00.000Z',
        accounts: [account('a', { balanceUpdatedAt: '2026-10-10T11:00:00.000Z' })],
        transactions: all,
        matches: reconcile([account()], all),
        recurring: series,
        occurrenceBindings: [{ seriesId: series[0]?.id as string, transactionId: pending.id }],
      }),
    )[0]
    expect(result?.calculation).toMatchObject({
      pendingOutflowsMinor: 0n,
      estimatedUpcomingOutflowsMinor: 0n,
    })
    expect(result?.inputs.fulfilledOccurrenceTransactionIds).toEqual([booked.id])
  })

  test('mere merchant/date similarity does not invent an occurrence match or double-reserve an uncertain payment', () => {
    const { rows, series } = recurringFixture()
    const candidate = transaction('candidate', {
      status: 'pending',
      bookedOn: null,
      authorizedOn: '2026-10-10',
      merchantKey: 'netflix',
      amount: money(-1_200n, 'EUR'),
    })
    const result = calculateSafeToSpend(
      safe({ transactions: [...rows, candidate], recurring: series }),
    )[0]
    expect(result?.value).toBeNull()
    expect(result?.reasons).toContain('unresolved_recurring_occurrence')
    expect(result?.calculation.estimatedUpcomingOutflowsMinor).toBeNull()
  })

  test('unknown, partial or stale balances make the estimate unavailable rather than zero', () => {
    const variants: Partial<SafeToSpendInput>[] = [
      { accountKnowledge: [] },
      {
        accountKnowledge: [
          {
            accountId: 'a',
            balanceMeaning: 'unknown',
            pendingOutflowsIncluded: false,
            coverage: 'complete',
          },
        ],
      },
      {
        accountKnowledge: [
          {
            accountId: 'a',
            balanceMeaning: 'booked',
            pendingOutflowsIncluded: false,
            coverage: 'partial',
          },
        ],
      },
      { accounts: [account('a', { balanceUpdatedAt: '2026-10-01T00:00:00.000Z' })] },
      { accounts: [account('a', { balanceUpdatedAt: '2026-10-04T00:00:00.000Z' })] },
      { accounts: [account('a', { balanceUpdatedAt: 'invalid' })] },
      { accounts: [account('a', { kind: 'card' })] },
    ]
    for (const change of variants) {
      const result = calculateSafeToSpend(safe(change))[0]
      expect(result?.status).toBe('unavailable')
      expect(result?.value).toBeNull()
      expect(result?.reasons.length).toBeGreaterThan(0)
    }
  })

  test('unknown pending semantics and unresolved identity overlays cannot become spendable cash', () => {
    const pending = transaction('pending', { status: 'pending' })
    const result = calculateSafeToSpend(
      safe({
        transactions: [pending],
        accountKnowledge: [
          {
            accountId: 'a',
            balanceMeaning: 'booked',
            pendingOutflowsIncluded: null,
            coverage: 'complete',
          },
        ],
      }),
    )[0]
    expect(result?.value).toBeNull()
    expect(result?.calculation.pendingOutflowsMinor).toBeNull()
    const overlay = [
      pending,
      transaction('booked', { relatedTransactionId: 'pending', amount: money(-1_200n, 'EUR') }),
    ]
    const ambiguous = calculateSafeToSpend(
      safe({ transactions: overlay, matches: reconcile([account()], overlay) }),
    )[0]
    expect(ambiguous?.value).toBeNull()
    expect(ambiguous?.reasons).toContain('unresolved_pending_reconciliation')
  })

  test('private pending and private-derived recurring costs reveal no evidence and make availability unknown', () => {
    const privatePending = transaction('private-pending', { status: 'pending' })
    const result = calculateSafeToSpend(
      safe({ transactions: [privatePending], excludedTransactionIds: [privatePending.id] }),
    )[0]
    expect(result?.value).toBeNull()
    expect(result?.calculation.pendingOutflowsMinor).toBeNull()
    expect(json(result)).not.toContain(privatePending.id)
    const { rows, series } = recurringFixture()
    const quietId = rows[0]?.id as string
    const forecast = calculateSafeToSpend(
      safe({ transactions: rows, recurring: series, excludedTransactionIds: [quietId] }),
    )[0]
    expect(forecast?.value).toBeNull()
    expect(forecast?.calculation.estimatedUpcomingOutflowsMinor).toBeNull()
    expect(json(forecast)).not.toContain(quietId)
    expect(forecast?.inputs.estimatedSeriesIds).toEqual([])
  })

  test('pending transfers and card settlements reserve selected cash even though they are not monthly spending', () => {
    const rows = [
      transaction('transfer', {
        status: 'pending',
        kind: 'transfer',
        amount: money(-3_000n, 'EUR'),
      }),
      transaction('settlement', {
        status: 'pending',
        kind: 'card_settlement',
        amount: money(-7_000n, 'EUR'),
      }),
      transaction('incoming', { status: 'pending', amount: money(50_000n, 'EUR'), kind: 'income' }),
    ]
    const result = calculateSafeToSpend(safe({ transactions: rows }))[0]
    expect(result?.calculation.pendingOutflowsMinor).toBe(10_000n)
    expect(result?.value?.amountMinor).toBe(85_000n)
    expect(result?.calculation.forecastIncomeAddedMinor).toBe(0n)
  })

  test('only explicitly included accounts and their own currency reserve are used, with a visible shortfall', () => {
    const accounts = [
      account('a', { balance: money(3_000n, 'EUR') }),
      account('excluded', { balance: money(999_999n, 'EUR') }),
      account('jpy', { balance: money(90071992547409930n, 'JPY') }),
    ]
    const result = calculateSafeToSpend(
      safe({
        accounts,
        includedAccountIds: ['a', 'jpy'],
        accountKnowledge: [
          {
            accountId: 'a',
            balanceMeaning: 'booked',
            pendingOutflowsIncluded: false,
            coverage: 'complete',
          },
          {
            accountId: 'jpy',
            balanceMeaning: 'booked',
            pendingOutflowsIncluded: false,
            coverage: 'complete',
          },
        ],
        policy: { ...safe().policy, bufferByCurrency: { EUR: 5_000n, JPY: 30n } },
      }),
    )
    expect(result.map((row) => row.currency)).toEqual(['EUR', 'JPY'])
    expect(result[0]).toMatchObject({
      status: 'shortfall',
      value: money(-2_000n, 'EUR'),
      inputs: { accountIds: ['a'] },
    })
    expect(result[1]?.value?.amountMinor).toBe(90071992547409900n)
  })

  test('unconfigured currency buffer and overdue unpaid occurrences are unavailable, while out-of-horizon ones reserve nothing', () => {
    const missing = calculateSafeToSpend(
      safe({ policy: { ...safe().policy, bufferByCurrency: {} } }),
    )[0]
    expect(missing?.reasons).toContain('buffer_not_configured')
    const { rows, series } = recurringFixture()
    const past = calculateSafeToSpend(
      safe({
        now: '2026-10-15T12:00:00.000Z',
        accounts: [account('a', { balanceUpdatedAt: '2026-10-15T11:00:00.000Z' })],
        transactions: rows,
        recurring: series,
      }),
    )[0]
    expect(past?.value).toBeNull()
    expect(past?.reasons).toContain('overdue_recurring_occurrence')
    const outside = calculateSafeToSpend(
      safe({
        transactions: rows,
        recurring: series,
        policy: { ...safe().policy, horizonOn: '2026-10-05' },
      }),
    )[0]
    expect(outside?.calculation.estimatedUpcomingOutflowsMinor).toBe(0n)
  })

  test('month-end/salary horizons use the profile calendar, including leap years and DST', () => {
    expect(
      understandingHorizon({
        now: '2024-02-01T12:00:00.000Z',
        timezone: 'Europe/Rome',
        nextSalaryOn: null,
      }),
    ).toBe('2024-02-29')
    expect(
      understandingHorizon({
        now: '2026-09-30T22:30:00.000Z',
        timezone: 'Europe/Rome',
        nextSalaryOn: null,
      }),
    ).toBe('2026-10-31')
    expect(
      understandingHorizon({
        now: '2026-10-25T00:30:00.000Z',
        timezone: 'Europe/Rome',
        nextSalaryOn: '2026-11-05',
      }),
    ).toBe('2026-11-05')
    expect(() =>
      understandingHorizon({
        now: '2026-10-03T12:00:00.000Z',
        timezone: 'Europe/Rome',
        nextSalaryOn: '2026-10-01',
      }),
    ).toThrow(UnderstandingInputError)
  })

  test('a horizon beyond one month reserves each projected occurrence, with an explicit bounded work policy', () => {
    const { rows, series } = recurringFixture()
    const twice = calculateSafeToSpend(
      safe({
        transactions: rows,
        recurring: series,
        policy: { ...safe().policy, horizonOn: '2026-11-30', maxForecastOccurrences: 2 },
      }),
    )[0]
    expect(twice?.calculation.estimatedUpcomingOutflowsMinor).toBe(2_400n)
    expect(twice?.value?.amountMinor).toBe(92_600n)
    expect(twice?.inputs.estimatedOccurrences.map((item) => item.on)).toEqual([
      '2026-10-10',
      '2026-11-10',
    ])
    const limited = calculateSafeToSpend(
      safe({
        transactions: rows,
        recurring: series,
        policy: { ...safe().policy, horizonOn: '2026-11-30', maxForecastOccurrences: 1 },
      }),
    )[0]
    expect(limited?.value).toBeNull()
    expect(limited?.calculation.estimatedUpcomingOutflowsMinor).toBeNull()
    expect(limited?.reasons).toContain('forecast_work_limit')
    const beforeSecond = calculateSafeToSpend(
      safe({
        transactions: rows,
        recurring: series,
        policy: { ...safe().policy, horizonOn: '2026-11-05', maxForecastOccurrences: 1 },
      }),
    )[0]
    expect(beforeSecond?.value?.amountMinor).toBe(93_800n)
  })

  test('an observed first occurrence cannot remove a later monthly obligation from a longer horizon', () => {
    const { rows, series } = recurringFixture()
    const paid = transaction('paid-first', {
      bookedOn: '2026-10-10',
      merchantKey: 'netflix',
      amount: money(-1_200n, 'EUR'),
    })
    const result = calculateSafeToSpend(
      safe({
        now: '2026-10-10T12:00:00.000Z',
        accounts: [account('a', { balanceUpdatedAt: '2026-10-10T11:00:00.000Z' })],
        transactions: [...rows, paid],
        recurring: series,
        occurrenceBindings: [{ seriesId: series[0]?.id as string, transactionId: paid.id }],
        policy: { ...safe().policy, horizonOn: '2026-11-30' },
      }),
    )[0]
    expect(result?.calculation.estimatedUpcomingOutflowsMinor).toBe(1_200n)
    expect(result?.inputs.fulfilledOccurrenceTransactionIds).toEqual([paid.id])
    expect(result?.inputs.estimatedOccurrences.map((item) => item.on)).toEqual(['2026-11-10'])
  })

  test('a private booked representative cannot leak through a formerly visible pending occurrence binding', () => {
    const { rows, series } = recurringFixture()
    const pending = transaction('public-pending', {
      status: 'pending',
      bookedOn: null,
      authorizedOn: '2026-10-10',
      merchantKey: 'netflix',
      reference: 'overlay-private',
      amount: money(-1_200n, 'EUR'),
    })
    const booked = transaction('private-booked', {
      bookedOn: '2026-10-10',
      merchantKey: 'netflix',
      reference: 'overlay-private',
      relatedTransactionId: pending.id,
      amount: money(-1_200n, 'EUR'),
    })
    const all = [...rows, pending, booked]
    const result = calculateSafeToSpend(
      safe({
        now: '2026-10-10T12:00:00.000Z',
        accounts: [account('a', { balanceUpdatedAt: '2026-10-10T11:00:00.000Z' })],
        transactions: all,
        matches: reconcile([account()], all),
        recurring: series,
        excludedTransactionIds: [booked.id],
        occurrenceBindings: [{ seriesId: series[0]?.id as string, transactionId: pending.id }],
      }),
    )[0]
    expect(result?.value).toBeNull()
    expect(result?.reasons).toContain('private_recurring_coverage')
    expect(json(result)).not.toContain(booked.id)
  })

  test('balance freshness honors the exact configured boundary and rejects malformed/future financial timestamps', () => {
    const boundary = calculateSafeToSpend(
      safe({ policy: { ...safe().policy, maxBalanceAgeMs: 3_600_000 } }),
    )[0]
    expect(boundary?.status).toBe('available')
    const stale = calculateSafeToSpend(
      safe({ policy: { ...safe().policy, maxBalanceAgeMs: 3_599_999 } }),
    )[0]
    expect(stale?.reasons).toContain('balance_stale')
    const normalizedBadDate = calculateSafeToSpend(
      safe({ accounts: [account('a', { balanceUpdatedAt: '2026-02-31T12:00:00.000Z' })] }),
    )[0]
    expect(normalizedBadDate?.reasons).toContain('balance_timestamp_invalid')
    const futureBooked = calculateSafeToSpend(
      safe({ transactions: [transaction('future-booked', { bookedOn: '2026-10-10' })] }),
    )[0]
    expect(futureBooked?.value).toBeNull()
    expect(futureBooked?.reasons).toContain('future_booked_data')
    expect(() => calculateSafeToSpend(safe({ now: '03/10/2026' }))).toThrow(UnderstandingInputError)
    expect(() =>
      calculateSafeToSpend(
        safe({
          accountKnowledge: [
            {
              accountId: 'a',
              balanceMeaning: 'booked',
              pendingOutflowsIncluded: false,
              coverage: 'invented' as 'complete',
            },
          ],
        }),
      ),
    ).toThrow(UnderstandingInputError)
  })

  test('foreign profiles/accounts/evidence, duplicate identities and malformed policies fail closed', () => {
    const { rows, series } = recurringFixture()
    for (const change of [
      { accounts: [account('a', { profileId: 'foreign' })] },
      { transactions: [transaction('foreign', { profileId: 'foreign' })] },
      { transactions: [transaction('unknown-account', { accountId: 'missing' })] },
      { transactions: [transaction('cross-currency', { amount: money(-1n, 'JPY') })] },
      { transactions: [transaction('one'), transaction('one')] },
      { includedAccountIds: ['foreign'] },
      { includedAccountIds: ['a', 'a'] },
      {
        transactions: rows,
        recurring: [{ ...(series[0] as RecurringSeries), transactionIds: ['foreign'] }],
      },
      {
        transactions: rows,
        recurring: series,
        occurrenceBindings: [{ seriesId: series[0]?.id as string, transactionId: 'foreign' }],
      },
      { policy: { ...safe().policy, maxBalanceAgeMs: -1 } },
      { policy: { ...safe().policy, bufferByCurrency: { EUR: -1n } } },
      { policy: { ...safe().policy, horizonOn: '2026-10-01' } },
    ] satisfies Partial<SafeToSpendInput>[])
      expect(() => calculateSafeToSpend(safe(change))).toThrow(UnderstandingInputError)
    const forged: ReconciliationMatch = {
      id: 'forged',
      type: 'duplicate',
      state: 'confirmed',
      transactionIds: ['owned', 'foreign'],
      confidence: 1,
      algorithmVersion: 'test',
      evidence: [],
      explanation: 'Synthetic',
    }
    expect(() =>
      buildMonthlyInsights(monthly({ transactions: [transaction('owned')], matches: [forged] })),
    ).toThrow(UnderstandingInputError)
  })
})
