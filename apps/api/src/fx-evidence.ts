import { randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { parseDecimal } from '@lilleri/domain'
import { type ProviderFxEvidence, stableId } from '@lilleri/financial-providers'
import { and, asc, desc, eq, lt } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { EncryptionFailure, type ProfileEncryption } from './encryption.js'
import {
  type FxEvidenceEvent,
  type FxPayload,
  fxEvidenceDto,
  fxEvidenceEventDto,
  fxOwnershipDto,
  fxPayloadDto,
  providerFxEvidenceSchema,
} from './fx-evidence-dto.js'
import { fxEvidenceEvents } from './fx-evidence-schema.js'
import { notFound, Problem } from './problem.js'
import type { ResolvedSyncIdentity } from './sync-identity.js'
import { SyncContractError, syncHash } from './sync-provider.js'
import type { SyncReport, syncJobs } from './sync-schema.js'

const context = (profileId: string, rowId: string) => ({
  profileId,
  table: 'transaction_fx_evidence',
  column: 'payload',
  rowId,
})
const exact = (money: { amount: string; currency: string } | null) => {
  if (!money) return null
  const value = parseDecimal(money.amount, money.currency as Parameters<typeof parseDecimal>[1])
  return { amountMinor: String(value.amountMinor), currency: value.currency }
}

/** Source money is evidence alongside the ledger. It never changes the booked amount or totals. */
export function normalizeFxEvidence(
  evidence: ProviderFxEvidence | undefined,
  ledgerAmount: { amountMinor: string; currency: string },
  observedAt: string,
): FxPayload {
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error('Invalid FX observation clock')
  const parsed = evidence === undefined ? null : providerFxEvidenceSchema.parse(evidence)
  const original = exact(parsed?.original ?? null),
    billed = exact(parsed?.billed ?? null),
    rate = parsed?.rate ?? null
  const issues: FxPayload['issues'] = []
  if (!original) issues.push('missing_original')
  if (!billed) issues.push('missing_billed')
  if (!rate) issues.push('missing_rate')
  else if (!rate.date) issues.push('missing_rate_date')
  if (!parsed?.sourceReference) issues.push('missing_source_reference')
  if (
    billed &&
    (billed.amountMinor !== ledgerAmount.amountMinor || billed.currency !== ledgerAmount.currency)
  )
    issues.push('billed_ledger_mismatch')
  if (
    rate &&
    original &&
    billed &&
    (rate.baseCurrency !== original.currency || rate.quoteCurrency !== billed.currency)
  )
    issues.push('rate_pair_mismatch')
  if (original && billed && BigInt(original.amountMinor) < 0n !== BigInt(billed.amountMinor) < 0n)
    issues.push('amount_direction_mismatch')
  if (rate?.date && rate.date > new Date(observedAt).toISOString().slice(0, 10))
    issues.push('future_rate_date')
  const conflict = issues.some((issue) =>
    [
      'billed_ledger_mismatch',
      'rate_pair_mismatch',
      'amount_direction_mismatch',
      'future_rate_date',
    ].includes(issue),
  )
  return fxPayloadDto.parse({
    version: 'transaction-fx-v1',
    state: conflict
      ? 'conflict'
      : !parsed || (!original && !billed && !rate && !parsed.sourceReference)
        ? 'unknown'
        : issues.length
          ? 'partial'
          : 'complete',
    original,
    billed,
    rate,
    sourceReference: parsed?.sourceReference ?? null,
    ledgerAmount,
    issues,
  })
}

interface Capture {
  readonly transactionId: string
  readonly providerId: string
  readonly observedAt: string
  readonly observationId?: string | null
  readonly jobId?: string | null
  readonly evidence?: ProviderFxEvidence
}

/** Call only inside the completed ingestion transaction, after resolving/upserting canonical IDs. */
export async function recordFxEvidence(
  db: Database,
  profileId: string,
  input: Capture,
  encryption?: ProfileEncryption,
): Promise<boolean> {
  const [transaction] = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.profileId, profileId),
        eq(schema.transactions.id, input.transactionId),
      ),
    )
    .for('update')
  if (!transaction || transaction.providerId !== input.providerId || transaction.source !== 'bank')
    throw notFound()
  // Legacy plaintext synthetic callers can omit evidence. Explicit evidence is always encrypted.
  if (!encryption) {
    if (input.evidence !== undefined) throw new EncryptionFailure()
    return false
  }
  const observedAt = new Date(input.observedAt).toISOString()
  const payload = normalizeFxEvidence(
    input.evidence,
    { amountMinor: String(transaction.amountMinor), currency: transaction.currency },
    observedAt,
  )
  const [prior] = await db
    .select()
    .from(fxEvidenceEvents)
    .where(
      and(
        eq(fxEvidenceEvents.profileId, profileId),
        eq(fxEvidenceEvents.transactionId, transaction.id),
      ),
    )
    .orderBy(desc(fxEvidenceEvents.revision))
    .limit(1)
  if (prior) {
    const previous = fxPayloadDto.parse(
      await encryption.decryptJson(db, context(profileId, prior.id), prior.payload),
    )
    if (Date.parse(observedAt) < Date.parse(prior.observedAt))
      throw new Problem(
        409,
        'fx_observation_regression',
        'La prova valutaria è precedente ai dati già acquisiti.',
      )
    if (JSON.stringify(previous) === JSON.stringify(payload)) return false
  }
  const observationId = input.observationId ?? null,
    jobId = input.jobId ?? null
  if (observationId) {
    const [observation] = await db
      .select()
      .from(schema.observations)
      .where(
        and(
          eq(schema.observations.profileId, profileId),
          eq(schema.observations.id, observationId),
        ),
      )
    if (
      !observation ||
      observation.connectionId !== transaction.connectionId ||
      observation.accountId !== transaction.accountId ||
      observation.providerId !== transaction.providerId
    )
      throw notFound()
  }
  if (jobId) {
    // The FK also binds the connection. No provider credential or consent token is retained here.
    const { syncJobs } = await import('./sync-schema.js')
    const [job] = await db
      .select()
      .from(syncJobs)
      .where(and(eq(syncJobs.profileId, profileId), eq(syncJobs.id, jobId)))
    if (
      !job ||
      job.connectionId !== transaction.connectionId ||
      job.providerId !== transaction.providerId
    )
      throw notFound()
  }
  const id = `fx_${randomUUID()}`
  await db.insert(fxEvidenceEvents).values({
    id,
    profileId,
    connectionId: transaction.connectionId,
    accountId: transaction.accountId,
    transactionId: transaction.id,
    providerId: transaction.providerId,
    revision: (prior?.revision ?? 0) + 1,
    observedAt,
    observationId,
    jobId,
    payload: await encryption.encryptJson(db, context(profileId, id), payload),
  })
  return true
}

