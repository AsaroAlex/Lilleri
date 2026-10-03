import { schema } from '@lilleri/database'
import { sql } from 'drizzle-orm'
import { check, pgTable, text, unique } from 'drizzle-orm/pg-core'

export const profileEncryptionKeys = pgTable(
  'profile_encryption_keys',
  {
    profileId: text('profile_id')
      .primaryKey()
      .references(() => schema.profiles.id, { onDelete: 'cascade' }),
    keyId: text('key_id').notNull(),
    wrappedKey: text('wrapped_key').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [unique('profile_encryption_keys_key_id').on(table.keyId)],
)

/** Independent of profile cascades. Replay this journal before opening restored data to traffic. */
export const profileKeyTombstones = pgTable(
  'profile_key_tombstones',
  {
    profileId: text('profile_id').primaryKey(),
    keyId: text('key_id'),
    stagedAt: text('staged_at').notNull(),
    destroyedAt: text('destroyed_at'),
  },
  (table) => [
    check(
      'profile_key_tombstones_destroyed_after_stage',
      sql`${table.destroyedAt} IS NULL OR ${table.destroyedAt} >= ${table.stagedAt}`,
    ),
  ],
)
