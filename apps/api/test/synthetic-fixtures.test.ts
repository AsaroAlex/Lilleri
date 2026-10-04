import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { createDataExportArchive } from '../src/data-export.js'
import { DemoService } from '../src/service.js'
import {
  fixtureAudit,
  restoreSyntheticFixtures,
  syntheticFixturePreflight,
} from '../src/synthetic-fixtures.js'

let handle: DatabaseHandle
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const profiles: string[] = []
const now = () => '2026-10-04T16:30:00.000Z'
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
})
async function setup(
  profileId = `fixtures_${randomUUID()}`,
  fixtures: 'seeded' | 'empty' = 'seeded',
) {
  if (!profiles.includes(profileId)) profiles.push(profileId)
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    profileId,
    seed: true,
    demoFixtures: fixtures,
    now,
  })
  apps.push(app)
  return { app, profileId }
}
async function overview(app: Awaited<ReturnType<typeof createApp>>) {
  const result = await app.inject({ url: '/v1/demo' })
  expect(result.statusCode, result.payload).toBe(200)
  return result.json()
}

describe('explicit demo fixture retirement, without erasing user ownership', () => {
  test('a fresh empty launch has no mock accounts, transactions or banking catalogue; reconnect cannot reseed', async () => {
    const { app } = await setup(undefined, 'empty')
    const data = await overview(app)
    expect(data).toMatchObject({
      mode: 'synthetic',
      fixtureMode: 'empty',
      accounts: [],
      transactions: [],
      connections: [],
    })
    expect(data.fixtureCleanup).toMatchObject({ retiredTransactions: 0, archivePreserved: true })
    for (const url of [
      '/v1/manual/accounts',
      '/v1/manual/transactions',
      '/v1/imports/csv',
      '/v1/imports/mapped/layout',
      '/v1/imports/mapped/workbook',
      '/v1/imports/mapped/preview',
      '/v1/imports/mapped/commit',
      '/v1/import-mappings',
    ]) {
      const response = await app.inject({ method: 'POST', url, payload: {} })
      expect(response.statusCode, response.payload).toBe(401)
      expect(response.json().code).toBe('public_identity_required')
    }
    expect((await app.inject({ url: '/v1/institutions' })).json().institutions).toEqual([])
    for (const input of [
      { url: '/v1/connections/mock', payload: {} },
      {
        url: '/v1/connections',
        payload: { institutionId: 'synthetic-italian', accountKind: 'current' },
      },
    ]) {
      const response = await app.inject({ method: 'POST', ...input })
      expect(response.statusCode).toBe(409)
      expect(response.json().code).toBe('synthetic_fixtures_disabled')
    }
  })
  test('proven bank fixtures disappear from every active view; manual/CSV rows, balances and decisions stay owned', async () => {
    const { app, profileId } = await setup()
    const original = await overview(app)
    const fixtureAccount = original.accounts.find(
      (row: { kind: string; balance: { currency: string } }) =>
        row.kind === 'current' && row.balance.currency === 'EUR',
    )
    const imported = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: {
        accountId: fixtureAccount.id,
        csv: 'id,date,amount,currency,description,merchant,reference\nuser-csv,2026-10-04,-17.25,EUR,Spesa personale,Negozio,reale',
      },
    })
    expect(imported.statusCode, imported.payload).toBe(200)
    const account = await app.inject({
      method: 'POST',
      url: '/v1/manual/accounts',
      payload: {
        requestId: randomUUID(),
        name: 'Conto personale',
        kind: 'cash',
        currency: 'EUR',
        openingBalanceMinor: '12345',
        openingOn: '2026-10-04',
      },
    })
    expect(account.statusCode, account.payload).toBe(201)
    const transaction = await app.inject({
      method: 'POST',
      url: '/v1/manual/transactions',
      payload: {
        requestId: randomUUID(),
        accountId: account.json().id,
        amountMinor: '-350',
        currency: 'EUR',
        bookedOn: '2026-10-04',
        kind: 'expense',
        description: 'Inserimento personale',
      },
    })
    expect(transaction.statusCode, transaction.payload).toBe(201)
    const correction = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${original.transactions[0].id}/classification`,
      payload: {
        categoryId: 'food',
        scope: 'once',
        revision: original.transactions[0].revision,
      },
    })
    expect(correction.statusCode, correction.payload).toBe(200)
    const preflight = await app.inject({ url: '/v1/demo/fixtures/preflight' })
    expect(preflight.statusCode, preflight.payload).toBe(200)
    expect(preflight.json().wouldRetire).toMatchObject({
      protectedTransactions: 2,
      protectedAccounts: 2,
      archivePreserved: true,
    })
    expect(preflight.payload).not.toContain('Spesa personale')
    expect(preflight.payload).not.toContain(fixtureAccount.id)
    const before = await syntheticFixturePreflight(handle.db, profileId)
    expect(before.transactionIds).toHaveLength(original.transactions.length)
    expect(before).toMatchObject({
      protectedTransactions: 2,
      protectedAccounts: 2,
      userDecisions: 1,
    })
    const empty = (await setup(profileId, 'empty')).app
    const data = await overview(empty)
    for (const url of [
      `/v1/connections/${original.connections[0].id}/sync`,
      `/v1/connections/${original.connections[0].id}/renew`,
      `/v1/connections/${original.connections[0].id}/resume`,
    ]) {
      const response = await empty.inject({ method: 'POST', url, payload: {} })
      expect(response.statusCode, response.payload).toBe(409)
      expect(response.json().code).toBe('synthetic_fixtures_disabled')
    }
    expect(data.transactions).toHaveLength(2)
    expect(
      data.transactions.every((row: { providerId: string }) => row.providerId !== 'mock-italian'),
    ).toBe(true)
    expect(data.accounts).toHaveLength(2)
    const merchants = await empty.inject({ url: '/v1/merchants' })
    expect(merchants.statusCode, merchants.payload).toBe(200)
    expect(merchants.payload).not.toContain('Esselunga')
    expect(
      data.accounts.find((row: { id: string }) => row.id === account.json().id).balance.amountMinor,
    ).toBe('11995')
    expect(data.fixtureCleanup).toMatchObject({
      retiredTransactions: original.transactions.length,
      protectedTransactions: 2,
      protectedAccounts: 2,
      userDecisions: 1,
      archivePreserved: true,
    })
    for (const url of [
      '/v1/ledger/search?limit=100',
      '/v1/ledger/projection?limit=100',
      '/v1/transactions?limit=100',
    ]) {
      const result = await empty.inject({ url })
      expect(result.statusCode, result.payload).toBe(200)
      expect(result.json().items).toHaveLength(2)
    }
    const owned = await empty.inject({ url: '/v1/export' })
    expect(owned.statusCode, owned.payload).toBe(200)
    expect(owned.json().transactions).toHaveLength(original.transactions.length + 2)
    expect(owned.json().accounts).toHaveLength(original.accounts.length + 1)
    expect(owned.json().feedback).toHaveLength(1)
    expect(owned.json().syntheticFixtures.events).toHaveLength(1)
    const foreign = structuredClone(owned.json())
    foreign.syntheticFixtures.events[0].profileId = 'another-profile'
    await expect(createDataExportArchive(foreign)).rejects.toThrow()
    const forged = structuredClone(owned.json())
    forged.syntheticFixtures.current.proof.protectedTransactions += 1
    await expect(createDataExportArchive(forged)).rejects.toThrow()
    const future = structuredClone(owned.json())
    future.syntheticFixtures.events[0].occurredAt = '2030-01-01T00:00:00.000Z'
    await expect(createDataExportArchive(future)).rejects.toThrow()
    const archive = await empty.inject({ method: 'POST', url: '/v1/export/archive', payload: {} })
    expect(archive.statusCode, archive.payload.slice(0, 200)).toBe(200)
    const service = new DemoService(handle.db, profileId, new MockItalianProvider(), now)
    await service.retireFixtures()
    expect((await fixtureAudit(handle.db, profileId)).events).toHaveLength(1)
    await restoreSyntheticFixtures(handle.db, profileId, now())
    expect((await overview(empty)).transactions).toHaveLength(original.transactions.length + 2)
    expect((await fixtureAudit(handle.db, profileId)).events.map((row) => row.state)).toEqual([
      'retired',
      'restored',
    ])
  })
  test('retirement invalidates a previously issued ledger cursor and leaves another profile unaffected', async () => {
    const { app, profileId } = await setup()
    const other = await setup()
    const before = await overview(other.app)
    const page = await app.inject({ url: '/v1/ledger/search?limit=1' })
    expect(page.statusCode, page.payload).toBe(200)
    expect(page.json().nextCursor).toBeTypeOf('string')
    const empty = (await setup(profileId, 'empty')).app
    const old = await empty.inject({
      url: `/v1/ledger/search?limit=1&cursor=${encodeURIComponent(page.json().nextCursor)}`,
    })
    expect(old.statusCode, old.payload).toBe(409)
    expect(old.json().code).toBe('ledger_changed')
    expect((await overview(empty)).accounts).toEqual([])
    expect((await overview(other.app)).transactions).toEqual(before.transactions)
  })
  test('retirement audit events cannot be updated or deleted separately from profile erasure', async () => {
    const { profileId } = await setup(undefined, 'empty')
    await expect(
      handle.db.execute(
        `UPDATE synthetic_fixture_events SET state='restored' WHERE profile_id='${profileId}'`,
      ),
    ).rejects.toThrow()
    await expect(
      handle.db.execute(`DELETE FROM synthetic_fixture_events WHERE profile_id='${profileId}'`),
    ).rejects.toThrow()
    expect((await fixtureAudit(handle.db, profileId)).events).toHaveLength(1)
  })
})
