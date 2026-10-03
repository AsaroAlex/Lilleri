import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  notExists,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ProfileEncryption } from './encryption.js'
import { notFound, Problem } from './problem.js'
import { DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION } from './runtime-config.js'
import { json } from './service.js'
import { readSourceFactEpochs } from './source-erasure.js'
import { canonicalSourceValue, type SourceErasureReceipt } from './source-erasure-dto.js'
import type { SourceErasureJournal } from './source-erasure-journal.js'
import {
  captureMonthlySnapshotDto,
  DEFAULT_UNDERSTANDING_PREFERENCES,
  monthlySnapshotDto,
  monthlySnapshotPayloadDto,
  preferenceEventDto,
  preferenceEventPayloadDto,
  snapshotHistoryDto,
  snapshotHistoryQueryDto,
  snapshotReferenceDto,
  type UnderstandingOwnershipExport,
  type UnderstandingPreferenceValues,
  understandingOwnershipExportDto,
  understandingPreferencesDto,
  understandingPreferenceValuesDto,
  undoUnderstandingPreferencesDto,
  updateUnderstandingPreferencesDto,
} from './understanding-persistence-dto.js'
import {
  understandingMonthlySnapshots,
  understandingPreferenceEvents,
  understandingPreferences,
  understandingReferences,
} from './understanding-persistence-schema.js'
import type { UnderstandingInputSnapshot, UnderstandingService } from './understanding-service.js'

const invalid = () =>
  new Problem(
    400,
    'invalid_understanding_preferences',
    'Controlla i conti, il cuscinetto e la data scelti.',
  )
const changed = () =>
  new Problem(
    409,
    'understanding_changed',
    'I dati o le scelte sono cambiati. Aggiorna e ripeti la scelta.',
  )
const unavailable = () =>
  new Problem(503, 'understanding_history_unavailable', 'Lo storico non è disponibile. Riprova.')
const hash = (value: unknown) =>
  createHash('sha256')
    .update(canonicalSourceValue(json(value)))
    .digest('hex')
const preferenceDigest = (profileId: string, values: UnderstandingPreferenceValues) =>
  hash({ profileId, values })
const context = (profileId: string, table: string, rowId: string) => ({
  profileId,
  table,
  column: 'payload',
  rowId,
})
const stateContext = (profileId: string) =>
  context(profileId, 'understanding_preferences', profileId)
const eventContext = (profileId: string, id: string) =>
  context(profileId, 'understanding_preference_events', id)
const snapshotContext = (profileId: string, id: string) =>
  context(profileId, 'understanding_monthly_snapshots', id)
const defaults = () => understandingPreferenceValuesDto.parse(DEFAULT_UNDERSTANDING_PREFERENCES)
const canonicalValues = (values: UnderstandingPreferenceValues) =>
  understandingPreferenceValuesDto.parse({ ...values, accountIds: [...values.accountIds].sort() })
const refsWhere = (
  profileId: string,
  targetKind: (typeof understandingReferences.$inferSelect)['targetKind'],
  targetId: string,
) =>
  and(
    eq(understandingReferences.profileId, profileId),
    eq(understandingReferences.targetKind, targetKind),
    eq(understandingReferences.targetId, targetId),
  )
