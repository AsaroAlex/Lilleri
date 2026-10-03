import { randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  type FinancialDataProvider,
  hasExpandedProviderContract,
  type ProviderAuthorization,
  type ProviderConnectionGrant,
  type ProviderDiscoveryMetadata,
  validateDiscoveryMetadata,
  validateProviderAuthorization,
  validateProviderConnectionGrant,
} from '@lilleri/financial-providers'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  type ConsentEventAction,
  consentEvents,
  consentLifecycles,
} from './consent-lifecycle-schema.js'
import { notFound, Problem, providerFailure } from './problem.js'
import { assertNoOutstandingRevocation } from './revocation-outbox.js'
import { DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION } from './runtime-config.js'

export interface ConsentProviderMetadata {
  readonly discovery: ProviderDiscoveryMetadata
  readonly authorization: ProviderAuthorization
}
export type ConsentLifecycleState =
  | 'active'
  | 'expiring'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'paused'
  | 'unknown'
export interface ConsentLifecycleOptions {
  readonly expiringOffsetSeconds: number
}
export interface ConsentLifecycle {
  readonly profileId: string
  readonly connectionId: string
  readonly consentId: string | null
  readonly revision: number
  readonly state: ConsentLifecycleState
  readonly paused: boolean
  readonly source: 'provider' | 'legacy'
  readonly authorization: ProviderAuthorization
  readonly providerMetadata: ProviderDiscoveryMetadata | null
  readonly updatedAt: string
  readonly lastSyncedAt: string | null
  readonly blockedReason: string | null
}
type ConnectionRow = typeof schema.connections.$inferSelect
type ConsentRow = typeof schema.consents.$inferSelect
type LifecycleRow = typeof consentLifecycles.$inferSelect
const identifier = z.string().min(1).max(256)
const revisionSchema = z.number().int().min(0).max(2_147_483_645)
const changed = () =>
  new Problem(
    409,
    'consent_changed',
    'Il collegamento è cambiato. Aggiorna i dati prima di continuare.',
  )
const inactive = (code = 'consent_inactive') =>
  new Problem(
    409,
    code,
    code === 'connection_paused'
      ? 'Il collegamento è in pausa. Riprendilo prima di aggiornare.'
      : 'Il collegamento richiede un rinnovo o una nuova autorizzazione prima di aggiornare.',
  )
const unavailable = () =>
  new Problem(
    409,
    'consent_metadata_unavailable',
    'I dati dell’autorizzazione non sono disponibili. Verifica il collegamento prima di aggiornare.',
  )

