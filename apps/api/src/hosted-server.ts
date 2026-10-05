import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { EnableBankingClient, EnableBankingProvider } from '@lilleri/financial-providers'
import { and, asc, count, eq, gt } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createApp } from './app.js'
import {
  BANK_CALLBACK_PATH,
  createBankConnectionsExtension,
  type LiveBankProvider,
} from './bank-connections.js'
import {
  armBillingCancellation,
  billingConfigurationFromEnvironment,
  createBillingExtension,
  createPriceCatalogue,
  profilePlan,
  runBillingCancellations,
  settleBillingCancellation,
} from './billing.js'
import {
  cancelConnectionCreationIntents,
  cancelRestoredConnectionCreationIntents,
  closeConnectionCreationWork,
  recoverConnectionCreationIntents,
} from './connection-creation.js'
import { ProfileEncryption } from './encryption.js'
import { createSealedVolumeKeyManagement } from './encryption-local.js'
import { upgradeFinancialEncryption } from './financial-storage.js'
import {
  type HostedConfiguration,
  hostedConfigurationFromEnvironment,
} from './hosted-configuration.js'
import { createLandingPageExtension } from './landing-page.js'
import {
  createLegalPagesExtension,
  LEGAL_TERMS_VERSION,
  legalEntityFromEnvironment,
} from './legal-pages.js'
import { GuardedLiveProvider } from './live-provider-guard.js'
import { NotificationsService } from './notifications.js'
import { createNotificationPump } from './notifications-maintenance.js'
import { createObservability } from './observability.js'
import { createPlusWaitlistExtension, notifyPlusWaitlist } from './plus-waitlist.js'
import { admitLiveProvider } from './provider-admission.js'
import {
  createRetentionPump,
  retentionConfigurationFromEnvironment,
} from './retention-maintenance.js'
import { createRevocationPump } from './revocation-outbox.js'
import {
  DEFAULT_HOSTED_SYNC_CONFIGURATION,
  DEFAULT_RUNTIME_CONFIGURATION,
  DEFAULT_SYNC_CONFIGURATION,
  type RuntimeConfigurationSnapshot,
  RuntimeConfigurationStore,
} from './runtime-config.js'
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
import { UnconfiguredBankProvider } from './unconfigured-bank-provider.js'
import { eraseUnderstandingFinancialReferences } from './understanding-persistence.js'
import { createWebAppExtension } from './web-app.js'

type Environment = Readonly<Record<string, string | undefined>>
/** How often cancellations still owed to deleted profiles are retried with Stripe. */
const BILLING_CANCELLATION_INTERVAL_MS = 5 * 60 * 1000
/** How often the "Plus Fondatori" list is offered the capacity that has opened. */
const PLUS_WAITLIST_INTERVAL_MS = 15 * 60 * 1000
/** Public path of the web application; `/` is the server-rendered home page. */
export const HOSTED_APP_PATH = '/app' as const
export const ENABLE_BANKING_REFERENCE = 'https://enablebanking.com/docs/api/reference/'

export interface HostedServerOverrides {
  /** Tests inject an isolated database; production always opens PostgreSQL from configuration. */
  readonly database?: DatabaseHandle
  readonly bankProvider?: LiveBankProvider
  readonly fetch?: typeof globalThis.fetch
  readonly now?: () => string
  readonly log?: (record: Record<string, unknown>) => void
}
export interface HostedServer {
  readonly app: FastifyInstance
  readonly configuration: HostedConfiguration
  listen(): Promise<void>
  close(): Promise<void>
}

