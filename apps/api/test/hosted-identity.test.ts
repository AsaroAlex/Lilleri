import { randomBytes, randomUUID } from 'node:crypto'
import { base32 } from '@better-auth/utils/base32'
import { createOTP } from '@better-auth/utils/otp'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { assertHostedIdentityConfiguration, LOCAL_TERMS_VERSION } from '../src/identity.js'
import type { IdentityDelivery, IdentityMailMessage } from '../src/identity-mail.js'
import * as identity from '../src/identity-schema.js'

let handle: DatabaseHandle
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const users: string[] = []
const profiles: string[] = []
const baseURL = 'https://identity.lilleri.example'
const termsVersion = 'beta-terms-reviewed-fixture-v1'
const password = 'Synthetic hosted password 37!'
const newPassword = 'Synthetic recovered password 58!'
const headers = (cookie = '') => ({
  origin: baseURL,
  host: new URL(baseURL).host,
  ...(cookie ? { cookie } : {}),
})
const cookieOf = (response: { headers: { [key: string]: unknown } }) => {
  const cookie = response.headers['set-cookie']
  return (Array.isArray(cookie) ? cookie : typeof cookie === 'string' ? [cookie] : [])
    .map((value) => String(value).split(';')[0])
    .join('; ')
}
const appFor = async (extra: { secret?: string; delivery?: IdentityDelivery } = {}) => {
  const verifications: IdentityMailMessage[] = [],
    resets: IdentityMailMessage[] = []
  const hostedIdentity = {
    baseURL,
    secret: extra.secret ?? randomBytes(48).toString('hex'),
    termsVersion,
    delivery: extra.delivery ?? {
      sendVerification: async (message: IdentityMailMessage) => {
        verifications.push(message)
      },
      sendPasswordReset: async (message: IdentityMailMessage) => {
        resets.push(message)
      },
    },
  }
  const app = await createApp({
    db: handle.db,
    demoMode: false,
    environment: 'production',
    financialScope: handle.withProfile,
    hostedIdentity,
  })
  apps.push(app)
  return { app, hostedIdentity, verifications, resets }
}
const signup = async (fixture: Awaited<ReturnType<typeof appFor>>) => {
  const email = `hosted-${randomUUID()}@example.invalid`
  const response = await fixture.app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: headers(),
    payload: { name: 'Persona sintetica', email, password, adultAttested: true, termsVersion },
  })
  expect(response.statusCode, response.payload).toBe(200)
  expect(cookieOf(response)).toBe('')
  const userId = response.json().user.id as string
  users.push(userId)
  const [membership] = await handle.db
    .select()
    .from(identity.memberships)
    .where(eq(identity.memberships.userId, userId))
  if (!membership) throw new Error('Missing signup membership')
  profiles.push(membership.profileId)
  return { userId, email, profileId: membership.profileId }
}
const verify = async (fixture: Awaited<ReturnType<typeof appFor>>, email: string) => {
  const delivery = fixture.verifications.find((message) => message.email === email)
  if (!delivery) throw new Error('Missing private verification delivery')
  const url = new URL(delivery.url)
  url.searchParams.delete('callbackURL')
  const response = await fixture.app.inject({
    url: `${url.pathname}${url.search}`,
    headers: headers(),
  })
  expect(response.statusCode, response.payload).toBe(200)
}
const signin = async (
  app: Awaited<ReturnType<typeof createApp>>,
  email: string,
  secret = password,
) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: headers(),
    payload: { email, password: secret },
  })
  expect(response.statusCode, response.payload).toBe(200)
  return { response, cookie: cookieOf(response) }
}
const requestReset = async (fixture: Awaited<ReturnType<typeof appFor>>, email: string) => {
  const response = await fixture.app.inject({
    method: 'POST',
    url: '/api/auth/request-password-reset',
    headers: headers(),
    payload: { email, redirectTo: `${baseURL}/recupera-accesso` },
  })
  expect(response.statusCode, response.payload).toBe(200)
  const delivery = fixture.resets.findLast((message) => message.email === email)
  if (!delivery) throw new Error('Missing private password recovery delivery')
  const link = new URL(delivery.url)
  const token = link.pathname.split('/').at(-1)
  if (!token) throw new Error('Missing private reset token')
  return { token, link }
}
const reset = (app: Awaited<ReturnType<typeof createApp>>, token: string, value = newPassword) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/reset-password',
    headers: headers(),
    payload: { token, newPassword: value },
  })

beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const id of users) await handle.db.delete(identity.user).where(eq(identity.user.id, id))
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
})