function instant(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw unavailable()
  return new Date(timestamp).toISOString()
}
function checkedOptions(options: ConsentLifecycleOptions): ConsentLifecycleOptions {
  if (
    !Number.isSafeInteger(options.expiringOffsetSeconds) ||
    options.expiringOffsetSeconds < 0 ||
    options.expiringOffsetSeconds > 2_592_000
  )
    throw new Error('Invalid consent lifecycle timing configuration')
  return options
}
async function lockConnection(
  db: Database,
  profileId: string,
  connectionId: string,
): Promise<ConnectionRow> {
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .for('update')
  if (!profile) throw notFound()
  const [connection] = await db
    .select()
    .from(schema.connections)
    .where(
      and(eq(schema.connections.profileId, profileId), eq(schema.connections.id, connectionId)),
    )
    .for('update')
  if (!connection) throw notFound()
  return connection
}
async function findConnection(db: Database, profileId: string, connectionId: string) {
  const [connection] = await db
    .select()
    .from(schema.connections)
    .where(
      and(eq(schema.connections.profileId, profileId), eq(schema.connections.id, connectionId)),
    )
  if (!connection) throw notFound()
  return connection
}
async function currentConsent(
  db: Database,
  profileId: string,
  connectionId: string,
): Promise<ConsentRow | null> {
  const [active] = await db
    .select()
    .from(schema.consents)
    .where(
      and(
        eq(schema.consents.profileId, profileId),
        eq(schema.consents.connectionId, connectionId),
        isNull(schema.consents.revokedAt),
      ),
    )
    .orderBy(desc(schema.consents.grantedAt), desc(schema.consents.id))
  if (active) return active
  const [latest] = await db
    .select()
    .from(schema.consents)
    .where(
      and(eq(schema.consents.profileId, profileId), eq(schema.consents.connectionId, connectionId)),
    )
    .orderBy(desc(schema.consents.grantedAt), desc(schema.consents.id))
  return latest ?? null
}
function legacyMetadata(connection: ConnectionRow): ProviderDiscoveryMetadata {
  return {
    providerId: connection.providerId,
    environment: connection.providerId === 'mock-italian' ? 'synthetic' : 'live',
    coverageVersion: 'legacy-authorization/unknown',
    pagination: { maxPageSize: 1, maxPages: 1, maxCursorBytes: 1 },
    refresh: { userPresent: 'unknown', unattendedBudget: null },
    renewal: 'unknown',
  }
}
function legacyAuthorization(
  connection: ConnectionRow,
  consent: ConsentRow | null,
): ProviderAuthorization {
  return {
    providerId: connection.providerId,
    institutionId: connection.institutionId,
    state:
      consent?.revokedAt || connection.status === 'revoked'
        ? 'revoked'
        : consent && connection.status === 'active'
          ? 'active'
          : connection.status === 'expired'
            ? 'expired'
            : 'unknown',
    consentExpiresAt: consent?.expiresAt ?? null,
    scaDueAt: null,
    providerSessionExpiresAt: null,
    tokenExpiresAt: null,
    requiredActions: [],
  }
}
function validatedMetadata(
  connection: ConnectionRow,
  consent: ConsentRow,
  metadata: ConsentProviderMetadata,
): ConsentProviderMetadata {
  try {
    const discovery = validateDiscoveryMetadata(metadata.discovery)
    const authorization = validateProviderAuthorization(metadata.authorization, discovery)
    if (
      discovery.providerId !== connection.providerId ||
      authorization.institutionId !== connection.institutionId ||
      authorization.consentExpiresAt !== consent.expiresAt ||
      consent.provider !== connection.providerId
    )
      throw new Error('Authorization scope mismatch')
    return { discovery, authorization }
  } catch {
    throw unavailable()
  }
}
function stateOf(
  connection: ConnectionRow,
  consent: ConsentRow | null,
  row: LifecycleRow | null,
  authorization: ProviderAuthorization,
  now: string,
  options: ConsentLifecycleOptions,
): Pick<ConsentLifecycle, 'state' | 'blockedReason'> {
  const observed = Date.parse(now)
  if (connection.status === 'revoked' || consent?.revokedAt || authorization.state === 'revoked')
    return { state: 'revoked', blockedReason: 'revoked' }
  if (!consent || authorization.consentExpiresAt === null || (row && row.consentId !== consent.id))
    return { state: 'unknown', blockedReason: 'authorization_unknown' }
  if (
    Date.parse(authorization.consentExpiresAt) <= observed ||
    connection.status === 'expired' ||
    authorization.state === 'expired'
  )
    return { state: 'expired', blockedReason: 'consent_expired' }
  if (authorization.scaDueAt !== null && Date.parse(authorization.scaDueAt) <= observed)
    return { state: 'expired', blockedReason: 'sca_required' }
  if (
    authorization.providerSessionExpiresAt !== null &&
    Date.parse(authorization.providerSessionExpiresAt) <= observed
  )
    return { state: 'expired', blockedReason: 'provider_session_expired' }
  if (row?.paused) return { state: 'paused', blockedReason: 'connection_paused' }
  if (authorization.tokenExpiresAt !== null && Date.parse(authorization.tokenExpiresAt) <= observed)
    return { state: 'error', blockedReason: 'provider_token_expired' }
  if (
    row?.providerError ||
    connection.status === 'error' ||
    authorization.state === 'requires_action'
  )
    return {
      state: 'error',
      blockedReason:
        row?.providerError === 'unavailable' ? 'provider_unavailable' : 'provider_action_required',
    }
  if (authorization.state !== 'active')
    return { state: 'unknown', blockedReason: 'authorization_unknown' }
  const terms = [
    authorization.consentExpiresAt,
    ...authorization.requiredActions.map((action) => action.dueAt),
  ]
    .filter((value): value is string => value !== null)
    .map(Date.parse)
  if (
    options.expiringOffsetSeconds > 0 &&
    terms.some((term) => term > observed && term - observed <= options.expiringOffsetSeconds * 1000)
  )
    return { state: 'expiring', blockedReason: null }
  return { state: 'active', blockedReason: null }
}
export async function readConsentLifecycle(
  db: Database,
  profileId: string,
  connectionId: string,
  now: string,
  options: ConsentLifecycleOptions = DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION,
): Promise<ConsentLifecycle> {
  const at = instant(now)
  checkedOptions(options)
  const connection = await findConnection(db, profileId, connectionId)
  const consent = await currentConsent(db, profileId, connectionId)
  const [row] = await db
    .select()
    .from(consentLifecycles)
    .where(
      and(
        eq(consentLifecycles.profileId, profileId),
        eq(consentLifecycles.connectionId, connectionId),
      ),
    )
  let authorization: ProviderAuthorization
  let providerMetadata: ProviderDiscoveryMetadata | null = null
  try {
    if (row && consent) {
      const metadata = row.providerMetadata ?? legacyMetadata(connection)
      const validated = validatedMetadata(connection, consent, {
        discovery: metadata,
        authorization: row.authorization,
      })
      authorization = validated.authorization
      providerMetadata = row.providerMetadata ? validated.discovery : null
    } else
      authorization = validateProviderAuthorization(
        legacyAuthorization(connection, consent),
        legacyMetadata(connection),
      )
  } catch {
    throw unavailable()
  }
  return {
    profileId,
    connectionId,
    consentId: consent?.id ?? null,
    revision: row?.revision ?? 0,
    ...stateOf(connection, consent, row ?? null, authorization, at, options),
    paused: row?.paused ?? false,
    source: row?.source ?? 'legacy',
    authorization,
    providerMetadata,
    updatedAt: row?.updatedAt ?? consent?.grantedAt ?? connection.createdAt,
    lastSyncedAt: connection.lastSyncedAt,
  }
}
async function appendEvent(
  db: Database,
  lifecycle: ConsentLifecycle,
  action: ConsentEventAction,
  source: 'provider' | 'user' | 'legacy',
) {
  if (!lifecycle.consentId) throw unavailable()
  await db.insert(consentEvents).values({
    id: `consent_event_${randomUUID()}`,
    profileId: lifecycle.profileId,
    connectionId: lifecycle.connectionId,
    consentId: lifecycle.consentId,
    revision: lifecycle.revision,
    action,
    source,
    authorization: lifecycle.authorization,
    providerMetadata: lifecycle.providerMetadata,
    occurredAt: instant(lifecycle.updatedAt),
  })
}
async function materializeLegacy(
  db: Database,
  lifecycle: ConsentLifecycle,
  now: string,
): Promise<ConsentLifecycle> {
  if (lifecycle.revision > 0) return lifecycle
  if (!lifecycle.consentId) throw unavailable()
  const consentId = lifecycle.consentId
  const value = { ...lifecycle, revision: 1, updatedAt: instant(now) }
  await db.insert(consentLifecycles).values({
    profileId: value.profileId,
    connectionId: value.connectionId,
    consentId,
    revision: value.revision,
    paused: value.paused,
    authorization: value.authorization,
    providerMetadata: value.providerMetadata,
    source: value.source,
    updatedAt: value.updatedAt,
  })
  await appendEvent(db, value, 'legacy_imported', 'legacy')
  return value
}

