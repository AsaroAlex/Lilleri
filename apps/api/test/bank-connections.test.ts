import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import type {
  InstitutionPage,
  ProviderContext,
  ProviderDiscoveryMetadata,
  SyntheticSyncMetadata,
  SyntheticSyncPage,
  SyntheticSyncPageRequest,
  SyntheticSyncSnapshot,
} from '@lilleri/financial-providers'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  BANK_CALLBACK_PATH,
  createBankConnectionsExtension,
  type LiveBankProvider,
} from '../src/bank-connections.js'
import { bankAuthorizations } from '../src/bank-connections-schema.js'
import { consentLifecycles } from '../src/consent-lifecycle-schema.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createSealedVolumeKeyManagement } from '../src/encryption-local.js'
import type { IdentityMailMessage } from '../src/identity-mail.js'
import * as identity from '../src/identity-schema.js'
import { GuardedLiveProvider } from '../src/live-provider-guard.js'
import { admitLiveProvider } from '../src/provider-admission.js'
import {
  DEFAULT_RUNTIME_CONFIGURATION,
  DEFAULT_SYNC_CONFIGURATION,
  RuntimeConfigurationStore,
} from '../src/runtime-config.js'
import { SyncCoordinator } from '../src/sync-jobs.js'
import { syncJobs } from '../src/sync-schema.js'

const baseURL = 'https://app.lilleri.example'
const termsVersion = 'lilleri-terms-test-v1'
const password = 'Synthetic hosted password 37!'
const evidence = 'https://enablebanking.com/docs/api/reference/'
const headers = (cookie = '') => ({
  origin: baseURL,
  host: new URL(baseURL).host,
  ...(cookie ? { cookie } : {}),
})
const cookieOf = (response: { headers: Record<string, unknown> }) => {
  const cookie = response.headers['set-cookie']
  return (Array.isArray(cookie) ? cookie : typeof cookie === 'string' ? [cookie] : [])
    .map((value) => String(value).split(';')[0])
    .join('; ')
}
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

