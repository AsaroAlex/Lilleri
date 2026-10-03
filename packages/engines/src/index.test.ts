import type { Account, Transaction } from '@lilleri/domain'
import { money } from '@lilleri/money'
import { describe, expect, it } from 'vitest'
import {
  analyse,
  classify,
  detectRecurring,
  effectiveTransactions,
  reconcile,
  summarize,
} from './index.js'

const account = (id = 'a', currency: 'EUR' | 'GBP' = 'EUR'): Account => ({
  id,
  profileId: 'p',
  connectionId: 'c',
  providerAccountId: id,
  name: id,
  institutionName: 'Synthetic',
  kind: 'current',
  balance: money(-500n, currency),
  balanceUpdatedAt: '2026-10-02T12:00:00Z',
})
const txn = (id: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  profileId: 'p',
  accountId: 'a',
  connectionId: 'c',
  providerId: 'mock',
  providerTransactionId: id,
  revision: 1,
  source: 'bank',
  status: 'booked',
  amount: money(-1000n, 'EUR'),
  description: 'Synthetic',
  merchantName: 'Coop',
  merchantKey: 'coop',
  bookedOn: '2026-10-01',
  authorizedOn: null,
  observedAt: '2026-10-02T12:00:00Z',
  kind: 'expense',
  reference: null,
  relatedTransactionId: null,
  relatedAccountId: null,
  ...overrides,
})
const transfer = (extra: Partial<Transaction> = {}) => [
  txn('out', {
    amount: money(-20000n, 'EUR'),
    kind: 'transfer',
    reference: 'x',
    relatedAccountId: 'b',
    ...extra,
  }),
  txn('in', {
    amount: money(20000n, 'EUR'),
    accountId: 'b',
    kind: 'transfer',
    reference: 'x',
    relatedAccountId: 'a',
    ...extra,
  }),
]

