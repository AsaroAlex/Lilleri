import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { connectionCreationIntents } from './connection-creation-schema.js'
import { recordConsentRevoked } from './consent-lifecycle.js'
import type { ProfileEncryption } from './encryption.js'
import { profileEncryptionKeys } from './encryption-schema.js'
import { manualReasonContext, payloadContext } from './financial-storage.js'
import { manualBalanceEvents, manualCommands } from './manual-schema.js'
import { notFound, Problem } from './problem.js'
import { enqueueRevocation } from './revocation-outbox.js'
import type {
  SignedSourceErasure,
  SourceErasureReceipt,
  SourceFactProof,
} from './source-erasure-dto.js'
import { canonicalSourceValue } from './source-erasure-dto.js'
import type { SourceErasureJournal } from './source-erasure-journal.js'
import { sourceErasureReceipts, sourceFactGenerations } from './source-erasure-schema.js'
import { syncJobs, syncStages } from './sync-schema.js'

export interface SourceFacts {
  readonly profileId: string
  readonly connectionId: string
  readonly consentId: string | null
  readonly accountIds: readonly string[]
  readonly transactions: readonly { id: string; accountId: string }[]
  readonly observations: readonly { id: string; accountId: string }[]
  readonly manualCommands?: readonly { id: string; accountId: string }[]
}
const instant = (value: string) => {
  const at = Date.parse(value)
  if (!Number.isFinite(at) || new Date(at).toISOString() !== value)
    throw new Error('Source erasure clock is invalid')
  return value
}
const changed = () =>
  new Problem(409, 'source_erasure_changed', 'La fonte è cambiata. Aggiorna prima di procedere.')
