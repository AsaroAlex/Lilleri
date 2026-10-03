import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { asc, gt } from 'drizzle-orm'
import { assertDemoConfiguration, createApp } from './app.js'
import {
  cancelConnectionCreationIntents,
  cancelRestoredConnectionCreationIntents,
  closeConnectionCreationWork,
  recoverConnectionCreationIntents,
} from './connection-creation.js'
import { databaseVaultIdentity } from './database-identity.js'
import { ProfileEncryption } from './encryption.js'
import { createLocalSyntheticKeyManagement } from './encryption-local.js'
import { upgradeFinancialEncryption } from './financial-storage.js'
import { assertLocalIdentityConfiguration } from './identity.js'
import { NotificationsService } from './notifications.js'
import { createNotificationPump } from './notifications-maintenance.js'
import { createObservability } from './observability.js'
import {
  createRetentionPump,
  retentionConfigurationFromEnvironment,
} from './retention-maintenance.js'
import { createRevocationPump } from './revocation-outbox.js'
import type { RuntimeConfigurationSnapshot } from './runtime-config.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from './runtime-config.js'
import { DemoService } from './service.js'
import {
  assertSourceErasureReady,
  recordSourceFacts,
  recoverSourceErasures,
} from './source-erasure.js'
import { createSourceErasureJournal } from './source-erasure-journal.js'
import { createSyncForegroundRefresher } from './sync-foreground.js'
import { SyncCoordinator } from './sync-jobs.js'
import { createSyncPump } from './sync-maintenance.js'
import { eraseUnderstandingFinancialReferences } from './understanding-persistence.js'

const host = process.env.API_HOST ?? '127.0.0.1'
const localAuthMode = process.env.LOCAL_AUTH_MODE === '1'
const demoMode = process.env.DEMO_MODE === '1'
if (!['127.0.0.1', 'localhost', '::1'].includes(host))
  throw new Error('Synthetic API modes must listen on loopback')
if (localAuthMode && demoMode) throw new Error('Select either LOCAL_AUTH_MODE or DEMO_MODE')
if (!localAuthMode) assertDemoConfiguration(demoMode, process.env.NODE_ENV, host)
const port = Number(process.env.API_PORT ?? 3001)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('API_PORT must be an integer between 1024 and 65535')
const localIdentity = localAuthMode
  ? {
      baseURL: process.env.LOCAL_AUTH_BASE_URL ?? `http://localhost:${port}`,
      secret: process.env.LOCAL_AUTH_SECRET ?? '',
      ...(process.env.NODE_ENV ? { environment: process.env.NODE_ENV } : {}),
    }
  : undefined
if (localIdentity) assertLocalIdentityConfiguration(localIdentity)
const retentionConfiguration = retentionConfigurationFromEnvironment()
const path = resolve(
  process.env.PGLITE_PATH ?? new URL('../../../.lilleri/data', import.meta.url).pathname,
)
await mkdir(resolve(path, '..'), { recursive: true })
const handle = await openDatabase(
  process.env.DATABASE_URL
    ? {
        driver: 'postgres',
        url: process.env.DATABASE_URL,
        ...(process.env.DATABASE_RUNTIME_URL
          ? { runtimeUrl: process.env.DATABASE_RUNTIME_URL }
          : {}),
      }
    : { driver: 'pglite', path },
)
const configurations = new RuntimeConfigurationStore(handle.db)
let initialConfiguration = await configurations.ensure({
  ...DEFAULT_RUNTIME_CONFIGURATION,
  payloadRetention: retentionConfiguration,
})
if (
  !initialConfiguration.values.connectionLifecycle ||
  !initialConfiguration.values.notifications ||
  !initialConfiguration.values.understanding ||
  !initialConfiguration.values.sync ||
  !initialConfiguration.values.recurring ||
  !initialConfiguration.values.understandingPersistence
)
  initialConfiguration = await configurations.update(
    initialConfiguration.revision,
    {
      ...initialConfiguration.values,
      connectionLifecycle:
        initialConfiguration.values.connectionLifecycle ??
        DEFAULT_RUNTIME_CONFIGURATION.connectionLifecycle,
      notifications:
        initialConfiguration.values.notifications ?? DEFAULT_RUNTIME_CONFIGURATION.notifications,
      understanding:
        initialConfiguration.values.understanding ?? DEFAULT_RUNTIME_CONFIGURATION.understanding,
      sync: initialConfiguration.values.sync ?? DEFAULT_RUNTIME_CONFIGURATION.sync,
      recurring: initialConfiguration.values.recurring ?? DEFAULT_RUNTIME_CONFIGURATION.recurring,
      understandingPersistence:
        initialConfiguration.values.understandingPersistence ??
        DEFAULT_RUNTIME_CONFIGURATION.understandingPersistence,
    },
    { actor: 'deployment', reason: 'release' },
  )
