import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  MockItalianProvider,
  normalizeTransaction,
  type ProviderContext,
  type ProviderFxEvidence,
  type SyntheticSyncPageRequest,
} from '@lilleri/financial-providers'
import { and, eq, sql } from 'drizzle-orm'
import Fastify, { type FastifyRequest } from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { recordConsentGranted } from '../src/consent-lifecycle.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import {
  exportFxEvidence,
  FxEvidenceService,
  normalizeFxEvidence,
  recordFxEvidence,
  registerFxEvidenceRoutes,
} from '../src/fx-evidence.js'
import { assertFxOwnershipReferences } from '../src/fx-evidence-export.js'
import { fxEvidenceEvents } from '../src/fx-evidence-schema.js'
import { Problem } from '../src/problem.js'
import { cleanupExpiredObservationPayloads, insertSourceObservation } from '../src/retention.js'
import { DEFAULT_RUNTIME_CONFIGURATION } from '../src/runtime-config.js'
import { SyncCoordinator } from '../src/sync-jobs.js'
import { syncHash } from '../src/sync-provider.js'

let handle: DatabaseHandle, encryption: ProfileEncryption, directory: string
const profiles: string[] = [],
  at = '2026-10-04T10:00:00.000Z'
const complete: ProviderFxEvidence = {
  version: 'provider-fx-v1',
  original: { amount: '-10.00', currency: 'USD' },
  billed: { amount: '-9.20', currency: 'EUR' },
  rate: {
    decimal: '0.920000000000000000000000001',
    baseCurrency: 'USD',
    quoteCurrency: 'EUR',
    date: '2026-10-01',
  },
  sourceReference: 'synthetic-card-fx-statement-1',
}
const required = <T>(value: T | null | undefined): T => {
  if (value === undefined || value === null) throw new Error('Synthetic FX fixture unavailable')
  return value
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  directory = await mkdtemp(join(tmpdir(), 'lilleri-fx-encrypted-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createLocalSyntheticKeyManagement({ directory, mode: 'demo' }),
    () => at,
  )
})
afterAll(async () => {
  if (handle) {
    for (const id of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.close()
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})
async function fixture() {
  const profileId = `fx_profile_${randomUUID()}`,
    connectionId = `fx_connection_${randomUUID()}`
  profiles.push(profileId)
  await handle.db
    .insert(schema.profiles)
    .values({ id: profileId, name: 'Synthetic FX', timezone: 'Europe/Rome', createdAt: at })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: 'synthetic-fx',
    institutionId: 'synthetic-italian',
    status: 'active',
    createdAt: at,
  })
  const transaction = normalizeTransaction(
    'synthetic-fx',
    { profileId, connectionId },
    {
      id: 'foreign-card',
      accountId: 'card',
      amount: '-9.20',
      currency: 'EUR',
      description: 'SYNTHETIC USD CARD PURCHASE',
      status: 'booked',
      bookedOn: '2026-10-01',
    },
    at,
  )
  await handle.db.insert(schema.accounts).values({
    id: transaction.accountId,
    profileId,
    connectionId,
    providerAccountId: 'card',
    name: 'Synthetic EUR card',
    institutionName: 'Synthetic institution',
    kind: 'card',
    balanceMinor: 1000n,
    currency: 'EUR',
    balanceUpdatedAt: at,
  })
  const { amount, ...rest } = transaction
  await handle.db.insert(schema.transactions).values({
    ...rest,
    amountMinor: amount.amountMinor,
    currency: amount.currency,
    contentHash: 'a'.repeat(64),
  })
  return {
    profileId,
    connectionId,
    transactionId: transaction.id,
    accountId: transaction.accountId,
  }
}
async function capture(
  owner: Awaited<ReturnType<typeof fixture>>,
  evidence: ProviderFxEvidence | undefined = complete,
  observedAt = at,
  observationId?: string,
) {
  return handle.withProfile(owner.profileId, (db) =>
    recordFxEvidence(
      db,
      owner.profileId,
      {
        transactionId: owner.transactionId,
        providerId: 'synthetic-fx',
        observedAt,
        ...(evidence === undefined ? {} : { evidence }),
        ...(observationId ? { observationId } : {}),
      },
      encryption,
    ),
  )
}
const read = (owner: Awaited<ReturnType<typeof fixture>>, before?: number) =>
  handle.withProfile(owner.profileId, (db) =>
    new FxEvidenceService(db, owner.profileId, encryption).get(owner.transactionId, before),
  )

