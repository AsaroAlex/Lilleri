import { type Database, schema } from '@lilleri/database'
import {
  type Account,
  type Classification,
  parseDecimal,
  type ReviewItem,
  type Transaction,
} from '@lilleri/domain'
import { normalizeAccount, normalizeTransaction, stableId } from '@lilleri/financial-providers'
import { and, asc, desc, eq, or } from 'drizzle-orm'
import type { ProfileEncryption } from './encryption.js'
import { insertSourceObservation } from './retention.js'
import { addDays, type SyncStage, syncHash, syncRequired } from './sync-provider.js'
import {
  emptySyncReport,
  type SyncBalanceResult,
  type SyncReport,
  syncIssues,
  syncJobs,
  syncPresence,
} from './sync-schema.js'

function transactionHash({ revision: _revision, observedAt: _observedAt, ...value }: Transaction) {
  return syncHash(value)
}

/** Current attention only; ownership exports retain the complete immutable job/issue history. */
export async function syncReviewItems(
  db: Database,
  profileId: string,
  input: {
    readonly transactions: readonly Transaction[]
    readonly classifications: readonly Pick<Classification, 'transactionId' | 'categoryId'>[]
    readonly excludedTransactionIds: readonly string[]
  },
): Promise<ReviewItem[]> {
  const transactions = new Map(
    input.transactions.map((transaction) => [transaction.id, transaction]),
  )
  if (
    transactions.size !== input.transactions.length ||
    input.transactions.some((transaction) => transaction.profileId !== profileId)
  )
    throw new Error('Invalid sync review scope')
  const excluded = new Set([
    ...input.excludedTransactionIds,
    ...input.classifications
      .filter((item) => item.categoryId === 'health')
      .map((item) => item.transactionId),
  ])
  // A private purchase must also hide the related refund or replacement, in either direction.
  const related = new Map<string, Set<string>>()
  for (const transaction of transactions.values()) {
    if (!transaction.relatedTransactionId || !transactions.has(transaction.relatedTransactionId))
      continue
    for (const [first, second] of [
      [transaction.id, transaction.relatedTransactionId],
      [transaction.relatedTransactionId, transaction.id],
    ] as const) {
      const links = related.get(first) ?? new Set<string>()
      links.add(second)
      related.set(first, links)
    }
  }
  const queue = [...excluded]
  for (let index = 0; index < queue.length; index++) {
    for (const id of related.get(syncRequired(queue[index])) ?? []) {
      if (!excluded.has(id)) {
        excluded.add(id)
        queue.push(id)
      }
    }
  }
  const accountGroups = new Map<string, Transaction[]>()
  for (const transaction of transactions.values()) {
    const group = accountGroups.get(transaction.accountId) ?? []
    group.push(transaction)
    accountGroups.set(transaction.accountId, group)
  }
  const results = new Map<string, ReviewItem>()
  const currentJobs = await db
    .selectDistinctOn([syncJobs.connectionId])
    .from(syncJobs)
    .where(and(eq(syncJobs.profileId, profileId), eq(syncJobs.state, 'completed')))
    .orderBy(
      asc(syncJobs.connectionId),
      desc(syncJobs.completedAt),
      desc(syncJobs.createdAt),
      desc(syncJobs.id),
    )
    .limit(100)
  for (const job of currentJobs) {
    for (const issue of job.report.issues) {
      if (issue.kind !== 'balance_mismatch' && issue.kind !== 'history_gap') continue
      const group = accountGroups.get(issue.accountId) ?? []
      if (
        group.some(
          (transaction) =>
            transaction.connectionId !== job.connectionId || excluded.has(transaction.id),
        )
      )
        continue
      if (
        issue.kind === 'balance_mismatch' &&
        !job.report.balances.some(
          (balance) => balance.accountId === issue.accountId && balance.result === 'mismatch',
        )
      )
        continue
      const id = `sync-review:${issue.kind}:${job.connectionId}:${issue.accountId}`
      results.set(id, {
        id,
        transactionIds: group.map((transaction) => transaction.id).sort(),
        type: 'balance',
        explanation:
          issue.kind === 'balance_mismatch'
            ? 'Il saldo della fonte differisce dal saldo ricostruito con lo stesso periodo e la stessa valuta. Nessun importo è stato corretto.'
            : 'La fonte non ha dichiarato l’inizio dello storico. I dati disponibili non dimostrano che lo storico sia completo.',
        matchId: null,
      })
    }
  }
  const presenceRows = await db
    .select()
    .from(syncPresence)
    .where(
      and(
        eq(syncPresence.profileId, profileId),
        or(eq(syncPresence.state, 'pending_absent'), eq(syncPresence.state, 'removed_by_source')),
      ),
    )
    .orderBy(desc(syncPresence.updatedAt), asc(syncPresence.transactionId))
    .limit(100)
  for (const presence of presenceRows) {
    if (presence.state !== 'pending_absent' && presence.state !== 'removed_by_source') continue
    const transaction = transactions.get(presence.transactionId)
    if (
      !transaction ||
      excluded.has(transaction.id) ||
      transaction.accountId !== presence.accountId ||
      transaction.connectionId !== presence.connectionId ||
      presence.evidence.version !== 'sync-presence-v1'
    )
      continue
    if (
      presence.state === 'pending_absent' &&
      (transaction.status !== 'pending' || presence.evidence.rule !== 'pending_absent')
    )
      continue
    if (
      presence.state === 'removed_by_source' &&
      (transaction.status !== 'booked' ||
        presence.missingCompletions < 2 ||
        presence.evidence.rule !== 'two_complete_windows')
    )
      continue
    const [issue] = await db
      .select()
      .from(syncIssues)
      .where(
        and(
          eq(syncIssues.profileId, profileId),
          eq(syncIssues.connectionId, presence.connectionId),
          eq(syncIssues.accountId, presence.accountId),
          eq(syncIssues.transactionId, transaction.id),
          eq(syncIssues.kind, presence.state),
        ),
      )
      .orderBy(desc(syncIssues.createdAt), desc(syncIssues.id))
      .limit(1)
    if (!issue) continue
    const id = `sync-review:${presence.state}:${transaction.id}`
    results.set(id, {
      id,
      transactionIds: [transaction.id],
      type: 'balance',
      explanation:
        presence.state === 'pending_absent'
          ? 'Un movimento in attesa non compare nella fonte. La prenotazione resta inclusa finché manca una sostituzione esplicita.'
          : 'Un movimento contabilizzato manca da due acquisizioni complete. L’importo e le modifiche restano conservati per la verifica.',
      matchId: null,
    })
  }
  return [...results.values()].slice(0, 100)
}
function accountRow(account: Account) {
  const { balance, ...rest } = account
  return { ...rest, balanceMinor: balance.amountMinor, currency: balance.currency }
}
function transactionRow(transaction: Transaction) {
  const { amount, ...rest } = transaction
  return {
    ...rest,
    amountMinor: amount.amountMinor,
    currency: amount.currency,
    contentHash: transactionHash(transaction),
  }
}

