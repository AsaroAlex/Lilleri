import swagger from '@fastify/swagger'
import type { Database } from '@lilleri/database'
import { CATEGORIES } from '@lilleri/domain'
import { type FinancialDataProvider, MockItalianProvider } from '@lilleri/financial-providers'
import Fastify, { type FastifyRequest } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createDataExportArchive } from './data-export.js'
import { createLocalIdentity, type LocalIdentityOptions } from './identity.js'
import { ManualService, manualAuditDto, registerManualRoutes } from './manual-service.js'
import { Problem } from './problem.js'
import { RulesService, registerRulesRoutes, ruleDtoSchema, ruleEventDtoSchema } from './rules.js'
import { DemoService, json } from './service.js'
import {
  registerSettingsRoutes,
  SettingsService,
  settingsDtoSchema,
  settingsEventDtoSchema,
} from './settings.js'

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
const exportDto = overviewDto.extend({
  rules: z.array(ruleDtoSchema),
  ruleEvents: z.array(ruleEventDtoSchema),
  revocationJobs: z.array(revocationDto),
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
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
export interface AppOptions {
  readonly db: Database
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
        options.provider ?? new MockItalianProvider(),
        options.now,
      )
  await demoService?.bootstrap(options.seed ?? false)
  const requestServices = new WeakMap<FastifyRequest, DemoService>()
  const serviceFor = (request: FastifyRequest) => {
    const service = demoService ?? requestServices.get(request)
    if (!service) throw new Problem(401, 'session_invalid', 'Accedi di nuovo per continuare.')
    return service
  }
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
    if (identity) {
      const path = request.routeOptions.url ?? request.url.split('?')[0] ?? '/'
      const mutation = !['GET', 'HEAD'].includes(request.method)
      identity.checkOrigin(requestHeaders(request), mutation)
      if (path.startsWith('/v1/') && !path.startsWith('/v1/auth/')) {
        const principal = await identity.financialPrincipal(requestHeaders(request), {
          mutation,
          ownerOnly: request.method === 'DELETE' && path === '/v1/profile',
          sensitive:
            path === '/v1/export' ||
            path === '/v1/export/archive' ||
            (request.method === 'DELETE' &&
              (path === '/v1/profile' || path.startsWith('/v1/connections/'))),
        })
        requestServices.set(
          request,
          new DemoService(
            options.db,
            principal.profileId,
            options.provider ?? new MockItalianProvider(),
            options.now,
          ),
        )
      }
    }
  })
  app.setErrorHandler((error, request, reply) => {
    const failure = error as { validation?: unknown; statusCode?: number }
    const problem =
      error instanceof Problem
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
  registerSettingsRoutes(
    app,
    async (request) => new SettingsService(options.db, serviceFor(request).profileId, options.now),
  )
  registerManualRoutes(
    app,
    (request) => new ManualService(options.db, serviceFor(request).profileId, options.now),
  )
  registerRulesRoutes(
    app,
    async (request) => new RulesService(options.db, serviceFor(request).profileId, options.now),
  )
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
    async (request) => serviceFor(request).connect(),
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
    async (request) => serviceFor(request).sync(request.params.id),
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
    async (request) =>
      json(
        await serviceFor(request).correct(
          request.params.id,
          request.body.categoryId,
          request.body.scope,
          request.body.revision,
        ),
      ),
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
    async (request) =>
      json(
        await serviceFor(request).decide(
          request.params.id,
          request.body.state,
          request.body.revision,
        ),
      ),
  )
  app.delete(
    '/v1/connections/:id',
    { schema: { params: connectionParams, response: { 204: z.null(), ...errors } } },
    async (request, reply) => {
      await serviceFor(request).disconnect(request.params.id)
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
      const exported = json(await serviceFor(request).export())
      return identity
        ? { ...exported, identity: await identity.exportIdentity(requestHeaders(request)) }
        : exported
    },
  )
  app.get(
    '/v1/export/archive',
    {
      schema: {
        summary: 'Download a bounded scoped ZIP containing CSV, JSON, events and JSON Schema',
        response: { 200: z.unknown(), ...errors },
      },
    },
    async (request, reply) => {
      const exported = json(await serviceFor(request).export())
      const snapshot = exportDto.parse(
        identity
          ? { ...exported, identity: await identity.exportIdentity(requestHeaders(request)) }
          : exported,
      )
      const archive = await createDataExportArchive(snapshot)
      return reply
        .type(archive.contentType)
        .header('Content-Disposition', `attachment; filename="${archive.filename}"`)
        .send(archive.body)
    },
  )
  app.delete(
    '/v1/profile',
    { schema: { response: { 204: z.null(), ...errors } } },
    async (request, reply) => {
      const principal = identity
        ? await identity.financialPrincipal(requestHeaders(request), {
            mutation: true,
            sensitive: true,
            ownerOnly: true,
          })
        : undefined
      await serviceFor(request).erase(
        identity && principal ? (db) => identity.eraseIdentity(principal, db) : undefined,
      )
      return reply.code(204).send(null)
    },
  )
  return app
}
