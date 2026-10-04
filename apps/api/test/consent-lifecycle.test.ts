import { randomUUID } from 'node:crypto'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  assertLifecycleAllowsRefresh,
  ConsentLifecycleService,
  readConsentLifecycle,
  recordConsentGranted,
  recordConsentProviderSignal,
  recordConsentRevoked,
  registerConsentLifecycleRoutes,
} from '../src/consent-lifecycle.js'
import { consentEvents, consentLifecycles } from '../src/consent-lifecycle-schema.js'
import { Problem } from '../src/problem.js'
import { enqueueRevocation } from '../src/revocation-outbox.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from '../src/runtime-config.js'

let handle: DatabaseHandle
const profiles: string[] = []
const baseNow = '2026-10-03T12:00:00.000Z'

async function fixture(legacy = false) {
  const profileId = `lifecycle_profile_${randomUUID()}`
  const connectionId = `lifecycle_connection_${randomUUID()}`
  const consentId = `lifecycle_consent_${randomUUID()}`
  const provider = new MockItalianProvider()
  let clock = baseNow
  const now = () => clock
  profiles.push(profileId)
  const grant = await provider.createConnection({ profileId, connectionId, grantId: consentId })
  await handle.db.insert(schema.profiles).values({
    id: profileId,
    name: 'Synthetic lifecycle',
    timezone: 'Europe/Rome',
    createdAt: baseNow,
  })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: provider.id,
    institutionId: 'synthetic-italian',
    status: 'active',
    createdAt: baseNow,
    lastSyncedAt: baseNow,
  })
  await handle.db.insert(schema.consents).values({
    id: consentId,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: baseNow,
    expiresAt: grant.consentExpiresAt,
    revokedAt: null,
    provider: provider.id,
  })
  if (!legacy)
    await handle.db.transaction((db) =>
      recordConsentGranted(
        db,
        profileId,
        connectionId,
        consentId,
        { discovery: provider.discoveryMetadata(), authorization: grant.authorization },
        now(),
      ),
    )
  const service = new ConsentLifecycleService(handle.db, profileId, provider, now)
  return {
    profileId,
    connectionId,
    consentId,
    provider,
    grant,
    service,
    now,
    setNow: (value: string) => {
      clock = value
    },
  }
}

beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const profileId of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle?.close()
})

