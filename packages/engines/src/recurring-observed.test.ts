import type { Transaction } from '@lilleri/domain'
import { money } from '@lilleri/money'
import { describe, expect, test } from 'vitest'
import {
  advanceRecurringDate,
  detectObservedRecurring,
  projectRecurringOccurrences,
  type RecurringEvidence,
  RecurringInputError,
  recurringStableKey,
} from './recurring-observed.js'
import { DEFAULT_RECURRING_POLICY } from './recurring-policy.js'

const row = (id: string, bookedOn: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  profileId: 'p',
  accountId: 'a',
  connectionId: 'c',
  providerId: 'synthetic',
  providerTransactionId: id,
  source: 'bank',
  status: 'booked',
  revision: 1,
  description: 'Sintetico',
  merchantName: 'Sintetico',
  merchantKey: 'synthetic',
  amount: money(-1200n, 'EUR'),
  bookedOn,
  authorizedOn: null,
  observedAt: '2026-10-03T12:00:00.000Z',
  kind: 'expense',
  reference: null,
  relatedAccountId: null,
  relatedTransactionId: null,
  ...overrides,
})
const rows = (dates: string[], overrides: Partial<Transaction> = {}) =>
  dates.map((date, index) => row(`row-${index}`, date, overrides))
function detect(
  transactions: Transaction[],
  evidenceByTransactionId: Record<string, RecurringEvidence> = {},
) {
  return detectObservedRecurring({
    profileId: 'p',
    asOfOn: '2026-10-03',
    transactions,
    matches: [],
    evidenceByTransactionId,
    policy: DEFAULT_RECURRING_POLICY,
  })
}
describe('evidenced local recurrence across calendar periods', () => {
  test.each([
    ['weekly', ['2026-09-01', '2026-09-08', '2026-09-15'], '2026-09-22'],
    ['biweekly', ['2026-08-01', '2026-08-15', '2026-08-29'], '2026-09-12'],
    ['monthly', ['2026-07-31', '2026-08-31', '2026-09-30'], '2026-10-31'],
    ['bimonthly', ['2026-05-31', '2026-07-31', '2026-09-30'], '2026-11-30'],
    ['quarterly', ['2026-01-31', '2026-04-30', '2026-07-31'], '2026-10-31'],
    ['semiannual', ['2025-09-30', '2026-03-31', '2026-09-30'], '2027-03-31'],
    ['annual', ['2024-02-29', '2025-02-28', '2026-02-28'], '2027-02-28'],
  ])('recognizes %s and projects clamped dates', (frequency, dates, nextOn) => {
    const result = detect(rows(dates as string[]))[0]
    expect(result).toMatchObject({
      frequency,
      nextOn,
      kind: 'recurring_bill',
      confidence: null,
      isEstimate: true,
    })
  })
  test('calendar advancement preserves original anchor through short months', () => {
    expect(advanceRecurringDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
    expect(advanceRecurringDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31')
  })
  test('two long-period observations require matching amount or an explicit mandate', () => {
    const first = rows(['2025-09-15', '2026-03-15'])
    expect(detect(first)[0]?.frequency).toBe('semiannual')
    const different = first.map((entry, index) => ({
      ...entry,
      amount: money(index ? -2400n : -1200n, 'EUR'),
    }))
    expect(detect(different)).toEqual([])
    expect(
      detect(
        different,
        Object.fromEntries(
          different.map((entry) => [
            entry.id,
            { creditorId: 'creditor', mandateReference: 'mandate' },
          ]),
        ),
      )[0]?.frequency,
    ).toBe('semiannual')
    expect(detect(rows(['2026-08-15', '2026-09-15']))).toEqual([])
  })
  test('uses exact upper absolute median and bands beyond safe JavaScript integers', () => {
    const entries = rows(['2026-07-10', '2026-08-10', '2026-09-10']).map((entry, index) => ({
      ...entry,
      amount: money(-900719925474099300n - BigInt(index), 'EUR'),
    }))
    const candidate = detect(entries)[0]
    expect(candidate?.expectedAmount.amountMinor).toBe(-900719925474099301n)
    expect(candidate?.statistics.medianMethod).toBe('upper_absolute_minor')
    const variable = entries.map((entry, index) => ({
      ...entry,
      amount: money([-1000n, -1100n, -1900n][index] as bigint, 'EUR'),
    }))
    expect(detect(variable)[0]).toMatchObject({
      variability: 'variable',
      statistics: { amountOutsideBand: true },
    })
  })
  test('strong mandate identity separates contracts at one merchant and groups changing labels', () => {
    const entries = rows(['2026-07-10', '2026-08-10', '2026-09-10']).map((entry, index) => ({
      ...entry,
      merchantKey: `label-${index}`,
    }))
    const hints = Object.fromEntries(
      entries.map((entry) => [entry.id, { creditorId: 'utility', mandateReference: 'bill-1' }]),
    )
    const second = entries.map((entry) => ({ ...entry, id: `${entry.id}-other` }))
    for (const entry of second)
      hints[entry.id] = { creditorId: 'utility', mandateReference: 'bill-2' }
    expect(detect([...entries, ...second], hints)).toHaveLength(2)
  })
  test('stable merchant IDs survive raw display-key changes and ambiguous identity abstains', () => {
    const entries = rows(['2026-07-10', '2026-08-10', '2026-09-10']).map((entry, index) => ({
      ...entry,
      merchantKey: `label-${index}`,
    }))
    expect(
      detect(
        entries,
        Object.fromEntries(
          entries.map((entry) => [
            entry.id,
            { merchantId: 'merchant:stable', merchantResolution: 'resolved' },
          ]),
        ),
      ),
    ).toHaveLength(1)
    expect(
      detect(
        entries,
        Object.fromEntries(
          entries.map((entry) => [
            entry.id,
            { merchantId: 'merchant:stable', merchantResolution: 'ambiguous' },
          ]),
        ),
      ),
    ).toEqual([])
  })
  test('subscription and salary need explicit purpose; positive generic credits never become predicted salary', () => {
    const entries = rows(['2026-07-10', '2026-08-10', '2026-09-10'])
    expect(
      detect(
        entries,
        Object.fromEntries(
          entries.map((entry) => [entry.id, { purpose: 'subscription' as const }]),
        ),
      )[0]?.kind,
    ).toBe('subscription')
    const credits = entries.map((entry) => ({
      ...entry,
      kind: 'income' as const,
      amount: money(200000n, 'EUR'),
    }))
    expect(detect(credits)).toEqual([])
    expect(
      detect(
        credits,
        Object.fromEntries(credits.map((entry) => [entry.id, { purpose: 'salary' as const }])),
      )[0]?.kind,
    ).toBe('salary')
  })
  test('settlements, reversals and ordinary transfers are excluded while explicit outgoing savings plans are supported', () => {
    for (const kind of ['card_settlement', 'cash_withdrawal', 'transfer'] as const)
      expect(detect(rows(['2026-07-10', '2026-08-10', '2026-09-10'], { kind }))).toEqual([])
    expect(
      detect(rows(['2026-07-10', '2026-08-10', '2026-09-10'], { status: 'reversed' })),
    ).toEqual([])
    const transfers = rows(['2026-07-10', '2026-08-10', '2026-09-10'], { kind: 'transfer' })
    expect(
      detect(
        transfers,
        Object.fromEntries(
          transfers.map((entry) => [
            entry.id,
            { purpose: 'recurring_transfer' as const, savingsPlan: true },
          ]),
        ),
      )[0]?.kind,
    ).toBe('recurring_transfer')
  })
  test('installments require identical amounts plus explicit count/index and stop at the last installment', () => {
    const entries = rows(['2026-07-10', '2026-08-10', '2026-09-10'])
    const hints = Object.fromEntries(
      entries.map((entry, index) => [
        entry.id,
        { purpose: 'installment' as const, installmentCount: 5, installmentIndex: index + 1 },
      ]),
    )
    const series = detect(entries, hints)[0]
    expect(series?.kind).toBe('installment')
    if (!series) throw new Error('Synthetic installment missing')
    expect(
      projectRecurringOccurrences(series, '2027-01-10', 20).occurrences.map((entry) => entry.on),
    ).toEqual(['2026-10-10', '2026-11-10'])
    expect(
      detect(
        entries,
        Object.fromEntries(entries.map((entry) => [entry.id, { purpose: 'installment' as const }])),
      ),
    ).toEqual([])
  })
  test('same-day collisions and one-offs abstain instead of manufacturing regularity', () => {
    expect(detect(rows(['2026-07-10', '2026-07-10', '2026-09-10']))).toEqual([])
    expect(detect(rows(['2026-08-10']))).toEqual([])
    expect(detect(rows(['2026-07-10', '2026-08-01', '2026-09-21']))).toEqual([])
  })
  test('explicit irregular mandate gets an unknown date rather than a fabricated schedule', () => {
    const entries = rows(['2026-07-10', '2026-08-01', '2026-09-21'])
    const candidate = detect(
      entries,
      Object.fromEntries(entries.map((entry) => [entry.id, { mandateReference: 'mandate' }])),
    )[0]
    expect(candidate).toMatchObject({ frequency: 'irregular', nextOn: null })
    if (!candidate) throw new Error('Synthetic irregular candidate missing')
    expect(projectRecurringOccurrences(candidate, '2026-12-31', 100)).toEqual({
      status: 'unknown',
      occurrences: [],
    })
  })
  test('all occurrences across longer horizons are enumerated with a bounded-work unknown result', () => {
    const candidate = detect(rows(['2026-07-31', '2026-08-31', '2026-09-30']))[0]
    if (!candidate) throw new Error('Synthetic recurrence missing')
    expect(
      projectRecurringOccurrences(candidate, '2027-01-31', 20).occurrences.map((entry) => entry.on),
    ).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31'])
    expect(projectRecurringOccurrences(candidate, '2027-01-31', 2)).toEqual({
      status: 'work_limit',
      occurrences: [],
    })
  })
  test('explicit period correction retains original evidence and stable selector', () => {
    const transactions = rows(['2026-07-10', '2026-08-10', '2026-09-10'])
    const previous = detect(transactions)[0]
    if (!previous) throw new Error('Synthetic recurrence missing')
    const changed = detectObservedRecurring({
      profileId: 'p',
      asOfOn: '2026-10-03',
      transactions,
      matches: [],
      policy: DEFAULT_RECURRING_POLICY,
      choices: {
        [recurringStableKey(previous.selector)]: {
          status: 'confirmed',
          frequency: 'bimonthly',
          kind: null,
          installmentCount: null,
          installmentIndex: null,
        },
      },
    })[0]
    expect(changed).toMatchObject({
      stableKey: previous.stableKey,
      frequency: 'bimonthly',
      nextOn: '2026-11-10',
      transactionIds: previous.transactionIds,
      confidenceWord: 'user_confirmed',
    })
    expect(previous.frequency).toBe('monthly')
  })
  test('profile, account and currency axes prevent combining unrelated observations', () => {
    expect(
      detect([
        row('a', '2026-07-10'),
        row('b', '2026-08-10', { accountId: 'other' }),
        row('c', '2026-09-10'),
      ]),
    ).toEqual([])
    expect(
      detect([
        row('a', '2026-07-10'),
        row('b', '2026-08-10', { amount: money(-1200n, 'GBP') }),
        row('c', '2026-09-10'),
      ]),
    ).toEqual([])
    expect(() => detect([row('foreign', '2026-07-10', { profileId: 'other' })])).toThrow(
      RecurringInputError,
    )
  })
})

test('explicit installment stays visible with unknown schedule when new facts invalidate its index', () => {
  const source = rows(['2026-07-10', '2026-08-10', '2026-09-10']),
    base = detect(source)[0]
  if (!base) throw new Error('Expected synthetic pattern')
  const changed = detectObservedRecurring({
    profileId: 'p',
    asOfOn: '2026-10-03',
    transactions: source,
    matches: [],
    policy: DEFAULT_RECURRING_POLICY,
    choices: {
      [base.stableKey]: {
        status: 'confirmed',
        kind: 'installment',
        frequency: 'monthly',
        installmentCount: 5,
        installmentIndex: 2,
      },
    },
  })[0]
  expect(changed).toMatchObject({ kind: 'installment', nextOn: null, remainingInstallments: null })
  if (!changed) throw new Error('Expected explicit feedback')
  expect(projectRecurringOccurrences(changed, '2026-12-31', 10)).toEqual({
    status: 'unknown',
    occurrences: [],
  })
})
test('variable subscription evidence abstains rather than claiming a fixed service contract', () => {
  const source = rows(['2026-07-10', '2026-08-10', '2026-09-10'])
  source[2] = row('row-2', '2026-09-10', { amount: money(-2500n, 'EUR') })
  expect(
    detect(source, Object.fromEntries(source.map((row) => [row.id, { purpose: 'subscription' }]))),
  ).toEqual([])
})
