import { randomBytes, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  CONNECTION_DIRECTORY_COUNTRY_CODES,
  type ConnectionDirectory,
  type ConnectionDirectoryConnectionCheck,
} from '@lilleri/domain'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { createApp } from '../src/app.js'

let handle: DatabaseHandle
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const profileIds: string[] = []
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const profileId of profileIds)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle.close()
})

describe('public directory is separate from financial connections', () => {
  test('empty public service lists all European markets without creating financial data or provider routes', async () => {
    const profileId = `directory_${randomUUID()}`
    profileIds.push(profileId)
    const app = await createApp({ db: handle.db, demoMode: true, profileId, demoFixtures: 'empty' })
    apps.push(app)
    const before = (await app.inject({ url: '/v1/export' })).json()
    const response = await app.inject({
      url: '/v1/connection-directory?country=GB&privateAccess=ready&provider=yapily',
    })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json().country).toBe('IT')
    expect(response.json().countries).toEqual(CONNECTION_DIRECTORY_COUNTRY_CODES)
    expect(response.json().prerequisites).toEqual({
      privateAccess: 'required',
      bankProvider: 'required',
    })
    const entries = response.json().entries as {
      id: string
      countryCode: string
      automatic: { state: string; providerId: string | null; institutionId: string | null }
    }[]
    expect(entries).toHaveLength(62)
    expect(entries.filter((entry) => entry.countryCode === 'IT')).toHaveLength(18)
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(62)
    expect(new Set(entries.map((entry) => entry.countryCode))).toEqual(
      new Set(CONNECTION_DIRECTORY_COUNTRY_CODES),
    )
    expect(entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'intesa-sanpaolo',
        'unicredit',
        'credem',
        'widiba',
        'amex',
        'satispay',
        'bnp-paribas-fr',
        'deutsche-bank-de',
        'bbva-es',
        'bunq-nl',
        'monzo-gb',
        'starling-gb',
        'n26-de',
      ]),
    )
    expect(
      entries.every(
        (entry) =>
          entry.automatic.state === 'configuration_required' &&
          entry.automatic.providerId === null &&
          entry.automatic.institutionId === null,
      ),
    ).toBe(true)
    const institutions = (await app.inject({ url: '/v1/institutions' })).json()
    expect(institutions.institutions).toEqual([])
    const after = (await app.inject({ url: '/v1/export' })).json()
    for (const field of ['accounts', 'transactions', 'connections', 'syntheticFixtures'])
      expect(after[field]).toEqual(before[field])
    expect(response.payload).not.toMatch(
      /profileId|grantId|consentId|amountMinor|authorizationUrl|clientSecret/,
    )
    const fakeConnection = await app.inject({
      method: 'POST',
      url: '/v1/connections',
      payload: { institutionId: 'intesa-sanpaolo', accountKind: 'current' },
    })
    expect(fakeConnection.statusCode).toBe(409)
    expect(fakeConnection.json().code).toBe('synthetic_fixtures_disabled')
  })
  test('public metadata is readable before login and bypasses financial SQL scope; financial routes stay authenticated', async () => {
    let financialScopeCalls = 0
    const app = await createApp({
      db: handle.db,
      demoMode: false,
      localIdentity: {
        baseURL: 'http://localhost:3001',
        secret: randomBytes(48).toString('base64'),
      },
      financialScope: async () => {
        financialScopeCalls++
        throw new Error('A metadata request must not enter owner scope')
      },
    })
    apps.push(app)
    const response = await app.inject({
      url: '/v1/connection-directory',
      headers: { host: 'localhost:3001' },
    })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json().prerequisites).toEqual({
      privateAccess: 'ready',
      bankProvider: 'required',
    })
    const connectionCheck = await app.inject({
      url: '/v1/connection-directory/bper/connect',
      headers: { host: 'localhost:3001' },
    })
    expect(connectionCheck.statusCode, connectionCheck.payload).toBe(200)
    expect(connectionCheck.json().prerequisites).toEqual(response.json().prerequisites)
    expect(connectionCheck.json().entry.id).toBe('bper')
    expect(connectionCheck.json().entry.automatic.state).toBe('configuration_required')
    const head = await app.inject({
      method: 'HEAD',
      url: '/v1/connection-directory/bper/connect',
      headers: { host: 'localhost:3001' },
    })
    expect(head.statusCode, head.payload).toBe(200)
    expect(head.headers['cache-control']).toBe('no-store')
    expect(head.payload).toBe('')
    const unknown = await app.inject({
      url: '/v1/connection-directory/not-a-bank/connect',
      headers: { host: 'localhost:3001' },
    })
    expect(unknown.statusCode, unknown.payload).toBe(404)
    expect(unknown.json().code).toBe('not_found')
    for (const request of [
      { method: 'POST' as const, url: '/v1/connection-directory/bper/connect' },
      { method: 'GET' as const, url: '/v1/connection-directory/bper/connect/callback' },
    ]) {
      const denied = await app.inject({
        ...request,
        headers: { host: 'localhost:3001', origin: 'http://localhost:3001' },
      })
      expect(denied.statusCode, denied.payload).toBe(401)
    }
    const overview = await app.inject({ url: '/v1/demo', headers: { host: 'localhost:3001' } })
    expect(overview.statusCode).toBe(401)
    expect(financialScopeCalls).toBe(0)
  })
  test('public metadata retains host and origin checks', async () => {
    const profileId = `directory_${randomUUID()}`
    profileIds.push(profileId)
    const app = await createApp({ db: handle.db, demoMode: true, profileId, demoFixtures: 'empty' })
    apps.push(app)
    for (const headers of [{ host: 'attacker.example' }, { origin: 'https://attacker.example' }]) {
      for (const url of [
        '/v1/connection-directory',
        '/v1/connection-directory/intesa-sanpaolo/connect',
      ]) {
        const response = await app.inject({ url, headers })
        expect(response.statusCode).toBe(403)
        expect(response.payload).not.toContain('Intesa Sanpaolo')
      }
    }
  })
  test('every bank, card and wallet has a fresh read-only connection check without provider I/O', async () => {
    const profileId = `directory_${randomUUID()}`
    profileIds.push(profileId)
    const provider = new MockItalianProvider()
    const providerCalls = [
      vi.spyOn(provider, 'listInstitutions'),
      vi.spyOn(provider, 'createConnection'),
      vi.spyOn(provider, 'refreshConnection'),
      vi.spyOn(provider, 'listAccounts'),
      vi.spyOn(provider, 'getBalances'),
      vi.spyOn(provider, 'getTransactions'),
      vi.spyOn(provider, 'disconnect'),
    ]
    const app = await createApp({
      db: handle.db,
      demoMode: true,
      profileId,
      demoFixtures: 'empty',
      provider,
    })
    apps.push(app)
    const before = (await app.inject({ url: '/v1/export' })).json()
    const directory = (
      await app.inject({ url: '/v1/connection-directory' })
    ).json<ConnectionDirectory>()
    expect(directory.entries).toHaveLength(62)
    for (const entry of directory.entries) {
      const response = await app.inject({
        url: `/v1/connection-directory/${encodeURIComponent(entry.id)}/connect`,
      })
      expect(response.statusCode, response.payload).toBe(200)
      expect(response.headers['cache-control']).toBe('no-store')
      const check = response.json<ConnectionDirectoryConnectionCheck>()
      expect(check.entry).toEqual(entry)
      expect(check.prerequisites).toEqual(directory.prerequisites)
      expect(new Date(check.checkedAt).toISOString()).toBe(check.checkedAt)
      expect(check.entry.automatic.state).toBe('configuration_required')
      expect(check.entry.automatic.providerId).toBeNull()
      expect(check.entry.automatic.institutionId).toBeNull()
      expect(response.payload).not.toMatch(
        /profileId|grantId|consentId|amountMinor|authorizationUrl|clientSecret/,
      )
    }
    const after = (await app.inject({ url: '/v1/export' })).json()
    for (const field of ['accounts', 'transactions', 'connections', 'syntheticFixtures'])
      expect(after[field]).toEqual(before[field])
    for (const call of providerCalls) expect(call).not.toHaveBeenCalled()
  })
  test('exact directory IDs and server configuration ignore path and query attempts to select or activate a bank', async () => {
    const profileId = `directory_${randomUUID()}`
    profileIds.push(profileId)
    const app = await createApp({ db: handle.db, demoMode: true, profileId, demoFixtures: 'empty' })
    apps.push(app)
    const before = (await app.inject({ url: '/v1/export' })).json()
    const response = await app.inject({
      url: '/v1/connection-directory/bper/connect?entryId=amex&institutionId=modelo-sandbox&providerId=yapily&privateAccess=ready&bankProvider=ready&state=available&country=GB',
    })
    expect(response.statusCode, response.payload).toBe(200)
    const check = response.json<ConnectionDirectoryConnectionCheck>()
    expect(check.entry.id).toBe('bper')
    expect(check.entry.countryCode).toBe('IT')
    expect(check.prerequisites).toEqual({ privateAccess: 'required', bankProvider: 'required' })
    expect(check.entry.automatic.state).toBe('configuration_required')
    expect(check.entry.automatic.providerId).toBeNull()
    expect(check.entry.automatic.institutionId).toBeNull()
    for (const id of [
      'not-a-bank',
      'BPER',
      'bper_corporate',
      'modelo-sandbox',
      'constructor',
      '__proto__',
      'bper/connect',
    ]) {
      const missing = await app.inject({
        url: `/v1/connection-directory/${encodeURIComponent(id)}/connect?entryId=bper`,
      })
      expect(missing.statusCode, missing.payload).toBe(404)
      expect(missing.headers['content-type']).toContain('application/problem+json')
      expect(missing.json().code).toBe('not_found')
      expect(missing.json().status).toBe(404)
      expect(missing.payload).not.toMatch(/institutionId|grantId|authorizationUrl|clientSecret/)
    }
    const after = (await app.inject({ url: '/v1/export' })).json()
    for (const field of ['accounts', 'transactions', 'connections', 'syntheticFixtures'])
      expect(after[field]).toEqual(before[field])
  })
})
