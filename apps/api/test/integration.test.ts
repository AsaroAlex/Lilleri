import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  ITALIAN_TRANSACTIONS,
  MockItalianProvider,
  type ProviderContext,
  type ProviderTransaction,
} from '@lilleri/financial-providers'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { assertDemoConfiguration, createApp } from '../src/app.js'
import { processNextRevocation } from '../src/revocation-outbox.js'

let handle: DatabaseHandle
const profileIds: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const appFor = async (provider = new MockItalianProvider(), seed = true) => {
  const profileId = `test_${randomUUID()}`
  profileIds.push(profileId)
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    profileId,
    provider,
    seed,
    now: () => '2026-10-03T12:00:00.000Z',
  })
  apps.push(app)
  return { app, profileId }
}
const overview = async (app: Awaited<ReturnType<typeof createApp>>) => {
  const response = await app.inject({ url: '/v1/demo' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
}
interface MatchSnapshot {
  readonly id: string
  readonly revision: string
  readonly state: 'confirmed' | 'suggested' | 'rejected' | 'undone'
  readonly type: string
  readonly algorithmVersion: string
  readonly evidence: readonly string[]
  readonly transactionIds: readonly string[]
}
function snapshotMatch(analysis: { readonly matches: readonly MatchSnapshot[] }, id: string) {
  const match = analysis.matches.find((item) => item.id === id)
  if (!match) throw new Error(`Expected match ${id} in analysis`)
  return match
}
class MutableProvider extends MockItalianProvider {
  records: readonly ProviderTransaction[] = ITALIAN_TRANSACTIONS
  fail = false
  override async getTransactions(
    _context: ProviderContext,
    accountId: string,
    cursor: string | null = null,
  ) {
    if (this.fail && cursor) throw new Error('Private provider failure details')
    const offset = cursor === null ? 0 : Number(cursor)
    const rows = this.records.filter((record) => record.accountId === accountId)
    return {
      transactions: rows.slice(offset, offset + 7),
      nextCursor: offset + 7 < rows.length ? String(offset + 7) : null,
    }
  }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const profileId of profileIds) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, profileId))
  }
  await handle.close()
})

