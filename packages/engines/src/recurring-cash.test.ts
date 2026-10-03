import type { Account, Transaction } from '@lilleri/domain'
import { money } from '@lilleri/money'
import { expect, test } from 'vitest'
import { detectObservedRecurring } from './recurring-observed.js'
import { DEFAULT_RECURRING_POLICY } from './recurring-policy.js'
import { calculateSafeToSpend } from './understanding.js'

const account: Account = {
  id: 'a',
  profileId: 'p',
  connectionId: 'c',
  providerAccountId: 'a',
  name: 'Synthetic',
  institutionName: 'Synthetic',
  kind: 'cash',
  balance: money(10000n, 'EUR'),
  balanceUpdatedAt: '2026-10-03T12:00:00.000Z',
}
const row = (id: string, on: string): Transaction => ({
  id,
  profileId: 'p',
  accountId: 'a',
  connectionId: 'c',
  providerId: 'synthetic',
  providerTransactionId: id,
  revision: 1,
  source: 'manual',
  status: 'booked',
  amount: money(-100n, 'EUR'),
  description: 'Synthetic',
  merchantName: 'Synthetic',
  merchantKey: 'synthetic',
  bookedOn: on,
  authorizedOn: null,
  observedAt: '2026-10-03T12:00:00.000Z',
  kind: 'expense',
  reference: null,
  relatedTransactionId: null,
  relatedAccountId: null,
})
function calculate(dates: string[], through: string, uncertain = false) {
  const transactions = dates.map((date, index) => row(String(index), date)),
    series = detectObservedRecurring({
      profileId: 'p',
      asOfOn: '2026-10-03',
      transactions,
      matches: [],
      policy: DEFAULT_RECURRING_POLICY,
    })
  return calculateSafeToSpend({
    profileId: 'p',
    timezone: 'Europe/Rome',
    now: '2026-10-03T12:00:00.000Z',
    accounts: [account],
    transactions,
    matches: [],
    excludedTransactionIds: [],
    recurring: series.map((item) => ({ ...item, id: 'opaque' })),
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
    uncertainRecurringTransactionIds: uncertain ? ['0'] : [],
    policy: {
      version: 'synthetic',
      horizonOn: through,
      maxBalanceAgeMs: 1000,
      occurrenceToleranceDays: 0,
      maxForecastOccurrences: 100,
      bufferByCurrency: { EUR: 0n },
    },
  })[0]
}
test('cash projection reserves every weekly occurrence exactly once', () => {
  const result = calculate(['2026-09-15', '2026-09-22', '2026-09-29'], '2026-10-31')
  expect(result?.value?.amountMinor).toBe(9600n)
  expect(result?.inputs.estimatedOccurrences.map((row) => row.on)).toEqual([
    '2026-10-06',
    '2026-10-13',
    '2026-10-20',
    '2026-10-27',
  ])
})
test('cash projection uses calendar quarter and original day anchor', () => {
  const result = calculate(['2026-01-31', '2026-04-30', '2026-07-31'], '2027-01-31')
  expect(result?.value?.amountMinor).toBe(9800n)
  expect(result?.inputs.estimatedOccurrences.map((row) => row.on)).toEqual([
    '2026-10-31',
    '2027-01-31',
  ])
})
test('cash projection does not replace uncertain feedback with zero or publish its forecast evidence', () => {
  const result = calculate(['2026-07-10', '2026-08-10', '2026-09-10'], '2026-10-31', true)
  expect(result?.value).toBeNull()
  expect(result?.calculation.estimatedUpcomingOutflowsMinor).toBeNull()
  expect(result?.inputs.estimatedSeriesIds).toEqual([])
  expect(result?.inputs.recurringEvidenceTransactionIds).toEqual([])
  expect(result?.inputs.estimatedOccurrences).toEqual([])
})
