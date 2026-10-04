import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  MockItalianProvider,
  type ProviderContext,
  type ProviderTransaction,
  type SyntheticSyncPageRequest,
} from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  ConsentLifecycleService,
  recordConsentGranted,
  recordConsentRevoked,
} from '../src/consent-lifecycle.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { DEFAULT_RUNTIME_CONFIGURATION, DEFAULT_SYNC_CONFIGURATION } from '../src/runtime-config.js'
import { recordSourceFacts, SourceErasureService } from '../src/source-erasure.js'
import { createSourceErasureJournal } from '../src/source-erasure-journal.js'
import { assertSyncOwnershipReferences, syncOwnershipExport } from '../src/sync-export.js'
import {
  syncIdentities,
  syncIdentityAliases,
  syncIdentityEvents,
} from '../src/sync-identity-schema.js'
import { SyncCoordinator } from '../src/sync-jobs.js'
import { syncHash, syncRequired } from '../src/sync-provider.js'
import { syncStages } from '../src/sync-schema.js'

let handle: DatabaseHandle
const profiles: string[] = [],
  base = '2026-10-04T10:00:00.000Z'
const coffee = (id: string, extra: Partial<ProviderTransaction> = {}): ProviderTransaction => ({
  id,
  accountId: 'conto',
  amount: '-2.50',
  currency: 'EUR',
  description: 'CAFFE CENTRO',
  merchantName: 'Caffè Centro',
  status: 'booked',
  bookedOn: '2026-10-01',
  ...extra,
})
class Provider extends MockItalianProvider {
  noIds = false
  unknown = false
  onPage?: () => Promise<void>
  override async getSyncPage(context: ProviderContext, request: SyntheticSyncPageRequest) {
    await this.onPage?.()
    const page = await super.getSyncPage(context, request)
    return {
      ...page,
      coverage: this.unknown ? ('unknown' as const) : page.coverage,
      transactions: page.transactions.map((record) => ({
        ...record,
        id: this.noIds ? null : record.id,
      })),
    }
  }
}
beforeAll(async () => {
  handle = await openDatabase({ driver: 'pglite' })
})
afterAll(async () => {
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
})
async function fixture(records = [coffee('first')], noIds = false, pages = 100) {
  const profileId = `identity_profile_${randomUUID()}`,
    connectionId = `identity_connection_${randomUUID()}`,
    consentId = `identity_consent_${randomUUID()}`,
    provider = new Provider(records)
  profiles.push(profileId)
  provider.noIds = noIds
  await handle.db
    .insert(schema.profiles)
    .values({ id: profileId, name: 'Synthetic identity', timezone: 'Europe/Rome', createdAt: base })
  const grant = await provider.createConnection({ profileId, connectionId, grantId: consentId })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: provider.id,
    institutionId: 'synthetic-italian',
    status: 'active',
    createdAt: base,
  })
  await handle.db.insert(schema.consents).values({
    id: consentId,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: base,
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
      base,
    ),
  )
  const values = {
    ...DEFAULT_RUNTIME_CONFIGURATION,
    sync: { ...DEFAULT_SYNC_CONFIGURATION, pageSize: 1, maxPagesPerSlice: pages },
  }
  const configuration = {
    revision: 1,
    schemaVersion: 1 as const,
    values,
    digest: syncHash(values),
    previousRevision: null,
    rollbackRevision: null,
    action: 'bootstrap' as const,
    actor: 'bootstrap' as const,
    reason: 'initial_setup' as const,
    createdAt: base,
  }
  const coordinator = new SyncCoordinator({
    scope: handle.withProfile,
    profileId,
    provider,
    configuration,
    now: () => base,
  })
  const start = async (selected = coordinator, from = '2026-10-01') =>
    selected.start(connectionId, {
      requestId: randomUUID(),
      mode: 'user_present',
      from,
      to: '2026-10-04',
    })
  const run = async (selected = coordinator, from = '2026-10-01') => {
    const job = await start(selected, from)
    return selected.wait(job.id)
  }
  const rows = () =>
    handle.db.select().from(schema.transactions).where(eq(schema.transactions.profileId, profileId))
  const events = () =>
    handle.db.select().from(syncIdentityEvents).where(eq(syncIdentityEvents.profileId, profileId))
  const lifecycle = new ConsentLifecycleService(handle.db, profileId, provider, () => base)
  const renew = async () =>
    lifecycle.renew(connectionId, (await lifecycle.get(connectionId)).revision)
  return {
    profileId,
    connectionId,
    consentId,
    provider,
    records,
    coordinator,
    start,
    run,
    rows,
    events,
    renew,
  }
}

