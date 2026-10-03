import { createHash, randomUUID } from 'node:crypto'
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  cancelConnectionCreationIntents,
  cancelRestoredConnectionCreationIntents,
} from '../src/connection-creation.js'
import { connectionCreationIntents } from '../src/connection-creation-schema.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { profileEncryptionKeys } from '../src/encryption-schema.js'
import { manualReasonContext, payloadContext } from '../src/financial-storage.js'
import { manualAccounts, manualBalanceEvents, manualCommands } from '../src/manual-schema.js'
import {
  assertSourceErasureReady,
  readSourceFactEpochs,
  recordSourceFacts,
  recoverSourceErasures,
  SourceErasureService,
} from '../src/source-erasure.js'
import { validateSourceErasureOwnershipExport } from '../src/source-erasure-export.js'
import {
  createSourceErasureJournal,
  type SourceErasureJournal,
} from '../src/source-erasure-journal.js'
import { sourceErasureReceipts } from '../src/source-erasure-schema.js'

const initial = '2026-10-01T12:00:00.000Z',
  erased = '2026-10-02T12:00:00.000Z',
  renewed = '2026-10-03T12:00:00.000Z'
let handle: DatabaseHandle
const roots: string[] = [],
  profiles: string[] = [],
  journals: SourceErasureJournal[] = []
