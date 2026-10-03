import type { Rule, Transaction } from '@lilleri/domain'
import { money } from '@lilleri/money'
import { describe, expect, test } from 'vitest'
import { classify, ruleMatches } from './index.js'

const transaction: Transaction = {
  id: 't',
  profileId: 'p',
  accountId: 'a',
  connectionId: 'c',
  providerId: 'mock',
  providerTransactionId: 't',
  revision: 1,
  source: 'bank',
  status: 'booked',
  amount: money(-8430n, 'EUR'),
  description: 'PAGAMENTO  Caffè [a-z]+',
  merchantName: 'Coop',
  merchantKey: 'coop',
  bookedOn: '2026-10-01',
  authorizedOn: null,
  observedAt: '2026-10-03T12:00:00Z',
  kind: 'expense',
  reference: null,
  relatedTransactionId: null,
  relatedAccountId: null,
}
const rule = (extra: Partial<Rule> = {}): Rule => ({
  id: 'r',
  profileId: 'p',
  enabled: true,
  priority: 1,
  categoryId: 'food',
  conditions: { merchantKey: 'coop' },
  ...extra,
})
describe('bounded deterministic explicit rules', () => {
  test('combines every condition with exact inclusive bigint bounds and currency', () => {
    const conditions = {
      merchantKey: 'coop',
      description: { operator: 'contains' as const, value: 'caffè [a-z]+' },
      amount: { currency: 'EUR' as const, minMinor: '8430', maxMinor: '8430' },
      accountId: 'a',
      kind: 'expense' as const,
      direction: 'debit' as const,
    }
    expect(ruleMatches(transaction, rule({ conditions }))).toBe(true)
    for (const changed of [
      { accountId: 'other' },
      { kind: 'refund' as const },
      { direction: 'credit' as const },
      { amount: { currency: 'GBP' as const, minMinor: '8430' } },
      { amount: { currency: 'EUR' as const, maxMinor: '8429' } },
    ])
      expect(ruleMatches(transaction, rule({ conditions: { ...conditions, ...changed } }))).toBe(
        false,
      )
    expect(transaction.amount.amountMinor).toBe(-8430n)
  })
  test('text is literal, folds Unicode case and whitespace, and never executes regex', () => {
    expect(
      ruleMatches(
        transaction,
        rule({
          conditions: { description: { operator: 'equals', value: 'pagamento caffè [a-z]+' } },
        }),
      ),
    ).toBe(true)
    expect(
      ruleMatches(
        transaction,
        rule({ conditions: { description: { operator: 'contains', value: '.*' } } }),
      ),
    ).toBe(false)
  })
  test('handles huge amounts without Number rounding and sign-independent bounds', () => {
    const huge = { ...transaction, amount: money(-9007199254740993n, 'EUR') }
    expect(
      ruleMatches(
        huge,
        rule({
          conditions: {
            amount: { currency: 'EUR', minMinor: '9007199254740993', maxMinor: '9007199254740993' },
          },
        }),
      ),
    ).toBe(true)
    expect(
      ruleMatches(
        huge,
        rule({ conditions: { amount: { currency: 'EUR', maxMinor: '9007199254740992' } } }),
      ),
    ).toBe(false)
  })
  test('does not apply disabled, foreign or empty rules', () => {
    expect(ruleMatches(transaction, rule({ enabled: false }))).toBe(false)
    expect(ruleMatches(transaction, rule({ profileId: 'foreign' }))).toBe(false)
    expect(ruleMatches(transaction, rule({ conditions: {} }))).toBe(false)
  })
  test('zero is neither debit nor credit', () => {
    const zero = { ...transaction, amount: money(0n, 'EUR') }
    expect(ruleMatches(zero, rule({ conditions: { direction: 'zero' } }))).toBe(true)
    expect(ruleMatches(zero, rule({ conditions: { direction: 'debit' } }))).toBe(false)
    expect(ruleMatches(zero, rule({ conditions: { direction: 'credit' } }))).toBe(false)
  })
  test('sticky feedback beats rule, which beats scoped preference', () => {
    const options = {
      rules: [rule({ revision: 3 })],
      preferences: [{ profileId: 'p', merchantKey: 'coop', categoryId: 'shopping' as const }],
    }
    expect(classify(transaction, options)).toMatchObject({
      source: 'rule',
      categoryId: 'food',
      evidence: ['rule:r', 'rule-revision:3'],
    })
    expect(
      classify(transaction, { ...options, userClassifications: { t: 'health' } }),
    ).toMatchObject({ source: 'user', categoryId: 'health' })
  })
  test('priority conflicts are deterministic in either input order and evidenced', () => {
    const first = rule({ id: 'a' }),
      second = rule({ id: 'b', categoryId: 'shopping' })
    for (const rules of [
      [first, second],
      [second, first],
    ])
      expect(classify(transaction, { rules })).toMatchObject({
        categoryId: 'food',
        needsReview: true,
        evidence: ['rule:a', 'equal-priority-rule-conflict'],
      })
    expect(classify(transaction, { rules: [first, { ...second, priority: 2 }] })).toMatchObject({
      categoryId: 'shopping',
      evidence: ['rule:b'],
    })
  })
})
