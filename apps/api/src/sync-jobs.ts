import { randomUUID } from 'node:crypto'
import { type Database, type DatabaseHandle, schema } from '@lilleri/database'
import { calendarDateAt } from '@lilleri/domain'
import {
  type FinancialDataProvider,
  hasSyntheticSyncContract,
  SyntheticSyncFailure,
  type SyntheticSyncProvider,
  validateSyntheticSyncMetadata,
} from '@lilleri/financial-providers'
import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { assertLifecycleAllowsRefresh } from './consent-lifecycle.js'
import type { ProfileEncryption } from './encryption.js'
import { notFound, Problem, providerFailure } from './problem.js'
import { providerAdmitted } from './provider-admission.js'
import {
  DEFAULT_SYNC_CONFIGURATION,
  type RuntimeConfigurationSnapshot,
  syncConfigurationSchema,
} from './runtime-config.js'
import { applySyncStage, type SyncSourceFactRecorder } from './sync-ledger.js'
import {
  addDays,
  planSync,
  SyncContractError,
  type SyncStage,
  syncDate,
  syncHash,
  syncInstant,
  syncRequired,
  validateSyncPage,
  validateSyncSnapshot,
} from './sync-provider.js'
import {
  emptySyncReport,
  type SyncDegradedReason,
  type SyncJobState,
  type SyncMode,
  syncActivity,
  syncJobs,
  syncReservations,
  syncStages,
} from './sync-schema.js'

