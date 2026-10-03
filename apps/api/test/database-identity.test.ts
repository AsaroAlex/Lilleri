import { resolvePostgresTarget } from '@lilleri/database'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { databaseVaultIdentity } from '../src/database-identity.js'

beforeEach(() => {
  vi.stubEnv('PGHOST', 'localhost')
  vi.stubEnv('PGPORT', '5432')
  vi.stubEnv('PGDATABASE', undefined)
  vi.stubEnv('PGUSER', 'synthetic_default')
})
afterEach(() => vi.unstubAllEnvs())

test('keeps the established explicit TCP partition and ignores credential changes', () => {
  expect(databaseVaultIdentity('postgres://first:synthetic-secret@127.0.0.1:55432/demo')).toBe(
    '127.0.0.1:55432/demo',
  )
  expect(databaseVaultIdentity('postgresql://second:another-secret@127.0.0.1:55432/demo')).toBe(
    '127.0.0.1:55432/demo',
  )
})
test('separates two Unix socket clusters sharing the same virtual authority and database name', () => {
  const first = databaseVaultIdentity(
    'postgres://first:secret@localhost/demo?host=%2Ftmp%2Fcluster-a',
  )
  const second = databaseVaultIdentity(
    'postgres://first:secret@localhost/demo?host=%2Ftmp%2Fcluster-b',
  )
  expect(first).not.toBe(second)
  expect(first).toBe('/tmp/cluster-a:5432/demo')
})
test('uses effective port overrides when partitioning independent database vaults', () => {
  expect(databaseVaultIdentity('postgres://first:secret@localhost/demo?port=55432')).not.toBe(
    databaseVaultIdentity('postgres://first:secret@localhost/demo?port=55433'),
  )
})
test('ignores the database query parameter exactly as the installed driver does', () => {
  const result = databaseVaultIdentity(
    'postgres://first:secret@localhost/demo?database=other&password=hidden&user=hidden',
  )
  expect(result).toBe('localhost:5432/demo')
  expect(result).not.toContain('hidden')
  expect(result).not.toContain('secret')
})

test('uses the last duplicate host and port overrides rather than the first', () => {
  const first = databaseVaultIdentity(
    'postgres://first:secret@localhost/demo?host=%2Ftmp%2Fshared&host=%2Ftmp%2Fcluster-a&port=55432&port=55433',
  )
  const second = databaseVaultIdentity(
    'postgres://first:secret@localhost/demo?host=%2Ftmp%2Fshared&host=%2Ftmp%2Fcluster-b&port=55432&port=55434',
  )
  expect(first).toBe('/tmp/cluster-a:55433/demo')
  expect(second).toBe('/tmp/cluster-b:55434/demo')
  expect(first).not.toBe(second)
})

test('empty host and port overrides fall back to the explicit authority', () => {
  expect(databaseVaultIdentity('postgres://first:secret@127.0.0.1:55432/demo?host=&port=')).toBe(
    '127.0.0.1:55432/demo',
  )
})

test('uses driver environment defaults and separates independently addressed socket clusters', () => {
  vi.stubEnv('PGHOST', '/tmp/cluster-a')
  vi.stubEnv('PGPORT', '55432')
  vi.stubEnv('PGDATABASE', 'environment_database')
  const first = databaseVaultIdentity('postgres:///')
  expect(first).toBe('/tmp/cluster-a:55432/environment_database')
  vi.stubEnv('PGHOST', '/tmp/cluster-b')
  expect(databaseVaultIdentity('postgres:///')).toBe('/tmp/cluster-b:55432/environment_database')
  expect(databaseVaultIdentity('postgres:///')).not.toBe(first)
})

test('the nonconnecting target projection contains only host, port and database', () => {
  expect(resolvePostgresTarget('postgres://first:secret@unreachable.invalid:55432/demo')).toEqual({
    host: 'unreachable.invalid',
    port: 55432,
    database: 'demo',
  })
})

test('invalid connection configuration yields a neutral error without authentication text', () => {
  expect(() =>
    databaseVaultIdentity('postgres://first:synthetic-private-value@localhost/demo?port=invalid'),
  ).toThrow('PostgreSQL database target is unavailable')
})
