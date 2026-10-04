import { integer, pgTable, text, unique } from 'drizzle-orm/pg-core'

/** Financial literals live in the authenticated encrypted payload, never in metadata columns. */
export const fxEvidenceEvents = pgTable(
  'transaction_fx_evidence',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    accountId: text('account_id').notNull(),
    transactionId: text('transaction_id').notNull(),
    providerId: text('provider_id').notNull(),
    revision: integer('revision').notNull(),
    observationId: text('observation_id'),
    jobId: text('job_id'),
    observedAt: text('observed_at').notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [
    unique('transaction_fx_revision').on(table.profileId, table.transactionId, table.revision),
  ],
)
