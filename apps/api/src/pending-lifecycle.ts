import { randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import type { Transaction } from '@lilleri/domain'
import { classify } from '@lilleri/engines'
import type { ProviderTransaction } from '@lilleri/financial-providers'
import { and, asc, eq, type SQL, sql } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ProfileEncryption } from './encryption.js'
import { MerchantTaxonomyService } from './merchant-taxonomy.js'
import { categoryAssignmentEvents, categoryAssignments } from './merchant-taxonomy-schema.js'
import {
  type PendingState,
  pendingLifecycleEvents,
  pendingLifecycles,
  type SourceRemovalChoice,
  sourceRemovalDecisionEvents,
  sourceRemovalDecisions,
} from './pending-lifecycle-schema.js'
import { transactionPrivacy, transactionPrivacyEvents } from './privacy-schema.js'
import { notFound, Problem } from './problem.js'
import { type SyncStage, syncHash } from './sync-provider.js'
import { type syncJobs, syncPresence } from './sync-schema.js'

type LedgerRow = typeof schema.transactions.$inferSelect
type LifecycleRow = typeof pendingLifecycles.$inferSelect
interface MoneyState {
  amountMinor: string
  currency: string
  status: string
  revision: number
}
interface PendingPayload {
  version: 'pending-lifecycle-v1'
  state: PendingState
  pending: MoneyState
  observed: MoneyState
  replacement: ({ id: string } & MoneyState) | null
  evidence: ProviderTransaction['pendingLifecycle'] | null
  carried: string[]
  decision: 'accepted' | 'rejected' | null
}
const context = (profileId: string, table: string, rowId: string) => ({
  profileId,
  table,
  column: 'payload',
  rowId,
})
const encode = (
  db: Database,
  profileId: string,
  table: string,
  id: string,
  value: unknown,
  encryption?: ProfileEncryption,
) =>
  encryption
    ? encryption.encryptJson(db, context(profileId, table, id), value)
    : Promise.resolve(JSON.stringify(value))
const decode = async <T>(
  db: Database,
  profileId: string,
  table: string,
  id: string,
  value: string,
  encryption?: ProfileEncryption,
): Promise<T> =>
  encryption
    ? encryption.decryptJson<T>(db, context(profileId, table, id), value)
    : (JSON.parse(value) as T)
const money = (row: LedgerRow): MoneyState => ({
  amountMinor: String(row.amountMinor),
  currency: row.currency,
  status: row.status,
  revision: row.revision,
})
const changed = () =>
  new Problem(
    409,
    'source_decision_changed',
    'Il movimento o la fonte sono cambiati. Aggiorna e ripeti la scelta.',
  )

