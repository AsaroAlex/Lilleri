import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  DEFAULT_RUNTIME_CONFIGURATION,
  DEFAULT_SYNC_CONFIGURATION,
  RuntimeConfigurationStore,
} from '../src/runtime-config.js'
import { syncJobs } from '../src/sync-schema.js'

let handle: DatabaseHandle
let app: Awaited<ReturnType<typeof createApp>>
let financialPhases = 0
let providerCalls = 0
const profileId = `sync_http_${randomUUID()}`
const base = '2026-10-03T12:00:00.000Z'
class ScopedProvider extends MockItalianProvider {
  override async openSync(...args: Parameters<MockItalianProvider['openSync']>) {
    expect(financialPhases).toBe(0)
    providerCalls++
    return super.openSync(...args)
  }
  override async getSyncPage(...args: Parameters<MockItalianProvider['getSyncPage']>) {
    expect(financialPhases).toBe(0)
    providerCalls++
    return super.getSyncPage(...args)
  }
}
describe('durable HTTP sync uses committed server-derived financial phases', () => {
  beforeAll(async () => {
    handle = await openDatabase(
      process.env.TEST_DATABASE_URL
        ? { driver: 'postgres', url: process.env.TEST_DATABASE_URL }
        : { driver: 'pglite' },
    )
    const configurations = new RuntimeConfigurationStore(handle.db)
    const snapshot = await configurations.ensure(DEFAULT_RUNTIME_CONFIGURATION)
    const captured = await configurations.update(
      snapshot.revision,
      { ...snapshot.values, sync: { ...DEFAULT_SYNC_CONFIGURATION, maxPagesPerSlice: 1 } },
      { actor: 'local_operator', reason: 'tuning' },
    )
    const scope: DatabaseHandle['withProfile'] = (id, work, options) =>
      handle.withProfile(
        id,
        async (db) => {
          expect(id).toBe(profileId)
          financialPhases++
          try {
            return await work(db)
          } finally {
            financialPhases--
          }
        },
        options,
      )
    app = await createApp({
      db: handle.db,
      financialScope: scope,
      profileId,
      provider: new ScopedProvider(),
      demoMode: true,
      seed: false,
      now: () => base,
      syncConfiguration: async () => captured,
    })
  })
  afterAll(async () => {
    await app?.close()
    if (handle) {
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
      await handle.close()
    }
  })
  let connectionId: string
  let jobId: string
  test('connection bootstrap completes bounded sync with no provider fetch inside SQL scope', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/connections/mock', payload: {} })
    const progress = await handle.db
      .select({ state: syncJobs.state, reason: syncJobs.reason, pages: syncJobs.report })
      .from(syncJobs)
      .where(eq(syncJobs.profileId, profileId))
    expect(response.statusCode, `${response.body} ${JSON.stringify(progress)}`).toBe(200)
    connectionId = response.json().id
    expect(response.json().lastSyncedAt).not.toBeNull()
    expect(providerCalls).toBeGreaterThan(1)
    expect(financialPhases).toBe(0)
  })
  test('strict HTTP start refuses caller-selected profile and unattended mode', async () => {
    for (const extra of [{ profileId: 'foreign' }, { mode: 'unattended' }]) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/sync/start',
        payload: { connectionId, requestId: randomUUID(), mode: 'user_present', ...extra },
      })
      expect(response.statusCode).toBe(400)
    }
  })
  test('partial progress persists while financial ledger and freshness stay unchanged', async () => {
    const before = (await app.inject('/v1/demo')).json()
    const started = await app.inject({
      method: 'POST',
      url: '/v1/sync/start',
      payload: { connectionId, requestId: randomUUID(), mode: 'user_present', from: '2026-07-01' },
    })
    expect(started.statusCode, started.body).toBe(200)
    jobId = started.json().id
    const partial = await app.inject({
      method: 'POST',
      url: `/v1/sync/${jobId}/resume`,
      payload: {},
    })
    expect(partial.statusCode, partial.body).toBe(200)
    expect(partial.json().state).toBe('partial')
    expect(partial.json().report.pages).toBe(1)
    const after = (await app.inject('/v1/demo')).json()
    expect(after.accounts).toEqual(before.accounts)
    expect(after.transactions).toEqual(before.transactions)
    expect(after.connections).toEqual(before.connections)
    expect((await app.inject(`/v1/sync/${jobId}`)).json()).toEqual(partial.json())
  })
  test('foreign resources remain unavailable through coordinator-managed routes', async () => {
    expect((await app.inject('/v1/sync/sync_job_foreign')).statusCode).toBe(404)
    expect(
      (await app.inject({ method: 'POST', url: '/v1/sync/sync_job_foreign/resume', payload: {} }))
        .statusCode,
    ).toBe(404)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/sync/start',
          payload: { connectionId: 'foreign', requestId: randomUUID(), mode: 'user_present' },
        })
      ).statusCode,
    ).toBe(404)
  })
  test('completion and ownership ZIP retain reconciled reports without checkpoint contents', async () => {
    let job = (await app.inject(`/v1/sync/${jobId}`)).json()
    for (let slice = 0; slice < 100 && job.state === 'partial'; slice++) {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/sync/${jobId}/resume`,
        payload: {},
      })
      expect(response.statusCode, response.body).toBe(200)
      job = response.json()
    }
    expect(job.state).toBe('completed')
    expect(job.report.processedRecords).toBe(job.report.payloadRecords)
    expect(job.report.windowsCompleted).toBe(job.report.windowsTotal)
    expect(job).not.toHaveProperty('leaseToken')
    expect(job).not.toHaveProperty('configuration')
    const exported = await app.inject('/v1/export')
    expect(exported.statusCode, exported.body).toBe(200)
    expect(exported.json().sync.jobs.find((row: { id: string }) => row.id === jobId)).toEqual(job)
    expect(exported.json()).not.toHaveProperty('merchantContext')
    const archive = await app.inject('/v1/export/archive')
    expect(archive.statusCode, archive.body.slice(0, 300)).toBe(200)
    const files = unzipSync(archive.rawPayload)
    const dataFile = files['data.json']
    const eventsFile = files['events.jsonl']
    if (!dataFile || !eventsFile) throw new Error('Required ownership archive files are missing')
    const snapshot = JSON.parse(strFromU8(dataFile))
    expect(snapshot.sync.jobs.some((row: { id: string }) => row.id === jobId)).toBe(true)
    expect(strFromU8(eventsFile)).toContain('sync_budget_reservation')
    expect(Object.keys(files)).toHaveLength(11)
  })
})