const observability = createObservability({
  ...initialConfiguration.values.observability,
  logSink: (record) => console.log(JSON.stringify(record)),
})
const databaseIdentity = process.env.DATABASE_URL
  ? databaseVaultIdentity(process.env.DATABASE_URL)
  : path
const keyVaultPath = resolve(
  process.env.LOCAL_KEY_VAULT_PATH ??
    `/workspace/.lilleri-data/key-vaults/${createHash('sha256').update(databaseIdentity).digest('hex')}`,
)
const relativeVaultPath = relative(path, keyVaultPath)
if (
  !process.env.DATABASE_URL &&
  (!relativeVaultPath ||
    (!relativeVaultPath.startsWith('..') && !relativeVaultPath.startsWith('/')))
)
  throw new Error('The independent key vault must be outside the database backup directory')
const keys = await createLocalSyntheticKeyManagement({
  directory: keyVaultPath,
  mode: localAuthMode ? 'local-auth' : 'demo',
})
const encryption = new ProfileEncryption(handle.db, keys)
const sourceJournalPath = resolve(
  process.env.SOURCE_ERASURE_JOURNAL_PATH ?? `${keyVaultPath}-source-journal`,
)
const relativeJournalPath = relative(path, sourceJournalPath)
if (
  !process.env.DATABASE_URL &&
  (!relativeJournalPath ||
    (!relativeJournalPath.startsWith('..') && !relativeJournalPath.startsWith('/')))
)
  throw new Error(
    'The independent source erasure journal must be outside the database backup directory',
  )
const sourceErasureJournal = await createSourceErasureJournal({
  directory: sourceJournalPath,
  anchorDirectory: keyVaultPath,
  keys,
  mode: localAuthMode ? 'local-auth' : 'demo',
})
const keyRecovery = await encryption.recoverPendingErasures()
if (keyRecovery.pending) throw new Error('Pending key destruction must complete before startup')
await upgradeFinancialEncryption(handle.db, encryption)
await recoverSourceErasures(handle.db, sourceErasureJournal, encryption, undefined, {
  beforeErase: (db, profileId, connectionId, at) =>
    cancelConnectionCreationIntents(db, profileId, at, connectionId),
  replayCreationIntents: (db, profileId, connectionId, intentIds, at) =>
    cancelRestoredConnectionCreationIntents(db, profileId, connectionId, intentIds, at),
  eraseFinancialReferences: (db, input) =>
    eraseUnderstandingFinancialReferences(db, input, encryption),
})
const provider = new MockItalianProvider()
const financialScope: typeof handle.withProfile = (profileId, work, options) =>
  handle.withProfile(
    profileId,
    async (db) => {
      await assertSourceErasureReady(db, profileId, sourceErasureJournal, encryption)
      return work(db)
    },
    options,
  )
const connectionLifecycleConfiguration = initialConfiguration.values.connectionLifecycle
if (!connectionLifecycleConfiguration)
  throw new Error('Connection lifecycle configuration is unavailable')
const coordinator = (profileId: string, configuration: RuntimeConfigurationSnapshot) =>
  new SyncCoordinator({
    scope: financialScope,
    profileId,
    provider,
    configuration,
    encryption,
    recordSourceFacts: (db, facts, at) =>
      recordSourceFacts(db, sourceErasureJournal, facts, at, encryption),
    afterCompleted: async (job) => {
      observability.recordSync(job.report.rejected ? 'partial' : 'completed', job.report)
      try {
        await financialScope(profileId, async (db) => {
          const service = new DemoService(
            db,
            profileId,
            provider,
            undefined,
            encryption,
            configuration.values.connectionLifecycle,
            configuration.values.recurring,
          )
          const notices = new NotificationsService(
            db,
            profileId,
            undefined,
            configuration.values.notifications,
          )
          if ((await service.data()).analysis.reviewItems.length)
            await notices.publish('inbox', `sync:${job.id}`)
          if (job.report.balances.some((row) => row.result === 'mismatch'))
            await notices.publish('balance_mismatch', `sync-balance:${job.id}`, job.connectionId)
        })
      } catch {
        observability.recordFailure('internal')
      }
    },
  })
