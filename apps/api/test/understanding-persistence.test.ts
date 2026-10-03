import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { connectionCreationIntents } from '../src/connection-creation-schema.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { manualAccounts } from '../src/manual-schema.js'
import {
  DEFAULT_UNDERSTANDING_CONFIGURATION,
  DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
} from '../src/runtime-config.js'
import { DemoService } from '../src/service.js'
import {
  recordSourceFacts,
  replaySourceErasure,
  SourceErasureService,
} from '../src/source-erasure.js'
import { canonicalSourceValue } from '../src/source-erasure-dto.js'
import {
  createSourceErasureJournal,
  type SourceErasureJournal,
} from '../src/source-erasure-journal.js'
import { sourceErasureReceipts } from '../src/source-erasure-schema.js'
import {
  eraseUnderstandingFinancialReferences,
  exportUnderstandingPersistence,
  UnderstandingPersistenceService,
} from '../src/understanding-persistence.js'
import {
  understandingMonthlySnapshots,
  understandingPreferenceEvents,
  understandingReferences,
} from '../src/understanding-persistence-schema.js'
import { validateUnderstandingOwnershipExport } from '../src/understanding-persistence-validation.js'
import { UnderstandingService } from '../src/understanding-service.js'

type App = Awaited<ReturnType<typeof createApp>>
let handle: DatabaseHandle
const roots: string[] = [],
  profiles: string[] = [],
  apps: App[] = [],
  journals: SourceErasureJournal[] = []
