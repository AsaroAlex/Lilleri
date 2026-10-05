import { randomBytes, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
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
  test('empty public preview offers genuine brands without creating financial data or provider routes', async () => {
    const profileId = `directory_${randomUUID()}`
    profileIds.push(profileId)
    const app = await createApp({ db: handle.db, demoMode: true, profileId, demoFixtures: 'empty' })
    apps.push(app)
    const before = (await app.inject({ url: '/v1/export' })).json()
    const response = await app.inject({
      url: '/v1/connection-directory?privateAccess=ready&provider=yapily',
    })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json().prerequisites).toEqual({
      privateAccess: 'required',
      bankProvider: 'required',
    })
    const entries = response.json().entries as {
      id: string
      automatic: { state: string; institutionId: string | null }
    }[]
    expect(entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'intesa-sanpaolo',
        'unicredit',
        'credem',
        'widiba',
        'amex',
        'satispay',
      ]),
    )
    expect(
      entries.every(
        (entry) =>
          entry.automatic.state === 'configuration_required' &&
          entry.automatic.institutionId === null,
      ),
    ).toBe(true)
    const institutions = (await app.inject({ url: '/v1/institutions' })).json()
    expect(institutions.institutions).toEqual([])
    const after = (await app.inject({ url: '/v1/export' })).json()
    for (const field of ['accounts', 'transactions', 'connections'])
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
      const response = await app.inject({ url: '/v1/connection-directory', headers })
      expect(response.statusCode).toBe(403)
      expect(response.payload).not.toContain('intesa-sanpaolo')
    }
  })
})