/** Caller transaction owns atomic bank grant creation and profile/connection locking. */
export async function recordConsentGranted(
  db: Database,
  profileId: string,
  connectionId: string,
  consentId: string,
  metadata: ConsentProviderMetadata,
  now: string,
  action: 'granted' | 'renewed' = 'granted',
) {
  const at = instant(now)
  const connection = await lockConnection(db, profileId, connectionId)
  const [consent] = await db
    .select()
    .from(schema.consents)
    .where(
      and(
        eq(schema.consents.profileId, profileId),
        eq(schema.consents.connectionId, connectionId),
        eq(schema.consents.id, consentId),
      ),
    )
  if (!consent) throw notFound()
  const checked = validatedMetadata(connection, consent, metadata)
  if (
    consent.revokedAt ||
    checked.authorization.state !== 'active' ||
    checked.authorization.consentExpiresAt === null ||
    Date.parse(checked.authorization.consentExpiresAt) <= Date.parse(at)
  )
    throw inactive()
  const [old] = await db
    .select()
    .from(consentLifecycles)
    .where(
      and(
        eq(consentLifecycles.profileId, profileId),
        eq(consentLifecycles.connectionId, connectionId),
      ),
    )
    .for('update')
  const revision = (old?.revision ?? 0) + 1
  if (
    !revisionSchema.safeParse(revision).success ||
    (action === 'renewed' && old && old.consentId !== consentId)
  )
    throw changed()
  const values = {
    profileId,
    connectionId,
    consentId,
    revision,
    paused: action === 'renewed' ? (old?.paused ?? false) : false,
    authorization: checked.authorization,
    providerMetadata: checked.discovery,
    source: 'provider' as const,
    providerError: null,
    updatedAt: at,
  }
  await db
    .insert(consentLifecycles)
    .values(values)
    .onConflictDoUpdate({ target: consentLifecycles.connectionId, set: values })
  const result = await readConsentLifecycle(db, profileId, connectionId, at)
  await appendEvent(db, result, action, 'provider')
  return result
}

