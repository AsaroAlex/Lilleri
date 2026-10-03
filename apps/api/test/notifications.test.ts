import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider, type ProviderAuthorization } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  ConsentLifecycleService,
  recordConsentGranted,
  recordConsentRevoked,
} from '../src/consent-lifecycle.js'
import { consentLifecycles } from '../src/consent-lifecycle-schema.js'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationQuietTime,
  NotificationsService,
  notificationFeedDto,
  notificationLocalDay,
} from '../src/notifications.js'
import { runNotificationBatch } from '../src/notifications-maintenance.js'
import { notificationEvents, notifications } from '../src/notifications-schema.js'
import { PRIVACY_DISCLOSURES, PrivacyService } from '../src/privacy.js'
import { DEFAULT_NOTIFICATION_CONFIGURATION } from '../src/runtime-config.js'

let handle: DatabaseHandle
const profiles: string[] = []
const settings = { ...DEFAULT_NOTIFICATION_CONFIGURATION, expiryOffsetsSeconds: [86400, 3600] }
const base = '2026-10-03T12:00:00.000Z'
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
async function fixture(options: { legacy?: boolean; unknown?: boolean; timezone?: string } = {}) {
  const profileId = `notify_${randomUUID()}`,
    connectionId = `conn_${randomUUID()}`,
    consentId = `consent_${randomUUID()}`,
    provider = new MockItalianProvider()
  profiles.push(profileId)
  let clock = base
  const now = () => clock
  const authorization: ProviderAuthorization = {
    providerId: provider.id,
    institutionId: 'synthetic-italian',
    state: 'active',
    consentExpiresAt: '2026-10-05T14:00:00+02:00',
    scaDueAt: options.unknown ? null : '2026-10-04T12:00:00Z',
    providerSessionExpiresAt: '2026-10-06T12:00:00Z',
    tokenExpiresAt: null,
    requiredActions: [
      {
        action: 'renew_consent',
        method: 'in_place',
        dueAt: '2026-10-05T14:00:00+02:00',
        evidenceReference: 'synthetic-consent',
      },
      {
        action: 'perform_sca',
        method: 'redirect',
        dueAt: options.unknown ? null : '2026-10-04T12:00:00Z',
        evidenceReference: 'synthetic-sca',
      },
      {
        action: 'renew_session',
        method: 'in_place',
        dueAt: '2026-10-06T12:00:00Z',
        evidenceReference: 'synthetic-session',
      },
    ],
  }
  await handle.db.insert(schema.profiles).values({
    id: profileId,
    name: 'PRIVATE-NAME',
    timezone: options.timezone ?? 'Europe/Rome',
    createdAt: base,
  })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: provider.id,
    institutionId: 'synthetic-italian',
    status: 'active',
    createdAt: base,
    lastSyncedAt: base,
  })
  await handle.db.insert(schema.consents).values({
    id: consentId,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: base,
    expiresAt: authorization.consentExpiresAt as string,
    revokedAt: null,
    provider: provider.id,
  })
  if (!options.legacy)
    await handle.db.transaction((db) =>
      recordConsentGranted(
        db,
        profileId,
        connectionId,
        consentId,
        { discovery: provider.discoveryMetadata(), authorization },
        now(),
      ),
    )
  const user = <T>(work: (service: NotificationsService) => Promise<T>) =>
    handle.withProfile(profileId, (db) =>
      work(new NotificationsService(db, profileId, now, settings)),
    )
  const permission = async (action: 'granted' | 'revoked') =>
    handle.withProfile(profileId, async (db) => {
      const privacy = new PrivacyService(db, profileId, now),
        views = await privacy.permissions(),
        view = views.find((candidate) => candidate.purpose === 'N-SERVICE')
      if (!view) throw new Error('Missing disclosure')
      const copy = PRIVACY_DISCLOSURES['N-SERVICE']
      return privacy.setPermission(
        'N-SERVICE',
        view.revision,
        action === 'revoked'
          ? { action }
          : {
              action,
              textVersion: copy.textVersion,
              textHash: copy.textHash,
              noticeVersion: copy.noticeVersion,
              vendorListVersion: copy.vendorListVersion,
            },
      )
    })
  return {
    profileId,
    connectionId,
    consentId,
    provider,
    authorization,
    now,
    user,
    permission,
    setNow: (text: string) => {
      clock = text
    },
    advance: (seconds: number) => {
      clock = new Date(Date.parse(clock) + seconds * 1000).toISOString()
    },
  }
}
describe('content-free local notification feed', () => {
  test('optional delivery is off before N-SERVICE grant and native push remains unavailable', async () => {
    const f = await fixture()
    expect(await f.user((s) => s.publish('inbox', 'first'))).toBeNull()
    expect((await f.user((s) => s.getFeed())).items).toEqual([])
    expect(await f.user((s) => s.preferences())).toMatchObject({
      nativePushAvailable: false,
      osPermission: 'unknown',
      timezone: 'Europe/Rome',
    })
    await f.permission('granted')
    await f.user((s) => s.publish('inbox', 'first'))
    expect((await f.user((s) => s.getFeed())).items).toHaveLength(1)
  })
  test('mandatory security, export, deletion and rights notices ignore opt-out, quiet hours and disabled optional service', async () => {
    const f = await fixture()
    f.setNow('2026-10-03T21:00:00.000Z')
    const svc = new NotificationsService(handle.db, f.profileId, f.now, {
      ...settings,
      enabled: false,
    })
    for (const kind of [
      'security_notice',
      'export_ready',
      'deletion_status',
      'rights_action',
    ] as const)
      await svc.publish(kind, `event-${kind}`)
    expect((await svc.getFeed()).items).toHaveLength(4)
    expect(await svc.publish('summary_ready', 'optional')).toBeNull()
  })
  test('payload contains static generic titles and opaque routing ids, never financial/identity metadata', async () => {
    const f = await fixture()
    await f.permission('granted')
    const id = await f.user((s) =>
      s.publish('balance_mismatch', 'PRIVATE-DESCRIPTION-AMOUNT-123456', f.connectionId),
    )
    const feed = await f.user((s) => s.getFeed())
    expect(feed.items).toHaveLength(1)
    expect(notificationFeedDto.safeParse(feed.items[0]).success).toBe(true)
    const serialized = JSON.stringify(feed)
    expect(serialized).not.toMatch(
      /PRIVATE|123456|profileId|connectionId|consentId|amount|merchant|description|email|institution|bank|account/,
    )
    expect(serialized).not.toContain(f.profileId)
    expect(serialized).not.toContain(f.connectionId)
    expect(id).toBe(feed.items[0]?.id)
    expect(await f.user((s) => s.destination(id as string))).toEqual({
      screen: 'connections',
      action: 'open',
      connectionId: f.connectionId,
    })
  })
  test('known consent, SCA and provider session dates stay distinct; offsets normalize UTC instead of lexicographic offsets', async () => {
    const f = await fixture()
    await f.permission('granted')
    expect((await f.user((s) => s.scheduleAndDeliver())).queued).toBe(6)
    const rows = (await f.user((s) => s.export())).notifications
    expect(new Set(rows.map((row) => row.sourceAction))).toEqual(
      new Set(['renew_consent', 'perform_sca', 'renew_session']),
    )
    expect(
      rows.find((row) => row.sourceAction === 'renew_consent' && row.offsetSeconds === 86400)
        ?.dueAt,
    ).toBe('2026-10-04T12:00:00.000Z')
    expect(
      rows.find((row) => row.sourceAction === 'perform_sca' && row.offsetSeconds === 86400)?.dueAt,
    ).toBe(base)
    expect((await f.user((s) => s.scheduleAndDeliver())).queued).toBe(0)
    expect((await f.user((s) => s.export())).notifications).toHaveLength(6)
  })
  test('unknown declared due dates and legacy unknown renewal methods generate no invented reminder', async () => {
    const f = await fixture({ unknown: true })
    await f.permission('granted')
    await f.user((s) => s.scheduleAndDeliver())
    expect(
      (await f.user((s) => s.export())).notifications.some(
        (row) => row.sourceAction === 'perform_sca',
      ),
    ).toBe(false)
    const legacy = await fixture({ legacy: true })
    await legacy.permission('granted')
    expect((await legacy.user((s) => s.scheduleAndDeliver())).queued).toBe(0)
  })
  test('a fulfilled action disappearing cancels queued reminders without deleting delivered history', async () => {
    const f = await fixture()
    await f.permission('granted')
    await f.user((s) => s.scheduleAndDeliver())
    const before = (await f.user((s) => s.export())).notifications,
      delivered = before.filter((row) => row.status === 'delivered')
    await handle.db
      .update(consentLifecycles)
      .set({
        authorization: {
          ...f.authorization,
          scaDueAt: null,
          requiredActions: f.authorization.requiredActions.filter(
            (action) => action.action !== 'perform_sca',
          ),
        },
      })
      .where(eq(consentLifecycles.connectionId, f.connectionId))
    await f.user((s) => s.scheduleAndDeliver())
    const after = (await f.user((s) => s.export())).notifications
    expect(
      after.filter((row) => row.sourceAction === 'perform_sca' && row.status === 'queued'),
    ).toHaveLength(0)
    for (const row of delivered)
      expect(after.find((candidate) => candidate.id === row.id)?.status).toBe('delivered')
  })
  test('renewal using the same consent id cancels old generation queues and creates separately deduplicated new reminders', async () => {
    const f = await fixture()
    await f.permission('granted')
    await f.user((s) => s.scheduleAndDeliver())
    const old = (await f.user((s) => s.export())).notifications
    await handle.db.transaction((db) =>
      recordConsentGranted(
        db,
        f.profileId,
        f.connectionId,
        f.consentId,
        { discovery: f.provider.discoveryMetadata(), authorization: f.authorization },
        f.now(),
        'renewed',
      ),
    )
    await f.user((s) => s.scheduleAndDeliver())
    const after = (await f.user((s) => s.export())).notifications
    expect(after).toHaveLength(12)
    for (const row of old)
      expect(after.find((candidate) => candidate.id === row.id)?.status).toBe(
        row.status === 'delivered' ? 'delivered' : 'cancelled',
      )
    expect(new Set(after.map((row) => row.sourceGeneration)).size).toBe(2)
  })
  test('revocation cancels queued reminders and leaves previously delivered messages as history', async () => {
    const f = await fixture()
    await f.permission('granted')
    await f.user((s) => s.scheduleAndDeliver())
    const delivered = (await f.user((s) => s.getFeed())).items.length
    await handle.db.transaction((db) =>
      recordConsentRevoked(db, f.profileId, f.connectionId, f.now()),
    )
    await f.user((s) => s.scheduleAndDeliver())
    const rows = (await f.user((s) => s.export())).notifications
    expect(rows.filter((row) => row.status === 'queued')).toHaveLength(0)
    expect((await f.user((s) => s.getFeed())).items).toHaveLength(delivered)
  })
  test('quiet hours use the profile timezone through midnight, DST jump and repeated autumn hour', () => {
    const quiet = DEFAULT_NOTIFICATION_PREFERENCES.quietHours
    expect(isNotificationQuietTime('2026-10-03T21:00:00.000Z', 'Europe/Rome', quiet)).toBe(true)
    expect(isNotificationQuietTime('2026-10-04T06:00:00.000Z', 'Europe/Rome', quiet)).toBe(false)
    for (const at of [
      '2026-03-29T00:30:00.000Z',
      '2026-03-29T01:30:00.000Z',
      '2026-10-25T00:30:00.000Z',
      '2026-10-25T01:30:00.000Z',
    ])
      expect(isNotificationQuietTime(at, 'Europe/Rome', quiet)).toBe(true)
    expect(notificationLocalDay('2026-10-03T23:30:00.000Z', 'Europe/Rome')).toBe('2026-10-04')
    expect(() => isNotificationQuietTime(base, 'Private/fake', quiet)).toThrow('timezone')
  })
  test('quiet deferral crossing midnight still delivers at most one inbox message per local day', async () => {
    const f = await fixture()
    await f.permission('granted')
    f.setNow('2026-10-03T21:00:00.000Z')
    await f.user((s) => s.publish('inbox', 'day-before'))
    expect((await f.user((s) => s.getFeed())).items).toHaveLength(0)
    f.setNow('2026-10-04T06:00:00.000Z')
    await f.user((s) => s.scheduleAndDeliver())
    await f.user((s) => s.publish('inbox', 'day-after'))
    expect(
      (await f.user((s) => s.getFeed())).items.filter((row) => row.type === 'inbox'),
    ).toHaveLength(1)
    expect(
      (await f.user((s) => s.export())).notifications.filter(
        (row) => row.kind === 'inbox' && row.status === 'suppressed',
      ),
    ).toHaveLength(1)
  })
  test('permission withdrawal and regrant cannot revive an old queued permission epoch', async () => {
    const f = await fixture()
    await f.permission('granted')
    await f.user((s) => s.scheduleAndDeliver())
    await f.permission('revoked')
    await f.permission('granted')
    f.advance(3600)
    await f.user((s) => s.scheduleAndDeliver())
    const rows = (await f.user((s) => s.export())).notifications
    expect(rows.filter((row) => row.status === 'suppressed')).toHaveLength(5)
    expect(rows.filter((row) => row.status === 'delivered')).toHaveLength(1)
  })
  test('preference mutations are strict, audited, optimistic and cannot add a critical opt-out', async () => {
    const f = await fixture()
    await f.permission('granted')
    await expect(
      f.user((s) => s.updatePreferences(2, DEFAULT_NOTIFICATION_PREFERENCES)),
    ).rejects.toMatchObject({ code: 'notification_changed' })
    await expect(
      f.user((s) =>
        s.updatePreferences(1, {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          types: { ...DEFAULT_NOTIFICATION_PREFERENCES.types, security_notice: false },
        } as never),
      ),
    ).rejects.toMatchObject({ code: 'notification_preferences_invalid' })
    await f.user((s) =>
      s.updatePreferences(1, {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        types: { ...DEFAULT_NOTIFICATION_PREFERENCES.types, inbox: false },
      }),
    )
    expect(await f.user((s) => s.publish('inbox', 'off'))).toBeNull()
    expect(
      (await f.user((s) => s.export())).events.filter((e) => e.action === 'preferences_changed'),
    ).toHaveLength(1)
  })
  test('seen mutation is revision guarded, history immutable and cross-profile routing cannot be read', async () => {
    const a = await fixture(),
      b = await fixture()
    await a.user((s) => s.publish('security_notice', 'security'))
    const item = (await a.user((s) => s.getFeed())).items[0]
    if (!item) throw new Error('Notice absent')
    await expect(b.user((s) => s.destination(item.id))).rejects.toMatchObject({ code: 'not_found' })
    await expect(b.user((s) => s.markSeen(item.id, item.revision))).rejects.toMatchObject({
      code: 'not_found',
    })
    await a.user((s) => s.markSeen(item.id, item.revision))
    await expect(a.user((s) => s.markSeen(item.id, item.revision))).rejects.toMatchObject({
      code: 'notification_changed',
    })
    await expect(
      handle.db
        .update(notificationEvents)
        .set({ action: 'seen' })
        .where(eq(notificationEvents.profileId, a.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('immutable') } })
    expect(await handle.withProfile(b.profileId, (db) => db.select().from(notifications))).toEqual(
      [],
    )
  })
  test('scheduler visits bounded profiles fairly and invalid config cannot select unbounded data', async () => {
    const first = await runNotificationBatch(handle.db, { ...settings, profileLimit: 1 }, base),
      second = await runNotificationBatch(
        handle.db,
        { ...settings, profileLimit: 1 },
        base,
        first.cursor,
      )
    expect(first.profilesVisited).toBe(1)
    expect(second.profilesVisited).toBe(1)
    expect(first.cursor).not.toBe(second.cursor)
    await expect(
      runNotificationBatch(handle.db, { ...settings, profileLimit: 100000 }, base),
    ).rejects.toThrow('configuration')
  })
  test('known paused/expired state notices are local once per generation and cancelled when state changes before delivery', async () => {
    const f = await fixture()
    await f.permission('granted')
    f.setNow('2026-10-03T21:00:00.000Z')
    const consent = new ConsentLifecycleService(handle.db, f.profileId, f.provider, f.now),
      initial = await consent.get(f.connectionId)
    await consent.pause(f.connectionId, initial.revision)
    await f.user((s) => s.scheduleAndDeliver())
    expect(
      (await f.user((s) => s.export())).notifications.some(
        (row) => row.kind === 'connection_paused' && row.status === 'queued',
      ),
    ).toBe(true)
    await consent.resume(f.connectionId, (await consent.get(f.connectionId)).revision)
    await f.user((s) => s.scheduleAndDeliver())
    expect(
      (await f.user((s) => s.export())).notifications.some(
        (row) => row.kind === 'connection_paused' && row.status === 'cancelled',
      ),
    ).toBe(true)
  })
  test('profile erasure cascades preferences, queued/delivered feed and immutable journal', async () => {
    const f = await fixture()
    await f.permission('granted')
    await f.user((s) => s.publish('security_notice', 'erase'))
    await f.user((s) => s.scheduleAndDeliver())
    await f.user((s) => s.updatePreferences(1, DEFAULT_NOTIFICATION_PREFERENCES))
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, f.profileId))
    expect(
      await handle.db.select().from(notifications).where(eq(notifications.profileId, f.profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(notificationEvents)
        .where(eq(notificationEvents.profileId, f.profileId)),
    ).toEqual([])
  })
})