/** Copy only absent explicit corrections, and preserve privacy even when a new ID appears. */
async function carryCorrections(
  db: Database,
  original: LedgerRow,
  replacement: LedgerRow,
  at: string,
  encryption?: ProfileEncryption,
) {
  const carried: string[] = []
  const [feedback] = await db
    .select()
    .from(schema.feedback)
    .where(
      and(
        eq(schema.feedback.profileId, original.profileId),
        eq(schema.feedback.transactionId, original.id),
      ),
    )
  if (feedback) {
    const inserted = await db
      .insert(schema.feedback)
      .values({ ...feedback, transactionId: replacement.id })
      .onConflictDoNothing()
      .returning()
    if (inserted.length) carried.push('category')
  }
  const [privacy] = await db
    .select()
    .from(transactionPrivacy)
    .where(
      and(
        eq(transactionPrivacy.profileId, original.profileId),
        eq(transactionPrivacy.transactionId, original.id),
      ),
    )
  if (privacy) {
    // A target's existing private/quiet restriction can never be weakened by carry-over.
    const [current] = await db
      .select()
      .from(transactionPrivacy)
      .where(
        and(
          eq(transactionPrivacy.profileId, original.profileId),
          eq(transactionPrivacy.transactionId, replacement.id),
        ),
      )
    if (!current) {
      await db
        .insert(transactionPrivacy)
        .values({ ...privacy, transactionId: replacement.id, revision: 2, updatedAt: at })
      await db.insert(transactionPrivacyEvents).values({
        id: `privacy_transaction_${randomUUID()}`,
        profileId: original.profileId,
        transactionId: replacement.id,
        revision: 2,
        before: { private: false, quiet: false },
        after: { private: privacy.private, quiet: privacy.quiet },
        occurredAt: at,
      })
      carried.push('privacy')
    } else if ((privacy.private && !current.private) || (privacy.quiet && !current.quiet)) {
      const after = {
        private: privacy.private || current.private,
        quiet: privacy.quiet || current.quiet,
      }
      await db
        .update(transactionPrivacy)
        .set({ ...after, revision: current.revision + 1, updatedAt: at })
        .where(
          and(
            eq(transactionPrivacy.profileId, original.profileId),
            eq(transactionPrivacy.transactionId, replacement.id),
          ),
        )
      await db.insert(transactionPrivacyEvents).values({
        id: randomUUID(),
        profileId: original.profileId,
        transactionId: replacement.id,
        revision: current.revision + 1,
        before: { private: current.private, quiet: current.quiet },
        after,
        occurredAt: at,
      })
      carried.push('privacy')
    }
  }
  const [assignment] = await db
    .select()
    .from(categoryAssignments)
    .where(
      and(
        eq(categoryAssignments.profileId, original.profileId),
        eq(categoryAssignments.transactionId, original.id),
      ),
    )
  const [currentAssignment] = await db
    .select()
    .from(categoryAssignments)
    .where(
      and(
        eq(categoryAssignments.profileId, original.profileId),
        eq(categoryAssignments.transactionId, replacement.id),
      ),
    )
  if (assignment && !currentAssignment) {
    const source = encryption
      ? await encryption.decryptJson<Record<string, unknown>>(
          db,
          {
            profileId: original.profileId,
            table: 'category_assignments',
            column: 'snapshot',
            rowId: original.id,
          },
          String(assignment.snapshot._lilleriEncrypted),
        )
      : assignment.snapshot
    const snapshot = { ...source, transactionId: replacement.id, revision: 2, updatedAt: at }
    await db.insert(categoryAssignments).values({
      ...assignment,
      transactionId: replacement.id,
      revision: 2,
      updatedAt: at,
      snapshot: encryption
        ? {
            _lilleriEncrypted: await encryption.encryptJson(
              db,
              {
                profileId: original.profileId,
                table: 'category_assignments',
                column: 'snapshot',
                rowId: replacement.id,
              },
              snapshot,
            ),
          }
        : snapshot,
    })
    const eventId = `category_assignment_${randomUUID()}`
    const eventSnapshot = { before: null, after: snapshot }
    await db.insert(categoryAssignmentEvents).values({
      id: eventId,
      profileId: original.profileId,
      transactionId: replacement.id,
      revision: 2,
      occurredAt: at,
      snapshot: encryption
        ? {
            _lilleriEncrypted: await encryption.encryptJson(
              db,
              {
                profileId: original.profileId,
                table: 'category_assignment_events',
                column: 'snapshot',
                rowId: eventId,
              },
              eventSnapshot,
            ),
          }
        : eventSnapshot,
    })
    carried.push('owned_category')
  }
  return carried
}
async function writeLifecycle(
  db: Database,
  original: LedgerRow,
  current: LifecycleRow | undefined,
  payload: PendingPayload,
  replacementId: string | null,
  firstSeenAt: string,
  at: string,
  encryption?: ProfileEncryption,
) {
  const digest = syncHash(payload)
  if (current?.digest === digest) return current
  const revision = (current?.revision ?? 0) + 1
  if (revision > 2_147_483_646) throw changed()
  const row = {
    transactionId: original.id,
    profileId: original.profileId,
    connectionId: original.connectionId,
    accountId: original.accountId,
    replacementTransactionId: replacementId,
    firstSeenAt,
    state: payload.state,
    revision,
    pendingRevision: original.revision,
    replacementRevision: payload.replacement?.revision ?? null,
    digest,
    payload: await encode(
      db,
      original.profileId,
      'pending_lifecycles',
      original.id,
      payload,
      encryption,
    ),
    updatedAt: at,
  }
  await db
    .insert(pendingLifecycles)
    .values(row)
    .onConflictDoUpdate({ target: pendingLifecycles.transactionId, set: row })
  const id = randomUUID()
  await db.insert(pendingLifecycleEvents).values({
    id,
    profileId: original.profileId,
    connectionId: original.connectionId,
    accountId: original.accountId,
    transactionId: original.id,
    replacementTransactionId: replacementId,
    revision,
    occurredAt: at,
    payload: await encode(
      db,
      original.profileId,
      'pending_lifecycle_events',
      id,
      { beforeDigest: current?.digest ?? null, firstSeenAt, ...payload },
      encryption,
    ),
  })
  return row
}

