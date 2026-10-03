import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { DEFAULT_RECURRING_POLICY } from '@lilleri/engines'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { PrivacyService } from '../src/privacy.js'
import { RecurringService } from '../src/recurring.js'
import { recurringPreferenceEvents, recurringPreferences } from '../src/recurring-schema.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle, vault: string, encryption: ProfileEncryption
const profiles: string[] = [],
  apps: Awaited<ReturnType<typeof createApp>>[] = []
const fixed = '2026-10-03T12:00:00.000Z'
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  const exists = await handle.db.execute(sql`SELECT to_regclass('recurring_preferences') AS name`)
  if (!(exists.rows[0] as { name: string | null }).name) {
    // Draft DDL is only exercised on disposable PGlite before review/freeze.
    if (url) throw new Error('Freeze migration 0025 before PostgreSQL integration')
    const client = (
      handle.db as unknown as { $client: { exec: (sql: string) => Promise<unknown> } }
    ).$client
    await client.exec(
      await readFile(
        new URL('../../../docs/implementation/drafts/0025_recurring_feedback.sql', import.meta.url),
        'utf8',
      ),
    )
  }
  vault = await mkdtemp(join(tmpdir(), 'lilleri-recurring-vault-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' }),
    () => fixed,
  )
})
afterAll(async () => {
  for (const app of apps) await app.close()
  if (handle) {
    for (const id of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.close()
  }
  if (vault) await rm(vault, { recursive: true, force: true })
})
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected synthetic fixture value')
  return value
}
async function fixture(
  dates = ['2026-07-10', '2026-08-10', '2026-09-10'],
  kind = 'expense',
  amount = '-1200',
) {
  const profileId = `recurring_${randomUUID()}`
  profiles.push(profileId)
  let now = fixed
  const app = await createApp({
    db: handle.db,
    profileId,
    demoMode: true,
    now: () => now,
    encryption,
    financialScope: handle.withProfile,
  })
  apps.push(app)
  const accountResponse = await app.inject({
    method: 'POST',
    url: '/v1/manual/accounts',
    payload: {
      requestId: randomUUID(),
      name: 'Conto sintetico',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '100000',
      openingOn: '2026-01-01',
    },
  })
  expect(accountResponse.statusCode, accountResponse.payload).toBe(201)
  const accountId = accountResponse.json<{ id: string }>().id,
    ids: string[] = []
  for (const bookedOn of dates) {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/manual/transactions',
      payload: {
        requestId: randomUUID(),
        accountId,
        amountMinor: amount,
        currency: 'EUR',
        kind,
        bookedOn,
        description: 'Osservazione sintetica',
        merchantName: 'Servizio sintetico',
      },
    })
    expect(response.statusCode, response.payload).toBe(201)
    ids.push(response.json<{ transactionId: string }>().transactionId)
  }
  const run = <T>(fn: (service: RecurringService) => Promise<T>) =>
    handle.withProfile(profileId, (db) =>
      fn(
        new RecurringService(
          new DemoService(db, profileId, new MockItalianProvider(), () => now, encryption),
          DEFAULT_RECURRING_POLICY,
        ),
      ),
    )
  return {
    app,
    profileId,
    accountId,
    ids,
    run,
    setNow: (value: string) => {
      now = value
    },
  }
}

