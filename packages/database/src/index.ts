import { createHash, randomBytes } from 'node:crypto'
import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite'
import pg from 'pg'
import * as schema from './schema.js'
import { assertRuntimeRole, createProfileScope, type ProfileScopeOptions } from './scope.js'

export { ProfileScopeError, type ProfileScopeOptions } from './scope.js'
export { schema }
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
export interface DatabaseHandle {
  /** Trusted migration, identity, bootstrap and maintenance handle; never a financial request handle. */
  readonly db: Database
  readonly runtimeRoleMode: 'separate-credential' | 'trusted-session-role'
  withProfile<T>(
    profileId: string,
    work: (db: Database) => Promise<T>,
    options?: ProfileScopeOptions,
  ): Promise<T>
  close(): Promise<void>
}
export type DatabaseConfig =
  | { driver: 'pglite'; path?: string; restoreQuarantine?: boolean }
  | { driver: 'postgres'; url: string; runtimeUrl?: string }

/** Resolve the driver's effective target without connecting or returning authentication fields. */
export function resolvePostgresTarget(connectionString: string): {
  readonly host: string
  readonly port: number
  readonly database: string
} {
  try {
    const client = new pg.Client({ connectionString })
    if (
      !client.host ||
      !client.database ||
      !Number.isInteger(client.port) ||
      client.port < 1 ||
      client.port > 65535
    )
      throw new Error('Invalid target')
    return { host: client.host, port: client.port, database: client.database }
  } catch {
    // Invalid URLs and driver configuration errors must not expose the connection string.
    throw new Error('PostgreSQL database target is unavailable')
  }
}

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
    if (config.path && !config.restoreQuarantine) {
      // Avoid reopening a restored copy before the deletion journal has been replayed.
      let quarantined = true
      try {
        await access(join(config.path, '.lilleri-restore-quarantine'))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        quarantined = false
      }
      if (quarantined)
        throw new Error('Database restore is quarantined pending deletion-journal replay')
    }
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
      const db = pgliteDrizzle(client, { schema })
      await assertLocalRuntimeRole(db)
      return {
        db,
        runtimeRoleMode: 'trusted-session-role',
        withProfile: createProfileScope(db, db, true),
        close: () => client.close(),
      }
    } catch (error) {
      await client.close()
      throw error
    }
  }
  const pool = new pg.Pool({ connectionString: config.url, max: 5 })
  let runtimePool: pg.Pool | undefined
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
    const db = pgDrizzle(pool, { schema })
    if (config.runtimeUrl) {
      runtimePool = new pg.Pool({ connectionString: config.runtimeUrl, max: 5 })
      const runtimeDb = pgDrizzle(runtimePool, { schema })
      await assertRuntimeRole(runtimeDb)
      await assertRuntimeTarget(pool, runtimePool)
      const scope = createProfileScope(db, runtimeDb, false)
      const runtime = runtimePool
      return {
        db,
        runtimeRoleMode: 'separate-credential',
        withProfile: scope,
        close: async () => {
          await runtime.end()
          await pool.end()
        },
      }
    }
    await assertLocalRuntimeRole(db)
    return {
      db,
      runtimeRoleMode: 'trusted-session-role',
      withProfile: createProfileScope(db, db, true),
      close: () => pool.end(),
    }
  } catch (error) {
    await runtimePool?.end()
    await pool.end()
    throw error
  }
}

async function assertLocalRuntimeRole(db: Database) {
  await db.transaction(async (transaction) => {
    await transaction.execute(sql`SET LOCAL ROLE lilleri_runtime`)
    await assertRuntimeRole(transaction)
  })
}

/** Pin both sessions: NULL socket endpoints alone do not identify a PostgreSQL cluster. */
async function assertRuntimeTarget(trustedPool: pg.Pool, runtimePool: pg.Pool) {
  const trusted = await trustedPool.connect()
  let runtime: pg.PoolClient | undefined
  const trustedLocks: string[] = []
  const runtimeLocks: string[] = []
  let discard = false
  let operationFailed = false
  let operationError: unknown
  let cleanupFailed = false
  const mismatch = () =>
    new Error('Trusted and runtime database credentials must address the same database')
  try {
    runtime = await runtimePool.connect()
    const [trustedIdentity, runtimeIdentity] = await Promise.all([
      trusted.query(
        'SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port',
      ),
      runtime.query(
        'SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port',
      ),
    ])
    if (JSON.stringify(trustedIdentity.rows[0]) !== JSON.stringify(runtimeIdentity.rows[0]))
      throw mismatch()
    // Advisory locks have a database-specific namespace inside one postmaster. Two fresh
    // random challenges distinguish a different cluster even when both endpoints are NULL.
    for (let challenge = 0; challenge < 2; challenge++) {
      const key = randomBytes(8).readBigInt64BE().toString()
      const held = await trusted.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
        [key],
      )
      if (held.rows[0]?.acquired !== true) throw mismatch()
      trustedLocks.push(key)
      const attempted = await runtime.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
        [key],
      )
      if (attempted.rows[0]?.acquired === true) runtimeLocks.push(key)
      if (attempted.rows[0]?.acquired !== false) throw mismatch()
    }
  } catch (error) {
    // A query failure can obscure whether PostgreSQL already acquired its lock.
    discard = true
    operationFailed = true
    operationError = error
  } finally {
    const release = async (client: pg.PoolClient, locks: string[]) => {
      let failed = false
      try {
        for (const key of locks.reverse()) {
          const unlocked = await client.query<{ released: boolean }>(
            'SELECT pg_advisory_unlock($1::bigint) AS released',
            [key],
          )
          if (unlocked.rows[0]?.released !== true) throw new Error('Lock release failed')
        }
      } catch {
        failed = true
      } finally {
        client.release(discard || failed)
      }
      if (failed) throw new Error('Runtime database verification could not clear temporary locks')
    }
    const cleanup = await Promise.allSettled([
      release(trusted, trustedLocks),
      ...(runtime ? [release(runtime, runtimeLocks)] : []),
    ])
    cleanupFailed = cleanup.some((result) => result.status === 'rejected')
  }
  if (cleanupFailed)
    throw new Error('Runtime database verification could not clear temporary locks')
  if (operationFailed) throw operationError
}
