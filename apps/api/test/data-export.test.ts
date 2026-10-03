import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { CANONICAL_CATEGORIES, CATEGORIES } from '@lilleri/domain'
import { MockItalianProvider, type ProviderTransaction } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import Fastify from 'fastify'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { ConsentLifecycleService } from '../src/consent-lifecycle.js'
import {
  createDataExportArchive,
  DATA_EXPORT_SCHEMA,
  MAX_DATA_EXPORT_BYTES,
} from '../src/data-export.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { ManualService } from '../src/manual-service.js'
import { MappedImportService } from '../src/mapped-import.js'
import { NotificationsService } from '../src/notifications.js'
import { augmentOwnershipExport, type OwnershipExport } from '../src/ownership-export.js'
import { PRIVACY_DISCLOSURES, PrivacyService } from '../src/privacy.js'
import { RAW_PAYLOAD_RETENTION_MS } from '../src/retention.js'
import { RulesService } from '../src/rules.js'
import { DemoService } from '../src/service.js'
import { SettingsService } from '../src/settings.js'
import { SupportAccessService, SupportOperatorService } from '../src/support-access.js'

type App = Awaited<ReturnType<typeof createApp>>
type Snapshot = Record<string, unknown>
type MutableOwnershipSnapshot = Snapshot & {
  consentLifecycles: NonNullable<OwnershipExport['consentLifecycles']>
  consentEvents: NonNullable<OwnershipExport['consentEvents']>
  supportAccess: NonNullable<OwnershipExport['supportAccess']>
  privacy: NonNullable<OwnershipExport['privacy']>
  notifications: NonNullable<OwnershipExport['notifications']>
  mappedImports: NonNullable<OwnershipExport['mappedImports']>
}
let handle: DatabaseHandle
const apps: App[] = []
const profileIds: string[] = []
const keyDirectories: string[] = []
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
  for (const directory of keyDirectories) await rm(directory, { recursive: true, force: true })
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

