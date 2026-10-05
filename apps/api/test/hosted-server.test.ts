import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { billingConfigurationFromEnvironment, runBillingCancellations } from '../src/billing.js'
import {
  billingCancellations,
  billingCustomers,
  billingSubscriptions,
} from '../src/billing-schema.js'
import {
  HostedConfigurationError,
  hostedConfigurationFromEnvironment,
} from '../src/hosted-configuration.js'
import { createHostedServer, type HostedServer } from '../src/hosted-server.js'
import * as identity from '../src/identity-schema.js'
import { LEGAL_TERMS_VERSION } from '../src/legal-pages.js'

const origin = 'https://app.lilleri.example'
const host = new URL(origin).host
let root: string
let server: HostedServer
let database: DatabaseHandle
const mails: { to: string; text: string }[] = []
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
/** Minimal Stripe emulation: prices, subscription listing, reading and immediate cancellation. */
const stripe = { down: false, subscriptions: new Map<string, Record<string, unknown>>() }
const stripeSubscription = (id: string, customer: string) => ({
  id,
  object: 'subscription',
  customer,
  status: 'active',
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  items: {
    object: 'list',
    data: [
      {
        id: 'si_Hosted',
        current_period_end: 1_793_000_000,
        price: { id: 'price_HostedMonthly', recurring: { interval: 'month' } },
      },
    ],
  },
})
const stripeStub = (url: URL, method: string) => {
  if (stripe.down) throw new TypeError('Synthetic Stripe outage')
  if (method === 'GET' && url.pathname.startsWith('/v1/prices/')) {
    const id = url.pathname.slice('/v1/prices/'.length)
    const yearly = id === 'price_HostedYearly'
    return reply({
      id,
      object: 'price',
      active: true,
      currency: 'eur',
      unit_amount: yearly ? 6999 : 699,
      type: 'recurring',
      recurring: { interval: yearly ? 'year' : 'month', interval_count: 1 },
      tax_behavior: 'inclusive',
    })
  }
  if (method === 'GET' && url.pathname === '/v1/subscriptions')
    return reply({
      object: 'list',
      has_more: false,
      data: [...stripe.subscriptions.values()].filter(
        (item) => item.customer === url.searchParams.get('customer'),
      ),
    })
  const subscription = stripe.subscriptions.get(url.pathname.split('/').at(-1) ?? '')
  if (!subscription) return reply({ error: { type: 'invalid_request_error' } }, 404)
  if (method === 'DELETE') Object.assign(subscription, { status: 'canceled', canceled_at: 1 })
  return reply(subscription)
}
const fetchStub: typeof fetch = async (input, init) => {
  const url = String(input)
  if (url.startsWith('https://api.stripe.com/'))
    return stripeStub(new URL(url), init?.method ?? 'GET')
  if (url.startsWith('https://api.scaleway.com/transactional-email/')) {
    const body = JSON.parse(String(init?.body))
    mails.push({ to: body.to[0].email, text: body.text })
    return new Response(JSON.stringify({ emails: [{ id: `mail-${mails.length}`, status: 'new' }] }))
  }
  throw new Error(`Unexpected outbound request ${url}`)
}
const environment = (data: string): Record<string, string> => ({
  NODE_ENV: 'production',
  PUBLIC_BASE_URL: origin,
  HOSTED_AUTH_SECRET: randomBytes(32).toString('hex'),
  LILLERI_VAULT_MASTER_KEY: randomBytes(32).toString('base64url'),
  LILLERI_DATA_DIR: data,
  DATABASE_URL: 'postgresql://lilleri:secret@postgres.railway.internal:5432/railway',
  IDENTITY_MAIL_PROVIDER: 'scaleway',
  IDENTITY_MAIL_API_KEY: 'synthetic-scaleway-secret',
  IDENTITY_MAIL_PROJECT_ID: '11111111-2222-4333-8444-555555555555',
  IDENTITY_MAIL_FROM: 'accesso@mail.lilleri.example',
  LEGAL_ENTITY_NAME: 'Lilleri S.r.l. <prova>',
  LEGAL_ENTITY_ADDRESS: 'Via Roma 1, 20100 Milano',
  LEGAL_ENTITY_VAT: 'IT01234567890',
  LEGAL_CONTACT_EMAIL: 'supporto@lilleri.example',
  LEGAL_PRIVACY_EMAIL: 'privacy@lilleri.example',
  WEB_APP_DIR: join(root, 'web'),
  STRIPE_SECRET_KEY: 'sk_test_SyntheticHostedKey000000000000',
  STRIPE_WEBHOOK_SECRET: 'whsec_SyntheticHostedWebhookSecret0000',
  STRIPE_PRICE_MONTHLY: 'price_HostedMonthly',
  STRIPE_PRICE_YEARLY: 'price_HostedYearly',
})
const signedIn = async (email: string) => {
  const password = 'Una password abbastanza lunga 42!'
  const headers = { host, origin }
  const signup = await server.app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers,
    payload: {
      name: 'Persona',
      email,
      password,
      adultAttested: true,
      termsVersion: LEGAL_TERMS_VERSION,
    },
  })
  expect(signup.statusCode, signup.payload).toBe(200)
  const mail = mails.find((message) => message.to === email)
  expect(mail?.text).toContain(`${origin}/api/auth/verify-email?token=`)
  const link = new URL(/https:\S+/.exec(mail?.text ?? '')?.[0] ?? origin)
  link.searchParams.delete('callbackURL')
  expect(
    (await server.app.inject({ url: `${link.pathname}${link.search}`, headers })).statusCode,
  ).toBe(200)
  const signin = await server.app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers,
    payload: { email, password },
  })
  expect(signin.statusCode, signin.payload).toBe(200)
  const cookie = String(signin.headers['set-cookie'] ?? '')
    .split(/,(?=\s*__Secure)/)
    .map((value) => value.split(';')[0])
    .join('; ')
  expect(cookie).toContain('__Secure-lilleri-hosted')
  const [membership] = await database.db
    .select()
    .from(identity.memberships)
    .where(eq(identity.memberships.userId, signup.json().user.id as string))
  if (!membership) throw new Error('Missing synthetic membership')
  return { cookie, profileId: membership.profileId, headers: { ...headers, cookie } }
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'lilleri-hosted-'))
  await mkdir(join(root, 'web', '_expo'), { recursive: true })
  await writeFile(join(root, 'web', 'index.html'), '<!doctype html><title>Lilleri</title>')
  await writeFile(join(root, 'web', '_expo', 'index-0123456789abcdef0123456789abcdef.js'), 'void 0')
  database = await openDatabase({ driver: 'pglite' })
  server = await createHostedServer(environment(join(root, 'data')), root, {
    database,
    fetch: fetchStub,
    log: () => {},
  })
})
afterAll(async () => {
  await server?.close()
  await database?.close()
  await rm(root, { recursive: true, force: true })
})

