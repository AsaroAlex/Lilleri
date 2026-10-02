import type { Account, CategoryId, Transaction, TransactionKind } from '@lilleri/domain'
import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  createdAt: text('created_at').notNull(),
})
export const connections = pgTable(
  'connections',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    institutionId: text('institution_id').notNull(),
    status: text('status').$type<'active' | 'expired' | 'revoked' | 'error'>().notNull(),
    createdAt: text('created_at').notNull(),
    lastSyncedAt: text('last_synced_at'),
  },
  (t) => [unique('connections_profile_id').on(t.profileId, t.id)],
)
export const consents = pgTable(
  'consents',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    purpose: text('purpose').$type<'account_information'>().notNull(),
    grantedAt: text('granted_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    provider: text('provider').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.connectionId],
      foreignColumns: [connections.profileId, connections.id],
    }).onDelete('cascade'),
  ],
)
export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    name: text('name').notNull(),
    institutionName: text('institution_name').notNull(),
    kind: text('kind').$type<Account['kind']>().notNull(),
    balanceMinor: bigint('balance_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').$type<Account['balance']['currency']>().notNull(),
    balanceUpdatedAt: text('balance_updated_at').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.connectionId],
      foreignColumns: [connections.profileId, connections.id],
    }).onDelete('cascade'),
    unique('accounts_profile_id').on(t.profileId, t.id),
    unique('accounts_connection_id').on(t.profileId, t.connectionId, t.id),
    unique('accounts_provider_identity').on(t.profileId, t.connectionId, t.providerAccountId),
  ],
)
export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    connectionId: text('connection_id').notNull(),
    providerId: text('provider_id').notNull(),
    providerTransactionId: text('provider_transaction_id').notNull(),
    revision: integer('revision').notNull(),
    source: text('source').$type<Transaction['source']>().notNull(),
    status: text('status').$type<Transaction['status']>().notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').$type<Transaction['amount']['currency']>().notNull(),
    description: text('description').notNull(),
    merchantName: text('merchant_name'),
    merchantKey: text('merchant_key'),
    bookedOn: date('booked_on', { mode: 'string' }),
    authorizedOn: date('authorized_on', { mode: 'string' }),
    observedAt: text('observed_at').notNull(),
    kind: text('kind').$type<TransactionKind>().notNull(),
    reference: text('reference'),
    relatedTransactionId: text('related_transaction_id'),
    relatedAccountId: text('related_account_id'),
    contentHash: text('content_hash').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.connectionId, t.accountId],
      foreignColumns: [accounts.profileId, accounts.connectionId, accounts.id],
    }).onDelete('cascade'),
    unique('transactions_profile_id').on(t.profileId, t.id),
    unique('transactions_connection_id').on(t.profileId, t.connectionId, t.id),
    unique('transactions_provider_identity').on(
      t.profileId,
      t.connectionId,
      t.accountId,
      t.providerId,
      t.providerTransactionId,
    ),
    check('positive_revision', sql`${t.revision} > 0`),
  ],
)
export const observations = pgTable(
  'source_observations',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    providerRecordId: text('provider_record_id').notNull(),
    status: text('status').notNull(),
    contentHash: text('content_hash').notNull(),
    observedAt: text('observed_at').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.connectionId, t.accountId],
      foreignColumns: [accounts.profileId, accounts.connectionId, accounts.id],
    }).onDelete('cascade'),
    unique('observations_identity').on(
      t.profileId,
      t.connectionId,
      t.accountId,
      t.providerId,
      t.providerRecordId,
      t.status,
      t.contentHash,
    ),
  ],
)
export const feedback = pgTable(
  'classification_feedback',
  {
    profileId: text('profile_id').notNull(),
    transactionId: text('transaction_id').notNull(),
    categoryId: text('category_id').$type<CategoryId>().notNull(),
    scope: text('scope').$type<'once' | 'merchant'>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.transactionId] }),
    foreignKey({
      columns: [t.profileId, t.transactionId],
      foreignColumns: [transactions.profileId, transactions.id],
    }).onDelete('cascade'),
  ],
)
export const preferences = pgTable(
  'preferences',
  {
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    merchantKey: text('merchant_key').notNull(),
    categoryId: text('category_id').$type<CategoryId>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.merchantKey] })],
)
export const matchDecisions = pgTable(
  'match_decisions',
  {
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    matchId: text('match_id').notNull(),
    state: text('state').$type<'confirmed' | 'rejected' | 'undone'>().notNull(),
    decidedAt: text('decided_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.matchId] })],
)
export const syncRuns = pgTable(
  'sync_runs',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    inserted: integer('inserted').notNull(),
    updated: integer('updated').notNull(),
    unchanged: integer('unchanged').notNull(),
    rejected: integer('rejected').notNull(),
    syncedAt: text('synced_at').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId, t.connectionId],
      foreignColumns: [connections.profileId, connections.id],
    }).onDelete('cascade'),
  ],
)
export const profileTombstones = pgTable('profile_tombstones', {
  profileId: text('profile_id').primaryKey(),
  erasedAt: text('erased_at').notNull(),
})
export const matchDecisionLegs = pgTable(
  'match_decision_legs',
  {
    profileId: text('profile_id').notNull(),
    matchId: text('match_id').notNull(),
    transactionId: text('transaction_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.matchId, t.transactionId] }),
    foreignKey({
      columns: [t.profileId, t.matchId],
      foreignColumns: [matchDecisions.profileId, matchDecisions.matchId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.profileId, t.transactionId],
      foreignColumns: [transactions.profileId, transactions.id],
    }).onDelete('cascade'),
  ],
)
