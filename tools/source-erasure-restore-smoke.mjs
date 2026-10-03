import { execFile } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { ProfileEncryption } from '../apps/api/dist/encryption.js'
import { createLocalSyntheticKeyManagement } from '../apps/api/dist/encryption-local.js'
import { SourceErasureService } from '../apps/api/dist/source-erasure.js'
import { createSourceErasureJournal } from '../apps/api/dist/source-erasure-journal.js'
import { openDatabase, schema } from '../packages/database/dist/index.js'

// Run after pnpm --filter @lilleri/api build. All data and generated keys stay in a disposable directory.
const run = promisify(execFile),
  root = await mkdtemp(join(tmpdir(), 'lilleri-source-cli-'))
const current = join(root, 'current'),
  snapshot = join(root, 'snapshot'),
  vault = join(root, 'vault'),
  sourceStore = join(root, 'source-journal'),
  staleStore = join(root, 'stale-source-journal'),
  journalFile = join(root, 'global-journal.json'),
  signingFile = join(root, 'global-signing.key')
let handle, journal
const at = '2026-10-01T12:00:00.000Z',
  erasedAt = '2026-10-02T12:00:00.000Z'
const env = { ...process.env, DELETION_JOURNAL_KEY_FILE: signingFile }
const cli = (...args) =>
  run(process.execPath, [new URL('./deletion-restore.mjs', import.meta.url).pathname, ...args], {
    env,
    maxBuffer: 65536,
  })