/** Deterministic official-provider stand-in implementing the redirect and resumable sync ports. */
class FakeBankProvider implements LiveBankProvider {
  readonly id = 'enable-banking'
  readonly states: string[] = []
  readonly deleted: string[] = []
  readonly presence = new Map<string, { ipAddress: string; userAgent: string }>()
  readonly opened: { grantId?: string; mode: string }[] = []
  failNextOpen: Error | null = null
  sessionInstitution: string | null = null
  sessionAccounts = 1
  capabilities() {
    return {
      accountInformation: true as const,
      payments: false as const,
      synthetic: false,
      grantSpecificRevocation: true,
    }
  }
  discoveryMetadata(): ProviderDiscoveryMetadata {
    return {
      providerId: this.id,
      environment: 'live',
      coverageVersion: 'test',
      pagination: { maxPageSize: 500, maxPages: 1, maxCursorBytes: 64 },
      refresh: {
        userPresent: 'supported',
        unattendedBudget: { requests: 4, windowSeconds: 86_400, evidenceReference: evidence },
      },
      renewal: 'supported',
    }
  }
  syncMetadata(): SyntheticSyncMetadata {
    return {
      providerId: this.id,
      environment: 'live',
      evidenceReference: evidence,
      userPresent: 'supported',
      unattendedBudget: {
        requests: 4,
        windowSeconds: 86_400,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: evidence,
      },
      maxWindowDays: 14,
      maxPageSize: 200,
      maxCursorBytes: 64,
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
    }
  }
  async listInstitutions(): Promise<InstitutionPage> {
    return { institutions: [], nextCursor: null, coverageVersion: 'test' }
  }
  async institutions(country: string) {
    if (country !== 'IT') return []
    return [
      {
        id: 'IT:Banca Prova',
        name: 'Banca Prova',
        country: 'IT',
        beta: false,
        maximumConsentDays: 180,
      },
      {
        id: 'IT:Banca Prova Carte',
        name: 'Banca Prova Carte',
        country: 'IT',
        beta: false,
        maximumConsentDays: 180,
      },
    ]
  }
  async startAuthorization(input: { institutionId: string; state: string; redirectUrl: string }) {
    expect(input.redirectUrl).toBe(`${baseURL}${BANK_CALLBACK_PATH}`)
    this.states.push(input.state)
    return {
      url: `https://auth.enablebanking.com/ais/start?sessionid=${randomUUID()}`,
      authorizationId: randomUUID(),
      validUntil: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    }
  }
  async completeAuthorization(code: string) {
    if (code === 'bad') throw Object.assign(new Error('callback'), { code: 'invalid_callback' })
    return {
      sessionId: randomUUID(),
      institutionId: this.sessionInstitution ?? 'IT:Banca Prova',
      validUntil: new Date(Date.now() + 180 * 86_400_000).toISOString(),
      accounts: Array.from({ length: this.sessionAccounts }, () => ({
        id: 'hash-account-1',
        name: 'Conto corrente ••1234',
        kind: 'current' as const,
        currency: 'EUR',
      })),
    }
  }
  registerPresence(sessionId: string, psu: { ipAddress: string; userAgent: string }) {
    this.presence.set(sessionId, psu)
  }
  async createConnection(): Promise<never> {
    throw new Error('redirect required')
  }
  async renewConnection(): Promise<never> {
    throw new Error('redirect required')
  }
  async refreshConnection() {}
  async listAccounts() {
    return []
  }
  async getBalances() {
    return []
  }
  async getTransactions() {
    return { transactions: [], nextCursor: null }
  }
  async disconnect(context: ProviderContext) {
    if (context.grantId) this.deleted.push(context.grantId)
  }
  async openSync(context: ProviderContext, mode: 'user_present' | 'unattended') {
    this.opened.push({ ...(context.grantId ? { grantId: context.grantId } : {}), mode })
    if (this.failNextOpen) {
      const failure = this.failNextOpen
      this.failNextOpen = null
      throw failure
    }
    const snapshot: SyntheticSyncSnapshot = {
      snapshotId: `snapshot-${randomUUID()}`,
      accounts: [
        {
          id: 'hash-account-1',
          name: 'Conto corrente ••1234',
          institutionName: 'Banca Prova',
          kind: 'current',
          currency: 'EUR',
          balance: '1520.40',
        },
      ],
      historyFrom: { 'hash-account-1': daysAgo(30) },
      observedAt: new Date(Date.now() - 1000).toISOString(),
      balances: [
        {
          accountId: 'hash-account-1',
          currency: 'EUR',
          amount: '1520.40',
          type: 'booked',
          referenceDate: today(),
          opening: null,
        },
      ],
    }
    return snapshot
  }
  async getSyncPage(_context: ProviderContext, request: SyntheticSyncPageRequest) {
    const transactions = [
      {
        id: 'entry-1',
        accountId: 'hash-account-1',
        amount: '-12.50',
        currency: 'EUR',
        description: 'Supermercato Prova',
        status: 'booked' as const,
        bookedOn: daysAgo(3),
        merchantName: 'Supermercato Prova',
      },
      {
        id: null,
        accountId: 'hash-account-1',
        amount: '-4.20',
        currency: 'EUR',
        description: 'Caffè in attesa',
        status: 'pending' as const,
      },
    ].filter((row) =>
      row.status === 'pending'
        ? request.includePending
        : (row.bookedOn ?? '') >= request.from && (row.bookedOn ?? '') <= request.to,
    )
    const page: SyntheticSyncPage = {
      snapshotId: request.snapshotId,
      from: request.from,
      to: request.to,
      transactions,
      nextCursor: null,
      coverage: request.from >= daysAgo(30) ? 'complete_window' : 'unknown',
    }
    return page
  }
}

let handle: DatabaseHandle
let vault: string
let encryption: ProfileEncryption
const users: string[] = []
const profiles: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const plans = new Map<string, 'gratis' | 'plus'>()