export async function recordConsentRevoked(
  db: Database,
  profileId: string,
  connectionId: string,
  now: string,
) {
  const at = instant(now)
  await lockConnection(db, profileId, connectionId)
  let lifecycle = await readConsentLifecycle(db, profileId, connectionId, at)
  if (!lifecycle.consentId) return lifecycle
  const [stored] = await db
    .select()
    .from(consentLifecycles)
    .where(
      and(
        eq(consentLifecycles.profileId, profileId),
        eq(consentLifecycles.connectionId, connectionId),
      ),
    )
  if (stored?.authorization.state === 'revoked') return lifecycle
  lifecycle = await materializeLegacy(db, lifecycle, at)
  const authorization = {
    ...lifecycle.authorization,
    state: 'revoked' as const,
    requiredActions: [],
  }
  await db
    .update(consentLifecycles)
    .set({
      revision: lifecycle.revision + 1,
      paused: false,
      authorization,
      providerError: null,
      updatedAt: at,
    })
    .where(
      and(
        eq(consentLifecycles.profileId, profileId),
        eq(consentLifecycles.connectionId, connectionId),
      ),
    )
  const result = await readConsentLifecycle(db, profileId, connectionId, at)
  await appendEvent(db, result, 'revoked', 'user')
  return result
}

/** Access is denied before any provider I/O; the caller retains the profile/connection lock. */
export async function assertLifecycleAllowsRefresh(
  db: Database,
  profileId: string,
  connectionId: string,
  now: string,
) {
  const lifecycle = await readConsentLifecycle(db, profileId, connectionId, now)
  if (lifecycle.state === 'paused') throw inactive('connection_paused')
  if (lifecycle.state !== 'active' && lifecycle.state !== 'expiring') throw inactive()
  await assertNoOutstandingRevocation(db, profileId, connectionId)
  return lifecycle
}

export async function recordConsentProviderSignal(
  db: Database,
  profileId: string,
  connectionId: string,
  signal: 'unavailable' | 'requires_action' | 'recovered',
  now: string,
) {
  const at = instant(now)
  await lockConnection(db, profileId, connectionId)
  const lifecycle = await materializeLegacy(
    db,
    await readConsentLifecycle(db, profileId, connectionId, at),
    at,
  )
  if (lifecycle.state === 'revoked') throw inactive()
  await db
    .update(consentLifecycles)
    .set({
      revision: lifecycle.revision + 1,
      providerError: signal === 'recovered' ? null : signal,
      updatedAt: at,
    })
    .where(
      and(
        eq(consentLifecycles.profileId, profileId),
        eq(consentLifecycles.connectionId, connectionId),
      ),
    )
  const result = await readConsentLifecycle(db, profileId, connectionId, at)
  await appendEvent(
    db,
    result,
    signal === 'recovered' ? 'provider_recovered' : 'provider_error',
    'provider',
  )
  return result
}

