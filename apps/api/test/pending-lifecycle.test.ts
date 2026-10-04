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
import { and, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { ConsentLifecycleService, recordConsentGranted } from '../src/consent-lifecycle.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { MerchantTaxonomyService } from '../src/merchant-taxonomy.js'
import { validateMerchantTaxonomyExport } from '../src/merchant-taxonomy-export.js'
import {
  assertPendingOwnershipReferences,
  PendingLifecycleService,
  pendingLifecycleReadPredicate,
  pendingLifecycleSourceSql,
} from '../src/pending-lifecycle.js'
import {
  pendingLifecycleEvents,
  pendingLifecycles,
  sourceRemovalDecisionEvents,
  sourceRemovalDecisions,
} from '../src/pending-lifecycle-schema.js'
import { transactionPrivacy } from '../src/privacy-schema.js'
import { DEFAULT_RUNTIME_CONFIGURATION } from '../src/runtime-config.js'
import { DemoService } from '../src/service.js'
import { SyncCoordinator } from '../src/sync-jobs.js'
import { syncHash } from '../src/sync-provider.js'

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error('Missing fixture value')
  return value
}
let handle: DatabaseHandle
const profiles: string[] = [],
  directories: string[] = []
const base = '2026-10-03T12:00:00.000Z'
const record = (id: string, extra: Partial<ProviderTransaction> = {}): ProviderTransaction => ({
  id,
  accountId: 'conto',
  amount: '-5.00',
  currency: 'EUR',
  description: `Synthetic ${id}`,
  status: 'pending',
  authorizedOn: '2026-10-01',
  ...extra,
})
async function fixture(encrypted = false, noIds = false) {
  const profileId = `pending_${randomUUID()}`,
    connectionId = `connection_${randomUUID()}`,
    consentId = `consent_${randomUUID()}`
  profiles.push(profileId)
  const records: ProviderTransaction[] = [record('hold')]
  let clock = base
  const now = () => clock
  class Provider extends MockItalianProvider {
    override async openSync(context: ProviderContext, mode: 'user_present' | 'unattended') {
      return { ...(await super.openSync(context, mode)), observedAt: clock }
    }
    override async getSyncPage(context: ProviderContext, request: SyntheticSyncPageRequest) {
      const page = await super.getSyncPage(context, request)
      return {
        ...page,
        transactions: page.transactions.map((transaction) => ({
          ...transaction,
          id: noIds ? null : transaction.id,
        })),
      }
    }
  }
  const provider = new Provider(records)
  await handle.db.insert(schema.profiles).values({
    id: profileId,
    name: 'Pending synthetic fixture',
    timezone: 'Europe/Rome',
    createdAt: base,
  })
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
  let encryption: ProfileEncryption | undefined
  if (encrypted) {
    const directory = await mkdtemp(join(tmpdir(), 'pending-vault-'))
    directories.push(directory)
    encryption = new ProfileEncryption(
      handle.db,
      await createLocalSyntheticKeyManagement({ directory, mode: 'demo' }),
      now,
    )
  }
  const configuration = {
    revision: 1,
    schemaVersion: 1,
    values: DEFAULT_RUNTIME_CONFIGURATION,
    digest: syncHash(DEFAULT_RUNTIME_CONFIGURATION),
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
    now,
    configuration,
    ...(encryption ? { encryption } : {}),
  })
  const service = new DemoService(handle.db, profileId, provider, now, encryption)
  const lifecycle = new PendingLifecycleService(handle.db, profileId, now, encryption)
  const sync = async () => {
    const job = await coordinator.start(connectionId, {
      requestId: randomUUID(),
      mode: 'user_present',
      from: '2026-10-01',
    })
    return coordinator.wait(job.id)
  }
  return {
    records,
    profileId,
    connectionId,
    consentId,
    provider,
    coordinator,
    lifecycle,
    service,
    now,
    encryption,
    sync,
    renew: async () => {
      const consent = new ConsentLifecycleService(handle.db, profileId, provider, now)
      return consent.renew(connectionId, (await consent.get(connectionId)).revision)
    },
    setNow: (value: string) => {
      clock = value
    },
  }
}
async function assertReadProjection(f: Awaited<ReturnType<typeof fixture>>) {
  const rows = await handle.db
    .select({ id: schema.transactions.id, source: pendingLifecycleSourceSql(f.profileId) })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.profileId, f.profileId),
        pendingLifecycleReadPredicate(f.profileId),
      ),
    )
  const active = (await f.service.data()).transactions.map((row) => ({
    id: row.id,
    source: row.source,
  }))
  expect(rows.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
    active.sort((a, b) => a.id.localeCompare(b.id)),
  )
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
  for (const directory of directories) await rm(directory, { recursive: true, force: true })
})

