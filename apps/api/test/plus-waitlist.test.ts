import { randomBytes, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { billingCustomers, billingSubscriptions } from '../src/billing-schema.js'
import {
  createScalewayIdentityDelivery,
  type IdentityMailMessage,
  PLUS_AVAILABLE_PATH,
} from '../src/identity-mail.js'
import * as identity from '../src/identity-schema.js'
import { createPlusWaitlistExtension, notifyPlusWaitlist } from '../src/plus-waitlist.js'
import { plusWaitlist } from '../src/plus-waitlist-schema.js'

type App = Awaited<ReturnType<typeof createApp>>
const baseURL = 'https://identity.lilleri.example'
const host = new URL(baseURL).host
const password = 'Synthetic waitlist password 41!'
let clock = '2026-10-05T10:00:00.000Z'
let open = false
let handle: DatabaseHandle
let app: App
const users: string[] = []
const profiles: string[] = []
const verifications: IdentityMailMessage[] = []
const headers = (cookie = '') => ({ origin: baseURL, host, ...(cookie ? { cookie } : {}) })
const cookieOf = (response: { headers: Record<string, unknown> }) => {
  const cookie = response.headers['set-cookie']
  return (Array.isArray(cookie) ? cookie : typeof cookie === 'string' ? [cookie] : [])
    .map((value) => String(value).split(';')[0])
    .join('; ')
}
const person = async () => {
  const email = `waitlist-${randomUUID()}@example.invalid`
  const signup = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: headers(),
    payload: {
      name: 'Persona sintetica',
      email,
      password,
      adultAttested: true,
      termsVersion: 'beta-terms-reviewed-fixture-v1',
    },
  })
  expect(signup.statusCode, signup.payload).toBe(200)
  const userId = signup.json().user.id as string
  users.push(userId)
  const [membership] = await handle.db
    .select()
    .from(identity.memberships)
    .where(eq(identity.memberships.userId, userId))
  if (!membership) throw new Error('Missing synthetic membership')
  profiles.push(membership.profileId)
  const delivery = verifications.find((message) => message.email === email)
  if (!delivery) throw new Error('Missing synthetic verification')
  const link = new URL(delivery.url)
  link.searchParams.delete('callbackURL')
  expect(
    (await app.inject({ url: `${link.pathname}${link.search}`, headers: headers() })).statusCode,
  ).toBe(200)
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: headers(),
    payload: { email, password },
  })
  expect(login.statusCode, login.payload).toBe(200)
  return { userId, email, profileId: membership.profileId, cookie: cookieOf(login) }
}
const call = (method: 'GET' | 'POST' | 'DELETE', cookie: string) =>
  app.inject({
    method,
    url: '/v1/plus/waitlist',
    headers: headers(cookie),
    ...(method === 'POST' ? { payload: {} } : {}),
  })

beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  app = await createApp({
    db: handle.db,
    demoMode: false,
    environment: 'production',
    financialScope: handle.withProfile,
    hostedIdentity: {
      baseURL,
      secret: randomBytes(48).toString('hex'),
      termsVersion: 'beta-terms-reviewed-fixture-v1',
      delivery: {
        sendVerification: async (message: IdentityMailMessage) => {
          verifications.push(message)
        },
        sendPasswordReset: async () => {},
      },
    },
    extensions: [createPlusWaitlistExtension({ plusOpen: async () => open, now: () => clock })],
  })
})
afterAll(async () => {
  await app?.close()
  if (!handle) return
  for (const id of users) await handle.db.delete(identity.user).where(eq(identity.user.id, id))
  if (profiles.length)
    await handle.db.delete(schema.profiles).where(inArray(schema.profiles.id, profiles))
  await handle.close()
})

