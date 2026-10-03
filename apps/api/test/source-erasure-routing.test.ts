import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { cancelRestoredConnectionCreationIntents } from '../src/connection-creation.js'
import { connectionCreationIntents } from '../src/connection-creation-schema.js'
import { createDataExportArchive } from '../src/data-export.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { processNextRevocation } from '../src/revocation-outbox.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from '../src/runtime-config.js'
import { recoverSourceErasures } from '../src/source-erasure.js'
import {
  createSourceErasureJournal,
  type SourceErasureJournal,
} from '../src/source-erasure-journal.js'
import { sourceErasureReceipts } from '../src/source-erasure-schema.js'

let handle: DatabaseHandle
let root: string
let journal: SourceErasureJournal
let encryption: ProfileEncryption
let app: Awaited<ReturnType<typeof createApp>>
let at = '2026-10-03T12:00:00.000Z'
let scopes = 0
const profileId = `source_http_${randomUUID()}`
class Provider extends MockItalianProvider {
  override async listInstitutions(...args: Parameters<MockItalianProvider['listInstitutions']>) {
    expect(scopes).toBe(0)
    return super.listInstitutions(...args)
  }
  override async createConnection(...args: Parameters<MockItalianProvider['createConnection']>) {
    expect(scopes).toBe(0)
    return super.createConnection(...args)
  }
  override async openSync(...args: Parameters<MockItalianProvider['openSync']>) {
    expect(scopes).toBe(0)
    return super.openSync(...args)
  }
}
const provider = new Provider()
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  root = await mkdtemp(join(tmpdir(), 'lilleri-source-http-'))
  const keys = await createLocalSyntheticKeyManagement({
    directory: join(root, 'vault'),
    mode: 'demo',
  })
  journal = await createSourceErasureJournal({
    directory: join(root, 'journal'),
    anchorDirectory: join(root, 'vault'),
    keys,
    mode: 'demo',
  })
  encryption = new ProfileEncryption(handle.db, keys, () => at)
  const configurations = new RuntimeConfigurationStore(handle.db)
  await configurations.ensure(DEFAULT_RUNTIME_CONFIGURATION)
  app = await createApp({
    db: handle.db,
    profileId,
    provider,
    demoMode: true,
    seed: false,
    now: () => at,
    encryption,
    sourceErasureJournal: journal,
    syncConfiguration: () => configurations.read(),
    financialScope: (id, work, options) =>
      handle.withProfile(
        id,
        async (db) => {
          expect(id).toBe(profileId)
          scopes++
          try {
            return await work(db)
          } finally {
            scopes--
          }
        },
        options,
      ),
  })
})
afterAll(async () => {
  await app?.close()
  if (handle)
    await handle.db.transaction(async (db) => {
      await db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
      // This disposable fixture intentionally retains production receipts until its own teardown.
      await db.execute(
        sql`ALTER TABLE source_erasure_receipts DISABLE TRIGGER source_erasure_receipt_immutable`,
      )
      await db.delete(sourceErasureReceipts).where(eq(sourceErasureReceipts.profileId, profileId))
      await db.execute(
        sql`ALTER TABLE source_erasure_receipts ENABLE TRIGGER source_erasure_receipt_immutable`,
      )
      await db
        .delete(connectionCreationIntents)
        .where(eq(connectionCreationIntents.profileId, profileId))
    })
  journal?.close()
  await handle?.close()
  if (root) await rm(root, { recursive: true, force: true })
})
async function request(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: unknown,
  status = 200,
) {
  const reply = await app.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
  })
  expect(reply.statusCode, reply.body).toBe(status)
  return status === 204 ? null : reply.json()
}
let connectionId: string
let manualAccountId: string
let originalIds: string[]
test('durable bank and local writes commit real source facts without provider I/O inside SQL', async () => {
  const bank = await request('POST', '/v1/connections/mock', {})
  connectionId = bank.id
  const before = await request('GET', '/v1/demo')
  originalIds = before.transactions.map((row: { id: string }) => row.id).sort()
  const manual = await request(
    'POST',
    '/v1/manual/accounts',
    {
      requestId: randomUUID(),
      name: 'Cassa sintetica',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '10000',
      openingOn: '2026-10-03',
    },
    201,
  )
  manualAccountId = manual.id
  await request(
    'POST',
    '/v1/manual/transactions',
    {
      requestId: randomUUID(),
      accountId: manualAccountId,
      currency: 'EUR',
      amountMinor: '-321',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Spesa sintetica locale',
    },
    201,
  )
  const tx = before.transactions.find(
    (row: { merchantName: string | null }) => row.merchantName === 'Coop',
  )
  expect(tx).toBeDefined()
  const preview = await request('POST', '/v1/merchants/preview', {
    transactionId: tx.id,
    displayName: 'Esercente sintetico salvato',
  })
  await request('POST', '/v1/merchants/apply', {
    transactionId: tx.id,
    displayName: 'Esercente sintetico salvato',
    previewRevision: preview.previewRevision,
  })
  const exported = await request('GET', '/v1/export')
  expect(exported.connectionCreation.intents[0].state).toBe('applied')
  expect(exported.sourceErasures).toEqual([])
  const monthly = await request('GET', '/v1/insights/monthly?month=2026-09')
  await request(
    'POST',
    '/v1/insights/monthly/snapshots',
    {
      month: monthly.month,
      expectedInputDigest: monthly.capture.inputDigest,
      policyVersion: monthly.capture.policyVersion,
    },
    200,
  )
})
test('source erasure retains the other source and authenticated historical export', async () => {
  at = '2026-10-03T12:01:00.000Z'
  await request(
    'DELETE',
    `/v1/connections/${encodeURIComponent(connectionId)}`,
    { data: 'erase' },
    204,
  )
  const overview = await request('GET', '/v1/demo')
  expect(overview.accounts.map((row: { id: string }) => row.id)).toEqual([manualAccountId])
  expect(overview.accounts[0].balance.amountMinor).toBe('9679')
  expect(overview.transactions).toHaveLength(1)
  const exported = await request('GET', '/v1/export')
  expect(exported.sourceErasures).toHaveLength(1)
  expect(exported.understandingPersistence.monthlySnapshots[0].payload).toBeNull()
  expect(exported.understandingPersistence.monthlySnapshots[0].sourceReceiptId).toBe(
    exported.sourceErasures[0].signed.body.id,
  )
  expect(exported.merchantTaxonomy.aliasEvents.length).toBeGreaterThan(0)
  expect(journal.verifyReceipt(exported.sourceErasures[0].signed).body.connectionId).toBe(
    connectionId,
  )
  await expect(createDataExportArchive(exported)).rejects.toMatchObject({
    code: 'invalid_export_snapshot',
  })
  const zip = await app.inject({ method: 'GET', url: '/v1/export/archive' })
  expect(zip.statusCode, zip.body).toBe(200)
  const files = unzipSync(zip.rawPayload)
  expect(Object.keys(files)).toHaveLength(11)
  const snapshotEntry = Object.entries(files).find(([name]) => name === 'data.json')
  expect(snapshotEntry).toBeDefined()
  expect(JSON.parse(strFromU8(snapshotEntry?.[1] as Uint8Array)).transactions).toHaveLength(1)
})
test('a newly authorized grant with reused canonical IDs survives replay of the earlier erasure', async () => {
  await request('POST', '/v1/connections/mock', {}, 409)
  for (let index = 0; index < 20; index++) {
    const result = await processNextRevocation(handle.db, [provider], { now: () => at, profileId })
    if (!result) break
    expect(result.state).toBe('completed')
  }
  at = '2026-10-03T12:02:00.000Z'
  const renewed = await request('POST', '/v1/connections/mock', {})
  expect(renewed.id).toBe(connectionId)
  const before = await request('GET', '/v1/demo')
  expect(
    before.transactions
      .filter((row: { connectionId: string }) => row.connectionId === connectionId)
      .map((row: { id: string }) => row.id)
      .sort(),
  ).toEqual(originalIds)
  await recoverSourceErasures(handle.db, journal, encryption, () => at, {
    replayCreationIntents: (db, pid, cid, ids, now) =>
      cancelRestoredConnectionCreationIntents(db, pid, cid, ids, now),
  })
  expect(await request('GET', '/v1/demo')).toEqual(before)
  const archived = await app.inject({ method: 'GET', url: '/v1/export/archive' })
  expect(archived.statusCode, archived.body).toBe(200)
})
test('explicit local account creation after erasure creates a usable new signed generation', async () => {
  const overview = await request('GET', '/v1/demo')
  const manualSource = overview.accounts.find(
    (row: { id: string }) => row.id === manualAccountId,
  ).connectionId
  at = '2026-10-03T12:03:00.000Z'
  await request(
    'DELETE',
    `/v1/connections/${encodeURIComponent(manualSource)}`,
    { data: 'erase' },
    204,
  )
  const manual = await request(
    'POST',
    '/v1/manual/accounts',
    {
      requestId: randomUUID(),
      name: 'Nuova cassa sintetica',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '777',
      openingOn: '2026-10-03',
    },
    201,
  )
  await recoverSourceErasures(handle.db, journal, encryption, () => at, {
    replayCreationIntents: (db, pid, cid, ids, now) =>
      cancelRestoredConnectionCreationIntents(db, pid, cid, ids, now),
  })
  const after = await request('GET', '/v1/demo')
  expect(
    after.accounts.find((row: { id: string }) => row.id === manual.id).balance.amountMinor,
  ).toBe('777')
  expect(after.accounts.some((row: { id: string }) => row.id === manualAccountId)).toBe(false)
  const exported = await request('GET', '/v1/export')
  expect(exported.sourceErasures).toHaveLength(2)
  const zip = await app.inject({ method: 'GET', url: '/v1/export/archive' })
  expect(zip.statusCode, zip.body).toBe(200)
})
