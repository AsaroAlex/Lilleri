import { type Database, schema } from '@lilleri/database'
import type { Transaction } from '@lilleri/domain'
import {
  normalizeTransaction,
  type SyncProviderTransaction,
  stableId,
} from '@lilleri/financial-providers'
import { and, desc, eq, inArray, lte, or } from 'drizzle-orm'
import { consentEvents } from './consent-lifecycle-schema.js'
import { syncIdentities, syncIdentityAliases, syncIdentityEvents } from './sync-identity-schema.js'
import { SyncContractError, type SyncStage, syncHash } from './sync-provider.js'
import type { syncJobs } from './sync-schema.js'

type Job = typeof syncJobs.$inferSelect
const tupleKey = (accountId: string, recordId: string) => JSON.stringify([accountId, recordId])
export interface ResolvedSyncIdentity {
  readonly raw: SyncProviderTransaction
  readonly transaction: Transaction
  readonly fingerprint: string
  readonly ordinal: number | null
  readonly changedId: boolean
  readonly renewalRevision: number
  readonly observationRecordId: string
}

/** v1 is exact source content, never a mutable user label or an amount/date-only match. */
function fingerprint(job: Job, raw: SyncProviderTransaction) {
  const normalized = normalizeTransaction(
    job.providerId,
    {
      profileId: job.profileId,
      connectionId: job.connectionId,
    },
    { ...raw, id: raw.id ?? 'validation-only' },
    job.createdAt,
  )
  return syncHash({
    version: 'sync-identity-v1',
    profileId: job.profileId,
    connectionId: job.connectionId,
    accountId: normalized.accountId,
    providerId: job.providerId,
    source: normalized.source,
    status: normalized.status,
    amountMinor: String(normalized.amount.amountMinor),
    currency: normalized.amount.currency,
    bookedOn: normalized.bookedOn,
    authorizedOn: normalized.authorizedOn,
    description: raw.description.normalize('NFC'),
    reference: raw.reference ?? null,
    kind: normalized.kind,
    relatedAccountId: raw.relatedAccountId ?? null,
  })
}