function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error('Expected owned synthetic fixture')
  return value
}
const now = '2026-10-03T12:00:00.000Z'
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  const result = await handle.db.execute(
    sql`select to_regclass('understanding_preferences') as name`,
  )
  if (!(result.rows[0] as { name: string | null }).name) {
    if (url) throw new Error('Freeze 0030 before PostgreSQL tests')
    await (
      handle.db as unknown as { $client: { exec: (value: string) => Promise<unknown> } }
    ).$client.exec(
      await readFile(
        new URL('../../../docs/drafts/0030_understanding_persistence.sql.draft', import.meta.url),
        'utf8',
      ),
    )
  }
  const sourceResult = await handle.db.execute(
    sql`select column_name as name from information_schema.columns where table_name='manual_commands' and column_name='source_account_id'`,
  )
  if (!sourceResult.rows.length && !url) {
    await (
      handle.db as unknown as { $client: { exec: (value: string) => Promise<unknown> } }
    ).$client.exec(
      await readFile(
        new URL(
          '../../../docs/implementation/drafts/0031_manual_command_source_generation.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    )
  }
})
afterAll(async () => {
  vi.restoreAllMocks()
  for (const app of apps) await app.close()
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  // Trusted disposable teardown owns these exact synthetic UUID profiles. Production journals
  // survive profile erasure; remove fixture-only receipts before destroying their temporary signer.
  if (profiles.length)
    await handle.db.transaction(async (db) => {
      await db.execute(
        sql`ALTER TABLE source_erasure_receipts DISABLE TRIGGER source_erasure_receipt_immutable`,
      )
      for (const id of profiles) {
        await db
          .delete(connectionCreationIntents)
          .where(eq(connectionCreationIntents.profileId, id))
        await db.delete(sourceErasureReceipts).where(eq(sourceErasureReceipts.profileId, id))
      }
      await db.execute(
        sql`ALTER TABLE source_erasure_receipts ENABLE TRIGGER source_erasure_receipt_immutable`,
      )
    })
  for (const journal of journals) journal.close()
  await handle.close()
  for (const root of roots) await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'lilleri-understanding-persistence-'))
  roots.push(root)
  const keys = await createLocalSyntheticKeyManagement({
      directory: join(root, 'vault'),
      mode: 'demo',
    }),
    encryption = new ProfileEncryption(handle.db, keys, () => now)
  const journal = await createSourceErasureJournal({
    directory: join(root, 'journal'),
    anchorDirectory: join(root, 'vault'),
    keys,
    mode: 'demo',
  })
  journals.push(journal)
  const profileId = `understanding_persist_${randomUUID()}`
  profiles.push(profileId)
  const app = await createApp({
    db: handle.db,
    profileId,
    demoMode: true,
    seed: false,
    now: () => now,
    encryption,
    sourceErasureJournal: journal,
    financialScope: handle.withProfile,
  })
  apps.push(app)
  const demo = new DemoService(
    handle.db,
    profileId,
    new MockItalianProvider(),
    () => now,
    encryption,
  )
  const understanding = new UnderstandingService(demo, {
    version: 'synthetic-policy-v1',
    ...DEFAULT_UNDERSTANDING_CONFIGURATION,
  })
  const persistence = new UnderstandingPersistenceService(
    understanding,
    encryption,
    DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
    journal,
  )
  return { app, profileId, understanding, persistence, encryption, journal, demo }
}
async function account(app: App, currency = 'EUR') {
  const result = await app.inject({
    method: 'POST',
    url: '/v1/manual/accounts',
    payload: {
      requestId: randomUUID(),
      name: 'Conto riservato sintetico',
      kind: 'cash',
      currency,
      openingBalanceMinor: '90071992547409931',
      openingOn: '2026-10-01',
    },
  })
  expect(result.statusCode, result.payload).toBe(201)
  return result.json<{ id: string }>().id
}
async function entry(app: App, accountId: string, amountMinor = '-250', currency = 'EUR') {
  const result = await app.inject({
    method: 'POST',
    url: '/v1/manual/transactions',
    payload: {
      requestId: randomUUID(),
      accountId,
      amountMinor,
      currency,
      kind: amountMinor.startsWith('-') ? 'expense' : 'income',
      bookedOn: '2026-10-02',
      description: 'Testo riservato non salvato nelle analisi',
      merchantName: 'Esercente sintetico',
    },
  })
  expect(result.statusCode, result.payload).toBe(201)
  return result.json<{ transactionId: string }>().transactionId
}
async function saveSnapshot(owned: Awaited<ReturnType<typeof fixture>>) {
  const monthly = await owned.understanding.monthly({ month: '2026-10' })
  return owned.persistence.captureMonthly({
    month: monthly.month,
    expectedInputDigest: monthly.capture.inputDigest,
    policyVersion: monthly.capture.policyVersion,
  })
}
async function ownershipScope(
  f: Awaited<ReturnType<typeof fixture>>,
  sourceReceiptIds: string[] = [],
) {
  const data = await f.demo.data()
  return {
    profileId: f.profileId,
    accountIds: data.accounts.map((row) => row.id),
    transactionIds: data.ledgerTransactions.map((row) => row.id),
    accounts: data.accounts,
    transactions: data.ledgerTransactions,
    sourceReceiptIds,
    exportedAt: now,
    profileCreatedAt: now,
  }
}
test('encrypts exact user preferences and audit; reopen, optimistic revision and explicit undo preserve history', async () => {
  const f = await fixture(),
    id = await account(f.app),
    initial = (await f.persistence.preferences()).preferences
  const changed = await f.persistence.updatePreferences({
    revision: initial.revision,
    expectedDigest: initial.digest,
    values: {
      accountIds: [id],
      bufferByCurrency: { EUR: '9007199254740993000' },
      horizon: { mode: 'next_salary', on: '2026-10-20' },
    },
  })
  expect(changed.revision).toBe(2)
  expect(changed.values.bufferByCurrency.EUR).toBe('9007199254740993000')
  expect((await f.persistence.preferences()).preferences).toEqual(changed)
  const events = (await f.persistence.preferences()).events
  expect(events).toHaveLength(1)
  const [row] = await handle.db
    .select()
    .from(understandingPreferenceEvents)
    .where(eq(understandingPreferenceEvents.profileId, f.profileId))
  expect(row?.payload).toMatch(/^lilleri:v1:/)
  expect(row?.payload).not.toContain('9007199254740993000')
  await expect(
    f.persistence.updatePreferences({
      revision: 1,
      expectedDigest: initial.digest,
      values: initial.values,
    }),
  ).rejects.toMatchObject({ status: 409 })
  const undone = await f.persistence.undoPreferences({
    revision: changed.revision,
    expectedDigest: changed.digest,
    eventId: required(events[0]).id,
  })
  expect(undone.revision).toBe(3)
  expect(undone.values).toEqual(initial.values)
  expect((await f.persistence.preferences()).events.map((row) => row.action)).toEqual([
    'undone',
    'changed',
  ])
  await expect(
    f.persistence.undoPreferences({
      revision: 3,
      expectedDigest: undone.digest,
      eventId: required(events[0]).id,
    }),
  ).rejects.toMatchObject({ status: 409 })
})
test('rejects foreign accounts, unknown currency buffers, unbounded/decimal/negative minor units and foreign undo', async () => {
  const f = await fixture(),
    other = await fixture(),
    foreign = await account(other.app),
    own = await account(f.app),
    current = (await f.persistence.preferences()).preferences
  const update = (values: unknown) =>
    f.persistence.updatePreferences({
      revision: current.revision,
      expectedDigest: current.digest,
      values,
    } as Parameters<typeof f.persistence.updatePreferences>[0])
  await expect(
    update({
      accountIds: [foreign],
      bufferByCurrency: { EUR: '0' },
      horizon: { mode: 'month_end' },
    }),
  ).rejects.toMatchObject({ status: 404 })
  for (const value of ['-1', '1.2', '01', '1'.repeat(41)])
    await expect(
      update({
        accountIds: [own],
        bufferByCurrency: { EUR: value },
        horizon: { mode: 'month_end' },
      }),
    ).rejects.toMatchObject({ status: 400 })
  await expect(
    update({ accountIds: [own], bufferByCurrency: { GBP: '0' }, horizon: { mode: 'month_end' } }),
  ).rejects.toMatchObject({ status: 400 })
  const theirs = (await other.persistence.preferences()).preferences,
    changed = await other.persistence.updatePreferences({
      revision: 1,
      expectedDigest: theirs.digest,
      values: {
        accountIds: [foreign],
        bufferByCurrency: { EUR: '0' },
        horizon: { mode: 'month_end' },
      },
    })
  const event = required((await other.persistence.preferences()).events[0])
  await expect(
    f.persistence.undoPreferences({
      revision: changed.revision,
      expectedDigest: changed.digest,
      eventId: event.id,
    }),
  ).rejects.toMatchObject({ status: 409 })
})
test('concurrent preference writers with one expected revision have one winner and one audited change', async () => {
  const f = await fixture(),
    id = await account(f.app),
    current = (await f.persistence.preferences()).preferences
  const requests = ['1', '2'].map(
    (buffer) => () =>
      f.persistence.updatePreferences({
        revision: 1,
        expectedDigest: current.digest,
        values: {
          accountIds: [id],
          bufferByCurrency: { EUR: buffer },
          horizon: { mode: 'month_end' },
        },
      }),
  )
  // PGlite has one session; PostgreSQL runs independent transactions through a real pool.
  const outcomes = await Promise.allSettled(requests.map((request) => request()))
  expect(outcomes.filter((row) => row.status === 'fulfilled')).toHaveLength(1)
  expect(
    outcomes
      .filter((row) => row.status === 'rejected')
      .map((row) => (row as PromiseRejectedResult).reason),
  ).toEqual([expect.objectContaining({ status: 409 })])
  expect((await f.persistence.preferences()).events).toHaveLength(1)
})
test('captures a real monthly calculation once, exact facts/formula/policy and digest; duplicate save reuses immutable original', async () => {
  const f = await fixture(),
    id = await account(f.app),
    tx = await entry(f.app, id, '-90071992547409931'),
    income = await entry(f.app, id, '300')
  const captured = await saveSnapshot(f),
    again = await saveSnapshot(f)
  expect(again.id).toBe(captured.id)
  expect(captured.capturedAt).toBe(now)
  expect(captured.payload?.result.insights[0]?.calculation.expensesMinor).toBe('90071992547409931')
  expect(captured.payload?.inputFacts.transactions.map((row) => row.id).sort()).toEqual(
    [tx, income].sort(),
  )
  expect(captured.payload?.inputFacts.transactions.find((row) => row.id === tx)?.amountMinor).toBe(
    '-90071992547409931',
  )
  expect(captured.payload?.policy.version).toBe('synthetic-policy-v1')
  const [stored] = await handle.db
    .select()
    .from(understandingMonthlySnapshots)
    .where(eq(understandingMonthlySnapshots.id, captured.id))
  expect(stored?.payload).toMatch(/^lilleri:v1:/)
  expect(stored?.payload).not.toContain(tx)
  expect(JSON.stringify(captured)).not.toContain('Testo riservato')
  expect((await f.persistence.history()).items.map((row) => row.id)).toEqual([captured.id])
})
test('stale ledger, privacy and policy guards reject save without constructing historic facts', async () => {
  const f = await fixture(),
    id = await account(f.app),
    tx = await entry(f.app, id),
    before = await f.understanding.monthly()
  await entry(f.app, id, '-100')
  const old = {
    month: before.month,
    expectedInputDigest: before.capture.inputDigest,
    policyVersion: before.capture.policyVersion,
  }
  await expect(f.persistence.captureMonthly(old)).rejects.toMatchObject({ status: 409 })
  const current = await f.understanding.monthly()
  await f.app.inject({
    method: 'PATCH',
    url: `/v1/transactions/${tx}/privacy`,
    payload: { revision: 1, quiet: true, private: false },
  })
  await expect(
    f.persistence.captureMonthly({
      month: current.month,
      expectedInputDigest: current.capture.inputDigest,
      policyVersion: current.capture.policyVersion,
    }),
  ).rejects.toMatchObject({ status: 409 })
  const fresh = await f.understanding.monthly()
  await expect(
    f.persistence.captureMonthly({
      month: fresh.month,
      expectedInputDigest: fresh.capture.inputDigest,
      policyVersion: 'obsolete-policy',
    }),
  ).rejects.toMatchObject({ status: 409 })
  expect((await f.persistence.history()).items).toEqual([])
})
test('generation recheck after read-only capture refuses a real intervening financial write', async () => {
  const f = await fixture(),
    id = await account(f.app)
  await entry(f.app, id)
  const before = await f.understanding.monthly(),
    original = handle.db.transaction.bind(handle.db)
  let intervene = true
  const spy = vi.spyOn(handle.db, 'transaction').mockImplementation(async (work, options) => {
    const result = await original(work, options)
    if (intervene && options?.accessMode === 'read only') {
      intervene = false
      await entry(f.app, id, '-777')
    }
    return result
  })
  try {
    await expect(
      f.persistence.captureMonthly({
        month: before.month,
        expectedInputDigest: before.capture.inputDigest,
        policyVersion: before.capture.policyVersion,
      }),
    ).rejects.toMatchObject({ status: 409 })
  } finally {
    spy.mockRestore()
  }
  expect(
    await handle.db
      .select()
      .from(understandingMonthlySnapshots)
      .where(eq(understandingMonthlySnapshots.profileId, f.profileId)),
  ).toHaveLength(0)
})
test('CURRENT quiet/private suppresses all historic references while rights export preserves encrypted original observation', async () => {
  const f = await fixture(),
    id = await account(f.app),
    tx = await entry(f.app, id),
    snapshot = await saveSnapshot(f)
  const hidden = await f.app.inject({
    method: 'PATCH',
    url: `/v1/transactions/${tx}/privacy`,
    payload: { revision: 1, quiet: false, private: true },
  })
  expect(hidden.statusCode).toBe(200)
  expect((await f.persistence.history()).items).toEqual([])
  const owned = await exportUnderstandingPersistence(handle.db, f.profileId, f.encryption)
  expect(owned.monthlySnapshots[0]?.id).toBe(snapshot.id)
  expect(owned.monthlySnapshots[0]?.payload?.result.insights[0]?.inputs.transactionIds).toContain(
    tx,
  )
  const clear = await f.app.inject({
    method: 'PATCH',
    url: `/v1/transactions/${tx}/privacy`,
    payload: { revision: 2, quiet: false, private: false },
  })
  expect(clear.statusCode).toBe(200)
  expect((await f.persistence.history()).items).toHaveLength(1)
})
test('history keyset pagination has no duplicates and bounded configured page size', async () => {
  const f = await fixture(),
    id = await account(f.app)
  await entry(f.app, id)
  const first = await saveSnapshot(f)
  await entry(f.app, id, '-3')
  const second = await saveSnapshot(f)
  const reader = new UnderstandingPersistenceService(
      f.understanding,
      f.encryption,
      { historyPageSize: 1 },
      f.journal,
    ),
    page1 = await reader.history()
  expect(page1.items).toHaveLength(1)
  expect(page1.nextCursor).not.toBeNull()
  const page2 = await reader.history({ before: required(page1.nextCursor) })
  expect(page2.items).toHaveLength(1)
  expect(page2.nextCursor).toBeNull()
  expect(new Set([...page1.items, ...page2.items].map((row) => row.id))).toEqual(
    new Set([first.id, second.id]),
  )
  await expect(reader.history({ before: 'arbitrary' })).rejects.toMatchObject({ status: 400 })
})
test('immutable snapshots/events and evidence refs reject direct mutation/deletion; foreign scoped reads expose nothing', async () => {
  const f = await fixture(),
    id = await account(f.app)
  await entry(f.app, id)
  const snapshot = await saveSnapshot(f)
  await expect(
    handle.db
      .update(understandingMonthlySnapshots)
      .set({ month: '2020-01' })
      .where(eq(understandingMonthlySnapshots.id, snapshot.id)),
  ).rejects.toThrow()
  await expect(
    handle.db
      .delete(understandingMonthlySnapshots)
      .where(eq(understandingMonthlySnapshots.id, snapshot.id)),
  ).rejects.toThrow()
  await expect(
    handle.db
      .delete(understandingReferences)
      .where(eq(understandingReferences.targetId, snapshot.id)),
  ).rejects.toThrow()
  const foreign = await fixture()
  expect(
    await handle.withProfile(foreign.profileId, (db) =>
      db
        .select()
        .from(understandingMonthlySnapshots)
        .where(eq(understandingMonthlySnapshots.profileId, f.profileId)),
    ),
  ).toEqual([])
})
test('rights export validator checks exact formula, scope, snapshot hash and preference revision continuity', async () => {
  const f = await fixture(),
    id = await account(f.app)
  await entry(f.app, id)
  await saveSnapshot(f)
  const owned = await exportUnderstandingPersistence(handle.db, f.profileId, f.encryption),
    scope = await ownershipScope(f)
  expect(validateUnderstandingOwnershipExport(owned, scope)).toEqual(owned)
  const tamper = structuredClone(owned)
  required(
    required(required(tamper.monthlySnapshots[0]).payload).result.insights[0],
  ).value.netFlow.amountMinor = '999'
  expect(() => validateUnderstandingOwnershipExport(tamper, scope)).toThrow()
  expect(() =>
    validateUnderstandingOwnershipExport(owned, { ...scope, profileId: 'foreign' }),
  ).toThrow()
  expect(() =>
    validateUnderstandingOwnershipExport(owned, { ...scope, transactionIds: [] }),
  ).toThrow()
})
test('signed old-source erasure redacts captured payloads and choices, records receipt, and retains whole-profile erase cascade', async () => {
  const f = await fixture(),
    id = await account(f.app),
    tx = await entry(f.app, id),
    monthly = await saveSnapshot(f),
    current = (await f.persistence.preferences()).preferences
  await f.persistence.updatePreferences({
    revision: 1,
    expectedDigest: current.digest,
    values: { accountIds: [id], bufferByCurrency: { EUR: '50' }, horizon: { mode: 'month_end' } },
  })
  const [ownedAccount] = await handle.db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, id))
  if (!ownedAccount) throw new Error('fixture account missing')
  const service = new SourceErasureService(
    handle.db,
    f.profileId,
    f.encryption,
    f.journal,
    () => now,
    {
      eraseFinancialReferences: (db, input) =>
        eraseUnderstandingFinancialReferences(db, input, f.encryption),
    },
  )
  await service.erase(ownedAccount.connectionId)
  const ownership = await exportUnderstandingPersistence(handle.db, f.profileId, f.encryption),
    receiptIds = (
      await handle.db
        .select()
        .from(sourceErasureReceipts)
        .where(eq(sourceErasureReceipts.profileId, f.profileId))
    ).map((row) => row.id)
  expect(ownership.monthlySnapshots[0]).toMatchObject({
    id: monthly.id,
    payload: null,
    sourceReceiptId: receiptIds[0],
  })
  expect(ownership.preferences.values.accountIds).toEqual([])
  expect(ownership.preferenceEvents[0]?.payload).toBeNull()
  expect(ownership.preferenceEvents.at(-1)?.action).toBe('source_erased')
  expect((await f.persistence.history()).items).toEqual([])
  expect(
    validateUnderstandingOwnershipExport(ownership, await ownershipScope(f, receiptIds)),
  ).toEqual(ownership)
  expect(
    await handle.db.select().from(schema.transactions).where(eq(schema.transactions.id, tx)),
  ).toEqual([])
  await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, f.profileId))
  expect(
    await handle.db
      .select()
      .from(understandingMonthlySnapshots)
      .where(eq(understandingMonthlySnapshots.profileId, f.profileId)),
  ).toEqual([])
})