test('two no-ID identical coffees stay distinct through pagination, reorder and refetch without duplicating observations', async () => {
  const f = await fixture([coffee('hidden-a'), coffee('hidden-b')], true)
  expect((await f.run()).report.inserted).toBe(2)
  const original = await f.rows()
  expect(new Set(original.map((row) => row.id)).size).toBe(2)
  expect(original.reduce((sum, row) => sum + row.amountMinor, 0n)).toBe(-500n)
  f.records.reverse()
  const again = await f.run()
  expect(again.report).toMatchObject({
    inserted: 0,
    unchanged: 2,
    payloadRecords: 2,
    processedRecords: 2,
  })
  expect((await f.rows()).map((row) => row.id).sort()).toEqual(original.map((row) => row.id).sort())
  expect(await f.events()).toHaveLength(2)
  const observations = await handle.db
    .select()
    .from(schema.observations)
    .where(eq(schema.observations.profileId, f.profileId))
  expect(observations).toHaveLength(2)
  expect(observations.every((row) => row.providerRecordId.startsWith('no-id:v1:'))).toBe(true)
})
test('no-ID ordinals grow without collapsing new identical purchases; retained user correction stays on its canonical slot', async () => {
  const f = await fixture([coffee('hidden-a'), coffee('hidden-b')], true)
  await f.run()
  const first = syncRequired((await f.rows())[0])
  await handle.db.insert(schema.feedback).values({
    profileId: f.profileId,
    transactionId: first.id,
    categoryId: 'food_groceries',
    scope: 'once',
    createdAt: base,
  })
  f.records.push(coffee('hidden-c'))
  expect((await f.run()).report).toMatchObject({ inserted: 1, unchanged: 2 })
  expect(await f.rows()).toHaveLength(3)
  expect(
    await handle.db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, f.profileId)),
  ).toMatchObject([{ transactionId: first.id, categoryId: 'food_groceries' }])
})
test('actual in-place renewal ID churn preserves canonical IDs, exact money, private correction and immutable audit', async () => {
  const f = await fixture()
  await f.run()
  const original = syncRequired((await f.rows())[0])
  await handle.db.insert(schema.feedback).values({
    profileId: f.profileId,
    transactionId: original.id,
    categoryId: 'food_groceries',
    scope: 'once',
    createdAt: base,
  })
  const renewal = await f.renew()
  expect(renewal.consentId).toBe(f.consentId)
  f.records[0] = coffee('new-bank-id')
  expect((await f.run()).report).toMatchObject({ inserted: 0, updated: 0, unchanged: 1 })
  expect(await f.rows()).toMatchObject([
    { id: original.id, providerTransactionId: 'first', revision: 1, amountMinor: -250n },
  ])
  expect(await f.events()).toMatchObject([
    {
      kind: 'provider_id_changed',
      transactionId: original.id,
      providerRecordId: 'new-bank-id',
      renewalRevision: renewal.revision,
    },
  ])
  expect(
    (
      await handle.db
        .select()
        .from(schema.feedback)
        .where(eq(schema.feedback.profileId, f.profileId))
    )[0]?.transactionId,
  ).toBe(original.id)
  await f.run()
  expect(await f.events()).toHaveLength(1)
  await expect(
    handle.db
      .update(syncIdentityEvents)
      .set({ providerRecordId: 'tampered' })
      .where(eq(syncIdentityEvents.profileId, f.profileId)),
  ).rejects.toThrow()
})
test('a stable alias accepts later source updates without changing frozen identity or losing corrections', async () => {
  const f = await fixture()
  await f.run()
  await f.renew()
  f.records[0] = coffee('new-id')
  await f.run()
  const original = syncRequired((await f.rows())[0])
  f.records[0] = coffee('new-id', {
    description: 'CAFFE CENTRO DESCRIPTOR UPDATE',
    amount: '-3.00',
  })
  expect((await f.run()).report).toMatchObject({ inserted: 0, updated: 1 })
  expect(await f.rows()).toMatchObject([
    { id: original.id, providerTransactionId: 'first', amountMinor: -300n, revision: 2 },
  ])
  expect(await f.events()).toHaveLength(1)
})
test('same amount/date/merchant with distinct explicit IDs remains distinct without a renewal', async () => {
  const f = await fixture([coffee('one'), coffee('two')])
  expect((await f.run()).report.inserted).toBe(2)
  f.records.push(coffee('three'))
  expect((await f.run()).report).toMatchObject({ inserted: 1, unchanged: 2 })
  expect(await f.rows()).toHaveLength(3)
  expect(await f.events()).toHaveLength(0)
})
test('ambiguous renewal of two identical explicit coffees aborts atomically instead of guessing or duplicating', async () => {
  const f = await fixture([coffee('old-a'), coffee('old-b')])
  await f.run()
  const original = await f.rows()
  await f.renew()
  f.records.splice(0, 2, coffee('new-a'), coffee('new-b'))
  const result = await f.run()
  expect(result).toMatchObject({ state: 'failed', reason: 'invalid_provider_contract' })
  expect(await f.rows()).toEqual(original)
  expect(await f.events()).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(schema.observations)
      .where(eq(schema.observations.profileId, f.profileId)),
  ).toHaveLength(2)
})
test('duplicate explicit payload on renewal still aliases once and reports exact payload accounting', async () => {
  const f = await fixture()
  await f.run()
  await f.renew()
  f.records.splice(0, 1, coffee('new-id'), coffee('new-id'))
  const result = await f.run()
  expect(result.state).toBe('completed')
  expect(result.report).toMatchObject({
    inserted: 0,
    unchanged: 1,
    payloadRecords: 2,
    processedRecords: 2,
  })
  expect(result.report.outcomes.filter((row) => row.outcome === 'duplicate_payload')).toHaveLength(
    1,
  )
  expect(await f.rows()).toHaveLength(1)
  expect(await f.events()).toHaveLength(1)
})
test('no-ID fallback refuses unknown coverage and partial pages establish no ledger identity', async () => {
  const f = await fixture([coffee('hidden-a'), coffee('hidden-b')], true, 1)
  const job = await f.start()
  expect((await f.coordinator.run(job.id)).state).toBe('partial')
  expect(await f.rows()).toHaveLength(0)
  expect(await f.events()).toHaveLength(0)
  expect(
    await handle.db.select().from(syncIdentities).where(eq(syncIdentities.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db.select().from(syncStages).where(eq(syncStages.profileId, f.profileId)),
  ).toHaveLength(1)
  expect((await f.coordinator.wait(job.id)).state).toBe('completed')
  const unknown = await fixture([coffee('hidden')], true)
  unknown.provider.unknown = true
  expect(await unknown.run()).toMatchObject({
    state: 'failed',
    reason: 'invalid_provider_contract',
  })
  expect(await unknown.rows()).toHaveLength(0)
})
test('source fact proof failure rolls back canonical rows, aliases and identity audit together', async () => {
  const f = await fixture([coffee('hidden')], true)
  const failing = new SyncCoordinator({
    ...f.coordinator.options,
    recordSourceFacts: async () => {
      throw new Error('owned proof unavailable')
    },
  })
  const job = await f.start(failing)
  expect((await failing.run(job.id)).state).toBe('retry_wait')
  expect(await f.rows()).toHaveLength(0)
  expect(await f.events()).toHaveLength(0)
  expect(
    await handle.db.select().from(syncIdentities).where(eq(syncIdentities.profileId, f.profileId)),
  ).toHaveLength(0)
})
test('revocation during provider I/O fences every missing-ID identity and alias before financial commit', async () => {
  const f = await fixture([coffee('hidden')], true)
  let revoked = false
  f.provider.onPage = async () => {
    if (revoked) return
    revoked = true
    await handle.db.transaction((db) => recordConsentRevoked(db, f.profileId, f.connectionId, base))
  }
  expect(await f.run()).toMatchObject({ state: 'blocked', reason: 'consent_inactive' })
  expect(await f.rows()).toHaveLength(0)
  expect(await f.events()).toHaveLength(0)
})
test('identity hashes and ordinals are scoped by profile/account; another tenant cannot read evidence', async () => {
  const first = await fixture([coffee('a')], true),
    second = await fixture([coffee('a')], true)
  await first.run()
  await second.run()
  expect((await first.rows())[0]?.id).not.toBe((await second.rows())[0]?.id)
  await handle.withProfile(first.profileId, async (db) => {
    expect(
      await db.select().from(syncIdentities).where(eq(syncIdentities.profileId, second.profileId)),
    ).toEqual([])
    await expect(
      db.execute(
        sql`UPDATE sync_transaction_identities SET ordinal=20 WHERE profile_id=${first.profileId}`,
      ),
    ).rejects.toThrow()
  })
})
test('source erasure cascades alias/fingerprint/audit without touching another connection or respawning aliases', async () => {
  const f = await fixture(),
    other = await fixture([coffee('other')], true)
  await f.run()
  await f.renew()
  f.records[0] = coffee('new-id')
  await f.run()
  await other.run()
  const original = syncRequired((await f.rows())[0])
  await handle.withProfile(f.profileId, (db) =>
    db.delete(schema.transactions).where(eq(schema.transactions.id, original.id)),
  )
  expect(await f.events()).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(syncIdentityAliases)
      .where(eq(syncIdentityAliases.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db.select().from(syncIdentities).where(eq(syncIdentities.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(await other.events()).toHaveLength(1)
})
test('owned exports include immutable identity evidence and reject a forged source reference', async () => {
  const f = await fixture([coffee('hidden')], true)
  await f.run()
  const exported = await syncOwnershipExport(handle.db, f.profileId)
  expect(exported.identities).toHaveLength(1)
  expect(exported.identityEvents).toHaveLength(1)
  const scope = {
    profileId: f.profileId,
    exportedAt: base,
    connections: await handle.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.profileId, f.profileId)),
    consents: await handle.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.profileId, f.profileId)),
    accounts: await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, f.profileId)),
    transactions: (await f.rows()).map((row) => ({
      ...row,
      amount: { amountMinor: row.amountMinor, currency: row.currency },
    })),
  }
  expect(() => assertSyncOwnershipReferences(exported, scope)).not.toThrow()
  const forged = {
    ...exported,
    identityEvents: exported.identityEvents.map((row) => ({
      ...row,
      accountId: 'another-account',
    })),
  }
  expect(() => assertSyncOwnershipReferences(forged, scope)).toThrow('identity ownership')
})