async function fixture(
  options: { maxActiveConnections?: number | null; configured?: boolean } = {},
) {
  const fake = new FakeBankProvider()
  const verifications: IdentityMailMessage[] = []
  const configurations = new RuntimeConfigurationStore(handle.db)
  await configurations.ensure({
    ...DEFAULT_RUNTIME_CONFIGURATION,
    sync: { ...DEFAULT_SYNC_CONFIGURATION, attemptTimeoutMs: 20_000, leaseMs: 30_000 },
  })
  const plan = async (_db: Database, profileId: string) => plans.get(profileId) ?? 'gratis'
  const provider = new GuardedLiveProvider(fake, { scope: handle.withProfile, plan })
  admitLiveProvider(provider)
  const coordinator = async (profileId: string) =>
    new SyncCoordinator({
      scope: handle.withProfile,
      profileId,
      provider,
      configuration: await configurations.read(),
      encryption,
    })
  const app = await createApp({
    db: handle.db,
    demoMode: false,
    environment: 'production',
    financialScope: handle.withProfile,
    encryption,
    provider,
    syncConfiguration: () => configurations.read(),
    hostedIdentity: {
      baseURL,
      secret: randomBytes(48).toString('hex'),
      termsVersion,
      delivery: {
        sendVerification: async (message) => {
          verifications.push(message)
        },
        sendPasswordReset: async () => {},
      },
    },
    extensions: [
      createBankConnectionsExtension({
        provider: options.configured === false ? null : provider,
        scope: handle.withProfile,
        baseURL,
        plan,
        maxActiveConnections: options.maxActiveConnections ?? null,
        coordinator,
        countries: ['IT'],
        evidenceReference: evidence,
      }),
    ],
  })
  apps.push(app)
  const account = async (tier: 'gratis' | 'plus' = 'plus') => {
    const email = `bank-${randomUUID()}@example.invalid`
    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: headers(),
      payload: { name: 'Persona', email, password, adultAttested: true, termsVersion },
    })
    expect(signup.statusCode, signup.payload).toBe(200)
    const userId = signup.json().user.id as string
    users.push(userId)
    const [membership] = await handle.db
      .select()
      .from(identity.memberships)
      .where(eq(identity.memberships.userId, userId))
    if (!membership) throw new Error('membership')
    profiles.push(membership.profileId)
    plans.set(membership.profileId, tier)
    const link = verifications.find((message) => message.email === email)
    if (!link) throw new Error('verification')
    const url = new URL(link.url)
    url.searchParams.delete('callbackURL')
    expect(
      (await app.inject({ url: `${url.pathname}${url.search}`, headers: headers() })).statusCode,
    ).toBe(200)
    const signin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: headers(),
      payload: { email, password },
    })
    expect(signin.statusCode, signin.payload).toBe(200)
    return { profileId: membership.profileId, cookie: cookieOf(signin) }
  }
  const start = (cookie: string, body: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/v1/bank/authorizations',
      headers: headers(cookie),
      payload: { language: 'it', ...body },
    })
  const callback = (query: string) =>
    app.inject({
      method: 'GET',
      url: `${BANK_CALLBACK_PATH}?${query}`,
      headers: {
        host: new URL(baseURL).host,
        'x-forwarded-for': '203.0.113.9',
        'user-agent': 'Test browser',
      },
    })
  return { app, fake, provider, account, start, callback }
}
async function settledJobs(profileId: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const jobs = await handle.withProfile(profileId, (db) =>
      db.select().from(syncJobs).where(eq(syncJobs.profileId, profileId)),
    )
    if (jobs.length && jobs.every((job) => ['completed', 'failed', 'blocked'].includes(job.state)))
      return jobs
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('sync did not settle')
}

beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  vault = await mkdtemp(join(tmpdir(), 'lilleri-bank-vault-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createSealedVolumeKeyManagement({ directory: vault, masterKey: randomBytes(32) }),
  )
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const id of users) await handle.db.delete(identity.user).where(eq(identity.user.id, id))
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
  await rm(vault, { recursive: true, force: true })
})