test('a different booked ID preserves feedback, first-seen, private/quiet flags and encrypted original audit', async () => {
  const f = await fixture(true)
  expect((await f.sync()).state).toBe('completed')
  const hold = required((await f.service.data()).transactions[0])
  await handle.db.insert(schema.feedback).values({
    profileId: f.profileId,
    transactionId: hold.id,
    categoryId: 'food_groceries',
    scope: 'once',
    createdAt: base,
  })
  await handle.db.insert(transactionPrivacy).values({
    profileId: f.profileId,
    transactionId: hold.id,
    quiet: true,
    private: true,
    revision: 2,
    updatedAt: base,
  })
  f.setNow('2026-10-03T13:00:00.000Z')
  f.records.splice(
    0,
    1,
    record('settled', { status: 'booked', bookedOn: '2026-10-02', relatedTransactionId: 'hold' }),
  )
  expect((await f.sync()).state).toBe('completed')
  const data = await f.service.data()
  expect(data.transactions).toHaveLength(1)
  expect(data.transactions[0]?.status).toBe('booked')
  const feedback = await handle.db
    .select()
    .from(schema.feedback)
    .where(eq(schema.feedback.profileId, f.profileId))
  expect(feedback).toHaveLength(2)
  expect(feedback.every((row) => row.categoryId === 'food_groceries')).toBe(true)
  const privacy = await handle.db
    .select()
    .from(transactionPrivacy)
    .where(eq(transactionPrivacy.profileId, f.profileId))
  expect(privacy).toHaveLength(2)
  expect(privacy.every((row) => row.private && row.quiet)).toBe(true)
  expect(await f.lifecycle.pending()).toEqual([])
  const owned = await f.lifecycle.ownership()
  expect(owned.pending[0]?.firstSeenAt).toBe(base)
  expect(owned.pending[0]?.carried).toContain('category')
  expect(owned.events).toHaveLength(2)
  assertPendingOwnershipReferences(owned, {
    profileId: f.profileId,
    transactions: await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, f.profileId)),
    exportedAt: f.now(),
  })
  const [stored] = await handle.db
    .select()
    .from(pendingLifecycles)
    .where(eq(pendingLifecycles.profileId, f.profileId))
  expect(stored?.payload).not.toContain('-500')
  await f.sync()
  expect((await f.lifecycle.ownership()).events).toHaveLength(2)
})
test('changed amount remains reserved until revisioned accept; undo survives another source fetch', async () => {
  const f = await fixture()
  await f.sync()
  f.records.splice(
    0,
    1,
    record('settled', {
      amount: '-6.00',
      status: 'booked',
      bookedOn: '2026-10-02',
      relatedTransactionId: 'hold',
    }),
  )
  await f.sync()
  expect((await f.service.data()).transactions).toHaveLength(2)
  const view = required((await f.lifecycle.pending())[0])
  expect(view.state).toBe('amount_change_review')
  expect(view.pendingAmountMinor).toBe('-500')
  expect(view.replacementAmountMinor).toBe('-600')
  const input = {
    transactionId: view.transactionId,
    revision: view.revision,
    expectedDigest: view.digest,
    replacementRevision: required(view.replacementRevision),
    action: 'accept' as const,
  }
  const accepted = await f.lifecycle.chooseReplacement(input)
  expect((await f.service.data()).transactions).toHaveLength(1)
  await assertReadProjection(f)
  await expect(f.lifecycle.chooseReplacement(input)).rejects.toMatchObject({ status: 409 })
  await f.lifecycle.chooseReplacement({
    ...input,
    revision: accepted.revision,
    expectedDigest: accepted.digest,
    action: 'undo',
  })
  await f.sync()
  expect((await f.service.data()).transactions).toHaveLength(2)
  expect((await f.lifecycle.pending())[0]?.state).toBe('amount_change_review')
})
test('undo of an exact automatic bridge overrides old presence evidence and survives the next complete snapshot', async () => {
  const f = await fixture()
  await f.sync()
  f.records.splice(
    0,
    1,
    record('settled', { status: 'booked', bookedOn: '2026-10-02', relatedTransactionId: 'hold' }),
  )
  await f.sync()
  const view = required((await f.lifecycle.pending())[0])
  expect(view.state).toBe('replaced')
  await f.lifecycle.chooseReplacement({
    transactionId: view.transactionId,
    revision: view.revision,
    expectedDigest: view.digest,
    replacementRevision: required(view.replacementRevision),
    action: 'undo',
  })
  expect((await f.service.data()).transactions).toHaveLength(2)
  await f.sync()
  expect((await f.service.data()).transactions).toHaveLength(2)
  await assertReadProjection(f)
})
test('a distinct cancellation ID needs exact linked money; unrelated and partial reversals keep the original reservation', async () => {
  const f = await fixture()
  await f.sync()
  f.records.splice(
    0,
    1,
    record('partial', {
      amount: '-3.00',
      status: 'reversed',
      bookedOn: '2026-10-02',
      relatedTransactionId: 'hold',
      pendingLifecycle: {
        state: 'cancelled',
        evidenceReference: 'synthetic-partial/1',
        effectiveAt: base,
      },
    }),
  )
  await f.sync()
  expect((await f.service.data()).transactions.some((row) => row.status === 'pending')).toBe(true)
  f.records.splice(
    0,
    1,
    record('cancelled', {
      status: 'reversed',
      bookedOn: '2026-10-02',
      relatedTransactionId: 'hold',
      pendingLifecycle: {
        state: 'cancelled',
        evidenceReference: 'synthetic-exact/1',
        effectiveAt: base,
      },
    }),
  )
  await f.sync()
  expect((await f.service.data()).transactions.some((row) => row.status === 'pending')).toBe(false)
  expect((await f.lifecycle.pending())[0]?.state).toBe('cancelled')
  await assertReadProjection(f)
})
test.each(['expired', 'cancelled', 'reversed'] as const)(
  'explicit %s evidence terminates a hold, while missing snapshots never do',
  async (state) => {
    const f = await fixture()
    await f.sync()
    f.records.splice(0)
    await f.sync()
    await f.sync()
    expect((await f.service.data()).transactions).toHaveLength(1)
    f.records.push(
      record('hold', {
        status: 'reversed',
        bookedOn: '2026-10-01',
        pendingLifecycle: {
          state,
          evidenceReference: `synthetic-${state}/1`,
          effectiveAt: '2026-10-03T11:00:00.000Z',
        },
      }),
    )
    expect((await f.sync()).state).toBe('completed')
    expect((await f.lifecycle.pending())[0]?.state).toBe(state)
    expect((await f.service.data()).transactions.every((row) => row.status !== 'pending')).toBe(
      true,
    )
  },
)
test('unproved reversal cannot release pending and future evidence cannot commit ledger changes', async () => {
  const f = await fixture()
  await f.sync()
  f.records.splice(0, 1, record('hold', { status: 'reversed', bookedOn: '2026-10-01' }))
  const rejected = await f.sync()
  expect(
    rejected.report.outcomes.some((row) => row.reason === 'pending_termination_evidence_missing'),
  ).toBe(true)
  expect((await f.service.data()).transactions[0]?.status).toBe('pending')
  f.records.splice(
    0,
    1,
    record('hold', {
      status: 'reversed',
      bookedOn: '2026-10-01',
      pendingLifecycle: {
        state: 'expired',
        evidenceReference: 'synthetic-future',
        effectiveAt: '2026-10-04T12:00:00.000Z',
      },
    }),
  )
  expect((await f.sync()).state).toBe('failed')
  expect((await f.service.data()).transactions[0]?.status).toBe('pending')
})
test('same-ID booking records changed money, initial observation and existing category correction', async () => {
  const f = await fixture()
  await f.sync()
  const original = required((await f.service.data()).transactions[0])
  await handle.db.insert(schema.feedback).values({
    profileId: f.profileId,
    transactionId: original.id,
    categoryId: 'food_groceries',
    scope: 'once',
    createdAt: base,
  })
  f.setNow('2026-10-03T13:00:00.000Z')
  f.records.splice(
    0,
    1,
    record('hold', { status: 'booked', bookedOn: '2026-10-02', amount: '-6.50' }),
  )
  await f.sync()
  const view = required((await f.lifecycle.pending())[0])
  expect(view.firstSeenAt).toBe(base)
  expect(view.pendingAmountMinor).toBe('-500')
  expect(view.replacementAmountMinor).toBe('-650')
  expect((await f.service.data()).transactions[0]?.revision).toBe(2)
  expect(
    await handle.db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, f.profileId)),
  ).toHaveLength(1)
})
test('two missing windows enable persistent keep-manual/remove and undo; reappearance invalidates an old removal', async () => {
  const f = await fixture()
  f.records.splice(0, 1, record('booked', { status: 'booked', bookedOn: '2026-10-01' }))
  await f.sync()
  f.records.splice(0)
  await f.sync()
  expect(await f.lifecycle.removals()).toEqual([])
  await f.sync()
  const view = required((await f.lifecycle.removals())[0])
  const input = {
    transactionId: view.transactionId,
    revision: view.revision,
    transactionRevision: view.transactionRevision,
    presenceDigest: view.presenceDigest,
    choice: 'keep_manual' as const,
  }
  const kept = await f.lifecycle.chooseRemoval(input)
  expect((await f.service.data()).transactions[0]?.source).toBe('manual')
  await assertReadProjection(f)
  await f.sync()
  expect((await f.service.data()).transactions[0]?.source).toBe('manual')
  await expect(f.lifecycle.chooseRemoval(input)).rejects.toMatchObject({ status: 409 })
  const removed = await f.lifecycle.chooseRemoval({
    ...input,
    revision: kept.revision,
    choice: 'remove',
  })
  expect((await f.service.data()).transactions).toHaveLength(0)
  await assertReadProjection(f)
  expect(
    await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, f.profileId)),
  ).toHaveLength(1)
  const undone = await f.lifecycle.chooseRemoval({
    ...input,
    revision: removed.revision,
    choice: 'undo',
  })
  expect((await f.service.data()).transactions[0]?.source).toBe('bank')
  await f.lifecycle.chooseRemoval({ ...input, revision: undone.revision, choice: 'remove' })
  f.records.push(record('booked', { status: 'booked', bookedOn: '2026-10-01' }))
  await f.sync()
  expect((await f.service.data()).transactions).toHaveLength(1)
  expect(await f.lifecycle.removals()).toEqual([])
  expect(
    (
      await handle.db
        .select()
        .from(sourceRemovalDecisions)
        .where(eq(sourceRemovalDecisions.profileId, f.profileId))
    )[0]?.choice,
  ).toBe('undone')
  expect(
    (await f.lifecycle.ownership()).events.some(
      (row) => (row.payload as { reason?: string }).reason === 'source_returned',
    ),
  ).toBe(true)
})
test('cross-profile decisions are denied and immutable lifecycle history cascades only with source erasure', async () => {
  const f = await fixture()
  await f.sync()
  const foreign = await fixture()
  await foreign.sync()
  const view = required((await f.lifecycle.pending())[0])
  await expect(
    foreign.lifecycle.chooseReplacement({
      transactionId: view.transactionId,
      revision: view.revision,
      expectedDigest: view.digest,
      replacementRevision: 1,
      action: 'accept',
    }),
  ).rejects.toMatchObject({ status: 404 })
  await expect(
    handle.withProfile(foreign.profileId, (db) =>
      db.insert(sourceRemovalDecisions).values({
        profileId: f.profileId,
        connectionId: f.connectionId,
        accountId: 'foreign',
        transactionId: view.transactionId,
        revision: 2,
        choice: 'remove',
        transactionRevision: 1,
        presenceDigest: view.digest,
        updatedAt: base,
      }),
    ),
  ).rejects.toThrow()
  await expect(
    handle.db.execute(
      sql`update pending_lifecycle_events set payload='{}' where profile_id=${f.profileId}`,
    ),
  ).rejects.toThrow()
  await expect(
    handle.db
      .delete(pendingLifecycleEvents)
      .where(eq(pendingLifecycleEvents.profileId, f.profileId)),
  ).rejects.toThrow()
  await handle.db
    .delete(schema.connections)
    .where(
      and(eq(schema.connections.profileId, f.profileId), eq(schema.connections.id, f.connectionId)),
    )
  expect(
    await handle.db
      .select()
      .from(pendingLifecycleEvents)
      .where(eq(pendingLifecycleEvents.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(sourceRemovalDecisionEvents)
      .where(eq(sourceRemovalDecisionEvents.profileId, f.profileId)),
  ).toHaveLength(0)
})

test('renewed provider-ID aliases keep explicit terminal evidence on the canonical pending ID', async () => {
  const f = await fixture()
  await f.sync()
  const original = required((await f.service.data()).transactions[0])
  f.setNow('2026-10-03T12:30:00.000Z')
  await f.renew()
  f.records.splice(0, 1, record('renewed-hold', { description: 'Synthetic hold' }))
  expect((await f.sync()).report.inserted).toBe(0)
  expect((await f.service.data()).transactions[0]?.id).toBe(original.id)
  f.setNow('2026-10-03T13:00:00.000Z')
  f.records.splice(
    0,
    1,
    record('renewed-hold', {
      description: 'Synthetic hold',
      status: 'reversed',
      bookedOn: '2026-10-01',
      pendingLifecycle: {
        state: 'cancelled',
        evidenceReference: 'synthetic-renewed-proof/1',
        effectiveAt: f.now(),
      },
    }),
  )
  expect((await f.sync()).state).toBe('completed')
  expect((await f.lifecycle.pending())[0]).toMatchObject({
    transactionId: original.id,
    firstSeenAt: base,
    state: 'cancelled',
  })
  expect((await f.service.data()).transactions[0]?.status).toBe('reversed')
  const observations = await handle.db
    .select()
    .from(schema.observations)
    .where(eq(schema.observations.profileId, f.profileId))
  expect(observations.some((row) => row.providerRecordId === 'renewed-hold')).toBe(true)
  await assertReadProjection(f)
})

test('null raw provider IDs retain first observation and original null payload after canonicalized lifecycle staging', async () => {
  const f = await fixture(false, true)
  expect((await f.sync()).state).toBe('completed')
  const initial = required((await f.lifecycle.pending())[0])
  f.setNow('2026-10-03T13:00:00.000Z')
  expect((await f.sync()).report.inserted).toBe(0)
  expect((await f.lifecycle.pending())[0]).toMatchObject({
    transactionId: initial.transactionId,
    firstSeenAt: base,
    state: 'active',
  })
  const observations = await handle.db
    .select()
    .from(schema.observations)
    .where(eq(schema.observations.profileId, f.profileId))
  expect(observations).toHaveLength(1)
  const payloads = await handle.db
    .select()
    .from(schema.observationPayloads)
    .where(eq(schema.observationPayloads.profileId, f.profileId))
  expect(payloads[0]?.payload.id).toBeNull()
  expect((await f.lifecycle.ownership()).events).toHaveLength(1)
})

test('a quiet owned category is carried with a valid encrypted assignment audit and stays outside reconciliation cards', async () => {
  const f = await fixture(true)
  await f.sync()
  const hold = required((await f.service.data()).transactions[0])
  const taxonomy = new MerchantTaxonomyService(handle.db, f.profileId, f.now, f.encryption)
  const category = await taxonomy.createCategory({
    label: 'Scelta riservata sintetica',
    canonicalCode: 'GIVING_DONATIONS',
    icon: 'heart',
    parentId: null,
    position: 0,
    hidden: false,
  })
  await taxonomy.assignCategory(hold.id, category.id, 1)
  expect(await f.lifecycle.pending()).toEqual([])
  f.setNow('2026-10-03T13:00:00.000Z')
  f.records.splice(
    0,
    1,
    record('settled', {
      status: 'booked',
      bookedOn: '2026-10-02',
      relatedTransactionId: 'hold',
    }),
  )
  expect((await f.sync()).state).toBe('completed')
  expect(await f.lifecycle.pending()).toEqual([])
  const audit = await taxonomy.exportAudit()
  expect(audit.assignments).toHaveLength(2)
  expect(audit.assignments.every((row) => row.quiet && row.labelSnapshot === category.label)).toBe(
    true,
  )
  expect(audit.assignmentEvents).toHaveLength(2)
  validateMerchantTaxonomyExport({
    profile: { id: f.profileId },
    exportedAt: f.now(),
    merchantTaxonomy: audit,
    accounts: await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, f.profileId)),
    transactions: await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, f.profileId)),
  })
  const owned = await f.lifecycle.ownership()
  expect(owned.pending[0]?.carried).toContain('owned_category')
  expect(owned.pending[0]?.transactionId).toBe(hold.id)
})

test('the common ledger predicate preserves pre-lifecycle exact bridge evidence for upgraded archives', async () => {
  const f = await fixture()
  await f.sync()
  f.records.splice(
    0,
    1,
    record('settled', {
      status: 'booked',
      bookedOn: '2026-10-02',
      relatedTransactionId: 'hold',
    }),
  )
  await f.sync()
  await handle.db.delete(pendingLifecycles).where(eq(pendingLifecycles.profileId, f.profileId))
  expect((await f.service.data()).transactions).toHaveLength(1)
  await assertReadProjection(f)
})
