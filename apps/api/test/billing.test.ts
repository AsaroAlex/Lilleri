import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { resolveEntitlements } from '@lilleri/domain'
import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  armBillingCancellation,
  BILLING_CANCELLATION_GRACE_MS,
  type BillingConfiguration,
  type BillingExtensionOptions,
  type BillingLogEntry,
  billingConfigurationFromEnvironment,
  CHECKOUT_WITHDRAWAL_NOTICE,
  cancelBillingForProfile,
  createBillingExtension,
  profilePlan,
  runBillingCancellations,
  STRIPE_API_VERSION,
  settleBillingCancellation,
  verifiedPlusState,
  verifyStripeSignature,
} from '../src/billing.js'
import {
  billingCancellations,
  billingCustomers,
  billingEvents,
  billingSubscriptions,
} from '../src/billing-schema.js'
import type { IdentityMailMessage } from '../src/identity-mail.js'
import * as identity from '../src/identity-schema.js'

type App = Awaited<ReturnType<typeof createApp>>
interface StripeCall {
  readonly method: string
  readonly path: string
  readonly form: URLSearchParams
  readonly headers: Headers
}
type StripeSubscription = {
  id: string
  object: 'subscription'
  customer: string
  status: string
  cancel_at_period_end: boolean
  cancel_at: number | null
  canceled_at: number | null
  items: {
    object: 'list'
    data: {
      id: string
      current_period_end: number
      price: { id: string; recurring: { interval: string } }
    }[]
  }
}

const baseURL = 'https://identity.lilleri.example'
const host = new URL(baseURL).host
const termsVersion = 'beta-terms-reviewed-fixture-v1'
const password = 'Synthetic billing password 41!'
const secretKey = 'sk_test_SyntheticBillingKey0000000000'
const webhookSecret = `whsec_${randomBytes(24).toString('hex')}`
const prices = { month: 'price_PlusMonthlySynthetic', year: 'price_PlusYearlySynthetic' }
const DAY = 24 * 60 * 60
let clock = '2026-10-05T10:00:00.000Z'
const now = () => clock
const seconds = () => Math.floor(Date.parse(clock) / 1000)
const logs: BillingLogEntry[] = []
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const hex = () => randomUUID().replaceAll('-', '')

/** In-memory Stripe REST emulation; it records requests so tests can assert the wire format. */
class FakeStripe {
  readonly calls: StripeCall[] = []
  readonly customers = new Map<string, { id: string; email: string }>()
  readonly subscriptions = new Map<string, StripeSubscription>()
  outage = false
  failNext = 0
  yearInterval = 'year'
  readonly fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    this.calls.push({
      method,
      path: `${url.pathname}${url.search}`,
      form: new URLSearchParams(typeof init?.body === 'string' ? init.body : ''),
      headers: new Headers(init?.headers),
    })
    if (this.outage) throw new TypeError('Synthetic network failure')
    if (this.failNext > 0) {
      this.failNext--
      return json(503, { error: { message: 'Synthetic outage mentioning cus_private' } })
    }
    const path = url.pathname
    if (method === 'GET' && path.startsWith('/v1/prices/')) {
      const id = path.slice('/v1/prices/'.length)
      const interval = id === prices.year ? this.yearInterval : 'month'
      if (id !== prices.month && id !== prices.year) return json(404, {})
      return json(200, {
        id,
        object: 'price',
        active: true,
        currency: 'eur',
        unit_amount: id === prices.year ? 6999 : 699,
        type: 'recurring',
        recurring: { interval, interval_count: 1 },
        tax_behavior: 'inclusive',
      })
    }
    if (method === 'POST' && path === '/v1/customers') {
      const key = new Headers(init?.headers).get('idempotency-key') ?? hex()
      const existing = this.customers.get(key)
      if (existing) return json(200, { object: 'customer', ...existing })
      const customer = {
        id: `cus_${hex()}`,
        email: new URLSearchParams(String(init?.body)).get('email') ?? '',
      }
      this.customers.set(key, customer)
      return json(200, { object: 'customer', ...customer })
    }
    if (method === 'POST' && path === '/v1/checkout/sessions')
      return json(200, {
        id: `cs_test_${hex()}`,
        object: 'checkout.session',
        url: `https://checkout.stripe.com/c/pay/cs_test_${hex()}`,
      })
    if (method === 'POST' && path === '/v1/billing_portal/sessions')
      return json(200, {
        id: `bps_${hex()}`,
        object: 'billing_portal.session',
        url: `https://billing.stripe.com/p/session/test_${hex()}`,
      })
    if (method === 'GET' && path === '/v1/subscriptions') {
      const customer = url.searchParams.get('customer')
      return json(200, {
        object: 'list',
        has_more: false,
        data: [...this.subscriptions.values()].filter((item) => item.customer === customer),
      })
    }
    const match = /^\/v1\/subscriptions\/(sub_[A-Za-z0-9]+)$/.exec(path)
    const subscription = match?.[1] ? this.subscriptions.get(match[1]) : undefined
    if (!subscription) return json(404, { error: { type: 'invalid_request_error' } })
    if (method === 'GET') return json(200, subscription)
    if (method === 'DELETE') {
      if (subscription.status === 'canceled')
        return json(400, { error: { type: 'invalid_request_error' } })
      subscription.status = 'canceled'
      subscription.canceled_at = seconds()
      return json(200, subscription)
    }
    return json(404, {})
  }
  subscription(
    customer: string,
    status: string,
    options: { price?: string; periodEnd?: number; interval?: string } = {},
  ) {
    const id = `sub_${hex()}`
    const value: StripeSubscription = {
      id,
      object: 'subscription',
      customer,
      status,
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      items: {
        object: 'list',
        data: [
          {
            id: `si_${hex()}`,
            current_period_end: options.periodEnd ?? seconds() + 30 * DAY,
            price: {
              id: options.price ?? prices.month,
              recurring: { interval: options.interval ?? 'month' },
            },
          },
        ],
      },
    }
    this.subscriptions.set(id, value)
    return value
  }
  count(method: string, prefix: string) {
    return this.calls.filter((call) => call.method === method && call.path.startsWith(prefix))
      .length
  }
}