describe('hosted production entry point', () => {
  test('configuration fails closed and names only the offending variable', () => {
    const valid = environment('/data')
    const context = { repositoryRoot: root, termsVersion: LEGAL_TERMS_VERSION }
    expect(() => hostedConfigurationFromEnvironment(valid, context)).not.toThrow()
    const cases: [Record<string, string | undefined>, string][] = [
      [{ NODE_ENV: 'development' }, 'NODE_ENV'],
      [{ DEMO_MODE: '1' }, 'DEMO_MODE'],
      [{ PGLITE_PATH: '/data/db' }, 'PGLITE_PATH'],
      [{ LILLERI_VAULT_MASTER_KEY: 'short' }, 'LILLERI_VAULT_MASTER_KEY'],
      [{ DATABASE_URL: 'postgresql://u:p@db.example.com:5432/app' }, 'DATABASE_URL'],
      [{ DATABASE_URL: 'postgresql://u:p@localhost:5432/app' }, 'DATABASE_URL'],
      [{ PUBLIC_BASE_URL: 'http://app.lilleri.example' }, 'PUBLIC_BASE_URL'],
      [{ ENABLE_BANKING_APPLICATION_ID: 'abcdef12-3456' }, 'ENABLE_BANKING_ENVIRONMENT'],
      [{ NODE_TLS_REJECT_UNAUTHORIZED: '0' }, 'NODE_TLS_REJECT_UNAUTHORIZED'],
    ]
    for (const [change, variable] of cases) {
      let failure: unknown
      try {
        hostedConfigurationFromEnvironment({ ...valid, ...change }, context)
      } catch (error) {
        failure = error
      }
      expect(failure, variable).toBeInstanceOf(HostedConfigurationError)
      expect((failure as Error).message).toContain(variable)
      for (const value of Object.values(change))
        if (value && value.length > 4) expect((failure as Error).message).not.toContain(value)
    }
    expect(
      hostedConfigurationFromEnvironment(
        { ...valid, DATABASE_URL: 'postgresql://u:p@db.example.com:5432/app?sslmode=verify-full' },
        context,
      ).database.url,
    ).toContain('verify-full')
  })

  test('health answers the platform probe and the public host only', async () => {
    const probe = await server.app.inject({
      url: '/health',
      headers: { host: 'healthcheck.railway.app' },
    })
    expect(probe.statusCode).toBe(200)
    expect(probe.json()).toEqual({ status: 'ok', mode: 'hosted' })
    expect((await server.app.inject({ url: '/health', headers: { host } })).statusCode).toBe(200)
    expect(
      (await server.app.inject({ url: '/v1/demo', headers: { host: 'healthcheck.railway.app' } }))
        .statusCode,
    ).toBe(403)
    expect(
      (await server.app.inject({ url: '/health', headers: { host: 'evil.example' } })).statusCode,
    ).toBe(403)
    // Operator pages are never public on the hosted origin without a bearer token.
    for (const url of ['/internal/metrics', '/internal/observability'])
      expect((await server.app.inject({ url, headers: { host } })).statusCode).toBe(404)
  })

  test('serves the web app, legal pages and security headers from the same origin', async () => {
    const page = await server.app.inject({ url: '/', headers: { host, accept: 'text/html' } })
    expect(page.statusCode).toBe(200)
    expect(page.headers['content-security-policy']).toContain("script-src 'self'")
    expect(page.headers['strict-transport-security']).toContain('max-age=')
    expect(page.headers['x-frame-options']).toBe('DENY')
    const navigation = await server.app.inject({
      url: '/impostazioni',
      headers: { host, accept: 'text/html' },
    })
    expect(navigation.statusCode).toBe(200)
    const bundle = await server.app.inject({
      url: '/_expo/index-0123456789abcdef0123456789abcdef.js',
      headers: { host },
    })
    expect(bundle.headers['cache-control']).toContain('immutable')
    for (const url of [
      '/.env',
      '/../package.json',
      '/v1/unknown',
      '/webhooks/unknown',
      '/missing.js',
    ])
      expect(
        (await server.app.inject({ url, headers: { host, accept: 'text/html' } })).statusCode,
      ).toBeGreaterThanOrEqual(400)
    const privacy = await server.app.inject({ url: '/legal/privacy', headers: { host } })
    expect(privacy.statusCode).toBe(200)
    expect(privacy.body).toContain('Lilleri S.r.l. &lt;prova&gt;')
    expect(privacy.body).not.toContain('<prova>')
    expect(
      (await server.app.inject({ url: '/legal/terms/en', headers: { host } })).statusCode,
    ).toBe(200)
  })

  test('a person can sign up, verify by email and read an empty owned profile', async () => {
    const { headers } = await signedIn('persona@example.invalid')
    const overview = await server.app.inject({ url: '/v1/demo', headers })
    expect(overview.statusCode, overview.payload).toBe(200)
    expect(overview.json().accounts).toEqual([])
    const bank = await server.app.inject({
      url: '/v1/bank/institutions?country=IT',
      headers,
    })
    expect(bank.statusCode, bank.payload).toBe(200)
    expect(bank.json()).toMatchObject({ available: false, reason: 'provider_not_configured' })
    const billing = await server.app.inject({ url: '/v1/billing', headers })
    expect(billing.statusCode, billing.payload).toBe(200)
    // Stripe is configured, but Plus is not sold until a bank provider can deliver it.
    expect(billing.json()).toMatchObject({
      plan: 'gratis',
      purchaseAvailable: false,
      prices: { month: { amount: '6.99', currency: 'EUR' } },
    })
    const checkout = await server.app.inject({
      method: 'POST',
      url: '/v1/billing/checkout',
      headers,
      payload: { interval: 'month' },
    })
    expect(checkout.statusCode).toBe(409)
    expect(checkout.json().code).toBe('plus_unavailable')
  })

  test('deleting a profile cancels its Stripe subscription, retrying while Stripe is down', async () => {
    const person = await signedIn('abbonata@example.invalid')
    const customer = 'cus_HostedDeletion'
    const subscription = 'sub_HostedDeletion'
    const at = new Date().toISOString()
    await database.db
      .insert(billingCustomers)
      .values({ profileId: person.profileId, stripeCustomerId: customer, createdAt: at })
    await database.db.insert(billingSubscriptions).values({
      id: subscription,
      profileId: person.profileId,
      stripeCustomerId: customer,
      status: 'active',
      priceId: 'price_HostedMonthly',
      interval: 'month',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      stripeCreated: Math.floor(Date.now() / 1000),
      updatedAt: at,
    })
    stripe.subscriptions.set(subscription, stripeSubscription(subscription, customer))
    expect(
      (await server.app.inject({ url: '/v1/billing', headers: person.headers })).json().plan,
    ).toBe('plus')

    const stepUp = await server.app.inject({
      method: 'POST',
      url: '/v1/auth/reauthenticate',
      headers: person.headers,
      payload: { password: 'Una password abbastanza lunga 42!' },
    })
    expect(stepUp.statusCode, stepUp.payload).toBe(200)
    stripe.down = true
    const deleted = await server.app.inject({
      method: 'DELETE',
      url: '/v1/profile',
      headers: person.headers,
    })
    expect(deleted.statusCode, deleted.payload).toBe(204)
    const queued = () =>
      database.db
        .select()
        .from(billingCancellations)
        .where(eq(billingCancellations.profileId, person.profileId))
    await vi.waitFor(async () => expect((await queued())[0]?.attempts).toBe(1))
    expect(stripe.subscriptions.get(subscription)?.status).toBe('active')

    stripe.down = false
    const billing = billingConfigurationFromEnvironment({
      ...environment('/data'),
      PUBLIC_BASE_URL: origin,
    })
    if (!billing) throw new Error('Billing is configured in this test')
    const later = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    expect(
      await runBillingCancellations(
        { ...billing, fetch: fetchStub, now: () => later },
        database.db,
      ),
    ).toMatchObject({ canceled: 1 })
    expect(stripe.subscriptions.get(subscription)?.status).toBe('canceled')
    expect(await queued()).toEqual([])
  })
})
