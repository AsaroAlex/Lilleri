import { randomUUID } from 'node:crypto'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import Fastify, { type FastifyRequest } from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { Problem } from '../src/problem.js'
import { DemoService } from '../src/service.js'
import {
  type AuthenticatedSupportPrincipal,
  registerSupportAccessRoutes,
  SupportAccessService,
  SupportOperatorService,
} from '../src/support-access.js'
import {
  supportApprovals,
  supportEvents,
  supportGrants,
  supportRequests,
} from '../src/support-access-schema.js'

let handle: DatabaseHandle
const profiles: string[] = []
const op = (number: number) => `op_${number.toString(16).padStart(32, '0')}`
const operators = [
  { operatorId: op(1), permissions: ['request', 'approve', 'break_glass_read'] as const },
  { operatorId: op(2), permissions: ['approve'] as const },
  { operatorId: op(3), permissions: ['approve'] as const },
  { operatorId: op(4), permissions: ['read'] as const },
]
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  if (!handle) return
  for (const profileId of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle.close()
})
async function fixture() {
  const profileId = `support_${randomUUID()}`
  profiles.push(profileId)
  let clock = '2026-10-03T12:00:00.000Z'
  const now = () => clock
  await new DemoService(handle.db, profileId, new MockItalianProvider(), now).bootstrap(true)
  const user = <T>(work: (service: SupportAccessService) => Promise<T>) =>
    handle.withProfile(profileId, (db) => work(new SupportAccessService(db, profileId, now)))
  const operator = (id: number, override?: Partial<AuthenticatedSupportPrincipal>) =>
    new SupportOperatorService({
      db: handle.db,
      operators,
      now,
      // Explicitly synthetic trusted adapter for these tests, never a runtime authentication claim.
      identity: {
        authenticate: async () => ({
          operatorId: op(id),
          authenticatedAt: now(),
          assurance: 'mfa',
          ...override,
        }),
      },
    })
  const grant = (durationMinutes = 15, ticketId = 'TKT_SYNTHETIC01') =>
    user((service) => service.grant({ ticketId, reason: 'sync_issue', durationMinutes }))
  return {
    profileId,
    now,
    user,
    operator,
    grant,
    advance: (minutes: number) => {
      clock = new Date(Date.parse(clock) + minutes * 60_000).toISOString()
    },
  }
}
async function approved(f: Awaited<ReturnType<typeof fixture>>) {
  const grant = await f.grant()
  const request = await f.operator(1).requestBreakGlass(f.profileId, grant.id, 'security_incident')
  await f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id)
  await f.operator(3).approveBreakGlass(f.profileId, grant.id, request.id)
  return { grant, request }
}

