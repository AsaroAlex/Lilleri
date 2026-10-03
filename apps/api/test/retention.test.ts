import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  ITALIAN_TRANSACTIONS,
  MockItalianProvider,
  type ProviderContext,
  type ProviderTransaction,
} from '@lilleri/financial-providers'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  cleanupExpiredObservationPayloads,
  RAW_PAYLOAD_RETENTION_MS,
  sourceObservationsForExport,
} from '../src/retention.js'

let handle: DatabaseHandle
const profiles: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const ingestedAt = '2026-10-03T08:00:00.000Z'
const expiry = '2026-11-02T08:00:00.000Z'
class MutableProvider extends MockItalianProvider {
  records: readonly ProviderTransaction[] = [ITALIAN_TRANSACTIONS[0] as ProviderTransaction]
  override async getTransactions(_context: ProviderContext, accountId: string) {
    return {
      transactions: this.records.filter((row) => row.accountId === accountId),
      nextCursor: null,
    }
  }
}
async function fixture(provider = new MutableProvider(), initial = ingestedAt) {
  let current = initial
  const profileId = `retention_${randomUUID()}`
  profiles.push(profileId)
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    profileId,
    provider,
    seed: true,
    now: () => current,
  })
  apps.push(app)
  return {
    app,
    profileId,
    provider,
    setNow: (value: string) => {
      current = value
    },
  }
}
async function exported(app: Awaited<ReturnType<typeof createApp>>) {
  const response = await app.inject({ url: '/v1/export' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
}
async function payloads(profileId: string) {
  return handle.db
    .select()
    .from(schema.observationPayloads)
    .where(eq(schema.observationPayloads.profileId, profileId))
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const profileId of profiles) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, profileId))
  }
  await handle.close()
})

