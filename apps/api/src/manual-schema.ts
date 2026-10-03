import { schema } from '@lilleri/database'
import {
  bigint,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'

/** Local account metadata; adjustments deliberately live outside the spending ledger. */
export const manualAccounts = pgTable(
  'manual_accounts',
  {
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    openingOn: text('opening_on').notNull(),
    openingBalanceMinor: bigint('opening_balance_minor', { mode: 'bigint' }).notNull(),
    revision: integer('revision').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.accountId] }),
    foreignKey({
      columns: [table.profileId, table.accountId],
      foreignColumns: [schema.accounts.profileId, schema.accounts.id],
    }).onDelete('cascade'),
  ],
)

export const manualCommands = pgTable(
  'manual_commands',
  {
    profileId: text('profile_id')
      .notNull()
      .references(() => schema.profiles.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    requestHash: text('request_hash').notNull(),
    operation: text('operation')
      .$type<'account' | 'entry' | 'import' | 'adjustment' | 'reversal'>()
      .notNull(),
    response: jsonb('response').$type<Record<string, unknown>>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.requestId] })],
)

export const manualBalanceEvents = pgTable(
  'manual_balance_events',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    requestId: text('request_id').notNull(),
    operation: text('operation')
      .$type<'opening' | 'entry' | 'import' | 'adjustment' | 'reversal'>()
      .notNull(),
    transactionId: text('transaction_id'),
    beforeMinor: bigint('before_minor', { mode: 'bigint' }).notNull(),
    afterMinor: bigint('after_minor', { mode: 'bigint' }).notNull(),
    accountRevision: integer('account_revision').notNull(),
    reason: text('reason').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.accountId],
      foreignColumns: [manualAccounts.profileId, manualAccounts.accountId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.profileId, table.requestId],
      foreignColumns: [manualCommands.profileId, manualCommands.requestId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.profileId, table.accountId, table.transactionId],
      foreignColumns: [
        schema.transactions.profileId,
        schema.transactions.accountId,
        schema.transactions.id,
      ],
    }).onDelete('cascade'),
    unique('manual_balance_events_revision').on(
      table.profileId,
      table.accountId,
      table.accountRevision,
    ),
  ],
)
