import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import {
  ITALIAN_TRANSACTIONS,
  MockItalianProvider,
  type ProviderContext,
  type ProviderTransaction,
  SyntheticSyncFailure,
  type SyntheticSyncMetadata,
  type SyntheticSyncPageRequest,
  type SyntheticSyncSnapshot,
  stableId,
} from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import {
  ConsentLifecycleService,
  recordConsentGranted,
  recordConsentRevoked,
} from '../src/consent-lifecycle.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import {
  DEFAULT_RUNTIME_CONFIGURATION,
  DEFAULT_SYNC_CONFIGURATION,
  type RuntimeConfigurationSnapshot,
  type SyncConfiguration,
} from '../src/runtime-config.js'
import { DemoService } from '../src/service.js'
import { assertSyncOwnershipReferences, syncOwnershipExport } from '../src/sync-export.js'
import { createSyncForegroundRefresher } from '../src/sync-foreground.js'
import { SyncCoordinator } from '../src/sync-jobs.js'
import { activeSyncTransactions, syncReviewItems } from '../src/sync-ledger.js'
import { createSyncPump } from '../src/sync-maintenance.js'
import { syncHash } from '../src/sync-provider.js'
import {
  syncActivity,
  syncIssues,
  syncJobs,
  syncPresence,
  syncReservations,
  syncStages,
} from '../src/sync-schema.js'

let handle: DatabaseHandle
const profiles: string[] = []
const base = '2026-10-03T12:00:00.000Z'
const row = (
  id: string,
  amount = '-1.00',
  date = '2026-10-01',
  extra: Partial<ProviderTransaction> = {},
): ProviderTransaction => ({
  id,
  accountId: 'conto',
  amount,
  currency: 'EUR',
  description: `Fixture ${id}`,
  status: 'booked',
  bookedOn: date,
  ...extra,
})
class Provider extends MockItalianProvider {
  opens = 0
  openModes: ('user_present' | 'unattended')[] = []
  calls: SyntheticSyncPageRequest[] = []
  metadata: Partial<SyntheticSyncMetadata> = {}
  onOpen?: () => Promise<void>
  onPage?: (request: SyntheticSyncPageRequest) => Promise<void>
  pageFailure: unknown = null
  pageMutation?: (value: Awaited<ReturnType<MockItalianProvider['getSyncPage']>>) => unknown
  snapshotMutation?: (value: SyntheticSyncSnapshot) => SyntheticSyncSnapshot
  override syncMetadata() {
    return { ...super.syncMetadata(), ...this.metadata }
  }
  override async openSync(context: ProviderContext, mode: 'user_present' | 'unattended') {
    this.opens++
    this.openModes.push(mode)
    await this.onOpen?.()
    const value = await super.openSync(context, mode)
    return this.snapshotMutation?.({ ...value, observedAt: base }) ?? { ...value, observedAt: base }
  }
  override async getSyncPage(context: ProviderContext, request: SyntheticSyncPageRequest) {
    this.calls.push({ ...request })
    await this.onPage?.(request)
    if (this.pageFailure) {
      const error = this.pageFailure
      this.pageFailure = null
      throw error
    }
    const value = await super.getSyncPage(context, request)
    return (this.pageMutation?.(value) ?? value) as typeof value
  }
}
function snapshot(
  config: Partial<SyncConfiguration> = {},
  revision = 7,
): RuntimeConfigurationSnapshot {
  const values = {
    ...DEFAULT_RUNTIME_CONFIGURATION,
    sync: { ...DEFAULT_SYNC_CONFIGURATION, ...config },
  }
  return {
    revision,
    schemaVersion: 1,
    values,
    digest: syncHash(values),
    previousRevision: null,
    rollbackRevision: null,
    action: 'bootstrap',
    actor: 'bootstrap',
    reason: 'initial_setup',
    createdAt: base,
  }
}
async function fixture(
  records: readonly ProviderTransaction[] = [row('one')],
  config: Partial<SyncConfiguration> = {},
) {
  const profileId = `sync_profile_${randomUUID()}`,
    connectionId = `sync_connection_${randomUUID()}`,
    consentId = `sync_consent_${randomUUID()}`,
    provider = new Provider(records)
  profiles.push(profileId)
  let clock = base
  const now = () => clock,
    setNow = (value: string) => {
      clock = value
    }
  await handle.db.insert(schema.profiles).values({
    id: profileId,
    name: 'Synthetic durable sync',
    timezone: 'Europe/Rome',
    createdAt: base,
  })
  const grant = await provider.createConnection({ profileId, connectionId, grantId: consentId })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: provider.id,
    institutionId: 'synthetic-italian',
    status: 'active',
    createdAt: base,
    lastSyncedAt: null,
  })
  await handle.db.insert(schema.consents).values({
    id: consentId,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: base,
    expiresAt: grant.consentExpiresAt,
    provider: provider.id,
  })
  await handle.db.transaction((db) =>
    recordConsentGranted(
      db,
      profileId,
      connectionId,
      consentId,
      { discovery: provider.discoveryMetadata(), authorization: grant.authorization },
      base,
    ),
  )
  const configuration = snapshot(config)
  const coordinator = new SyncCoordinator({
    scope: handle.withProfile,
    profileId,
    provider,
    configuration,
    now,
  })
  const start = (
    mode: 'user_present' | 'unattended' = 'user_present',
    interval: { from?: string; to?: string } = {},
  ) => coordinator.start(connectionId, { requestId: randomUUID(), mode, ...interval })
  const count = async (
    table:
      | typeof schema.transactions
      | typeof schema.accounts
      | typeof syncReservations
      | typeof syncStages,
  ) => (await handle.db.select().from(table).where(eq(table.profileId, profileId))).length
  const service = new DemoService(handle.db, profileId, provider, now)
  return {
    profileId,
    connectionId,
    consentId,
    provider,
    coordinator,
    configuration,
    now,
    setNow,
    start,
    count,
    service,
  }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  await handle.close()
})

