import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { AppExtension, AppExtensionContext } from './app.js'
import { type StoreChannel, storeEntitlements } from './billing-schema.js'
import { Problem } from './problem.js'

/**
 * Plus bought in the App Store or Google Play, through RevenueCat. The app identifies purchases
 * with the Lilleri profile id; the server never trusts a client or webhook claim: every webhook
 * and every in-app refresh re-reads the customer from RevenueCat's REST API (v1), as RevenueCat
 * recommends, and stores only the resulting state of the configured entitlement.
 */
export interface RevenueCatConfiguration {
  /** Secret API key (`sk_…`), server only. */
  readonly secretKey: string
  /** The exact `Authorization` value set on the webhook in the RevenueCat dashboard. */
  readonly webhookAuthorization: string
  /** Optional webhook signing secret: verifies `X-RevenueCat-Webhook-Signature` as well. */
  readonly webhookSigningSecret?: string
  /** Entitlement identifier that grants Plus (default `plus`). */
  readonly entitlementId: string
  /**
   * Sandbox purchases (TestFlight, App Review, Play license testers) grant Plus. App Review buys
   * Plus in the sandbox, so turning this off blocks review of the purchase flow.
   */
  readonly acceptSandbox: boolean
  readonly fetch?: typeof fetch
  readonly now?: () => string
  readonly log?: (entry: StoreBillingLogEntry) => void
}
/** Content-free operational record: no identifiers, receipts or amounts. */
export type StoreBillingLogEntry =
  | { readonly event: 'store_webhook_ignored'; readonly reason: 'no_profile' | 'test' }
  | { readonly event: 'store_refresh_failed'; readonly status: number }

const API = 'https://api.revenuecat.com/v1'
const TIMEOUT_MS = 10_000
const WEBHOOK_BODY_LIMIT = 256 * 1024
const SIGNATURE_TOLERANCE_SECONDS = 300
/** Lilleri profile ids of the hosted service (`identity.ts`); anything else is never looked up. */
const PROFILE_ID = /^profile_hosted_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const STORES: Readonly<Record<string, StoreChannel>> = {
  app_store: 'app_store',
  mac_app_store: 'app_store',
  play_store: 'play_store',
  promotional: 'promotional',
}

export class RevenueCatRequestError extends Error {
  constructor(readonly status: number) {
    super('RevenueCat request failed')
    this.name = 'RevenueCatRequestError'
  }
  get transient() {
    return this.status === 0 || this.status === 429 || this.status >= 500
  }
}
const invalidConfiguration = () => new Error('RevenueCat configuration is invalid')

/** Null when no REVENUECAT_* variable is set; the two required values are all-or-nothing. */
export function revenueCatConfigurationFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): RevenueCatConfiguration | null {
  const value = (name: string) => {
    const text = environment[name]?.trim()
    return text ? text : undefined
  }
  const names = [
    'REVENUECAT_SECRET_KEY',
    'REVENUECAT_WEBHOOK_AUTHORIZATION',
    'REVENUECAT_WEBHOOK_SIGNING_SECRET',
    'REVENUECAT_ENTITLEMENT_ID',
    'REVENUECAT_ACCEPT_SANDBOX',
  ]
  if (names.every((name) => value(name) === undefined)) return null
  const secretKey = value('REVENUECAT_SECRET_KEY')
  const webhookAuthorization = value('REVENUECAT_WEBHOOK_AUTHORIZATION')
  const signing = value('REVENUECAT_WEBHOOK_SIGNING_SECRET')
  const entitlementId = value('REVENUECAT_ENTITLEMENT_ID') ?? 'plus'
  const sandbox = value('REVENUECAT_ACCEPT_SANDBOX') ?? '1'
  if (
    !secretKey ||
    !/^sk_[A-Za-z0-9]{16,128}$/.test(secretKey) ||
    !webhookAuthorization ||
    webhookAuthorization.length < 32 ||
    webhookAuthorization.length > 512 ||
    /[\r\n]/.test(webhookAuthorization) ||
    (signing !== undefined && (signing.length < 16 || /[\r\n]/.test(signing))) ||
    !/^[A-Za-z0-9_.-]{1,64}$/.test(entitlementId) ||
    !['0', '1'].includes(sandbox)
  )
    throw invalidConfiguration()
  return {
    secretKey,
    webhookAuthorization,
    ...(signing ? { webhookSigningSecret: signing } : {}),
    entitlementId,
    acceptSandbox: sandbox === '1',
  }
}