test('a unique ID that disappears on actual renewal retains its canonical identity instead of duplicating', async () => {
  const f = await fixture()
  await f.run()
  const original = syncRequired((await f.rows())[0])
  await f.renew()
  f.provider.noIds = true
  expect((await f.run()).report).toMatchObject({ inserted: 0, unchanged: 1 })
  expect((await f.rows())[0]?.id).toBe(original.id)
  expect(await f.events()).toMatchObject([
    { kind: 'provider_id_changed', providerRecordId: null, transactionId: original.id },
  ])
  await f.run()
  expect(await f.rows()).toHaveLength(1)
  expect(await f.events()).toHaveLength(1)
})
test('an incomplete renewal snapshot cannot insert a second copy of a known fingerprint', async () => {
  const f = await fixture()
  await f.run()
  await f.renew()
  f.records[0] = coffee('changed-id')
  f.provider.unknown = true
  expect(await f.run()).toMatchObject({ state: 'failed', reason: 'invalid_provider_contract' })
  expect(await f.rows()).toHaveLength(1)
  expect(await f.events()).toHaveLength(0)
})
test('exact references distinguish equal coffees during ID churn and prevent amount/date-only conflation', async () => {
  const f = await fixture([
    coffee('a', { reference: 'purchase-a' }),
    coffee('b', { reference: 'purchase-b' }),
  ])
  await f.run()
  const original = await f.rows()
  await f.renew()
  f.records.splice(
    0,
    2,
    coffee('new-b', { reference: 'purchase-b' }),
    coffee('new-a', { reference: 'purchase-a' }),
  )
  expect((await f.run()).report).toMatchObject({ inserted: 0, unchanged: 2 })
  expect((await f.rows()).map((row) => row.id).sort()).toEqual(original.map((row) => row.id).sort())
  expect(await f.events()).toHaveLength(2)
})
test('a refund link resolves a renewed provider alias even when its original purchase is outside the fetch window', async () => {
  const f = await fixture()
  await f.run()
  await f.renew()
  f.records[0] = coffee('renewed-purchase')
  await f.run()
  const original = syncRequired((await f.rows())[0])
  f.records.push(
    coffee('refund', {
      amount: '2.50',
      description: 'RIMBORSO CAFFE',
      bookedOn: '2026-10-02',
      kind: 'refund',
      relatedTransactionId: 'renewed-purchase',
    }),
  )
  const result = await f.run(f.coordinator, '2026-10-02')
  expect(result.state).toBe('completed')
  expect(
    (await f.rows()).find((row) => row.providerTransactionId === 'refund')?.relatedTransactionId,
  ).toBe(original.id)
})
test('same-profile equal no-ID coffees on different accounts get independent ordinals and identities', async () => {
  const f = await fixture(
    [coffee('hidden-a'), coffee('hidden-b', { accountId: 'risparmio' })],
    true,
  )
  expect((await f.run()).report.inserted).toBe(2)
  const identities = await handle.db
    .select()
    .from(syncIdentities)
    .where(eq(syncIdentities.profileId, f.profileId))
  expect(identities.map((row) => row.ordinal)).toEqual([1, 1])
  expect(new Set(identities.map((row) => row.fingerprint)).size).toBe(2)
})