/** Only the fenced final SQL transaction calls this; pages/checkpoints never establish identity. */
export async function resolveSyncIdentities(
  db: Database,
  job: Job,
  stage: SyncStage,
): Promise<ResolvedSyncIdentity[]> {
  const complete =
    stage.windowIndex === stage.windows.length &&
    stage.complete.length === stage.windows.length &&
    stage.complete.every(Boolean)
  if (stage.records.some((record) => record.id === null) && !complete)
    throw new SyncContractError('invalid_provider_contract')
  const [renewal] = await db
    .select({ revision: consentEvents.revision })
    .from(consentEvents)
    .where(
      and(
        eq(consentEvents.profileId, job.profileId),
        eq(consentEvents.connectionId, job.connectionId),
        eq(consentEvents.consentId, job.consentId),
        eq(consentEvents.action, 'renewed'),
        lte(consentEvents.occurredAt, job.createdAt),
      ),
    )
    .orderBy(desc(consentEvents.revision))
    .limit(1)
  const renewalRevision = renewal?.revision ?? 0
  const scope = and(
    eq(schema.transactions.profileId, job.profileId),
    eq(schema.transactions.connectionId, job.connectionId),
    eq(schema.transactions.providerId, job.providerId),
  )
  const prepared = stage.records.map((raw) => ({ raw, fingerprint: fingerprint(job, raw) }))
  const hashes = [...new Set(prepared.map((item) => item.fingerprint))]
  const identities = hashes.length
    ? await db
        .select()
        .from(syncIdentities)
        .where(
          and(
            eq(syncIdentities.profileId, job.profileId),
            eq(syncIdentities.connectionId, job.connectionId),
            eq(syncIdentities.providerId, job.providerId),
            inArray(syncIdentities.fingerprint, hashes),
          ),
        )
        .limit(job.configuration.maxRecordsPerJob + 1)
    : []
  if (identities.length > job.configuration.maxRecordsPerJob)
    throw new SyncContractError('bound_reached')
  const aliasRequests = new Map<string, Set<string>>()
  for (const record of stage.records) {
    const accountId = stableId(
      'account',
      job.profileId,
      job.connectionId,
      job.providerId,
      record.accountId,
    )
    const ids = aliasRequests.get(accountId) ?? new Set<string>()
    if (record.id !== null) ids.add(record.id)
    if (record.relatedTransactionId) ids.add(record.relatedTransactionId)
    if (ids.size) aliasRequests.set(accountId, ids)
  }
  const aliases = aliasRequests.size
    ? await db
        .select()
        .from(syncIdentityAliases)
        .where(
          and(
            eq(syncIdentityAliases.profileId, job.profileId),
            eq(syncIdentityAliases.connectionId, job.connectionId),
            eq(syncIdentityAliases.providerId, job.providerId),
            eq(syncIdentityAliases.consentId, job.consentId),
            eq(syncIdentityAliases.renewalRevision, renewalRevision),
            or(
              ...[...aliasRequests].map(([accountId, ids]) =>
                and(
                  eq(syncIdentityAliases.accountId, accountId),
                  inArray(syncIdentityAliases.providerRecordId, [...ids]),
                ),
              ),
            ),
          ),
        )
        .limit(job.configuration.maxRecordsPerJob * 2 + 1)
    : []
  if (aliases.length > job.configuration.maxRecordsPerJob * 2)
    throw new SyncContractError('bound_reached')
  // Read only incoming canonical IDs and exact fingerprint candidates, regardless of archive size.
  const queryOrdinals = new Map<string, number>()
  const existingIds = [
    ...new Set([
      ...identities.map((row) => row.transactionId),
      ...aliases.map((row) => row.transactionId),
      ...prepared.map((item) => {
        let providerRecordId = item.raw.id
        if (providerRecordId === null) {
          const ordinal = (queryOrdinals.get(item.fingerprint) ?? 0) + 1
          queryOrdinals.set(item.fingerprint, ordinal)
          providerRecordId = `no-id:v1:${item.fingerprint}:${ordinal}`
        }
        return stableId(
          'transaction',
          job.profileId,
          job.connectionId,
          job.providerId,
          item.raw.accountId,
          providerRecordId,
        )
      }),
    ]),
  ]
  const existing = existingIds.length
    ? await db
        .select()
        .from(schema.transactions)
        .where(and(scope, inArray(schema.transactions.id, existingIds)))
    : []
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const claimed = new Set<string>(),
    unknown = new Map<string, Set<string>>()
  const aliasIndex = new Map(
    aliases.map((value) => [tupleKey(value.accountId, value.providerRecordId), value]),
  )
  const identityGroups = new Map<string, typeof identities>()
  const noIdCounts = new Map<string, number>()
  for (const value of identities) {
    const group = identityGroups.get(value.fingerprint) ?? []
    group.push(value)
    identityGroups.set(value.fingerprint, group)
  }
  for (const value of prepared)
    if (value.raw.id === null)
      noIdCounts.set(value.fingerprint, (noIdCounts.get(value.fingerprint) ?? 0) + 1)
  const selected = prepared.map((item) => {
    if (item.raw.id === null) return null
    const accountId = stableId(
      'account',
      job.profileId,
      job.connectionId,
      job.providerId,
      item.raw.accountId,
    )
    const alias = aliasIndex.get(tupleKey(accountId, item.raw.id))
    const id =
      alias?.transactionId ??
      stableId(
        'transaction',
        job.profileId,
        job.connectionId,
        job.providerId,
        item.raw.accountId,
        item.raw.id,
      )
    const existingRow = existingById.get(id)
    if (alias && (!existingRow || existingRow.accountId !== accountId))
      throw new SyncContractError('invalid_provider_contract')
    if (existingRow) {
      claimed.add(id)
      return id
    }
    const missing = unknown.get(item.fingerprint) ?? new Set<string>()
    missing.add(item.raw.id)
    unknown.set(item.fingerprint, missing)
    return null
  })
  const ordinals = new Map<string, number>()
  const bindings = new Map<string, { id: string; changedId: boolean }>()
  const resolved = prepared.map((item, index): ResolvedSyncIdentity => {
    let id = selected[index] ?? null,
      ordinal: number | null = null,
      changedId = false
    let providerRecordId = item.raw.id
    const bindingKey = item.raw.id === null ? '' : tupleKey(item.raw.accountId, item.raw.id)
    const bound = item.raw.id === null ? undefined : bindings.get(bindingKey)
    if (bound) {
      id = bound.id
      changedId = bound.changedId
    }
    if (providerRecordId === null) {
      ordinal = (ordinals.get(item.fingerprint) ?? 0) + 1
      ordinals.set(item.fingerprint, ordinal)
      providerRecordId = `no-id:v1:${item.fingerprint}:${ordinal}`
      id = stableId(
        'transaction',
        job.profileId,
        job.connectionId,
        job.providerId,
        item.raw.accountId,
        providerRecordId,
      )
      if (!existingById.has(id)) {
        const candidates = (identityGroups.get(item.fingerprint) ?? []).filter(
          (value) =>
            value.fingerprint === item.fingerprint &&
            value.ordinal === null &&
            !claimed.has(value.transactionId),
        )
        if (candidates.length) {
          const count = noIdCounts.get(item.fingerprint)
          const candidate = candidates[0]
          if (
            candidates.length !== 1 ||
            count !== 1 ||
            !candidate ||
            (candidate.originConsentId === job.consentId &&
              candidate.originRenewalRevision === renewalRevision)
          )
            throw new SyncContractError('invalid_provider_contract')
          id = candidate.transactionId
          changedId = true
          claimed.add(id)
        }
      }
    } else if (id === null) {
      const candidates = (identityGroups.get(item.fingerprint) ?? []).filter(
        (value) =>
          value.fingerprint === item.fingerprint &&
          (value.originConsentId !== job.consentId ||
            value.originRenewalRevision < renewalRevision) &&
          !claimed.has(value.transactionId),
      )
      if (candidates.length && !complete) throw new SyncContractError('invalid_provider_contract')
      if (
        candidates.length &&
        (candidates.length !== 1 || unknown.get(item.fingerprint)?.size !== 1)
      )
        throw new SyncContractError('invalid_provider_contract')
      if (candidates.length === 1) {
        id = candidates[0]?.transactionId ?? null
        if (!id || !existingById.has(id)) throw new SyncContractError('invalid_provider_contract')
        changedId = true
        claimed.add(id)
      }
    }
    const existingRow = id ? existingById.get(id) : undefined
    const transaction = normalizeTransaction(
      job.providerId,
      {
        profileId: job.profileId,
        connectionId: job.connectionId,
      },
      { ...item.raw, id: existingRow?.providerTransactionId ?? providerRecordId },
      stage.snapshot.observedAt,
    )
    if (item.raw.id !== null) bindings.set(bindingKey, { id: id ?? transaction.id, changedId })
    return {
      raw: item.raw,
      transaction: { ...transaction, id: id ?? transaction.id },
      fingerprint: item.fingerprint,
      ordinal,
      changedId,
      renewalRevision,
      observationRecordId: providerRecordId,
    }
  })
  // Resolve explicit replacement/refund links through the current generation's aliases too.
  const accountSources = new Map(
    stage.snapshot.accounts.map((account) => [
      stableId('account', job.profileId, job.connectionId, job.providerId, account.id),
      account.id,
    ]),
  )
  const links = new Map<string, string>(
    aliases.flatMap((alias) => {
      const accountId = accountSources.get(alias.accountId)
      return accountId
        ? [[tupleKey(accountId, alias.providerRecordId), alias.transactionId] as const]
        : []
    }),
  )
  for (const item of resolved)
    if (item.raw.id !== null)
      links.set(tupleKey(item.raw.accountId, item.raw.id), item.transaction.id)
  return resolved.map((item) =>
    item.raw.relatedTransactionId
      ? {
          ...item,
          transaction: {
            ...item.transaction,
            relatedTransactionId:
              links.get(tupleKey(item.raw.accountId, item.raw.relatedTransactionId)) ??
              item.transaction.relatedTransactionId,
          },
        }
      : item,
  )
}