export class ConsentLifecycleService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly provider: FinancialDataProvider,
    readonly now: () => string = () => new Date().toISOString(),
    readonly options: ConsentLifecycleOptions = DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION,
  ) {
    checkedOptions(options)
  }
  async get(connectionId: string, db: Database = this.db) {
    return readConsentLifecycle(db, this.profileId, connectionId, this.now(), this.options)
  }
  async list(db: Database = this.db) {
    const connections = await db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.profileId, this.profileId))
      .orderBy(asc(schema.connections.createdAt), asc(schema.connections.id))
    const lifecycles: ConsentLifecycle[] = []
    for (const connection of connections)
      if (connection.providerId !== 'local-manual')
        lifecycles.push(await this.get(connection.id, db))
    return lifecycles
  }
  async history(connectionId: string, db: Database = this.db) {
    await findConnection(db, this.profileId, connectionId)
    return (
      await db
        .select()
        .from(consentEvents)
        .where(
          and(
            eq(consentEvents.profileId, this.profileId),
            eq(consentEvents.connectionId, connectionId),
          ),
        )
        .orderBy(asc(consentEvents.revision))
    ).map(({ householdId: _householdId, ...event }) => event)
  }
  async pause(connectionId: string, revision: number) {
    return this.setPaused(connectionId, revision, true)
  }
  async resume(connectionId: string, revision: number) {
    return this.setPaused(connectionId, revision, false)
  }
  private async setPaused(connectionId: string, expectedRevision: number, paused: boolean) {
    if (!revisionSchema.safeParse(expectedRevision).success) throw changed()
    return this.db.transaction(async (db) => {
      const connection = await lockConnection(db, this.profileId, connectionId)
      if (connection.providerId !== this.provider.id) throw notFound()
      const at = instant(this.now())
      let lifecycle = await readConsentLifecycle(db, this.profileId, connectionId, at, this.options)
      if (lifecycle.revision !== expectedRevision) throw changed()
      if (!lifecycle.consentId || lifecycle.state === 'revoked' || lifecycle.state === 'unknown')
        throw inactive()
      if (!paused && (lifecycle.state === 'expired' || lifecycle.authorization.state !== 'active'))
        throw inactive()
      if (lifecycle.paused === paused) return lifecycle
      lifecycle = await materializeLegacy(db, lifecycle, at)
      await db
        .update(consentLifecycles)
        .set({ revision: lifecycle.revision + 1, paused, updatedAt: at })
        .where(
          and(
            eq(consentLifecycles.profileId, this.profileId),
            eq(consentLifecycles.connectionId, connectionId),
          ),
        )
      const result = await readConsentLifecycle(db, this.profileId, connectionId, at, this.options)
      await appendEvent(db, result, paused ? 'paused' : 'resumed', 'user')
      return result
    })
  }
  async renew(connectionId: string, expectedRevision: number) {
    if (!revisionSchema.safeParse(expectedRevision).success) throw changed()
    return this.db.transaction(async (db) => {
      const connection = await lockConnection(db, this.profileId, connectionId)
      if (connection.providerId !== this.provider.id) throw notFound()
      let lifecycle = await this.get(connectionId, db)
      if (lifecycle.revision !== expectedRevision) throw changed()
      if (!lifecycle.consentId || lifecycle.state === 'revoked') throw inactive()
      if (!hasExpandedProviderContract(this.provider))
        throw new Problem(
          409,
          'renewal_unsupported',
          'Questa fonte richiede un nuovo collegamento.',
        )
      const metadata = validateDiscoveryMetadata(this.provider.discoveryMetadata())
      if (metadata.renewal !== 'supported' || metadata.providerId !== connection.providerId)
        throw new Problem(
          409,
          'renewal_unsupported',
          'Questa fonte richiede un nuovo collegamento.',
        )
      await assertNoOutstandingRevocation(db, this.profileId, connectionId)
      let grant: ProviderConnectionGrant
      try {
        grant = validateProviderConnectionGrant(
          await this.provider.renewConnection({
            profileId: this.profileId,
            connectionId,
            institutionId: connection.institutionId,
            grantId: lifecycle.consentId,
          }),
          metadata,
        )
      } catch {
        throw providerFailure()
      }
      const at = instant(this.now())
      if (
        grant.redirectUrl !== null ||
        grant.authorization.state !== 'active' ||
        Date.parse(grant.consentExpiresAt) <= Date.parse(at)
      )
        throw providerFailure()
      lifecycle = await materializeLegacy(db, lifecycle, at)
      await db
        .update(schema.consents)
        .set({ expiresAt: grant.consentExpiresAt })
        .where(
          and(
            eq(schema.consents.profileId, this.profileId),
            eq(schema.consents.connectionId, connectionId),
            eq(schema.consents.id, lifecycle.consentId as string),
            isNull(schema.consents.revokedAt),
          ),
        )
      await db
        .update(schema.connections)
        .set({ status: 'active' })
        .where(
          and(
            eq(schema.connections.profileId, this.profileId),
            eq(schema.connections.id, connectionId),
          ),
        )
      await recordConsentGranted(
        db,
        this.profileId,
        connectionId,
        lifecycle.consentId as string,
        { discovery: metadata, authorization: grant.authorization },
        at,
        'renewed',
      )
      return readConsentLifecycle(db, this.profileId, connectionId, at, this.options)
    })
  }
}