test('the signed source-erasure service removes encrypted no-ID identities and prevents sync resurrection', async () => {
  const f = await fixture([coffee('hidden')], true)
  const root = await mkdtemp(join(tmpdir(), 'lilleri-sync-identity-erasure-'))
  const keys = await createLocalSyntheticKeyManagement({
    directory: join(root, 'keys'),
    mode: 'demo',
  })
  const encryption = new ProfileEncryption(handle.db, keys, () => base)
  const journal = await createSourceErasureJournal({
    directory: join(root, 'journal'),
    anchorDirectory: join(root, 'keys'),
    keys,
    mode: 'demo',
  })
  try {
    const coordinator = new SyncCoordinator({
      ...f.coordinator.options,
      encryption,
      recordSourceFacts: (db, input, at) => recordSourceFacts(db, journal, input, at, encryption),
    })
    expect((await f.run(coordinator)).state).toBe('completed')
    expect((await f.rows())[0]?.description).toMatch(/^lilleri:v1:/)
    expect(await f.events()).toHaveLength(1)
    const result = await handle.withProfile(f.profileId, (db) =>
      new SourceErasureService(db, f.profileId, encryption, journal, () => base).erase(
        f.connectionId,
      ),
    )
    expect(result.signed.body.transactions).toHaveLength(1)
    expect(await f.rows()).toHaveLength(0)
    expect(await f.events()).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(syncIdentities)
        .where(eq(syncIdentities.profileId, f.profileId)),
    ).toHaveLength(0)
    await expect(f.run(coordinator)).rejects.toMatchObject({
      code: 'consent_inactive',
      status: 409,
    })
    expect(await f.rows()).toHaveLength(0)
    expect(await f.events()).toHaveLength(0)
  } finally {
    journal.close()
    await rm(root, { recursive: true, force: true })
  }
})
