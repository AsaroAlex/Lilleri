import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { createObservability } from '../src/observability.js'

let handle: DatabaseHandle
const profiles: string[] = []
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  if (!handle) return
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
})
const account = {
  requestId: 'scoped_account_request_0001',
  name: 'Conto sintetico',
  kind: 'cash',
  currency: 'EUR',
  openingOn: '2026-10-01',
  openingBalanceMinor: '1000',
}

test('a late SQL failure rolls back a mutation and never sends its buffered success', async () => {
  const profileId = `scope_${randomUUID()}`
  profiles.push(profileId)
  let abort = true
  const observability = createObservability({ traceSampleRatio: 1 })
  const app = await createApp({
    db: handle.db,
    profileId,
    demoMode: true,
    seed: false,
    observability,
    now: () => '2026-10-03T12:00:00.000Z',
    financialScope: (profile, work, options) =>
      handle.withProfile(
        profile,
        async (db) => {
          const result = await work(db)
          if (abort) throw new Error('Synthetic commit failure with private details')
          return result
        },
        options,
      ),
  })
  try {
    const failed = await app.inject({
      method: 'POST',
      url: '/v1/manual/accounts',
      payload: account,
    })
    expect(failed.statusCode).toBe(500)
    expect(failed.payload).not.toContain(account.name)
    expect(failed.payload).not.toContain('private details')
    expect(
      await handle.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, profileId)),
    ).toHaveLength(0)
    abort = false
    const retry = await app.inject({ method: 'POST', url: '/v1/manual/accounts', payload: account })
    expect(retry.statusCode, retry.payload).toBe(201)
    expect(retry.json().balanceMinor).toBe('1000')
    const metrics = observability.snapshot().metrics
    expect(metrics.some((row) => row.labels.status_class === '5xx')).toBe(true)
    expect(metrics.some((row) => row.labels.status_class === '2xx')).toBe(true)
  } finally {
    await app.close()
    await observability.shutdown()
  }
})

test('a successful reply waits for commit and uses the scoped database for all manual writes', async () => {
  const profileId = `scope_${randomUUID()}`
  profiles.push(profileId)
  let signalPrepared: () => void = () => {}
  let releaseCommit: () => void = () => {}
  const prepared = new Promise<void>((resolve) => {
    signalPrepared = resolve
  })
  const release = new Promise<void>((resolve) => {
    releaseCommit = resolve
  })
  const app = await createApp({
    db: handle.db,
    profileId,
    demoMode: true,
    seed: false,
    now: () => '2026-10-03T12:00:00.000Z',
    financialScope: (profile, work, options) =>
      handle.withProfile(
        profile,
        async (db) => {
          const result = await work(db)
          const role = (await db.execute(sql`SELECT current_user`)) as {
            rows: { current_user: string }[]
          }
          expect(role.rows[0]?.current_user).toBe('lilleri_runtime')
          signalPrepared()
          await release
          return result
        },
        options,
      ),
  })
  try {
    let responseSent = false
    const response = app
      .inject({ method: 'POST', url: '/v1/manual/accounts', payload: account })
      .then((value) => {
        responseSent = true
        return value
      })
    await prepared
    await Promise.resolve()
    expect(responseSent).toBe(false)
    releaseCommit()
    const accepted = await response
    expect(accepted.statusCode, accepted.payload).toBe(201)
    expect(accepted.json().name).toBe(account.name)
  } finally {
    releaseCommit()
    await app.close()
  }
})
