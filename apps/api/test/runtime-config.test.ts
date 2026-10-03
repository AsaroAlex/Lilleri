import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  createRetentionPump,
  type RetentionConfiguration,
  type RetentionTimer,
} from '../src/retention-maintenance.js'
import {
  createRevocationPump,
  enqueueRevocation,
  revocationsForProfile,
} from '../src/revocation-outbox.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from '../src/runtime-config.js'
import { runtimeConfigurationOperatorArguments } from '../src/runtime-config-operator.js'
import {
  runtimeConfigurationHead,
  runtimeConfigurationVersions,
} from '../src/runtime-config-schema.js'

let handle: DatabaseHandle, store: RuntimeConfigurationStore
const audit = { actor: 'local_operator', reason: 'tuning' } as const
const now = () => '2026-10-03T10:00:00.000Z'
const changed = () => ({
  ...DEFAULT_RUNTIME_CONFIGURATION,
  payloadRetention: { ...DEFAULT_RUNTIME_CONFIGURATION.payloadRetention, payloadLimit: 1 },
})
beforeEach(async () => {
  // Each singleton has its own ephemeral store; no shared process configuration is overwritten.
  handle = await openDatabase({ driver: 'pglite' })
  store = new RuntimeConfigurationStore(handle.db, now)
})
afterEach(async () => {
  await handle.close()
})
class Timer implements RetentionTimer {
  pending: { callback: () => void; delay: number } | null = null
  setTimeout(callback: () => void, delay: number) {
    this.pending = { callback, delay }
    return 1
  }
  clearTimeout() {
    this.pending = null
  }
}