/** Final-stage hook: aliases are resolved first and rejected status regressions get no FX version. */
export async function recordSyncFxEvidence(
  db: Database,
  job: typeof syncJobs.$inferSelect,
  resolved: readonly ResolvedSyncIdentity[],
  outcomes: SyncReport['outcomes'],
  observedAt: string,
  encryption?: ProfileEncryption,
) {
  const accepted = new Set(
    outcomes
      .filter((outcome) => ['inserted', 'updated', 'unchanged'].includes(outcome.outcome))
      .map((outcome) => outcome.transactionId),
  )
  const priority = { pending: 0, booked: 1, reversed: 2 }
  const selected = new Map<string, ResolvedSyncIdentity[]>()
  for (const item of resolved) {
    if (!accepted.has(item.transaction.id)) continue
    const previous = selected.get(item.transaction.id)
    if (
      !previous ||
      priority[item.transaction.status] > priority[previous[0]?.transaction.status ?? 'pending']
    )
      selected.set(item.transaction.id, [item])
    else if (item.transaction.status === previous[0]?.transaction.status) previous.push(item)
  }
  for (const group of selected.values()) {
    const item = group[0]
    if (!item) continue
    const ledger = {
      amountMinor: String(item.transaction.amount.amountMinor),
      currency: item.transaction.amount.currency,
    }
    const normalized = normalizeFxEvidence(item.raw.fxEvidence, ledger, observedAt)
    if (
      group.some(
        (other) =>
          JSON.stringify(normalizeFxEvidence(other.raw.fxEvidence, ledger, observedAt)) !==
          JSON.stringify(normalized),
      )
    )
      throw new SyncContractError('invalid_provider_contract')
    const observationId = stableId(
      'observation',
      job.profileId,
      job.connectionId,
      item.transaction.accountId,
      job.providerId,
      item.observationRecordId,
      item.raw.status,
      syncHash(item.raw),
    )
    await recordFxEvidence(
      db,
      job.profileId,
      {
        transactionId: item.transaction.id,
        providerId: job.providerId,
        observedAt,
        observationId,
        jobId: job.id,
        ...(item.raw.fxEvidence === undefined ? {} : { evidence: item.raw.fxEvidence }),
      },
      encryption,
    )
  }
}

