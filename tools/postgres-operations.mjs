import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { mkdir, open, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import {
  assertMaintenance,
  canonical,
  catalog,
  connect,
  digest,
  existingDirectory,
  fileDigest,
  independentPaths,
  privateFile,
  readConfig,
  restoreName,
  reviewedMigrations,
  runTool,
  signingKey,
  signManifest,
  verifyManifest,
  verifyTransport,
} from './postgres-operations-lib.mjs'

function argumentsFrom(input) {
  const command = input[0] ?? 'readiness'
  if (!['readiness', 'backup', 'journal', 'restore'].includes(command))
    throw new Error('Unknown PostgreSQL operation')
  const args = { command }
  for (const flag of input.slice(1)) {
    if (flag === '--execute' && args.execute === undefined) {
      args.execute = true
      continue
    }
    const match = /^--([a-z-]+)=(.+)$/.exec(flag)
    if (
      !match ||
      args[match[1]] !== undefined ||
      ![
        'scope',
        'config',
        'archive',
        'journal',
        'key-vault',
        'source-journal',
        'target',
        'trusted-backup-digest',
        'trusted-journal-digest',
        'minimum-issued-at',
      ].includes(match[1])
    )
      throw new Error('Unknown, duplicate or empty operation argument')
    args[match[1]] = match[2]
  }
  if (command === 'readiness') {
    if (Object.keys(args).length !== 1) throw new Error('Readiness accepts no I/O arguments')
    return args
  }
  if (!args.execute || args.scope !== 'local-synthetic')
    throw new Error('Execution requires --execute --scope=local-synthetic')
  args.config ??= process.env.POSTGRES_OPERATIONS_CONFIG_FILE
  const required =
    command === 'backup'
      ? ['config', 'archive']
      : command === 'journal'
        ? ['config', 'journal', 'key-vault', 'source-journal']
        : [
            'config',
            'archive',
            'journal',
            'key-vault',
            'source-journal',
            'target',
            'trusted-backup-digest',
            'trusted-journal-digest',
            'minimum-issued-at',
          ]
  for (const name of required) if (!args[name]) throw new Error(`Missing --${name}`)
  if (command === 'restore' && !restoreName.test(args.target))
    throw new Error('Restoration requires a fresh guarded synthetic database name')
  return args
}
async function financialDatabase(client) {
  const require = createRequire(new URL('../packages/database/package.json', import.meta.url))
  const { drizzle } = require('drizzle-orm/node-postgres')
  const { schema } = await import('../packages/database/dist/index.js')
  return drizzle(client, { schema })
}
let stage = 'arguments'
async function main() {
  const args = argumentsFrom(process.argv.slice(2))
  if (args.command === 'readiness') {
    process.stdout.write(
      `${JSON.stringify({
        format: 'lilleri.postgres-operations-readiness.v1',
        executed: false,
        scope: 'local-synthetic',
        requirements: [
          'private isolated maintenance configuration',
          'pg_dump and pg_restore 16+',
          'independent backup signing key and trusted backup digest',
          'independently current deletion journal, signing key, digest and minimum time',
          'current independent vault and source journal',
          'fresh guarded restore database',
          'explicit execution flags',
        ],
        productionBackupAccepted: false,
      })}\n`,
    )
    return
  }
  stage = 'configuration'
  const config = await readConfig(args.config)
  await verifyTransport(config)
  let maintenance, source, target, adapters, backupKey, deletionKey
  let targetCreated = false
  try {
    stage = 'maintenance_connection'
    maintenance = await connect(config, 'postgres')
    await assertMaintenance(maintenance)
    if (args.command === 'backup') {
      backupKey = await signingKey(process.env.POSTGRES_BACKUP_SIGNING_KEY_FILE)
      await mkdir(resolve(args.archive), { mode: 0o700 })
      await independentPaths(args.archive, [
        args.config,
        process.env.POSTGRES_BACKUP_SIGNING_KEY_FILE,
        process.env.DELETION_JOURNAL_KEY_FILE,
      ])
      source = await connect(config, config.parameters.database)
      await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const snapshot = (await source.query('SELECT pg_export_snapshot() AS id')).rows[0].id
      const inventory = await catalog(source)
      await reviewedMigrations(inventory.migrations)
      const version = (
        await source.query("SELECT current_setting('server_version') AS version")
      ).rows[0].version.split(' ')[0]
      const file = await open(
        resolve(args.archive, 'database.dump'),
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
        0o600,
      )
      try {
        await runTool(
          config,
          'pg_dump',
          [
            '--format=custom',
            '--no-owner',
            '--schema=public',
            `--snapshot=${snapshot}`,
            '--compress=6',
          ],
          config.parameters.database,
          undefined,
          file.fd,
        )
        await file.sync()
      } finally {
        await file.close()
      }
      await source.query('COMMIT')
      const manifest = signManifest(
        {
          format: 'lilleri.postgres-backup.v1',
          scope: 'local-synthetic',
          createdAt: new Date().toISOString(),
          snapshot: 'repeatable-read-exported',
          serverVersion: version,
          dump: await fileDigest(resolve(args.archive, 'database.dump')),
          ...inventory,
        },
        backupKey,
      )
      await writeFile(resolve(args.archive, 'manifest.json'), `${canonical(manifest)}\n`, {
        flag: 'wx',
        mode: 0o600,
      })
      process.stdout.write(
        `${JSON.stringify({ format: manifest.body.format, digest: digest(manifest), bytes: manifest.body.dump.bytes, migrations: inventory.migrations.length, consistentSnapshot: true, productionBackupAccepted: false })}\n`,
      )
      return
    }
    deletionKey = await signingKey(process.env.DELETION_JOURNAL_KEY_FILE)
    const keyId = process.env.DELETION_JOURNAL_KEY_ID ?? 'local-deletion-journal-v1'
    const deletion = await import('../apps/api/dist/deletion-restore.js')
    const { recoveryHooks } = await import('./postgres-operations-replay.mjs')
    if (args.command === 'journal') {
      source = await connect(config, config.parameters.database)
      const db = await financialDatabase(source)
      adapters = await recoveryHooks(db, args['key-vault'], args['source-journal'])
      const journal = await deletion.exportDeletionJournal(db, {
        secret: deletionKey,
        keyId,
        keys: adapters.keys,
        sources: adapters.sources,
      })
      await writeFile(resolve(args.journal), `${canonical(journal)}\n`, { flag: 'wx', mode: 0o600 })
      process.stdout.write(
        `${JSON.stringify({ format: journal.body.format, digest: deletion.deletionJournalDigest(journal), issuedAt: journal.body.issuedAt, tombstones: journal.body.deletions.length })}\n`,
      )
      return
    }
    stage = 'backup_authentication'
    backupKey = await signingKey(process.env.POSTGRES_BACKUP_SIGNING_KEY_FILE)
    if (backupKey.equals(deletionKey))
      throw new Error('Backup and deletion signing keys must be independent')
    await existingDirectory(args.archive)
    await independentPaths(args.archive, [
      args.config,
      process.env.POSTGRES_BACKUP_SIGNING_KEY_FILE,
      process.env.DELETION_JOURNAL_KEY_FILE,
      args.journal,
      args['key-vault'],
      args['source-journal'],
    ])
    const manifest = verifyManifest(
      JSON.parse((await privateFile(resolve(args.archive, 'manifest.json'))).toString('utf8')),
      backupKey,
      args['trusted-backup-digest'],
    )
    if (
      canonical(await fileDigest(resolve(args.archive, 'database.dump'))) !==
      canonical(manifest.body.dump)
    )
      throw new Error('Dump bytes differ from authenticated backup')
    await reviewedMigrations(manifest.body.migrations)
    const verification = {
      secret: deletionKey,
      keyId,
      expectedDigest: args['trusted-journal-digest'],
      minimumIssuedAt: args['minimum-issued-at'],
    }
    stage = 'journal_authentication'
    const journal = deletion.verifyDeletionJournal(
      JSON.parse((await privateFile(args.journal, 32 * 1024 * 1024)).toString('utf8')),
      verification,
    )
    stage = 'fresh_target'
    if (
      (await maintenance.query('SELECT 1 FROM pg_database WHERE datname=$1', [args.target]))
        .rowCount
    )
      throw new Error('Restoration refuses an existing database')
    await maintenance.query(
      `CREATE DATABASE ${args.target} TEMPLATE template0 ALLOW_CONNECTIONS false`,
    )
    targetCreated = true
    await maintenance.query(`REVOKE CONNECT ON DATABASE ${args.target} FROM PUBLIC`)
    // Historical role grants do not authorise connections to this newly created target.
    const roles = (await maintenance.query('SELECT rolname FROM pg_roles WHERE NOT rolsuper')).rows
    for (const role of roles)
      await maintenance.query(
        `REVOKE CONNECT ON DATABASE ${args.target} FROM "${role.rolname.replaceAll('"', '""')}"`,
      )
    await maintenance.query(
      `COMMENT ON DATABASE ${args.target} IS 'lilleri-restore-quarantine: authenticated replay and operator release required'`,
    )
    // pg_restore needs its own trusted connection. PUBLIC and every non-superuser remain denied.
    await maintenance.query(`ALTER DATABASE ${args.target} ALLOW_CONNECTIONS true`)
    target = await connect(config, args.target)
    stage = 'restore_dump'
    const dump = await open(
      resolve(args.archive, 'database.dump'),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    try {
      await runTool(
        config,
        'pg_restore',
        [
          '--no-owner',
          '--exit-on-error',
          '--single-transaction',
          '--clean',
          '--if-exists',
          `--dbname=${args.target}`,
        ],
        args.target,
        dump.fd,
      )
    } finally {
      await dump.close()
      await maintenance.query(`ALTER DATABASE ${args.target} ALLOW_CONNECTIONS false`)
    }
    stage = 'restored_catalogue'
    const restored = await catalog(target)
    if (
      canonical(restored) !==
      canonical({ migrations: manifest.body.migrations, rls: manifest.body.rls })
    )
      throw new Error(
        'Restored migration or forced RLS inventory differs from authenticated snapshot',
      )
    const db = await financialDatabase(target)
    stage = 'current_recovery_adapters'
    adapters = await recoveryHooks(db, args['key-vault'], args['source-journal'])
    const { cancelConnectionCreationIntents } = await import(
      '../apps/api/dist/connection-creation.js'
    )
    stage = 'deletion_replay'
    const result = await deletion.replayDeletionJournal(db, journal, {
      ...verification,
      keys: adapters.keys,
      sources: adapters.sources,
      beforeProfileErasure: (database, profileId, at) =>
        cancelConnectionCreationIntents(database, profileId, at).then(() => undefined),
    })
    // Keep all network clients out after replay. An operator must review the receipt and
    // separately grant an approved runtime login; this drill never promotes a database.
    const reference = randomUUID()
    await maintenance.query(
      `COMMENT ON DATABASE ${args.target} IS 'lilleri-restore-replayed-awaiting-operator-release:${reference}'`,
    )
    process.stdout.write(
      `${JSON.stringify({
        format: 'lilleri.postgres-restore.v1',
        reference,
        backupDigest: digest(manifest),
        journalDigest: result.journalDigest,
        migrations: restored.migrations.length,
        replay: result,
        quarantine: { allowConnections: false, publicConnect: false },
        requiresOperatorRelease: true,
        productionBackupAccepted: false,
      })}\n`,
    )
  } finally {
    if (targetCreated && maintenance) {
      await maintenance
        .query(`ALTER DATABASE ${args.target} ALLOW_CONNECTIONS false`)
        .catch(() => undefined)
    }
    adapters?.close()
    backupKey?.fill(0)
    deletionKey?.fill(0)
    await Promise.allSettled([source?.end(), target?.end(), maintenance?.end()])
  }
}
main().catch((error) => {
  process.stderr.write(
    `PostgreSQL synthetic operation failed at ${stage}${['tool_schema_exists', 'tool_connection', 'tool_input_access', 'tool_short_input', 'tool_rejected'].includes(error?.code) ? ` (${error.code})` : ''}. Any created restore remains quarantined; inspect private configuration and independent recovery inputs.\n`,
  )
  process.exitCode = 1
})
