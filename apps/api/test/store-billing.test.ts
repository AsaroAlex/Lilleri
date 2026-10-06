import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  armBillingCancellation,
  type BillingConfiguration,
  createBillingExtension,
  profilePlan,
  runBillingCancellations,
  settleBillingCancellation,
} from '../src/billing.js'
import { billingCancellations, storeEntitlements } from '../src/billing-schema.js'
import type { IdentityMailMessage } from '../src/identity-mail.js'
import * as identity from '../src/identity-schema.js'
import {
  createStoreBillingExtension,
  deleteStoreCustomer,
  type RevenueCatConfiguration,
  refreshStoreEntitlement,
  revenueCatConfigurationFromEnvironment,
  type StoreBillingLogEntry,
  verifyRevenueCatSignature,
} from '../src/store-billing.js'

type App = Awaited<ReturnType<typeof createApp>>
const baseURL = 'https://identity.lilleri.example'
const host = new URL(baseURL).host
const password = 'Synthetic store password 41!'
const webhookAuthorization = `Bearer ${randomBytes(24).toString('hex')}`
const signingSecret = randomBytes(24).toString('hex')
let clock = '2026-10-06T10:00:00.000Z'
const days = (count: number) => new Date(Date.parse(clock) + count * 86_400_000).toISOString()

/** RevenueCat v1 customer emulation: one subscriber document per app user id. */
class FakeRevenueCat {
  readonly calls: { method: string; id: string; authorization: string | null }[] = []
  readonly subscribers = new Map<string, unknown>()
  failNext = 0
  readonly fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const id = decodeURIComponent(url.pathname.replace('/v1/subscribers/', ''))
    const method = init?.method ?? 'GET'
    this.calls.push({ method, id, authorization: new Headers(init?.headers).get('authorization') })
    if (this.failNext > 0) {
      this.failNext--
      return new Response('{"message":"overloaded customer receipt"}', { status: 503 })
    }
    if (method === 'DELETE') {
      const existed = this.subscribers.delete(id)
      return new Response(JSON.stringify({ app_user_id: id, deleted: true }), {
        status: existed ? 200 : 404,
      })
    }
    return new Response(
      JSON.stringify(
        this.subscribers.get(id) ?? { subscriber: { entitlements: {}, subscriptions: {} } },
      ),
    )
  }
  plus(
    id: string,
    options: {
      store?: string
      expires?: string | null
      sandbox?: boolean
      unsubscribed?: boolean
      billingIssue?: boolean
      product?: string
    } = {},
  ) {
    const product = options.product ?? 'app.lilleri.plus.monthly'
    this.subscribers.set(id, {
      request_date: clock,
      subscriber: {
        management_url: 'https://apps.apple.com/account/subscriptions',
        entitlements: {
          plus: {
            expires_date: options.expires === undefined ? days(30) : options.expires,
            grace_period_expires_date: null,
            product_identifier: product,
            purchase_date: clock,
          },
        },
        subscriptions: {
          [product]: {
            store: options.store ?? 'app_store',
            is_sandbox: options.sandbox ?? false,
            unsubscribe_detected_at: options.unsubscribed ? clock : null,
            billing_issues_detected_at: options.billingIssue ? clock : null,
            expires_date: options.expires === undefined ? days(30) : options.expires,
          },
        },
      },
    })
  }
}

