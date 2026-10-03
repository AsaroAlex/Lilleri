import { integer, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core'

export const recurringPreferences = pgTable(
  'recurring_preferences',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id').notNull(),
    selector: jsonb('selector').$type<Record<string, unknown>>().notNull(),
    state: jsonb('state').$type<Record<string, unknown>>().notNull(),
    revision: integer('revision').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    unique('recurring_preferences_profile_account_id').on(
      table.profileId,
      table.accountId,
      table.id,
    ),
  ],
)
export const recurringPreferenceEvents = pgTable('recurring_preference_events', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id').notNull(),
  accountId: text('account_id').notNull(),
  preferenceId: text('preference_id').notNull(),
  revision: integer('revision').notNull(),
  action: text('action').$type<'updated' | 'undone'>().notNull(),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  occurredAt: text('occurred_at').notNull(),
})
