import { type Database, schema } from '@lilleri/database'
import { asc, gt } from 'drizzle-orm'
import {
  type NotificationConfiguration,
  NotificationsService,
  validateNotificationConfiguration,
} from './notifications.js'
import { DEFAULT_NOTIFICATION_CONFIGURATION } from './runtime-config.js'

export interface NotificationBatchResult {
  readonly cursor: string | null
  readonly profilesVisited: number
  readonly failedProfiles: number
  readonly queued: number
  readonly delivered: number
  readonly cancelled: number
  readonly suppressed: number
}
export async function runNotificationBatch(
  db: Database,
  configuration: NotificationConfiguration = DEFAULT_NOTIFICATION_CONFIGURATION,
  now: string = new Date().toISOString(),
  cursor: string | null = null,
): Promise<NotificationBatchResult> {
  configuration = validateNotificationConfiguration(configuration)
  const page = (after: string | null) =>
    db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(after === null ? undefined : gt(schema.profiles.id, after))
      .orderBy(asc(schema.profiles.id))
      .limit(configuration.profileLimit)
  let profiles = await page(cursor)
  if (!profiles.length && cursor !== null) profiles = await page(null)
  let failedProfiles = 0,
    queued = 0,
    delivered = 0,
    cancelled = 0,
    suppressed = 0
  for (const { id } of profiles) {
    try {
      const result = await new NotificationsService(
        db,
        id,
        () => now,
        configuration,
      ).scheduleAndDeliver()
      queued += result.queued
      delivered += result.delivered
      cancelled += result.cancelled
      suppressed += result.suppressed
    } catch {
      failedProfiles++
    }
  }
  return {
    cursor: profiles.at(-1)?.id ?? null,
    profilesVisited: profiles.length,
    failedProfiles,
    queued,
    delivered,
    cancelled,
    suppressed,
  }
}
export function createNotificationPump(
  db: Database,
  readConfiguration: () => Promise<NotificationConfiguration>,
  options: {
    readonly now?: () => string
    readonly report?: (status: Omit<NotificationBatchResult, 'cursor'>) => void
  } = {},
) {
  const now = options.now ?? (() => new Date().toISOString())
  let cursor: string | null = null,
    stopped = false,
    active: Promise<Omit<NotificationBatchResult, 'cursor'>> | undefined,
    timer: ReturnType<typeof setTimeout> | undefined
  let current: Omit<NotificationBatchResult, 'cursor'> = {
    profilesVisited: 0,
    failedProfiles: 0,
    queued: 0,
    delivered: 0,
    cancelled: 0,
    suppressed: 0,
  }
  const runNow = () => {
    if (active) return active
    if (stopped) return Promise.resolve({ ...current })
    if (timer) clearTimeout(timer)
    const work = async () => {
      let settings = DEFAULT_NOTIFICATION_CONFIGURATION as NotificationConfiguration
      try {
        settings = validateNotificationConfiguration(await readConfiguration())
        const result = await runNotificationBatch(db, settings, now(), cursor)
        cursor = result.cursor
        const { cursor: _cursor, ...safe } = result
        current = safe
      } catch {
        current = { ...current, failedProfiles: current.failedProfiles + 1 }
      }
      try {
        options.report?.({ ...current })
      } catch {
        /* A reporter cannot stop housekeeping. */
      }
      if (!stopped) {
        timer = setTimeout(() => {
          timer = undefined
          void runNow()
        }, settings.intervalMs)
        timer.unref()
      }
      return { ...current }
    }
    active = work().finally(() => {
      active = undefined
    })
    return active
  }
  const stop = async () => {
    stopped = true
    if (timer) clearTimeout(timer)
    timer = undefined
    await active
  }
  void runNow()
  return { runNow, status: () => ({ ...current, running: active !== undefined, stopped }), stop }
}
