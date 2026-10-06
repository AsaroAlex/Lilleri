import { pgTable, text } from 'drizzle-orm/pg-core'

export type BankAuthorizationStatus = 'pending' | 'completing' | 'completed' | 'failed' | 'expired'
/** Single-use redirect routing. The state itself and the provider's code are never stored. */
export const bankAuthorizations = pgTable('bank_authorizations', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id').notNull(),
  providerId: text('provider_id').notNull(),
  institutionId: text('institution_id').notNull(),
  connectionId: text('connection_id').notNull(),
  purpose: text('purpose').$type<'connect' | 'renew'>().notNull(),
  /** Where the bank's return lands: the web application or the native app. */
  returnTo: text('return_to').$type<'web' | 'app'>().notNull().default('web'),
  stateHash: text('state_hash').notNull(),
  status: text('status').$type<BankAuthorizationStatus>().notNull(),
  failureCode: text('failure_code'),
  consentId: text('consent_id'),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  settledAt: text('settled_at'),
})
export type BankAuthorization = typeof bankAuthorizations.$inferSelect
