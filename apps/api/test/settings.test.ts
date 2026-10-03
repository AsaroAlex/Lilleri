import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import type { ProfileSettingsValues } from '@lilleri/domain'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { SettingsService } from '../src/settings.js'
import { profileSettings, profileSettingsEvents } from '../src/settings-schema.js'

let handle: DatabaseHandle
const profiles: string[] = [],
  apps: Awaited<ReturnType<typeof createApp>>[] = [],
  now = () => '2026-10-03T12:00:00.000Z',
  edited: ProfileSettingsValues = {
    displayName: 'Profilo sintetico di prova',
    locale: 'it-IT',
    timezone: 'UTC',
  }
async function fixture() {
  const profileId = `settings_${randomUUID()}`
  profiles.push(profileId)
  const app = await createApp({ db: handle.db, demoMode: true, profileId, seed: true, now }),
    service = new SettingsService(handle.db, profileId, now)
  apps.push(app)
  return { app, service, profileId }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const profileId of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  if (handle) await handle.close()
})
describe('persisted local synthetic profile settings', () => {
  test('defaults use actual profile values and expose a free beta without purchase flags', async () => {
    const { app, profileId } = await fixture(),
      response = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      settings: { profileId, locale: 'it-IT', timezone: 'Europe/Rome', revision: 1 },
      entitlements: {
        plan: 'closed_beta',
        purchaseAvailable: false,
        automaticCharge: false,
        capabilities: { 'ledger.correct': true, 'data.export': true, 'household.share': false },
      },
    })
    expect(
      await handle.db
        .select()
        .from(profileSettings)
        .where(eq(profileSettings.profileId, profileId)),
    ).toHaveLength(0)
  })
  test('writes actual profile name/zone, preserves financial facts and exports the scoped audit', async () => {
    const { app, profileId } = await fixture(),
      before = (await app.inject({ method: 'GET', url: '/v1/demo' })).json(),
      result = await app.inject({
        method: 'PATCH',
        url: '/v1/settings',
        payload: { ...edited, revision: 1 },
      })
    expect(result.statusCode).toBe(200)
    expect(result.json().settings).toMatchObject({ ...edited, profileId, revision: 2 })
    const after = (await app.inject({ method: 'GET', url: '/v1/demo' })).json()
    expect(after.profile).toMatchObject({ name: edited.displayName, timezone: edited.timezone })
    expect(after.transactions).toEqual(before.transactions)
    expect(after.accounts).toEqual(before.accounts)
    expect(after.analysis).toEqual(before.analysis)
    expect(
      new Set(after.analysis.summaries.map((item: { currency: string }) => item.currency)).size,
    ).toBeGreaterThan(1)
    const exported = await app.inject({ method: 'GET', url: '/v1/export' })
    expect(exported.statusCode).toBe(200)
    expect(exported.json().profileSettings).toMatchObject({
      settings: { ...edited, profileId, revision: 2 },
      events: [
        {
          profileId,
          revision: 2,
          before: { displayName: before.profile.name, locale: 'it-IT', timezone: 'Europe/Rome' },
          after: edited,
        },
      ],
    })
  })
  test('same-revision competing updates have one winner and one conflict with a single event', async () => {
    const { service, profileId } = await fixture(),
      results = await Promise.allSettled([
        service.update(1, edited),
        service.update(1, { ...edited, displayName: 'Seconda modifica sintetica' }),
      ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    if (rejected?.status !== 'rejected') throw new Error('Conflict result missing')
    expect(rejected.reason).toMatchObject({ status: 409, code: 'settings_changed' })
    const stored = await service.get(),
      events = await handle.db
        .select()
        .from(profileSettingsEvents)
        .where(eq(profileSettingsEvents.profileId, profileId))
    expect(stored.settings.revision).toBe(2)
    expect(events).toHaveLength(1)
    expect(events[0]?.after.displayName).toBe(stored.settings.displayName)
  })
  test('a stale HTTP update cannot overwrite data and unchanged values do not add events', async () => {
    const { app, service } = await fixture()
    await service.update(1, edited)
    const stale = await app.inject({
      method: 'PATCH',
      url: '/v1/settings',
      payload: { ...edited, displayName: 'Modifica ormai superata', revision: 1 },
    })
    expect(stale.statusCode).toBe(409)
    expect(stale.json().code).toBe('settings_changed')
    const noOp = await service.update(2, edited)
    expect(noOp.settings.revision).toBe(2)
    expect((await service.exportAudit()).events).toHaveLength(1)
  })
  test('client profile selectors cannot read or modify another profile', async () => {
    const own = await fixture(),
      other = await fixture()
    await other.service.update(1, { ...edited, displayName: 'Altro profilo sintetico' })
    const get = await own.app.inject({
      method: 'GET',
      url: `/v1/settings?profileId=${other.profileId}`,
      headers: { 'x-profile-id': other.profileId },
    })
    expect(get.statusCode).toBe(200)
    expect(get.json().settings.profileId).toBe(own.profileId)
    const patch = await own.app.inject({
      method: 'PATCH',
      url: '/v1/settings',
      payload: { ...edited, revision: 1, profileId: other.profileId },
    })
    expect(patch.statusCode).toBe(400)
    expect((await other.service.get()).settings.displayName).toBe('Altro profilo sintetico')
    expect((await own.service.get()).settings.revision).toBe(1)
  })
  test('invalid fields, unknown locale, missing/stale revisions and dormant mode flags do not write', async () => {
    const { app, service } = await fixture()
    for (const payload of [
      { ...edited },
      { ...edited, revision: 0 },
      { ...edited, revision: 1, locale: 'en-US' },
      { ...edited, revision: 1, timezone: 'Europe/Invented' },
      { ...edited, revision: 1, displayName: '  ' },
      { ...edited, revision: 1, displayName: 'Profilo\nocculto' },
      { ...edited, revision: 1, automationMode: 'silent' },
      { ...edited, revision: 1, paid: true },
    ]) {
      const result = await app.inject({ method: 'PATCH', url: '/v1/settings', payload })
      expect(result.statusCode).toBe(400)
    }
    expect((await service.get()).settings.revision).toBe(1)
    expect((await service.exportAudit()).events).toHaveLength(0)
  })
  test('audit events reject UPDATE; profile erasure cascades preferences and events', async () => {
    const { app, service, profileId } = await fixture()
    await service.update(1, edited)
    await expect(
      handle.db
        .update(profileSettingsEvents)
        .set({ createdAt: '2030-01-01T00:00:00Z' })
        .where(eq(profileSettingsEvents.profileId, profileId)),
    ).rejects.toThrow()
    const erased = await app.inject({ method: 'DELETE', url: '/v1/profile' })
    expect(erased.statusCode).toBe(204)
    expect(
      await handle.db
        .select()
        .from(profileSettings)
        .where(eq(profileSettings.profileId, profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(profileSettingsEvents)
        .where(eq(profileSettingsEvents.profileId, profileId)),
    ).toHaveLength(0)
    await expect(service.get()).rejects.toMatchObject({ status: 404 })
  })
  test('settings and audit persist through an on-disk database reopen', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-settings-')),
      profileId = `settings_disk_${randomUUID()}`,
      config = { driver: 'pglite' as const, path: join(directory, 'db') }
    let disk = await openDatabase(config)
    try {
      await disk.db.insert(schema.profiles).values({
        id: profileId,
        name: 'Profilo disco sintetico',
        timezone: 'Europe/Rome',
        createdAt: now(),
      })
      await new SettingsService(disk.db, profileId, now).update(1, edited)
      await disk.close()
      disk = await openDatabase(config)
      const persisted = await new SettingsService(disk.db, profileId, now).exportAudit()
      expect(persisted.settings).toMatchObject({ ...edited, revision: 2 })
      expect(persisted.events).toHaveLength(1)
      expect(persisted.events[0]?.after).toEqual(edited)
    } finally {
      await disk.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