describe('audited operational runtime configuration', () => {
  test('keeps historical understanding policy absent and rejects values outside synthetic operating bounds', async () => {
    const { understanding: _understanding, ...legacy } = DEFAULT_RUNTIME_CONFIGURATION
    const first = await store.ensure(legacy)
    expect(first.values).not.toHaveProperty('understanding')
    expect((await store.read()).digest).toBe(first.digest)
    const updated = await store.update(1, DEFAULT_RUNTIME_CONFIGURATION, audit)
    expect(updated.values.understanding).toEqual(DEFAULT_RUNTIME_CONFIGURATION.understanding)
    expect((await store.history())[0]?.digest).toBe(first.digest)
    for (const invalid of [
      { maxBalanceAgeMs: -1 },
      { maxBalanceAgeMs: 2_592_000_001 },
      { occurrenceToleranceDays: 32 },
      { maxForecastOccurrences: 0 },
      { maxForecastOccurrences: 1001 },
      { horizonDays: 0 },
      { horizonDays: 367 },
      { calibratedBankGuarantee: true },
    ])
      await expect(
        store.update(
          2,
          { ...updated.values, understanding: { ...updated.values.understanding, ...invalid } },
          audit,
        ),
      ).rejects.toMatchObject({ code: 'configuration_invalid' })
    expect((await store.read()).revision).toBe(2)
  })

  test('keeps legacy notification fields absent and validates explicitly audited provider-relative reminder windows', async () => {
    const { notifications: _notifications, ...legacy } = DEFAULT_RUNTIME_CONFIGURATION
    const first = await store.ensure(legacy)
    expect(first.values).not.toHaveProperty('notifications')
    expect((await store.read()).digest).toBe(first.digest)
    const updated = await store.update(
      1,
      {
        ...legacy,
        notifications: {
          ...DEFAULT_RUNTIME_CONFIGURATION.notifications,
          expiryOffsetsSeconds: [604_800, 86_400],
        },
      },
      audit,
    )
    expect(updated.values.notifications?.expiryOffsetsSeconds).toEqual([604_800, 86_400])
    expect((await store.history())[0]?.digest).toBe(first.digest)
    for (const offsets of [[0], [2_592_001], [86_400, 86_400], [1, 2, 3, 4, 5, 6]])
      await expect(
        store.update(
          2,
          {
            ...updated.values,
            notifications: {
              ...updated.values.notifications,
              expiryOffsetsSeconds: offsets,
            },
          },
          audit,
        ),
      ).rejects.toMatchObject({ code: 'configuration_invalid' })
    await expect(
      store.update(
        2,
        {
          ...updated.values,
          notifications: { ...updated.values.notifications, inboxDailyLimit: 2 },
        },
        audit,
      ),
    ).rejects.toMatchObject({ code: 'configuration_invalid' })
    expect(Object.isFrozen(DEFAULT_RUNTIME_CONFIGURATION.notifications?.expiryOffsetsSeconds)).toBe(
      true,
    )
  })

  test('reads old configuration without inventing optional lifecycle fields or changing its historical digest', async () => {
    const { connectionLifecycle: _removed, ...legacy } = DEFAULT_RUNTIME_CONFIGURATION
    const initial = await store.ensure(legacy)
    expect(initial.values).not.toHaveProperty('connectionLifecycle')
    expect((await store.read()).digest).toBe(initial.digest)
    const updated = await store.update(
      1,
      {
        ...legacy,
        connectionLifecycle: { expiringOffsetSeconds: 86_400 },
      },
      audit,
    )
    expect(updated.revision).toBe(2)
    expect(updated.values.connectionLifecycle?.expiringOffsetSeconds).toBe(86_400)
    expect((await store.history())[0]?.digest).toBe(initial.digest)
    await expect(
      store.update(
        2,
        {
          ...legacy,
          connectionLifecycle: { expiringOffsetSeconds: 2_592_001 },
        },
        audit,
      ),
    ).rejects.toMatchObject({ code: 'configuration_invalid' })
  })

  test('bootstraps exactly once and makes the stored snapshot authoritative over later bootstrap arguments', async () => {
    await expect(store.read()).rejects.toMatchObject({ code: 'configuration_unavailable' })
    const initial = await store.ensure()
    expect(initial).toMatchObject({
      revision: 1,
      action: 'bootstrap',
      actor: 'bootstrap',
      reason: 'initial_setup',
      previousRevision: null,
      rollbackRevision: null,
      values: DEFAULT_RUNTIME_CONFIGURATION,
    })
    expect(initial.digest).toMatch(/^[a-f0-9]{64}$/)
    const edited = await store.update(1, changed(), audit)
    expect(await store.ensure(DEFAULT_RUNTIME_CONFIGURATION)).toEqual(edited)
    expect(await store.history()).toHaveLength(2)
    edited.values.payloadRetention.payloadLimit = 500
    expect((await store.read()).values.payloadRetention.payloadLimit).toBe(1)
    expect(Object.isFrozen(DEFAULT_RUNTIME_CONFIGURATION)).toBe(true)
    expect(Object.isFrozen(DEFAULT_RUNTIME_CONFIGURATION.payloadRetention)).toBe(true)
  })

  test('rejects secret/PII/unknown keys, malformed bounds and free-text audit reasons without writing a revision', async () => {
    await store.ensure()
    const invalid = [
      { ...changed(), secret: 'PRIVATE_SECRET' },
      { ...changed(), provider: { token: 'PRIVATE_TOKEN' } },
      { ...changed(), payloadRetention: { ...changed().payloadRetention, enabled: 'true' } },
      { ...changed(), payloadRetention: { ...changed().payloadRetention, payloadLimit: 1001 } },
      { ...changed(), payloadRetention: { ...changed().payloadRetention, intervalMs: 0 } },
      { ...changed(), revocation: { ...changed().revocation, attemptTimeoutMs: 30_001 } },
      { ...changed(), observability: { traceSampleRatio: 1.01, metricsEnabled: true } },
      {
        ...changed(),
        observability: { traceSampleRatio: 0.1, metricsEnabled: true, email: 'PII' },
      },
    ]
    for (const values of invalid)
      await expect(store.update(1, values, audit)).rejects.toMatchObject({
        code: 'configuration_invalid',
        message: 'configuration_invalid',
      })
    await expect(
      store.update(1, changed(), {
        actor: 'local_operator',
        reason: 'private@example.test',
      } as never),
    ).rejects.toMatchObject({ code: 'configuration_invalid' })
    for (const revision of [0, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER])
      await expect(store.update(revision, changed(), audit)).rejects.toMatchObject({
        code: 'configuration_invalid',
      })
    expect(await store.history()).toHaveLength(1)
    expect((await store.read()).revision).toBe(1)
  })

  test('serializes concurrent bootstrap and ensures exactly one concurrent edit wins', async () => {
    const bootstraps = await Promise.all([store.ensure(), store.ensure(changed())])
    expect(bootstraps[0]).toEqual(bootstraps[1])
    const outcomes = await Promise.allSettled([
      store.update(1, changed(), audit),
      store.update(1, DEFAULT_RUNTIME_CONFIGURATION, { actor: 'deployment', reason: 'release' }),
    ])
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const failure = outcomes.find((result) => result.status === 'rejected')
    expect(failure?.status === 'rejected' ? failure.reason.code : null).toBe(
      'configuration_changed',
    )
    expect((await store.read()).revision).toBe(2)
    expect(await store.history()).toHaveLength(2)
  })

  test('rolls back by appending a new audited version and fences a stale edit even after values return', async () => {
    const first = await store.ensure()
    await store.update(1, changed(), audit)
    const restored = await store.rollback(2, 1, 'local_operator')
    expect(restored).toMatchObject({
      revision: 3,
      previousRevision: 2,
      rollbackRevision: 1,
      action: 'rollback',
      reason: 'rollback',
      values: first.values,
      digest: first.digest,
    })
    await expect(store.update(1, changed(), audit)).rejects.toMatchObject({
      code: 'configuration_changed',
    })
    await expect(store.rollback(3, 4, 'local_operator')).rejects.toMatchObject({
      code: 'configuration_invalid',
    })
    expect((await store.history(1, 1)).map((row) => row.revision)).toEqual([2])
    expect((await store.history()).map((row) => row.revision)).toEqual([1, 2, 3])
  })

  test('database triggers reject editing/deleting audit snapshots or silently rewinding the head', async () => {
    await store.ensure()
    await store.update(1, changed(), audit)
    await expect(
      handle.db.update(runtimeConfigurationVersions).set({ digest: '0'.repeat(64) }),
    ).rejects.toThrow()
    await expect(handle.db.delete(runtimeConfigurationVersions)).rejects.toThrow()
    await expect(handle.db.delete(runtimeConfigurationHead)).rejects.toThrow()
    await expect(
      handle.db.update(runtimeConfigurationHead).set({ activeRevision: 1 }),
    ).rejects.toThrow()
    expect((await store.read()).revision).toBe(2)
    expect(await store.history()).toHaveLength(2)
  })

  test('rolls the entire version/audit back if advancing the active pointer fails', async () => {
    await store.ensure()
    await handle.db.execute(sql`
      CREATE FUNCTION synthetic_config_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic failure'; END;
      $$
    `)
    await handle.db.execute(sql`
      CREATE TRIGGER synthetic_config_failure BEFORE UPDATE ON runtime_configuration_head
      FOR EACH ROW EXECUTE FUNCTION synthetic_config_failure()
    `)
    await expect(store.update(1, changed(), audit)).rejects.toThrow()
    expect((await store.read()).revision).toBe(1)
    expect(await store.history()).toHaveLength(1)
  })

  test('persists active configuration and historical rollback targets across close/reopen', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-runtime-config-'))
    let disk = await openDatabase({ driver: 'pglite', path: directory })
    try {
      const writer = new RuntimeConfigurationStore(disk.db, now)
      await writer.ensure()
      await writer.update(1, changed(), audit)
      await disk.close()
      disk = await openDatabase({ driver: 'pglite', path: directory })
      const reopened = new RuntimeConfigurationStore(disk.db, now)
      expect((await reopened.read()).values.payloadRetention.payloadLimit).toBe(1)
      expect((await reopened.rollback(2, 1, 'deployment')).revision).toBe(3)
      expect(await reopened.history()).toHaveLength(3)
    } finally {
      await disk.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('refreshes retention settings at each bounded batch, pauses/re-enables, and fails closed on unavailable configuration', async () => {
    await store.ensure()
    const timer = new Timer(),
      batches: RetentionConfiguration[] = []
    let failedRead = false
    const pump = createRetentionPump(handle.db, DEFAULT_RUNTIME_CONFIGURATION.payloadRetention, {
      timer,
      now,
      configuration: async () => {
        if (failedRead) throw new Error('PRIVATE database content')
        return (await store.read()).values.payloadRetention
      },
      batch: async (_db, configuration) => {
        batches.push(configuration)
        return { cursor: null, profilesVisited: 0, failedProfiles: 0, deleted: 0 }
      },
    })
    try {
      await pump.runNow()
      expect(batches).toHaveLength(1)
      await store.update(
        1,
        {
          ...changed(),
          payloadRetention: { ...changed().payloadRetention, intervalMs: 1000, enabled: false },
        },
        audit,
      )
      expect(await pump.runNow()).toMatchObject({ enabled: false, lastOutcome: 'disabled' })
      expect(timer.pending?.delay).toBe(1000)
      expect(batches).toHaveLength(1)
      const current = await store.read()
      await store.update(
        current.revision,
        {
          ...current.values,
          payloadRetention: { ...current.values.payloadRetention, enabled: true },
        },
        audit,
      )
      await pump.runNow()
      expect(batches).toHaveLength(2)
      expect(batches[1]?.payloadLimit).toBe(1)
      failedRead = true
      expect(await pump.runNow()).toMatchObject({ lastOutcome: 'failed', deletedLastRun: 0 })
      expect(batches).toHaveLength(2)
      expect(timer.pending?.delay).toBe(1000)
    } finally {
      await pump.stop()
    }
  })

  test('revocation runtime pause and timeout changes affect the real outbox, not only an exposed setting', async () => {
    const initial = await store.ensure({
      ...DEFAULT_RUNTIME_CONFIGURATION,
      revocation: { ...DEFAULT_RUNTIME_CONFIGURATION.revocation, enabled: false, intervalMs: 100 },
    })
    const profileId = `runtime_${randomUUID()}`
    await handle.db
      .insert(schema.profiles)
      .values({ id: profileId, name: 'Sintetico', timezone: 'UTC', createdAt: now() })
    const target = {
      profileId,
      connectionId: 'synthetic_connection',
      providerId: 'mock-italy',
      consentId: 'synthetic_consent',
    }
    class Unavailable extends MockItalianProvider {
      calls = 0
      override async disconnect() {
        this.calls++
        await new Promise<void>(() => undefined)
      }
    }
    const provider = new Unavailable()
    target.providerId = provider.id
    await enqueueRevocation(handle.db, target, now())
    let failedRead = true,
      failures = 0
    const pump = createRevocationPump(handle.db, [provider], {
      ...initial.values.revocation,
      profileId,
      now,
      configuration: async () => {
        if (failedRead) throw new Error('PRIVATE config failure')
        return (await store.read()).values.revocation
      },
      onStorageFailure: () => {
        failures++
      },
    })
    try {
      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(provider.calls).toBe(0)
      expect(failures).toBeGreaterThan(0)
      failedRead = false
      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(provider.calls).toBe(0)
      await store.update(
        1,
        {
          ...initial.values,
          revocation: { ...initial.values.revocation, enabled: true, attemptTimeoutMs: 1 },
        },
        audit,
      )
      let job = (await revocationsForProfile(handle.db, profileId))[0]
      for (let attempt = 0; attempt < 100 && job?.state !== 'pending'; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        job = (await revocationsForProfile(handle.db, profileId))[0]
      }
      for (let attempt = 0; attempt < 100 && provider.calls === 0; attempt++)
        await new Promise((resolve) => setTimeout(resolve, 5))
      await pump.stop()
      job = (await revocationsForProfile(handle.db, profileId))[0]
      expect(provider.calls).toBe(1)
      expect(job).toMatchObject({
        state: 'pending',
        attempts: 1,
        lastErrorCode: 'provider_unavailable',
      })
      expect(job?.deadlineAt).toBe('2026-10-10T10:00:00.000Z')
    } finally {
      await pump.stop()
      await handle.db
        .delete(schema.revocationJobs)
        .where(eq(schema.revocationJobs.profileId, profileId))
    }
  })
  test('keeps the trusted local operator PostgreSQL-only and validates bounded exact command arguments', () => {
    const valid = { DEMO_MODE: '1', DATABASE_URL: 'postgres://localhost/local_synthetic' }
    expect(runtimeConfigurationOperatorArguments(valid, []).command).toBe('status')
    expect(runtimeConfigurationOperatorArguments(valid, ['rollback', '2', '1'])).toMatchObject({
      command: 'rollback',
      expectedRevision: 2,
      targetRevision: 1,
    })
    expect(
      runtimeConfigurationOperatorArguments({ ...valid, DEMO_MODE: '0', LOCAL_AUTH_MODE: '1' }, [
        'update',
        'tuning',
        '2',
        '/tmp/synthetic-config.json',
      ]).command,
    ).toBe('update')
    for (const environment of [
      { ...valid, NODE_ENV: 'production' },
      { ...valid, DEMO_MODE: '0' },
      { ...valid, LOCAL_AUTH_MODE: '1' },
      { ...valid, DEMO_MODE: 'true' },
      { ...valid, PGLITE_PATH: '/tmp/shared-store' },
      { ...valid, PGLITE_PATH: '' },
      { ...valid, DATABASE_URL: 'file:///tmp/shared-store' },
      { ...valid, DATABASE_URL: '' },
    ])
      expect(() => runtimeConfigurationOperatorArguments(environment, ['status'])).toThrow()
    for (const arguments_ of [
      ['status', 'extra'],
      ['update', 'private@example.test', '1', '/tmp/config.json'],
      ['update', 'tuning', '1.5', '/tmp/config.json'],
      ['update', 'incident', '0', '/tmp/config.json'],
      ['update', 'release', '2147483647', '/tmp/config.json'],
      ['rollback', '2', '1', 'extra'],
      ['rollback', '2', '1e0'],
    ])
      expect(() => runtimeConfigurationOperatorArguments(valid, arguments_)).toThrow()
  })
})