describe('profile-scoped synthetic financial API', () => {
  test('replaying and concurrent syncing preserve IDs, revisions, immutable observations and exact money', async () => {
    const { app } = await appFor()
    const initial = await overview(app),
      connectionId = initial.connections[0].id
    expect(initial.transactions).toHaveLength(ITALIAN_TRANSACTIONS.length)
    expect(new Set(initial.transactions.map((row: { id: string }) => row.id)).size).toBe(
      ITALIAN_TRANSACTIONS.length,
    )
    expect(
      initial.transactions.find(
        (row: { providerTransactionId: string }) => row.providerTransactionId === 'coop',
      ).amount.amountMinor,
    ).toBe('-8430')
    const responses = await Promise.all(
      [0, 1].map(() =>
        app.inject({ method: 'POST', url: `/v1/connections/${connectionId}/sync`, payload: {} }),
      ),
    )
    for (const response of responses) {
      expect(response.statusCode, response.payload).toBe(200)
      expect(response.json()).toMatchObject({
        inserted: 0,
        updated: 0,
        unchanged: ITALIAN_TRANSACTIONS.length,
        rejected: 0,
      })
    }
    const current = await overview(app)
    expect(current.transactions).toEqual(initial.transactions)
    expect(current.analysis.matches).toEqual(initial.analysis.matches)
    const exported = (await app.inject({ url: '/v1/export' })).json()
    expect(exported.sourceObservations).toHaveLength(ITALIAN_TRANSACTIONS.length)
    expect(exported.syncRuns).toHaveLength(3)
  })
  test('provider failure and dangling relationships roll back every source observation, transaction and sync timestamp', async () => {
    const provider = new MutableProvider(),
      { app } = await appFor(provider)
    const initial = await overview(app),
      connectionId = initial.connections[0].id
    const before = (await app.inject({ url: '/v1/export' })).json()
    provider.fail = true
    const failure = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(failure.statusCode).toBe(502)
    expect(failure.headers['content-type']).toContain('application/problem+json')
    expect(failure.payload).not.toContain('Private provider failure')
    provider.fail = false
    provider.records = [
      ...ITALIAN_TRANSACTIONS,
      {
        id: 'broken-related',
        accountId: 'conto',
        amount: '-1.00',
        currency: 'EUR',
        description: 'Malformed relationship',
        status: 'booked',
        bookedOn: '2026-10-01',
        relatedAccountId: 'unknown-account',
      },
    ]
    const dangling = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(dangling.statusCode, dangling.payload).toBe(502)
    const after = (await app.inject({ url: '/v1/export' })).json()
    for (const key of ['accounts', 'transactions', 'connections', 'sourceObservations', 'syncRuns'])
      expect(after[key]).toEqual(before[key])
    provider.records = ITALIAN_TRANSACTIONS
    const retry = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(retry.statusCode, retry.payload).toBe(200)
    expect(retry.json()).toMatchObject({
      inserted: 0,
      updated: 0,
      unchanged: ITALIAN_TRANSACTIONS.length,
    })
  })
  test('pending to booked keeps canonical identity, increments changed revision, and never downgrades', async () => {
    const provider = new MutableProvider()
    provider.records = [
      {
        id: 'lifecycle',
        accountId: 'conto',
        amount: '-2.00',
        currency: 'EUR',
        description: 'Lifecycle',
        merchantName: 'Coop',
        status: 'pending',
        authorizedOn: '2026-10-01',
      },
    ]
    const { app } = await appFor(provider),
      first = await overview(app),
      connectionId = first.connections[0].id
    const lifecycle = provider.records[0]
    if (!lifecycle) throw new Error('Missing lifecycle fixture')
    provider.records = [{ ...lifecycle, status: 'booked', bookedOn: '2026-10-02' }]
    const booked = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(booked.json()).toMatchObject({ inserted: 0, updated: 1 })
    const second = await overview(app)
    expect(second.transactions[0]).toMatchObject({
      id: first.transactions[0].id,
      status: 'booked',
      revision: 2,
    })
    provider.records = [
      {
        ...lifecycle,
        amount: '-2.50',
        status: 'pending',
        bookedOn: undefined,
      } as unknown as ProviderTransaction,
    ]
    const pending = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(pending.json()).toMatchObject({ rejected: 1, updated: 0 })
    expect((await overview(app)).transactions[0]).toEqual(second.transactions[0])
    expect((await app.inject({ url: '/v1/export' })).json().sourceObservations).toHaveLength(3)
  })
  test('once and merchant feedback survive replay; stale and malformed correction requests cannot overwrite decisions', async () => {
    const { app } = await appFor(),
      initial = await overview(app)
    const netflix = initial.transactions.find(
      (row: { providerTransactionId: string }) => row.providerTransactionId === 'netflix-0',
    )
    const path = `/v1/transactions/${netflix.id}/classification`
    const corrected = await app.inject({
      method: 'PATCH',
      url: path,
      payload: { categoryId: 'travel', scope: 'merchant', revision: netflix.revision },
    })
    expect(corrected.statusCode, corrected.payload).toBe(200)
    expect(corrected.json()).toMatchObject({ categoryId: 'travel', source: 'user' })
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: path,
          payload: { categoryId: 'shopping', scope: 'once', revision: netflix.revision },
        })
      ).statusCode,
    ).toBe(409)
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: path,
          payload: { categoryId: 'invalid', scope: 'once', revision: 2 },
        })
      ).statusCode,
    ).toBe(400)
    await app.inject({
      method: 'POST',
      url: `/v1/connections/${initial.connections[0].id}/sync`,
      payload: {},
    })
    const current = await overview(app)
    expect(current.transactions.find((row: { id: string }) => row.id === netflix.id).revision).toBe(
      2,
    )
    for (const row of current.transactions.filter(
      (row: { merchantKey: string }) => row.merchantKey === 'netflix',
    ))
      expect(
        current.analysis.classifications.find(
          (item: { transactionId: string }) => item.transactionId === row.id,
        ).categoryId,
      ).toBe('travel')
  })
  test('cursor pagination covers every transaction once and rejects invalid or foreign cursors', async () => {
    const { app } = await appFor(),
      other = await appFor()
    const ids: string[] = []
    let cursor: string | null = null,
      firstCursor = ''
    do {
      const response = await app.inject({
        url: `/v1/transactions?limit=7${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      })
      expect(response.statusCode, response.payload).toBe(200)
      const page = response.json()
      ids.push(...page.items.map((item: { id: string }) => item.id))
      cursor = page.nextCursor
      firstCursor ||= cursor ?? ''
    } while (cursor)
    expect(ids.length).toBe(ITALIAN_TRANSACTIONS.length)
    expect(new Set(ids).size).toBe(ids.length)
    expect((await app.inject({ url: '/v1/transactions?cursor=bogus' })).statusCode).toBe(400)
    expect((await app.inject({ url: '/v1/transactions?limit=101' })).statusCode).toBe(400)
    expect(
      (await other.app.inject({ url: `/v1/transactions?cursor=${firstCursor}` })).statusCode,
    ).toBe(400)
  })
  test('profile headers cannot select another tenant; foreign identifiers and references are isolated', async () => {
    const a = await appFor(),
      b = await appFor(),
      initialA = await overview(a.app),
      initialB = await overview(b.app)
    const transactionA = initialA.transactions[0],
      connectionA = initialA.connections[0]
    expect(
      (await b.app.inject({ url: '/v1/demo', headers: { 'x-profile-id': a.profileId } })).json()
        .profile.id,
    ).toBe(b.profileId)
    expect(
      (
        await b.app.inject({
          method: 'PATCH',
          url: `/v1/transactions/${transactionA.id}/classification`,
          payload: { categoryId: 'food', scope: 'once', revision: 1 },
        })
      ).statusCode,
    ).toBe(404)
    expect(
      (
        await b.app.inject({
          method: 'POST',
          url: `/v1/connections/${connectionA.id}/sync`,
          payload: {},
        })
      ).statusCode,
    ).toBe(404)
    expect(
      (
        await b.app.inject({
          method: 'PATCH',
          url: `/v1/reconciliation/${encodeURIComponent(initialA.analysis.matches[0].id)}`,
          payload: { state: 'rejected', revision: initialA.analysis.matches[0].revision },
        })
      ).statusCode,
    ).toBe(404)
    const [accountB] = await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, b.profileId))
    expect(accountB).toBeDefined()
    if (!accountB) throw new Error('Missing profile B account')
    await expect(
      handle.db.insert(schema.feedback).values({
        profileId: b.profileId,
        transactionId: transactionA.id,
        categoryId: 'food',
        scope: 'once',
        createdAt: new Date().toISOString(),
      }),
    ).rejects.toThrow()
    await expect(
      handle.db.insert(schema.accounts).values({
        ...accountB,
        id: `bad_${randomUUID()}`,
        connectionId: connectionA.id,
        providerAccountId: 'bad',
      }),
    ).rejects.toThrow()
    expect((await b.app.inject({ url: '/v1/export' })).json().transactions).toEqual(
      initialB.transactions,
    )
  })
  test('simultaneous opposite reconciliation decisions accept one revision and preserve only the winner', async () => {
    const { app, profileId } = await appFor(),
      initial = await overview(app)
    const match = initial.analysis.matches.find(
      (item: { type: string }) => item.type === 'internal_transfer',
    )
    const commands = ['undone', 'rejected'] as const
    const responses = await Promise.all(
      commands.map((state) =>
        app.inject({
          method: 'PATCH',
          url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
          payload: { state, revision: match.revision },
        }),
      ),
    )
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409])
    const winnerIndex = responses.findIndex((response) => response.statusCode === 200)
    const winner = responses[winnerIndex]
    const loser = responses.find((response) => response.statusCode === 409)
    if (!winner || !loser) throw new Error('Expected exactly one winner and one stale command')
    expect(loser.json().code).toBe('reconciliation_changed')
    const winningMatch = snapshotMatch(winner.json(), match.id)
    expect(winningMatch.state).toBe(commands[winnerIndex])
    expect(winningMatch.revision).not.toBe(match.revision)
    const current = await overview(app)
    expect(current.analysis).toEqual(winner.json())
    const decisions = await handle.db
      .select()
      .from(schema.matchDecisions)
      .where(eq(schema.matchDecisions.profileId, profileId))
    expect(decisions).toMatchObject([
      { matchId: match.id, state: commands[winnerIndex], revision: 1 },
    ])
    const legs = await handle.db
      .select()
      .from(schema.matchDecisionLegs)
      .where(eq(schema.matchDecisionLegs.profileId, profileId))
    expect(legs.map((leg) => leg.transactionId).sort()).toEqual([...match.transactionIds].sort())
    const stale = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'confirmed', revision: match.revision },
    })
    expect(stale.statusCode, stale.payload).toBe(409)
    expect((await overview(app)).analysis).toEqual(current.analysis)
  })
  test('a changed source leg invalidates a reconciliation token while unrelated changes preserve it', async () => {
    const provider = new MutableProvider(),
      { app, profileId } = await appFor(provider),
      initial = await overview(app)
    const match = initial.analysis.matches.find(
      (item: { type: string }) => item.type === 'internal_transfer',
    )
    const connectionId = initial.connections[0].id
    provider.records = provider.records.map((record) =>
      record.id === 'coop' ? { ...record, description: 'COOP descrizione aggiornata' } : record,
    )
    const unrelatedSync = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(unrelatedSync.statusCode, unrelatedSync.payload).toBe(200)
    expect(unrelatedSync.json()).toMatchObject({ inserted: 0, updated: 1 })
    expect(snapshotMatch((await overview(app)).analysis, match.id).revision).toBe(match.revision)
    provider.records = provider.records.map((record) =>
      record.id === 'transfer-out'
        ? { ...record, description: 'Giroconto descrizione aggiornata' }
        : record,
    )
    const relatedSync = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(relatedSync.statusCode, relatedSync.payload).toBe(200)
    expect(relatedSync.json()).toMatchObject({ inserted: 0, updated: 1 })
    const refreshed = await overview(app)
    const changed = snapshotMatch(refreshed.analysis, match.id)
    expect(changed.transactionIds).toEqual(match.transactionIds)
    expect(changed.revision).not.toBe(match.revision)
    const stale = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'rejected', revision: match.revision },
    })
    expect(stale.statusCode, stale.payload).toBe(409)
    expect(stale.json().code).toBe('reconciliation_changed')
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(eq(schema.matchDecisions.profileId, profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisionLegs)
        .where(eq(schema.matchDecisionLegs.profileId, profileId)),
    ).toEqual([])
    expect((await overview(app)).analysis).toEqual(refreshed.analysis)
    const fresh = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'rejected', revision: changed.revision },
    })
    expect(fresh.statusCode, fresh.payload).toBe(200)
    expect(snapshotMatch(fresh.json(), match.id).state).toBe('rejected')
    expect(snapshotMatch(fresh.json(), match.id).revision).not.toBe(changed.revision)
  })
  test('account structure changes invalidate match tokens while balance freshness does not', async () => {
    class AccountChangingProvider extends MockItalianProvider {
      changedKind = false
      changedBalance = false
      override async listAccounts(context: ProviderContext) {
        const accounts = await super.listAccounts(context)
        return accounts.map((account) => ({
          ...account,
          kind: account.id === 'carta' && this.changedKind ? ('current' as const) : account.kind,
          balance: account.id === 'carta' && this.changedBalance ? '-200.00' : account.balance,
        }))
      }
    }
    const provider = new AccountChangingProvider()
    const { app, profileId } = await appFor(provider)
    const initial = await overview(app)
    const match = initial.analysis.matches.find(
      (item: MatchSnapshot) => item.type === 'card_settlement',
    )
    expect(match).toBeDefined()
    const sync = async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/connections/${initial.connections[0].id}/sync`,
        payload: {},
      })
      expect(response.statusCode, response.payload).toBe(200)
      expect(response.json()).toMatchObject({ updated: 0, inserted: 0 })
      return overview(app)
    }
    provider.changedBalance = true
    const balanceOnly = await sync()
    expect(snapshotMatch(balanceOnly.analysis, match.id).revision).toBe(match.revision)
    provider.changedKind = true
    const structural = await sync()
    expect(structural.transactions).toEqual(initial.transactions)
    const changed = snapshotMatch(structural.analysis, match.id)
    expect(changed.revision).not.toBe(match.revision)
    const stale = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'undone', revision: match.revision },
    })
    expect(stale.statusCode, stale.payload).toBe(409)
    expect(stale.json().code).toBe('reconciliation_changed')
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(eq(schema.matchDecisions.profileId, profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisionLegs)
        .where(eq(schema.matchDecisionLegs.profileId, profileId)),
    ).toEqual([])
    const accepted = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'undone', revision: changed.revision },
    })
    expect(accepted.statusCode, accepted.payload).toBe(200)
  })
  test('reconciliation requests require a lowercase 64-character revision before any write', async () => {
    const { app, profileId } = await appFor(),
      initial = await overview(app),
      match = initial.analysis.matches[0]
    for (const payload of [
      { state: 'rejected' },
      { state: 'rejected', revision: 1 },
      { state: 'rejected', revision: '' },
      { state: 'rejected', revision: 'a'.repeat(63) },
      { state: 'rejected', revision: 'a'.repeat(65) },
      { state: 'rejected', revision: 'A'.repeat(64) },
      { state: 'rejected', revision: 'z'.repeat(64) },
      { state: 'rejected', revision: match.revision, unexpected: true },
    ]) {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
        payload,
      })
      expect(response.statusCode, response.payload).toBe(400)
    }
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(eq(schema.matchDecisions.profileId, profileId)),
    ).toEqual([])
    expect((await overview(app)).analysis).toEqual(initial.analysis)
  })
  test('match undo, rejection and confirm decisions persist through resync and include stable legs', async () => {
    const { app } = await appFor(),
      initial = await overview(app)
    const match = initial.analysis.matches.find(
      (item: { type: string }) => item.type === 'internal_transfer',
    )
    let revision = match.revision
    for (const state of ['undone', 'rejected', 'confirmed']) {
      const decision = await app.inject({
        method: 'PATCH',
        url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
        payload: { state, revision },
      })
      expect(decision.statusCode, decision.payload).toBe(200)
      const updated = snapshotMatch(decision.json(), match.id)
      expect(updated.revision).toMatch(/^[a-f0-9]{64}$/)
      expect(updated.revision).not.toBe(revision)
      revision = updated.revision
      expect(
        decision.json().matches.find((item: { id: string }) => item.id === match.id).state,
      ).toBe(state)
      await app.inject({
        method: 'POST',
        url: `/v1/connections/${initial.connections[0].id}/sync`,
        payload: {},
      })
      expect(
        (await overview(app)).analysis.matches.find((item: { id: string }) => item.id === match.id)
          .state,
      ).toBe(state)
      expect(snapshotMatch((await overview(app)).analysis, match.id).revision).toBe(revision)
    }
    // Returning to the initial state still has a new token: an old tab cannot exploit ABA.
    expect(revision).not.toBe(match.revision)
    const stale = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'undone', revision: match.revision },
    })
    expect(stale.statusCode, stale.payload).toBe(409)
    expect(stale.json().code).toBe('reconciliation_changed')
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(
          and(
            eq(schema.matchDecisions.profileId, initial.profile.id),
            eq(schema.matchDecisions.matchId, match.id),
          ),
        ),
    ).toMatchObject([{ state: 'confirmed', revision: 3 }])
    const legs = await handle.db
      .select()
      .from(schema.matchDecisionLegs)
      .where(
        and(
          eq(schema.matchDecisionLegs.profileId, initial.profile.id),
          eq(schema.matchDecisionLegs.matchId, match.id),
        ),
      )
    expect(legs.map((item) => item.transactionId).sort()).toEqual([...match.transactionIds].sort())
  })
  test('negative malformed refund legs cannot subsidise an over-refund confirmation or persist a decision', async () => {
    const provider = new MutableProvider()
    const purchase: ProviderTransaction = {
      id: 'purchase',
      accountId: 'conto',
      amount: '-10.00',
      currency: 'EUR',
      description: 'Purchase',
      merchantName: 'Coop',
      status: 'booked',
      bookedOn: '2026-10-01',
      kind: 'expense',
    }
    const refund = (id: string, amount: string): ProviderTransaction => ({
      id,
      accountId: 'conto',
      amount,
      currency: 'EUR',
      description: 'Refund',
      merchantName: 'Coop',
      status: 'booked',
      bookedOn: '2026-10-02',
      kind: 'refund',
      relatedTransactionId: 'purchase',
    })
    provider.records = [
      purchase,
      refund('refund-one', '6.00'),
      refund('refund-two', '6.00'),
      refund('invalid-negative', '-5.00'),
    ]
    const { app, profileId } = await appFor(provider),
      initial = await overview(app)
    const match = initial.analysis.matches.find((item: { type: string }) => item.type === 'refund')
    expect(match.state).toBe('suggested')
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'confirmed', revision: match.revision },
    })
    expect(response.statusCode, response.payload).toBe(409)
    expect(response.json().code).toBe('conflict')
    expect((await overview(app)).analysis).toEqual(initial.analysis)
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(eq(schema.matchDecisions.profileId, profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisionLegs)
        .where(eq(schema.matchDecisionLegs.profileId, profileId)),
    ).toEqual([])
    const rejected = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'rejected', revision: match.revision },
    })
    expect(rejected.statusCode, rejected.payload).toBe(200)
    const saved = (await app.inject({ url: '/v1/export' })).json()
    const rejectedMatch = snapshotMatch(rejected.json(), match.id)
    const retry = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'confirmed', revision: rejectedMatch.revision },
    })
    expect(retry.statusCode, retry.payload).toBe(409)
    expect(retry.json().code).toBe('conflict')
    const unchanged = (await app.inject({ url: '/v1/export' })).json()
    expect(unchanged.matchDecisions).toEqual(saved.matchDecisions)
    expect(unchanged.matchDecisionLegs).toEqual(saved.matchDecisionLegs)
    expect(unchanged.analysis).toEqual(saved.analysis)
  })
  test('a refund referencing an excluded duplicate purchase cannot be confirmed or persist decision legs', async () => {
    const provider = new MutableProvider()
    const purchase: ProviderTransaction = {
      id: 'purchase-bank',
      accountId: 'conto',
      amount: '-10.00',
      currency: 'EUR',
      description: 'Purchase',
      merchantName: 'Coop',
      status: 'booked',
      bookedOn: '2026-10-01',
      kind: 'expense',
      reference: 'shared-purchase',
    }
    provider.records = [
      purchase,
      { ...purchase, id: 'purchase-csv', source: 'csv' },
      {
        id: 'refund-excluded',
        accountId: 'conto',
        amount: '4.00',
        currency: 'EUR',
        description: 'Refund',
        merchantName: 'Coop',
        status: 'booked',
        bookedOn: '2026-10-02',
        kind: 'refund',
        relatedTransactionId: 'purchase-csv',
      },
    ]
    const { app, profileId } = await appFor(provider),
      initial = await overview(app)
    expect(
      initial.analysis.matches.find((item: { type: string }) => item.type === 'duplicate').state,
    ).toBe('confirmed')
    const match = initial.analysis.matches.find((item: { type: string }) => item.type === 'refund')
    expect(match.state).toBe('suggested')
    const response = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'confirmed', revision: match.revision },
    })
    expect(response.statusCode, response.payload).toBe(409)
    expect(response.json().code).toBe('conflict')
    expect((await overview(app)).analysis).toEqual(initial.analysis)
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(eq(schema.matchDecisions.profileId, profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisionLegs)
        .where(eq(schema.matchDecisionLegs.profileId, profileId)),
    ).toEqual([])
  })
  test('consent revocation blocks sync; reconnect preserves accounts, transactions, balances and consent history', async () => {
    const provider = new MockItalianProvider()
    const { app } = await appFor(provider),
      initial = await overview(app),
      connectionId = initial.connections[0].id
    expect(
      (await app.inject({ method: 'DELETE', url: `/v1/connections/${connectionId}` })).statusCode,
    ).toBe(204)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/connections/${connectionId}/sync`,
          payload: {},
        })
      ).statusCode,
    ).toBe(409)
    expect((await overview(app)).transactions).toEqual(initial.transactions)
    const waiting = await app.inject({ method: 'POST', url: '/v1/connections/mock', payload: {} })
    expect(waiting.statusCode, waiting.payload).toBe(409)
    expect(waiting.json().code).toBe('revocation_pending')
    expect(
      await processNextRevocation(handle.db, [provider], {
        profileId: initial.profile.id,
        now: () => '2026-10-03T12:00:00.000Z',
      }),
    ).toMatchObject({ state: 'completed' })
    const reconnect = await app.inject({ method: 'POST', url: '/v1/connections/mock', payload: {} })
    expect(reconnect.statusCode, reconnect.payload).toBe(200)
    expect(reconnect.json().id).toBe(connectionId)
    const current = await overview(app)
    expect(current.accounts.map((row: { id: string }) => row.id).sort()).toEqual(
      initial.accounts.map((row: { id: string }) => row.id).sort(),
    )
    expect(current.transactions).toEqual(initial.transactions)
    expect(current.analysis.summaries).toEqual(initial.analysis.summaries)
    expect((await app.inject({ url: '/v1/export' })).json().consents).toHaveLength(2)
  })
  test('erasure cascades across raw, feedback, decisions and account data and cannot be silently reseeded', async () => {
    const { app, profileId } = await appFor(),
      initial = await overview(app)
    await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${initial.transactions[0].id}/classification`,
      payload: { categoryId: 'food', scope: 'once', revision: 1 },
    })
    expect((await app.inject({ method: 'DELETE', url: '/v1/profile' })).statusCode).toBe(204)
    for (const table of [
      schema.accounts,
      schema.connections,
      schema.consents,
      schema.transactions,
      schema.observations,
      schema.feedback,
      schema.preferences,
      schema.matchDecisions,
      schema.matchDecisionLegs,
      schema.syncRuns,
    ])
      expect(await handle.db.select().from(table).where(eq(table.profileId, profileId))).toEqual([])
    const restarted = await createApp({ db: handle.db, demoMode: true, profileId, seed: true })
    apps.push(restarted)
    for (const target of [app, restarted]) {
      expect((await target.inject({ url: '/v1/demo' })).statusCode).toBe(404)
      expect(
        (await target.inject({ method: 'POST', url: '/v1/connections/mock', payload: {} }))
          .statusCode,
      ).toBe(404)
    }
  })
  test('untrusted browser origins, hosts and production startup fail closed; OpenAPI is generated', async () => {
    const { app } = await appFor(new MockItalianProvider(), false)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/connections/mock',
          headers: { origin: 'https://untrusted.example' },
          payload: {},
        })
      ).statusCode,
    ).toBe(403)
    expect((await overview(app)).connections).toHaveLength(0)
    expect(
      (await app.inject({ url: '/health', headers: { host: 'untrusted.example' } })).statusCode,
    ).toBe(403)
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/v1/demo',
      headers: { origin: 'http://localhost:3000' },
    })
    expect(preflight.statusCode).toBe(204)
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect(preflight.headers['access-control-allow-credentials']).toBe('true')
    const browserOverview = await app.inject({
      url: '/v1/demo',
      headers: { origin: 'http://localhost:8081' },
    })
    expect(browserOverview.statusCode).toBe(200)
    expect(browserOverview.headers['access-control-allow-origin']).toBe('http://localhost:8081')
    expect(browserOverview.headers['access-control-allow-credentials']).toBe('true')
    expect(
      (await app.inject({ url: '/openapi.json' })).json().paths[
        '/v1/transactions/{id}/classification'
      ],
    ).toBeDefined()
    expect(() => assertDemoConfiguration(false, 'development')).toThrow()
    expect(() => assertDemoConfiguration(true, 'production')).toThrow()
    expect(() => assertDemoConfiguration(true, 'development', '0.0.0.0')).toThrow()
  })
  test('CSV import is atomic, idempotent, profile scoped and retains the target canonical account identity', async () => {
    const { app } = await appFor(),
      initial = await overview(app)
    const accountId = initial.accounts.find(
      (account: { providerAccountId: string }) => account.providerAccountId === 'conto',
    ).id
    const header = 'id,date,amount,currency,description,merchant,reference\n'
    const csv = `${header}new-row,2026-10-01,-3.40,EUR,Caffè CSV,Bar Demo,csv-demo-1`
    const body = { accountId, csv }
    const imported = await app.inject({ method: 'POST', url: '/v1/imports/csv', payload: body })
    expect(imported.statusCode, imported.payload).toBe(200)
    expect(imported.json()).toMatchObject({ inserted: 1, unchanged: 0 })
    expect(
      (await app.inject({ method: 'POST', url: '/v1/imports/csv', payload: body })).json(),
    ).toMatchObject({ inserted: 0, unchanged: 1 })
    const current = await overview(app)
    expect(current.accounts).toHaveLength(initial.accounts.length)
    expect(
      current.transactions.find(
        (row: { providerTransactionId: string }) => row.providerTransactionId === 'csv:new-row',
      ),
    ).toMatchObject({ accountId, source: 'csv', amount: { amountMinor: '-340', currency: 'EUR' } })
    const invalid = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: {
        accountId,
        csv: `${header}would-insert,2026-10-01,-1.00,EUR,Valid,Bar Demo,\nnew-row,2026-10-01,-9.00,EUR,Collision,Bar Demo,`,
      },
    })
    expect(invalid.statusCode, invalid.payload).toBe(409)
    expect((await overview(app)).transactions).toEqual(current.transactions)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/imports/csv',
          payload: {
            accountId,
            csv: `${header}wrong-currency,2026-10-01,-1.00,GBP,Wrong,Bar Demo,`,
          },
        })
      ).statusCode,
    ).toBe(422)
    const foreign = await appFor()
    expect(
      (await foreign.app.inject({ method: 'POST', url: '/v1/imports/csv', payload: body }))
        .statusCode,
    ).toBe(404)
  })
  test('on-disk PostgreSQL storage retains financial rows and feedback after closing and reopening', async () => {
    const path = await mkdtemp(join(tmpdir(), 'lilleri-persistence-'))
    let database = await openDatabase({ driver: 'pglite', path })
    const profileId = `persist_${randomUUID()}`
    let app = await createApp({ db: database.db, demoMode: true, profileId, seed: true })
    const before = await overview(app),
      row = before.transactions[0]
    await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${row.id}/classification`,
      payload: { categoryId: 'travel', scope: 'once', revision: row.revision },
    })
    const corrected = await overview(app)
    const match = corrected.analysis.matches.find(
      (item: { type: string }) => item.type === 'internal_transfer',
    )
    const decided = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'rejected', revision: match.revision },
    })
    expect(decided.statusCode, decided.payload).toBe(200)
    const savedMatch = snapshotMatch(decided.json(), match.id)
    await app.close()
    await database.close()
    database = await openDatabase({ driver: 'pglite', path })
    app = await createApp({ db: database.db, demoMode: true, profileId, seed: true })
    const after = await overview(app)
    expect(after.connections).toHaveLength(1)
    expect(after.transactions).toHaveLength(before.transactions.length)
    expect(
      after.analysis.classifications.find(
        (item: { transactionId: string }) => item.transactionId === row.id,
      ),
    ).toMatchObject({ categoryId: 'travel', source: 'user' })
    expect(snapshotMatch(after.analysis, match.id)).toEqual(savedMatch)
    expect((await app.inject({ url: '/v1/export' })).json().matchDecisions).toMatchObject([
      { matchId: match.id, state: 'rejected', revision: 1 },
    ])
    const stale = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'undone', revision: match.revision },
    })
    expect(stale.statusCode, stale.payload).toBe(409)
    expect(stale.json().code).toBe('reconciliation_changed')
    const undone = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'undone', revision: savedMatch.revision },
    })
    expect(undone.statusCode, undone.payload).toBe(200)
    expect(snapshotMatch(undone.json(), match.id).revision).not.toBe(savedMatch.revision)
    await app.close()
    await database.close()
    await rm(path, { recursive: true, force: true })
  })
})
