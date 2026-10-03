import { resolvePostgresTarget } from '@lilleri/database'

/** Stable local vault partition using only the effective database target, without authentication fields. */
export function databaseVaultIdentity(connectionString: string): string {
  const { host, port, database } = resolvePostgresTarget(connectionString)
  return `${host}:${port}/${encodeURIComponent(database)}`
}
