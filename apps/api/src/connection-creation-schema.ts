import { schema } from '@lilleri/database'
import { foreignKey, pgTable, text } from 'drizzle-orm/pg-core'
export type ConnectionCreationState =
  | 'prepared'
  | 'dispatching'
  | 'applied'
  | 'cancelled'
  | 'compensating'
  | 'compensated'
/** Minimal durable routing survives erasure; no credential, bank name or financial content. */
export const connectionCreationIntents = pgTable(
  'connection_creation_intents',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    providerId: text('provider_id').notNull(),
    institutionId: text('institution_id').notNull(),
    connectionId: text('connection_id').notNull(),
    consentId: text('consent_id').notNull(),
    basisDigest: text('basis_digest').notNull(),
    state: text('state').$type<ConnectionCreationState>().notNull(),
    createdAt: text('created_at').notNull(),
    dispatchedAt: text('dispatched_at'),
    deadlineAt: text('deadline_at').notNull(),
    settledAt: text('settled_at'),
    appliedAt: text('applied_at'),
    compensatedAt: text('compensated_at'),
    revocationJobId: text('revocation_job_id'),
    recoveryCheckedAt: text('recovery_checked_at'),
  },
  (table) => [foreignKey({ columns: [table.householdId], foreignColumns: [schema.households.id] })],
)
export type ConnectionCreationIntent = typeof connectionCreationIntents.$inferSelect
