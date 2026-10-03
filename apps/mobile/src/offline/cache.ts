import { createIndexedDbCacheStore } from './indexeddb'
import {
  type CacheLease,
  type EncryptedCacheRecord,
  OFFLINE_CACHE_LIMITS,
  type OfflineAuthorization,
  type OfflineCache,
  type OfflineCacheOptions,
  type OfflineDiscardReason,
  type OfflineResult,
} from './types'

interface Authorization {
  readonly mode: 'authenticated' | 'demo'
  readonly profileId: string
  readonly sessionId: string
  readonly userId: string | null
  readonly identityEpoch: number
  readonly expiresAt: number
  readonly id: string
  readonly wallStart: number
  readonly monotonicStart: number
  readonly key: CryptoKey
  readonly contextHash: string
  readonly lease: CacheLease
  readonly cancel: () => void
  lastWall: number
  lastMonotonic: number
  nextSequence: number
  persistedSequence: number
}

const identifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 256 &&
  Array.from(value).every((character) => character.charCodeAt(0) >= 32)
const timestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))

function contextBytes(authorization: Omit<Authorization, 'contextHash'>) {
  return jsonBytes([
    'lilleri.offline.context.v1',
    authorization.mode,
    authorization.profileId,
    authorization.sessionId,
    authorization.userId,
    authorization.identityEpoch,
    authorization.expiresAt,
    authorization.id,
  ])
}
function aad(authorization: Authorization, record: EncryptedCacheRecord) {
  return jsonBytes([
    'lilleri.offline.snapshot.v1',
    authorization.contextHash,
    authorization.mode,
    authorization.profileId,
    authorization.sessionId,
    authorization.userId,
    authorization.identityEpoch,
    authorization.expiresAt,
    record.authorizationId,
    record.sequence,
    record.savedAt,
    record.expiresAt,
    record.plaintextBytes,
  ])
}

function boundedJson(value: unknown): boolean {
  let nodes = 0
  let characters = 0
  const visited = new WeakSet<object>()
  const visit = (item: unknown, depth: number): boolean => {
    if (++nodes > OFFLINE_CACHE_LIMITS.maxNodes || depth > OFFLINE_CACHE_LIMITS.maxDepth)
      return false
    if (typeof item === 'string') {
      characters += item.length
      return characters <= OFFLINE_CACHE_LIMITS.maxPlaintextBytes
    }
    if (item === null || typeof item === 'boolean') return true
    if (typeof item === 'number') return Number.isFinite(item)
    if (typeof item !== 'object' || visited.has(item)) return false
    visited.add(item)
    if (Array.isArray(item))
      return (
        item.length <= OFFLINE_CACHE_LIMITS.maxArrayItems &&
        Object.keys(item).length === item.length &&
        item.every((row) => visit(row, depth + 1))
      )
    if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null)
      return false
    return Object.entries(Object.getOwnPropertyDescriptors(item)).every(([key, descriptor]) => {
      characters += key.length
      return (
        characters <= OFFLINE_CACHE_LIMITS.maxPlaintextBytes &&
        'value' in descriptor &&
        visit(descriptor.value, depth + 1)
      )
    })
  }
  return visit(value, 0)
}

function sameProfile(value: unknown, profileId: string): boolean {
  if (!value || typeof value !== 'object' || !('profile' in value)) return false
  const profile = value.profile
  return !!profile && typeof profile === 'object' && 'id' in profile && profile.id === profileId
}

function validRecord(
  value: unknown,
  authorization: Authorization,
  maxAgeMs: number,
): value is EncryptedCacheRecord {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<EncryptedCacheRecord>
  return (
    row.version === 1 &&
    row.authorizationId === authorization.id &&
    row.contextHash === authorization.contextHash &&
    timestamp(row.sequence) &&
    row.sequence > 0 &&
    row.sequence >= authorization.persistedSequence &&
    row.sequence <= authorization.nextSequence &&
    timestamp(row.savedAt) &&
    timestamp(row.expiresAt) &&
    row.savedAt >= authorization.wallStart &&
    row.expiresAt > row.savedAt &&
    row.expiresAt <= authorization.expiresAt &&
    row.expiresAt - row.savedAt <= maxAgeMs &&
    timestamp(row.plaintextBytes) &&
    row.plaintextBytes > 0 &&
    row.plaintextBytes <= OFFLINE_CACHE_LIMITS.maxPlaintextBytes &&
    row.iv instanceof ArrayBuffer &&
    row.iv.byteLength === 12 &&
    row.ciphertext instanceof ArrayBuffer &&
    row.ciphertext.byteLength === row.plaintextBytes + 16
  )
}

/** A native secure-storage port is intentionally unavailable; no plaintext fallback. */
export function createUnavailableOfflineCache<T>(): OfflineCache<T> {
  return {
    support: 'unavailable',
    authorize: async () => false,
    writeVerified: async () => false,
    read: async () => ({ status: 'unsupported' }),
    discard: async () => {},
  }
}

