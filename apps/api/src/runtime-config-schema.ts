import { sql } from 'drizzle-orm'
import { check, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import type { RuntimeConfigurationValues } from './runtime-config.js'

export const runtimeConfigurationVersions = pgTable(
  'runtime_configuration_versions',
  {
    revision: integer('revision').primaryKey(),
    schemaVersion: integer('schema_version').notNull(),
    values: jsonb('values').$type<RuntimeConfigurationValues>().notNull(),
    digest: text('digest').notNull(),
    previousRevision: integer('previous_revision'),
    rollbackRevision: integer('rollback_revision'),
    action: text('action').$type<'bootstrap' | 'update' | 'rollback'>().notNull(),
    actor: text('actor').$type<'bootstrap' | 'local_operator' | 'deployment'>().notNull(),
    reason: text('reason')
      .$type<'initial_setup' | 'tuning' | 'incident' | 'release' | 'rollback'>()
      .notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('runtime_configuration_revision', sql`${table.revision} > 0`),
    check('runtime_configuration_schema_version', sql`${table.schemaVersion} = 1`),
    check('runtime_configuration_digest', sql`${table.digest} ~ '^[0-9a-f]{64}$'`),
  ],
)

export const runtimeConfigurationHead = pgTable(
  'runtime_configuration_head',
  {
    singleton: text('singleton').primaryKey(),
    activeRevision: integer('active_revision')
      .notNull()
      .references(() => runtimeConfigurationVersions.revision),
  },
  (table) => [check('runtime_configuration_singleton', sql`${table.singleton} = 'runtime'`)],
)
