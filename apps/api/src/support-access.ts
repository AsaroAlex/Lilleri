import { randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { and, asc, count, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { notFound, Problem } from './problem.js'
import {
  type BreakGlassReason,
  supportApprovals,
  supportEvents,
  supportGrants,
  supportRequests,
} from './support-access-schema.js'

export const supportGrantInput = z
  .object({
    ticketId: z.string().regex(/^TKT_[A-Z0-9]{8,32}$/),
    reason: z.enum(['sync_issue', 'data_rights', 'security_issue']),
    durationMinutes: z.number().int().min(1).max(15),
  })
  .strict()
export const supportGrantDto = z.object({
  id: z.string(),
  ticketId: z.string(),
  reason: z.enum(['sync_issue', 'data_rights', 'security_issue']),
  grantedAt: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable(),
  revision: z.number().int().positive(),
  state: z.enum(['active', 'expired', 'revoked']),
  scope: z.literal('masked_diagnostics'),
})
const breakGlassDto = z.object({
  id: z.string(),
  grantId: z.string(),
  reason: z.enum(['service_outage', 'security_incident']),
  requestedAt: z.string(),
  expiresAt: z.string(),
  approvalCount: z.number().int().min(0).max(2),
  state: z.enum(['awaiting_approval', 'approved', 'expired', 'revoked']),
  scope: z.literal('masked_diagnostics'),
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
}
const denied = () =>
  new Problem(403, 'support_access_denied', 'L’accesso di assistenza non è disponibile.')
const stale = () =>
  new Problem(
    409,
    'support_access_changed',
    'Il permesso è cambiato. Aggiorna la pagina e riprova.',
  )
function instant(text: string) {
  const timestamp = Date.parse(text)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== text)
    throw new Error('Support clock is invalid')
  return text
}
const iso = (timestamp: number) => new Date(timestamp).toISOString()
type Grant = typeof supportGrants.$inferSelect
function active(grant: Grant, now: string) {
  return grant.revokedAt === null && grant.grantedAt <= now && grant.expiresAt > now
}
function dto(grant: Grant, now: string): z.infer<typeof supportGrantDto> {
  return {
    id: grant.id,
    ticketId: grant.ticketId,
    reason: grant.reason,
    grantedAt: grant.grantedAt,
    expiresAt: grant.expiresAt,
    revokedAt: grant.revokedAt,
    revision: grant.revision,
    state: grant.revokedAt ? 'revoked' : grant.expiresAt <= now ? 'expired' : 'active',
    scope: 'masked_diagnostics',
  }
}
async function lockProfile(db: Database, profileId: string) {
  const [profile] = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .for('update')
  if (!profile) throw notFound()
}
async function grantFor(db: Database, profileId: string, grantId: string) {
  const [grant] = await db
    .select()
    .from(supportGrants)
    .where(and(eq(supportGrants.profileId, profileId), eq(supportGrants.id, grantId)))
    .for('update')
  if (!grant) throw notFound()
  return grant
}
async function audit(
  db: Database,
  grant: Grant,
  action: typeof supportEvents.$inferInsert.action,
  now: string,
  operatorId?: string,
  requestId?: string,
) {
  await db.insert(supportEvents).values({
    id: randomUUID(),
    profileId: grant.profileId,
    grantId: grant.id,
    requestId: requestId ?? null,
    action,
    actorKind: operatorId ? 'operator' : 'user',
    operatorId: operatorId ?? null,
    occurredAt: now,
  })
}

/** Owner-only resolver and FinancialScope must be supplied by the HTTP application. */
export class SupportAccessService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async grant(input: z.infer<typeof supportGrantInput>) {
    const parsed = supportGrantInput.safeParse(input)
    if (!parsed.success)
      throw new Problem(
        400,
        'support_grant_invalid',
        'Controlla il riferimento e la durata del permesso.',
      )
    return this.db.transaction(async (db) => {
      await lockProfile(db, this.profileId)
      const now = instant(this.now())
      const [existing] = await db
        .select({ id: supportGrants.id })
        .from(supportGrants)
        .where(
          and(
            eq(supportGrants.profileId, this.profileId),
            eq(supportGrants.ticketId, parsed.data.ticketId),
            isNull(supportGrants.revokedAt),
            gt(supportGrants.expiresAt, now),
          ),
        )
        .limit(1)
      if (existing)
        throw new Problem(
          409,
          'support_grant_active',
          'Questo riferimento ha già un permesso attivo.',
        )
      const [grant] = await db
        .insert(supportGrants)
        .values({
          id: randomUUID(),
          profileId: this.profileId,
          ticketId: parsed.data.ticketId,
          reason: parsed.data.reason,
          grantedAt: now,
          expiresAt: iso(Date.parse(now) + parsed.data.durationMinutes * 60_000),
          revokedAt: null,
          revision: 1,
        })
        .returning()
      if (!grant) throw new Error('Support grant creation failed')
      await audit(db, grant, 'granted', now)
      return dto(grant, now)
    })
  }
  async revoke(grantId: string, expectedRevision: number) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw stale()
    return this.db.transaction(async (db) => {
      await lockProfile(db, this.profileId)
      const grant = await grantFor(db, this.profileId, grantId),
        now = instant(this.now())
      if (grant.revision !== expectedRevision) throw stale()
      if (grant.revokedAt) return dto(grant, now)
      const [revoked] = await db
        .update(supportGrants)
        .set({ revokedAt: now, revision: grant.revision + 1 })
        .where(and(eq(supportGrants.profileId, this.profileId), eq(supportGrants.id, grantId)))
        .returning()
      if (!revoked) throw stale()
      await audit(db, revoked, 'revoked', now)
      return dto(revoked, now)
    })
  }
  async status() {
    const now = instant(this.now())
    const grants = await this.db
      .select()
      .from(supportGrants)
      .where(eq(supportGrants.profileId, this.profileId))
      .orderBy(desc(supportGrants.grantedAt))
      .limit(100)
    const requests = await this.db
      .select({ request: supportRequests, grant: supportGrants })
      .from(supportRequests)
      .innerJoin(
        supportGrants,
        and(
          eq(supportGrants.profileId, supportRequests.profileId),
          eq(supportGrants.id, supportRequests.grantId),
        ),
      )
      .where(eq(supportRequests.profileId, this.profileId))
      .orderBy(desc(supportRequests.requestedAt))
      .limit(100)
    const approvals = requests.length
      ? await this.db
          .select({ requestId: supportApprovals.requestId, count: count() })
          .from(supportApprovals)
          .where(
            and(
              eq(supportApprovals.profileId, this.profileId),
              inArray(
                supportApprovals.requestId,
                requests.map(({ request }) => request.id),
              ),
            ),
          )
          .groupBy(supportApprovals.requestId)
      : []
    return {
      grants: grants.map((grant) => dto(grant, now)),
      requests: requests.map(({ request, grant }) => {
        const approvalCount =
          approvals.find((approval) => approval.requestId === request.id)?.count ?? 0
        return {
          id: request.id,
          grantId: request.grantId,
          reason: request.reason,
          requestedAt: request.requestedAt,
          expiresAt: request.expiresAt,
          approvalCount,
          scope: 'masked_diagnostics' as const,
          state: grant.revokedAt
            ? ('revoked' as const)
            : request.expiresAt <= now || grant.expiresAt <= now
              ? ('expired' as const)
              : approvalCount === 2
                ? ('approved' as const)
                : ('awaiting_approval' as const),
        }
      }),
    }
  }
  async export() {
    return {
      grants: await this.db
        .select()
        .from(supportGrants)
        .where(eq(supportGrants.profileId, this.profileId))
        .orderBy(asc(supportGrants.grantedAt)),
      requests: await this.db
        .select()
        .from(supportRequests)
        .where(eq(supportRequests.profileId, this.profileId))
        .orderBy(asc(supportRequests.requestedAt)),
      approvals: await this.db
        .select()
        .from(supportApprovals)
        .where(eq(supportApprovals.profileId, this.profileId))
        .orderBy(asc(supportApprovals.approvedAt)),
      events: await this.db
        .select()
        .from(supportEvents)
        .where(eq(supportEvents.profileId, this.profileId))
        .orderBy(asc(supportEvents.occurredAt)),
    }
  }
}

