import { randomUUID } from 'node:crypto'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider, type ProviderContext } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  ConnectionCreationCoordinator,
  cancelConnectionCreationIntents,
  cancelRestoredConnectionCreationIntents,
  closeConnectionCreationWork,
  compensateConnectionCreationIntent,
  recoverConnectionCreationIntents,
} from '../src/connection-creation.js'
import {
  assertConnectionCreationOwnershipReferences,
  connectionCreationOwnershipDto,
  connectionCreationOwnershipExport,
} from '../src/connection-creation-export.js'
import { connectionCreationIntents } from '../src/connection-creation-schema.js'
import { consentLifecycles } from '../src/consent-lifecycle-schema.js'
import { processNextRevocation } from '../src/revocation-outbox.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle
const profiles: string[] = []
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  if (handle) await handle.close()
})
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function fixture(timeout = 10_000) {
  const profileId = `creation_${randomUUID()}`
  profiles.push(profileId)
  let clock = new Date().toISOString(),
    scopes = 0
  const now = () => clock
  class Provider extends MockItalianProvider {
    grants = 0
    discoveries = 0
    disconnects: ProviderContext[] = []
    onGrant: ((context: ProviderContext) => Promise<void>) | null = null
    override async listInstitutions(cursor?: string | null) {
      expect(scopes, 'discovery I/O must not hold SQL scope').toBe(0)
      this.discoveries++
      return super.listInstitutions(cursor)
    }
    override async createConnection(context: ProviderContext) {
      expect(scopes, 'grant I/O must not hold SQL scope').toBe(0)
      this.grants++
      await this.onGrant?.(context)
      return super.createConnection(context)
    }
    override async disconnect(context: ProviderContext) {
      this.disconnects.push(context)
      return super.disconnect(context)
    }
  }
  const provider = new Provider()
  await new DemoService(handle.db, profileId, provider, now).bootstrap(false)
  const scope = <T>(id: string, work: (db: Database) => Promise<T>) =>
    handle.withProfile(id, async (db) => {
      scopes++
      try {
        return await work(db)
      } finally {
        scopes--
      }
    })
  const coordinator = new ConnectionCreationCoordinator({
    scope,
    profileId,
    provider,
    attemptTimeoutMs: timeout,
    now,
    compensate: (value) => compensateConnectionCreationIntent(handle.db, value, now()),
  })
  const connect = (signal?: AbortSignal) =>
    coordinator.connect({ institutionId: 'synthetic-italian', accountKind: 'current' }, signal)
  const rows = () =>
    handle.db
      .select()
      .from(connectionCreationIntents)
      .where(eq(connectionCreationIntents.profileId, profileId))
  return {
    profileId,
    provider,
    coordinator,
    connect,
    scope,
    now,
    rows,
    setClock: (value: string) => {
      clock = value
    },
  }
}
async function bounded<T>(value: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      value,
      new Promise<never>((_r, reject) => {
        timer = setTimeout(() => reject(new Error('SQL operation blocked by provider I/O')), 2000)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
describe('durable synthetic connection creation without provider SQL locks', () => {
  test('actual grant/discovery run outside SQL and one committed generation is reusable', async () => {
    const f = await fixture()
    const connection = await f.connect()
    expect(await f.connect()).toEqual(connection)
    expect(f.provider.grants).toBe(1)
    expect(f.provider.discoveries).toBe(1)
    const [intent] = await f.rows()
    expect(intent?.state).toBe('applied')
    const [consent] = await handle.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.profileId, f.profileId))
    expect(consent?.id).toBe(intent?.consentId)
    const [lifecycle] = await handle.db
      .select()
      .from(consentLifecycles)
      .where(eq(consentLifecycles.profileId, f.profileId))
    expect(lifecycle?.consentId).toBe(consent?.id)
    expect(lifecycle?.updatedAt).toBe(consent?.grantedAt)
  })
  test('a blocked grant permits actual same-profile cancellation and unrelated-profile writes; concurrent create has one winner', async () => {
    const f = await fixture(),
      other = await fixture(),
      started = deferred(),
      release = deferred()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect()
    await started.promise
    await expect(bounded(f.connect())).rejects.toMatchObject({
      code: 'connection_creation_pending',
    })
    await bounded(
      other.scope(other.profileId, (db) =>
        db
          .update(schema.profiles)
          .set({ name: 'Other fixture' })
          .where(eq(schema.profiles.id, other.profileId)),
      ),
    )
    await bounded(
      f.scope(f.profileId, (db) => cancelConnectionCreationIntents(db, f.profileId, f.now())),
    )
    release.resolve()
    await expect(running).rejects.toMatchObject({ code: 'connection_creation_changed' })
    expect(f.provider.grants).toBe(1)
    expect(
      await handle.db
        .select()
        .from(schema.connections)
        .where(eq(schema.connections.profileId, f.profileId)),
    ).toEqual([])
    const [intent] = await f.rows()
    expect(intent?.state).toBe('compensating')
    const [job] = await handle.db
      .select()
      .from(schema.revocationJobs)
      .where(eq(schema.revocationJobs.profileId, f.profileId))
    expect(job?.consentId).toBe(intent?.consentId)
  })
  test('profile deletion during provider I/O cannot apply and durable exact-grant revocation survives', async () => {
    const f = await fixture(),
      started = deferred(),
      release = deferred()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect()
    await started.promise
    await bounded(
      f.scope(f.profileId, async (db) => {
        await cancelConnectionCreationIntents(db, f.profileId, f.now())
        await new DemoService(db, f.profileId, f.provider, f.now).erase()
      }),
    )
    release.resolve()
    await expect(running).rejects.toBeDefined()
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, f.profileId)),
    ).toEqual([])
    const [intent] = await f.rows()
    expect(intent?.state).toBe('compensating')
    const result = await processNextRevocation(handle.db, [f.provider], {
      profileId: f.profileId,
      now: f.now,
    })
    expect(result?.state).toBe('completed')
    expect(f.provider.disconnects[0]?.grantId).toBe(intent?.consentId)
  })
  test('consent generation ABA during blocked regrant invalidates the complete baseline', async () => {
    const f = await fixture()
    const connection = await f.connect()
    await f.scope(f.profileId, async (db) => {
      await db
        .update(schema.connections)
        .set({ status: 'expired' })
        .where(eq(schema.connections.id, connection.id))
    })
    const started = deferred(),
      release = deferred()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect()
    await started.promise
    await f.scope(f.profileId, async (db) => {
      const [old] = await db
        .select()
        .from(consentLifecycles)
        .where(eq(consentLifecycles.connectionId, connection.id))
      if (!old) throw new Error('Fixture lifecycle missing')
      await db
        .update(consentLifecycles)
        .set({ revision: old.revision + 2 })
        .where(eq(consentLifecycles.connectionId, connection.id))
    })
    release.resolve()
    await expect(running).rejects.toMatchObject({ code: 'connection_creation_changed' })
    const [original] = await handle.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.id, connection.id))
    expect(original?.status).toBe('expired')
    expect(
      await handle.db
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.profileId, f.profileId)),
    ).toHaveLength(1)
  })
  test('provider failure is redacted and exact uncertain grant is compensated', async () => {
    const f = await fixture()
    f.provider.onGrant = async () => {
      throw new Error('PRIVATE token account bank amount')
    }
    await expect(f.connect()).rejects.toMatchObject({ code: 'provider_unavailable' })
    const [intent] = await f.rows()
    expect(intent?.state).toBe('compensating')
    expect(intent?.settledAt).toBeNull()
    const [job] = await handle.db
      .select()
      .from(schema.revocationJobs)
      .where(eq(schema.revocationJobs.profileId, f.profileId))
    expect(job?.consentId).toBe(intent?.consentId)
  })
  test('unknown institution never dispatches a grant and releases its prepared intent', async () => {
    const f = await fixture()
    await expect(
      f.coordinator.connect({ institutionId: 'unknown-bank', accountKind: 'current' }),
    ).rejects.toMatchObject({ code: 'institution_unavailable' })
    expect(f.provider.grants).toBe(0)
    expect((await f.rows())[0]?.state).toBe('compensated')
    expect(
      await handle.db
        .select()
        .from(schema.revocationJobs)
        .where(eq(schema.revocationJobs.profileId, f.profileId)),
    ).toEqual([])
  })
  test('caller abort remains serial until late grant settles and cannot restore consent', async () => {
    const f = await fixture(),
      started = deferred(),
      release = deferred(),
      controller = new AbortController()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect(controller.signal)
    await started.promise
    controller.abort()
    await expect(running).rejects.toMatchObject({ code: 'connection_creation_changed' })
    expect((await f.rows())[0]?.state).toBe('cancelled')
    await expect(f.connect()).rejects.toMatchObject({ code: 'connection_creation_pending' })
    release.resolve()
    await expect.poll(async () => (await f.rows())[0]?.state).toBe('compensating')
    expect(
      await handle.db
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.profileId, f.profileId)),
    ).toEqual([])
  })
  test('timeout never retries creation, even when delayed provider success arrives later', async () => {
    // Leave time for real PostgreSQL prepare/fence commits, then expire during blocked I/O.
    const f = await fixture(1_000),
      started = deferred(),
      release = deferred()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect()
    await Promise.race([
      started.promise,
      running.then(() => {
        throw new Error('Creation unexpectedly completed before blocked provider entry')
      }),
    ])
    await expect(running).rejects.toMatchObject({ code: 'provider_unavailable' })
    await expect(f.connect()).rejects.toMatchObject({ code: 'connection_creation_pending' })
    expect(f.provider.grants).toBe(1)
    release.resolve()
    await expect.poll(async () => (await f.rows())[0]?.state).toBe('compensating')
  })
  test('unknown orphan settlement stays fenced after early ack; observed late settlement requires a fresh exact-grant ack', async () => {
    const f = await fixture(),
      connectionId = `connection_${randomUUID()}`,
      consentId = `consent_${randomUUID()}`,
      id = randomUUID(),
      at = f.now()
    await f.scope(f.profileId, (db) =>
      db.insert(connectionCreationIntents).values({
        id,
        profileId: f.profileId,
        providerId: f.provider.id,
        institutionId: 'synthetic-italian',
        connectionId,
        consentId,
        basisDigest: 'a'.repeat(64),
        state: 'dispatching',
        createdAt: at,
        dispatchedAt: at,
        deadlineAt: new Date(Date.parse(at) + 1).toISOString(),
      }),
    )
    f.setClock(new Date(Date.parse(at) + 20).toISOString())
    await recoverConnectionCreationIntents(handle.db, f.now(), 20)
    expect((await f.rows())[0]?.state).toBe('compensating')
    expect(f.provider.grants).toBe(0)
    await expect(f.connect()).rejects.toMatchObject({ code: 'connection_creation_pending' })
    expect(
      (await processNextRevocation(handle.db, [f.provider], { profileId: f.profileId, now: f.now }))
        ?.state,
    ).toBe('completed')
    await recoverConnectionCreationIntents(handle.db, f.now(), 20)
    expect((await f.rows())[0]?.state).toBe('compensating')
    expect((await f.rows())[0]?.settledAt).toBeNull()
    await expect(f.connect()).rejects.toMatchObject({ code: 'connection_creation_pending' })
    // The original remote operation may create a grant AFTER that early acknowledgement.
    await f.provider.createConnection({
      profileId: f.profileId,
      connectionId,
      grantId: consentId,
      institutionId: 'synthetic-italian',
    })
    // Actual trusted observation of the original provider promise's settlement.
    await compensateConnectionCreationIntent(
      handle.db,
      { intentId: id, grantSettled: true },
      f.now(),
    )
    const intent = (await f.rows())[0]
    if (!intent?.revocationJobId) throw new Error('Exact-grant job is missing')
    const [job] = await handle.db
      .select()
      .from(schema.revocationJobs)
      .where(eq(schema.revocationJobs.id, intent.revocationJobId))
    expect(job?.state).toBe('pending')
    expect(
      (await processNextRevocation(handle.db, [f.provider], { profileId: f.profileId, now: f.now }))
        ?.state,
    ).toBe('completed')
    await recoverConnectionCreationIntents(handle.db, f.now(), 20)
    expect((await f.rows())[0]?.state).toBe('compensated')
    await f.connect()
    expect(f.provider.grants).toBe(2)
  })
  test('expired recovery skips an active local grant without premature provider revocation', async () => {
    const f = await fixture(),
      started = deferred(),
      release = deferred()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect()
    await started.promise
    f.setClock(new Date(Date.parse(f.now()) + 20_000).toISOString())
    await recoverConnectionCreationIntents(handle.db, f.now(), 100)
    expect(
      await handle.db
        .select()
        .from(schema.revocationJobs)
        .where(eq(schema.revocationJobs.profileId, f.profileId)),
    ).toEqual([])
    await expect(f.connect()).rejects.toMatchObject({ code: 'connection_creation_pending' })
    release.resolve()
    await expect(running).rejects.toMatchObject({ code: 'connection_creation_changed' })
    expect((await f.rows())[0]?.state).toBe('compensating')
  })
  test('slow discovery observes the configured deadline without creating a grant', async () => {
    const f = await fixture(30),
      release = deferred(),
      original = f.provider.listInstitutions.bind(f.provider)
    f.provider.listInstitutions = async (cursor) => {
      await release.promise
      return original(cursor)
    }
    await expect(f.connect()).rejects.toMatchObject({ code: 'provider_unavailable' })
    expect(f.provider.grants).toBe(0)
    expect((await f.rows())[0]?.state).toBe('compensated')
    release.resolve()
  })
  test('invalid returned grant cannot apply financial state and its actual generation is revoked', async () => {
    const f = await fixture(),
      original = f.provider.createConnection.bind(f.provider)
    f.provider.createConnection = async (context) => ({
      ...(await original(context)),
      redirectUrl: 'https://private.invalid/token',
    })
    await expect(f.connect()).rejects.toMatchObject({ code: 'provider_unavailable' })
    const [intent] = await f.rows()
    expect(intent?.state).toBe('compensating')
    expect(
      await handle.db
        .select()
        .from(schema.connections)
        .where(eq(schema.connections.profileId, f.profileId)),
    ).toEqual([])
    expect(
      (await processNextRevocation(handle.db, [f.provider], { profileId: f.profileId, now: f.now }))
        ?.state,
    ).toBe('completed')
    expect(f.provider.disconnects[0]?.grantId).toBe(intent?.consentId)
  })
  test('RLS denies cross-profile intent reads and immutable routing cannot be reassigned', async () => {
    const f = await fixture(),
      other = await fixture()
    await f.connect()
    const [row] = await f.rows()
    if (!row) throw new Error('Fixture intent missing')
    expect(
      await other.scope(other.profileId, (db) =>
        db.select().from(connectionCreationIntents).where(eq(connectionCreationIntents.id, row.id)),
      ),
    ).toEqual([])
    await expect(
      handle.db
        .update(connectionCreationIntents)
        .set({ providerId: 'another-provider' })
        .where(eq(connectionCreationIntents.id, row.id)),
    ).rejects.toBeDefined()
    expect((await f.rows())[0]?.providerId).toBe(f.provider.id)
  })
  test('source erasure captures exact targets; restore replay fails closed on missing or foreign targets', async () => {
    const f = await fixture(),
      other = await fixture(),
      connectionId = `connection_${randomUUID()}`,
      targetId = randomUUID(),
      at = f.now()
    await f.scope(f.profileId, (db) =>
      db.insert(connectionCreationIntents).values({
        id: targetId,
        connectionId,
        institutionId: 'synthetic-italian',
        profileId: f.profileId,
        providerId: f.provider.id,
        consentId: `consent_${randomUUID()}`,
        basisDigest: 'a'.repeat(64),
        state: 'prepared',
        createdAt: at,
        deadlineAt: new Date(Date.parse(at) + 10_000).toISOString(),
      }),
    )
    const captured = await f.scope(f.profileId, (db) =>
      cancelConnectionCreationIntents(db, f.profileId, at, connectionId),
    )
    expect(captured.map((row) => row.id)).toEqual([targetId])
    expect(Object.keys(captured[0] ?? {}).sort()).toEqual([
      'connectionId',
      'consentId',
      'id',
      'providerId',
    ])
    await handle.db
      .update(connectionCreationIntents)
      .set({ state: 'prepared' })
      .where(eq(connectionCreationIntents.id, targetId))
    await expect(
      other.scope(other.profileId, (db) =>
        cancelRestoredConnectionCreationIntents(db, f.profileId, connectionId, [targetId], at),
      ),
    ).rejects.toThrow('quarantined')
    await expect(
      f.scope(f.profileId, (db) =>
        cancelRestoredConnectionCreationIntents(db, f.profileId, connectionId, ['missing'], at),
      ),
    ).rejects.toThrow('quarantined')
    expect((await f.rows())[0]?.state).toBe('prepared')
    await f.scope(f.profileId, (db) =>
      cancelRestoredConnectionCreationIntents(db, f.profileId, connectionId, [targetId], at),
    )
    expect((await f.rows())[0]?.state).toBe('cancelled')
  })
  test('ownership export is strict and validates actual own-profile grant references', async () => {
    const f = await fixture(),
      other = await fixture()
    await f.connect()
    await other.connect()
    const exported = await f.scope(f.profileId, (db) =>
      connectionCreationOwnershipExport(db, f.profileId),
    )
    expect(exported.intents).toHaveLength(1)
    expect(exported.intents[0]?.profileId).toBe(f.profileId)
    expect(exported.intents[0]).not.toHaveProperty('householdId')
    const scope = await f.scope(f.profileId, async (db) => ({
      profileId: f.profileId,
      exportedAt: f.now(),
      connections: await db.select().from(schema.connections),
      consents: await db.select().from(schema.consents),
      revocationJobs: await db.select().from(schema.revocationJobs),
    }))
    expect(() => assertConnectionCreationOwnershipReferences(exported, scope)).not.toThrow()
    expect(() => connectionCreationOwnershipDto.parse({ ...exported, token: 'PRIVATE' })).toThrow()
    const tampered = structuredClone(exported)
    if (!tampered.intents[0]) throw new Error('Export fixture missing')
    tampered.intents[0].consentId = 'not-the-applied-grant'
    expect(() => assertConnectionCreationOwnershipReferences(tampered, scope)).toThrow()
    expect(() =>
      assertConnectionCreationOwnershipReferences(exported, {
        ...scope,
        profileId: other.profileId,
      }),
    ).toThrow()
    expect(() =>
      assertConnectionCreationOwnershipReferences(exported, {
        ...scope,
        connections: [],
        consents: [],
        sourceErasureReceipts: [
          {
            profileId: f.profileId,
            connectionId: exported.intents[0]?.connectionId ?? '',
            consentIds: [exported.intents[0]?.consentId ?? ''],
          },
        ],
      }),
    ).not.toThrow()
  })
  test('exact orphan compensation does not revoke a different newer provider grant', async () => {
    const f = await fixture(),
      connectionId = `connection_${randomUUID()}`,
      oldGrant = `consent_${randomUUID()}`,
      newGrant = `consent_${randomUUID()}`,
      id = randomUUID(),
      at = f.now()
    await f.provider.createConnection({ profileId: f.profileId, connectionId, grantId: oldGrant })
    await f.provider.createConnection({ profileId: f.profileId, connectionId, grantId: newGrant })
    await f.scope(f.profileId, (db) =>
      db.insert(connectionCreationIntents).values({
        id,
        profileId: f.profileId,
        providerId: f.provider.id,
        institutionId: 'synthetic-italian',
        connectionId,
        consentId: oldGrant,
        basisDigest: 'a'.repeat(64),
        state: 'dispatching',
        createdAt: at,
        dispatchedAt: at,
        deadlineAt: new Date(Date.parse(at) + 1).toISOString(),
      }),
    )
    await compensateConnectionCreationIntent(handle.db, { intentId: id, grantSettled: true }, at)
    expect(
      (await processNextRevocation(handle.db, [f.provider], { profileId: f.profileId, now: f.now }))
        ?.state,
    ).toBe('completed')
    await expect(
      f.provider.listAccounts({ profileId: f.profileId, connectionId, grantId: newGrant }),
    ).resolves.toHaveLength(5)
    expect(f.provider.disconnects[0]?.grantId).toBe(oldGrant)
  })
  test('shutdown stops admission and waits for a cancelled caller’s late compensation', async () => {
    const f = await fixture(),
      started = deferred(),
      release = deferred(),
      controller = new AbortController()
    f.provider.onGrant = async () => {
      started.resolve()
      await release.promise
    }
    const running = f.connect(controller.signal)
    await started.promise
    controller.abort()
    await expect(running).rejects.toMatchObject({ code: 'connection_creation_changed' })
    let closed = false
    const closing = closeConnectionCreationWork().then(() => {
      closed = true
    })
    await expect(f.connect()).rejects.toMatchObject({ code: 'provider_unavailable' })
    expect(closed).toBe(false)
    release.resolve()
    await closing
    expect(closed).toBe(true)
    expect((await f.rows())[0]?.state).toBe('compensating')
    expect((await f.rows())[0]?.settledAt).not.toBeNull()
  })
})