describe('bounded synthetic source payload retention', () => {
  test('export omits raw content exactly at expiry even before cleanup and leaves financial facts intact', async () => {
    const { app, profileId, setNow } = await fixture()
    const before = await exported(app)
    expect(before.sourceObservations).toHaveLength(1)
    expect(before.sourceObservations[0]).toMatchObject({
      payload: ITALIAN_TRANSACTIONS[0],
      payloadExpiresAt: expiry,
      observedAt: ingestedAt,
    })
    setNow('2026-10-23T08:00:00.000Z')
    const replay = await app.inject({
      method: 'POST',
      url: `/v1/connections/${before.connections[0].id}/sync`,
      payload: {},
    })
    expect(replay.statusCode, replay.payload).toBe(200)
    const currentFacts = await exported(app)
    expect(currentFacts.sourceObservations[0].payloadExpiresAt).toBe(expiry)
    expect(currentFacts.transactions).toEqual(before.transactions)
    setNow('2026-11-02T07:59:59.999Z')
    expect((await exported(app)).sourceObservations[0].payload).toEqual(ITALIAN_TRANSACTIONS[0])
    setNow(expiry)
    const at = await exported(app)
    expect(at.sourceObservations[0]).not.toHaveProperty('payload')
    expect(at.sourceObservations[0]).not.toHaveProperty('payloadExpiresAt')
    expect(await payloads(profileId)).toHaveLength(1)
    setNow('2026-11-02T08:00:00.001Z')
    const after = await exported(app)
    expect(after.sourceObservations).toEqual(at.sourceObservations)
    for (const key of ['transactions', 'accounts', 'analysis', 'feedback', 'preferences'])
      expect(after[key]).toEqual(currentFacts[key])
    expect(await cleanupExpiredObservationPayloads(handle.db, profileId, expiry)).toEqual({
      deleted: 1,
    })
    expect(await payloads(profileId)).toEqual([])
    expect((await exported(app)).sourceObservations).toEqual(at.sourceObservations)
  })

  test('cleanup is bounded, idempotent and scoped even when another profile also has expired content', async () => {
    const provider = new MutableProvider()
    provider.records = ITALIAN_TRANSACTIONS.slice(0, 3)
    const owned = await fixture(provider),
      other = await fixture()
    expect(
      await cleanupExpiredObservationPayloads(
        handle.db,
        owned.profileId,
        '2026-11-02T07:59:59.999Z',
        1,
      ),
    ).toEqual({ deleted: 0 })
    expect(await cleanupExpiredObservationPayloads(handle.db, owned.profileId, expiry, 1)).toEqual({
      deleted: 1,
    })
    expect(await payloads(owned.profileId)).toHaveLength(2)
    expect(await payloads(other.profileId)).toHaveLength(1)
    expect(await cleanupExpiredObservationPayloads(handle.db, owned.profileId, expiry, 1)).toEqual({
      deleted: 1,
    })
    expect(
      await cleanupExpiredObservationPayloads(handle.db, owned.profileId, expiry, 100),
    ).toEqual({ deleted: 1 })
    expect(await cleanupExpiredObservationPayloads(handle.db, owned.profileId, expiry)).toEqual({
      deleted: 0,
    })
    expect(await payloads(other.profileId)).toHaveLength(1)
    for (const limit of [0, -1, 1001, 1.5])
      await expect(
        cleanupExpiredObservationPayloads(handle.db, owned.profileId, expiry, limit),
      ).rejects.toThrow('batch limit')
    await expect(
      cleanupExpiredObservationPayloads(handle.db, owned.profileId, 'invalid'),
    ).rejects.toThrow('retention clock')
  })

  test('provider replay cannot rehydrate or extend expired payload; changed source creates a new bounded observation', async () => {
    const { app, profileId, provider, setNow } = await fixture()
    const initial = await exported(app),
      connectionId = initial.connections[0].id
    setNow(expiry)
    await cleanupExpiredObservationPayloads(handle.db, profileId, expiry)
    const replay = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(replay.statusCode, replay.payload).toBe(200)
    expect(replay.json()).toMatchObject({ inserted: 0, updated: 0, unchanged: 1 })
    expect(await payloads(profileId)).toEqual([])
    const afterReplay = await exported(app)
    expect(afterReplay.sourceObservations).toHaveLength(1)
    expect(afterReplay.sourceObservations[0].observedAt).toBe(ingestedAt)
    expect(afterReplay.sourceObservations[0]).not.toHaveProperty('payload')
    expect(afterReplay.transactions).toEqual(initial.transactions)
    const source = provider.records[0]
    if (!source) throw new Error('Missing source fixture')
    provider.records = [{ ...source, description: `${source.description} aggiornato` }]
    const changed = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(changed.statusCode, changed.payload).toBe(200)
    expect(changed.json()).toMatchObject({ inserted: 0, updated: 1, unchanged: 0 })
    const afterChange = await exported(app)
    expect(afterChange.sourceObservations).toHaveLength(2)
    const fresh = afterChange.sourceObservations.find((row: { payload?: unknown }) => row.payload)
    expect(fresh).toMatchObject({
      observedAt: expiry,
      payloadExpiresAt: '2026-12-02T08:00:00.000Z',
    })
    expect(await payloads(profileId)).toHaveLength(1)
  })

  test('CSV reimport cannot rehydrate expired source content or duplicate the canonical ledger', async () => {
    const { app, profileId, setNow } = await fixture()
    const initial = await exported(app),
      accountId = initial.accounts.find(
        (row: { providerAccountId: string }) => row.providerAccountId === 'conto',
      ).id
    const csv =
      'id,date,amount,currency,description,merchant,reference\nretention-csv,2026-10-01,-12.34,EUR,Test retention,,\n'
    const imported = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: { accountId, csv },
    })
    expect(imported.statusCode, imported.payload).toBe(200)
    const beforeExpiry = await exported(app)
    expect(beforeExpiry.sourceObservations).toHaveLength(2)
    setNow(expiry)
    await cleanupExpiredObservationPayloads(handle.db, profileId, expiry)
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: { accountId, csv },
    })
    expect(replay.statusCode, replay.payload).toBe(200)
    expect(replay.json()).toMatchObject({ inserted: 0, updated: 0, unchanged: 1 })
    expect(await payloads(profileId)).toEqual([])
    const after = await exported(app)
    expect(after.transactions).toEqual(beforeExpiry.transactions)
    expect(after.sourceObservations).toHaveLength(2)
    expect(
      after.sourceObservations.every((row: { payload?: unknown }) => row.payload === undefined),
    ).toBe(true)
  })

  test('scoped FK rejects a cross-profile payload, metadata stays immutable and profile erasure cascades content', async () => {
    const owned = await fixture(),
      other = await fixture()
    const first = (await exported(owned.app)).sourceObservations[0]
    await expect(
      handle.db.insert(schema.observationPayloads).values({
        profileId: other.profileId,
        observationId: first.id,
        expiresAt: expiry,
        payload: { secret: 'synthetic' },
      }),
    ).rejects.toThrow()
    await expect(
      handle.db
        .update(schema.observations)
        .set({ observedAt: expiry })
        .where(
          and(
            eq(schema.observations.profileId, owned.profileId),
            eq(schema.observations.id, first.id),
          ),
        ),
    ).rejects.toThrow()
    const otherExport = await sourceObservationsForExport(handle.db, other.profileId, ingestedAt)
    expect(otherExport).toHaveLength(1)
    expect(otherExport[0]?.id).not.toBe(first.id)
    expect((await owned.app.inject({ method: 'DELETE', url: '/v1/profile' })).statusCode).toBe(204)
    expect(await payloads(owned.profileId)).toEqual([])
    expect(
      await handle.db
        .select()
        .from(schema.observations)
        .where(eq(schema.observations.profileId, owned.profileId)),
    ).toEqual([])
    expect(await payloads(other.profileId)).toHaveLength(1)
  })

  test('the 30-day window follows the ingest instant across timezone offsets', async () => {
    const { app, setNow } = await fixture(new MutableProvider(), '2026-10-03T10:00:00+02:00')
    const before = await exported(app)
    expect(before.sourceObservations[0].payloadExpiresAt).toBe(expiry)
    expect(Date.parse(expiry) - Date.parse('2026-10-03T10:00:00+02:00')).toBe(
      RAW_PAYLOAD_RETENTION_MS,
    )
    setNow('2026-11-02T09:00:00+01:00')
    expect((await exported(app)).sourceObservations[0]).not.toHaveProperty('payload')
  })

  test('deleting a source cascades its raw content and ledger without deleting another profile', async () => {
    const owned = await fixture(),
      other = await fixture()
    const initial = await exported(owned.app)
    await handle.db
      .delete(schema.connections)
      .where(
        and(
          eq(schema.connections.profileId, owned.profileId),
          eq(schema.connections.id, initial.connections[0].id),
        ),
      )
    expect(await payloads(owned.profileId)).toEqual([])
    const after = await exported(owned.app)
    expect(after.sourceObservations).toEqual([])
    expect(after.transactions).toEqual([])
    expect(after.accounts).toEqual([])
    expect(await payloads(other.profileId)).toHaveLength(1)
    expect((await exported(other.app)).transactions).toHaveLength(1)
  })
})