test('real scoped encrypted ledger returns conservative estimates and opaque identities', async () => {
  const owned = await fixture(),
    result = await owned.run((service) => service.list())
  expect(result.items).toHaveLength(1)
  const item = required(result.items[0])
  expect(item).toMatchObject({
    kind: 'recurring_bill',
    frequency: 'monthly',
    revision: 1,
    isEstimate: true,
    confidence: null,
    expectedAmount: { amountMinor: '-1200', currency: 'EUR' },
    nextOn: '2026-10-10',
  })
  expect(item.forecast.occurrences.map((item) => item.on)).toEqual(['2026-10-10', '2026-11-10'])
  expect(JSON.stringify(result)).not.toContain('legacy_merchant')
  expect(result.alertsAvailable).toBe(false)
})
test('feedback persists one timestamp, audit and compensating undo; stale write leaves history unchanged', async () => {
  const owned = await fixture(),
    before = await owned.run((service) => service.list()),
    id = required(before.items[0]).id
  const changed = await owned.run((service) =>
    service.change(id, {
      revision: 1,
      status: 'confirmed',
      kind: 'subscription',
      frequency: 'quarterly',
    }),
  )
  expect(changed).toMatchObject({ revision: 2, updatedAt: fixed })
  let exported = await owned.run((service) => service.ownedExport())
  expect(exported.recurringPreferences[0]).toMatchObject({
    revision: 2,
    createdAt: fixed,
    updatedAt: fixed,
  })
  expect(exported.recurringPreferenceEvents[0]).toMatchObject({
    revision: 2,
    action: 'updated',
    occurredAt: fixed,
  })
  await expect(
    owned.run((service) => service.change(id, { revision: 1, status: 'not_recurring' })),
  ).rejects.toMatchObject({ status: 409 })
  const undone = await owned.run((service) => service.undo(id, 2))
  expect(undone.revision).toBe(3)
  exported = await owned.run((service) => service.ownedExport())
  expect(required(exported.recurringPreferences[0]).choice.status).toBe('observed')
  expect(exported.recurringPreferenceEvents).toHaveLength(2)
  expect(required((await owned.run((service) => service.list())).items[0]).frequency).toBe(
    'monthly',
  )
  await expect(owned.run((service) => service.undo(id, 3))).rejects.toMatchObject({ status: 409 })
})
test('not-recurring and corrected frequency preserve observed liabilities with explicit uncertainty', async () => {
  const owned = await fixture(),
    id = required((await owned.run((service) => service.list())).items[0]).id
  await owned.run((service) => service.change(id, { revision: 1, status: 'not_recurring' }))
  const context = await owned.run((service) => service.liabilityContext())
  expect(required(context.series[0]).frequency).toBe('monthly')
  expect(context.uncertainTransactionIds).toEqual([...owned.ids].sort())
  await owned.run((service) =>
    service.change(id, { revision: 2, status: 'confirmed', frequency: 'annual' }),
  )
  expect(
    (await owned.run((service) => service.liabilityContext())).uncertainTransactionIds,
  ).toEqual([...owned.ids].sort())
})
test('quiet/private suppress the whole public series but retain private cash coverage', async () => {
  const owned = await fixture()
  const id = required((await owned.run((service) => service.list())).items[0]).id
  await handle.withProfile(owned.profileId, (db) =>
    new PrivacyService(db, owned.profileId, () => fixed).updateTransaction(
      required(owned.ids[0]),
      1,
      {
        quiet: false,
        private: true,
      },
    ),
  )
  expect((await owned.run((service) => service.list())).items).toEqual([])
  const context = await owned.run((service) => service.liabilityContext())
  expect(context.series).toHaveLength(1)
  expect(context.excludedTransactionIds).toContain(owned.ids[0])
  await expect(
    owned.run((service) => service.change(id, { revision: 1, status: 'not_recurring' })),
  ).rejects.toMatchObject({ status: 404 })
})
test('backward clocks reject atomically and each revision captures now once', async () => {
  const owned = await fixture(),
    id = required((await owned.run((service) => service.list())).items[0]).id
  await owned.run((service) => service.change(id, { revision: 1, status: 'confirmed' }))
  owned.setNow('2026-10-03T11:59:59.000Z')
  await expect(
    owned.run((service) => service.change(id, { revision: 2, status: 'not_recurring' })),
  ).rejects.toMatchObject({ status: 409 })
  const exported = await owned.run((service) => service.ownedExport())
  expect(exported.recurringPreferenceEvents).toHaveLength(1)
  expect(required(exported.recurringPreferences[0]).revision).toBe(2)
})
test('single observed movement can be explicitly marked without inventing automatic regularity', async () => {
  const owned = await fixture(['2026-09-10'])
  expect((await owned.run((service) => service.list())).items).toEqual([])
  const marked = await owned.run((service) =>
    service.markTransaction(required(owned.ids[0]), {
      revision: 1,
      status: 'confirmed',
      kind: 'subscription',
      frequency: 'monthly',
    }),
  )
  const item = required((await owned.run((service) => service.list())).items[0])
  expect(item).toMatchObject({
    id: marked.id,
    status: 'confirmed',
    revision: 2,
    confidenceWord: 'user_confirmed',
  })
  await owned.run((service) => service.undo(marked.id, 2))
  expect((await owned.run((service) => service.list())).items).toEqual([])
})
test('unknown positive income is never fabricated into salary and outgoing salary choice rejects', async () => {
  const income = await fixture(undefined, 'income', '240000')
  expect((await income.run((service) => service.list())).items).toEqual([])
  await income.run((service) =>
    service.markTransaction(required(income.ids[0]), {
      revision: 1,
      status: 'confirmed',
      kind: 'salary',
      frequency: 'monthly',
    }),
  )
  expect(required((await income.run((service) => service.list())).items[0]).kind).toBe('salary')
  const expense = await fixture()
  await expect(
    expense.run((service) =>
      service.change(`recurring_nonexistent`, { revision: 1, status: 'confirmed', kind: 'salary' }),
    ),
  ).rejects.toMatchObject({ status: 404 })
  const id = required((await expense.run((service) => service.list())).items[0]).id
  await expect(
    expense.run((service) =>
      service.change(id, { revision: 1, status: 'confirmed', kind: 'salary' }),
    ),
  ).rejects.toMatchObject({ status: 400 })
})
test('ciphertext state, selector and immutable history cannot be copied across profile or row', async () => {
  const owned = await fixture(),
    other = await fixture(),
    id = required((await owned.run((service) => service.list())).items[0]).id
  await owned.run((service) =>
    service.change(id, { revision: 1, status: 'confirmed', kind: 'subscription' }),
  )
  const [preference] = await handle.db
    .select()
    .from(recurringPreferences)
    .where(eq(recurringPreferences.id, id))
  const [event] = await handle.db
    .select()
    .from(recurringPreferenceEvents)
    .where(eq(recurringPreferenceEvents.preferenceId, id))
  expect(JSON.stringify(required(preference).state)).not.toContain('subscription')
  expect(JSON.stringify(required(event).snapshot)).not.toContain(owned.ids[0])
  await expect(
    other.run((service) => service.change(id, { revision: 2, status: 'not_recurring' })),
  ).rejects.toMatchObject({ status: 404 })
  await handle.withProfile(other.profileId, async (db) => {
    expect(
      await db.select().from(recurringPreferences).where(eq(recurringPreferences.id, id)),
    ).toEqual([])
    await expect(
      db
        .update(recurringPreferences)
        .set({ revision: 3 })
        .where(eq(recurringPreferences.id, id))
        .returning(),
    ).resolves.toEqual([])
  })
  await expect(
    handle.db
      .update(recurringPreferenceEvents)
      .set({ action: 'undone' })
      .where(eq(recurringPreferenceEvents.id, required(event).id)),
  ).rejects.toThrow()
  await expect(
    handle.db
      .delete(recurringPreferenceEvents)
      .where(eq(recurringPreferenceEvents.id, required(event).id)),
  ).rejects.toThrow()
  await expect(
    encryption.decryptJson(
      handle.db,
      {
        profileId: owned.profileId,
        table: 'recurring_preferences',
        column: 'state',
        rowId: 'wrong-row',
      },
      required(preference).state._lilleriEncrypted as string,
    ),
  ).rejects.toThrow()
})
test('parent account erasure cascades preferences and immutable history without direct-delete bypass', async () => {
  const owned = await fixture(),
    id = required((await owned.run((service) => service.list())).items[0]).id
  await owned.run((service) => service.change(id, { revision: 1, status: 'confirmed' }))
  await handle.db.delete(schema.accounts).where(eq(schema.accounts.id, owned.accountId))
  expect(
    await handle.db
      .select()
      .from(recurringPreferenceEvents)
      .where(eq(recurringPreferenceEvents.preferenceId, id)),
  ).toEqual([])
  expect(
    await handle.db.select().from(recurringPreferences).where(eq(recurringPreferences.id, id)),
  ).toEqual([])
})

