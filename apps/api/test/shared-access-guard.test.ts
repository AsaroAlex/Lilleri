import { randomBytes, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { LOCAL_TERMS_VERSION } from '../src/identity.js'
import * as identity from '../src/identity-schema.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const profileIds: string[] = []
const userIds: string[] = []
const now = () => '2026-10-05T12:00:00.000Z'
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const userId of userIds)
    await handle.db.delete(identity.user).where(eq(identity.user.id, userId))
  for (const profileId of profileIds) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, profileId))
  }
  await handle.close()
})
async function sharedApp(
  demoFixtures: 'seeded' | 'empty',
  profileId = `shared_guard_${randomUUID()}`,
) {
  if (!profileIds.includes(profileId)) profileIds.push(profileId)
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    demoFixtures,
    profileId,
    seed: true,
    now,
  })
  apps.push(app)
  return { app, profileId }
}
async function ownedArchive(app: Awaited<ReturnType<typeof createApp>>) {
  const response = await app.inject({ url: '/v1/export' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
}

describe('shared financial profile is read-only after fixture retirement', () => {
  test('DELETE and deletion certificates cannot erase the retained archive', async () => {
    const seeded = await sharedApp('seeded')
    const before = await ownedArchive(seeded.app)
    expect(before.transactions.length).toBeGreaterThan(0)
    const { app } = await sharedApp('empty', seeded.profileId)
    const retired = await ownedArchive(app)
    for (const input of [
      { method: 'DELETE', url: '/v1/profile' },
      { method: 'POST', url: '/v1/profile/deletion', payload: {} },
      { method: 'DELETE', url: `/v1/connections/${before.connections[0].id}` },
    ] as const) {
      const response = await app.inject(input)
      expect(response.statusCode, response.payload).toBe(401)
      expect(response.json().code).toBe('public_identity_required')
    }
    expect(await ownedArchive(app)).toEqual(retired)
    expect(retired.transactions).toEqual(before.transactions)
    expect(retired.accounts).toEqual(before.accounts)
  })

  test('settings, consent, rules, merchant and financial writers cannot change shared state', async () => {
    const { app } = await sharedApp('empty')
    const before = await ownedArchive(app)
    for (const input of [
      {
        method: 'PATCH',
        url: '/v1/settings',
        payload: { revision: 1, displayName: 'Someone else', locale: 'en-GB', timezone: 'UTC' },
      },
      { method: 'PATCH', url: '/v1/privacy/settings', payload: { revision: 1, rulesOnly: true } },
      { method: 'PATCH', url: '/v1/privacy/permissions/global_dictionary', payload: {} },
      { method: 'PATCH', url: '/v1/notifications/preferences', payload: {} },
      { method: 'POST', url: '/v1/rules', payload: {} },
      { method: 'POST', url: '/v1/merchants/apply', payload: {} },
      { method: 'POST', url: '/v1/categories', payload: {} },
      { method: 'POST', url: '/v1/manual/accounts', payload: {} },
      { method: 'POST', url: '/v1/imports/csv', payload: {} },
      { method: 'PATCH', url: '/v1/transactions/some-id/classification', payload: {} },
      { method: 'POST', url: '/v1/export/archive', payload: {} },
    ] as const) {
      const response = await app.inject(input)
      expect(response.statusCode, response.payload).toBe(401)
      expect(response.json().code).toBe('public_identity_required')
    }
    expect(await ownedArchive(app)).toEqual(before)
  })

  test('identity checks precede JSON parsing and client flags cannot bypass them', async () => {
    const { app } = await sharedApp('empty')
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/settings?fixtureMode=seeded&authenticated=true',
      headers: { 'content-type': 'application/json' },
      payload: '{invalid JSON',
    })
    expect(response.statusCode, response.payload).toBe(401)
    expect(response.json().code).toBe('public_identity_required')
    const synthetic = await app.inject({
      method: 'POST',
      url: '/v1/connections/mock?fixtureMode=seeded',
      headers: { 'content-type': 'application/json' },
      payload: '{invalid JSON',
    })
    expect(synthetic.statusCode, synthetic.payload).toBe(409)
    expect(synthetic.json().code).toBe('synthetic_fixtures_disabled')
  })

  test('retirement remains protected when the launcher switches back to seeded mode', async () => {
    const seeded = await sharedApp('seeded')
    await sharedApp('empty', seeded.profileId)
    const { app } = await sharedApp('seeded', seeded.profileId)
    const response = await app.inject({ method: 'DELETE', url: '/v1/profile' })
    expect(response.statusCode, response.payload).toBe(401)
    expect(response.json().code).toBe('public_identity_required')
    const mutation = await app.inject({
      method: 'PATCH',
      url: '/v1/privacy/settings',
      payload: { revision: 1, rulesOnly: true },
    })
    expect(mutation.statusCode, mutation.payload).toBe(401)
    const overview = await app.inject({ url: '/v1/demo' })
    expect(overview.json()).toMatchObject({ fixtureMode: 'empty', accounts: [], transactions: [] })
    expect((await ownedArchive(app)).transactions.length).toBeGreaterThan(0)
  })

  test('read methods and seeded developer edits retain their existing behavior', async () => {
    const { app } = await sharedApp('empty')
    for (const method of ['GET', 'HEAD'] as const) {
      const response = await app.inject({ method, url: '/v1/settings' })
      expect(response.statusCode, response.payload).toBe(200)
    }
    const options = await app.inject({ method: 'OPTIONS', url: '/v1/settings' })
    expect(options.statusCode, options.payload).toBe(204)
    const archive = await app.inject({ url: '/v1/export/archive' })
    expect(archive.statusCode, archive.payload.slice(0, 100)).toBe(200)
    expect(archive.headers['content-type']).toBe('application/zip')
    const seeded = await sharedApp('seeded')
    const edit = await seeded.app.inject({
      method: 'PATCH',
      url: '/v1/settings',
      payload: { revision: 1, displayName: 'Developer profile', locale: 'en-GB', timezone: 'UTC' },
    })
    expect(edit.statusCode, edit.payload).toBe(200)
    expect(edit.json().settings.displayName).toBe('Developer profile')
  })

  test('authenticated owners can edit and erase their own retired profile after reauthentication', async () => {
    const password = 'Synthetic owner password 39!'
    const baseHeaders = { origin: 'http://localhost:3000', host: 'localhost:3001' }
    const app = await createApp({
      db: handle.db,
      demoMode: false,
      localIdentity: {
        baseURL: 'http://localhost:3001',
        secret: randomBytes(48).toString('base64'),
      },
    })
    apps.push(app)
    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: baseHeaders,
      payload: {
        name: 'Owned profile',
        email: `shared-guard-${randomUUID()}@example.invalid`,
        password,
        adultAttested: true,
        termsVersion: LOCAL_TERMS_VERSION,
      },
    })
    expect(signup.statusCode, signup.payload).toBe(200)
    const userId = signup.json().user.id as string
    userIds.push(userId)
    const [membership] = await handle.db
      .select()
      .from(identity.memberships)
      .where(eq(identity.memberships.userId, userId))
    if (!membership) throw new Error('Missing owned profile')
    profileIds.push(membership.profileId)
    await new DemoService(
      handle.db,
      membership.profileId,
      new MockItalianProvider(),
      now,
    ).retireFixtures()
    const setCookie = signup.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
    const headers = {
      ...baseHeaders,
      cookie: cookies.map((value) => String(value).split(';')[0]).join('; '),
    }
    const edit = await app.inject({
      method: 'PATCH',
      url: '/v1/settings',
      headers,
      payload: { revision: 1, displayName: 'My preferences', locale: 'en-GB', timezone: 'UTC' },
    })
    expect(edit.statusCode, edit.payload).toBe(200)
    expect(edit.json().settings.profileId).toBe(membership.profileId)
    const reauthentication = await app.inject({
      method: 'POST',
      url: '/v1/auth/reauthenticate',
      headers,
      payload: { password },
    })
    expect(reauthentication.statusCode, reauthentication.payload).toBe(200)
    const erased = await app.inject({ method: 'DELETE', url: '/v1/profile', headers })
    expect(erased.statusCode, erased.payload).toBe(204)
    expect(
      await handle.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, membership.profileId)),
    ).toEqual([])
  })
})