type Reference = z.infer<typeof snapshotReferenceDto>
async function lockProfile(db: Database, profileId: string) {
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .for('update')
  if (!profile) throw notFound()
  return profile
}
async function readPreferences(db: Database, profileId: string, encryption: ProfileEncryption) {
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId))
  if (!profile) throw notFound()
  const [stored] = await db
    .select()
    .from(understandingPreferences)
    .where(eq(understandingPreferences.profileId, profileId))
  const values = stored
    ? understandingPreferenceValuesDto.parse(
        await encryption.decryptJson(db, stateContext(profileId), stored.payload),
      )
    : defaults()
  const digest = preferenceDigest(profileId, values)
  if (stored && stored.digest !== digest) throw unavailable()
  return understandingPreferencesDto.parse({
    profileId,
    revision: stored?.revision ?? 1,
    digest,
    updatedAt: stored?.updatedAt ?? profile.createdAt,
    values,
  })
}
async function decodeEvent(
  db: Database,
  row: typeof understandingPreferenceEvents.$inferSelect,
  encryption: ProfileEncryption,
) {
  const payload =
    row.payload === null
      ? null
      : preferenceEventPayloadDto.parse(
          await encryption.decryptJson(db, eventContext(row.profileId, row.id), row.payload),
        )
  if (payload && hash(payload) !== row.digest) throw unavailable()
  const { householdId: _householdId, ...publicRow } = row
  return preferenceEventDto.parse({ ...publicRow, payload })
}
async function decodeSnapshot(
  db: Database,
  row: typeof understandingMonthlySnapshots.$inferSelect,
  encryption: ProfileEncryption,
) {
  const payload =
    row.payload === null
      ? null
      : monthlySnapshotPayloadDto.parse(
          await encryption.decryptJson(db, snapshotContext(row.profileId, row.id), row.payload),
        )
  if (payload && hash(payload) !== row.digest) throw unavailable()
  const { householdId: _householdId, ...publicRow } = row
  return monthlySnapshotDto.parse({ ...publicRow, payload })
}
async function insertReferences(
  db: Database,
  profileId: string,
  targetKind: (typeof understandingReferences.$inferSelect)['targetKind'],
  targetId: string,
  refs: readonly Reference[],
) {
  for (const ref of refs)
    await db.insert(understandingReferences).values({
      ...ref,
      profileId,
      targetKind,
      targetId,
      transactionId: ref.subjectKind === 'transaction' ? ref.subjectId : null,
    })
}
async function ownedAccountReferences(
  db: Database,
  profileId: string,
  ids: readonly string[],
  encryption: ProfileEncryption,
  journal: SourceErasureJournal,
) {
  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.profileId, profileId))
  const epochs = await readSourceFactEpochs(db, profileId, encryption, journal)
  return ids.map((id) => {
    const account = accounts.find((row) => row.id === id)
    if (!account) throw notFound()
    const proof = epochs.find(
      (row) =>
        row.kind === 'account' && row.subjectId === id && row.connectionId === account.connectionId,
    )
    return {
      subjectKind: 'account' as const,
      subjectId: id,
      accountId: id,
      connectionId: account.connectionId,
      erasureRevision: proof?.erasureRevision ?? 0,
    }
  })
}
async function persistPreferenceChange(
  db: Database,
  profileId: string,
  encryption: ProfileEncryption,
  input: {
    revision: number
    before: UnderstandingPreferenceValues | null
    after: UnderstandingPreferenceValues
    at: string
    action: 'changed' | 'undone' | 'source_erased'
    undoOf: string | null
    sourceReceiptId: string | null
    references: readonly Reference[]
  },
) {
  const revision = input.revision + 1,
    id = `understanding_preference_${randomUUID()}`,
    payload = preferenceEventPayloadDto.parse({
      before: input.before,
      after: input.after,
      undoOf: input.undoOf,
    }),
    digest = preferenceDigest(profileId, input.after),
    eventDigest = hash(payload)
  const encryptedState = await encryption.encryptJson(db, stateContext(profileId), input.after)
  await db
    .insert(understandingPreferences)
    .values({ profileId, revision, digest, updatedAt: input.at, payload: encryptedState })
    .onConflictDoUpdate({
      target: understandingPreferences.profileId,
      set: { revision, digest, updatedAt: input.at, payload: encryptedState },
    })
  await db
    .delete(understandingReferences)
    .where(refsWhere(profileId, 'preference_state', profileId))
  await insertReferences(
    db,
    profileId,
    'preference_state',
    profileId,
    input.references.filter((ref) => input.after.accountIds.includes(ref.accountId)),
  )
  await db.insert(understandingPreferenceEvents).values({
    id,
    profileId,
    revision,
    action: input.action,
    occurredAt: input.at,
    payload: await encryption.encryptJson(db, eventContext(profileId, id), payload),
    digest: eventDigest,
    sourceReceiptId: input.sourceReceiptId,
  })
  await insertReferences(db, profileId, 'preference_event', id, input.references)
  return understandingPreferencesDto.parse({
    profileId,
    revision,
    digest,
    updatedAt: input.at,
    values: input.after,
  })
}