/** Source FKs cascade identities/aliases/audit when the canonical transaction is erased. */
export async function persistSyncIdentities(
  db: Database,
  job: Job,
  resolved: readonly ResolvedSyncIdentity[],
  at: string,
) {
  for (const item of resolved) {
    const scope = {
      profileId: job.profileId,
      connectionId: job.connectionId,
      accountId: item.transaction.accountId,
      transactionId: item.transaction.id,
    }
    const inserted = await db
      .insert(syncIdentities)
      .values({
        ...scope,
        providerId: job.providerId,
        originConsentId: job.consentId,
        originRenewalRevision: item.renewalRevision,
        fingerprint: item.fingerprint,
        ordinal: item.ordinal,
        createdAt: at,
      })
      .onConflictDoNothing()
      .returning({ id: syncIdentities.transactionId })
    if (item.raw.id !== null)
      await db
        .insert(syncIdentityAliases)
        .values({
          ...scope,
          providerId: job.providerId,
          consentId: job.consentId,
          renewalRevision: item.renewalRevision,
          providerRecordId: item.raw.id,
          createdAt: at,
        })
        .onConflictDoNothing()
    if (item.changedId || (item.ordinal !== null && inserted.length))
      await db
        .insert(syncIdentityEvents)
        .values({
          ...scope,
          id: stableId(
            'sync_identity_event',
            job.profileId,
            job.connectionId,
            job.consentId,
            String(item.renewalRevision),
            item.transaction.id,
            item.observationRecordId,
          ),
          consentId: job.consentId,
          renewalRevision: item.renewalRevision,
          jobId: job.id,
          kind: item.changedId ? 'provider_id_changed' : 'no_id_ordinal',
          providerRecordId: item.raw.id,
          fingerprint: item.fingerprint,
          ordinal: item.ordinal,
          createdAt: at,
        })
        .onConflictDoNothing()
  }
}