async function migration(db: DatabaseHandle['db']) {
  const result = await db.execute(sql`SELECT to_regclass('source_erasure_receipts') AS name`)
  expect((result.rows[0] as { name: string | null }).name).toBe('source_erasure_receipts')
  const columns = await db.execute(
    sql`SELECT 1 FROM information_schema.columns WHERE table_name='manual_commands' AND column_name='source_account_id'`,
  )
  expect(columns.rows.length).toBe(1)
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  await migration(handle.db)
})
afterAll(async () => {
  for (const journal of journals) journal.close()
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  // Independent production receipts never delete. Trusted disposable fixture teardown removes
  // only this file's exact owned profiles, restoring the immutable trigger in the same transaction.
  if (profiles.length)
    await handle.db.transaction(async (db) => {
      await db.execute(
        sql`ALTER TABLE source_erasure_receipts DISABLE TRIGGER source_erasure_receipt_immutable`,
      )
      for (const id of profiles)
        await db.delete(sourceErasureReceipts).where(eq(sourceErasureReceipts.profileId, id))
      await db.execute(
        sql`ALTER TABLE source_erasure_receipts ENABLE TRIGGER source_erasure_receipt_immutable`,
      )
    })
  await handle.close()
  for (const path of roots) await rm(path, { recursive: true, force: true })
})
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected owned synthetic value')
  return value
}
async function fixture(selected = handle) {
  const root = await mkdtemp(join(tmpdir(), 'lilleri-source-erasure-'))
  roots.push(root)
  const vault = join(root, 'vault'),
    store = join(root, 'journal'),
    keys = await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' }),
    encryption = new ProfileEncryption(selected.db, keys, () => renewed)
  const journal = await createSourceErasureJournal({
    directory: store,
    anchorDirectory: vault,
    keys,
    mode: 'demo',
  })
  journals.push(journal)
  const profileId = `source_${randomUUID()}`,
    connectionId = `connection_${randomUUID()}`,
    otherId = `manual_${randomUUID()}`,
    accountId = `account_${randomUUID()}`,
    otherAccountId = `cash_${randomUUID()}`,
    transactionId = `tx_${randomUUID()}`,
    observationId = `obs_${randomUUID()}`,
    consentId = `consent_${randomUUID()}`
  if (selected === handle) profiles.push(profileId)
  await selected.db.insert(schema.profiles).values({
    id: profileId,
    name: 'Profilo sintetico',
    timezone: 'Europe/Rome',
    createdAt: initial,
  })
  await selected.db.insert(schema.connections).values([
    {
      id: connectionId,
      profileId,
      providerId: 'mock-italian',
      institutionId: 'fixture',
      status: 'active',
      createdAt: initial,
    },
    {
      id: otherId,
      profileId,
      providerId: 'local-manual',
      institutionId: 'manual',
      status: 'active',
      createdAt: initial,
    },
  ])
  await selected.db.insert(schema.consents).values({
    id: consentId,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: initial,
    expiresAt: '2027-10-01T12:00:00.000Z',
    revokedAt: null,
    provider: 'mock-italian',
  })
  const account = {
    id: accountId,
    profileId,
    connectionId,
    providerAccountId: 'bank-account',
    name: 'Conto sintetico',
    institutionName: 'Banca sintetica',
    kind: 'current' as const,
    balanceMinor: 12000n,
    currency: 'EUR' as const,
    balanceUpdatedAt: initial,
  }
  const transaction = {
    id: transactionId,
    profileId,
    connectionId,
    accountId,
    providerId: 'mock-italian',
    providerTransactionId: 'bank-transaction',
    revision: 1,
    source: 'bank' as const,
    status: 'booked' as const,
    amountMinor: -1000n,
    currency: 'EUR' as const,
    description: 'Acquisto sintetico riservato',
    merchantName: 'Esercente sintetico',
    merchantKey: 'fixture-merchant',
    bookedOn: '2026-10-01',
    authorizedOn: null,
    observedAt: initial,
    kind: 'expense' as const,
    reference: 'Riferimento riservato',
    relatedTransactionId: null,
    relatedAccountId: null,
    contentHash: 'fixture-content',
  }
  const observation = {
    id: observationId,
    profileId,
    connectionId,
    accountId,
    providerId: 'mock-italian',
    providerRecordId: 'record',
    status: 'booked',
    contentHash: 'fixture-observation',
    observedAt: initial,
  }
  await selected.db.insert(schema.accounts).values([
    account,
    {
      ...account,
      id: otherAccountId,
      connectionId: otherId,
      providerAccountId: 'cash',
      kind: 'cash',
      name: 'Altra fonte',
      balanceMinor: 5500n,
    },
  ])
  await selected.db
    .insert(schema.transactions)
    .values(await encryption.encryptTransactionRow(selected.db, transaction))
  await selected.db.insert(schema.observations).values(observation)
  await selected.db.insert(schema.observationPayloads).values({
    profileId,
    observationId,
    expiresAt: '2027-10-01T12:00:00.000Z',
    payload: {
      _lilleriEncrypted: await encryption.encryptJson(
        selected.db,
        payloadContext(profileId, observationId),
        { synthetic: 'Dati riservati', amountMinor: '-1000' },
      ),
    },
  })
  const facts = {
    profileId,
    connectionId,
    consentId,
    accountIds: [accountId],
    transactions: [{ id: transactionId, accountId }],
    observations: [{ id: observationId, accountId }],
  }
  await selected.withProfile(profileId, (db) =>
    recordSourceFacts(db, journal, facts, initial, encryption),
  )
  const erase = () =>
    selected.withProfile(profileId, (db) =>
      new SourceErasureService(db, profileId, encryption, journal, () => erased).erase(
        connectionId,
      ),
    )
  return {
    root,
    vault,
    store,
    keys,
    encryption,
    journal,
    profileId,
    connectionId,
    otherId,
    accountId,
    otherAccountId,
    transactionId,
    observationId,
    consentId,
    account,
    transaction,
    observation,
    facts,
    erase,
    selected,
  }
}
async function reimport(f: Awaited<ReturnType<typeof fixture>>) {
  const consentId = `regrant_${randomUUID()}`
  await f.selected.db
    .update(schema.revocationJobs)
    .set({ state: 'completed', completedAt: renewed })
    .where(eq(schema.revocationJobs.profileId, f.profileId))
  await f.selected.db
    .update(schema.connections)
    .set({ status: 'active' })
    .where(eq(schema.connections.id, f.connectionId))
  await f.selected.db.insert(schema.consents).values({
    id: consentId,
    profileId: f.profileId,
    connectionId: f.connectionId,
    purpose: 'account_information',
    grantedAt: renewed,
    expiresAt: '2027-10-01T12:00:00.000Z',
    provider: 'mock-italian',
  })
  await f.selected.db
    .insert(schema.accounts)
    .values({ ...f.account, balanceMinor: 11000n, balanceUpdatedAt: renewed })
  await f.selected.db.insert(schema.transactions).values(
    await f.encryption.encryptTransactionRow(f.selected.db, {
      ...f.transaction,
      amountMinor: -2000n,
      revision: 2,
      observedAt: '2099-01-01T00:00:00.000Z',
    }),
  )
  await f.selected.db
    .insert(schema.observations)
    .values({ ...f.observation, observedAt: '2099-01-01T00:00:00.000Z' })
  await f.selected.db.insert(schema.observationPayloads).values({
    profileId: f.profileId,
    observationId: f.observationId,
    expiresAt: '2027-10-01T12:00:00.000Z',
    payload: {
      _lilleriEncrypted: await f.encryption.encryptJson(
        f.selected.db,
        payloadContext(f.profileId, f.observationId),
        { synthetic: 'Nuova generazione', amountMinor: '-2000' },
      ),
    },
  })
  await f.selected.withProfile(f.profileId, (db) =>
    recordSourceFacts(db, f.journal, { ...f.facts, consentId }, renewed, f.encryption),
  )
  return consentId
}
test('erases exact source rows, retains another source and profile key, persists encrypted owned receipt', async () => {
  const f = await fixture(),
    result = await f.erase()
  expect(result.signed.body.accountIds).toEqual([f.accountId])
  expect(result.signed.body.transactions).toEqual([{ id: f.transactionId, accountId: f.accountId }])
  expect(
    await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.accountId)),
  ).toHaveLength(0)
  expect(
    await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.otherAccountId)),
  ).toHaveLength(1)
  expect(
    await handle.db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, f.profileId)),
  ).toHaveLength(0)
  expect(
    await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, f.profileId)),
  ).toHaveLength(1)
  const row = required(
    (
      await handle.db
        .select()
        .from(sourceErasureReceipts)
        .where(eq(sourceErasureReceipts.profileId, f.profileId))
    )[0],
  )
  expect(JSON.stringify(row.receipt)).not.toContain(f.transactionId)
  expect(
    required(
      (
        await handle.db
          .select()
          .from(schema.revocationJobs)
          .where(eq(schema.revocationJobs.profileId, f.profileId))
      )[0],
    ).state,
  ).toBe('pending')
  const summary = await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed)
  expect(summary).toMatchObject({
    tombstonesReplayed: 1,
    transactionsRemoved: 0,
    safeToOpenLocally: true,
  })
})
test('authenticated refs require current verifier; forged clocks, foreign fields and MAC fail', async () => {
  const f = await fixture(),
    receipt = await f.erase(),
    snapshot = {
      profile: { id: f.profileId },
      exportedAt: renewed,
      accounts: [],
      transactions: [],
      sourceErasures: [receipt],
    }
  expect(() => validateSourceErasureOwnershipExport(snapshot)).toThrow('trusted verifier')
  const refs = validateSourceErasureOwnershipExport(snapshot, (input) =>
    f.journal.verifyReceipt(input),
  )
  expect(refs.transactions.get(f.transactionId)).toMatchObject({
    profileId: f.profileId,
    accountId: f.accountId,
    erasedAt: erased,
  })
  for (const exportedAt of ['2026-10-03T14:00:00+02:00', '2026-10-03T10:00:00-02:00']) {
    expect(
      validateSourceErasureOwnershipExport({ ...snapshot, exportedAt }, (input) =>
        f.journal.verifyReceipt(input),
      ).transactions.get(f.transactionId),
    ).toEqual(refs.transactions.get(f.transactionId))
    expect(
      validateSourceErasureOwnershipExport({ ...snapshot, exportedAt, sourceErasures: [] })
        .transactions.size,
    ).toBe(0)
  }
  // The lexical date is later, but this offset instant precedes receipt application.
  expect(() =>
    validateSourceErasureOwnershipExport(
      { ...snapshot, exportedAt: '2026-10-03T01:00:00+14:00' },
      (input) => f.journal.verifyReceipt(input),
    ),
  ).toThrow()
  for (const exportedAt of ['not-an-instant', '2026-10-03', '2026-10-03T12:00:00'])
    expect(() =>
      validateSourceErasureOwnershipExport({ ...snapshot, exportedAt, sourceErasures: [] }),
    ).toThrow()
  expect(() =>
    validateSourceErasureOwnershipExport({ ...snapshot, profile: { id: 'foreign' } }, (input) =>
      f.journal.verifyReceipt(input),
    ),
  ).toThrow()
  expect(() =>
    validateSourceErasureOwnershipExport(
      { ...snapshot, sourceErasures: [{ ...receipt, appliedAt: initial }] },
      (input) => f.journal.verifyReceipt(input),
    ),
  ).toThrow()
  expect(() =>
    f.journal.verifyReceipt({
      ...receipt.signed,
      body: { ...receipt.signed.body, accountIds: [] },
    }),
  ).toThrow()
})
test('durable independent intent survives SQL rollback and recovery is idempotent', async () => {
  const f = await fixture()
  await expect(
    handle.withProfile(f.profileId, async (db) => {
      await new SourceErasureService(db, f.profileId, f.encryption, f.journal, () => erased).erase(
        f.connectionId,
      )
      throw new Error('synthetic rollback')
    }),
  ).rejects.toThrow('synthetic rollback')
  expect(
    await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.accountId)),
  ).toHaveLength(1)
  expect((await f.journal.readAll()).length).toBe(1)
  await expect(f.erase()).rejects.toThrow('recovery is required')
  expect((await f.journal.readAll()).length).toBe(1)
  await expect(
    assertSourceErasureReady(handle.db, f.profileId, f.journal, f.encryption),
  ).rejects.toThrow('recovery is required')
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ accountsRemoved: 1, transactionsRemoved: 1, safeToOpenLocally: true })
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ accountsRemoved: 0, transactionsRemoved: 0 })
})
test('new consent generation with reused canonical IDs survives; old financial content cannot borrow its proof', async () => {
  const f = await fixture()
  await f.erase()
  await reimport(f)
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ accountsRemoved: 0, transactionsRemoved: 0 })
  await handle.db
    .update(schema.transactions)
    .set({ amountMinor: -1000n })
    .where(eq(schema.transactions.id, f.transactionId))
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('content differs')
})
test('logical proof survives re-encryption, scope/revision changes and raw TTL removal', async () => {
  const f = await fixture()
  await f.erase()
  await reimport(f)
  const row = required(
      (
        await handle.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, f.transactionId))
      )[0],
    ),
    logical = await f.encryption.decryptTransactionRow(handle.db, row)
  await handle.db
    .update(schema.transactions)
    .set(
      await f.encryption.encryptTransactionRow(handle.db, {
        ...logical,
        revision: 3,
        scope: 'business',
        observedAt: '2099-02-01T00:00:00.000Z',
      }),
    )
    .where(eq(schema.transactions.id, f.transactionId))
  await handle.db
    .delete(schema.observationPayloads)
    .where(eq(schema.observationPayloads.observationId, f.observationId))
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ transactionsRemoved: 0, safeToOpenLocally: true })
})
test('raw payload content is bound independently of ciphertext and cannot be transplanted', async () => {
  const f = await fixture()
  await f.erase()
  await reimport(f)
  await handle.db
    .update(schema.observationPayloads)
    .set({
      payload: {
        _lilleriEncrypted: await f.encryption.encryptJson(
          handle.db,
          payloadContext(f.profileId, f.observationId),
          { synthetic: 'Alterato', amountMinor: '-9999' },
        ),
      },
    })
    .where(eq(schema.observationPayloads.observationId, f.observationId))
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('content differs')
})
test('unproven unknown source membership is quarantined even with a future provider clock', async () => {
  const f = await fixture()
  await f.erase()
  await handle.db.insert(schema.accounts).values({
    ...f.account,
    id: `unknown_${randomUUID()}`,
    providerAccountId: 'unknown',
    balanceUpdatedAt: '2099-01-01T00:00:00.000Z',
  })
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('Unproven source account')
})
test('revoked/old consent, null bank consent, foreign facts and backwards server clocks cannot mint new proof', async () => {
  const f = await fixture()
  await f.erase()
  const consentId = await reimport(f)
  for (const input of [
    { ...f.facts },
    { ...f.facts, consentId: null },
    { ...f.facts, consentId, accountIds: [f.otherAccountId] },
  ])
    await expect(
      handle.withProfile(f.profileId, (db) =>
        recordSourceFacts(db, f.journal, input, renewed, f.encryption),
      ),
    ).rejects.toThrow()
  await expect(
    handle.withProfile(f.profileId, (db) =>
      recordSourceFacts(db, f.journal, { ...f.facts, consentId }, initial, f.encryption),
    ),
  ).rejects.toMatchObject({ status: 409 })
})
test('old/missing independent journal is refused by current vault anchors; wrong vault cannot certify intent', async () => {
  const f = await fixture(),
    before = join(f.root, 'stale')
  await cp(f.store, before, { recursive: true })
  const receipt = await f.erase()
  await expect(
    createSourceErasureJournal({
      directory: before,
      anchorDirectory: f.vault,
      keys: f.keys,
      mode: 'demo',
      requireExisting: true,
    }),
  ).rejects.toThrow('unavailable')
  const wrong = join(f.root, 'wrong-vault'),
    wrongKeys = await createLocalSyntheticKeyManagement({ directory: wrong, mode: 'demo' }),
    journal = await createSourceErasureJournal({
      directory: f.store,
      anchorDirectory: wrong,
      keys: wrongKeys,
      mode: 'demo',
      requireExisting: true,
    })
  journals.push(journal)
  await expect(
    recoverSourceErasures(
      handle.db,
      journal,
      new ProfileEncryption(handle.db, wrongKeys),
      () => renewed,
    ),
  ).rejects.toThrow()
  expect((await f.journal.readAll())[0]).toEqual(receipt.signed)
})
test('receipt tampering or removal with surviving anchor keeps restoration unavailable', async () => {
  const f = await fixture(),
    receipt = await f.erase(),
    file = join(f.store, `${receipt.signed.body.id}.json`)
  await writeFile(file, JSON.stringify({ ...receipt.signed, signature: '0'.repeat(64) }), {
    mode: 0o600,
  })
  await expect(f.journal.readAll()).rejects.toThrow()
  await rm(file)
  await expect(f.journal.readAll()).rejects.toThrow()
})
test('serialized journal IO does not roll back another profile generation', async () => {
  const f = await fixture(),
    other = await fixture(),
    [key] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, other.profileId))
  const receipt = await f.erase(),
    body = {
      ...receipt.signed.body,
      id: randomUUID(),
      profileId: other.profileId,
      connectionId: other.connectionId,
      profileKeyId: required(key).keyId,
      accountIds: [other.accountId],
      transactions: [{ id: other.transactionId, accountId: other.accountId }],
      observations: [{ id: other.observationId, accountId: other.accountId }],
      consentIds: [other.consentId],
      revocationJobs: [],
    }
  // The other profile's actual key must live in the same independent anchor directory.
  await cp(
    join(
      other.vault,
      createHash('sha256')
        .update('lilleri-local-vault-profile-v1\0')
        .update(other.profileId)
        .digest('hex'),
    ),
    join(
      f.vault,
      createHash('sha256')
        .update('lilleri-local-vault-profile-v1\0')
        .update(other.profileId)
        .digest('hex'),
    ),
    { recursive: true },
  )
  await Promise.all([
    f.journal.readAll(),
    f.journal.writeIntent(body, required(key)),
    f.journal.readAll(),
  ])
  expect(f.journal.currentRevision(other.profileId, other.connectionId)).toBe(1)
})
test('a real offline stale PGlite copy replays source intent without deleting other-source data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lilleri-source-offline-'))
  roots.push(root)
  const path = join(root, 'database'),
    snapshot = join(root, 'snapshot'),
    restored = join(root, 'restored'),
    local = await openDatabase({ driver: 'pglite', path })
  await migration(local.db)
  const f = await fixture(local)
  await local.close()
  await cp(path, snapshot, { recursive: true })
  const current = await openDatabase({ driver: 'pglite', path }),
    crypto = new ProfileEncryption(current.db, f.keys, () => renewed)
  await current.withProfile(f.profileId, (db) =>
    new SourceErasureService(db, f.profileId, crypto, f.journal, () => erased).erase(
      f.connectionId,
    ),
  )
  await reimport({ ...f, selected: current, encryption: crypto })
  await current.close()
  const later = join(root, 'later-snapshot'),
    laterRestore = join(root, 'later-restore')
  await cp(path, later, { recursive: true })
  await cp(snapshot, restored, { recursive: true })
  const stale = await openDatabase({ driver: 'pglite', path: restored }),
    restoreCrypto = new ProfileEncryption(stale.db, f.keys, () => renewed)
  try {
    const old = required(
      (
        await stale.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, f.transactionId))
      )[0],
    )
    expect((await restoreCrypto.decryptTransactionRow(stale.db, old)).description).toBe(
      'Acquisto sintetico riservato',
    )
    expect(
      await recoverSourceErasures(stale.db, f.journal, restoreCrypto, () => renewed),
    ).toMatchObject({ accountsRemoved: 1, transactionsRemoved: 1, safeToOpenLocally: true })
    expect(
      await stale.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.otherAccountId)),
    ).toHaveLength(1)
  } finally {
    await stale.close()
  }
  await cp(later, laterRestore, { recursive: true })
  const live = await openDatabase({ driver: 'pglite', path: laterRestore }),
    liveCrypto = new ProfileEncryption(live.db, f.keys, () => renewed)
  try {
    expect(
      await recoverSourceErasures(live.db, f.journal, liveCrypto, () => renewed),
    ).toMatchObject({ accountsRemoved: 0, transactionsRemoved: 0, safeToOpenLocally: true })
    const actual = required(
      (
        await live.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, f.transactionId))
      )[0],
    )
    expect(actual.amountMinor).toBe(-2000n)
  } finally {
    await live.close()
  }
})

