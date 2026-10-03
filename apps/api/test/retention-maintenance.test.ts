import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  ITALIAN_TRANSACTIONS,
  MockItalianProvider,
  type ProviderContext,
} from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  createRetentionPump,
  DEFAULT_RETENTION_CONFIGURATION,
  expiredPayloadCount,
  type RetentionConfiguration,
  type RetentionStatus,
  type RetentionTimer,
  retentionConfigurationFromEnvironment,
  runRetentionBatch,
  standaloneRetentionConfiguration,
} from '../src/retention-maintenance.js'

let handle: DatabaseHandle
const profiles: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const ingest = '2020-10-03T08:00:00.000Z',
  expiry = '2020-11-02T08:00:00.000Z'
const settings: RetentionConfiguration = {
  enabled: true,
  intervalMs: 1000,
  profileLimit: 1,
  payloadLimit: 1,
}
class Provider extends MockItalianProvider {
  constructor(readonly recordCount: number) {
    super()
  }
  override async getTransactions(_context: ProviderContext, accountId: string) {
    return {
      transactions: ITALIAN_TRANSACTIONS.slice(0, this.recordCount).filter(
        (row) => row.accountId === accountId,
      ),
      nextCursor: null,
    }
  }
}
class Timer implements RetentionTimer {
  next = 0
  readonly pending = new Map<number, { callback: () => void; delay: number }>()
  setTimeout(callback: () => void, delay: number) {
    const token = ++this.next
    this.pending.set(token, { callback, delay })
    return token
  }
  clearTimeout(token: unknown) {
    this.pending.delete(token as number)
  }
  fire() {
    const first = this.pending.entries().next().value as
      | [number, { callback: () => void; delay: number }]
      | undefined
    if (!first) throw new Error('No scheduled maintenance')
    this.pending.delete(first[0])
    first[1].callback()
  }
}
async function fixture(profileId = `maintenance_${randomUUID()}`, recordCount = 1) {
  profiles.push(profileId)
  const provider = new Provider(recordCount)
  let current = ingest
  const app = await createApp({
    db: handle.db,
    demoMode: true,
    profileId,
    provider,
    seed: true,
    now: () => current,
  })
  apps.push(app)
  return {
    app,
    profileId,
    setNow: (value: string) => {
      current = value
    },
  }
}
async function exported(app: Awaited<ReturnType<typeof createApp>>) {
  const response = await app.inject({ url: '/v1/export' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json()
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
  for (const profileId of profiles.splice(0))
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
})
afterAll(async () => {
  await handle.close()
})

describe('automatic bounded local payload maintenance', () => {
  test('validates configuration before scheduling or touching data and requires exclusive local PostgreSQL CLI mode', () => {
    expect(retentionConfigurationFromEnvironment({})).toEqual(DEFAULT_RETENTION_CONFIGURATION)
    expect(retentionConfigurationFromEnvironment({ PAYLOAD_RETENTION_ENABLED: '0' }).enabled).toBe(
      false,
    )
    for (const environment of [
      { PAYLOAD_RETENTION_ENABLED: 'yes' },
      { PAYLOAD_RETENTION_ENABLED: '' },
      { PAYLOAD_RETENTION_INTERVAL_MS: '0' },
      { PAYLOAD_RETENTION_INTERVAL_MS: '86400001' },
      { PAYLOAD_RETENTION_INTERVAL_MS: '1e3' },
      { PAYLOAD_RETENTION_PROFILE_LIMIT: '101' },
      { PAYLOAD_RETENTION_PAYLOAD_LIMIT: '' },
      { PAYLOAD_RETENTION_PAYLOAD_LIMIT: '1.5' },
      { PAYLOAD_RETENTION_PAYLOAD_LIMIT: '-1' },
      { PAYLOAD_RETENTION_ENABLED: '0', PAYLOAD_RETENTION_PAYLOAD_LIMIT: '1001' },
    ])
      expect(() => retentionConfigurationFromEnvironment(environment)).toThrow()
    const timer = new Timer()
    expect(() =>
      createRetentionPump(handle.db, { ...settings, profileLimit: 0 }, { timer }),
    ).toThrow()
    expect(() =>
      createRetentionPump(handle.db, settings, { timer, now: () => 'invalid' }),
    ).toThrow()
    expect(timer.pending.size).toBe(0)
    const valid = { DEMO_MODE: '1', DATABASE_URL: 'postgres://localhost/local_synthetic' }
    expect(standaloneRetentionConfiguration(valid, []).command).toBe('run')
    expect(
      standaloneRetentionConfiguration({ ...valid, DEMO_MODE: '0', LOCAL_AUTH_MODE: '1' }, [
        'watch',
      ]).command,
    ).toBe('watch')
    for (const environment of [
      { ...valid, NODE_ENV: 'production' },
      { ...valid, LOCAL_AUTH_MODE: '1' },
      { ...valid, DEMO_MODE: '0' },
      { ...valid, DEMO_MODE: 'true' },
      { ...valid, PGLITE_PATH: '/tmp/shared-store' },
      { ...valid, PGLITE_PATH: '' },
      { ...valid, DATABASE_URL: '' },
      { ...valid, DATABASE_URL: 'file:///tmp/store' },
    ])
      expect(() => standaloneRetentionConfiguration(environment, ['run'])).toThrow()
    expect(() => standaloneRetentionConfiguration(valid, ['unknown'])).toThrow()
    expect(() => standaloneRetentionConfiguration(valid, ['run', 'extra'])).toThrow()
  })

  test('starts immediately, schedules from completion, and physically deletes at the exact expiry boundary without changing the ledger', async () => {
    const owned = await fixture()
    const before = await exported(owned.app)
    const timer = new Timer(),
      reports: RetentionStatus[] = []
    let current = ingest
    const pump = createRetentionPump(handle.db, settings, {
      timer,
      now: () => current,
      report: (status) => reports.push(status),
    })
    try {
      expect((await pump.runNow()).deletedLastRun).toBe(0)
      expect(timer.pending.size).toBe(1)
      expect([...timer.pending.values()][0]?.delay).toBe(1000)
      current = '2020-11-02T07:59:59.999Z'
      timer.fire()
      expect((await pump.runNow()).deletedLastRun).toBe(0)
      expect(await expiredPayloadCount(handle.db, current)).toBe(0)
      current = expiry
      timer.fire()
      const completed = await pump.runNow()
      expect(completed).toMatchObject({
        deletedLastRun: 1,
        deletedSinceStart: 1,
        expiredPayloads: 0,
        lastOutcome: 'completed',
        running: false,
      })
      expect(
        await handle.db
          .select()
          .from(schema.observationPayloads)
          .where(eq(schema.observationPayloads.profileId, owned.profileId)),
      ).toEqual([])
      const after = await exported(owned.app)
      expect(after.transactions).toEqual(before.transactions)
      expect(after.accounts).toEqual(before.accounts)
      expect(after.analysis).toEqual(before.analysis)
      expect(after.sourceObservations[0]).not.toHaveProperty('payload')
      const serialized = JSON.stringify(reports)
      expect(serialized).not.toContain(owned.profileId)
      expect(serialized).not.toContain('Datore sintetico')
      expect(serialized).not.toContain('salary')
    } finally {
      await pump.stop()
    }
    expect(timer.pending.size).toBe(0)
  })

  test('fair paging visits every expired profile before revisiting a larger first profile, then wraps', async () => {
    const prefix = `maintenance_${randomUUID()}_`
    const first = await fixture(`${prefix}a`, 3),
      second = await fixture(`${prefix}b`),
      third = await fixture(`${prefix}c`)
    const initial = await exported(first.app)
    let cursor: string | null = null
    const counts: number[] = []
    for (let index = 0; index < 5; index++) {
      const batch = await runRetentionBatch(handle.db, settings, expiry, cursor)
      counts.push(batch.deleted)
      cursor = batch.cursor
      expect(batch.profilesVisited).toBe(1)
      if (index === 0) expect(cursor).toBe(first.profileId)
      if (index === 1) expect(cursor).toBe(second.profileId)
      if (index === 2) expect(cursor).toBe(third.profileId)
    }
    expect(counts).toEqual([1, 1, 1, 1, 1])
    expect(await expiredPayloadCount(handle.db, expiry)).toBe(0)
    expect((await exported(first.app)).transactions).toEqual(initial.transactions)
    expect(await runRetentionBatch(handle.db, settings, expiry, cursor)).toMatchObject({
      cursor: null,
      profilesVisited: 0,
      deleted: 0,
    })
  })

  test('an expired profile created behind the cursor is reached after the next wrap', async () => {
    const prefix = `maintenance_${randomUUID()}_`
    const later = await fixture(`${prefix}z`)
    const first = await runRetentionBatch(handle.db, settings, expiry)
    expect(first.cursor).toBe(later.profileId)
    const earlier = await fixture(`${prefix}a`)
    expect(await runRetentionBatch(handle.db, settings, expiry, first.cursor)).toMatchObject({
      cursor: earlier.profileId,
      deleted: 1,
    })
    expect(await expiredPayloadCount(handle.db, expiry)).toBe(0)
  })

  test('overlapping timer/manual requests coalesce, and stop waits for in-flight work without scheduling again', async () => {
    const timer = new Timer()
    let release: (() => void) | undefined,
      started = 0
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const pump = createRetentionPump(handle.db, settings, {
      timer,
      now: () => expiry,
      batch: async (...arguments_) => {
        started++
        await gate
        return runRetentionBatch(...arguments_)
      },
    })
    const first = pump.runNow(),
      second = pump.runNow()
    expect(first).toBe(second)
    expect(started).toBe(1)
    expect(timer.pending.size).toBe(0)
    let stopped = false
    const stopping = pump.stop().then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)
    release?.()
    await stopping
    expect(timer.pending.size).toBe(0)
    expect((await pump.status()).stopped).toBe(true)
    await pump.runNow()
    expect(started).toBe(1)
  })

  test('a failed run reports only a safe code and schedules a later retry; a reporter failure cannot halt it', async () => {
    const owned = await fixture()
    const timer = new Timer(),
      reports: RetentionStatus[] = []
    let attempts = 0
    const pump = createRetentionPump(handle.db, settings, {
      timer,
      now: () => expiry,
      batch: async (...arguments_) => {
        if (++attempts === 1) throw new Error(`Sensitive SQL payload ${owned.profileId}`)
        return runRetentionBatch(...arguments_)
      },
      report: async (status) => {
        reports.push(status)
        throw new Error('Reporter unavailable')
      },
    })
    try {
      expect(await pump.runNow()).toMatchObject({
        lastOutcome: 'failed',
        errorCode: 'retention_cleanup_failed',
        expiredPayloads: 1,
        deletedSinceStart: 0,
      })
      expect(timer.pending.size).toBe(1)
      timer.fire()
      expect(await pump.runNow()).toMatchObject({
        lastOutcome: 'completed',
        errorCode: null,
        expiredPayloads: 0,
        deletedSinceStart: 1,
      })
      expect(JSON.stringify(reports)).not.toContain(owned.profileId)
      expect(JSON.stringify(reports)).not.toContain('Sensitive SQL')
      expect(timer.pending.size).toBe(1)
    } finally {
      await pump.stop()
    }
  })

  test('disabled maintenance neither deletes nor schedules and reports the current expiry backlog', async () => {
    await fixture()
    const timer = new Timer(),
      pump = createRetentionPump(
        handle.db,
        { ...settings, enabled: false },
        { timer, now: () => expiry },
      )
    try {
      expect(await pump.runNow()).toMatchObject({
        lastOutcome: 'disabled',
        expiredPayloads: 1,
        deletedSinceStart: 0,
      })
      expect(timer.pending.size).toBe(0)
      expect(
        await runRetentionBatch(handle.db, { ...settings, enabled: false }, expiry),
      ).toMatchObject({ deleted: 0, profilesVisited: 0 })
    } finally {
      await pump.stop()
    }
  })

  test('a profile-level cleanup failure does not starve another profile and the failed profile is retried after wrap', async () => {
    const prefix = `maintenance_${randomUUID()}_`
    const first = await fixture(`${prefix}a`),
      second = await fixture(`${prefix}b`)
    let transactions = 0
    const fault = new Proxy(handle.db, {
      get(target, property) {
        const value = Reflect.get(target, property, target)
        if (property === 'transaction')
          return (...arguments_: Parameters<typeof handle.db.transaction>) => {
            if (++transactions === 1)
              return Promise.reject(new Error(`Private database failure ${first.profileId}`))
            return target.transaction(...arguments_)
          }
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    const failed = await runRetentionBatch(fault, { ...settings, profileLimit: 2 }, expiry)
    expect(failed).toEqual({
      cursor: second.profileId,
      profilesVisited: 2,
      failedProfiles: 1,
      deleted: 1,
    })
    expect(await expiredPayloadCount(handle.db, expiry)).toBe(1)
    const retried = await runRetentionBatch(fault, settings, expiry, failed.cursor)
    expect(retried).toEqual({
      cursor: first.profileId,
      profilesVisited: 1,
      failedProfiles: 0,
      deleted: 1,
    })
    expect(await expiredPayloadCount(handle.db, expiry)).toBe(0)
  })

  test('concurrent cleanup batches remove each payload once, and provider replay after scheduled deletion cannot rehydrate it', async () => {
    const owned = await fixture(undefined, 2)
    const initial = await exported(owned.app)
    const batches = await Promise.all([
      runRetentionBatch(handle.db, settings, expiry),
      runRetentionBatch(handle.db, settings, expiry),
    ])
    expect(batches.reduce((sum, batch) => sum + batch.deleted, 0)).toBe(2)
    expect(batches.reduce((sum, batch) => sum + batch.failedProfiles, 0)).toBe(0)
    expect(await expiredPayloadCount(handle.db, expiry)).toBe(0)
    owned.setNow(expiry)
    const response = await owned.app.inject({
      method: 'POST',
      url: `/v1/connections/${initial.connections[0].id}/sync`,
      payload: {},
    })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json()).toMatchObject({ inserted: 0, updated: 0, unchanged: 2 })
    const replay = await exported(owned.app)
    expect(replay.transactions).toEqual(initial.transactions)
    expect(replay.sourceObservations).toHaveLength(2)
    expect(
      replay.sourceObservations.every((row: { payload?: unknown }) => row.payload === undefined),
    ).toBe(true)
  })
})