/** Runs only inside applySyncStage's final fenced transaction; terminal evidence is explicit. */
export async function recordPendingLifecycles(
  db: Database,
  job: typeof syncJobs.$inferSelect,
  stage: SyncStage,
  canonical: ReadonlyMap<string, Transaction>,
  at: string,
  encryption?: ProfileEncryption,
  previousTransactions?: ReadonlyMap<string, LedgerRow>,
) {
  const rows = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.profileId, job.profileId),
        eq(schema.transactions.connectionId, job.connectionId),
      ),
    )
  const stored = await db
    .select()
    .from(pendingLifecycles)
    .where(
      and(
        eq(pendingLifecycles.profileId, job.profileId),
        eq(pendingLifecycles.connectionId, job.connectionId),
      ),
    )
  const lifecycle = new Map(stored.map((row) => [row.transactionId, row]))
  const accounts = await db
    .select({ id: schema.accounts.id, providerAccountId: schema.accounts.providerAccountId })
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.profileId, job.profileId),
        eq(schema.accounts.connectionId, job.connectionId),
      ),
    )
  const providerAccounts = new Map(accounts.map((row) => [row.id, row.providerAccountId]))
  const links = new Map<string, LedgerRow[]>()
  for (const row of rows)
    if (canonical.has(row.id) && row.relatedTransactionId && row.status !== 'pending') {
      const linked = links.get(row.relatedTransactionId) ?? []
      linked.push(row)
      links.set(row.relatedTransactionId, linked)
    }
  for (const original of rows) {
    if (original.source !== 'bank') continue
    const current = lifecycle.get(original.id)
    const before = previousTransactions?.get(original.id)
    if (original.status !== 'pending' && !current && before?.status !== 'pending') continue
    const previous = current
      ? await decode<PendingPayload>(
          db,
          job.profileId,
          'pending_lifecycles',
          original.id,
          current.payload,
          encryption,
        )
      : undefined
    if (previous && syncHash(previous) !== current?.digest)
      throw new Error('Invalid pending lifecycle audit')
    const observed = canonical.get(original.id)
    const candidates = (links.get(original.id) ?? []).filter(
      (row) =>
        row.id !== original.id &&
        row.accountId === original.accountId &&
        row.providerId === original.providerId &&
        row.source === 'bank' &&
        row.currency === original.currency,
    )
    const replacement = candidates.length === 1 ? candidates[0] : undefined
    // Provider IDs are scoped by account; use its provider account identity for raw evidence.
    const terminalRecord = stage.records.find(
      (row) =>
        row.id === (replacement?.providerTransactionId ?? original.providerTransactionId) &&
        row.accountId === providerAccounts.get(original.accountId) &&
        row.pendingLifecycle,
    )
    const evidence = terminalRecord?.pendingLifecycle ?? null
    const initial = before?.status === 'pending' ? before : original
    const firstSeenAt = current?.firstSeenAt ?? initial.observedAt
    let state: PendingState = previous?.state ?? 'active'
    let target = previous?.replacement ?? null
    let carried = previous?.carried ?? []
    let proof = previous?.evidence ?? null
    let decision = previous?.decision ?? null
    if (
      observed?.status === 'pending' &&
      previous &&
      (previous.observed.amountMinor !== String(original.amountMinor) ||
        previous.observed.currency !== original.currency)
    ) {
      state = 'active'
      target = null
      proof = null
      decision = null
    }
    if (observed?.status === 'booked' && original.status === 'booked') {
      state = 'replaced'
      target = { id: original.id, ...money(original) }
      proof = null
      decision = null
    } else if (
      (observed?.status === 'reversed' || replacement?.status === 'reversed') &&
      evidence &&
      Date.parse(evidence.effectiveAt) <= Date.parse(stage.snapshot.observedAt) &&
      (!replacement || replacement.amountMinor === original.amountMinor)
    ) {
      state = evidence.state
      target = replacement ? { id: replacement.id, ...money(replacement) } : null
      proof = evidence
      decision = null
    } else if (candidates.length > 1) {
      state = 'amount_change_review'
      target = null
      proof = null
      decision = null
    } else if (replacement?.status === 'booked') {
      target = { id: replacement.id, ...money(replacement) }
      proof = null
      if (
        previous?.decision === 'rejected' &&
        previous.replacement?.id === replacement.id &&
        previous.replacement.revision === replacement.revision
      ) {
        state = 'amount_change_review'
      } else if (replacement.amountMinor === original.amountMinor) {
        state = 'replaced'
        carried = [
          ...new Set([
            ...carried,
            ...(await carryCorrections(db, original, replacement, at, encryption)),
          ]),
        ].sort()
      } else if (
        previous?.state !== 'replaced' ||
        previous.replacement?.id !== replacement.id ||
        previous.replacement.revision !== replacement.revision
      ) {
        state = 'amount_change_review'
        decision = null
      }
    }
    if (!current && !observed && !replacement) continue
    // Snapshot absence and clock passage cannot terminate a reservation.
    const payload: PendingPayload = {
      version: 'pending-lifecycle-v1',
      state,
      pending: previous?.pending ?? money(initial),
      observed: money(original),
      replacement: target,
      evidence: proof,
      carried,
      decision,
    }
    await writeLifecycle(
      db,
      original,
      current,
      payload,
      target?.id === original.id ? null : (target?.id ?? null),
      firstSeenAt,
      at,
      encryption,
    )
  }
  // A renewed source observation invalidates the earlier removal choice, even if content is unchanged.
  for (const row of rows)
    if (canonical.has(row.id)) {
      const [decision] = await db
        .select()
        .from(sourceRemovalDecisions)
        .where(
          and(
            eq(sourceRemovalDecisions.profileId, job.profileId),
            eq(sourceRemovalDecisions.transactionId, row.id),
          ),
        )
      if (decision && decision.choice !== 'undone')
        await writeRemovalDecision(
          db,
          row,
          decision,
          'undone',
          decision.presenceDigest,
          at,
          encryption,
          'source_returned',
        )
    }
}

