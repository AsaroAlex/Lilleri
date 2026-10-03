import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  createRevocationPump,
  enqueueRevocation,
  type RevocationPumpConfiguration,
} from '../src/revocation-outbox.js'
import { DEFAULT_RUNTIME_CONFIGURATION } from '../src/runtime-config.js'

let handle: DatabaseHandle
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  await handle.close()
})
const at = '2026-10-03T12:00:00.000Z'
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
describe('trusted revocation maintenance cadence', () => {
  test('an empty bounded batch runs actual DB maintenance with the captured current configuration', async () => {
    const finished = deferred(),
      profileId = `empty_${randomUUID()}`
    const captured: { settings: RevocationPumpConfiguration; now: string }[] = []
    const current = { ...DEFAULT_RUNTIME_CONFIGURATION.revocation, batchLimit: 2 }
    const pump = createRevocationPump(handle.db, [new MockItalianProvider()], {
      profileId,
      now: () => at,
      configuration: async () => current,
      afterBatch: async (settings, now) => {
        captured.push({ settings, now })
        expect(
          await handle.db
            .select()
            .from(schema.revocationJobs)
            .where(eq(schema.revocationJobs.profileId, profileId)),
        ).toEqual([])
        finished.resolve()
      },
    })
    try {
      await finished.promise
      expect(captured).toEqual([{ settings: current, now: at }])
      expect(Object.isFrozen(captured[0]?.settings)).toBe(true)
    } finally {
      await pump.stop()
    }
  })
  test('operator-paused provider work still runs DB maintenance and stop drains its callback', async () => {
    const profileId = `paused_${randomUUID()}`,
      started = deferred(),
      release = deferred()
    const id = await enqueueRevocation(
      handle.db,
      {
        profileId,
        connectionId: `connection_${randomUUID()}`,
        consentId: `consent_${randomUUID()}`,
        providerId: 'mock-italian',
      },
      at,
    )
    class Provider extends MockItalianProvider {
      calls = 0
      override async disconnect() {
        this.calls++
      }
    }
    const provider = new Provider()
    const pump = createRevocationPump(handle.db, [provider], {
      profileId,
      now: () => at,
      enabled: false,
      afterBatch: async (settings) => {
        expect(settings.enabled).toBe(false)
        started.resolve()
        await release.promise
      },
    })
    try {
      await started.promise
      let stopped = false
      const stopping = pump.stop().then(() => {
        stopped = true
      })
      expect(stopped).toBe(false)
      expect(provider.calls).toBe(0)
      const [row] = await handle.db
        .select()
        .from(schema.revocationJobs)
        .where(eq(schema.revocationJobs.id, id))
      expect(row?.state).toBe('pending')
      expect(row?.attempts).toBe(0)
      release.resolve()
      await stopping
      expect(stopped).toBe(true)
      expect(pump.status().running).toBe(false)
    } finally {
      release.resolve()
      await pump.stop()
    }
  })
  test('maintenance failure reports only the existing bounded storage-failure signal', async () => {
    let failureSignals = 0
    const finished = deferred()
    const pump = createRevocationPump(handle.db, [], {
      enabled: false,
      now: () => at,
      afterBatch: async () => {
        throw new Error('PRIVATE error token account')
      },
      onStorageFailure: () => {
        failureSignals++
        finished.resolve()
      },
    })
    try {
      await finished.promise
      expect(failureSignals).toBe(1)
      expect(pump.status().storageFailures).toBe(1)
    } finally {
      await pump.stop()
    }
  })
})