async function decryptEvent(
  db: Database,
  row: typeof fxEvidenceEvents.$inferSelect,
  encryption?: ProfileEncryption,
): Promise<FxEvidenceEvent> {
  if (!encryption) throw new EncryptionFailure()
  const { householdId: _householdId, payload, ...metadata } = row
  return fxEvidenceEventDto.parse({
    ...metadata,
    ...fxPayloadDto.parse(
      await encryption.decryptJson(db, context(row.profileId, row.id), payload),
    ),
  })
}

export async function exportFxEvidence(
  db: Database,
  profileId: string,
  encryption?: ProfileEncryption,
) {
  const rows = await db
    .select()
    .from(fxEvidenceEvents)
    .where(eq(fxEvidenceEvents.profileId, profileId))
    .orderBy(asc(fxEvidenceEvents.transactionId), asc(fxEvidenceEvents.revision))
  const events = []
  for (const row of rows) events.push(await decryptEvent(db, row, encryption))
  return fxOwnershipDto.parse(events)
}

export class FxEvidenceService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly encryption?: ProfileEncryption,
  ) {}
  async get(transactionId: string, beforeRevision?: number) {
    return this.db.transaction(
      async (db) => {
        const [transaction] = await db
          .select({ id: schema.transactions.id })
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.profileId, this.profileId),
              eq(schema.transactions.id, transactionId),
            ),
          )
        if (!transaction) throw notFound()
        const owned = and(
          eq(fxEvidenceEvents.profileId, this.profileId),
          eq(fxEvidenceEvents.transactionId, transactionId),
        )
        const [latest] = await db
          .select()
          .from(fxEvidenceEvents)
          .where(owned)
          .orderBy(desc(fxEvidenceEvents.revision))
          .limit(1)
        const rows = await db
          .select()
          .from(fxEvidenceEvents)
          .where(
            and(
              owned,
              beforeRevision === undefined
                ? undefined
                : lt(fxEvidenceEvents.revision, beforeRevision),
            ),
          )
          .orderBy(desc(fxEvidenceEvents.revision))
          .limit(51)
        const current = latest ? await decryptEvent(db, latest, this.encryption) : null,
          history = []
        for (const row of rows.slice(0, 50))
          history.push(await decryptEvent(db, row, this.encryption))
        return fxEvidenceDto.parse({
          transactionId,
          state: current?.state ?? 'unknown',
          current,
          history,
          nextBeforeRevision: rows.length > 50 ? (history.at(-1)?.revision ?? null) : null,
        })
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
}

export function registerFxEvidenceRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<FxEvidenceService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/transactions/:transactionId/fx-evidence',
    {
      schema: {
        params: z.strictObject({ transactionId: z.string().min(1).max(256) }),
        querystring: z.strictObject({
          beforeRevision: z.coerce.number().int().positive().optional(),
        }),
        response: { 200: fxEvidenceDto },
      },
    },
    async (request) =>
      (await resolve(request)).get(request.params.transactionId, request.query.beforeRevision),
  )
}
