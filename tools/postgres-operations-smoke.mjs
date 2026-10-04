import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { connect, privateFile, readConfig } from './postgres-operations-lib.mjs'

async function main() {
  const flags = process.argv.slice(2)
  if (!flags.includes('--execute') || !flags.includes('--scope=local-synthetic')) {
    process.stdout.write(
      `${JSON.stringify({ format: 'lilleri.postgres-operations-drill.v1', executed: false, required: ['--execute', '--scope=local-synthetic', '--admin-url-file=PRIVATE_FILE', '--container=ISOLATED_CONTAINER'] })}\n`,
    )
  } else {
    const argument = (name) =>
      flags.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
    const adminFile = argument('admin-url-file'),
      container = argument('container')
    if (!adminFile || !/^lilleri-postgres-ops-[a-f0-9]{10}$/.test(container ?? ''))
      throw new Error('An explicit isolated PostgreSQL fixture is required')
    const { openDatabase, schema } = await import('../packages/database/dist/index.js')
    const { ProfileEncryption } = await import('../apps/api/dist/encryption.js')
    const { createLocalSyntheticKeyManagement } = await import(
      '../apps/api/dist/encryption-local.js'
    )
    const { SourceErasureService } = await import('../apps/api/dist/source-erasure.js')
    const { createSourceErasureJournal } = await import(
      '../apps/api/dist/source-erasure-journal.js'
    )
    const { DemoService } = await import('../apps/api/dist/service.js')
    const { MockItalianProvider } = await import('../packages/financial-providers/dist/index.js')
    const identity = await import('../apps/api/dist/identity-schema.js')
    const require = createRequire(new URL('../packages/database/package.json', import.meta.url))
    const { drizzle } = require('drizzle-orm/node-postgres')
    const run = promisify(execFile)
    const root = await mkdtemp(join(tmpdir(), 'lilleri-postgres-ops-drill-'))
    const token = randomBytes(5).toString('hex'),
      sourceName = `lilleri_synthetic_drill_${token}`
    const successful = `lilleri_restore_synthetic_ok_${token}`,
      failed = `lilleri_restore_synthetic_failed_${token}`
    const rejected = `lilleri_restore_synthetic_rejected_${token}`
    const sourceUrl = new URL((await privateFile(adminFile)).toString('utf8').trim())
    sourceUrl.pathname = `/${sourceName}`
    const configFile = join(root, 'config.json'),
      backupKey = join(root, 'backup-signing.key'),
      deletionKey = join(root, 'deletion-signing.key')
    const vault = join(root, 'current-vault'),
      sourceStore = join(root, 'current-source-journal'),
      staleStore = join(root, 'stale-source-journal')
    const archive = join(root, 'backup'),
      journalFile = join(root, 'current-global-journal.json')
    await writeFile(
      configFile,
      JSON.stringify({
        format: 'lilleri.postgres-operations-config.v1',
        scope: 'local-synthetic',
        maintenanceUrl: sourceUrl.href,
        transport: { type: 'docker', container, socketDirectory: '/var/run/postgresql' },
      }),
      { mode: 0o600 },
    )
    await writeFile(backupKey, randomBytes(32), { mode: 0o600 })
    await writeFile(deletionKey, randomBytes(32), { mode: 0o600 })
    const config = await readConfig(configFile)
    const env = {
      ...process.env,
      POSTGRES_BACKUP_SIGNING_KEY_FILE: backupKey,
      DELETION_JOURNAL_KEY_FILE: deletionKey,
    }
    const cli = (...args) =>
      run(
        process.execPath,
        [
          new URL('./postgres-operations.mjs', import.meta.url).pathname,
          ...args,
          '--execute',
          '--scope=local-synthetic',
          `--config=${configFile}`,
        ],
        { env, maxBuffer: 65536 },
      )
    let maintenance, handle, journal, restored
    const at = '2026-10-01T12:00:00.000Z',
      erasedAt = '2026-10-02T12:00:00.000Z'
    const money = 9007199254740993n
    try {
      maintenance = await connect(config, 'postgres')
      await maintenance.query(`CREATE DATABASE ${sourceName} TEMPLATE template0`)
      handle = await openDatabase({ driver: 'postgres', url: sourceUrl.href })
      const keys = await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' })
      const encryption = new ProfileEncryption(handle.db, keys)
      journal = await createSourceErasureJournal({
        directory: sourceStore,
        anchorDirectory: vault,
        keys,
        mode: 'demo',
      })
      async function profile(id, bank) {
        await handle.db
          .insert(schema.profiles)
          .values({ id, name: 'Profilo sintetico', timezone: 'Europe/Rome', createdAt: at })
        for (const kind of bank ? ['bank', 'manual'] : ['manual']) {
          const connectionId = `${id}_${kind}`,
            accountId = `${connectionId}_account`
          await handle.db.insert(schema.connections).values({
            id: connectionId,
            profileId: id,
            providerId: kind === 'bank' ? 'mock-italian' : 'local-manual',
            institutionId: 'synthetic',
            status: 'active',
            createdAt: at,
          })
          if (kind === 'bank')
            await handle.db.insert(schema.consents).values({
              id: `${id}_consent`,
              profileId: id,
              connectionId,
              purpose: 'account_information',
              grantedAt: at,
              expiresAt: '2027-10-01T12:00:00.000Z',
              provider: 'mock-italian',
            })
          await handle.db.insert(schema.accounts).values({
            id: accountId,
            profileId: id,
            connectionId,
            providerAccountId: kind,
            name: 'Conto sintetico',
            institutionName: 'Fixture locale',
            kind: kind === 'bank' ? 'current' : 'cash',
            balanceMinor: money,
            currency: 'EUR',
            balanceUpdatedAt: at,
          })
          await handle.db.insert(schema.transactions).values(
            await encryption.encryptTransactionRow(handle.db, {
              id: `${id}_${kind}_transaction`,
              profileId: id,
              connectionId,
              accountId,
              providerId: kind === 'bank' ? 'mock-italian' : 'local-manual',
              providerTransactionId: 'synthetic',
              revision: 1,
              source: kind === 'bank' ? 'bank' : 'manual',
              status: 'booked',
              amountMinor: -money,
              currency: 'EUR',
              description: 'Movimento sintetico cifrato',
              observedAt: at,
              kind: 'expense',
              bookedOn: '2026-10-01',
              contentHash: 'synthetic',
            }),
          )
        }
      }
      await profile('synthetic_source_owner', true)
      await profile('synthetic_deleted_owner', true)
      await profile('synthetic_retained_owner', false)
      await handle.db.insert(identity.user).values({
        id: 'synthetic_deleted_user',
        name: 'Utente sintetico',
        email: 'synthetic@example.test',
        emailVerified: true,
        createdAt: new Date(at),
        updatedAt: new Date(at),
        adultAttested: true,
        termsVersion: 'fixture',
      })
      await handle.db.insert(identity.memberships).values({
        userId: 'synthetic_deleted_user',
        profileId: 'synthetic_deleted_owner',
        role: 'owner',
        createdAt: new Date(at),
      })
      await handle.db.insert(identity.session).values({
        id: 'synthetic_session',
        token: 'synthetic-token',
        userId: 'synthetic_deleted_user',
        expiresAt: new Date('2027-10-01T12:00:00.000Z'),
        createdAt: new Date(at),
        updatedAt: new Date(at),
      })
      await handle.db.insert(identity.verification).values({
        id: 'synthetic_verification',
        identifier: 'synthetic-reset',
        value: 'synthetic-reset-token',
        expiresAt: new Date('2027-10-01T12:00:00.000Z'),
        createdAt: new Date(at),
        updatedAt: new Date(at),
      })
      const backup = JSON.parse((await cli('backup', `--archive=${archive}`)).stdout)
      assert.equal(
        (await readFile(join(archive, 'database.dump'))).subarray(0, 5).toString(),
        'PGDMP',
      )
      const { cp } = await import('node:fs/promises')
      await cp(sourceStore, staleStore, { recursive: true })
      await handle.withProfile('synthetic_source_owner', (db) =>
        new SourceErasureService(
          db,
          'synthetic_source_owner',
          encryption,
          journal,
          () => erasedAt,
        ).erase('synthetic_source_owner_bank'),
      )
      await new DemoService(
        handle.db,
        'synthetic_deleted_owner',
        new MockItalianProvider(),
        () => erasedAt,
        encryption,
      ).erase()
      await encryption.finalizeErasure('synthetic_deleted_owner')
      const metadata = JSON.parse(
        (
          await cli(
            'journal',
            `--journal=${journalFile}`,
            `--key-vault=${vault}`,
            `--source-journal=${sourceStore}`,
          )
        ).stdout,
      )
      const restoreFlags = [
        `--archive=${archive}`,
        `--journal=${journalFile}`,
        `--key-vault=${vault}`,
        `--trusted-backup-digest=${backup.digest}`,
        `--trusted-journal-digest=${metadata.digest}`,
        `--minimum-issued-at=${metadata.issuedAt}`,
      ]
      const incorrectDigest = restoreFlags.map((flag) =>
        flag.startsWith('--trusted-backup-digest=')
          ? `--trusted-backup-digest=${'0'.repeat(64)}`
          : flag,
      )
      await assert.rejects(
        cli(
          'restore',
          ...incorrectDigest,
          `--target=${rejected}`,
          `--source-journal=${sourceStore}`,
        ),
      )
      const originalDump = await readFile(join(archive, 'database.dump'))
      const changedDump = Buffer.from(originalDump)
      changedDump[changedDump.length - 1] ^= 1
      await writeFile(join(archive, 'database.dump'), changedDump)
      await assert.rejects(
        cli('restore', ...restoreFlags, `--target=${rejected}`, `--source-journal=${sourceStore}`),
      )
      await writeFile(join(archive, 'database.dump'), originalDump)
      assert.equal(
        (await maintenance.query('SELECT 1 FROM pg_database WHERE datname=$1', [rejected]))
          .rowCount,
        0,
      )
      await assert.rejects(
        cli('restore', ...restoreFlags, `--target=${failed}`, `--source-journal=${staleStore}`),
      )
      const failedState = (
        await maintenance.query(
          "SELECT datallowconn, has_database_privilege(0, oid, 'CONNECT') AS public_connect FROM pg_database WHERE datname=$1",
          [failed],
        )
      ).rows[0]
      assert.equal(failedState?.datallowconn, false)
      const result = JSON.parse(
        (
          await cli(
            'restore',
            ...restoreFlags,
            `--target=${successful}`,
            `--source-journal=${sourceStore}`,
          )
        ).stdout,
      )
      assert.equal(result.requiresOperatorRelease, true)
      assert.equal(result.quarantine.allowConnections, false)
      assert.equal(result.replay.sourceTombstonesReplayed, 1)
      assert.equal(result.replay.restoredProfilesRemoved, 1)
      await assert.rejects(connect(config, successful))
      // Inspect only through a private pinned maintenance session; keep normal connections blocked.
      await maintenance.query(`ALTER DATABASE ${successful} ALLOW_CONNECTIONS true`)
      restored = await connect(config, successful)
      await maintenance.query(`ALTER DATABASE ${successful} ALLOW_CONNECTIONS false`)
      assert.equal(
        (
          await restored.query(
            "SELECT count(*)::int AS count FROM profiles WHERE id='synthetic_deleted_owner'",
          )
        ).rows[0].count,
        0,
      )
      assert.equal(
        (
          await restored.query(
            "SELECT count(*)::int AS count FROM accounts WHERE connection_id='synthetic_source_owner_bank'",
          )
        ).rows[0].count,
        0,
      )
      assert.equal(
        (await restored.query('SELECT count(*)::int AS count FROM identity_sessions')).rows[0]
          .count,
        0,
      )
      assert.equal(
        (await restored.query('SELECT count(*)::int AS count FROM identity_verifications')).rows[0]
          .count,
        0,
      )
      assert.equal(
        (
          await restored.query(
            "SELECT balance_minor FROM accounts WHERE id='synthetic_retained_owner_manual_account'",
          )
        ).rows[0].balance_minor,
        money.toString(),
      )
      assert.equal(
        (
          await restored.query(
            "SELECT amount_minor FROM transactions WHERE id='synthetic_retained_owner_manual_transaction'",
          )
        ).rows[0].amount_minor,
        (-money).toString(),
      )
      const restoredDb = drizzle(restored, { schema })
      const currentEncryption = new ProfileEncryption(restoredDb, keys)
      const retained = (
        await restored.query(
          "SELECT description FROM transactions WHERE id='synthetic_retained_owner_manual_transaction'",
        )
      ).rows[0].description
      assert.equal(
        await currentEncryption.decryptText(
          restoredDb,
          {
            profileId: 'synthetic_retained_owner',
            table: 'transactions',
            column: 'description',
            rowId: 'synthetic_retained_owner_manual_transaction',
          },
          retained,
        ),
        'Movimento sintetico cifrato',
      )
      await restored.query('BEGIN')
      await restored.query('SET LOCAL ROLE lilleri_runtime')
      assert.equal(
        (await restored.query('SELECT count(*)::int AS count FROM accounts')).rows[0].count,
        0,
      )
      await restored.query(
        "SELECT set_config('app.profile_id','synthetic_retained_owner',true), set_config('app.household_id','household:synthetic_retained_owner',true)",
      )
      assert.equal(
        (await restored.query('SELECT count(*)::int AS count FROM accounts')).rows[0].count,
        1,
      )
      await restored.query('ROLLBACK')
      await assert.rejects(
        cli(
          'restore',
          ...restoreFlags,
          `--target=${successful}`,
          `--source-journal=${sourceStore}`,
        ),
      )
      const report = {
        format: 'lilleri.postgres-operations-drill.v1',
        executed: true,
        passed: 8,
        driver: 'postgres-16',
        migrations: result.migrations,
        checks: {
          actualCustomDumpAndConsistentSnapshot: true,
          authenticatedInputsRejectBeforeCreation: true,
          staleSourceJournalLeavesDatabaseQuarantined: true,
          erasedProfileAndSourceDoNotResurrect: true,
          exactMoneyAndOtherSourceSurvive: true,
          currentIndependentVaultDecryptsSurvivingData: true,
          forcedRlsAndTokenInvalidation: true,
          existingTargetAndNormalConnectionsRefused: true,
        },
        productionBackupAccepted: false,
      }
      if (argument('report'))
        await writeFile(argument('report'), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
      process.stdout.write(`${JSON.stringify(report)}\n`)
    } finally {
      journal?.close()
      await handle?.close()
      await restored?.end()
      if (maintenance) {
        for (const name of [sourceName, successful, failed, rejected])
          await maintenance.query(`DROP DATABASE IF EXISTS ${name}`).catch(() => undefined)
        await maintenance.end()
      }
      await rm(root, { recursive: true, force: true })
    }
  }
}
main().catch((error) => {
  const safeStage = /^PostgreSQL synthetic operation failed at ([a-z_]+)/.exec(
    error?.stderr ?? '',
  )?.[1]
  process.stderr.write(
    `Synthetic PostgreSQL drill failed${safeStage ? ` at ${safeStage}` : ''}; private driver diagnostics were withheld.\n`,
  )
  process.exitCode = 1
})
