import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Problem } from './problem.js'
import type { DemoService } from './service.js'
import { listSyncJobs, readSyncJob, type SyncCoordinator } from './sync-jobs.js'

const id = z.string().min(1).max(200),
  count = z.number().int().nonnegative()
const issueDto = z
  .object({
    id,
    kind: z.enum(['balance_mismatch', 'removed_by_source', 'history_gap', 'pending_absent']),
    accountId: id,
    transactionId: id.nullable(),
  })
  .strict()
export const syncReportDto = z
  .object({
    inserted: count,
    updated: count,
    unchanged: count,
    rejected: count,
    syncedAt: z.string().nullable(),
    payloadRecords: count,
    processedRecords: count,
    pages: count,
    windowsCompleted: count,
    windowsTotal: count,
    pending: count,
    pendingReplaced: count,
    pendingUnresolved: count,
    removedBySource: count,
    coverage: z.enum(['complete_requested_interval', 'partial', 'unknown']),
    historyFrom: z.string().nullable(),
    outcomes: z.array(
      z
        .object({
          transactionId: id,
          outcome: z.enum([
            'inserted',
            'updated',
            'unchanged',
            'rejected',
            'duplicate_payload',
            'pending_replaced',
            'removed_by_source',
          ]),
          reason: z.string().nullable(),
        })
        .strict(),
    ),
    balances: z.array(
      z
        .object({
          accountId: id,
          currency: z.string().length(3),
          providerAmountMinor: z.string().regex(/^-?\d+$/u),
          expectedAmountMinor: z
            .string()
            .regex(/^-?\d+$/u)
            .nullable(),
          result: z.enum(['equal', 'mismatch', 'not_comparable']),
          reason: z.enum([
            'opening_anchor_missing',
            'balance_meaning_unknown',
            'interval_incomplete',
            'same_reference',
            'currency_or_date_mismatch',
          ]),
        })
        .strict(),
    ),
    issues: z.array(issueDto),
  })
  .strict()
export const syncJobDto = z
  .object({
    id,
    profileId: id,
    connectionId: id,
    consentId: id,
    providerId: id,
    requestId: id,
    mode: z.enum(['user_present', 'unattended']),
    requestedFrom: z.string().nullable(),
    requestedTo: z.string(),
    state: z.enum([
      'queued',
      'running',
      'partial',
      'retry_wait',
      'blocked',
      'completed',
      'failed',
      'cancelled',
    ]),
    reason: z
      .enum([
        'budget_reached',
        'inactive',
        'policy_unknown',
        'provider_unavailable',
        'rate_limited',
        'timeout',
        'invalid_provider_contract',
        'bound_reached',
        'consent_inactive',
        'snapshot_expired',
        'history_gap',
        'partial',
      ])
      .nullable(),
    configurationRevision: z.number().int().positive(),
    configurationDigest: z.string().regex(/^[a-f0-9]{64}$/u),
    leaseExpiresAt: z.string().nullable(),
    leaseEpoch: count,
    failures: count,
    availableAt: z.string(),
    revision: z.number().int().positive(),
    report: syncReportDto,
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .strict()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)
export interface SyncRouteOptions {
  readonly coordinator: (request: FastifyRequest) => SyncCoordinator | Promise<SyncCoordinator>
  readonly service: (request: FastifyRequest) => DemoService
}
/** Root excludes ONLY POST start/resume from its encompassing SQL scope. */
export function registerSyncRoutes(app: FastifyInstance, options: SyncRouteOptions) {
  const routes = app.withTypeProvider<ZodTypeProvider>()
  routes.post(
    '/v1/sync/start',
    {
      schema: {
        summary: 'Avvia un aggiornamento sintetico durevole',
        body: z
          .object({
            connectionId: id,
            requestId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/u),
            mode: z.literal('user_present'),
            from: date.optional(),
            to: date.optional(),
          })
          .strict(),
        response: { 200: syncJobDto },
      },
    },
    async (request) => {
      const coordinator = await options.coordinator(request),
        { connectionId, ...input } = request.body
      return syncJobDto.parse(
        await coordinator.start(connectionId, {
          requestId: input.requestId,
          mode: input.mode,
          ...(input.from === undefined ? {} : { from: input.from }),
          ...(input.to === undefined ? {} : { to: input.to }),
        }),
      )
    },
  )
  routes.post(
    '/v1/sync/:id/resume',
    {
      schema: {
        summary: 'Riprendi una tranche limitata con presenza utente',
        params: z.object({ id }).strict(),
        body: z.object({}).strict(),
        response: { 200: syncJobDto },
      },
    },
    async (request) => {
      const coordinator = await options.coordinator(request),
        job = await coordinator.get(request.params.id)
      if (job.mode !== 'user_present')
        throw new Problem(
          409,
          'sync_resume_unsupported',
          'Questo aggiornamento automatico viene ripreso dal pianificatore.',
        )
      return syncJobDto.parse(await coordinator.run(job.id))
    },
  )
  routes.get(
    '/v1/sync/:id',
    {
      schema: {
        summary: 'Progresso e report di aggiornamento',
        params: z.object({ id }).strict(),
        response: { 200: syncJobDto },
      },
    },
    async (request) => {
      const service = options.service(request)
      return syncJobDto.parse(await readSyncJob(service.db, service.profileId, request.params.id))
    },
  )
  routes.get(
    '/v1/connections/:id/sync-jobs',
    {
      schema: {
        summary: 'Storico aggiornamenti del collegamento',
        params: z.object({ id }).strict(),
        response: { 200: z.array(syncJobDto) },
      },
    },
    async (request) => {
      const service = options.service(request)
      return z
        .array(syncJobDto)
        .parse(await listSyncJobs(service.db, service.profileId, request.params.id))
    },
  )
}