describe('conservative reconciliation and accounting invariants', () => {
  it('replaces pending only with explicit provider linkage', () => {
    const rows = [
      txn('pending', { status: 'pending', authorizedOn: '2026-09-30', bookedOn: null }),
      txn('booked', { relatedTransactionId: 'pending' }),
    ]
    const matches = reconcile([account()], rows)
    expect(matches[0]?.state).toBe('confirmed')
    expect(effectiveTransactions(rows, matches).map((row) => row.id)).toEqual(['booked'])
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(1000n)
  })
  it('keeps a changed pending amount for review', () => {
    const rows = [
      txn('pending', { status: 'pending' }),
      txn('booked', { relatedTransactionId: 'pending', amount: money(-1200n, 'EUR') }),
    ]
    expect(reconcile([account()], rows)[0]?.state).toBe('suggested')
  })
  it('does not connect unrelated pending and booked items', () => {
    expect(reconcile([account()], [txn('a', { status: 'pending' }), txn('b')])).toHaveLength(0)
  })
  it('suppresses a cross-source duplicate only with a shared unique reference', () => {
    const rows = [txn('bank', { reference: 'r' }), txn('csv', { reference: 'r', source: 'csv' })]
    const matches = reconcile([account()], rows)
    expect(matches[0]?.state).toBe('confirmed')
    expect(effectiveTransactions(rows, matches).map((row) => row.id)).toEqual(['bank'])
  })
  it('preserves a weak import candidate until confirmation', () => {
    const rows = [txn('bank'), txn('csv', { source: 'csv' })]
    const matches = reconcile([account()], rows)
    expect(matches[0]?.state).toBe('suggested')
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(2000n)
  })
  it('keeps two legitimate same-day same-amount purchases', () => {
    const rows = [txn('purchase-1'), txn('purchase-2')]
    expect(reconcile([account()], rows)).toHaveLength(0)
    expect(summarize([account()], rows, [])[0]?.spend.amountMinor).toBe(2000n)
  })
  it('does not deduplicate across unrelated accounts', () => {
    expect(
      reconcile([account(), account('b')], [txn('a'), txn('b', { accountId: 'b', source: 'csv' })]),
    ).toHaveLength(0)
  })
  it('excludes a confirmed internal transfer from income and spend', () => {
    const rows = transfer(),
      matches = reconcile([account(), account('b')], rows)
    expect(matches[0]?.state).toBe('confirmed')
    const summary = summarize([account(), account('b')], rows, matches)[0]
    expect(summary?.income.amountMinor).toBe(0n)
    expect(summary?.spend.amountMinor).toBe(0n)
    expect(summary?.balance.amountMinor).toBe(-1000n)
  })
  it('requires provider relationships for matching transfer amounts', () => {
    const rows = transfer({ reference: null }),
      matches = reconcile([account(), account('b')], rows)
    expect(matches[0]?.state).toBe('suggested')
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(20000n)
  })
  it('does not match a transfer into an account outside the owned set', () => {
    expect(reconcile([account()], transfer())).toHaveLength(0)
  })
  it('keeps settlement from double-counting card spending', () => {
    const rows = [
      ...transfer({ kind: 'card_settlement' }),
      txn('card-purchase', { accountId: 'b', amount: money(-9000n, 'EUR') }),
    ]
    const matches = reconcile([account(), account('b')], rows)
    expect(
      matches.some((match) => match.type === 'card_settlement' && match.state === 'confirmed'),
    ).toBe(true)
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(9000n)
  })
  it('treats ATM-to-cash as a movement when both sides are present', () => {
    const rows = transfer({ kind: 'cash_withdrawal' }),
      matches = reconcile([account(), account('b')], rows)
    expect(matches[0]?.type).toBe('cash_transfer')
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(0n)
  })
  it.each([
    ['partial', 400n, 600n],
    ['full', 1000n, 0n],
  ] as const)('%s refund reduces original spending exactly', (_label, refund, spend) => {
    const rows = [
      txn('purchase'),
      txn('refund', {
        kind: 'refund',
        amount: money(refund, 'EUR'),
        relatedTransactionId: 'purchase',
      }),
    ]
    const matches = reconcile([account()], rows),
      summary = summarize([account()], rows, matches)[0]
    expect(summary?.spend.amountMinor).toBe(spend)
    expect(summary?.income.amountMinor).toBe(0n)
  })
  it('does not auto-link refunds that cumulatively exceed the purchase', () => {
    const rows = [
      txn('purchase'),
      txn('r1', { kind: 'refund', amount: money(600n, 'EUR'), relatedTransactionId: 'purchase' }),
      txn('r2', { kind: 'refund', amount: money(600n, 'EUR'), relatedTransactionId: 'purchase' }),
    ]
    expect(reconcile([account()], rows).every((match) => match.state === 'suggested')).toBe(true)
  })
  it('rejects cross-currency transfer matching and never invents FX', () => {
    const rows = [txn('a'), txn('b', { accountId: 'b', amount: money(1000n, 'GBP') })]
    expect(reconcile([account(), account('b', 'GBP')], rows)).toHaveLength(0)
    const summaries = summarize([account(), account('b', 'GBP')], rows, [])
    expect(summaries).toHaveLength(2)
    expect(summaries.find((item) => item.currency === 'EUR')?.spend.amountMinor).toBe(1000n)
  })
  it('excludes reversed transactions', () => {
    expect(
      summarize([account()], [txn('r', { status: 'reversed' })], [])[0]?.spend.amountMinor,
    ).toBe(0n)
  })
  it('retains exact very large amounts and negative balances', () => {
    const value = -(2n ** 75n)
    expect(
      summarize([account()], [txn('large', { amount: money(value, 'EUR') })], [])[0]?.spend
        .amountMinor,
    ).toBe(-value)
    expect(summarize([account()], [], [])[0]?.balance.amountMinor).toBe(-500n)
  })
  it('undo reverses a duplicate exclusion without deleting either source record', () => {
    const rows = [txn('bank', { reference: 'r' }), txn('csv', { source: 'csv', reference: 'r' })]
    const matched = reconcile([account()], rows),
      id = matched[0]?.id
    if (!id) throw new Error('Expected match')
    const undone = reconcile([account()], rows, { matchOverrides: { [id]: 'undone' } })
    expect(effectiveTransactions(rows, undone)).toHaveLength(2)
    expect(undone[0]?.algorithmVersion).toBeDefined()
  })
  it('does not auto-select a reused reference with competing candidates', () => {
    const rows = [
      txn('bank', { reference: 'r' }),
      txn('csv-1', { source: 'csv', reference: 'r' }),
      txn('csv-2', { source: 'csv', reference: 'r' }),
    ]
    expect(reconcile([account()], rows).every((match) => match.state === 'suggested')).toBe(true)
  })
  it('rejects mixing profiles and duplicate canonical identities', () => {
    expect(() => analyse([account()], [txn('other', { profileId: 'other' })])).toThrow(
      'one profile',
    )
    expect(() => analyse([account()], [txn('same'), txn('same')])).toThrow('Duplicate')
  })
})

