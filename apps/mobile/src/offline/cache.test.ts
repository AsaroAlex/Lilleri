import { describe, expect, test } from 'vitest'
import { createUnavailableOfflineCache, createWebOfflineCache } from './cache'
import {
  type CacheLease,
  type EncryptedCacheRecord,
  type EncryptedCacheStore,
  OFFLINE_CACHE_LIMITS,
  type OfflineAuthorization,
  type OfflineCacheOptions,
} from './types'

interface Snapshot {
  profile: { id: string }
  accounts: { balance: { minor: string; currency: 'EUR' } }[]
  transactions: { bookedOn: string; description: string }[]
  summary: { original: string }
}
const snapshot: Snapshot = {
  profile: { id: 'synthetic-profile' },
  accounts: [{ balance: { minor: '900719925474099301', currency: 'EUR' } }],
  transactions: [{ bookedOn: '2026-10-03', description: 'SYNTHETIC_PRIVATE_MARKER' }],
  summary: { original: 'Server-calculated original summary' },
}
const validateSnapshot = (value: unknown): value is Snapshot =>
  !!value &&
  typeof value === 'object' &&
  'accounts' in value &&
  'transactions' in value &&
  'summary' in value
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function fixture(override: Partial<OfflineCacheOptions<Snapshot>> = {}) {
  let record: unknown | null = null
  let wall = Date.parse('2026-10-03T12:00:00.000Z'),
    monotonic = 100
  let pauseWrite: ReturnType<typeof deferred> | null = null
  let pauseRead: ReturnType<typeof deferred> | null = null
  const enteredWrite = deferred(),
    enteredRead = deferred()
  const store: EncryptedCacheStore = {
    async read(lease) {
      const captured = structuredClone(record)
      enteredRead.resolve()
      if (pauseRead) await pauseRead.promise
      return lease.isCurrent() ? captured : null
    },
    async write(value, lease: CacheLease) {
      enteredWrite.resolve()
      if (pauseWrite) await pauseWrite.promise
      if (!lease.isCurrent()) return false
      const existing = record as EncryptedCacheRecord | null
      if (
        existing?.authorizationId === value.authorizationId &&
        existing.sequence >= value.sequence
      )
        return false
      record = structuredClone(value)
      return true
    },
    async clear(id) {
      if (id === undefined || (record as EncryptedCacheRecord | null)?.authorizationId === id)
        record = null
    },
  }
  const cache = createWebOfflineCache<Snapshot>({
    validateSnapshot,
    store,
    crypto: globalThis.crypto,
    now: () => wall,
    monotonicNow: () => monotonic,
    scheduleExpiry: () => () => {},
    ...override,
  })
  const demo = (epoch = 1, profileId = snapshot.profile.id): OfflineAuthorization => ({
    mode: 'demo',
    profileId,
    sessionId: 'synthetic-session',
    identityEpoch: epoch,
    ttlMs: OFFLINE_CACHE_LIMITS.maxDemoTtlMs,
  })
  return {
    cache,
    store,
    demo,
    enteredRead,
    enteredWrite,
    get record() {
      return record as EncryptedCacheRecord | null
    },
    replace(value: unknown) {
      record = value
    },
    advance(ms: number) {
      wall += ms
      monotonic += ms
    },
    rollbackWall() {
      wall -= 1
    },
    rollbackMonotonic() {
      monotonic -= 1
    },
    pauseWrite() {
      pauseWrite = deferred()
      return pauseWrite
    },
    pauseRead() {
      pauseRead = deferred()
      return pauseRead
    },
    get wall() {
      return wall
    },
  }
}

