import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import type { VerifiedPlusState } from '@lilleri/domain'
import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { AppExtension, AppExtensionContext } from './app.js'
import {
  BILLING_SUBSCRIPTION_STATUSES,
  type BillingInterval,
  type BillingSubscriptionRow,
  type BillingSubscriptionStatus,
  billingCancellations,
  billingCustomers,
  billingEvents,
  billingSubscriptions,
} from './billing-schema.js'
import { user as identityUsers } from './identity-schema.js'
import { Problem } from './problem.js'

/** Pinned Stripe REST version. Create the webhook endpoint with the same `api_version`. */
export const STRIPE_API_VERSION = '2025-09-30.clover'
/** Plus stays available this long after the paid period while Stripe retries a renewal. */
export const BILLING_GRACE_MS = 3 * 24 * 60 * 60 * 1000
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300
/**
 * Shown next to the Checkout button. The service starts on the consumer's express request; the
 * statutory withdrawal right is kept (with proportional payment) until the service has been
 * fully provided (Dir. 2011/83/UE artt. 14(3), 16(a)/(m); Codice del Consumo artt. 57 e 59).
 */
export const CHECKOUT_WITHDRAWAL_NOTICE =
  'Confermando l’abbonamento chiedi espressamente che Lilleri Plus inizi subito, durante il periodo di 14 giorni previsto per il recesso. Puoi comunque recedere entro 14 giorni dalla conclusione del contratto: in tal caso pagherai solo un importo proporzionale al servizio fornito fino alla comunicazione del recesso (art. 57, comma 3, Codice del Consumo). Prendi atto che perderai il diritto di recesso quando il servizio sarà stato interamente fornito (art. 59, comma 1, lettera a, Codice del Consumo). Puoi disdire l’abbonamento in qualsiasi momento: la disdetta ha effetto alla fine del periodo già pagato e non ci saranno ulteriori addebiti. Prezzi IVA inclusa.'

const STRIPE_ORIGIN = 'https://api.stripe.com'
const STRIPE_TIMEOUT_MS = 10_000
const PRICE_CACHE_MS = 60 * 60 * 1000
const PRICE_RETRY_MS = 60 * 1000
const WEBHOOK_BODY_LIMIT = 1_000_000
const ENTITLED = new Set<BillingSubscriptionStatus>(['active', 'trialing', 'past_due'])
const TERMINAL = new Set<BillingSubscriptionStatus>(['canceled', 'incomplete_expired'])
const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
])
const INVOICE_EVENTS = new Set(['invoice.paid', 'invoice.payment_failed'])

export type BillingIgnoreReason =
  | 'unhandled_type'
  | 'unrecognised_payload'
  | 'not_subscription'
  | 'unknown_subscription'
  | 'unknown_customer'
  | 'customer_mismatch'
  | 'reference_mismatch'
/** Content-free operational record: no identifiers, e-mails, amounts or Stripe bodies. */
export type BillingLogEntry =
  | {
      readonly event: 'billing_webhook_ignored'
      readonly reason: BillingIgnoreReason
      readonly count: number
    }
  | {
      /** A deleted profile's subscription could not be cancelled yet; it is retried. */
      readonly event: 'billing_cancellation_deferred'
      readonly attempts: number
      readonly transient: boolean
    }
export interface BillingConfiguration {
  /** Secret (`sk_`) or restricted (`rk_`) API key; never logged or returned. */
  readonly secretKey: string
  /** Endpoint signing secret (`whsec_`). */
  readonly webhookSecret: string
  /** Stripe price identifiers of the two Plus prices (IVA included). */
  readonly prices: { readonly month: string; readonly year: string }
  /** Optional inclusive IVA tax rate (`txr_`) attached to the Plus line item. */
  readonly taxRate?: string
  /** Exact HTTPS origin of the web app, used for Checkout and portal return URLs. */
  readonly baseURL: string
  readonly fetch?: typeof fetch
  /** ISO-8601 clock. */
  readonly now?: () => string
  readonly log?: (entry: BillingLogEntry) => void
}
export interface ProfilePlan {
  readonly plan: 'gratis' | 'plus'
  readonly status: BillingSubscriptionStatus | null
  readonly interval: BillingInterval | null
  readonly currentPeriodEnd: string | null
  readonly cancelAtPeriodEnd: boolean
}
export interface BillingPrice {
  /** Major units with two decimals, IVA included, e.g. "6.99". */
  readonly amount: string
  readonly currency: 'EUR'
}
export interface BillingPrices {
  readonly month: BillingPrice | null
  readonly year: BillingPrice | null
}

const SECRET_KEY = /^(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,247}$/
const WEBHOOK_SECRET = /^whsec_[A-Za-z0-9+/=]{16,250}$/
const PRICE_ID = /^price_[A-Za-z0-9]{1,250}$/
const TAX_RATE_ID = /^txr_[A-Za-z0-9]{1,250}$/
const BILLING_VARIABLES = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_MONTHLY',
  'STRIPE_PRICE_YEARLY',
  'STRIPE_TAX_RATE',
] as const
// Never include configuration values: the message may reach deployment logs.
const invalidConfiguration = () =>
  new Error('Stripe billing configuration is incomplete or invalid')

