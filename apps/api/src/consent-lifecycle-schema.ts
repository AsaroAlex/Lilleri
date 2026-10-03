import { schema } from '@lilleri/database'
import type { ProviderAuthorization, ProviderDiscoveryMetadata } from '@lilleri/financial-providers'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
} from 'drizzle-orm/pg-core'

export type ConsentEventAction =
  | 'granted'
  | 'renewed'
  | 'paused'
  | 'resumed'
  | 'revoked'
  | 'provider_error'
  | 'provider_recovered'
  | 'legacy_imported'
export const consentLifecycles = pgTable(
  'consent_lifecycles',
  {
    connectionId: text('connection_id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    consentId: text('consent_id').notNull(),
    revision: integer('revision').notNull(),
    paused: boolean('paused').notNull().default(false),
    authorization: jsonb('provider_authorization').$type<ProviderAuthorization>().notNull(),
    providerMetadata: jsonb('provider_metadata').$type<ProviderDiscoveryMetadata>(),
    source: text('source').$type<'provider' | 'legacy'>().notNull(),
    providerError: text('provider_error').$type<'unavailable' | 'requires_action'>(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    check('consent_lifecycles_revision', sql`${table.revision} > 0`),
    foreignKey({
      columns: [table.profileId, table.connectionId],
      foreignColumns: [schema.connections.profileId, schema.connections.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
export const consentEvents = pgTable(
  'consent_events',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    connectionId: text('connection_id').notNull(),
    consentId: text('consent_id').notNull(),
    revision: integer('revision').notNull(),
    action: text('action').$type<ConsentEventAction>().notNull(),
    source: text('source').$type<'provider' | 'user' | 'legacy'>().notNull(),
    authorization: jsonb('provider_authorization').$type<ProviderAuthorization>().notNull(),
    providerMetadata: jsonb('provider_metadata').$type<ProviderDiscoveryMetadata>(),
    occurredAt: text('occurred_at').notNull(),
  },
  (table) => [
    check('consent_events_revision', sql`${table.revision} > 0`),
    unique('consent_events_profile_connection_revision').on(
      table.profileId,
      table.connectionId,
      table.revision,
    ),
    foreignKey({
      columns: [table.profileId, table.connectionId],
      foreignColumns: [schema.connections.profileId, schema.connections.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.householdId, table.profileId],
      foreignColumns: [schema.profiles.householdId, schema.profiles.id],
    }).onDelete('cascade'),
  ],
)
