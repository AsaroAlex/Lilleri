import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { openDatabase } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { assertDemoConfiguration, createApp } from './app.js'
import { databaseVaultIdentity } from './database-identity.js'
import { ProfileEncryption } from './encryption.js'
import { createLocalSyntheticKeyManagement } from './encryption-local.js'
import { upgradeFinancialEncryption } from './financial-storage.js'
import { assertLocalIdentityConfiguration } from './identity.js'
import { createNotificationPump } from './notifications-maintenance.js'
import { createObservability } from './observability.js'
import {
  createRetentionPump,
  retentionConfigurationFromEnvironment,
} from './retention-maintenance.js'
import { createRevocationPump } from './revocation-outbox.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from './runtime-config.js'

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
  !initialConfiguration.values.understanding
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
const encryption = new ProfileEncryption(
  handle.db,
  await createLocalSyntheticKeyManagement({
    directory: keyVaultPath,
    mode: localAuthMode ? 'local-auth' : 'demo',
  }),
)
const keyRecovery = await encryption.recoverPendingErasures()
if (keyRecovery.pending) throw new Error('Pending key destruction must complete before startup')
await upgradeFinancialEncryption(handle.db, encryption)
const provider = new MockItalianProvider()
const connectionLifecycleConfiguration = initialConfiguration.values.connectionLifecycle
if (!connectionLifecycleConfiguration)
  throw new Error('Connection lifecycle configuration is unavailable')
const app = await createApp({
  db: handle.db,
  financialScope: handle.withProfile,
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
let closing = false
const close = async () => {
  if (closing) return
  closing = true
  observability.lifecycle('stopping')
  await notifications.stop()
  await payloadRetention.stop()
  await revocations.stop()
  await app.close()
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
  observability.lifecycle('ready')
} catch (error) {
  await close()
  throw error
}
