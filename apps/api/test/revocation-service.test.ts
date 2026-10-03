import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider, type ProviderContext } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { processNextRevocation, revocationsForProfile } from '../src/revocation-outbox.js'
import { DemoService } from '../src/service.js'

class RetryProvider extends MockItalianProvider {
  fail = true
  calls = 0
  override async disconnect(context: ProviderContext) {
    this.calls += 1
    if (this.fail) throw new Error('PRIVATE revocation token and financial data')
    await super.disconnect(context)
  }
}
let handle: DatabaseHandle
const profileIds: string[] = []
const initialTime = '2026-10-03T12:00:00.000Z'
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const profileId of profileIds) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, profileId))
    await handle.db
      .delete(schema.revocationJobs)
      .where(eq(schema.revocationJobs.profileId, profileId))
  }
  await handle.close()
})
const fixture = async () => {
  const profileId = `revocation_${randomUUID()}`
  profileIds.push(profileId)
  const provider = new RetryProvider()
  let now = initialTime
  const service = new DemoService(handle.db, profileId, provider, () => now)
  await service.bootstrap(true)
  return {
    service,
    provider,
    profileId,
    setTime: (value: string) => {
      now = value
    },
  }
}

describe('revocation integrated with local consent denial and erasure', () => {
  test('failed remote acknowledgement stays durable, denies sync and regrant, then retry unlocks the same identities', async () => {
    const { service, provider, profileId, setTime } = await fixture()
    const initial = await service.overview()
    const connection = initial.connections[0]
    if (!connection) throw new Error('Missing synthetic connection')
    await service.disconnect(connection.id)
    expect(provider.calls).toBe(0)
    expect(
      await processNextRevocation(handle.db, [provider], { profileId, now: service.now }),
    ).toMatchObject({ state: 'pending', attempts: 1 })
    await expect(service.sync(connection.id)).rejects.toMatchObject({ code: 'consent_inactive' })
    await expect(service.connect()).rejects.toMatchObject({
      code: 'revocation_pending',
      status: 409,
    })
    const [pending] = await revocationsForProfile(handle.db, profileId)
    expect(pending).toMatchObject({
      state: 'pending',
      attempts: 1,
      lastErrorCode: 'provider_unavailable',
    })
    const exported = await service.export()
    expect(exported.revocationJobs).toHaveLength(1)
    expect(JSON.stringify(exported.revocationJobs)).not.toContain('PRIVATE')
    await service.disconnect(connection.id)
    expect(await revocationsForProfile(handle.db, profileId)).toHaveLength(1)
    provider.fail = false
    setTime(pending?.nextAttemptAt ?? '')
    expect(
      await processNextRevocation(handle.db, [provider], {
        jobId: pending?.id ?? '',
        now: service.now,
      }),
    ).toMatchObject({ state: 'completed', attempts: 2 })
    expect((await service.connect()).id).toBe(connection.id)
    const current = await service.overview()
    expect(current.transactions.map((transaction) => transaction.id)).toEqual(
      initial.transactions.map((transaction) => transaction.id),
    )
    expect((await service.revocations()).revocations).toHaveLength(1)
  })

  test('erasure removes financial data while preserving retry; worker never resurrects the profile', async () => {
    const { service, provider, profileId, setTime } = await fixture()
    await service.erase()
    expect(provider.calls).toBe(0)
    expect(
      await processNextRevocation(handle.db, [provider], { profileId, now: service.now }),
    ).toMatchObject({ state: 'pending', attempts: 1 })
    await expect(service.overview()).rejects.toMatchObject({ status: 404 })
    expect(
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, profileId)),
    ).toEqual([])
    const [pending] = await revocationsForProfile(handle.db, profileId)
    expect(pending).toMatchObject({ state: 'pending', attempts: 1 })
    expect(
      await handle.db
        .select()
        .from(schema.profileTombstones)
        .where(eq(schema.profileTombstones.profileId, profileId)),
    ).toHaveLength(1)
    provider.fail = false
    setTime(pending?.nextAttemptAt ?? '')
    expect(
      await processNextRevocation(handle.db, [provider], {
        jobId: pending?.id ?? '',
        now: service.now,
      }),
    ).toMatchObject({ state: 'completed', attempts: 2 })
    await service.bootstrap(true)
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId)),
    ).toEqual([])
    await expect(service.revocations()).rejects.toMatchObject({ status: 404 })
  })

  test('a failed acknowledgement survives disk close/reopen and restarts with the persisted generation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-revocation-'))
    let disk: DatabaseHandle | undefined
    try {
      disk = await openDatabase({ driver: 'pglite', path: directory })
      const profileId = `disk_${randomUUID()}`
      const provider = new RetryProvider()
      const first = new DemoService(disk.db, profileId, provider, () => initialTime)
      await first.bootstrap(true)
      const connection = (await first.overview()).connections[0]
      if (!connection) throw new Error('Missing synthetic connection')
      await first.disconnect(connection.id)
      await processNextRevocation(disk.db, [provider], { profileId, now: first.now })
      const [pending] = await revocationsForProfile(disk.db, profileId)
      await disk.close()
      disk = undefined
      disk = await openDatabase({ driver: 'pglite', path: directory })
      expect((await revocationsForProfile(disk.db, profileId))[0]).toEqual(pending)
      provider.fail = false
      expect(
        await processNextRevocation(disk.db, [provider], {
          jobId: pending?.id ?? '',
          now: () => pending?.nextAttemptAt ?? '',
        }),
      ).toMatchObject({ state: 'completed', attempts: 2 })
      const resumed = new DemoService(
        disk.db,
        profileId,
        provider,
        () => pending?.nextAttemptAt ?? '',
      )
      expect((await resumed.connect()).id).toBe(connection.id)
    } finally {
      if (disk) await disk.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
