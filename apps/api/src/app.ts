import swagger from '@fastify/swagger'
import type { Database } from '@lilleri/database'
import { CATEGORIES } from '@lilleri/domain'
import { type FinancialDataProvider, MockItalianProvider } from '@lilleri/financial-providers'
import Fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Problem } from './problem.js'
import { DemoService, json } from './service.js'

const categories = z.enum(
  Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]],
)
const identifier = z.string().min(1).max(256)
const matchIdentifier = z.string().min(1).max(600)
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
const exportDto = overviewDto.extend({
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
      payload: z.record(z.string(), z.unknown()),
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
  403: problemDto,
  404: problemDto,
  409: problemDto,
  422: problemDto,
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
  assertDemoConfiguration(options.demoMode, options.environment ?? process.env.NODE_ENV)
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
    transform: jsonSchemaTransform,
  })
  const service = new DemoService(
    options.db,
    options.profileId ?? 'profile_demo',
    options.provider ?? new MockItalianProvider(),
    options.now,
  )
  await service.bootstrap(options.seed ?? false)
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
      if (!allowedOrigins.has(origin))
        throw new Problem(
          403,
          'origin_forbidden',
          'Questa origine non può usare il servizio dimostrativo.',
        )
      reply
        .header('Access-Control-Allow-Origin', origin)
        .header('Vary', 'Origin')
        .header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type')
    }
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
    if (request.method === 'OPTIONS') return reply.code(204).send(null)
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
    async () => json(await service.overview()),
  )
  app.post(
    '/v1/connections/mock',
    { schema: { body: empty, response: { 200: connectionDto, ...errors } } },
    async () => service.connect(),
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
    async (request) => service.sync(request.params.id),
  )
  app.post(
    '/v1/imports/csv',
    {
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
    async (request) => service.importCsv(request.body.accountId, request.body.csv),
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
    async (request) => json(await service.page(request.query.cursor, request.query.limit)),
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
        await service.correct(
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
        body: z.object({ state: z.enum(['confirmed', 'rejected', 'undone']) }).strict(),
        response: { 200: analysisDto, ...errors },
      },
    },
    async (request) => json(await service.decide(request.params.id, request.body.state)),
  )
  app.delete(
    '/v1/connections/:id',
    { schema: { params: connectionParams, response: { 204: z.null(), ...errors } } },
    async (request, reply) => {
      await service.disconnect(request.params.id)
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
    async (_request, reply) => {
      reply.header('Content-Disposition', 'attachment; filename="lilleri-demo-export.json"')
      return json(await service.export())
    },
  )
  app.delete(
    '/v1/profile',
    { schema: { response: { 204: z.null(), ...errors } } },
    async (_request, reply) => {
      await service.erase()
      return reply.code(204).send(null)
    },
  )
  return app
}