async function revenueCat(
  configuration: RevenueCatConfiguration,
  method: 'GET' | 'DELETE',
  appUserId: string,
): Promise<unknown> {
  let response: Response
  try {
    response = await (configuration.fetch ?? fetch)(
      `${API}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          authorization: `Bearer ${configuration.secretKey}`,
          accept: 'application/json',
        },
      },
    )
  } catch {
    throw new RevenueCatRequestError(0)
  }
  if (method === 'DELETE' && response.status === 404) return null
  // RevenueCat bodies can contain receipts and personal data: only the status is kept.
  if (!response.ok) throw new RevenueCatRequestError(response.status)
  try {
    return await response.json()
  } catch {
    throw new RevenueCatRequestError(502)
  }
}

const date = z.string().datetime({ offset: true }).nullish()
const subscriberResponse = z.object({
  subscriber: z.object({
    management_url: z.string().nullish(),
    entitlements: z.record(
      z.string(),
      z.object({
        expires_date: date,
        grace_period_expires_date: date,
        product_identifier: z.string().min(1).max(255),
      }),
    ),
    subscriptions: z
      .record(
        z.string(),
        z.object({
          store: z.string(),
          is_sandbox: z.boolean().nullish(),
          unsubscribe_detected_at: date,
          billing_issues_detected_at: date,
        }),
      )
      .nullish(),
  }),
})
const iso = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null)
const httpsUrl = (value: string | null | undefined) => {
  if (!value || value.length > 2048) return null
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

export type StoreRefreshOutcome = 'stored' | 'cleared' | 'unknown_profile'

/**
 * Re-reads one profile's customer from RevenueCat and stores the state of the Plus entitlement
 * (or removes it). Only existing hosted profiles are looked up: RevenueCat's v1 read creates a
 * customer as a side effect, which must never happen for a deleted profile.
 */
export async function refreshStoreEntitlement(
  configuration: RevenueCatConfiguration,
  trustedDb: Database,
  profileId: string,
): Promise<StoreRefreshOutcome> {
  if (!PROFILE_ID.test(profileId)) return 'unknown_profile'
  const [profile] = await trustedDb
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
  if (!profile) return 'unknown_profile'
  const parsed = subscriberResponse.safeParse(await revenueCat(configuration, 'GET', profileId))
  if (!parsed.success) throw new RevenueCatRequestError(502)
  const subscriber = parsed.data.subscriber
  const entitlement = subscriber.entitlements[configuration.entitlementId]
  const product = entitlement
    ? subscriber.subscriptions?.[entitlement.product_identifier]
    : undefined
  const store = product ? STORES[product.store.toLowerCase()] : undefined
  const clear = async () => {
    await trustedDb.delete(storeEntitlements).where(eq(storeEntitlements.profileId, profileId))
    return 'cleared' as const
  }
  // Web subscriptions are Stripe's (billing.ts); other stores are not offered.
  if (!entitlement || !product || !store) return clear()
  if (product.is_sandbox && !configuration.acceptSandbox) return clear()
  const row = {
    profileId,
    store,
    productId: entitlement.product_identifier,
    expiresAt: iso(entitlement.expires_date),
    gracePeriodExpiresAt: iso(entitlement.grace_period_expires_date),
    willRenew: !product.unsubscribe_detected_at,
    billingIssue: Boolean(product.billing_issues_detected_at),
    sandbox: Boolean(product.is_sandbox),
    managementUrl: httpsUrl(subscriber.management_url),
    refreshedAt: new Date(configuration.now?.() ?? Date.now()).toISOString(),
  }
  if (row.expiresAt === null && row.gracePeriodExpiresAt === null && store !== 'promotional')
    return clear()
  const { profileId: _, ...changes } = row
  await trustedDb
    .insert(storeEntitlements)
    .values(row)
    .onConflictDoUpdate({ target: storeEntitlements.profileId, set: changes })
  return 'stored'
}

/** GDPR erasure of the RevenueCat customer; an unknown customer counts as erased. */
export async function deleteStoreCustomer(
  configuration: RevenueCatConfiguration,
  profileId: string,
): Promise<void> {
  if (!PROFILE_ID.test(profileId)) return
  await revenueCat(configuration, 'DELETE', profileId)
}

const digest = (value: string | Buffer) => createHash('sha256').update(value).digest()
const sameSecret = (presented: string | undefined, expected: string) =>
  presented !== undefined && timingSafeEqual(digest(presented), digest(expected))
/** `X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hex>` over `<t>.<raw body>` (HMAC-SHA256). */
export function verifyRevenueCatSignature(
  header: string | undefined,
  body: Buffer,
  secret: string,
  nowSeconds: number,
): boolean {
  if (!header || header.length > 1024) return false
  const parts = header.split(',').map((part) => part.trim().split('='))
  const timestamp = parts.find(([key]) => key === 't')?.[1]
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value ?? '')
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || !signatures.length) return false
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false
  const expected = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`), body]))
    .digest()
  return signatures.some(
    (value) =>
      /^[0-9a-f]{64}$/i.test(value) && timingSafeEqual(Buffer.from(value, 'hex'), expected),
  )
}

const ids = z.array(z.string().max(200)).max(50).nullish()
const webhookEvent = z.object({
  event: z.object({
    type: z.string().max(64),
    app_user_id: z.string().max(200).nullish(),
    original_app_user_id: z.string().max(200).nullish(),
    aliases: ids,
    transferred_from: ids,
    transferred_to: ids,
  }),
})
const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const refreshDto = z.object({ plan: z.enum(['gratis', 'plus']) })

