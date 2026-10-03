import { randomBytes, randomUUID } from 'node:crypto'
import { base32 } from '@better-auth/utils/base32'
import { createOTP } from '@better-auth/utils/otp'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { createApp } from '../src/app.js'
import {
  assertLocalIdentityConfiguration,
  LOCAL_TERMS_VERSION,
  STEP_UP_SECONDS,
} from '../src/identity.js'
import * as identity from '../src/identity-schema.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const userIds: string[] = []
const profileIds: string[] = []
const origin = 'http://localhost:3000'
const password = 'Local synthetic password 29!'
const baseURL = 'http://localhost:3001'
const headers = (cookie = '') => ({ origin, host: 'localhost:3001', ...(cookie ? { cookie } : {}) })
const appFor = async (
  extra: {
    now?: () => Date
    deliverVerification?: (message: { email: string; url: string }) => Promise<void>
  } = {},
) => {
  const app = await createApp({
    db: handle.db,
    demoMode: false,
    localIdentity: {
      baseURL,
      secret: randomBytes(48).toString('base64'),
      ...extra,
    },
  })
  apps.push(app)
  return app
}
const cookieOf = (response: { headers: { [key: string]: unknown } }) => {
  const cookie = response.headers['set-cookie']
  return (Array.isArray(cookie) ? cookie : typeof cookie === 'string' ? [cookie] : [])
    .map((value) => String(value).split(';')[0])
    .join('; ')
}
const signUp = async (app: Awaited<ReturnType<typeof createApp>>) => {
  const email = `local-${randomUUID()}@example.invalid`
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: headers(),
    payload: {
      name: 'Persona sintetica',
      email,
      password,
      adultAttested: true,
      termsVersion: LOCAL_TERMS_VERSION,
    },
  })
  expect(response.statusCode, response.payload).toBe(200)
  const userId = response.json().user.id as string
  userIds.push(userId)
  const [membership] = await handle.db
    .select()
    .from(identity.memberships)
    .where(eq(identity.memberships.userId, userId))
  expect(membership).toBeDefined()
  if (!membership) throw new Error('Missing owned profile')
  profileIds.push(membership.profileId)
  return { userId, profileId: membership.profileId, email, cookie: cookieOf(response), response }
}
const signIn = async (app: Awaited<ReturnType<typeof createApp>>, email: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: headers(),
    payload: { email, password },
  })
  expect(response.statusCode, response.payload).toBe(200)
  return cookieOf(response)
}
const stepUp = async (app: Awaited<ReturnType<typeof createApp>>, cookie: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/reauthenticate',
    headers: headers(cookie),
    payload: { password },
  })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
}

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

