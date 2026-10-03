import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import {
  monthlyResponseDtoSchema,
  safeResponseDtoSchema,
  type UnderstandingConfiguration,
} from '../src/understanding-service.js'

type App = Awaited<ReturnType<typeof createApp>>
let handle: DatabaseHandle
let vaultDirectory: string
let encryption: ProfileEncryption
const profiles: string[] = [],
  apps: App[] = []
const fixedNow = '2026-10-03T12:00:00.000Z'
const policy: UnderstandingConfiguration = {
  version: 'synthetic-understanding-v1',
  maxBalanceAgeMs: 86_400_000,
  occurrenceToleranceDays: 3,
  maxForecastOccurrences: 120,
  horizonDays: 62,
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  vaultDirectory = await mkdtemp(join(tmpdir(), 'lilleri-understanding-vault-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createLocalSyntheticKeyManagement({
      directory: vaultDirectory,
      mode: 'demo',
    }),
    () => fixedNow,
  )
})
afterAll(async () => {
  for (const app of apps) await app.close()
  if (handle) {
    for (const id of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.close()
  }
  if (vaultDirectory) await rm(vaultDirectory, { recursive: true, force: true })
})
async function fixture(seed = false) {
  const profileId = `understanding_${randomUUID()}`
  profiles.push(profileId)
  let currentNow = fixedNow,
    currentPolicy = policy
  const app = await createApp({
    db: handle.db,
    profileId,
    demoMode: true,
    seed,
    now: () => currentNow,
    encryption,
    financialScope: handle.withProfile,
    understandingConfiguration: async () => ({ ...currentPolicy }),
  })
  apps.push(app)
  return {
    app,
    profileId,
    setNow: (value: string) => {
      currentNow = value
    },
    setPolicy: (value: UnderstandingConfiguration) => {
      currentPolicy = value
    },
  }
}
async function account(
  app: App,
  options: {
    currency?: string
    kind?: string
    openingOn?: string
    openingBalanceMinor?: string
  } = {},
) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/manual/accounts',
    payload: {
      requestId: randomUUID(),
      name: 'Conto sintetico',
      kind: options.kind ?? 'cash',
      currency: options.currency ?? 'EUR',
      openingBalanceMinor: options.openingBalanceMinor ?? '10000',
      openingOn: options.openingOn ?? '2026-10-01',
    },
  })
  expect(response.statusCode, response.payload).toBe(201)
  return response.json<{ id: string; revision: number }>()
}
async function entry(
  app: App,
  accountId: string,
  options: {
    amountMinor?: string
    kind?: string
    currency?: string
    bookedOn?: string
    merchantName?: string
  } = {},
) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/manual/transactions',
    payload: {
      requestId: randomUUID(),
      accountId,
      amountMinor: options.amountMinor ?? '-250',
      currency: options.currency ?? 'EUR',
      kind: options.kind ?? 'expense',
      bookedOn: options.bookedOn ?? '2026-10-02',
      description: 'Movimento sintetico riservato',
      merchantName: options.merchantName ?? 'Esercente sintetico',
    },
  })
  expect(response.statusCode, response.payload).toBe(201)
  return { id: response.json<{ transactionId: string }>().transactionId }
}
async function monthly(app: App, month = '2026-10') {
  const response = await app.inject({ url: `/v1/insights/monthly?month=${month}` })
  expect(response.statusCode, response.payload).toBe(200)
  return monthlyResponseDtoSchema.parse(response.json())
}
function safeUrl(
  accountIds: string[],
  buffers: Record<string, string> = { EUR: '500' },
  horizonOn = '2026-10-31',
) {
  return `/v1/safe-to-spend?${new URLSearchParams({ accountIds: accountIds.join(','), horizonOn, bufferByCurrency: JSON.stringify(buffers) })}`
}
async function safe(
  app: App,
  accountIds: string[],
  buffers?: Record<string, string>,
  horizonOn?: string,
) {
  const response = await app.inject({ url: safeUrl(accountIds, buffers, horizonOn) })
  expect(response.statusCode, response.payload).toBe(200)
  return safeResponseDtoSchema.parse(response.json())
}
async function quiet(app: App, id: string, isPrivate = false) {
  const response = await app.inject({
    method: 'PATCH',
    url: `/v1/transactions/${id}/privacy`,
    payload: { revision: 1, quiet: !isPrivate, private: isPrivate },
  })
  expect(response.statusCode, response.payload).toBe(200)
}

