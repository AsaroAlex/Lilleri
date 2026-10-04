import type { Database } from '@lilleri/database'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { syncJobDto } from './sync-http.js'
import { syncIdentityOwnershipDto, syncIdentityOwnershipExport } from './sync-identity-export.js'
import { publicSyncJob } from './sync-jobs.js'
import {
  syncActivity,
  syncIssues,
  syncJobs,
  syncPresence,
  syncReservations,
} from './sync-schema.js'

const id = z.string().min(1).max(200),
  at = z.string().datetime({ offset: true }),
  count = z.number().int().nonnegative()
export const syncOwnershipDto = z
  .object({
    ...syncIdentityOwnershipDto.shape,
    jobs: z.array(syncJobDto),
    reservations: z.array(
      z
        .object({
          id,
          profileId: id,
          connectionId: id,
          consentId: id,
          jobId: id,
          leaseEpoch: z.number().int().positive(),
          mode: z.enum(['user_present', 'unattended']),
          windowStart: at,
          windowEnd: at,
          providerLimit: count.nullable(),
          evidenceReference: id.nullable(),
          reservedAt: at,
        })
        .strict(),
    ),
    activity: z.object({ profileId: id, lastUserPresentAt: at }).strict().nullable(),
    presence: z.array(
      z
        .object({
          transactionId: id,
          profileId: id,
          connectionId: id,
          accountId: id,
          state: z.enum([
            'present',
            'missing_once',
            'removed_by_source',
            'pending_replaced',
            'pending_absent',
          ]),
          missingCompletions: count.max(2),
          lastCompleteJobId: id,
          evidence: z
            .object({
              version: z.literal('sync-presence-v1'),
              snapshotId: id,
              replacementTransactionId: id.nullable(),
              rule: z.enum([
                'observed',
                'pending_absent',
                'provider_link_exact',
                'two_complete_windows',
              ]),
            })
            .strict(),
          updatedAt: at,
        })
        .strict(),
    ),
    issues: z.array(
      z
        .object({
          id,
          profileId: id,
          connectionId: id,
          jobId: id,
          accountId: id,
          transactionId: id.nullable(),
          kind: z.enum(['balance_mismatch', 'removed_by_source', 'history_gap', 'pending_absent']),
          createdAt: at,
        })
        .strict(),
    ),
  })
  .strict()
