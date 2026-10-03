import { randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { type FinancialDataProvider, stableId } from '@lilleri/financial-providers'
import { and, asc, eq, inArray, lte, or } from 'drizzle-orm'
import { Problem } from './problem.js'

export type RevocationJob = typeof schema.revocationJobs.$inferSelect
export interface RevocationTarget {
  readonly profileId: string
  readonly connectionId: string
  readonly providerId: string
  readonly consentId: string
}
export interface RevocationOptions {
  readonly now?: () => string
  readonly leaseMs?: number
  readonly maxAttempts?: number
  readonly attemptTimeoutMs?: number
  readonly jobId?: string
  readonly profileId?: string
}
export interface RevocationResult {
  readonly jobId: string
  readonly state: 'pending' | 'completed' | 'failed' | 'stale'
  readonly attempts: number
}
const clock = (options: RevocationOptions) => {
  const now = options.now?.() ?? new Date().toISOString()
  if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid revocation clock')
  return new Date(now).toISOString()
}
const timeAfter = (now: string, duration: number) =>
  new Date(Date.parse(now) + duration).toISOString()
const bounds = (options: RevocationOptions) => {
  const leaseMs = options.leaseMs ?? 30_000
  const maxAttempts = options.maxAttempts ?? 8
  const attemptTimeoutMs = options.attemptTimeoutMs ?? Math.min(10_000, leaseMs)
  if (!Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300_000)
    throw new Error('Revocation lease must be between 1 and 300 seconds')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20)
    throw new Error('Revocation attempts must be between 1 and 20')
  if (!Number.isInteger(attemptTimeoutMs) || attemptTimeoutMs < 1 || attemptTimeoutMs > leaseMs)
    throw new Error('Revocation attempt timeout must fit within its lease')
  return { leaseMs, maxAttempts, attemptTimeoutMs }
}

/** Call inside the same transaction that denies local consent or deletes the profile. */
export async function enqueueRevocation(
  db: Database,
  target: RevocationTarget,
  now = new Date().toISOString(),
): Promise<string> {
  for (const value of Object.values(target)) {
    if (!value || value.length > 200) throw new Error('Invalid revocation target')
  }
  const createdAt = clock({ now: () => now })
  const id = stableId('revoke', target.profileId, target.connectionId, target.consentId)
  await db
    .insert(schema.revocationJobs)
    .values({
      id,
      ...target,
      state: 'pending',
      attempts: 0,
      createdAt,
      nextAttemptAt: createdAt,
      deadlineAt: timeAfter(createdAt, 7 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing()
  return id
}

/** Caller holds the profile lock. A terminal unacknowledged job also prevents a new grant. */
export async function assertNoOutstandingRevocation(
  db: Database,
  profileId: string,
  connectionId: string,
) {
  const [outstanding] = await db
    .select({ id: schema.revocationJobs.id })
    .from(schema.revocationJobs)
    .where(
      and(
        eq(schema.revocationJobs.profileId, profileId),
        eq(schema.revocationJobs.connectionId, connectionId),
        inArray(schema.revocationJobs.state, ['pending', 'running', 'failed']),
      ),
    )
    .limit(1)
  if (outstanding)
    throw new Problem(
      409,
      'revocation_pending',
      'La revoca precedente attende conferma. Riprova il collegamento dopo il completamento.',
    )
}

/** Returns only synthetic routing/status; the profile is trusted configuration, never a request selector. */
export async function revocationsForProfile(db: Database, profileId: string) {
  return db
    .select({
      id: schema.revocationJobs.id,
      connectionId: schema.revocationJobs.connectionId,
      state: schema.revocationJobs.state,
      attempts: schema.revocationJobs.attempts,
      nextAttemptAt: schema.revocationJobs.nextAttemptAt,
      deadlineAt: schema.revocationJobs.deadlineAt,
      completedAt: schema.revocationJobs.completedAt,
      lastErrorCode: schema.revocationJobs.lastErrorCode,
    })
    .from(schema.revocationJobs)
    .where(eq(schema.revocationJobs.profileId, profileId))
    .orderBy(asc(schema.revocationJobs.createdAt), asc(schema.revocationJobs.id))
}

/** Claim commits before provider I/O. Row locking also works on actual PostgreSQL workers. */
export async function claimRevocation(db: Database, options: RevocationOptions = {}) {
  const now = clock(options)
  const { leaseMs, maxAttempts } = bounds(options)
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(schema.revocationJobs)
      .where(
        and(
          or(
            and(
              eq(schema.revocationJobs.state, 'pending'),
              or(
                lte(schema.revocationJobs.nextAttemptAt, now),
                lte(schema.revocationJobs.deadlineAt, now),
              ),
            ),
            and(
              eq(schema.revocationJobs.state, 'running'),
              lte(schema.revocationJobs.leaseExpiresAt, now),
            ),
          ),
          options.jobId ? eq(schema.revocationJobs.id, options.jobId) : undefined,
          options.profileId ? eq(schema.revocationJobs.profileId, options.profileId) : undefined,
        ),
      )
      .orderBy(asc(schema.revocationJobs.nextAttemptAt), asc(schema.revocationJobs.id))
      .limit(1)
      .for('update', { skipLocked: true })
    if (!job) return null
    const expired = job.deadlineAt <= now
    if (expired || job.attempts >= maxAttempts) {
      const [failed] = await tx
        .update(schema.revocationJobs)
        .set({
          state: 'failed',
          leaseToken: null,
          leaseExpiresAt: null,
          lastErrorCode: expired ? 'deadline_exceeded' : 'attempts_exhausted',
        })
        .where(eq(schema.revocationJobs.id, job.id))
        .returning()
      return failed ?? null
    }
    const [claimed] = await tx
      .update(schema.revocationJobs)
      .set({
        state: 'running',
        attempts: job.attempts + 1,
        leaseToken: randomUUID(),
        leaseExpiresAt: timeAfter(now, leaseMs),
      })
      .where(eq(schema.revocationJobs.id, job.id))
      .returning()
    return claimed ?? null
  })
}

/** At-least-once: generation-specific provider revocation makes expired-lease duplication safe. */
export async function processNextRevocation(
  db: Database,
  providers: readonly FinancialDataProvider[],
  options: RevocationOptions = {},
): Promise<RevocationResult | null> {
  const { maxAttempts, attemptTimeoutMs } = bounds(options)
  for (const provider of providers) {
    const capabilities = provider.capabilities()
    if (!capabilities.synthetic || !capabilities.grantSpecificRevocation)
      throw new Error('The demo worker requires synthetic grant-specific revocation')
  }
  const job = await claimRevocation(db, options)
  if (!job) return null
  if (job.state === 'failed') return { jobId: job.id, state: 'failed', attempts: job.attempts }
  const provider = providers.find((candidate) => candidate.id === job.providerId)
  let errorCode: RevocationJob['lastErrorCode'] = provider ? null : 'provider_unknown'
  if (provider) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        provider.disconnect({
          profileId: job.profileId,
          connectionId: job.connectionId,
          grantId: job.consentId,
        }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Revocation attempt timeout')),
            attemptTimeoutMs,
          )
        }),
      ])
    } catch {
      errorCode = 'provider_unavailable'
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  const now = clock(options)
  const state = errorCode
    ? job.attempts >= maxAttempts || job.deadlineAt <= now || !provider
      ? 'failed'
      : 'pending'
    : 'completed'
  // Deterministic bounded jitter spreads retries and is reproducible in failure tests.
  const jitter = 0.8 + (Number.parseInt(job.id.slice(-2), 16) / 255) * 0.4
  const retryMs = Math.round(Math.min(3_600_000, 1000 * 2 ** (job.attempts - 1)) * jitter)
  const [acknowledged] = await db
    .update(schema.revocationJobs)
    .set({
      state,
      nextAttemptAt: state === 'pending' ? timeAfter(now, retryMs) : now,
      leaseToken: null,
      leaseExpiresAt: null,
      completedAt: state === 'completed' ? now : null,
      lastErrorCode: errorCode,
    })
    .where(
      and(
        eq(schema.revocationJobs.id, job.id),
        eq(schema.revocationJobs.state, 'running'),
        eq(schema.revocationJobs.leaseToken, job.leaseToken ?? ''),
      ),
    )
    .returning()
  return {
    jobId: job.id,
    state: acknowledged ? state : 'stale',
    attempts: job.attempts,
  }
}