let handle: DatabaseHandle
const apps: App[] = []
const users: string[] = []
const profiles: string[] = []
const events: string[] = []
const verifications: IdentityMailMessage[] = []
const hostedIdentity = {
  baseURL,
  secret: randomBytes(48).toString('hex'),
  termsVersion,
  delivery: {
    sendVerification: async (message: IdentityMailMessage) => {
      verifications.push(message)
    },
    sendPasswordReset: async () => {},
  },
}
const configurationFor = (
  stripe: FakeStripe,
  extra: Partial<BillingConfiguration> = {},
): BillingConfiguration => ({
  secretKey,
  webhookSecret,
  prices,
  baseURL,
  fetch: stripe.fetch,
  now,
  log: (entry) => logs.push(entry),
  ...extra,
})
// Every app shares one identity secret, so a session works against each billing variant.
const appFor = async (
  billing: BillingConfiguration | null,
  options: BillingExtensionOptions = {},
) => {
  const app = await createApp({
    db: handle.db,
    demoMode: false,
    environment: 'production',
    financialScope: handle.withProfile,
    hostedIdentity,
    extensions: [createBillingExtension(billing, options)],
  })
  apps.push(app)
  return app
}
const headers = (cookie = '') => ({ origin: baseURL, host, ...(cookie ? { cookie } : {}) })
const cookieOf = (response: { headers: Record<string, unknown> }) => {
  const cookie = response.headers['set-cookie']
  return (Array.isArray(cookie) ? cookie : typeof cookie === 'string' ? [cookie] : [])
    .map((value) => String(value).split(';')[0])
    .join('; ')
}
const person = async (app: App) => {
  const email = `billing-${randomUUID()}@example.invalid`
  const signup = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: headers(),
    payload: { name: 'Persona sintetica', email, password, adultAttested: true, termsVersion },
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
  const verified = await app.inject({ url: `${link.pathname}${link.search}`, headers: headers() })
  expect(verified.statusCode, verified.payload).toBe(200)
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: headers(),
    payload: { email, password },
  })
  expect(login.statusCode, login.payload).toBe(200)
  return { userId, email, profileId: membership.profileId, cookie: cookieOf(login) }
}
const stripeEvent = (type: string, object: object, created = seconds()) => {
  const id = `evt_${hex()}`
  events.push(id)
  return { id, object: 'event', type, created, livemode: false, data: { object } }
}
const sign = (payload: string, timestamp = seconds(), secret = webhookSecret) =>
  createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
const deliver = (app: App, event: object | string, signature?: string) => {
  const payload = typeof event === 'string' ? event : JSON.stringify(event)
  return app.inject({
    method: 'POST',
    url: '/webhooks/stripe',
    headers: {
      host,
      'content-type': 'application/json',
      'stripe-signature': signature ?? `t=${seconds()},v1=${sign(payload)}`,
    },
    payload,
  })
}
const billing = async (app: App, cookie: string) => {
  const response = await app.inject({ url: '/v1/billing', headers: headers(cookie) })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
}
const post = (app: App, url: string, cookie: string, payload: object = {}) =>
  app.inject({ method: 'POST', url, headers: headers(cookie), payload })
const storedEvent = async (id: string) =>
  handle.db.select().from(billingEvents).where(eq(billingEvents.id, id))
const syntheticProfile = async () => {
  const id = `billing_profile_${hex()}`
  await handle.db
    .insert(schema.profiles)
    .values({ id, name: 'Profilo sintetico', timezone: 'Europe/Rome', createdAt: clock })
  profiles.push(id)
  return id
}
const storedSubscription = async (
  profileId: string,
  values: Partial<typeof billingSubscriptions.$inferInsert> = {},
) => {
  const customer = `cus_${hex()}`
  await handle.db
    .insert(billingCustomers)
    .values({ profileId, stripeCustomerId: customer, createdAt: clock })
  const row = {
    id: `sub_${hex()}`,
    profileId,
    stripeCustomerId: customer,
    status: 'active' as const,
    priceId: prices.month,
    interval: 'month' as const,
    currentPeriodEnd: new Date(Date.parse(clock) + 30 * DAY * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeCreated: seconds(),
    updatedAt: clock,
    ...values,
  }
  await handle.db.insert(billingSubscriptions).values(row)
  return row
}

beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  if (!handle) return
  for (const id of users) await handle.db.delete(identity.user).where(eq(identity.user.id, id))
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  if (profiles.length)
    await handle.db
      .delete(billingCancellations)
      .where(inArray(billingCancellations.profileId, profiles))
  if (events.length) await handle.db.delete(billingEvents).where(inArray(billingEvents.id, events))
  await handle.close()
})