describe('adversarial financial invariants', () => {
  it('does not treat a refund as the booked version of a pending purchase', () => {
    const rows = [
      txn('pending', { status: 'pending' }),
      txn('refund', {
        kind: 'refund',
        amount: money(1000n, 'EUR'),
        relatedTransactionId: 'pending',
      }),
    ]
    expect(reconcile([account()], rows).some((match) => match.type === 'pending_to_booked')).toBe(
      false,
    )
  })
  it.each(['pending', 'reversed'] as const)(
    'never deducts a refund against a %s purchase',
    (status) => {
      const rows = [
        txn('purchase', { status }),
        txn('refund', {
          kind: 'refund',
          amount: money(1000n, 'EUR'),
          relatedTransactionId: 'purchase',
        }),
      ]
      expect(reconcile([account()], rows).filter((match) => match.type === 'refund')).toHaveLength(
        0,
      )
      expect(summarize([account()], rows, reconcile([account()], rows))[0]?.spend.amountMinor).toBe(
        0n,
      )
    },
  )
  it('does not refund an excluded transfer', () => {
    const rows = [
      ...transfer(),
      txn('refund', { kind: 'refund', amount: money(1000n, 'EUR'), relatedTransactionId: 'out' }),
    ]
    expect(
      reconcile([account(), account('b')], rows).filter((match) => match.type === 'refund'),
    ).toHaveLength(0)
  })
  it('cannot force-confirm a refund above the purchase bound', () => {
    const rows = [
      txn('purchase'),
      txn('refund', {
        kind: 'refund',
        amount: money(1200n, 'EUR'),
        relatedTransactionId: 'purchase',
      }),
    ]
    const initial = reconcile([account()], rows),
      id = initial[0]?.id
    if (!id) throw new Error('Expected refund candidate')
    const matches = reconcile([account()], rows, { matchOverrides: { [id]: 'confirmed' } })
    expect(matches[0]?.state).toBe('suggested')
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(1000n)
  })
  it('does not let malformed negative refund records reduce the cumulative bound', () => {
    const rows = [
      txn('purchase'),
      txn('refund', {
        kind: 'refund',
        amount: money(1500n, 'EUR'),
        relatedTransactionId: 'purchase',
      }),
      txn('malformed', {
        kind: 'refund',
        amount: money(-1000n, 'EUR'),
        relatedTransactionId: 'purchase',
      }),
    ]
    expect(reconcile([account()], rows).every((match) => match.state !== 'confirmed')).toBe(true)
  })
  it('does not deduct refunds whose original is a confirmed duplicate exclusion', () => {
    const rows = [
      txn('bank', { reference: 'r' }),
      txn('csv', { source: 'csv', reference: 'r' }),
      txn('refund', { kind: 'refund', amount: money(1000n, 'EUR'), relatedTransactionId: 'csv' }),
    ]
    const matches = reconcile([account()], rows)
    expect(matches.find((match) => match.type === 'refund')?.state).toBe('suggested')
    expect(summarize([account()], rows, matches)[0]?.spend.amountMinor).toBe(1000n)
  })
  it('rejects duplicate accounts, orphan rows and canonical currency mismatch', () => {
    expect(() => analyse([account(), account()], [])).toThrow('Duplicate canonical account')
    expect(() => analyse([account()], [txn('orphan', { accountId: 'other' })])).toThrow('not owned')
    expect(() => analyse([account()], [txn('foreign', { amount: money(-1000n, 'GBP') })])).toThrow(
      'currency differs',
    )
  })
})