export function assertBillingConfiguration(configuration: BillingConfiguration) {
  let origin = ''
  try {
    origin = new URL(configuration.baseURL).origin
  } catch {
    /* Invalid origins fail below. */
  }
  if (
    !SECRET_KEY.test(configuration.secretKey) ||
    !WEBHOOK_SECRET.test(configuration.webhookSecret) ||
    !PRICE_ID.test(configuration.prices.month) ||
    !PRICE_ID.test(configuration.prices.year) ||
    configuration.prices.month === configuration.prices.year ||
    (configuration.taxRate !== undefined && !TAX_RATE_ID.test(configuration.taxRate)) ||
    !configuration.baseURL.startsWith('https://') ||
    origin !== configuration.baseURL
  )
    throw invalidConfiguration()
}

/** Null when no STRIPE_* variable is set; PUBLIC_BASE_URL alone does not enable billing. */
export function billingConfigurationFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BillingConfiguration | null {
  const value = (name: string) => {
    const text = environment[name]
    return text === undefined || text === '' ? undefined : text
  }
  if (BILLING_VARIABLES.every((name) => value(name) === undefined)) return null
  const secretKey = value('STRIPE_SECRET_KEY'),
    webhookSecret = value('STRIPE_WEBHOOK_SECRET'),
    month = value('STRIPE_PRICE_MONTHLY'),
    year = value('STRIPE_PRICE_YEARLY'),
    taxRate = value('STRIPE_TAX_RATE'),
    baseURL = value('PUBLIC_BASE_URL')
  if (!secretKey || !webhookSecret || !month || !year || !baseURL) throw invalidConfiguration()
  const configuration: BillingConfiguration = {
    secretKey,
    webhookSecret,
    prices: { month, year },
    baseURL,
    ...(taxRate ? { taxRate } : {}),
  }
  assertBillingConfiguration(configuration)
  return configuration
}

/** Carries only the HTTP status: Stripe bodies may contain personal data and are discarded. */
export class StripeRequestError extends Error {
  constructor(readonly status: number) {
    super('Stripe request failed')
    this.name = 'StripeRequestError'
  }
  /** Network failures, idempotency races, rate limits and outages may succeed on retry. */
  get transient() {
    return this.status === 0 || this.status === 409 || this.status === 429 || this.status >= 500
  }
}
type FormFields = readonly (readonly [string, string])[]
async function stripeRequest(
  configuration: BillingConfiguration,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  options: { readonly form?: FormFields; readonly idempotencyKey?: string } = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${configuration.secretKey}`,
    'stripe-version': STRIPE_API_VERSION,
  }
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey
  if (options.form) headers['content-type'] = 'application/x-www-form-urlencoded'
  let response: Response
  try {
    response = await (configuration.fetch ?? fetch)(`${STRIPE_ORIGIN}${path}`, {
      method,
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(STRIPE_TIMEOUT_MS),
      ...(options.form
        ? {
            body: new URLSearchParams(
              options.form.map(([key, value]): [string, string] => [key, value]),
            ).toString(),
          }
        : {}),
    })
  } catch {
    throw new StripeRequestError(0)
  }
  if (!response.ok) {
    try {
      await response.body?.cancel()
    } catch {
      /* The body is never read. */
    }
    throw new StripeRequestError(response.status)
  }
  try {
    return await response.json()
  } catch {
    throw new StripeRequestError(0)
  }
}

const stripeId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9]{1,250}$`))
/** Stripe fields that are either an ID or an expanded object. */
const reference = (prefix: string) =>
  z.union([stripeId(prefix), z.object({ id: stripeId(prefix) }).transform((value) => value.id)])
const unixSeconds = z.number().int().nonnegative()
const subscriptionObject = z.object({
  id: stripeId('sub'),
  customer: reference('cus'),
  status: z.enum(BILLING_SUBSCRIPTION_STATUSES),
  cancel_at_period_end: z.boolean(),
  cancel_at: unixSeconds.nullish(),
  canceled_at: unixSeconds.nullish(),
  // Before API version 2025-03-31.basil the period lived on the subscription itself.
  current_period_end: unixSeconds.nullish(),
  items: z.object({
    data: z.array(
      z.object({
        current_period_end: unixSeconds.nullish(),
        price: z.object({
          id: z.string().min(1).max(255),
          recurring: z.object({ interval: z.string() }).nullish(),
        }),
      }),
    ),
  }),
})
type StripeSubscription = z.infer<typeof subscriptionObject>
const subscriptionList = z.object({ data: z.array(subscriptionObject), has_more: z.boolean() })
const priceObject = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  currency: z.string(),
  unit_amount: z.number().int().nonnegative().nullable(),
  recurring: z
    .object({ interval: z.string(), interval_count: z.number().int().optional() })
    .nullable(),
})
const customerObject = z.object({ id: stripeId('cus') })
const hostedSession = z.object({ url: z.string().max(4096) })
const eventEnvelope = z.object({
  id: stripeId('evt'),
  type: z.string().min(1).max(128),
  created: unixSeconds,
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
})
type StripeEvent = z.infer<typeof eventEnvelope>
const checkoutSessionObject = z.object({
  mode: z.string(),
  customer: reference('cus').nullish(),
  subscription: reference('sub').nullish(),
  client_reference_id: z.string().nullish(),
})
const subscriptionEventObject = z.object({ id: stripeId('sub') })
const invoiceObject = z.object({
  // Before 2025-03-31.basil; newer versions use parent.subscription_details.
  subscription: reference('sub').nullish(),
  parent: z
    .object({
      subscription_details: z.object({ subscription: reference('sub') }).nullish(),
    })
    .nullish(),
})

