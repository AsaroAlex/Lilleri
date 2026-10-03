import type { Account, Transaction } from '@lilleri/domain'
import { dateOnly, daysBetween } from '@lilleri/domain'
import { money } from '@lilleri/money'
import { describe, expect, test } from 'vitest'
import { analyse, effectiveTransactions, reconcile, summarize } from './index.js'
import {
  RECONCILIATION_SCENARIO_CATALOGUE_VERSION,
  RECONCILIATION_SCENARIOS,
} from './reconciliation-scenarios.js'
import { detectObservedRecurring } from './recurring-observed.js'
import { DEFAULT_RECURRING_POLICY } from './recurring-policy.js'
import { buildMonthlyInsights, calculateSafeToSpend } from './understanding.js'

const NOW = '2026-10-03T12:00:00.000Z'
const account = (id = 'a', overrides: Partial<Account> = {}): Account => ({
  id,
  profileId: 'p',
  connectionId: 'c',
  providerAccountId: id,
  name: 'Original synthetic scenario',
  institutionName: 'Synthetic only',
  kind: 'current',
  balance: money(50_000n, 'EUR'),
  balanceUpdatedAt: NOW,
  ...overrides,
})
const transaction = (id: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  profileId: 'p',
  accountId: 'a',
  connectionId: 'c',
  providerId: 'synthetic',
  providerTransactionId: id,
  revision: 1,
  source: 'bank',
  status: 'booked',
  amount: money(-1_000n, 'EUR'),
  description: 'Original synthetic purchase',
  merchantName: 'Synthetic merchant',
  merchantKey: 'synthetic merchant',
  bookedOn: '2026-10-02',
  authorizedOn: null,
  observedAt: NOW,
  kind: 'expense',
  reference: null,
  relatedTransactionId: null,
  relatedAccountId: null,
  ...overrides,
})
const monthly = (transactions: readonly Transaction[], month: string, timezone = 'Europe/Rome') =>
  buildMonthlyInsights({
    profileId: 'p',
    timezone,
    now: NOW,
    month,
    accounts: [account()],
    transactions,
    matches: [],
    excludedTransactionIds: [],
    coverageByAccount: { a: 'complete' },
  })
const cash = (transactions: readonly Transaction[], balanceMinor = 50_000n) =>
  calculateSafeToSpend({
    profileId: 'p',
    timezone: 'Europe/Rome',
    now: NOW,
    accounts: [account('a', { balance: money(balanceMinor, 'EUR') })],
    transactions,
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
      version: 'original-synthetic-acceptance-v1',
      horizonOn: '2026-10-31',
      maxBalanceAgeMs: 86_400_000,
      occurrenceToleranceDays: 3,
      maxForecastOccurrences: 100,
      bufferByCurrency: { EUR: 0n },
    },
  })

describe('versioned requirement catalogue, independent of feature acceptance', () => {
  test('all original 25 numbered scenarios retain story, priority, outcome, scope and evidence', () => {
    expect(RECONCILIATION_SCENARIO_CATALOGUE_VERSION).toBe('reconciliation-scenarios-v1')
    expect(RECONCILIATION_SCENARIOS.map((scenario) => scenario.id)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    )
    for (const scenario of RECONCILIATION_SCENARIOS) {
      expect(scenario.stories.length).toBeGreaterThan(0)
      expect(scenario.expected.length).toBeGreaterThan(20)
      expect(scenario.implemented.length).toBeGreaterThan(20)
      expect(scenario.evidence.length).toBeGreaterThan(0)
      if (scenario.status === 'supported') expect(scenario.remaining).toBeNull()
      else expect(scenario.remaining?.length).toBeGreaterThan(15)
      // A missing P0 behavior remains open: safe refusal cannot turn it into feature acceptance.
      if (scenario.status === 'expected_unsupported')
        expect(['P1', 'P2']).toContain(scenario.priority)
    }
    expect(
      RECONCILIATION_SCENARIOS.filter((scenario) => scenario.status === 'supported').map(
        (scenario) => scenario.id,
      ),
    ).toEqual([4, 14, 18, 21])
  })
})

