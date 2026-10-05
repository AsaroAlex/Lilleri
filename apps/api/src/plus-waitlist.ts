import { type Database, schema } from '@lilleri/database'
import { and, asc, count, eq, isNull, lt, or } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { AppExtension, AppExtensionContext } from './app.js'
import { profilePlan } from './billing.js'
import { type IdentityDelivery, PLUS_AVAILABLE_PATH } from './identity-mail.js'
import { user as identityUsers, memberships } from './identity-schema.js'
import { plusWaitlist } from './plus-waitlist-schema.js'
import { Problem } from './problem.js'

/**
 * "Plus Fondatori": while Plus cannot be bought (no bank capacity yet), the profile owner can ask
 * to be told once, by e-mail, when it opens. Rows are written by the trusted boundary after the
 * request's profile transaction; the notice is sent by `notifyPlusWaitlist`, at most once.
 */
export interface PlusWaitlistOptions {
  /** True while Plus can be bought; the list is offered only while it is closed. */
  readonly plusOpen: () => Promise<boolean>
  readonly now?: () => string
}

const waitlistDto = z.object({
  /** The caller may join: profile owner, on Gratis, while Plus cannot be bought. */
  offered: z.boolean(),
  joined: z.boolean(),
  joinedAt: z.string().nullable(),
  /** 1-based place among the people still waiting; null when not waiting. */
  position: z.number().int().positive().nullable(),
  /** The single "Plus is available" notice has been handled for this profile. */
  notified: z.boolean(),
})
export type PlusWaitlistStatus = z.infer<typeof waitlistDto>
const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = { 401: problemDto, 403: problemDto, 404: problemDto, 409: problemDto }

async function statusOf(
  trustedDb: Database,
  profileId: string,
  offered: boolean,
): Promise<PlusWaitlistStatus> {
  const [row] = await trustedDb
    .select()
    .from(plusWaitlist)
    .where(eq(plusWaitlist.profileId, profileId))
  if (!row) return { offered, joined: false, joinedAt: null, position: null, notified: false }
  if (row.notifiedAt)
    return { offered, joined: true, joinedAt: row.joinedAt, position: null, notified: true }
  const [ahead] = await trustedDb
    .select({ value: count() })
    .from(plusWaitlist)
    .where(
      and(
        isNull(plusWaitlist.notifiedAt),
        or(
          lt(plusWaitlist.joinedAt, row.joinedAt),
          and(eq(plusWaitlist.joinedAt, row.joinedAt), lt(plusWaitlist.profileId, profileId)),
        ),
      ),
    )
  return {
    offered,
    joined: true,
    joinedAt: row.joinedAt,
    position: Number(ahead?.value ?? 0) + 1,
    notified: false,
  }
}

/** Registers `GET|POST|DELETE /v1/plus/waitlist` (profile-scoped, hosted session). */
export function createPlusWaitlistExtension(options: PlusWaitlistOptions): AppExtension {
  return async (app, context: AppExtensionContext) => {
    const routes = app.withTypeProvider<ZodTypeProvider>()
    const clock = () => options.now?.() ?? new Date().toISOString()
    // Same discipline as billing: trusted reads and writes wait for the profile transaction.
    const afterScope = async (request: FastifyRequest, work: () => Promise<void>) => {
      if (context.service(request).db === context.db) await work()
      else context.afterCommit(request, work)
    }
    const caller = (request: FastifyRequest) => {
      const principal = context.principal(request)
      const service = context.service(request)
      return {
        service,
        owner: principal?.role === 'owner' && principal.profileId === service.profileId,
      }
    }
    const respond = async (
      request: FastifyRequest,
      change?: (profileId: string) => Promise<void>,
    ) => {
      const { service, owner } = caller(request)
      const plan = (await profilePlan(service.db, service.profileId, clock())).plan
      const result: PlusWaitlistStatus = {
        offered: false,
        joined: false,
        joinedAt: null,
        position: null,
        notified: false,
      }
      await afterScope(request, async () => {
        const offered = owner && plan === 'gratis' && !(await options.plusOpen())
        if (change) await change(service.profileId)
        Object.assign(result, await statusOf(context.db, service.profileId, offered))
      })
      return result
    }
    const requireOwner = (request: FastifyRequest) => {
      if (!caller(request).owner)
        throw new Problem(403, 'owner_required', 'Solo il titolare del profilo può farlo.')
    }

    routes.get(
      '/v1/plus/waitlist',
      {
        schema: {
          summary: 'Place on the Plus Fondatori list',
          response: { 200: waitlistDto, ...errors },
        },
      },
      async (request) => respond(request),
    )
    routes.post(
      '/v1/plus/waitlist',
      {
        schema: {
          summary: 'Ask to be told once when Plus can be bought',
          body: z.object({}).strict().nullish(),
          response: { 200: waitlistDto, ...errors },
        },
      },
      async (request) => {
        requireOwner(request)
        return respond(request, async (profileId) => {
          if (await options.plusOpen())
            throw new Problem(
              409,
              'plus_available',
              'Lilleri Plus è già disponibile: attivalo ora.',
            )
          await context.db
            .insert(plusWaitlist)
            .values({ profileId, joinedAt: clock() })
            .onConflictDoNothing()
        })
      },
    )
    routes.delete(
      '/v1/plus/waitlist',
      {
        schema: {
          summary: 'Leave the Plus Fondatori list',
          response: { 200: waitlistDto, ...errors },
        },
      },
      async (request) => {
        requireOwner(request)
        return respond(request, async (profileId) => {
          await context.db.delete(plusWaitlist).where(eq(plusWaitlist.profileId, profileId))
        })
      },
    )
  }
}