describe('Plus Fondatori list', () => {
  // Sign-up is limited to five per minute per instance: the same two owners serve several tests.
  let first: Awaited<ReturnType<typeof person>>
  let second: Awaited<ReturnType<typeof person>>
  test('the table is forced under row-level security and read-only for the runtime role', async () => {
    const [table] = (
      (await handle.db.execute(
        sql`SELECT relrowsecurity, relforcerowsecurity,
          has_table_privilege('lilleri_runtime','plus_waitlist','SELECT') AS runtime_read,
          has_table_privilege('lilleri_runtime','plus_waitlist','INSERT') AS runtime_insert
          FROM pg_class WHERE relname='plus_waitlist'`,
      )) as unknown as { rows: Record<string, boolean>[] }
    ).rows
    expect(table).toEqual({
      relrowsecurity: true,
      relforcerowsecurity: true,
      runtime_read: true,
      runtime_insert: false,
    })
  })

  test('owners join and leave once, in order, and see their place in the queue', async () => {
    first = await person()
    second = await person()
    const empty = await call('GET', first.cookie)
    expect(empty.statusCode, empty.payload).toBe(200)
    expect(empty.json()).toEqual({
      offered: true,
      joined: false,
      joinedAt: null,
      position: null,
      notified: false,
    })
    expect((await call('POST', first.cookie)).json()).toMatchObject({ joined: true, position: 1 })
    clock = '2026-10-05T10:05:00.000Z'
    const joined = await call('POST', second.cookie)
    expect(joined.json()).toMatchObject({ joined: true, position: 2, joinedAt: clock })
    // Joining twice keeps the original place.
    clock = '2026-10-05T11:00:00.000Z'
    expect((await call('POST', first.cookie)).json()).toMatchObject({
      position: 1,
      joinedAt: '2026-10-05T10:00:00.000Z',
    })
    expect((await call('DELETE', first.cookie)).json()).toMatchObject({
      joined: false,
      position: null,
    })
    expect((await call('GET', second.cookie)).json()).toMatchObject({ position: 1 })
    await call('DELETE', second.cookie)
  })

  test('editors cannot join; Plus subscribers and an open Plus are not offered the list', async () => {
    const owner = await person()
    const editor = await person()
    await handle.db
      .update(identity.memberships)
      .set({ role: 'editor' })
      .where(eq(identity.memberships.userId, editor.userId))
    expect((await call('GET', editor.cookie)).json()).toMatchObject({ offered: false })
    const refused = await call('POST', editor.cookie)
    expect(refused.statusCode).toBe(403)
    expect(refused.json().code).toBe('owner_required')

    open = true
    expect((await call('GET', owner.cookie)).json()).toMatchObject({ offered: false })
    const available = await call('POST', owner.cookie)
    expect(available.statusCode).toBe(409)
    expect(available.json().code).toBe('plus_available')
    open = false

    const customer = `cus_${randomUUID().replaceAll('-', '')}`
    await handle.db
      .insert(billingCustomers)
      .values({ profileId: owner.profileId, stripeCustomerId: customer, createdAt: clock })
    await handle.db.insert(billingSubscriptions).values({
      id: `sub_${randomUUID().replaceAll('-', '')}`,
      profileId: owner.profileId,
      stripeCustomerId: customer,
      status: 'active',
      priceId: 'price_Synthetic',
      interval: 'month',
      currentPeriodEnd: '2026-11-05T10:00:00.000Z',
      stripeCreated: 1,
      updatedAt: clock,
    })
    expect((await call('GET', owner.cookie)).json()).toMatchObject({ offered: false })
  })

  test('each member gets one notice, oldest first; a refused message is retried later', async () => {
    const alpha = first
    const beta = second
    clock = '2026-10-06T09:00:00.000Z'
    await call('POST', alpha.cookie)
    clock = '2026-10-06T09:01:00.000Z'
    await call('POST', beta.cookie)
    const sent: IdentityMailMessage[] = []
    let refuse = true
    const delivery = {
      sendPlusAvailable: async (message: IdentityMailMessage) => {
        if (refuse) throw new Error('Synthetic outage')
        sent.push(message)
      },
    }
    // Earlier tests may leave other waiting members; only these two are inspected.
    const ours = async () =>
      handle.db
        .select()
        .from(plusWaitlist)
        .where(inArray(plusWaitlist.profileId, [alpha.profileId, beta.profileId]))
    expect(
      await notifyPlusWaitlist(handle.db, { delivery, baseURL, limit: 200, now: () => clock }),
    ).toMatchObject({ notified: 0, failed: true })
    expect((await ours()).every((row) => row.notifiedAt === null)).toBe(true)
    refuse = false
    const result = await notifyPlusWaitlist(handle.db, {
      delivery,
      baseURL,
      limit: 200,
      now: () => clock,
    })
    expect(result.failed).toBe(false)
    expect(sent.map((message) => message.email)).toEqual(
      expect.arrayContaining([alpha.email, beta.email]),
    )
    expect(sent.findIndex((message) => message.email === alpha.email)).toBeLessThan(
      sent.findIndex((message) => message.email === beta.email),
    )
    expect(new Set(sent.map((message) => message.url))).toEqual(
      new Set([`${baseURL}${PLUS_AVAILABLE_PATH}`]),
    )
    expect((await ours()).every((row) => row.notifiedAt === clock)).toBe(true)
    expect((await call('GET', alpha.cookie)).json()).toMatchObject({
      joined: true,
      notified: true,
      position: null,
    })
    const again = await notifyPlusWaitlist(handle.db, { delivery, baseURL, now: () => clock })
    expect(again.notified).toBe(0)
    expect(sent.filter((message) => message.email === alpha.email)).toHaveLength(1)
  })

  test('deleting the profile removes the request', async () => {
    const profileId = `waitlist_profile_${randomUUID()}`
    await handle.db.insert(schema.profiles).values({
      id: profileId,
      name: 'Profilo sintetico',
      timezone: 'Europe/Rome',
      createdAt: clock,
    })
    profiles.push(profileId)
    await handle.db.insert(plusWaitlist).values({ profileId, joinedAt: clock })
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    expect(
      await handle.db.select().from(plusWaitlist).where(eq(plusWaitlist.profileId, profileId)),
    ).toEqual([])
  })

  test('the Plus notice links only to the application page and says it is sent once', async () => {
    const requests: { body: { to: { email: string }[]; subject: string; text: string } }[] = []
    const delivery = createScalewayIdentityDelivery({
      secretKey: 'synthetic-scaleway-secret',
      projectId: '11111111-2222-4333-8444-555555555555',
      from: 'accesso@mail.lilleri.example',
      baseURL,
      fetch: async (_input, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) })
        return new Response(JSON.stringify({ emails: [{ id: 'mail-1', status: 'new' }] }))
      },
    })
    await delivery.sendPlusAvailable?.({
      email: 'persona@example.invalid',
      url: `${baseURL}${PLUS_AVAILABLE_PATH}`,
    })
    expect(requests[0]?.body.subject).toBe('Lilleri Plus è disponibile per te')
    expect(requests[0]?.body.text).toContain(`${baseURL}/app?fondatori=1`)
    expect(requests[0]?.body.text).toContain('una sola volta')
    for (const url of [
      `${baseURL}/app?fondatori=1&next=https://evil.example`,
      `${baseURL}/api/auth/verify-email?token=x`,
      `https://evil.example${PLUS_AVAILABLE_PATH}`,
      `${baseURL}/app?fondatori=1#x`,
    ])
      await expect(
        delivery.sendPlusAvailable?.({ email: 'persona@example.invalid', url }),
      ).rejects.toThrow('Invalid identity mail link')
    expect(requests).toHaveLength(1)
  })
})
