import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import {
  digest,
  readConfig,
  signingKey,
  signManifest,
  verifyManifest,
} from './postgres-operations-lib.mjs'

const run = promisify(execFile)
const manifestBody = () => ({
  format: 'lilleri.postgres-backup.v1',
  scope: 'local-synthetic',
  createdAt: '2026-10-04T12:00:00.000Z',
  snapshot: 'repeatable-read-exported',
  serverVersion: '16.10',
  dump: { bytes: 400, sha256: 'a'.repeat(64), format: 'postgres-custom' },
  migrations: [{ name: '0001_initial.sql', checksum: 'b'.repeat(64) }],
  rls: [{ table: 'transactions', enabled: true, forced: true }],
})
test('default readiness performs no database/tool execution even with inherited unsafe configuration', async () => {
  const output = await run(
    process.execPath,
    [new URL('./postgres-operations.mjs', import.meta.url).pathname],
    {
      env: {
        ...process.env,
        POSTGRES_OPERATIONS_CONFIG_FILE: '/nonexistent/unsafe-config',
        DATABASE_URL: 'postgres://private:secret@external.invalid/production',
      },
    },
  )
  const result = JSON.parse(output.stdout)
  assert.equal(result.executed, false)
  assert.equal(result.productionBackupAccepted, false)
  assert.ok(!output.stdout.includes('private:secret'))
  assert.ok(!output.stdout.includes('external.invalid'))
  await assert.rejects(
    run(process.execPath, [
      new URL('./postgres-operations.mjs', import.meta.url).pathname,
      'restore',
      '--target=production',
    ]),
  )
})
test('backup authentication rejects altered bytes, wrong signing key and stale independent digest', () => {
  const key = randomBytes(32)
  const manifest = signManifest(manifestBody(), key)
  assert.deepEqual(verifyManifest(manifest, key, digest(manifest)), manifest)
  assert.throws(() =>
    verifyManifest(
      {
        ...manifest,
        body: { ...manifest.body, dump: { ...manifest.body.dump, sha256: 'c'.repeat(64) } },
      },
      key,
      digest(manifest),
    ),
  )
  assert.throws(() => verifyManifest(manifest, randomBytes(32), digest(manifest)))
  assert.throws(() => verifyManifest(manifest, key, 'd'.repeat(64)))
  assert.throws(() =>
    verifyManifest({ ...manifest, credentials: 'unexpected' }, key, digest(manifest)),
  )
  const unsignedUnsafe = signManifest(
    { ...manifestBody(), migrations: [{ name: '../../secret', checksum: 'b'.repeat(64) }] },
    key,
  )
  assert.throws(() => verifyManifest(unsignedUnsafe, key, digest(unsignedUnsafe)))
})
test('execution configuration rejects nonlocal targets, application archives and public signing keys before connection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lilleri-postgres-config-'))
  try {
    const config = join(root, 'config.json')
    const value = {
      format: 'lilleri.postgres-operations-config.v1',
      scope: 'local-synthetic',
      maintenanceUrl: 'postgres://admin:synthetic@127.0.0.1/lilleri_synthetic_fixture',
      transport: null,
    }
    await writeFile(config, JSON.stringify(value), { mode: 0o600 })
    assert.equal((await readConfig(config)).parameters.database, 'lilleri_synthetic_fixture')
    for (const maintenanceUrl of [
      'postgres://admin:synthetic@external.invalid/lilleri_synthetic_fixture',
      'postgres://admin:synthetic@localhost/production',
    ]) {
      await writeFile(config, JSON.stringify({ ...value, maintenanceUrl }))
      await assert.rejects(readConfig(config))
    }
    const key = join(root, 'key')
    await writeFile(key, randomBytes(32), { mode: 0o644 })
    await chmod(key, 0o644)
    await assert.rejects(signingKey(key))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
