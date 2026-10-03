import swagger from '@fastify/swagger'
import { type Database, ProfileScopeError } from '@lilleri/database'
import { type Account, CATEGORIES } from '@lilleri/domain'
import { DEFAULT_RECURRING_POLICY, type RecurringEvidence } from '@lilleri/engines'
import { type FinancialDataProvider, MockItalianProvider } from '@lilleri/financial-providers'
import Fastify, { type FastifyRequest } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  ConnectionCreationCoordinator,
  cancelConnectionCreationIntents,
  cancelRestoredConnectionCreationIntents,
  compensateConnectionCreationIntent,
} from './connection-creation.js'
import {
  type ConsentLifecycleOptions,
  ConsentLifecycleService,
  consentLifecycleDto,
  registerConsentLifecycleRoutes,
} from './consent-lifecycle.js'
import { createDataExportArchive } from './data-export.js'
import { createDeletionCertificate, DELETION_CERTIFICATE_SCHEMA } from './deletion-restore.js'
import type { ProfileEncryption } from './encryption.js'
import {
  createLocalIdentity,
  type FinancialPrincipal,
  type LocalIdentityOptions,
} from './identity.js'
import { ManualService, manualAuditDto, registerManualRoutes } from './manual-service.js'
import { registerMappedImportRoutes } from './mapped-import.js'
import { MerchantTaxonomyService, registerMerchantTaxonomyRoutes } from './merchant-taxonomy.js'
import {
  type NotificationConfiguration,
  NotificationsService,
  registerNotificationRoutes,
} from './notifications.js'
import type { Observability } from './observability.js'
import { renderObservabilityDashboard } from './observability-dashboard.js'
import { registerObservabilityHooks } from './observability-hooks.js'
import { ownershipExportSchemas, validateOwnershipExport } from './ownership-export.js'
import { PrivacyService, registerPrivacyRoutes } from './privacy.js'
import { Problem } from './problem.js'
import { RecurringService, registerRecurringRoutes } from './recurring.js'
import { type FinancialScope, scopedReply } from './request-scope.js'
import { RulesService, registerRulesRoutes, ruleDtoSchema, ruleEventDtoSchema } from './rules.js'
import {
  DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION,
  DEFAULT_NOTIFICATION_CONFIGURATION,
  DEFAULT_SYNC_CONFIGURATION,
  DEFAULT_UNDERSTANDING_CONFIGURATION,
  DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
  type RuntimeConfigurationSnapshot,
} from './runtime-config.js'
import { DemoService, json } from './service.js'
import {
  registerSettingsRoutes,
  SettingsService,
  settingsDtoSchema,
  settingsEventDtoSchema,
} from './settings.js'
import type { SourceErasureHooks } from './source-erasure.js'
import {
  assertSourceErasureReady,
  recordSourceFacts,
  SourceErasureService,
} from './source-erasure.js'
import type { SourceErasureJournal } from './source-erasure-journal.js'
import { registerSupportAccessRoutes, SupportAccessService } from './support-access.js'
import type { SyncForegroundContext } from './sync-foreground.js'
import { registerSyncRoutes } from './sync-http.js'
import { SyncCoordinator } from './sync-jobs.js'
import {
  eraseUnderstandingFinancialReferences,
  exportUnderstandingPersistence,
  registerUnderstandingPersistenceRoutes,
  UnderstandingPersistenceService,
} from './understanding-persistence.js'
import {
  registerUnderstandingRoutes,
  type UnderstandingConfiguration,
  UnderstandingService,
} from './understanding-service.js'