test('explicit savings plan and finite installments persist through HTTP with strict DTO validation', async () => {
  const transfer = await fixture(['2026-09-10'], 'transfer')
  const declared = await transfer.app.inject({
    method: 'POST',
    url: `/v1/transactions/${transfer.ids[0]}/recurring`,
    payload: { revision: 1, status: 'confirmed', kind: 'recurring_transfer', frequency: 'monthly' },
  })
  expect(declared.statusCode, declared.payload).toBe(200)
  expect((await transfer.run((service) => service.list())).items[0]?.kind).toBe(
    'recurring_transfer',
  )
  const installments = await fixture(),
    id = (await installments.run((service) => service.list())).items[0]?.id
  if (!id) throw new Error('Expected synthetic recurring group')
  const invalid = await installments.app.inject({
    method: 'PATCH',
    url: `/v1/recurring/${id}`,
    payload: { revision: 1, status: 'confirmed', kind: 'installment', frequency: 'monthly' },
  })
  expect(invalid.statusCode).toBe(400)
  const valid = await installments.app.inject({
    method: 'PATCH',
    url: `/v1/recurring/${id}`,
    payload: {
      revision: 1,
      status: 'confirmed',
      kind: 'installment',
      frequency: 'monthly',
      installmentCount: 5,
      installmentIndex: 3,
    },
  })
  expect(valid.statusCode, valid.payload).toBe(200)
  const item = (await installments.run((service) => service.list())).items[0]
  expect(item).toMatchObject({ kind: 'installment', remainingInstallments: 2, canUndo: true })
  expect(item?.forecast.occurrences).toHaveLength(2)
  const stale = await installments.app.inject({
    method: 'POST',
    url: `/v1/recurring/${id}/undo`,
    payload: { revision: 1 },
  })
  expect(stale.statusCode).toBe(409)
  const foreign = await transfer.app.inject({
    url: `/v1/recurring/${id}/undo`,
    method: 'POST',
    payload: { revision: 2 },
  })
  expect(foreign.statusCode).toBe(404)
})
