import { schema } from '@lilleri/database'
import {
  boolean,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'

export const savedCsvMappings = pgTable(
  'saved_csv_mappings',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    name: text('name').notNull(),
    definition: jsonb('definition').$type<Record<string, unknown>>().notNull(),
    revision: integer('revision').notNull(),
    archived: boolean('archived').notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    unique('saved_csv_mappings_profile_account_id').on(table.profileId, table.accountId, table.id),
    foreignKey({
      columns: [table.profileId, table.accountId],
      foreignColumns: [schema.accounts.profileId, schema.accounts.id],
    }).onDelete('cascade'),
  ],
)
export const csvMappingEvents = pgTable(
  'csv_mapping_events',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    mappingId: text('mapping_id').notNull(),
    revision: integer('revision').notNull(),
    action: text('action').$type<'created' | 'updated' | 'archived' | 'restored'>().notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.accountId, table.mappingId],
      foreignColumns: [savedCsvMappings.profileId, savedCsvMappings.accountId, savedCsvMappings.id],
    }).onDelete('cascade'),
  ],
)
export const mappedImportProvenance = pgTable(
  'mapped_import_provenance',
  {
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    observationId: text('observation_id').notNull(),
    transactionId: text('transaction_id').notNull(),
    fileDigest: text('file_digest').notNull(),
    mappingDigest: text('mapping_digest').notNull(),
    rowNumber: integer('row_number').notNull(),
    identity: text('identity').$type<'external' | 'file_content_ordinal'>().notNull(),
    valueOn: date('value_on', { mode: 'string' }),
    fileFormat: text('file_format').$type<'xlsx'>(),
    workbookDigest: text('workbook_digest'),
    worksheet: text('worksheet'),
    headerRow: integer('header_row'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.observationId] }),
    foreignKey({
      columns: [table.profileId, table.observationId],
      foreignColumns: [schema.observations.profileId, schema.observations.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.profileId, table.accountId, table.transactionId],
      foreignColumns: [
        schema.transactions.profileId,
        schema.transactions.accountId,
        schema.transactions.id,
      ],
    }).onDelete('cascade'),
  ],
)