describe('scoped append-only consent lifecycle', () => {
  test('actual lifecycle routes distinguish unknown recovery from an exact uncovered interval and verified catch-up', async () => {
    const f = await fixture(true)
    const expiredAt = '2026-10-02T12:00:00.000Z'
    await handle.db
      .update(schema.consents)
      .set({ expiresAt: expiredAt })
      .where(eq(schema.consents.id, f.consentId))
    const configuration = await new RuntimeConfigurationStore(handle.db).ensure(
      DEFAULT_RUNTIME_CONFIGURATION,
    )
    const app = await createApp({
      db: handle.db,
      financialScope: handle.withProfile,
      syncConfiguration: async () => configuration,
      demoMode: true,
      seed: false,
      profileId: f.profileId,
      provider: f.provider,
      now: f.now,
    })
    try {
      const renewed = await app.inject({
        method: 'POST',
        url: `/v1/connections/${f.connectionId}/renew`,
        payload: { revision: 0 },
      })
      expect(renewed.statusCode, renewed.payload).toBe(200)
      expect(renewed.json().historyRecovery).toMatchObject({
        status: 'unverified',
        interruptedAt: expiredAt,
        intervals: [],
      })
      const complete = async (from: string) => {
        const started = await app.inject({
          method: 'POST',
          url: '/v1/sync/start',
          payload: {
            connectionId: f.connectionId,
            requestId: randomUUID(),
            mode: 'user_present',
            from,
            to: '2026-10-03',
          },
        })
        expect(started.statusCode, started.payload).toBe(200)
        let job = started.json()
        for (let attempt = 0; job.state !== 'completed' && attempt < 10; attempt++) {
          const resumed = await app.inject({
            method: 'POST',
            url: `/v1/sync/${job.id}/resume`,
            payload: {},
          })
          expect(resumed.statusCode, resumed.payload).toBe(200)
          job = resumed.json()
        }
        expect(job.state).toBe('completed')
        return job
      }
      const resumed = await complete('2026-10-03')
      const gap = await app.inject(`/v1/connections/${f.connectionId}/lifecycle`)
      expect(gap.statusCode, gap.payload).toBe(200)
      expect(gap.json().historyRecovery).toMatchObject({
        status: 'bank_gap',
        intervals: [{ from: '2026-10-02', to: '2026-10-02' }],
        evidenceJobIds: [resumed.id],
      })
      await complete('2026-10-02')
      const caught = await app.inject(`/v1/connections/${f.connectionId}/lifecycle`)
      expect(caught.json().historyRecovery).toMatchObject({ status: 'covered', intervals: [] })
    } finally {
      await app.close()
    }
  })

  test('an advancing clock keeps each transition and its journal identical and permits actual JSON/ZIP export', async () => {
    for (const legacy of [false, true]) {
      const f = await fixture(legacy)
      let tick = Date.parse(baseNow) + 1000
      const advancingNow = () => new Date(tick++).toISOString()
      const service = new ConsentLifecycleService(handle.db, f.profileId, f.provider, advancingNow)
      const sameTransition = async (
        action: Promise<Awaited<ReturnType<ConsentLifecycleService['get']>>>,
      ) => {
        const result = await action
        const latest = (await service.history(f.connectionId)).at(-1)
        expect(latest).toMatchObject({
          revision: result.revision,
          occurredAt: result.updatedAt,
          authorization: result.authorization,
          providerMetadata: result.providerMetadata,
        })
        const [stored] = await handle.db
          .select()
          .from(consentLifecycles)
          .where(eq(consentLifecycles.connectionId, f.connectionId))
        expect(stored?.updatedAt).toBe(latest?.occurredAt)
        return result
      }
      const paused = await sameTransition(service.pause(f.connectionId, legacy ? 0 : 1))
      const renewed = await sameTransition(service.renew(f.connectionId, paused.revision))
      await sameTransition(service.resume(f.connectionId, renewed.revision))
      for (const signal of ['unavailable', 'recovered'] as const) {
        const at = advancingNow()
        await sameTransition(
          handle.db.transaction((db) =>
            recordConsentProviderSignal(db, f.profileId, f.connectionId, signal, at),
          ),
        )
      }
      const revokedAt = advancingNow()
      await sameTransition(
        handle.db.transaction(async (db) => {
          await db
            .update(schema.connections)
            .set({ status: 'revoked' })
            .where(eq(schema.connections.id, f.connectionId))
          await db
            .update(schema.consents)
            .set({ revokedAt })
            .where(eq(schema.consents.id, f.consentId))
          return recordConsentRevoked(db, f.profileId, f.connectionId, revokedAt)
        }),
      )
      const app = await createApp({
        db: handle.db,
        financialScope: handle.withProfile,
        demoMode: true,
        seed: false,
        profileId: f.profileId,
        provider: f.provider,
        now: advancingNow,
      })
      try {
        const json = await app.inject({ url: '/v1/export' })
        expect(json.statusCode, json.payload).toBe(200)
        const snapshot = json.json()
        const archive = await app.inject({ method: 'POST', url: '/v1/export/archive', payload: {} })
        expect(archive.statusCode, archive.payload).toBe(200)
        expect(archive.headers['content-type']).toBe('application/zip')
        const bytes = unzipSync(archive.rawPayload)['data.json']
        if (!bytes) throw new Error('Missing actual ZIP ownership snapshot')
        const zipped = JSON.parse(strFromU8(bytes))
        expect(zipped.consentLifecycles).toEqual(snapshot.consentLifecycles)
        expect(zipped.consentEvents).toEqual(snapshot.consentEvents)
        const head = zipped.consentLifecycles[0]
        const latest = zipped.consentEvents.find(
          (event: { revision: number }) => event.revision === head.revision,
        )
        expect(head.updatedAt).toBe(latest.occurredAt)
      } finally {
        await app.close()
      }
    }
  })

  test('records the actual grant, source and separate provider terms atomically', async () => {
    const f = await fixture()
    expect(await f.service.get(f.connectionId)).toMatchObject({
      profileId: f.profileId,
      connectionId: f.connectionId,
      consentId: f.consentId,
      revision: 1,
      state: 'active',
      paused: false,
      source: 'provider',
      authorization: {
        consentExpiresAt: f.grant.consentExpiresAt,
        scaDueAt: null,
        providerSessionExpiresAt: null,
        tokenExpiresAt: null,
      },
      providerMetadata: { environment: 'synthetic' },
    })
    expect((await f.service.history(f.connectionId)).map((event) => event.action)).toEqual([
      'granted',
    ])
  })

  test('pauses/resumes without changing grant generation, expiry or saved freshness', async () => {
    const f = await fixture()
    const before = await handle.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.id, f.consentId))
    const paused = await f.service.pause(f.connectionId, 1)
    expect(paused).toMatchObject({
      revision: 2,
      state: 'paused',
      paused: true,
      consentId: f.consentId,
      lastSyncedAt: baseNow,
    })
    await expect(
      assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
    ).rejects.toMatchObject({ code: 'connection_paused' })
    const resumed = await f.service.resume(f.connectionId, 2)
    expect(resumed).toMatchObject({
      revision: 3,
      state: 'active',
      paused: false,
      consentId: f.consentId,
    })
    expect(
      await handle.db.select().from(schema.consents).where(eq(schema.consents.id, f.consentId)),
    ).toEqual(before)
    expect((await f.service.history(f.connectionId)).map((event) => event.action)).toEqual([
      'granted',
      'paused',
      'resumed',
    ])
    expect(
      (await assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()))
        .consentId,
    ).toBe(f.consentId)
  })

  test('same-revision concurrent commands have one winner and stale/no-op requests add no events', async () => {
    const f = await fixture()
    const results = await Promise.allSettled([
      f.service.pause(f.connectionId, 1),
      f.service.pause(f.connectionId, 1),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected?.status === 'rejected' ? rejected.reason : null).toMatchObject({
      code: 'consent_changed',
    })
    expect((await f.service.pause(f.connectionId, 2)).revision).toBe(2)
    await expect(f.service.resume(f.connectionId, 1)).rejects.toMatchObject({
      code: 'consent_changed',
    })
    expect(await f.service.history(f.connectionId)).toHaveLength(2)
  })

  test('expired consent remains denied while paused and cannot be resumed into active access', async () => {
    const f = await fixture()
    await f.service.pause(f.connectionId, 1)
    f.setNow('2027-04-01T00:00:00Z')
    expect(await f.service.get(f.connectionId)).toMatchObject({
      state: 'expired',
      paused: true,
      blockedReason: 'consent_expired',
    })
    await expect(f.service.resume(f.connectionId, 2)).rejects.toMatchObject({
      code: 'consent_inactive',
    })
    await expect(
      assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
    ).rejects.toMatchObject({ code: 'consent_inactive' })
  })

  test('expiry warnings follow an explicit offset and known provider date only', async () => {
    const f = await fixture()
    f.setNow('2027-03-30T23:59:59Z')
    const configured = new ConsentLifecycleService(handle.db, f.profileId, f.provider, f.now, {
      expiringOffsetSeconds: 86400,
    })
    expect((await f.service.get(f.connectionId)).state).toBe('active')
    expect((await configured.get(f.connectionId)).state).toBe('expiring')
    f.setNow(f.grant.consentExpiresAt)
    expect((await configured.get(f.connectionId)).state).toBe('expired')
    expect(
      () =>
        new ConsentLifecycleService(handle.db, f.profileId, f.provider, f.now, {
          expiringOffsetSeconds: -1,
        }),
    ).toThrow('timing configuration')
  })

  test('SCA/session/token expiry is separate from unexpired AIS consent', async () => {
    for (const [field, state, reason] of [
      ['scaDueAt', 'expired', 'sca_required'],
      ['providerSessionExpiresAt', 'expired', 'provider_session_expired'],
      ['tokenExpiresAt', 'error', 'provider_token_expired'],
    ] as const) {
      const f = await fixture()
      const authorization = { ...f.grant.authorization, [field]: '2026-10-03T11:59:59Z' }
      await handle.db
        .update(consentLifecycles)
        .set({ authorization })
        .where(eq(consentLifecycles.connectionId, f.connectionId))
      expect(await f.service.get(f.connectionId)).toMatchObject({
        state,
        blockedReason: reason,
        authorization: { consentExpiresAt: f.grant.consentExpiresAt },
      })
      await expect(
        assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
      ).rejects.toMatchObject({ code: 'consent_inactive' })
    }
  })

  test('provider error/recovery events change the actual access state and preserve freshness', async () => {
    const f = await fixture()
    await handle.db.transaction((db) =>
      recordConsentProviderSignal(db, f.profileId, f.connectionId, 'unavailable', f.now()),
    )
    expect(await f.service.get(f.connectionId)).toMatchObject({
      state: 'error',
      blockedReason: 'provider_unavailable',
      lastSyncedAt: baseNow,
    })
    await expect(
      assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
    ).rejects.toMatchObject({ code: 'consent_inactive' })
    await handle.db.transaction((db) =>
      recordConsentProviderSignal(db, f.profileId, f.connectionId, 'recovered', f.now()),
    )
    expect((await f.service.get(f.connectionId)).state).toBe('active')
    expect((await f.service.history(f.connectionId)).map((event) => event.action)).toEqual([
      'granted',
      'provider_error',
      'provider_recovered',
    ])
  })

  test('renewal preserves a paused current generation and records provider evidence', async () => {
    const f = await fixture()
    await f.service.pause(f.connectionId, 1)
    const renewed = await f.service.renew(f.connectionId, 2)
    expect(renewed).toMatchObject({
      revision: 3,
      state: 'paused',
      paused: true,
      consentId: f.consentId,
    })
    expect((await f.service.history(f.connectionId)).map((event) => event.action)).toEqual([
      'granted',
      'paused',
      'renewed',
    ])
    await expect(f.service.renew(f.connectionId, 2)).rejects.toMatchObject({
      code: 'consent_changed',
    })
  })

  test('expired authorization becomes usable only after a successful provider-derived renewal', async () => {
    const f = await fixture()
    const earlierExpiry = '2026-10-03T11:59:59Z'
    await handle.db.transaction(async (db) => {
      await db
        .update(schema.consents)
        .set({ expiresAt: earlierExpiry })
        .where(eq(schema.consents.id, f.consentId))
      await db
        .update(consentLifecycles)
        .set({
          authorization: {
            ...f.grant.authorization,
            consentExpiresAt: earlierExpiry,
            requiredActions: [
              {
                action: 'renew_consent',
                method: 'in_place',
                dueAt: earlierExpiry,
                evidenceReference: 'synthetic-earlier-provider-term',
              },
            ],
          },
        })
        .where(eq(consentLifecycles.connectionId, f.connectionId))
    })
    expect((await f.service.get(f.connectionId)).state).toBe('expired')
    const renewed = await f.service.renew(f.connectionId, 1)
    expect(renewed).toMatchObject({
      state: 'active',
      revision: 2,
      authorization: { consentExpiresAt: f.grant.consentExpiresAt },
    })
    expect(
      (await handle.db.select().from(schema.consents).where(eq(schema.consents.id, f.consentId)))[0]
        ?.expiresAt,
    ).toBe(f.grant.consentExpiresAt)
    expect(
      (await assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()))
        .revision,
    ).toBe(2)
  })

  test('revocation stops refresh/renewal and reminders without provider I/O in its hook', async () => {
    const f = await fixture()
    await handle.db.transaction(async (db) => {
      await db
        .update(schema.connections)
        .set({ status: 'revoked' })
        .where(eq(schema.connections.id, f.connectionId))
      await db
        .update(schema.consents)
        .set({ revokedAt: f.now() })
        .where(eq(schema.consents.id, f.consentId))
      await recordConsentRevoked(db, f.profileId, f.connectionId, f.now())
    })
    expect(await f.service.get(f.connectionId)).toMatchObject({
      state: 'revoked',
      paused: false,
      authorization: { requiredActions: [] },
    })
    await expect(
      assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
    ).rejects.toMatchObject({ code: 'consent_inactive' })
    await expect(f.service.renew(f.connectionId, 2)).rejects.toMatchObject({
      code: 'consent_inactive',
    })
    await expect(
      f.provider.listAccounts({ profileId: f.profileId, connectionId: f.connectionId }),
    ).resolves.toHaveLength(5)
    await handle.db.transaction((db) =>
      recordConsentRevoked(db, f.profileId, f.connectionId, f.now()),
    )
    expect(await f.service.history(f.connectionId)).toHaveLength(2)
  })

  test('outstanding revocation blocks refresh and renewal even if local grant rows look active', async () => {
    const f = await fixture()
    await handle.db.transaction((db) =>
      enqueueRevocation(
        db,
        {
          profileId: f.profileId,
          connectionId: f.connectionId,
          providerId: f.provider.id,
          consentId: f.consentId,
        },
        f.now(),
      ),
    )
    await expect(
      assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
    ).rejects.toMatchObject({ status: 409 })
    await expect(f.service.renew(f.connectionId, 1)).rejects.toMatchObject({ status: 409 })
    expect(await f.service.history(f.connectionId)).toHaveLength(1)
  })

  test('legacy reads are side-effect-free and first mutation records the inferred source', async () => {
    const f = await fixture(true)
    expect(await f.service.get(f.connectionId)).toMatchObject({
      revision: 0,
      state: 'active',
      source: 'legacy',
      providerMetadata: null,
      authorization: { consentExpiresAt: f.grant.consentExpiresAt, requiredActions: [] },
    })
    expect(await f.service.history(f.connectionId)).toHaveLength(0)
    await assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now())
    const paused = await f.service.pause(f.connectionId, 0)
    expect(paused).toMatchObject({ revision: 2, state: 'paused', source: 'legacy' })
    expect((await f.service.history(f.connectionId)).map((event) => event.action)).toEqual([
      'legacy_imported',
      'paused',
    ])
  })

  test('missing or malformed legacy authorization never becomes an indefinite grant', async () => {
    const f = await fixture(true)
    await handle.db.delete(schema.consents).where(eq(schema.consents.id, f.consentId))
    expect(
      await readConsentLifecycle(handle.db, f.profileId, f.connectionId, f.now()),
    ).toMatchObject({
      state: 'unknown',
      consentId: null,
      authorization: { consentExpiresAt: null },
    })
    await expect(
      assertLifecycleAllowsRefresh(handle.db, f.profileId, f.connectionId, f.now()),
    ).rejects.toMatchObject({ code: 'consent_inactive' })
    await expect(f.service.pause(f.connectionId, 0)).rejects.toMatchObject({
      code: 'consent_inactive',
    })
    const invalid = await fixture(true)
    await handle.db
      .update(schema.consents)
      .set({ expiresAt: '2026-02-30T00:00:00Z' })
      .where(eq(schema.consents.id, invalid.consentId))
    await expect(invalid.service.get(invalid.connectionId)).rejects.toMatchObject({
      code: 'consent_metadata_unavailable',
    })
  })

  test('grant metadata mismatch or surrounding transaction failure writes no partial audit', async () => {
    const f = await fixture()
    await expect(
      handle.db.transaction((db) =>
        recordConsentGranted(
          db,
          f.profileId,
          f.connectionId,
          f.consentId,
          {
            discovery: f.provider.discoveryMetadata(),
            authorization: { ...f.grant.authorization, institutionId: 'other-institution' },
          },
          f.now(),
        ),
      ),
    ).rejects.toMatchObject({ code: 'consent_metadata_unavailable' })
    await expect(
      handle.db.transaction(async (db) => {
        await new ConsentLifecycleService(db, f.profileId, f.provider, f.now).pause(
          f.connectionId,
          1,
        )
        throw new Error('synthetic surrounding transaction fault')
      }),
    ).rejects.toThrow('surrounding transaction fault')
    expect((await f.service.get(f.connectionId)).revision).toBe(1)
    expect(await f.service.history(f.connectionId)).toHaveLength(1)
  })

  test('failed/malformed/stale provider renewal cannot overwrite consent or append an event', async () => {
    const f = await fixture()
    const malformed = new MockItalianProvider()
    malformed.renewConnection = async () => ({
      ...f.grant,
      consentExpiresAt: '2030-01-01T00:00:00Z',
    })
    await expect(
      new ConsentLifecycleService(handle.db, f.profileId, malformed, f.now).renew(
        f.connectionId,
        1,
      ),
    ).rejects.toMatchObject({ status: 502 })
    await f.provider.createConnection({
      profileId: f.profileId,
      connectionId: f.connectionId,
      grantId: 'different-generation',
    })
    await expect(f.service.renew(f.connectionId, 1)).rejects.toMatchObject({ status: 502 })
    expect((await f.service.get(f.connectionId)).revision).toBe(1)
    expect(await f.service.history(f.connectionId)).toHaveLength(1)
  })

  test('new grant on the same connection advances revision and preserves older events', async () => {
    const f = await fixture()
    const newId = `lifecycle_consent_${randomUUID()}`
    const grant = await f.provider.createConnection({
      profileId: f.profileId,
      connectionId: f.connectionId,
      grantId: newId,
    })
    await handle.db.transaction(async (db) => {
      await db
        .update(schema.consents)
        .set({ revokedAt: f.now() })
        .where(eq(schema.consents.id, f.consentId))
      await db.insert(schema.consents).values({
        id: newId,
        profileId: f.profileId,
        connectionId: f.connectionId,
        purpose: 'account_information',
        grantedAt: '2026-10-03T12:00:01Z',
        expiresAt: grant.consentExpiresAt,
        revokedAt: null,
        provider: f.provider.id,
      })
      await recordConsentGranted(
        db,
        f.profileId,
        f.connectionId,
        newId,
        { discovery: f.provider.discoveryMetadata(), authorization: grant.authorization },
        f.now(),
      )
    })
    expect(await f.service.get(f.connectionId)).toMatchObject({
      consentId: newId,
      revision: 2,
      state: 'active',
    })
    expect((await f.service.history(f.connectionId)).map((event) => event.consentId)).toEqual([
      f.consentId,
      newId,
    ])
    await expect(f.service.pause(f.connectionId, 1)).rejects.toMatchObject({
      code: 'consent_changed',
    })
  })

  test('cross-profile IDs and foreign-key combinations are refused', async () => {
    const own = await fixture()
    const other = await fixture()
    await expect(own.service.get(other.connectionId)).rejects.toMatchObject({ status: 404 })
    await expect(own.service.pause(other.connectionId, 1)).rejects.toMatchObject({ status: 404 })
    await expect(own.service.history(other.connectionId)).rejects.toMatchObject({ status: 404 })
    await expect(
      handle.db.insert(consentEvents).values({
        id: `invalid_event_${randomUUID()}`,
        profileId: own.profileId,
        connectionId: own.connectionId,
        consentId: other.consentId,
        revision: 2,
        action: 'paused',
        source: 'user',
        authorization: own.grant.authorization,
        occurredAt: own.now(),
      }),
    ).rejects.toThrow()
  })

  test('append-only events reject update/direct delete while profile erasure cascades all lifecycle data', async () => {
    const f = await fixture()
    await expect(
      handle.db
        .update(consentEvents)
        .set({ occurredAt: '2030-01-01T00:00:00Z' })
        .where(eq(consentEvents.profileId, f.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('append-only') } })
    await expect(
      handle.db.delete(consentEvents).where(eq(consentEvents.profileId, f.profileId)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining('append-only') } })
    expect(await f.service.history(f.connectionId)).toHaveLength(1)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, f.profileId))
    expect(
      await handle.db.select().from(consentEvents).where(eq(consentEvents.profileId, f.profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(consentLifecycles)
        .where(eq(consentLifecycles.profileId, f.profileId)),
    ).toHaveLength(0)
  })

  test('actual non-owner runtime role isolates both new tables and supports scoped mutation', async () => {
    const own = await fixture()
    const other = await fixture()
    await handle.withProfile(own.profileId, async (db: Database) => {
      expect(
        (await db.select().from(consentEvents)).every((row) => row.profileId === own.profileId),
      ).toBe(true)
      expect(
        await db
          .select()
          .from(consentLifecycles)
          .where(eq(consentLifecycles.profileId, other.profileId)),
      ).toHaveLength(0)
      expect(
        (
          await new ConsentLifecycleService(db, own.profileId, own.provider, own.now).pause(
            own.connectionId,
            1,
          )
        ).state,
      ).toBe('paused')
    })
    await expect(
      handle.withProfile(own.profileId, (db) =>
        db.insert(consentEvents).values({
          id: `rls_invalid_${randomUUID()}`,
          profileId: other.profileId,
          connectionId: other.connectionId,
          consentId: other.consentId,
          revision: 2,
          action: 'paused',
          source: 'user',
          authorization: other.grant.authorization,
          occurredAt: own.now(),
        }),
      ),
    ).rejects.toThrow()
    const policies = await handle.db.execute(
      sql`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('consent_events','consent_lifecycles')`,
    )
    expect(
      (
        policies as { rows: { relrowsecurity: boolean; relforcerowsecurity: boolean }[] }
      ).rows.every((row) => row.relrowsecurity && row.relforcerowsecurity),
    ).toBe(true)
  })

  test('owned source erasure cascades lifecycle history through the runtime role and leaves another profile intact', async () => {
    const own = await fixture()
    const other = await fixture()
    const otherHistory = await other.service.history(other.connectionId)
    await expect(
      handle.withProfile(own.profileId, (db) =>
        db.delete(consentEvents).where(eq(consentEvents.profileId, own.profileId)),
      ),
    ).rejects.toThrow()
    expect(
      await handle.withProfile(own.profileId, (db) =>
        db
          .delete(schema.connections)
          .where(eq(schema.connections.id, other.connectionId))
          .returning({ id: schema.connections.id }),
      ),
    ).toEqual([])
    expect(await other.service.history(other.connectionId)).toEqual(otherHistory)
    expect(
      await handle.withProfile(own.profileId, (db) =>
        db
          .delete(schema.connections)
          .where(eq(schema.connections.id, own.connectionId))
          .returning({ id: schema.connections.id }),
      ),
    ).toEqual([{ id: own.connectionId }])
    for (const table of [consentEvents, consentLifecycles, schema.consents])
      expect(
        await handle.db.select().from(table).where(eq(table.profileId, own.profileId)),
      ).toEqual([])
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, own.profileId)),
    ).toHaveLength(1)
    expect(await other.service.history(other.connectionId)).toEqual(otherHistory)
    expect((await other.service.get(other.connectionId)).state).toBe('active')
  })

  test('route DTOs round-trip actual state and reject invalid revision/profile selectors', async () => {
    const f = await fixture()
    const app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler((error, _request, reply) => {
      const status = error instanceof Problem ? error.status : error.validation ? 400 : 500
      reply.status(status).send({
        type: 'about:blank',
        title: 'Synthetic test problem',
        status,
        code: error instanceof Problem ? error.code : 'invalid_request',
        detail: 'Synthetic test',
        instance: '',
      })
    })
    registerConsentLifecycleRoutes(app, async () => f.service)
    try {
      const get = await app.inject({
        method: 'GET',
        url: `/v1/connections/${f.connectionId}/lifecycle`,
      })
      expect(get.statusCode).toBe(200)
      expect(get.json()).toMatchObject({ revision: 1, state: 'active' })
      expect(get.json()).not.toHaveProperty('householdId')
      const paused = await app.inject({
        method: 'POST',
        url: `/v1/connections/${f.connectionId}/pause`,
        payload: { revision: 1 },
      })
      expect(paused.statusCode).toBe(200)
      expect(paused.json()).toMatchObject({ revision: 2, state: 'paused' })
      const history = await app.inject({
        method: 'GET',
        url: `/v1/connections/${f.connectionId}/consent-events`,
      })
      expect(history.statusCode).toBe(200)
      expect(history.json()).toHaveLength(2)
      for (const payload of [{}, { revision: -1 }, { revision: 2, profileId: 'other' }]) {
        expect(
          (
            await app.inject({
              method: 'POST',
              url: `/v1/connections/${f.connectionId}/resume`,
              payload,
            })
          ).statusCode,
        ).toBe(400)
      }
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `/v1/connections/${f.connectionId}/resume`,
            payload: { revision: 1 },
          })
        ).statusCode,
      ).toBe(409)
      expect((await f.service.get(f.connectionId)).state).toBe('paused')
    } finally {
      await app.close()
    }
  })
})