describe('classification precedence and feedback', () => {
  it('rules-only disables dictionary classification and preserves explicit corrections', () => {
    expect(classify(txn('a'), { globalDictionaryEnabled: false })).toMatchObject({
      categoryId: 'uncategorised',
      source: 'review',
      needsReview: true,
    })
    expect(
      classify(txn('a'), {
        globalDictionaryEnabled: false,
        userClassifications: { a: 'health' },
      }),
    ).toMatchObject({ categoryId: 'health', source: 'user', needsReview: false })
  })
  it('rules-only preserves owned rules and merchant preferences', () => {
    expect(
      classify(txn('a'), {
        globalDictionaryEnabled: false,
        rules: [
          {
            id: 'r',
            profileId: 'p',
            merchantKey: 'coop',
            categoryId: 'shopping',
            enabled: true,
            priority: 1,
          },
        ],
      }),
    ).toMatchObject({ categoryId: 'shopping', source: 'rule' })
    expect(
      classify(txn('a'), {
        globalDictionaryEnabled: false,
        preferences: [{ profileId: 'p', merchantKey: 'coop', categoryId: 'food' }],
      }),
    ).toMatchObject({ categoryId: 'food', source: 'preference' })
  })
  it('quiet exclusions retain exact balances and owned classifications while suppressing attention and spend', () => {
    const rows = [txn('quiet', { merchantKey: 'unknown' }), txn('visible')]
    const result = analyse([account()], rows, { excludedFromInsights: ['quiet'] })
    expect(result.classifications).toHaveLength(2)
    expect(result.classifications.find((item) => item.transactionId === 'quiet')?.needsReview).toBe(
      false,
    )
    expect(result.reviewItems).toEqual([])
    expect(result.summaries[0]).toMatchObject({
      balance: money(-500n, 'EUR'),
      spend: money(1000n, 'EUR'),
      transactionCount: 1,
    })
    expect(rows[0]?.amount.amountMinor).toBe(-1000n)
  })
  it('quiet observations do not generate a recurring estimate', () => {
    const rows = ['2026-07-31', '2026-08-31', '2026-09-30'].map((bookedOn, index) =>
      txn(`private${index}`, {
        bookedOn,
        merchantKey: 'netflix',
      }),
    )
    expect(analyse([account()], rows).recurring).toHaveLength(1)
    expect(analyse([account()], rows, { excludedFromInsights: ['private1'] }).recurring).toEqual([])
  })
  it('a refund of a quiet purchase does not imply negative spending or income', () => {
    const rows = [
      txn('purchase'),
      txn('refund', {
        kind: 'refund',
        amount: money(1000n, 'EUR'),
        relatedTransactionId: 'purchase',
      }),
    ]
    const result = analyse([account()], rows, { excludedFromInsights: ['purchase'] })
    expect(result.matches[0]?.state).toBe('confirmed')
    expect(result.classifications).toHaveLength(2)
    expect(result.summaries[0]).toMatchObject({
      income: money(0n, 'EUR'),
      spend: money(0n, 'EUR'),
      balance: money(-500n, 'EUR'),
    })
  })
  it('sticky one-shot correction wins over rules on the same transaction', () => {
    expect(
      classify(txn('a'), {
        userClassifications: { a: 'health' },
        rules: [
          {
            id: 'r',
            profileId: 'p',
            merchantKey: 'coop',
            categoryId: 'shopping',
            enabled: true,
            priority: 1,
          },
        ],
      }).categoryId,
    ).toBe('health')
  })
  it('explicit rules win over learned preferences and global dictionaries', () => {
    const classification = classify(txn('a'), {
      rules: [
        {
          id: 'r',
          profileId: 'p',
          merchantKey: 'coop',
          categoryId: 'shopping',
          enabled: true,
          priority: 1,
        },
      ],
      preferences: [{ profileId: 'p', merchantKey: 'coop', categoryId: 'health' }],
    })
    expect(classification.categoryId).toBe('shopping')
    expect(classification.source).toBe('rule')
  })
  it('does not apply another profile’s preferences', () => {
    expect(
      classify(txn('a'), {
        preferences: [{ profileId: 'other', merchantKey: 'coop', categoryId: 'health' }],
      }).categoryId,
    ).toBe('groceries')
  })
  it('requires review for an unknown merchant and never uses prototype values', () => {
    expect(classify(txn('a', { merchantKey: 'constructor' })).needsReview).toBe(true)
    expect(analyse([account()], [txn('a', { merchantKey: 'unknown' })]).reviewItems).toHaveLength(1)
  })
})

describe('recurring observations are estimates', () => {
  const payments = ['2026-07-31', '2026-08-31', '2026-09-30'].map((bookedOn, index) =>
    txn(`n${index}`, {
      bookedOn,
      merchantKey: 'netflix',
      amount: money(index === 2 ? -1499n : -1299n, 'EUR'),
    }),
  )
  it('requires three monthly observations, detects increase and clamps month-end dates', () => {
    expect(detectRecurring(payments.slice(0, 2))).toHaveLength(0)
    const series = detectRecurring(payments)[0]
    expect(series?.priceIncreased).toBe(true)
    expect(series?.nextOn).toBe('2026-10-30')
    expect(series?.explanation).toContain('stima')
  })
  it('does not call irregular purchases a subscription', () => {
    expect(
      detectRecurring(
        payments.map((item, index) => ({
          ...item,
          bookedOn: `2026-09-${String(index + 1).padStart(2, '0')}`,
        })),
      ),
    ).toHaveLength(0)
  })
})