function removalDigest(presence: typeof syncPresence.$inferSelect) {
  return syncHash({
    transactionId: presence.transactionId,
    state: presence.state,
    count: presence.missingCompletions,
    rule: presence.evidence.rule,
  })
}
async function writeRemovalDecision(
  db: Database,
  transaction: LedgerRow,
  previous: typeof sourceRemovalDecisions.$inferSelect | undefined,
  choice: SourceRemovalChoice,
  presenceDigest: string,
  at: string,
  encryption?: ProfileEncryption,
  reason = 'user_choice',
) {
  const revision = (previous?.revision ?? 1) + 1
  if (revision > 2_147_483_646) throw changed()
  const row = {
    transactionId: transaction.id,
    profileId: transaction.profileId,
    connectionId: transaction.connectionId,
    accountId: transaction.accountId,
    choice,
    revision,
    transactionRevision: transaction.revision,
    presenceDigest,
    updatedAt: at,
  }
  await db
    .insert(sourceRemovalDecisions)
    .values(row)
    .onConflictDoUpdate({ target: sourceRemovalDecisions.transactionId, set: row })
  const id = randomUUID()
  await db.insert(sourceRemovalDecisionEvents).values({
    id,
    profileId: transaction.profileId,
    connectionId: transaction.connectionId,
    accountId: transaction.accountId,
    transactionId: transaction.id,
    revision,
    occurredAt: at,
    payload: await encode(
      db,
      transaction.profileId,
      'source_removal_decision_events',
      id,
      {
        before: previous?.choice ?? null,
        after: choice,
        presenceDigest,
        transactionRevision: transaction.revision,
        reason,
      },
      encryption,
    ),
  })
  return row
}

/** Conservative active view; retained canonical rows and immutable events remain owner-exportable. */
export async function pendingLifecycleProjection(
  db: Database,
  profileId: string,
  transactions: readonly Transaction[],
) {
  const lifecycle = await db
    .select()
    .from(pendingLifecycles)
    .where(eq(pendingLifecycles.profileId, profileId))
  const decisions = await db
    .select()
    .from(sourceRemovalDecisions)
    .where(eq(sourceRemovalDecisions.profileId, profileId))
  const presence = await db.select().from(syncPresence).where(eq(syncPresence.profileId, profileId))
  const byId = new Map(transactions.map((row) => [row.id, row]))
  const excluded = new Set<string>(),
    manual = new Set<string>()
  for (const row of lifecycle) {
    const original = byId.get(row.transactionId),
      replacement = byId.get(row.replacementTransactionId ?? '')
    if (
      original?.status !== 'pending' ||
      original.connectionId !== row.connectionId ||
      original.accountId !== row.accountId ||
      original.revision !== row.pendingRevision
    )
      continue
    if (
      ['expired', 'cancelled', 'reversed'].includes(row.state) &&
      replacement?.status === 'reversed' &&
      replacement.revision === row.replacementRevision &&
      replacement.relatedTransactionId === original.id &&
      replacement.accountId === original.accountId &&
      replacement.connectionId === original.connectionId &&
      replacement.providerId === original.providerId &&
      replacement.amount.currency === original.amount.currency &&
      replacement.amount.amountMinor === original.amount.amountMinor
    )
      excluded.add(original.id)
    if (
      row.state === 'replaced' &&
      replacement?.status === 'booked' &&
      replacement.revision === row.replacementRevision &&
      replacement.relatedTransactionId === original.id &&
      replacement.accountId === original.accountId &&
      replacement.connectionId === original.connectionId &&
      replacement.providerId === original.providerId &&
      replacement.amount.currency === original.amount.currency
    )
      excluded.add(original.id)
  }
  for (const decision of decisions) {
    const transaction = byId.get(decision.transactionId),
      current = presence.find((row) => row.transactionId === decision.transactionId)
    if (
      !transaction ||
      !current ||
      current.state !== 'removed_by_source' ||
      current.evidence.version !== 'sync-presence-v1' ||
      current.evidence.rule !== 'two_complete_windows' ||
      current.missingCompletions < 2 ||
      transaction.status !== 'booked' ||
      transaction.source !== 'bank' ||
      transaction.revision !== decision.transactionRevision ||
      removalDigest(current) !== decision.presenceDigest ||
      transaction.connectionId !== decision.connectionId ||
      transaction.accountId !== decision.accountId
    )
      continue
    if (decision.choice === 'remove') excluded.add(transaction.id)
    if (decision.choice === 'keep_manual') manual.add(transaction.id)
  }
  return transactions
    .filter((row) => !excluded.has(row.id))
    .map((row) => (manual.has(row.id) ? { ...row, source: 'manual' as const } : row))
}