/** The hosted production service: real identity, PostgreSQL, sealed vault and official provider. */
export async function createHostedServer(
  environment: Environment,
  repositoryRoot: string,
  overrides: HostedServerOverrides = {},
): Promise<HostedServer> {
  const configuration = hostedConfigurationFromEnvironment(environment, {
    repositoryRoot,
    termsVersion: LEGAL_TERMS_VERSION,
    ...(overrides.fetch ? { fetch: overrides.fetch } : {}),
  })
  const legal = legalEntityFromEnvironment(environment)
  const environmentBilling = billingConfigurationFromEnvironment({
    ...environment,
    PUBLIC_BASE_URL: configuration.baseURL,
  })
  const log = overrides.log ?? ((record) => console.log(JSON.stringify(record)))
  const now = overrides.now ?? (() => new Date().toISOString())
  const billing = environmentBilling
    ? {
        ...environmentBilling,
        appPath: HOSTED_APP_PATH,
        now,
        log,
        ...(overrides.fetch ? { fetch: overrides.fetch } : {}),
      }
    : null
  const handle =
    overrides.database ??
    (await openDatabase({
      driver: 'postgres',
      url: configuration.database.url,
      ...(configuration.database.runtimeUrl
        ? { runtimeUrl: configuration.database.runtimeUrl }
        : {}),
    }))
  const closing: (() => Promise<void>)[] = []
  try {
    const configurations = new RuntimeConfigurationStore(handle.db)
    let runtime = await configurations.ensure({
      ...DEFAULT_RUNTIME_CONFIGURATION,
      sync: DEFAULT_HOSTED_SYNC_CONFIGURATION,
      payloadRetention: retentionConfigurationFromEnvironment(environment),
    })
    const values = runtime.values
    const sync = values.sync ?? DEFAULT_SYNC_CONFIGURATION
    if (
      !values.connectionLifecycle ||
      !values.notifications ||
      !values.understanding ||
      !values.recurring ||
      !values.understandingPersistence ||
      sync.attemptTimeoutMs < DEFAULT_HOSTED_SYNC_CONFIGURATION.attemptTimeoutMs ||
      sync.leaseMs < DEFAULT_HOSTED_SYNC_CONFIGURATION.leaseMs
    )
      runtime = await configurations.update(
        runtime.revision,
        {
          ...values,
          connectionLifecycle:
            values.connectionLifecycle ?? DEFAULT_RUNTIME_CONFIGURATION.connectionLifecycle,
          notifications: values.notifications ?? DEFAULT_RUNTIME_CONFIGURATION.notifications,
          understanding: values.understanding ?? DEFAULT_RUNTIME_CONFIGURATION.understanding,
          recurring: values.recurring ?? DEFAULT_RUNTIME_CONFIGURATION.recurring,
          understandingPersistence:
            values.understandingPersistence ??
            DEFAULT_RUNTIME_CONFIGURATION.understandingPersistence,
          sync: {
            ...sync,
            attemptTimeoutMs: Math.max(
              sync.attemptTimeoutMs,
              DEFAULT_HOSTED_SYNC_CONFIGURATION.attemptTimeoutMs,
            ),
            leaseMs: Math.max(sync.leaseMs, DEFAULT_HOSTED_SYNC_CONFIGURATION.leaseMs),
          },
        },
        { actor: 'deployment', reason: 'release' },
      )
    const connectionLifecycle = runtime.values.connectionLifecycle
    if (!connectionLifecycle) throw new Error('Connection lifecycle configuration is unavailable')
    const observability = createObservability({
      ...runtime.values.observability,
      logSink: (record) => log(record as unknown as Record<string, unknown>),
    })
    closing.push(() => observability.shutdown())

    const vaultDirectory = join(configuration.dataDirectory, 'vault')
    const journalDirectory = join(configuration.dataDirectory, 'source-journal')
    await mkdir(configuration.dataDirectory, { recursive: true, mode: 0o700 })
    const keys = await createSealedVolumeKeyManagement({
      directory: vaultDirectory,
      masterKey: configuration.vaultMasterKey,
    })
    const encryption = new ProfileEncryption(handle.db, keys)
    const sourceErasureJournal = await createSourceErasureJournal({
      directory: journalDirectory,
      anchorDirectory: vaultDirectory,
      keys,
      mode: 'hosted',
    })
    closing.push(async () => sourceErasureJournal.close())
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
    const financialScope: DatabaseHandle['withProfile'] = (profileId, work, options) =>
      handle.withProfile(
        profileId,
        async (db) => {
          await assertSourceErasureReady(db, profileId, sourceErasureJournal, encryption)
          return work(db)
        },
        options,
      )
    const plan = async (db: Parameters<typeof profilePlan>[0], profileId: string) =>
      (await profilePlan(db, profileId, now())).plan
    const onFailure = () => observability.recordFailure('internal')

    const official: LiveBankProvider | null =
      overrides.bankProvider ??
      (configuration.bank
        ? new EnableBankingProvider({
            applicationId: configuration.bank.applicationId,
            privateKeyPem: configuration.bank.privateKeyPem,
            environment: configuration.bank.environment,
            countries: configuration.bank.countries,
            initialHistoryDays: configuration.bank.initialHistoryDays,
            ...(overrides.fetch ? { fetch: overrides.fetch } : {}),
          })
        : null)
    const provider: LiveBankProvider = new GuardedLiveProvider(
      official ?? new UnconfiguredBankProvider(),
      { scope: financialScope, plan, now, onFailure },
    )
    admitLiveProvider(provider)

    /**
     * Bank capacity under the provider contract: Plus is sold (and the Fondatori list notified)
     * only while an official provider is configured and active connections stay below the cap.
     */
    const bankCapacity = async (): Promise<{ open: boolean; remaining: number | null }> => {
      if (!official) return { open: false, remaining: 0 }
      const limit = configuration.bank?.maxActiveConnections ?? null
      if (limit === null) return { open: true, remaining: null }
      const [row] = await handle.db
        .select({ value: count() })
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.providerId, provider.id),
            eq(schema.connections.status, 'active'),
          ),
        )
      const remaining = Math.max(0, limit - Number(row?.value ?? 0))
      return { open: remaining > 0, remaining }
    }
    const plusOpen = async () => (await bankCapacity()).open

    const coordinator = (profileId: string, snapshot: RuntimeConfigurationSnapshot) =>
      new SyncCoordinator({
        scope: financialScope,
        profileId,
        provider,
        configuration: snapshot,
        encryption,
        now,
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
                now,
                encryption,
                snapshot.values.connectionLifecycle,
                snapshot.values.recurring,
              )
              const notices = new NotificationsService(
                db,
                profileId,
                now,
                snapshot.values.notifications,
              )
              if ((await service.data()).analysis.reviewItems.length)
                await notices.publish('inbox', `sync:${job.id}`)
              if (job.report.balances.some((row) => row.result === 'mismatch'))
                await notices.publish(
                  'balance_mismatch',
                  `sync-balance:${job.id}`,
                  job.connectionId,
                )
            })
          } catch {
            onFailure()
          }
        },
      })
    const foreground = createSyncForegroundRefresher({
      configuration: () => configurations.read(),
      coordinator,
      onFailure,
    })
    closing.push(() => foreground.close())
    await recoverConnectionCreationIntents(handle.db, now(), runtime.values.revocation.batchLimit)

    const app = await createApp({
      db: handle.db,
      demoMode: false,
      environment: 'production',
      hostedIdentity: configuration.identity,
      financialScope,
      syncConfiguration: () => configurations.read(),
      foregroundRefresh: (context) => foreground.refresh(context),
      sourceErasureJournal,
      initialConnectionLifecycleConfiguration: connectionLifecycle,
      connectionLifecycleConfiguration: async () => {
        const value = (await configurations.read()).values.connectionLifecycle
        if (!value) throw new Error('Connection lifecycle configuration is unavailable')
        return value
      },
      understandingConfiguration: async () => {
        const snapshot = await configurations.read()
        if (!snapshot.values.understanding)
          throw new Error('Understanding configuration is unavailable')
        return { ...snapshot.values.understanding, version: `runtime-v${snapshot.revision}` }
      },
      notificationConfiguration: async () => {
        const value = (await configurations.read()).values.notifications
        if (!value) throw new Error('Notification configuration is unavailable')
        return value
      },
      encryption,
      observability,
      reloadObservability: async () =>
        observability.setConfiguration((await configurations.read()).values.observability),
      provider,
      healthHosts: configuration.healthHosts,
      ...(configuration.internalAccessToken
        ? { internalAccessToken: configuration.internalAccessToken }
        : {}),
      ...(overrides.now ? { now: overrides.now } : {}),
      extensions: [
        createLegalPagesExtension(legal),
        await createLandingPageExtension({
          baseURL: configuration.baseURL,
          entity: legal,
          wordmarkSvg: await readFile(
            join(repositoryRoot, 'packages/brand/logo/lilleri-wordmark.svg'),
            'utf8',
          ),
          fontFile: join(repositoryRoot, 'packages/brand/fonts/Geist-Variable.woff2'),
          appPath: HOSTED_APP_PATH,
          ...(billing ? { prices: createPriceCatalogue(billing, () => Date.parse(now())) } : {}),
          plusOpen,
        }),
        createBillingExtension(billing, { purchaseGate: plusOpen }),
        createPlusWaitlistExtension({ plusOpen, now }),
        createBankConnectionsExtension({
          provider: official ? provider : null,
          scope: financialScope,
          baseURL: configuration.baseURL,
          plan,
          maxActiveConnections: configuration.bank?.maxActiveConnections ?? null,
          coordinator: async (profileId) => coordinator(profileId, await configurations.read()),
          countries: configuration.bank?.countries ?? (overrides.bankProvider ? ['IT'] : []),
          evidenceReference: ENABLE_BANKING_REFERENCE,
          appPath: HOSTED_APP_PATH,
          now,
          onFailure,
        }),
        (instance, context) => {
          // Stop charging once the owner's profile deletion has committed. The Stripe references
          // are armed durably first because the profile cascade erases the billing rows; a Stripe
          // failure afterwards is retried by the cancellation pump below.
          const deletion = (request: FastifyRequest) =>
            (request.method === 'DELETE' && request.routeOptions.url === '/v1/profile') ||
            (request.method === 'POST' && request.routeOptions.url === '/v1/profile/deletion')
          const armed = new WeakMap<FastifyRequest, string>()
          instance.addHook('preHandler', async (request) => {
            const profileId = context.principal(request)?.profileId
            if (
              profileId &&
              deletion(request) &&
              (await armBillingCancellation(handle.db, profileId, now()))
            )
              armed.set(request, profileId)
          })
          instance.addHook('onResponse', async (request) => {
            const profileId = armed.get(request)
            if (billing && profileId)
              await settleBillingCancellation(billing, handle.db, profileId, {
                discardKept: true,
              }).catch(onFailure)
          })
        },
        await createWebAppExtension({
          directory: configuration.webDirectory,
          appPath: HOSTED_APP_PATH,
        }),
      ],
    })
    closing.unshift(() => app.close())

    const revocations = createRevocationPump(handle.db, [provider], {
      ...runtime.values.revocation,
      configuration: async () => (await configurations.read()).values.revocation,
      onStorageFailure: () => observability.recordMaintenance('revocation', 'failed', 0, 1),
      afterBatch: async (value, at) => {
        await recoverConnectionCreationIntents(handle.db, at, value.batchLimit)
      },
    })
    closing.push(() => revocations.stop())
    const retention = createRetentionPump(handle.db, runtime.values.payloadRetention, {
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
    })
    closing.push(() => retention.stop())
    const notifications = createNotificationPump(
      handle.db,
      async () => {
        const value = (await configurations.read()).values.notifications
        if (!value) throw new Error('Notification configuration is unavailable')
        return value
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
    closing.push(() => notifications.stop())
    const syncPump = createSyncPump({
      configuration: () => configurations.read(),
      // Only profiles with an active official connection are visited by background refresh.
      profiles: async (limit, afterProfileId?: string | null) =>
        (
          await handle.db
            .selectDistinct({ id: schema.connections.profileId })
            .from(schema.connections)
            .where(
              and(
                eq(schema.connections.providerId, provider.id),
                eq(schema.connections.status, 'active'),
                afterProfileId ? gt(schema.connections.profileId, afterProfileId) : undefined,
              ),
            )
            .orderBy(asc(schema.connections.profileId))
            .limit(limit)
        ).map((row) => row.id),
      coordinator,
      onFailure,
    })
    closing.push(() => syncPump.close())
    closing.push(() => closeConnectionCreationWork())
    const sendPlusAvailable = configuration.identity.delivery.sendPlusAvailable
    if (sendPlusAvailable) {
      let notifying: Promise<unknown> | null = null
      const notify = () => {
        notifying ??= bankCapacity()
          .then(async (capacity) => {
            if (!capacity.open) return
            const result = await notifyPlusWaitlist(handle.db, {
              delivery: { sendPlusAvailable },
              baseURL: configuration.baseURL,
              limit: Math.min(50, capacity.remaining ?? 50),
              now,
            })
            if (result.notified || result.skipped || result.failed)
              log({ event: 'plus_waitlist_notified', ...result })
          })
          .catch(onFailure)
          .finally(() => {
            notifying = null
          })
      }
      const timer = setInterval(notify, PLUS_WAITLIST_INTERVAL_MS)
      timer.unref()
      closing.unshift(async () => {
        clearInterval(timer)
        await notifying
      })
    }
    if (billing) {
      let running: Promise<unknown> | null = null
      const timer = setInterval(() => {
        running ??= runBillingCancellations(billing, handle.db)
          .catch(onFailure)
          .finally(() => {
            running = null
          })
      }, BILLING_CANCELLATION_INTERVAL_MS)
      timer.unref()
      closing.unshift(async () => {
        clearInterval(timer)
        await running
      })
    }

    let closed: Promise<void> | null = null
    const close = () => {
      closed ??= (async () => {
        observability.lifecycle('stopping')
        for (const step of closing) await step().catch(onFailure)
        if (!overrides.database) await handle.close()
      })()
      return closed
    }
    if (official && configuration.bank && !overrides.bankProvider)
      void new EnableBankingClient({
        applicationId: configuration.bank.applicationId,
        privateKeyPem: configuration.bank.privateKeyPem,
        ...(overrides.fetch ? { fetch: overrides.fetch } : {}),
      })
        .application()
        .then((application) => {
          const redirect = `${configuration.baseURL}${BANK_CALLBACK_PATH}`
          const expected = configuration.bank?.environment === 'live' ? 'production' : 'sandbox'
          log({
            event: 'bank_provider_check',
            provider: official.id,
            active: application.active,
            environmentMatches: application.environment === expected,
            redirectRegistered: application.redirectUrls.includes(redirect),
          })
        })
        .catch(() => log({ event: 'bank_provider_check', provider: official.id, reachable: false }))
    return {
      app,
      configuration,
      async listen() {
        await app.listen({ host: configuration.host, port: configuration.port })
        await syncPump.start()
        observability.lifecycle('ready')
      },
      close,
    }
  } catch (error) {
    for (const step of closing) await step().catch(() => undefined)
    if (!overrides.database) await handle.close().catch(() => undefined)
    throw error
  }
}