test('original currency exponents and arbitrarily precise rates remain literal, with no inferred conversions', () => {
  const value = normalizeFxEvidence(
    {
      ...complete,
      original: { amount: '-123', currency: 'JPY' },
      billed: { amount: '-1.234', currency: 'KWD' },
      rate: {
        decimal: '0.0100325203252032520325203',
        baseCurrency: 'JPY',
        quoteCurrency: 'KWD',
        date: '2026-10-01',
      },
    },
    { amountMinor: '-1234', currency: 'KWD' },
    at,
  )
  expect(value.original).toEqual({ amountMinor: '-123', currency: 'JPY' })
  expect(value.billed).toEqual({ amountMinor: '-1234', currency: 'KWD' })
  expect(value.rate?.decimal).toBe('0.0100325203252032520325203')
  expect(value.state).toBe('complete')
  const huge = normalizeFxEvidence(
    { ...complete, original: { amount: '-9007199254740993.01', currency: 'USD' } },
    { amountMinor: '-920', currency: 'EUR' },
    at,
  )
  expect(huge.original?.amountMinor).toBe('-900719925474099301')
})
test('missing and partial source evidence stays unknown, and contradictory source data is retained as conflict', () => {
  const ledger = { amountMinor: '-920', currency: 'EUR' }
  expect(normalizeFxEvidence(undefined, ledger, at).state).toBe('unknown')
  const partial = normalizeFxEvidence(
    { ...complete, rate: null, sourceReference: null },
    ledger,
    at,
  )
  expect(partial.state).toBe('partial')
  expect(partial.rate).toBeNull()
  expect(partial.issues).toContain('missing_rate')
  const conflict = normalizeFxEvidence(
    {
      ...complete,
      billed: { amount: '9.21', currency: 'EUR' },
      rate: { ...required(complete.rate), baseCurrency: 'GBP', date: '2026-11-01' },
    },
    ledger,
    at,
  )
  expect(conflict.state).toBe('conflict')
  expect(conflict.issues).toEqual(
    expect.arrayContaining([
      'billed_ledger_mismatch',
      'rate_pair_mismatch',
      'amount_direction_mismatch',
      'future_rate_date',
    ]),
  )
  expect(() =>
    normalizeFxEvidence(
      { ...complete, original: { amount: -10 as unknown as string, currency: 'USD' } },
      ledger,
      at,
    ),
  ).toThrow()
  expect(() =>
    normalizeFxEvidence(
      { ...complete, rate: { ...required(complete.rate), decimal: '1e-2' } },
      ledger,
      at,
    ),
  ).toThrow()
  expect(() =>
    normalizeFxEvidence(
      { ...complete, original: { amount: '-1.001', currency: 'EUR' } },
      ledger,
      at,
    ),
  ).toThrow()
})
test('encrypted durable versions survive raw TTL cleanup, deduplicate retries and preserve the ledger', async () => {
  const owner = await fixture(),
    observationId = `fx_observation_${randomUUID()}`
  await handle.withProfile(owner.profileId, (db) =>
    insertSourceObservation(
      db,
      {
        id: observationId,
        profileId: owner.profileId,
        connectionId: owner.connectionId,
        accountId: owner.accountId,
        providerId: 'synthetic-fx',
        providerRecordId: 'foreign-card',
        status: 'booked',
        contentHash: 'b'.repeat(64),
        observedAt: at,
      },
      { fxEvidence: complete },
      encryption,
    ),
  )
  expect(await capture(owner, complete, at, observationId)).toBe(true)
  expect(await capture(owner, complete, '2026-10-05T10:00:00Z', observationId)).toBe(false)
  const stored = await handle.db
    .select()
    .from(fxEvidenceEvents)
    .where(eq(fxEvidenceEvents.profileId, owner.profileId))
  expect(stored).toHaveLength(1)
  expect(stored[0]?.payload).toMatch(/^lilleri:v1:/u)
  expect(JSON.stringify(stored)).not.toContain(complete.sourceReference)
  expect(JSON.stringify(stored)).not.toContain(complete.rate?.decimal)
  await handle.withProfile(owner.profileId, (db) =>
    cleanupExpiredObservationPayloads(db, owner.profileId, '2026-12-01T00:00:00Z'),
  )
  expect(
    await handle.db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, owner.profileId)),
  ).toHaveLength(0)
  const exported = await handle.withProfile(owner.profileId, (db) =>
    exportFxEvidence(db, owner.profileId, encryption),
  )
  expect(exported).toHaveLength(1)
  expect(exported[0]).toMatchObject({
    original: { amountMinor: '-1000', currency: 'USD' },
    billed: { amountMinor: '-920', currency: 'EUR' },
    sourceReference: complete.sourceReference,
    observationId,
  })
  await capture(
    owner,
    { ...complete, rate: { ...required(complete.rate), decimal: '0.92' } },
    '2026-10-06T10:00:00Z',
  )
  const result = await read(owner)
  expect(result.history.map((event) => event.revision)).toEqual([2, 1])
  expect(result.history[1]?.rate?.decimal).toBe(complete.rate?.decimal)
  expect(
    (
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.id, owner.transactionId))
    )[0],
  ).toMatchObject({ amountMinor: -920n, currency: 'EUR', revision: 1, contentHash: 'a'.repeat(64) })
  await expect(
    capture(owner, { ...complete, sourceReference: 'older' }, '2026-10-01T10:00:00Z'),
  ).rejects.toMatchObject({ status: 409 })
})
test('an unavailable later source field is a new unknown version, retaining earlier evidence', async () => {
  const owner = await fixture()
  await capture(owner)
  await handle.withProfile(owner.profileId, (db) =>
    recordFxEvidence(
      db,
      owner.profileId,
      {
        transactionId: owner.transactionId,
        providerId: 'synthetic-fx',
        observedAt: '2026-10-05T10:00:00Z',
      },
      encryption,
    ),
  )
  const result = await read(owner)
  expect(result.state).toBe('unknown')
  expect(result.current?.original).toBeNull()
  expect(result.history[1]?.state).toBe('complete')
  await expect(
    handle.withProfile(owner.profileId, (db) =>
      recordFxEvidence(db, owner.profileId, {
        transactionId: owner.transactionId,
        providerId: 'synthetic-fx',
        observedAt: at,
        evidence: complete,
      }),
    ),
  ).rejects.toMatchObject({ code: 'encryption_unavailable' })
})
test('ownership provenance validation rejects foreign source references and missing correction versions', async () => {
  const owner = await fixture()
  await capture(owner)
  const events = await handle.withProfile(owner.profileId, (db) =>
    exportFxEvidence(db, owner.profileId, encryption),
  )
  const scope = {
    profileId: owner.profileId,
    exportedAt: at,
    accounts: [{ id: owner.accountId, connectionId: owner.connectionId }],
    transactions: [
      {
        id: owner.transactionId,
        accountId: owner.accountId,
        connectionId: owner.connectionId,
        providerId: 'synthetic-fx',
      },
    ],
    sourceObservations: [],
    jobs: [],
  }
  expect(() => assertFxOwnershipReferences(events, scope)).not.toThrow()
  expect(() =>
    assertFxOwnershipReferences(events, { ...scope, profileId: 'another-profile' }),
  ).toThrow()
  expect(() =>
    assertFxOwnershipReferences(
      events.map((event) => ({ ...event, observationId: 'unowned-observation' })),
      scope,
    ),
  ).toThrow()
  expect(() =>
    assertFxOwnershipReferences(
      events.map((event) => ({ ...event, revision: 2 })),
      scope,
    ),
  ).toThrow()
  expect(() =>
    assertFxOwnershipReferences(events, { ...scope, exportedAt: '2026-10-01T00:00:00Z' }),
  ).toThrow()
})
test('RLS and HTTP reject cross-profile access, and evidence cannot be rewritten or directly removed', async () => {
  const owner = await fixture(),
    stranger = await fixture()
  await capture(owner)
  await handle.withProfile(stranger.profileId, async (db) => {
    expect(await db.select().from(fxEvidenceEvents)).toHaveLength(0)
    await expect(
      new FxEvidenceService(db, stranger.profileId, encryption).get(owner.transactionId),
    ).rejects.toMatchObject({ status: 404 })
  })
  await expect(
    handle.db
      .update(fxEvidenceEvents)
      .set({ observedAt: '2026-10-05T00:00:00Z' })
      .where(eq(fxEvidenceEvents.profileId, owner.profileId)),
  ).rejects.toThrow()
  await expect(
    handle.db.delete(fxEvidenceEvents).where(eq(fxEvidenceEvents.profileId, owner.profileId)),
  ).rejects.toThrow()
  const app = Fastify(),
    requestDb = new WeakMap<FastifyRequest, Database>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler((cause, _request, reply) =>
    reply
      .code(cause instanceof Problem ? cause.status : 500)
      .send({ code: cause instanceof Problem ? cause.code : 'failure' }),
  )
  app.addHook('onRoute', (route) => {
    const original = route.handler
    route.handler = (request, reply) =>
      handle.withProfile(stranger.profileId, async (db) => {
        requestDb.set(request, db)
        return original.call(app, request, reply)
      })
  })
  registerFxEvidenceRoutes(
    app,
    async (request) =>
      new FxEvidenceService(required(requestDb.get(request)), stranger.profileId, encryption),
  )
  const missing = await app.inject({ url: `/v1/transactions/${owner.transactionId}/fx-evidence` })
  expect(missing.statusCode).toBe(404)
  const empty = await app.inject({ url: `/v1/transactions/${stranger.transactionId}/fx-evidence` })
  expect(empty.statusCode).toBe(200)
  expect(empty.json()).toMatchObject({ state: 'unknown', current: null, history: [] })
  await app.close()
})
test('source-account erasure removes encrypted evidence without another profile losing data', async () => {
  const owner = await fixture(),
    retained = await fixture()
  await capture(owner)
  await capture(retained)
  await handle.db
    .delete(schema.accounts)
    .where(
      and(eq(schema.accounts.profileId, owner.profileId), eq(schema.accounts.id, owner.accountId)),
    )
  expect(
    await handle.db
      .select()
      .from(fxEvidenceEvents)
      .where(eq(fxEvidenceEvents.profileId, owner.profileId)),
  ).toHaveLength(0)
  expect((await read(retained)).current?.state).toBe('complete')
})
test('paginated history keeps current evidence separate from older source versions', async () => {
  const owner = await fixture()
  await handle.withProfile(owner.profileId, async (db) => {
    for (let index = 1; index <= 52; index++)
      await recordFxEvidence(
        db,
        owner.profileId,
        {
          transactionId: owner.transactionId,
          providerId: 'synthetic-fx',
          observedAt: at,
          evidence: { ...complete, sourceReference: `synthetic-correction-${index}` },
        },
        encryption,
      )
  })
  const first = await read(owner)
  expect(first.current?.revision).toBe(52)
  expect(first.history).toHaveLength(50)
  expect(first.nextBeforeRevision).toBe(3)
  const second = await read(owner, required(first.nextBeforeRevision))
  expect(second.current?.revision).toBe(52)
  expect(second.history.map((event) => event.revision)).toEqual([2, 1])
  expect(second.nextBeforeRevision).toBeNull()
  const table = await handle.db.execute(
    sql`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='transaction_fx_evidence'`,
  )
  expect(JSON.stringify(table)).toContain('"relforcerowsecurity":true')
})