test('source creation intents cancel and replay exact captured IDs without touching another source', async () => {
  const f = await fixture(),
    intentId = `creation_${randomUUID()}`,
    otherIntentId = `creation_${randomUUID()}`
  await handle.db.insert(connectionCreationIntents).values([
    {
      id: intentId,
      profileId: f.profileId,
      providerId: 'mock-italian',
      institutionId: 'pending-bank',
      connectionId: f.connectionId,
      consentId: `pending_${randomUUID()}`,
      basisDigest: 'a'.repeat(64),
      state: 'dispatching',
      createdAt: initial,
      dispatchedAt: initial,
      deadlineAt: '2026-10-04T12:00:00.000Z',
    },
    {
      id: otherIntentId,
      profileId: f.profileId,
      providerId: 'mock-italian',
      institutionId: 'other-bank',
      connectionId: f.otherId,
      consentId: `pending_${randomUUID()}`,
      basisDigest: 'b'.repeat(64),
      state: 'dispatching',
      createdAt: initial,
      dispatchedAt: initial,
      deadlineAt: '2026-10-04T12:00:00.000Z',
    },
  ])
  const hooks = {
    beforeErase: (db: DatabaseHandle['db'], pid: string, cid: string, at: string) =>
      cancelConnectionCreationIntents(db, pid, at, cid),
    replayCreationIntents: cancelRestoredConnectionCreationIntents,
  }
  const result = await handle.withProfile(f.profileId, (db) =>
    new SourceErasureService(db, f.profileId, f.encryption, f.journal, () => erased, hooks).erase(
      f.connectionId,
    ),
  )
  expect(result.signed.body.creationIntents.map((row) => row.id)).toEqual([intentId])
  expect(
    required(
      (
        await handle.db
          .select()
          .from(connectionCreationIntents)
          .where(eq(connectionCreationIntents.id, otherIntentId))
      )[0],
    ).state,
  ).toBe('dispatching')
  await handle.db
    .update(connectionCreationIntents)
    .set({ state: 'dispatching' })
    .where(eq(connectionCreationIntents.id, intentId))
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('replay is required')
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed, hooks),
  ).toMatchObject({ safeToOpenLocally: true })
  expect(
    required(
      (
        await handle.db
          .select()
          .from(connectionCreationIntents)
          .where(eq(connectionCreationIntents.id, intentId))
      )[0],
    ).state,
  ).toBe('cancelled')
  await handle.db
    .delete(connectionCreationIntents)
    .where(eq(connectionCreationIntents.id, intentId))
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed, hooks),
  ).rejects.toThrow('routing differs')
})
test('actual removal callback and authenticated epoch read fence snapshots; later same-ID generation is retained', async () => {
  const f = await fixture(),
    seen: { accounts: readonly string[]; transactions: readonly string[] }[] = []
  const before = await handle.withProfile(f.profileId, (db) =>
    readSourceFactEpochs(db, f.profileId, f.encryption, f.journal),
  )
  expect(before.find((row) => row.subjectId === f.transactionId)).toMatchObject({
    erasureRevision: 0,
    recordedAt: initial,
  })
  const hooks = {
    eraseFinancialReferences: async (
      _db: DatabaseHandle['db'],
      input: { accountIds: readonly string[]; transactionIds: readonly string[] },
    ) => {
      seen.push({ accounts: input.accountIds, transactions: input.transactionIds })
    },
  }
  await handle.withProfile(f.profileId, (db) =>
    new SourceErasureService(db, f.profileId, f.encryption, f.journal, () => erased, hooks).erase(
      f.connectionId,
    ),
  )
  expect(seen).toEqual([{ accounts: [f.accountId], transactions: [f.transactionId] }])
  await reimport(f)
  expect(
    (
      await handle.withProfile(f.profileId, (db) =>
        readSourceFactEpochs(db, f.profileId, f.encryption, f.journal),
      )
    ).find((row) => row.subjectId === f.transactionId),
  ).toMatchObject({ erasureRevision: 1, recordedAt: renewed })
  await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed, hooks)
  expect(seen[1]).toEqual({ accounts: [], transactions: [] })
})
test('multiple erasure epochs replay conservatively and export requires the complete monotone chain', async () => {
  const f = await fixture(),
    first = await f.erase()
  await reimport(f)
  const second = await handle.withProfile(f.profileId, (db) =>
    new SourceErasureService(db, f.profileId, f.encryption, f.journal, () => renewed).erase(
      f.connectionId,
    ),
  )
  await reimport(f)
  expect(second.signed.body.revision).toBe(2)
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ tombstonesReplayed: 2, accountsRemoved: 0, transactionsRemoved: 0 })
  const snapshot = {
      profile: { id: f.profileId },
      exportedAt: renewed,
      accounts: [],
      transactions: [],
      sourceErasures: [first, second],
    },
    verify = (input: unknown) => f.journal.verifyReceipt(input)
  expect(
    validateSourceErasureOwnershipExport(snapshot, verify).transactions.has(f.transactionId),
  ).toBe(true)
  expect(() =>
    validateSourceErasureOwnershipExport({ ...snapshot, sourceErasures: [second] }, verify),
  ).toThrow()
})

