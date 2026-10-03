import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase } from '@lilleri/database'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { createApp } from '../src/app.js'

let handle: DatabaseHandle
let app: Awaited<ReturnType<typeof createApp>>

beforeAll(async () => {
  handle = await openDatabase({ driver: 'pglite' })
  app = await createApp({
    db: handle.db,
    profileId: `bootstrap_origin_${randomUUID()}`,
    demoMode: true,
    seed: false,
  })
}, 30_000)

afterAll(async () => {
  await app?.close()
  await handle?.close()
})

test('separate bootstrap browser origins can read the financial overview and preflight', async () => {
  for (const origin of ['http://localhost:8181', 'http://127.0.0.1:8181']) {
    const overview = await app.inject({ url: '/v1/demo', headers: { origin } })
    expect(overview.statusCode, overview.body).toBe(200)
    expect(overview.headers['access-control-allow-origin']).toBe(origin)
    expect(overview.json().accounts).toEqual([])
    const preflight = await app.inject({ method: 'OPTIONS', url: '/v1/demo', headers: { origin } })
    expect(preflight.statusCode, preflight.body).toBe(204)
    expect(preflight.headers['access-control-allow-origin']).toBe(origin)
  }
})

test('bootstrap access does not authorize public or unlisted local origins', async () => {
  for (const origin of ['https://example.com', 'http://localhost:8189']) {
    const response = await app.inject({ url: '/v1/demo', headers: { origin } })
    expect(response.statusCode, response.body).toBe(403)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  }
})