function instant(value: string) {
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) throw new Error('Invalid billing instant')
  return milliseconds
}
const isoSeconds = (seconds: number) => new Date(seconds * 1000).toISOString()

function parseSubscription(raw: unknown): StripeSubscription {
  const parsed = subscriptionObject.safeParse(raw)
  // A changed response shape must not be stored; webhook callers answer 500 so Stripe retries.
  if (!parsed.success) throw new Error('Stripe subscription response is not recognised')
  return parsed.data
}

/** The current Stripe state of one subscription, mapped to a stored row. */
function subscriptionRow(
  configuration: BillingConfiguration,
  subscription: StripeSubscription,
  profileId: string,
  stripeCreated: number,
  updatedAt: string,
): typeof billingSubscriptions.$inferInsert {
  const items = subscription.items.data
  const only = items.length === 1 ? items[0] : undefined
  const configured: BillingInterval | null =
    only?.price.id === configuration.prices.month
      ? 'month'
      : only?.price.id === configuration.prices.year
        ? 'year'
        : null
  // Unknown or inconsistent prices are stored for support but never grant Plus.
  const interval =
    configured && (!only?.price.recurring || only.price.recurring.interval === configured)
      ? configured
      : null
  const periodEnds = items
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === 'number')
  const periodEnd = periodEnds.length
    ? Math.max(...periodEnds)
    : (subscription.current_period_end ?? null)
  return {
    id: subscription.id,
    profileId,
    stripeCustomerId: subscription.customer,
    status: subscription.status,
    priceId: items[0]?.price.id ?? null,
    interval,
    currentPeriodEnd: periodEnd === null ? null : isoSeconds(periodEnd),
    // Newer portal flows schedule `cancel_at` instead of `cancel_at_period_end`.
    cancelAtPeriodEnd:
      !TERMINAL.has(subscription.status) &&
      (subscription.cancel_at_period_end || subscription.cancel_at != null),
    canceledAt: subscription.canceled_at == null ? null : isoSeconds(subscription.canceled_at),
    stripeCreated,
    updatedAt,
  }
}
/** Older events and other profiles never overwrite a stored state. */
async function storeSubscription(db: Database, row: typeof billingSubscriptions.$inferInsert) {
  await db
    .insert(billingSubscriptions)
    .values(row)
    .onConflictDoUpdate({
      target: billingSubscriptions.id,
      set: {
        status: row.status,
        priceId: row.priceId ?? null,
        interval: row.interval ?? null,
        currentPeriodEnd: row.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
        canceledAt: row.canceledAt ?? null,
        stripeCreated: row.stripeCreated,
        updatedAt: row.updatedAt,
      },
      setWhere: sql`${billingSubscriptions.stripeCreated} <= ${row.stripeCreated} AND ${billingSubscriptions.profileId} = ${row.profileId}`,
    })
}

const grantsPlus = (row: BillingSubscriptionRow, now: number) =>
  ENTITLED.has(row.status) &&
  row.interval !== null &&
  row.currentPeriodEnd !== null &&
  instant(row.currentPeriodEnd) + BILLING_GRACE_MS > now
const subscriptionsOf = (db: Database, profileId: string) =>
  db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.profileId, profileId))
    .orderBy(
      desc(billingSubscriptions.stripeCreated),
      desc(billingSubscriptions.updatedAt),
      asc(billingSubscriptions.id),
    )
function planOf(rows: readonly BillingSubscriptionRow[], now: string): ProfilePlan {
  const at = instant(now)
  const granting = rows.find((row) => grantsPlus(row, at))
  const shown = granting ?? rows[0]
  return {
    plan: granting ? 'plus' : 'gratis',
    status: shown?.status ?? null,
    interval: shown?.interval ?? null,
    currentPeriodEnd: shown?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: shown?.cancelAtPeriodEnd ?? false,
  }
}

/**
 * Plus while a subscription with a configured price is active, trialing or past_due (Stripe is
 * retrying) and its paid period plus the grace has not ended. Works with the RLS-scoped handle.
 */
export async function profilePlan(
  db: Database,
  profileId: string,
  now: string,
): Promise<ProfilePlan> {
  return planOf(await subscriptionsOf(db, profileId), now)
}

/** Adapter for `resolveEntitlements({ mode: 'commercial', now, verifiedPlus })`. */
export function verifiedPlusState(plan: ProfilePlan): VerifiedPlusState | undefined {
  if (plan.plan !== 'plus' || plan.currentPeriodEnd === null) return undefined
  return {
    status: plan.status === 'past_due' ? 'grace' : plan.cancelAtPeriodEnd ? 'cancelled' : 'active',
    validUntil: new Date(instant(plan.currentPeriodEnd) + BILLING_GRACE_MS).toISOString(),
  }
}

