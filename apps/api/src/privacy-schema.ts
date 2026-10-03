import { schema } from '@lilleri/database'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'

export type PrivacyPermissionPurpose = 'P-AI' | 'C-ANALYTICS' | 'N-SERVICE'
export type PrivacyPermissionState = 'not_granted' | 'granted' | 'denied' | 'revoked'
export interface TransactionPrivacyValues {
  readonly quiet: boolean
  readonly private: boolean
}
export interface ProfilePrivacyValues {
  readonly rulesOnly: boolean
}

export const profilePrivacySettings = pgTable(
  'profile_privacy_settings',
  {
    profileId: text('profile_id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    rulesOnly: boolean('rules_only').notNull(),
    revision: integer('revision').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    check('profile_privacy_settings_revision', sql`${table.revision} > 0`),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const profilePrivacyEvents = pgTable(
  'profile_privacy_events',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    revision: integer('revision').notNull(),
    before: jsonb('before_values').$type<ProfilePrivacyValues>().notNull(),
    after: jsonb('after_values').$type<ProfilePrivacyValues>().notNull(),
    occurredAt: text('occurred_at').notNull(),
  },
  (table) => [
    check('profile_privacy_events_revision', sql`${table.revision} > 1`),
    unique('profile_privacy_events_profile_revision').on(table.profileId, table.revision),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const transactionPrivacy = pgTable(
  'transaction_privacy',
  {
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    transactionId: text('transaction_id').notNull(),
    quiet: boolean('quiet').notNull(),
    private: boolean('private_flag').notNull(),
    revision: integer('revision').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.transactionId] }),
    check('transaction_privacy_revision', sql`${table.revision} > 0`),
    foreignKey({
      columns: [table.profileId, table.transactionId],
      foreignColumns: [schema.transactions.profileId, schema.transactions.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const transactionPrivacyEvents = pgTable(
  'transaction_privacy_events',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    transactionId: text('transaction_id').notNull(),
    revision: integer('revision').notNull(),
    before: jsonb('before_values').$type<TransactionPrivacyValues>().notNull(),
    after: jsonb('after_values').$type<TransactionPrivacyValues>().notNull(),
    occurredAt: text('occurred_at').notNull(),
  },
  (table) => [
    check('transaction_privacy_events_revision', sql`${table.revision} > 1`),
    unique('transaction_privacy_events_profile_transaction_revision').on(
      table.profileId,
      table.transactionId,
      table.revision,
    ),
    foreignKey({
      columns: [table.profileId, table.transactionId],
      foreignColumns: [schema.transactions.profileId, schema.transactions.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const privacyPermissions = pgTable(
  'privacy_permissions',
  {
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    purpose: text('purpose').$type<PrivacyPermissionPurpose>().notNull(),
    state: text('state').$type<Exclude<PrivacyPermissionState, 'not_granted'>>().notNull(),
    revision: integer('revision').notNull(),
    textVersion: text('text_version').notNull(),
    textHash: text('text_hash').notNull(),
    noticeVersion: text('notice_version').notNull(),
    vendorListVersion: text('vendor_list_version'),
    updatedAt: text('updated_at').notNull(),
    reaskNotBefore: text('reask_not_before'),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.purpose] }),
    check('privacy_permissions_revision', sql`${table.revision} > 1`),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const privacyPermissionEvents = pgTable(
  'privacy_permission_events',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    householdId: text('household_id').notNull().default(''),
    purpose: text('purpose').$type<PrivacyPermissionPurpose>().notNull(),
    revision: integer('revision').notNull(),
    action: text('action').$type<'granted' | 'denied' | 'revoked'>().notNull(),
    beforeState: text('before_state').$type<PrivacyPermissionState>().notNull(),
    afterState: text('after_state')
      .$type<Exclude<PrivacyPermissionState, 'not_granted'>>()
      .notNull(),
    textVersion: text('text_version').notNull(),
    textHash: text('text_hash').notNull(),
    noticeVersion: text('notice_version').notNull(),
    vendorListVersion: text('vendor_list_version'),
    reaskNotBefore: text('reask_not_before'),
    sourceOfTruth: text('source_of_truth').$type<'local_preference'>().notNull(),
    evidenceMethod: text('evidence_method').$type<'explicit_choice'>().notNull(),
    uiContext: text('ui_context').$type<'privacy_settings'>().notNull(),
    occurredAt: text('occurred_at').notNull(),
  },
  (table) => [
    check('privacy_permission_events_revision', sql`${table.revision} > 1`),
    unique('privacy_permission_events_profile_purpose_revision').on(
      table.profileId,
      table.purpose,
      table.revision,
    ),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