export type SyncOwnership = z.infer<typeof syncOwnershipDto>
const strip = <T extends { householdId: string }>(value: T) => {
  const { householdId: _householdId, ...rest } = value
  return rest
}
/** Owner-visible audit and exact report metadata; raw checkpoint content and lease tokens are excluded. */
export async function syncOwnershipExport(db: Database, profileId: string): Promise<SyncOwnership> {
  const jobs = await db
    .select()
    .from(syncJobs)
    .where(eq(syncJobs.profileId, profileId))
    .orderBy(asc(syncJobs.createdAt), asc(syncJobs.id))
  const reservations = await db
    .select()
    .from(syncReservations)
    .where(eq(syncReservations.profileId, profileId))
    .orderBy(asc(syncReservations.reservedAt), asc(syncReservations.id))
  const [activity] = await db
    .select()
    .from(syncActivity)
    .where(eq(syncActivity.profileId, profileId))
  const presence = await db
    .select()
    .from(syncPresence)
    .where(eq(syncPresence.profileId, profileId))
    .orderBy(asc(syncPresence.transactionId))
  const issues = await db
    .select()
    .from(syncIssues)
    .where(eq(syncIssues.profileId, profileId))
    .orderBy(asc(syncIssues.createdAt), asc(syncIssues.id))
  return syncOwnershipDto.parse({
    ...(await syncIdentityOwnershipExport(db, profileId)),
    jobs: jobs.map(publicSyncJob),
    reservations: reservations.map(strip),
    activity: activity ? strip(activity) : null,
    presence: presence.map(strip),
    issues: issues.map(strip),
  })
}
/** Call alongside the root export validator's complete retained ledger, never an active projection. */
export function assertSyncOwnershipReferences(
  value: SyncOwnership,
  scope: {
    profileId: string
    exportedAt?: string
    connections: readonly { id: string }[]
    consents: readonly { id: string; connectionId: string }[]
    accounts: readonly { id: string; connectionId: string }[]
    transactions: readonly {
      id: string
      accountId: string
      connectionId: string
      status: string
      relatedTransactionId: string | null
      providerId: string
      amount: { amountMinor: string | bigint; currency: string }
    }[]
  },
) {
  const unique = (values: readonly string[]) => new Set(values).size === values.length
  if (
    !unique(value.jobs.map((job) => job.id)) ||
    !unique(value.reservations.map((row) => row.id)) ||
    !unique(value.reservations.map((row) => `${row.jobId}:${row.leaseEpoch}`)) ||
    !unique(value.presence.map((row) => row.transactionId)) ||
    !unique(value.issues.map((row) => row.id)) ||
    !unique(value.identities.map((row) => row.transactionId)) ||
    !unique(
      value.identityAliases.map((row) =>
        JSON.stringify([
          row.profileId,
          row.connectionId,
          row.accountId,
          row.providerId,
          row.consentId,
          row.renewalRevision,
          row.providerRecordId,
        ]),
      ),
    ) ||
    !unique(value.identityEvents.map((row) => row.id))
  )
    throw new Error('Duplicate sync audit identity')
  const exportedAt = scope.exportedAt === undefined ? null : Date.parse(scope.exportedAt)
  if (exportedAt !== null && !Number.isFinite(exportedAt))
    throw new Error('Invalid sync export clock')
  const milliseconds = (value: string) => {
      const parsed = Date.parse(value)
      if (!Number.isFinite(parsed)) throw new Error('Invalid sync audit clock')
      return parsed
    },
    beforeExport = (value: string) => {
      const at = milliseconds(value)
      return exportedAt === null || at <= exportedAt
    }
  const jobs = new Map(value.jobs.map((job) => [job.id, job])),
    accounts = new Map(scope.accounts.map((account) => [account.id, account])),
    transactions = new Map(scope.transactions.map((transaction) => [transaction.id, transaction]))
  const owned = (profileId: string, connectionId: string) =>
    profileId === scope.profileId &&
    scope.connections.some((connection) => connection.id === connectionId)
  const transactionOwned = (transactionId: string, accountId: string, connectionId: string) => {
    const row = transactions.get(transactionId)
    return row?.accountId === accountId && row.connectionId === connectionId
  }
  for (const row of [...value.identities, ...value.identityAliases, ...value.identityEvents]) {
    const transaction = transactions.get(row.transactionId)
    if (
      !owned(row.profileId, row.connectionId) ||
      !transactionOwned(row.transactionId, row.accountId, row.connectionId) ||
      !beforeExport(row.createdAt) ||
      ('providerId' in row && transaction?.providerId !== row.providerId)
    )
      throw new Error('Invalid sync identity ownership references')
    const consentId = 'originConsentId' in row ? row.originConsentId : row.consentId
    if (
      !scope.consents.some(
        (consent) => consent.id === consentId && consent.connectionId === row.connectionId,
      )
    )
      throw new Error('Invalid sync identity consent reference')
    if (
      'jobId' in row &&
      (jobs.get(row.jobId)?.connectionId !== row.connectionId ||
        jobs.get(row.jobId)?.consentId !== row.consentId)
    )
      throw new Error('Invalid sync identity audit job reference')
  }
  for (const job of value.jobs) {
    if (
      milliseconds(job.createdAt) > milliseconds(job.updatedAt) ||
      !beforeExport(job.updatedAt) ||
      (job.completedAt !== null &&
        (milliseconds(job.completedAt) < milliseconds(job.createdAt) ||
          milliseconds(job.completedAt) > milliseconds(job.updatedAt))) ||
      (job.state === 'completed') !== (job.completedAt !== null)
    )
      throw new Error('Invalid sync job chronology')
    if (
      !owned(job.profileId, job.connectionId) ||
      !scope.consents.some(
        (consent) => consent.id === job.consentId && consent.connectionId === job.connectionId,
      )
    )
      throw new Error('Invalid sync ownership references')
    if (
      job.state === 'completed' &&
      (job.report.processedRecords !== job.report.payloadRecords ||
        job.report.windowsCompleted !== job.report.windowsTotal ||
        !job.report.syncedAt ||
        !job.completedAt ||
        milliseconds(job.report.syncedAt) > milliseconds(job.completedAt))
    )
      throw new Error('Invalid completed sync report')
    for (const outcome of job.report.outcomes) {
      const row = transactions.get(outcome.transactionId)
      if (!row || row.connectionId !== job.connectionId)
        throw new Error('Invalid sync outcome reference')
    }
    for (const balance of job.report.balances)
      if (accounts.get(balance.accountId)?.connectionId !== job.connectionId)
        throw new Error('Invalid sync balance reference')
    for (const issue of job.report.issues)
      if (
        !value.issues.some(
          (row) =>
            row.id === issue.id &&
            row.jobId === job.id &&
            row.accountId === issue.accountId &&
            row.transactionId === issue.transactionId &&
            row.kind === issue.kind,
        )
      )
        throw new Error('Invalid sync issue reference')
  }
  for (const reservation of value.reservations) {
    const job = jobs.get(reservation.jobId)
    if (
      !job ||
      !owned(reservation.profileId, reservation.connectionId) ||
      job.connectionId !== reservation.connectionId ||
      job.consentId !== reservation.consentId ||
      reservation.mode !== job.mode ||
      reservation.leaseEpoch > job.leaseEpoch ||
      milliseconds(reservation.reservedAt) < milliseconds(reservation.windowStart) ||
      milliseconds(reservation.reservedAt) >= milliseconds(reservation.windowEnd) ||
      milliseconds(reservation.reservedAt) < milliseconds(job.createdAt) ||
      milliseconds(reservation.reservedAt) > milliseconds(job.updatedAt) ||
      !beforeExport(reservation.reservedAt)
    )
      throw new Error('Invalid sync reservation reference')
  }
  if (value.activity && value.activity.profileId !== scope.profileId)
    throw new Error('Invalid sync activity owner')
  if (value.activity && !beforeExport(value.activity.lastUserPresentAt))
    throw new Error('Invalid sync activity chronology')
  for (const presence of value.presence) {
    const job = jobs.get(presence.lastCompleteJobId)
    if (
      !owned(presence.profileId, presence.connectionId) ||
      !job ||
      job.connectionId !== presence.connectionId ||
      job.state !== 'completed' ||
      job.completedAt === null ||
      milliseconds(presence.updatedAt) < milliseconds(job.completedAt) ||
      !beforeExport(presence.updatedAt) ||
      !transactionOwned(presence.transactionId, presence.accountId, presence.connectionId)
    )
      throw new Error('Invalid sync presence reference')
    if (presence.state === 'pending_replaced') {
      const prior = transactions.get(presence.transactionId),
        next = transactions.get(presence.evidence.replacementTransactionId ?? '')
      if (
        presence.evidence.rule !== 'provider_link_exact' ||
        !prior ||
        prior.status !== 'pending' ||
        !next ||
        next.status !== 'booked' ||
        next.relatedTransactionId !== prior.id ||
        next.accountId !== prior.accountId ||
        next.providerId !== prior.providerId ||
        next.amount.currency !== prior.amount.currency ||
        String(next.amount.amountMinor) !== String(prior.amount.amountMinor)
      )
        throw new Error('Invalid sync replacement evidence')
    }
  }
  for (const issue of value.issues) {
    const job = jobs.get(issue.jobId)
    if (
      !owned(issue.profileId, issue.connectionId) ||
      !job ||
      job.connectionId !== issue.connectionId ||
      milliseconds(issue.createdAt) < milliseconds(job.createdAt) ||
      milliseconds(issue.createdAt) > milliseconds(job.updatedAt) ||
      !beforeExport(issue.createdAt) ||
      accounts.get(issue.accountId)?.connectionId !== issue.connectionId ||
      (issue.transactionId !== null &&
        !transactionOwned(issue.transactionId, issue.accountId, issue.connectionId))
    )
      throw new Error('Invalid sync issue ownership')
  }
}