test('recomputed payload hashes cannot conceal an omitted expense, cross-currency unresolved input, duplicate rows or forged source membership', async () => {
  const f = await fixture(),
    eur = await account(f.app),
    gbp = await account(f.app, 'GBP'),
    expense = await entry(f.app, eur),
    foreignCurrency = await entry(f.app, gbp, '-500', 'GBP')
  await saveSnapshot(f)
  const original = await exportUnderstandingPersistence(handle.db, f.profileId, f.encryption),
    scope = await ownershipScope(f)
  expect(validateUnderstandingOwnershipExport(original, scope)).toEqual(original)
  const rehash = (value: typeof original) => {
    for (const row of value.monthlySnapshots)
      if (row.payload)
        row.digest = createHash('sha256').update(canonicalSourceValue(row.payload)).digest('hex')
    return value
  }
  const omitted = structuredClone(original),
    insight = required(required(omitted.monthlySnapshots[0]).payload).result.insights.find(
      (row) => row.currency === 'EUR',
    )
  if (!insight) throw new Error('Expected actual EUR insight')
  expect(insight.inputs.expenseTransactionIds).toEqual([expense])
  insight.inputs.expenseTransactionIds = []
  insight.calculation.expensesMinor = '0'
  insight.value.netSpending.amountMinor = '0'
  insight.value.netFlow.amountMinor = '0'
  expect(() => validateUnderstandingOwnershipExport(rehash(omitted), scope)).toThrow()
  const wrongCurrency = structuredClone(original),
    eurInsight = required(required(wrongCurrency.monthlySnapshots[0]).payload).result.insights.find(
      (row) => row.currency === 'EUR',
    )
  if (!eurInsight) throw new Error('Expected actual EUR insight')
  eurInsight.inputs.unresolvedTransactionIds = [foreignCurrency]
  eurInsight.calculation.unresolvedDebitsMinor = '500'
  expect(() => validateUnderstandingOwnershipExport(rehash(wrongCurrency), scope)).toThrow()
  const duplicate = structuredClone(original),
    duplicateInsight = required(required(duplicate.monthlySnapshots[0]).payload).result.insights[0]
  if (!duplicateInsight) throw new Error('Expected actual insight')
  duplicateInsight.inputs.transactionIds.push(required(duplicateInsight.inputs.transactionIds[0]))
  duplicateInsight.calculation.bookedTransactionCount++
  expect(() => validateUnderstandingOwnershipExport(rehash(duplicate), scope)).toThrow()
  const swappedAccounts = scope.accounts.map((row) => ({ ...row, connectionId: 'foreign-source' }))
  expect(() =>
    validateUnderstandingOwnershipExport(original, { ...scope, accounts: swappedAccounts }),
  ).toThrow()
  const future = structuredClone(original),
    futureSnapshot = required(future.monthlySnapshots[0])
  futureSnapshot.capturedAt = '2026-10-04T12:00:00.000Z'
  required(futureSnapshot.payload).result.capture.capturedAt = futureSnapshot.capturedAt
  expect(() => validateUnderstandingOwnershipExport(rehash(future), scope)).toThrow()
})

