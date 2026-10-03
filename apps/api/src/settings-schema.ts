import { schema } from '@lilleri/database'
import type { ProfileSettingsValues } from '@lilleri/domain'
import { sql } from 'drizzle-orm'
import { check, integer, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core'

export const profileSettings = pgTable(
  'profile_settings',
  {
    profileId: text('profile_id')
      .primaryKey()
      .references(() => schema.profiles.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<'it-IT'>().notNull(),
    revision: integer('revision').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    check('profile_settings_locale', sql`${table.locale} = 'it-IT'`),
    check('profile_settings_revision', sql`${table.revision} > 0`),
  ],
)
export const profileSettingsEvents = pgTable(
  'profile_settings_events',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id')
      .notNull()
      .references(() => schema.profiles.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    before: jsonb('before_values').$type<ProfileSettingsValues>().notNull(),
    after: jsonb('after_values').$type<ProfileSettingsValues>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('profile_settings_events_revision', sql`${table.revision} > 1`),
    unique('profile_settings_events_profile_revision').on(table.profileId, table.revision),
  ],
)