describe('explicit local synthetic authenticated identity boundary', () => {
  test('configuration rejects production, public origins, missing secrets and mixed identity modes', async () => {
    const valid = { baseURL, secret: randomBytes(48).toString('hex') }
    expect(() => assertLocalIdentityConfiguration({ ...valid, environment: 'production' })).toThrow(
      /production/,
    )
    expect(() =>
      assertLocalIdentityConfiguration({ ...valid, baseURL: 'https://public.example' }),
    ).toThrow(/loopback/)
    expect(() =>
      assertLocalIdentityConfiguration({ ...valid, allowedOrigins: ['http://attacker.example'] }),
    ).toThrow(/loopback/)
    expect(() => assertLocalIdentityConfiguration({ ...valid, secret: '' })).toThrow(/32/)
    await expect(
      createApp({ db: handle.db, demoMode: true, localIdentity: valid }),
    ).rejects.toThrow(/demo profile/)
    await expect(
      createApp({
        db: handle.db,
        demoMode: false,
        environment: 'production',
        localIdentity: valid,
      }),
    ).rejects.toThrow(/production/)
    await expect(createApp({ db: handle.db, demoMode: false })).rejects.toThrow(/DEMO_MODE/)
  })
  test('signup records explicit adult and versioned terms acceptance, hashes passwords and starts with an empty owned profile', async () => {
    const app = await appFor()
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: headers(),
      payload: {
        name: 'Test',
        email: `invalid-${randomUUID()}@example.invalid`,
        password,
        adultAttested: false,
        termsVersion: LOCAL_TERMS_VERSION,
      },
    })
    expect(invalid.statusCode, invalid.payload).toBe(400)
    const person = await signUp(app)
    expect(person.response.payload).not.toContain('"token"')
    expect(JSON.stringify(person.response.headers['set-cookie'])).toContain('HttpOnly')
    expect(JSON.stringify(person.response.headers['set-cookie'])).toContain('SameSite=Strict')
    const [account] = await handle.db
      .select()
      .from(identity.account)
      .where(eq(identity.account.userId, person.userId))
    expect(account?.password).toBeTruthy()
    expect(account?.password).not.toBe(password)
    const acceptance = await handle.db
      .select()
      .from(identity.acceptances)
      .where(eq(identity.acceptances.userId, person.userId))
    expect(acceptance.map((row) => row.kind).sort()).toEqual(['adult_attestation', 'terms'])
    expect(acceptance.find((row) => row.kind === 'terms')?.textVersion).toBe(LOCAL_TERMS_VERSION)
    const overview = await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })
    expect(overview.statusCode, overview.payload).toBe(200)
    expect(overview.json()).toMatchObject({
      profile: { id: person.profileId },
      transactions: [],
      connections: [],
      accounts: [],
    })
    expect(
      (await app.inject({ url: '/api/auth/get-session', headers: headers(person.cookie) })).payload,
    ).not.toContain('"token"')
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/update-user',
          headers: headers(person.cookie),
          payload: { adultAttested: false },
        })
      ).statusCode,
    ).toBe(404)
  })
  test('missing, forged, expired, revoked and over-90-day sessions are rejected without cookie cache', async () => {
    const app = await appFor(),
      person = await signUp(app)
    expect((await app.inject({ url: '/v1/demo' })).statusCode).toBe(401)
    expect(
      (
        await app.inject({
          url: '/v1/demo',
          headers: headers('lilleri-local.session_token=forged'),
        })
      ).statusCode,
    ).toBe(401)
    const cookie = await signIn(app, person.email)
    const [session] = await handle.db
      .select()
      .from(identity.session)
      .where(eq(identity.session.userId, person.userId))
      .orderBy(identity.session.createdAt)
    expect(session).toBeDefined()
    if (!session) throw new Error('Missing created session')
    await handle.db
      .update(identity.session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(identity.session.id, session.id))
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(401)
    const active = await app.inject({ url: '/v1/auth/principal', headers: headers(cookie) })
    expect(active.statusCode, active.payload).toBe(200)
    await handle.db
      .update(identity.session)
      .set({
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000 - 1000),
        expiresAt: new Date(Date.now() + 60_000),
      })
      .where(eq(identity.session.id, active.json().sessionId))
    expect((await app.inject({ url: '/v1/demo', headers: headers(cookie) })).statusCode).toBe(401)
    const finalCookie = await signIn(app, person.email)
    const signedOut = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: headers(finalCookie),
      payload: {},
    })
    expect(signedOut.statusCode, signedOut.payload).toBe(200)
    expect((await app.inject({ url: '/v1/demo', headers: headers(finalCookie) })).statusCode).toBe(
      401,
    )
  })
  test('principal A cannot select profile B with headers, IDs, cursors or session-management commands', async () => {
    const app = await appFor(),
      a = await signUp(app),
      b = await signUp(app)
    const connected = await app.inject({
      method: 'POST',
      url: '/v1/connections/mock',
      headers: headers(b.cookie),
      payload: {},
    })
    expect(connected.statusCode, connected.payload).toBe(200)
    const bOverview = (await app.inject({ url: '/v1/demo', headers: headers(b.cookie) })).json()
    expect(bOverview.transactions.length).toBeGreaterThan(0)
    const disguised = await app.inject({
      url: '/v1/demo',
      headers: {
        ...headers(a.cookie),
        'x-profile-id': b.profileId,
        authorization: `Bearer ${b.userId}`,
      },
    })
    expect(disguised.statusCode, disguised.payload).toBe(200)
    expect(disguised.json()).toMatchObject({ profile: { id: a.profileId }, transactions: [] })
    expect((await app.inject({ url: '/v1/settings' })).statusCode).toBe(401)
    const ownedSettings = await app.inject({
      url: '/v1/settings',
      headers: { ...headers(a.cookie), 'x-profile-id': b.profileId },
    })
    expect(ownedSettings.statusCode, ownedSettings.payload).toBe(200)
    expect(ownedSettings.json().settings.profileId).toBe(a.profileId)
    const foreignSync = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connected.json().id}/sync`,
      headers: headers(a.cookie),
      payload: {},
    })
    expect(foreignSync.statusCode, foreignSync.payload).toBe(404)
    const foreignTransaction = bOverview.transactions[0]
    const correction = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${foreignTransaction.id}/classification`,
      headers: headers(a.cookie),
      payload: { categoryId: 'groceries', scope: 'once', revision: foreignTransaction.revision },
    })
    expect(correction.statusCode, correction.payload).toBe(404)
    const sessions = (
      await app.inject({ url: '/v1/auth/sessions', headers: headers(b.cookie) })
    ).json().sessions
    const revoked = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${sessions[0].id}`,
      headers: headers(a.cookie),
    })
    expect(revoked.statusCode, revoked.payload).toBe(404)
    expect((await app.inject({ url: '/v1/demo', headers: headers(b.cookie) })).statusCode).toBe(200)
    const bPage = await app.inject({ url: '/v1/transactions?limit=1', headers: headers(b.cookie) })
    const cursor = bPage.json().nextCursor as string
    expect(cursor).toBeTruthy()
    expect(
      (
        await app.inject({
          url: `/v1/transactions?cursor=${encodeURIComponent(cursor)}`,
          headers: headers(a.cookie),
        })
      ).statusCode,
    ).toBe(400)
  })
  test('sensitive export/disconnect/deletion require session-bound reauthentication and expire at five minutes', async () => {
    let at = new Date()
    const app = await appFor({ now: () => at }),
      person = await signUp(app)
    const connection = await app.inject({
      method: 'POST',
      url: '/v1/connections/mock',
      headers: headers(person.cookie),
      payload: {},
    })
    expect(connection.statusCode, connection.payload).toBe(200)
    for (const request of [
      { method: 'GET' as const, url: '/v1/export' },
      { method: 'GET' as const, url: '/v1/export/archive' },
      { method: 'DELETE' as const, url: `/v1/connections/${connection.json().id}` },
      { method: 'DELETE' as const, url: '/v1/profile' },
    ]) {
      const response = await app.inject({ ...request, headers: headers(person.cookie) })
      expect(response.statusCode, response.payload).toBe(401)
      expect(response.json().code).toBe('reauthentication_required')
    }
    const wrong = await app.inject({
      method: 'POST',
      url: '/v1/auth/reauthenticate',
      headers: headers(person.cookie),
      payload: { password: 'incorrect password' },
    })
    expect(wrong.statusCode).toBe(401)
    expect(
      (await handle.db.select().from(identity.stepUps)).filter((row) => row.sessionId),
    ).toEqual([])
    const verified = await stepUp(app, person.cookie)
    expect(verified.expiresAt).toBe(new Date(at.getTime() + STEP_UP_SECONDS * 1000).toISOString())
    const exported = await app.inject({ url: '/v1/export', headers: headers(person.cookie) })
    expect(exported.statusCode, exported.payload).toBe(200)
    expect(exported.payload).not.toContain('identity_sessions')
    expect(exported.json().identity.user.id).toBe(person.userId)
    expect(exported.json().identity.acceptances).toHaveLength(2)
    expect(JSON.stringify(exported.json().identity)).not.toContain('"token"')
    const archive = await app.inject({ url: '/v1/export/archive', headers: headers(person.cookie) })
    expect(archive.statusCode).toBe(200)
    expect(archive.headers['content-type']).toBe('application/zip')
    expect(archive.rawPayload.subarray(0, 2).toString()).toBe('PK')
    const secondCookie = await signIn(app, person.email)
    expect(
      (await app.inject({ url: '/v1/export', headers: headers(secondCookie) })).statusCode,
    ).toBe(401)
    at = new Date(at.getTime() + STEP_UP_SECONDS * 1000)
    expect(
      (await app.inject({ url: '/v1/export', headers: headers(person.cookie) })).statusCode,
    ).toBe(401)
    expect(
      (await app.inject({ url: '/v1/export/archive', headers: headers(person.cookie) })).statusCode,
    ).toBe(401)
    await stepUp(app, person.cookie)
    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/v1/connections/${connection.json().id}`,
      headers: headers(person.cookie),
    })
    expect(disconnected.statusCode, disconnected.payload).toBe(204)
    const erased = await app.inject({
      method: 'DELETE',
      url: '/v1/profile',
      headers: headers(person.cookie),
    })
    expect(erased.statusCode, erased.payload).toBe(204)
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(401)
    expect(
      await handle.db
        .select()
        .from(identity.memberships)
        .where(eq(identity.memberships.userId, person.userId)),
    ).toEqual([])
  })
  test('encoded registered sensitive routes enforce step-up and viewer/removed memberships cannot mutate or reseed', async () => {
    const app = await appFor(),
      person = await signUp(app)
    const connection = await app.inject({
      method: 'POST',
      url: '/v1/connections/mock',
      headers: headers(person.cookie),
      payload: {},
    })
    expect(connection.statusCode, connection.payload).toBe(200)
    for (const request of [
      { method: 'GET' as const, url: '/v1/%65xport' },
      { method: 'GET' as const, url: '/v1/%65xport/%61rchive' },
      { method: 'GET' as const, url: '/%761/export?ignored=value' },
      { method: 'DELETE' as const, url: '/v1/%70rofile' },
      { method: 'DELETE' as const, url: `/v1/%63onnections/${connection.json().id}?ignored=value` },
    ]) {
      const response = await app.inject({ ...request, headers: headers(person.cookie) })
      expect(response.statusCode, response.payload).toBe(401)
      expect(response.json().code).toBe('reauthentication_required')
    }
    expect(
      (await app.inject({ url: '/v1//export', headers: headers(person.cookie) })).statusCode,
    ).toBe(404)
    const viewerSettings = (
      await app.inject({ url: '/v1/settings', headers: headers(person.cookie) })
    ).json().settings
    await handle.db
      .update(identity.memberships)
      .set({ role: 'viewer' })
      .where(eq(identity.memberships.userId, person.userId))
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(200)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/connections/mock',
          headers: headers(person.cookie),
          payload: {},
        })
      ).statusCode,
    ).toBe(404)
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: '/v1/settings',
          headers: headers(person.cookie),
          payload: {
            displayName: 'Forbidden viewer edit',
            locale: 'it-IT',
            timezone: 'Europe/Rome',
            revision: viewerSettings.revision,
          },
        })
      ).statusCode,
    ).toBe(404)
    await handle.db
      .delete(identity.memberships)
      .where(eq(identity.memberships.userId, person.userId))
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(404)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/connections/mock',
          headers: headers(person.cookie),
          payload: {},
        })
      ).statusCode,
    ).toBe(404)
    expect(
      await handle.db
        .select()
        .from(identity.memberships)
        .where(eq(identity.memberships.userId, person.userId)),
    ).toEqual([])
  })
  test('identity cleanup shares erasure transaction: failure rolls back every effect and session revocation cannot interrupt authorised deletion', async () => {
    const app = await appFor(),
      person = await signUp(app)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/connections/mock',
          headers: headers(person.cookie),
          payload: {},
        })
      ).statusCode,
    ).toBe(200)
    await stepUp(app, person.cookie)
    const originalErase = DemoService.prototype.erase
    const failed = vi.spyOn(DemoService.prototype, 'erase').mockImplementationOnce(async function (
      this: DemoService,
      completion,
    ) {
      await originalErase.call(this, async (db) => {
        await completion?.(db)
        throw new Error('Synthetic credential cleanup fault')
      })
    })
    try {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/profile',
        headers: headers(person.cookie),
      })
      expect(response.statusCode, response.payload).toBe(500)
      expect(response.payload).not.toContain('Synthetic credential cleanup fault')
      expect(
        (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
      ).toBe(200)
      expect(
        await handle.db
          .select()
          .from(schema.profileTombstones)
          .where(eq(schema.profileTombstones.profileId, person.profileId)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(schema.revocationJobs)
          .where(eq(schema.revocationJobs.profileId, person.profileId)),
      ).toEqual([])
      expect(
        await handle.db.select().from(identity.user).where(eq(identity.user.id, person.userId)),
      ).toHaveLength(1)
      expect(
        await handle.db
          .select()
          .from(identity.account)
          .where(eq(identity.account.userId, person.userId)),
      ).toHaveLength(1)
    } finally {
      failed.mockRestore()
    }
    const revoked = vi.spyOn(DemoService.prototype, 'erase').mockImplementationOnce(async function (
      this: DemoService,
      completion,
    ) {
      await originalErase.call(this, async (db) => {
        await db.delete(identity.session).where(eq(identity.session.userId, person.userId))
        await completion?.(db)
      })
    })
    try {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/profile',
        headers: headers(person.cookie),
      })
      expect(response.statusCode, response.payload).toBe(204)
      expect(
        (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
      ).toBe(401)
      expect(
        await handle.db.select().from(identity.user).where(eq(identity.user.id, person.userId)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(identity.account)
          .where(eq(identity.account.userId, person.userId)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(identity.memberships)
          .where(eq(identity.memberships.userId, person.userId)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, person.profileId)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(schema.profileTombstones)
          .where(eq(schema.profileTombstones.profileId, person.profileId)),
      ).toHaveLength(1)
      expect(
        await handle.db
          .select()
          .from(schema.revocationJobs)
          .where(eq(schema.revocationJobs.profileId, person.profileId)),
      ).toHaveLength(1)
    } finally {
      revoked.mockRestore()
    }
  })
  test('session list and single/all-session revocation take effect on the next financial request', async () => {
    const app = await appFor(),
      person = await signUp(app),
      otherCookie = await signIn(app, person.email)
    const list = await app.inject({ url: '/v1/auth/sessions', headers: headers(person.cookie) })
    expect(list.statusCode, list.payload).toBe(200)
    expect(list.payload).not.toContain('token')
    expect(list.json().sessions).toHaveLength(2)
    const other = list.json().sessions.find((row: { current: boolean }) => !row.current)
    const revoke = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${other.id}`,
      headers: headers(person.cookie),
    })
    expect(revoke.statusCode, revoke.payload).toBe(204)
    expect((await app.inject({ url: '/v1/demo', headers: headers(otherCookie) })).statusCode).toBe(
      401,
    )
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(200)
    await stepUp(app, person.cookie)
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: '/v1/auth/sessions',
          headers: headers(person.cookie),
        })
      ).statusCode,
    ).toBe(204)
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(401)
    expect(await handle.db.select().from(identity.stepUps)).toEqual([])
  })
  test('state-changing requests require exact allowed Origin and reauthentication attempts are bounded', async () => {
    const app = await appFor(),
      person = await signUp(app)
    const missingOrigin = await app.inject({
      method: 'POST',
      url: '/v1/connections/mock',
      headers: { cookie: person.cookie },
      payload: {},
    })
    expect(missingOrigin.statusCode).toBe(403)
    const foreignOrigin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { cookie: person.cookie, origin: 'https://attacker.example' },
      payload: {},
    })
    expect(foreignOrigin.statusCode).toBe(403)
    const requests = []
    for (let n = 0; n < 6; n++)
      requests.push(
        await app.inject({
          method: 'POST',
          url: '/v1/auth/reauthenticate',
          headers: headers(person.cookie),
          payload: { password: 'bad password' },
        }),
      )
    expect(requests.slice(0, 5).map((response) => response.statusCode)).toEqual([
      401, 401, 401, 401, 401,
    ])
    expect(requests[5]?.statusCode).toBe(429)
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(200)
  })
  test('concurrent login attempts share an atomic local quota that spoofed forwarding headers cannot bypass', async () => {
    const app = await appFor()
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        app.inject({
          method: 'POST',
          url: '/api/auth/sign-in/email',
          headers: {
            ...headers(),
            'x-forwarded-for': `198.51.100.${index + 1}`,
            'x-real-ip': `203.0.113.${index + 1}`,
          },
          payload: {},
        }),
      ),
    )
    expect(responses.filter((response) => response.statusCode === 400)).toHaveLength(5)
    expect(responses.filter((response) => response.statusCode === 429)).toHaveLength(1)
    const denied = responses.find((response) => response.statusCode === 429)
    expect(Number(denied?.headers['retry-after'])).toBeGreaterThan(0)
  })
  test('an injected local verification delivery enforces verification before login and marks the e-mail verified', async () => {
    const deliveries: { email: string; url: string }[] = []
    const app = await appFor({
      deliverVerification: async (message) => {
        deliveries.push(message)
      },
    })
    const person = await signUp(app)
    expect(person.cookie).toBe('')
    expect(deliveries).toHaveLength(1)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/sign-in/email',
          headers: headers(),
          payload: { email: person.email, password },
        })
      ).statusCode,
    ).toBe(403)
    const delivery = deliveries[0]
    if (!delivery) throw new Error('Missing verification delivery')
    const verification = new URL(delivery.url)
    verification.searchParams.delete('callbackURL')
    const verified = await app.inject({
      url: `${verification.pathname}${verification.search}`,
      headers: headers(),
    })
    expect(verified.statusCode, verified.payload).toBe(200)
    const cookie = await signIn(app, person.email)
    expect((await app.inject({ url: '/v1/demo', headers: headers(cookie) })).statusCode).toBe(200)
    const [user] = await handle.db
      .select()
      .from(identity.user)
      .where(eq(identity.user.id, person.userId))
    expect(user?.emailVerified).toBe(true)
  })
  test('TOTP enrollment verifies possession, password login requires a second factor and recovery codes are atomically single-use', async () => {
    const app = await appFor(),
      person = await signUp(app)
    const enabled = await app.inject({
      method: 'POST',
      url: '/api/auth/two-factor/enable',
      headers: headers(person.cookie),
      payload: { password },
    })
    expect(enabled.statusCode, enabled.payload).toBe(200)
    const uri = new URL(enabled.json().totpURI),
      encoded = uri.searchParams.get('secret')
    if (!encoded) throw new Error('Missing TOTP enrollment secret')
    const secret = new TextDecoder().decode(base32.decode(encoded))
    const otp = createOTP(secret),
      code = await otp.totp()
    const recovery = enabled.json().backupCodes as string[]
    expect(recovery).toHaveLength(10)
    const [pending] = await handle.db
      .select()
      .from(identity.twoFactor)
      .where(eq(identity.twoFactor.userId, person.userId))
    expect(pending?.verified).toBe(false)
    expect(pending?.secret).not.toBe(secret)
    expect(pending?.backupCodes).not.toContain(recovery[0])
    const verified = await app.inject({
      method: 'POST',
      url: '/api/auth/two-factor/verify-totp',
      headers: headers(person.cookie),
      payload: { code, trustDevice: false },
    })
    expect(verified.statusCode, verified.payload).toBe(200)
    const enrolledCookie = cookieOf(verified)
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(person.cookie) })).statusCode,
    ).toBe(401)
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(enrolledCookie) })).statusCode,
    ).toBe(200)
    const logout = async (cookie: string) => {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/auth/sign-out',
            headers: headers(cookie),
            payload: {},
          })
        ).statusCode,
      ).toBe(200)
    }
    const challenge = async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        headers: headers(),
        payload: { email: person.email, password },
      })
      expect(response.statusCode, response.payload).toBe(200)
      expect(response.json().twoFactorRedirect).toBe(true)
      const cookie = cookieOf(response)
      expect((await app.inject({ url: '/v1/demo', headers: headers(cookie) })).statusCode).toBe(401)
      return cookie
    }
    await logout(enrolledCookie)
    const challenged = await challenge()
    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/two-factor/verify-totp',
      headers: headers(challenged),
      payload: {
        code: ((Number(code) + 1) % 1_000_000).toString().padStart(6, '0'),
        trustDevice: false,
      },
    })
    expect(bad.statusCode).toBe(401)
    const signedIn = await app.inject({
      method: 'POST',
      url: '/api/auth/two-factor/verify-totp',
      headers: headers(challenged),
      payload: { code: await otp.totp(), trustDevice: false },
    })
    expect(signedIn.statusCode, signedIn.payload).toBe(200)
    const signedInCookie = cookieOf(signedIn)
    expect(
      (await app.inject({ url: '/v1/demo', headers: headers(signedInCookie) })).statusCode,
    ).toBe(200)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/reauthenticate',
          headers: headers(signedInCookie),
          payload: { password },
        })
      ).statusCode,
    ).toBe(401)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/reauthenticate',
          headers: headers(signedInCookie),
          payload: { password, code: await otp.totp() },
        })
      ).statusCode,
    ).toBe(200)
    await logout(signedInCookie)
    const firstRecoveryChallenge = await challenge()
    const recover = (cookie: string, recoveryCode: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/two-factor/verify-backup-code',
        headers: headers(cookie),
        payload: { code: recoveryCode, trustDevice: false },
      })
    const recovered = await recover(firstRecoveryChallenge, recovery[0] ?? '')
    expect(recovered.statusCode, recovered.payload).toBe(200)
    await logout(cookieOf(recovered))
    const replayChallenge = await challenge()
    expect((await recover(replayChallenge, recovery[0] ?? '')).statusCode).toBe(401)
    const [leftCookie, rightCookie] = await Promise.all([challenge(), challenge()])
    const races = await Promise.all([
      recover(leftCookie, recovery[1] ?? ''),
      recover(rightCookie, recovery[1] ?? ''),
    ])
    expect(races.filter((response) => response.statusCode === 200)).toHaveLength(1)
    const denied = races.find((response) => response.statusCode !== 200)
    expect([401, 409]).toContain(denied?.statusCode)
    for (const response of races) expect(response.payload).not.toContain('"token"')
  })
})