test('actual scoped HTTP routes persist and reopen choices, enforce fresh capture guards, and export ownership history', async () => {
  const f = await fixture(),
    id = await account(f.app)
  await entry(f.app, id)
  const get = await f.app.inject({ url: '/v1/understanding/preferences' })
  expect(get.statusCode, get.payload).toBe(200)
  const current = get.json<{ preferences: { revision: number; digest: string } }>().preferences
  const patch = await f.app.inject({
    method: 'PATCH',
    url: '/v1/understanding/preferences',
    payload: {
      revision: current.revision,
      expectedDigest: current.digest,
      values: {
        accountIds: [id],
        bufferByCurrency: { EUR: '9007199254740993000' },
        horizon: { mode: 'next_salary', on: '2026-10-20' },
      },
    },
  })
  expect(patch.statusCode, patch.payload).toBe(200)
  expect(
    (await f.app.inject({ url: '/v1/understanding/preferences' })).json().preferences.values
      .bufferByCurrency.EUR,
  ).toBe('9007199254740993000')
  const month = await f.app.inject({ url: '/v1/insights/monthly' })
  expect(month.statusCode, month.payload).toBe(200)
  const response = month.json<{
    month: string
    capture: { inputDigest: string; policyVersion: string }
  }>()
  const saved = await f.app.inject({
    method: 'POST',
    url: '/v1/insights/monthly/snapshots',
    payload: {
      month: response.month,
      expectedInputDigest: response.capture.inputDigest,
      policyVersion: response.capture.policyVersion,
    },
  })
  expect(saved.statusCode, saved.payload).toBe(200)
  const history = await f.app.inject({ url: '/v1/insights/monthly/history' })
  expect(history.statusCode, history.payload).toBe(200)
  expect(history.json().items).toHaveLength(1)
  const exported = await f.app.inject({ url: '/v1/export' })
  expect(exported.statusCode, exported.payload).toBe(200)
  expect(exported.json().understandingPersistence.monthlySnapshots[0].id).toBe(saved.json().id)
  const events = (await f.app.inject({ url: '/v1/understanding/preferences' })).json().events
  const undo = await f.app.inject({
    method: 'POST',
    url: '/v1/understanding/preferences/undo',
    payload: {
      revision: patch.json().revision,
      expectedDigest: patch.json().digest,
      eventId: events[0].id,
    },
  })
  expect(undo.statusCode, undo.payload).toBe(200)
  expect(undo.json().values.accountIds).toEqual([])
})