describe('billing migration and configuration', () => {
  test('migration creates RLS-forced billing tables with read-only runtime grants', async () => {
    const tables = (
      (await handle.db.execute(
        sql`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('billing_customers','billing_subscriptions','billing_events') ORDER BY relname`,
      )) as unknown as { rows: { relname: string }[] }
    ).rows
    expect(tables).toEqual(
      ['billing_customers', 'billing_events', 'billing_subscriptions'].map((relname) => ({
        relname,
        relrowsecurity: true,
        relforcerowsecurity: true,
      })),
    )
    const privileges = (
      (await handle.db.execute(sql`SELECT
        has_table_privilege('lilleri_runtime','billing_customers','SELECT') AS customers_read,
        has_table_privilege('lilleri_runtime','billing_customers','INSERT') AS customers_insert,
        has_table_privilege('lilleri_runtime','billing_subscriptions','SELECT') AS subscriptions_read,
        has_table_privilege('lilleri_runtime','billing_subscriptions','UPDATE') AS subscriptions_update,
        has_table_privilege('lilleri_runtime','billing_events','SELECT') AS events_read,
        has_table_privilege('lilleri_runtime','billing_events','INSERT') AS events_insert`)) as unknown as {
        rows: Record<string, boolean>[]
      }
    ).rows[0]
    expect(privileges).toEqual({
      customers_read: true,
      customers_insert: false,
      subscriptions_read: true,
      subscriptions_update: false,
      events_read: false,
      events_insert: false,
    })
    const applied = (
      (await handle.db.execute(
        sql`SELECT name FROM schema_migrations WHERE name='0041_billing.sql'`,
      )) as unknown as { rows: unknown[] }
    ).rows
    expect(applied).toHaveLength(1)
  })
  test('environment configuration is all-or-nothing and errors never echo values', () => {
    const valid = {
      STRIPE_SECRET_KEY: secretKey,
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      STRIPE_PRICE_MONTHLY: prices.month,
      STRIPE_PRICE_YEARLY: prices.year,
      PUBLIC_BASE_URL: baseURL,
    }
    expect(billingConfigurationFromEnvironment({})).toBeNull()
    expect(billingConfigurationFromEnvironment({ PUBLIC_BASE_URL: baseURL })).toBeNull()
    expect(billingConfigurationFromEnvironment(valid)).toEqual({
      secretKey,
      webhookSecret,
      prices,
      baseURL,
    })
    expect(
      billingConfigurationFromEnvironment({
        ...valid,
        STRIPE_SECRET_KEY: 'rk_live_SyntheticRestrictedKey000000',
        STRIPE_TAX_RATE: 'txr_SyntheticIva22',
      }),
    ).toMatchObject({ taxRate: 'txr_SyntheticIva22' })
    for (const broken of [
      { STRIPE_SECRET_KEY: secretKey },
      { ...valid, PUBLIC_BASE_URL: undefined },
      { ...valid, STRIPE_SECRET_KEY: 'pk_test_SyntheticPublishable00000000' },
      { ...valid, STRIPE_WEBHOOK_SECRET: 'secret_without_prefix_000000' },
      { ...valid, STRIPE_PRICE_YEARLY: prices.month },
      { ...valid, STRIPE_PRICE_MONTHLY: 'prod_NotAPrice' },
      { ...valid, STRIPE_TAX_RATE: 'tax_22' },
      { ...valid, PUBLIC_BASE_URL: 'http://identity.lilleri.example' },
      { ...valid, PUBLIC_BASE_URL: `${baseURL}/app` },
    ]) {
      let message = ''
      try {
        billingConfigurationFromEnvironment(broken)
      } catch (error) {
        message = (error as Error).message
      }
      expect(message).toBe('Stripe billing configuration is incomplete or invalid')
    }
    expect(() =>
      createBillingExtension({ ...configurationFor(new FakeStripe()), secretKey: 'sk_x' }),
    ).toThrow(/invalid/)
  })
  test('the Checkout notice asks for immediate start and keeps statutory withdrawal wording', () => {
    expect(CHECKOUT_WITHDRAWAL_NOTICE.length).toBeLessThanOrEqual(1000)
    for (const phrase of [
      'chiedi espressamente',
      'inizi subito',
      '14 giorni',
      'importo proporzionale',
      'interamente fornito',
      'Codice del Consumo',
      'in qualsiasi momento',
      'fine del periodo già pagato',
    ])
      expect(CHECKOUT_WITHDRAWAL_NOTICE).toContain(phrase)
  })
  test('webhook signatures need a fresh timestamp, the exact body and one matching v1', () => {
    const body = Buffer.from('{"id":"evt_Synthetic"}')
    const at = seconds()
    const good = sign(body.toString(), at)
    const verify = (header: string | undefined, payload = body, time = at) =>
      verifyStripeSignature(payload, header, webhookSecret, time)
    expect(verify(`t=${at},v1=${good}`)).toBe(true)
    expect(verify(`t=${at},v1=${'0'.repeat(64)},v0=${good},v1=${good}`)).toBe(true)
    expect(verify(`t=${at},v1=${sign(body.toString(), at, `whsec_${'1'.repeat(32)}`)}`)).toBe(false)
    expect(verify(`t=${at},v1=${good}`, Buffer.from('{"id":"evt_Tampered"}'))).toBe(false)
    expect(verify(`t=${at},v1=${good}`, body, at + 301)).toBe(false)
    expect(verify(`t=${at},v1=${good}`, body, at - 301)).toBe(false)
    expect(verify(`t=${at},v1=${good}`, body, at + 300)).toBe(true)
    expect(verify(`t=${at},t=${at},v1=${good}`)).toBe(false)
    expect(verify(`v1=${good}`)).toBe(false)
    expect(verify(`t=${at},v0=${good}`)).toBe(false)
    expect(verify(`t=${at},v1=${good.toUpperCase()}`)).toBe(false)
    expect(verify(undefined)).toBe(false)
  })
})