export type SyncScope = DatabaseHandle['withProfile']
export interface SyncStartInput {
  readonly requestId: string
  readonly mode: SyncMode
  readonly from?: string
  readonly to?: string
}
export interface LegacySyncReport {
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
  readonly rejected: number
  readonly syncedAt: string
}
export const SYNC_TERMINAL_STATES: readonly SyncJobState[] = [
  'completed',
  'blocked',
  'failed',
  'cancelled',
]
export function publicSyncJob(job: typeof syncJobs.$inferSelect) {
  const {
    householdId: _householdId,
    requestHash: _requestHash,
    configuration: _configuration,
    providerPolicy: _providerPolicy,
    leaseToken: _leaseToken,
    ...value
  } = job
  return value
}
export type SyncJobDto = ReturnType<typeof publicSyncJob>
export async function readSyncJob(
  db: Database,
  profileId: string,
  jobId: string,
): Promise<SyncJobDto> {
  const [job] = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.profileId, profileId), eq(syncJobs.id, jobId)))
  if (!job) throw notFound()
  return publicSyncJob(job)
}
export async function listSyncJobs(
  db: Database,
  profileId: string,
  connectionId: string,
): Promise<SyncJobDto[]> {
  const [connection] = await db
    .select({ id: schema.connections.id })
    .from(schema.connections)
    .where(
      and(eq(schema.connections.profileId, profileId), eq(schema.connections.id, connectionId)),
    )
  if (!connection) throw notFound()
  return (
    await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.profileId, profileId), eq(syncJobs.connectionId, connectionId)))
      .orderBy(desc(syncJobs.createdAt), desc(syncJobs.id))
      .limit(100)
  ).map(publicSyncJob)
}
export interface SyncCoordinatorOptions {
  readonly scope: SyncScope
  readonly profileId: string
  readonly provider: FinancialDataProvider
  readonly configuration: RuntimeConfigurationSnapshot
  readonly now?: () => string
  readonly encryption?: ProfileEncryption
  readonly afterCompleted?: (job: SyncJobDto) => Promise<void>
  readonly recordSourceFacts?: SyncSourceFactRecorder
}
const plus = (at: string, ms: number) => new Date(Date.parse(at) + ms).toISOString()
const envelopeContext = (profileId: string, jobId: string) => ({
  profileId,
  table: 'sync_stages',
  column: 'payload',
  rowId: jobId,
})
class SyncLeaseLost extends Error {}
class SyncAttemptTimeout extends Error {}
async function timeout<T>(work: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SyncAttemptTimeout()), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** All DB phases are independent committed server-derived scopes; provider I/O never holds SQL locks. */
export class SyncCoordinator {
  readonly now: () => string
  readonly provider: SyntheticSyncProvider | null
  constructor(readonly options: SyncCoordinatorOptions) {
    this.now = options.now ?? (() => new Date().toISOString())
    if (!providerAdmitted(options.provider)) throw new Error('Durable sync is synthetic only')
    this.provider = hasSyntheticSyncContract(options.provider) ? options.provider : null
    syncConfigurationSchema.parse(options.configuration.values.sync ?? DEFAULT_SYNC_CONFIGURATION)
  }
  private scope<T>(work: (db: Database) => Promise<T>) {
    return this.options.scope(this.options.profileId, work)
  }
  private async owned(db: Database, connectionId: string) {
    const [profile] = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.options.profileId))
      .for('update')
    if (!profile) throw notFound()
    const [connection] = await db
      .select()
      .from(schema.connections)
      .where(
        and(
          eq(schema.connections.profileId, this.options.profileId),
          eq(schema.connections.id, connectionId),
        ),
      )
      .for('update')
    if (!connection) throw notFound()
    if (connection.providerId !== this.options.provider.id)
      throw new Problem(
        409,
        'manual_source',
        'Questa fonte usa inserimenti o importazioni manuali.',
      )
    return connection
  }
  private async job(db: Database, jobId: string) {
    const [job] = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.profileId, this.options.profileId), eq(syncJobs.id, jobId)))
      .for('update')
    if (!job) throw notFound()
    return job
  }
  private async readStage(
    db: Database,
    job: typeof syncJobs.$inferSelect,
  ): Promise<SyncStage | null> {
    const [row] = await db
      .select()
      .from(syncStages)
      .where(and(eq(syncStages.profileId, this.options.profileId), eq(syncStages.jobId, job.id)))
    if (!row) return null
    if (row.expiresAt <= syncInstant(this.now())) throw new SyntheticSyncFailure('snapshot_expired')
    let payload = row.payload
    if (this.options.encryption) {
      if (Object.keys(payload).length !== 1 || typeof payload._lilleriEncrypted !== 'string')
        throw new Error('Invalid sync stage encryption')
      payload = await this.options.encryption.decryptJson<Record<string, unknown>>(
        db,
        envelopeContext(this.options.profileId, job.id),
        payload._lilleriEncrypted,
      )
    }
    return payload as unknown as SyncStage
  }
  private async saveStage(
    db: Database,
    job: typeof syncJobs.$inferSelect,
    stage: SyncStage,
    at: string,
  ) {
    if (
      Buffer.byteLength(JSON.stringify(stage), 'utf8') >
      (job.configuration.maxStageBytes ?? DEFAULT_SYNC_CONFIGURATION.maxStageBytes)
    )
      throw new SyncContractError('bound_reached')
    const payload = this.options.encryption
      ? {
          _lilleriEncrypted: await this.options.encryption.encryptJson(
            db,
            envelopeContext(this.options.profileId, job.id),
            stage as unknown as Record<string, unknown>,
          ),
        }
      : (stage as unknown as Record<string, unknown>)
    await db
      .insert(syncStages)
      .values({
        jobId: job.id,
        profileId: this.options.profileId,
        payload,
        expiresAt: plus(at, job.configuration.stageRetentionMs),
      })
      .onConflictDoUpdate({ target: syncStages.jobId, set: { payload } })
  }
  async recordActivity() {
    return this.scope(async (db) => {
      const at = syncInstant(this.now())
      await db
        .insert(syncActivity)
        .values({ profileId: this.options.profileId, lastUserPresentAt: at })
        .onConflictDoUpdate({ target: syncActivity.profileId, set: { lastUserPresentAt: at } })
    })
  }
  async start(connectionId: string, input: SyncStartInput): Promise<SyncJobDto> {
    if (!this.provider)
      throw new Problem(
        409,
        'sync_policy_unknown',
        'Questa fonte non dichiara un contratto di sincronizzazione riprendibile.',
      )
    if (
      typeof input.requestId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,200}$/u.test(input.requestId) ||
      !['user_present', 'unattended'].includes(input.mode)
    )
      throw new Problem(422, 'invalid_sync_request', 'La richiesta di aggiornamento non è valida.')
    const metadata = validateSyntheticSyncMetadata(this.provider.syncMetadata())
    if (metadata.providerId !== this.provider.id)
      throw new SyncContractError('invalid_provider_contract')
    const configuration = syncConfigurationSchema.parse(
      this.options.configuration.values.sync ?? DEFAULT_SYNC_CONFIGURATION,
    )
    if (!configuration.enabled)
      throw new Problem(
        409,
        'sync_disabled',
        'Gli aggiornamenti sono temporaneamente sospesi. Lo storico resta disponibile.',
      )
    const requestHash = syncHash(input)
    return this.scope(async (db) => {
      const connection = await this.owned(db, connectionId),
        at = syncInstant(this.now())
      const [profile] = await db
          .select({ timezone: schema.profiles.timezone })
          .from(schema.profiles)
          .where(eq(schema.profiles.id, this.options.profileId)),
        today = calendarDateAt(new Date(at), syncRequired(profile).timezone)
      const [existing] = await db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.profileId, this.options.profileId),
            eq(syncJobs.connectionId, connectionId),
            eq(syncJobs.requestId, input.requestId),
          ),
        )
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new Problem(
            409,
            'sync_request_conflict',
            'Questa richiesta di aggiornamento è già stata usata con dati diversi.',
          )
        return publicSyncJob(existing)
      }
      const lifecycle = await assertLifecycleAllowsRefresh(
        db,
        this.options.profileId,
        connectionId,
        at,
      )
      if (!lifecycle.consentId)
        throw new Problem(
          409,
          'consent_inactive',
          'Il consenso non è disponibile per questo aggiornamento.',
        )
      let requestedTo: string, requestedFrom: string | null
      try {
        requestedTo = syncDate(input.to ?? today)
        const trailingFrom = addDays(requestedTo, 1 - configuration.trailingDays),
          previousSyncDate = connection.lastSyncedAt
            ? calendarDateAt(new Date(connection.lastSyncedAt), syncRequired(profile).timezone)
            : null
        requestedFrom = input.from
          ? syncDate(input.from)
          : previousSyncDate
            ? previousSyncDate < trailingFrom
              ? previousSyncDate
              : trailingFrom
            : null
      } catch {
        throw new Problem(
          422,
          'invalid_sync_interval',
          'Scegli date di calendario valide per l’aggiornamento.',
        )
      }
      if (requestedTo > today || (requestedFrom && requestedFrom > requestedTo))
        throw new Problem(422, 'invalid_sync_interval', 'Scegli un intervallo concluso e valido.')
      const [active] = await db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.profileId, this.options.profileId),
            eq(syncJobs.connectionId, connectionId),
            inArray(syncJobs.state, ['queued', 'running', 'partial', 'retry_wait']),
          ),
        )
        .limit(1)
      if (active)
        throw new Problem(
          409,
          'sync_in_progress',
          'È già presente un aggiornamento da completare per questo collegamento.',
        )
      if (input.mode === 'user_present')
        await db
          .insert(syncActivity)
          .values({ profileId: this.options.profileId, lastUserPresentAt: at })
          .onConflictDoUpdate({ target: syncActivity.profileId, set: { lastUserPresentAt: at } })
      const [job] = await db
        .insert(syncJobs)
        .values({
          id: `sync_job_${randomUUID()}`,
          profileId: this.options.profileId,
          connectionId,
          consentId: lifecycle.consentId,
          providerId: this.options.provider.id,
          requestId: input.requestId,
          requestHash,
          mode: input.mode,
          requestedFrom,
          requestedTo,
          state: 'queued',
          reason: null,
          configurationRevision: this.options.configuration.revision,
          configurationDigest: this.options.configuration.digest,
          configuration,
          providerPolicy: metadata,
          leaseToken: null,
          leaseExpiresAt: null,
          leaseEpoch: 0,
          failures: 0,
          availableAt: at,
          revision: 1,
          report: emptySyncReport(),
          createdAt: at,
          updatedAt: at,
          completedAt: null,
        })
        .returning()
      if (!job) throw new Error('Sync job insert failed')
      return publicSyncJob(job)
    })
  }
  async get(jobId: string) {
    return this.scope((db) => readSyncJob(db, this.options.profileId, jobId))
  }
  async list(connectionId: string) {
    return this.scope((db) => listSyncJobs(db, this.options.profileId, connectionId))
  }
  /** Expired raw checkpoints are removed even when ingestion is disabled. Audit metadata remains. */
  async cleanupExpiredStages() {
    return this.scope(async (db) => {
      await db
        .select({ id: schema.profiles.id })
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.options.profileId))
        .for('update')
      const at = syncInstant(this.now()),
        limit =
          this.options.configuration.values.sync?.jobsPerProfile ??
          DEFAULT_SYNC_CONFIGURATION.jobsPerProfile
      const expired = await db
        .select({ jobId: syncStages.jobId })
        .from(syncStages)
        .where(and(eq(syncStages.profileId, this.options.profileId), lte(syncStages.expiresAt, at)))
        .orderBy(asc(syncStages.expiresAt), asc(syncStages.jobId))
        .limit(limit)
      for (const row of expired) {
        const job = await this.job(db, row.jobId)
        await db
          .delete(syncStages)
          .where(
            and(eq(syncStages.profileId, this.options.profileId), eq(syncStages.jobId, row.jobId)),
          )
        if (['queued', 'running', 'partial', 'retry_wait'].includes(job.state))
          await this.setState(db, job, 'failed', 'snapshot_expired', at)
      }
      return { deleted: expired.length }
    })
  }
  private async setState(
    db: Database,
    job: typeof syncJobs.$inferSelect,
    state: SyncJobState,
    reason: SyncDegradedReason,
    at: string,
    extra: Partial<typeof syncJobs.$inferInsert> = {},
  ) {
    const [updated] = await db
      .update(syncJobs)
      .set({
        state,
        reason,
        leaseToken: null,
        leaseExpiresAt: null,
        updatedAt: at,
        revision: job.revision + 1,
        ...extra,
      })
      .where(and(eq(syncJobs.profileId, this.options.profileId), eq(syncJobs.id, job.id)))
      .returning()
    if (!updated) throw notFound()
    return updated
  }
  private async claim(jobId: string) {
    return this.scope(async (db) => {
      const [initial] = await db
        .select()
        .from(syncJobs)
        .where(and(eq(syncJobs.profileId, this.options.profileId), eq(syncJobs.id, jobId)))
      if (!initial) throw notFound()
      await this.owned(db, initial.connectionId)
      // The profile lock serializes budgets and concurrent generation changes, not provider calls.
      const job = await this.job(db, jobId),
        at = syncInstant(this.now())
      if (
        !(this.options.configuration.values.sync?.enabled ?? DEFAULT_SYNC_CONFIGURATION.enabled) ||
        SYNC_TERMINAL_STATES.includes(job.state) ||
        job.availableAt > at ||
        (job.state === 'running' && job.leaseExpiresAt !== null && job.leaseExpiresAt > at)
      )
        return { job, stage: null, claimed: false }
      try {
        const lifecycle = await assertLifecycleAllowsRefresh(
          db,
          this.options.profileId,
          job.connectionId,
          at,
        )
        if (lifecycle.consentId !== job.consentId)
          throw new Problem(
            409,
            'consent_inactive',
            'Il consenso di questo aggiornamento è cambiato.',
          )
      } catch (error) {
        if (!(error instanceof Problem)) throw error
        return {
          job: await this.setState(db, job, 'blocked', 'consent_inactive', at),
          stage: null,
          claimed: false,
        }
      }
      if (!job.configuration.enabled)
        return {
          job: await this.setState(db, job, 'blocked', 'policy_unknown', at),
          stage: null,
          claimed: false,
        }
      let stage: SyncStage | null = null
      try {
        stage = await this.readStage(db, job)
      } catch (error) {
        if (!(error instanceof SyntheticSyncFailure)) throw error
        await db
          .delete(syncStages)
          .where(
            and(eq(syncStages.profileId, this.options.profileId), eq(syncStages.jobId, job.id)),
          )
      }
      if (!stage) {
        const metadata = job.providerPolicy
        if (job.mode === 'user_present' && metadata.userPresent !== 'supported')
          return {
            job: await this.setState(db, job, 'blocked', 'policy_unknown', at),
            stage: null,
            claimed: false,
          }
        const budget = metadata.unattendedBudget
        if (job.mode === 'unattended') {
          const [activity] = await db
            .select()
            .from(syncActivity)
            .where(eq(syncActivity.profileId, this.options.profileId))
          if (
            !activity ||
            Date.parse(at) - Date.parse(activity.lastUserPresentAt) >
              job.configuration.inactiveAfterDays * 86_400_000
          )
            return {
              job: await this.setState(db, job, 'blocked', 'inactive', at),
              stage: null,
              claimed: false,
            }
          if (!budget)
            return {
              job: await this.setState(db, job, 'blocked', 'policy_unknown', at),
              stage: null,
              claimed: false,
            }
        }
        const windowMs = (budget?.windowSeconds ?? 86_400) * 1000,
          windowStart = new Date(Math.floor(Date.parse(at) / windowMs) * windowMs).toISOString(),
          windowEnd = plus(windowStart, windowMs)
        if (job.mode === 'unattended') {
          const dayStart = `${at.slice(0, 10)}T00:00:00.000Z`,
            dayEnd = plus(dayStart, 86_400_000)
          const reservations = await db
            .select({ id: syncReservations.id, reservedAt: syncReservations.reservedAt })
            .from(syncReservations)
            .where(
              and(
                eq(syncReservations.profileId, this.options.profileId),
                eq(syncReservations.consentId, job.consentId),
                eq(syncReservations.mode, 'unattended'),
                or(
                  and(
                    gte(syncReservations.reservedAt, windowStart),
                    lt(syncReservations.reservedAt, windowEnd),
                  ),
                  and(
                    gte(syncReservations.reservedAt, dayStart),
                    lt(syncReservations.reservedAt, dayEnd),
                  ),
                ),
              ),
            )
          const day = at.slice(0, 10)
          if (
            reservations.filter(
              (row) => row.reservedAt >= windowStart && row.reservedAt < windowEnd,
            ).length >= syncRequired(budget).requests ||
            reservations.filter((row) => row.reservedAt.slice(0, 10) === day).length >=
              job.configuration.freeDailyRefreshes
          )
            return {
              job: await this.setState(db, job, 'blocked', 'budget_reached', at, {
                availableAt: windowEnd > dayEnd ? windowEnd : dayEnd,
              }),
              stage: null,
              claimed: false,
            }
        }
        await db.insert(syncReservations).values({
          id: `sync_reservation_${randomUUID()}`,
          profileId: this.options.profileId,
          connectionId: job.connectionId,
          consentId: job.consentId,
          jobId: job.id,
          leaseEpoch: job.leaseEpoch + 1,
          mode: job.mode,
          windowStart,
          windowEnd,
          providerLimit: budget?.requests ?? null,
          evidenceReference: budget?.evidenceReference ?? null,
          reservedAt: at,
        })
      }
      const [claimed] = await db
        .update(syncJobs)
        .set({
          state: 'running',
          reason: null,
          leaseToken: randomUUID(),
          leaseExpiresAt: plus(at, job.configuration.leaseMs),
          leaseEpoch: job.leaseEpoch + 1,
          updatedAt: at,
          revision: job.revision + 1,
        })
        .where(and(eq(syncJobs.profileId, this.options.profileId), eq(syncJobs.id, job.id)))
        .returning()
      if (!claimed) throw notFound()
      return { job: claimed, stage, claimed: true }
    })
  }
  private async fence(db: Database, claim: typeof syncJobs.$inferSelect) {
    await this.owned(db, claim.connectionId)
    const job = await this.job(db, claim.id),
      at = syncInstant(this.now())
    if (
      job.state !== 'running' ||
      job.leaseToken !== claim.leaseToken ||
      job.leaseEpoch !== claim.leaseEpoch ||
      !job.leaseExpiresAt ||
      job.leaseExpiresAt <= at
    )
      throw new SyncLeaseLost()
    const lifecycle = await assertLifecycleAllowsRefresh(
      db,
      this.options.profileId,
      claim.connectionId,
      at,
    )
    if (lifecycle.consentId !== claim.consentId)
      throw new Problem(409, 'consent_inactive', 'Il consenso di questo aggiornamento è cambiato.')
    return { job, at }
  }
  private async checkpoint(claim: typeof syncJobs.$inferSelect, stage: SyncStage) {
    return this.scope(async (db) => {
      const { job, at } = await this.fence(db, claim)
      await this.saveStage(db, job, stage, at)
      const report = {
        ...job.report,
        pages: stage.pages,
        payloadRecords: stage.records.length,
        windowsCompleted: stage.windowIndex,
        windowsTotal: stage.windows.length,
      }
      const [updated] = await db
        .update(syncJobs)
        .set({
          report,
          revision: job.revision + 1,
          updatedAt: at,
          leaseExpiresAt: plus(at, job.configuration.leaseMs),
        })
        .where(and(eq(syncJobs.profileId, this.options.profileId), eq(syncJobs.id, job.id)))
        .returning()
      if (!updated) throw notFound()
      return updated
    })
  }
  private async failed(claim: typeof syncJobs.$inferSelect, error: unknown) {
    return this.scope(async (db) => {
      await this.owned(db, claim.connectionId)
      const job = await this.job(db, claim.id),
        at = syncInstant(this.now())
      if (
        job.leaseToken !== claim.leaseToken ||
        job.leaseEpoch !== claim.leaseEpoch ||
        job.state !== 'running'
      )
        return publicSyncJob(job)
      if (!(error instanceof Problem)) {
        try {
          const lifecycle = await assertLifecycleAllowsRefresh(
            db,
            this.options.profileId,
            job.connectionId,
            at,
          )
          if (lifecycle.consentId !== job.consentId)
            throw new Problem(
              409,
              'consent_inactive',
              'Il consenso di questo aggiornamento è cambiato.',
            )
        } catch (cause) {
          if (cause instanceof Problem) error = cause
          else throw cause
        }
      }
      const reason: SyncDegradedReason =
        error instanceof Problem
          ? 'consent_inactive'
          : error instanceof SyncAttemptTimeout
            ? 'timeout'
            : error instanceof SyncContractError
              ? error.reason
              : error instanceof SyntheticSyncFailure
                ? error.code === 'rate_limited'
                  ? 'rate_limited'
                  : error.code === 'snapshot_expired'
                    ? 'snapshot_expired'
                    : 'provider_unavailable'
                : 'provider_unavailable'
      const failures = job.failures + 1,
        permanent =
          error instanceof Problem ||
          error instanceof SyncContractError ||
          failures >= job.configuration.maxAttempts
      if (error instanceof SyntheticSyncFailure && error.code === 'snapshot_expired')
        await db
          .delete(syncStages)
          .where(
            and(eq(syncStages.profileId, this.options.profileId), eq(syncStages.jobId, job.id)),
          )
      const delay =
        error instanceof SyntheticSyncFailure && error.retryAfterSeconds !== null
          ? error.retryAfterSeconds * 1000
          : Math.min(86_400_000, job.configuration.retryBaseMs * 2 ** (failures - 1))
      return publicSyncJob(
        await this.setState(
          db,
          job,
          error instanceof Problem ? 'blocked' : permanent ? 'failed' : 'retry_wait',
          reason,
          at,
          { failures, availableAt: plus(at, delay) },
        ),
      )
    })
  }
  async run(jobId: string): Promise<SyncJobDto> {
    if (!this.provider)
      throw new Problem(
        409,
        'sync_policy_unknown',
        'Questa fonte non dispone di aggiornamenti riprendibili.',
      )
    const provider = this.provider
    const claim = await this.claim(jobId)
    if (!claim.claimed) return publicSyncJob(claim.job)
    let current = claim.job,
      stage = claim.stage
    const context = {
      profileId: this.options.profileId,
      connectionId: current.connectionId,
      grantId: current.consentId,
    }
    try {
      if (!stage) {
        const snapshot = validateSyncSnapshot(
          await timeout(
            () => provider.openSync(context, current.mode, syncInstant(this.now())),
            current.configuration.attemptTimeoutMs,
          ),
          current.providerId,
          context,
          current.configuration,
          syncInstant(this.now()),
        )
        stage = planSync(
          snapshot,
          current.requestedFrom,
          current.requestedTo,
          current.configuration,
          current.providerPolicy,
        )
        current = await this.checkpoint(current, stage)
      }
      for (
        let count = 0;
        count < current.configuration.maxPagesPerSlice && stage.windowIndex < stage.windows.length;
        count++
      ) {
        if (stage.pages >= current.configuration.maxPagesPerJob)
          throw new SyncContractError('bound_reached')
        const window = syncRequired(stage.windows[stage.windowIndex]),
          account = syncRequired(
            stage.snapshot.accounts.find((account) => account.id === window.accountId),
          )
        const request = {
          snapshotId: stage.snapshot.snapshotId,
          ...window,
          cursor: stage.cursor,
          pageSize: Math.min(current.configuration.pageSize, current.providerPolicy.maxPageSize),
        }
        const page = validateSyncPage(
          await timeout(
            () => provider.getSyncPage(context, request),
            current.configuration.attemptTimeoutMs,
          ),
          request,
          account,
          current.providerId,
          context,
          current.providerPolicy,
        )
        if (
          stage.records.length + page.transactions.length >
          current.configuration.maxRecordsPerJob
        )
          throw new SyncContractError('bound_reached')
        if (
          page.nextCursor !== null &&
          (page.nextCursor === stage.cursor || stage.seenCursors.includes(page.nextCursor))
        )
          throw new SyncContractError('invalid_provider_contract')
        stage.records.push(...page.transactions)
        stage.pages++
        stage.complete[stage.windowIndex] =
          (stage.complete[stage.windowIndex] ?? true) && page.coverage === 'complete_window'
        if (page.nextCursor === null) {
          stage.windowIndex++
          stage.cursor = null
          stage.seenCursors = []
        } else {
          stage.cursor = page.nextCursor
          stage.seenCursors.push(page.nextCursor)
        }
        current = await this.checkpoint(current, stage)
      }
      const finished = stage.windowIndex === stage.windows.length
      const result = await this.scope(async (db) => {
        const { job, at } = await this.fence(db, current)
        if (!finished) return publicSyncJob(await this.setState(db, job, 'partial', 'partial', at))
        const report = await applySyncStage(
          db,
          job,
          syncRequired(stage),
          at,
          this.options.encryption,
          this.options.recordSourceFacts,
        )
        await db
          .delete(syncStages)
          .where(
            and(eq(syncStages.profileId, this.options.profileId), eq(syncStages.jobId, job.id)),
          )
        return publicSyncJob(
          await this.setState(
            db,
            job,
            'completed',
            report.issues.some((issue) => issue.kind === 'history_gap') ? 'history_gap' : null,
            at,
            { report, completedAt: at },
          ),
        )
      })
      if (result.state === 'completed') await this.options.afterCompleted?.(result)
      return result
    } catch (error) {
      if (error instanceof SyncLeaseLost) return this.get(jobId)
      return this.failed(current, error)
    }
  }
  async wait(jobId: string): Promise<SyncJobDto> {
    let result = await this.get(jobId)
    const bound = await this.scope(
      async (db) => (await this.job(db, jobId)).configuration.maxWaitSlices,
    )
    for (let count = 0; count < bound && !SYNC_TERMINAL_STATES.includes(result.state); count++) {
      result = await this.run(jobId)
      if (result.state === 'retry_wait' || result.state === 'running') break
    }
    return result
  }
  async sync(connectionId: string): Promise<LegacySyncReport> {
    const job = await this.start(connectionId, { requestId: randomUUID(), mode: 'user_present' }),
      result = await this.wait(job.id)
    if (result.state === 'completed' && result.report.syncedAt)
      return {
        inserted: result.report.inserted,
        updated: result.report.updated,
        unchanged: result.report.unchanged,
        rejected: result.report.rejected,
        syncedAt: result.report.syncedAt,
      }
    if (result.reason === 'consent_inactive')
      throw new Problem(409, 'consent_inactive', 'Il consenso non consente questo aggiornamento.')
    if (result.reason === 'budget_reached')
      throw new Problem(
        429,
        'sync_budget_reached',
        'Il limite di aggiornamento è stato raggiunto. Lo storico resta disponibile.',
      )
    if (result.state === 'partial' || result.state === 'running')
      throw new Problem(
        409,
        'sync_partial',
        'L’aggiornamento è ancora parziale. Riprendilo dal dettaglio del collegamento.',
      )
    throw providerFailure()
  }
  /** One server-owned foreground gesture, with at most one bounded provider slice. */
  async runForegroundSlice(): Promise<SyncJobDto | null> {
    const configuration = syncConfigurationSchema.parse(
      this.options.configuration.values.sync ?? DEFAULT_SYNC_CONFIGURATION,
    )
    if (!configuration.enabled || !this.provider) return null
    const metadata = validateSyntheticSyncMetadata(this.provider.syncMetadata())
    if (metadata.providerId !== this.provider.id || metadata.userPresent !== 'supported')
      return null
    await this.recordActivity()
    const at = syncInstant(this.now())
    const [due] = await this.scope((db) =>
      db
        .select({ id: syncJobs.id })
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.profileId, this.options.profileId),
            eq(syncJobs.providerId, this.provider?.id ?? this.options.provider.id),
            eq(syncJobs.mode, 'user_present'),
            lte(syncJobs.availableAt, at),
            or(
              inArray(syncJobs.state, ['queued', 'partial', 'retry_wait']),
              and(eq(syncJobs.state, 'running'), lte(syncJobs.leaseExpiresAt, at)),
            ),
          ),
        )
        .orderBy(asc(syncJobs.availableAt), asc(syncJobs.createdAt), asc(syncJobs.id))
        .limit(1),
    )
    if (due) return this.run(due.id)
    const connections = await this.scope((db) =>
      db
        .select({ id: schema.connections.id })
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.profileId, this.options.profileId),
            eq(schema.connections.providerId, this.options.provider.id),
            eq(schema.connections.status, 'active'),
          ),
        )
        .orderBy(
          sql`${schema.connections.lastSyncedAt} ASC NULLS FIRST`,
          asc(schema.connections.id),
        )
        .limit(configuration.jobsPerProfile),
    )
    for (const connection of connections) {
      try {
        const job = await this.start(connection.id, {
          requestId: `foreground_${randomUUID()}`,
          mode: 'user_present',
        })
        return await this.run(job.id)
      } catch (error) {
        if (!(error instanceof Problem)) throw error
      }
    }
    return null
  }
  async scheduleProfile(): Promise<SyncJobDto[]> {
    const at = syncInstant(this.now()),
      limit =
        this.options.configuration.values.sync?.jobsPerProfile ??
        DEFAULT_SYNC_CONFIGURATION.jobsPerProfile
    const due = await this.scope((db) =>
      db
        .select({ id: syncJobs.id })
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.profileId, this.options.profileId),
            eq(syncJobs.mode, 'unattended'),
            lte(syncJobs.availableAt, at),
            or(
              inArray(syncJobs.state, ['queued', 'partial', 'retry_wait']),
              and(eq(syncJobs.state, 'running'), lte(syncJobs.leaseExpiresAt, at)),
            ),
          ),
        )
        .orderBy(asc(syncJobs.availableAt), asc(syncJobs.createdAt), asc(syncJobs.id))
        .limit(limit),
    )
    const results: SyncJobDto[] = []
    for (const job of due) results.push(await this.run(job.id))
    if (results.length >= limit) return results
    const connections = await this.scope((db) =>
      db
        .select({ id: schema.connections.id })
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.profileId, this.options.profileId),
            eq(schema.connections.providerId, this.options.provider.id),
            eq(schema.connections.status, 'active'),
          ),
        )
        .orderBy(asc(schema.connections.id))
        .limit(
          this.options.configuration.values.sync?.jobsPerProfile ??
            DEFAULT_SYNC_CONFIGURATION.jobsPerProfile,
        ),
    )
    for (const connection of connections) {
      if (results.length >= limit) break
      try {
        const job = await this.start(connection.id, {
          requestId: `scheduled_${syncInstant(this.now()).slice(0, 10)}`,
          mode: 'unattended',
        })
        results.push(await this.run(job.id))
      } catch (error) {
        if (!(error instanceof Problem)) throw error
      }
    }
    return results
  }
}