describe('local owner grants and dual approval masked diagnostics', () => {
  test('strict user permission is at most 15 minutes, structured ticket only and no supplied actor', async () => {
    const f = await fixture(),
      grant = await f.grant()
    expect(grant).toMatchObject({
      state: 'active',
      scope: 'masked_diagnostics',
      revision: 1,
      expiresAt: '2026-10-03T12:15:00.000Z',
    })
    await expect(f.grant()).rejects.toMatchObject({ code: 'support_grant_active' })
    await expect(f.grant(16, 'TKT_SYNTHETIC02')).rejects.toMatchObject({
      code: 'support_grant_invalid',
    })
    await expect(f.grant(15, 'personal@example.com')).rejects.toMatchObject({
      code: 'support_grant_invalid',
    })
    await expect(
      f.user((service) =>
        service.grant({
          ticketId: 'TKT_SYNTHETIC03',
          reason: 'sync_issue',
          durationMinutes: 1,
          actor: op(1),
        } as never),
      ),
    ).rejects.toMatchObject({ code: 'support_grant_invalid' })
    expect((await f.user((service) => service.status())).grants).toHaveLength(1)
  })
  test('grant revoke is optimistic, irreversible and atomically recorded', async () => {
    const f = await fixture(),
      grant = await f.grant()
    await expect(f.user((service) => service.revoke(grant.id, 2))).rejects.toMatchObject({
      code: 'support_access_changed',
    })
    const revoked = await f.user((service) => service.revoke(grant.id, 1))
    expect(revoked).toMatchObject({ revision: 2, state: 'revoked', revokedAt: f.now() })
    expect(await f.user((service) => service.revoke(grant.id, 2))).toEqual(revoked)
    await expect(f.user((service) => service.revoke(grant.id, 1))).rejects.toMatchObject({
      code: 'support_access_changed',
    })
    expect(
      (await f.user((service) => service.export())).events.map((event) => event.action),
    ).toEqual(['granted', 'revoked'])
  })
  test('ordinary support read requires active grant, allowlist permission and fresh MFA', async () => {
    const f = await fixture(),
      grant = await f.grant()
    const view = await f.operator(4).maskedView(f.profileId, grant.id)
    expect(view.accountCount).toBeGreaterThan(0)
    expect(view.transactionCount).toBeGreaterThan(0)
    expect(view.providerHealth).toContainEqual({ source: 'synthetic', state: 'active', count: 1 })
    expect(Object.keys(view).sort()).toEqual([
      'accountCount',
      'providerHealth',
      'scope',
      'transactionCount',
    ])
    expect(JSON.stringify(view)).not.toMatch(
      /profile|operator|email|name|amount|merchant|description|accountId|currency|balance/,
    )
    await expect(f.operator(99).maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    await expect(
      f.operator(4, { assurance: 'password' as 'mfa' }).maskedView(f.profileId, grant.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    await expect(
      f
        .operator(4, { authenticatedAt: '2026-10-03T11:54:59.000Z' })
        .maskedView(f.profileId, grant.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    await expect(
      f
        .operator(4, { authenticatedAt: '2026-10-03T12:00:01.000Z' })
        .maskedView(f.profileId, grant.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
  })
  test('emergency requester cannot approve itself or bypass the dual approval through ordinary read', async () => {
    const f = await fixture(),
      grant = await f.grant()
    const requester = f.operator(1),
      request = await requester.requestBreakGlass(f.profileId, grant.id, 'service_outage')
    await expect(
      requester.approveBreakGlass(f.profileId, grant.id, request.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    await expect(requester.maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    await expect(requester.maskedView(f.profileId, grant.id, request.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    expect(await f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id)).toMatchObject({
      approvalCount: 1,
      state: 'awaiting_approval',
    })
    await expect(
      f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id),
    ).rejects.toMatchObject({ code: 'support_approval_duplicate' })
    await expect(requester.maskedView(f.profileId, grant.id, request.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    expect(await f.operator(3).approveBreakGlass(f.profileId, grant.id, request.id)).toMatchObject({
      approvalCount: 2,
      state: 'approved',
    })
    expect((await requester.maskedView(f.profileId, grant.id, request.id)).scope).toBe(
      'masked_diagnostics',
    )
    const exported = await f.user((service) => service.export())
    expect(exported.approvals.map((approval) => approval.approvedBy).sort()).toEqual([op(2), op(3)])
    expect(exported.events.map((event) => event.action)).toEqual([
      'granted',
      'break_glass_requested',
      'break_glass_approved',
      'break_glass_approved',
      'break_glass_read',
    ])
  })
  test('approve-only staff cannot read or request and authenticated unknown staff cannot approve', async () => {
    const f = await fixture(),
      grant = await f.grant(),
      request = await f.operator(1).requestBreakGlass(f.profileId, grant.id, 'service_outage')
    await expect(f.operator(2).maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    await expect(
      f.operator(2).requestBreakGlass(f.profileId, grant.id, 'service_outage'),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    await expect(
      f.operator(99).approveBreakGlass(f.profileId, grant.id, request.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    expect((await f.user((service) => service.export())).approvals).toHaveLength(0)
  })
  test('expiry at the exact boundary closes ordinary reads, emergency reads and new approvals', async () => {
    const f = await fixture(),
      grant = await f.grant(1),
      request = await f.operator(1).requestBreakGlass(f.profileId, grant.id, 'service_outage')
    expect(request.expiresAt).toBe(grant.expiresAt)
    await f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id)
    f.advance(1)
    await expect(
      f.operator(3).approveBreakGlass(f.profileId, grant.id, request.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    await expect(f.operator(4).maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    await expect(f.operator(1).maskedView(f.profileId, grant.id, request.id)).rejects.toMatchObject(
      { code: 'support_access_denied' },
    )
    expect((await f.user((service) => service.status())).grants[0]?.state).toBe('expired')
    expect((await f.user((service) => service.status())).requests[0]?.state).toBe('expired')
    expect((await f.grant(1)).id).not.toBe(grant.id)
  })
  test('user revocation closes an already approved emergency and preserves the history', async () => {
    const f = await fixture(),
      { grant, request } = await approved(f)
    await f.user((service) => service.revoke(grant.id, 1))
    await expect(f.operator(1).maskedView(f.profileId, grant.id, request.id)).rejects.toMatchObject(
      { code: 'support_access_denied' },
    )
    await expect(f.operator(4).maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    expect((await f.user((service) => service.status())).requests[0]?.state).toBe('revoked')
    expect((await f.user((service) => service.export())).approvals).toHaveLength(2)
  })
  test('a clock rewind before an emergency request fails closed even while the grant is active', async () => {
    const f = await fixture(),
      grant = await f.grant()
    f.advance(2)
    const request = await f
      .operator(1)
      .requestBreakGlass(f.profileId, grant.id, 'security_incident')
    await f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id)
    await f.operator(3).approveBreakGlass(f.profileId, grant.id, request.id)
    f.advance(-1)
    await expect(f.operator(1).maskedView(f.profileId, grant.id, request.id)).rejects.toMatchObject(
      { code: 'support_access_denied' },
    )
    await expect(
      f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id),
    ).rejects.toMatchObject({ code: 'support_access_denied' })
    expect((await f.operator(4).maskedView(f.profileId, grant.id)).scope).toBe('masked_diagnostics')
  })
  test('cross-profile grants/requests are refused and real scoped SQL cannot forge staff approval/audit', async () => {
    const a = await fixture(),
      b = await fixture(),
      grant = await a.grant()
    const request = await a.operator(1).requestBreakGlass(a.profileId, grant.id, 'service_outage')
    await expect(b.user((service) => service.revoke(grant.id, 1))).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(a.operator(4).maskedView(b.profileId, grant.id)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(
      a.operator(2).approveBreakGlass(b.profileId, grant.id, request.id),
    ).rejects.toMatchObject({ code: 'not_found' })
    expect(await b.user((service) => service.export())).toEqual({
      grants: [],
      requests: [],
      approvals: [],
      events: [],
    })
    await expect(
      handle.withProfile(a.profileId, (db) =>
        db.insert(supportApprovals).values({
          id: randomUUID(),
          profileId: a.profileId,
          requestId: request.id,
          approvedBy: op(2),
          approvedAt: a.now(),
        }),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringMatching(/permission denied/) } })
    await expect(
      handle.withProfile(a.profileId, (db) =>
        db.insert(supportEvents).values({
          id: randomUUID(),
          profileId: a.profileId,
          grantId: grant.id,
          requestId: request.id,
          action: 'break_glass_approved',
          actorKind: 'operator',
          operatorId: op(2),
          occurredAt: a.now(),
        }),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringMatching(/row-level security/) } })
    expect(await handle.withProfile(b.profileId, (db) => db.select().from(supportGrants))).toEqual(
      [],
    )
  })
  test('concurrent duplicate approvals produce one winner and revoke fences subsequent access', async () => {
    const f = await fixture(),
      grant = await f.grant(),
      request = await f.operator(1).requestBreakGlass(f.profileId, grant.id, 'security_incident')
    const approvals = await Promise.allSettled([
      f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id),
      f.operator(2).approveBreakGlass(f.profileId, grant.id, request.id),
    ])
    expect(approvals.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await f.user((service) => service.export())).approvals).toHaveLength(1)
    await Promise.allSettled([
      f.operator(3).approveBreakGlass(f.profileId, grant.id, request.id),
      f.user((service) => service.revoke(grant.id, 1)),
    ])
    expect((await f.user((service) => service.status())).grants[0]?.state).toBe('revoked')
    await expect(f.operator(1).maskedView(f.profileId, grant.id, request.id)).rejects.toMatchObject(
      { code: 'support_access_denied' },
    )
  })
  test('SQL protects frozen audit, approvals, requests and grant expiry; erasure deletes the whole scope', async () => {
    const f = await fixture(),
      { grant } = await approved(f)
    await expect(
      handle.db
        .update(supportEvents)
        .set({ action: 'revoked' })
        .where(eq(supportEvents.profileId, f.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('immutable') } })
    await expect(
      handle.db.delete(supportEvents).where(eq(supportEvents.profileId, f.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('immutable') } })
    await expect(
      handle.db
        .update(supportRequests)
        .set({ requestedBy: op(3) })
        .where(eq(supportRequests.profileId, f.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('immutable') } })
    await expect(
      handle.db
        .update(supportApprovals)
        .set({ approvedBy: op(1) })
        .where(eq(supportApprovals.profileId, f.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('immutable') } })
    await expect(
      handle.withProfile(f.profileId, (db) =>
        db
          .update(supportGrants)
          .set({ expiresAt: '2026-10-03T12:14:00.000Z' })
          .where(eq(supportGrants.id, grant.id)),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('revocation') } })
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, f.profileId))
    for (const table of [supportGrants, supportRequests, supportApprovals, supportEvents])
      expect(await handle.db.select().from(table).where(eq(table.profileId, f.profileId))).toEqual(
        [],
      )
    await expect(f.operator(4).maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'not_found',
    })
  })
  test('trusted authenticator failure and copied actor strings enable no operator access', async () => {
    const f = await fixture(),
      grant = await f.grant()
    const operator = new SupportOperatorService({
      db: handle.db,
      operators,
      now: f.now,
      identity: {
        authenticate: async () => {
          throw new Error('private authentication detail')
        },
      },
    })
    await expect(operator.maskedView(f.profileId, grant.id)).rejects.toMatchObject({
      code: 'support_access_denied',
    })
    expect(
      () =>
        new SupportOperatorService({
          db: handle.db,
          operators: [{ operatorId: 'staff@example.com', permissions: ['read'] }],
          identity: {
            authenticate: async () => ({
              operatorId: 'staff@example.com',
              assurance: 'mfa',
              authenticatedAt: f.now(),
            }),
          },
        }),
    ).toThrow('allowlist')
  })
  test('actual user routes are scoped, reject actor/profile injection, expose no staff privileged HTTP surface', async () => {
    const f = await fixture(),
      app = Fastify({ logger: false })
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    const scoped = new WeakMap<FastifyRequest, Database>()
    app.addHook('onRoute', (route) => {
      const handler = route.handler
      route.handler = async function (request, reply) {
        return handle.withProfile(f.profileId, async (db) => {
          scoped.set(request, db)
          return handler.call(this, request, reply)
        })
      }
    })
    app.setErrorHandler((error, _request, reply) =>
      reply.code(error instanceof Problem ? error.status : 400).send({
        type: 'about:blank',
        title: 'Request failed',
        status: error instanceof Problem ? error.status : 400,
        code: error instanceof Problem ? error.code : 'invalid_request',
        detail: 'Request failed',
        instance: '/v1/support-access',
      }),
    )
    registerSupportAccessRoutes(app, async (request) => {
      const db = scoped.get(request)
      if (!db) throw new Error('Scope missing')
      return new SupportAccessService(db, f.profileId, f.now)
    })
    const payload = { ticketId: 'TKT_SYNTHETIC01', reason: 'sync_issue', durationMinutes: 2 }
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/support-access',
          payload: { ...payload, profileId: 'other', actor: op(1) },
        })
      ).statusCode,
    ).toBe(400)
    const response = await app.inject({ method: 'POST', url: '/v1/support-access', payload })
    expect(response.statusCode, response.payload).toBe(200)
    const grant = response.json()
    expect((await app.inject({ url: '/v1/support-access' })).json().grants).toHaveLength(1)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/support-access/${grant.id}/revoke`,
          payload: { revision: 1 },
        })
      ).json().state,
    ).toBe('revoked')
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/support-access/approve',
          payload: { operatorId: op(2) },
        })
      ).statusCode,
    ).toBe(404)
    await app.close()
  })
  test('approvals are tied to the exact granted profile and request even at the SQL boundary', async () => {
    const f = await fixture(),
      grant = await f.grant(),
      request = await f.operator(1).requestBreakGlass(f.profileId, grant.id, 'service_outage')
    await expect(
      handle.db.insert(supportApprovals).values({
        id: randomUUID(),
        profileId: f.profileId,
        requestId: request.id,
        approvedBy: op(1),
        approvedAt: f.now(),
      }),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('unavailable') } })
    expect((await f.user((service) => service.export())).approvals).toHaveLength(0)
    const result = await handle.db.execute(
      sql`SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname='support_access_approvals'`,
    )
    expect((result as { rows: unknown[] }).rows).toEqual([
      { relrowsecurity: true, relforcerowsecurity: true },
    ])
  })
})