describe('hosted Stripe billing routes', () => {
  const stripe = new FakeStripe()
  let app: App
  let owner: Awaited<ReturnType<typeof person>>
  let editor: Awaited<ReturnType<typeof person>>
  let other: Awaited<ReturnType<typeof person>>
  let customerId = ''
  let subscriptionId = ''
  beforeAll(async () => {
    app = await appFor(configurationFor(stripe))
    owner = await person(app)
    editor = await person(app)
    other = await person(app)
    await handle.db
      .update(identity.memberships)
      .set({ role: 'editor' })
      .where(eq(identity.memberships.userId, editor.userId))
  })

  test('a new profile is Gratis and sees cached Stripe prices with IVA included', async () => {
    expect(await billing(app, owner.cookie)).toEqual({
      plan: 'gratis',
      status: null,
      interval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      purchaseAvailable: true,
      prices: {
        month: { amount: '6.99', currency: 'EUR' },
        year: { amount: '69.99', currency: 'EUR' },
      },
    })
    expect((await billing(app, editor.cookie)).purchaseAvailable).toBe(false)
    clock = '2026-10-05T10:30:00.000Z'
    await billing(app, owner.cookie)
    expect(stripe.count('GET', '/v1/prices/')).toBe(2)
    for (const call of stripe.calls) {
      expect(call.headers.get('authorization')).toBe(`Bearer ${secretKey}`)
      expect(call.headers.get('stripe-version')).toBe(STRIPE_API_VERSION)
    }
    clock = '2026-10-05T11:00:01.000Z'
    await billing(app, owner.cookie)
    expect(stripe.count('GET', '/v1/prices/')).toBe(4)
  })

  test('only the owner can start Checkout; the Stripe customer is created once', async () => {
    const editorAttempt = await post(app, '/v1/billing/checkout', editor.cookie, {
      interval: 'month',
    })
    expect(editorAttempt.statusCode).toBe(403)
    expect(editorAttempt.json().code).toBe('owner_required')
    expect(
      (await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'week' })).statusCode,
    ).toBe(400)
    expect(stripe.count('POST', '/v1/')).toBe(0)

    const first = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'year' })
    expect(first.statusCode, first.payload).toBe(200)
    expect(Object.keys(first.json())).toEqual(['url'])
    expect(first.json().url).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/)
    const customerCall = stripe.calls.find((call) => call.path === '/v1/customers')
    expect(customerCall?.headers.get('idempotency-key')).toBe(
      `lilleri-customer-v1-${createHash('sha256').update(owner.profileId).digest('hex')}`,
    )
    expect(customerCall?.headers.get('content-type')).toBe('application/x-www-form-urlencoded')
    expect(Object.fromEntries(customerCall?.form ?? [])).toEqual({
      email: owner.email,
      'metadata[profile_id]': owner.profileId,
      'preferred_locales[0]': 'it',
    })
    const [mapping] = await handle.db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.profileId, owner.profileId))
    customerId = mapping?.stripeCustomerId ?? ''
    expect(customerId).toMatch(/^cus_/)
    const session = stripe.calls.find((call) => call.path === '/v1/checkout/sessions')
    expect(Object.fromEntries(session?.form ?? [])).toEqual({
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': prices.year,
      'line_items[0][quantity]': '1',
      client_reference_id: owner.profileId,
      'metadata[profile_id]': owner.profileId,
      'subscription_data[metadata][profile_id]': owner.profileId,
      success_url: `${baseURL}/?billing=success`,
      cancel_url: `${baseURL}/?billing=cancelled`,
      locale: 'it',
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      'customer_update[address]': 'auto',
      'custom_text[submit][message]': CHECKOUT_WITHDRAWAL_NOTICE,
    })

    const second = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'month' })
    expect(second.statusCode, second.payload).toBe(200)
    expect(stripe.count('POST', '/v1/customers')).toBe(1)
    expect(stripe.calls.at(-1)?.form.get('line_items[0][price]')).toBe(prices.month)
    expect(stripe.calls.at(-1)?.form.get('customer')).toBe(customerId)
  })

  test('Stripe failures during Checkout become a content-free 502', async () => {
    stripe.failNext = 1
    const failed = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'month' })
    expect(failed.statusCode).toBe(502)
    expect(failed.json().code).toBe('billing_unavailable')
    expect(failed.payload).not.toContain('cus_')
  })

  test('the portal needs an owner with a Stripe customer', async () => {
    expect((await post(app, '/v1/billing/portal', editor.cookie)).statusCode).toBe(403)
    const none = await post(app, '/v1/billing/portal', other.cookie)
    expect(none.statusCode).toBe(409)
    expect(none.json().code).toBe('no_billing_account')
    const portal = await post(app, '/v1/billing/portal', owner.cookie)
    expect(portal.statusCode, portal.payload).toBe(200)
    expect(portal.json().url).toMatch(/^https:\/\/billing\.stripe\.com\/p\/session\//)
    expect(Object.fromEntries(stripe.calls.at(-1)?.form ?? [])).toEqual({
      customer: customerId,
      return_url: `${baseURL}/?billing=portal`,
      locale: 'it',
    })
  })

  test('webhooks reject invalid, expired, tampered and unsigned deliveries without detail', async () => {
    const subscription = stripe.subscription(customerId, 'active', {
      price: prices.year,
      interval: 'year',
      periodEnd: seconds() + 365 * DAY,
    })
    subscriptionId = subscription.id
    const event = stripeEvent('customer.subscription.created', subscription)
    const payload = JSON.stringify(event)
    const rejected = [
      await deliver(app, event, `t=${seconds()},v1=${'0'.repeat(64)}`),
      await deliver(app, event, `t=${seconds() - 301},v1=${sign(payload, seconds() - 301)}`),
      await deliver(
        app,
        payload.replace('"active"', '"canceled"'),
        `t=${seconds()},v1=${sign(payload)}`,
      ),
      await deliver(app, event, ''),
      await deliver(app, 'not json', `t=${seconds()},v1=${sign('not json')}`),
    ]
    for (const response of rejected) {
      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({ code: 'invalid_request' })
      expect(response.payload).not.toContain('evt_')
    }
    expect(await storedEvent(event.id)).toEqual([])
    expect(await billing(app, owner.cookie)).toMatchObject({ plan: 'gratis' })
  })

  test('checkout completion for a different profile reference is ignored', async () => {
    const before = stripe.count('GET', '/v1/subscriptions/')
    const forged = stripeEvent('checkout.session.completed', {
      id: `cs_test_${hex()}`,
      object: 'checkout.session',
      mode: 'subscription',
      customer: customerId,
      subscription: subscriptionId,
      client_reference_id: other.profileId,
      metadata: { profile_id: other.profileId },
    })
    const response = await deliver(app, forged)
    expect(response.statusCode, response.payload).toBe(200)
    expect(stripe.count('GET', '/v1/subscriptions/')).toBe(before)
    expect(await billing(app, owner.cookie)).toMatchObject({ plan: 'gratis' })
    expect(await billing(app, other.cookie)).toMatchObject({ plan: 'gratis' })
    expect(logs.at(-1)).toEqual({
      event: 'billing_webhook_ignored',
      reason: 'reference_mismatch',
      count: 1,
    })
  })

  test('a verified checkout completion re-reads the subscription and grants Plus once', async () => {
    const completed = stripeEvent('checkout.session.completed', {
      id: `cs_test_${hex()}`,
      object: 'checkout.session',
      mode: 'subscription',
      customer: customerId,
      subscription: subscriptionId,
      client_reference_id: owner.profileId,
    })
    const response = await deliver(app, completed)
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json()).toEqual({ received: true })
    expect(await storedEvent(completed.id)).toHaveLength(1)
    const plan = await billing(app, owner.cookie)
    expect(plan).toMatchObject({
      plan: 'plus',
      status: 'active',
      interval: 'year',
      cancelAtPeriodEnd: false,
      purchaseAvailable: false,
    })
    expect(plan.currentPeriodEnd).toBe(new Date((seconds() + 365 * DAY) * 1000).toISOString())
    const fetched = stripe.count('GET', '/v1/subscriptions/')
    const replay = await deliver(app, completed)
    expect(replay.statusCode).toBe(200)
    expect(stripe.count('GET', '/v1/subscriptions/')).toBe(fetched)
    const again = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'month' })
    expect(again.statusCode).toBe(409)
    expect(again.json().code).toBe('already_subscribed')
  })

  test('transient Stripe errors return 500 without recording the event', async () => {
    const paid = stripeEvent('invoice.paid', {
      id: `in_${hex()}`,
      object: 'invoice',
      customer: customerId,
      parent: {
        type: 'subscription_details',
        subscription_details: { subscription: subscriptionId },
      },
    })
    stripe.failNext = 1
    const failed = await deliver(app, paid)
    expect(failed.statusCode).toBe(500)
    expect(failed.payload).not.toContain('cus_')
    expect(await storedEvent(paid.id)).toEqual([])
    const retried = await deliver(app, paid)
    expect(retried.statusCode, retried.payload).toBe(200)
    expect(await storedEvent(paid.id)).toHaveLength(1)
  })

  test('out-of-order events resolve to the newest Stripe state', async () => {
    const created = seconds()
    const subscription = stripe.subscriptions.get(subscriptionId)
    if (!subscription) throw new Error('Missing fake subscription')
    subscription.status = 'canceled'
    subscription.canceled_at = created
    const deleted = stripeEvent('customer.subscription.deleted', { ...subscription }, created + 20)
    expect((await deliver(app, deleted)).statusCode).toBe(200)
    expect(await billing(app, owner.cookie)).toMatchObject({
      plan: 'gratis',
      status: 'canceled',
      cancelAtPeriodEnd: false,
    })
    // A late, older event whose re-read raced with the cancellation cannot resurrect Plus.
    subscription.status = 'active'
    const stale = stripeEvent(
      'customer.subscription.updated',
      { ...subscription, status: 'active' },
      created + 10,
    )
    expect((await deliver(app, stale)).statusCode).toBe(200)
    const [row] = await handle.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.id, subscriptionId))
    expect(row).toMatchObject({ status: 'canceled', stripeCreated: created + 20 })
    expect(await billing(app, owner.cookie)).toMatchObject({ plan: 'gratis' })
    // The newest event re-reads Stripe and applies whatever is current.
    const resumed = stripeEvent(
      'customer.subscription.resumed',
      { id: subscriptionId },
      created + 30,
    )
    expect((await deliver(app, resumed)).statusCode).toBe(200)
    expect(await billing(app, owner.cookie)).toMatchObject({ plan: 'plus', status: 'active' })
  })

  test('unknown customers, foreign subscriptions and other event types are acknowledged', async () => {
    const foreign = stripe.subscription(`cus_${hex()}`, 'active')
    const ignored = [
      stripeEvent('customer.subscription.updated', foreign),
      stripeEvent('customer.subscription.updated', { id: `sub_${hex()}` }),
      stripeEvent('invoice.payment_failed', { id: `in_${hex()}`, parent: null }),
      stripeEvent('charge.succeeded', { id: `ch_${hex()}` }),
    ]
    for (const event of ignored) {
      const response = await deliver(app, event)
      expect(response.statusCode, response.payload).toBe(200)
      expect(await storedEvent(event.id)).toHaveLength(1)
    }
    expect(logs.slice(-4).map((entry) => entry.reason)).toEqual([
      'unknown_customer',
      'unknown_subscription',
      'not_subscription',
      'unhandled_type',
    ])
    const text = JSON.stringify(logs)
    for (const secret of ['cus_', 'sub_', 'evt_', '@', owner.profileId])
      expect(text).not.toContain(secret)
    expect(
      await handle.db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.id, foreign.id)),
    ).toEqual([])
  })

  test('past_due keeps Plus during the grace; canceled and expired periods return to Gratis', async () => {
    const subscription = stripe.subscriptions.get(subscriptionId)
    if (!subscription) throw new Error('Missing fake subscription')
    const periodEnd = seconds() + DAY
    subscription.status = 'past_due'
    subscription.cancel_at_period_end = true
    subscription.items.data[0] = {
      id: `si_${hex()}`,
      current_period_end: periodEnd,
      price: { id: prices.month, recurring: { interval: 'month' } },
    }
    expect(
      (
        await deliver(
          app,
          stripeEvent('invoice.payment_failed', { subscription: subscriptionId }, seconds() + 40),
        )
      ).statusCode,
    ).toBe(200)
    const pastDue = await billing(app, owner.cookie)
    expect(pastDue).toMatchObject({
      plan: 'plus',
      status: 'past_due',
      interval: 'month',
      cancelAtPeriodEnd: true,
    })
    clock = new Date((periodEnd + 3 * DAY - 60) * 1000).toISOString()
    expect(await billing(app, owner.cookie)).toMatchObject({ plan: 'plus' })
    clock = new Date((periodEnd + 3 * DAY + 1) * 1000).toISOString()
    expect(await billing(app, owner.cookie)).toMatchObject({
      plan: 'gratis',
      status: 'past_due',
      purchaseAvailable: false,
    })
    const blocked = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'month' })
    expect(blocked.statusCode).toBe(409)
    expect(blocked.json().code).toBe('subscription_pending')
  })

  test('profile deletion cancels stored and in-flight Stripe subscriptions idempotently', async () => {
    const inFlight = stripe.subscription(customerId, 'trialing')
    const before = stripe.count('DELETE', '/v1/subscriptions/')
    const configuration = configurationFor(stripe)
    expect(await cancelBillingForProfile(configuration, handle.db, owner.profileId)).toEqual({
      canceled: 2,
    })
    expect(stripe.count('DELETE', '/v1/subscriptions/')).toBe(before + 2)
    const rows = await handle.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.profileId, owner.profileId))
    expect(new Set(rows.map((row) => row.id))).toEqual(new Set([subscriptionId, inFlight.id]))
    expect(rows.every((row) => row.status === 'canceled')).toBe(true)
    expect(await billing(app, owner.cookie)).toMatchObject({ plan: 'gratis', status: 'canceled' })
    expect(await cancelBillingForProfile(configuration, handle.db, owner.profileId)).toEqual({
      canceled: 0,
    })
    expect(stripe.count('DELETE', '/v1/subscriptions/')).toBe(before + 2)
    // A local row that Stripe already ended (missed webhook) is confirmed, not retried forever.
    await handle.db
      .update(billingSubscriptions)
      .set({ status: 'active' })
      .where(eq(billingSubscriptions.id, inFlight.id))
    expect(await cancelBillingForProfile(configuration, handle.db, owner.profileId)).toEqual({
      canceled: 1,
    })
    expect(
      (
        await handle.db
          .select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.id, inFlight.id))
      )[0]?.status,
    ).toBe('canceled')
    stripe.outage = true
    await handle.db
      .update(billingSubscriptions)
      .set({ status: 'active' })
      .where(eq(billingSubscriptions.id, inFlight.id))
    await expect(
      cancelBillingForProfile(configuration, handle.db, owner.profileId),
    ).rejects.toMatchObject({ name: 'StripeRequestError', transient: true })
    stripe.outage = false
  })
})