describe('redirect-based official bank connections', () => {
  test('institutions and authorizations require a session, Plus and a configured provider', async () => {
    const bank = await fixture()
    expect(
      (await bank.app.inject({ url: '/v1/bank/institutions?country=IT', headers: headers() }))
        .statusCode,
    ).toBe(401)
    const gratis = await bank.account('gratis')
    const listing = await bank.app.inject({
      url: '/v1/bank/institutions?country=IT',
      headers: headers(gratis.cookie),
    })
    expect(listing.statusCode, listing.payload).toBe(200)
    expect(listing.json()).toMatchObject({ available: false, reason: 'plus_required' })
    expect(listing.json().institutions).toHaveLength(2)
    const refused = await bank.start(gratis.cookie, { institutionId: 'IT:Banca Prova' })
    expect(refused.statusCode).toBe(409)
    expect(refused.json().code).toBe('plus_required')
    const unconfigured = await fixture({ configured: false })
    const plus = await unconfigured.account('plus')
    const off = await unconfigured.app.inject({
      url: '/v1/bank/institutions?country=IT',
      headers: headers(plus.cookie),
    })
    expect(off.json()).toMatchObject({
      available: false,
      reason: 'provider_not_configured',
      institutions: [],
    })
    expect(
      (await unconfigured.start(plus.cookie, { institutionId: 'IT:Banca Prova' })).json().code,
    ).toBe('bank_provider_unavailable')
    const unknown = await bank.start((await bank.account('plus')).cookie, {
      institutionId: 'IT:Banca Inventata',
    })
    expect(unknown.statusCode).toBe(422)
  })

  test('a Plus user connects through the bank and the first synchronisation imports the account', async () => {
    const bank = await fixture()
    const user = await bank.account('plus')
    const started = await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    expect(started.statusCode, started.payload).toBe(200)
    expect(started.json().url).toMatch(/^https:\/\/auth\.enablebanking\.com\//)
    const state = bank.fake.states.at(-1) as string
    const [stored] = await handle.db
      .select()
      .from(bankAuthorizations)
      .where(eq(bankAuthorizations.profileId, user.profileId))
    expect(stored?.status).toBe('pending')
    expect(JSON.stringify(stored)).not.toContain(state)
    expect((await bank.callback(`state=${'x'.repeat(43)}&code=abc`)).headers.location).toBe(
      `${baseURL}/?bank=expired`,
    )
    const done = await bank.callback(`state=${state}&code=ok-code`)
    expect(done.statusCode).toBe(303)
    expect(done.headers.location).toBe(`${baseURL}/?bank=connected`)
    expect(done.headers['referrer-policy']).toBe('no-referrer')
    const jobs = await settledJobs(user.profileId)
    expect(jobs.map((job) => [job.state, job.mode])).toEqual([['completed', 'user_present']])
    const [connection] = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.connections).where(eq(schema.connections.profileId, user.profileId)),
    )
    expect(connection).toMatchObject({
      providerId: 'enable-banking',
      institutionId: 'IT:Banca Prova',
      status: 'active',
    })
    const [consent] = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.consents).where(eq(schema.consents.profileId, user.profileId)),
    )
    expect(bank.fake.presence.get(consent?.id as string)).toEqual({
      ipAddress: '203.0.113.9',
      userAgent: 'Test browser',
    })
    expect(bank.fake.opened.at(-1)).toEqual({ grantId: consent?.id, mode: 'user_present' })
    const overview = await bank.app.inject({ url: '/v1/demo', headers: headers(user.cookie) })
    expect(overview.statusCode, overview.payload).toBe(200)
    const body = overview.json()
    expect(body.accounts).toHaveLength(1)
    expect(body.accounts[0].balance).toEqual({ amountMinor: '152040', currency: 'EUR' })
    expect(body.transactions.map((row: { description: string }) => row.description).sort()).toEqual(
      ['Caffè in attesa', 'Supermercato Prova'],
    )
    // The state is single use.
    expect((await bank.callback(`state=${state}&code=ok-code`)).headers.location).toBe(
      `${baseURL}/?bank=expired`,
    )
    const again = await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    expect(again.json().code).toBe('already_connected')
  })

  test('cancelled, mismatched and empty bank answers never create a connection', async () => {
    const bank = await fixture()
    const user = await bank.account('plus')
    await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    const cancelled = await bank.callback(
      `state=${bank.fake.states.at(-1)}&error=access_denied&error_description=user`,
    )
    expect(cancelled.headers.location).toBe(`${baseURL}/?bank=cancelled`)
    await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    bank.fake.sessionInstitution = 'IT:Banca Prova Carte'
    const mismatch = await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)
    expect(mismatch.headers.location).toBe(`${baseURL}/?bank=institution_mismatch`)
    expect(bank.fake.deleted).toHaveLength(1)
    bank.fake.sessionInstitution = null
    bank.fake.sessionAccounts = 0
    await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    const empty = await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)
    expect(empty.headers.location).toBe(`${baseURL}/?bank=no_accounts`)
    await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    const failed = await bank.callback(`state=${bank.fake.states.at(-1)}&code=bad`)
    expect(failed.headers.location).toBe(`${baseURL}/?bank=unavailable`)
    const rows = await handle.withProfile(user.profileId, (db) =>
      db.select().from(bankAuthorizations).where(eq(bankAuthorizations.profileId, user.profileId)),
    )
    expect(rows.map((row) => [row.status, row.failureCode]).sort()).toEqual(
      [
        ['failed', 'cancelled'],
        ['failed', 'exchange_failed'],
        ['failed', 'institution_mismatch'],
        ['failed', 'no_accounts'],
      ].sort(),
    )
    const connections = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.connections).where(eq(schema.connections.profileId, user.profileId)),
    )
    expect(connections).toEqual([])
  })

  test('expired authorizations and the contracted capacity are enforced', async () => {
    const active = await handle.db
      .select({ id: schema.connections.id })
      .from(schema.connections)
      .where(
        and(
          eq(schema.connections.providerId, 'enable-banking'),
          eq(schema.connections.status, 'active'),
        ),
      )
    const bank = await fixture({ maxActiveConnections: active.length + 1 })
    const first = await bank.account('plus')
    await bank.start(first.cookie, { institutionId: 'IT:Banca Prova' })
    await handle.db
      .update(bankAuthorizations)
      .set({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        createdAt: new Date(Date.now() - 60_000).toISOString(),
      })
      .where(eq(bankAuthorizations.profileId, first.profileId))
    expect((await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)).headers.location).toBe(
      `${baseURL}/?bank=expired`,
    )
    const retry = await bank.start(first.cookie, { institutionId: 'IT:Banca Prova' })
    expect(retry.statusCode, retry.payload).toBe(200)
    expect((await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)).headers.location).toBe(
      `${baseURL}/?bank=connected`,
    )
    await settledJobs(first.profileId)
    const second = await bank.account('plus')
    const full = await bank.start(second.cookie, { institutionId: 'IT:Banca Prova' })
    expect(full.statusCode).toBe(409)
    expect(full.json().code).toBe('bank_capacity_reached')
    const listing = await bank.app.inject({
      url: '/v1/bank/institutions?country=IT',
      headers: headers(second.cookie),
    })
    expect(listing.json()).toMatchObject({ available: false, reason: 'capacity_reached' })
  })

  test('renewal replaces the consent on the same connection and revokes the old session', async () => {
    const bank = await fixture()
    const user = await bank.account('plus')
    await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)
    await settledJobs(user.profileId)
    const [connection] = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.connections).where(eq(schema.connections.profileId, user.profileId)),
    )
    const [oldConsent] = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.consents).where(eq(schema.consents.profileId, user.profileId)),
    )
    const renewal = await bank.start(user.cookie, {
      institutionId: 'IT:Banca Prova',
      connectionId: connection?.id,
    })
    expect(renewal.statusCode, renewal.payload).toBe(200)
    expect((await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)).headers.location).toBe(
      `${baseURL}/?bank=connected`,
    )
    await settledJobs(user.profileId)
    const consents = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.consents).where(eq(schema.consents.profileId, user.profileId)),
    )
    expect(consents).toHaveLength(2)
    expect(consents.find((row) => row.id === oldConsent?.id)?.revokedAt).not.toBeNull()
    const active = consents.find((row) => row.revokedAt === null)
    const [lifecycle] = await handle.withProfile(user.profileId, (db) =>
      db
        .select()
        .from(consentLifecycles)
        .where(
          and(
            eq(consentLifecycles.profileId, user.profileId),
            eq(consentLifecycles.connectionId, connection?.id as string),
          ),
        ),
    )
    expect(lifecycle?.consentId).toBe(active?.id)
    for (
      let attempt = 0;
      attempt < 50 && !bank.fake.deleted.includes(oldConsent?.id as string);
      attempt++
    )
      await new Promise((resolve) => setTimeout(resolve, 20))
    expect(bank.fake.deleted).toContain(oldConsent?.id)
    const accounts = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.accounts).where(eq(schema.accounts.profileId, user.profileId)),
    )
    expect(accounts).toHaveLength(1)
  })

  test('downgraded plans stop provider reads and a lost bank consent asks the user to reconnect', async () => {
    const bank = await fixture()
    const user = await bank.account('plus')
    await bank.start(user.cookie, { institutionId: 'IT:Banca Prova' })
    await bank.callback(`state=${bank.fake.states.at(-1)}&code=ok`)
    await settledJobs(user.profileId)
    const [connection] = await handle.withProfile(user.profileId, (db) =>
      db.select().from(schema.connections).where(eq(schema.connections.profileId, user.profileId)),
    )
    const opened = bank.fake.opened.length
    plans.set(user.profileId, 'gratis')
    const refused = await bank.app.inject({
      method: 'POST',
      url: '/v1/sync/start',
      headers: headers(user.cookie),
      payload: {
        connectionId: connection?.id,
        requestId: 'manual-refresh-1',
        mode: 'user_present',
      },
    })
    expect(refused.statusCode, refused.payload).toBe(409)
    expect(refused.json().code).toBe('plus_required')
    // Background and resumed work is refused by the provider guard too.
    const coordinator = new SyncCoordinator({
      scope: handle.withProfile,
      profileId: user.profileId,
      provider: bank.provider,
      configuration: await new RuntimeConfigurationStore(handle.db).read(),
      encryption,
    })
    const queued = await coordinator.start(connection?.id as string, {
      requestId: 'background-while-gratis',
      mode: 'user_present',
    })
    expect((await coordinator.wait(queued.id)).state).toBe('blocked')
    expect(bank.fake.opened.length).toBe(opened)
    plans.set(user.profileId, 'plus')
    bank.fake.failNextOpen = Object.assign(new Error('session expired'), {
      code: 'reconsent_required',
    })
    const started = await bank.app.inject({
      method: 'POST',
      url: '/v1/sync/start',
      headers: headers(user.cookie),
      payload: {
        connectionId: connection?.id,
        requestId: 'manual-refresh-2',
        mode: 'user_present',
      },
    })
    expect(started.statusCode, started.payload).toBe(200)
    await coordinator.wait(started.json().id)
    const lifecycle = await bank.app.inject({
      url: `/v1/connections/${connection?.id}/lifecycle`,
      headers: headers(user.cookie),
    })
    expect(lifecycle.statusCode, lifecycle.payload).toBe(200)
    expect(lifecycle.json()).toMatchObject({
      state: 'error',
      blockedReason: 'provider_action_required',
    })
  })

  test('authorization routing rows are tenant isolated for the runtime role', async () => {
    const bank = await fixture()
    const a = await bank.account('plus')
    const b = await bank.account('plus')
    await bank.start(a.cookie, { institutionId: 'IT:Banca Prova' })
    await bank.start(b.cookie, { institutionId: 'IT:Banca Prova' })
    const visible = await handle.withProfile(a.profileId, (db) =>
      db.select().from(bankAuthorizations),
    )
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.every((row) => row.profileId === a.profileId)).toBe(true)
  })
})