let handle: DatabaseHandle
let app: App
const revenueCat = new FakeRevenueCat()
const logs: StoreBillingLogEntry[] = []
const users: string[] = []
const profiles: string[] = []
const verifications: IdentityMailMessage[] = []
const configuration = (extra: Partial<RevenueCatConfiguration> = {}): RevenueCatConfiguration => ({
  secretKey: 'sk_SyntheticRevenueCatKey0000',
  webhookAuthorization,
  webhookSigningSecret: signingSecret,
  entitlementId: 'plus',
  acceptSandbox: true,
  fetch: revenueCat.fetch,
  now: () => clock,
  log: (entry) => logs.push(entry),
  ...extra,
})
const headers = (cookie = '') => ({ origin: baseURL, host, ...(cookie ? { cookie } : {}) })
const person = async () => {
  const email = `store-${randomUUID()}@example.invalid`
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
  const link = new URL(verifications.find((message) => message.email === email)?.url ?? baseURL)
  link.searchParams.delete('callbackURL')
  await app.inject({ url: `${link.pathname}${link.search}`, headers: headers() })
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: headers(),
    payload: { email, password },
  })
  expect(login.statusCode, login.payload).toBe(200)
  const cookie = String(login.headers['set-cookie'] ?? '')
    .split(/,(?=\s*[^;,]+=)/)
    .map((value) => value.split(';')[0])
    .join('; ')
  return { userId, profileId: membership.profileId, cookie }
}
const deliver = (event: object, options: { authorization?: string; signature?: string } = {}) => {
  const payload = JSON.stringify({ api_version: '1.0', event })
  const timestamp = Math.floor(Date.parse(clock) / 1000)
  const signature =
    options.signature ??
    `t=${timestamp},v1=${createHmac('sha256', signingSecret).update(`${timestamp}.${payload}`).digest('hex')}`
  return app.inject({
    method: 'POST',
    url: '/webhooks/revenuecat',
    headers: {
      host,
      'content-type': 'application/json',
      authorization: options.authorization ?? webhookAuthorization,
      'x-revenuecat-webhook-signature': signature,
    },
    payload,
  })
}
const stored = async (profileId: string) =>
  (
    await handle.db
      .select()
      .from(storeEntitlements)
      .where(eq(storeEntitlements.profileId, profileId))
  )[0]
const stripe: BillingConfiguration = {
  secretKey: 'sk_test_SyntheticStoreStripeKey00000',
  webhookSecret: `whsec_${randomBytes(24).toString('hex')}`,
  prices: { month: 'price_StoreMonthly', year: 'price_StoreYearly' },
  baseURL,
  now: () => clock,
  fetch: async (input) => {
    const id = String(input).split('/').at(-1)
    return new Response(
      JSON.stringify({
        id,
        object: 'price',
        active: true,
        currency: 'eur',
        unit_amount: id === 'price_StoreYearly' ? 6999 : 699,
        type: 'recurring',
        recurring: { interval: id === 'price_StoreYearly' ? 'year' : 'month', interval_count: 1 },
      }),
    )
  },
}

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
    extensions: [
      createBillingExtension(stripe),
      createStoreBillingExtension(configuration(), {
        plan: async (db, profileId) => (await profilePlan(db, profileId, clock)).plan,
      }),
    ],
  })
})
afterAll(async () => {
  await app?.close()
  if (!handle) return
  for (const id of users) await handle.db.delete(identity.user).where(eq(identity.user.id, id))
  if (profiles.length) {
    await handle.db.delete(schema.profiles).where(inArray(schema.profiles.id, profiles))
    await handle.db
      .delete(billingCancellations)
      .where(inArray(billingCancellations.profileId, profiles))
  }
  await handle.close()
})