const factDigest = (row: unknown) =>
  createHash('sha256')
    .update(
      canonicalSourceValue(
        JSON.parse(
          JSON.stringify(row, (_, value: unknown) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        ),
      ),
    )
    .digest('hex')
/** Bind stable logical financial content; re-encryption and observation clocks are not provenance. */
async function logicalFactDigest(
  db: Database,
  kind: SourceFactProof['body']['kind'],
  row: unknown,
  encryption: ProfileEncryption,
) {
  const value =
    kind === 'transaction'
      ? await encryption.decryptTransactionRow(db, row as typeof schema.transactions.$inferSelect)
      : (row as Record<string, unknown>)
  const {
    householdId: _household,
    observedAt: _observed,
    ...logical
  } = value as Record<string, unknown>
  if (kind === 'transaction') {
    delete logical.revision
    delete logical.scope
    delete logical.contentHash
  } else if (kind === 'account') delete logical.balanceUpdatedAt
  if (kind === 'manual_command') {
    const command = row as typeof manualCommands.$inferSelect,
      events = await db
        .select()
        .from(manualBalanceEvents)
        .where(
          and(
            eq(manualBalanceEvents.profileId, command.profileId),
            eq(manualBalanceEvents.requestId, command.requestId),
          ),
        )
        .orderBy(asc(manualBalanceEvents.id))
    const audit = []
    for (const event of events)
      audit.push({
        ...event,
        reason: await encryption.decryptText(
          db,
          manualReasonContext(event.profileId, event.id),
          event.reason,
        ),
      })
    return factDigest({ command: logical, audit })
  }
  return factDigest(logical)
}
async function logicalPayloadDigest(
  db: Database,
  profileId: string,
  id: string,
  payload: Record<string, unknown>,
  encryption: ProfileEncryption,
) {
  return factDigest(await decode(encryption, db, payloadContext(profileId, id), payload))
}
export interface SourceErasureHooks {
  eraseFinancialReferences?(
    db: Database,
    input: {
      receipt: SourceErasureReceipt
      accountIds: readonly string[]
      transactionIds: readonly string[]
      observationIds: readonly string[]
      at: string
    },
  ): Promise<void>
  /** Capture exact pending source creation targets and cancel them inside the financial transaction. */
  beforeErase?(
    db: Database,
    profileId: string,
    connectionId: string,
    at: string,
  ): Promise<readonly { id: string; providerId: string; connectionId: string; consentId: string }[]>
  /** Cancel only authenticated captured creation intents during restore/recovery, inside the transaction. */
  replayCreationIntents?(
    db: Database,
    profileId: string,
    connectionId: string,
    intentIds: readonly string[],
    at: string,
  ): Promise<void>
}
function legacyCommandAccount(row: typeof manualCommands.$inferSelect) {
  const value = row.operation === 'account' ? row.response.id : row.response.accountId
  return typeof value === 'string' && value.length > 0 ? value : null
}
function legacyCountReport(row: typeof manualCommands.$inferSelect) {
  const keys = Object.keys(row.response),
    allowed = ['inserted', 'updated', 'unchanged', 'rejected', 'importedAt']
  return (
    row.operation === 'import' &&
    keys.length === allowed.length &&
    keys.every((key) => allowed.includes(key)) &&
    ['inserted', 'updated', 'unchanged', 'rejected'].every(
      (key) =>
        typeof row.response[key] === 'number' &&
        Number.isSafeInteger(row.response[key]) &&
        (row.response[key] as number) >= 0,
    ) &&
    typeof row.response.importedAt === 'string' &&
    Number.isFinite(Date.parse(row.response.importedAt)) &&
    new Date(row.response.importedAt).toISOString() === row.response.importedAt
  )
}
const receiptContext = (profileId: string, id: string) => ({
  profileId,
  table: 'source_erasure_receipts',
  column: 'receipt',
  rowId: id,
})
const factContext = (profileId: string, connectionId: string, kind: string, id: string) => ({
  profileId,
  table: 'source_fact_generations',
  column: 'proof',
  rowId: createHash('sha256')
    .update(JSON.stringify([profileId, connectionId, kind, id]))
    .digest('hex'),
})
async function decode(
  encryption: ProfileEncryption,
  db: Database,
  context: Parameters<ProfileEncryption['decryptJson']>[1],
  value: Record<string, unknown>,
) {
  if (Object.keys(value).length !== 1 || typeof value._lilleriEncrypted !== 'string')
    throw new Error('Source erasure encrypted envelope is invalid')
  return encryption.decryptJson(db, context, value._lilleriEncrypted)
}
async function storedReceipts(
  db: Database,
  profileId: string,
  encryption: ProfileEncryption,
  journal: SourceErasureJournal,
  connectionId?: string,
) {
  const rows = await db
    .select()
    .from(sourceErasureReceipts)
    .where(
      and(
        eq(sourceErasureReceipts.profileId, profileId),
        connectionId ? eq(sourceErasureReceipts.connectionId, connectionId) : undefined,
      ),
    )
    .orderBy(asc(sourceErasureReceipts.revision))
  const result: { signed: SignedSourceErasure; appliedAt: string | null }[] = []
  for (const row of rows) {
    const signed = journal.verifyReceipt(
      await decode(encryption, db, receiptContext(profileId, row.id), row.receipt),
    )
    if (
      signed.body.id !== row.id ||
      signed.body.profileId !== row.profileId ||
      signed.body.connectionId !== row.connectionId ||
      signed.body.revision !== row.revision ||
      signed.body.erasedAt !== row.stagedAt ||
      signed.keyId !== row.journalKeyId ||
      journal.receiptDigest(signed) !== row.digest
    )
      throw new Error('Source erasure receipt scope is invalid')
    result.push({ signed, appliedAt: row.appliedAt })
  }
  return result
}
/** Read gate for the same process after a durable intent whose SQL transaction failed. No filesystem I/O. */
export async function assertSourceErasureReady(
  db: Database,
  profileId: string,
  journal: SourceErasureJournal,
  encryption: ProfileEncryption,
) {
  const current = journal.intentsForProfile(profileId),
    rows = await storedReceipts(db, profileId, encryption, journal)
  if (
    current.some(
      (intent) =>
        !rows.some(
          (row) =>
            row.signed.body.id === intent.id &&
            row.appliedAt !== null &&
            journal.receiptDigest(row.signed) === intent.digest,
        ),
    )
  )
    throw new Error('Source erasure recovery is required before accessing financial data')
  return rows
}
/** Server-trusted post-write proof. Uses an already loaded signer and performs no external I/O. */
export async function recordSourceFacts(
  db: Database,
  journal: SourceErasureJournal,
  input: SourceFacts,
  at: string,
  encryption: ProfileEncryption,
) {
  instant(at)
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, input.profileId))
    .for('update')
  const [connection] = await db
    .select()
    .from(schema.connections)
    .where(
      and(
        eq(schema.connections.profileId, input.profileId),
        eq(schema.connections.id, input.connectionId),
      ),
    )
    .for('update')
  if (!profile || !connection) throw notFound()
  if (connection.status !== 'active') throw changed()
  if (at < profile.createdAt || at < connection.createdAt) throw changed()
  const receipts = await storedReceipts(
    db,
    input.profileId,
    encryption,
    journal,
    input.connectionId,
  )
  if (receipts.some((row) => row.appliedAt === null || row.signed.body.erasedAt > at))
    throw changed()
  if (input.consentId !== null) {
    const [grant] = await db
      .select()
      .from(schema.consents)
      .where(
        and(
          eq(schema.consents.profileId, input.profileId),
          eq(schema.consents.connectionId, input.connectionId),
          eq(schema.consents.id, input.consentId),
          isNull(schema.consents.revokedAt),
        ),
      )
    if (
      !grant ||
      grant.grantedAt > at ||
      grant.expiresAt <= at ||
      receipts.some((row) => row.signed.body.consentIds.includes(input.consentId as string))
    )
      throw changed()
  } else if (connection.providerId !== 'local-manual') throw changed()
  const epoch = Math.max(0, ...receipts.map((row) => row.signed.body.revision))
  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.profileId, input.profileId),
        eq(schema.accounts.connectionId, input.connectionId),
      ),
    )
  const accountSet = new Set(accounts.map((row) => row.id)),
    transactions = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, input.profileId),
          eq(schema.transactions.connectionId, input.connectionId),
        ),
      ),
    observations = await db
      .select()
      .from(schema.observations)
      .where(
        and(
          eq(schema.observations.profileId, input.profileId),
          eq(schema.observations.connectionId, input.connectionId),
        ),
      )
  const commands = input.manualCommands?.length
    ? await db
        .select()
        .from(manualCommands)
        .where(
          and(
            eq(manualCommands.profileId, input.profileId),
            inArray(
              manualCommands.requestId,
              input.manualCommands.map((row) => row.id),
            ),
          ),
        )
    : []
  const commandsById = new Map(commands.map((row) => [row.requestId, row]))
  const txById = new Map(transactions.map((row) => [row.id, row])),
    obsById = new Map(observations.map((row) => [row.id, row]))
  const accountsById = new Map(accounts.map((row) => [row.id, row]))
  const payloads = await db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, input.profileId)),
    payloadsById = new Map(payloads.map((row) => [row.observationId, row.payload]))
  if (
    new Set(input.accountIds).size !== input.accountIds.length ||
    new Set(input.transactions.map((row) => row.id)).size !== input.transactions.length ||
    new Set(input.observations.map((row) => row.id)).size !== input.observations.length ||
    input.accountIds.some((id) => !accountSet.has(id)) ||
    input.transactions.some((row) => txById.get(row.id)?.accountId !== row.accountId) ||
    input.observations.some((row) => obsById.get(row.id)?.accountId !== row.accountId) ||
    new Set((input.manualCommands ?? []).map((row) => row.id)).size !==
      (input.manualCommands ?? []).length ||
    (input.manualCommands ?? []).some((row) => {
      const command = commandsById.get(row.id)
      return (
        !accountSet.has(row.accountId) ||
        command?.sourceAccountId !== row.accountId ||
        command.sourceConnectionId !== input.connectionId ||
        command.createdAt > at
      )
    })
  )
    throw new Error('Source facts must reference persisted owned rows')
  const facts = [
    ...input.accountIds.map((id) => ({ kind: 'account' as const, subjectId: id, accountId: id })),
    ...input.transactions.map((row) => ({
      kind: 'transaction' as const,
      subjectId: row.id,
      accountId: row.accountId,
    })),
    ...input.observations.map((row) => ({
      kind: 'observation' as const,
      subjectId: row.id,
      accountId: row.accountId,
    })),
    ...(input.manualCommands ?? []).map((row) => ({
      kind: 'manual_command' as const,
      subjectId: row.id,
      accountId: row.accountId,
    })),
  ]
  for (const fact of facts) {
    const [previous] = await db
      .select()
      .from(sourceFactGenerations)
      .where(
        and(
          eq(sourceFactGenerations.profileId, input.profileId),
          eq(sourceFactGenerations.connectionId, input.connectionId),
          eq(sourceFactGenerations.kind, fact.kind),
          eq(sourceFactGenerations.subjectId, fact.subjectId),
        ),
      )
    if (previous && previous.recordedAt > at) throw changed()
    const proof = journal.signFact({
      ...fact,
      profileId: input.profileId,
      connectionId: input.connectionId,
      consentId: input.consentId,
      erasureRevision: epoch,
      recordedAt: at,
      contentDigest: await logicalFactDigest(
        db,
        fact.kind,
        fact.kind === 'account'
          ? accountsById.get(fact.subjectId)
          : fact.kind === 'transaction'
            ? txById.get(fact.subjectId)
            : fact.kind === 'observation'
              ? obsById.get(fact.subjectId)
              : commandsById.get(fact.subjectId),
        encryption,
      ),
      payloadDigest:
        fact.kind === 'observation' && payloadsById.has(fact.subjectId)
          ? await logicalPayloadDigest(
              db,
              input.profileId,
              fact.subjectId,
              payloadsById.get(fact.subjectId) as Record<string, unknown>,
              encryption,
            )
          : null,
    })
    const values = {
      ...fact,
      profileId: input.profileId,
      connectionId: input.connectionId,
      recordedAt: at,
      proof: {
        _lilleriEncrypted: await encryption.encryptJson(
          db,
          factContext(input.profileId, input.connectionId, fact.kind, fact.subjectId),
          proof,
        ),
      },
    }
    await db
      .insert(sourceFactGenerations)
      .values(values)
      .onConflictDoUpdate({
        target: [
          sourceFactGenerations.profileId,
          sourceFactGenerations.connectionId,
          sourceFactGenerations.kind,
          sourceFactGenerations.subjectId,
        ],
        set: { proof: values.proof, recordedAt: at, accountId: fact.accountId },
      })
  }
}
async function factProofs(
  db: Database,
  body: SourceErasureReceipt,
  encryption: ProfileEncryption,
  journal: SourceErasureJournal,
) {
  const rows = await db
    .select()
    .from(sourceFactGenerations)
    .where(
      and(
        eq(sourceFactGenerations.profileId, body.profileId),
        eq(sourceFactGenerations.connectionId, body.connectionId),
      ),
    )
  const result = new Map<string, SourceFactProof>()
  for (const row of rows) {
    const proof = journal.verifyFact(
      await decode(
        encryption,
        db,
        factContext(row.profileId, row.connectionId, row.kind, row.subjectId),
        row.proof,
      ),
    )
    if (
      proof.body.profileId !== row.profileId ||
      proof.body.connectionId !== row.connectionId ||
      proof.body.kind !== row.kind ||
      proof.body.subjectId !== row.subjectId ||
      proof.body.accountId !== row.accountId ||
      proof.body.recordedAt !== row.recordedAt
    )
      throw new Error('Source fact proof scope is invalid')
    result.set(`${row.kind}:${row.subjectId}`, proof)
  }
  return result
}
/** Authenticated current source generations for encrypted audit snapshots captured under the profile lock. */
export async function readSourceFactEpochs(
  db: Database,
  profileId: string,
  encryption: ProfileEncryption,
  journal: SourceErasureJournal,
) {
  const rows = await db
    .select()
    .from(sourceFactGenerations)
    .where(eq(sourceFactGenerations.profileId, profileId))
  const accounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, profileId)),
    transactions = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId)),
    observations = await db
      .select()
      .from(schema.observations)
      .where(eq(schema.observations.profileId, profileId)),
    commands = await db.select().from(manualCommands).where(eq(manualCommands.profileId, profileId))
  const maps = {
    account: new Map(accounts.map((row) => [row.id, row])),
    transaction: new Map(transactions.map((row) => [row.id, row])),
    observation: new Map(observations.map((row) => [row.id, row])),
    manual_command: new Map(commands.map((row) => [row.requestId, row])),
  }
  const result: {
    kind: SourceFactProof['body']['kind']
    subjectId: string
    accountId: string
    connectionId: string
    erasureRevision: number
    recordedAt: string
    contentDigest: string
  }[] = []
  for (const row of rows) {
    const { body } = journal.verifyFact(
      await decode(
        encryption,
        db,
        factContext(profileId, row.connectionId, row.kind, row.subjectId),
        row.proof,
      ),
    )
    if (
      body.profileId !== profileId ||
      body.connectionId !== row.connectionId ||
      body.kind !== row.kind ||
      body.subjectId !== row.subjectId ||
      body.accountId !== row.accountId ||
      body.recordedAt !== row.recordedAt
    )
      throw new Error('Source generation scope is invalid')
    const current = maps[body.kind].get(body.subjectId)
    if (!current) continue
    if (body.contentDigest !== (await logicalFactDigest(db, body.kind, current, encryption)))
      throw new Error('Source generation content differs from its authorization')
    result.push({
      kind: body.kind,
      subjectId: body.subjectId,
      accountId: body.accountId,
      connectionId: body.connectionId,
      erasureRevision: body.erasureRevision,
      recordedAt: body.recordedAt,
      contentDigest: body.contentDigest,
    })
  }
  return result
}
async function stageAuthenticatedReceipt(
  db: Database,
  signed: SignedSourceErasure,
  encryption: ProfileEncryption,
  journal: SourceErasureJournal,
  at: string,
) {
  const body = signed.body,
    [existing] = await db
      .select()
      .from(sourceErasureReceipts)
      .where(eq(sourceErasureReceipts.id, body.id))
  if (existing) {
    const decoded = journal.verifyReceipt(
      await decode(encryption, db, receiptContext(body.profileId, body.id), existing.receipt),
    )
    if (
      existing.profileId !== body.profileId ||
      existing.connectionId !== body.connectionId ||
      existing.revision !== body.revision ||
      existing.stagedAt !== body.erasedAt ||
      existing.digest !== journal.receiptDigest(signed) ||
      existing.journalKeyId !== journal.keyId ||
      journal.receiptDigest(decoded) !== journal.receiptDigest(signed)
    )
      throw new Error('Source erasure receipt differs from authenticated intent')
    if (existing.appliedAt && existing.appliedAt > at) throw changed()
    return existing.appliedAt
  }
  await db.insert(sourceErasureReceipts).values({
    id: body.id,
    profileId: body.profileId,
    connectionId: body.connectionId,
    revision: body.revision,
    receipt: {
      _lilleriEncrypted: await encryption.encryptJson(
        db,
        receiptContext(body.profileId, body.id),
        signed,
      ),
    },
    journalKeyId: journal.keyId,
    digest: journal.receiptDigest(signed),
    stagedAt: body.erasedAt,
    appliedAt: null,
  })
  return null
}
/** Replays only captured old membership; unproven unknown generations keep the restore quarantined. */
export async function replaySourceErasure(
  db: Database,
  signedInput: SignedSourceErasure,
  encryption: ProfileEncryption,
  journal: SourceErasureJournal,
  at: string,
  hooks: SourceErasureHooks = {},
) {
  const signed = journal.verifyReceipt(signedInput),
    body = signed.body
  instant(at)
  if (at < body.erasedAt) throw changed()
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, body.profileId))
    .for('update')
  if (body.creationIntents.length) {
    if (!hooks.replayCreationIntents) throw new Error('Source creation intent replay is required')
    const captured = await db
      .select()
      .from(connectionCreationIntents)
      .where(
        and(
          eq(connectionCreationIntents.profileId, body.profileId),
          eq(connectionCreationIntents.connectionId, body.connectionId),
          inArray(
            connectionCreationIntents.id,
            body.creationIntents.map((row) => row.id),
          ),
        ),
      )
      .for('update')
    if (
      captured.length !== body.creationIntents.length ||
      captured.some((row) => {
        const original = body.creationIntents.find((item) => item.id === row.id)
        return (
          !original ||
          row.providerId !== original.providerId ||
          row.consentId !== original.consentId
        )
      })
    )
      throw new Error('Source creation routing differs from authenticated erasure')
    await hooks.replayCreationIntents(
      db,
      body.profileId,
      body.connectionId,
      body.creationIntents.map((row) => row.id),
      at,
    )
  }
  // Captured IDs may never be moved to another profile/source to evade the replay selector.
  const capturedAccounts = body.accountIds.length
      ? await db.select().from(schema.accounts).where(inArray(schema.accounts.id, body.accountIds))
      : [],
    capturedTransactions = body.transactions.length
      ? await db
          .select()
          .from(schema.transactions)
          .where(
            inArray(
              schema.transactions.id,
              body.transactions.map((row) => row.id),
            ),
          )
      : [],
    capturedObservations = body.observations.length
      ? await db
          .select()
          .from(schema.observations)
          .where(
            inArray(
              schema.observations.id,
              body.observations.map((row) => row.id),
            ),
          )
      : []
  if (
    capturedAccounts.some(
      (row) => row.profileId !== body.profileId || row.connectionId !== body.connectionId,
    ) ||
    capturedTransactions.some(
      (row) =>
        row.profileId !== body.profileId ||
        row.connectionId !== body.connectionId ||
        body.transactions.find((ref) => ref.id === row.id)?.accountId !== row.accountId,
    ) ||
    capturedObservations.some(
      (row) =>
        row.profileId !== body.profileId ||
        row.connectionId !== body.connectionId ||
        body.observations.find((ref) => ref.id === row.id)?.accountId !== row.accountId,
    )
  )
    throw new Error('Captured source membership differs from its authenticated erasure')
  for (const job of body.revocationJobs) await enqueueRevocation(db, job, job.createdAt)
  if (!profile) return { accountsRemoved: 0, transactionsRemoved: 0, observationsRemoved: 0 }
  const [connection] = await db
    .select()
    .from(schema.connections)
    .where(
      and(
        eq(schema.connections.profileId, body.profileId),
        eq(schema.connections.id, body.connectionId),
      ),
    )
    .for('update')
  const accounts = await db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.profileId, body.profileId),
          eq(schema.accounts.connectionId, body.connectionId),
        ),
      ),
    transactions = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, body.profileId),
          eq(schema.transactions.connectionId, body.connectionId),
        ),
      ),
    observations = await db
      .select()
      .from(schema.observations)
      .where(
        and(
          eq(schema.observations.profileId, body.profileId),
          eq(schema.observations.connectionId, body.connectionId),
        ),
      )
  const proofs = await factProofs(db, body, encryption, journal),
    knownAccounts = new Set(body.accountIds),
    knownTransactions = new Map(body.transactions.map((row) => [row.id, row.accountId])),
    knownObservations = new Map(body.observations.map((row) => [row.id, row.accountId])),
    knownCommands = new Map(body.manualCommands.map((row) => [row.id, row.accountId]))
  const payloads = await db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, body.profileId)),
    payloadsById = new Map(payloads.map((row) => [row.observationId, row.payload]))
  const preserve = async (
    kind: SourceFactProof['body']['kind'],
    id: string,
    accountId: string,
    row: unknown,
  ) => {
    const proof = proofs.get(`${kind}:${id}`)
    if (!proof) return false
    if (proof.body.accountId !== accountId) throw new Error('Source fact membership is invalid')
    if (proof.body.erasureRevision < body.revision) return false
    if (
      proof.body.recordedAt < body.erasedAt ||
      (proof.body.consentId !== null && body.consentIds.includes(proof.body.consentId))
    )
      throw new Error('Source fact generation is invalid')
    if (
      proof.body.contentDigest !== (await logicalFactDigest(db, kind, row, encryption)) ||
      (kind === 'observation' &&
        payloadsById.has(id) &&
        proof.body.payloadDigest !==
          (await logicalPayloadDigest(
            db,
            body.profileId,
            id,
            payloadsById.get(id) as Record<string, unknown>,
            encryption,
          )))
    )
      throw new Error('Source fact content differs from its authorization')
    return true
  }
  const removeAccounts: string[] = [],
    removeTx: string[] = [],
    removeObs: string[] = []
  for (const row of accounts)
    if (!(await preserve('account', row.id, row.id, row))) {
      if (!knownAccounts.has(row.id))
        throw new Error('Unproven source account generation remains quarantined')
      removeAccounts.push(row.id)
    }
  for (const row of transactions)
    if (!(await preserve('transaction', row.id, row.accountId, row))) {
      if (knownTransactions.get(row.id) !== row.accountId)
        throw new Error('Unproven source transaction generation remains quarantined')
      removeTx.push(row.id)
    }
  for (const row of observations)
    if (!(await preserve('observation', row.id, row.accountId, row))) {
      if (knownObservations.get(row.id) !== row.accountId)
        throw new Error('Unproven source observation generation remains quarantined')
      removeObs.push(row.id)
    }
  // A child with a new authorization also requires its account's new authorization.
  if (
    transactions.some(
      (row) => !removeTx.includes(row.id) && removeAccounts.includes(row.accountId),
    ) ||
    observations.some(
      (row) => !removeObs.includes(row.id) && removeAccounts.includes(row.accountId),
    )
  )
    throw new Error('New source facts require proven account generation')
  const allCommands = await db
      .select()
      .from(manualCommands)
      .where(eq(manualCommands.profileId, body.profileId)),
    allEvents = await db
      .select()
      .from(manualBalanceEvents)
      .where(eq(manualBalanceEvents.profileId, body.profileId)),
    sourceAccountIds = new Set([...accounts.map((row) => row.id), ...body.accountIds])
  const allProfileAccounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, body.profileId)),
    ownedAccountConnections = new Map(allProfileAccounts.map((row) => [row.id, row.connectionId])),
    commandMembership = new Map<string, string>()
  for (const row of allCommands) {
    const eventAccounts = [
      ...new Set(
        allEvents
          .filter((event) => event.requestId === row.requestId)
          .map((event) => event.accountId),
      ),
    ]
    if (row.sourceAccountId !== null && row.sourceConnectionId !== null) {
      if (row.sourceConnectionId === body.connectionId || knownCommands.has(row.requestId))
        commandMembership.set(row.requestId, row.sourceAccountId)
      continue
    }
    if (eventAccounts.length > 1)
      throw new Error('Unproven legacy source command membership remains quarantined')
    const accountId =
      eventAccounts[0] ?? knownCommands.get(row.requestId) ?? legacyCommandAccount(row)
    if (!accountId) {
      if (!legacyCountReport(row))
        throw new Error('Unproven legacy financial cache remains quarantined')
      continue
    }
    const connectionId = ownedAccountConnections.get(accountId)
    if (
      connectionId === body.connectionId ||
      sourceAccountIds.has(accountId) ||
      knownCommands.has(row.requestId)
    )
      commandMembership.set(row.requestId, accountId)
    else if (!connectionId) throw new Error('Unproven legacy financial cache remains quarantined')
  }
  const commandRows = allCommands.filter((row) => commandMembership.has(row.requestId))
  const removeCommands: string[] = []
  for (const row of commandRows) {
    const accountId = commandMembership.get(row.requestId)
    if (
      !accountId ||
      (row.sourceConnectionId !== null && row.sourceConnectionId !== body.connectionId)
    )
      throw new Error('Unproven source command membership remains quarantined')
    const keep = await preserve('manual_command', row.requestId, accountId, row)
    if (keep) {
      if (
        removeAccounts.includes(accountId) ||
        !accounts.some((account) => account.id === accountId)
      )
        throw new Error('New source commands require proven account generation')
    } else {
      if (knownCommands.get(row.requestId) !== accountId)
        throw new Error('Unproven source command generation remains quarantined')
      removeCommands.push(row.requestId)
    }
  }
  const previouslyAppliedAt = await stageAuthenticatedReceipt(db, signed, encryption, journal, at)
  await hooks.eraseFinancialReferences?.(db, {
    receipt: body,
    accountIds: removeAccounts,
    transactionIds: removeTx,
    observationIds: removeObs,
    at,
  })
  if (removeAccounts.length)
    await db
      .delete(schema.accounts)
      .where(
        and(
          eq(schema.accounts.profileId, body.profileId),
          inArray(schema.accounts.id, removeAccounts),
        ),
      )
  const remainingObs = observations
    .filter((row) => removeObs.includes(row.id) && !removeAccounts.includes(row.accountId))
    .map((row) => row.id)
  const remainingTx = transactions
    .filter((row) => removeTx.includes(row.id) && !removeAccounts.includes(row.accountId))
    .map((row) => row.id)
  if (remainingObs.length)
    await db
      .delete(schema.observations)
      .where(
        and(
          eq(schema.observations.profileId, body.profileId),
          inArray(schema.observations.id, remainingObs),
        ),
      )
  if (remainingTx.length)
    await db
      .delete(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, body.profileId),
          inArray(schema.transactions.id, remainingTx),
        ),
      )
  if (removeCommands.length)
    await db
      .delete(manualCommands)
      .where(
        and(
          eq(manualCommands.profileId, body.profileId),
          inArray(manualCommands.requestId, removeCommands),
        ),
      )
  const [newGrant] = await db
    .select()
    .from(schema.consents)
    .where(
      and(
        eq(schema.consents.profileId, body.profileId),
        eq(schema.consents.connectionId, body.connectionId),
        isNull(schema.consents.revokedAt),
      ),
    )
  const hasNewFacts = accounts.some((row) => !removeAccounts.includes(row.id))
  const newAuthorizedGeneration =
    hasNewFacts &&
    (connection?.providerId === 'local-manual' ||
      (newGrant && !body.consentIds.includes(newGrant.id)))
  if (connection && !newAuthorizedGeneration) {
    await db
      .update(schema.connections)
      .set({ status: 'revoked', lastSyncedAt: null })
      .where(
        and(
          eq(schema.connections.profileId, body.profileId),
          eq(schema.connections.id, body.connectionId),
        ),
      )
    if (body.consentIds.length)
      await db
        .update(schema.consents)
        .set({ revokedAt: body.erasedAt })
        .where(
          and(
            eq(schema.consents.profileId, body.profileId),
            eq(schema.consents.connectionId, body.connectionId),
            inArray(schema.consents.id, body.consentIds),
            isNull(schema.consents.revokedAt),
          ),
        )
    await recordConsentRevoked(db, body.profileId, body.connectionId, at)
  }
  if (body.consentIds.length) {
    const jobs = await db
      .select()
      .from(syncJobs)
      .where(
        and(
          eq(syncJobs.profileId, body.profileId),
          eq(syncJobs.connectionId, body.connectionId),
          inArray(syncJobs.consentId, body.consentIds),
        ),
      )
      .for('update')
    for (const job of jobs) {
      await db
        .delete(syncStages)
        .where(and(eq(syncStages.profileId, body.profileId), eq(syncStages.jobId, job.id)))
      const active = !['completed', 'failed', 'cancelled'].includes(job.state)
      await db
        .update(syncJobs)
        .set({
          report: { ...job.report, balances: [], outcomes: [], issues: [] },
          ...(active
            ? {
                state: 'cancelled' as const,
                reason: 'consent_inactive' as const,
                leaseToken: null,
                leaseExpiresAt: null,
                updatedAt: at,
                revision: job.revision + 1,
              }
            : {}),
        })
        .where(and(eq(syncJobs.profileId, body.profileId), eq(syncJobs.id, job.id)))
    }
  }
  if (previouslyAppliedAt === null)
    await db
      .update(sourceErasureReceipts)
      .set({ appliedAt: at })
      .where(eq(sourceErasureReceipts.id, body.id))
  return {
    accountsRemoved: removeAccounts.length,
    transactionsRemoved: removeTx.length,
    observationsRemoved: removeObs.length,
  }
}
export class SourceErasureService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly encryption: ProfileEncryption,
    readonly journal: SourceErasureJournal,
    readonly now: () => string = () => new Date().toISOString(),
    readonly hooks: SourceErasureHooks = {},
  ) {}
  async erase(connectionId: string) {
    const at = instant(this.now())
    return this.db.transaction(async (db) => {
      const [profile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const [connection] = await db
        .select()
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.profileId, this.profileId),
            eq(schema.connections.id, connectionId),
          ),
        )
        .for('update')
      if (!profile || !connection) throw notFound()
      const applied = await assertSourceErasureReady(
        db,
        this.profileId,
        this.journal,
        this.encryption,
      )
      if (applied.some((row) => row.appliedAt !== null && row.appliedAt > at)) throw changed()
      const independent = (await this.journal.readAll()).filter(
        (row) => row.body.profileId === this.profileId && row.body.connectionId === connectionId,
      )
      if (
        at < profile.createdAt ||
        at < connection.createdAt ||
        independent.some((row) => row.body.erasedAt > at)
      )
        throw changed()
      const revision = Math.max(0, ...independent.map((row) => row.body.revision)) + 1,
        id = randomUUID()
      const accounts = await db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.profileId, this.profileId),
            eq(schema.accounts.connectionId, connectionId),
          ),
        )
      const transactions = await db
        .select({ id: schema.transactions.id, accountId: schema.transactions.accountId })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.profileId, this.profileId),
            eq(schema.transactions.connectionId, connectionId),
          ),
        )
      const observations = await db
        .select({ id: schema.observations.id, accountId: schema.observations.accountId })
        .from(schema.observations)
        .where(
          and(
            eq(schema.observations.profileId, this.profileId),
            eq(schema.observations.connectionId, connectionId),
          ),
        )
      const consents = await db
        .select()
        .from(schema.consents)
        .where(
          and(
            eq(schema.consents.profileId, this.profileId),
            eq(schema.consents.connectionId, connectionId),
          ),
        )
      for (const consent of consents)
        await enqueueRevocation(
          db,
          {
            profileId: this.profileId,
            connectionId,
            providerId: consent.provider,
            consentId: consent.id,
          },
          at,
        )
      const jobs = await db
        .select({
          id: schema.revocationJobs.id,
          profileId: schema.revocationJobs.profileId,
          connectionId: schema.revocationJobs.connectionId,
          providerId: schema.revocationJobs.providerId,
          consentId: schema.revocationJobs.consentId,
          createdAt: schema.revocationJobs.createdAt,
        })
        .from(schema.revocationJobs)
        .where(
          and(
            eq(schema.revocationJobs.profileId, this.profileId),
            eq(schema.revocationJobs.connectionId, connectionId),
          ),
        )
      await this.encryption.encryptJson(db, receiptContext(this.profileId, id), { prepare: true })
      const [key] = await db
        .select()
        .from(profileEncryptionKeys)
        .where(eq(profileEncryptionKeys.profileId, this.profileId))
      if (!key) throw new Error('Source erasure requires a current profile key')
      const auditRefs = accounts.length
        ? await db
            .select({
              requestId: manualBalanceEvents.requestId,
              accountId: manualBalanceEvents.accountId,
            })
            .from(manualBalanceEvents)
            .where(
              and(
                eq(manualBalanceEvents.profileId, this.profileId),
                inArray(
                  manualBalanceEvents.accountId,
                  accounts.map((row) => row.id),
                ),
              ),
            )
        : []
      const scopedCommands = await db
        .select()
        .from(manualCommands)
        .where(
          and(
            eq(manualCommands.profileId, this.profileId),
            eq(manualCommands.sourceConnectionId, connectionId),
          ),
        )
      for (const row of scopedCommands)
        if (row.sourceAccountId && !auditRefs.some((ref) => ref.requestId === row.requestId))
          auditRefs.push({ requestId: row.requestId, accountId: row.sourceAccountId })
      const legacyCommands = await db
        .select()
        .from(manualCommands)
        .where(
          and(
            eq(manualCommands.profileId, this.profileId),
            isNull(manualCommands.sourceAccountId),
            isNull(manualCommands.sourceConnectionId),
          ),
        )
      const capturedAccounts = new Set(accounts.map((row) => row.id))
      for (const row of legacyCommands) {
        const accountId = legacyCommandAccount(row)
        if (
          accountId &&
          capturedAccounts.has(accountId) &&
          !auditRefs.some((ref) => ref.requestId === row.requestId)
        )
          auditRefs.push({ requestId: row.requestId, accountId })
      }
      const creationIntents =
        (await this.hooks.beforeErase?.(db, this.profileId, connectionId, at)) ?? []
      const body: SourceErasureReceipt = {
        format: 'lilleri.source-erasure.v1',
        id,
        profileId: this.profileId,
        connectionId,
        revision,
        erasedAt: at,
        profileKeyId: key.keyId,
        accountIds: accounts.map((row) => row.id),
        transactions,
        observations,
        consentIds: consents.map((row) => row.id),
        revocationJobs: jobs,
        creationIntents: [...creationIntents],
        manualCommandIds: [...new Set(auditRefs.map((row) => row.requestId))],
        manualCommands: [
          ...new Map(
            auditRefs.map((row) => [
              row.requestId,
              { id: row.requestId, accountId: row.accountId },
            ]),
          ).values(),
        ],
        localDeletion: 'row-erasure-with-mandatory-restore-replay',
        sourceKeyErasure: 'shared-profile-key-retained',
      }
      // Independent intent is durable before deleting financial facts. Crash/rollback does not revoke it.
      const signed = await this.journal.writeIntent(body, key)
      await replaySourceErasure(db, signed, this.encryption, this.journal, at, this.hooks)
      return { signed, appliedAt: at }
    })
  }
  async ownedExport(db: Database = this.db) {
    const rows = await assertSourceErasureReady(db, this.profileId, this.journal, this.encryption)
    return {
      sourceErasures: rows.filter(
        (row): row is { signed: SignedSourceErasure; appliedAt: string } => row.appliedAt !== null,
      ),
    }
  }
}
/** Boot/recovery/restore gate; failures intentionally withhold any safe-to-open result. */
export async function recoverSourceErasures(
  db: Database,
  journal: SourceErasureJournal,
  encryption: ProfileEncryption,
  now: () => string = () => new Date().toISOString(),
  hooks: SourceErasureHooks = {},
) {
  const at = instant(now()),
    receipts = await journal.readAll()
  let accountsRemoved = 0,
    transactionsRemoved = 0,
    observationsRemoved = 0
  for (const signed of receipts) {
    const [key] = await db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, signed.body.profileId))
    const [deleted] = await db
      .select()
      .from(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, signed.body.profileId))
    await journal.anchorIntent(signed, key, Boolean(deleted))
    const result = await db.transaction((tx) =>
      replaySourceErasure(tx, signed, encryption, journal, at, hooks),
    )
    accountsRemoved += result.accountsRemoved
    transactionsRemoved += result.transactionsRemoved
    observationsRemoved += result.observationsRemoved
  }
  return {
    format: 'lilleri.source-erasure-replay.v1' as const,
    tombstonesReplayed: receipts.length,
    accountsRemoved,
    transactionsRemoved,
    observationsRemoved,
    safeToOpenLocally: true as const,
  }
}