describe('explicit hosted identity release boundary using synthetic fixtures only', () => {
  test('requires HTTPS same-origin, configured mail, reviewed terms, isolated modes and a financial scope', async () => {
    const fixture = await appFor(),
      valid = fixture.hostedIdentity
    expect(() => assertHostedIdentityConfiguration(valid)).not.toThrow()
    for (const url of [
      'http://identity.lilleri.example',
      'https://localhost',
      'https://127.0.0.1',
      'https://identity.lilleri.example/',
      'https://identity.lilleri.example:8443',
      'https://user@identity.lilleri.example',
      'https://identity.local',
      'https://identity.lilleri.example/path',
    ])
      expect(() => assertHostedIdentityConfiguration({ ...valid, baseURL: url })).toThrow(/HTTPS/)
    expect(() => assertHostedIdentityConfiguration({ ...valid, secret: '' })).toThrow(/32/)
    expect(() =>
      assertHostedIdentityConfiguration({ ...valid, allowedOrigins: ['https://attacker.example'] }),
    ).toThrow(/same exact/)
    expect(() =>
      assertHostedIdentityConfiguration({ ...valid, termsVersion: LOCAL_TERMS_VERSION }),
    ).toThrow(/terms/)
    expect(() =>
      assertHostedIdentityConfiguration({ ...valid, delivery: {} as IdentityDelivery }),
    ).toThrow(/delivery/)
    await expect(
      createApp({
        db: handle.db,
        demoMode: true,
        hostedIdentity: valid,
        financialScope: handle.withProfile,
      }),
    ).rejects.toThrow(/demo profile/)
    await expect(
      createApp({ db: handle.db, demoMode: false, hostedIdentity: valid }),
    ).rejects.toThrow(/scope/)
    await expect(
      createApp({
        db: handle.db,
        demoMode: false,
        hostedIdentity: valid,
        financialScope: handle.withProfile,
        localIdentity: { baseURL: 'http://localhost:3001', secret: valid.secret },
      }),
    ).rejects.toThrow(/either/)
  })
  test('verified e-mail is mandatory and all session cookies are Secure, HttpOnly, Strict and host-only', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    const blocked = await fixture.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: headers(),
      payload: { email: person.email, password },
    })
    expect(blocked.statusCode).toBe(403)
    await verify(fixture, person.email)
    const login = await signin(fixture.app, person.email)
    const setCookies = String(login.response.headers['set-cookie'])
    for (const attribute of [
      '__Secure-lilleri-hosted',
      'Secure',
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
    ])
      expect(setCookies).toContain(attribute)
    expect(setCookies).not.toContain('Domain=')
    expect(login.response.payload).not.toContain('"token"')
    const principal = await fixture.app.inject({
      url: '/v1/auth/principal',
      headers: headers(login.cookie),
    })
    expect(principal.statusCode, principal.payload).toBe(200)
    expect(principal.json().profileId).toBe(person.profileId)
    await handle.db
      .update(identity.user)
      .set({ emailVerified: false })
      .where(eq(identity.user.id, person.userId))
    expect(
      (await fixture.app.inject({ url: '/v1/demo', headers: headers(login.cookie) })).statusCode,
    ).toBe(401)
    await handle.db
      .update(identity.user)
      .set({ emailVerified: true })
      .where(eq(identity.user.id, person.userId))
    await handle.db
      .update(identity.session)
      .set({
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 60_000),
      })
      .where(eq(identity.session.userId, person.userId))
    expect(
      (await fixture.app.inject({ url: '/v1/auth/principal', headers: headers(login.cookie) }))
        .statusCode,
    ).toBe(401)
  })
  test('a hosted principal cannot change its profile with IDs or headers and untrusted origins cannot mutate', async () => {
    const fixture = await appFor(),
      a = await signup(fixture),
      b = await signup(fixture)
    await verify(fixture, a.email)
    await verify(fixture, b.email)
    const login = await signin(fixture.app, a.email)
    const overview = await fixture.app.inject({
      url: '/v1/demo',
      headers: {
        ...headers(login.cookie),
        'x-profile-id': b.profileId,
        authorization: `Bearer ${b.userId}`,
      },
    })
    expect(overview.statusCode, overview.payload).toBe(200)
    expect(overview.json()).toMatchObject({
      profile: { id: a.profileId },
      accounts: [],
      transactions: [],
      connections: [],
    })
    expect(
      (
        await fixture.app.inject({
          method: 'POST',
          url: '/api/auth/sign-out',
          headers: { cookie: login.cookie },
          payload: {},
        })
      ).statusCode,
    ).toBe(403)
    expect(
      (
        await fixture.app.inject({
          method: 'POST',
          url: '/api/auth/sign-out',
          headers: { ...headers(login.cookie), origin: 'https://attacker.example' },
          payload: {},
        })
      ).statusCode,
    ).toBe(403)
    const forged = await fixture.app.inject({
      url: '/v1/auth/principal',
      headers: headers('lilleri-local.session_token=forged'),
    })
    expect(forged.statusCode).toBe(401)
  })
  test('password reset is single-use, replaces the password and revokes every existing session and step-up', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    await verify(fixture, person.email)
    const one = await signin(fixture.app, person.email),
      two = await signin(fixture.app, person.email)
    const elevated = await fixture.app.inject({
      method: 'POST',
      url: '/v1/auth/reauthenticate',
      headers: headers(one.cookie),
      payload: { password },
    })
    expect(elevated.statusCode, elevated.payload).toBe(200)
    const recovery = await requestReset(fixture, person.email)
    const callback = await fixture.app.inject({
      url: `${recovery.link.pathname}${recovery.link.search}`,
      headers: headers(),
    })
    expect(callback.statusCode).toBe(302)
    expect(new URL(String(callback.headers.location)).origin).toBe(baseURL)
    const changed = await reset(fixture.app, recovery.token)
    expect(changed.statusCode, changed.payload).toBe(200)
    for (const login of [one, two])
      expect(
        (await fixture.app.inject({ url: '/v1/auth/principal', headers: headers(login.cookie) }))
          .statusCode,
      ).toBe(401)
    expect(
      await handle.db
        .select()
        .from(identity.session)
        .where(eq(identity.session.userId, person.userId)),
    ).toHaveLength(0)
    expect((await reset(fixture.app, recovery.token)).statusCode).toBe(400)
    expect(
      (
        await fixture.app.inject({
          method: 'POST',
          url: '/api/auth/sign-in/email',
          headers: headers(),
          payload: { email: person.email, password },
        })
      ).statusCode,
    ).toBe(401)
    await signin(fixture.app, person.email, newPassword)
  })
  test('expired and invented recovery tokens cannot change the password or revoke sessions', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    await verify(fixture, person.email)
    const login = await signin(fixture.app, person.email),
      recovery = await requestReset(fixture, person.email)
    await handle.db
      .update(identity.verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(identity.verification.identifier, `reset-password:${recovery.token}`))
    expect((await reset(fixture.app, recovery.token)).statusCode).toBe(400)
    expect((await reset(fixture.app, 'invented-invalid-token')).statusCode).toBe(400)
    expect(
      (await fixture.app.inject({ url: '/v1/auth/principal', headers: headers(login.cookie) }))
        .statusCode,
    ).toBe(200)
    await signin(fixture.app, person.email)
  })
  test('concurrent password resets across instances have exactly one winner', async () => {
    const fixture = await appFor(),
      second = await appFor({ secret: fixture.hostedIdentity.secret }),
      person = await signup(fixture)
    await verify(fixture, person.email)
    const recovery = await requestReset(fixture, person.email)
    const outcomes = await Promise.all([
      reset(fixture.app, recovery.token),
      reset(second.app, recovery.token),
    ])
    expect(outcomes.map((response) => response.statusCode).sort()).toEqual([200, 400])
    await signin(fixture.app, person.email, newPassword)
  })
  test('failed all-session revocation rolls back the password change and preserves the recovery token', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    await verify(fixture, person.email)
    const login = await signin(fixture.app, person.email),
      recovery = await requestReset(fixture, person.email)
    const [before] = await handle.db
      .select()
      .from(identity.account)
      .where(eq(identity.account.userId, person.userId))
    if (!/^[A-Za-z0-9]+$/.test(person.userId)) throw new Error('Unsafe synthetic user identifier')
    await handle.db.execute(
      sql.raw(
        `CREATE FUNCTION hosted_fixture_reject_revoke() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.user_id = '${person.userId}' THEN RAISE EXCEPTION 'Synthetic session revocation failure'; END IF; RETURN OLD; END; $$`,
      ),
    )
    await handle.db.execute(
      sql.raw(
        'CREATE TRIGGER hosted_fixture_reject_revoke BEFORE DELETE ON identity_sessions FOR EACH ROW EXECUTE FUNCTION hosted_fixture_reject_revoke()',
      ),
    )
    try {
      expect((await reset(fixture.app, recovery.token)).statusCode).toBe(500)
      const [after] = await handle.db
        .select()
        .from(identity.account)
        .where(eq(identity.account.userId, person.userId))
      expect(after?.password).toBe(before?.password)
      expect(
        await handle.db
          .select()
          .from(identity.verification)
          .where(eq(identity.verification.identifier, `reset-password:${recovery.token}`)),
      ).toHaveLength(1)
      expect(
        (await fixture.app.inject({ url: '/v1/auth/principal', headers: headers(login.cookie) }))
          .statusCode,
      ).toBe(200)
    } finally {
      await handle.db.execute(
        sql.raw('DROP TRIGGER hosted_fixture_reject_revoke ON identity_sessions'),
      )
      await handle.db.execute(sql.raw('DROP FUNCTION hosted_fixture_reject_revoke()'))
    }
    expect((await reset(fixture.app, recovery.token)).statusCode).toBe(200)
  })
  test('password recovery keeps enrolled MFA and a new password still needs the second factor', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    await verify(fixture, person.email)
    const login = await signin(fixture.app, person.email)
    const enabled = await fixture.app.inject({
      method: 'POST',
      url: '/api/auth/two-factor/enable',
      headers: headers(login.cookie),
      payload: { password },
    })
    expect(enabled.statusCode, enabled.payload).toBe(200)
    const encoded = new URL(enabled.json().totpURI).searchParams.get('secret')
    if (!encoded) throw new Error('Missing synthetic OTP seed')
    const otp = createOTP(new TextDecoder().decode(base32.decode(encoded)))
    const verified = await fixture.app.inject({
      method: 'POST',
      url: '/api/auth/two-factor/verify-totp',
      headers: headers(login.cookie),
      payload: { code: await otp.totp(), trustDevice: false },
    })
    expect(verified.statusCode, verified.payload).toBe(200)
    const recovery = await requestReset(fixture, person.email)
    expect((await reset(fixture.app, recovery.token)).statusCode).toBe(200)
    const challenged = await signin(fixture.app, person.email, newPassword)
    expect(challenged.response.json().twoFactorRedirect).toBe(true)
    expect(
      (await fixture.app.inject({ url: '/v1/auth/principal', headers: headers(challenged.cookie) }))
        .statusCode,
    ).toBe(401)
    const [factor] = await handle.db
      .select()
      .from(identity.twoFactor)
      .where(eq(identity.twoFactor.userId, person.userId))
    expect(factor?.verified).toBe(true)
  })
  test('cross-origin recovery callbacks are rejected before delivery, including forwarded-origin spoofing', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    const rejected = await fixture.app.inject({
      method: 'POST',
      url: '/api/auth/request-password-reset',
      headers: {
        ...headers(),
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
      },
      payload: { email: person.email, redirectTo: 'https://attacker.example/stolen' },
    })
    expect(rejected.statusCode).toBe(403)
    expect(fixture.resets).toHaveLength(0)
    const recovery = await requestReset(fixture, person.email)
    recovery.link.searchParams.set('callbackURL', 'https://attacker.example/stolen')
    expect(
      (
        await fixture.app.inject({
          url: `${recovery.link.pathname}${recovery.link.search}`,
          headers: headers(),
        })
      ).statusCode,
    ).toBe(403)
  })
  test('mail transport failure does not return a success or disclose private transport data', async () => {
    const fixture = await appFor(),
      person = await signup(fixture)
    const failing = await appFor({
      secret: fixture.hostedIdentity.secret,
      delivery: {
        sendVerification: async () => {
          throw new Error('private-transport-secret')
        },
        sendPasswordReset: async () => {
          throw new Error('private-transport-secret')
        },
      },
    })
    const response = await failing.app.inject({
      method: 'POST',
      url: '/api/auth/request-password-reset',
      headers: headers(),
      payload: { email: person.email, redirectTo: `${baseURL}/recupera-accesso` },
    })
    expect(response.statusCode).toBe(503)
    expect(response.payload).not.toContain('private-transport-secret')
    const resend = await failing.app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-email',
      headers: headers(),
      payload: { email: person.email },
    })
    expect(resend.statusCode).toBe(503)
    expect(resend.payload).not.toContain('private-transport-secret')
  })
  test('login quotas survive another auth instance and spoofed IP headers cannot bypass atomic admission', async () => {
    const first = await appFor(),
      second = await appFor({ secret: first.hostedIdentity.secret })
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        (index % 2 ? first : second).app.inject({
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
    const row = await handle.db.execute(sql`SELECT key_hash, count FROM identity_request_quotas`)
    expect(JSON.stringify(row)).not.toContain('198.51.100')
    expect(JSON.stringify(row)).not.toContain('@example.invalid')
    for (const record of (row as { rows: { key_hash: string }[] }).rows)
      expect(record.key_hash).toMatch(/^[a-f0-9]{64}$/)
  })
})