describe('billing availability and isolation', () => {
  test('without configuration or Stripe, the plan is still readable and purchase is off', async () => {
    const offline = new FakeStripe()
    offline.outage = true
    const mismatched = new FakeStripe()
    mismatched.yearInterval = 'month'
    const disabled = await appFor(null)
    const unreachable = await appFor(configurationFor(offline))
    const inconsistent = await appFor(configurationFor(mismatched))
    const newcomer = await person(disabled)
    const gratis = {
      plan: 'gratis',
      status: null,
      interval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      purchaseAvailable: false,
    }
    expect(await billing(disabled, newcomer.cookie)).toEqual({
      ...gratis,
      prices: { month: null, year: null },
    })
    expect(await billing(unreachable, newcomer.cookie)).toEqual({
      ...gratis,
      prices: { month: null, year: null },
    })
    expect(await billing(inconsistent, newcomer.cookie)).toEqual({
      ...gratis,
      prices: { month: { amount: '6.99', currency: 'EUR' }, year: null },
    })
    const checkout = await post(disabled, '/v1/billing/checkout', newcomer.cookie, {
      interval: 'month',
    })
    expect(checkout.statusCode).toBe(409)
    expect(checkout.json().code).toBe('billing_not_configured')
    const event = stripeEvent('invoice.paid', { subscription: `sub_${hex()}` })
    expect((await deliver(disabled, event)).statusCode).toBe(404)
    expect(
      (await disabled.inject({ url: '/v1/billing', headers: { origin: baseURL, host } }))
        .statusCode,
    ).toBe(401)
  })

  test('plan rules: configured price, entitled status and period plus a three-day grace', async () => {
    const profileId = await syntheticProfile()
    const row = await storedSubscription(profileId, { cancelAtPeriodEnd: true })
    const plan = await profilePlan(handle.db, profileId, clock)
    expect(plan).toEqual({
      plan: 'plus',
      status: 'active',
      interval: 'month',
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: true,
    })
    expect(verifiedPlusState(plan)).toEqual({
      status: 'cancelled',
      validUntil: new Date(Date.parse(row.currentPeriodEnd) + 3 * DAY * 1000).toISOString(),
    })
    expect(
      resolveEntitlements({ mode: 'commercial', now: clock, verifiedPlus: verifiedPlusState(plan) })
        .plan,
    ).toBe('plus')
    const later = new Date(Date.parse(row.currentPeriodEnd) + 3 * DAY * 1000).toISOString()
    expect((await profilePlan(handle.db, profileId, later)).plan).toBe('gratis')
    for (const values of [
      { interval: null, priceId: 'price_UnknownLegacy' },
      { status: 'unpaid' as const },
      { status: 'paused' as const },
      { status: 'incomplete' as const },
    ]) {
      await handle.db
        .update(billingSubscriptions)
        .set({ status: 'active', interval: 'month', priceId: prices.month, ...values })
        .where(eq(billingSubscriptions.id, row.id))
      const current = await profilePlan(handle.db, profileId, clock)
      expect(current.plan).toBe('gratis')
      expect(verifiedPlusState(current)).toBeUndefined()
      expect(
        resolveEntitlements({
          mode: 'commercial',
          now: clock,
          verifiedPlus: verifiedPlusState(current),
        }).plan,
      ).toBe('gratis')
    }
    await handle.db
      .update(billingSubscriptions)
      .set({ status: 'trialing', interval: 'year', priceId: prices.year })
      .where(eq(billingSubscriptions.id, row.id))
    expect(await profilePlan(handle.db, profileId, clock)).toMatchObject({
      plan: 'plus',
      status: 'trialing',
    })
  })

  test('a runtime-scoped profile reads only its own billing rows and cannot write any', async () => {
    const first = await syntheticProfile(),
      second = await syntheticProfile()
    const own = await storedSubscription(first)
    const foreign = await storedSubscription(second)
    await handle.withProfile(first, async (db) => {
      expect((await db.select().from(billingSubscriptions)).map((row) => row.id)).toEqual([own.id])
      expect((await db.select().from(billingCustomers)).map((row) => row.profileId)).toEqual([
        first,
      ])
      expect(await profilePlan(db, first, clock)).toMatchObject({ plan: 'plus' })
      expect(await profilePlan(db, second, clock)).toMatchObject({ plan: 'gratis', status: null })
      await expect(
        db.transaction((tx) =>
          tx
            .update(billingSubscriptions)
            .set({ status: 'canceled' })
            .where(eq(billingSubscriptions.id, own.id)),
        ),
      ).rejects.toThrow()
      await expect(
        db.transaction((tx) =>
          tx
            .insert(billingSubscriptions)
            .values({ ...foreign, id: `sub_${hex()}`, profileId: first }),
        ),
      ).rejects.toThrow()
      await expect(
        db.transaction((tx) =>
          tx
            .insert(billingCustomers)
            .values({ profileId: first, stripeCustomerId: `cus_${hex()}`, createdAt: clock }),
        ),
      ).rejects.toThrow()
      await expect(db.transaction((tx) => tx.select().from(billingEvents))).rejects.toThrow()
    })
    expect(
      (
        await handle.db
          .select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.id, own.id))
      )[0]?.status,
    ).toBe('active')
    // A subscription can only belong to the profile that owns its Stripe customer.
    await expect(
      handle.db.transaction((tx) =>
        tx
          .insert(billingSubscriptions)
          .values({ ...foreign, id: `sub_${hex()}`, profileId: first }),
      ),
    ).rejects.toThrow()
    // Deleting the profile removes its billing mapping and state.
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, second))
    expect(
      await handle.db.select().from(billingCustomers).where(eq(billingCustomers.profileId, second)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.profileId, second)),
    ).toEqual([])
  })
})