/** Absent pending entries are an overlay; canonical identities and private edits stay available. */
export async function activeSyncTransactions(
  db: Database,
  profileId: string,
  transactions: readonly Transaction[],
): Promise<Transaction[]> {
  const replaced = new Set<string>(),
    transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]))
  for (const presence of await db
    .select()
    .from(syncPresence)
    .where(
      and(eq(syncPresence.profileId, profileId), eq(syncPresence.state, 'pending_replaced')),
    )) {
    const original = transactionsById.get(presence.transactionId),
      replacement = transactionsById.get(presence.evidence.replacementTransactionId ?? '')
    if (
      presence.evidence.version === 'sync-presence-v1' &&
      presence.evidence.rule === 'provider_link_exact' &&
      original &&
      replacement &&
      replacement.status === 'booked' &&
      original.accountId === replacement.accountId &&
      original.connectionId === replacement.connectionId &&
      original.providerId === replacement.providerId &&
      original.amount.currency === replacement.amount.currency &&
      original.amount.amountMinor === replacement.amount.amountMinor &&
      replacement.relatedTransactionId === original.id
    )
      replaced.add(original.id)
  }
  return transactions.filter(
    (transaction) => transaction.status !== 'pending' || !replaced.has(transaction.id),
  )
}

export type SyncSourceFactRecorder = (
  db: Database,
  input: {
    profileId: string
    connectionId: string
    consentId: string | null
    accountIds: string[]
    transactions: { id: string; accountId: string }[]
    observations: { id: string; accountId: string }[]
  },
  at: string,
) => Promise<void>
/** Called ONLY in the fenced final transaction after every requested page has been accepted. */
export async function applySyncStage(
  db: Database,
  job: typeof syncJobs.$inferSelect,
  stage: SyncStage,
  at: string,
  encryption?: ProfileEncryption,
  recordSourceFacts?: SyncSourceFactRecorder,
): Promise<SyncReport> {
  const report = emptySyncReport(),
    context = { profileId: job.profileId, connectionId: job.connectionId, grantId: job.consentId }
  report.pages = stage.pages
  report.windowsCompleted = stage.windows.length
  report.windowsTotal = stage.windows.length
  report.payloadRecords = stage.records.length
  const observationFacts = new Map<string, { id: string; accountId: string }>()
  report.syncedAt = stage.snapshot.observedAt
  report.coverage = stage.complete.every(Boolean) ? 'complete_requested_interval' : 'unknown'
  const knownHistory = Object.values(stage.snapshot.historyFrom)
  report.historyFrom = knownHistory.every((value) => value !== null)
    ? ((knownHistory as string[]).sort()[0] ?? null)
    : null
  const canonical = new Map<string, Transaction>(),
    statuses = new Map<string, string>(),
    duplicates: Transaction[] = []
  const priority = { pending: 0, booked: 1, reversed: 2 }
  for (const record of stage.records) {
    const transaction = normalizeTransaction(
      job.providerId,
      context,
      record,
      stage.snapshot.observedAt,
    )
    const key = `${transaction.id}:${transaction.status}`,
      digest = transactionHash(transaction)
    if (statuses.has(key)) {
      if (statuses.get(key) !== digest) throw new Error('Conflicting provider identity')
      duplicates.push(transaction)
    } else {
      statuses.set(key, digest)
      const previous = canonical.get(transaction.id)
      if (previous) {
        if (priority[transaction.status] > priority[previous.status]) {
          duplicates.push(previous)
          canonical.set(transaction.id, transaction)
        } else duplicates.push(transaction)
      } else canonical.set(transaction.id, transaction)
    }
  }
  for (const account of stage.snapshot.accounts) {
    const row = accountRow(
      normalizeAccount(job.providerId, context, account, stage.snapshot.observedAt),
    )
    await db
      .insert(schema.accounts)
      .values(row)
      .onConflictDoUpdate({ target: schema.accounts.id, set: row })
  }
  for (const record of stage.records) {
    const transaction = normalizeTransaction(
        job.providerId,
        context,
        record,
        stage.snapshot.observedAt,
      ),
      contentHash = syncHash(record)
    const observationId = stableId(
      'observation',
      job.profileId,
      job.connectionId,
      transaction.accountId,
      job.providerId,
      record.id,
      record.status,
      contentHash,
    )
    observationFacts.set(observationId, { id: observationId, accountId: transaction.accountId })
    await insertSourceObservation(
      db,
      {
        id: stableId(
          'observation',
          job.profileId,
          job.connectionId,
          transaction.accountId,
          job.providerId,
          record.id,
          record.status,
          contentHash,
        ),
        profileId: job.profileId,
        connectionId: job.connectionId,
        accountId: transaction.accountId,
        providerId: job.providerId,
        providerRecordId: record.id,
        status: record.status,
        contentHash,
        observedAt: stage.snapshot.observedAt,
      },
      record as unknown as Record<string, unknown>,
      encryption,
    )
  }
  for (const transaction of canonical.values()) {
    const [existing] = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, job.profileId),
          eq(schema.transactions.id, transaction.id),
        ),
      )
      .for('update')
    let outcome: 'inserted' | 'updated' | 'unchanged' | 'rejected',
      reason: string | null = null
    if (!existing) {
      const row = transactionRow(transaction)
      await db
        .insert(schema.transactions)
        .values(encryption ? await encryption.encryptTransactionRow(db, row) : row)
      report.inserted++
      outcome = 'inserted'
    } else if (
      ((existing.status === 'booked' || existing.status === 'reversed') &&
        transaction.status === 'pending') ||
      (existing.status === 'reversed' && transaction.status === 'booked')
    ) {
      report.rejected++
      outcome = 'rejected'
      reason = 'status_regression'
    } else if (existing.contentHash === transactionHash(transaction)) {
      report.unchanged++
      outcome = 'unchanged'
    } else {
      const row = transactionRow({ ...transaction, revision: existing.revision + 1 })
      await db
        .update(schema.transactions)
        .set(encryption ? await encryption.encryptTransactionRow(db, row) : row)
        .where(
          and(
            eq(schema.transactions.profileId, job.profileId),
            eq(schema.transactions.id, transaction.id),
          ),
        )
      report.updated++
      outcome = 'updated'
    }
    report.outcomes.push({ transactionId: transaction.id, outcome, reason })
    if (transaction.status === 'pending') report.pending++
    const evidence = {
      version: 'sync-presence-v1' as const,
      snapshotId: stage.snapshot.snapshotId,
      replacementTransactionId: null,
      rule: 'observed' as const,
    }
    await db
      .insert(syncPresence)
      .values({
        transactionId: transaction.id,
        profileId: job.profileId,
        connectionId: job.connectionId,
        accountId: transaction.accountId,
        state: 'present',
        missingCompletions: 0,
        lastCompleteJobId: job.id,
        evidence,
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: syncPresence.transactionId,
        set: {
          state: 'present',
          missingCompletions: 0,
          lastCompleteJobId: job.id,
          evidence,
          updatedAt: at,
        },
      })
  }
  for (const duplicate of duplicates)
    report.outcomes.push({
      transactionId: duplicate.id,
      outcome: 'duplicate_payload',
      reason: 'repeated_or_superseded_observation',
    })
  report.processedRecords = report.outcomes.length
  if (report.processedRecords !== report.payloadRecords)
    throw new Error('Payload-to-ledger accounting mismatch')
  const issue = async (
    kind: 'balance_mismatch' | 'removed_by_source' | 'history_gap' | 'pending_absent',
    accountId: string,
    transactionId: string | null,
  ) => {
    const id = stableId('sync_issue', job.profileId, job.id, accountId, transactionId ?? '', kind)
    await db
      .insert(syncIssues)
      .values({
        id,
        profileId: job.profileId,
        connectionId: job.connectionId,
        jobId: job.id,
        accountId,
        transactionId,
        kind,
        createdAt: at,
      })
      .onConflictDoNothing()
    report.issues.push({ id, kind, accountId, transactionId })
  }
  const prior = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.profileId, job.profileId),
        eq(schema.transactions.connectionId, job.connectionId),
      ),
    )
  for (const row of prior) {
    if (canonical.has(row.id) || row.source !== 'bank') continue
    const providerAccount = stage.snapshot.accounts.find(
      (account) =>
        stableId('account', job.profileId, job.connectionId, job.providerId, account.id) ===
        row.accountId,
    )
    if (!providerAccount) continue
    const windows = stage.windows.filter((window) => window.accountId === providerAccount.id)
    const [presence] = await db
      .select()
      .from(syncPresence)
      .where(and(eq(syncPresence.profileId, job.profileId), eq(syncPresence.transactionId, row.id)))
    if (
      row.status === 'pending' &&
      job.providerPolicy.pendingSet === 'complete_snapshot' &&
      windows.some((window) => window.includePending) &&
      report.coverage === 'complete_requested_interval'
    ) {
      const replacement =
        [...canonical.values()].find(
          (transaction) =>
            transaction.status === 'booked' &&
            transaction.relatedTransactionId === row.id &&
            transaction.accountId === row.accountId &&
            transaction.providerId === row.providerId &&
            transaction.amount.currency === row.currency &&
            transaction.amount.amountMinor === row.amountMinor,
        ) ??
        prior.find(
          (transaction) =>
            presence?.evidence.rule === 'provider_link_exact' &&
            presence.evidence.replacementTransactionId === transaction.id &&
            transaction.status === 'booked' &&
            transaction.relatedTransactionId === row.id &&
            transaction.accountId === row.accountId &&
            transaction.providerId === row.providerId &&
            transaction.currency === row.currency &&
            transaction.amountMinor === row.amountMinor,
        )
      const state = replacement ? 'pending_replaced' : 'pending_absent',
        evidence = {
          version: 'sync-presence-v1' as const,
          snapshotId: stage.snapshot.snapshotId,
          replacementTransactionId: replacement?.id ?? null,
          rule: replacement ? ('provider_link_exact' as const) : ('pending_absent' as const),
        }
      await db
        .insert(syncPresence)
        .values({
          transactionId: row.id,
          profileId: job.profileId,
          connectionId: job.connectionId,
          accountId: row.accountId,
          state,
          missingCompletions: 0,
          lastCompleteJobId: job.id,
          evidence,
          updatedAt: at,
        })
        .onConflictDoUpdate({
          target: syncPresence.transactionId,
          set: { state, missingCompletions: 0, lastCompleteJobId: job.id, evidence, updatedAt: at },
        })
      if (replacement && presence?.state !== 'pending_replaced') {
        report.pendingReplaced++
        report.outcomes.push({
          transactionId: row.id,
          outcome: 'pending_replaced',
          reason: 'explicit_same_source_provider_link_exact_money',
        })
      } else if (!replacement) {
        report.pendingUnresolved++
        await issue('pending_absent', row.accountId, row.id)
      }
    } else if (
      row.status === 'booked' &&
      job.providerPolicy.deletionEvidence === 'complete_window' &&
      row.bookedOn &&
      windows.some(
        (window) =>
          row.bookedOn !== null && row.bookedOn >= window.from && row.bookedOn <= window.to,
      ) &&
      report.coverage === 'complete_requested_interval'
    ) {
      const count =
        presence?.lastCompleteJobId === job.id
          ? presence.missingCompletions
          : Math.min(2, (presence?.missingCompletions ?? 0) + 1)
      const state = count >= 2 ? 'removed_by_source' : 'missing_once'
      const evidence = {
        version: 'sync-presence-v1' as const,
        snapshotId: stage.snapshot.snapshotId,
        replacementTransactionId: null,
        rule: 'two_complete_windows' as const,
      }
      await db
        .insert(syncPresence)
        .values({
          transactionId: row.id,
          profileId: job.profileId,
          connectionId: job.connectionId,
          accountId: row.accountId,
          state,
          missingCompletions: count,
          lastCompleteJobId: job.id,
          evidence,
          updatedAt: at,
        })
        .onConflictDoUpdate({
          target: syncPresence.transactionId,
          set: {
            state,
            missingCompletions: count,
            lastCompleteJobId: job.id,
            evidence,
            updatedAt: at,
          },
        })
      if (count === 2 && presence?.state !== 'removed_by_source') {
        report.removedBySource++
        report.outcomes.push({
          transactionId: row.id,
          outcome: 'removed_by_source',
          reason: 'absent_from_two_complete_fetches',
        })
        await issue('removed_by_source', row.accountId, row.id)
      }
    }
  }
  for (const balance of stage.snapshot.balances) {
    const accountId = stableId(
        'account',
        job.profileId,
        job.connectionId,
        job.providerId,
        balance.accountId,
      ),
      account = syncRequired(
        stage.snapshot.accounts.find((account) => account.id === balance.accountId),
      )
    const result: SyncBalanceResult = {
      accountId,
      currency: balance.currency,
      providerAmountMinor: String(parseDecimal(balance.amount, account.currency).amountMinor),
      expectedAmountMinor: null,
      result: 'not_comparable',
      reason: 'opening_anchor_missing',
    }
    if (balance.type !== 'booked' || !balance.referenceDate)
      result.reason = 'balance_meaning_unknown'
    else if (balance.opening) {
      const windows = stage.windows.filter((window) => window.accountId === balance.accountId)
      const opening = balance.opening,
        referenceDate = balance.referenceDate
      if (
        report.coverage !== 'complete_requested_interval' ||
        !windows.length ||
        syncRequired(windows[0]).from > addDays(opening.date, 1) ||
        syncRequired(windows.at(-1)).to < referenceDate
      )
        result.reason = 'interval_incomplete'
      else {
        const expected =
          parseDecimal(balance.opening.amount, account.currency).amountMinor +
          [...canonical.values()]
            .filter(
              (transaction) =>
                transaction.accountId === accountId &&
                transaction.status === 'booked' &&
                transaction.bookedOn !== null &&
                transaction.bookedOn > opening.date &&
                transaction.bookedOn <= referenceDate,
            )
            .reduce((sum, transaction) => sum + transaction.amount.amountMinor, 0n)
        result.expectedAmountMinor = String(expected)
        result.result = String(expected) === result.providerAmountMinor ? 'equal' : 'mismatch'
        result.reason = 'same_reference'
        if (result.result === 'mismatch') await issue('balance_mismatch', accountId, null)
      }
    }
    report.balances.push(result)
    if (stage.snapshot.historyFrom[balance.accountId] === null)
      await issue('history_gap', accountId, null)
  }
  await db
    .update(schema.connections)
    .set({ lastSyncedAt: stage.snapshot.observedAt })
    .where(
      and(
        eq(schema.connections.profileId, job.profileId),
        eq(schema.connections.id, job.connectionId),
      ),
    )
  await db
    .insert(schema.syncRuns)
    .values({
      id: stableId('sync_run', job.id),
      profileId: job.profileId,
      connectionId: job.connectionId,
      inserted: report.inserted,
      updated: report.updated,
      unchanged: report.unchanged,
      rejected: report.rejected,
      syncedAt: stage.snapshot.observedAt,
    })
    .onConflictDoNothing()
  await recordSourceFacts?.(
    db,
    {
      profileId: job.profileId,
      connectionId: job.connectionId,
      consentId: job.consentId,
      accountIds: stage.snapshot.accounts.map((account) =>
        stableId('account', job.profileId, job.connectionId, job.providerId, account.id),
      ),
      transactions: [...canonical.values()].map((transaction) => ({
        id: transaction.id,
        accountId: transaction.accountId,
      })),
      observations: [...observationFacts.values()],
    },
    at,
  )
  return report
}
