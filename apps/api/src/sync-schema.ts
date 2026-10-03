import { schema } from '@lilleri/database'
import type { SyntheticSyncMetadata } from '@lilleri/financial-providers'
import { foreignKey, integer, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core'
import type { SyncConfiguration } from './runtime-config.js'

export type SyncMode = 'user_present' | 'unattended'
export type SyncJobState =
  | 'queued'
  | 'running'
  | 'partial'
  | 'retry_wait'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'
export type SyncDegradedReason =
  | 'budget_reached'
  | 'inactive'
  | 'policy_unknown'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'timeout'
  | 'invalid_provider_contract'
  | 'bound_reached'
  | 'consent_inactive'
  | 'snapshot_expired'
  | 'history_gap'
  | 'partial'
  | null
export interface SyncOutcome {
  readonly transactionId: string
  readonly outcome:
    | 'inserted'
    | 'updated'
    | 'unchanged'
    | 'rejected'
    | 'duplicate_payload'
    | 'pending_replaced'
    | 'removed_by_source'
  readonly reason: string | null
}
export interface SyncBalanceResult {
  accountId: string
  currency: string
  providerAmountMinor: string
  expectedAmountMinor: string | null
  result: 'equal' | 'mismatch' | 'not_comparable'
  reason:
    | 'opening_anchor_missing'
    | 'balance_meaning_unknown'
    | 'interval_incomplete'
    | 'same_reference'
    | 'currency_or_date_mismatch'
}
export interface SyncReport {
  inserted: number
  updated: number
  unchanged: number
  rejected: number
  syncedAt: string | null
  payloadRecords: number
  processedRecords: number
  pages: number
  windowsCompleted: number
  windowsTotal: number
  pending: number
  pendingReplaced: number
  pendingUnresolved: number
  removedBySource: number
  coverage: 'complete_requested_interval' | 'partial' | 'unknown'
  historyFrom: string | null
  outcomes: SyncOutcome[]
  balances: SyncBalanceResult[]
  issues: { id: string; kind: string; accountId: string; transactionId: string | null }[]
}
export const emptySyncReport = (): SyncReport => ({
  inserted: 0,
  updated: 0,
  unchanged: 0,
  rejected: 0,
  syncedAt: null,
  payloadRecords: 0,
  processedRecords: 0,
  pages: 0,
  windowsCompleted: 0,
  windowsTotal: 0,
  pending: 0,
  pendingReplaced: 0,
  pendingUnresolved: 0,
  removedBySource: 0,
  coverage: 'partial',
  historyFrom: null,
  outcomes: [],
  balances: [],
  issues: [],
})
export interface SyncPresenceEvidence {
  readonly version: 'sync-presence-v1'
  readonly snapshotId: string
  readonly replacementTransactionId: string | null
  readonly rule: 'observed' | 'pending_absent' | 'provider_link_exact' | 'two_complete_windows'
}
export const syncJobs = pgTable(
  'sync_jobs',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    consentId: text('consent_id').notNull(),
    providerId: text('provider_id').notNull(),
    requestId: text('request_id').notNull(),
    requestHash: text('request_hash').notNull(),
    mode: text('mode').$type<SyncMode>().notNull(),
    requestedFrom: text('requested_from'),
    requestedTo: text('requested_to').notNull(),
    state: text('state').$type<SyncJobState>().notNull(),
    reason: text('reason').$type<SyncDegradedReason>(),
    configurationRevision: integer('configuration_revision').notNull(),
    configurationDigest: text('configuration_digest').notNull(),
    configuration: jsonb('configuration').$type<SyncConfiguration>().notNull(),
    providerPolicy: jsonb('provider_policy').$type<SyntheticSyncMetadata>().notNull(),
    leaseToken: text('lease_token'),
    leaseExpiresAt: text('lease_expires_at'),
    leaseEpoch: integer('lease_epoch').notNull(),
    failures: integer('failures').notNull(),
    availableAt: text('available_at').notNull(),
    revision: integer('revision').notNull(),
    report: jsonb('report').$type<SyncReport>().notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => [
    unique('sync_jobs_profile_id').on(table.profileId, table.id),
    unique('sync_jobs_request').on(table.profileId, table.connectionId, table.requestId),
    foreignKey({
      columns: [table.profileId, table.connectionId],
      foreignColumns: [schema.connections.profileId, schema.connections.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const syncStages = pgTable(
  'sync_stages',
  {
    jobId: text('job_id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.jobId],
      foreignColumns: [syncJobs.profileId, syncJobs.id],
    }).onDelete('cascade'),
  ],
)
export const syncReservations = pgTable(
  'sync_budget_reservations',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    consentId: text('consent_id').notNull(),
    jobId: text('job_id').notNull(),
    leaseEpoch: integer('lease_epoch').notNull(),
    mode: text('mode').$type<SyncMode>().notNull(),
    windowStart: text('window_start').notNull(),
    windowEnd: text('window_end').notNull(),
    providerLimit: integer('provider_limit'),
    evidenceReference: text('evidence_reference'),
    reservedAt: text('reserved_at').notNull(),
  },
  (table) => [
    unique('sync_reservation_claim').on(table.profileId, table.jobId, table.leaseEpoch),
    foreignKey({
      columns: [table.profileId, table.jobId],
      foreignColumns: [syncJobs.profileId, syncJobs.id],
    }).onDelete('cascade'),
  ],
)
export const syncActivity = pgTable('sync_activity', {
  profileId: text('profile_id')
    .primaryKey()
    .references(() => schema.profiles.id, { onDelete: 'cascade' }),
  householdId: text('household_id').notNull().default(''),
  lastUserPresentAt: text('last_user_present_at').notNull(),
})
export const syncPresence = pgTable(
  'sync_source_presence',
  {
    transactionId: text('transaction_id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    accountId: text('account_id').notNull(),
    state: text('state')
      .$type<
        'present' | 'missing_once' | 'removed_by_source' | 'pending_replaced' | 'pending_absent'
      >()
      .notNull(),
    missingCompletions: integer('missing_completions').notNull(),
    lastCompleteJobId: text('last_complete_job_id').notNull(),
    evidence: jsonb('evidence').$type<SyncPresenceEvidence>().notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.transactionId],
      foreignColumns: [schema.transactions.profileId, schema.transactions.id],
    }).onDelete('cascade'),
  ],
)
export const syncIssues = pgTable(
  'sync_issues',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    jobId: text('job_id').notNull(),
    accountId: text('account_id').notNull(),
    transactionId: text('transaction_id'),
    kind: text('kind')
      .$type<'balance_mismatch' | 'removed_by_source' | 'history_gap' | 'pending_absent'>()
      .notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.jobId],
      foreignColumns: [syncJobs.profileId, syncJobs.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.profileId, table.connectionId, table.accountId],
      foreignColumns: [schema.accounts.profileId, schema.accounts.connectionId, schema.accounts.id],
    }).onDelete('cascade'),
  ],
)
