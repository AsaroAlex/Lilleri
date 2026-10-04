import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'

export const syncIdentities = pgTable('sync_transaction_identities', {
  transactionId: text('transaction_id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id').notNull(),
  connectionId: text('connection_id').notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  originConsentId: text('origin_consent_id').notNull(),
  originRenewalRevision: integer('origin_renewal_revision').notNull(),
  fingerprint: text('fingerprint').notNull(),
  ordinal: integer('ordinal'),
  createdAt: text('created_at').notNull(),
})
export const syncIdentityAliases = pgTable(
  'sync_transaction_aliases',
  {
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    consentId: text('consent_id').notNull(),
    renewalRevision: integer('renewal_revision').notNull(),
    providerRecordId: text('provider_record_id').notNull(),
    transactionId: text('transaction_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    primaryKey({
      columns: [
        t.profileId,
        t.connectionId,
        t.accountId,
        t.providerId,
        t.consentId,
        t.renewalRevision,
        t.providerRecordId,
      ],
    }),
  ],
)
export const syncIdentityEvents = pgTable('sync_identity_events', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id').notNull(),
  connectionId: text('connection_id').notNull(),
  accountId: text('account_id').notNull(),
  transactionId: text('transaction_id').notNull(),
  consentId: text('consent_id').notNull(),
  renewalRevision: integer('renewal_revision').notNull(),
  jobId: text('job_id').notNull(),
  kind: text('kind').$type<'no_id_ordinal' | 'provider_id_changed'>().notNull(),
  providerRecordId: text('provider_record_id'),
  fingerprint: text('fingerprint').notNull(),
  ordinal: integer('ordinal'),
  createdAt: text('created_at').notNull(),
})