test('migration preserves legacy provenance and original payload expiry without restarting its clock', async () => {
  interface LegacyClient {
    exec(sql: string): Promise<unknown>
    query<T>(sql: string): Promise<{ rows: T[] }>
    close(): Promise<void>
  }
  const databaseRequire = createRequire(import.meta.resolve('@lilleri/database'))
  const { PGlite } = databaseRequire('@electric-sql/pglite') as { PGlite: new () => LegacyClient }
  const legacy = new PGlite()
  try {
    const directory = fileURLToPath(
      new URL('../../../packages/database/migrations/', import.meta.url),
    )
    for (const name of (await readdir(directory))
      .filter((name) => /^000[1-5].*\.sql$/.test(name))
      .sort())
      await legacy.exec(await readFile(`${directory}/${name}`, 'utf8'))
    await legacy.exec(`
      INSERT INTO profiles VALUES ('legacy','Legacy','Europe/Rome','2026-10-03T08:00:00Z');
      INSERT INTO connections VALUES ('legacy-connection','legacy','mock','synthetic','active','2026-10-03T08:00:00Z',NULL);
      INSERT INTO accounts VALUES ('legacy-account','legacy','legacy-connection','provider-account','Conto','Mock','current',0,'EUR','2026-10-03T08:00:00Z');
      INSERT INTO source_observations VALUES ('legacy-observation','legacy','legacy-connection','legacy-account','mock','source','booked','digest','2026-10-03T10:00:00+02:00','{"description":"synthetic legacy"}');
    `)
    await legacy.exec(await readFile(`${directory}/0006_observation_payload_retention.sql`, 'utf8'))
    const metadata = await legacy.query<Record<string, unknown>>(
      'SELECT * FROM source_observations',
    )
    expect(metadata.rows[0]).toMatchObject({
      id: 'legacy-observation',
      observed_at: '2026-10-03T10:00:00+02:00',
      content_hash: 'digest',
    })
    expect(metadata.rows[0]).not.toHaveProperty('payload')
    const content = await legacy.query<{ expires_at: Date; payload: Record<string, unknown> }>(
      'SELECT expires_at,payload FROM observation_payloads',
    )
    expect(content.rows[0]?.expires_at.toISOString()).toBe(expiry)
    expect(content.rows[0]?.payload).toEqual({ description: 'synthetic legacy' })
    await legacy.exec("DELETE FROM profiles WHERE id='legacy'")
    expect((await legacy.query<unknown>('SELECT * FROM observation_payloads')).rows).toEqual([])
  } finally {
    await legacy.close()
  }
})