try {
  await writeFile(signingFile, randomBytes(32), { mode: 0o600, flag: 'wx' })
  handle = await openDatabase({ driver: 'pglite', path: current })
  const profileId = `fixture_${randomUUID()}`,
    connectionId = `bank_${randomUUID()}`,
    cashConnectionId = `cash_${randomUUID()}`,
    accountId = `bank_account_${randomUUID()}`,
    cashAccountId = `cash_account_${randomUUID()}`,
    transactionId = `transaction_${randomUUID()}`
  await handle.db
    .insert(schema.profiles)
    .values({ id: profileId, name: 'Profilo sintetico', timezone: 'Europe/Rome', createdAt: at })
  await handle.db.insert(schema.connections).values([
    {
      id: connectionId,
      profileId,
      providerId: 'mock-italian',
      institutionId: 'fixture',
      status: 'active',
      createdAt: at,
    },
    {
      id: cashConnectionId,
      profileId,
      providerId: 'local-manual',
      institutionId: 'manual',
      status: 'active',
      createdAt: at,
    },
  ])
  await handle.db.insert(schema.consents).values({
    id: `grant_${randomUUID()}`,
    profileId,
    connectionId,
    purpose: 'account_information',
    grantedAt: at,
    expiresAt: '2027-10-01T12:00:00.000Z',
    provider: 'mock-italian',
  })
  await handle.db.insert(schema.accounts).values([
    {
      id: accountId,
      profileId,
      connectionId,
      providerAccountId: 'bank',
      name: 'Conto sintetico',
      institutionName: 'Banca sintetica',
      kind: 'current',
      balanceMinor: 12000n,
      currency: 'EUR',
      balanceUpdatedAt: at,
    },
    {
      id: cashAccountId,
      profileId,
      connectionId: cashConnectionId,
      providerAccountId: 'cash',
      name: 'Altra fonte sintetica',
      institutionName: 'Locale',
      kind: 'cash',
      balanceMinor: 5500n,
      currency: 'EUR',
      balanceUpdatedAt: at,
    },
  ])
  const keys = await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' }),
    encryption = new ProfileEncryption(handle.db, keys)
  journal = await createSourceErasureJournal({
    directory: sourceStore,
    anchorDirectory: vault,
    keys,
    mode: 'demo',
  })
  await handle.db.insert(schema.transactions).values(
    await encryption.encryptTransactionRow(handle.db, {
      id: transactionId,
      profileId,
      connectionId,
      accountId,
      providerId: 'mock-italian',
      providerTransactionId: 'fixture',
      revision: 1,
      source: 'bank',
      status: 'booked',
      amountMinor: -1000n,
      currency: 'EUR',
      description: 'Acquisto sintetico',
      observedAt: at,
      kind: 'expense',
      bookedOn: '2026-10-01',
      contentHash: 'synthetic',
    }),
  )
  await handle.close()
  handle = undefined
  await cp(current, snapshot, { recursive: true })
  await cp(sourceStore, staleStore, { recursive: true })
  handle = await openDatabase({ driver: 'pglite', path: current })
  const crypto = new ProfileEncryption(handle.db, keys)
  await handle.withProfile(profileId, (db) =>
    new SourceErasureService(db, profileId, crypto, journal, () => erasedAt).erase(connectionId),
  )
  await handle.close()
  handle = undefined
  const metadata = JSON.parse(
    (
      await cli(
        'journal',
        `--database-path=${current}`,
        `--journal=${journalFile}`,
        `--key-vault=${vault}`,
        `--source-journal=${sourceStore}`,
      )
    ).stdout,
  )
  const flags = [
    `--snapshot=${snapshot}`,
    `--journal=${journalFile}`,
    `--trusted-digest=${metadata.digest}`,
    `--minimum-issued-at=${metadata.issuedAt}`,
    `--key-vault=${vault}`,
  ]
  let missingRefused = false
  try {
    await cli('restore', ...flags, `--restore-path=${join(root, 'missing-current-store')}`)
  } catch {
    missingRefused = true
  }
  if (!missingRefused) throw new Error('Missing current source journal was accepted')
  const rejected = join(root, 'stale-current-store')
  let staleRefused = false
  try {
    await cli('restore', ...flags, `--restore-path=${rejected}`, `--source-journal=${staleStore}`)
  } catch {
    staleRefused = true
  }
  if (!staleRefused) throw new Error('Stale source journal was accepted')
  await readFile(join(rejected, '.lilleri-restore-quarantine'))
  let normalOpenRefused = false
  try {
    handle = await openDatabase({ driver: 'pglite', path: rejected })
  } catch {
    normalOpenRefused = true
  }
  if (!normalOpenRefused) throw new Error('Failed restore was opened normally')
  const restored = join(root, 'released'),
    result = JSON.parse(
      (
        await cli(
          'restore',
          ...flags,
          `--restore-path=${restored}`,
          `--source-journal=${sourceStore}`,
        )
      ).stdout,
    )
  handle = await openDatabase({ driver: 'pglite', path: restored })
  const accounts = await handle.db.select().from(schema.accounts),
    transactions = await handle.db.select().from(schema.transactions)
  if (
    accounts.length !== 1 ||
    accounts[0]?.id !== cashAccountId ||
    transactions.length !== 0 ||
    result.sourceTombstonesReplayed !== 1 ||
    result.revocationsOutstanding !== 1 ||
    result.safeToOpenLocally !== true
  )
    throw new Error('Released restore did not satisfy source erasure')
  const release = JSON.parse(
    await readFile(join(restored, '.lilleri-restore-release.json'), 'utf8'),
  )
  if (release.journalDigest !== metadata.digest)
    throw new Error('Release used a different global journal')
  const report = {
    format: 'lilleri.source-erasure-cli-smoke.v1',
    passed: 5,
    checks: {
      actualOfflineCopy: true,
      missingCurrentSourceJournalRefused: missingRefused,
      staleCurrentSourceJournalQuarantined: staleRefused && normalOpenRefused,
      currentSourceReplayKeepsOtherSource: true,
      releaseDigestAndOutstandingRevocationVerified: true,
    },
  }
  if (process.argv[2])
    await writeFile(process.argv[2], `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 })
  process.stdout.write(`${JSON.stringify(report)}\n`)
} finally {
  journal?.close()
  await handle?.close()
  await rm(root, { recursive: true, force: true })
}