/** Scoped choices and immutable snapshots. Capture policy before entering a financial SQL role. */
export class UnderstandingPersistenceService {
  readonly profileId: string
  constructor(
    readonly understanding: UnderstandingService,
    readonly encryption: ProfileEncryption,
    readonly policy: Readonly<{
      historyPageSize: number
    }> = DEFAULT_UNDERSTANDING_PERSISTENCE_CONFIGURATION,
    readonly sourceJournal: SourceErasureJournal,
    readonly onMonthlySaved?: (
      db: Database,
      saved: z.infer<typeof monthlySnapshotDto>,
    ) => Promise<void>,
  ) {
    this.profileId = understanding.demo.profileId
    if (
      !Number.isSafeInteger(policy.historyPageSize) ||
      policy.historyPageSize < 1 ||
      policy.historyPageSize > 100
    )
      throw unavailable()
  }
  async preferences() {
    return this.understanding.demo.db.transaction(
      async (db) => {
        const preferences = await readPreferences(db, this.profileId, this.encryption)
        const rows = await db
          .select()
          .from(understandingPreferenceEvents)
          .where(eq(understandingPreferenceEvents.profileId, this.profileId))
          .orderBy(desc(understandingPreferenceEvents.revision))
        const events = []
        for (const row of rows) events.push(await decodeEvent(db, row, this.encryption))
        return { preferences, events }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async updatePreferences(input: z.infer<typeof updateUnderstandingPreferencesDto>) {
    const checked = updateUnderstandingPreferencesDto.safeParse(input)
    if (!checked.success) throw invalid()
    const at = this.understanding.demo.now(),
      values = canonicalValues(checked.data.values)
    return this.understanding.demo.db.transaction(async (db) => {
      await lockProfile(db, this.profileId)
      const current = await readPreferences(db, this.profileId, this.encryption)
      if (current.revision !== input.revision || current.digest !== input.expectedDigest)
        throw changed()
      const accountRefs = await ownedAccountReferences(
        db,
        this.profileId,
        values.accountIds,
        this.encryption,
        this.sourceJournal,
      )
      const accounts = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, this.profileId))
      const currencies = new Set(
        accounts.filter((row) => values.accountIds.includes(row.id)).map((row) => row.currency),
      )
      if (
        Object.keys(values.bufferByCurrency).some(
          (code) => !currencies.has(code as (typeof accounts)[number]['currency']),
        )
      )
        throw invalid()
      if (preferenceDigest(this.profileId, values) === current.digest) return current
      const refs = await ownedAccountReferences(
        db,
        this.profileId,
        [...new Set([...current.values.accountIds, ...values.accountIds])],
        this.encryption,
        this.sourceJournal,
      )
      if (accountRefs.length !== values.accountIds.length) throw notFound()
      return persistPreferenceChange(db, this.profileId, this.encryption, {
        revision: current.revision,
        before: current.values,
        after: values,
        at,
        action: 'changed',
        undoOf: null,
        sourceReceiptId: null,
        references: refs,
      })
    })
  }
  async undoPreferences(input: z.infer<typeof undoUnderstandingPreferencesDto>) {
    if (!undoUnderstandingPreferencesDto.safeParse(input).success) throw invalid()
    const at = this.understanding.demo.now()
    return this.understanding.demo.db.transaction(async (db) => {
      await lockProfile(db, this.profileId)
      const current = await readPreferences(db, this.profileId, this.encryption)
      if (current.revision !== input.revision || current.digest !== input.expectedDigest)
        throw changed()
      const [stored] = await db
        .select()
        .from(understandingPreferenceEvents)
        .where(
          and(
            eq(understandingPreferenceEvents.profileId, this.profileId),
            eq(understandingPreferenceEvents.id, input.eventId),
          ),
        )
      if (!stored) throw notFound()
      if (
        stored.revision !== current.revision ||
        stored.action === 'source_erased' ||
        !stored.payload
      )
        throw changed()
      const event = await decodeEvent(db, stored, this.encryption)
      if (
        !event.payload?.before ||
        preferenceDigest(this.profileId, event.payload.after) !== current.digest
      )
        throw changed()
      const refs = await ownedAccountReferences(
        db,
        this.profileId,
        [...new Set([...current.values.accountIds, ...event.payload.before.accountIds])],
        this.encryption,
        this.sourceJournal,
      )
      return persistPreferenceChange(db, this.profileId, this.encryption, {
        revision: current.revision,
        before: current.values,
        after: event.payload.before,
        at,
        action: 'undone',
        undoOf: stored.id,
        sourceReceiptId: null,
        references: refs,
      })
    })
  }
  async captureMonthly(input: z.infer<typeof captureMonthlySnapshotDto>) {
    if (!captureMonthlySnapshotDto.safeParse(input).success) throw invalid()
    // One real read-only input snapshot and one calculation; the write transaction only rechecks generations.
    const captured = await this.understanding.demo.db.transaction(
      async (db) => {
        const snapshot = await this.understanding.captureInputs(db),
          result = this.understanding.calculateMonthly(snapshot, input.month)
        const epochs = await readSourceFactEpochs(
          db,
          this.profileId,
          this.encryption,
          this.sourceJournal,
        )
        return { snapshot, result, epochs }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
    if (
      captured.result.capture.inputDigest !== input.expectedInputDigest ||
      captured.result.capture.policyVersion !== input.policyVersion
    )
      throw changed()
    const payload = this.snapshotPayload(captured.snapshot, captured.result, captured.epochs)
    return this.understanding.demo.db.transaction(async (db) => {
      await lockProfile(db, this.profileId)
      const current = await this.understanding.captureInputs(db, captured.snapshot.now)
      if (
        this.understanding.captureMetadata(current, input.month).inputDigest !==
        input.expectedInputDigest
      )
        throw changed()
      const [existing] = await db
        .select()
        .from(understandingMonthlySnapshots)
        .where(
          and(
            eq(understandingMonthlySnapshots.profileId, this.profileId),
            eq(understandingMonthlySnapshots.month, input.month),
            eq(understandingMonthlySnapshots.inputDigest, input.expectedInputDigest),
          ),
        )
      if (existing) {
        if (existing.payload === null) throw changed()
        return decodeSnapshot(db, existing, this.encryption)
      }
      const id = `monthly_snapshot_${randomUUID()}`,
        digest = hash(payload)
      const row = {
        id,
        profileId: this.profileId,
        householdId: current.profile.householdId,
        month: input.month,
        capturedAt: captured.snapshot.now,
        inputDigest: input.expectedInputDigest,
        digest,
        payload: await this.encryption.encryptJson(
          db,
          snapshotContext(this.profileId, id),
          payload,
        ),
        sourceReceiptId: null,
      }
      await db.insert(understandingMonthlySnapshots).values(row)
      await insertReferences(db, this.profileId, 'monthly_snapshot', id, payload.references)
      const saved = await decodeSnapshot(db, row, this.encryption)
      if (
        payload.result.insights.length &&
        payload.result.insights.every((insight) => insight.status === 'complete')
      )
        await this.onMonthlySaved?.(db, saved)
      return saved
    })
  }
  private snapshotPayload(
    snapshot: UnderstandingInputSnapshot,
    result: ReturnType<UnderstandingService['calculateMonthly']>,
    epochs: Awaited<ReturnType<typeof readSourceFactEpochs>>,
  ) {
    const transactionIds = new Set(result.insights.flatMap((row) => row.inputs.transactionIds)),
      accountIds = new Set(result.insights.flatMap((row) => row.inputs.accountIds))
    const refundIds = new Set(result.insights.flatMap((row) => row.inputs.refundTransactionIds)),
      excluded = new Set(snapshot.privacy.excludedTransactionIds)
    const confirmedRefundLinks = snapshot.data.analysis.matches
      .filter(
        (match) =>
          match.type === 'refund' &&
          match.state === 'confirmed' &&
          match.transactionIds.some((id) => refundIds.has(id)) &&
          match.transactionIds.every(
            (id) => !excluded.has(id) && snapshot.data.transactions.some((row) => row.id === id),
          ),
      )
      .map(({ id, transactionIds }) => ({ id, transactionIds: [...transactionIds] }))
    for (const link of confirmedRefundLinks)
      for (const id of link.transactionIds) transactionIds.add(id)
    const transactions = snapshot.data.transactions.filter((row) => transactionIds.has(row.id)),
      accounts = snapshot.data.accounts.filter((row) => accountIds.has(row.id))
    const refs: Reference[] = [
      ...accounts.map((row) => ({
        subjectKind: 'account' as const,
        subjectId: row.id,
        accountId: row.id,
        connectionId: row.connectionId,
        erasureRevision:
          epochs.find((proof) => proof.kind === 'account' && proof.subjectId === row.id)
            ?.erasureRevision ?? 0,
      })),
      ...transactions.map((row) => ({
        subjectKind: 'transaction' as const,
        subjectId: row.id,
        accountId: row.accountId,
        connectionId: row.connectionId,
        erasureRevision:
          epochs.find((proof) => proof.kind === 'transaction' && proof.subjectId === row.id)
            ?.erasureRevision ?? 0,
      })),
    ]
    return monthlySnapshotPayloadDto.parse({
      format: 'lilleri.monthly-snapshot.v1',
      result,
      policy: this.understanding.configuration,
      references: refs,
      inputFacts: {
        confirmedRefundLinks,
        accounts: accounts.map((row) => ({
          id: row.id,
          connectionId: row.connectionId,
          currency: row.balance.currency,
          kind: row.kind,
          openingOn: snapshot.states.get(row.id)?.openingOn ?? null,
        })),
        transactions: transactions.map((row) => ({
          id: row.id,
          accountId: row.accountId,
          connectionId: row.connectionId,
          revision: row.revision,
          amountMinor: row.amount.amountMinor.toString(),
          currency: row.amount.currency,
          status: row.status,
          kind: row.kind,
          bookedOn: row.bookedOn,
          authorizedOn: row.authorizedOn,
          relatedTransactionId:
            row.relatedTransactionId && transactionIds.has(row.relatedTransactionId)
              ? row.relatedTransactionId
              : null,
          relatedAccountId:
            row.relatedAccountId && accountIds.has(row.relatedAccountId)
              ? row.relatedAccountId
              : null,
        })),
      },
    })
  }
  async history(input: z.infer<typeof snapshotHistoryQueryDto> = {}) {
    if (!snapshotHistoryQueryDto.safeParse(input).success) throw invalid()
    let cursor: { capturedAt: string; id: string } | undefined
    if (input.before)
      try {
        cursor = z
          .strictObject({ capturedAt: z.iso.datetime(), id: z.string().min(1).max(200) })
          .parse(JSON.parse(Buffer.from(input.before, 'base64url').toString('utf8')))
        if (Buffer.from(JSON.stringify(cursor)).toString('base64url') !== input.before)
          throw invalid()
      } catch {
        throw invalid()
      }
    return this.understanding.demo.db.transaction(
      async (db) => {
        const current = await this.understanding.captureInputs(db),
          excluded = new Set(current.privacy.excludedTransactionIds),
          live = new Set(current.data.transactions.map((row) => row.id)),
          accounts = new Set(current.data.accounts.map((row) => row.id))
        const rows = await db
          .select()
          .from(understandingMonthlySnapshots)
          .where(
            and(
              eq(understandingMonthlySnapshots.profileId, this.profileId),
              isNotNull(understandingMonthlySnapshots.payload),
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(understandingReferences)
                  .where(
                    and(
                      eq(understandingReferences.profileId, this.profileId),
                      eq(understandingReferences.targetKind, 'monthly_snapshot'),
                      eq(understandingReferences.targetId, understandingMonthlySnapshots.id),
                      or(
                        and(
                          eq(understandingReferences.subjectKind, 'transaction'),
                          or(
                            inArray(understandingReferences.subjectId, [...excluded]),
                            notInArray(understandingReferences.subjectId, [...live]),
                          ),
                        ),
                        and(
                          eq(understandingReferences.subjectKind, 'account'),
                          notInArray(understandingReferences.subjectId, [...accounts]),
                        ),
                      ),
                    ),
                  ),
              ),
              cursor
                ? or(
                    lt(understandingMonthlySnapshots.capturedAt, cursor.capturedAt),
                    and(
                      eq(understandingMonthlySnapshots.capturedAt, cursor.capturedAt),
                      lt(understandingMonthlySnapshots.id, cursor.id),
                    ),
                  )
                : undefined,
            ),
          )
          .orderBy(
            desc(understandingMonthlySnapshots.capturedAt),
            desc(understandingMonthlySnapshots.id),
          )
          .limit(this.policy.historyPageSize + 1)
        const visible = []
        for (const row of rows) {
          if (!row.payload) continue
          const decoded = await decodeSnapshot(db, row, this.encryption)
          if (
            decoded.payload?.references.some((ref) =>
              ref.subjectKind === 'transaction'
                ? excluded.has(ref.subjectId) || !live.has(ref.subjectId)
                : !accounts.has(ref.subjectId),
            )
          )
            continue
          visible.push(decoded)
          if (visible.length > this.policy.historyPageSize) break
        }
        const more = visible.length > this.policy.historyPageSize,
          items = visible.slice(0, this.policy.historyPageSize),
          last = items.at(-1)
        return snapshotHistoryDto.parse({
          items,
          nextCursor:
            more && last
              ? Buffer.from(JSON.stringify({ capturedAt: last.capturedAt, id: last.id })).toString(
                  'base64url',
                )
              : null,
        })
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
}

/** Rights export intentionally includes originals suppressed by CURRENT quiet/private presentation. */
export async function exportUnderstandingPersistence(
  db: Database,
  profileId: string,
  encryption: ProfileEncryption,
): Promise<UnderstandingOwnershipExport> {
  const preferences = await readPreferences(db, profileId, encryption)
  const eventRows = await db
    .select()
    .from(understandingPreferenceEvents)
    .where(eq(understandingPreferenceEvents.profileId, profileId))
    .orderBy(asc(understandingPreferenceEvents.revision))
  const snapshotRows = await db
    .select()
    .from(understandingMonthlySnapshots)
    .where(eq(understandingMonthlySnapshots.profileId, profileId))
    .orderBy(asc(understandingMonthlySnapshots.capturedAt), asc(understandingMonthlySnapshots.id))
  const preferenceEvents = [],
    monthlySnapshots = []
  for (const row of eventRows) preferenceEvents.push(await decodeEvent(db, row, encryption))
  for (const row of snapshotRows) monthlySnapshots.push(await decodeSnapshot(db, row, encryption))
  return understandingOwnershipExportDto.parse({ preferences, preferenceEvents, monthlySnapshots })
}

/** Called ONLY after source receipt MAC verification and old-generation classification by replaySourceErasure. */
export async function eraseUnderstandingFinancialReferences(
  db: Database,
  input: {
    receipt: SourceErasureReceipt
    accountIds: readonly string[]
    transactionIds: readonly string[]
    observationIds: readonly string[]
    at: string
  },
  encryption: ProfileEncryption,
) {
  const { receipt } = input,
    profileId = receipt.profileId
  const refs = await db
    .select()
    .from(understandingReferences)
    .where(
      and(
        eq(understandingReferences.profileId, profileId),
        eq(understandingReferences.connectionId, receipt.connectionId),
        lt(understandingReferences.erasureRevision, receipt.revision),
      ),
    )
  // Captured old payloads remain subject to the signed membership even when a later same-ID fact survives replay.
  const oldAccountIds = new Set(receipt.accountIds),
    oldTransactionIds = new Set(receipt.transactions.map((row) => row.id))
  const affected = refs.filter((ref) =>
    ref.subjectKind === 'account'
      ? oldAccountIds.has(ref.subjectId)
      : oldTransactionIds.has(ref.subjectId),
  )
  const targets = new Map(
    affected
      .filter((ref) => ref.targetKind !== 'preference_state')
      .map((ref) => [`${ref.targetKind}:${ref.targetId}`, ref]),
  )
  for (const ref of targets.values()) {
    if (ref.targetKind === 'preference_event')
      await db
        .update(understandingPreferenceEvents)
        .set({ payload: null, sourceReceiptId: receipt.id })
        .where(
          and(
            eq(understandingPreferenceEvents.profileId, profileId),
            eq(understandingPreferenceEvents.id, ref.targetId),
          ),
        )
    else
      await db
        .update(understandingMonthlySnapshots)
        .set({ payload: null, sourceReceiptId: receipt.id })
        .where(
          and(
            eq(understandingMonthlySnapshots.profileId, profileId),
            eq(understandingMonthlySnapshots.id, ref.targetId),
          ),
        )
    await db
      .delete(understandingReferences)
      .where(refsWhere(profileId, ref.targetKind, ref.targetId))
  }
  const stateRefs = affected.filter((ref) => ref.targetKind === 'preference_state')
  if (stateRefs.length) {
    const current = await readPreferences(db, profileId, encryption),
      removed = new Set(stateRefs.map((ref) => ref.accountId)),
      remaining = current.values.accountIds.filter((id) => !removed.has(id))
    const accounts = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, profileId)),
      currencies = new Set(
        accounts.filter((row) => remaining.includes(row.id)).map((row) => row.currency),
      )
    const after = canonicalValues({
      ...current.values,
      accountIds: remaining,
      bufferByCurrency: Object.fromEntries(
        Object.entries(current.values.bufferByCurrency).filter(([code]) =>
          currencies.has(code as (typeof accounts)[number]['currency']),
        ),
      ),
    })
    const allStateRefs = await db
      .select()
      .from(understandingReferences)
      .where(refsWhere(profileId, 'preference_state', profileId))
    await persistPreferenceChange(db, profileId, encryption, {
      revision: current.revision,
      before: null,
      after,
      at: input.at,
      action: 'source_erased',
      undoOf: null,
      sourceReceiptId: receipt.id,
      references: allStateRefs
        .filter((ref) => remaining.includes(ref.accountId))
        .map((ref) =>
          snapshotReferenceDto.parse({
            subjectKind: ref.subjectKind,
            subjectId: ref.subjectId,
            accountId: ref.accountId,
            connectionId: ref.connectionId,
            erasureRevision: ref.erasureRevision,
          }),
        ),
    })
  }
}

export function registerUnderstandingPersistenceRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<UnderstandingPersistenceService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/understanding/preferences',
    {
      schema: {
        response: {
          200: z.strictObject({
            preferences: understandingPreferencesDto,
            events: z.array(preferenceEventDto),
          }),
        },
      },
    },
    (request) => resolve(request).then((service) => service.preferences()),
  )
  api.patch(
    '/v1/understanding/preferences',
    {
      schema: {
        body: updateUnderstandingPreferencesDto,
        response: { 200: understandingPreferencesDto },
      },
    },
    (request) => resolve(request).then((service) => service.updatePreferences(request.body)),
  )
  api.post(
    '/v1/understanding/preferences/undo',
    {
      schema: {
        body: undoUnderstandingPreferencesDto,
        response: { 200: understandingPreferencesDto },
      },
    },
    (request) => resolve(request).then((service) => service.undoPreferences(request.body)),
  )
  api.post(
    '/v1/insights/monthly/snapshots',
    { schema: { body: captureMonthlySnapshotDto, response: { 200: monthlySnapshotDto } } },
    (request) => resolve(request).then((service) => service.captureMonthly(request.body)),
  )
  api.get(
    '/v1/insights/monthly/history',
    { schema: { querystring: snapshotHistoryQueryDto, response: { 200: snapshotHistoryDto } } },
    (request) => resolve(request).then((service) => service.history(request.query)),
  )
}