describe('durable synthetic sync', () => {
  test('default Italian adapter partitions only its synthetic bank records and completes actual durable ingestion', async () => {
    const f = await fixture(ITALIAN_TRANSACTIONS),
      bank = ITALIAN_TRANSACTIONS.filter(
        (record) => record.source === undefined || record.source === 'bank',
      ),
      job = await f.start(),
      result = await f.coordinator.wait(job.id)
    expect(result.state).toBe('completed')
    expect(result.report.payloadRecords).toBe(bank.length)
    expect(result.report.processedRecords).toBe(bank.length)
    expect(await f.count(schema.transactions)).toBe(
      new Set(bank.map((record) => `${record.accountId}:${record.id}`)).size,
    )
    expect(
      (
        await handle.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.profileId, f.profileId))
      ).every((row) => row.source === 'bank'),
    ).toBe(true)
    const legacy = await f.provider.getTransactions(
      { profileId: f.profileId, connectionId: f.connectionId, grantId: f.consentId },
      'conto',
    )
    expect(legacy.transactions.length).toBeGreaterThan(0)
    expect(ITALIAN_TRANSACTIONS.some((record) => record.source === 'csv')).toBe(true)
  })
  test('claim and budget are committed before provider I/O, exact ledger report accounts for every payload', async () => {
    const f = await fixture([row('a', '-12.34'), row('b', '8.10')])
    f.provider.onOpen = async () => {
      const stored = await handle.db
        .select()
        .from(syncJobs)
        .where(eq(syncJobs.profileId, f.profileId))
      expect(stored[0]?.state).toBe('running')
      expect(stored[0]?.leaseToken).toBeTruthy()
      expect(await f.count(syncReservations)).toBe(1)
    }
    const job = await f.start(),
      result = await f.coordinator.wait(job.id)
    expect(result.state).toBe('completed')
    expect(result.configurationRevision).toBe(7)
    expect(result.report).toMatchObject({
      inserted: 2,
      payloadRecords: 2,
      processedRecords: 2,
      pages: 5,
      coverage: 'complete_requested_interval',
    })
    expect(result.report.balances).toHaveLength(5)
    expect(result.report.balances.every((result) => result.result === 'not_comparable')).toBe(true)
    const data = await f.service.data()
    expect(data.transactions.map((tx) => tx.amount.amountMinor).sort()).toEqual([-1234n, 810n])
    expect(await f.count(syncStages)).toBe(0)
    const replay = await f.coordinator.run(job.id)
    expect(replay).toEqual(result)
    expect(f.provider.opens).toBe(1)
  })
  test('idempotent request binds parameters and denies concurrent overlapping jobs', async () => {
    const f = await fixture(),
      input = {
        requestId: randomUUID(),
        mode: 'user_present' as const,
        from: '2026-10-01',
        to: '2026-10-03',
      }
    const job = await f.coordinator.start(f.connectionId, input)
    expect(await f.coordinator.start(f.connectionId, input)).toEqual(job)
    await expect(
      f.coordinator.start(f.connectionId, { ...input, from: '2026-09-30' }),
    ).rejects.toMatchObject({ code: 'sync_request_conflict' })
    await expect(f.start()).rejects.toMatchObject({ code: 'sync_in_progress' })
    expect(f.provider.opens).toBe(0)
  })
  test('bounded slices checkpoint real windows/pages and restart from cursor with unchanged financial freshness', async () => {
    const f = await fixture(
      Array.from({ length: 19 }, (_, n) =>
        row(String(n), '-1.00', n < 10 ? '2026-09-01' : '2026-10-01'),
      ),
      { maxPagesPerSlice: 1 },
    )
    const job = await f.start(),
      first = await f.coordinator.run(job.id)
    expect(first.state).toBe('partial')
    expect(first.report.pages).toBe(1)
    expect(first.report.windowsCompleted).toBe(0)
    expect(await f.count(schema.transactions)).toBe(0)
    expect(await f.count(schema.accounts)).toBe(0)
    expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBeNull()
    const restarted = new SyncCoordinator({
      scope: handle.withProfile,
      profileId: f.profileId,
      provider: f.provider,
      configuration: snapshot({ maxPagesPerSlice: 100 }, 99),
      now: f.now,
    })
    const second = await restarted.run(job.id)
    expect(second.state).toBe('partial')
    expect(second.configurationRevision).toBe(7)
    expect(f.provider.calls[1]?.cursor).toBe('7')
    expect(f.provider.opens).toBe(1)
    const complete = await restarted.wait(job.id)
    expect(complete.state).toBe('completed')
    expect(complete.report.inserted).toBe(19)
    expect(
      f.provider.calls.every(
        (page) => (Date.parse(page.to) - Date.parse(page.from)) / 86_400_000 < 14,
      ),
    ).toBe(true)
    expect(await f.count(syncReservations)).toBe(1)
  })
  test('partial provider failure preserves checkpoint and retries without another refresh charge', async () => {
    const f = await fixture(
      Array.from({ length: 9 }, (_, n) => row(String(n))),
      { maxPagesPerSlice: 1, retryBaseMs: 1 },
    )
    const job = await f.start()
    await f.coordinator.run(job.id)
    f.provider.pageFailure = new Error('secret provider text must not persist')
    const failed = await f.coordinator.run(job.id)
    expect(failed.state).toBe('retry_wait')
    expect(failed.reason).toBe('provider_unavailable')
    expect(JSON.stringify(failed)).not.toContain('secret')
    expect(await f.count(schema.transactions)).toBe(0)
    f.setNow('2026-10-03T12:00:00.010Z')
    const complete = await f.coordinator.wait(job.id)
    expect(complete.state).toBe('completed')
    expect(complete.report.inserted).toBe(9)
    expect(f.provider.opens).toBe(1)
    expect(await f.count(syncReservations)).toBe(1)
  })
  test('provider timeout cannot later commit and attempts remain bounded', async () => {
    const f = await fixture([row('a')], { attemptTimeoutMs: 10, maxAttempts: 1 })
    let release!: () => void
    f.provider.onOpen = () =>
      new Promise<void>((resolve) => {
        release = resolve
      })
    const job = await f.start(),
      result = await f.coordinator.run(job.id)
    expect(result.state).toBe('failed')
    expect(result.reason).toBe('timeout')
    expect(await f.count(syncReservations)).toBe(1)
    release()
    await Promise.resolve()
    expect(await f.count(schema.transactions)).toBe(0)
    expect((await f.coordinator.run(job.id)).state).toBe('failed')
    expect(f.provider.opens).toBe(1)
  })
  test('lease expiry and takeover fence the earlier delayed snapshot response', async () => {
    const f = await fixture([row('a')], { attemptTimeoutMs: 5000, leaseMs: 5000 })
    let entered!: () => void, release!: () => void
    const pending = new Promise<void>((resolve) => {
        entered = resolve
      }),
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
    f.provider.onOpen = async () => {
      entered()
      await gate
    }
    const job = await f.start(),
      old = f.coordinator.run(job.id)
    await pending
    f.setNow('2026-10-03T12:00:06.000Z')
    f.provider.onOpen = undefined
    const replacement = await f.coordinator.wait(job.id)
    expect(replacement.state).toBe('completed')
    expect(replacement.leaseEpoch).toBe(2)
    release()
    const late = await old
    expect(late.state).toBe('completed')
    expect(await f.count(schema.transactions)).toBe(1)
    expect(await f.count(syncReservations)).toBe(2)
  })
  test('revoke/pause while provider call is in flight prevents final financial writes', async () => {
    for (const operation of ['revoke', 'pause'] as const) {
      const f = await fixture([row('a')])
      let entered!: () => void, release!: () => void
      const pending = new Promise<void>((resolve) => {
          entered = resolve
        }),
        gate = new Promise<void>((resolve) => {
          release = resolve
        })
      f.provider.onPage = async () => {
        entered()
        await gate
      }
      const job = await f.start(),
        running = f.coordinator.run(job.id)
      await pending
      await handle.withProfile(f.profileId, async (db) => {
        if (operation === 'revoke') {
          await db
            .update(schema.consents)
            .set({ revokedAt: base })
            .where(eq(schema.consents.id, f.consentId))
          await db
            .update(schema.connections)
            .set({ status: 'revoked' })
            .where(eq(schema.connections.id, f.connectionId))
          await recordConsentRevoked(db, f.profileId, f.connectionId, base)
        } else {
          const service = new ConsentLifecycleService(db, f.profileId, f.provider, f.now)
          const current = await service.get(f.connectionId)
          await service.pause(f.connectionId, current.revision)
        }
      })
      release()
      const result = await running
      expect(result.state).toBe('blocked')
      expect(result.reason).toBe('consent_inactive')
      expect(await f.count(schema.transactions)).toBe(0)
      expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBeNull()
    }
  })
  test('changed consent generation rejects the delayed final page', async () => {
    const f = await fixture([row('a')])
    let release!: () => void, entered!: () => void
    const gate = new Promise<void>((resolve) => {
        release = resolve
      }),
      ready = new Promise<void>((resolve) => {
        entered = resolve
      })
    f.provider.onPage = async () => {
      entered()
      await gate
    }
    const job = await f.start(),
      running = f.coordinator.run(job.id)
    await ready
    const next = `sync_consent_${randomUUID()}`
    await handle.withProfile(f.profileId, async (db) => {
      await db
        .update(schema.consents)
        .set({ revokedAt: base })
        .where(eq(schema.consents.id, f.consentId))
      await db.insert(schema.consents).values({
        id: next,
        profileId: f.profileId,
        connectionId: f.connectionId,
        purpose: 'account_information',
        grantedAt: '2026-10-03T12:00:00.001Z',
        expiresAt: '2027-03-31T23:59:59Z',
        provider: f.provider.id,
      })
      const grant = await f.provider.createConnection({
        profileId: f.profileId,
        connectionId: f.connectionId,
        grantId: next,
      })
      await recordConsentGranted(
        db,
        f.profileId,
        f.connectionId,
        next,
        { discovery: f.provider.discoveryMetadata(), authorization: grant.authorization },
        base,
      )
    })
    release()
    const result = await running
    expect(result.state).toBe('blocked')
    expect(await f.count(schema.transactions)).toBe(0)
  })
  test('fixed provider budget and local one-per-UTC-day policy count attempted refreshes across short windows', async () => {
    const f = await fixture()
    f.provider.metadata = {
      unattendedBudget: {
        requests: 4,
        windowSeconds: 3600,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: 'synthetic-short-window',
      },
    }
    await f.coordinator.recordActivity()
    const first = await f.start('unattended')
    expect((await f.coordinator.wait(first.id)).state).toBe('completed')
    f.setNow('2026-10-03T13:00:00.000Z')
    const second = await f.start('unattended'),
      denied = await f.coordinator.run(second.id)
    expect(denied.state).toBe('blocked')
    expect(denied.reason).toBe('budget_reached')
    expect(f.provider.opens).toBe(1)
    f.setNow('2026-10-04T12:00:00.000Z')
    const third = await f.start('unattended')
    expect((await f.coordinator.wait(third.id)).state).toBe('completed')
    expect(f.provider.opens).toBe(2)
  })
  test('unknown budget, unsupported user presence and inactivity make no provider calls', async () => {
    for (const cause of ['unknown', 'unsupported', 'inactive'] as const) {
      const f = await fixture()
      if (cause === 'unknown') f.provider.metadata = { unattendedBudget: null }
      if (cause === 'unsupported') f.provider.metadata = { userPresent: 'unsupported' }
      await f.coordinator.recordActivity()
      if (cause === 'inactive') f.setNow('2026-10-18T12:00:00.000Z')
      const job = await f.start(cause === 'unsupported' ? 'user_present' : 'unattended'),
        result = await f.coordinator.run(job.id)
      expect(result.state).toBe('blocked')
      expect(result.reason).toBe(cause === 'inactive' ? 'inactive' : 'policy_unknown')
      expect(f.provider.opens).toBe(0)
      expect(await f.count(syncReservations)).toBe(0)
    }
  })
  test('429 preserves real retry-after; no timer bypass or early fresh balance', async () => {
    const f = await fixture()
    f.provider.pageFailure = new SyntheticSyncFailure('rate_limited', 120)
    const job = await f.start(),
      failed = await f.coordinator.run(job.id)
    expect(failed.state).toBe('retry_wait')
    expect(failed.reason).toBe('rate_limited')
    expect(failed.availableAt).toBe('2026-10-03T12:02:00.000Z')
    const calls = f.provider.calls.length
    await f.coordinator.run(job.id)
    expect(f.provider.calls).toHaveLength(calls)
    expect(await f.count(schema.accounts)).toBe(0)
    f.setNow(failed.availableAt)
    expect((await f.coordinator.wait(job.id)).state).toBe('completed')
  })
  test('cursor repetition, foreign-account pages, oversized pages and record bounds fail without partial ingest', async () => {
    for (const cause of ['cursor', 'scope', 'oversize', 'records'] as const) {
      const f = await fixture(
        Array.from({ length: 9 }, (_, n) => row(String(n))),
        cause === 'records' ? { maxRecordsPerJob: 1 } : {},
      )
      f.provider.pageMutation = (value) =>
        cause === 'cursor'
          ? { ...value, nextCursor: '7' }
          : cause === 'scope'
            ? {
                ...value,
                transactions: [row('foreign', '-1.00', '2026-10-01', { accountId: 'other' })],
              }
            : cause === 'oversize'
              ? { ...value, transactions: Array.from({ length: 8 }, (_, n) => row(String(n))) }
              : value
      const job = await f.start(),
        result = await f.coordinator.wait(job.id)
      expect(result.state).toBe('failed')
      expect(result.reason).toBe(
        cause === 'records' ? 'bound_reached' : 'invalid_provider_contract',
      )
      expect(await f.count(schema.transactions)).toBe(0)
      expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBeNull()
    }
  })
  test('profile RLS hides another job and rejects foreign scope insert; budgets cannot be directly deleted', async () => {
    const a = await fixture(),
      b = await fixture(),
      job = await a.start()
    await a.coordinator.wait(job.id)
    await expect(b.coordinator.get(job.id)).rejects.toMatchObject({ code: 'not_found' })
    await handle.withProfile(b.profileId, async (db) => {
      expect(
        await db.select().from(syncReservations).where(eq(syncReservations.profileId, a.profileId)),
      ).toEqual([])
    })
    await expect(
      handle.withProfile(b.profileId, (db) =>
        db.insert(syncActivity).values({ profileId: a.profileId, lastUserPresentAt: base }),
      ),
    ).rejects.toThrow()
    await expect(
      handle.withProfile(a.profileId, (db) =>
        db.delete(syncReservations).where(eq(syncReservations.profileId, a.profileId)),
      ),
    ).rejects.toThrow()
    await expect(
      handle.withProfile(a.profileId, (db) => db.delete(syncJobs).where(eq(syncJobs.id, job.id))),
    ).rejects.toThrow()
    await handle.withProfile(a.profileId, (db) =>
      db.delete(schema.connections).where(eq(schema.connections.id, a.connectionId)),
    )
    expect(await a.count(syncReservations)).toBe(0)
    expect((await b.service.connection(b.connectionId)).id).toBe(b.connectionId)
  })
  test('absence alone conservatively retains pending; explicit same-source exact-money bridge replaces the overlay', async () => {
    const pending = row('pending', '-5.00', '2026-10-01', {
      status: 'pending',
      authorizedOn: '2026-10-01',
      bookedOn: undefined,
    })
    const records: ProviderTransaction[] = [pending],
      f = await fixture(records)
    const first = await f.start()
    await f.coordinator.wait(first.id)
    records.splice(0)
    const absent = await f.start()
    const missing = await f.coordinator.wait(absent.id)
    expect(missing.report.pendingUnresolved).toBe(1)
    expect(missing.report.pendingReplaced).toBe(0)
    let data = await f.service.data()
    expect(
      (await activeSyncTransactions(handle.db, f.profileId, data.transactions)).filter(
        (tx) => tx.status === 'pending',
      ),
    ).toHaveLength(1)
    records.push(row('booked', '-5.00', '2026-10-02', { relatedTransactionId: 'pending' }))
    const bridge = await f.start(),
      replaced = await f.coordinator.wait(bridge.id)
    expect(replaced.report.pendingReplaced).toBe(1)
    data = await f.service.data()
    expect(await f.count(schema.transactions)).toBe(2)
    expect(
      (await activeSyncTransactions(handle.db, f.profileId, data.transactions)).map(
        (tx) => tx.status,
      ),
    ).toEqual(['booked'])
    expect(
      (
        await handle.db.select().from(syncPresence).where(eq(syncPresence.profileId, f.profileId))
      ).find((row) => row.state === 'pending_replaced')?.evidence.rule,
    ).toBe('provider_link_exact')
  })
  test('two complete fetches flag source removal without changing canonical amounts or deleting user edits', async () => {
    const records: ProviderTransaction[] = [row('original', '-7.00')],
      f = await fixture(records)
    const first = await f.start()
    await f.coordinator.wait(first.id)
    const original = (await f.service.data()).transactions[0]
    if (!original) throw new Error('Missing retained transaction')
    await handle.db.insert(schema.feedback).values({
      profileId: f.profileId,
      transactionId: original.id,
      categoryId: 'food_groceries',
      scope: 'once',
      createdAt: base,
    })
    records.splice(0)
    const one = await f.start('user_present', { from: '2026-10-01' }),
      missing = await f.coordinator.wait(one.id)
    expect(missing.report.removedBySource).toBe(0)
    const same = await f.coordinator.run(one.id)
    expect(same.report.removedBySource).toBe(0)
    const two = await f.start('user_present', { from: '2026-10-01' }),
      removed = await f.coordinator.wait(two.id)
    expect(removed.report.removedBySource).toBe(1)
    const data = await f.service.data()
    expect(data.transactions[0]?.amount.amountMinor).toBe(-700n)
    expect(
      await handle.db
        .select()
        .from(schema.feedback)
        .where(eq(schema.feedback.transactionId, original.id)),
    ).toHaveLength(1)
    expect(removed.report.issues.some((issue) => issue.kind === 'removed_by_source')).toBe(true)
  })
  test('incomplete unknown coverage suppresses deletion detection and balance equality', async () => {
    const records: ProviderTransaction[] = [row('original')],
      f = await fixture(records)
    const first = await f.start()
    await f.coordinator.wait(first.id)
    records.splice(0)
    f.provider.pageMutation = (value) => ({ ...value, coverage: 'unknown' })
    for (let n = 0; n < 2; n++) {
      const job = await f.start('user_present', { from: '2026-10-01' }),
        result = await f.coordinator.wait(job.id)
      expect(result.report.coverage).toBe('unknown')
      expect(result.report.removedBySource).toBe(0)
      expect(result.report.balances.every((balance) => balance.result === 'not_comparable')).toBe(
        true,
      )
    }
  })
  test('anchored matching balance is exact, mismatch creates a durable issue without fabricated adjustment', async () => {
    for (const amount of ['9.00', '8.99']) {
      const f = await fixture([row('expense', '-1.00')])
      f.provider.snapshotMutation = (value) => ({
        ...value,
        accounts: value.accounts.map((account) =>
          account.id === 'conto' ? { ...account, balance: amount } : account,
        ),
        balances: value.balances.map((balance) =>
          balance.accountId === 'conto'
            ? {
                ...balance,
                amount,
                type: 'booked',
                referenceDate: '2026-10-03',
                opening: { amount: '10.00', date: '2026-09-30', type: 'booked' },
              }
            : balance,
        ),
      })
      const job = await f.start(),
        result = await f.coordinator.wait(job.id),
        check = result.report.balances.find(
          (balance) =>
            balance.accountId ===
            stableId('account', f.profileId, f.connectionId, f.provider.id, 'conto'),
        )
      if (!check) throw new Error('Missing balance comparison')
      expect(check.expectedAmountMinor).toBe('900')
      expect(check.result).toBe(amount === '9.00' ? 'equal' : 'mismatch')
      expect(result.report.inserted).toBe(1)
      expect(
        result.report.issues.filter((issue) => issue.kind === 'balance_mismatch'),
      ).toHaveLength(amount === '9.00' ? 0 : 1)
      const data = await f.service.data()
      expect(data.transactions[0]?.amount.amountMinor).toBe(-100n)
    }
  })
  test('scheduler reloads configuration, bounds profiles, prevents overlap, and awaits in-flight shutdown', async () => {
    const f = await fixture()
    await f.coordinator.recordActivity()
    let config = snapshot({ profileLimit: 1 }),
      loads = 0,
      entered!: () => void,
      release!: () => void
    const ready = new Promise<void>((resolve) => {
        entered = resolve
      }),
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
    f.provider.onOpen = async () => {
      entered()
      await gate
    }
    const pump = createSyncPump({
      configuration: async () => {
        loads++
        return config
      },
      profiles: async (limit) => {
        expect(limit).toBe(1)
        return [f.profileId]
      },
      coordinator: (_id, captured) =>
        new SyncCoordinator({ ...f.coordinator.options, configuration: captured }),
    })
    const running = pump.runOnce()
    await ready
    expect(pump.runOnce()).toBe(running)
    let closed = false
    const closing = pump.close().then(() => {
      closed = true
    })
    await Promise.resolve()
    expect(closed).toBe(false)
    release()
    await running
    await closing
    expect(closed).toBe(true)
    expect(await pump.runOnce()).toEqual([])
    expect(loads).toBe(1)
    config = snapshot({ enabled: false }, 8)
    const disabled = createSyncPump({
      configuration: async () => config,
      profiles: async () => [f.profileId],
      coordinator: () => f.coordinator,
    })
    expect(await disabled.runOnce()).toEqual([])
    await disabled.close()
  })
  test('actual HTTP start/resume/report use independently committed server scope and strict user-present bodies', async () => {
    const f = await fixture([row('http', '-1.23')], { maxPagesPerSlice: 1 }),
      other = await fixture()
    f.provider.onOpen = async () => {
      expect(await f.count(syncReservations)).toBe(1)
      expect(
        (await handle.db.select().from(syncJobs).where(eq(syncJobs.profileId, f.profileId)))[0]
          ?.state,
      ).toBe('running')
    }
    const app = await createApp({
      db: handle.db,
      financialScope: handle.withProfile,
      profileId: f.profileId,
      provider: f.provider,
      now: f.now,
      demoMode: true,
      seed: false,
      syncConfiguration: async () => f.configuration,
    })
    try {
      for (const body of [
        { connectionId: f.connectionId, requestId: randomUUID(), mode: 'unattended' },
        {
          connectionId: f.connectionId,
          requestId: randomUUID(),
          mode: 'user_present',
          profileId: other.profileId,
        },
      ]) {
        const denied = await app.inject({ method: 'POST', url: '/v1/sync/start', payload: body })
        expect(denied.statusCode).toBe(400)
      }
      const invalid = await app.inject({
        method: 'POST',
        url: '/v1/sync/start',
        payload: {
          connectionId: f.connectionId,
          requestId: randomUUID(),
          mode: 'user_present',
          from: '2026-02-31',
        },
      })
      expect(invalid.statusCode).toBe(422)
      const started = await app.inject({
        method: 'POST',
        url: '/v1/sync/start',
        payload: { connectionId: f.connectionId, requestId: randomUUID(), mode: 'user_present' },
      })
      expect(started.statusCode).toBe(200)
      const job = started.json()
      expect(job.state).toBe('queued')
      expect(f.provider.opens).toBe(0)
      const first = await app.inject({
        method: 'POST',
        url: `/v1/sync/${job.id}/resume`,
        payload: {},
      })
      expect(first.statusCode).toBe(200)
      expect(first.json().state).toBe('partial')
      expect(await f.count(schema.transactions)).toBe(0)
      const get = await app.inject({ method: 'GET', url: `/v1/sync/${job.id}` })
      expect(get.statusCode).toBe(200)
      expect(get.json().report.pages).toBe(1)
      expect(get.json()).not.toHaveProperty('leaseToken')
      expect(get.json()).not.toHaveProperty('providerPolicy')
      const list = await app.inject({
        method: 'GET',
        url: `/v1/connections/${f.connectionId}/sync-jobs`,
      })
      expect(list.statusCode).toBe(200)
      expect(list.json()).toHaveLength(1)
      const otherJob = await other.start()
      expect((await app.inject({ method: 'GET', url: `/v1/sync/${otherJob.id}` })).statusCode).toBe(
        404,
      )
      let result = first.json()
      for (let n = 0; n < 10 && result.state !== 'completed'; n++) {
        const resumed = await app.inject({
          method: 'POST',
          url: `/v1/sync/${job.id}/resume`,
          payload: {},
        })
        expect(resumed.statusCode).toBe(200)
        result = resumed.json()
      }
      expect(result.state).toBe('completed')
      expect(result.report.inserted).toBe(1)
    } finally {
      await app.close()
    }
  })
  test('owner sync export retains source references while excluding raw stage, lease tokens and private provider text', async () => {
    const f = await fixture([row('export', '-3.21')]),
      job = await f.start()
    await f.coordinator.wait(job.id)
    const exported = await handle.withProfile(f.profileId, (db) =>
      syncOwnershipExport(db, f.profileId),
    )
    expect(exported.jobs).toHaveLength(1)
    expect(exported.reservations).toHaveLength(1)
    expect(JSON.stringify(exported)).not.toContain('Fixture export')
    expect(JSON.stringify(exported)).not.toContain('leaseToken')
    expect(JSON.stringify(exported)).not.toContain('providerPolicy')
    expect(JSON.stringify(exported)).not.toContain('"payload":')
    const transactions = (
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, f.profileId))
    ).map((row) => ({ ...row, amount: { amountMinor: row.amountMinor, currency: row.currency } }))
    const refs = {
      profileId: f.profileId,
      exportedAt: base,
      connections: await handle.db
        .select()
        .from(schema.connections)
        .where(eq(schema.connections.profileId, f.profileId)),
      consents: await handle.db
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.profileId, f.profileId)),
      accounts: await handle.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, f.profileId)),
      transactions,
    }
    expect(() => assertSyncOwnershipReferences(exported, refs)).not.toThrow()
    const tampered = structuredClone(exported)
    const tamperedOutcome = tampered.jobs[0]?.report.outcomes[0]
    if (!tamperedOutcome) throw new Error('Missing exported outcome')
    tamperedOutcome.transactionId = 'foreign_transaction'
    expect(() => assertSyncOwnershipReferences(tampered, refs)).toThrow(
      'Invalid sync outcome reference',
    )
    for (const cause of [
      'job_duplicate',
      'reservation_duplicate',
      'lease_duplicate',
      'presence_duplicate',
      'issue_duplicate',
      'updated_future',
      'snapshot_future',
      'reservation_prior',
      'issue_prior',
      'presence_prior',
      'activity_future',
    ] as const) {
      const modified = structuredClone(exported),
        job = modified.jobs[0],
        reservation = modified.reservations[0],
        presence = modified.presence[0],
        issue = modified.issues[0]
      if (!job || !reservation || !presence || !issue || !modified.activity)
        throw new Error('Missing complete synthetic export fixture')
      if (cause === 'job_duplicate') modified.jobs.push(structuredClone(job))
      if (cause === 'reservation_duplicate')
        modified.reservations.push(structuredClone(reservation))
      if (cause === 'lease_duplicate')
        modified.reservations.push({ ...reservation, id: 'different_identity_same_lease' })
      if (cause === 'presence_duplicate') modified.presence.push(structuredClone(presence))
      if (cause === 'issue_duplicate') modified.issues.push(structuredClone(issue))
      if (cause === 'updated_future') job.updatedAt = '2026-10-03T12:00:01.000Z'
      if (cause === 'snapshot_future') job.report.syncedAt = '2026-10-03T12:00:01.000Z'
      if (cause === 'reservation_prior') reservation.reservedAt = '2026-10-03T11:59:59.000Z'
      if (cause === 'issue_prior') issue.createdAt = '2026-10-03T11:59:59.000Z'
      if (cause === 'presence_prior') presence.updatedAt = '2026-10-03T11:59:59.000Z'
      if (cause === 'activity_future')
        modified.activity.lastUserPresentAt = '2026-10-03T12:00:01.000Z'
      expect(() => assertSyncOwnershipReferences(modified, refs), cause).toThrow()
    }
  })
  test('snapshot expiration discards only the incomplete checkpoint and charges the actual new refresh', async () => {
    const f = await fixture(
        Array.from({ length: 9 }, (_, n) => row(String(n))),
        { maxPagesPerSlice: 1, retryBaseMs: 1 },
      ),
      job = await f.start()
    await f.coordinator.run(job.id)
    f.provider.pageFailure = new SyntheticSyncFailure('snapshot_expired')
    const expired = await f.coordinator.run(job.id)
    expect(expired.reason).toBe('snapshot_expired')
    expect(await f.count(syncStages)).toBe(0)
    expect(await f.count(schema.transactions)).toBe(0)
    f.setNow('2026-10-03T12:00:00.010Z')
    const result = await f.coordinator.wait(job.id)
    expect(result.state).toBe('completed')
    expect(result.report.inserted).toBe(9)
    expect(f.provider.opens).toBe(2)
    expect(await f.count(syncReservations)).toBe(2)
  })
  test('expired checkpoint lease takeover resumes without a second refresh and rejects the delayed older page', async () => {
    const f = await fixture([row('a')], { attemptTimeoutMs: 5000, leaseMs: 5000 })
    let entered!: () => void, release!: () => void
    const ready = new Promise<void>((resolve) => {
        entered = resolve
      }),
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
    f.provider.onPage = async () => {
      entered()
      await gate
    }
    const job = await f.start(),
      old = f.coordinator.run(job.id)
    await ready
    expect(await f.count(syncStages)).toBe(1)
    f.setNow('2026-10-03T12:00:06.000Z')
    f.provider.onPage = undefined
    const takeover = await f.coordinator.wait(job.id)
    expect(takeover.state).toBe('completed')
    expect(f.provider.opens).toBe(1)
    expect(await f.count(syncReservations)).toBe(1)
    release()
    expect((await old).state).toBe('completed')
    expect(await f.count(schema.transactions)).toBe(1)
  })
  test('stage byte bound prevents oversized raw data from entering ledger or retained checkpoint', async () => {
    const f = await fixture(
        [row('large', '-1.00', '2026-10-01', { description: 'x'.repeat(2000) })],
        { maxStageBytes: 1024 },
      ),
      job = await f.start(),
      result = await f.coordinator.wait(job.id)
    expect(result.state).toBe('failed')
    expect(result.reason).toBe('bound_reached')
    expect(await f.count(schema.transactions)).toBe(0)
  })
  test('checkpoint raw content is encrypted with profile/job AAD and encrypted restart preserves exact money', async () => {
    const f = await fixture([row('encrypted', '-17.89')], { maxPagesPerSlice: 1 }),
      directory = await mkdtemp(join(tmpdir(), 'lilleri-sync-vault-'))
    try {
      const encryption = new ProfileEncryption(
        handle.db,
        await createLocalSyntheticKeyManagement({ directory, mode: 'demo' }),
        f.now,
      )
      const coordinator = new SyncCoordinator({ ...f.coordinator.options, encryption }),
        job = await coordinator.start(f.connectionId, {
          requestId: randomUUID(),
          mode: 'user_present',
        })
      const partial = await coordinator.run(job.id)
      expect(partial.state).toBe('partial')
      const [stage] = await handle.db.select().from(syncStages).where(eq(syncStages.jobId, job.id))
      expect(Object.keys(stage?.payload ?? {})).toEqual(['_lilleriEncrypted'])
      expect(JSON.stringify(stage)).not.toContain('Fixture encrypted')
      const cipher = stage?.payload._lilleriEncrypted
      expect(typeof cipher).toBe('string')
      await expect(
        encryption.decryptJson(
          handle.db,
          { profileId: f.profileId, table: 'sync_stages', column: 'payload', rowId: 'wrong-job' },
          String(cipher),
        ),
      ).rejects.toThrow()
      const restarted = new SyncCoordinator({ ...coordinator.options }),
        completed = await restarted.wait(job.id)
      expect(completed.state).toBe('completed')
      expect(await f.count(syncStages)).toBe(0)
      const [stored] = await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, f.profileId))
      expect(stored?.amountMinor).toBe(-1789n)
      expect(stored?.description).toMatch(/^lilleri:v1:/)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  test('expired checkpoints are physically cleaned in a bounded disabled pump without refunding reservations', async () => {
    const f = await fixture([row('retained')], { maxPagesPerSlice: 1, stageRetentionMs: 1000 }),
      job = await f.start()
    await f.coordinator.run(job.id)
    expect(await f.count(syncStages)).toBe(1)
    f.setNow('2026-10-03T12:00:01.000Z')
    const disabled = snapshot({ enabled: false, jobsPerProfile: 1 }),
      pump = createSyncPump({
        configuration: async () => disabled,
        profiles: async () => [f.profileId],
        coordinator: () =>
          new SyncCoordinator({ ...f.coordinator.options, configuration: disabled }),
      })
    try {
      expect(await pump.runOnce()).toEqual([])
    } finally {
      await pump.close()
    }
    expect(await f.count(syncStages)).toBe(0)
    expect(await f.count(syncReservations)).toBe(1)
    expect(await f.coordinator.get(job.id)).toMatchObject({
      state: 'failed',
      reason: 'snapshot_expired',
    })
    expect(await f.count(schema.transactions)).toBe(0)
  })
  test('provider-wide fixed-window budget counts refresh attempts across separate UTC days', async () => {
    const f = await fixture(),
      windowSeconds = 3 * 86400,
      windowStart = new Date(
        Math.ceil(Date.parse(base) / (windowSeconds * 1000)) * windowSeconds * 1000,
      )
    f.provider.metadata = {
      unattendedBudget: {
        requests: 2,
        windowSeconds,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: 'synthetic-multi-day-limit',
      },
    }
    for (let day = 0; day < 3; day++) {
      f.setNow(new Date(windowStart.getTime() + day * 86400000 + 12 * 3600000).toISOString())
      await f.coordinator.recordActivity()
      const job = await f.start('unattended'),
        result = await f.coordinator.wait(job.id)
      expect(result.state).toBe(day < 2 ? 'completed' : 'blocked')
      if (day === 2) expect(result.reason).toBe('budget_reached')
    }
    expect(f.provider.opens).toBe(2)
    expect(await f.count(syncReservations)).toBe(2)
  })
  test('shutdown awaits the configuration read before permitting storage to close', async () => {
    let release!: (value: RuntimeConfigurationSnapshot) => void,
      closed = false
    const pending = new Promise<RuntimeConfigurationSnapshot>((resolve) => {
      release = resolve
    })
    const pump = createSyncPump({
      configuration: () => pending,
      profiles: async () => [],
      coordinator: () => {
        throw new Error('No profile expected')
      },
    })
    const starting = pump.start(),
      closing = pump.close().then(() => {
        closed = true
      })
    await Promise.resolve()
    expect(closed).toBe(false)
    release(snapshot())
    await starting
    await closing
    expect(closed).toBe(true)
  })
  test('the actual synthetic adapter uses the captured server observation clock and preserves legacy booking dates', async () => {
    const f = await fixture(ITALIAN_TRANSACTIONS),
      provider = new MockItalianProvider(ITALIAN_TRANSACTIONS),
      context = { profileId: f.profileId, connectionId: f.connectionId, grantId: f.consentId }
    await provider.createConnection(context)
    const coordinator = new SyncCoordinator({ ...f.coordinator.options, provider }),
      job = await coordinator.start(f.connectionId, {
        requestId: randomUUID(),
        mode: 'user_present',
      }),
      result = await coordinator.wait(job.id)
    expect(result.state).toBe('completed')
    expect(result.report.syncedAt).toBe(base)
    expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBe(base)
    expect(
      (await f.service.data()).ledgerTransactions.every(
        (transaction) => transaction.observedAt === base,
      ),
    ).toBe(true)
    const legacy: ProviderTransaction[] = []
    let cursor: string | null = null
    do {
      const page = await provider.getTransactions(context, 'conto', cursor)
      legacy.push(...page.transactions)
      cursor = page.nextCursor
    } while (cursor !== null)
    expect(legacy.map((transaction) => transaction.bookedOn)).toEqual(
      ITALIAN_TRANSACTIONS.filter((transaction) => transaction.accountId === 'conto').map(
        (transaction) => transaction.bookedOn,
      ),
    )
    for (const value of ['2026-10-03', '2026-02-30T12:00:00.000Z', 'private-invalid'])
      await expect(provider.openSync(context, 'user_present', value)).rejects.toThrow(
        'Invalid synthetic observation instant',
      )
  })
  test('source fact proof receives only actually persisted scoped references and the final server clock', async () => {
    const f = await fixture([row('proof', '-12.34')]),
      calls: { at: string; transactionIds: string[]; observationIds: string[] }[] = []
    f.provider.onPage = async () => f.setNow('2026-10-03T12:00:01.000Z')
    const coordinator = new SyncCoordinator({
        ...f.coordinator.options,
        recordSourceFacts: async (db, input, at) => {
          expect(input).toMatchObject({
            profileId: f.profileId,
            connectionId: f.connectionId,
            consentId: f.consentId,
          })
          expect(at).toBe('2026-10-03T12:00:01.000Z')
          expect(input.accountIds.sort()).toEqual(
            (
              await db
                .select()
                .from(schema.accounts)
                .where(eq(schema.accounts.profileId, f.profileId))
            )
              .map((account) => account.id)
              .sort(),
          )
          expect(input.transactions).toEqual(
            (
              await db
                .select()
                .from(schema.transactions)
                .where(eq(schema.transactions.profileId, f.profileId))
            ).map((transaction) => ({ id: transaction.id, accountId: transaction.accountId })),
          )
          expect(input.observations).toEqual(
            (
              await db
                .select()
                .from(schema.observations)
                .where(eq(schema.observations.profileId, f.profileId))
            ).map((observation) => ({ id: observation.id, accountId: observation.accountId })),
          )
          calls.push({
            at,
            transactionIds: input.transactions.map((transaction) => transaction.id),
            observationIds: input.observations.map((observation) => observation.id),
          })
        },
      }),
      job = await coordinator.start(f.connectionId, {
        requestId: randomUUID(),
        mode: 'user_present',
      }),
      result = await coordinator.wait(job.id)
    expect(result.state).toBe('completed')
    expect(result.report.syncedAt).toBe(base)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.transactionIds).toHaveLength(1)
    expect(calls[0]?.observationIds).toHaveLength(1)
  })
  test('a failed source fact proof rolls back the complete financial commit and preserves its paid attempt', async () => {
    const f = await fixture(),
      coordinator = new SyncCoordinator({
        ...f.coordinator.options,
        recordSourceFacts: async () => {
          throw new Error('Synthetic proof failed')
        },
      }),
      job = await coordinator.start(f.connectionId, {
        requestId: randomUUID(),
        mode: 'user_present',
      }),
      result = await coordinator.run(job.id)
    expect(result.state).toBe('retry_wait')
    expect(await f.count(schema.accounts)).toBe(0)
    expect(await f.count(schema.transactions)).toBe(0)
    expect(
      await handle.db
        .select()
        .from(schema.observations)
        .where(eq(schema.observations.profileId, f.profileId)),
    ).toEqual([])
    expect(
      await handle.db
        .select()
        .from(schema.syncRuns)
        .where(eq(schema.syncRuns.profileId, f.profileId)),
    ).toEqual([])
    expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBeNull()
    expect(await f.count(syncReservations)).toBe(1)
  })
  test('bounded pump cursor visits every eligible profile before wrapping instead of starving later profiles', async () => {
    const fixtures = await Promise.all([
        fixture(undefined, { profileLimit: 1, jobsPerProfile: 1 }),
        fixture(undefined, { profileLimit: 1, jobsPerProfile: 1 }),
        fixture(undefined, { profileLimit: 1, jobsPerProfile: 1 }),
      ]),
      byProfile = new Map(fixtures.map((value) => [value.profileId, value])),
      ids = [...byProfile.keys()].sort(),
      seen: (string | null)[] = []
    for (const f of fixtures) await f.coordinator.recordActivity()
    const pump = createSyncPump({
      configuration: async () => snapshot({ profileLimit: 1, jobsPerProfile: 1 }),
      profiles: async (limit, after) => {
        seen.push(after ?? null)
        const remaining = ids.filter((id) => !after || id > after)
        return (remaining.length ? remaining : ids).slice(0, limit)
      },
      coordinator: (profileId) => {
        const value = byProfile.get(profileId)
        if (!value) throw new Error('Unknown trusted profile')
        return value.coordinator
      },
    })
    try {
      for (let index = 0; index < 4; index++) {
        const jobs = await pump.runOnce()
        expect(jobs[0]?.profileId).toBe(ids[index % 3])
      }
    } finally {
      await pump.close()
    }
    expect(seen).toEqual([null, ...ids])
    expect(fixtures.map((f) => f.provider.opens)).toEqual([1, 1, 1])
  })
  test('Inbox uses only the latest completed balance/history evidence and suppresses private account groups', async () => {
    const f = await fixture([row('review-balance', '-1.00')])
    const evidence =
      (amount: string, history: string | null) =>
      (value: SyntheticSyncSnapshot): SyntheticSyncSnapshot => ({
        ...value,
        historyFrom: { ...value.historyFrom, conto: history },
        accounts: value.accounts.map((account) =>
          account.id === 'conto' ? { ...account, balance: amount } : account,
        ),
        balances: value.balances.map((balance) =>
          balance.accountId === 'conto'
            ? {
                ...balance,
                amount,
                type: 'booked',
                referenceDate: '2026-10-03',
                opening: { amount: '10.00', date: '2026-09-30', type: 'booked' },
              }
            : balance,
        ),
      })
    f.provider.snapshotMutation = evidence('8.99', null)
    const first = await f.start('user_present', { from: '2026-10-01' })
    await f.coordinator.wait(first.id)
    let data = await f.service.data(),
      input = {
        transactions: data.ledgerTransactions,
        classifications: data.analysis.classifications,
        excludedTransactionIds: [] as string[],
      },
      items = await syncReviewItems(handle.db, f.profileId, input),
      transaction = data.ledgerTransactions[0]
    if (!transaction) throw new Error('Missing test transaction')
    expect(items.filter((item) => item.transactionIds.includes(transaction.id))).toHaveLength(2)
    expect(items.every((item) => item.type === 'balance')).toBe(true)
    const hidden = await syncReviewItems(handle.db, f.profileId, {
      ...input,
      excludedTransactionIds: [transaction.id],
    })
    expect(JSON.stringify(hidden)).not.toContain(transaction.id)
    expect(
      await syncReviewItems(handle.db, f.profileId, {
        ...input,
        classifications: [{ transactionId: transaction.id, categoryId: 'health' }],
      }),
    ).toEqual(hidden)
    f.setNow('2026-10-03T12:00:02.000Z')
    f.provider.snapshotMutation = evidence('9.00', '2026-10-01')
    const corrected = await f.start('user_present', { from: '2026-10-01' })
    await f.coordinator.wait(corrected.id)
    data = await f.service.data()
    input = {
      transactions: data.ledgerTransactions,
      classifications: data.analysis.classifications,
      excludedTransactionIds: [],
    }
    items = await syncReviewItems(handle.db, f.profileId, input)
    expect(items.filter((item) => item.transactionIds.includes(transaction.id))).toEqual([])
    expect(
      (await handle.db.select().from(syncIssues).where(eq(syncIssues.profileId, f.profileId))).some(
        (issue) => issue.kind === 'balance_mismatch',
      ),
    ).toBe(true)
  })
  test('Inbox retains one unresolved current source issue, hides private relations, and removes resolved attention without erasing history', async () => {
    const records = [
        row('pending-review', '-5.00', '2026-10-01', {
          status: 'pending',
          bookedOn: undefined,
          authorizedOn: '2026-10-01',
        }),
        row('removed-review', '-7.00', '2026-10-01', { relatedTransactionId: 'pending-review' }),
      ],
      f = await fixture(records)
    const first = await f.start('user_present', { from: '2026-10-01' })
    await f.coordinator.wait(first.id)
    const retained = await f.service.data()
    records.splice(0)
    for (let index = 1; index <= 3; index++) {
      f.setNow(`2026-10-03T12:00:0${index}.000Z`)
      const job = await f.start('user_present', { from: '2026-10-01' })
      await f.coordinator.wait(job.id)
    }
    const input = {
        transactions: retained.ledgerTransactions,
        classifications: retained.analysis.classifications,
        excludedTransactionIds: [] as string[],
      },
      items = await syncReviewItems(handle.db, f.profileId, input),
      retainedIds = retained.ledgerTransactions.map((transaction) => transaction.id)
    expect(
      items.filter(
        (item) =>
          (item.id.startsWith('sync-review:pending_absent:') ||
            item.id.startsWith('sync-review:removed_by_source:')) &&
          item.transactionIds.some((id) => retainedIds.includes(id)),
      ),
    ).toHaveLength(2)
    const pending = retained.ledgerTransactions.find(
      (transaction) => transaction.status === 'pending',
    )
    if (!pending) throw new Error('Missing pending test row')
    const hidden = await syncReviewItems(handle.db, f.profileId, {
      ...input,
      excludedTransactionIds: [pending.id],
    })
    for (const id of retainedIds) expect(JSON.stringify(hidden)).not.toContain(id)
    const historical = await syncOwnershipExport(handle.db, f.profileId)
    expect(
      historical.issues.filter((issue) => issue.transactionId !== null).length,
    ).toBeGreaterThan(2)
    records.push(
      row('pending-review', '-5.00', '2026-10-01', {
        status: 'pending',
        bookedOn: undefined,
        authorizedOn: '2026-10-01',
      }),
      row('removed-review', '-7.00', '2026-10-01', { relatedTransactionId: 'pending-review' }),
    )
    f.setNow('2026-10-03T12:00:04.000Z')
    const restored = await f.start('user_present', { from: '2026-10-01' })
    await f.coordinator.wait(restored.id)
    expect(
      (await syncReviewItems(handle.db, f.profileId, input)).filter((item) =>
        item.transactionIds.some((id) => retainedIds.includes(id)),
      ),
    ).toEqual([])
    const afterRestore = await syncOwnershipExport(handle.db, f.profileId)
    expect(
      afterRestore.issues.filter((issue) =>
        historical.issues.some((previous) => previous.id === issue.id),
      ),
    ).toEqual(historical.issues)
    expect(await f.count(schema.transactions)).toBe(2)
  })
  test('an authoritative pause prevents queued and checkpoint claims while re-enable retains captured policy and paid refresh', async () => {
    const f = await fixture(undefined, { maxPagesPerSlice: 1 }),
      job = await f.start(),
      disabled = new SyncCoordinator({
        ...f.coordinator.options,
        configuration: snapshot({ enabled: false }, 8),
      })
    await expect(
      disabled.start(f.connectionId, { requestId: randomUUID(), mode: 'user_present' }),
    ).rejects.toMatchObject({ code: 'sync_disabled' })
    expect((await disabled.run(job.id)).state).toBe('queued')
    expect(f.provider.opens).toBe(0)
    expect(await f.count(syncReservations)).toBe(0)
    const partial = await f.coordinator.run(job.id)
    expect(partial.state).toBe('partial')
    expect((await disabled.run(job.id)).report.pages).toBe(partial.report.pages)
    expect(f.provider.opens).toBe(1)
    expect(await f.count(syncReservations)).toBe(1)
    const enabled = new SyncCoordinator({
        ...f.coordinator.options,
        configuration: snapshot({ maxPagesPerSlice: 20 }, 9),
      }),
      resumed = await enabled.run(job.id)
    expect(resumed.report.pages).toBe(partial.report.pages + 1)
    expect(resumed.configurationRevision).toBe(7)
    expect(f.provider.opens).toBe(1)
    expect((await enabled.wait(job.id)).state).toBe('completed')
  })
  test('default catch-up includes the unsynchronised gap beyond the trailing correction interval in bounded windows', async () => {
    const f = await fixture([
      row('gap-january', '-1.00', '2026-01-02'),
      row('gap-july', '-2.00', '2026-07-15'),
      row('gap-october', '-3.00', '2026-10-01'),
    ])
    await handle.db
      .update(schema.connections)
      .set({ lastSyncedAt: '2026-01-01T12:00:00.000Z' })
      .where(eq(schema.connections.id, f.connectionId))
    const job = await f.start(),
      result = await f.coordinator.wait(job.id)
    expect(job.requestedFrom).toBe('2026-01-01')
    expect(result.state).toBe('completed')
    expect(result.report.payloadRecords).toBe(3)
    expect(
      f.provider.calls.some((call) => call.from <= '2026-07-15' && call.to >= '2026-07-15'),
    ).toBe(true)
    expect(
      f.provider.calls.every(
        (call) => (Date.parse(call.to) - Date.parse(call.from)) / 86400000 + 1 <= 14,
      ),
    ).toBe(true)
    expect(
      (await f.service.data()).ledgerTransactions.reduce(
        (total, transaction) => total + transaction.amount.amountMinor,
        0n,
      ),
    ).toBe(-600n)
  })
  test('foreground records actual user presence, debounces a single bounded slice and captures the original job policy', async () => {
    const f = await fixture(undefined, { maxPagesPerSlice: 1, foregroundDebounceMs: 1000 }),
      context = { profileId: f.profileId, sessionId: 'server-session', editor: true }
    f.setNow('2026-10-18T12:00:00.000Z')
    let config = f.configuration,
      reads = 0
    const refresher = createSyncForegroundRefresher({
      configuration: async () => {
        reads++
        return config
      },
      coordinator: (_profileId, snapshot) =>
        new SyncCoordinator({ ...f.coordinator.options, configuration: snapshot }),
      now: f.now,
    })
    try {
      expect(await refresher.refresh({ ...context, editor: false })).toBeNull()
      expect(reads).toBe(0)
      const [one, two] = await Promise.all([refresher.refresh(context), refresher.refresh(context)])
      expect(one?.state).toBe('partial')
      expect(two?.id).toBe(one?.id)
      expect(one?.mode).toBe('user_present')
      expect(f.provider.opens).toBe(1)
      expect(await f.count(schema.accounts)).toBe(0)
      expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBeNull()
      expect(
        (
          await handle.db.select().from(syncActivity).where(eq(syncActivity.profileId, f.profileId))
        )[0]?.lastUserPresentAt,
      ).toBe(f.now())
      expect(await refresher.refresh(context)).toBeNull()
      config = snapshot({ maxPagesPerSlice: 20, foregroundDebounceMs: 1000 }, 8)
      f.setNow('2026-10-18T12:00:01.000Z')
      const next = await refresher.refresh(context)
      expect(next?.id).toBe(one?.id)
      expect(next?.report.pages).toBe((one?.report.pages ?? 0) + 1)
      expect(next?.configurationRevision).toBe(7)
      expect(f.provider.opens).toBe(1)
      expect(await f.count(syncReservations)).toBe(1)
    } finally {
      await refresher.close()
    }
  })
  test('foreground never bypasses a current lease and uses an expired checkpoint without another paid refresh', async () => {
    const f = await fixture(undefined, { maxPagesPerSlice: 1, foregroundDebounceMs: 1000 }),
      job = await f.start()
    let entered!: () => void, release!: () => void
    const ready = new Promise<void>((resolve) => {
        entered = resolve
      }),
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
    f.provider.onPage = async () => {
      entered()
      await gate
    }
    const old = f.coordinator.run(job.id)
    await ready
    const refresher = createSyncForegroundRefresher({
        configuration: async () => f.configuration,
        coordinator: () => f.coordinator,
        now: f.now,
      }),
      context = { profileId: f.profileId, sessionId: 'server-lease-session', editor: true }
    try {
      expect(await refresher.refresh(context)).toBeNull()
      expect(f.provider.opens).toBe(1)
      expect(f.provider.calls).toHaveLength(1)
      f.setNow('2026-10-03T12:00:31.000Z')
      f.provider.onPage = undefined
      const takeover = await refresher.refresh(context)
      expect(takeover?.state).toBe('partial')
      expect(takeover?.leaseEpoch).toBe(2)
      expect(f.provider.opens).toBe(1)
      expect(await f.count(syncReservations)).toBe(1)
      release()
      expect((await old).state).toBe('partial')
      expect(await f.count(schema.transactions)).toBe(0)
    } finally {
      release()
      await old
      await refresher.close()
    }
  })
  test('foreground skips paused, revoked, unknown and disabled sources before provider work', async () => {
    for (const cause of ['paused', 'revoked', 'unknown', 'disabled'] as const) {
      const f = await fixture(),
        lifecycle = new ConsentLifecycleService(handle.db, f.profileId, f.provider, f.now)
      if (cause === 'paused') {
        const current = await lifecycle.get(f.connectionId)
        await lifecycle.pause(f.connectionId, current.revision)
      }
      if (cause === 'revoked')
        await handle.db.transaction((db) =>
          recordConsentRevoked(db, f.profileId, f.connectionId, base),
        )
      if (cause === 'unknown') f.provider.metadata = { userPresent: 'unknown' }
      const config = cause === 'disabled' ? snapshot({ enabled: false }) : f.configuration,
        refresher = createSyncForegroundRefresher({
          configuration: async () => config,
          coordinator: () =>
            new SyncCoordinator({ ...f.coordinator.options, configuration: config }),
          now: f.now,
        })
      try {
        expect(
          await refresher.refresh({
            profileId: f.profileId,
            sessionId: `server-${cause}`,
            editor: true,
          }),
        ).toBeNull()
        expect(f.provider.opens).toBe(0)
        expect(await f.count(syncReservations)).toBe(0)
      } finally {
        await refresher.close()
      }
    }
  })
  test('foreground shutdown awaits configuration and in-flight revoked work, preserving financial fences and bounded sessions', async () => {
    const a = await fixture(undefined, { foregroundSessionLimit: 1 }),
      b = await fixture(),
      context = { profileId: a.profileId, sessionId: 'server-a', editor: true }
    let entered!: () => void,
      release!: () => void,
      closed = false
    const ready = new Promise<void>((resolve) => {
        entered = resolve
      }),
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
    a.provider.onPage = async () => {
      entered()
      await gate
    }
    const refresher = createSyncForegroundRefresher({
        configuration: async () => a.configuration,
        coordinator: (profileId) => (profileId === a.profileId ? a.coordinator : b.coordinator),
        now: a.now,
      }),
      active = refresher.refresh(context)
    await ready
    expect(
      await refresher.refresh({ profileId: b.profileId, sessionId: 'server-b', editor: true }),
    ).toBeNull()
    expect(b.provider.opens).toBe(0)
    const closing = refresher.close().then(() => {
      closed = true
    })
    await Promise.resolve()
    expect(closed).toBe(false)
    await handle.db.transaction((db) => recordConsentRevoked(db, a.profileId, a.connectionId, base))
    release()
    expect((await active)?.state).toBe('blocked')
    await closing
    expect(closed).toBe(true)
    expect(await a.count(schema.transactions)).toBe(0)
    expect(await refresher.refresh(context)).toBeNull()
    let releaseRead!: (snapshot: RuntimeConfigurationSnapshot) => void,
      readClosed = false
    const readGate = new Promise<RuntimeConfigurationSnapshot>((resolve) => {
        releaseRead = resolve
      }),
      waiting = createSyncForegroundRefresher({
        configuration: () => readGate,
        coordinator: () => a.coordinator,
        now: a.now,
      }),
      pending = waiting.refresh(context),
      readClosing = waiting.close().then(() => {
        readClosed = true
      })
    await Promise.resolve()
    expect(readClosed).toBe(false)
    releaseRead(a.configuration)
    expect(await pending).toBeNull()
    await readClosing
    expect(readClosed).toBe(true)
  })
  test('future or impossible provider observation timestamps fail before checkpoint and financial freshness', async () => {
    for (const observedAt of ['2026-10-03T12:00:01.000Z', '2026-02-30T12:00:00.000Z']) {
      const f = await fixture()
      f.provider.snapshotMutation = (value) => ({ ...value, observedAt })
      const job = await f.start(),
        result = await f.coordinator.run(job.id)
      expect(result.state).toBe('failed')
      expect(result.reason).toBe('invalid_provider_contract')
      expect(await f.count(syncStages)).toBe(0)
      expect(await f.count(schema.accounts)).toBe(0)
      expect((await f.service.connection(f.connectionId)).lastSyncedAt).toBeNull()
      expect(await f.count(syncReservations)).toBe(1)
    }
  })
  test('Inbox is bounded to one hundred current items while the owner retains every source issue and canonical reference', async () => {
    const records = Array.from({ length: 101 }, (_, index) =>
        row(`bounded-pending-${index}`, '-1.00', '2026-10-01', {
          status: 'pending',
          bookedOn: undefined,
          authorizedOn: '2026-10-01',
        }),
      ),
      f = await fixture(records),
      first = await f.start('user_present', { from: '2026-10-01' })
    expect((await f.coordinator.wait(first.id)).state).toBe('completed')
    records.splice(0)
    f.setNow('2026-10-03T12:00:01.000Z')
    const absent = await f.start('user_present', { from: '2026-10-01' })
    expect((await f.coordinator.wait(absent.id)).state).toBe('completed')
    const data = await f.service.data(),
      items = await syncReviewItems(handle.db, f.profileId, {
        transactions: data.ledgerTransactions,
        classifications: data.analysis.classifications,
        excludedTransactionIds: [],
      }),
      owner = await syncOwnershipExport(handle.db, f.profileId)
    expect(items).toHaveLength(100)
    expect(owner.presence).toHaveLength(101)
    expect(owner.issues.filter((issue) => issue.kind === 'pending_absent')).toHaveLength(101)
    expect(
      data.ledgerTransactions.reduce(
        (total, transaction) => total + transaction.amount.amountMinor,
        0n,
      ),
    ).toBe(-10100n)
    expect(
      items.every((item) =>
        item.transactionIds.every((id) =>
          data.ledgerTransactions.some((transaction) => transaction.id === id),
        ),
      ),
    ).toBe(true)
  })
  test('background pump cannot mint user presence for due retries with missing or expired checkpoints', async () => {
    for (const cause of ['missing', 'expired'] as const) {
      const f = await fixture(undefined, { maxPagesPerSlice: 1, stageRetentionMs: 1000 })
      f.provider.metadata = { unattendedBudget: null }
      if (cause === 'missing')
        f.provider.onOpen = async () => {
          throw new SyntheticSyncFailure('unavailable')
        }
      const job = await f.start(),
        first = await f.coordinator.run(job.id)
      expect(first.state).toBe(cause === 'missing' ? 'retry_wait' : 'partial')
      expect(f.provider.opens).toBe(1)
      f.provider.onOpen = undefined
      f.setNow('2026-10-03T12:00:02.000Z')
      const pump = createSyncPump({
        configuration: async () => f.configuration,
        profiles: async () => [f.profileId],
        coordinator: () => f.coordinator,
      })
      try {
        await pump.runOnce()
        expect(f.provider.opens).toBe(1)
        expect(f.provider.openModes).toEqual(['user_present'])
        expect(await f.count(schema.transactions)).toBe(0)
      } finally {
        await pump.close()
      }
      const foreground = await f.coordinator.runForegroundSlice()
      expect(foreground?.mode).toBe('user_present')
      expect(foreground?.state).toBe('partial')
      expect(f.provider.openModes).toEqual(['user_present', 'user_present'])
      expect(await f.count(syncReservations)).toBe(2)
    }
  })
  test('financial date defaults and catch-up boundaries follow the locked profile calendar while future intervals are denied', async () => {
    for (const boundary of [
      {
        timezone: 'Europe/Rome',
        now: '2026-10-03T23:30:00.000Z',
        today: '2026-10-04',
        prior: '2026-07-01T23:30:00.000Z',
        priorDate: '2026-07-02',
        future: '2026-10-05',
      },
      {
        timezone: 'Pacific/Honolulu',
        now: '2026-10-04T05:30:00.000Z',
        today: '2026-10-03',
        prior: '2026-07-02T05:30:00.000Z',
        priorDate: '2026-07-01',
        future: '2026-10-04',
      },
    ]) {
      const f = await fixture([row('calendar-boundary', '-1.23', boundary.today)])
      await handle.db
        .update(schema.profiles)
        .set({ timezone: boundary.timezone })
        .where(eq(schema.profiles.id, f.profileId))
      f.setNow(boundary.now)
      f.provider.snapshotMutation = (value) => ({ ...value, observedAt: f.now() })
      const job = await f.start(),
        result = await f.coordinator.wait(job.id)
      expect(job.requestedTo).toBe(boundary.today)
      expect(result.state).toBe('completed')
      expect(result.report.inserted).toBe(1)
      expect((await f.service.data()).ledgerTransactions[0]?.bookedOn).toBe(boundary.today)
      await expect(f.start('user_present', { to: boundary.future })).rejects.toMatchObject({
        code: 'invalid_sync_interval',
      })
      await handle.db
        .update(schema.connections)
        .set({ lastSyncedAt: boundary.prior })
        .where(eq(schema.connections.id, f.connectionId))
      expect((await f.start()).requestedFrom).toBe(boundary.priorDate)
    }
  })
})