const categories = z.enum(
  Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]],
)
const identifier = z.string().min(1).max(256)
const matchIdentifier = z.string().min(1).max(600)
const reconciliationRevision = z.string().regex(/^[a-f0-9]{64}$/)
const moneyDto = z.object({
  amountMinor: z.string().regex(/^-?\d+$/),
  currency: z.string().length(3),
})
const transactionDto = z.object({
  id: z.string(),
  profileId: z.string(),
  accountId: z.string(),
  connectionId: z.string(),
  providerId: z.string(),
  providerTransactionId: z.string(),
  revision: z.number().int(),
  source: z.enum(['bank', 'csv', 'manual']),
  status: z.enum(['pending', 'booked', 'reversed']),
  amount: moneyDto,
  description: z.string(),
  merchantName: z.string().nullable(),
  merchantKey: z.string().nullable(),
  bookedOn: z.string().nullable(),
  authorizedOn: z.string().nullable(),
  observedAt: z.string(),
  kind: z.enum(['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal']),
  reference: z.string().nullable(),
  relatedTransactionId: z.string().nullable(),
  relatedAccountId: z.string().nullable(),
})
const connectionDto = z.object({
  id: z.string(),
  profileId: z.string(),
  providerId: z.string(),
  institutionId: z.string(),
  status: z.enum(['active', 'expired', 'revoked', 'error']),
  createdAt: z.string(),
  lastSyncedAt: z.string().nullable(),
})
const provenanceDto = z.object({
  algorithmVersion: z.string(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  evidence: z.array(z.string()),
})
const classificationDto = provenanceDto.extend({
  transactionId: z.string(),
  categoryId: categories,
  source: z.enum(['user', 'rule', 'preference', 'global', 'review']),
  needsReview: z.boolean(),
})
const analysisDto = z.object({
  matches: z.array(
    provenanceDto.extend({
      id: z.string(),
      revision: reconciliationRevision,
      type: z.enum([
        'pending_to_booked',
        'duplicate',
        'internal_transfer',
        'card_settlement',
        'refund',
        'cash_transfer',
      ]),
      transactionIds: z.array(z.string()),
      state: z.enum(['confirmed', 'suggested', 'rejected', 'undone']),
    }),
  ),
  classifications: z.array(classificationDto),
  recurring: z.array(
    provenanceDto.extend({
      id: z.string(),
      merchantKey: z.string(),
      transactionIds: z.array(z.string()),
      kind: z.enum(['subscription', 'recurring_expense', 'recurring_income']),
      frequency: z.literal('monthly'),
      expectedAmount: moneyDto,
      nextOn: z.string(),
      priceIncreased: z.boolean(),
    }),
  ),
  reviewItems: z.array(
    z.object({
      id: z.string(),
      transactionIds: z.array(z.string()),
      type: z.enum(['classification', 'reconciliation', 'balance']),
      explanation: z.string(),
      matchId: z.string().nullable(),
    }),
  ),
  summaries: z.array(
    z.object({
      currency: z.string().length(3),
      balance: moneyDto,
      income: moneyDto,
      spend: moneyDto,
      pending: moneyDto,
      transactionCount: z.number().int(),
    }),
  ),
})
const accountDto = z.object({
  id: z.string(),
  profileId: z.string(),
  connectionId: z.string(),
  providerAccountId: z.string(),
  name: z.string(),
  institutionName: z.string(),
  kind: z.enum(['current', 'card', 'cash', 'savings']),
  balance: moneyDto,
  balanceUpdatedAt: z.string(),
})
const overviewDto = z.object({
  mode: z.literal('synthetic'),
  profile: z.object({ id: z.string(), name: z.string(), timezone: z.string() }),
  connections: z.array(connectionDto),
  connectionLifecycles: z.array(consentLifecycleDto),
  accounts: z.array(accountDto),
  transactions: z.array(transactionDto),
  analysis: analysisDto,
})
const revocationDto = z.object({
  id: z.string(),
  connectionId: z.string(),
  state: z.enum(['pending', 'running', 'completed', 'failed']),
  attempts: z.number().int(),
  nextAttemptAt: z.string(),
  deadlineAt: z.string(),
  completedAt: z.string().nullable(),
  lastErrorCode: z
    .enum(['provider_unavailable', 'provider_unknown', 'deadline_exceeded', 'attempts_exhausted'])
    .nullable(),
})
const exportDto = overviewDto.omit({ connectionLifecycles: true }).extend({
  profile: overviewDto.shape.profile.extend({ createdAt: z.iso.datetime().optional() }),
  ...ownershipExportSchemas,
  rules: z.array(ruleDtoSchema),
  ruleEvents: z.array(ruleEventDtoSchema),
  revocationJobs: z.array(
    revocationDto.extend({
      profileId: identifier.optional(),
      providerId: identifier.optional(),
      consentId: identifier.optional(),
      createdAt: z.iso.datetime().optional(),
    }),
  ),
  manual: manualAuditDto,
  profileSettings: z.object({
    settings: settingsDtoSchema,
    events: z.array(settingsEventDtoSchema),
  }),
  identity: z
    .object({
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        emailVerified: z.boolean(),
        adultAttested: z.boolean(),
        termsVersion: z.string(),
        twoFactorEnabled: z.boolean(),
        createdAt: z.string(),
      }),
      acceptances: z.array(
        z.object({
          kind: z.enum(['adult_attestation', 'terms']),
          textVersion: z.string(),
          acceptedAt: z.string(),
        }),
      ),
      sessions: z.array(
        z.object({
          id: z.string(),
          current: z.boolean(),
          createdAt: z.string(),
          expiresAt: z.string(),
        }),
      ),
    })
    .optional(),
  exportVersion: z.literal(1),
  exportedAt: z.string(),
  consents: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      connectionId: z.string(),
      purpose: z.literal('account_information'),
      grantedAt: z.string(),
      expiresAt: z.string(),
      revokedAt: z.string().nullable(),
      provider: z.string(),
    }),
  ),
  sourceObservations: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      connectionId: z.string(),
      accountId: z.string(),
      providerId: z.string(),
      providerRecordId: z.string(),
      status: z.string(),
      contentHash: z.string(),
      observedAt: z.string(),
      payload: z.record(z.string(), z.unknown()).optional(),
      payloadExpiresAt: z.string().optional(),
    }),
  ),
  feedback: z.array(
    z.object({
      profileId: z.string(),
      transactionId: z.string(),
      categoryId: categories,
      scope: z.enum(['once', 'merchant']),
      createdAt: z.string(),
    }),
  ),
  preferences: z.array(
    z.object({ profileId: z.string(), merchantKey: z.string(), categoryId: categories }),
  ),
  matchDecisions: z.array(
    z.object({
      profileId: z.string(),
      matchId: z.string(),
      state: z.enum(['confirmed', 'rejected', 'undone']),
      decidedAt: z.string(),
      revision: z.number().int().positive(),
    }),
  ),
  matchDecisionLegs: z.array(
    z.object({ profileId: z.string(), matchId: z.string(), transactionId: z.string() }),
  ),
  syncRuns: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      connectionId: z.string(),
      inserted: z.number().int(),
      updated: z.number().int(),
      unchanged: z.number().int(),
      rejected: z.number().int(),
      syncedAt: z.string(),
    }),
  ),
})
const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = {
  400: problemDto,
  401: problemDto,
  403: problemDto,
  404: problemDto,
  409: problemDto,
  422: problemDto,
  429: problemDto,
  500: problemDto,
  502: problemDto,
}
const connectionParams = z.object({ id: identifier }).strict()
const empty = z.object({}).strict()
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:8181',
  'http://127.0.0.1:8181',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