const foreground = createSyncForegroundRefresher({
  configuration: () => configurations.read(),
  coordinator,
  onFailure: () => observability.recordFailure('internal'),
})
await recoverConnectionCreationIntents(
  handle.db,
  new Date().toISOString(),
  initialConfiguration.values.revocation.batchLimit,
)
const app = await createApp({
  db: handle.db,
  syncConfiguration: () => configurations.read(),
  foregroundRefresh: (context) => foreground.refresh(context),
  sourceErasureJournal,
  financialScope,
  initialConnectionLifecycleConfiguration: connectionLifecycleConfiguration,
  connectionLifecycleConfiguration: async () => {
    const configuration = (await configurations.read()).values.connectionLifecycle
    if (!configuration) throw new Error('Connection lifecycle configuration is unavailable')
    return configuration
  },
  understandingConfiguration: async () => {
    const snapshot = await configurations.read()
    if (!snapshot.values.understanding)
      throw new Error('Understanding configuration is unavailable')
    return { ...snapshot.values.understanding, version: `runtime-v${snapshot.revision}` }
  },
  notificationConfiguration: async () => {
    const configuration = (await configurations.read()).values.notifications
    if (!configuration) throw new Error('Notification configuration is unavailable')
    return configuration
  },
  encryption,
  observability,
  reloadObservability: async () =>
    observability.setConfiguration((await configurations.read()).values.observability),
  provider,
  demoMode,
  ...(localIdentity ? { localIdentity } : { seed: true }),
})
const revocations = createRevocationPump(handle.db, [provider], {
  ...initialConfiguration.values.revocation,
  configuration: async () => (await configurations.read()).values.revocation,
  onStorageFailure: () => observability.recordMaintenance('revocation', 'failed', 0, 1),
  afterBatch: async (configuration, at) => {
    await recoverConnectionCreationIntents(handle.db, at, configuration.batchLimit)
  },
})
const payloadRetention = createRetentionPump(
  handle.db,
  initialConfiguration.values.payloadRetention,
  {
    configuration: async () => (await configurations.read()).values.payloadRetention,
    report: (status) =>
      observability.recordMaintenance(
        'retention',
        status.lastOutcome === 'partial'
          ? 'partial'
          : status.lastOutcome === 'failed'
            ? 'failed'
            : 'completed',
        status.deletedLastRun,
        status.failedProfilesLastRun,
      ),
  },
)
const notifications = createNotificationPump(
  handle.db,
  async () => {
    const configuration = (await configurations.read()).values.notifications
    if (!configuration) throw new Error('Notification configuration is unavailable')
    return configuration
  },
  {
    report: (status) =>
      observability.recordMaintenance(
        'notifications',
        status.failedProfiles ? 'partial' : 'completed',
        status.delivered,
        status.failedProfiles,
      ),
  },
)
const syncPump = createSyncPump({
  configuration: () => configurations.read(),
  profiles: async (limit, afterProfileId?: string | null) =>
    (
      await handle.db
        .select({ id: schema.profiles.id })
        .from(schema.profiles)
        .where(afterProfileId ? gt(schema.profiles.id, afterProfileId) : undefined)
        .orderBy(asc(schema.profiles.id))
        .limit(limit)
    ).map((row) => row.id),
  coordinator,
  onFailure: () => observability.recordFailure('internal'),
})
let closing = false
const close = async () => {
  if (closing) return
  closing = true
  observability.lifecycle('stopping')
  const closingApp = app.close()
  const closingCreations = closeConnectionCreationWork()
  await foreground.close()
  await syncPump.close()
  await closingCreations
  await notifications.stop()
  await payloadRetention.stop()
  await revocations.stop()
  await closingApp
  sourceErasureJournal.close()
  await handle.close()
  await observability.shutdown()
}
process.once('SIGINT', () => {
  void close()
})
process.once('SIGTERM', () => {
  void close()
})
try {
  await app.listen({ host, port })
  await syncPump.start()
  observability.lifecycle('ready')
} catch (error) {
  await close()
  throw error
}
