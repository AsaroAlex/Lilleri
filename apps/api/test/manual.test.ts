import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { ITALIAN_TRANSACTIONS, MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { manualAccounts, manualBalanceEvents, manualCommands } from '../src/manual-schema.js'
import { ManualService } from '../src/manual-service.js'

type App = Awaited<ReturnType<typeof createApp>>
interface ManualAccount {
  id: string
  name: string
  kind: 'cash' | 'current' | 'card' | 'savings'
  currency: 'EUR' | 'JPY' | 'KWD'
  openingOn: string
  openingBalanceMinor: string
  balanceMinor: string
  revision: number
}
interface Entry {
  transactionId: string
  accountId: string
  accountRevision: number
  transactionRevision: number
  amountMinor: string
  currency: string
  balanceMinor: string
  status: 'booked' | 'reversed'
}
interface FinancialSnapshot {
  accounts: { id: string; balance: { amountMinor: string; currency: string } }[]
  transactions: {
    id: string
    source: string
    status: string
    amount: { amountMinor: string; currency: string }
  }[]
  connections: { id: string; providerId: string; lastSyncedAt: string | null }[]
  analysis: {
    summaries: {
      currency: string
      balance: { amountMinor: string }
      spend: { amountMinor: string }
      income: { amountMinor: string }
    }[]
    matches: {
      id: string
      type: string
      revision: string
      state: string
      transactionIds: string[]
    }[]
  }
}
let handle: DatabaseHandle
const profiles: string[] = [],
  apps: App[] = []
const now = () => '2026-10-03T12:00:00.000Z'
const csv = (rows: string) => `id,date,amount,currency,description,merchant,reference\n${rows}`
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const id of profiles) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, id))
  }
  await handle.close()
})
async function setup(provider = new MockItalianProvider(), seed = false) {
  const profileId = `manual_test_${randomUUID()}`
  profiles.push(profileId)
  const app = await createApp({ db: handle.db, demoMode: true, profileId, seed, provider, now })
  apps.push(app)
  return { app, profileId, service: new ManualService(handle.db, profileId, now) }
}
async function createAccount(app: App, overrides: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/manual/accounts',
    payload: {
      requestId: randomUUID(),
      name: 'Contanti',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '10000',
      openingOn: '2026-10-01',
      ...overrides,
    },
  })
  expect(response.statusCode, response.payload).toBe(201)
  return response.json<ManualAccount>()
}
async function entry(app: App, account: ManualAccount, overrides: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/manual/transactions',
    payload: {
      requestId: randomUUID(),
      accountId: account.id,
      amountMinor: '-250',
      currency: account.currency,
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Caffè',
      ...overrides,
    },
  })
  expect(response.statusCode, response.payload).toBe(201)
  return response.json<Entry>()
}
async function financial(app: App) {
  const response = await app.inject({ url: '/v1/demo' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json<FinancialSnapshot>()
}
async function account(app: App, id: string) {
  const rows = (await app.inject({ url: '/v1/manual/accounts' })).json<ManualAccount[]>()
  const found = rows.find((row) => row.id === id)
  if (!found) throw new Error('Missing manual account')
  return found
}

describe('profile-scoped exact manual accounts and CSV fallback', () => {
  test('an explicit opening balance creates a local source without banking consent or income', async () => {
    const { app } = await setup()
    const created = await createAccount(app)
    const data = await financial(app)
    expect(data.accounts).toHaveLength(1)
    expect(data.transactions).toHaveLength(0)
    expect(data.connections[0]).toMatchObject({ providerId: 'local-manual', lastSyncedAt: null })
    expect(data.analysis.summaries[0]).toMatchObject({
      balance: { amountMinor: '10000' },
      spend: { amountMinor: '0' },
      income: { amountMinor: '0' },
    })
    const exported = (await app.inject({ url: '/v1/export' })).json()
    expect(exported.consents).toEqual([])
    expect(exported.manual.accountStates[0]).toMatchObject({
      accountId: created.id,
      openingBalanceMinor: '10000',
      revision: 1,
    })
    expect(exported.manual.balanceEvents[0]).toMatchObject({
      operation: 'opening',
      beforeMinor: '0',
      afterMinor: '10000',
      transactionId: null,
    })
  })
  test('repeated and concurrent command IDs preserve one account/entry and reject changed payloads', async () => {
    const { app, profileId } = await setup(),
      key = randomUUID(),
      body = {
        requestId: key,
        name: 'Contanti',
        kind: 'cash',
        currency: 'EUR',
        openingBalanceMinor: '10000',
        openingOn: '2026-10-01',
      }
    const responses = await Promise.all(
      [0, 1].map(() => app.inject({ method: 'POST', url: '/v1/manual/accounts', payload: body })),
    )
    for (const response of responses) expect(response.statusCode, response.payload).toBe(201)
    expect(responses[0]?.json()).toEqual(responses[1]?.json())
    const created = responses[0]?.json<ManualAccount>()
    if (!created) throw new Error('Missing response')
    const reused = await app.inject({
      method: 'POST',
      url: '/v1/manual/accounts',
      payload: { ...body, name: 'Different' },
    })
    expect(reused.statusCode).toBe(409)
    expect(reused.json().code).toBe('idempotency_key_reused')
    const entryKey = randomUUID(),
      entryBody = {
        requestId: entryKey,
        accountId: created.id,
        amountMinor: '-250',
        currency: 'EUR',
        bookedOn: '2026-10-03',
        kind: 'expense',
        description: 'Caffè',
      }
    const entries = await Promise.all(
      [0, 1].map(() =>
        app.inject({ method: 'POST', url: '/v1/manual/transactions', payload: entryBody }),
      ),
    )
    for (const response of entries) expect(response.statusCode, response.payload).toBe(201)
    expect(entries[0]?.json()).toEqual(entries[1]?.json())
    expect((await account(app, created.id)).balanceMinor).toBe('9750')
    expect((await financial(app)).transactions).toHaveLength(1)
    expect(
      await handle.db.select().from(manualCommands).where(eq(manualCommands.profileId, profileId)),
    ).toHaveLength(2)
    const otherOperation = await app.inject({
      method: 'POST',
      url: '/v1/manual/transactions',
      payload: { ...entryBody, requestId: key },
    })
    expect(otherOperation.statusCode).toBe(409)
  })
  test('JPY and KWD entries preserve exact integer units and separate currencies', async () => {
    const { app } = await setup()
    const jpy = await createAccount(app, { currency: 'JPY', openingBalanceMinor: '1000' }),
      kwd = await createAccount(app, { currency: 'KWD', openingBalanceMinor: '9000' })
    await entry(app, jpy, { amountMinor: '-2' })
    await entry(app, kwd, { amountMinor: '-1234' })
    const data = await financial(app)
    expect(data.analysis.summaries.find((row) => row.currency === 'JPY')).toMatchObject({
      balance: { amountMinor: '998' },
      spend: { amountMinor: '2' },
    })
    expect(data.analysis.summaries.find((row) => row.currency === 'KWD')).toMatchObject({
      balance: { amountMinor: '7766' },
      spend: { amountMinor: '1234' },
    })
    expect(data.transactions.every((row) => typeof row.amount.amountMinor === 'string')).toBe(true)
  })
  test('minor-unit numbers, wrong signs/currency, invalid dates and future openings fail atomically', async () => {
    const { app } = await setup(),
      created = await createAccount(app),
      before = await app.inject({ url: '/v1/export' })
    const valid = {
      requestId: randomUUID(),
      accountId: created.id,
      amountMinor: '-250',
      currency: 'EUR',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Caffè',
    }
    for (const change of [
      { amountMinor: -250 },
      { amountMinor: '2.50' },
      { amountMinor: '-0' },
      { amountMinor: '0' },
      { amountMinor: '250' },
      { kind: 'income', amountMinor: '-250' },
      { currency: 'ZZZ' },
      { currency: 'JPY' },
      { bookedOn: '2026-02-30' },
      { bookedOn: '2026-09-30' },
      { bookedOn: '2026-10-04' },
      { description: '' },
      { description: 'Invalid\u0000text' },
      { merchantName: 'Invalid\u0000merchant' },
      { accountId: 'Invalid\u0000id' },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/manual/transactions',
        payload: { ...valid, ...change },
      })
      expect([400, 422], response.payload).toContain(response.statusCode)
    }
    expect((await app.inject({ url: '/v1/export' })).json()).toEqual(before.json())
    const future = await app.inject({
      method: 'POST',
      url: '/v1/manual/accounts',
      payload: {
        requestId: randomUUID(),
        name: 'Future',
        kind: 'cash',
        currency: 'EUR',
        openingBalanceMinor: '0',
        openingOn: '2026-10-04',
      },
    })
    expect(future.statusCode).toBe(422)
    expect((await financial(app)).accounts).toHaveLength(1)
  })
  test('foreign accounts, events, entries and balance corrections remain unavailable', async () => {
    const owner = await setup(),
      other = await setup(),
      created = await createAccount(owner.app),
      saved = await entry(owner.app, created)
    expect((await other.app.inject({ url: '/v1/manual/accounts' })).json()).toEqual([])
    for (const action of [
      { method: 'GET' as const, url: `/v1/manual/accounts/${created.id}/events` },
      {
        method: 'POST' as const,
        url: '/v1/manual/transactions',
        payload: {
          requestId: randomUUID(),
          accountId: created.id,
          amountMinor: '-10',
          currency: 'EUR',
          bookedOn: '2026-10-03',
          kind: 'expense',
          description: 'Foreign',
        },
      },
      {
        method: 'POST' as const,
        url: `/v1/manual/accounts/${created.id}/adjust`,
        payload: {
          requestId: randomUUID(),
          revision: 2,
          balanceMinor: '0',
          currency: 'EUR',
          reason: 'Foreign',
        },
      },
      {
        method: 'POST' as const,
        url: `/v1/manual/transactions/${saved.transactionId}/reverse`,
        payload: { requestId: randomUUID(), revision: 1, accountRevision: 2, reason: 'Foreign' },
      },
      {
        method: 'POST' as const,
        url: '/v1/imports/csv/preview',
        payload: { accountId: created.id, csv: csv('one,2026-10-03,-1.00,EUR,Caffe,Bar,') },
      },
    ]) {
      const response = await other.app.inject(action)
      expect(response.statusCode, response.payload).toBe(404)
    }
    expect((await account(owner.app, created.id)).balanceMinor).toBe('9750')
  })
  test('balance corrections are audited separately from spending and stale revisions cannot overwrite', async () => {
    const { app } = await setup(),
      created = await createAccount(app)
    await entry(app, created)
    const body = {
      revision: 2,
      balanceMinor: '12000',
      currency: 'EUR',
      reason: 'Contanti contati a mano',
    }
    const responses = await Promise.all(
      ['12000', '13000'].map((balanceMinor) =>
        app.inject({
          method: 'POST',
          url: `/v1/manual/accounts/${created.id}/adjust`,
          payload: { ...body, balanceMinor, requestId: randomUUID() },
        }),
      ),
    )
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409])
    const current = await account(app, created.id),
      data = await financial(app)
    expect(current.revision).toBe(3)
    expect(['12000', '13000']).toContain(current.balanceMinor)
    expect(data.analysis.summaries[0]).toMatchObject({
      balance: { amountMinor: current.balanceMinor },
      spend: { amountMinor: '250' },
      income: { amountMinor: '0' },
    })
    const events = (await app.inject({ url: `/v1/manual/accounts/${created.id}/events` })).json()
    expect(events).toHaveLength(3)
    expect(events[2]).toMatchObject({
      operation: 'adjustment',
      beforeMinor: '9750',
      afterMinor: current.balanceMinor,
      transactionId: null,
    })
    const wrongCurrency = await app.inject({
      method: 'POST',
      url: `/v1/manual/accounts/${created.id}/adjust`,
      payload: { ...body, revision: 3, currency: 'JPY', requestId: randomUUID() },
    })
    expect(wrongCurrency.statusCode).toBe(422)
    expect((await account(app, created.id)).revision).toBe(3)
  })
  test('reversing an entry restores its balance/totals once and preserves immutable source evidence', async () => {
    const { app } = await setup(),
      created = await createAccount(app),
      saved = await entry(app, created),
      key = randomUUID()
    const body = {
      requestId: key,
      revision: saved.transactionRevision,
      accountRevision: saved.accountRevision,
      reason: 'Errore di inserimento',
    }
    const first = await app.inject({
      method: 'POST',
      url: `/v1/manual/transactions/${saved.transactionId}/reverse`,
      payload: body,
    })
    expect(first.statusCode, first.payload).toBe(200)
    const replay = await app.inject({
      method: 'POST',
      url: `/v1/manual/transactions/${saved.transactionId}/reverse`,
      payload: body,
    })
    expect(replay.json()).toEqual(first.json())
    expect(await account(app, created.id)).toMatchObject({ balanceMinor: '10000', revision: 3 })
    const data = await financial(app)
    expect(data.transactions[0]?.status).toBe('reversed')
    expect(data.analysis.summaries[0]).toMatchObject({
      spend: { amountMinor: '0' },
      income: { amountMinor: '0' },
    })
    const exported = (await app.inject({ url: '/v1/export' })).json()
    expect(exported.sourceObservations).toHaveLength(2)
    expect(
      exported.manual.balanceEvents.map((event: { operation: string }) => event.operation),
    ).toEqual(['opening', 'entry', 'reversal'])
    const again = await app.inject({
      method: 'POST',
      url: `/v1/manual/transactions/${saved.transactionId}/reverse`,
      payload: { ...body, requestId: randomUUID(), revision: 2, accountRevision: 3 },
    })
    expect(again.statusCode).toBe(409)
  })
  test('a later balance change makes an old undo unavailable until explicit review', async () => {
    const { app } = await setup(),
      created = await createAccount(app),
      saved = await entry(app, created)
    await entry(app, created, { amountMinor: '-100' })
    const response = await app.inject({
      method: 'POST',
      url: `/v1/manual/transactions/${saved.transactionId}/reverse`,
      payload: {
        requestId: randomUUID(),
        revision: saved.transactionRevision,
        accountRevision: saved.accountRevision,
        reason: 'Stale',
      },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().code).toBe('manual_balance_changed')
    expect((await account(app, created.id)).balanceMinor).toBe('9650')
  })
  test('CSV preview validates without writes and importing/replaying updates only new manual rows', async () => {
    const { app } = await setup(),
      created = await createAccount(app),
      content = csv(
        'coffee-1,2026-10-02,-2.50,EUR,Caffe,Bar,\nsalary-1,2026-10-03,10.00,EUR,Entrata,,',
      )
    const dense = csv(
      Array.from(
        { length: 800 },
        (_, index) => `quoted-${index},2026-10-03,-0.01,EUR,"${'""'.repeat(130)}",,`,
      ).join('\n'),
    )
    expect(Buffer.byteLength(dense, 'utf8')).toBeLessThan(262_144)
    expect(
      Buffer.byteLength(JSON.stringify({ accountId: created.id, csv: dense }), 'utf8'),
    ).toBeGreaterThan(300_000)
    const densePreview = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv/preview',
      payload: { accountId: created.id, csv: dense },
    })
    expect(densePreview.statusCode, densePreview.payload).toBe(200)
    expect(densePreview.json()).toMatchObject({
      rowCount: 800,
      newRows: 800,
      newAmountTotalMinor: '-800',
    })
    const preview = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv/preview',
      payload: { accountId: created.id, csv: content },
    })
    expect(preview.statusCode, preview.payload).toBe(200)
    expect(preview.json()).toMatchObject({
      rowCount: 2,
      newRows: 2,
      unchangedRows: 0,
      amountTotalMinor: '750',
      newAmountTotalMinor: '750',
      manualBalanceWillChange: true,
    })
    expect((await account(app, created.id)).balanceMinor).toBe('10000')
    expect((await financial(app)).transactions).toHaveLength(0)
    const first = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: { accountId: created.id, csv: content },
    })
    expect(first.statusCode, first.payload).toBe(200)
    expect(first.json()).toMatchObject({ inserted: 2, unchanged: 0 })
    expect(await account(app, created.id)).toMatchObject({ balanceMinor: '10750', revision: 3 })
    const second = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv',
      payload: { accountId: created.id, csv: content },
    })
    expect(second.statusCode, second.payload).toBe(200)
    expect(second.json()).toMatchObject({ inserted: 0, unchanged: 2 })
    expect(await account(app, created.id)).toMatchObject({ balanceMinor: '10750', revision: 3 })
    const again = await app.inject({
      method: 'POST',
      url: '/v1/imports/csv/preview',
      payload: { accountId: created.id, csv: content },
    })
    expect(again.statusCode, again.payload).toBe(200)
    expect(again.json()).toMatchObject({ newRows: 0, unchangedRows: 2, newAmountTotalMinor: '0' })
    const data = await financial(app)
    expect(data.analysis.summaries[0]).toMatchObject({
      balance: { amountMinor: '10750' },
      spend: { amountMinor: '250' },
      income: { amountMinor: '1000' },
    })
    const exported = (await app.inject({ url: '/v1/export' })).json()
    expect(
      exported.manual.balanceEvents.map((event: { operation: string }) => event.operation),
    ).toEqual(['opening', 'import', 'import'])
    expect(exported.sourceObservations).toHaveLength(2)
  })
  test('a late invalid CSV row rolls back canonical rows, raw observations, balance and audit', async () => {
    const { app } = await setup(),
      created = await createAccount(app),
      before = (await app.inject({ url: '/v1/export' })).json()
    for (const invalidRow of [
      'old,2026-09-30,-1.00,EUR,Before tracking,Shop,',
      'future,2026-10-04,-1.00,EUR,Future,Shop,',
      'foreign,2026-10-03,-1.00,JPY,Wrong currency,Shop,',
      'overflow,2026-10-03,-99999999999999999999999.99,EUR,Too large,Shop,',
      'nul,2026-10-03,-1.00,EUR,Invalid\u0000description,Shop,',
    ]) {
      const content = csv(`good,2026-10-03,-2.50,EUR,Caffe,Bar,\n${invalidRow}`)
      const response = await app.inject({
        method: 'POST',
        url: '/v1/imports/csv',
        payload: { accountId: created.id, csv: content },
      })
      expect(response.statusCode, response.payload).toBe(422)
      expect((await app.inject({ url: '/v1/export' })).json()).toEqual(before)
    }
  })
  test('changed CSV identities reject preview/apply and preserve feedback, balances and audit', async () => {
    const { app } = await setup(),
      created = await createAccount(app),
      original = csv('one,2026-10-03,-2.50,EUR,Caffe,Bar,')
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/imports/csv',
          payload: { accountId: created.id, csv: original },
        })
      ).statusCode,
    ).toBe(200)
    const before = (await app.inject({ url: '/v1/export' })).json(),
      changed = csv('one,2026-10-03,-3.00,EUR,Caffe,Bar,')
    for (const url of ['/v1/imports/csv/preview', '/v1/imports/csv'])
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            payload: { accountId: created.id, csv: changed },
          })
        ).statusCode,
      ).toBe(409)
    expect((await app.inject({ url: '/v1/export' })).json()).toEqual(before)
  })
  test('manual cash top-up joins reconciliation and an explicit match excludes the ATM pair', async () => {
    const withdrawal = ITALIAN_TRANSACTIONS.find((row) => row.id === 'atm')
    if (!withdrawal) throw new Error('Missing ATM fixture')
    const { app } = await setup(new MockItalianProvider([withdrawal]), true),
      created = await createAccount(app, { openingBalanceMinor: '0' })
    const saved = await entry(app, created, {
      amountMinor: '8000',
      kind: 'transfer',
      description: 'Contanti da prelievo',
      reference: 'cash-demo-1',
    })
    const before = await financial(app),
      match = before.analysis.matches.find(
        (row) => row.type === 'cash_transfer' && row.transactionIds.includes(saved.transactionId),
      )
    expect(match?.state).toBe('suggested')
    if (!match) throw new Error('Missing cash transfer suggestion')
    const confirmed = await app.inject({
      method: 'PATCH',
      url: `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      payload: { state: 'confirmed', revision: match.revision },
    })
    expect(confirmed.statusCode, confirmed.payload).toBe(200)
    const after = await financial(app)
    expect(after.analysis.summaries.find((row) => row.currency === 'EUR')).toMatchObject({
      spend: { amountMinor: '0' },
      income: { amountMinor: '0' },
    })
    expect((await account(app, created.id)).balanceMinor).toBe('8000')
  })
  test('an audit failure after ledger/balance writes rolls back the whole command', async () => {
    const { app, profileId } = await setup(),
      created = await createAccount(app),
      before = (await app.inject({ url: '/v1/export' })).json()
    class FailingService extends ManualService {
      override async event(..._args: Parameters<ManualService['event']>): Promise<string> {
        throw new Error('Injected audit failure')
      }
    }
    await expect(
      new FailingService(handle.db, profileId, now).enter({
        requestId: randomUUID(),
        accountId: created.id,
        amountMinor: '-250',
        currency: 'EUR',
        bookedOn: '2026-10-03',
        kind: 'expense',
        description: 'Late failure',
      }),
    ).rejects.toThrow('Injected audit failure')
    expect((await app.inject({ url: '/v1/export' })).json()).toEqual(before)
  })
  test('manual audit UPDATE is forbidden and profile erasure cascades every local row', async () => {
    const { app, profileId } = await setup(),
      created = await createAccount(app)
    await entry(app, created)
    await expect(
      handle.db
        .update(manualBalanceEvents)
        .set({ reason: 'Rewrite' })
        .where(eq(manualBalanceEvents.profileId, profileId)),
    ).rejects.toThrow()
    await expect(
      handle.db
        .update(manualCommands)
        .set({ operation: 'adjustment' })
        .where(eq(manualCommands.profileId, profileId)),
    ).rejects.toThrow()
    expect((await app.inject({ method: 'DELETE', url: '/v1/profile' })).statusCode).toBe(204)
    expect(
      await handle.db.select().from(manualAccounts).where(eq(manualAccounts.profileId, profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(manualBalanceEvents)
        .where(eq(manualBalanceEvents.profileId, profileId)),
    ).toEqual([])
    expect(
      await handle.db.select().from(manualCommands).where(eq(manualCommands.profileId, profileId)),
    ).toEqual([])
    expect((await app.inject({ url: '/v1/manual/accounts' })).statusCode).toBe(404)
  })
})