/** The authoritative bounded server projection uses the same revision/scoped evidence fences. */
function validRemovalSql(profileId: string, choice: 'remove' | 'keep_manual'): SQL {
  const tx = schema.transactions
  return sql`exists (
    select 1 from source_removal_decisions d join sync_source_presence p
      on p.profile_id=d.profile_id and p.transaction_id=d.transaction_id
    where d.profile_id=${profileId} and d.transaction_id=${tx.id}
      and d.connection_id=${tx.connectionId} and d.account_id=${tx.accountId}
      and p.connection_id=d.connection_id and p.account_id=d.account_id
      and d.choice=${choice} and ${tx.status}='booked' and ${tx.source}='bank'
      and d.transaction_revision=${tx.revision}
      and p.state='removed_by_source' and p.missing_completions=2
      and p.evidence->>'version'='sync-presence-v1'
      and p.evidence->>'rule'='two_complete_windows'
      and d.presence_digest=encode(sha256(convert_to(
        '{"count":2,"rule":"two_complete_windows","state":"removed_by_source","transactionId":'
        || to_json(${tx.id})::text || '}', 'UTF8')), 'hex')
  )`
}
export function pendingLifecycleSourceSql(profileId: string): SQL<Transaction['source']> {
  return sql<
    Transaction['source']
  >`case when ${validRemovalSql(profileId, 'keep_manual')} then 'manual' else ${schema.transactions.source} end`
}
export function pendingLifecycleReadPredicate(profileId: string): SQL {
  const tx = schema.transactions
  return sql`not ${validRemovalSql(profileId, 'remove')} and not exists (
    select 1 from sync_source_presence p join transactions replacement
      on replacement.profile_id=p.profile_id and replacement.id=p.evidence->>'replacementTransactionId'
    where p.profile_id=${profileId} and p.transaction_id=${tx.id} and ${tx.status}='pending'
      and p.state='pending_replaced' and p.evidence->>'version'='sync-presence-v1'
      and p.evidence->>'rule'='provider_link_exact' and replacement.status='booked'
      and replacement.account_id=${tx.accountId} and replacement.connection_id=${tx.connectionId}
      and replacement.provider_id=${tx.providerId}
      and replacement.related_transaction_id=${tx.id} and replacement.currency=${tx.currency}
      and replacement.amount_minor=${tx.amountMinor}
      and not exists (select 1 from pending_lifecycles review
        where review.profile_id=${profileId} and review.transaction_id=${tx.id}
          and review.state='amount_change_review' and review.pending_revision=${tx.revision})
  ) and not exists (
    select 1 from pending_lifecycles l join transactions replacement
      on replacement.profile_id=l.profile_id and replacement.id=l.replacement_transaction_id
    where l.profile_id=${profileId} and l.transaction_id=${tx.id}
      and ${tx.status}='pending' and l.pending_revision=${tx.revision}
      and l.connection_id=${tx.connectionId} and l.account_id=${tx.accountId}
      and replacement.revision=l.replacement_revision
      and replacement.account_id=${tx.accountId} and replacement.connection_id=${tx.connectionId}
      and replacement.provider_id=${tx.providerId} and replacement.currency=${tx.currency}
      and replacement.related_transaction_id=${tx.id}
      and ((l.state='replaced' and replacement.status='booked')
        or (l.state in ('expired','cancelled','reversed') and replacement.status='reversed'
          and replacement.amount_minor=${tx.amountMinor}))
  )`
}

const idDto = z.string().min(1).max(200),
  revisionDto = z.number().int().min(1).max(2_147_483_645),
  digestDto = z.string().regex(/^[a-f0-9]{64}$/u)