class FxProvider extends MockItalianProvider {
  evidence: ProviderFxEvidence = complete
  contradictoryDuplicate = false
  override async getSyncPage(context: ProviderContext, request: SyntheticSyncPageRequest) {
    const page = await super.getSyncPage(context, request)
    const records = page.transactions.map((raw) => ({ ...raw, fxEvidence: this.evidence }))
    return {
      ...page,
      transactions:
        this.contradictoryDuplicate && records.length
          ? [
              ...records,
              {
                ...required(records[0]),
                fxEvidence: { ...this.evidence, sourceReference: 'contradictory-same-provider-id' },
              },
            ]
          : records,
    }
  }
}
async function syncFixture() {
  const profileId = `fx_sync_profile_${randomUUID()}`,
    connectionId = `fx_sync_connection_${randomUUID()}`,
    consentId = `fx_sync_consent_${randomUUID()}`
  profiles.push(profileId)
  const provider = new FxProvider([
    {
      id: 'card-provider-identity',
      accountId: 'conto',
      amount: '-9.20',
      currency: 'EUR',
      description: 'SYNTHETIC USD CARD',
      status: 'booked',
      bookedOn: '2026-10-01',
    },
  ])
  await handle.db
    .insert(schema.profiles)
    .values({ id: profileId, name: 'Synthetic FX sync', timezone: 'Europe/Rome', createdAt: at })
  const grant = await provider.createConnection({ profileId, connectionId, grantId: consentId })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: provider.id,
    institutionId: 'synthetic-italian',
    status: 'active',
    createdAt: at,
  })
  await handle.db.insert(schema.consents).values({
    id: consentId,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: at,
    expiresAt: grant.consentExpiresAt,
    provider: provider.id,
  })
  await handle.db.transaction((db) =>
    recordConsentGranted(
      db,
      profileId,
      connectionId,
      consentId,
      { discovery: provider.discoveryMetadata(), authorization: grant.authorization },
      at,
    ),
  )
  const configuration = {
    revision: 1,
    schemaVersion: 1 as const,
    values: DEFAULT_RUNTIME_CONFIGURATION,
    digest: syncHash(DEFAULT_RUNTIME_CONFIGURATION),
    previousRevision: null,
    rollbackRevision: null,
    action: 'bootstrap' as const,
    actor: 'bootstrap' as const,
    reason: 'initial_setup' as const,
    createdAt: at,
  }
  const coordinator = new SyncCoordinator({
    scope: handle.withProfile,
    profileId,
    provider,
    configuration,
    now: () => at,
    encryption,
  })
  const run = async () => {
    const job = await coordinator.start(connectionId, {
      requestId: randomUUID(),
      mode: 'user_present',
      from: '2026-10-01',
      to: '2026-10-04',
    })
    return coordinator.wait(job.id)
  }
  return { profileId, connectionId, provider, run }
}
test('completed sync jobs atomically retain provider FX and later source corrections without changing canonical money', async () => {
  const f = await syncFixture()
  const first = await f.run()
  expect(first).toMatchObject({ state: 'completed', report: { inserted: 1 } })
  const events = () =>
    handle.withProfile(f.profileId, (db) => exportFxEvidence(db, f.profileId, encryption))
  expect(await events()).toEqual([
    expect.objectContaining({
      state: 'complete',
      original: { amountMinor: '-1000', currency: 'USD' },
      billed: { amountMinor: '-920', currency: 'EUR' },
      jobId: first.id,
    }),
  ])
  f.provider.evidence = {
    ...complete,
    sourceReference: 'synthetic-corrected-statement',
    billed: { amount: '-9.21', currency: 'EUR' },
  }
  const second = await f.run()
  expect(second).toMatchObject({ state: 'completed', report: { unchanged: 1 } })
  expect((await events()).map((event) => event.state)).toEqual(['complete', 'conflict'])
  const transactions = await handle.db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.profileId, f.profileId))
  expect(transactions).toHaveLength(1)
  expect(transactions[0]).toMatchObject({ amountMinor: -920n, currency: 'EUR', revision: 1 })
  expect((await events())[1]?.transactionId).toBe(transactions[0]?.id)
})
test('contradictory duplicate FX in one snapshot rolls back accounts, observations, ledger and provenance together', async () => {
  const f = await syncFixture()
  f.provider.contradictoryDuplicate = true
  expect(await f.run()).toMatchObject({
    state: 'failed',
    reason: 'invalid_provider_contract',
  })
  expect(
    await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(schema.observations)
      .where(eq(schema.observations.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(fxEvidenceEvents)
      .where(eq(fxEvidenceEvents.profileId, f.profileId)),
  ).toHaveLength(0)
})
test('profile erasure removes only that profile and retained-account source erasure supports observation-first deletion', async () => {
  const removed = await fixture(),
    retained = await fixture()
  await capture(removed)
  await capture(retained)
  await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, removed.profileId))
  expect(
    await handle.db
      .select()
      .from(fxEvidenceEvents)
      .where(eq(fxEvidenceEvents.profileId, removed.profileId)),
  ).toHaveLength(0)
  expect((await read(retained)).current?.state).toBe('complete')
  const observationId = `fx_retained_observation_${randomUUID()}`
  await handle.withProfile(retained.profileId, (db) =>
    insertSourceObservation(
      db,
      {
        id: observationId,
        profileId: retained.profileId,
        connectionId: retained.connectionId,
        accountId: retained.accountId,
        providerId: 'synthetic-fx',
        providerRecordId: 'foreign-card',
        status: 'booked',
        contentHash: 'c'.repeat(64),
        observedAt: at,
      },
      { fxEvidence: complete },
      encryption,
    ),
  )
  await capture(
    retained,
    { ...complete, sourceReference: 'synthetic-observation-linked' },
    at,
    observationId,
  )
  await handle.db.transaction(async (db) => {
    await db.delete(schema.observations).where(eq(schema.observations.id, observationId))
    await db.delete(schema.transactions).where(eq(schema.transactions.id, retained.transactionId))
  })
  expect(
    await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, retained.accountId)),
  ).toHaveLength(1)
  expect(
    await handle.db
      .select()
      .from(fxEvidenceEvents)
      .where(eq(fxEvidenceEvents.profileId, retained.profileId)),
  ).toHaveLength(0)
})