test('signed source-linked cache with no manual events survives new grant; borrowed proof cannot retain old response', async () => {
  const f = await fixture(),
    id = randomUUID(),
    old = {
      profileId: f.profileId,
      requestId: id,
      sourceAccountId: f.accountId,
      sourceConnectionId: f.connectionId,
      requestHash: 'c'.repeat(64),
      operation: 'import' as const,
      response: { inserted: 1, balanceMinor: '12000' },
      createdAt: initial,
    }
  await handle.db.insert(manualCommands).values(old)
  await handle.withProfile(f.profileId, (db) =>
    recordSourceFacts(
      db,
      f.journal,
      { ...f.facts, manualCommands: [{ id, accountId: f.accountId }] },
      initial,
      f.encryption,
    ),
  )
  const receipt = await f.erase()
  expect(receipt.signed.body.manualCommands).toEqual([{ id, accountId: f.accountId }])
  expect(
    await handle.db.select().from(manualCommands).where(eq(manualCommands.requestId, id)),
  ).toHaveLength(0)
  const consentId = await reimport(f)
  await handle.db
    .insert(manualCommands)
    .values({ ...old, response: { inserted: 2, balanceMinor: '11000' }, createdAt: renewed })
  await handle.withProfile(f.profileId, (db) =>
    recordSourceFacts(
      db,
      f.journal,
      {
        profileId: f.profileId,
        connectionId: f.connectionId,
        consentId,
        accountIds: [f.accountId],
        transactions: [],
        observations: [],
        manualCommands: [{ id, accountId: f.accountId }],
      },
      renewed,
      f.encryption,
    ),
  )
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ transactionsRemoved: 0, safeToOpenLocally: true })
  await handle.db.delete(manualCommands).where(eq(manualCommands.requestId, id))
  await handle.db.insert(manualCommands).values(old)
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('content differs')
})
test('manual source legacy cache and balances are erased; authenticated new audit cannot borrow old events', async () => {
  const f = await fixture(),
    id = randomUUID(),
    oldEventId = `event_${randomUUID()}`
  const state = {
      profileId: f.profileId,
      accountId: f.otherAccountId,
      openingOn: '2026-10-01',
      openingBalanceMinor: 5500n,
      revision: 1,
    },
    oldCommand = {
      profileId: f.profileId,
      requestId: id,
      requestHash: 'd'.repeat(64),
      operation: 'account' as const,
      response: { id: f.otherAccountId, balanceMinor: '5500' },
      createdAt: initial,
    }
  await handle.db.insert(manualAccounts).values(state)
  await handle.db.insert(manualCommands).values(oldCommand)
  const oldEvent = {
    id: oldEventId,
    profileId: f.profileId,
    accountId: f.otherAccountId,
    requestId: id,
    operation: 'opening' as const,
    transactionId: null,
    beforeMinor: 0n,
    afterMinor: 5500n,
    accountRevision: 1,
    reason: await f.encryption.encryptText(
      handle.db,
      manualReasonContext(f.profileId, oldEventId),
      'Saldo sintetico originale',
    ),
    createdAt: initial,
  }
  await handle.db.insert(manualBalanceEvents).values(oldEvent)
  const receipt = await handle.withProfile(f.profileId, (db) =>
    new SourceErasureService(db, f.profileId, f.encryption, f.journal, () => erased).erase(
      f.otherId,
    ),
  )
  expect(receipt.signed.body.manualCommands).toEqual([{ id, accountId: f.otherAccountId }])
  expect(
    await handle.db.select().from(manualCommands).where(eq(manualCommands.requestId, id)),
  ).toHaveLength(0)
  expect(
    await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.accountId)),
  ).toHaveLength(1)
  await handle.db
    .update(schema.connections)
    .set({ status: 'active' })
    .where(eq(schema.connections.id, f.otherId))
  await handle.db.insert(schema.accounts).values({
    ...f.account,
    id: f.otherAccountId,
    connectionId: f.otherId,
    providerAccountId: 'cash',
    kind: 'cash',
    balanceMinor: 7700n,
    balanceUpdatedAt: renewed,
  })
  await handle.db.insert(manualAccounts).values({ ...state, openingBalanceMinor: 7700n })
  await handle.db.insert(manualCommands).values({
    ...oldCommand,
    sourceAccountId: f.otherAccountId,
    sourceConnectionId: f.otherId,
    response: { id: f.otherAccountId, balanceMinor: '7700' },
    createdAt: renewed,
  })
  const eventId = `event_${randomUUID()}`
  await handle.db.insert(manualBalanceEvents).values({
    ...oldEvent,
    id: eventId,
    afterMinor: 7700n,
    reason: await f.encryption.encryptText(
      handle.db,
      manualReasonContext(f.profileId, eventId),
      'Saldo sintetico nuovo',
    ),
    createdAt: renewed,
  })
  await handle.withProfile(f.profileId, (db) =>
    recordSourceFacts(
      db,
      f.journal,
      {
        profileId: f.profileId,
        connectionId: f.otherId,
        consentId: null,
        accountIds: [f.otherAccountId],
        transactions: [],
        observations: [],
        manualCommands: [{ id, accountId: f.otherAccountId }],
      },
      renewed,
      f.encryption,
    ),
  )
  expect(
    await recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).toMatchObject({ accountsRemoved: 0, safeToOpenLocally: true })
  await handle.db.delete(manualBalanceEvents).where(eq(manualBalanceEvents.id, eventId))
  await handle.db.insert(manualBalanceEvents).values(oldEvent)
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('content differs')
})