/** Encrypted read-only web cache. Every page instance starts without a usable key. */
export function createWebOfflineCache<T>(options: OfflineCacheOptions<T>): OfflineCache<T> {
  const cryptoPort = options.crypto ?? globalThis.crypto
  if (!cryptoPort?.subtle || (!options.store && typeof indexedDB === 'undefined'))
    return createUnavailableOfflineCache<T>()
  const store = options.store ?? createIndexedDbCacheStore()
  const now = options.now ?? Date.now
  const monotonicNow = options.monotonicNow ?? (() => performance.now())
  const maxAgeMs = options.maxAgeMs ?? OFFLINE_CACHE_LIMITS.defaultMaxAgeMs
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0 || maxAgeMs > OFFLINE_CACHE_LIMITS.maxAgeMs)
    throw new Error('offline_invalid_policy')
  let current: Authorization | null = null
  let generation = 0
  let absentStatus: 'empty' | 'expired' | 'invalid' = 'empty'
  let cancelExpiry: (() => void) | null = null
  const scheduleExpiry =
    options.scheduleExpiry ??
    ((callback, delayMs) => {
      const handle = setTimeout(callback, delayMs)
      return () => clearTimeout(handle)
    })
  // Serialize startup removal before any new authorization writes. This does not recover a key.
  const startup = store.clear().catch(() => {})

  async function discard(reason: OfflineDiscardReason): Promise<void> {
    const previous = current
    current = null
    generation++
    cancelExpiry?.()
    cancelExpiry = null
    absentStatus =
      reason === 'expired'
        ? 'expired'
        : reason === 'invalid' || reason === 'clock_rollback'
          ? 'invalid'
          : 'empty'
    previous?.cancel()
    try {
      options.onDiscard?.(reason)
    } catch {
      /* Consumer errors cannot preserve the key. */
    }
    if (previous) await store.clear(previous.id).catch(() => {})
  }

  function checkpoint(authorization: Authorization): number | null {
    if (current !== authorization || !authorization.lease.isCurrent()) return null
    const wall = now(),
      monotonic = monotonicNow()
    if (
      !timestamp(wall) ||
      !Number.isFinite(monotonic) ||
      monotonic < authorization.lastMonotonic ||
      wall < authorization.lastWall
    ) {
      void discard('clock_rollback')
      return null
    }
    authorization.lastWall = wall
    authorization.lastMonotonic = monotonic
    const effective = Math.max(
      wall,
      authorization.wallStart + monotonic - authorization.monotonicStart,
    )
    if (effective >= authorization.expiresAt) {
      void discard('expired')
      return null
    }
    return Math.ceil(effective)
  }

  function armExpiry(authorization: Authorization, deadline: number) {
    cancelExpiry?.()
    cancelExpiry = scheduleExpiry(
      () => {
        if (current !== authorization) return
        const time = checkpoint(authorization)
        if (time === null) return
        if (time >= deadline) void discard('expired')
        else armExpiry(authorization, deadline)
      },
      Math.max(1, Math.min(2_147_483_647, deadline - now())),
    )
  }

  return {
    support: 'web',
    discard,
    async authorize(input: OfflineAuthorization) {
      // A failed or superseded authorization also discards any previous memory key.
      const removal = discard('profile_changed')
      const ticket = generation
      await removal
      await startup
      if (ticket !== generation) return false
      const wall = now(),
        monotonic = monotonicNow()
      const profileId =
        input.mode === 'authenticated' ? input.session.principal.profileId : input.profileId
      const sessionId =
        input.mode === 'authenticated' ? input.session.principal.sessionId : input.sessionId
      const userId = input.mode === 'authenticated' ? input.session.principal.userId : null
      const expiresAt =
        input.mode === 'authenticated' ? Date.parse(input.session.expiresAt) : wall + input.ttlMs
      if (
        !timestamp(wall) ||
        !Number.isFinite(monotonic) ||
        monotonic < 0 ||
        !identifier(profileId) ||
        !identifier(sessionId) ||
        !Number.isSafeInteger(input.identityEpoch) ||
        input.identityEpoch < 0 ||
        !timestamp(expiresAt) ||
        expiresAt <= wall ||
        (input.mode === 'authenticated' &&
          (!identifier(userId) || input.session.user.id !== userId)) ||
        (input.mode === 'demo' &&
          (!Number.isSafeInteger(input.ttlMs) ||
            input.ttlMs <= 0 ||
            input.ttlMs > OFFLINE_CACHE_LIMITS.maxDemoTtlMs))
      )
        return false
      const listeners = new Set<() => void>()
      const lease: CacheLease = {
        isCurrent: () => ticket === generation,
        onCancel(listener) {
          if (ticket !== generation) {
            listener()
            return () => {}
          }
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
      try {
        const key = await cryptoPort.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
          'encrypt',
          'decrypt',
        ])
        const candidate = {
          mode: input.mode,
          profileId,
          sessionId,
          userId,
          identityEpoch: input.identityEpoch,
          expiresAt,
          id: hex(cryptoPort.getRandomValues(new Uint8Array(16))),
          wallStart: wall,
          monotonicStart: monotonic,
          key,
          lease,
          cancel: () => {
            for (const listener of listeners) {
              try {
                listener()
              } catch {
                /* Completed storage operations are already fenced. */
              }
            }
            listeners.clear()
          },
          lastWall: wall,
          lastMonotonic: monotonic,
          nextSequence: 0,
          persistedSequence: 0,
        }
        const contextHash = hex(
          new Uint8Array(await cryptoPort.subtle.digest('SHA-256', contextBytes(candidate))),
        )
        if (!lease.isCurrent()) return false
        current = { ...candidate, contextHash }
        absentStatus = 'empty'
        if (checkpoint(current) === null) return false
        armExpiry(current, current.expiresAt)
        return true
      } catch {
        if (lease.isCurrent()) await discard('invalid')
        return false
      }
    },
    async writeVerified(snapshot) {
      const authorization = current
      if (!authorization) return false
      const savedAt = checkpoint(authorization)
      if (savedAt === null) return false
      let plaintext: Uint8Array<ArrayBuffer> | null = null
      try {
        if (
          !boundedJson(snapshot) ||
          !sameProfile(snapshot, authorization.profileId) ||
          !options.validateSnapshot(snapshot)
        )
          throw new Error('offline_invalid_snapshot')
        plaintext = jsonBytes(snapshot)
        if (plaintext.byteLength > OFFLINE_CACHE_LIMITS.maxPlaintextBytes)
          throw new Error('offline_snapshot_too_large')
        const sequence = ++authorization.nextSequence
        const iv = cryptoPort.getRandomValues(new Uint8Array(12))
        const metadata: EncryptedCacheRecord = {
          version: 1,
          authorizationId: authorization.id,
          contextHash: authorization.contextHash,
          sequence,
          savedAt,
          expiresAt: Math.min(authorization.expiresAt, savedAt + maxAgeMs),
          plaintextBytes: plaintext.byteLength,
          iv: iv.buffer,
          ciphertext: new ArrayBuffer(0),
        }
        const ciphertext = await cryptoPort.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: aad(authorization, metadata), tagLength: 128 },
          authorization.key,
          plaintext,
        )
        const beforeWrite = checkpoint(authorization)
        if (beforeWrite === null || !authorization.lease.isCurrent()) return false
        if (beforeWrite >= metadata.expiresAt) {
          await discard('expired')
          return false
        }
        const written = await store.write({ ...metadata, ciphertext }, authorization.lease)
        const afterWrite = checkpoint(authorization)
        if (!written || afterWrite === null) return false
        if (afterWrite >= metadata.expiresAt) {
          await discard('expired')
          return false
        }
        if (sequence < authorization.persistedSequence) return false
        authorization.persistedSequence = sequence
        armExpiry(authorization, metadata.expiresAt)
        return true
      } catch {
        if (current === authorization) await discard('invalid')
        return false
      } finally {
        plaintext?.fill(0)
      }
    },
    async read(): Promise<OfflineResult<T>> {
      const authorization = current
      if (!authorization) return { status: absentStatus }
      if (checkpoint(authorization) === null) return { status: absentStatus }
      let plaintext: Uint8Array<ArrayBuffer> | null = null
      try {
        const record = await store.read(authorization.lease)
        const time = checkpoint(authorization)
        if (time === null) return { status: absentStatus }
        if (record === null) return { status: 'empty' }
        if (!validRecord(record, authorization, maxAgeMs) || record.savedAt > time)
          throw new Error('offline_invalid_ciphertext')
        if (time >= record.expiresAt) {
          await discard('expired')
          return { status: 'expired' }
        }
        plaintext = new Uint8Array(
          await cryptoPort.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: record.iv,
              additionalData: aad(authorization, record),
              tagLength: 128,
            },
            authorization.key,
            record.ciphertext,
          ),
        )
        const after = checkpoint(authorization)
        if (after === null || after >= record.expiresAt) {
          if (current === authorization) await discard('expired')
          return { status: absentStatus }
        }
        const snapshot: unknown = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(plaintext),
        )
        if (
          !boundedJson(snapshot) ||
          !sameProfile(snapshot, authorization.profileId) ||
          !options.validateSnapshot(snapshot)
        )
          throw new Error('offline_invalid_snapshot')
        const validatedAt = checkpoint(authorization)
        if (validatedAt === null) return { status: absentStatus }
        if (validatedAt >= record.expiresAt) {
          await discard('expired')
          return { status: 'expired' }
        }
        if (record.sequence < authorization.persistedSequence) return { status: 'empty' }
        return {
          status: 'ready',
          snapshot,
          savedAt: new Date(record.savedAt).toISOString(),
          expiresAt: new Date(record.expiresAt).toISOString(),
          readOnly: true,
        }
      } catch {
        if (current === authorization) await discard('invalid')
        return { status: current === authorization ? 'invalid' : absentStatus }
      } finally {
        plaintext?.fill(0)
      }
    },
  }
}