export async function drainRevocations(
  db: Database,
  providers: readonly FinancialDataProvider[],
  limit = 20,
  options: RevocationOptions = {},
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Revocation batch limit must be between 1 and 100')
  const results: RevocationResult[] = []
  for (let index = 0; index < limit; index += 1) {
    const result = await processNextRevocation(db, providers, options)
    if (!result) break
    results.push(result)
  }
  return results
}

export interface RevocationPumpOptions extends RevocationOptions {
  readonly intervalMs?: number
  readonly batchLimit?: number
  readonly onStorageFailure?: () => void
}

/** Shares the API handle (required for PGlite) and never overlaps its own bounded batches. */
export function createRevocationPump(
  db: Database,
  providers: readonly FinancialDataProvider[],
  options: RevocationPumpOptions = {},
) {
  const intervalMs = options.intervalMs ?? 1000
  const batchLimit = options.batchLimit ?? 4
  if (!Number.isInteger(intervalMs) || intervalMs < 100 || intervalMs > 60_000)
    throw new Error('Revocation pump interval must be between 100 ms and 60 seconds')
  if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 20)
    throw new Error('Revocation pump batch must be between 1 and 20')
  bounds(options)
  for (const provider of providers) {
    const capabilities = provider.capabilities()
    if (!capabilities.synthetic || !capabilities.grantSpecificRevocation)
      throw new Error('The demo pump requires synthetic grant-specific revocation')
  }
  let stopped = false
  let current: Promise<void> | null = null
  let storageFailures = 0
  const tick = () => {
    if (stopped || current) return
    current = (async () => {
      try {
        for (let index = 0; index < batchLimit && !stopped; index += 1) {
          if (!(await processNextRevocation(db, providers, options))) break
        }
      } catch {
        storageFailures += 1
        if (options.onStorageFailure) options.onStorageFailure()
        else console.error(JSON.stringify({ event: 'revocation_storage_failure' }))
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        current = null
      })
  }
  const timer = setInterval(tick, intervalMs)
  timer.unref()
  tick()
  return {
    status: () => ({ stopped, running: current !== null, storageFailures }),
    stop: async () => {
      stopped = true
      clearInterval(timer)
      await current
    },
  }
}