describe('current scoped HTTP financial understanding', () => {
  test('decrypted local ledger yields exact monthly subtotals and an explicit selected-account cash formula', async () => {
    const owned = await fixture(),
      local = await account(owned.app)
    const expense = await entry(owned.app, local.id)
    const income = await entry(owned.app, local.id, {
      kind: 'income',
      amountMinor: '700',
      merchantName: 'Entrata sintetica',
    })
    const transfer = await entry(owned.app, local.id, {
      kind: 'transfer',
      amountMinor: '-500',
      merchantName: 'Trasferimento sintetico',
    })
    const observation = await monthly(owned.app)
    expect(observation).toMatchObject({
      month: '2026-10',
      profileTimezone: 'Europe/Rome',
      boundary: {
        calculatedOn: '2026-10-03',
        defaultHorizonOn: '2026-10-31',
        maxHorizonOn: '2026-12-04',
        policyVersion: policy.version,
      },
    })
    expect(observation.insights[0]).toMatchObject({
      status: 'complete',
      isEstimate: false,
      confidence: null,
      inputs: { transactionIds: [expense.id, income.id].sort() },
      calculation: { incomeMinor: '700', expensesMinor: '250', linkedRefundsMinor: '0' },
      value: {
        netSpending: { amountMinor: '250', currency: 'EUR' },
        netFlow: { amountMinor: '450', currency: 'EUR' },
      },
    })
    expect(JSON.stringify(observation)).not.toContain(transfer.id)
    const estimate = await safe(owned.app, [local.id])
    expect(estimate).toMatchObject({
      observedLocalLedgerOnly: true,
      scope: 'selected-local-ledger-accounts',
      results: [
        {
          status: 'available',
          value: { amountMinor: '9450', currency: 'EUR' },
          isEstimate: true,
          confidence: null,
          calculation: {
            includedBalanceMinor: '9950',
            pendingOutflowsMinor: '0',
            estimatedUpcomingOutflowsMinor: '0',
            bufferMinor: '500',
            forecastIncomeAddedMinor: '0',
          },
        },
      ],
    })
    const [stored] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, expense.id))
    expect(stored?.description.startsWith('lilleri:v1:')).toBe(true)
    expect(JSON.stringify(estimate)).not.toContain('Movimento sintetico riservato')
  })

  test('keeps currencies separate and preserves amounts beyond JavaScript safe integers as decimal strings', async () => {
    const owned = await fixture()
    const eur = await account(owned.app, { openingBalanceMinor: '900719925474099300' })
    const gbp = await account(owned.app, { currency: 'GBP' })
    await entry(owned.app, eur.id, { amountMinor: '-1' })
    await entry(owned.app, gbp.id, { amountMinor: '-750', currency: 'GBP' })
    const observation = await monthly(owned.app)
    expect(
      observation.insights.map((row) => [row.currency, row.calculation.expensesMinor]),
    ).toEqual([
      ['EUR', '1'],
      ['GBP', '750'],
    ])
    const result = await safe(owned.app, [eur.id, gbp.id], { EUR: '2', GBP: '1000' })
    expect(result.results.map((row) => [row.currency, row.value?.amountMinor])).toEqual([
      ['EUR', '900719925474099297'],
      ['GBP', '8250'],
    ])
  })

  test('manual opening interval makes earlier history partial, and a provider snapshot never invents coverage or balance semantics', async () => {
    const owned = await fixture()
    await account(owned.app, { openingOn: '2026-10-02' })
    expect((await monthly(owned.app)).insights[0]).toMatchObject({
      status: 'partial',
      reasons: ['coverage_partial'],
    })
    const bank = await fixture(true)
    const overview = await bank.app.inject({ url: '/v1/demo' })
    expect(overview.statusCode, overview.payload).toBe(200)
    const bankAccounts = overview.json<{
      accounts: { id: string; kind: string; balance: { currency: string } }[]
    }>().accounts
    const bankAccount = bankAccounts.find(
      (row) => row.kind === 'current' && row.balance.currency === 'EUR',
    )
    if (!bankAccount) throw new Error('Synthetic bank current account missing')
    const history = await monthly(bank.app, '2026-09')
    expect(
      history.insights.every(
        (row) => row.status === 'partial' && row.reasons.includes('coverage_unknown'),
      ),
    ).toBe(true)
    expect(history.availableMonths).toContain('2026-09')
    const result = (await safe(bank.app, [bankAccount.id])).results[0]
    expect(result).toMatchObject({ status: 'unavailable', value: null })
    expect(result?.reasons).toEqual(
      expect.arrayContaining(['balance_meaning_unknown', 'coverage_unknown']),
    )
  })

  test('uses profile timezone for default month and today without shifting booked calendar dates', async () => {
    const owned = await fixture()
    owned.setNow('2026-09-30T22:30:00.000Z')
    const local = await account(owned.app)
    const movement = await entry(owned.app, local.id, { bookedOn: '2026-10-01' })
    const response = await owned.app.inject({ url: '/v1/insights/monthly' })
    expect(response.statusCode, response.payload).toBe(200)
    expect(monthlyResponseDtoSchema.parse(response.json())).toMatchObject({
      month: '2026-10',
      boundary: { calculatedOn: '2026-10-01' },
      insights: [
        {
          inputs: { throughOn: '2026-10-01', transactionIds: [movement.id] },
          calculation: { expensesMinor: '250' },
        },
      ],
    })
  })

  test('quiet and private preferences remove identifiers from both calculations while retaining already-observed account balances', async () => {
    const owned = await fixture(),
      local = await account(owned.app)
    const hidden = await entry(owned.app, local.id)
    const privateRow = await entry(owned.app, local.id, {
      amountMinor: '-300',
      merchantName: 'Altro sintetico',
    })
    const visible = await entry(owned.app, local.id, {
      amountMinor: '-400',
      merchantName: 'Visibile sintetico',
    })
    await quiet(owned.app, hidden.id)
    await quiet(owned.app, privateRow.id, true)
    const observation = await monthly(owned.app),
      result = await safe(owned.app, [local.id])
    expect(observation.insights[0]).toMatchObject({
      inputs: { transactionIds: [visible.id] },
      calculation: { expensesMinor: '400' },
    })
    for (const output of [JSON.stringify(observation), JSON.stringify(result)]) {
      expect(output).not.toContain(hidden.id)
      expect(output).not.toContain(privateRow.id)
    }
    expect(result.results[0]?.value?.amountMinor).toBe('8550')
  })

  test('private pending liabilities make availability unknown and never disclose the hidden evidence', async () => {
    const owned = await fixture(true)
    const rows = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, owned.profileId))
    const template = rows.find(
      (row) => row.status === 'pending' && row.amountMinor < 0n && row.currency === 'EUR',
    )
    if (!template) throw new Error('Synthetic pending outflow template missing')
    const plain = await encryption.decryptTransactionRow(handle.db, template)
    const id = `unsettled_${randomUUID()}`
    const pending = {
      ...plain,
      id,
      providerTransactionId: id,
      amountMinor: -1250n,
      merchantName: 'Prenotazione sintetica distinta',
      merchantKey: 'distinct-unsettled-synthetic',
      description: 'Prenotazione sintetica ancora aperta',
      reference: null,
      relatedTransactionId: null,
      relatedAccountId: null,
      authorizedOn: '2026-10-03',
      contentHash: 'd'.repeat(64),
    }
    await handle.db
      .insert(schema.transactions)
      .values(await encryption.encryptTransactionRow(handle.db, pending))
    await quiet(owned.app, pending.id, true)
    const result = await safe(owned.app, [pending.accountId])
    expect(result.results[0]).toMatchObject({
      status: 'unavailable',
      value: null,
      calculation: { pendingOutflowsMinor: null },
    })
    expect(result.results[0]?.reasons).toContain('private_outflow_coverage')
    expect(JSON.stringify(result)).not.toContain(pending.id)
  })

  test('a visible refund of a private purchase stays unresolved rather than exposing the relationship or fabricating income', async () => {
    const owned = await fixture(true)
    const rows = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, owned.profileId))
    const refund = rows.find((row) => row.kind === 'refund' && row.relatedTransactionId !== null)
    if (!refund?.relatedTransactionId) throw new Error('Synthetic linked refund missing')
    await quiet(owned.app, refund.relatedTransactionId, true)
    const observation = await monthly(owned.app)
    const eur = observation.insights.find((row) => row.currency === 'EUR')
    expect(eur).toMatchObject({
      status: 'partial',
      calculation: { incomeMinor: '0', linkedRefundsMinor: '0', unresolvedCreditsMinor: '2000' },
    })
    expect(eur?.reasons).toContain('unresolved_refund')
    expect(eur?.inputs.unresolvedTransactionIds).toContain(refund.id)
    expect(eur?.inputs.refundTransactionIds).not.toContain(refund.id)
    expect(JSON.stringify(observation)).not.toContain(refund.relatedTransactionId)
  })

  test('reserves labelled recurring monthly outflows and withholds estimates whose recurrence evidence is private', async () => {
    const owned = await fixture(),
      local = await account(owned.app, { openingOn: '2026-07-01' })
    const evidence: string[] = []
    for (const bookedOn of ['2026-07-10', '2026-08-10', '2026-09-10'])
      evidence.push(
        (
          await entry(owned.app, local.id, {
            bookedOn,
            amountMinor: '-1200',
            merchantName: 'Ricorrenza sintetica',
          })
        ).id,
      )
    const first = (await safe(owned.app, [local.id])).results[0]
    expect(first).toMatchObject({
      status: 'available',
      value: { amountMinor: '4700', currency: 'EUR' },
      calculation: {
        includedBalanceMinor: '6400',
        estimatedUpcomingOutflowsMinor: '1200',
        forecastIncomeAddedMinor: '0',
      },
      inputs: {
        recurringEvidenceTransactionIds: evidence.sort(),
        estimatedOccurrences: [{ on: '2026-10-10', amountMinor: '1200' }],
      },
    })
    const hidden = evidence[0]
    if (!hidden) throw new Error('Synthetic recurring evidence missing')
    await quiet(owned.app, hidden)
    const second = (await safe(owned.app, [local.id])).results[0]
    expect(second).toMatchObject({
      status: 'unavailable',
      value: null,
      calculation: { estimatedUpcomingOutflowsMinor: null },
    })
    expect(second?.reasons).toContain('private_recurring_coverage')
    expect(JSON.stringify(second)).not.toContain(hidden)
  })

  test('captures runtime policy for each request: age, horizon boundary and revision affect the visible calculation', async () => {
    const owned = await fixture(),
      local = await account(owned.app)
    owned.setPolicy({
      ...policy,
      version: 'synthetic-understanding-v2',
      maxBalanceAgeMs: 3600_000,
      horizonDays: 1,
    })
    owned.setNow('2026-10-03T14:00:00.000Z')
    const observation = await monthly(owned.app)
    expect(observation.boundary).toMatchObject({
      policyVersion: 'synthetic-understanding-v2',
      defaultHorizonOn: '2026-10-04',
      maxHorizonOn: '2026-10-04',
    })
    const stale = (await safe(owned.app, [local.id], { EUR: '0' }, '2026-10-04')).results[0]
    expect(stale).toMatchObject({
      status: 'unavailable',
      value: null,
      policyVersion: 'synthetic-understanding-v2',
    })
    expect(stale?.reasons).toContain('balance_stale')
    expect((await owned.app.inject({ url: safeUrl([local.id]) })).statusCode).toBe(400)
  })

  test('does not silently supply an omitted buffer and preserves a signed shortfall', async () => {
    const owned = await fixture(),
      local = await account(owned.app, { openingBalanceMinor: '100' })
    const missing = (await safe(owned.app, [local.id], {})).results[0]
    expect(missing).toMatchObject({
      status: 'unavailable',
      value: null,
      calculation: { bufferMinor: null },
    })
    expect(missing?.reasons).toContain('buffer_not_configured')
    expect((await safe(owned.app, [local.id], { EUR: '500' })).results[0]).toMatchObject({
      status: 'shortfall',
      value: { amountMinor: '-400', currency: 'EUR' },
    })
  })

  test('rejects foreign selectors and malformed dates, amounts and duplicate accounts without leaking identifiers', async () => {
    const owned = await fixture(),
      other = await fixture()
    const local = await account(owned.app),
      foreign = await account(other.app)
    const denied = await owned.app.inject({ url: safeUrl([foreign.id]) })
    expect(denied.statusCode).toBe(404)
    expect(denied.payload).not.toContain(foreign.id)
    for (const url of [
      safeUrl([local.id, local.id]),
      safeUrl([local.id], { EUR: '-1' }),
      safeUrl([local.id], { EUR: '1.25' }),
      safeUrl([local.id], { GBP: '1' }),
      safeUrl([local.id], { EUR: '01' }),
      safeUrl([local.id], { EUR: '0' }, '2026-02-30'),
      safeUrl([local.id], { EUR: '0' }, '2026-10-02'),
      safeUrl([local.id], { EUR: '0' }, '2026-12-05'),
      `/v1/insights/monthly?month=2026-13`,
      '/v1/insights/monthly?month=2026-11',
      `/v1/insights/monthly?profileId=${other.profileId}`,
    ])
      expect((await owned.app.inject({ url })).statusCode, url).toBe(400)
    const numeric = `/v1/safe-to-spend?${new URLSearchParams({ accountIds: local.id, horizonOn: '2026-10-31', bufferByCurrency: '{"EUR":500}' })}`
    expect((await owned.app.inject({ url: numeric })).statusCode).toBe(400)
  })
})
