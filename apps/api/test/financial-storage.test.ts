import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  type EncryptionContext,
  EncryptionFailure,
  type KeyManagementPort,
  ProfileEncryption,
} from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { profileEncryptionKeys, profileKeyTombstones } from '../src/encryption-schema.js'
import { upgradeFinancialEncryption } from '../src/financial-storage.js'
import { manualBalanceEvents } from '../src/manual-schema.js'
import { csvMappingEvents, savedCsvMappings } from '../src/mapped-import-schema.js'

type App = Awaited<ReturnType<typeof createApp>>
interface Snapshot {
  transactions: {
    id: string
    description: string
    revision: number
    amount: { amountMinor: string }
  }[]
  connections: { id: string; providerId: string }[]
  sourceObservations: { payload?: Record<string, unknown> }[]
  analysis: { classifications: { transactionId: string; categoryId: string; source: string }[] }
  manual: { balanceEvents: { id: string; reason: string }[] }
}
let handle: DatabaseHandle
let directory: string
let encryption: ProfileEncryption
const profiles: string[] = []
const apps: App[] = []
const now = () => '2026-10-03T12:00:00.000Z'
const privateText = 'Caffè sintetico riservato · € 2,50'

beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  directory = await mkdtemp(join(tmpdir(), 'lilleri-financial-vault-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createLocalSyntheticKeyManagement({ directory, mode: 'demo' }),
    now,
  )
})
afterAll(async () => {
  for (const app of apps) await app.close()
  if (handle) {
    for (const id of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.close()
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})
async function fixture(encrypted: boolean, seed = true, crypto = encryption) {
  const profileId = `financial_crypto_${randomUUID()}`
  profiles.push(profileId)
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    profileId,
    seed,
    now,
    ...(encrypted ? { encryption: crypto, financialScope: handle.withProfile } : {}),
  })
  apps.push(app)
  return { app, profileId }
}
async function exportSnapshot(app: App): Promise<Snapshot> {
  const response = await app.inject({ url: '/v1/export' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json<Snapshot>()
}
async function manualAccount(app: App) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/manual/accounts',
    payload: {
      requestId: randomUUID(),
      name: 'Contanti sintetici',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '10000',
      openingOn: '2026-10-01',
    },
  })
  expect(response.statusCode, response.payload).toBe(201)
  return response.json<{ id: string; revision: number; balanceMinor: string }>()
}
async function legacyMapping(app: App, accountId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/import-mappings',
    payload: {
      accountId,
      name: 'lilleri:v1:ordinary mapping name',
      mapping: {
        format: 'lilleri.csv-mapping.v1',
        delimiter: ';',
        numberLocale: 'it-IT',
        dateFormat: 'dd/MM/yyyy',
        defaultCurrency: 'EUR',
        columns: { bookedOn: 'Data', amount: 'Importo', description: 'Descrizione' },
      },
    },
  })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json<{ id: string; revision: number }>()
}

