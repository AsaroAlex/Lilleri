import {
  DEFAULT_SYNC_CONFIGURATION,
  type RuntimeConfigurationSnapshot,
  syncConfigurationSchema,
} from './runtime-config.js'
import type { SyncCoordinator, SyncJobDto } from './sync-jobs.js'
import { syncHash, syncInstant } from './sync-provider.js'

export interface SyncForegroundContext {
  /** All three fields come from the authenticated server principal, never an HTTP body. */
  readonly profileId: string
  readonly sessionId: string
  readonly editor: boolean
}
export interface SyncForegroundOptions {
  readonly configuration: () => Promise<RuntimeConfigurationSnapshot>
  readonly coordinator: (
    profileId: string,
    configuration: RuntimeConfigurationSnapshot,
  ) => SyncCoordinator
  readonly now?: () => string
  readonly onFailure?: () => void
}
/** Post-commit foreground acquisition. No timers, polling, storage or retry loops. */
export function createSyncForegroundRefresher(options: SyncForegroundOptions) {
  const now = options.now ?? (() => new Date().toISOString()),
    sessions = new Map<
      string,
      { startedAt: number; expiresAt: number; pending: Promise<SyncJobDto | null> | null }
    >(),
    inflight = new Set<Promise<SyncJobDto | null>>()
  let stopped = false
  const refresh = (context: SyncForegroundContext): Promise<SyncJobDto | null> => {
    if (stopped || !context.editor) return Promise.resolve(null)
    const work = (async () => {
      if (!context.profileId || !context.sessionId) throw new Error('Invalid foreground principal')
      const snapshot = await options.configuration(),
        configuration = syncConfigurationSchema.parse(
          snapshot.values.sync ?? DEFAULT_SYNC_CONFIGURATION,
        )
      if (stopped || !configuration.enabled) return null
      const at = Date.parse(syncInstant(now())),
        foregroundDebounceMs =
          configuration.foregroundDebounceMs ?? DEFAULT_SYNC_CONFIGURATION.foregroundDebounceMs,
        foregroundSessionLimit =
          configuration.foregroundSessionLimit ?? DEFAULT_SYNC_CONFIGURATION.foregroundSessionLimit,
        key = syncHash({ profileId: context.profileId, sessionId: context.sessionId })
      for (const [sessionKey, entry] of sessions)
        if (!entry.pending && entry.expiresAt <= at) sessions.delete(sessionKey)
      const previous = sessions.get(key)
      if (previous?.pending) return previous.pending
      if (previous && at < previous.startedAt + foregroundDebounceMs) return null
      if (!previous && sessions.size >= foregroundSessionLimit) return null
      const entry = {
          startedAt: at,
          expiresAt: at + foregroundDebounceMs,
          pending: null as Promise<SyncJobDto | null> | null,
        },
        pending = Promise.resolve()
          .then(() =>
            stopped ? null : options.coordinator(context.profileId, snapshot).runForegroundSlice(),
          )
          .finally(() => {
            entry.pending = null
          })
      entry.pending = pending
      sessions.set(key, entry)
      return pending
    })().catch(() => {
      try {
        options.onFailure?.()
      } catch {
        /* A post-response diagnostic cannot reject the financial request. */
      }
      return null
    })
    inflight.add(work)
    return work.finally(() => inflight.delete(work))
  }
  return {
    refresh,
    async close() {
      stopped = true
      await Promise.allSettled([...inflight])
      sessions.clear()
    },
  }
}
