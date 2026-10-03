import { type Database, schema } from '@lilleri/database'
import { and, asc, count, gt, lte } from 'drizzle-orm'
import { cleanupExpiredObservationPayloads, retentionInstant } from './retention.js'
import { DEFAULT_RUNTIME_CONFIGURATION } from './runtime-config.js'

export interface RetentionConfiguration {
  readonly enabled: boolean
  readonly intervalMs: number
  readonly profileLimit: number
  readonly payloadLimit: number
}
export const DEFAULT_RETENTION_CONFIGURATION: RetentionConfiguration =
  DEFAULT_RUNTIME_CONFIGURATION.payloadRetention
function boundedInteger(value: number, minimum: number, maximum: number, name: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`)
  return value
}
export function validateRetentionConfiguration(configuration: RetentionConfiguration) {
  if (typeof configuration.enabled !== 'boolean')
    throw new Error('PAYLOAD_RETENTION_ENABLED must be 0 or 1')
  boundedInteger(configuration.intervalMs, 1000, 86_400_000, 'PAYLOAD_RETENTION_INTERVAL_MS')
  boundedInteger(configuration.profileLimit, 1, 100, 'PAYLOAD_RETENTION_PROFILE_LIMIT')
  boundedInteger(configuration.payloadLimit, 1, 1000, 'PAYLOAD_RETENTION_PAYLOAD_LIMIT')
  return { ...configuration }
}
export function retentionConfigurationFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RetentionConfiguration {
  const enabled = environment.PAYLOAD_RETENTION_ENABLED ?? '1'
  if (!['0', '1'].includes(enabled)) throw new Error('PAYLOAD_RETENTION_ENABLED must be 0 or 1')
  const integer = (name: string, fallback: number) => {
    const text = environment[name]
    if (text === undefined) return fallback
    if (!/^\d+$/.test(text)) throw new Error(`${name} must contain an unsigned integer`)
    return Number(text)
  }
  return validateRetentionConfiguration({
    enabled: enabled === '1',
    intervalMs: integer(
      'PAYLOAD_RETENTION_INTERVAL_MS',
      DEFAULT_RETENTION_CONFIGURATION.intervalMs,
    ),
    profileLimit: integer(
      'PAYLOAD_RETENTION_PROFILE_LIMIT',
      DEFAULT_RETENTION_CONFIGURATION.profileLimit,
    ),
    payloadLimit: integer(
      'PAYLOAD_RETENTION_PAYLOAD_LIMIT',
      DEFAULT_RETENTION_CONFIGURATION.payloadLimit,
    ),
  })
}
/** A separate local worker may never share the API's file-backed PGlite store. */
export function standaloneRetentionConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
  arguments_: readonly string[],
) {
  const command = arguments_[0] ?? 'run'
  if (!['run', 'status', 'watch'].includes(command) || arguments_.length > 1)
    throw new Error('Use retention-worker run, status or watch')
  if (environment.NODE_ENV === 'production')
    throw new Error('Payload retention worker is local-only')
  for (const name of ['DEMO_MODE', 'LOCAL_AUTH_MODE'])
    if (environment[name] !== undefined && !['0', '1'].includes(environment[name] ?? ''))
      throw new Error(`${name} must be 0 or 1`)
  const demo = environment.DEMO_MODE === '1',
    identity = environment.LOCAL_AUTH_MODE === '1'
  if (demo === identity) throw new Error('Select DEMO_MODE=1 or LOCAL_AUTH_MODE=1')
  if (environment.PGLITE_PATH !== undefined)
    throw new Error('Standalone retention cannot open a file-backed PGlite store')
  const url = environment.DATABASE_URL
  let validUrl = false
  try {
    validUrl = Boolean(url && ['postgres:', 'postgresql:'].includes(new URL(url).protocol))
  } catch {
    /* Invalid configuration. */
  }
  if (!url || !validUrl) throw new Error('Standalone retention requires a PostgreSQL DATABASE_URL')
  return { command, url, settings: retentionConfigurationFromEnvironment(environment) }
}
export async function expiredPayloadCount(db: Database, now: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(schema.observationPayloads)
    .where(lte(schema.observationPayloads.expiresAt, retentionInstant(now)))
  if (!result || !Number.isSafeInteger(result.count) || result.count < 0)
    throw new Error('Expired payload count is unavailable')
  return result.count
}
export interface RetentionBatchResult {
  /** Internal paging state. It is never included in status/log events. */
  readonly cursor: string | null
  readonly profilesVisited: number
  readonly failedProfiles: number
  readonly deleted: number
}
export async function runRetentionBatch(
  db: Database,
  configuration: RetentionConfiguration,
  now: string,
  cursor: string | null = null,
): Promise<RetentionBatchResult> {
  const settings = validateRetentionConfiguration(configuration)
  const checkedAt = retentionInstant(now)
  if (!settings.enabled) return { cursor, profilesVisited: 0, failedProfiles: 0, deleted: 0 }
  const page = (after: string | null) =>
    db
      .select({ profileId: schema.observationPayloads.profileId })
      .from(schema.observationPayloads)
      .where(
        and(
          lte(schema.observationPayloads.expiresAt, checkedAt),
          after === null ? undefined : gt(schema.observationPayloads.profileId, after),
        ),
      )
      .groupBy(schema.observationPayloads.profileId)
      .orderBy(asc(schema.observationPayloads.profileId))
      .limit(settings.profileLimit)
  let profiles = await page(cursor)
  // Advance through expired profiles before wrapping; a large first profile cannot monopolise runs.
  if (!profiles.length && cursor !== null) profiles = await page(null)
  let deleted = 0,
    failedProfiles = 0
  for (const { profileId } of profiles) {
    try {
      deleted += (
        await cleanupExpiredObservationPayloads(db, profileId, checkedAt, settings.payloadLimit)
      ).deleted
    } catch {
      failedProfiles++
    }
  }
  return {
    cursor: profiles.at(-1)?.profileId ?? null,
    profilesVisited: profiles.length,
    failedProfiles,
    deleted,
  }
}

export interface RetentionStatus {
  readonly enabled: boolean
  readonly running: boolean
  readonly stopped: boolean
  readonly checkedAt: string
  readonly lastRunAt: string | null
  readonly lastOutcome: 'idle' | 'completed' | 'partial' | 'failed' | 'disabled'
  readonly expiredPayloads: number | null
  readonly deletedLastRun: number
  readonly deletedSinceStart: number
  readonly profilesVisitedLastRun: number
  readonly failedProfilesLastRun: number
  readonly errorCode: 'retention_cleanup_failed' | 'retention_count_unavailable' | null
}
export interface RetentionTimer {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(token: unknown): void
}
const systemTimer: RetentionTimer = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (token) => clearTimeout(token as ReturnType<typeof setTimeout>),
}
export interface RetentionPumpOptions {
  readonly now?: () => string
  readonly timer?: RetentionTimer
  readonly report?: (status: RetentionStatus) => void
  /** Deterministic fault/latency injection; normal callers use the real SQL batch. */
  readonly batch?: typeof runRetentionBatch
  /** Read the authoritative revision before every batch, including while temporarily disabled. */
  readonly configuration?: () => Promise<RetentionConfiguration>
}
export function createRetentionPump(
  db: Database,
  configuration: RetentionConfiguration = DEFAULT_RETENTION_CONFIGURATION,
  options: RetentionPumpOptions = {},
) {
  let settings = validateRetentionConfiguration(configuration)
  const now = options.now ?? (() => new Date().toISOString())
  const timer = options.timer ?? systemTimer
  const batch = options.batch ?? runRetentionBatch
  let checkedAt = retentionInstant(now()),
    cursor: string | null = null
  let token: unknown,
    active: Promise<RetentionStatus> | undefined,
    stopped = false
  let current: RetentionStatus = {
    enabled: settings.enabled,
    running: false,
    stopped: false,
    checkedAt,
    lastRunAt: null,
    lastOutcome: settings.enabled ? 'idle' : 'disabled',
    expiredPayloads: null,
    deletedLastRun: 0,
    deletedSinceStart: 0,
    profilesVisitedLastRun: 0,
    failedProfilesLastRun: 0,
    errorCode: null,
  }
  const snapshot = (): RetentionStatus => ({ ...current, running: active !== undefined, stopped })
  const status = async (): Promise<RetentionStatus> => {
    try {
      checkedAt = retentionInstant(now())
      const expired = await expiredPayloadCount(db, checkedAt)
      current = {
        ...current,
        checkedAt,
        expiredPayloads: expired,
        errorCode:
          current.errorCode === 'retention_count_unavailable'
            ? current.lastOutcome === 'failed' || current.lastOutcome === 'partial'
              ? 'retention_cleanup_failed'
              : null
            : current.errorCode,
      }
    } catch {
      current = { ...current, expiredPayloads: null, errorCode: 'retention_count_unavailable' }
    }
    return snapshot()
  }
  const schedule = () => {
    if (stopped || (!settings.enabled && !options.configuration)) return
    token = timer.setTimeout(() => {
      token = undefined
      void runNow()
    }, settings.intervalMs)
  }
  const runNow = (): Promise<RetentionStatus> => {
    if (active) return active
    if (stopped || (!settings.enabled && !options.configuration)) return status()
    if (token !== undefined) timer.clearTimeout(token)
    token = undefined
    const work = async () => {
      try {
        checkedAt = retentionInstant(now())
        if (options.configuration) {
          settings = validateRetentionConfiguration(await options.configuration())
          current = { ...current, enabled: settings.enabled }
        }
        if (!settings.enabled) {
          current = {
            ...current,
            checkedAt,
            lastRunAt: checkedAt,
            lastOutcome: 'disabled',
            deletedLastRun: 0,
            profilesVisitedLastRun: 0,
            failedProfilesLastRun: 0,
            errorCode: null,
          }
          const reported = { ...(await status()), running: false }
          try {
            await options.report?.(reported)
          } catch {
            /* A reporter cannot prevent future configuration checks. */
          }
          return reported
        }
        const result = await batch(db, settings, checkedAt, cursor)
        cursor = result.cursor
        current = {
          ...current,
          checkedAt,
          lastRunAt: checkedAt,
          lastOutcome: result.failedProfiles
            ? result.deleted
              ? 'partial'
              : 'failed'
            : 'completed',
          deletedLastRun: result.deleted,
          deletedSinceStart: current.deletedSinceStart + result.deleted,
          profilesVisitedLastRun: result.profilesVisited,
          failedProfilesLastRun: result.failedProfiles,
          errorCode: result.failedProfiles ? 'retention_cleanup_failed' : null,
        }
      } catch {
        current = {
          ...current,
          lastRunAt: checkedAt,
          lastOutcome: 'failed',
          deletedLastRun: 0,
          profilesVisitedLastRun: 0,
          failedProfilesLastRun: 0,
          errorCode: 'retention_cleanup_failed',
        }
      }
      const reported = await status()
      try {
        await options.report?.({ ...reported, running: false })
      } catch {
        /* A reporter cannot halt cleanup. */
      }
      return { ...reported, running: false }
    }
    active = work().finally(() => {
      active = undefined
      schedule()
    })
    return active
  }
  const stop = async () => {
    stopped = true
    if (token !== undefined) timer.clearTimeout(token)
    token = undefined
    await active
  }
  if (settings.enabled || options.configuration) void runNow()
  return { runNow, status, stop }
}
