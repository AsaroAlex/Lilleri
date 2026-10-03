import type { LocalIdentitySession } from '../identity-client'

export const OFFLINE_CACHE_LIMITS = {
  maxPlaintextBytes: 512 * 1024,
  maxNodes: 32_000,
  maxDepth: 32,
  maxArrayItems: 10_000,
  defaultMaxAgeMs: 5 * 60_000,
  maxAgeMs: 15 * 60_000,
  maxDemoTtlMs: 15 * 60_000,
} as const

/** Supply only after the current online identity/profile has been verified. */
export type OfflineAuthorization =
  | {
      readonly mode: 'authenticated'
      readonly session: LocalIdentitySession
      readonly identityEpoch: number
    }
  | {
      readonly mode: 'demo'
      readonly profileId: string
      readonly sessionId: string
      readonly identityEpoch: number
      /** Explicit demo authorization TTL; never a substitute for real session expiry. */
      readonly ttlMs: number
    }

export type OfflineDiscardReason =
  | 'logout'
  | 'unauthorized'
  | 'revocation'
  | 'profile_changed'
  | 'deletion'
  | 'reload'
  | 'expired'
  | 'invalid'
  | 'clock_rollback'

export type OfflineResult<T> =
  | {
      readonly status: 'ready'
      readonly snapshot: T
      readonly savedAt: string
      readonly expiresAt: string
      readonly readOnly: true
    }
  | { readonly status: 'empty' | 'expired' | 'invalid' | 'unsupported' }

export interface OfflineCache<T> {
  readonly support: 'web' | 'unavailable'
  authorize(input: OfflineAuthorization): Promise<boolean>
  writeVerified(snapshot: T): Promise<boolean>
  read(): Promise<OfflineResult<T>>
  /** Drops the key and fences pending operations synchronously, before clearing storage. */
  discard(reason: OfflineDiscardReason): Promise<void>
}

/** Persisted fields contain encrypted bytes and bounded metadata only. */
export interface EncryptedCacheRecord {
  readonly version: 1
  readonly authorizationId: string
  readonly contextHash: string
  readonly sequence: number
  readonly savedAt: number
  readonly expiresAt: number
  readonly plaintextBytes: number
  readonly iv: ArrayBuffer
  readonly ciphertext: ArrayBuffer
}

export interface CacheLease {
  isCurrent(): boolean
  /** Cancels an open storage transaction as soon as an identity boundary changes. */
  onCancel(listener: () => void): () => void
}

export interface EncryptedCacheStore {
  read(lease: CacheLease): Promise<unknown | null>
  write(record: EncryptedCacheRecord, lease: CacheLease): Promise<boolean>
  /** Conditional removal prevents an old cleanup from deleting a new authorization. */
  clear(authorizationId?: string): Promise<void>
}

export interface OfflineCacheOptions<T> {
  /** Must validate the original, complete server view; never recompute a partial balance. */
  readonly validateSnapshot: (snapshot: unknown) => snapshot is T
  readonly maxAgeMs?: number
  /** Explicit ports for tests; production defaults are real WebCrypto/IndexedDB clocks. */
  readonly store?: EncryptedCacheStore
  readonly crypto?: Crypto
  readonly now?: () => number
  readonly monotonicNow?: () => number
  /** Clears a currently displayed offline view when the volatile authorization is discarded. */
  readonly onDiscard?: (reason: OfflineDiscardReason) => void
  readonly scheduleExpiry?: (callback: () => void, delayMs: number) => () => void
}
