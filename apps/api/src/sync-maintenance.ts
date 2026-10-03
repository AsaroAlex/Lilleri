import {
  DEFAULT_SYNC_CONFIGURATION,
  type RuntimeConfigurationSnapshot,
  syncConfigurationSchema,
} from './runtime-config.js'
import type { SyncCoordinator, SyncJobDto } from './sync-jobs.js'

export interface SyncTimer {
  setTimeout(callback: () => void, delay: number): unknown
  clearTimeout(handle: unknown): void
}
const defaultTimer: SyncTimer = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}
export interface SyncPumpOptions {
  readonly configuration: () => Promise<RuntimeConfigurationSnapshot>
  /** Trusted bounded identity enumeration, never a caller-supplied HTTP profile list. */
  readonly profiles: (limit: number, afterProfileId?: string | null) => Promise<readonly string[]>
  readonly coordinator: (
    profileId: string,
    configuration: RuntimeConfigurationSnapshot,
  ) => SyncCoordinator
  readonly timer?: SyncTimer
  readonly onFailure?: () => void
}
/** Serial, bounded slices; close waits for the current provider attempt before shutdown. */
export function createSyncPump(options: SyncPumpOptions) {
  const timer = options.timer ?? defaultTimer
  let stopped = false,
    started = false,
    pending: unknown,
    active: Promise<SyncJobDto[]> | null = null,
    scheduling: Promise<void> | null = null
  let cursor: string | null = null
  const runOnce = (): Promise<SyncJobDto[]> => {
    if (stopped) return Promise.resolve([])
    if (active) return active
    active = (async () => {
      const snapshot = await options.configuration(),
        configuration = syncConfigurationSchema.parse(
          snapshot.values.sync ?? DEFAULT_SYNC_CONFIGURATION,
        )
      const profiles = await options.profiles(configuration.profileLimit, cursor)
      if (
        profiles.length > configuration.profileLimit ||
        new Set(profiles).size !== profiles.length
      )
        throw new Error('Invalid sync profile enumeration')
      cursor = profiles.length === configuration.profileLimit ? (profiles.at(-1) ?? null) : null
      const results: SyncJobDto[] = []
      for (const profileId of profiles) {
        if (stopped) break
        const coordinator = options.coordinator(profileId, snapshot)
        await coordinator.cleanupExpiredStages()
        if (configuration.enabled) results.push(...(await coordinator.scheduleProfile()))
      }
      return results
    })().finally(() => {
      active = null
    })
    return active
  }
  const schedule = (): Promise<void> => {
    if (stopped) return Promise.resolve()
    if (scheduling) return scheduling
    scheduling = (async () => {
      const snapshot = await options.configuration(),
        configuration = syncConfigurationSchema.parse(
          snapshot.values.sync ?? DEFAULT_SYNC_CONFIGURATION,
        )
      if (stopped) return
      pending = timer.setTimeout(() => {
        pending = undefined
        void runOnce()
          .catch(() => options.onFailure?.())
          .finally(() => {
            void schedule().catch(() => options.onFailure?.())
          })
      }, configuration.intervalMs)
    })().finally(() => {
      scheduling = null
    })
    return scheduling
  }
  return {
    runOnce,
    async start() {
      if (started || stopped) return
      started = true
      await schedule()
    },
    async close() {
      stopped = true
      if (pending !== undefined) {
        timer.clearTimeout(pending)
        pending = undefined
      }
      await active?.catch(() => undefined)
      await scheduling?.catch(() => undefined)
    },
  }
}