describe('volatile authorization and encrypted read-only cache', () => {
  test('real AES-GCM preserves exact money and original summary with ciphertext-only storage', async () => {
    const f = fixture()
    expect(await f.cache.read()).toEqual({ status: 'empty' })
    expect(await f.cache.authorize(f.demo())).toBe(true)
    expect(await f.cache.writeVerified(snapshot)).toBe(true)
    expect(Object.keys(f.record ?? {}).sort()).toEqual([
      'authorizationId',
      'ciphertext',
      'contextHash',
      'expiresAt',
      'iv',
      'plaintextBytes',
      'savedAt',
      'sequence',
      'version',
    ])
    expect(JSON.stringify(f.record)).not.toContain('PRIVATE_MARKER')
    expect(f.record?.iv.byteLength).toBe(12)
    expect(f.record?.ciphertext.byteLength).toBe((f.record?.plaintextBytes ?? 0) + 16)
    const result = await f.cache.read()
    expect(result).toMatchObject({ status: 'ready', snapshot, readOnly: true })
    expect('snapshot' in result && result.snapshot.accounts[0]?.balance.minor).toBe(
      '900719925474099301',
    )
  })
  test('a fresh page instance has no decryptable key and requires new online authorization', async () => {
    const f = fixture()
    await f.cache.authorize(f.demo())
    await f.cache.writeVerified(snapshot)
    const reload = createWebOfflineCache<Snapshot>({
      validateSnapshot,
      store: f.store,
      crypto: globalThis.crypto,
      scheduleExpiry: () => () => {},
    })
    expect(await reload.read()).toEqual({ status: 'empty' })
    await reload.authorize(f.demo(2))
    expect(await reload.read()).toEqual({ status: 'empty' })
  })
  test.each(['logout', 'unauthorized', 'revocation', 'profile_changed', 'deletion'] as const)(
    '%s drops the key and stored record before any further read',
    async (reason) => {
      const f = fixture()
      await f.cache.authorize(f.demo())
      await f.cache.writeVerified(snapshot)
      const clearing = f.cache.discard(reason)
      expect(await f.cache.read()).toEqual({ status: 'empty' })
      await clearing
      expect(f.record).toBeNull()
      expect(await f.cache.writeVerified(snapshot)).toBe(false)
    },
  )
  test('auth uses the verified real session expiry even if it is earlier than cache TTL', async () => {
    const f = fixture()
    const authorization: OfflineAuthorization = {
      mode: 'authenticated',
      identityEpoch: 9,
      session: {
        user: {
          id: 'user',
          email: 'synthetic@example.test',
          name: 'Synthetic',
          twoFactorEnabled: false,
        },
        principal: {
          userId: 'user',
          sessionId: 'session',
          profileId: snapshot.profile.id,
          role: 'owner',
        },
        expiresAt: new Date(f.wall + 1000).toISOString(),
      },
    }
    expect(await f.cache.authorize(authorization)).toBe(true)
    await f.cache.writeVerified(snapshot)
    expect(f.record?.expiresAt).toBe(f.wall + 1000)
    f.advance(1000)
    expect(await f.cache.read()).toEqual({ status: 'expired' })
    expect(await f.cache.writeVerified(snapshot)).toBe(false)
  })
  test('bounded staleness expires the original snapshot without refreshing from a read', async () => {
    const f = fixture()
    await f.cache.authorize(f.demo())
    await f.cache.writeVerified(snapshot)
    const expiry = f.record?.expiresAt
    f.advance(OFFLINE_CACHE_LIMITS.defaultMaxAgeMs - 1)
    expect((await f.cache.read()).status).toBe('ready')
    expect(f.record?.expiresAt).toBe(expiry)
    f.advance(1)
    expect(await f.cache.read()).toEqual({ status: 'expired' })
    expect(f.record).toBeNull()
  })
  test.each(['wall', 'monotonic'] as const)('a %s clock rollback fails closed', async (clock) => {
    const f = fixture()
    await f.cache.authorize(f.demo())
    await f.cache.writeVerified(snapshot)
    if (clock === 'wall') f.rollbackWall()
    else f.rollbackMonotonic()
    expect(await f.cache.read()).toEqual({ status: 'invalid' })
    expect(await f.cache.writeVerified(snapshot)).toBe(false)
  })
  test.each(['ciphertext', 'expiresAt', 'contextHash', 'sequence'] as const)(
    'tampering with %s fails authentication or strict bounds',
    async (field) => {
      const f = fixture()
      await f.cache.authorize(f.demo())
      await f.cache.writeVerified(snapshot)
      if (!f.record) throw new Error('Expected encrypted fixture')
      const row = structuredClone(f.record)
      if (field === 'ciphertext') {
        const bytes = new Uint8Array(row.ciphertext)
        bytes[0] = (bytes[0] ?? 0) ^ 1
      } else if (field === 'contextHash') Object.assign(row, { contextHash: '0'.repeat(64) })
      else Object.assign(row, { [field]: row[field] + 1 })
      f.replace(row)
      expect(await f.cache.read()).toEqual({ status: 'invalid' })
      expect(f.record).toBeNull()
    },
  )
  test('a delayed old write cannot recreate cache after profile switch', async () => {
    const f = fixture()
    await f.cache.authorize(f.demo())
    const pause = f.pauseWrite()
    const writing = f.cache.writeVerified(snapshot)
    await f.enteredWrite.promise
    expect(await f.cache.authorize(f.demo(2, 'other-profile'))).toBe(true)
    pause.resolve()
    expect(await writing).toBe(false)
    expect(f.record).toBeNull()
    expect(await f.cache.read()).toEqual({ status: 'empty' })
  })
  test('a delayed old read cannot expose plaintext after logout', async () => {
    const f = fixture()
    await f.cache.authorize(f.demo())
    await f.cache.writeVerified(snapshot)
    const pause = f.pauseRead()
    const reading = f.cache.read()
    await f.enteredRead.promise
    await f.cache.discard('logout')
    pause.resolve()
    expect(await reading).toEqual({ status: 'empty' })
  })
  test('a storage write that completes after its snapshot deadline cannot renew stale data', async () => {
    const f = fixture()
    await f.cache.authorize(f.demo())
    const pause = f.pauseWrite()
    const writing = f.cache.writeVerified(snapshot)
    await f.enteredWrite.promise
    f.advance(OFFLINE_CACHE_LIMITS.defaultMaxAgeMs)
    pause.resolve()
    expect(await writing).toBe(false)
    expect(await f.cache.read()).toEqual({ status: 'expired' })
    expect(f.record).toBeNull()
  })
  test('expiry during final payload validation cannot release an expired read', async () => {
    let validations = 0
    const f = fixture({
      validateSnapshot: (value: unknown): value is Snapshot => {
        if (++validations === 2) f.advance(OFFLINE_CACHE_LIMITS.defaultMaxAgeMs)
        return validateSnapshot(value)
      },
    })
    await f.cache.authorize(f.demo())
    await f.cache.writeVerified(snapshot)
    expect(await f.cache.read()).toEqual({ status: 'expired' })
    expect(f.record).toBeNull()
  })
  test('parallel authorization is fenced so the earlier request cannot replace a newer profile', async () => {
    const f = fixture()
    const old = f.cache.authorize(f.demo(1))
    const latest = f.cache.authorize(f.demo(2, 'other-profile'))
    expect(await old).toBe(false)
    expect(await latest).toBe(true)
    expect(await f.cache.writeVerified({ ...snapshot, profile: { id: 'other-profile' } })).toBe(
      true,
    )
  })
  test.each(['wrong_profile', 'oversized', 'non_json'] as const)(
    'rejects %s before persistence',
    async (kind) => {
      const f = fixture()
      await f.cache.authorize(f.demo())
      const value =
        kind === 'wrong_profile'
          ? { ...snapshot, profile: { id: 'other-profile' } }
          : kind === 'oversized'
            ? {
                ...snapshot,
                summary: { original: 'x'.repeat(OFFLINE_CACHE_LIMITS.maxPlaintextBytes) },
              }
            : { ...snapshot, bad: BigInt(1) }
      expect(await f.cache.writeVerified(value)).toBe(false)
      expect(f.record).toBeNull()
    },
  )
  test('rejects implicit or excessive demo authorization TTL and unsupported native storage', async () => {
    const f = fixture()
    expect(
      await f.cache.authorize({
        ...f.demo(),
        ttlMs: OFFLINE_CACHE_LIMITS.maxDemoTtlMs + 1,
      } as OfflineAuthorization),
    ).toBe(false)
    const native = createUnavailableOfflineCache<Snapshot>()
    expect(native.support).toBe('unavailable')
    expect(await native.authorize(f.demo())).toBe(false)
    expect(await native.read()).toEqual({ status: 'unsupported' })
  })
})
