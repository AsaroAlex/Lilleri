import { createHash } from 'node:crypto'
import type { Database } from '@lilleri/database'
import { asc, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { runtimeConfigurationHead, runtimeConfigurationVersions } from './runtime-config-schema.js'

/** Bounds are safety constraints; operational choices belong to the versioned document. */
export const runtimeConfigurationValuesSchema = z
  .object({
    payloadRetention: z
      .object({
        enabled: z.boolean(),
        intervalMs: z.number().int().min(1000).max(86_400_000),
        profileLimit: z.number().int().min(1).max(100),
        payloadLimit: z.number().int().min(1).max(1000),
      })
      .strict(),
    revocation: z
      .object({
        enabled: z.boolean(),
        intervalMs: z.number().int().min(100).max(60_000),
        batchLimit: z.number().int().min(1).max(20),
        leaseMs: z.number().int().min(1000).max(300_000),
        maxAttempts: z.number().int().min(1).max(20),
        attemptTimeoutMs: z.number().int().min(1).max(300_000),
      })
      .strict(),
    observability: z
      .object({
        traceSampleRatio: z.number().min(0).max(1),
        metricsEnabled: z.boolean(),
      })
      .strict(),
    connectionLifecycle: z
      .object({ expiringOffsetSeconds: z.number().int().min(0).max(2_592_000) })
      .strict()
      .optional(),
    notifications: z
      .object({
        enabled: z.boolean(),
        intervalMs: z.number().int().min(1000).max(86_400_000),
        profileLimit: z.number().int().min(1).max(100),
        eventsPerProfile: z.number().int().min(1).max(500),
        expiryOffsetsSeconds: z
          .array(z.number().int().min(1).max(2_592_000))
          .max(5)
          .refine((values) => new Set(values).size === values.length),
        inboxDailyLimit: z.literal(1),
      })
      .strict()
      .optional(),
    understanding: z
      .object({
        maxBalanceAgeMs: z.number().int().min(0).max(2_592_000_000),
        occurrenceToleranceDays: z.number().int().min(0).max(31),
        maxForecastOccurrences: z.number().int().min(1).max(1000),
        horizonDays: z.number().int().min(1).max(366),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => value.revocation.attemptTimeoutMs <= value.revocation.leaseMs, {
    message: 'Revocation timeout must fit within the lease',
  })
export type RuntimeConfigurationValues = z.infer<typeof runtimeConfigurationValuesSchema>

// Zero explicitly disables advance expiry warnings until an operator chooses a window.
export const DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION = Object.freeze({
  expiringOffsetSeconds: 0,
})
export const DEFAULT_NOTIFICATION_CONFIGURATION = Object.freeze({
  enabled: true,
  intervalMs: 60_000,
  profileLimit: 20,
  eventsPerProfile: 50,
  expiryOffsetsSeconds: [] as number[],
  inboxDailyLimit: 1,
})
Object.freeze(DEFAULT_NOTIFICATION_CONFIGURATION.expiryOffsetsSeconds)
export const DEFAULT_UNDERSTANDING_CONFIGURATION = Object.freeze({
  maxBalanceAgeMs: 86_400_000,
  occurrenceToleranceDays: 3,
  maxForecastOccurrences: 120,
  horizonDays: 62,
})

/** Bootstrap only. After creation the persisted revision is authoritative. */
export const DEFAULT_RUNTIME_CONFIGURATION: Readonly<RuntimeConfigurationValues> = Object.freeze({
  payloadRetention: Object.freeze({
    enabled: true,
    intervalMs: 60_000,
    profileLimit: 20,
    payloadLimit: 100,
  }),
  revocation: Object.freeze({
    enabled: true,
    intervalMs: 1000,
    batchLimit: 4,
    leaseMs: 30_000,
    maxAttempts: 8,
    attemptTimeoutMs: 10_000,
  }),
  observability: Object.freeze({ traceSampleRatio: 0.1, metricsEnabled: true }),
  connectionLifecycle: DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION,
  notifications: DEFAULT_NOTIFICATION_CONFIGURATION,
  understanding: DEFAULT_UNDERSTANDING_CONFIGURATION,
})
export interface RuntimeConfigurationSnapshot {
  readonly revision: number
  readonly schemaVersion: 1
  readonly values: RuntimeConfigurationValues
  readonly digest: string
  readonly previousRevision: number | null
  readonly rollbackRevision: number | null
  readonly action: 'bootstrap' | 'update' | 'rollback'
  readonly actor: 'bootstrap' | 'local_operator' | 'deployment'
  readonly reason: 'initial_setup' | 'tuning' | 'incident' | 'release' | 'rollback'
  readonly createdAt: string
}
export interface RuntimeConfigurationAudit {
  readonly actor: 'local_operator' | 'deployment'
  readonly reason: 'tuning' | 'incident' | 'release'
}
export class RuntimeConfigurationError extends Error {
  constructor(
    readonly code:
      | 'configuration_invalid'
      | 'configuration_unavailable'
      | 'configuration_changed'
      | 'configuration_version_unknown',
  ) {
    super(code)
  }
}
const revisionSchema = z.number().int().min(1).max(2_147_483_646)
const actorSchema = z.enum(['local_operator', 'deployment'])
const auditSchema = z
  .object({ actor: actorSchema, reason: z.enum(['tuning', 'incident', 'release']) })
  .strict()
const checkedValues = (value: unknown): RuntimeConfigurationValues => {
  const result = runtimeConfigurationValuesSchema.safeParse(value)
  if (!result.success) throw new RuntimeConfigurationError('configuration_invalid')
  return result.data
}
const digestOf = (value: RuntimeConfigurationValues) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const checkedRevision = (revision: number) => {
  if (!revisionSchema.safeParse(revision).success)
    throw new RuntimeConfigurationError('configuration_invalid')
  return revision
}
function snapshot(
  row: typeof runtimeConfigurationVersions.$inferSelect,
): RuntimeConfigurationSnapshot {
  const values = checkedValues(row.values)
  if (row.schemaVersion !== 1 || row.digest !== digestOf(values))
    throw new RuntimeConfigurationError('configuration_unavailable')
  return { ...row, schemaVersion: 1, values }
}

/** Internal trusted operator service. There is deliberately no HTTP configuration route. */
export class RuntimeConfigurationStore {
  constructor(
    readonly db: Database,
    readonly now: () => string = () => new Date().toISOString(),
  ) {}
  private instant() {
    const value = Date.parse(this.now())
    if (!Number.isFinite(value)) throw new RuntimeConfigurationError('configuration_invalid')
    return new Date(value).toISOString()
  }
  async ensure(initial: unknown = DEFAULT_RUNTIME_CONFIGURATION) {
    const values = checkedValues(initial)
    const createdAt = this.instant()
    return this.db.transaction(async (db) => {
      await db
        .insert(runtimeConfigurationVersions)
        .values({
          revision: 1,
          schemaVersion: 1,
          values,
          digest: digestOf(values),
          previousRevision: null,
          rollbackRevision: null,
          action: 'bootstrap',
          actor: 'bootstrap',
          reason: 'initial_setup',
          createdAt,
        })
        .onConflictDoNothing()
      await db
        .insert(runtimeConfigurationHead)
        .values({ singleton: 'runtime', activeRevision: 1 })
        .onConflictDoNothing()
      return this.read(db)
    })
  }
  async read(db: Database = this.db): Promise<RuntimeConfigurationSnapshot> {
    const [row] = await db
      .select({ version: runtimeConfigurationVersions })
      .from(runtimeConfigurationHead)
      .innerJoin(
        runtimeConfigurationVersions,
        eq(runtimeConfigurationVersions.revision, runtimeConfigurationHead.activeRevision),
      )
      .where(eq(runtimeConfigurationHead.singleton, 'runtime'))
    if (!row) throw new RuntimeConfigurationError('configuration_unavailable')
    return snapshot(row.version)
  }
  async history(afterRevision = 0, limit = 100): Promise<RuntimeConfigurationSnapshot[]> {
    if (
      !Number.isSafeInteger(afterRevision) ||
      afterRevision < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new RuntimeConfigurationError('configuration_invalid')
    const rows = await this.db
      .select()
      .from(runtimeConfigurationVersions)
      .where(gt(runtimeConfigurationVersions.revision, afterRevision))
      .orderBy(asc(runtimeConfigurationVersions.revision))
      .limit(limit)
    return rows.map(snapshot)
  }
  async update(expectedRevision: number, input: unknown, audit: RuntimeConfigurationAudit) {
    const values = checkedValues(input)
    const parsedAudit = auditSchema.safeParse(audit)
    if (!parsedAudit.success) throw new RuntimeConfigurationError('configuration_invalid')
    checkedRevision(expectedRevision)
    return this.advance(expectedRevision, async () => ({
      values,
      rollbackRevision: null,
      action: 'update',
      ...parsedAudit.data,
    }))
  }
  async rollback(
    expectedRevision: number,
    targetRevision: number,
    actor: RuntimeConfigurationAudit['actor'],
  ) {
    checkedRevision(expectedRevision)
    checkedRevision(targetRevision)
    if (!actorSchema.safeParse(actor).success || targetRevision > expectedRevision)
      throw new RuntimeConfigurationError('configuration_invalid')
    return this.advance(expectedRevision, async (db) => {
      const [target] = await db
        .select()
        .from(runtimeConfigurationVersions)
        .where(eq(runtimeConfigurationVersions.revision, targetRevision))
      if (!target) throw new RuntimeConfigurationError('configuration_version_unknown')
      return {
        values: snapshot(target).values,
        rollbackRevision: targetRevision,
        action: 'rollback',
        actor,
        reason: 'rollback',
      }
    })
  }
  private async advance(
    expectedRevision: number,
    change: (db: Database) => Promise<{
      values: RuntimeConfigurationValues
      rollbackRevision: number | null
      action: 'update' | 'rollback'
      actor: RuntimeConfigurationAudit['actor']
      reason: RuntimeConfigurationAudit['reason'] | 'rollback'
    }>,
  ): Promise<RuntimeConfigurationSnapshot> {
    const createdAt = this.instant()
    return this.db.transaction(async (db) => {
      const [head] = await db
        .select()
        .from(runtimeConfigurationHead)
        .where(eq(runtimeConfigurationHead.singleton, 'runtime'))
        .for('update')
      if (!head) throw new RuntimeConfigurationError('configuration_unavailable')
      if (head.activeRevision !== expectedRevision)
        throw new RuntimeConfigurationError('configuration_changed')
      const next = await change(db)
      const revision = head.activeRevision + 1
      const [row] = await db
        .insert(runtimeConfigurationVersions)
        .values({
          revision,
          schemaVersion: 1,
          previousRevision: head.activeRevision,
          createdAt,
          digest: digestOf(next.values),
          ...next,
        })
        .returning()
      await db
        .update(runtimeConfigurationHead)
        .set({ activeRevision: revision })
        .where(eq(runtimeConfigurationHead.singleton, 'runtime'))
      if (!row) throw new RuntimeConfigurationError('configuration_unavailable')
      return snapshot(row)
    })
  }
}