/** Verifies `Stripe-Signature: t=…,v1=…` over the exact raw body with a constant-time compare. */
export function verifyStripeSignature(
  payload: Buffer,
  header: string | undefined,
  secret: string,
  nowSeconds: number,
  toleranceSeconds = STRIPE_SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  if (!header || header.length > 8192) return false
  let timestamp: number | undefined
  const candidates: Buffer[] = []
  for (const part of header.split(',')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const key = part.slice(0, separator).trim(),
      value = part.slice(separator + 1).trim()
    if (key === 't') {
      if (timestamp !== undefined || !/^\d{1,12}$/.test(value)) return false
      timestamp = Number(value)
    } else if (key === 'v1' && /^[a-f0-9]{64}$/.test(value))
      candidates.push(Buffer.from(value, 'hex'))
  }
  if (
    timestamp === undefined ||
    !candidates.length ||
    Math.abs(nowSeconds - timestamp) > toleranceSeconds
  )
    return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(payload).digest()
  let matched = false
  // Compare every candidate (several are sent while a secret is being rolled).
  for (const candidate of candidates) matched = timingSafeEqual(expected, candidate) || matched
  return matched
}

function createPriceCatalogue(configuration: BillingConfiguration, clock: () => number) {
  let cached: { readonly prices: BillingPrices; readonly expiresAt: number } | undefined
  let loading: Promise<BillingPrices> | undefined
  const view = (raw: unknown, interval: BillingInterval): BillingPrice | null => {
    const parsed = priceObject.safeParse(raw)
    if (!parsed.success) return null
    const price = parsed.data
    if (
      price.id !== configuration.prices[interval] ||
      price.active === false ||
      price.currency.toLowerCase() !== 'eur' ||
      price.unit_amount === null ||
      price.recurring?.interval !== interval ||
      (price.recurring.interval_count ?? 1) !== 1
    )
      return null
    const minor = price.unit_amount
    return {
      amount: `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`,
      currency: 'EUR',
    }
  }
  const load = async (): Promise<BillingPrices> => {
    const read = async (interval: BillingInterval) => {
      try {
        return view(
          await stripeRequest(configuration, 'GET', `/v1/prices/${configuration.prices[interval]}`),
          interval,
        )
      } catch {
        return null
      }
    }
    const [month, year] = await Promise.all([read('month'), read('year')])
    const prices = { month, year }
    cached = { prices, expiresAt: clock() + (month && year ? PRICE_CACHE_MS : PRICE_RETRY_MS) }
    return prices
  }
  return async () => {
    if (cached && cached.expiresAt > clock()) return cached.prices
    loading ??= load().finally(() => {
      loading = undefined
    })
    return loading
  }
}

type Resolution =
  | { readonly row: typeof billingSubscriptions.$inferInsert }
  | { readonly ignored: BillingIgnoreReason }
const customerByStripeId = async (db: Database, stripeCustomerId: string) =>
  (
    await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, stripeCustomerId))
  )[0]

/** Re-reads the subscription so out-of-order or replayed events store Stripe's current state. */
async function currentSubscription(
  configuration: BillingConfiguration,
  db: Database,
  subscriptionId: string,
  event: StripeEvent,
  now: string,
  expected: { readonly customer?: string; readonly profileId?: string } = {},
): Promise<Resolution> {
  let raw: unknown
  try {
    raw = await stripeRequest(configuration, 'GET', `/v1/subscriptions/${subscriptionId}`)
  } catch (error) {
    if (error instanceof StripeRequestError && error.status === 404)
      return { ignored: 'unknown_subscription' }
    throw error
  }
  const subscription = parseSubscription(raw)
  if (
    subscription.id !== subscriptionId ||
    (expected.customer !== undefined && subscription.customer !== expected.customer)
  )
    return { ignored: 'customer_mismatch' }
  // The profile always comes from our own mapping, never from Stripe metadata.
  const customer = await customerByStripeId(db, subscription.customer)
  if (!customer) return { ignored: 'unknown_customer' }
  if (expected.profileId !== undefined && customer.profileId !== expected.profileId)
    return { ignored: 'reference_mismatch' }
  return {
    row: subscriptionRow(configuration, subscription, customer.profileId, event.created, now),
  }
}
async function resolveEvent(
  configuration: BillingConfiguration,
  db: Database,
  event: StripeEvent,
  now: string,
): Promise<Resolution> {
  if (event.type === 'checkout.session.completed') {
    const parsed = checkoutSessionObject.safeParse(event.data.object)
    if (!parsed.success) return { ignored: 'unrecognised_payload' }
    const session = parsed.data
    if (session.mode !== 'subscription' || !session.customer || !session.subscription)
      return { ignored: 'not_subscription' }
    const customer = await customerByStripeId(db, session.customer)
    if (!customer) return { ignored: 'unknown_customer' }
    if (session.client_reference_id !== customer.profileId) return { ignored: 'reference_mismatch' }
    return currentSubscription(configuration, db, session.subscription, event, now, {
      customer: customer.stripeCustomerId,
      profileId: customer.profileId,
    })
  }
  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const parsed = subscriptionEventObject.safeParse(event.data.object)
    if (!parsed.success) return { ignored: 'unrecognised_payload' }
    return currentSubscription(configuration, db, parsed.data.id, event, now)
  }
  if (INVOICE_EVENTS.has(event.type)) {
    const parsed = invoiceObject.safeParse(event.data.object)
    if (!parsed.success) return { ignored: 'unrecognised_payload' }
    const subscriptionId =
      parsed.data.parent?.subscription_details?.subscription ?? parsed.data.subscription
    if (!subscriptionId) return { ignored: 'not_subscription' }
    return currentSubscription(configuration, db, subscriptionId, event, now)
  }
  return { ignored: 'unhandled_type' }
}

