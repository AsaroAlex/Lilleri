import { schema } from '@lilleri/database'
import { type AnyPgColumn, foreignKey, integer, pgTable, text, unique } from 'drizzle-orm/pg-core'

export type PendingState =
  | 'active'
  | 'replaced'
  | 'amount_change_review'
  | 'expired'
  | 'cancelled'
  | 'reversed'
const owner = () => ({
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id').notNull(),
  connectionId: text('connection_id').notNull(),
  accountId: text('account_id').notNull(),
  transactionId: text('transaction_id').notNull(),
})
const ownerKeys = (t: {
  householdId: AnyPgColumn
  profileId: AnyPgColumn
  connectionId: AnyPgColumn
  accountId: AnyPgColumn
  transactionId: AnyPgColumn
}) => [
  foreignKey({
    columns: [t.householdId, t.profileId],
    foreignColumns: [schema.profiles.householdId, schema.profiles.id],
  }).onDelete('cascade'),
  foreignKey({
    columns: [t.profileId, t.connectionId, t.accountId],
    foreignColumns: [schema.accounts.profileId, schema.accounts.connectionId, schema.accounts.id],
  }).onDelete('cascade'),
  foreignKey({
    columns: [t.profileId, t.accountId, t.transactionId],
    foreignColumns: [
      schema.transactions.profileId,
      schema.transactions.accountId,
      schema.transactions.id,
    ],
  }).onDelete('cascade'),
]
export const pendingLifecycles = pgTable(
  'pending_lifecycles',
  {
    ...owner(),
    transactionId: text('transaction_id').primaryKey(),
    replacementTransactionId: text('replacement_transaction_id'),
    firstSeenAt: text('first_seen_at').notNull(),
    state: text('state').$type<PendingState>().notNull(),
    revision: integer('revision').notNull(),
    pendingRevision: integer('pending_revision').notNull(),
    replacementRevision: integer('replacement_revision'),
    digest: text('digest').notNull(),
    payload: text('payload').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    unique('pending_lifecycles_profile_transaction').on(t.profileId, t.transactionId),
    ...ownerKeys(t),
    foreignKey({
      columns: [t.profileId, t.accountId, t.replacementTransactionId],
      foreignColumns: [
        schema.transactions.profileId,
        schema.transactions.accountId,
        schema.transactions.id,
      ],
    }).onDelete('cascade'),
  ],
)
export const pendingLifecycleEvents = pgTable(
  'pending_lifecycle_events',
  {
    ...owner(),
    id: text('id').primaryKey(),
    replacementTransactionId: text('replacement_transaction_id'),
    revision: integer('revision').notNull(),
    payload: text('payload').notNull(),
    occurredAt: text('occurred_at').notNull(),
  },
  (t) => [
    unique('pending_lifecycle_event_revision').on(t.profileId, t.transactionId, t.revision),
    ...ownerKeys(t),
    foreignKey({
      columns: [t.profileId, t.accountId, t.replacementTransactionId],
      foreignColumns: [
        schema.transactions.profileId,
        schema.transactions.accountId,
        schema.transactions.id,
      ],
    }).onDelete('cascade'),
  ],
)
export type SourceRemovalChoice = 'keep_manual' | 'remove' | 'undone'
export const sourceRemovalDecisions = pgTable(
  'source_removal_decisions',
  {
    ...owner(),
    transactionId: text('transaction_id').primaryKey(),
    choice: text('choice').$type<SourceRemovalChoice>().notNull(),
    revision: integer('revision').notNull(),
    transactionRevision: integer('transaction_revision').notNull(),
    presenceDigest: text('presence_digest').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ownerKeys(t),
)
export const sourceRemovalDecisionEvents = pgTable(
  'source_removal_decision_events',
  {
    ...owner(),
    id: text('id').primaryKey(),
    revision: integer('revision').notNull(),
    payload: text('payload').notNull(),
    occurredAt: text('occurred_at').notNull(),
  },
  (t) => [
    unique('source_removal_event_revision').on(t.profileId, t.transactionId, t.revision),
    ...ownerKeys(t),
  ],
)