async function ownershipFixture() {
  const provider = new MockItalianProvider()
  const { app, profileId } = await setup(provider)
  const [connection] = await handle.db
    .select()
    .from(schema.connections)
    .where(eq(schema.connections.profileId, profileId))
  if (!connection) throw new Error('Missing owned provider connection')
  const lifecycle = new ConsentLifecycleService(handle.db, profileId, provider, fixedNow)
  const current = await lifecycle.get(connection.id)
  const paused = await lifecycle.pause(connection.id, current.revision)
  await lifecycle.resume(connection.id, paused.revision)
  const user = new SupportAccessService(handle.db, profileId, fixedNow)
  const grant = await user.grant({
    ticketId: 'TKT_EXPORTSYNTH01',
    reason: 'data_rights',
    durationMinutes: 15,
  })
  const operatorId = (index: number) => `op_${index.toString(16).padStart(32, '0')}`
  const operators = [
    { operatorId: operatorId(1), permissions: ['request', 'break_glass_read'] as const },
    { operatorId: operatorId(2), permissions: ['approve'] as const },
    { operatorId: operatorId(3), permissions: ['approve'] as const },
  ]
  const trusted = (index: number) =>
    new SupportOperatorService({
      db: handle.db,
      operators,
      now: fixedNow,
      identity: {
        authenticate: async () => ({
          operatorId: operatorId(index),
          authenticatedAt: fixedNow(),
          assurance: 'mfa',
        }),
      },
    })
  const request = await trusted(1).requestBreakGlass(profileId, grant.id, 'security_incident')
  await trusted(2).approveBreakGlass(profileId, grant.id, request.id)
  await trusted(3).approveBreakGlass(profileId, grant.id, request.id)
  await trusted(1).maskedView(profileId, grant.id, request.id)
  await user.revoke(grant.id, grant.revision)
  await handle.withProfile(profileId, async (db) => {
    const privacy = new PrivacyService(db, profileId, fixedNow)
    const enabled = await privacy.updateRulesOnly(1, true)
    await privacy.updateRulesOnly(enabled.revision, false)
    const [transaction] = await db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId))
    if (!transaction) throw new Error('Missing owned canonical transaction')
    const quiet = await privacy.updateTransaction(transaction.id, 1, { quiet: true, private: true })
    await privacy.updateTransaction(transaction.id, quiet.revision, { quiet: false, private: true })
    for (const purpose of ['P-AI', 'C-ANALYTICS', 'N-SERVICE'] as const) {
      const copy = PRIVACY_DISCLOSURES[purpose]
      const choice = await privacy.setPermission(purpose, 1, {
        action: purpose === 'C-ANALYTICS' ? 'denied' : 'granted',
        textVersion: copy.textVersion,
        textHash: copy.textHash,
        noticeVersion: copy.noticeVersion,
        vendorListVersion: copy.vendorListVersion,
      })
      if (purpose === 'P-AI')
        await privacy.setPermission(purpose, choice.revision, { action: 'revoked' })
    }
    const notifications = new NotificationsService(db, profileId, fixedNow)
    const preferences = await notifications.preferences()
    await notifications.updatePreferences(preferences.revision, {
      types: preferences.types,
      quietHours: { ...preferences.quietHours, enabled: false },
    })
    const id = await notifications.publish('inbox', 'ownership-inbox')
    if (!id) throw new Error('Expected optional in-app notification after explicit permission')
    const feed = await notifications.getFeed()
    const inbox = feed.items.find((row) => row.id === id)
    if (!inbox) throw new Error('Expected delivered in-app feed item')
    await notifications.markSeen(id, inbox.revision)
    await notifications.publish('security_notice', 'ownership-security')
    await notifications.publish('export_ready', `export:${fixedNow()}`)
    await notifications.publish('balance_mismatch', 'ownership-balance', connection.id)
  })
  const base = await snapshot(app)
  const owned = await handle.withProfile(profileId, (db) => augmentOwnershipExport(db, profileId))
  return { app, profileId, base: { ...base, ...owned }, owned }
}
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
  test('ownership export preserves consent, support access and privacy history in the fixed archive', async () => {
    const fixture = await ownershipFixture()
    const files = unzipSync((await createDataExportArchive(fixture.base)).body)
    const data = JSON.parse(file(files, 'data.json'))
    expect(Object.keys(files)).toHaveLength(11)
    expect(data.consentLifecycles).toEqual(fixture.owned.consentLifecycles)
    expect(data.consentEvents).toEqual(fixture.owned.consentEvents)
    expect(data.supportAccess).toEqual(fixture.owned.supportAccess)
    expect(data.privacy).toEqual(fixture.owned.privacy)
    expect(data.notifications).toEqual(fixture.owned.notifications)
    expect(data.notifications.preferences).toMatchObject({
      revision: 2,
      nativePushAvailable: false,
      osPermission: 'unknown',
    })
    expect(data.notifications.notifications).toHaveLength(4)
    expect(data.notifications.feed).toHaveLength(4)
    expect(data.notifications.events).toHaveLength(10)
    expect(
      data.notifications.feed.find((row: { type: string }) => row.type === 'inbox'),
    ).toMatchObject({ seenAt: fixedNow(), revision: 3 })
    expect(data.privacy.settings).toMatchObject({ rulesOnly: false, revision: 3 })
    expect(data.privacy.transactionFlags).toHaveLength(1)
    expect(data.privacy.transactionFlags[0]).toMatchObject({
      quiet: false,
      private: true,
      revision: 3,
    })
    expect(data.privacy.permissions.map((row: { state: string }) => row.state).sort()).toEqual([
      'denied',
      'granted',
      'revoked',
    ])
    expect(
      data.privacy.permissions.every(
        (row: { sourceOfTruth: string }) => row.sourceOfTruth === 'local_preference',
      ),
    ).toBe(true)
    expect(data.privacy.events.settings).toHaveLength(2)
    expect(data.privacy.events.transactions).toHaveLength(2)
    expect(data.privacy.events.permissions).toHaveLength(4)
    expect(data.consentEvents.map((event: { action: string }) => event.action).sort()).toEqual([
      'granted',
      'paused',
      'resumed',
    ])
    expect(data.supportAccess.grants).toHaveLength(1)
    expect(data.supportAccess.requests).toHaveLength(1)
    expect(data.supportAccess.approvals).toHaveLength(2)
    expect(data.supportAccess.events).toHaveLength(6)
    expect(file(files, 'data.json')).not.toContain('"authorization"')
    expect(file(files, 'data.json')).not.toContain('"householdId"')
    const audit = file(files, 'events.jsonl')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(
      audit.filter((event: { type: string }) => event.type === 'consent_lifecycle'),
    ).toHaveLength(3)
    expect(audit.filter((event: { type: string }) => event.type === 'support_access')).toHaveLength(
      6,
    )
    expect(
      audit.filter((event: { type: string }) => event.type === 'support_grant_record'),
    ).toHaveLength(1)
    expect(
      audit.filter((event: { type: string }) => event.type === 'support_request_record'),
    ).toHaveLength(1)
    expect(
      audit.filter((event: { type: string }) => event.type === 'support_approval_record'),
    ).toHaveLength(2)
    expect(
      audit.filter((event: { type: string }) => event.type === 'privacy_profile'),
    ).toHaveLength(2)
    expect(
      audit.filter((event: { type: string }) => event.type === 'privacy_transaction'),
    ).toHaveLength(2)
    expect(
      audit.filter((event: { type: string }) => event.type === 'privacy_permission'),
    ).toHaveLength(4)
    expect(audit.filter((event: { type: string }) => event.type === 'notification')).toHaveLength(
      10,
    )
    expect(
      (await validator.inject({ method: 'POST', url: '/validate', payload: data })).statusCode,
    ).toBe(200)
    const old = structuredClone(data)
    delete old.consentLifecycles
    delete old.consentEvents
    delete old.supportAccess
    delete old.privacy
    delete old.notifications
    delete old.mappedImports
    expect(
      (await validator.inject({ method: 'POST', url: '/validate', payload: old })).statusCode,
    ).toBe(200)
    expect(Object.keys(unzipSync((await createDataExportArchive(old)).body))).toHaveLength(11)
  })
  test('historical consent head-to-event latency remains portable with causal clock bounds', async () => {
    const fixture = await ownershipFixture()
    const candidate = structuredClone(fixture.base) as MutableOwnershipSnapshot
    const lifecycle = candidate.consentLifecycles[0]
    const history = candidate.consentEvents
      .filter((event) => event.connectionId === lifecycle.connectionId)
      .sort((a, b) => a.revision - b.revision)
    const latest = history.at(-1)
    if (!latest || history.length < 3) throw new Error('Missing real consent revision history')
    const at = (offset: number) => new Date(Date.parse(fixedNow()) + offset).toISOString()
    candidate.exportedAt = at(10)
    latest.occurredAt = at(4)
    const archived = JSON.parse(
      file(unzipSync((await createDataExportArchive(candidate)).body), 'data.json'),
    )
    expect(archived.consentLifecycles).toEqual(candidate.consentLifecycles)
    expect(archived.consentEvents).toEqual(candidate.consentEvents)
    expect(archived.consentLifecycles[0].updatedAt).toBe(fixedNow())
    expect(
      archived.consentEvents.find((event: { id: string }) => event.id === latest.id).occurredAt,
    ).toBe(at(4))
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        value.consentLifecycles[0].updatedAt = at(5)
      },
      (value) => {
        value.consentLifecycles[0].updatedAt = at(-1)
      },
      (value) => {
        const first = value.consentEvents.find((event) => event.id === history[0].id)
        if (!first) throw new Error('Missing first consent event')
        first.occurredAt = at(5)
      },
    ]
    for (const attack of attacks) {
      const invalid = structuredClone(candidate)
      attack(invalid)
      await expect(createDataExportArchive(invalid)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
  })
  test('ownership archive refuses cross-profile records, wrong references, duplicate identities and credentials', async () => {
    const owner = await ownershipFixture(),
      other = await ownershipFixture()
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        value.consentEvents.splice(1, 1)
      },
      (value) => {
        value.supportAccess.approvals.pop()
      },
      (value) => {
        const index = value.supportAccess.events.findIndex(
          (event) => event.action === 'break_glass_approved',
        )
        value.supportAccess.events.splice(index, 1)
      },
      (value) => {
        value.consentLifecycles[0].terms.state = 'revoked'
      },
      (value) => {
        value.supportAccess.grants[0].revision = 1
      },
      (value) => {
        value.consentEvents[0].profileId = other.profileId
      },
      (value) => {
        value.consentEvents[0].connectionId = 'missing-connection'
      },
      (value) => {
        value.consentEvents[0].consentId = 'missing-consent'
      },
      (value) => {
        value.consentEvents.push(structuredClone(value.consentEvents[0]))
      },
      (value) => {
        value.consentLifecycles.push(structuredClone(value.consentLifecycles[0]))
      },
      (value) => {
        value.consentEvents[0].terms.providerId = 'other-provider'
      },
      (value) => {
        ;(value.consentEvents[0].terms as unknown as Record<string, unknown>).token =
          'never-export-a-credential'
      },
      (value) => {
        value.supportAccess.grants.push(structuredClone(other.owned.supportAccess?.grants[0]))
      },
      (value) => {
        value.supportAccess.requests[0].grantId = '00000000-0000-4000-8000-000000000000'
      },
      (value) => {
        value.supportAccess.approvals[0].requestId = '00000000-0000-4000-8000-000000000000'
      },
      (value) => {
        value.supportAccess.approvals.push(structuredClone(value.supportAccess.approvals[0]))
      },
      (value) => {
        value.supportAccess.events[0].grantId = '00000000-0000-4000-8000-000000000000'
      },
      (value) => {
        value.supportAccess.events[0].operatorId = 'operator@example.invalid'
      },
    ]
    for (const attack of attacks) {
      const candidate = structuredClone(owner.base) as MutableOwnershipSnapshot
      attack(candidate)
      await expect(createDataExportArchive(candidate)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
    await expect(
      handle.withProfile(owner.profileId, (db) => augmentOwnershipExport(db, other.profileId)),
    ).rejects.toMatchObject({ status: 404 })
  })
  test('ownership audit rejects invented future history, excessive access windows and mismatched request grants', async () => {
    const fixture = await ownershipFixture()
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        value.consentEvents[0].occurredAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        value.consentLifecycles[0].updatedAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        value.consentEvents[0].terms.requiredActions = [
          {
            action: 'renew_consent',
            method: 'redirect',
            dueAt: 'invalid-date',
            evidenceReference: 'synthetic',
          },
        ]
      },
      (value) => {
        value.supportAccess.grants[0].expiresAt = '2026-10-03T12:16:00.000Z'
      },
      (value) => {
        value.supportAccess.requests[0].expiresAt = '2026-10-03T12:16:00.000Z'
      },
      (value) => {
        value.supportAccess.approvals[0].approvedAt = '2026-10-03T12:16:00.000Z'
      },
      (value) => {
        value.supportAccess.approvals[0].approvedBy = value.supportAccess.requests[0].requestedBy
      },
      (value) => {
        value.supportAccess.events[0].occurredAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        const event = value.supportAccess.events.find(
          (item: { action: string }) => item.action === 'break_glass_read',
        )
        event.requestId = null
      },
    ]
    for (const attack of attacks) {
      const candidate = structuredClone(fixture.base) as MutableOwnershipSnapshot
      attack(candidate)
      await expect(createDataExportArchive(candidate)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
  })
  test('privacy audit refuses foreign flags, missing history, fabricated preferences and altered clocks', async () => {
    const fixture = await ownershipFixture()
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        value.privacy.settings.profileId = 'foreign-profile'
      },
      (value) => {
        value.privacy.transactionFlags[0].transactionId = 'foreign-transaction'
      },
      (value) => {
        value.privacy.events.transactions[0].profileId = 'foreign-profile'
      },
      (value) => {
        value.privacy.events.transactions[0].transactionId = 'foreign-transaction'
      },
      (value) => {
        value.privacy.permissions.push(structuredClone(value.privacy.permissions[0]))
      },
      (value) => {
        value.privacy.permissions.pop()
      },
      (value) => {
        value.privacy.events.settings.pop()
      },
      (value) => {
        value.privacy.events.transactions.pop()
      },
      (value) => {
        value.privacy.events.permissions.pop()
      },
      (value) => {
        value.privacy.events.permissions.push(structuredClone(value.privacy.events.permissions[0]))
      },
      (value) => {
        value.privacy.settings.rulesOnly = true
      },
      (value) => {
        value.privacy.transactionFlags[0].quiet = true
      },
      (value) => {
        value.privacy.permissions[0].state = 'not_granted'
      },
      (value) => {
        value.privacy.events.permissions[0].beforeState = 'granted'
      },
      (value) => {
        value.privacy.events.permissions[0].textHash = 'invalid-hash'
      },
      (value) => {
        value.privacy.events.settings[0].occurredAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        value.privacy.permissions[0].updatedAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        value.privacy.permissions[0].reaskNotBefore = '2026-10-03T11:59:59.000Z'
      },
      (value) => {
        ;(value.privacy.events.permissions[0] as unknown as Record<string, unknown>).token =
          'synthetic-forbidden'
      },
    ]
    for (const attack of attacks) {
      const candidate = structuredClone(fixture.base) as MutableOwnershipSnapshot
      attack(candidate)
      await expect(createDataExportArchive(candidate)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
  })
  test('notification audit rejects foreign routing, incomplete delivery history, hidden feed items and invented titles', async () => {
    const fixture = await ownershipFixture()
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        value.notifications.notifications[0].profileId = 'foreign-profile'
      },
      (value) => {
        value.notifications.notifications[0].connectionId = 'foreign-connection'
      },
      (value) => {
        value.notifications.notifications[0].consentId = 'foreign-consent'
      },
      (value) => {
        value.notifications.events[0].profileId = 'foreign-profile'
      },
      (value) => {
        value.notifications.events[0].notificationId = randomUUID()
      },
      (value) => {
        value.notifications.events.pop()
      },
      (value) => {
        value.notifications.events.push(structuredClone(value.notifications.events[0]))
      },
      (value) => {
        value.notifications.notifications.push(
          structuredClone(value.notifications.notifications[0]),
        )
      },
      (value) => {
        value.notifications.feed.pop()
      },
      (value) => {
        value.notifications.feed[0].title = 'Private invented title'
      },
      (value) => {
        value.notifications.feed[0].deliveredAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        value.notifications.preferences.timezone = 'Asia/Tokyo'
      },
      (value) => {
        value.notifications.events[0].occurredAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        const row = value.notifications.notifications.find((item) => item.kind === 'inbox')
        if (!row) throw new Error('Missing optional owned notification')
        row.permissionRevision = null
      },
    ]
    for (const attack of attacks) {
      const candidate = structuredClone(fixture.base) as MutableOwnershipSnapshot
      attack(candidate)
      await expect(createDataExportArchive(candidate)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
  })
  test('saved mappings and exact imported value-date provenance remain portable after raw payload expiry', async () => {
    const fixture = await mappedOwnershipFixture(false)
    const data = fixture.snapshot as MutableOwnershipSnapshot
    expect(data.mappedImports.mappings).toHaveLength(1)
    expect(data.mappedImports.mappings[0]).toMatchObject({
      name: 'Mappa personale aggiornata €',
      revision: 4,
      archived: false,
    })
    expect(
      [...data.mappedImports.events]
        .sort((a, b) => a.revision - b.revision)
        .map((event) => event.action),
    ).toEqual(['created', 'updated', 'archived', 'restored'])
    expect(data.mappedImports.provenance).toHaveLength(1)
    expect(data.mappedImports.provenance[0]).toMatchObject({
      valueOn: '2026-10-03',
      rowNumber: 2,
      identity: 'external',
    })
    const transaction = rows(data.transactions)[0]
    expect(transaction.amount).toEqual({ amountMinor: '-123456', currency: 'EUR' })
    const before = unzipSync((await createDataExportArchive(data)).body)
    expect(JSON.parse(file(before, 'data.json')).mappedImports).toEqual(data.mappedImports)
    expect(file(before, 'events.jsonl')).toContain('"type":"csv_mapping"')
    expect(file(before, 'events.jsonl')).toContain('"type":"mapped_import_provenance"')
    expect(file(before, 'data.json')).not.toContain('"householdId"')
    expect(
      (await validator.inject({ method: 'POST', url: '/validate', payload: data })).statusCode,
    ).toBe(200)
    fixture.advance()
    const expired = await snapshot(fixture.app)
    expect(rows(expired.sourceObservations).every((row) => !Object.hasOwn(row, 'payload'))).toBe(
      true,
    )
    expect(expired.mappedImports).toEqual(data.mappedImports)
    const after = unzipSync((await createDataExportArchive(expired)).body)
    expect(JSON.parse(file(after, 'data.json')).mappedImports.provenance[0].valueOn).toBe(
      '2026-10-03',
    )
    expect(file(after, 'data.json')).not.toContain('rawFields')
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        value.mappedImports.mappings[0].profileId = 'foreign-profile'
      },
      (value) => {
        value.mappedImports.mappings[0].accountId = 'foreign-account'
      },
      (value) => {
        value.mappedImports.events[0].mappingId = 'foreign-mapping'
      },
      (value) => {
        value.mappedImports.events[0].after.profileId = 'foreign-profile'
      },
      (value) => {
        value.mappedImports.events.pop()
      },
      (value) => {
        value.mappedImports.events.push(structuredClone(value.mappedImports.events[0]))
      },
      (value) => {
        value.mappedImports.provenance[0].observationId = 'foreign-observation'
      },
      (value) => {
        value.mappedImports.provenance[0].transactionId = 'foreign-transaction'
      },
      (value) => {
        value.mappedImports.provenance.push(structuredClone(value.mappedImports.provenance[0]))
      },
      (value) => {
        value.mappedImports.provenance[0].valueOn = '2026-02-30'
      },
      (value) => {
        value.mappedImports.events[0].createdAt = '2026-10-03T12:00:01.000Z'
      },
      (value) => {
        value.mappedImports.mappings[0].mapping.columns.bookedOn =
          value.mappedImports.mappings[0].mapping.columns.description
      },
    ]
    for (const attack of attacks) {
      const candidate = structuredClone(data)
      attack(candidate)
      await expect(createDataExportArchive(candidate)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
  })
  test('historical mapping snapshot-to-event latency stays portable with revision clock and chain guards', async () => {
    const fixture = await mappedOwnershipFixture(false)
    const candidate = structuredClone(fixture.snapshot) as MutableOwnershipSnapshot
    const history = [...candidate.mappedImports.events].sort((a, b) => a.revision - b.revision)
    const latest = history.at(-1)
    const previous = history.at(-2)
    if (!latest || !previous) throw new Error('Missing real mapping revision history')
    const at = (offset: number) => new Date(Date.parse(fixedNow()) + offset).toISOString()
    candidate.exportedAt = at(10)
    latest.createdAt = at(4)
    const archived = JSON.parse(
      file(unzipSync((await createDataExportArchive(candidate)).body), 'data.json'),
    )
    expect(archived.mappedImports).toEqual(candidate.mappedImports)
    const exportedEvent = archived.mappedImports.events.find(
      (event: { id: string }) => event.id === latest.id,
    )
    expect(exportedEvent.after.updatedAt).toBe(fixedNow())
    expect(exportedEvent.createdAt).toBe(at(4))
    const event = (value: MutableOwnershipSnapshot, id: string) => {
      const row = value.mappedImports.events.find((item) => item.id === id)
      if (!row) throw new Error('Missing mapped audit event')
      return row
    }
    const attacks: ((snapshot: MutableOwnershipSnapshot) => void)[] = [
      (value) => {
        event(value, latest.id).createdAt = at(-1)
      },
      (value) => {
        event(value, previous.id).createdAt = at(1)
      },
      (value) => {
        value.mappedImports.mappings[0].name = 'Divergent current mapping'
      },
      (value) => {
        const before = event(value, latest.id).before
        if (!before) throw new Error('Missing mapping before snapshot')
        before.name = 'Divergent previous mapping'
      },
      (value) => {
        event(value, history[0].id).after.accountId = 'foreign-account'
      },
      (value) => {
        event(value, history[0].id).after.createdAt = at(-1)
      },
    ]
    for (const attack of attacks) {
      const invalid = structuredClone(candidate)
      attack(invalid)
      await expect(createDataExportArchive(invalid)).rejects.toMatchObject({
        code: 'invalid_export_snapshot',
      })
    }
  })
  test('scoped encrypted mapped import exports decrypted mapping names, configurations and before/after history', async () => {
    const fixture = await mappedOwnershipFixture(true)
    const response = await fixture.app.inject({ url: '/v1/export/archive' })
    expect(response.statusCode, response.payload).toBe(200)
    const files = unzipSync(response.rawPayload),
      data = JSON.parse(file(files, 'data.json'))
    expect(data.mappedImports).toEqual(fixture.snapshot.mappedImports)
    expect(data.mappedImports.mappings[0].name).toBe('Mappa personale aggiornata €')
    const changed = data.mappedImports.events.find(
      (event: { action: string }) => event.action === 'updated',
    )
    expect(changed.before.name).toBe('Mappa personale €')
    expect(changed.after.name).toBe('Mappa personale aggiornata €')
    expect(file(files, 'data.json')).not.toContain('_lilleriEncrypted')
    expect(file(files, 'data.json')).not.toContain('lilleri:enc:')
  })
})

