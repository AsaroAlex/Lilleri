import { createHash, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { CANONICAL_CATEGORIES, CATEGORIES } from '@lilleri/domain'
import { MockItalianProvider, type ProviderTransaction } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  createDataExportArchive,
  DATA_EXPORT_SCHEMA,
  MAX_DATA_EXPORT_BYTES,
} from '../src/data-export.js'
import { ManualService } from '../src/manual-service.js'
import { RAW_PAYLOAD_RETENTION_MS } from '../src/retention.js'
import { RulesService } from '../src/rules.js'
import { SettingsService } from '../src/settings.js'

type App = Awaited<ReturnType<typeof createApp>>
type Snapshot = Record<string, unknown>
let handle: DatabaseHandle
const apps: App[] = []
const profileIds: string[] = []
const fixedNow = () => '2026-10-03T12:00:00.000Z'
// The generated schema only uses draft-7-compatible assertions. Disable meta-schema lookup;
// Fastify's maintained Ajv compiler still validates the document and rejects extra properties.
const validator = Fastify({
  ajv: { customOptions: { validateSchema: false, removeAdditional: false, coerceTypes: false } },
})
validator.post('/validate', { schema: { body: DATA_EXPORT_SCHEMA } }, async () => ({ valid: true }))
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  await validator.ready()
})
afterAll(async () => {
  for (const app of apps) await app.close()
  await validator.close()
  for (const id of profileIds) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, id))
  }
  await handle.close()
})
async function setup(provider = new MockItalianProvider(), seed = true, now = fixedNow) {
  const profileId = `export_test_${randomUUID()}`
  profileIds.push(profileId)
  const app = await createApp({ db: handle.db, demoMode: true, profileId, provider, seed, now })
  apps.push(app)
  return { app, profileId, manual: new ManualService(handle.db, profileId, now) }
}
async function snapshot(app: App): Promise<Snapshot> {
  const response = await app.inject({ url: '/v1/export' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json<Snapshot>()
}
function file(files: Record<string, Uint8Array>, name: string) {
  const entry = files[name]
  if (!entry) throw new Error(`Missing ZIP entry ${name}`)
  return strFromU8(entry)
}
async function archive(app: App, query = '') {
  const response = await app.inject({ url: `/v1/export/archive${query}` })
  expect(response.statusCode, response.payload).toBe(200)
  expect(response.headers['content-type']).toBe('application/zip')
  expect(response.headers['cache-control']).toBe('no-store')
  expect(response.headers['x-content-type-options']).toBe('nosniff')
  expect(response.headers['content-disposition']).toBe(
    'attachment; filename="lilleri-export-2026-10-03.zip"',
  )
  expect([...response.rawPayload.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
  return unzipSync(response.rawPayload)
}
const rows = (value: unknown) => value as Record<string, unknown>[]

describe('profile-scoped local portable data archive', () => {
  test('the real route produces a complete ZIP with lossless JSON, canonical categories and verifiable hashes', async () => {
    const { app } = await setup(),
      expected = await snapshot(app),
      files = await archive(app)
    expect(Object.keys(files).sort()).toEqual(
      [
        'README.txt',
        'accounts.json',
        'categories.json',
        'consents.json',
        'data.json',
        'events.jsonl',
        'links.csv',
        'manifest.json',
        'rules.json',
        'schema.json',
        'transactions.csv',
      ].sort(),
    )
    expect(JSON.parse(file(files, 'data.json'))).toEqual(expected)
    expect(JSON.parse(file(files, 'accounts.json'))).toEqual(expected.accounts)
    expect(JSON.parse(file(files, 'rules.json'))).toEqual(expected.rules)
    expect(JSON.parse(file(files, 'consents.json'))).toEqual(expected.consents)
    expect(JSON.parse(file(files, 'categories.json'))).toEqual({
      formatVersion: 1,
      canonical: CANONICAL_CATEGORIES,
      prototypeVisible: CATEGORIES,
    })
    const manifest = JSON.parse(file(files, 'manifest.json'))
    expect(manifest).toMatchObject({
      archiveVersion: 1,
      exportVersion: 1,
      scope: 'profile',
      delivery: 'local_download',
      moneyEncoding: 'decimal_string_integer_minor_units',
    })
    expect(manifest.currencies).toEqual(['EUR', 'GBP'])
    expect(manifest.files).toHaveLength(10)
    for (const descriptor of manifest.files as { path: string; bytes: number; sha256: string }[]) {
      const content = files[descriptor.path]
      if (!content) throw new Error('Manifest references missing entry')
      expect(content.byteLength).toBe(descriptor.bytes)
      expect(createHash('sha256').update(content).digest('hex')).toBe(descriptor.sha256)
    }
    expect(file(files, 'README.txt')).toContain('importa amount_minor come testo')
    expect(file(files, 'links.csv')).toContain('decision_revision')
  })
  test('schema.json validates the entire snapshot and rejects numeric money or undocumented fields', async () => {
    const { app } = await setup(),
      files = await archive(app),
      data = JSON.parse(file(files, 'data.json'))
    expect(JSON.parse(file(files, 'schema.json'))).toEqual(DATA_EXPORT_SCHEMA)
    const valid = await validator.inject({ method: 'POST', url: '/validate', payload: data })
    expect(valid.statusCode, valid.payload).toBe(200)
    const altered = structuredClone(data)
    altered.transactions[0].amount.amountMinor = Number(altered.transactions[0].amount.amountMinor)
    expect(
      (await validator.inject({ method: 'POST', url: '/validate', payload: altered })).statusCode,
    ).toBe(400)
    const secret = structuredClone(data)
    secret.password = 'not-a-real-secret'
    expect(
      (await validator.inject({ method: 'POST', url: '/validate', payload: secret })).statusCode,
    ).toBe(400)
  })
  test('large minor units and separate JPY/KWD preserve exact digits in JSON and CSV', async () => {
    const { app, manual } = await setup(undefined, false)
    const euro = await manual.create({
      requestId: randomUUID(),
      name: 'Contanti €',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '9007199254740993',
      openingOn: '2026-10-01',
    })
    await manual.enter({
      requestId: randomUUID(),
      accountId: euro.id,
      amountMinor: '-9007199254740991',
      currency: 'EUR',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Importo grande esatto',
    })
    const yen = await manual.create({
      requestId: randomUUID(),
      name: 'Yen 日本円',
      kind: 'cash',
      currency: 'JPY',
      openingBalanceMinor: '1000',
      openingOn: '2026-10-01',
    })
    await manual.enter({
      requestId: randomUUID(),
      accountId: yen.id,
      amountMinor: '-2',
      currency: 'JPY',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Due yen',
    })
    const dinar = await manual.create({
      requestId: randomUUID(),
      name: 'KWD',
      kind: 'current',
      currency: 'KWD',
      openingBalanceMinor: '9000',
      openingOn: '2026-10-01',
    })
    await manual.enter({
      requestId: randomUUID(),
      accountId: dinar.id,
      amountMinor: '-1234',
      currency: 'KWD',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Millesimi',
    })
    const files = await archive(app),
      data = JSON.parse(file(files, 'data.json')),
      table = file(files, 'transactions.csv')
    expect(
      data.accounts.find((row: { id: string }) => row.id === euro.id).balance.amountMinor,
    ).toBe('2')
    expect(
      data.transactions.find((row: { accountId: string }) => row.accountId === euro.id).amount
        .amountMinor,
    ).toBe('-9007199254740991')
    expect(table).toContain(',-9007199254740991,EUR,')
    expect(table).toContain(',-2,JPY,')
    expect(table).toContain(',-1234,KWD,')
    expect(JSON.parse(file(files, 'manifest.json')).currencies).toEqual(['EUR', 'JPY', 'KWD'])
    expect(
      (await validator.inject({ method: 'POST', url: '/validate', payload: data })).statusCode,
    ).toBe(200)
  })
  test('CSV quoting and formula neutralization preserve Unicode and original JSON text', async () => {
    const samples = [
      '=HYPERLINK("https://example.invalid","x")',
      '  +SUM(1,2)',
      '-dangerous-text',
      '@SUM(1+1)',
      '\t=SUM(1+1)',
      '\u200b=SUM(1+1)',
      'Caffè, "Roma"\r\n日本円',
    ]
    const records: ProviderTransaction[] = samples.map((description, index) => ({
      id: index === 2 ? '-formula-source' : `csv-formula-${index}`,
      accountId: 'conto',
      amount: '-1.00',
      currency: 'EUR',
      description,
      status: 'booked',
      bookedOn: '2026-10-03',
      merchantName: 'Caffè Roma',
    }))
    const { app } = await setup(new MockItalianProvider(records)),
      files = await archive(app),
      data = JSON.parse(file(files, 'data.json')),
      table = file(files, 'transactions.csv')
    for (const description of samples)
      expect(
        data.transactions.some((row: { description: string }) => row.description === description),
      ).toBe(true)
    expect(table).toContain('\'=HYPERLINK(""https://example.invalid"",""x"")')
    expect(table).toContain("'  +SUM(1,2)")
    expect(table).toContain("'-dangerous-text")
    expect(table).toContain("'@SUM(1+1)")
    expect(table).toContain("'\t=SUM(1+1)")
    expect(table).toContain("'\u200b=SUM(1+1)")
    expect(table).toContain('"Caffè, ""Roma""\r\n日本円"')
    expect(table).toContain("'-formula-source")
    expect(JSON.parse(file(files, 'manifest.json')).csv.textFormulaProtection).toMatchObject({
      method: 'apostrophe_prefix',
      originalValues: 'data.json',
    })
  })
  test('events include actual feedback/rule/manual/settings/acceptance records without inventing missing history', async () => {
    const { app, profileId, manual } = await setup(undefined, false)
    const account = await manual.create({
      requestId: randomUUID(),
      name: 'Contanti',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '1000',
      openingOn: '2026-10-01',
    })
    const entry = await manual.enter({
      requestId: randomUUID(),
      accountId: account.id,
      amountMinor: '-250',
      currency: 'EUR',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Caffè',
      merchantName: 'Caffè Roma',
    })
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/transactions/${entry.transactionId}/classification`,
          payload: { categoryId: 'food', scope: 'once', revision: entry.transactionRevision },
        })
      ).statusCode,
    ).toBe(200)
    const rules = new RulesService(handle.db, profileId, fixedNow)
    await rules.create({
      name: 'Bar',
      conditions: { merchantKey: 'caffe roma' },
      categoryId: 'food',
      priority: 50,
    })
    await new SettingsService(handle.db, profileId, fixedNow).update(1, {
      displayName: 'Casa',
      locale: 'it-IT',
      timezone: 'Europe/Rome',
    })
    const base = await snapshot(app),
      identity = {
        user: {
          id: 'identity_owner',
          name: 'Alex',
          email: 'owner@example.invalid',
          emailVerified: true,
          adultAttested: true,
          termsVersion: 'local-synthetic-terms-v1',
          twoFactorEnabled: false,
          createdAt: fixedNow(),
        },
        acceptances: [
          { kind: 'terms', textVersion: 'local-synthetic-terms-v1', acceptedAt: fixedNow() },
        ],
        sessions: [
          {
            id: 'safe-session-metadata-id',
            current: true,
            createdAt: fixedNow(),
            expiresAt: '2026-10-04T12:00:00.000Z',
          },
        ],
      }
    const result = await createDataExportArchive({ ...base, identity }),
      files = unzipSync(result.body),
      audit = file(files, 'events.jsonl')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
    expect(new Set(audit.map((event) => event.type))).toEqual(
      new Set([
        'classification_feedback',
        'classification_rule',
        'manual_balance',
        'profile_settings',
        'source_observation',
        'identity_acceptance',
      ]),
    )
    expect(audit.filter((event) => event.type === 'manual_balance')).toHaveLength(2)
    expect(audit.find((event) => event.type === 'identity_acceptance').data).toEqual(
      identity.acceptances[0],
    )
    expect(audit.every((event) => typeof event.occurredAt === 'string')).toBe(true)
    expect(file(files, 'events.jsonl')).not.toContain('safe-session-metadata-id')
    expect(
      (
        await validator.inject({
          method: 'POST',
          url: '/validate',
          payload: JSON.parse(file(files, 'data.json')),
        })
      ).statusCode,
    ).toBe(200)
  })
  test('profile selectors cannot export another profile, and malformed direct snapshots produce no archive', async () => {
    const owner = await setup(undefined, false),
      other = await setup(undefined, false)
    const own = await owner.manual.create({
      requestId: randomUUID(),
      name: 'Owner',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '100',
      openingOn: '2026-10-01',
    })
    await owner.manual.enter({
      requestId: randomUUID(),
      accountId: own.id,
      amountMinor: '-10',
      currency: 'EUR',
      bookedOn: '2026-10-03',
      kind: 'expense',
      description: 'Owner only',
    })
    const privateAccount = await other.manual.create({
      requestId: randomUUID(),
      name: 'OTHER_PRIVATE_ACCOUNT',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '999',
      openingOn: '2026-10-01',
    })
    const files = await archive(owner.app, `?profileId=${encodeURIComponent(other.profileId)}`),
      contents = file(files, 'data.json')
    expect(JSON.parse(contents).profile.id).toBe(owner.profileId)
    expect(contents).not.toContain(privateAccount.id)
    expect(contents).not.toContain('OTHER_PRIVATE_ACCOUNT')
    const base = await snapshot(owner.app),
      foreign = structuredClone(base)
    rows(foreign.transactions)[0] = { ...rows(foreign.transactions)[0], profileId: other.profileId }
    await expect(createDataExportArchive(foreign)).rejects.toMatchObject({
      code: 'invalid_export_snapshot',
    })
    const moneyMismatch = structuredClone(base)
    rows(moneyMismatch.transactions)[0] = {
      ...rows(moneyMismatch.transactions)[0],
      amount: { amountMinor: '-10', currency: 'JPY' },
    }
    await expect(createDataExportArchive(moneyMismatch)).rejects.toMatchObject({
      code: 'invalid_export_snapshot',
    })
    const unscopedJob = {
      ...base,
      revocationJobs: [
        {
          id: 'bad-job',
          connectionId: 'foreign-connection',
          state: 'pending',
          attempts: 0,
          nextAttemptAt: fixedNow(),
          deadlineAt: fixedNow(),
          completedAt: null,
          lastErrorCode: null,
        },
      ],
    }
    await expect(createDataExportArchive(unscopedJob)).rejects.toMatchObject({
      code: 'invalid_export_snapshot',
    })
    for (const secret of [
      { token: 'synthetic-secret' },
      { identity: { user: { password: 'synthetic-secret' } } },
      { sourceObservations: [{ payload: { access_token: 'synthetic-secret' } }] },
    ])
      await expect(createDataExportArchive({ ...base, ...secret })).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
  })
  test('expired raw payloads stay absent in archive data/events even before physical cleanup', async () => {
    let current = fixedNow()
    const { app } = await setup(undefined, true, () => current),
      before = await snapshot(app)
    expect(rows(before.sourceObservations).some((row) => Object.hasOwn(row, 'payload'))).toBe(true)
    current = new Date(Date.parse(current) + RAW_PAYLOAD_RETENTION_MS).toISOString()
    const response = await app.inject({ url: '/v1/export/archive' })
    expect(response.statusCode, response.payload).toBe(200)
    const files = unzipSync(response.rawPayload),
      data = JSON.parse(file(files, 'data.json'))
    expect(data.sourceObservations).toHaveLength(rows(before.sourceObservations).length)
    expect(
      data.sourceObservations.every(
        (row: Record<string, unknown>) =>
          !Object.hasOwn(row, 'payload') && !Object.hasOwn(row, 'payloadExpiresAt'),
      ),
    ).toBe(true)
    expect(file(files, 'events.jsonl')).not.toContain('"payload"')
    const stale = { ...before, exportedAt: current }
    await expect(createDataExportArchive(stale)).rejects.toMatchObject({
      code: 'invalid_export_snapshot',
    })
  })
  test('the archive cap refuses oversized exports and OpenAPI documents a binary ZIP response', async () => {
    const { app } = await setup(undefined, false),
      base = await snapshot(app)
    await expect(
      createDataExportArchive({
        ...base,
        profile: {
          ...(base.profile as Record<string, unknown>),
          name: 'x'.repeat(MAX_DATA_EXPORT_BYTES),
        },
      }),
    ).rejects.toMatchObject({ status: 422, code: 'export_too_large' })
    const description = (await app.inject({ url: '/openapi.json' })).json()
    const response = description.paths['/v1/export/archive'].get.responses['200']
    expect(response.content['application/zip'].schema).toMatchObject({
      type: 'string',
      format: 'binary',
    })
    expect(response.content['application/json']).toBeUndefined()
    expect((await app.inject({ method: 'DELETE', url: '/v1/profile' })).statusCode).toBe(204)
    expect((await app.inject({ url: '/v1/export/archive' })).statusCode).toBe(404)
  })
})
