import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider, type ProviderContext } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  assertNoOutstandingRevocation,
  claimRevocation,
  createRevocationPump,
  drainRevocations,
  enqueueRevocation,
  processNextRevocation,
  revocationsForProfile,
} from '../src/revocation-outbox.js'

let handle: DatabaseHandle
const profileIds: string[] = []
const initialTime = '2026-10-03T12:00:00.000Z'
const target = () => {
  const profileId = `outbox_${randomUUID()}`
  profileIds.push(profileId)
  return {
    profileId,
    connectionId: `connection_${randomUUID()}`,
    providerId: 'mock-italian',
    consentId: `consent_${randomUUID()}`,
  }
}
class FailingProvider extends MockItalianProvider {
  calls = 0
  override async disconnect(_context: ProviderContext) {
    this.calls += 1
    throw new Error('PRIVATE merchant description and token sentinel')
  }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const profileId of profileIds)
    await handle.db
      .delete(schema.revocationJobs)
      .where(eq(schema.revocationJobs.profileId, profileId))
  await handle.close()
})

describe('durable synthetic revocation outbox', () => {
  test('same-consent enqueue deduplicates and transaction rollback never publishes work', async () => {
    const routing = target()
    const id = await enqueueRevocation(handle.db, routing, initialTime)
    expect(await enqueueRevocation(handle.db, routing, initialTime)).toBe(id)
    expect(await revocationsForProfile(handle.db, routing.profileId)).toHaveLength(1)
    const rolledBack = target()
    await expect(
      handle.db.transaction(async (tx) => {
        await enqueueRevocation(tx, rolledBack, initialTime)
        throw new Error('Rollback local revocation')
      }),
    ).rejects.toThrow('Rollback')
    expect(await revocationsForProfile(handle.db, rolledBack.profileId)).toEqual([])
  })

  test('two workers claim each due job once with committed leases and no shared ownership', async () => {
    const routing = target()
    await enqueueRevocation(handle.db, routing, initialTime)
    await enqueueRevocation(handle.db, { ...routing, consentId: 'second-consent' }, initialTime)
    const options = { profileId: routing.profileId, now: () => initialTime }
    const claims = await Promise.all([
      claimRevocation(handle.db, options),
      claimRevocation(handle.db, options),
    ])
    expect(claims.every((job) => job?.state === 'running' && job.attempts === 1)).toBe(true)
    expect(new Set(claims.map((job) => job?.id)).size).toBe(2)
    expect(new Set(claims.map((job) => job?.leaseToken)).size).toBe(2)
    expect(await claimRevocation(handle.db, options)).toBeNull()
  })

  test('retry uses bounded backoff, stores only a safe code, and terminal failure blocks regrant', async () => {
    const routing = target()
    const jobId = await enqueueRevocation(handle.db, routing, initialTime)
    const provider = new FailingProvider()
    let now = initialTime
    const options = { jobId, maxAttempts: 2, now: () => now }
    expect(await processNextRevocation(handle.db, [provider], options)).toMatchObject({
      state: 'pending',
      attempts: 1,
    })
    const [pending] = await revocationsForProfile(handle.db, routing.profileId)
    expect(pending?.lastErrorCode).toBe('provider_unavailable')
    const delay = Date.parse(pending?.nextAttemptAt ?? '') - Date.parse(initialTime)
    expect(delay).toBeGreaterThanOrEqual(800)
    expect(delay).toBeLessThanOrEqual(1200)
    expect(await processNextRevocation(handle.db, [provider], options)).toBeNull()
    now = pending?.nextAttemptAt ?? ''
    expect(await processNextRevocation(handle.db, [provider], options)).toMatchObject({
      state: 'failed',
      attempts: 2,
    })
    expect(provider.calls).toBe(2)
    const status = await revocationsForProfile(handle.db, routing.profileId)
    expect(JSON.stringify(status)).not.toContain('PRIVATE')
    await expect(
      assertNoOutstandingRevocation(handle.db, routing.profileId, routing.connectionId),
    ).rejects.toMatchObject({ status: 409, code: 'revocation_pending' })
  })

  test('deadline exhaustion and unknown provider become inspectable terminal jobs without provider I/O', async () => {
    const expired = target()
    const jobId = await enqueueRevocation(handle.db, expired, initialTime)
    const provider = new FailingProvider()
    expect(
      await processNextRevocation(handle.db, [provider], {
        jobId,
        now: () => '2026-10-10T12:00:00.000Z',
      }),
    ).toMatchObject({ state: 'failed', attempts: 0 })
    expect(provider.calls).toBe(0)
    expect((await revocationsForProfile(handle.db, expired.profileId))[0]?.lastErrorCode).toBe(
      'deadline_exceeded',
    )
    const unknown = target()
    const unknownId = await enqueueRevocation(
      handle.db,
      { ...unknown, providerId: 'missing-synthetic' },
      initialTime,
    )
    expect(
      await processNextRevocation(handle.db, [provider], {
        jobId: unknownId,
        now: () => initialTime,
      }),
    ).toMatchObject({ state: 'failed', attempts: 1 })
    expect((await revocationsForProfile(handle.db, unknown.profileId))[0]?.lastErrorCode).toBe(
      'provider_unknown',
    )
  })

  test('expired lease fences old acknowledgement and old remote revoke cannot hit a replacement grant', async () => {
    const routing = target()
    const jobId = await enqueueRevocation(handle.db, routing, initialTime)
    let releaseFirst: () => void = () => undefined
    let signalStarted: () => void = () => undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve
    })
    class DelayedProvider extends MockItalianProvider {
      calls = 0
      override async disconnect(context: ProviderContext) {
        this.calls += 1
        if (this.calls === 1) {
          signalStarted()
          await firstGate
        }
        await super.disconnect(context)
      }
    }
    const provider = new DelayedProvider()
    const context = { profileId: routing.profileId, connectionId: routing.connectionId }
    await provider.createConnection({ ...context, grantId: routing.consentId })
    let now = initialTime
    const first = processNextRevocation(handle.db, [provider], { jobId, now: () => now })
    await started
    try {
      await expect(
        assertNoOutstandingRevocation(handle.db, routing.profileId, routing.connectionId),
      ).rejects.toMatchObject({ code: 'revocation_pending' })
      now = '2026-10-03T12:00:31.000Z'
      expect(
        await processNextRevocation(handle.db, [provider], { jobId, now: () => now }),
      ).toMatchObject({ state: 'completed', attempts: 2 })
      await assertNoOutstandingRevocation(handle.db, routing.profileId, routing.connectionId)
      await provider.createConnection({ ...context, grantId: 'replacement-consent' })
      releaseFirst()
      expect(await first).toMatchObject({ state: 'stale', attempts: 1 })
      await expect(provider.listAccounts(context)).resolves.toHaveLength(5)
      const [completed] = await revocationsForProfile(handle.db, routing.profileId)
      expect(completed).toMatchObject({ state: 'completed', attempts: 2 })
    } finally {
      releaseFirst()
      await first
    }
  })

  test('a hung attempt times out into durable retry without holding a database transaction', async () => {
    const routing = target()
    const jobId = await enqueueRevocation(handle.db, routing, initialTime)
    class HungProvider extends MockItalianProvider {
      override async disconnect(_context: ProviderContext) {
        return new Promise<void>(() => undefined)
      }
    }
    const result = await processNextRevocation(handle.db, [new HungProvider()], {
      jobId,
      now: () => initialTime,
      attemptTimeoutMs: 10,
    })
    expect(result).toMatchObject({ state: 'pending', attempts: 1 })
    expect((await revocationsForProfile(handle.db, routing.profileId))[0]?.lastErrorCode).toBe(
      'provider_unavailable',
    )
  })

  test('profile status cannot include another profile and bounded drain respects its configured scope', async () => {
    const own = target()
    const other = target()
    const ownId = await enqueueRevocation(handle.db, own, initialTime)
    const otherId = await enqueueRevocation(handle.db, other, initialTime)
    expect(
      await drainRevocations(handle.db, [new MockItalianProvider()], 1, {
        profileId: own.profileId,
        now: () => initialTime,
      }),
    ).toEqual([{ jobId: ownId, state: 'completed', attempts: 1 }])
    expect((await revocationsForProfile(handle.db, own.profileId)).map((job) => job.id)).toEqual([
      ownId,
    ])
    expect((await revocationsForProfile(handle.db, other.profileId))[0]).toMatchObject({
      id: otherId,
      state: 'pending',
      attempts: 0,
    })
    await expect(drainRevocations(handle.db, [], 101)).rejects.toThrow('batch limit')
  })

  test('the same-handle pump automatically retries a due failure and shuts down cleanly', async () => {
    const routing = target()
    await enqueueRevocation(handle.db, routing, initialTime)
    class TemporaryFailure extends MockItalianProvider {
      calls = 0
      override async disconnect(context: ProviderContext) {
        this.calls += 1
        if (this.calls === 1) throw new Error('PRIVATE transient failure')
        await super.disconnect(context)
      }
    }
    const provider = new TemporaryFailure()
    let now = initialTime
    const pump = createRevocationPump(handle.db, [provider], {
      profileId: routing.profileId,
      intervalMs: 100,
      now: () => now,
    })
    try {
      let pending = (await revocationsForProfile(handle.db, routing.profileId))[0]
      for (
        let index = 0;
        index < 100 && (pending?.attempts !== 1 || pending?.state !== 'pending');
        index += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        pending = (await revocationsForProfile(handle.db, routing.profileId))[0]
      }
      expect(pending).toMatchObject({ state: 'pending', attempts: 1 })
      now = pending?.nextAttemptAt ?? ''
      let completed = pending
      for (let index = 0; index < 100 && completed?.state !== 'completed'; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        completed = (await revocationsForProfile(handle.db, routing.profileId))[0]
      }
      expect(completed).toMatchObject({ state: 'completed', attempts: 2 })
      expect(provider.calls).toBe(2)
    } finally {
      await pump.stop()
    }
    expect(pump.status()).toEqual({ stopped: true, running: false, storageFailures: 0 })
  })

  test('pump ticks never overlap and stop prevents claiming more work after the active attempt', async () => {
    const routing = target()
    await enqueueRevocation(handle.db, routing, initialTime)
    await enqueueRevocation(handle.db, { ...routing, consentId: 'another-consent' }, initialTime)
    let signalStarted: () => void = () => undefined
    let release: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    class BlockedProvider extends MockItalianProvider {
      calls = 0
      override async disconnect(context: ProviderContext) {
        this.calls += 1
        signalStarted()
        await gate
        await super.disconnect(context)
      }
    }
    const provider = new BlockedProvider()
    const pump = createRevocationPump(handle.db, [provider], {
      profileId: routing.profileId,
      intervalMs: 100,
      now: () => initialTime,
    })
    await started
    try {
      await new Promise((resolve) => setTimeout(resolve, 220))
      expect(provider.calls).toBe(1)
      const stopping = pump.stop()
      expect(pump.status()).toMatchObject({ stopped: true, running: true })
      release()
      await stopping
      expect(provider.calls).toBe(1)
      expect(
        (await revocationsForProfile(handle.db, routing.profileId)).map((job) => job.state).sort(),
      ).toEqual(['completed', 'pending'])
    } finally {
      release()
      await pump.stop()
    }
  })
})
