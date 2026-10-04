import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { LOCAL_TERMS_VERSION } from '../src/identity.js'
import { memberships, session, user } from '../src/identity-schema.js'
import { pendingLifecycles } from '../src/pending-lifecycle-schema.js'
import { transactionPrivacy } from '../src/privacy-schema.js'
import { DEFAULT_SYNC_CONFIGURATION } from '../src/runtime-config.js'
import { syncHash } from '../src/sync-provider.js'
import { emptySyncReport, syncJobs, syncPresence } from '../src/sync-schema.js'

let handle: DatabaseHandle, encryption: ProfileEncryption, vault: string
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const profiles: string[] = [],
  users: string[] = []
const baseAt = '2026-10-03T22:30:00.000Z' // Already 4 October in the Rome profile calendar.
const origin = 'http://localhost:3000'
const authHeaders = (cookie = '') => ({ origin, host: 'localhost:3001', cookie })
const cookies = (value: unknown) =>
  (Array.isArray(value) ? value : [value])
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.split(';')[0])
    .join('; ')
type TxInput = Partial<typeof schema.transactions.$inferInsert> & { readonly id: string }
async function fixture(secure = true) {
  let at = baseAt
  const profileId = `ledger_${randomUUID()}`,
    connectionId = `ledger_connection_${randomUUID()}`
  const accountId = `ledger_account_${randomUUID()}`,
    foreignCurrencyAccountId = `${accountId}_gbp`
  profiles.push(profileId)
  await handle.db
    .insert(schema.profiles)
    .values({ id: profileId, name: 'Sintetico', timezone: 'Europe/Rome', createdAt: baseAt })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: 'mock-italian',
    institutionId: 'synthetic',
    status: 'active',
    createdAt: baseAt,
  })
  for (const [id, currency] of [
    [accountId, 'EUR'],
    [foreignCurrencyAccountId, 'GBP'],
  ] as const)
    await handle.db.insert(schema.accounts).values({
      id,
      profileId,
      connectionId,
      providerAccountId: id,
      name: 'Conto sintetico',
      institutionName: 'Sintetico',
      kind: 'current',
      balanceMinor: 9007199254740993n,
      currency,
      balanceUpdatedAt: baseAt,
    })
  const app = await createApp({
    db: handle.db,
    financialScope: handle.withProfile,
    demoMode: true,
    profileId,
    seed: false,
    now: () => at,
    ...(secure ? { encryption } : {}),
  })
  apps.push(app)
  const insert = async (values: readonly TxInput[]) => {
    const rows: (typeof schema.transactions.$inferInsert)[] = []
    for (const value of values) {
      const row = {
        profileId,
        connectionId,
        accountId,
        providerId: 'mock-italian',
        providerTransactionId: value.id,
        revision: 1,
        source: 'bank' as const,
        status: 'booked' as const,
        amountMinor: -123n,
        currency: 'EUR' as const,
        description: 'Spesa sintetica',
        merchantName: null,
        merchantKey: null,
        reference: null,
        relatedTransactionId: null,
        relatedAccountId: null,
        bookedOn: '2026-10-01',
        authorizedOn: null,
        observedAt: baseAt,
        kind: 'expense' as const,
        contentHash: 'b'.repeat(64),
        ...value,
      }
      rows.push(secure ? await encryption.encryptTransactionRow(handle.db, row) : row)
    }
    for (let offset = 0; offset < rows.length; offset += 100)
      await handle.db.insert(schema.transactions).values(rows.slice(offset, offset + 100))
  }
  const search = (query = '') => app.inject({ url: `/v1/ledger/search${query}` })
  const projection = (query = '') => app.inject({ url: `/v1/ledger/projection${query}` })
  return {
    setNow: (value: string) => {
      at = value
    },
    app,
    profileId,
    connectionId,
    accountId,
    foreignCurrencyAccountId,
    insert,
    search,
    projection,
  }
}
type OwnedFixture = Awaited<ReturnType<typeof fixture>>
async function cursors(owned: OwnedFixture) {
  const search = (await owned.search('?limit=1')).json()
  const projection = (await owned.projection('?limit=1')).json()
  expect(search.nextCursor).toBeTypeOf('string')
  expect(projection.nextCursor).toBeTypeOf('string')
  return { search: search.nextCursor as string, projection: projection.nextCursor as string }
}
async function rejectedCursors(owned: OwnedFixture, previous: Awaited<ReturnType<typeof cursors>>) {
  for (const response of [
    await owned.search(`?limit=1&cursor=${previous.search}`),
    await owned.projection(`?limit=1&cursor=${previous.projection}`),
  ]) {
    expect(response.statusCode, response.payload).toBe(409)
    expect(response.json().code).toBe('ledger_changed')
  }
}
async function presence(
  owned: OwnedFixture,
  transactionId: string,
  replacementTransactionId?: string,
) {
  const jobId = `ledger_presence_job_${randomUUID()}`,
    consentId = `ledger_presence_consent_${randomUUID()}`
  await handle.db.insert(schema.consents).values({
    id: consentId,
    profileId: owned.profileId,
    connectionId: owned.connectionId,
    purpose: 'account_information',
    grantedAt: baseAt,
    expiresAt: '2026-12-01T00:00:00.000Z',
    provider: 'mock-italian',
  })
  await handle.db.insert(syncJobs).values({
    id: jobId,
    profileId: owned.profileId,
    connectionId: owned.connectionId,
    consentId,
    providerId: 'mock-italian',
    requestId: randomUUID(),
    requestHash: 'b'.repeat(64),
    mode: 'user_present',
    requestedFrom: '2026-10-01',
    requestedTo: '2026-10-04',
    state: 'completed',
    reason: null,
    configurationRevision: 1,
    configurationDigest: 'b'.repeat(64),
    configuration: DEFAULT_SYNC_CONFIGURATION,
    providerPolicy: new MockItalianProvider().syncMetadata(),
    leaseToken: null,
    leaseExpiresAt: null,
    leaseEpoch: 0,
    failures: 0,
    availableAt: baseAt,
    revision: 1,
    report: emptySyncReport(),
    createdAt: baseAt,
    updatedAt: baseAt,
    completedAt: baseAt,
  })
  await handle.db.insert(syncPresence).values({
    transactionId,
    profileId: owned.profileId,
    connectionId: owned.connectionId,
    accountId: owned.accountId,
    state: replacementTransactionId ? 'pending_replaced' : 'removed_by_source',
    missingCompletions: replacementTransactionId ? 0 : 2,
    lastCompleteJobId: jobId,
    evidence: {
      version: 'sync-presence-v1',
      snapshotId: 'synthetic-read-fixture',
      rule: replacementTransactionId ? 'provider_link_exact' : 'two_complete_windows',
      ...(replacementTransactionId ? { replacementTransactionId } : {}),
    },
    updatedAt: baseAt,
  })
}
async function pendingFixture(changedAmount: boolean) {
  const owned = await fixture(),
    id = randomUUID(),
    holdId = `${id}_hold`,
    replacementId = `${id}_booked`,
    amountMinor = changedAmount ? '-124' : '-123',
    state = changedAmount ? ('amount_change_review' as const) : ('replaced' as const)
  await owned.insert([
    { id: holdId, status: 'pending', bookedOn: null, authorizedOn: '2026-10-01' },
    { id: replacementId, amountMinor: BigInt(amountMinor), relatedTransactionId: holdId },
    { id: `${id}_stable_a` },
    { id: `${id}_stable_b` },
  ])
  await presence(owned, holdId, replacementId)
  const payload = {
    version: 'pending-lifecycle-v1',
    state,
    pending: { amountMinor: '-123', currency: 'EUR', status: 'pending', revision: 1 },
    observed: { amountMinor, currency: 'EUR', status: 'booked', revision: 1 },
    replacement: { id: replacementId, amountMinor, currency: 'EUR', status: 'booked', revision: 1 },
    evidence: null,
    carried: [],
    decision: null,
  }
  await handle.db.insert(pendingLifecycles).values({
    transactionId: holdId,
    profileId: owned.profileId,
    connectionId: owned.connectionId,
    accountId: owned.accountId,
    replacementTransactionId: replacementId,
    firstSeenAt: baseAt,
    state,
    revision: 1,
    pendingRevision: 1,
    replacementRevision: 1,
    digest: syncHash(payload),
    payload: await encryption.encryptJson(
      handle.db,
      { profileId: owned.profileId, table: 'pending_lifecycles', column: 'payload', rowId: holdId },
      payload,
    ),
    updatedAt: baseAt,
  })
  return { ...owned, holdId }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  vault = await mkdtemp(join(tmpdir(), 'lilleri-ledger-vault-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' }),
    () => baseAt,
  )
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const id of users) await handle.db.delete(user).where(eq(user.id, id))
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
  await rm(vault, { recursive: true, force: true })
})