const customerIdempotencyKey = (profileId: string) =>
  `lilleri-customer-v1-${createHash('sha256').update(profileId).digest('hex')}`
/** Returns the stored Stripe customer, creating it once with the verified identity e-mail. */
async function ensureCustomer(
  configuration: BillingConfiguration,
  trustedDb: Database,
  profileId: string,
  userId: string,
  now: string,
) {
  const stored = async () =>
    (
      await trustedDb
        .select({ id: billingCustomers.stripeCustomerId })
        .from(billingCustomers)
        .where(eq(billingCustomers.profileId, profileId))
    )[0]?.id
  const existing = await stored()
  if (existing) return existing
  const [person] = await trustedDb
    .select({ email: identityUsers.email, emailVerified: identityUsers.emailVerified })
    .from(identityUsers)
    .where(eq(identityUsers.id, userId))
  if (!person?.emailVerified)
    throw new Problem(
      409,
      'email_unverified',
      'Conferma il tuo indirizzo e-mail prima di attivare un abbonamento.',
    )
  const created = customerObject.safeParse(
    await stripeRequest(configuration, 'POST', '/v1/customers', {
      form: [
        ['email', person.email],
        ['metadata[profile_id]', profileId],
        ['preferred_locales[0]', 'it'],
      ],
      // Concurrent or retried checkouts for one profile resolve to one Stripe customer.
      idempotencyKey: customerIdempotencyKey(profileId),
    }),
  )
  if (!created.success) throw new StripeRequestError(0)
  await trustedDb
    .insert(billingCustomers)
    .values({ profileId, stripeCustomerId: created.data.id, createdAt: now })
    .onConflictDoNothing()
  const mapped = await stored()
  if (!mapped) throw new Error('Billing customer mapping is unavailable')
  return mapped
}
function checkoutForm(
  configuration: BillingConfiguration,
  customerId: string,
  profileId: string,
  interval: BillingInterval,
): FormFields {
  return [
    ['mode', 'subscription'],
    ['customer', customerId],
    ['line_items[0][price]', configuration.prices[interval]],
    ['line_items[0][quantity]', '1'],
    ...(configuration.taxRate
      ? ([['line_items[0][tax_rates][0]', configuration.taxRate]] as const)
      : []),
    ['client_reference_id', profileId],
    ['metadata[profile_id]', profileId],
    ['subscription_data[metadata][profile_id]', profileId],
    ['success_url', `${configuration.baseURL}/?billing=success`],
    ['cancel_url', `${configuration.baseURL}/?billing=cancelled`],
    ['locale', 'it'],
    ['allow_promotion_codes', 'true'],
    ['billing_address_collection', 'auto'],
    ['customer_update[address]', 'auto'],
    ['custom_text[submit][message]', CHECKOUT_WITHDRAWAL_NOTICE],
  ]
}
/** Only a Stripe-hosted HTTPS page is ever handed to the browser. */
function hostedUrl(raw: unknown) {
  const parsed = hostedSession.safeParse(raw)
  if (!parsed.success) throw new StripeRequestError(0)
  let url: URL
  try {
    url = new URL(parsed.data.url)
  } catch {
    throw new StripeRequestError(0)
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.endsWith('.stripe.com')
  )
    throw new StripeRequestError(0)
  return url.toString()
}

async function openSubscriptionIds(configuration: BillingConfiguration, customerId: string) {
  const ids: string[] = []
  let after: string | undefined
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ customer: customerId, status: 'all', limit: '100' })
    if (after) query.set('starting_after', after)
    const parsed = subscriptionList.safeParse(
      await stripeRequest(configuration, 'GET', `/v1/subscriptions?${query}`),
    )
    if (!parsed.success) throw new Error('Stripe subscription list is not recognised')
    for (const subscription of parsed.data.data)
      if (!TERMINAL.has(subscription.status)) ids.push(subscription.id)
    after = parsed.data.data.at(-1)?.id
    if (!parsed.data.has_more || !after) return ids
  }
  throw new Error('Stripe subscription list is too long')
}
/** Cancels now; an already ended or missing subscription counts as cancelled. */
async function cancelSubscription(configuration: BillingConfiguration, id: string) {
  try {
    return parseSubscription(
      await stripeRequest(configuration, 'DELETE', `/v1/subscriptions/${id}`),
    )
  } catch (error) {
    if (!(error instanceof StripeRequestError) || error.transient) throw error
    let current: unknown
    try {
      current = await stripeRequest(configuration, 'GET', `/v1/subscriptions/${id}`)
    } catch (lookup) {
      if (lookup instanceof StripeRequestError && lookup.status === 404) return null
      throw lookup
    }
    const subscription = parseSubscription(current)
    if (TERMINAL.has(subscription.status)) return subscription
    throw error
  }
}

/** An armed cancellation whose profile still exists this long after arming never committed. */
export const BILLING_CANCELLATION_GRACE_MS = 15 * 60 * 1000
const CANCELLATION_RETRY_BASE_MS = 60 * 1000
const CANCELLATION_RETRY_MAX_MS = 6 * 60 * 60 * 1000
const SUBSCRIPTION_ID = /^sub_[A-Za-z0-9]{1,250}$/
export type BillingCancellationOutcome = 'none' | 'profile_kept' | 'canceled' | 'deferred'