test('legacy response-only financial cache needs owned membership; strict import counts and another source stay intact', async () => {
  const f = await fixture(),
    id = randomUUID(),
    other = randomUUID(),
    counts = randomUUID()
  await handle.db.insert(manualCommands).values([
    {
      profileId: f.profileId,
      requestId: id,
      requestHash: 'e'.repeat(64),
      operation: 'entry',
      response: { accountId: f.accountId, balanceMinor: '12000', amountMinor: '-1000' },
      createdAt: initial,
    },
    {
      profileId: f.profileId,
      requestId: other,
      requestHash: 'f'.repeat(64),
      operation: 'account',
      response: { id: f.otherAccountId, balanceMinor: '5500' },
      createdAt: initial,
    },
    {
      profileId: f.profileId,
      requestId: counts,
      requestHash: '1'.repeat(64),
      operation: 'import',
      response: { inserted: 1, updated: 0, unchanged: 0, rejected: 0, importedAt: initial },
      createdAt: initial,
    },
  ])
  const result = await f.erase()
  expect(result.signed.body.manualCommands).toEqual([{ id, accountId: f.accountId }])
  expect(
    await handle.db.select().from(manualCommands).where(eq(manualCommands.requestId, id)),
  ).toHaveLength(0)
  expect(
    await handle.db.select().from(manualCommands).where(eq(manualCommands.requestId, other)),
  ).toHaveLength(1)
  expect(
    await handle.db.select().from(manualCommands).where(eq(manualCommands.requestId, counts)),
  ).toHaveLength(1)
})
test('unknown orphan legacy financial cache never gains unrelated-source permission from missing audit rows', async () => {
  const f = await fixture()
  await handle.db.insert(manualCommands).values({
    profileId: f.profileId,
    requestId: randomUUID(),
    requestHash: '2'.repeat(64),
    operation: 'entry',
    response: { accountId: 'missing-source-account', balanceMinor: '12000' },
    createdAt: initial,
  })
  await expect(f.erase()).rejects.toThrow('legacy financial cache remains quarantined')
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('legacy financial cache remains quarantined')
  expect(
    await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.accountId)),
  ).toHaveLength(1)
})

test('moving captured old IDs into another connection cannot bypass the trusted replay selector', async () => {
  const f = await fixture(),
    old = required(
      (
        await handle.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, f.transactionId))
      )[0],
    )
  await f.erase()
  await handle.db.insert(schema.accounts).values({ ...f.account, connectionId: f.otherId })
  await handle.db.insert(schema.transactions).values({ ...old, connectionId: f.otherId })
  expect(
    (await f.encryption.decryptTransactionRow(handle.db, { ...old, connectionId: f.otherId }))
      .description,
  ).toBe('Acquisto sintetico riservato')
  await expect(
    recoverSourceErasures(handle.db, f.journal, f.encryption, () => renewed),
  ).rejects.toThrow('membership differs')
  expect(
    await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.otherAccountId)),
  ).toHaveLength(1)
})
