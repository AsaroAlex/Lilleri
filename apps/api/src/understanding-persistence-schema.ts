import { schema } from '@lilleri/database'
import { foreignKey, integer, pgTable, primaryKey, text, unique } from 'drizzle-orm/pg-core'
import { sourceErasureReceipts } from './source-erasure-schema.js'

export const understandingPreferences = pgTable(
  'understanding_preferences',
  {
    profileId: text('profile_id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    revision: integer('revision').notNull(),
    payload: text('payload').notNull(),
    digest: text('digest').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)

export const understandingPreferenceEvents = pgTable(
  'understanding_preference_events',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    revision: integer('revision').notNull(),
    action: text('action').$type<'changed' | 'undone' | 'source_erased'>().notNull(),
    payload: text('payload'),
    digest: text('digest').notNull(),
    sourceReceiptId: text('source_receipt_id'),
    occurredAt: text('occurred_at').notNull(),
  },
  (table) => [
    unique('understanding_preference_event_revision').on(table.profileId, table.revision),
    foreignKey({
      columns: [table.profileId, table.sourceReceiptId],
      foreignColumns: [sourceErasureReceipts.profileId, sourceErasureReceipts.id],
    }),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)

export const understandingMonthlySnapshots = pgTable(
  'understanding_monthly_snapshots',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    month: text('month').notNull(),
    capturedAt: text('captured_at').notNull(),
    inputDigest: text('input_digest').notNull(),
    digest: text('digest').notNull(),
    payload: text('payload'),
    sourceReceiptId: text('source_receipt_id'),
  },
  (table) => [
    unique('understanding_snapshot_input').on(table.profileId, table.month, table.inputDigest),
    foreignKey({
      columns: [table.profileId, table.sourceReceiptId],
      foreignColumns: [sourceErasureReceipts.profileId, sourceErasureReceipts.id],
    }),
    unique('understanding_snapshot_profile_id').on(table.profileId, table.id),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)

/** Owned foreign keys prevent facts being erased while an unredacted encrypted payload retains them. */
export const understandingReferences = pgTable(
  'understanding_references',
  {
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    targetKind: text('target_kind')
      .$type<'preference_state' | 'preference_event' | 'monthly_snapshot'>()
      .notNull(),
    targetId: text('target_id').notNull(),
    accountId: text('account_id').notNull(),
    transactionId: text('transaction_id'),
    connectionId: text('connection_id').notNull(),
    subjectKind: text('subject_kind').$type<'account' | 'transaction'>().notNull(),
    subjectId: text('subject_id').notNull(),
    erasureRevision: integer('erasure_revision').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.profileId,
        table.targetKind,
        table.targetId,
        table.subjectKind,
        table.subjectId,
      ],
    }),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