describe('actual supported behavior and conservative incomplete P0 guards', () => {
  test('01: an explicit exact source link counts the booked representative while retaining history', () => {
    const rows = [
      transaction('pending', { status: 'pending', bookedOn: null, authorizedOn: '2026-09-30' }),
      transaction('booked', { relatedTransactionId: 'pending' }),
    ]
    const matches = reconcile([account()], rows)
    expect(matches[0]?.state).toBe('confirmed')
    expect(effectiveTransactions(rows, matches).map((row) => row.id)).toEqual(['booked'])
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(1_000n)
    expect(rows.map((row) => row.id)).toEqual(['pending', 'booked'])
  })

  test('02: a changed hold amount requires review and does not silently release the pending reserve', () => {
    const rows = [
      transaction('pending', {
        status: 'pending',
        bookedOn: null,
        authorizedOn: '2026-10-01',
        amount: money(-5_000n, 'EUR'),
      }),
      transaction('booked', { relatedTransactionId: 'pending', amount: money(-5_500n, 'EUR') }),
    ]
    const matches = reconcile([account()], rows)
    expect(matches[0]?.state).toBe('suggested')
    expect(effectiveTransactions(rows, matches)).toHaveLength(2)
    expect(summarize([account()], rows, matches)[0]).toMatchObject({
      spend: money(5_500n, 'EUR'),
      pending: money(-5_000n, 'EUR'),
    })
  })

  test('03: old fuel-like authorizations are not expired from a descriptor or elapsed time alone', () => {
    const hold = transaction('fuel-hold', {
      status: 'pending',
      bookedOn: null,
      authorizedOn: '2026-09-01',
      description: 'Original synthetic FUEL PRE-AUTH',
      amount: money(-10_000n, 'EUR'),
    })
    const booking = transaction('fuel-booking', { amount: money(-4_210n, 'EUR') })
    expect(reconcile([account()], [hold, booking])).toHaveLength(0)
    expect(effectiveTransactions([hold, booking], [])).toHaveLength(2)
    expect(cash([hold, booking])[0]?.calculation.pendingOutflowsMinor).toBe(10_000n)
  })

  test('06: two same-source same-day coffees retain separate explicit identities and both amounts', () => {
    const rows = [
      transaction('coffee-1', { amount: money(-120n, 'EUR') }),
      transaction('coffee-2', { amount: money(-120n, 'EUR') }),
    ]
    expect(reconcile([account()], rows)).toHaveLength(0)
    expect(summarize([account()], rows, [])[0]?.spend.amountMinor).toBe(240n)
  })

  test('07: ambiguous CSV overlap remains counted until a decision; a unique source reference proves suppression', () => {
    const weak = [transaction('bank'), transaction('csv', { source: 'csv' })]
    const candidates = reconcile([account()], weak)
    expect(candidates[0]?.state).toBe('suggested')
    expect(summarize([account()], weak, candidates)[0]?.spend.amountMinor).toBe(2_000n)
    const proven = weak.map((row) => ({ ...row, reference: 'original-synthetic-shared-reference' }))
    const matches = reconcile([account()], proven)
    expect(matches[0]?.state).toBe('confirmed')
    expect(effectiveTransactions(proven, matches).map((row) => row.id)).toEqual(['bank'])
    expect(summarize([account()], proven, matches)[0]?.spend.amountMinor).toBe(1_000n)
  })

  test('08: a proved two-leg transfer excludes cashflow; explicit undo exposes both existing legs', () => {
    const accounts = [account(), account('b')]
    const rows = [
      transaction('out', {
        kind: 'transfer',
        amount: money(-50_000n, 'EUR'),
        reference: 'own-pair',
        relatedAccountId: 'b',
      }),
      transaction('in', {
        accountId: 'b',
        kind: 'transfer',
        amount: money(50_000n, 'EUR'),
        reference: 'own-pair',
        relatedAccountId: 'a',
      }),
    ]
    const matches = reconcile(accounts, rows)
    const match = matches[0]
    expect(match?.state).toBe('confirmed')
    expect(summarize(accounts, rows, matches)[0]).toMatchObject({
      income: money(0n, 'EUR'),
      spend: money(0n, 'EUR'),
    })
    if (!match) throw new Error('Expected actual transfer evidence')
    const undone = reconcile(accounts, rows, { matchOverrides: { [match.id]: 'undone' } })
    expect(effectiveTransactions(rows, undone).map((row) => row.id)).toEqual(['out', 'in'])
  })

  test('09: an unconnected alleged counterpart never manufactures a missing transfer leg', () => {
    const rows = [
      transaction('single-leg', {
        kind: 'transfer',
        amount: money(50_000n, 'EUR'),
        relatedAccountId: 'not-connected',
      }),
    ]
    expect(reconcile([account()], rows)).toHaveLength(0)
    expect(effectiveTransactions(rows, [])).toEqual(rows)
    expect(rows).toHaveLength(1)
  })

  test('10 P0: a source-declared unmatched card settlement never becomes a second purchase', () => {
    const rows = [
      transaction('settlement', {
        kind: 'card_settlement',
        amount: money(-81_230n, 'EUR'),
        merchantKey: null,
        merchantName: null,
      }),
    ]
    const result = analyse([account()], rows)
    expect(result.matches).toHaveLength(0)
    expect(result.classifications[0]?.categoryId).toBe('transfer')
    expect(result.summaries[0]).toMatchObject({
      income: money(0n, 'EUR'),
      spend: money(0n, 'EUR'),
      balance: money(50_000n, 'EUR'),
    })
    expect(monthly(rows, '2026-10')[0]?.value.netSpending.amountMinor).toBe(0n)
    expect(rows[0]?.amount.amountMinor).toBe(-81_230n)
  })

  test('10 cash reservation: pending card payments still reserve available cash separately from spending', () => {
    const rows = [
      transaction('pending-settlement', {
        status: 'pending',
        kind: 'card_settlement',
        bookedOn: null,
        authorizedOn: '2026-10-02',
        amount: money(-10_000n, 'EUR'),
      }),
    ]
    expect(summarize([account()], rows, [])[0]).toMatchObject({
      spend: money(0n, 'EUR'),
      pending: money(-10_000n, 'EUR'),
    })
    expect(cash(rows)[0]).toMatchObject({
      value: money(40_000n, 'EUR'),
      calculation: { pendingOutflowsMinor: 10_000n },
    })
  })

  test('10 boundary: an unproven ordinary transfer remains conservative until relationship confirmation', () => {
    const rows = [
      transaction('ordinary-transfer', { kind: 'transfer', amount: money(-20_000n, 'EUR') }),
    ]
    expect(reconcile([account()], rows)).toHaveLength(0)
    expect(summarize([account()], rows, [])[0]?.spend.amountMinor).toBe(20_000n)
  })

  test('11: two explicit refunds net exactly and an excess refund does not auto-confirm', () => {
    const purchase = transaction('purchase', { amount: money(-8_990n, 'EUR') })
    const refunds = [2_990n, 6_000n].map((value, index) =>
      transaction(`refund-${index}`, {
        kind: 'refund',
        amount: money(value, 'EUR'),
        relatedTransactionId: purchase.id,
      }),
    )
    const rows = [purchase, ...refunds]
    const matches = reconcile([account()], rows)
    expect(matches.filter((match) => match.type === 'refund')).toHaveLength(2)
    expect(summarize([account()], rows, matches)[0]).toMatchObject({
      income: money(0n, 'EUR'),
      spend: money(0n, 'EUR'),
    })
    const excess = [
      ...rows,
      transaction('excess', {
        kind: 'refund',
        amount: money(1n, 'EUR'),
        relatedTransactionId: purchase.id,
      }),
    ]
    expect(reconcile([account()], excess).every((match) => match.state === 'suggested')).toBe(true)
  })

  test('14 supported: an explicit variable mandate keeps one series and the exact observed median', () => {
    const rows = [3_810n, 4_170n, 3_995n].map((amount, index) =>
      transaction(`mandate-${index}`, {
        amount: money(-amount, 'EUR'),
        bookedOn: ['2026-07-10', '2026-08-10', '2026-09-10'][index] ?? null,
        merchantKey: `changed-label-${index}`,
      }),
    )
    const series = detectObservedRecurring({
      profileId: 'p',
      asOfOn: '2026-10-03',
      transactions: rows,
      matches: [],
      policy: DEFAULT_RECURRING_POLICY,
      evidenceByTransactionId: Object.fromEntries(
        rows.map((row) => [
          row.id,
          {
            creditorId: 'original-creditor',
            mandateReference: 'original-mandate',
            purpose: 'recurring_bill',
          },
        ]),
      ),
    })
    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({
      kind: 'recurring_bill',
      frequency: 'monthly',
      expectedAmount: money(-3_995n, 'EUR'),
      nextOn: '2026-10-10',
      isEstimate: true,
      confidence: null,
      statistics: { observedCount: 3, amountOutsideBand: false },
    })
  })

  test('17: opposite cross-currency amounts do not invent a rate or transfer and totals stay separate', () => {
    const accounts = [account(), account('usd', { balance: money(10_000n, 'USD') })]
    const rows = [
      transaction('eur', { amount: money(-9_231n, 'EUR') }),
      transaction('usd', { accountId: 'usd', amount: money(10_000n, 'USD'), kind: 'income' }),
    ]
    expect(reconcile(accounts, rows)).toHaveLength(0)
    const summaries = summarize(accounts, rows, [])
    expect(summaries.map((summary) => summary.currency)).toEqual(['EUR', 'USD'])
    expect(summaries[0]?.spend.amountMinor).toBe(9_231n)
    expect(summaries[1]?.income.amountMinor).toBe(10_000n)
  })

  test('18 supported: a declared January booking stays in January in Rome and UTC', () => {
    const rows = [
      transaction('january', { bookedOn: '2026-01-31', observedAt: '2026-02-01T00:30:00.000Z' }),
      transaction('february', { bookedOn: '2026-02-01', amount: money(-2_000n, 'EUR') }),
    ]
    for (const timezone of ['Europe/Rome', 'UTC']) {
      const january = monthly(rows, '2026-01', timezone)[0]
      expect(january?.inputs.transactionIds).toEqual(['january'])
      expect(january?.value.netSpending.amountMinor).toBe(1_000n)
    }
    expect(rows[0]?.bookedOn).toBe('2026-01-31')
  })

  test('19 calendar boundary: DST dates remain date-only; this does not assert acquisition scheduling', () => {
    expect(dateOnly('2026-03-29')).toBe('2026-03-29')
    expect(dateOnly('2026-10-25')).toBe('2026-10-25')
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })

  test('20 accounting boundary: an overdraft remains signed and a balance itself creates no income', () => {
    expect(summarize([account('a', { balance: money(-12_000n, 'EUR') })], [], [])[0]).toMatchObject(
      { balance: money(-12_000n, 'EUR'), income: money(0n, 'EUR'), spend: money(0n, 'EUR') },
    )
    expect(cash([], -12_000n)[0]?.value?.amountMinor).toBe(-12_000n)
  })

  test('24 accounting boundary: a late-observed booking contributes to its original month only', () => {
    const late = transaction('late-booking', {
      bookedOn: '2026-09-13',
      observedAt: NOW,
      amount: money(-1_234n, 'EUR'),
    })
    expect(monthly([late], '2026-09')[0]?.value.netSpending.amountMinor).toBe(1_234n)
    expect(monthly([late], '2026-10')[0]?.value.netSpending.amountMinor).toBe(0n)
  })
})