export const removalChoiceDto = z.strictObject({
  transactionId: idDto,
  revision: revisionDto,
  transactionRevision: revisionDto,
  presenceDigest: digestDto,
  choice: z.enum(['keep_manual', 'remove', 'undo']),
})
export const pendingReplacementChoiceDto = z.strictObject({
  transactionId: idDto,
  revision: revisionDto,
  expectedDigest: digestDto,
  replacementRevision: revisionDto,
  action: z.enum(['accept', 'undo']),
})
export const removalTransactionFactsDto = z.strictObject({
  accountId: idDto,
  connectionId: idDto,
  description: z.string().min(1),
  bookedOn: z.iso.date().nullable(),
  authorizedOn: z.iso.date().nullable(),
  amountMinor: z.string().regex(/^-?\d+$/u),
  currency: z.string().length(3),
  reference: z.string().nullable(),
})
export const removalViewDto = z.strictObject({
  transactionId: idDto,
  revision: revisionDto,
  transactionRevision: revisionDto,
  presenceDigest: digestDto,
  choice: z.enum(['keep_manual', 'remove', 'undone']).nullable(),
  needsDecision: z.boolean(),
  transaction: removalTransactionFactsDto,
})
export const pendingViewDto = z.strictObject({
  transactionId: idDto,
  revision: revisionDto,
  digest: digestDto,
  state: z.enum(['active', 'replaced', 'amount_change_review', 'expired', 'cancelled', 'reversed']),
  firstSeenAt: z.string(),
  updatedAt: z.string(),
  replacementTransactionId: idDto.nullable(),
  replacementRevision: revisionDto.nullable(),
  pendingAmountMinor: z.string(),
  replacementAmountMinor: z.string().nullable(),
  currency: z.string().length(3),
  carried: z.array(z.string()),
})
const moneyStateDto = z.strictObject({
  amountMinor: z.string().regex(/^-?\d+$/u),
  currency: z.string().length(3),
  status: z.enum(['pending', 'booked', 'reversed']),
  revision: z.number().int().positive(),
})
const lifecyclePayloadDto = z.strictObject({
  version: z.literal('pending-lifecycle-v1'),
  state: pendingViewDto.shape.state,
  pending: moneyStateDto,
  observed: moneyStateDto,
  replacement: moneyStateDto.extend({ id: idDto }).nullable(),
  evidence: z
    .strictObject({
      state: z.enum(['expired', 'cancelled', 'reversed']),
      evidenceReference: idDto,
      effectiveAt: z.string().datetime({ offset: true }),
    })
    .nullable(),
  carried: z.array(z.string()),
  decision: z.enum(['accepted', 'rejected']).nullable(),
})
const eventOwnerDto = z.strictObject({
  id: idDto,
  profileId: idDto,
  connectionId: idDto,
  accountId: idDto,
  transactionId: idDto,
  revision: z.number().int().positive(),
  occurredAt: z.string().datetime({ offset: true }),
})
export const pendingOwnershipDto = z.strictObject({
  pending: z.array(pendingViewDto),
  removals: z.array(removalViewDto),
  events: z.array(
    z.discriminatedUnion('kind', [
      eventOwnerDto.extend({
        kind: z.literal('pending'),
        replacementTransactionId: idDto.nullable(),
        payload: lifecyclePayloadDto.extend({
          beforeDigest: digestDto.nullable(),
          firstSeenAt: z.string().datetime({ offset: true }),
        }),
      }),
      eventOwnerDto.extend({
        kind: z.literal('source_removal'),
        payload: z.strictObject({
          before: z.enum(['keep_manual', 'remove', 'undone']).nullable(),
          after: z.enum(['keep_manual', 'remove', 'undone']),
          presenceDigest: digestDto,
          transactionRevision: z.number().int().positive(),
          reason: z.enum(['user_choice', 'source_returned']),
        }),
      }),
    ]),
  ),
})
export type PendingOwnership = z.infer<typeof pendingOwnershipDto>
export function assertPendingOwnershipReferences(
  value: PendingOwnership,
  scope: {
    profileId: string
    exportedAt?: string
    transactions: readonly { id: string; accountId: string; connectionId: string }[]
  },
) {
  const transactions = new Map(scope.transactions.map((row) => [row.id, row]))
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length
  if (
    !unique(value.pending.map((row) => row.transactionId)) ||
    !unique(value.removals.map((row) => row.transactionId)) ||
    !unique(value.events.map((row) => row.id))
  )
    throw new Error('Duplicate lifecycle ownership references')
  for (const row of value.pending)
    if (
      !transactions.has(row.transactionId) ||
      (row.replacementTransactionId && !transactions.has(row.replacementTransactionId))
    )
      throw new Error('Lifecycle ownership reference is missing')
  for (const row of value.removals) {
    const transaction = transactions.get(row.transactionId)
    if (!transaction) throw new Error('Removal ownership reference is missing')
    if (
      row.transaction.accountId !== transaction.accountId ||
      row.transaction.connectionId !== transaction.connectionId
    )
      throw new Error('Removal ownership scope is invalid')
  }
  for (const event of value.events) {
    const transaction = transactions.get(event.transactionId)
    if (
      event.profileId !== scope.profileId ||
      !transaction ||
      event.connectionId !== transaction.connectionId ||
      event.accountId !== transaction.accountId ||
      (scope.exportedAt && Date.parse(event.occurredAt) > Date.parse(scope.exportedAt))
    )
      throw new Error('Lifecycle ownership scope is invalid')
    if (event.kind === 'pending' && event.replacementTransactionId) {
      const replacement = transactions.get(event.replacementTransactionId)
      if (
        !replacement ||
        replacement.accountId !== event.accountId ||
        replacement.connectionId !== event.connectionId ||
        event.payload.replacement?.id !== event.replacementTransactionId
      )
        throw new Error('Lifecycle replacement scope is invalid')
    }
  }
}
export class PendingLifecycleService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string,
    readonly encryption?: ProfileEncryption,
  ) {}
  private async excluded(db: Database = this.db) {
    const feedback = await db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, this.profileId))
    const transactions = []
    for (const stored of await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, this.profileId))) {
      const row = this.encryption ? await this.encryption.decryptTransactionRow(db, stored) : stored
      const {
        householdId: _household,
        scope: _scope,
        contentHash: _hash,
        amountMinor,
        currency,
        ...values
      } = row
      transactions.push({ ...values, amount: { amountMinor, currency } })
    }
    const context = await new MerchantTaxonomyService(
      db,
      this.profileId,
      this.now,
      this.encryption,
    ).analysisContext(
      db,
      transactions,
      transactions.map((row) => classify(row)),
    )
    const excluded = new Set([
      ...context.excludedTransactionIds,
      ...feedback.filter((row) => row.categoryId === 'health').map((row) => row.transactionId),
    ])
    let changed = true
    while (changed) {
      changed = false
      for (const row of transactions)
        if (
          row.relatedTransactionId &&
          (excluded.has(row.id) || excluded.has(row.relatedTransactionId))
        ) {
          if (!excluded.has(row.id)) {
            excluded.add(row.id)
            changed = true
          }
          if (!excluded.has(row.relatedTransactionId)) {
            excluded.add(row.relatedTransactionId)
            changed = true
          }
        }
    }
    return excluded
  }
  async pending(includePrivate = false) {
    const rows = await this.db
      .select()
      .from(pendingLifecycles)
      .where(eq(pendingLifecycles.profileId, this.profileId))
      .orderBy(asc(pendingLifecycles.transactionId))
    const result = []
    const excluded = includePrivate ? new Set<string>() : await this.excluded()
    for (const row of rows) {
      if (
        excluded.has(row.transactionId) ||
        (row.replacementTransactionId && excluded.has(row.replacementTransactionId))
      )
        continue
      const payload = await decode<PendingPayload>(
        this.db,
        this.profileId,
        'pending_lifecycles',
        row.transactionId,
        row.payload,
        this.encryption,
      )
      if (syncHash(payload) !== row.digest) throw new Error('Invalid pending lifecycle audit')
      result.push(
        pendingViewDto.parse({
          transactionId: row.transactionId,
          revision: row.revision,
          digest: row.digest,
          state: row.state,
          firstSeenAt: row.firstSeenAt,
          updatedAt: row.updatedAt,
          replacementTransactionId: payload.replacement?.id ?? null,
          replacementRevision: payload.replacement?.revision ?? null,
          pendingAmountMinor: payload.pending.amountMinor,
          replacementAmountMinor: payload.replacement?.amountMinor ?? null,
          currency: payload.pending.currency,
          carried: payload.carried,
        }),
      )
    }
    return result
  }
  async removals(includePrivate = false) {
    const result = []
    const excluded = includePrivate ? new Set<string>() : await this.excluded()
    const rows = await this.db
      .select()
      .from(syncPresence)
      .where(
        and(
          eq(syncPresence.profileId, this.profileId),
          eq(syncPresence.state, 'removed_by_source'),
        ),
      )
    for (const presence of rows) {
      if (excluded.has(presence.transactionId)) continue
      const [transaction] = await this.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.profileId, this.profileId),
            eq(schema.transactions.id, presence.transactionId),
          ),
        )
      if (transaction?.status !== 'booked' || presence.missingCompletions < 2) continue
      const [decision] = await this.db
        .select()
        .from(sourceRemovalDecisions)
        .where(
          and(
            eq(sourceRemovalDecisions.profileId, this.profileId),
            eq(sourceRemovalDecisions.transactionId, transaction.id),
          ),
        )
      const active =
        decision?.transactionRevision === transaction.revision &&
        decision.presenceDigest === removalDigest(presence) &&
        decision.choice !== 'undone'
      // Retained canonical facts remain reviewable after an active-view removal.
      const facts = this.encryption
        ? await this.encryption.decryptTransactionRow(this.db, transaction)
        : transaction
      result.push(
        removalViewDto.parse({
          transactionId: transaction.id,
          transactionRevision: transaction.revision,
          revision: decision?.revision ?? 1,
          presenceDigest: removalDigest(presence),
          choice: active ? decision.choice : null,
          needsDecision: !active,
          transaction: {
            accountId: facts.accountId,
            connectionId: facts.connectionId,
            description: facts.description,
            bookedOn: facts.bookedOn,
            authorizedOn: facts.authorizedOn,
            amountMinor: String(facts.amountMinor),
            currency: facts.currency,
            reference: facts.reference,
          },
        }),
      )
    }
    return result
  }
  private async lock(db: Database, transactionId: string) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
      .for('update')
    if (!profile) throw notFound()
    const [transaction] = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, this.profileId),
          eq(schema.transactions.id, transactionId),
        ),
      )
      .for('update')
    if (!transaction) throw notFound()
    return transaction
  }
  async chooseRemoval(input: z.infer<typeof removalChoiceDto>) {
    const value = removalChoiceDto.parse(input)
    if ((await this.excluded()).has(value.transactionId)) throw notFound()
    await this.db.transaction(async (db) => {
      const transaction = await this.lock(db, value.transactionId)
      if ((await this.excluded(db)).has(value.transactionId)) throw notFound()
      const [presence] = await db
        .select()
        .from(syncPresence)
        .where(
          and(
            eq(syncPresence.profileId, this.profileId),
            eq(syncPresence.transactionId, value.transactionId),
          ),
        )
      const [decision] = await db
        .select()
        .from(sourceRemovalDecisions)
        .where(
          and(
            eq(sourceRemovalDecisions.profileId, this.profileId),
            eq(sourceRemovalDecisions.transactionId, value.transactionId),
          ),
        )
      if (
        transaction.status !== 'booked' ||
        transaction.source !== 'bank' ||
        !presence ||
        presence.state !== 'removed_by_source' ||
        presence.missingCompletions < 2 ||
        presence.evidence.rule !== 'two_complete_windows' ||
        transaction.revision !== value.transactionRevision ||
        removalDigest(presence) !== value.presenceDigest ||
        (decision?.revision ?? 1) !== value.revision ||
        (value.choice === 'undo' && (!decision || decision.choice === 'undone'))
      )
        throw changed()
      await writeRemovalDecision(
        db,
        transaction,
        decision,
        value.choice === 'undo' ? 'undone' : value.choice,
        value.presenceDigest,
        this.now(),
        this.encryption,
      )
    })
    return (
      (await this.removals()).find((row) => row.transactionId === value.transactionId) ??
      (() => {
        throw changed()
      })()
    )
  }
  async chooseReplacement(input: z.infer<typeof pendingReplacementChoiceDto>) {
    const value = pendingReplacementChoiceDto.parse(input)
    if ((await this.excluded()).has(value.transactionId)) throw notFound()
    await this.db.transaction(async (db) => {
      const original = await this.lock(db, value.transactionId)
      if ((await this.excluded(db)).has(value.transactionId)) throw notFound()
      const [current] = await db
        .select()
        .from(pendingLifecycles)
        .where(
          and(
            eq(pendingLifecycles.profileId, this.profileId),
            eq(pendingLifecycles.transactionId, value.transactionId),
          ),
        )
      if (
        !current ||
        current.revision !== value.revision ||
        current.digest !== value.expectedDigest ||
        original.status !== 'pending' ||
        !current.replacementTransactionId ||
        (value.action === 'accept' && current.state !== 'amount_change_review') ||
        (value.action === 'undo' && current.state !== 'replaced')
      )
        throw changed()
      const [replacement] = await db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.profileId, this.profileId),
            eq(schema.transactions.id, current.replacementTransactionId),
          ),
        )
      if (
        replacement?.status !== 'booked' ||
        replacement.revision !== value.replacementRevision ||
        replacement.relatedTransactionId !== original.id ||
        replacement.accountId !== original.accountId ||
        replacement.connectionId !== original.connectionId ||
        replacement.providerId !== original.providerId ||
        replacement.currency !== original.currency
      )
        throw changed()
      const payload = await decode<PendingPayload>(
        db,
        this.profileId,
        'pending_lifecycles',
        original.id,
        current.payload,
        this.encryption,
      )
      if (syncHash(payload) !== current.digest) throw changed()
      const carried =
        value.action === 'accept'
          ? [
              ...new Set([
                ...payload.carried,
                ...(await carryCorrections(db, original, replacement, this.now(), this.encryption)),
              ]),
            ].sort()
          : payload.carried
      await writeLifecycle(
        db,
        original,
        current,
        {
          ...payload,
          state: value.action === 'accept' ? 'replaced' : 'amount_change_review',
          decision: value.action === 'accept' ? 'accepted' : 'rejected',
          replacement: { id: replacement.id, ...money(replacement) },
          carried,
        },
        replacement.id,
        current.firstSeenAt,
        this.now(),
        this.encryption,
      )
    })
    return (
      (await this.pending()).find((row) => row.transactionId === value.transactionId) ??
      (() => {
        throw changed()
      })()
    )
  }
  /** Full original audit for the authenticated owner; current quiet/private settings do not redact rights. */
  async ownership() {
    const events = []
    for (const table of [pendingLifecycleEvents, sourceRemovalDecisionEvents]) {
      const tableName =
        table === pendingLifecycleEvents
          ? 'pending_lifecycle_events'
          : 'source_removal_decision_events'
      for (const { householdId: _household, ...row } of await this.db
        .select()
        .from(table)
        .where(eq(table.profileId, this.profileId))
        .orderBy(asc(table.occurredAt), asc(table.id)))
        events.push({
          kind: table === pendingLifecycleEvents ? 'pending' : 'source_removal',
          ...row,
          payload: await decode(
            this.db,
            this.profileId,
            tableName,
            row.id,
            row.payload,
            this.encryption,
          ),
        })
    }
    return pendingOwnershipDto.parse({
      pending: await this.pending(true),
      removals: await this.removals(true),
      events,
    })
  }
}
export function registerPendingLifecycleRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => PendingLifecycleService | Promise<PendingLifecycleService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/reconciliation/pending',
    { schema: { response: { 200: z.array(pendingViewDto) } } },
    (request) => Promise.resolve(resolve(request)).then((service) => service.pending()),
  )
  api.post(
    '/v1/reconciliation/pending/decision',
    { schema: { body: pendingReplacementChoiceDto, response: { 200: pendingViewDto } } },
    (request) =>
      Promise.resolve(resolve(request)).then((service) => service.chooseReplacement(request.body)),
  )
  api.get(
    '/v1/reconciliation/source-removals',
    { schema: { response: { 200: z.array(removalViewDto) } } },
    (request) => Promise.resolve(resolve(request)).then((service) => service.removals()),
  )
  api.post(
    '/v1/reconciliation/source-removals/decision',
    { schema: { body: removalChoiceDto, response: { 200: removalViewDto } } },
    (request) =>
      Promise.resolve(resolve(request)).then((service) => service.chooseRemoval(request.body)),
  )
}
