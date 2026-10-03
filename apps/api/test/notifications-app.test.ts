import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { unzipSync } from 'fflate'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationsService } from '../src/notifications.js'
import { notificationEvents } from '../src/notifications-schema.js'
import { PRIVACY_DISCLOSURES } from '../src/privacy.js'
import { DEFAULT_NOTIFICATION_CONFIGURATION } from '../src/runtime-config.js'

let handle: DatabaseHandle
const profileId = `notification_http_${randomUUID()}`
let app: Awaited<ReturnType<typeof createApp>>
const now = () => '2026-10-03T22:00:00.000Z'
let optionalEnabled = false
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  app = await createApp({
    db: handle.db,
    profileId,
    demoMode: true,
    seed: true,
    now,
    notificationConfiguration: async () => ({
      ...DEFAULT_NOTIFICATION_CONFIGURATION,
      enabled: optionalEnabled,
    }),
  })
})
afterAll(async () => {
  await app?.close()
  if (!handle) return
  await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle.close()
})
const feed = async () => {
  const response = await app.inject({ url: '/v1/notifications' })
  expect(response.statusCode, response.payload).toBe(200)
  return response.json<{
    items: { id: string; type: string; title: string; seenAt: null; revision: number }[]
    nativePushAvailable: false
  }>()
}

test('only an explicit successful archive command publishes the essential notice and a fixed occurrence deduplicates', async () => {
  const service = new NotificationsService(handle.db, profileId, now)
  await service.updatePreferences(1, {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    types: {
      inbox: false,
      consent_reminder: false,
      balance_mismatch: false,
      connection_expired: false,
      connection_paused: false,
      summary_ready: false,
    },
  })
  const permissions = await app.inject({ url: '/v1/privacy/permissions' })
  expect(
    permissions.json().permissions.find((row: { purpose: string }) => row.purpose === 'N-SERVICE')
      .localPreferenceEnabled,
  ).toBe(false)
  const before = await feed()
  expect(before).toEqual({ items: [], nativePushAvailable: false })
  const beforeEvents = await handle.db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.profileId, profileId))
  for (const url of ['/v1/export', '/v1/export/archive']) {
    const response = await app.inject({ url })
    expect(response.statusCode, response.payload).toBe(200)
    expect(await feed()).toEqual(before)
  }
  expect(
    await handle.db
      .select()
      .from(notificationEvents)
      .where(eq(notificationEvents.profileId, profileId)),
  ).toEqual(beforeEvents)
  const invalid = await app.inject({
    method: 'POST',
    url: '/v1/export/archive',
    payload: { merchant: 'PRIVATE' },
  })
  expect(invalid.statusCode).toBe(400)
  expect(await feed()).toEqual(before)
  const created = await app.inject({ method: 'POST', url: '/v1/export/archive', payload: {} })
  expect(created.statusCode, created.payload).toBe(200)
  expect(created.headers['content-type']).toBe('application/zip')
  expect([...created.rawPayload.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
  expect(Object.keys(unzipSync(created.rawPayload))).toHaveLength(11)
  const after = await feed()
  expect(after.items).toHaveLength(1)
  const notice = after.items[0]
  expect(notice).toMatchObject({
    type: 'export_ready',
    title: 'La tua esportazione è pronta',
    seenAt: null,
    revision: 2,
  })
  expect(Object.keys(notice ?? {}).sort()).toEqual([
    'deliveredAt',
    'id',
    'revision',
    'seenAt',
    'textVersion',
    'title',
    'type',
  ])
  const repeated = await app.inject({ method: 'POST', url: '/v1/export/archive', payload: {} })
  expect(repeated.statusCode, repeated.payload).toBe(200)
  expect(await feed()).toEqual(after)
  const read = await app.inject({
    method: 'PATCH',
    url: `/v1/notifications/${notice?.id}/seen`,
    payload: { revision: notice?.revision },
  })
  expect(read.statusCode, read.payload).toBe(200)
  expect(read.json().seenAt).toBe(now())
  const stale = await app.inject({
    method: 'PATCH',
    url: `/v1/notifications/${notice?.id}/seen`,
    payload: { revision: notice?.revision },
  })
  expect(stale.statusCode).toBe(409)
  expect(stale.json().code).toBe('notification_changed')
})

test('the actual sync producer requires granted N-SERVICE and deduplicates review notices per local day', async () => {
  optionalEnabled = true
  const overview = await app.inject({ url: '/v1/demo' })
  expect(overview.statusCode).toBe(200)
  const data = overview.json()
  expect(data.analysis.reviewItems.length).toBeGreaterThan(0)
  const connectionId = data.connections[0].id
  const prefs = await new NotificationsService(handle.db, profileId, now).preferences()
  const preferences = await app.inject({
    method: 'PATCH',
    url: '/v1/notifications/preferences',
    payload: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      quietHours: { ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours, enabled: false },
      revision: prefs.revision,
    },
  })
  expect(preferences.statusCode, preferences.payload).toBe(200)
  const sync = async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/v1/connections/${connectionId}/sync`,
      payload: {},
    })
    expect(response.statusCode, response.payload).toBe(200)
  }
  await sync()
  expect((await feed()).items.filter((row) => row.type === 'inbox')).toEqual([])
  const permissions = (await app.inject({ url: '/v1/privacy/permissions' })).json().permissions
  const permission = permissions.find((row: { purpose: string }) => row.purpose === 'N-SERVICE')
  const copy = PRIVACY_DISCLOSURES['N-SERVICE']
  const granted = await app.inject({
    method: 'PATCH',
    url: '/v1/privacy/permissions/N-SERVICE',
    payload: {
      action: 'granted',
      revision: permission.revision,
      textVersion: copy.textVersion,
      textHash: copy.textHash,
      noticeVersion: copy.noticeVersion,
      vendorListVersion: copy.vendorListVersion,
    },
  })
  expect(granted.statusCode, granted.payload).toBe(200)
  await sync()
  const delivered = (await feed()).items.filter((row) => row.type === 'inbox')
  expect(delivered).toHaveLength(1)
  expect(delivered[0]?.title).toBe('Hai movimenti da rivedere')
  await sync()
  expect((await feed()).items.filter((row) => row.type === 'inbox')).toEqual(delivered)
  const revoked = await app.inject({
    method: 'PATCH',
    url: '/v1/privacy/permissions/N-SERVICE',
    payload: { action: 'revoked', revision: granted.json().revision },
  })
  expect(revoked.statusCode, revoked.payload).toBe(200)
  await sync()
  expect((await feed()).items.filter((row) => row.type === 'inbox')).toEqual(delivered)
})