test('complete newly captured summary invokes its producer once; duplicate save and partial coverage cannot emit a summary', async () => {
  const f = await fixture(),
    id = await account(f.app)
  await entry(f.app, id)
  const produced: string[] = [],
    publisher = new UnderstandingPersistenceService(
      f.understanding,
      f.encryption,
      DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
      f.journal,
      async (_db, saved) => {
        produced.push(saved.id)
      },
    )
  const monthly = await f.understanding.monthly(),
    input = {
      month: monthly.month,
      expectedInputDigest: monthly.capture.inputDigest,
      policyVersion: monthly.capture.policyVersion,
    }
  const saved = await publisher.captureMonthly(input)
  await publisher.captureMonthly(input)
  expect(produced).toEqual([saved.id])
  const other = await fixture()
  await account(other.app)
  const prior = await other.understanding.monthly({ month: '2026-09' })
  const partialPublisher = new UnderstandingPersistenceService(
    other.understanding,
    other.encryption,
    DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
    other.journal,
    async (_db, saved) => {
      produced.push(saved.id)
    },
  )
  await partialPublisher.captureMonthly({
    month: prior.month,
    expectedInputDigest: prior.capture.inputDigest,
    policyVersion: prior.capture.policyVersion,
  })
  expect(prior.insights[0]?.status).toBe('partial')
  expect(produced).toEqual([saved.id])
})

