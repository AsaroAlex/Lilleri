import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { type ConsentLifecycle, readConsentLifecycle } from './consent-lifecycle.js'
import { consentEvents } from './consent-lifecycle-schema.js'
import {
  type NotificationKind,
  type NotificationPreferenceValues,
  notificationEvents,
  notificationPreferences,
  notifications,
} from './notifications-schema.js'
import { readPrivacyPermission } from './privacy.js'
import { notFound, Problem } from './problem.js'
import {
  DEFAULT_NOTIFICATION_CONFIGURATION,
  DEFAULT_RUNTIME_CONFIGURATION,
  type RuntimeConfigurationValues,
  runtimeConfigurationValuesSchema,
} from './runtime-config.js'

export type NotificationConfiguration = NonNullable<RuntimeConfigurationValues['notifications']>
export const NOTIFICATION_TEXT_VERSION = 'notification-text-v1' as const
export const NOTIFICATION_TITLES = Object.freeze({
  inbox: 'Hai movimenti da rivedere',
  consent_reminder: 'Un collegamento richiede la tua attenzione',
  balance_mismatch: 'Ci sono dati da verificare',
  connection_expired: 'Un collegamento richiede un rinnovo',
  connection_paused: 'Un collegamento è in pausa',
  summary_ready: 'Il riepilogo è pronto',
  security_notice: 'Un avviso per la sicurezza del tuo account',
  export_ready: 'La tua esportazione è pronta',
  deletion_status: 'Aggiornamento sulla tua richiesta di eliminazione',
  rights_action: 'Una richiesta sui tuoi dati richiede attenzione',
})
const optionalTypes = [
  'inbox',
  'consent_reminder',
  'balance_mismatch',
  'connection_expired',
  'connection_paused',
  'summary_ready',
] as const
const mandatoryTypes = [
  'security_notice',
  'export_ready',
  'deletion_status',
  'rights_action',
] as const
const clockText = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
export const notificationPreferenceValuesSchema = z
  .object({
    types: z
      .object({
        inbox: z.boolean(),
        consent_reminder: z.boolean(),
        balance_mismatch: z.boolean(),
        connection_expired: z.boolean(),
        connection_paused: z.boolean(),
        summary_ready: z.boolean(),
      })
      .strict(),
    quietHours: z
      .object({ enabled: z.boolean(), start: clockText, end: clockText })
      .strict()
      .refine((value) => value.start !== value.end),
  })
  .strict()
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceValues = Object.freeze({
  types: Object.freeze({
    inbox: true,
    consent_reminder: true,
    balance_mismatch: true,
    connection_expired: true,
    connection_paused: true,
    summary_ready: true,
  }),
  quietHours: Object.freeze({ enabled: true, start: '22:00', end: '08:00' }),
})
export const notificationFeedDto = z
  .object({
    id: z.string().uuid(),
    type: z.enum(Object.keys(NOTIFICATION_TITLES) as [NotificationKind, ...NotificationKind[]]),
    title: z.enum(Object.values(NOTIFICATION_TITLES) as [string, ...string[]]),
    textVersion: z.literal(NOTIFICATION_TEXT_VERSION),
    deliveredAt: z.string(),
    seenAt: z.string().nullable(),
    revision: z.number().int().positive(),
  })
  .strict()
const preferencesDto = notificationPreferenceValuesSchema.extend({
  revision: z.number().int().positive(),
  updatedAt: z.string().nullable(),
  timezone: z.string(),
  nativePushAvailable: z.literal(false),
  osPermission: z.literal('unknown'),
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
const changed = () =>
  new Problem(
    409,
    'notification_changed',
    'L’avviso o le impostazioni sono cambiati. Aggiorna la pagina.',
  )
const instant = (text: string) => {
  const stamp = Date.parse(text)
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== text)
    throw new Error('Notification clock is invalid')
  return text
}
const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex')
export function validateNotificationConfiguration(value: NotificationConfiguration) {
  const parsed = runtimeConfigurationValuesSchema.safeParse({
    ...DEFAULT_RUNTIME_CONFIGURATION,
    notifications: value,
  })
  if (!parsed.success || !parsed.data.notifications)
    throw new Error('Notification configuration is invalid')
  return parsed.data.notifications
}
function localParts(now: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant(now)))
  } catch {
    throw new Error('Notification timezone is invalid')
  }
}
export function notificationLocalDay(now: string, timezone: string) {
  const parts = localParts(now, timezone),
    value = (type: string) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}