/**
 * Profile deletion, step 1, before the erasure transaction: durably records the Stripe customer
 * and open subscriptions, because the profile cascade erases the billing rows. Returns false when
 * the profile has nothing Stripe could still charge.
 */
export async function armBillingCancellation(
  trustedDb: Database,
  profileId: string,
  now = new Date().toISOString(),
): Promise<boolean> {
  const [customer] = await trustedDb
    .select({ id: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.profileId, profileId))
  const stored = await trustedDb
    .select({ id: billingSubscriptions.id, status: billingSubscriptions.status })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.profileId, profileId))
  const [previous] = await trustedDb
    .select()
    .from(billingCancellations)
    .where(eq(billingCancellations.profileId, profileId))
  const subscriptionIds = [
    ...new Set([
      ...(previous?.subscriptionIds ?? []),
      ...stored.filter((row) => !TERMINAL.has(row.status)).map((row) => row.id),
    ]),
  ]
  const stripeCustomerId = customer?.id ?? previous?.stripeCustomerId ?? null
  if (!stripeCustomerId && subscriptionIds.length === 0) return false
  const at = new Date(instant(now)).toISOString()
  await trustedDb
    .insert(billingCancellations)
    .values({ profileId, stripeCustomerId, subscriptionIds, armedAt: at, nextAttemptAt: at })
    .onConflictDoUpdate({
      target: billingCancellations.profileId,
      set: { stripeCustomerId, subscriptionIds, armedAt: at, nextAttemptAt: at },
    })
  return true
}

/**
 * Profile deletion, step 2: once the erasure has committed, cancels every open subscription of
 * the armed customer and removes the record. While the profile still exists the deletion has not
 * committed: the record is discarded when `discardKept` (the deletion request has finished) or
 * once the arming grace has passed. A Stripe failure keeps it for a retry with backoff.
 */
export async function settleBillingCancellation(
  configuration: BillingConfiguration,
  trustedDb: Database,
  profileId: string,
  options: { readonly discardKept?: boolean } = {},
): Promise<BillingCancellationOutcome> {
  assertBillingConfiguration(configuration)
  const now = instant(configuration.now?.() ?? new Date().toISOString())
  const [row] = await trustedDb
    .select()
    .from(billingCancellations)
    .where(eq(billingCancellations.profileId, profileId))
  if (!row) return 'none'
  const armed = and(
    eq(billingCancellations.profileId, profileId),
    eq(billingCancellations.armedAt, row.armedAt),
  )
  const [profile] = await trustedDb
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
  if (profile) {
    const expires = instant(row.armedAt) + BILLING_CANCELLATION_GRACE_MS
    if (options.discardKept || now >= expires)
      await trustedDb.delete(billingCancellations).where(armed)
    else
      await trustedDb
        .update(billingCancellations)
        .set({ nextAttemptAt: new Date(expires).toISOString() })
        .where(armed)
    return 'profile_kept'
  }
  try {
    const pending = new Set(row.subscriptionIds)
    if (row.stripeCustomerId)
      for (const id of await openSubscriptionIds(configuration, row.stripeCustomerId))
        pending.add(id)
    for (const id of pending) {
      if (!SUBSCRIPTION_ID.test(id)) throw new Error('Invalid subscription identifier')
      await cancelSubscription(configuration, id)
    }
  } catch (error) {
    const attempts = row.attempts + 1
    const delay = Math.min(
      CANCELLATION_RETRY_MAX_MS,
      CANCELLATION_RETRY_BASE_MS * 2 ** Math.min(row.attempts, 20),
    )
    await trustedDb
      .update(billingCancellations)
      .set({ attempts, nextAttemptAt: new Date(now + delay).toISOString() })
      .where(armed)
    ;(configuration.log ?? ((entry: BillingLogEntry) => console.warn(JSON.stringify(entry))))({
      event: 'billing_cancellation_deferred',
      attempts,
      transient: error instanceof StripeRequestError && error.transient,
    })
    return 'deferred'
  }
  await trustedDb.delete(billingCancellations).where(armed)
  return 'canceled'
}

/** Settles due cancellations owed by deleted profiles; the hosted server runs it periodically. */
export async function runBillingCancellations(
  configuration: BillingConfiguration,
  trustedDb: Database,
  limit = 20,
): Promise<Record<BillingCancellationOutcome, number>> {
  const now = new Date(instant(configuration.now?.() ?? new Date().toISOString())).toISOString()
  const due = await trustedDb
    .select({ profileId: billingCancellations.profileId })
    .from(billingCancellations)
    .where(lte(billingCancellations.nextAttemptAt, now))
    .orderBy(asc(billingCancellations.nextAttemptAt))
    .limit(limit)
  const outcomes = { none: 0, profile_kept: 0, canceled: 0, deferred: 0 }
  for (const { profileId } of due)
    outcomes[await settleBillingCancellation(configuration, trustedDb, profileId)]++
  return outcomes
}
/**
 * Profile deletion: immediately cancels every subscription that is not already ended, both those
 * stored locally and any Stripe lists for the profile's customer (a webhook may still be in
 * flight). Idempotent. Throws `StripeRequestError` (see `transient`) when Stripe cannot confirm.
 */