describe('expected unsupported capabilities: guard proofs, never feature acceptance', () => {
  test('12 P1 guard: one purchase is retained once and no split relationship is inferred', () => {
    const purchase = transaction('amazon-parent', { amount: money(-7_400n, 'EUR') })
    const result = analyse([account()], [purchase])
    expect(result.matches).toHaveLength(0)
    expect(result.summaries[0]?.spend.amountMinor).toBe(7_400n)
    expect(purchase.id).toBe('amazon-parent')
  })

  test('13 P2 guard: a person payment does not automatically reimburse a dinner', () => {
    const rows = [
      transaction('dinner', { amount: money(-12_000n, 'EUR') }),
      transaction('friend', {
        amount: money(6_000n, 'EUR'),
        kind: 'income',
        description: 'Original synthetic dinner repayment',
      }),
    ]
    const result = analyse([account()], rows)
    expect(result.matches).toHaveLength(0)
    expect(result.summaries[0]).toMatchObject({
      spend: money(12_000n, 'EUR'),
      income: money(6_000n, 'EUR'),
    })
  })

  test('25 incomplete P1 guard: a lone withdrawal cannot manufacture a cash account or credit', () => {
    const accounts = [account()]
    const rows = [transaction('atm', { kind: 'cash_withdrawal', amount: money(-10_000n, 'EUR') })]
    expect(reconcile(accounts, rows)).toHaveLength(0)
    expect(accounts).toHaveLength(1)
    expect(rows).toHaveLength(1)
    expect(summarize(accounts, rows, [])[0]?.balance.amountMinor).toBe(50_000n)
  })
})