describe('authoritative owned ledger read model', () => {
  test('scoped HTTP keep-manual/remove/undo changes both read projections, rejects old cursors and leaves encrypted canonical rows intact', async () => {
    const owned = await fixture(),
      other = await fixture(),
      id = randomUUID(),
      transactionId = `${id}_source_removed`
    await owned.insert([{ id: transactionId }, { id: `${id}_stable_a` }, { id: `${id}_stable_b` }])
    await presence(owned, transactionId)
    const raw = () =>
      handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, owned.profileId))
        .orderBy(schema.transactions.id)
    const original = await raw()
    const initial = (await owned.app.inject('/v1/reconciliation/source-removals')).json()[0]
    const input = {
      transactionId,
      revision: initial.revision,
      transactionRevision: initial.transactionRevision,
      presenceDigest: initial.presenceDigest,
      choice: 'keep_manual',
    }
    const beforeForeign = await cursors(owned)
    const foreign = await other.app.inject({
      method: 'POST',
      url: '/v1/reconciliation/source-removals/decision',
      payload: input,
    })
    expect(foreign.statusCode, foreign.payload).toBe(404)
    expect((await owned.search(`?limit=1&cursor=${beforeForeign.search}`)).statusCode).toBe(200)
    let revision = input.revision
    for (const choice of ['keep_manual', 'remove', 'undo'] as const) {
      const previous = await cursors(owned)
      const response = await owned.app.inject({
        method: 'POST',
        url: '/v1/reconciliation/source-removals/decision',
        payload: { ...input, revision, choice },
      })
      expect(response.statusCode, response.payload).toBe(200)
      revision = response.json().revision
      await rejectedCursors(owned, previous)
      for (const page of [(await owned.search()).json(), (await owned.projection()).json()]) {
        const transaction = page.items.find((item: { id: string }) => item.id === transactionId)
        if (choice === 'remove') expect(transaction).toBeUndefined()
        else expect(transaction.source).toBe(choice === 'keep_manual' ? 'manual' : 'bank')
      }
      expect(await raw()).toEqual(original)
    }
  })

  test.each([true, false])(
    'scoped HTTP pending choice/undo fences both cursors, restores the reservation despite old presence proof and retains canonical history (changed amount: %s)',
    async (changedAmount) => {
      const owned = await pendingFixture(changedAmount)
      const raw = () =>
        handle.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.profileId, owned.profileId))
          .orderBy(schema.transactions.id)
      const original = await raw()
      let view = (await owned.app.inject('/v1/reconciliation/pending')).json()[0]
      const actions = changedAmount ? (['accept', 'undo'] as const) : (['undo'] as const)
      for (const action of actions) {
        const previous = await cursors(owned)
        const response = await owned.app.inject({
          method: 'POST',
          url: '/v1/reconciliation/pending/decision',
          payload: {
            transactionId: view.transactionId,
            revision: view.revision,
            expectedDigest: view.digest,
            replacementRevision: view.replacementRevision,
            action,
          },
        })
        expect(response.statusCode, response.payload).toBe(200)
        view = response.json()
        await rejectedCursors(owned, previous)
        for (const page of [(await owned.search()).json(), (await owned.projection()).json()]) {
          expect(page.items.some((item: { id: string }) => item.id === owned.holdId)).toBe(
            action === 'undo',
          )
          expect(page.items).toHaveLength(action === 'undo' ? 4 : 3)
        }
        expect(await raw()).toEqual(original)
      }
    },
  )

  test('expiring page tokens and bounded response bytes require an explicit restart/export instead of accepting a partial snapshot', async () => {
    const owned = await fixture(false),
      id = randomUUID()
    await owned.insert([{ id: `${id}_a` }, { id: `${id}_b` }])
    const first = (await owned.search('?limit=1')).json()
    owned.setNow('2026-10-03T22:46:00.000Z')
    expect((await owned.search(`?cursor=${first.nextCursor}`)).statusCode).toBe(400)
    owned.setNow(baseAt)
    await owned.insert([
      { id: `${id}_oversized`, bookedOn: '2026-10-04', description: 'x'.repeat(140_000) },
    ])
    const response = await owned.search()
    expect(response.statusCode, response.payload).toBe(413)
    expect(response.json().code).toBe('ledger_record_too_large')
    expect(response.json()).not.toHaveProperty('items')
  })
  test('searches encrypted full history with literal text, exact money, inclusive financial dates, account and currency filters', async () => {
    const owned = await fixture()
    const id = randomUUID()
    await owned.insert([
      {
        id: `${id}_old`,
        bookedOn: '2021-01-01',
        description: 'Archiviato CAFÉ %_ 100%',
        merchantName: 'Bottega',
      },
      {
        id: `${id}_current`,
        bookedOn: '2026-10-01',
        authorizedOn: '2026-09-30',
        merchantName: 'CAFÉ',
        amountMinor: -9007199254740993n,
      },
      {
        id: `${id}_other_currency`,
        accountId: owned.foreignCurrencyAccountId,
        currency: 'GBP',
        merchantName: 'CAFÉ',
      },
      {
        id: `${id}_pending`,
        status: 'pending',
        bookedOn: null,
        authorizedOn: '2026-10-01',
        reference: 'CAFÉ',
      },
      { id: `${id}_undated`, bookedOn: null },
    ])
    const response = await owned.search(
      '?q=caf%C3%A9&from=2026-10-01&to=2026-10-01&currency=EUR&status=booked',
    )
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json().items.map((item: { id: string }) => item.id)).toEqual([`${id}_current`])
    expect(response.json().items[0].amount).toEqual({
      amountMinor: '-9007199254740993',
      currency: 'EUR',
    })
    expect((await owned.search('?q=%25_')).json().items[0].id).toBe(`${id}_old`)
    expect(
      (await owned.search(`?q=caf%C3%A9&accountId=${owned.foreignCurrencyAccountId}`))
        .json()
        .items.map((item: { id: string }) => item.id),
    ).toEqual([`${id}_other_currency`])
    expect((await owned.search('?from=2026-02-30')).statusCode).toBe(400)
    expect((await owned.search('?from=2026-10-02&to=2026-10-01')).statusCode).toBe(400)
    expect((await owned.search('?profileId=another')).statusCode).toBe(400)
    const [stored] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, `${id}_old`))
    expect(stored?.description).not.toContain('CAFÉ')
  })

  test('90 profile-calendar dates include both boundaries, exclude undated/future/older records, and preserve separate current observed balances', async () => {
    const owned = await fixture(),
      id = randomUUID()
    await owned.insert([
      { id: `${id}_first`, bookedOn: '2026-07-07' },
      { id: `${id}_last`, bookedOn: null, authorizedOn: '2026-10-04' },
      { id: `${id}_old`, bookedOn: '2026-07-06' },
      { id: `${id}_future`, bookedOn: '2026-10-05' },
      { id: `${id}_unknown`, bookedOn: null, authorizedOn: null },
    ])
    const response = await owned.projection()
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json().window).toEqual({ from: '2026-07-07', to: '2026-10-04', days: 90 })
    expect(response.json().items.map((item: { id: string }) => item.id)).toEqual([
      `${id}_last`,
      `${id}_first`,
    ])
    expect(response.json().accounts.map((item: { balance: unknown }) => item.balance)).toEqual([
      { amountMinor: '9007199254740993', currency: 'EUR' },
      { amountMinor: '9007199254740993', currency: 'GBP' },
    ])
    expect(response.json().policy).toMatchObject({
      aggregates: false,
      forecast: false,
      balances: 'current_observed_per_account',
      undated: 'excluded',
    })
    expect(response.json()).not.toHaveProperty('analysis')
    const full = await owned.search()
    expect(full.json().items).toHaveLength(5)
  })

  test('scoped keyset pages have no duplicates across same-day ties, bind filters/profile/signature and reject late bookings before an existing cursor', async () => {
    const owned = await fixture(),
      other = await fixture(),
      id = randomUUID()
    await owned.insert(
      Array.from({ length: 5 }, (_, index) => ({ id: `${id}_${index}`, description: 'Pagina' })),
    )
    await other.insert([{ id: `${id}_foreign`, description: 'Pagina' }])
    const first = (await owned.search('?q=pagina&limit=2')).json()
    const second = (await owned.search(`?q=pagina&limit=2&cursor=${first.nextCursor}`)).json()
    const last = (await owned.search(`?q=pagina&limit=2&cursor=${second.nextCursor}`)).json()
    const ids = [...first.items, ...second.items, ...last.items].map(
      (item: { id: string }) => item.id,
    )
    expect(new Set(ids).size).toBe(5)
    expect(ids).not.toContain(`${id}_foreign`)
    expect(last.nextCursor).toBeNull()
    expect((await other.search(`?q=pagina&cursor=${first.nextCursor}`)).statusCode).toBe(400)
    expect((await owned.search(`?q=another&cursor=${first.nextCursor}`)).statusCode).toBe(400)
    const tampered = `${first.nextCursor.slice(0, -1)}${first.nextCursor.endsWith('0') ? '1' : '0'}`
    expect((await owned.search(`?q=pagina&cursor=${tampered}`)).statusCode).toBe(400)
    expect((await owned.search(`?accountId=${other.accountId}`)).statusCode).toBe(404)
    // A newly booked transaction belongs ahead of page1; silently continuing would omit it.
    await owned.insert([{ id: `${id}_late`, bookedOn: '2026-10-04', description: 'Pagina' }])
    const changed = await owned.search(`?q=pagina&cursor=${first.nextCursor}`)
    expect(changed.statusCode, changed.payload).toBe(409)
    expect(changed.json().code).toBe('ledger_changed')
    expect((await owned.search('?q=pagina')).json().items[0].id).toBe(`${id}_late`)
  })

  test('bounded text scanning distinguishes an intermediate empty page from complete no-results and can reach old matches', async () => {
    const owned = await fixture(false),
      id = randomUUID()
    await owned.insert([
      ...Array.from({ length: 1001 }, (_, index) => ({
        id: `${id}_${String(index).padStart(4, '0')}`,
      })),
      { id: `${id}_target`, bookedOn: '2020-01-01', description: 'Storico remoto cercato' },
    ])
    const first = (await owned.search('?q=remoto')).json()
    expect(first.items).toEqual([])
    expect(first.searchComplete).toBe(false)
    expect(first.nextCursor).toBeTypeOf('string')
    const last = (await owned.search(`?q=remoto&cursor=${first.nextCursor}`)).json()
    expect(last.items.map((item: { id: string }) => item.id)).toEqual([`${id}_target`])
    expect(last.searchComplete).toBe(true)
    expect(last.nextCursor).toBeNull()
  })

  test('private/quiet records remain owned readable facts with current flags; privacy changes invalidate pagination without publishing derived insights', async () => {
    const owned = await fixture(),
      id = randomUUID()
    await owned.insert([{ id: `${id}_a` }, { id: `${id}_b` }])
    const first = (await owned.projection('?limit=1')).json()
    await handle.db.insert(transactionPrivacy).values({
      profileId: owned.profileId,
      transactionId: `${id}_a`,
      quiet: true,
      private: true,
      revision: 1,
      updatedAt: baseAt,
    })
    const stale = await owned.projection(`?limit=1&cursor=${first.nextCursor}`)
    expect(stale.statusCode).toBe(409)
    const current = (await owned.projection()).json()
    expect(current.items).toHaveLength(2)
    expect(current.privacy).toEqual([
      { transactionId: `${id}_a`, quiet: true, private: true, revision: 1 },
    ])
    expect(current.policy.privacy).toBe('owned_records_including_quiet_private')
    expect(current).not.toHaveProperty('summaries')
    await handle.db.delete(schema.transactions).where(eq(schema.transactions.id, `${id}_a`))
    expect((await owned.projection()).json().items.map((item: { id: string }) => item.id)).toEqual([
      `${id}_b`,
    ])
  })

  test('excludes only verified pending replacement even when the booking lies outside date/account filters; missing/wrong-amount links retain the hold', async () => {
    const owned = await fixture(),
      id = randomUUID()
    await owned.insert([
      { id: `${id}_hold`, status: 'pending', bookedOn: null, authorizedOn: '2026-10-01' },
      { id: `${id}_booked`, bookedOn: '2026-10-04', relatedTransactionId: `${id}_hold` },
      { id: `${id}_missing`, status: 'pending', bookedOn: null, authorizedOn: '2026-10-01' },
    ])
    const jobId = `${id}_job`
    await handle.db.insert(schema.consents).values({
      id: `${id}_consent`,
      profileId: owned.profileId,
      connectionId: owned.connectionId,
      purpose: 'account_information',
      grantedAt: baseAt,
      expiresAt: '2026-12-01T00:00:00.000Z',
      provider: 'mock-italian',
    })
    await handle.db.insert(syncJobs).values({
      id: jobId,
      profileId: owned.profileId,
      connectionId: owned.connectionId,
      consentId: `${id}_consent`,
      providerId: 'mock-italian',
      requestId: randomUUID(),
      requestHash: 'b'.repeat(64),
      mode: 'user_present',
      requestedFrom: '2026-10-01',
      requestedTo: '2026-10-04',
      state: 'completed',
      reason: null,
      configurationRevision: 1,
      configurationDigest: 'b'.repeat(64),
      configuration: DEFAULT_SYNC_CONFIGURATION,
      providerPolicy: new MockItalianProvider().syncMetadata(),
      leaseToken: null,
      leaseExpiresAt: null,
      leaseEpoch: 0,
      failures: 0,
      availableAt: baseAt,
      revision: 1,
      report: emptySyncReport(),
      createdAt: baseAt,
      updatedAt: baseAt,
      completedAt: baseAt,
    })
    for (const suffix of ['hold', 'missing'])
      await handle.db.insert(syncPresence).values({
        transactionId: `${id}_${suffix}`,
        profileId: owned.profileId,
        connectionId: owned.connectionId,
        accountId: owned.accountId,
        state: 'pending_replaced',
        missingCompletions: 0,
        lastCompleteJobId: jobId,
        evidence: {
          version: 'sync-presence-v1',
          snapshotId: 'synthetic',
          rule: 'provider_link_exact',
          replacementTransactionId: `${id}_booked`,
        },
        updatedAt: baseAt,
      })
    const filtered = (await owned.search('?status=pending&to=2026-10-01')).json()
    expect(filtered.items.map((item: { id: string }) => item.id)).toEqual([`${id}_missing`])
    await handle.db
      .update(schema.transactions)
      .set({ amountMinor: -124n })
      .where(eq(schema.transactions.id, `${id}_booked`))
    expect((await owned.search('?status=pending&to=2026-10-01')).json().items).toHaveLength(2)
  })

  test('new routes use current authenticated principal and reject revoked/expired sessions and another profile cursor', async () => {
    const app = await createApp({
      db: handle.db,
      financialScope: handle.withProfile,
      demoMode: false,
      localIdentity: {
        baseURL: 'http://localhost:3001',
        secret: randomBytes(48).toString('base64'),
      },
    })
    apps.push(app)
    const signup = async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up/email',
        headers: authHeaders(),
        payload: {
          name: 'Persona sintetica',
          email: `ledger-${randomUUID()}@example.invalid`,
          password: 'Synthetic password 29!',
          adultAttested: true,
          termsVersion: LOCAL_TERMS_VERSION,
        },
      })
      expect(response.statusCode, response.payload).toBe(200)
      const userId = response.json().user.id as string
      users.push(userId)
      const [member] = await handle.db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, userId))
      if (!member) throw new Error('Missing profile')
      profiles.push(member.profileId)
      return {
        userId,
        profileId: member.profileId,
        cookie: cookies(response.headers['set-cookie']),
      }
    }
    const first = await signup(),
      second = await signup()
    expect(
      (await app.inject({ url: '/v1/ledger/search', headers: authHeaders(first.cookie) })).json()
        .items,
    ).toEqual([])
    expect(
      (
        await app.inject({ url: '/v1/ledger/projection', headers: authHeaders(second.cookie) })
      ).json().profile.id,
    ).toBe(second.profileId)
    expect(
      (await app.inject({ url: '/v1/ledger/projection', headers: authHeaders() })).statusCode,
    ).toBe(401)
    await handle.db
      .update(session)
      .set({ expiresAt: new Date('2020-01-01T00:00:00Z') })
      .where(eq(session.userId, second.userId))
    expect(
      (await app.inject({ url: '/v1/ledger/search', headers: authHeaders(second.cookie) }))
        .statusCode,
    ).toBe(401)
    await handle.db.delete(session).where(and(eq(session.userId, first.userId)))
    expect(
      (await app.inject({ url: '/v1/ledger/projection', headers: authHeaders(first.cookie) }))
        .statusCode,
    ).toBe(401)
  })
})