test('receipt replay preserves a newly authenticated same-ID generation and its newly captured snapshot', async () => {
  const f = await fixture(),
    id = await account(f.app),
    txId = await entry(f.app, id),
    old = await saveSnapshot(f)
  const [accountRow] = await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id)),
    [transactionRow] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId)),
    [manualRow] = await handle.db
      .select()
      .from(manualAccounts)
      .where(eq(manualAccounts.accountId, id))
  const ownedAccount = required(accountRow),
    ownedTransaction = required(transactionRow),
    manual = required(manualRow)
  const hooks = {
    eraseFinancialReferences: (
      db: DatabaseHandle['db'],
      input: Parameters<typeof eraseUnderstandingFinancialReferences>[1],
    ) => eraseUnderstandingFinancialReferences(db, input, f.encryption),
  }
  await new SourceErasureService(
    handle.db,
    f.profileId,
    f.encryption,
    f.journal,
    () => now,
    hooks,
  ).erase(ownedAccount.connectionId)
  const signed = required(
    (await f.journal.readAll()).find((receipt) => receipt.body.profileId === f.profileId),
  )
  await handle.db.transaction(async (db) => {
    await db
      .update(schema.connections)
      .set({ status: 'active' })
      .where(eq(schema.connections.id, ownedAccount.connectionId))
    await db.insert(schema.accounts).values(ownedAccount)
    await db.insert(manualAccounts).values(manual)
    await db
      .insert(schema.transactions)
      .values({ ...ownedTransaction, revision: ownedTransaction.revision + 1 })
    await recordSourceFacts(
      db,
      f.journal,
      {
        profileId: f.profileId,
        connectionId: ownedAccount.connectionId,
        consentId: null,
        accountIds: [id],
        transactions: [{ id: txId, accountId: id }],
        observations: [],
      },
      now,
      f.encryption,
    )
  })
  const fresh = await saveSnapshot(f)
  expect(fresh.id).not.toBe(old.id)
  expect(
    fresh.payload?.references.every((ref) => ref.erasureRevision >= signed.body.revision),
  ).toBe(true)
  await handle.db.transaction((db) =>
    replaySourceErasure(db, signed, f.encryption, f.journal, now, hooks),
  )
  const owned = await exportUnderstandingPersistence(handle.db, f.profileId, f.encryption)
  expect(owned.monthlySnapshots.find((row) => row.id === old.id)?.payload).toBeNull()
  expect(owned.monthlySnapshots.find((row) => row.id === fresh.id)?.payload).not.toBeNull()
  expect((await f.persistence.history()).items.map((row) => row.id)).toEqual([fresh.id])
  expect(
    await handle.db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)),
  ).toHaveLength(1)
})