describe('RevenueCat configuration and webhook authentication', () => {
  test('configuration is all-or-nothing, validated and never echoes values', () => {
    expect(revenueCatConfigurationFromEnvironment({})).toBeNull()
    const valid = {
      REVENUECAT_SECRET_KEY: 'sk_SyntheticRevenueCatKey0000',
      REVENUECAT_WEBHOOK_AUTHORIZATION: webhookAuthorization,
    }
    expect(revenueCatConfigurationFromEnvironment(valid)).toMatchObject({
      entitlementId: 'plus',
      acceptSandbox: true,
    })
    expect(
      revenueCatConfigurationFromEnvironment({ ...valid, REVENUECAT_ACCEPT_SANDBOX: '0' })
        ?.acceptSandbox,
    ).toBe(false)
    for (const broken of [
      { REVENUECAT_SECRET_KEY: valid.REVENUECAT_SECRET_KEY },
      { ...valid, REVENUECAT_SECRET_KEY: 'appl_publicKeyNotSecret0000' },
      { ...valid, REVENUECAT_WEBHOOK_AUTHORIZATION: 'short' },
      { ...valid, REVENUECAT_ACCEPT_SANDBOX: 'yes' },
    ]) {
      let failure: unknown
      try {
        revenueCatConfigurationFromEnvironment(broken)
      } catch (error) {
        failure = error
      }
      expect((failure as Error).message).toBe('RevenueCat configuration is invalid')
    }
  })

  test('only the configured Authorization and a fresh signature are accepted', async () => {
    const before = revenueCat.calls.length
    const event = { type: 'INITIAL_PURCHASE', app_user_id: `profile_hosted_${randomUUID()}` }
    expect((await deliver(event, { authorization: 'Bearer wrong' })).statusCode).toBe(401)
    expect((await deliver(event, { signature: 't=1,v1=00' })).statusCode).toBe(401)
    const stale = Math.floor(Date.parse(clock) / 1000) - 3600
    expect(
      (
        await deliver(event, {
          signature: `t=${stale},v1=${createHmac('sha256', signingSecret).update(`${stale}.{}`).digest('hex')}`,
        })
      ).statusCode,
    ).toBe(401)
    expect(revenueCat.calls.length).toBe(before)
    expect(verifyRevenueCatSignature(undefined, Buffer.from('{}'), signingSecret, 0)).toBe(false)
  })

  test('test events and ids that are not Lilleri profiles never reach the API', async () => {
    const before = revenueCat.calls.length
    expect((await deliver({ type: 'TEST', app_user_id: 'anything' })).json()).toEqual({
      received: true,
    })
    const anonymous = await deliver({
      type: 'INITIAL_PURCHASE',
      app_user_id: '$RCAnonymousID:abc',
      aliases: ['someone@example.invalid', '../profile_hosted_x'],
    })
    expect(anonymous.statusCode).toBe(200)
    // A well-formed id for a profile that does not exist is not looked up either.
    await deliver({ type: 'RENEWAL', app_user_id: `profile_hosted_${randomUUID()}` })
    expect(revenueCat.calls.length).toBe(before)
    expect(logs).toContainEqual({ event: 'store_webhook_ignored', reason: 'test' })
  })
})

