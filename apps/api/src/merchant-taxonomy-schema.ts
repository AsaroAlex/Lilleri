import { schema } from '@lilleri/database'
import { boolean, integer, jsonb, pgTable, primaryKey, text, unique } from 'drizzle-orm/pg-core'

const ownership = () => ({
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id')
    .notNull()
    .references(() => schema.profiles.id, { onDelete: 'cascade' }),
})
const versioned = () => ({
  revision: integer('revision').notNull(),
  archived: boolean('archived').notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
export const merchantAliases = pgTable(
  'merchant_aliases',
  {
    id: text('id').primaryKey(),
    ...ownership(),
    keyDigest: text('key_digest').notNull(),
    normalizedKey: text('normalized_key').notNull(),
    merchantId: text('merchant_id').notNull(),
    displayName: text('display_name').notNull(),
    ...versioned(),
  },
  (t) => [
    unique('merchant_aliases_profile_id_key').on(t.profileId, t.id),
    unique('merchant_aliases_profile_digest_key').on(t.profileId, t.keyDigest),
  ],
)
export const ownedCategories = pgTable(
  'owned_categories',
  {
    id: text('id').primaryKey(),
    ...ownership(),
    canonicalCode: text('canonical_code').notNull(),
    taxonomyVersion: text('taxonomy_version').notNull(),
    label: text('label').notNull(),
    icon: text('icon').notNull(),
    parentId: text('parent_id'),
    position: integer('position').notNull(),
    hidden: boolean('hidden').notNull().default(false),
    ...versioned(),
  },
  (t) => [unique('owned_categories_profile_id_key').on(t.profileId, t.id)],
)
export const categoryAssignments = pgTable(
  'category_assignments',
  {
    ...ownership(),
    transactionId: text('transaction_id').notNull(),
    categoryId: text('category_id').notNull(),
    revision: integer('revision').notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.transactionId] })],
)
const event = () => ({
  id: text('id').primaryKey(),
  ...ownership(),
  revision: integer('revision').notNull(),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  occurredAt: text('occurred_at').notNull(),
})
export const merchantAliasEvents = pgTable(
  'merchant_alias_events',
  {
    ...event(),
    aliasId: text('alias_id').notNull(),
    action: text('action').$type<'created' | 'updated' | 'archived' | 'undone'>().notNull(),
  },
  (t) => [
    unique('merchant_alias_events_profile_revision_key').on(t.profileId, t.aliasId, t.revision),
  ],
)
export const ownedCategoryEvents = pgTable(
  'owned_category_events',
  {
    ...event(),
    categoryId: text('category_id').notNull(),
    action: text('action')
      .$type<'created' | 'updated' | 'archived' | 'merged' | 'undone'>()
      .notNull(),
  },
  (t) => [
    unique('owned_category_events_profile_revision_key').on(t.profileId, t.categoryId, t.revision),
  ],
)
export const categoryAssignmentEvents = pgTable(
  'category_assignment_events',
  {
    ...event(),
    transactionId: text('transaction_id').notNull(),
  },
  (t) => [
    unique('category_assignment_events_profile_revision_key').on(
      t.profileId,
      t.transactionId,
      t.revision,
    ),
  ],
)