describe('Plus purchase gate and deletion cancellations', () => {
  test('Plus is not sold while its benefit cannot be delivered; Stripe is never called', async () => {
    const stripe = new FakeStripe()
    let open = false
    const app = await appFor(configurationFor(stripe), { purchaseGate: async () => open })
    const owner = await person(app)
    expect((await billing(app, owner.cookie)).purchaseAvailable).toBe(false)
    const refused = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'month' })
    expect(refused.statusCode).toBe(409)
    expect(refused.json().code).toBe('plus_unavailable')
    expect(stripe.count('POST', '/v1/')).toBe(0)
    open = true
    expect((await billing(app, owner.cookie)).purchaseAvailable).toBe(true)
    const accepted = await post(app, '/v1/billing/checkout', owner.cookie, { interval: 'month' })
    expect(accepted.statusCode, accepted.payload).toBe(200)
  })

  test('the cancellation queue is trusted-only and forced under row-level security', async () => {
    const [table] = (
      (await handle.db.execute(
        sql`SELECT relrowsecurity, relforcerowsecurity,
        has_table_privilege('lilleri_runtime','billing_cancellations','SELECT') AS runtime_read,
        has_table_privilege('lilleri_runtime','billing_cancellations','INSERT') AS runtime_insert
        FROM pg_class WHERE relname='billing_cancellations'`,
      )) as unknown as { rows: Record<string, boolean>[] }
    ).rows
    expect(table).toEqual({
      relrowsecurity: true,
      relforcerowsecurity: true,
      runtime_read: false,
      runtime_insert: false,
    })
  })

  test('a deleted profile is never charged again, even when Stripe is down at deletion', async () => {
    const stripe = new FakeStripe()
    const deferred: BillingLogEntry[] = []
    const configuration = configurationFor(stripe, { log: (entry) => deferred.push(entry) })
    const profileId = await syntheticProfile()
    expect(await armBillingCancellation(handle.db, profileId, clock)).toBe(false)
    const row = await storedSubscription(profileId)
    const stored = stripe.subscription(row.stripeCustomerId, 'active')
    stripe.subscriptions.delete(stored.id)
    stripe.subscriptions.set(row.id, { ...stored, id: row.id })
    // Created by a checkout whose webhook has not arrived yet: known only to Stripe.
    const inFlight = stripe.subscription(row.stripeCustomerId, 'trialing')
    expect(await armBillingCancellation(handle.db, profileId, clock)).toBe(true)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    expect(
      await handle.db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.profileId, profileId)),
    ).toEqual([])

    stripe.outage = true
    expect(
      await settleBillingCancellation(configuration, handle.db, profileId, { discardKept: true }),
    ).toBe('deferred')
    expect(deferred).toEqual([
      { event: 'billing_cancellation_deferred', attempts: 1, transient: true },
    ])
    expect(JSON.stringify(deferred)).not.toContain(profileId)
    const [queued] = await handle.db
      .select()
      .from(billingCancellations)
      .where(eq(billingCancellations.profileId, profileId))
    expect(queued).toMatchObject({ attempts: 1, stripeCustomerId: row.stripeCustomerId })
    expect(queued?.subscriptionIds).toEqual([row.id])
    expect(Date.parse(queued?.nextAttemptAt ?? '')).toBeGreaterThan(Date.parse(clock))

    stripe.outage = false
    const runAt = (at: string) =>
      runBillingCancellations({ ...configuration, now: () => at }, handle.db)
    expect((await runAt(clock)).canceled).toBe(0)
    expect(await runAt(new Date(Date.parse(clock) + 2 * 60 * 1000).toISOString())).toMatchObject({
      canceled: 1,
      deferred: 0,
    })
    expect(stripe.subscriptions.get(row.id)?.status).toBe('canceled')
    expect(inFlight.status).toBe('canceled')
    expect(
      await handle.db
        .select()
        .from(billingCancellations)
        .where(eq(billingCancellations.profileId, profileId)),
    ).toEqual([])
    expect(await settleBillingCancellation(configuration, handle.db, profileId)).toBe('none')
  })

  test('an armed cancellation whose deletion never committed charges on as before', async () => {
    const stripe = new FakeStripe()
    const configuration = configurationFor(stripe)
    const profileId = await syntheticProfile()
    const row = await storedSubscription(profileId)
    stripe.subscriptions.set(row.id, {
      ...stripe.subscription(row.stripeCustomerId, 'active'),
      id: row.id,
    })
    const queued = async () =>
      handle.db
        .select()
        .from(billingCancellations)
        .where(eq(billingCancellations.profileId, profileId))
    // A pump run during the deletion request keeps the record until the grace has passed.
    expect(await armBillingCancellation(handle.db, profileId, clock)).toBe(true)
    expect(await runBillingCancellations(configuration, handle.db)).toMatchObject({
      profile_kept: 1,
      canceled: 0,
    })
    expect((await queued())[0]?.nextAttemptAt).toBe(
      new Date(Date.parse(clock) + BILLING_CANCELLATION_GRACE_MS).toISOString(),
    )
    const later = new Date(Date.parse(clock) + BILLING_CANCELLATION_GRACE_MS).toISOString()
    expect(
      await runBillingCancellations({ ...configuration, now: () => later }, handle.db),
    ).toMatchObject({ profile_kept: 1 })
    expect(await queued()).toEqual([])
    // The deletion request itself discards its record as soon as it finishes without erasing.
    expect(await armBillingCancellation(handle.db, profileId, clock)).toBe(true)
    expect(
      await settleBillingCancellation(configuration, handle.db, profileId, { discardKept: true }),
    ).toBe('profile_kept')
    expect(await queued()).toEqual([])
    expect(stripe.count('DELETE', '/v1/subscriptions/')).toBe(0)
    expect(stripe.subscriptions.get(row.id)?.status).toBe('active')
  })
})