/**
 * Registers `POST /webhooks/revenuecat` (authenticated by the dashboard `Authorization` value and,
 * when configured, the signature) and `POST /v1/billing/store/refresh`, which the app calls right
 * after a purchase or restore so Plus does not wait for the webhook.
 */
export function createStoreBillingExtension(
  configuration: RevenueCatConfiguration | null,
  options: { readonly plan: (db: Database, profileId: string) => Promise<'gratis' | 'plus'> },
): AppExtension {
  return async (app, context: AppExtensionContext) => {
    const routes = app.withTypeProvider<ZodTypeProvider>()
    const log =
      configuration?.log ?? ((entry: StoreBillingLogEntry) => console.warn(JSON.stringify(entry)))
    const afterScope = async (request: FastifyRequest, work: () => Promise<void>) => {
      if (context.service(request).db === context.db) await work()
      else context.afterCommit(request, work)
    }
    routes.post(
      '/v1/billing/store/refresh',
      {
        schema: {
          summary: 'Re-read App Store or Google Play purchases for this profile',
          body: z.object({}).strict().nullish(),
          response: {
            200: refreshDto,
            401: problemDto,
            403: problemDto,
            409: problemDto,
            502: problemDto,
          },
        },
      },
      async (request) => {
        if (!configuration)
          throw new Problem(
            409,
            'store_billing_not_configured',
            'Gli acquisti dagli store non sono disponibili in questo ambiente.',
          )
        const principal = context.principal(request)
        const service = context.service(request)
        if (principal?.role !== 'owner' || principal.profileId !== service.profileId)
          throw new Problem(
            403,
            'owner_required',
            'Solo il titolare del profilo può gestire l’abbonamento.',
          )
        const result: z.infer<typeof refreshDto> = { plan: 'gratis' }
        await afterScope(request, async () => {
          try {
            await refreshStoreEntitlement(configuration, context.db, service.profileId)
          } catch (error) {
            if (error instanceof RevenueCatRequestError) {
              log({ event: 'store_refresh_failed', status: error.status })
              throw new Problem(
                502,
                'store_billing_unavailable',
                'Non riesco a verificare l’acquisto in questo momento. Riprova tra poco: non serve pagare di nuovo.',
              )
            }
            throw error
          }
          result.plan = await options.plan(context.db, service.profileId)
        })
        return result
      },
    )

    if (!configuration) return
    await app.register(async (scope) => {
      scope.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer', bodyLimit: WEBHOOK_BODY_LIMIT },
        (_request, body, done) => done(null, body),
      )
      scope.post(
        '/webhooks/revenuecat',
        { bodyLimit: WEBHOOK_BODY_LIMIT },
        async (request, reply) => {
          const body = request.body
          const unauthorized = () =>
            reply.code(401).header('Cache-Control', 'no-store').send({ received: false })
          if (!Buffer.isBuffer(body)) return reply.code(400).send({ received: false })
          const authorization = request.headers.authorization
          if (
            !sameSecret(
              typeof authorization === 'string' ? authorization : undefined,
              configuration.webhookAuthorization,
            )
          )
            return unauthorized()
          if (configuration.webhookSigningSecret) {
            const signature = request.headers['x-revenuecat-webhook-signature']
            const now = Math.floor(
              Date.parse(configuration.now?.() ?? new Date().toISOString()) / 1000,
            )
            if (
              !verifyRevenueCatSignature(
                typeof signature === 'string' ? signature : undefined,
                body,
                configuration.webhookSigningSecret,
                now,
              )
            )
              return unauthorized()
          }
          let parsed: z.infer<typeof webhookEvent>
          try {
            parsed = webhookEvent.parse(JSON.parse(body.toString('utf8')))
          } catch {
            return reply.code(400).send({ received: false })
          }
          const event = parsed.event
          if (event.type === 'TEST') {
            log({ event: 'store_webhook_ignored', reason: 'test' })
            return reply.send({ received: true })
          }
          // Every profile the event may concern is re-read; nothing in the payload is trusted.
          const candidates = new Set(
            [
              event.app_user_id,
              event.original_app_user_id,
              ...(event.aliases ?? []),
              ...(event.transferred_from ?? []),
              ...(event.transferred_to ?? []),
            ].filter((id): id is string => typeof id === 'string' && PROFILE_ID.test(id)),
          )
          if (!candidates.size) {
            log({ event: 'store_webhook_ignored', reason: 'no_profile' })
            return reply.send({ received: true })
          }
          try {
            for (const profileId of candidates)
              await refreshStoreEntitlement(configuration, context.db, profileId)
          } catch (error) {
            if (error instanceof RevenueCatRequestError) {
              log({ event: 'store_refresh_failed', status: error.status })
              // A non-200 answer makes RevenueCat retry (up to five times).
              if (error.transient) return reply.code(503).send({ received: false })
              return reply.send({ received: true })
            }
            throw error
          }
          return reply.send({ received: true })
        },
      )
    })
  }
}