export function isNotificationQuietTime(
  now: string,
  timezone: string,
  quiet: NotificationPreferenceValues['quietHours'],
) {
  if (!quiet.enabled) return false
  const parts = localParts(now, timezone),
    minute =
      Number(parts.find((part) => part.type === 'hour')?.value) * 60 +
      Number(parts.find((part) => part.type === 'minute')?.value)
  const convert = (text: string) => Number(text.slice(0, 2)) * 60 + Number(text.slice(3)),
    start = convert(quiet.start),
    end = convert(quiet.end)
  return start < end ? minute >= start && minute < end : minute >= start || minute < end
}
type Row = typeof notifications.$inferSelect
async function profile(db: Database, profileId: string, lock = false) {
  const query = db
    .select({ id: schema.profiles.id, timezone: schema.profiles.timezone })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
  const [row] = await (lock ? query.for('update') : query)
  if (!row) throw notFound()
  localParts(new Date().toISOString(), row.timezone)
  return row
}
async function event(
  db: Database,
  row: Row,
  action: 'queued' | 'delivered' | 'cancelled' | 'suppressed' | 'seen',
  at: string,
) {
  await db.insert(notificationEvents).values({
    id: randomUUID(),
    profileId: row.profileId,
    notificationId: row.id,
    action,
    revision: row.revision,
    before: null,
    after: null,
    occurredAt: at,
  })
}
async function transition(
  db: Database,
  row: Row,
  status: Row['status'],
  now: string,
  seen = false,
) {
  const [next] = await db
    .update(notifications)
    .set({
      status,
      revision: row.revision + 1,
      ...(seen ? { seenAt: now } : status === 'delivered' ? { deliveredAt: now } : {}),
    })
    .where(
      and(
        eq(notifications.profileId, row.profileId),
        eq(notifications.id, row.id),
        eq(notifications.revision, row.revision),
      ),
    )
    .returning()
  if (!next) throw changed()
  await event(db, next, seen ? 'seen' : status === 'queued' ? 'queued' : status, now)
  return next
}
async function generation(db: Database, lifecycle: ConsentLifecycle) {
  const [latest] = await db
    .select({ id: consentEvents.id })
    .from(consentEvents)
    .where(
      and(
        eq(consentEvents.profileId, lifecycle.profileId),
        eq(consentEvents.connectionId, lifecycle.connectionId),
        inArray(consentEvents.action, ['granted', 'renewed', 'legacy_imported']),
      ),
    )
    .orderBy(desc(consentEvents.revision))
    .limit(1)
  return hash([lifecycle.consentId, latest?.id ?? lifecycle.authorization])
}
function feed(row: Row) {
  if (!row.deliveredAt) throw new Error('Notification is not delivered')
  return {
    id: row.id,
    type: row.kind,
    title: NOTIFICATION_TITLES[row.kind],
    textVersion: row.textVersion,
    deliveredAt: row.deliveredAt,
    seenAt: row.seenAt,
    revision: row.revision,
  }
}