async function mappedOwnershipFixture(encrypted: boolean) {
  const profileId = `mapped_export_${randomUUID()}`
  profileIds.push(profileId)
  let current = fixedNow()
  const now = () => current
  let encryption: ProfileEncryption | undefined
  if (encrypted) {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-export-vault-'))
    keyDirectories.push(directory)
    encryption = new ProfileEncryption(
      handle.db,
      await createLocalSyntheticKeyManagement({ directory, mode: 'demo' }),
      now,
    )
  }
  const provider = new MockItalianProvider()
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    profileId,
    provider,
    seed: false,
    now,
    financialScope: handle.withProfile,
    ...(encryption ? { encryption } : {}),
  })
  apps.push(app)
  await handle.withProfile(profileId, async (db) => {
    const manual = new ManualService(db, profileId, now, encryption)
    const account = await manual.create({
      requestId: randomUUID(),
      name: 'Contanti CSV',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '200000',
      openingOn: '2026-10-01',
    })
    const service = new MappedImportService(
      new DemoService(db, profileId, provider, now, encryption),
    )
    const created = await service.create({
      accountId: account.id,
      name: 'Mappa personale €',
      mapping: {
        format: 'lilleri.csv-mapping.v1',
        delimiter: ';',
        numberLocale: 'it-IT',
        dateFormat: 'dd/MM/yyyy',
        columns: {
          externalId: 'ID',
          bookedOn: 'Data',
          valueOn: 'Valuta',
          amount: 'Importo',
          description: 'Descrizione',
        },
        defaultCurrency: 'EUR',
      },
    })
    const renamed = await service.update(created.id, {
      revision: created.revision,
      name: 'Mappa personale aggiornata €',
    })
    const archived = await service.update(created.id, {
      revision: renamed.revision,
      archived: true,
    })
    await service.update(created.id, { revision: archived.revision, archived: false })
    const input = {
      accountId: account.id,
      mappingId: created.id,
      csv: 'ID;Data;Valuta;Importo;Descrizione\r\none;02/10/2026;03/10/2026;-1.234,56;Acquisto CSV\r\n',
    }
    const preview = await service.preview(input)
    expect(preview.canImport).toBe(true)
    expect(
      await service.commit({
        ...input,
        previewRevision: preview.previewRevision,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: true,
      }),
    ).toMatchObject({ inserted: 1, rejected: 0 })
  })
  return {
    app,
    snapshot: await snapshot(app),
    advance: () => {
      current = new Date(Date.parse(current) + RAW_PAYLOAD_RETENTION_MS).toISOString()
    },
  }
}
