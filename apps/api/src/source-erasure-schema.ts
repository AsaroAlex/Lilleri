import { integer, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
export const sourceErasureReceipts = pgTable('source_erasure_receipts', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id').notNull(),
  connectionId: text('connection_id').notNull(),
  revision: integer('revision').notNull(),
  receipt: jsonb('receipt').$type<Record<string, unknown>>().notNull(),
  journalKeyId: text('journal_key_id').notNull(),
  digest: text('digest').notNull(),
  stagedAt: text('staged_at').notNull(),
  appliedAt: text('applied_at'),
})
export const sourceFactGenerations = pgTable(
  'source_fact_generations',
  {
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    kind: text('kind')
      .$type<'account' | 'transaction' | 'observation' | 'manual_command'>()
      .notNull(),
    subjectId: text('subject_id').notNull(),
    accountId: text('account_id').notNull(),
    proof: jsonb('proof').$type<Record<string, unknown>>().notNull(),
    recordedAt: text('recorded_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.connectionId, table.kind, table.subjectId] }),
  ],
)
