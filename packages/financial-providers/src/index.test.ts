import { describe, expect, it } from 'vitest'
import {
  ITALIAN_TRANSACTIONS,
  MockItalianProvider,
  merchantKey,
  normalizeAccount,
  normalizeTransaction,
} from './index.js'

const context = { profileId: 'profile-1', connectionId: 'connection-1' }
const observedAt = '2026-10-02T12:00:00Z'
const base = ITALIAN_TRANSACTIONS[0]
if (!base) throw new Error('Fixture missing')

describe('provider normalization', () => {
  it('keeps canonical identity stable through same-ID pending to booked and namespaces profiles/accounts', () => {
    const first = normalizeTransaction('mock', context, { ...base, status: 'pending' }, observedAt)
    const second = normalizeTransaction('mock', context, base, observedAt)
    expect(first.id).toBe(second.id)
    expect(
      normalizeTransaction('mock', { ...context, profileId: 'other' }, base, observedAt).id,
    ).not.toBe(first.id)
    expect(
      normalizeTransaction('mock', context, { ...base, accountId: 'other' }, observedAt).id,
    ).not.toBe(first.id)
    expect(second.amount.amountMinor).toBe(235000n)
  })
  it('preserves the original merchant string while normalizing comparison keys', () => {
    expect(merchantKey('  CAFÉ — Firenze  ')).toBe('cafe firenze')
    expect(
      normalizeTransaction('mock', context, { ...base, merchantName: 'CAFÉ — Firenze' }, observedAt)
        .merchantName,
    ).toBe('CAFÉ — Firenze')
  })
  it.each(['1e3', '1,50', '0.001', '9007199254740993.333'])(
    'never silently rounds or accepts ambiguous money %s',
    (amount) => {
      expect(() => normalizeTransaction('mock', context, { ...base, amount }, observedAt)).toThrow()
    },
  )
  it('rejects invalid dates and missing booked dates', () => {
    expect(() =>
      normalizeTransaction('mock', context, { ...base, bookedOn: '2026-02-30' }, observedAt),
    ).toThrow()
    const { bookedOn: _date, ...withoutDate } = base
    expect(() => normalizeTransaction('mock', context, withoutDate, observedAt)).toThrow()
  })
  it('does not mix amount currencies during account normalization', () => {
    const account = normalizeAccount(
      'mock',
      context,
      {
        id: 'gbp',
        name: 'GBP',
        institutionName: 'Synthetic',
        kind: 'current',
        currency: 'GBP',
        balance: '-99999999999.01',
      },
      observedAt,
    )
    expect(account.balance.amountMinor).toBe(-9999999999901n)
    expect(account.balance.currency).toBe('GBP')
  })
})

describe('synthetic provider contract', () => {
  it('paginates every record without repeats or loss', async () => {
    const provider = new MockItalianProvider()
    const records = []
    let cursor: string | null = null
    do {
      const page = await provider.getTransactions(context, 'conto', cursor)
      records.push(...page.transactions)
      cursor = page.nextCursor
    } while (cursor)
    expect(records).toEqual(ITALIAN_TRANSACTIONS.filter((record) => record.accountId === 'conto'))
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length)
    expect(provider.capabilities()).toEqual({
      accountInformation: true,
      payments: false,
      synthetic: true,
    })
  })
  it('supports retry after a temporary failure and enforces revocation', async () => {
    const provider = new MockItalianProvider()
    provider.failNextRefresh(context.connectionId)
    await expect(provider.refreshConnection(context)).rejects.toThrow('temporary')
    await expect(provider.refreshConnection(context)).resolves.toBeUndefined()
    await provider.disconnect(context)
    await expect(provider.listAccounts(context)).rejects.toThrow('revoked')
    await provider.createConnection(context)
    await expect(provider.listAccounts(context)).resolves.toHaveLength(5)
  })
})