export interface PlusWaitlistNotifyOptions {
  readonly delivery: Pick<IdentityDelivery, 'sendPlusAvailable'>
  /** Exact HTTPS application origin, e.g. `https://app.lilleri.it`. */
  readonly baseURL: string
  readonly limit?: number
  readonly now?: () => string
}
export interface PlusWaitlistNotifyResult {
  readonly notified: number
  /** Profiles without a verified owner address: handled without a message. */
  readonly skipped: number
  readonly failed: boolean
}

/**
 * Sends the single notice to the oldest waiting members, at most once each: a row is claimed
 * before sending and released again only if the provider refuses the message. Call it only while
 * Plus can actually be bought, with `limit` no larger than the capacity left.
 */
export async function notifyPlusWaitlist(
  trustedDb: Database,
  options: PlusWaitlistNotifyOptions,
): Promise<PlusWaitlistNotifyResult> {
  const send = options.delivery.sendPlusAvailable
  if (!send) throw new Error('Plus notices need an e-mail delivery')
  const limit = Math.max(0, Math.min(options.limit ?? 50, 200))
  const url = new URL(PLUS_AVAILABLE_PATH, options.baseURL).href
  const waiting = await trustedDb
    .select({ profileId: plusWaitlist.profileId })
    .from(plusWaitlist)
    .where(isNull(plusWaitlist.notifiedAt))
    .orderBy(asc(plusWaitlist.joinedAt), asc(plusWaitlist.profileId))
    .limit(limit)
  let notified = 0
  let skipped = 0
  for (const { profileId } of waiting) {
    const at = options.now?.() ?? new Date().toISOString()
    const claimed = await trustedDb
      .update(plusWaitlist)
      .set({ notifiedAt: at })
      .where(and(eq(plusWaitlist.profileId, profileId), isNull(plusWaitlist.notifiedAt)))
      .returning({ profileId: plusWaitlist.profileId })
    if (!claimed.length) continue
    const [owner] = await trustedDb
      .select({ email: identityUsers.email })
      .from(memberships)
      .innerJoin(identityUsers, eq(identityUsers.id, memberships.userId))
      .innerJoin(schema.profiles, eq(schema.profiles.id, memberships.profileId))
      .where(
        and(
          eq(memberships.profileId, profileId),
          eq(memberships.role, 'owner'),
          eq(identityUsers.emailVerified, true),
        ),
      )
      .limit(1)
    if (!owner) {
      skipped++
      continue
    }
    try {
      await send({ email: owner.email, url })
      notified++
    } catch {
      await trustedDb
        .update(plusWaitlist)
        .set({ notifiedAt: null })
        .where(and(eq(plusWaitlist.profileId, profileId), eq(plusWaitlist.notifiedAt, at)))
      return { notified, skipped, failed: true }
    }
  }
  return { notified, skipped, failed: false }
}