export interface AuthenticatedSupportPrincipal {
  readonly operatorId: string
  readonly authenticatedAt: string
  readonly assurance: 'mfa'
}
export interface SupportOperatorIdentityPort {
  /** Implemented by a trusted authenticated operator integration; never an HTTP actor input. */
  authenticate(): Promise<AuthenticatedSupportPrincipal>
}
export interface AllowedSupportOperator {
  readonly operatorId: string
  readonly permissions: readonly ('read' | 'break_glass_read' | 'request' | 'approve')[]
}
export interface SupportOperatorOptions {
  readonly db: Database
  readonly identity: SupportOperatorIdentityPort
  readonly operators: readonly AllowedSupportOperator[]
  readonly now?: () => string
}

/** Not registered as HTTP routes. An absent real operator identity adapter enables no access. */
export class SupportOperatorService {
  private readonly db: Database
  private readonly identity: SupportOperatorIdentityPort
  private readonly operators: readonly AllowedSupportOperator[]
  private readonly now: () => string
  constructor(options: SupportOperatorOptions) {
    if (
      options.operators.length > 100 ||
      new Set(options.operators.map((operator) => operator.operatorId)).size !==
        options.operators.length ||
      options.operators.some(
        (operator) =>
          !/^op_[a-f0-9]{32}$/.test(operator.operatorId) ||
          operator.permissions.some(
            (permission) =>
              !['read', 'break_glass_read', 'request', 'approve'].includes(permission),
          ),
      )
    )
      throw new Error('Support operator allowlist is invalid')
    this.db = options.db
    this.identity = options.identity
    this.operators = options.operators.map((operator) => ({
      ...operator,
      permissions: [...operator.permissions],
    }))
    this.now = options.now ?? (() => new Date().toISOString())
  }
  private async principal(permission: 'read' | 'break_glass_read' | 'request' | 'approve') {
    let principal: AuthenticatedSupportPrincipal
    try {
      principal = await this.identity.authenticate()
    } catch {
      throw denied()
    }
    if (!principal || typeof principal !== 'object') throw denied()
    const now = instant(this.now())
    const authenticationTime = Date.parse(principal.authenticatedAt)
    const allowed = this.operators.find((operator) => operator.operatorId === principal.operatorId)
    if (
      principal.assurance !== 'mfa' ||
      !allowed?.permissions.includes(permission) ||
      !Number.isFinite(authenticationTime) ||
      authenticationTime > Date.parse(now) ||
      Date.parse(now) - authenticationTime > 300_000
    )
      throw denied()
    return principal.operatorId
  }
  private async locked<T>(
    profileId: string,
    grantId: string,
    work: (db: Database, grant: Grant, now: string) => Promise<T>,
  ) {
    return this.db.transaction(async (db) => {
      await lockProfile(db, profileId)
      const grant = await grantFor(db, profileId, grantId),
        now = instant(this.now())
      if (!active(grant, now)) throw denied()
      return work(db, grant, now)
    })
  }
  async requestBreakGlass(profileId: string, grantId: string, reason: BreakGlassReason) {
    if (!['service_outage', 'security_incident'].includes(reason)) throw denied()
    const operator = await this.principal('request')
    return this.locked(profileId, grantId, async (db, grant, now) => {
      const [request] = await db
        .insert(supportRequests)
        .values({
          id: randomUUID(),
          profileId,
          grantId,
          requestedBy: operator,
          reason,
          requestedAt: now,
          expiresAt: iso(Math.min(Date.parse(grant.expiresAt), Date.parse(now) + 900_000)),
        })
        .returning()
      if (!request) throw new Error('Support request creation failed')
      await audit(db, grant, 'break_glass_requested', now, operator, request.id)
      return {
        id: request.id,
        expiresAt: request.expiresAt,
        approvalCount: 0,
        scope: 'masked_diagnostics' as const,
      }
    })
  }
  async approveBreakGlass(profileId: string, grantId: string, requestId: string) {
    const operator = await this.principal('approve')
    return this.locked(profileId, grantId, async (db, grant, now) => {
      const [request] = await db
        .select()
        .from(supportRequests)
        .where(
          and(
            eq(supportRequests.profileId, profileId),
            eq(supportRequests.id, requestId),
            eq(supportRequests.grantId, grantId),
          ),
        )
        .for('update')
      if (!request) throw notFound()
      if (request.requestedBy === operator || request.requestedAt > now || request.expiresAt <= now)
        throw denied()
      const approvals = await db
        .select()
        .from(supportApprovals)
        .where(
          and(eq(supportApprovals.profileId, profileId), eq(supportApprovals.requestId, requestId)),
        )
      if (approvals.some((approval) => approval.approvedBy === operator) || approvals.length >= 2)
        throw new Problem(
          409,
          'support_approval_duplicate',
          'Questa approvazione non è disponibile.',
        )
      await db
        .insert(supportApprovals)
        .values({ id: randomUUID(), profileId, requestId, approvedBy: operator, approvedAt: now })
      await audit(db, grant, 'break_glass_approved', now, operator, requestId)
      return {
        id: requestId,
        approvalCount: approvals.length + 1,
        state: approvals.length === 1 ? ('approved' as const) : ('awaiting_approval' as const),
        scope: 'masked_diagnostics' as const,
      }
    })
  }
  async maskedView(profileId: string, grantId: string, breakGlassRequestId?: string) {
    const operator = await this.principal(breakGlassRequestId ? 'break_glass_read' : 'read')
    return this.locked(profileId, grantId, async (db, grant, now) => {
      if (breakGlassRequestId) {
        const [request] = await db
          .select()
          .from(supportRequests)
          .where(
            and(
              eq(supportRequests.profileId, profileId),
              eq(supportRequests.id, breakGlassRequestId),
              eq(supportRequests.grantId, grantId),
            ),
          )
        if (
          !request ||
          request.requestedBy !== operator ||
          request.requestedAt > now ||
          request.expiresAt <= now
        )
          throw denied()
        const approvals = await db
          .select({ operator: supportApprovals.approvedBy })
          .from(supportApprovals)
          .where(
            and(
              eq(supportApprovals.profileId, profileId),
              eq(supportApprovals.requestId, request.id),
            ),
          )
        if (
          new Set(approvals.map((approval) => approval.operator)).size !== 2 ||
          approvals.some((approval) => approval.operator === operator)
        )
          throw denied()
      }
      const [accounts] = await db
        .select({ count: count() })
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, profileId))
      const [transactions] = await db
        .select({ count: count() })
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, profileId))
      const health = await db
        .select({
          provider: schema.connections.providerId,
          state: schema.connections.status,
          count: count(),
        })
        .from(schema.connections)
        .where(eq(schema.connections.profileId, profileId))
        .groupBy(schema.connections.providerId, schema.connections.status)
      await audit(
        db,
        grant,
        breakGlassRequestId ? 'break_glass_read' : 'masked_view_read',
        now,
        operator,
        breakGlassRequestId,
      )
      return {
        scope: 'masked_diagnostics' as const,
        accountCount: accounts?.count ?? 0,
        transactionCount: transactions?.count ?? 0,
        providerHealth: health.map((row) => ({
          source:
            row.provider === 'mock-italian'
              ? ('synthetic' as const)
              : row.provider === 'local-manual'
                ? ('manual' as const)
                : ('unknown' as const),
          state: ['active', 'expired', 'revoked', 'error'].includes(row.state)
            ? row.state
            : 'unknown',
          count: row.count,
        })),
      }
    })
  }
}

export function registerSupportAccessRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<SupportAccessService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/support-access',
    {
      schema: {
        response: {
          200: z.object({ grants: z.array(supportGrantDto), requests: z.array(breakGlassDto) }),
          ...errors,
        },
      },
    },
    async (request) => (await resolve(request)).status(),
  )
  api.post(
    '/v1/support-access',
    { schema: { body: supportGrantInput, response: { 200: supportGrantDto, ...errors } } },
    async (request) => (await resolve(request)).grant(request.body),
  )
  api.post(
    '/v1/support-access/:id/revoke',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }).strict(),
        body: z.object({ revision: z.number().int().positive().max(2_147_483_646) }).strict(),
        response: { 200: supportGrantDto, ...errors },
      },
    },
    async (request) => (await resolve(request)).revoke(request.params.id, request.body.revision),
  )
}
