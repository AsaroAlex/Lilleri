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

let handle: DatabaseHandle
const profileIds: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const appFor = async (provider = new MockItalianProvider(), seed = true) => {
  const profileId = `test_${randomUUID()}`
  profileIds.push(profileId)
  const app = await createApp({ db: handle.db, demoMode: true, profileId, provider, seed })
  apps.push(app)
  return { app, profileId }
}
const overview = async (app: Awaited<ReturnType<typeof createApp>>) => {
  const response = await app.inject({ url: '/v1/demo' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
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
          payload: { state: 'rejected' },
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
  test('match undo, rejection and confirm decisions persist through resync and include stable legs', async () => {
    const { app } = await appFor(),
      initial = await overview(app)
    const match = initial.analysis.matches.find(
      (item: { type: string }) => item.type === 'internal_transfer',
    )
    for (const state of ['undone', 'rejected', 'confirmed']) {
      const decision = await app.inject({
        method: 'PATCH',
        url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
        payload: { state },
      })
      expect(decision.statusCode, decision.payload).toBe(200)
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
    }
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
      payload: { state: 'confirmed' },
    })
    expect(response.statusCode, response.payload).toBe(409)
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
      payload: { state: 'confirmed' },
    })
    expect(response.statusCode, response.payload).toBe(409)
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
    const { app } = await appFor(),
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
    await app.close()
    await database.close()
    await rm(path, { recursive: true, force: true })
  })
})