const providerAuthorizationDto = z.object({
  providerId: z.string(),
  institutionId: z.string(),
  state: z.enum(['active', 'requires_action', 'expired', 'revoked', 'unknown']),
  consentExpiresAt: z.string().nullable(),
  scaDueAt: z.string().nullable(),
  providerSessionExpiresAt: z.string().nullable(),
  tokenExpiresAt: z.string().nullable(),
  requiredActions: z.array(
    z.object({
      action: z.enum(['renew_consent', 'perform_sca', 'renew_session', 'reconnect']),
      method: z.enum(['redirect', 'in_place', 'new_connection']),
      dueAt: z.string().nullable(),
      evidenceReference: z.string(),
    }),
  ),
})
const metadataDto = z.object({
  providerId: z.string(),
  environment: z.enum(['synthetic', 'sandbox', 'live']),
  coverageVersion: z.string(),
  pagination: z.object({
    maxPageSize: z.number().int(),
    maxPages: z.number().int(),
    maxCursorBytes: z.number().int(),
  }),
  refresh: z.object({
    userPresent: z.enum(['supported', 'unsupported', 'unknown']),
    unattendedBudget: z
      .object({
        requests: z.number().int(),
        windowSeconds: z.number().int(),
        evidenceReference: z.string(),
      })
      .nullable(),
  }),
  renewal: z.enum(['supported', 'unsupported', 'unknown']),
})
export const consentLifecycleDto = z.object({
  profileId: z.string(),
  connectionId: z.string(),
  consentId: z.string().nullable(),
  revision: z.number().int().nonnegative(),
  state: z.enum(['active', 'expiring', 'expired', 'revoked', 'error', 'paused', 'unknown']),
  paused: z.boolean(),
  source: z.enum(['provider', 'legacy']),
  authorization: providerAuthorizationDto,
  providerMetadata: metadataDto.nullable(),
  updatedAt: z.string(),
  lastSyncedAt: z.string().nullable(),
  blockedReason: z.string().nullable(),
})
export const consentEventDto = z.object({
  id: z.string(),
  profileId: z.string(),
  connectionId: z.string(),
  consentId: z.string(),
  revision: z.number().int().positive(),
  action: z.enum([
    'granted',
    'renewed',
    'paused',
    'resumed',
    'revoked',
    'provider_error',
    'provider_recovered',
    'legacy_imported',
  ]),
  source: z.enum(['provider', 'user', 'legacy']),
  authorization: providerAuthorizationDto,
  providerMetadata: metadataDto.nullable(),
  occurredAt: z.string(),
})
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
export function registerConsentLifecycleRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<ConsentLifecycleService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  const params = z.object({ id: identifier }).strict()
  api.get(
    '/v1/connections/:id/lifecycle',
    { schema: { params, response: { 200: consentLifecycleDto, ...errors } } },
    async (request) =>
      consentLifecycleDto.parse(await (await resolve(request)).get(request.params.id)),
  )
  api.get(
    '/v1/connections/:id/consent-events',
    { schema: { params, response: { 200: z.array(consentEventDto), ...errors } } },
    async (request) =>
      z.array(consentEventDto).parse(await (await resolve(request)).history(request.params.id)),
  )
  for (const action of ['pause', 'resume', 'renew'] as const)
    api.post(
      `/v1/connections/:id/${action}`,
      {
        schema: {
          params,
          body: z.object({ revision: revisionSchema }).strict(),
          response: { 200: consentLifecycleDto, ...errors },
        },
      },
      async (request) =>
        consentLifecycleDto.parse(
          await (await resolve(request))[action](request.params.id, request.body.revision),
        ),
    )
}
