import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { type Database, schema } from '@lilleri/database'
import type {
  FinancialDataProviderV2,
  ProviderAuthorization,
  SyntheticSyncProvider,
} from '@lilleri/financial-providers'
import { and, count, eq, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { AppExtension } from './app.js'
import { type BankAuthorization, bankAuthorizations } from './bank-connections-schema.js'
import { recordConsentGranted } from './consent-lifecycle.js'
import { notFound, Problem } from './problem.js'
import type { FinancialScope } from './request-scope.js'
import { assertNoOutstandingRevocation } from './revocation-outbox.js'
import type { SyncCoordinator } from './sync-jobs.js'

export interface LiveBankInstitution {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly beta: boolean
  /** null when the provider does not declare it for this institution. */
  readonly maximumConsentDays: number | null
}
export interface LiveBankAccountPreview {
  readonly id: string
  readonly name: string
  readonly kind: 'current' | 'card' | 'cash' | 'savings'
  readonly currency: string
}
/** The redirect-based official provider port used by the hosted service. */
export interface LiveBankProvider
  extends FinancialDataProviderV2,
    Pick<SyntheticSyncProvider, 'syncMetadata' | 'openSync' | 'getSyncPage'> {
  institutions(country: string): Promise<readonly LiveBankInstitution[]>
  startAuthorization(input: {
    readonly institutionId: string
    readonly state: string
    readonly redirectUrl: string
    readonly language: 'it' | 'en'
  }): Promise<{ readonly url: string; readonly authorizationId: string; validUntil: string }>
  completeAuthorization(code: string): Promise<{
    readonly sessionId: string
    readonly institutionId: string
    readonly validUntil: string
    readonly accounts: readonly LiveBankAccountPreview[]
  }>
  registerPresence(
    sessionId: string,
    psu: { readonly ipAddress: string; readonly userAgent: string },
    ttlMs?: number,
  ): void
}
export type BankAvailabilityReason =
  | 'provider_not_configured'
  | 'plus_required'
  | 'capacity_reached'
  | null
export interface BankConnectionsOptions {
  /** null when no provider credentials are configured: routes explain the missing activation. */
  readonly provider: LiveBankProvider | null
  readonly scope: FinancialScope
  /** Exact public HTTPS origin; the callback URL is registered with the provider. */
  readonly baseURL: string
  /** Plus entitlement check on the request's RLS-scoped transaction. */
  readonly plan: (db: Database, profileId: string) => Promise<'gratis' | 'plus'>
  /** Contracted maximum of simultaneously active bank connections (cost guard); null = unlimited. */
  readonly maxActiveConnections: number | null
  readonly coordinator: (profileId: string) => Promise<SyncCoordinator>
  readonly countries: readonly string[]
  readonly evidenceReference: string
  readonly now?: () => string
  readonly onFailure?: () => void
}

export const BANK_CALLBACK_PATH = '/connect/bank/callback'
const AUTHORIZATION_TTL_MS = 15 * 60_000
const SETTLED_RETENTION_MS = 30 * 86_400_000
const MAX_OPEN_PER_PROFILE = 5
const STATE = /^[A-Za-z0-9_-]{43}$/
const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = {
  401: problemDto,
  403: problemDto,
  404: problemDto,
  409: problemDto,
  422: problemDto,
  502: problemDto,
}
const hashState = (state: string) => createHash('sha256').update(state).digest('hex')
const plus = (at: string, ms: number) => new Date(Date.parse(at) + ms).toISOString()

/** Failure codes that reach the browser as a query parameter; never provider text. */
export type BankCallbackOutcome =
  | 'connected'
  | 'cancelled'
  | 'expired'
  | 'unavailable'
  | 'institution_mismatch'
  | 'no_accounts'

export function createBankConnectionsExtension(options: BankConnectionsOptions): AppExtension {
  const now = () => new Date(options.now?.() ?? new Date().toISOString()).toISOString()
  const base = new URL(options.baseURL)
  if (base.protocol !== 'https:' || options.baseURL !== base.origin)
    throw new Error('Bank connections require an exact HTTPS origin')
  if (
    options.maxActiveConnections !== null &&
    (!Number.isSafeInteger(options.maxActiveConnections) || options.maxActiveConnections < 0)
  )
    throw new Error('Invalid bank connection capacity')
  const redirectUrl = `${base.origin}${BANK_CALLBACK_PATH}`
  const background = new Set<Promise<unknown>>()
  const track = (work: Promise<unknown>) => {
    background.add(work)
    void work.then(
      () => background.delete(work),
      () => background.delete(work),
    )
  }
  const unavailable = () =>
    new Problem(
      409,
      'bank_provider_unavailable',
      'Il collegamento automatico con le banche non è ancora attivo. Puoi aggiungere i movimenti a mano o importare un estratto conto.',
    )
  return async (app: FastifyInstance, context) => {
    const api = app.withTypeProvider<ZodTypeProvider>()
    const principalFor = (request: FastifyRequest) => {
      const principal = context.principal(request)
      if (!principal) throw new Problem(401, 'session_invalid', 'Accedi di nuovo per continuare.')
      return principal
    }
    const activeConnections = async () => {
      if (!options.provider) return 0
      const [row] = await context.db
        .select({ value: count() })
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.providerId, options.provider.id),
            eq(schema.connections.status, 'active'),
          ),
        )
      return Number(row?.value ?? 0)
    }
    /** Capacity is a soft, cross-profile cost guard read on the trusted handle before any
     * profile transaction opens (a single-connection database cannot nest the two). */
    const capacityReached = async (renewal: boolean) =>
      !renewal &&
      options.maxActiveConnections !== null &&
      (await activeConnections()) >= options.maxActiveConnections
    const availability = async (
      db: Database,
      profileId: string,
      full: boolean,
    ): Promise<BankAvailabilityReason> => {
      if (!options.provider) return 'provider_not_configured'
      if ((await options.plan(db, profileId)) !== 'plus') return 'plus_required'
      return full ? 'capacity_reached' : null
    }
    const settle = async (
      row: Pick<BankAuthorization, 'id' | 'profileId'>,
      status: 'failed' | 'expired',
      code: string,
    ) => {
      try {
        await options.scope(row.profileId, (db) =>
          db
            .update(bankAuthorizations)
            .set({ status, failureCode: code, settledAt: now() })
            .where(
              and(
                eq(bankAuthorizations.id, row.id),
                inArray(bankAuthorizations.status, ['pending', 'completing']),
              ),
            ),
        )
      } catch {
        options.onFailure?.()
      }
    }

    api.get(
      '/v1/bank/institutions',
      {
        config: { manualFinancialScope: true },
        schema: {
          querystring: z.object({ country: z.string().regex(/^[A-Z]{2}$/) }).strict(),
          response: {
            200: z.object({
              providerId: z.string().nullable(),
              available: z.boolean(),
              reason: z
                .enum(['provider_not_configured', 'plus_required', 'capacity_reached'])
                .nullable(),
              institutions: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  country: z.string(),
                  beta: z.boolean(),
                  maximumConsentDays: z.number().int().nullable(),
                }),
              ),
            }),
            ...errors,
          },
        },
      },
      async (request) => {
        const principal = principalFor(request)
        const full = await capacityReached(false)
        const reason = await options.scope(principal.profileId, (db) =>
          availability(db, principal.profileId, full),
        )
        const provider = options.provider
        if (!provider || !options.countries.includes(request.query.country))
          return { providerId: provider?.id ?? null, available: false, reason, institutions: [] }
        let institutions: readonly LiveBankInstitution[]
        try {
          institutions = await provider.institutions(request.query.country)
        } catch {
          options.onFailure?.()
          throw new Problem(
            502,
            'provider_unavailable',
            'La lista delle banche non è disponibile. Riprova tra poco.',
          )
        }
        return {
          providerId: provider.id,
          available: reason === null,
          reason,
          institutions: institutions.map((row) => ({
            id: row.id,
            name: row.name,
            country: row.country,
            beta: row.beta,
            maximumConsentDays: row.maximumConsentDays,
          })),
        }
      },
    )

    api.post(
      '/v1/bank/authorizations',
      {
        config: { manualFinancialScope: true },
        schema: {
          body: z
            .object({
              institutionId: z.string().min(4).max(256),
              language: z.enum(['it', 'en']),
              connectionId: z.string().min(1).max(200).optional(),
            })
            .strict(),
          response: { 200: z.object({ url: z.string(), expiresAt: z.string() }), ...errors },
        },
      },
      async (request) => {
        const principal = principalFor(request)
        const provider = options.provider
        if (!provider) throw unavailable()
        if (principal.role === 'viewer') throw notFound()
        const { institutionId, language, connectionId } = request.body
        const country = institutionId.slice(0, 2)
        if (!options.countries.includes(country) || institutionId[2] !== ':')
          throw new Problem(422, 'institution_unavailable', 'Questa banca non è disponibile.')
        let institutions: readonly LiveBankInstitution[]
        try {
          institutions = await provider.institutions(country)
        } catch {
          options.onFailure?.()
          throw new Problem(
            502,
            'provider_unavailable',
            'La banca non è raggiungibile. Riprova tra poco.',
          )
        }
        if (!institutions.some((row) => row.id === institutionId))
          throw new Problem(422, 'institution_unavailable', 'Questa banca non è disponibile.')
        const state = randomBytes(32).toString('base64url')
        const at = now()
        const full = await capacityReached(connectionId !== undefined)
        const row = await options.scope(principal.profileId, async (db) => {
          await db
            .select({ id: schema.profiles.id })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, principal.profileId))
            .for('update')
          const reason = await availability(db, principal.profileId, full)
          if (reason === 'plus_required')
            throw new Problem(
              409,
              'plus_required',
              'Il collegamento automatico delle banche è incluso in Lilleri Plus.',
            )
          if (reason === 'capacity_reached')
            throw new Problem(
              409,
              'bank_capacity_reached',
              'Abbiamo raggiunto il numero massimo di collegamenti attivabili oggi. Ti avviseremo appena ci sarà disponibilità.',
            )
          if (reason !== null) throw unavailable()
          await db
            .update(bankAuthorizations)
            .set({ status: 'expired', failureCode: 'expired', settledAt: at })
            .where(
              and(
                eq(bankAuthorizations.profileId, principal.profileId),
                eq(bankAuthorizations.status, 'pending'),
                lte(bankAuthorizations.expiresAt, at),
              ),
            )
          const open = await db
            .select({ id: bankAuthorizations.id })
            .from(bankAuthorizations)
            .where(
              and(
                eq(bankAuthorizations.profileId, principal.profileId),
                inArray(bankAuthorizations.status, ['pending', 'completing']),
              ),
            )
          if (open.length >= MAX_OPEN_PER_PROFILE)
            throw new Problem(
              409,
              'connection_creation_pending',
              'Completa o annulla i collegamenti già avviati prima di riprovare.',
            )
          let target: string
          if (connectionId !== undefined) {
            const [connection] = await db
              .select()
              .from(schema.connections)
              .where(
                and(
                  eq(schema.connections.profileId, principal.profileId),
                  eq(schema.connections.id, connectionId),
                ),
              )
              .for('update')
            if (
              !connection ||
              connection.providerId !== provider.id ||
              connection.institutionId !== institutionId ||
              connection.status === 'revoked'
            )
              throw notFound()
            target = connection.id
          } else {
            const [existing] = await db
              .select({ id: schema.connections.id })
              .from(schema.connections)
              .where(
                and(
                  eq(schema.connections.profileId, principal.profileId),
                  eq(schema.connections.providerId, provider.id),
                  eq(schema.connections.institutionId, institutionId),
                  ne(schema.connections.status, 'revoked'),
                ),
              )
              .limit(1)
            if (existing)
              throw new Problem(
                409,
                'already_connected',
                'Questa banca è già collegata. Usa «Ricollega» per rinnovare l’accesso.',
              )
            target = `connection_${randomUUID()}`
          }
          await assertNoOutstandingRevocation(db, principal.profileId, target)
          const [inserted] = await db
            .insert(bankAuthorizations)
            .values({
              id: `bank_authorization_${randomUUID()}`,
              profileId: principal.profileId,
              providerId: provider.id,
              institutionId,
              connectionId: target,
              purpose: connectionId === undefined ? 'connect' : 'renew',
              stateHash: hashState(state),
              status: 'pending',
              createdAt: at,
              expiresAt: plus(at, AUTHORIZATION_TTL_MS),
            })
            .returning()
          if (!inserted) throw new Error('Bank authorization insert failed')
          return inserted
        })
        try {
          const started = await provider.startAuthorization({
            institutionId,
            state,
            redirectUrl,
            language,
          })
          return { url: started.url, expiresAt: row.expiresAt }
        } catch {
          options.onFailure?.()
          await settle(row, 'failed', 'start_failed')
          throw new Problem(
            502,
            'provider_unavailable',
            'La banca non è raggiungibile. Riprova tra poco.',
          )
        }
      },
    )

    /* The bank returns the browser here through a cross-site navigation, so SameSite=Strict
     * session cookies are absent. The 256-bit single-use state, stored only as a hash and bound
     * to the profile that started the flow, is the authentication of this request. */
    api.get(
      BANK_CALLBACK_PATH,
      {
        schema: {
          querystring: z
            .object({
              state: z.string().max(200).optional(),
              code: z.string().min(1).max(4096).optional(),
              error: z.string().max(200).optional(),
              error_description: z.string().max(2000).optional(),
            })
            .passthrough(),
        },
      },
      async (request, reply) => {
        const finish = (outcome: BankCallbackOutcome) =>
          reply
            .header('Cache-Control', 'no-store')
            .header('Referrer-Policy', 'no-referrer')
            .redirect(`${base.origin}/?bank=${outcome}`, 303)
        const provider = options.provider
        const query = request.query
        const duplicated = ['state', 'code', 'error'].some((key) =>
          Array.isArray((query as Record<string, unknown>)[key]),
        )
        if (!provider || duplicated || !query.state || !STATE.test(query.state))
          return finish('expired')
        const at = now()
        const [claimed] = await context.db
          .update(bankAuthorizations)
          .set({ status: 'completing' })
          .where(
            and(
              eq(bankAuthorizations.stateHash, hashState(query.state)),
              eq(bankAuthorizations.status, 'pending'),
              eq(bankAuthorizations.providerId, provider.id),
            ),
          )
          .returning()
        if (!claimed) return finish('expired')
        if (claimed.expiresAt <= at) {
          await settle(claimed, 'expired', 'expired')
          return finish('expired')
        }
        if (query.error || !query.code) {
          await settle(
            claimed,
            'failed',
            query.error === 'access_denied' ? 'cancelled' : 'bank_error',
          )
          return finish(query.error === 'access_denied' ? 'cancelled' : 'unavailable')
        }
        let session: Awaited<ReturnType<LiveBankProvider['completeAuthorization']>>
        try {
          session = await provider.completeAuthorization(query.code)
        } catch {
          options.onFailure?.()
          await settle(claimed, 'failed', 'exchange_failed')
          return finish('unavailable')
        }
        const discard = async (code: string, outcome: BankCallbackOutcome) => {
          await provider
            .disconnect({
              profileId: claimed.profileId,
              connectionId: claimed.connectionId,
              grantId: session.sessionId,
            })
            .catch(() => options.onFailure?.())
          await settle(claimed, 'failed', code)
          return finish(outcome)
        }
        if (session.institutionId !== claimed.institutionId)
          return discard('institution_mismatch', 'institution_mismatch')
        if (!session.accounts.length) return discard('no_accounts', 'no_accounts')
        if (!Number.isFinite(Date.parse(session.validUntil)) || session.validUntil <= at)
          return discard('exchange_failed', 'unavailable')
        const validUntil = new Date(session.validUntil).toISOString()
        let previousConsents: string[] = []
        try {
          previousConsents = await options.scope(claimed.profileId, async (db) => {
            await db
              .select({ id: schema.profiles.id })
              .from(schema.profiles)
              .where(eq(schema.profiles.id, claimed.profileId))
              .for('update')
            const [current] = await db
              .select()
              .from(bankAuthorizations)
              .where(
                and(
                  eq(bankAuthorizations.id, claimed.id),
                  eq(bankAuthorizations.status, 'completing'),
                ),
              )
              .for('update')
            if (!current) throw new Error('Authorization changed')
            await assertNoOutstandingRevocation(db, claimed.profileId, claimed.connectionId)
            const [connection] = await db
              .select()
              .from(schema.connections)
              .where(
                and(
                  eq(schema.connections.profileId, claimed.profileId),
                  eq(schema.connections.id, claimed.connectionId),
                ),
              )
              .for('update')
            if (claimed.purpose === 'renew') {
              if (!connection || connection.status === 'revoked')
                throw new Error('Connection changed')
              await db
                .update(schema.connections)
                .set({ status: 'active' })
                .where(eq(schema.connections.id, connection.id))
            } else {
              if (connection) throw new Error('Connection changed')
              await db.insert(schema.connections).values({
                id: claimed.connectionId,
                profileId: claimed.profileId,
                providerId: provider.id,
                institutionId: claimed.institutionId,
                status: 'active',
                createdAt: at,
                lastSyncedAt: null,
              })
            }
            const replaced = await db
              .update(schema.consents)
              .set({ revokedAt: at })
              .where(
                and(
                  eq(schema.consents.profileId, claimed.profileId),
                  eq(schema.consents.connectionId, claimed.connectionId),
                  isNull(schema.consents.revokedAt),
                ),
              )
              .returning({ id: schema.consents.id })
            await db.insert(schema.consents).values({
              id: session.sessionId,
              profileId: claimed.profileId,
              connectionId: claimed.connectionId,
              purpose: 'account_information',
              grantedAt: at,
              expiresAt: validUntil,
              revokedAt: null,
              provider: provider.id,
            })
            const authorization: ProviderAuthorization = {
              providerId: provider.id,
              institutionId: claimed.institutionId,
              state: 'active',
              consentExpiresAt: validUntil,
              scaDueAt: null,
              providerSessionExpiresAt: validUntil,
              tokenExpiresAt: null,
              requiredActions: [
                {
                  action: 'renew_consent',
                  method: 'redirect',
                  dueAt: validUntil,
                  evidenceReference: options.evidenceReference,
                },
              ],
            }
            await recordConsentGranted(
              db,
              claimed.profileId,
              claimed.connectionId,
              session.sessionId,
              { discovery: provider.discoveryMetadata(), authorization },
              at,
            )
            await db
              .update(bankAuthorizations)
              .set({ status: 'completed', consentId: session.sessionId, settledAt: at })
              .where(eq(bankAuthorizations.id, claimed.id))
            return replaced.map((row) => row.id)
          })
        } catch {
          options.onFailure?.()
          return discard('apply_failed', 'unavailable')
        }
        for (const grantId of previousConsents)
          if (grantId !== session.sessionId)
            track(
              provider
                .disconnect({
                  profileId: claimed.profileId,
                  connectionId: claimed.connectionId,
                  grantId,
                })
                .catch(() => options.onFailure?.()),
            )
        const forwarded = String(request.headers['x-forwarded-for'] ?? '')
          .split(',')[0]
          ?.trim()
        const ipAddress = forwarded && isIP(forwarded) ? forwarded : request.ip
        const userAgent = String(request.headers['user-agent'] ?? '').slice(0, 512)
        if (isIP(ipAddress) && userAgent)
          provider.registerPresence(session.sessionId, { ipAddress, userAgent })
        track(
          (async () => {
            const coordinator = await options.coordinator(claimed.profileId)
            const job = await coordinator.start(claimed.connectionId, {
              requestId: `bank_${claimed.id.slice(-36)}`,
              mode: 'user_present',
            })
            await coordinator.wait(job.id)
          })().catch(() => options.onFailure?.()),
        )
        return finish('connected')
      },
    )

    // A manual refresh of an official connection is a Plus benefit: refuse it before queuing.
    app.addHook('preHandler', async (request) => {
      const provider = options.provider
      if (
        !provider ||
        request.method !== 'POST' ||
        (request.routeOptions.url !== '/v1/sync/start' &&
          request.routeOptions.url !== '/v1/connections/:id/sync')
      )
        return
      const principal = context.principal(request)
      if (!principal) return
      const body = request.body as { connectionId?: unknown } | undefined
      const params = request.params as { id?: unknown } | undefined
      const connectionId =
        typeof body?.connectionId === 'string'
          ? body.connectionId
          : typeof params?.id === 'string'
            ? params.id
            : null
      if (!connectionId) return
      const blocked = await options.scope(principal.profileId, async (db) => {
        const [connection] = await db
          .select({ providerId: schema.connections.providerId })
          .from(schema.connections)
          .where(
            and(
              eq(schema.connections.profileId, principal.profileId),
              eq(schema.connections.id, connectionId),
            ),
          )
        return (
          connection?.providerId === provider.id &&
          (await options.plan(db, principal.profileId)) !== 'plus'
        )
      })
      if (blocked)
        throw new Problem(
          409,
          'plus_required',
          'L’aggiornamento automatico dalla banca è incluso in Lilleri Plus.',
        )
    })
    const janitor = setInterval(() => {
      const at = now()
      track(
        (async () => {
          await context.db
            .update(bankAuthorizations)
            .set({ status: 'expired', failureCode: 'expired', settledAt: at })
            .where(
              and(
                inArray(bankAuthorizations.status, ['pending', 'completing']),
                lt(bankAuthorizations.expiresAt, plus(at, -AUTHORIZATION_TTL_MS)),
              ),
            )
          await context.db
            .delete(bankAuthorizations)
            .where(
              or(
                and(
                  inArray(bankAuthorizations.status, ['completed', 'failed', 'expired']),
                  lt(bankAuthorizations.settledAt, plus(at, -SETTLED_RETENTION_MS)),
                ),
              ),
            )
        })().catch(() => options.onFailure?.()),
      )
    }, 10 * 60_000)
    janitor.unref()
    app.addHook('onClose', async () => {
      clearInterval(janitor)
      while (background.size) await Promise.allSettled([...background])
    })
  }
}