export async function cancelBillingForProfile(
  configuration: BillingConfiguration,
  trustedDb: Database,
  profileId: string,
): Promise<{ readonly canceled: number }> {
  assertBillingConfiguration(configuration)
  const now = configuration.now?.() ?? new Date().toISOString()
  const [customer] = await trustedDb
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.profileId, profileId))
  const stored = await trustedDb
    .select({ id: billingSubscriptions.id, status: billingSubscriptions.status })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.profileId, profileId))
  const pending = new Set(stored.filter((row) => !TERMINAL.has(row.status)).map((row) => row.id))
  if (customer)
    for (const id of await openSubscriptionIds(configuration, customer.stripeCustomerId))
      pending.add(id)
  let canceled = 0
  for (const id of pending) {
    if (!/^sub_[A-Za-z0-9]{1,250}$/.test(id)) throw new Error('Invalid subscription identifier')
    const subscription = await cancelSubscription(configuration, id)
    canceled++
    if (subscription && customer && subscription.customer === customer.stripeCustomerId)
      await storeSubscription(
        trustedDb,
        subscriptionRow(
          configuration,
          subscription,
          profileId,
          Math.floor(instant(now) / 1000),
          now,
        ),
      )
    else if (!subscription)
      await trustedDb
        .update(billingSubscriptions)
        .set({ status: 'canceled', cancelAtPeriodEnd: false, canceledAt: now, updatedAt: now })
        .where(and(eq(billingSubscriptions.id, id), eq(billingSubscriptions.profileId, profileId)))
  }
  return { canceled }
}

const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = {
  400: problemDto,
  401: problemDto,
  403: problemDto,
  404: problemDto,
  409: problemDto,
  500: problemDto,
  502: problemDto,
}
const priceDto = z
  .object({ amount: z.string().regex(/^\d+\.\d{2}$/), currency: z.literal('EUR') })
  .nullable()
const billingDto = z.object({
  plan: z.enum(['gratis', 'plus']),
  status: z.enum(BILLING_SUBSCRIPTION_STATUSES).nullable(),
  interval: z.enum(['month', 'year']).nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  /** True only when this caller (the profile owner) can start Checkout right now. */
  purchaseAvailable: z.boolean(),
  prices: z.object({ month: priceDto, year: priceDto }),
})
// An unfilled URL (post-commit work skipped) fails serialisation instead of returning ''.
const urlDto = z.object({ url: z.url({ protocol: /^https$/ }) })
const billingNotConfigured = () =>
  new Problem(
    409,
    'billing_not_configured',
    'Gli abbonamenti non sono disponibili in questo ambiente.',
  )
const billingUnavailable = () =>
  new Problem(
    502,
    'billing_unavailable',
    'Il servizio di pagamento non è disponibile. I tuoi dati sono al sicuro; riprova tra poco.',
  )
const ownerRequired = () =>
  new Problem(403, 'owner_required', 'Solo il titolare del profilo può gestire l’abbonamento.')
const invalidRequest = () => new Problem(400, 'invalid_request', 'La richiesta non è valida.')
const toProblem = (error: unknown) =>
  error instanceof StripeRequestError ? billingUnavailable() : error

/**
 * Registers `/v1/billing*` (profile-scoped, hosted session) and, when configured, the
 * signature-authenticated `POST /webhooks/stripe`. All writes use the trusted handle.
 */
