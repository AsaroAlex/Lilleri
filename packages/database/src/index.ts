import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite'
import pg from 'pg'
import * as schema from './schema.js'

export { schema }
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
export interface DatabaseHandle {
  readonly db: Database
  close(): Promise<void>
}
export type DatabaseConfig =
  | { driver: 'pglite'; path?: string }
  | { driver: 'postgres'; url: string }

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url))
async function migrations() {
  return Promise.all(
    (await readdir(migrationsDirectory))
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort()
      .map(async (name) => ({
        name,
        sql: await readFile(`${migrationsDirectory}/${name}`, 'utf8'),
      })),
  )
}

/** Both drivers run the same reviewed PostgreSQL migration files. */
export async function openDatabase(config: DatabaseConfig): Promise<DatabaseHandle> {
  if (config.driver === 'pglite') {
    const client = new PGlite(config.path)
    try {
      await client.exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL)',
      )
      for (const migration of await migrations()) {
        const applied = await client.query(
          'SELECT name, checksum FROM schema_migrations WHERE name=$1',
          [migration.name],
        )
        const checksum = createHash('sha256').update(migration.sql).digest('hex')
        if (applied.rows.length) {
          if ((applied.rows[0] as { checksum: string }).checksum !== checksum)
            throw new Error(`Migration checksum mismatch: ${migration.name}`)
          continue
        }
        await client.transaction(async (tx) => {
          await tx.exec(migration.sql)
          await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [
            migration.name,
            checksum,
          ])
        })
      }
      return { db: pgliteDrizzle(client, { schema }), close: () => client.close() }
    } catch (error) {
      await client.close()
      throw error
    }
  }
  const pool = new pg.Pool({ connectionString: config.url, max: 5 })
  try {
    const client = await pool.connect()
    try {
      await client.query('SELECT pg_advisory_lock(714589101)')
      await client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL)',
      )
      for (const migration of await migrations()) {
        const checksum = createHash('sha256').update(migration.sql).digest('hex')
        const applied = await client.query<{ checksum: string }>(
          'SELECT name, checksum FROM schema_migrations WHERE name=$1',
          [migration.name],
        )
        if (applied.rowCount) {
          if (applied.rows[0]?.checksum !== checksum)
            throw new Error(`Migration checksum mismatch: ${migration.name}`)
          continue
        }
        await client.query('BEGIN')
        try {
          await client.query(migration.sql)
          await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [
            migration.name,
            checksum,
          ])
          await client.query('COMMIT')
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        }
      }
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock(714589101)')
      } finally {
        client.release()
      }
    }
    return { db: pgDrizzle(pool, { schema }), close: () => pool.end() }
  } catch (error) {
    await pool.end()
    throw error
  }
}