describe('App Store and Google Play entitlements', () => {
  let owner: Awaited<ReturnType<typeof person>>
  let editor: Awaited<ReturnType<typeof person>>
  beforeAll(async () => {
    owner = await person()
    editor = await person()
    await handle.db
      .update(identity.memberships)
      .set({ role: 'editor' })
      .where(eq(identity.memberships.userId, editor.userId))
  })
  const billing = async (cookie: string) =>
    (await app.inject({ url: '/v1/billing', headers: headers(cookie) })).json()

  test('a webhook re-reads RevenueCat and grants Plus from the App Store', async () => {
    revenueCat.plus(owner.profileId)
    // The payload is ignored except for the ids: a forged expiry changes nothing.
    const response = await deliver({
      type: 'INITIAL_PURCHASE',
      app_user_id: owner.profileId,
      expiration_at_ms: 1,
      entitlement_ids: ['plus'],
    })
    expect(response.statusCode, response.payload).toBe(200)
    const last = revenueCat.calls.at(-1)
    expect(last).toEqual({
      method: 'GET',
      id: owner.profileId,
      authorization: 'Bearer sk_SyntheticRevenueCatKey0000',
    })
    expect(await stored(owner.profileId)).toMatchObject({
      store: 'app_store',
      productId: 'app.lilleri.plus.monthly',
      expiresAt: days(30),
      willRenew: true,
      managementUrl: 'https://apps.apple.com/account/subscriptions',
    })
    expect(await billing(owner.cookie)).toMatchObject({
      plan: 'plus',
      channel: 'app_store',
      interval: 'month',
      status: 'active',
      managementUrl: 'https://apps.apple.com/account/subscriptions',
      purchaseAvailable: false,
      storePurchaseAvailable: false,
    })
    // No second subscription on the website while the store one is active.
    const checkout = await app.inject({
      method: 'POST',
      url: '/v1/billing/checkout',
      headers: headers(owner.cookie),
      payload: { interval: 'year' },
    })
    expect(checkout.statusCode).toBe(409)
    expect(checkout.json().code).toBe('store_subscription_active')
  })

  test('cancellation, billing issues and expiry follow RevenueCat; transfers re-read both', async () => {
    revenueCat.plus(owner.profileId, { unsubscribed: true, billingIssue: true })
    await deliver({ type: 'CANCELLATION', app_user_id: owner.profileId })
    expect(await billing(owner.cookie)).toMatchObject({
      plan: 'plus',
      status: 'past_due',
      cancelAtPeriodEnd: true,
    })
    revenueCat.plus(owner.profileId, { expires: days(-1) })
    await deliver({ type: 'EXPIRATION', app_user_id: owner.profileId })
    expect(await billing(owner.cookie)).toMatchObject({
      plan: 'gratis',
      channel: 'app_store',
      status: 'canceled',
    })
    // A restore on another account moves the purchase: both sides are re-read.
    revenueCat.subscribers.delete(owner.profileId)
    revenueCat.plus(editor.profileId, { store: 'play_store', product: 'plus_yearly:annual' })
    await deliver({
      type: 'TRANSFER',
      transferred_from: [owner.profileId],
      transferred_to: [editor.profileId],
    })
    expect(await stored(owner.profileId)).toBeUndefined()
    expect(await stored(editor.profileId)).toMatchObject({ store: 'play_store' })
    expect((await profilePlan(handle.db, editor.profileId, clock)).interval).toBe('year')
  })

  test('sandbox purchases are honoured only when allowed; outages make RevenueCat retry', async () => {
    revenueCat.plus(owner.profileId, { sandbox: true })
    expect(
      await refreshStoreEntitlement(
        configuration({ acceptSandbox: false }),
        handle.db,
        owner.profileId,
      ),
    ).toBe('cleared')
    expect(await refreshStoreEntitlement(configuration(), handle.db, owner.profileId)).toBe(
      'stored',
    )
    expect((await stored(owner.profileId))?.sandbox).toBe(true)
    revenueCat.failNext = 1
    const retry = await deliver({ type: 'RENEWAL', app_user_id: owner.profileId })
    expect(retry.statusCode).toBe(503)
    expect(JSON.stringify(logs)).not.toContain('receipt')
    expect(logs).toContainEqual({ event: 'store_refresh_failed', status: 503 })
  })

  test('the app refreshes its own purchase at once; editors cannot', async () => {
    revenueCat.plus(owner.profileId, { product: 'app.lilleri.plus.yearly' })
    const refreshed = await app.inject({
      method: 'POST',
      url: '/v1/billing/store/refresh',
      headers: headers(owner.cookie),
      payload: {},
    })
    expect(refreshed.statusCode, refreshed.payload).toBe(200)
    expect(refreshed.json()).toEqual({ plan: 'plus' })
    expect((await billing(owner.cookie)).interval).toBe('year')
    const refused = await app.inject({
      method: 'POST',
      url: '/v1/billing/store/refresh',
      headers: headers(editor.cookie),
      payload: {},
    })
    expect(refused.statusCode).toBe(403)
  })

  test('profile deletion erases the RevenueCat customer, retrying while RevenueCat is down', async () => {
    const profileId = `profile_hosted_${randomUUID()}`
    await handle.db.insert(schema.profiles).values({
      id: profileId,
      name: 'Profilo sintetico',
      timezone: 'Europe/Rome',
      createdAt: clock,
    })
    profiles.push(profileId)
    revenueCat.plus(profileId)
    expect(await armBillingCancellation(handle.db, profileId, clock)).toBe(false)
    expect(await armBillingCancellation(handle.db, profileId, clock, { storeCustomer: true })).toBe(
      true,
    )
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    const services = {
      stripe: null,
      deleteStoreCustomer: (id: string) => deleteStoreCustomer(configuration(), id),
      now: () => clock,
    }
    revenueCat.failNext = 1
    expect(
      await settleBillingCancellation(services, handle.db, profileId, { discardKept: true }),
    ).toBe('deferred')
    expect(revenueCat.subscribers.has(profileId)).toBe(true)
    clock = days(1)
    expect(await runBillingCancellations(services, handle.db)).toMatchObject({ canceled: 1 })
    expect(revenueCat.subscribers.has(profileId)).toBe(false)
    expect(revenueCat.calls.at(-1)).toMatchObject({ method: 'DELETE', id: profileId })
    // Without RevenueCat credentials the erasure stays owed instead of being forgotten.
    const other = `profile_hosted_${randomUUID()}`
    await handle.db
      .insert(schema.profiles)
      .values({ id: other, name: 'Profilo sintetico', timezone: 'Europe/Rome', createdAt: clock })
    profiles.push(other)
    await armBillingCancellation(handle.db, other, clock, { storeCustomer: true })
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, other))
    expect(await settleBillingCancellation({ stripe: null }, handle.db, other)).toBe('deferred')
  })
})