export interface BillingExtensionOptions {
  /**
   * Plus is sold only while its benefit can be delivered (an active bank provider with contracted
   * capacity left). Evaluated after the request's profile transaction, on the trusted handle.
   */
  readonly purchaseGate?: () => Promise<boolean>
}
export function createBillingExtension(
  configuration: BillingConfiguration | null,
  options: BillingExtensionOptions = {},
): AppExtension {
  if (configuration) assertBillingConfiguration(configuration)
  return async (app, context: AppExtensionContext) => {
    const routes = app.withTypeProvider<ZodTypeProvider>()
    const clock = () => configuration?.now?.() ?? new Date().toISOString()
    const prices = configuration
      ? createPriceCatalogue(configuration, () => instant(clock()))
      : undefined
    const ignored = new Map<BillingIgnoreReason, number>()
    const log =
      configuration?.log ?? ((entry: BillingLogEntry) => console.warn(JSON.stringify(entry)))
    const ignore = (reason: BillingIgnoreReason) => {
      const count = (ignored.get(reason) ?? 0) + 1
      ignored.set(reason, count)
      log({ event: 'billing_webhook_ignored', reason, count })
    }
    // `/v1/*` handlers run inside the profile's SQL transaction when a financial scope exists.
    // Stripe calls and trusted writes wait until it commits: no transaction is held open across
    // the network, and a single-connection driver (PGlite) can serve the trusted handle.
    const afterScope = async (request: FastifyRequest, work: () => Promise<void>) => {
      if (context.service(request).db === context.db) await work()
      else context.afterCommit(request, work)
    }
    const owner = (request: FastifyRequest) => {
      const principal = context.principal(request)
      const service = context.service(request)
      if (principal?.role !== 'owner' || principal.profileId !== service.profileId)
        throw ownerRequired()
      return { principal, service }
    }

    routes.get(
      '/v1/billing',
      {
        schema: {
          summary: 'Current plan and Plus prices',
          response: { 200: billingDto, ...errors },
        },
      },
      async (request) => {
        const service = context.service(request)
        const rows = await subscriptionsOf(service.db, service.profileId)
        const plan = planOf(rows, clock())
        const result: z.infer<typeof billingDto> = {
          ...plan,
          purchaseAvailable: false,
          prices: { month: null, year: null },
        }
        const catalogue = prices
        if (catalogue)
          await afterScope(request, async () => {
            const current = await catalogue()
            result.prices = current
            result.purchaseAvailable =
              Boolean(current.month && current.year) &&
              context.principal(request)?.role === 'owner' &&
              rows.every((row) => TERMINAL.has(row.status)) &&
              (options.purchaseGate ? await options.purchaseGate() : true)
          })
        return result
      },
    )

    routes.post(
      '/v1/billing/checkout',
      {
        schema: {
          summary: 'Start a Stripe Checkout session for Plus',
          body: z.object({ interval: z.enum(['month', 'year']) }).strict(),
          response: { 200: urlDto, ...errors },
        },
      },
      async (request) => {
        if (!configuration) throw billingNotConfigured()
        const { principal, service } = owner(request)
        const rows = await subscriptionsOf(service.db, service.profileId)
        if (planOf(rows, clock()).plan === 'plus')
          throw new Problem(409, 'already_subscribed', 'Hai già un abbonamento Plus attivo.')
        // A second subscription would charge twice: open ones are managed in the portal.
        if (rows.some((row) => !TERMINAL.has(row.status)))
          throw new Problem(
            409,
            'subscription_pending',
            'Hai già un abbonamento da completare o aggiornare: gestiscilo dalla pagina dei pagamenti.',
          )
        const interval = request.body.interval
        const result = { url: '' }
        await afterScope(request, async () => {
          if (options.purchaseGate && !(await options.purchaseGate()))
            throw new Problem(
              409,
              'plus_unavailable',
              'Lilleri Plus non è ancora acquistabile: lo attiveremo appena il collegamento con le banche sarà disponibile per te.',
            )
          try {
            const now = clock()
            const customer = await ensureCustomer(
              configuration,
              context.db,
              service.profileId,
              principal.userId,
              now,
            )
            result.url = hostedUrl(
              await stripeRequest(configuration, 'POST', '/v1/checkout/sessions', {
                form: checkoutForm(configuration, customer, service.profileId, interval),
              }),
            )
          } catch (error) {
            throw toProblem(error)
          }
        })
        return result
      },
    )

    routes.post(
      '/v1/billing/portal',
      {
        schema: {
          summary: 'Open the Stripe customer portal',
          body: z.object({}).strict().nullish(),
          response: { 200: urlDto, ...errors },
        },
      },
      async (request) => {
        if (!configuration) throw billingNotConfigured()
        const { service } = owner(request)
        const [customer] = await service.db
          .select({ id: billingCustomers.stripeCustomerId })
          .from(billingCustomers)
          .where(eq(billingCustomers.profileId, service.profileId))
        if (!customer)
          throw new Problem(409, 'no_billing_account', 'Non hai ancora un abbonamento da gestire.')
        const result = { url: '' }
        await afterScope(request, async () => {
          try {
            result.url = hostedUrl(
              await stripeRequest(configuration, 'POST', '/v1/billing_portal/sessions', {
                form: [
                  ['customer', customer.id],
                  ['return_url', `${configuration.baseURL}/?billing=portal`],
                  ['locale', 'it'],
                ],
              }),
            )
          } catch (error) {
            throw toProblem(error)
          }
        })
        return result
      },
    )

    if (!configuration) return
    // Encapsulated: the raw-body JSON parser applies to this route only.
    await app.register(async (scope) => {
      scope.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer', bodyLimit: WEBHOOK_BODY_LIMIT },
        (_request, body, done) => done(null, body),
      )
      scope.withTypeProvider<ZodTypeProvider>().post(
        '/webhooks/stripe',
        {
          bodyLimit: WEBHOOK_BODY_LIMIT,
          schema: {
            summary: 'Stripe webhook (signature-authenticated)',
            response: { 200: z.object({ received: z.literal(true) }), ...errors },
          },
        },
        async (request) => {
          const header = request.headers['stripe-signature']
          const body = request.body
          if (
            !Buffer.isBuffer(body) ||
            !verifyStripeSignature(
              body,
              Array.isArray(header) ? header.join(',') : header,
              configuration.webhookSecret,
              Math.floor(instant(clock()) / 1000),
            )
          )
            throw invalidRequest()
          let envelope: ReturnType<typeof eventEnvelope.safeParse>
          try {
            envelope = eventEnvelope.safeParse(JSON.parse(body.toString('utf8')))
          } catch {
            throw invalidRequest()
          }
          if (!envelope.success) throw invalidRequest()
          const event = envelope.data
          const [seen] = await context.db
            .select({ id: billingEvents.id })
            .from(billingEvents)
            .where(eq(billingEvents.id, event.id))
          if (seen) return { received: true as const }
          // Stripe failures propagate as 500 before the event is recorded, so Stripe retries.
          const now = clock()
          const resolution = await resolveEvent(configuration, context.db, event, now)
          const recorded = await context.db.transaction(async (db) => {
            const inserted = await db
              .insert(billingEvents)
              .values({ id: event.id, type: event.type, receivedAt: now })
              .onConflictDoNothing()
              .returning({ id: billingEvents.id })
            if (!inserted.length) return false
            if ('row' in resolution) await storeSubscription(db, resolution.row)
            return true
          })
          if (recorded && 'ignored' in resolution) ignore(resolution.ignored)
          return { received: true as const }
        },
      )
    })
  }
}