export interface AppOptions {
  readonly db: Database
  /** Trusted server-derived financial profile scope; the server always supplies this. */
  readonly financialScope?: FinancialScope
  readonly observability?: Observability
  readonly encryption?: ProfileEncryption
  readonly reloadObservability?: () => Promise<void>
  readonly connectionLifecycleConfiguration?: () => Promise<ConsentLifecycleOptions>
  readonly initialConnectionLifecycleConfiguration?: ConsentLifecycleOptions
  readonly understandingConfiguration?: () => Promise<UnderstandingConfiguration>
  readonly notificationConfiguration?: () => Promise<NotificationConfiguration>
  readonly syncConfiguration?: () => Promise<RuntimeConfigurationSnapshot>
  readonly foregroundRefresh?: (context: SyncForegroundContext) => Promise<unknown>
  readonly sourceErasureJournal?: SourceErasureJournal
  readonly demoMode: boolean
  readonly localIdentity?: Omit<LocalIdentityOptions, 'db'>
  readonly environment?: string
  /** Trusted application configuration. A request can never select its profile. */
  readonly profileId?: string
  readonly provider?: FinancialDataProvider
  readonly seed?: boolean
  readonly now?: () => string
}
export function assertDemoConfiguration(
  demoMode: boolean,
  environment: string | undefined,
  host = '127.0.0.1',
) {
  if (!demoMode || environment === 'production' || process.env.NODE_ENV === 'production')
    throw new Error(
      'This API only supports explicit nonproduction DEMO_MODE=1; production authentication is not implemented',
    )
  if (!['127.0.0.1', 'localhost', '::1'].includes(host))
    throw new Error('The demo API must listen on loopback')
}
export async function createApp(options: AppOptions) {
  const provider = options.provider ?? new MockItalianProvider()
  if (options.localIdentity) {
    if (options.demoMode || options.profileId || options.seed)
      throw new Error('Local identity cannot use a demo profile or automatically connect sources')
  } else {
    assertDemoConfiguration(options.demoMode, options.environment ?? process.env.NODE_ENV)
  }
  const identity = options.localIdentity
    ? createLocalIdentity({
        ...options.localIdentity,
        ...(options.environment ? { environment: options.environment } : {}),
        db: options.db,
        allowedOrigins: options.localIdentity.allowedOrigins ?? [...allowedOrigins],
      })
    : undefined
  const browserOrigins = new Set(options.localIdentity?.allowedOrigins ?? [...allowedOrigins])
  if (options.localIdentity) browserOrigins.add(new URL(options.localIdentity.baseURL).origin)
  const sourceJournal = options.sourceErasureJournal
  const requestHeaders = (request: FastifyRequest) => {
    const headers = new Headers()
    for (const [name, value] of Object.entries(request.headers)) {
      if (value !== undefined)
        headers.set(name, Array.isArray(value) ? value.join(', ') : String(value))
    }
    return headers
  }
  const app = Fastify({
    logger: false,
    bodyLimit: 300_000,
    requestTimeout: 15_000,
    routerOptions: { maxParamLength: 600 },
  }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  if (options.reloadObservability) app.addHook('onRequest', options.reloadObservability)
  if (options.observability) registerObservabilityHooks(app, options.observability)
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Lilleri synthetic demo API',
        version: '0.1.0',
        description:
          'Loopback-only synthetic data. Production authentication and real bank connectivity are not implemented.',
      },
    },
    transform: (input) => {
      const converted = jsonSchemaTransform(input)
      if (input.url !== '/v1/export/archive') return converted
      return {
        ...converted,
        schema: {
          ...converted.schema,
          response: {
            ...(converted.schema.response && typeof converted.schema.response === 'object'
              ? converted.schema.response
              : {}),
            200: {
              description: 'Scoped ZIP archive',
              content: { 'application/zip': { schema: { type: 'string', format: 'binary' } } },
            },
          },
        },
      }
    },
  })
  const demoService = identity
    ? undefined
    : new DemoService(
        options.db,
        options.profileId ?? 'profile_demo',
        provider,
        options.now,
        options.encryption,
        options.initialConnectionLifecycleConfiguration,
        DEFAULT_RECURRING_POLICY,
        sourceJournal && options.encryption
          ? (db, facts, at) =>
              recordSourceFacts(
                db,
                sourceJournal,
                facts,
                at,
                options.encryption as ProfileEncryption,
              )
          : undefined,
      )
  await demoService?.bootstrap(options.seed ?? false)
  const requestServices = new WeakMap<FastifyRequest, DemoService>()
  const principals = new WeakMap<FastifyRequest, FinancialPrincipal>()
  const connectionPolicies = new WeakMap<FastifyRequest, ConsentLifecycleOptions>()
  const understandingPolicies = new WeakMap<FastifyRequest, UnderstandingConfiguration>()
  const notificationPolicies = new WeakMap<FastifyRequest, NotificationConfiguration>()
  const runtimePolicies = new WeakMap<FastifyRequest, RuntimeConfigurationSnapshot>()
  const durableSync = Boolean(options.financialScope && options.syncConfiguration)
  const sourceFactsRecorder =
    sourceJournal && options.encryption
      ? (db: Database, facts: Parameters<typeof recordSourceFacts>[2], at: string) =>
          recordSourceFacts(db, sourceJournal, facts, at, options.encryption as ProfileEncryption)
      : undefined
  const sourceErasureHooks: SourceErasureHooks = {
    beforeErase: (db, profileId, connectionId, at) =>
      cancelConnectionCreationIntents(db, profileId, at, connectionId),
    replayCreationIntents: (db, profileId, connectionId, intentIds, at) =>
      cancelRestoredConnectionCreationIntents(db, profileId, connectionId, intentIds, at),
    ...(options.encryption
      ? {
          eraseFinancialReferences: (
            db: Database,
            input: Parameters<typeof eraseUnderstandingFinancialReferences>[1],
          ) =>
            eraseUnderstandingFinancialReferences(
              db,
              input,
              options.encryption as ProfileEncryption,
            ),
        }
      : {}),
  }
  type IdentityExport = Awaited<
    ReturnType<ReturnType<typeof createLocalIdentity>['exportIdentity']>
  >
  const identityExports = new WeakMap<FastifyRequest, IdentityExport>()
  const acceptedEvents = new WeakMap<FastifyRequest, (() => void)[]>()
  const afterCommit = new WeakMap<FastifyRequest, (() => Promise<void>)[]>()
  const recordAccepted = (request: FastifyRequest, event: () => void) => {
    const events = acceptedEvents.get(request) ?? []
    events.push(event)
    acceptedEvents.set(request, events)
  }
  app.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode < 400) for (const event of acceptedEvents.get(request) ?? []) event()
    acceptedEvents.delete(request)
    if (
      durableSync &&
      reply.statusCode < 400 &&
      request.method === 'GET' &&
      request.routeOptions.url === '/v1/demo'
    ) {
      try {
        const principal = principals.get(request)
        if (options.foregroundRefresh)
          await options.foregroundRefresh({
            profileId: principal?.profileId ?? serviceFor(request).profileId,
            sessionId: principal?.sessionId ?? 'demo-local',
            editor: principal ? principal.role !== 'viewer' : true,
          })
        else await coordinatorFor(request).recordActivity()
      } catch {
        options.observability?.recordFailure('internal')
      }
    }
  })
  const serviceFor = (request: FastifyRequest) => {
    const service = requestServices.get(request) ?? demoService
    if (!service) throw new Problem(401, 'session_invalid', 'Accedi di nuovo per continuare.')
    return service
  }
  const notificationFor = (request: FastifyRequest) => {
    const service = serviceFor(request)
    return new NotificationsService(
      service.db,
      service.profileId,
      options.now,
      notificationPolicies.get(request) ?? DEFAULT_NOTIFICATION_CONFIGURATION,
    )
  }
  const ownedExportFor = async (request: FastifyRequest) => {
    const service = serviceFor(request)
    const snapshot = json({
      ...(await service.export()),
      ...(sourceJournal && options.encryption
        ? {
            understandingPersistence: await exportUnderstandingPersistence(
              service.db,
              service.profileId,
              options.encryption,
            ),
          }
        : {}),
      ...(sourceJournal && options.encryption
        ? await new SourceErasureService(
            service.db,
            service.profileId,
            options.encryption,
            sourceJournal,
            options.now,
            sourceErasureHooks,
          ).ownedExport()
        : {}),
    })
    validateOwnershipExport(snapshot, {
      ...(sourceJournal
        ? {
            verifySourceErasure: (input) => sourceJournal.verifyReceipt(input),
          }
        : {}),
    })
    return snapshot
  }
  const publishExportReady = async (request: FastifyRequest, exportedAt: string) => {
    try {
      await notificationFor(request).publish('export_ready', `export:${exportedAt}`)
    } catch {
      // A content-free notice must not take away an otherwise available ownership export.
      options.observability?.recordFailure('internal')
    }
  }
  const recurringFor = (request: FastifyRequest) => {
    const service = serviceFor(request)
    return new RecurringService(service, service.recurringPolicy, async (_db, data) => {
      const evidence: Record<string, RecurringEvidence> = {}
      for (const resolution of data.merchantContext.resolutions)
        evidence[resolution.transactionId] = {
          merchantResolution: resolution.status,
          ...(resolution.merchantId ? { merchantId: resolution.merchantId } : {}),
        }
      return evidence
    })
  }
  const coordinatorFor = (request: FastifyRequest) => {
    const profileId = principals.get(request)?.profileId ?? demoService?.profileId
    const configuration = runtimePolicies.get(request)
    if (!profileId) throw new Problem(401, 'session_invalid', 'Accedi di nuovo per continuare.')
    if (!options.financialScope || !configuration) throw new Error('Durable sync is unavailable')
    const scope: FinancialScope = (id, work, scopeOptions) =>
      options.financialScope
        ? options.financialScope(
            id,
            async (db) => {
              if (sourceJournal && options.encryption)
                await assertSourceErasureReady(db, id, sourceJournal, options.encryption)
              return work(db)
            },
            scopeOptions,
          )
        : Promise.reject(new Error('Financial scope is unavailable'))
    return new SyncCoordinator({
      scope,
      profileId,
      provider: provider,
      configuration,
      ...(options.now ? { now: options.now } : {}),
      ...(options.encryption ? { encryption: options.encryption } : {}),
      ...(sourceFactsRecorder ? { recordSourceFacts: sourceFactsRecorder } : {}),
      afterCompleted: async (job) => {
        try {
          await scope(profileId, async (db) => {
            const service = new DemoService(
              db,
              profileId,
              provider,
              options.now,
              options.encryption,
              connectionPolicies.get(request),
              configuration.values.recurring ?? DEFAULT_RECURRING_POLICY,
              sourceFactsRecorder,
            )
            const notices = new NotificationsService(
              db,
              profileId,
              options.now,
              notificationPolicies.get(request) ?? DEFAULT_NOTIFICATION_CONFIGURATION,
            )
            if ((await service.data()).analysis.reviewItems.length)
              await notices.publish('inbox', `sync:${job.id}`)
            if (job.report.balances.some((item) => item.result === 'mismatch'))
              await notices.publish('balance_mismatch', `sync-balance:${job.id}`, job.connectionId)
          })
        } catch {
          options.observability?.recordFailure('internal')
        }
      },
    })
  }
  const connectFor = async (
    request: FastifyRequest,
    institutionId?: string,
    accountKind?: Account['kind'],
  ) => {
    if (!durableSync) return serviceFor(request).connect(institutionId, accountKind)
    const coordinator = coordinatorFor(request)
    const scope = coordinator.options.scope
    const profileId = coordinator.options.profileId
    const configuration = runtimePolicies.get(request)
    if (!configuration) throw new Error('Connection configuration is unavailable')
    const connection = await new ConnectionCreationCoordinator({
      scope,
      profileId,
      provider: provider,
      attemptTimeoutMs: (configuration.values.sync ?? DEFAULT_SYNC_CONFIGURATION).attemptTimeoutMs,
      ...(options.now ? { now: options.now } : {}),
      compensate: (value) =>
        compensateConnectionCreationIntent(
          options.db,
          value,
          options.now?.() ?? new Date().toISOString(),
        ),
    }).connect({
      institutionId: institutionId ?? 'synthetic-italian',
      accountKind: accountKind ?? 'current',
    })
    await coordinator.sync(connection.id)
    return scope(profileId, (db) =>
      new DemoService(db, profileId, provider, options.now, options.encryption).connection(
        connection.id,
      ),
    )
  }
  app.addHook('onRoute', (route) => {
    if (
      !options.financialScope ||
      (durableSync &&
        route.method === 'POST' &&
        (route.url === '/v1/sync/start' ||
          route.url === '/v1/sync/:id/resume' ||
          route.url === '/v1/connections/:id/sync' ||
          route.url === '/v1/connections' ||
          route.url === '/v1/connections/mock')) ||
      !route.url.startsWith('/v1/') ||
      route.url.startsWith('/v1/auth/')
    )
      return
    const original = route.handler
    route.handler = async function (request, reply) {
      const principal = principals.get(request)
      const profileId = principal?.profileId ?? demoService?.profileId
      if (!profileId) throw new Problem(401, 'session_invalid', 'Accedi di nuovo per continuare.')
      const scope = options.financialScope
      if (!scope) throw new Error('Financial scope is unavailable')
      return scopedReply(
        (callback) =>
          scope(profileId, callback, {
            ...(request.method === 'GET' ? { isolationLevel: 'repeatable read' } : {}),
            ...(((request.method === 'DELETE' && route.url === '/v1/profile') ||
              (request.method === 'POST' && route.url === '/v1/profile/deletion')) &&
            principal
              ? { identityUserId: principal.userId }
              : {}),
          }),
        reply,
        async (db, buffered) => {
          if (sourceJournal && options.encryption)
            await assertSourceErasureReady(db, profileId, sourceJournal, options.encryption)
          requestServices.set(
            request,
            new DemoService(
              db,
              profileId,
              provider,
              options.now,
              options.encryption,
              connectionPolicies.get(request),
              runtimePolicies.get(request)?.values.recurring ?? DEFAULT_RECURRING_POLICY,
              sourceFactsRecorder,
            ),
          )
          return original.call(this, request, buffered)
        },
        async () => {
          for (const effect of afterCommit.get(request) ?? []) await effect()
          afterCommit.delete(request)
        },
      )
    }
  })
  app.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host
    if (host) {
      let hostname = ''
      try {
        hostname = new URL(`http://${host}`).hostname
      } catch {
        /* Invalid hosts fail closed. */
      }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname))
        throw new Problem(
          403,
          'host_forbidden',
          'Il servizio dimostrativo è disponibile solo in locale.',
        )
    }
    const origin = request.headers.origin
    if (origin) {
      if (!browserOrigins.has(origin))
        throw new Problem(
          403,
          'origin_forbidden',
          'Questa origine non può usare il servizio dimostrativo.',
        )
      reply
        .header('Access-Control-Allow-Origin', origin)
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Vary', 'Origin')
        .header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type')
    }
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
    if (request.method === 'OPTIONS') return reply.code(204).send(null)
    if (options.connectionLifecycleConfiguration)
      connectionPolicies.set(request, await options.connectionLifecycleConfiguration())
    if (options.understandingConfiguration)
      understandingPolicies.set(request, await options.understandingConfiguration())
    if (options.notificationConfiguration)
      notificationPolicies.set(request, await options.notificationConfiguration())
    if (options.syncConfiguration) runtimePolicies.set(request, await options.syncConfiguration())
    if (identity) {
      const path = request.routeOptions.url ?? request.url.split('?')[0] ?? '/'
      const mutation = !['GET', 'HEAD'].includes(request.method)
      identity.checkOrigin(requestHeaders(request), mutation)
      if (path.startsWith('/v1/') && !path.startsWith('/v1/auth/')) {
        const principal = await identity.financialPrincipal(requestHeaders(request), {
          mutation,
          ownerOnly:
            (request.method === 'DELETE' && path === '/v1/profile') ||
            (request.method === 'POST' && path === '/v1/profile/deletion') ||
            (request.method === 'DELETE' && path.startsWith('/v1/connections/')) ||
            (mutation && path.startsWith('/v1/support-access')),
          sensitive:
            path === '/v1/export' ||
            path === '/v1/export/archive' ||
            (request.method === 'POST' && path === '/v1/profile/deletion') ||
            (request.method === 'DELETE' &&
              (path === '/v1/profile' || path.startsWith('/v1/connections/'))),
        })
        principals.set(request, principal)
        if (path === '/v1/export' || path === '/v1/export/archive')
          identityExports.set(request, await identity.exportIdentity(requestHeaders(request)))
        requestServices.set(
          request,
          new DemoService(
            options.db,
            principal.profileId,
            provider,
            options.now,
            options.encryption,
            connectionPolicies.get(request),
            runtimePolicies.get(request)?.values.recurring ?? DEFAULT_RECURRING_POLICY,
            sourceFactsRecorder,
          ),
        )
      }
    }
  })
  app.setErrorHandler((error, request, reply) => {
    const failure = error as { validation?: unknown; statusCode?: number }
    const problem =
      error instanceof ProfileScopeError
        ? new Problem(404, 'not_found', 'La risorsa richiesta non è disponibile.')
        : error instanceof Problem
          ? error
          : new Problem(
              failure.validation || failure.statusCode === 400
                ? 400
                : failure.statusCode === 413
                  ? 413
                  : 500,
              failure.validation
                ? 'invalid_request'
                : failure.statusCode === 413
                  ? 'request_too_large'
                  : 'request_failed',
              failure.validation || failure.statusCode === 400
                ? 'La richiesta non è valida.'
                : failure.statusCode === 413
                  ? 'La richiesta supera il limite consentito.'
                  : 'Il servizio non è disponibile. Riprova tra poco.',
            )
    reply
      .code(problem.status)
      .type('application/problem+json')
      .send({
        type: `urn:lilleri:problem:${problem.code}`,
        title: problem.status < 500 ? 'Richiesta non completata' : 'Servizio non disponibile',
        status: problem.status,
        code: problem.code,
        detail: problem.message,
        instance: request.url.split('?')[0] ?? '/',
      })
  })
  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .type('application/problem+json')
      .send({
        type: 'urn:lilleri:problem:not_found',
        title: 'Risorsa non trovata',
        status: 404,
        code: 'not_found',
        detail: 'La risorsa richiesta non è disponibile.',
        instance: request.url.split('?')[0] ?? '/',
      }),
  )
  if (identity && options.localIdentity) {
    const local = options.localIdentity
    app.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      handler: async (request, reply) => {
        const response = await identity.handler(
          new Request(new URL(request.url, local.baseURL), {
            method: request.method,
            headers: requestHeaders(request),
            ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
          }),
        )
        for (const [name, value] of response.headers)
          if (name !== 'set-cookie') reply.header(name, value)
        const cookies = response.headers.getSetCookie()
        if (cookies.length) reply.header('set-cookie', cookies)
        return reply.code(response.status).send(await response.text())
      },
    })
    app.get(
      '/v1/auth/principal',
      {
        schema: {
          response: {
            200: z.object({
              userId: z.string(),
              sessionId: z.string(),
              profileId: z.string(),
              role: z.enum(['owner', 'editor', 'viewer']),
            }),
            ...errors,
          },
        },
      },
      async (request) => identity.financialPrincipal(requestHeaders(request)),
    )
    app.post(
      '/v1/auth/reauthenticate',
      {
        schema: {
          body: z
            .object({
              password: z.string().min(1).max(128),
              code: z
                .string()
                .regex(/^\d{6}$/)
                .optional(),
            })
            .strict(),
          response: {
            200: z.object({ verified: z.literal(true), expiresAt: z.string() }),
            ...errors,
          },
        },
      },
      async (request) =>
        identity.reauthenticate(requestHeaders(request), request.body.password, request.body.code),
    )
    const sessionsDto = z.array(
      z.object({
        id: z.string(),
        current: z.boolean(),
        createdAt: z.string(),
        expiresAt: z.string(),
      }),
    )
    app.get(
      '/v1/auth/sessions',
      { schema: { response: { 200: z.object({ sessions: sessionsDto }), ...errors } } },
      async (request) => ({ sessions: await identity.sessions(requestHeaders(request)) }),
    )
    app.delete(
      '/v1/auth/sessions/:id',
      { schema: { params: connectionParams, response: { 204: z.null(), ...errors } } },
      async (request, reply) => {
        await identity.revokeSession(requestHeaders(request), request.params.id)
        return reply.code(204).send(null)
      },
    )
    app.delete(
      '/v1/auth/sessions',
      { schema: { response: { 204: z.null(), ...errors } } },
      async (request, reply) => {
        await identity.revokeAllSessions(requestHeaders(request))
        return reply.code(204).send(null)
      },
    )
  }
  registerSettingsRoutes(app, async (request) => {
    const service = serviceFor(request)
    return new SettingsService(service.db, service.profileId, options.now)
  })
  registerManualRoutes(app, (request) => {
    const service = serviceFor(request)
    return new ManualService(
      service.db,
      service.profileId,
      options.now,
      options.encryption,
      sourceFactsRecorder,
    )
  })
  registerRulesRoutes(app, async (request) => {
    const service = serviceFor(request)
    return new RulesService(service.db, service.profileId, options.now, options.encryption)
  })
  registerConsentLifecycleRoutes(app, async (request) => {
    const service = serviceFor(request)
    return new ConsentLifecycleService(
      service.db,
      service.profileId,
      service.provider,
      options.now,
      connectionPolicies.get(request) ?? DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION,
    )
  })
  registerSupportAccessRoutes(app, async (request) => {
    const service = serviceFor(request)
    return new SupportAccessService(service.db, service.profileId, options.now)
  })
  registerPrivacyRoutes(app, async (request) => {
    const service = serviceFor(request)
    return new PrivacyService(service.db, service.profileId, options.now)
  })
  registerMerchantTaxonomyRoutes(app, (request) => {
    const service = serviceFor(request)
    return new MerchantTaxonomyService(
      service.db,
      service.profileId,
      options.now,
      options.encryption,
    )
  })
  registerRecurringRoutes(app, async (request) => recurringFor(request))
  if (durableSync) registerSyncRoutes(app, { coordinator: coordinatorFor, service: serviceFor })
  registerMappedImportRoutes(app, serviceFor)
  registerUnderstandingRoutes(
    app,
    async (request) =>
      new UnderstandingService(
        serviceFor(request),
        understandingPolicies.get(request) ?? {
          ...DEFAULT_UNDERSTANDING_CONFIGURATION,
          version: 'bootstrap-v1',
        },
      ),
  )
  if (sourceJournal && options.encryption)
    registerUnderstandingPersistenceRoutes(
      app,
      async (request) =>
        new UnderstandingPersistenceService(
          new UnderstandingService(
            serviceFor(request),
            understandingPolicies.get(request) ?? {
              ...DEFAULT_UNDERSTANDING_CONFIGURATION,
              version: 'bootstrap-v1',
            },
          ),
          options.encryption as ProfileEncryption,
          runtimePolicies.get(request)?.values.understandingPersistence ??
            DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
          sourceJournal,
          async (db, saved) => {
            const service = serviceFor(request)
            await new NotificationsService(
              db,
              service.profileId,
              () => saved.capturedAt,
              notificationPolicies.get(request) ?? DEFAULT_NOTIFICATION_CONFIGURATION,
            ).publish('summary_ready', saved.id)
          },
        ),
    )
  registerNotificationRoutes(app, async (request) => notificationFor(request))
  app.get(
    '/v1/revocations',
    { schema: { response: { 200: z.object({ revocations: z.array(revocationDto) }), ...errors } } },
    async (request) => serviceFor(request).revocations(),
  )
  app.get(
    '/health',
    {
      schema: {
        response: { 200: z.object({ status: z.literal('ok'), mode: z.literal('synthetic') }) },
      },
    },
    async () => ({ status: 'ok' as const, mode: 'synthetic' as const }),
  )
  app.get('/openapi.json', async () => app.swagger())
  const institutionDto = z.object({
    id: z.string(),
    providerId: z.string(),
    name: z.string(),
    countryCode: z.string(),
    accountTypes: z.array(
      z.object({
        kind: z.enum(['current', 'card', 'cash', 'savings']),
        availability: z.enum(['available', 'unavailable', 'unknown']),
        evidence: z.object({
          status: z.enum(['synthetic', 'verified', 'unverified', 'unknown']),
          environment: z.enum(['synthetic', 'sandbox', 'live']),
          reference: z.string().nullable(),
          checkedAt: z.string().nullable(),
        }),
        historyFrom: z.string().nullable(),
      }),
    ),
  })
  app.get(
    '/v1/institutions',
    {
      schema: {
        response: {
          200: z.object({
            mode: z.literal('synthetic'),
            providerId: z.string(),
            environment: z.enum(['synthetic', 'sandbox', 'live']),
            institutions: z.array(institutionDto),
          }),
          ...errors,
        },
      },
    },
    async (request) => json(await serviceFor(request).institutions()),
  )
  app.post(
    '/v1/connections',
    {
      schema: {
        body: z
          .object({
            institutionId: identifier,
            accountKind: z.enum(['current', 'card', 'cash', 'savings']),
          })
          .strict(),
        response: { 200: connectionDto, ...errors },
      },
    },
    async (request) => connectFor(request, request.body.institutionId, request.body.accountKind),
  )
  if (options.observability) {
    app.get('/internal/metrics', async (_request, reply) =>
      reply.type('text/plain; version=0.0.4').send(options.observability?.renderPrometheus()),
    )
    app.get('/internal/observability', async (_request, reply) => {
      if (!options.observability) throw new Error('Observability is unavailable')
      return reply
        .type('text/html; charset=utf-8')
        .send(renderObservabilityDashboard(options.observability))
    })
  }
  app.get(
    '/v1/demo',
    {
      schema: {
        summary: 'Profile-scoped synthetic overview',
        response: { 200: overviewDto, ...errors },
      },
    },
    async (request) => json(await serviceFor(request).overview()),
  )
  app.post(
    '/v1/connections/mock',
    { schema: { body: empty, response: { 200: connectionDto, ...errors } } },
    async (request) => connectFor(request),
  )
  app.post(
    '/v1/connections/:id/sync',
    {
      schema: {
        params: connectionParams,
        body: empty,
        response: {
          200: z.object({
            inserted: z.number().int(),
            updated: z.number().int(),
            unchanged: z.number().int(),
            rejected: z.number().int(),
            syncedAt: z.string(),
          }),
          ...errors,
        },
      },
    },
    async (request) => {
      const report = await serviceFor(request).sync(
        request.params.id,
        durableSync ? coordinatorFor(request) : undefined,
      )
      recordAccepted(request, () =>
        options.observability?.recordSync(report.rejected ? 'partial' : 'completed', report),
      )
      try {
        const service = serviceFor(request)
        if (!durableSync && (await service.data()).analysis.reviewItems.length)
          await notificationFor(request).publish('inbox', `review-after-sync:${report.syncedAt}`)
      } catch {
        options.observability?.recordFailure('internal')
      }
      return report
    },
  )
  app.post(
    '/v1/imports/csv',
    {
      bodyLimit: 600_000,
      schema: {
        summary: 'Atomically import a bounded CSV into an owned canonical account',
        body: z.object({ accountId: identifier, csv: z.string().min(1).max(262_144) }).strict(),
        response: {
          200: z.object({
            inserted: z.number().int(),
            updated: z.number().int(),
            unchanged: z.number().int(),
            rejected: z.number().int(),
            importedAt: z.string(),
          }),
          ...errors,
        },
      },
    },
    async (request) => serviceFor(request).importCsv(request.body.accountId, request.body.csv),
  )
  app.get(
    '/v1/transactions',
    {
      schema: {
        querystring: z
          .object({
            cursor: z.string().min(1).max(1024).optional(),
            limit: z.coerce.number().int().min(1).max(100).default(25),
          })
          .strict(),
        response: {
          200: z.object({ items: z.array(transactionDto), nextCursor: z.string().nullable() }),
          ...errors,
        },
      },
    },
    async (request) =>
      json(await serviceFor(request).page(request.query.cursor, request.query.limit)),
  )
  app.patch(
    '/v1/transactions/:id/classification',
    {
      schema: {
        params: connectionParams,
        body: z
          .object({
            categoryId: categories,
            scope: z.enum(['once', 'merchant']),
            revision: z.number().int().positive().max(2_147_483_647),
          })
          .strict(),
        response: { 200: classificationDto, ...errors },
      },
    },
    async (request) => {
      const classification = await serviceFor(request).correct(
        request.params.id,
        request.body.categoryId,
        request.body.scope,
        request.body.revision,
      )
      recordAccepted(request, () =>
        options.observability?.recordDecision('classification', 'corrected', 'user'),
      )
      return json(classification)
    },
  )
  app.patch(
    '/v1/reconciliation/:id',
    {
      schema: {
        params: z.object({ id: matchIdentifier }).strict(),
        body: z
          .object({
            state: z.enum(['confirmed', 'rejected', 'undone']),
            revision: reconciliationRevision,
          })
          .strict(),
        response: { 200: analysisDto, ...errors },
      },
    },
    async (request) => {
      const analysis = await serviceFor(request).decide(
        request.params.id,
        request.body.state,
        request.body.revision,
      )
      recordAccepted(request, () =>
        options.observability?.recordDecision('reconciliation', request.body.state, 'user'),
      )
      return json(analysis)
    },
  )
  app.delete(
    '/v1/connections/:id',
    {
      schema: {
        params: connectionParams,
        body: z.strictObject({ data: z.enum(['retain', 'erase']) }).nullish(),
        response: { 204: z.null(), ...errors },
      },
    },
    async (request, reply) => {
      const service = serviceFor(request)
      if (request.body?.data === 'erase') {
        if (!sourceJournal || !options.encryption)
          throw new Problem(
            409,
            'source_erasure_unavailable',
            'La cancellazione della fonte non è disponibile in questo ambiente.',
          )
        await new SourceErasureService(
          service.db,
          service.profileId,
          options.encryption,
          sourceJournal,
          options.now,
          sourceErasureHooks,
        ).erase(request.params.id)
      } else await service.disconnect(request.params.id)
      return reply.code(204).send(null)
    },
  )
  app.get(
    '/v1/export',
    {
      schema: {
        summary: 'Export saved data, immutable source observations, consent and user decisions',
        response: { 200: exportDto, ...errors },
      },
    },
    async (request, reply) => {
      reply.header('Content-Disposition', 'attachment; filename="lilleri-demo-export.json"')
      const exported = await ownedExportFor(request)
      return exportDto.parse(
        identity ? { ...exported, identity: identityExports.get(request) } : exported,
      )
    },
  )
  for (const method of ['GET', 'POST'] as const)
    app.route({
      method,
      url: '/v1/export/archive',
      schema: {
        summary: 'Download a bounded scoped ZIP containing CSV, JSON, events and JSON Schema',
        ...(method === 'POST' ? { body: empty } : {}),
        response: { 200: z.unknown(), ...errors },
      },
      handler: async (request, reply) => {
        const exported = await ownedExportFor(request)
        const snapshot = exportDto.parse(
          identity ? { ...exported, identity: identityExports.get(request) } : exported,
        )
        const archive = await createDataExportArchive(snapshot, {
          ...(sourceJournal
            ? {
                verifySourceErasure: (input) => sourceJournal.verifyReceipt(input),
              }
            : {}),
        })
        if (method === 'POST') await publishExportReady(request, snapshot.exportedAt)
        return reply
          .type(archive.contentType)
          .header('Content-Disposition', `attachment; filename="${archive.filename}"`)
          .send(archive.body)
      },
    })
  const eraseOwnedProfile = async (request: FastifyRequest) => {
    // The onRequest hook already captured the verified sensitive owner before the SQL scope.
    const principal = principals.get(request)
    if (identity && principal?.role !== 'owner')
      throw new Problem(404, 'not_found', 'La risorsa richiesta non è disponibile.')
    const service = serviceFor(request)
    await service.erase(
      identity && principal ? (db) => identity.eraseIdentity(principal, db) : undefined,
    )
    return service.profileId
  }
  const destroyKey = async (profileId: string) => {
    if (!options.encryption) return 'not_configured' as const
    try {
      await options.encryption.finalizeErasure(profileId)
      return 'destroyed_local_adapter' as const
    } catch {
      options.observability?.recordFailure('internal')
      return 'pending' as const
    }
  }
  app.post(
    '/v1/profile/deletion',
    {
      schema: { body: empty, response: { 200: DELETION_CERTIFICATE_SCHEMA, ...errors } },
    },
    async (request, reply) => {
      const profileId = await eraseOwnedProfile(request)
      // The scoped reply holds this object until the post-commit certificate is populated.
      const certificate = {} as z.infer<typeof DELETION_CERTIFICATE_SCHEMA>
      const finish = async () =>
        Object.assign(
          certificate,
          await createDeletionCertificate(options.db, profileId, {
            ...(options.now ? { now: options.now } : {}),
            keyErasure: await destroyKey(profileId),
          }),
        )
      if (options.financialScope)
        afterCommit.set(request, [
          async () => {
            await finish()
          },
        ])
      else await finish()
      return reply.send(certificate)
    },
  )
  app.delete(
    '/v1/profile',
    { schema: { response: { 204: z.null(), ...errors } } },
    async (request, reply) => {
      const profileId = await eraseOwnedProfile(request)
      if (options.financialScope)
        afterCommit.set(request, [
          async () => {
            await destroyKey(profileId)
          },
        ])
      else await destroyKey(profileId)
      return reply.code(204).send(null)
    },
  )
  return app
}