test('owned receipt foreign key rejects an event borrowing another profile source receipt', async () => {
  const f = await fixture(),
    other = await fixture(),
    id = await account(other.app),
    [accountRow] = await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, id))
  await new SourceErasureService(
    handle.db,
    other.profileId,
    other.encryption,
    other.journal,
    () => now,
    {
      eraseFinancialReferences: (db, input) =>
        eraseUnderstandingFinancialReferences(db, input, other.encryption),
    },
  ).erase(required(accountRow).connectionId)
  const [receipt] = await handle.db
    .select()
    .from(sourceErasureReceipts)
    .where(eq(sourceErasureReceipts.profileId, other.profileId))
  const payload = await handle.db.transaction((db) =>
    f.encryption.encryptJson(
      db,
      {
        profileId: f.profileId,
        table: 'understanding_preference_events',
        column: 'payload',
        rowId: 'foreign_receipt_fixture',
      },
      {},
    ),
  )
  await expect(
    handle.db.insert(understandingPreferenceEvents).values({
      id: 'foreign_receipt_fixture',
      profileId: f.profileId,
      revision: 2,
      action: 'source_erased',
      payload,
      digest: '0'.repeat(64),
      sourceReceiptId: required(receipt).id,
      occurredAt: now,
    }),
  ).rejects.toThrow()
})