export class NotificationsService {
  readonly settings: NotificationConfiguration
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
    settings: NotificationConfiguration = DEFAULT_NOTIFICATION_CONFIGURATION,
  ) {
    this.settings = validateNotificationConfiguration(settings)
  }
  async preferences(db = this.db) {
    const owner = await profile(db, this.profileId)
    const [stored] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, this.profileId))
    return {
      ...notificationPreferenceValuesSchema.parse(
        stored?.values ?? DEFAULT_NOTIFICATION_PREFERENCES,
      ),
      revision: stored?.revision ?? 1,
      updatedAt: stored?.updatedAt ?? null,
      timezone: owner.timezone,
      nativePushAvailable: false as const,
      osPermission: 'unknown' as const,
    }
  }
  async updatePreferences(expectedRevision: number, values: NotificationPreferenceValues) {
    const parsed = notificationPreferenceValuesSchema.safeParse(values)
    if (!parsed.success || !Number.isInteger(expectedRevision) || expectedRevision < 1)
      throw new Problem(
        400,
        'notification_preferences_invalid',
        'Controlla le impostazioni degli avvisi.',
      )
    return this.db.transaction(async (db) => {
      await profile(db, this.profileId, true)
      const before = await this.preferences(db)
      if (before.revision !== expectedRevision) throw changed()
      const at = instant(this.now())
      await db
        .insert(notificationPreferences)
        .values({
          profileId: this.profileId,
          values: parsed.data,
          revision: before.revision + 1,
          updatedAt: at,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.profileId,
          set: { values: parsed.data, revision: before.revision + 1, updatedAt: at },
        })
      await db.insert(notificationEvents).values({
        id: randomUUID(),
        profileId: this.profileId,
        notificationId: null,
        action: 'preferences_changed',
        revision: before.revision + 1,
        before: { types: before.types, quietHours: before.quietHours },
        after: parsed.data,
        occurredAt: at,
      })
      return this.preferences(db)
    })
  }
  async getFeed() {
    return {
      items: (
        await this.db
          .select()
          .from(notifications)
          .where(
            and(eq(notifications.profileId, this.profileId), eq(notifications.status, 'delivered')),
          )
          .orderBy(desc(notifications.deliveredAt), desc(notifications.id))
          .limit(100)
      ).map(feed),
      nativePushAvailable: false as const,
    }
  }
  async markSeen(id: string, expectedRevision: number) {
    return this.db.transaction(async (db) => {
      await profile(db, this.profileId, true)
      const [row] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.profileId, this.profileId),
            eq(notifications.id, id),
            eq(notifications.status, 'delivered'),
          ),
        )
        .for('update')
      if (!row) throw notFound()
      if (row.revision !== expectedRevision) throw changed()
      if (row.seenAt) return feed(row)
      return feed(await transition(db, row, 'delivered', instant(this.now()), true))
    })
  }
  async destination(id: string) {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.profileId, this.profileId),
          eq(notifications.id, id),
          eq(notifications.status, 'delivered'),
        ),
      )
    if (!row) throw notFound()
    return {
      screen:
        row.kind === 'security_notice'
          ? 'account'
          : mandatoryTypes.includes(row.kind as (typeof mandatoryTypes)[number])
            ? 'privacy'
            : row.kind === 'summary_ready'
              ? 'overview'
              : row.connectionId
                ? 'connections'
                : 'inbox',
      action: row.sourceAction ?? 'open',
      ...(row.connectionId ? { connectionId: row.connectionId } : {}),
    } as const
  }
  async export() {
    return {
      preferences: await this.preferences(),
      notifications: await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.profileId, this.profileId))
        .orderBy(asc(notifications.createdAt), asc(notifications.id)),
      events: await this.db
        .select()
        .from(notificationEvents)
        .where(eq(notificationEvents.profileId, this.profileId))
        .orderBy(asc(notificationEvents.occurredAt), asc(notificationEvents.id)),
    }
  }
  async publish(
    kind: Exclude<NotificationKind, 'consent_reminder'>,
    sourceOccurrence: string,
    connectionId?: string,
  ) {
    if (
      !Object.hasOwn(NOTIFICATION_TITLES, kind) ||
      String(kind) === 'consent_reminder' ||
      typeof sourceOccurrence !== 'string' ||
      sourceOccurrence.length < 1 ||
      sourceOccurrence.length > 256
    )
      throw new Error('Notification producer input is invalid')
    return this.db.transaction(async (db) => {
      const owner = await profile(db, this.profileId, true),
        at = instant(this.now()),
        prefs = await this.preferences(db)
      let permissionRevision: number | null = null
      if (!mandatoryTypes.includes(kind as (typeof mandatoryTypes)[number])) {
        const permission = await readPrivacyPermission(db, this.profileId, 'N-SERVICE')
        if (
          !this.settings.enabled ||
          !permission.localPreferenceEnabled ||
          !prefs.types[kind as (typeof optionalTypes)[number]]
        )
          return null
        permissionRevision = permission.revision
      }
      if (connectionId) {
        if (!['connection_expired', 'connection_paused', 'balance_mismatch'].includes(kind))
          throw new Error('Notification destination scope is invalid')
        const [owned] = await db
          .select({ id: schema.connections.id })
          .from(schema.connections)
          .where(
            and(
              eq(schema.connections.profileId, this.profileId),
              eq(schema.connections.id, connectionId),
            ),
          )
        if (!owned) throw notFound()
      }
      const dedupKey = hash([
        kind,
        kind === 'inbox' ? notificationLocalDay(at, owner.timezone) : sourceOccurrence,
        NOTIFICATION_TEXT_VERSION,
      ])
      let sourceGeneration: string | null = null
      let consentId: string | null = null
      if (connectionId && ['connection_expired', 'connection_paused'].includes(kind)) {
        const lifecycle = await readConsentLifecycle(db, this.profileId, connectionId, at)
        if (
          (kind === 'connection_expired' && lifecycle.state !== 'expired') ||
          (kind === 'connection_paused' && lifecycle.state !== 'paused')
        )
          return null
        sourceGeneration = await generation(db, lifecycle)
        consentId = lifecycle.consentId
      }
      const [created] = await db
        .insert(notifications)
        .values({
          id: randomUUID(),
          profileId: this.profileId,
          kind,
          textVersion: NOTIFICATION_TEXT_VERSION,
          dedupKey,
          permissionRevision,
          connectionId: connectionId ?? null,
          consentId,
          sourceGeneration,
          sourceAction: null,
          sourceDeadline: null,
          offsetSeconds: null,
          dueAt: at,
          status: 'queued',
          createdAt: at,
          deliveredAt: null,
          seenAt: null,
          revision: 1,
        })
        .onConflictDoNothing({ target: [notifications.profileId, notifications.dedupKey] })
        .returning()
      if (!created) return null
      await event(db, created, 'queued', at)
      await this.deliver(db, created, prefs, owner.timezone, at)
      return created.id
    })
  }
  private async deliver(
    db: Database,
    row: Row,
    prefs: Awaited<ReturnType<NotificationsService['preferences']>>,
    timezone: string,
    at: string,
  ) {
    if (row.status !== 'queued' || row.dueAt > at) return false
    if (!mandatoryTypes.includes(row.kind as (typeof mandatoryTypes)[number])) {
      const permission = await readPrivacyPermission(db, this.profileId, 'N-SERVICE')
      if (
        !permission.localPreferenceEnabled ||
        permission.revision !== row.permissionRevision ||
        !prefs.types[row.kind as (typeof optionalTypes)[number]]
      ) {
        await transition(db, row, 'suppressed', at)
        return false
      }
      if (isNotificationQuietTime(at, timezone, prefs.quietHours)) return false
      if (row.kind === 'inbox') {
        const delivered = await db
          .select({ at: notifications.deliveredAt })
          .from(notifications)
          .where(
            and(
              eq(notifications.profileId, this.profileId),
              eq(notifications.kind, 'inbox'),
              eq(notifications.status, 'delivered'),
              gt(notifications.deliveredAt, new Date(Date.parse(at) - 172_800_000).toISOString()),
            ),
          )
          .limit(100)
        if (
          delivered.filter(
            (item) =>
              item.at &&
              notificationLocalDay(item.at, timezone) === notificationLocalDay(at, timezone),
          ).length >= this.settings.inboxDailyLimit
        ) {
          await transition(db, row, 'suppressed', at)
          return false
        }
      }
    }
    await transition(db, row, 'delivered', at)
    return true
  }
  async scheduleAndDeliver() {
    return this.db.transaction(async (db) => {
      const owner = await profile(db, this.profileId, true),
        at = instant(this.now()),
        prefs = await this.preferences(db)
      const permission = await readPrivacyPermission(db, this.profileId, 'N-SERVICE')
      let queued = 0,
        delivered = 0,
        cancelled = 0,
        suppressed = 0
      const connections = await db
        .select({ id: schema.connections.id, provider: schema.connections.providerId })
        .from(schema.connections)
        .where(eq(schema.connections.profileId, this.profileId))
        .orderBy(asc(schema.connections.id))
        .limit(100)
      const current = new Map<string, { lifecycle: ConsentLifecycle; generation: string }>()
      for (const connection of connections) {
        if (connection.provider === 'local-manual') continue
        try {
          const lifecycle = await readConsentLifecycle(db, this.profileId, connection.id, at),
            key = await generation(db, lifecycle)
          current.set(connection.id, { lifecycle, generation: key })
        } catch {
          /* Unknown/invalid provider terms never create reminders. */
        }
      }
      if (this.settings.enabled && permission.localPreferenceEnabled) {
        for (const { lifecycle, generation: key } of current.values()) {
          if (queued >= this.settings.eventsPerProfile) break
          const kind =
            lifecycle.state === 'expired'
              ? 'connection_expired'
              : lifecycle.state === 'paused'
                ? 'connection_paused'
                : null
          if (!kind || !lifecycle.consentId || !prefs.types[kind]) continue
          const [created] = await db
            .insert(notifications)
            .values({
              id: randomUUID(),
              profileId: this.profileId,
              kind,
              textVersion: NOTIFICATION_TEXT_VERSION,
              dedupKey: hash([key, kind, NOTIFICATION_TEXT_VERSION]),
              permissionRevision: permission.revision,
              connectionId: lifecycle.connectionId,
              consentId: lifecycle.consentId,
              sourceGeneration: key,
              sourceAction: null,
              sourceDeadline: null,
              offsetSeconds: null,
              dueAt: at,
              status: 'queued',
              createdAt: at,
              deliveredAt: null,
              seenAt: null,
              revision: 1,
            })
            .onConflictDoNothing({ target: [notifications.profileId, notifications.dedupKey] })
            .returning()
          if (created) {
            await event(db, created, 'queued', at)
            queued++
          }
        }
      }
      const pending = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.profileId, this.profileId), eq(notifications.status, 'queued')))
        .orderBy(asc(notifications.dueAt), asc(notifications.id))
        .limit(this.settings.eventsPerProfile)
      for (const row of pending) {
        if (!row.connectionId || current.has(row.connectionId)) continue
        try {
          const lifecycle = await readConsentLifecycle(db, this.profileId, row.connectionId, at)
          current.set(row.connectionId, { lifecycle, generation: await generation(db, lifecycle) })
        } catch {
          /* A queued reference outside the discovery page is still checked in its own scope. */
        }
      }
      for (const row of pending) {
        if (row.connectionId && row.sourceGeneration && row.kind !== 'consent_reminder') {
          const actual = current.get(row.connectionId)
          if (
            !actual ||
            actual.generation !== row.sourceGeneration ||
            (row.kind === 'connection_expired' && actual.lifecycle.state !== 'expired') ||
            (row.kind === 'connection_paused' && actual.lifecycle.state !== 'paused')
          ) {
            await transition(db, row, 'cancelled', at)
            cancelled++
            continue
          }
        }
        if (row.connectionId && row.kind === 'consent_reminder') {
          const actual = current.get(row.connectionId)
          const action = actual?.lifecycle.authorization.requiredActions.find(
            (candidate) => candidate.action === row.sourceAction,
          )
          if (
            !actual ||
            actual.lifecycle.state === 'revoked' ||
            actual.lifecycle.paused ||
            actual.generation !== row.sourceGeneration ||
            !action ||
            Date.parse(action.dueAt ?? '') !== Date.parse(row.sourceDeadline ?? '') ||
            !row.sourceDeadline ||
            Date.parse(row.sourceDeadline) <= Date.parse(at)
          ) {
            await transition(db, row, 'cancelled', at)
            cancelled++
            continue
          }
        }
        if (
          !mandatoryTypes.includes(row.kind as (typeof mandatoryTypes)[number]) &&
          (!permission.localPreferenceEnabled ||
            permission.revision !== row.permissionRevision ||
            !prefs.types[row.kind as (typeof optionalTypes)[number]])
        ) {
          await transition(db, row, 'suppressed', at)
          suppressed++
          continue
        }
        if (await this.deliver(db, row, prefs, owner.timezone, at)) delivered++
      }
      if (
        this.settings.enabled &&
        permission.localPreferenceEnabled &&
        prefs.types.consent_reminder
      ) {
        const candidates: {
          lifecycle: ConsentLifecycle
          generation: string
          action: ConsentLifecycle['authorization']['requiredActions'][number]
          offset: number
          dueAt: string
          dedupKey: string
        }[] = []
        for (const { lifecycle, generation: key } of current.values()) {
          if (
            !lifecycle.consentId ||
            lifecycle.paused ||
            !['active', 'expiring'].includes(lifecycle.state)
          )
            continue
          for (const action of lifecycle.authorization.requiredActions) {
            if (!action.dueAt || Date.parse(action.dueAt) <= Date.parse(at)) continue
            for (const offset of this.settings.expiryOffsetsSeconds) {
              const dueAt = new Date(Date.parse(action.dueAt) - offset * 1000).toISOString()
              if (dueAt < at) continue
              candidates.push({
                lifecycle,
                generation: key,
                action,
                offset,
                dueAt,
                dedupKey: hash([
                  key,
                  action.action,
                  new Date(Date.parse(action.dueAt)).toISOString(),
                  offset,
                  NOTIFICATION_TEXT_VERSION,
                ]),
              })
            }
          }
        }
        const known = candidates.length
          ? await db
              .select({ key: notifications.dedupKey })
              .from(notifications)
              .where(
                and(
                  eq(notifications.profileId, this.profileId),
                  inArray(
                    notifications.dedupKey,
                    candidates.map((candidate) => candidate.dedupKey),
                  ),
                ),
              )
          : []
        const existing = new Set(known.map((row) => row.key))
        for (const candidate of candidates) {
          if (queued >= this.settings.eventsPerProfile) break
          if (existing.has(candidate.dedupKey)) continue
          const [created] = await db
            .insert(notifications)
            .values({
              id: randomUUID(),
              profileId: this.profileId,
              kind: 'consent_reminder',
              textVersion: NOTIFICATION_TEXT_VERSION,
              dedupKey: candidate.dedupKey,
              permissionRevision: permission.revision,
              connectionId: candidate.lifecycle.connectionId,
              consentId: candidate.lifecycle.consentId,
              sourceGeneration: candidate.generation,
              sourceAction: candidate.action.action,
              sourceDeadline: candidate.action.dueAt
                ? new Date(Date.parse(candidate.action.dueAt)).toISOString()
                : null,
              offsetSeconds: candidate.offset,
              dueAt: candidate.dueAt,
              status: 'queued',
              createdAt: at,
              deliveredAt: null,
              seenAt: null,
              revision: 1,
            })
            .onConflictDoNothing({ target: [notifications.profileId, notifications.dedupKey] })
            .returning()
          if (created) {
            await event(db, created, 'queued', at)
            queued++
            if (await this.deliver(db, created, prefs, owner.timezone, at)) delivered++
          }
        }
      }

      return { queued, delivered, cancelled, suppressed }
    })
  }
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<NotificationsService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/notifications',
    {
      schema: {
        response: {
          200: z.object({
            items: z.array(notificationFeedDto),
            nativePushAvailable: z.literal(false),
          }),
          ...errors,
        },
      },
    },
    async (request) => (await resolve(request)).getFeed(),
  )
  api.get(
    '/v1/notifications/preferences',
    { schema: { response: { 200: preferencesDto, ...errors } } },
    async (request) => (await resolve(request)).preferences(),
  )
  api.patch(
    '/v1/notifications/preferences',
    {
      schema: {
        body: notificationPreferenceValuesSchema.extend({
          revision: z.number().int().positive().max(2_147_483_646),
        }),
        response: { 200: preferencesDto, ...errors },
      },
    },
    async (request) => {
      const { revision, ...values } = request.body
      return (await resolve(request)).updatePreferences(revision, values)
    },
  )
  api.patch(
    '/v1/notifications/:id/seen',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }).strict(),
        body: z.object({ revision: z.number().int().positive() }).strict(),
        response: { 200: notificationFeedDto, ...errors },
      },
    },
    async (request) => (await resolve(request)).markSeen(request.params.id, request.body.revision),
  )
  api.get(
    '/v1/notifications/:id/destination',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }).strict(),
        response: {
          200: z
            .object({
              screen: z.enum(['account', 'privacy', 'overview', 'connections', 'inbox']),
              action: z.string(),
              connectionId: z.string().optional(),
            })
            .strict(),
          ...errors,
        },
      },
    },
    async (request) => (await resolve(request)).destination(request.params.id),
  )
}