describe('encrypted financial storage with scoped HTTP and explicit legacy upgrade', () => {
  test('legacy prefix and JSON marker collisions remain legitimate plaintext through a lossless idempotent upgrade', async () => {
    const { app: legacy, profileId } = await fixture(false)
    const [transaction] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId))
    const [observation] = await handle.db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, profileId))
    if (!transaction || !observation) throw new Error('Synthetic migration fixture missing')
    const collisions = {
      description: 'lilleri:v1:ordinary pre-upgrade user text',
      merchantName: 'lilleri:v1:ordinary merchant text',
      reference: 'lilleri:v1:ordinary reference text',
    }
    await handle.db
      .update(schema.transactions)
      .set(collisions)
      .where(eq(schema.transactions.id, transaction.id))
    const legacyPayload = {
      ...observation.payload,
      _lilleriEncrypted: 'ordinary legacy JSON key',
      note: privateText,
    }
    await handle.db
      .update(schema.observationPayloads)
      .set({ payload: legacyPayload })
      .where(eq(schema.observationPayloads.observationId, observation.observationId))
    const account = await manualAccount(legacy)
    const adjustment = await legacy.inject({
      method: 'POST',
      url: `/v1/manual/accounts/${account.id}/adjust`,
      payload: {
        requestId: randomUUID(),
        revision: 1,
        balanceMinor: '10100',
        currency: 'EUR',
        reason: 'lilleri:v1:ordinary audit reason',
      },
    })
    expect(adjustment.statusCode, adjustment.payload).toBe(200)
    const mapping = await legacyMapping(legacy, account.id)
    const revisedMapping = await legacy.inject({
      method: 'PATCH',
      url: `/v1/import-mappings/${mapping.id}`,
      payload: { revision: mapping.revision, name: 'lilleri:v1:updated ordinary mapping name' },
    })
    expect(revisedMapping.statusCode, revisedMapping.payload).toBe(200)
    const before = await exportSnapshot(legacy)
    await legacy.close()
    const upgraded = await upgradeFinancialEncryption(handle.db, encryption)
    expect(upgraded.transactions).toBeGreaterThan(0)
    expect(upgraded.payloads).toBeGreaterThan(0)
    expect(upgraded.auditEvents).toBe(4)
    expect(await upgradeFinancialEncryption(handle.db, encryption)).toEqual({
      transactions: 0,
      payloads: 0,
      auditEvents: 0,
    })
    const encrypted = await createApp({
      db: handle.db,
      profileId,
      demoMode: true,
      seed: false,
      now,
      encryption,
      financialScope: handle.withProfile,
    })
    apps.push(encrypted)
    expect(await exportSnapshot(encrypted)).toEqual(before)
    const [stored] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, transaction.id))
    expect(stored?.description).not.toBe(collisions.description)
    const [storedPayload] = await handle.db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.observationId, observation.observationId))
    expect(Object.keys(storedPayload?.payload ?? {})).toEqual(['_lilleriEncrypted'])
    expect(JSON.stringify(storedPayload?.payload)).not.toContain(privateText)
    const [storedMapping] = await handle.db
      .select()
      .from(savedCsvMappings)
      .where(eq(savedCsvMappings.id, mapping.id))
    expect(storedMapping?.name).toMatch(/^lilleri:v1:/)
    expect(storedMapping?.name).not.toContain('ordinary mapping name')
    expect(Object.keys(storedMapping?.definition ?? {})).toEqual(['_lilleriEncrypted'])
    const storedMappingEvents = await handle.db
      .select()
      .from(csvMappingEvents)
      .where(eq(csvMappingEvents.mappingId, mapping.id))
    expect(storedMappingEvents).toHaveLength(2)
    for (const event of storedMappingEvents)
      expect(Object.keys(event.snapshot)).toEqual(['_lilleriEncrypted'])
  })

  test('a failed upgrade rolls back financial changes and re-enables immutable audit protection', async () => {
    const { app, profileId } = await fixture(false, false)
    const account = await manualAccount(app)
    const mapping = await legacyMapping(app, account.id)
    const beforeMapping = await handle.db
      .select()
      .from(savedCsvMappings)
      .where(eq(savedCsvMappings.id, mapping.id))
    const beforeMappingEvents = await handle.db
      .select()
      .from(csvMappingEvents)
      .where(eq(csvMappingEvents.mappingId, mapping.id))
    const before = await handle.db
      .select()
      .from(manualBalanceEvents)
      .where(eq(manualBalanceEvents.profileId, profileId))
    class FailingUpgrade extends ProfileEncryption {
      override async encryptText(
        db: Database,
        context: EncryptionContext,
        plain: string,
      ): Promise<string> {
        if (context.profileId === profileId && context.table === 'manual_balance_events')
          throw new EncryptionFailure()
        return super.encryptText(db, context, plain)
      }
    }
    const failing = new FailingUpgrade(handle.db, encryption.keys, now)
    await expect(upgradeFinancialEncryption(handle.db, failing)).rejects.toThrow(EncryptionFailure)
    expect(
      await handle.db
        .select()
        .from(manualBalanceEvents)
        .where(eq(manualBalanceEvents.profileId, profileId)),
    ).toEqual(before)
    expect(
      await handle.db.select().from(savedCsvMappings).where(eq(savedCsvMappings.id, mapping.id)),
    ).toEqual(beforeMapping)
    expect(
      await handle.db
        .select()
        .from(csvMappingEvents)
        .where(eq(csvMappingEvents.mappingId, mapping.id)),
    ).toEqual(beforeMappingEvents)
    await expect(
      handle.db
        .update(csvMappingEvents)
        .set({ createdAt: '2026-10-04T12:00:00.000Z' })
        .where(eq(csvMappingEvents.mappingId, mapping.id)),
    ).rejects.toThrow()
    await expect(
      handle.db
        .update(manualBalanceEvents)
        .set({ reason: 'forbidden audit change' })
        .where(eq(manualBalanceEvents.profileId, profileId)),
    ).rejects.toThrow()
    expect(
      await handle.db
        .select()
        .from(profileEncryptionKeys)
        .where(eq(profileEncryptionKeys.profileId, profileId)),
    ).toHaveLength(0)
    await upgradeFinancialEncryption(handle.db, encryption)
  })

  test('fresh scoped encrypted HTTP reads, pages, sync replay and ZIP return plaintext without changing financial facts', async () => {
    const { app, profileId } = await fixture(true)
    const before = await exportSnapshot(app)
    expect(before.transactions).toHaveLength(35)
    const raw = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId))
    expect(raw.every((row) => row.description.startsWith('lilleri:v1:'))).toBe(true)
    expect(
      raw.some(
        (row) =>
          row.description === before.transactions.find((value) => value.id === row.id)?.description,
      ),
    ).toBe(false)
    const payloads = await handle.db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, profileId))
    expect(
      payloads.every((row) => Object.keys(row.payload).join(',') === '_lilleriEncrypted'),
    ).toBe(true)
    const page = await app.inject({ url: '/v1/transactions?limit=5' })
    expect(page.statusCode, page.payload).toBe(200)
    for (const row of page.json().items) expect(row.description).not.toMatch(/^lilleri:v1:/)
    const connection =
      before.connections.find((row) => row.providerId === 'mock-italia') ?? before.connections[0]
    if (!connection) throw new Error('Synthetic connection missing')
    const replay = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connection.id}/sync`,
      payload: {},
    })
    expect(replay.statusCode, replay.payload).toBe(200)
    expect(replay.json()).toMatchObject({ inserted: 0, updated: 0, unchanged: 35, rejected: 0 })
    expect((await exportSnapshot(app)).transactions).toEqual(before.transactions)
    const archive = await app.inject({ url: '/v1/export/archive' })
    expect(archive.statusCode, archive.payload.slice(0, 200)).toBe(200)
    const files = unzipSync(archive.rawPayload)
    expect(Object.keys(files)).toHaveLength(11)
    expect(JSON.parse(strFromU8(files['data.json'] as Uint8Array)).transactions).toEqual(
      before.transactions,
    )
    expect(strFromU8(files['data.json'] as Uint8Array)).not.toContain('lilleri-dek:v1:')
  })

  test('encrypted manual entry, description rules, CSV import, reversal and audit/export keep their expected behavior', async () => {
    const { app, profileId } = await fixture(true, false)
    const account = await manualAccount(app)
    const saved = await app.inject({
      method: 'POST',
      url: '/v1/manual/transactions',
      payload: {
        requestId: randomUUID(),
        accountId: account.id,
        amountMinor: '-250',
        currency: 'EUR',
        bookedOn: '2026-10-03',
        kind: 'expense',
        description: privateText,
        merchantName: 'Esercente sintetico privato',
        reference: 'Riferimento privato',
      },
    })
    expect(saved.statusCode, saved.payload).toBe(201)
    const entry = saved.json()
    const rule = await app.inject({
      method: 'POST',
      url: '/v1/rules',
      payload: {
        name: 'Regola sintetica',
        conditions: { description: { operator: 'contains', value: 'Caffè sintetico' } },
        categoryId: 'food',
        priority: 10,
      },
    })
    expect(rule.statusCode, rule.payload).toBe(201)
    const preview = await app.inject({
      method: 'POST',
      url: `/v1/rules/${rule.json().id}/preview`,
      payload: {},
    })
    expect(preview.statusCode, preview.payload).toBe(200)
    expect(preview.json().affectedTransactionIds).toEqual([entry.transactionId])
    const applied = await app.inject({
      method: 'POST',
      url: `/v1/rules/${rule.json().id}/apply`,
      payload: { revision: 1, previewRevision: preview.json().previewRevision },
    })
    expect(applied.statusCode, applied.payload).toBe(200)
    expect((await exportSnapshot(app)).analysis.classifications).toContainEqual(
      expect.objectContaining({
        transactionId: entry.transactionId,
        categoryId: 'food',
        source: 'rule',
      }),
    )
    const reverse = await app.inject({
      method: 'POST',
      url: `/v1/manual/transactions/${entry.transactionId}/reverse`,
      payload: {
        requestId: randomUUID(),
        revision: entry.transactionRevision,
        accountRevision: entry.accountRevision,
        reason: 'Errore sintetico riservato',
      },
    })
    expect(reverse.statusCode, reverse.payload).toBe(200)
    const content =
      'id,date,amount,currency,description,merchant,reference\none,2026-10-03,-1.25,EUR,Spesa CSV privata,Negozio CSV privato,Riferimento CSV privato'
    const imported = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: { accountId: account.id, csv: content },
    })
    expect(imported.statusCode, imported.payload).toBe(200)
    expect(imported.json()).toMatchObject({ inserted: 1, unchanged: 0 })
    const repeated = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: { accountId: account.id, csv: content },
    })
    expect(repeated.statusCode, repeated.payload).toBe(200)
    expect(repeated.json()).toMatchObject({ inserted: 0, unchanged: 1 })
    const exported = await exportSnapshot(app)
    expect(exported.transactions.map((row) => row.description)).toContain(privateText)
    expect(exported.transactions.map((row) => row.description)).toContain('Spesa CSV privata')
    expect(exported.manual.balanceEvents.map((row) => row.reason)).toContain(
      'Errore sintetico riservato',
    )
    const storedEvents = await handle.db
      .select()
      .from(manualBalanceEvents)
      .where(eq(manualBalanceEvents.profileId, profileId))
    expect(storedEvents.every((row) => row.reason.startsWith('lilleri:v1:'))).toBe(true)
    const raw = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId))
    expect(raw.every((row) => row.description.startsWith('lilleri:v1:'))).toBe(true)
    expect(
      JSON.stringify(raw, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
    ).not.toContain(privateText)
  })

  test('a transplanted stored ciphertext fails the HTTP read without exposing ciphertext or financial text', async () => {
    const { app, profileId } = await fixture(true)
    const rows = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId))
    const [first, second] = rows
    if (!first || !second) throw new Error('Synthetic corruption fixture missing')
    await handle.db
      .update(schema.transactions)
      .set({ description: second.description })
      .where(eq(schema.transactions.id, first.id))
    try {
      const response = await app.inject({ url: '/v1/demo' })
      expect(response.statusCode).toBe(500)
      expect(response.payload).not.toContain(first.description)
      expect(response.payload).not.toContain(second.description)
      expect(response.payload).not.toContain('lilleri:v1:')
      await expect(upgradeFinancialEncryption(handle.db, encryption)).rejects.toThrow(
        EncryptionFailure,
      )
    } finally {
      await handle.db
        .update(schema.transactions)
        .set({ description: first.description })
        .where(eq(schema.transactions.id, first.id))
    }
  })

  test('scoped HTTP deletion commits the financial cascade before independent key destruction and completed evidence', async () => {
    const { app, profileId } = await fixture(true)
    const [backup] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, profileId))
    if (!backup) throw new Error('Synthetic erasure fixture missing')
    const response = await app.inject({ method: 'DELETE', url: '/v1/profile' })
    expect(response.statusCode, response.payload).toBe(204)
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(profileEncryptionKeys)
        .where(eq(profileEncryptionKeys.profileId, profileId)),
    ).toHaveLength(0)
    const [tombstone] = await handle.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, profileId))
    expect(tombstone).toMatchObject({
      profileId,
      keyId: backup.keyId,
      stagedAt: now(),
      destroyedAt: now(),
    })
    await expect(
      encryption.keys.unwrap(profileId, backup.keyId, backup.wrappedKey),
    ).rejects.toThrow(EncryptionFailure)
    expect((await app.inject({ url: '/v1/demo' })).statusCode).toBe(404)
  })

  test('the after-commit deletion certificate reports actual key completion and outstanding provider work', async () => {
    const { app, profileId } = await fixture(true)
    const response = await app.inject({ method: 'POST', url: '/v1/profile/deletion', payload: {} })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json()).toMatchObject({
      format: 'lilleri.deletion-certificate.v1',
      localFinancialDeletion: 'completed',
      keyErasure: 'destroyed_local_adapter',
      providerRevocations: { completed: 0, outstanding: 1, failed: 0 },
      backupPolicy: 'latest-authenticated-journal-replay-required',
      externalProcessors: 'not_verified',
    })
    expect(response.payload).not.toContain(profileId)
    expect(response.payload).not.toContain('wrappedKey')
    const [tombstone] = await handle.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, profileId))
    expect(tombstone?.destroyedAt).toBe(now())
  })

  test('key-provider outage leaves committed financial erasure and an honest pending certificate for retry', async () => {
    const failingKeys: KeyManagementPort = {
      kind: 'local-synthetic',
      create: (id, key) => encryption.keys.create(id, key),
      unwrap: (id, keyId, wrapped) => encryption.keys.unwrap(id, keyId, wrapped),
      discardCandidate: (id, keyId) => encryption.keys.discardCandidate(id, keyId),
      destroyProfile: async () => {
        throw new EncryptionFailure()
      },
    }
    const failedEncryption = new ProfileEncryption(handle.db, failingKeys, now)
    const { app, profileId } = await fixture(true, true, failedEncryption)
    const response = await app.inject({ method: 'POST', url: '/v1/profile/deletion', payload: {} })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json()).toMatchObject({
      localFinancialDeletion: 'completed',
      keyErasure: 'pending',
    })
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId)),
    ).toHaveLength(0)
    const [pending] = await handle.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, profileId))
    expect(pending?.destroyedAt).toBeNull()
    await encryption.finalizeErasure(profileId)
    const [completed] = await handle.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, profileId))
    expect(completed?.destroyedAt).toBe(now())
  })
})
