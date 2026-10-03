import { cp, lstat, mkdir, readdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import {
  cancelConnectionCreationIntents,
  cancelRestoredConnectionCreationIntents,
} from '../apps/api/dist/connection-creation.js'
import {
  deletionJournalDigest,
  exportDeletionJournal,
  replayDeletionJournal,
  verifyDeletionJournal,
} from '../apps/api/dist/deletion-restore.js'
import {
  exportKeyTombstones,
  ProfileEncryption,
  replayKeyTombstones,
} from '../apps/api/dist/encryption.js'
import { createLocalSyntheticKeyManagement } from '../apps/api/dist/encryption-local.js'
import { recoverSourceErasures } from '../apps/api/dist/source-erasure.js'
import { createSourceErasureJournal } from '../apps/api/dist/source-erasure-journal.js'
import { eraseUnderstandingFinancialReferences } from '../apps/api/dist/understanding-persistence.js'
import { openDatabase } from '../packages/database/dist/index.js'

const MAX_JOURNAL_BYTES = 32 * 1024 * 1024
const QUARANTINE = '.lilleri-restore-quarantine'
const RELEASE = '.lilleri-restore-release.json'
function argumentsFrom(input) {
  const [command, ...flags] = input
  if (!['journal', 'restore'].includes(command)) throw new Error('Use journal or restore')
  const result = { command }
  const allowed = new Set([
    'database-path',
    'snapshot',
    'restore-path',
    'journal',
    'trusted-digest',
    'minimum-issued-at',
    'key-vault',
    'source-journal',
  ])
  for (const flag of flags) {
    const match = /^--([a-z-]+)=(.+)$/.exec(flag)
    if (!match || !allowed.has(match[1]) || result[match[1]] !== undefined)
      throw new Error('Unknown, duplicate or empty restoration argument')
    result[match[1]] = match[2]
  }
  const required =
    command === 'journal'
      ? ['database-path', 'journal']
      : ['snapshot', 'restore-path', 'journal', 'trusted-digest', 'minimum-issued-at']
  for (const key of required) if (!result[key]) throw new Error(`Missing --${key}`)
  return result
}
function isWithin(child, parent) {
  const path = relative(resolve(parent), resolve(child))
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
}
async function actualPath(path) {
  try {
    return await realpath(resolve(path))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    return resolve(await realpath(dirname(resolve(path))), basename(path))
  }
}
async function signingSecret() {
  const file = process.env.DELETION_JOURNAL_KEY_FILE
  if (!file)
    throw new Error('DELETION_JOURNAL_KEY_FILE must identify an independent private key file')
  const info = await lstat(file)
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || info.size > 1024)
    throw new Error('Deletion journal key file must be a private regular file')
  const bytes = await readFile(file)
  const value = bytes.length === 32 ? bytes : Buffer.from(bytes.toString('utf8').trim(), 'hex')
  if (
    value.length !== 32 ||
    (bytes.length !== 32 && !/^[a-f0-9]{64}\s*$/i.test(bytes.toString('utf8')))
  )
    throw new Error('Deletion journal key file must contain 32 raw bytes or 64 hex characters')
  return value
}
async function keyHooks(db, vault, sourceDirectory) {
  if (sourceDirectory && !vault)
    throw new Error('Source replay requires the current independent key vault')
  if (!vault) return undefined
  const vaultInfo = await lstat(vault)
  if (!vaultInfo.isDirectory() || vaultInfo.isSymbolicLink())
    throw new Error('The independent current key vault must already exist')
  const keys = await createLocalSyntheticKeyManagement({ directory: resolve(vault), mode: 'demo' })
  const encryption = new ProfileEncryption(db, keys)
  const profiles = await readdir(vault)
  let hasSourceAnchors = false
  for (const name of profiles) {
    if (!/^[a-f0-9]{64}$/.test(name)) throw new Error('Invalid current key vault inventory')
    const location = resolve(vault, name),
      info = await lstat(location)
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Invalid current key vault profile')
    if ((await readdir(location)).some((filename) => filename.startsWith('.source-erasure-')))
      hasSourceAnchors = true
  }
  if (hasSourceAnchors && !sourceDirectory)
    throw new Error('Current independent --source-journal is required by vault anchors')
  const journal = sourceDirectory
    ? await createSourceErasureJournal({
        directory: resolve(sourceDirectory),
        anchorDirectory: resolve(vault),
        keys,
        mode: 'demo',
        requireExisting: true,
      })
    : undefined
  const sources = journal
    ? {
        readCurrent: () => journal.readAll(),
        verifyCurrent: (input) => journal.verifyReceipt(input),
        replayCurrent: (target, at) =>
          recoverSourceErasures(target, journal, encryption, () => at, {
            replayCreationIntents: cancelRestoredConnectionCreationIntents,
            eraseFinancialReferences: (target, input) =>
              eraseUnderstandingFinancialReferences(target, input, encryption),
          }),
      }
    : undefined
  return {
    keys: {
      exportTombstones: exportKeyTombstones,
      replayTombstones: replayKeyTombstones,
      finalizeErasure: (profileId) => encryption.finalizeErasure(profileId),
    },
    sources,
    close: () => journal?.close(),
  }
}
async function main() {
  const args = argumentsFrom(process.argv.slice(2))
  const secret = await signingSecret()
  const keyId = process.env.DELETION_JOURNAL_KEY_ID ?? 'local-deletion-journal-v1'
  const journalPath = await actualPath(args.journal)
  const signingKeyPath = await actualPath(process.env.DELETION_JOURNAL_KEY_FILE)
  const keyVaultPath = args['key-vault'] ? await actualPath(args['key-vault']) : undefined
  const sourceJournalPath = args['source-journal']
    ? await actualPath(args['source-journal'])
    : undefined
  const protectedPaths = [args['database-path'], args.snapshot, args['restore-path']].filter(
    Boolean,
  )
  for (const path of protectedPaths) {
    const directory = await actualPath(path)
    if (isWithin(journalPath, directory) || isWithin(signingKeyPath, directory))
      throw new Error('Journal and signing key must remain outside database snapshots and restores')
    if (sourceJournalPath && isWithin(sourceJournalPath, directory))
      throw new Error(
        'The current source journal must remain outside database snapshots and restores',
      )
    if (keyVaultPath && isWithin(keyVaultPath, directory))
      throw new Error(
        'The current independent key vault must remain outside database snapshots and restores',
      )
  }
  let handle, adapters
  try {
    if (args.command === 'journal') {
      handle = await openDatabase({ driver: 'pglite', path: resolve(args['database-path']) })
      adapters = await keyHooks(handle.db, args['key-vault'], args['source-journal'])
      const journal = await exportDeletionJournal(handle.db, {
        secret,
        keyId,
        keys: adapters?.keys,
        sources: adapters?.sources,
      })
      const contents = `${JSON.stringify(journal, null, 2)}\n`
      if (Buffer.byteLength(contents) > MAX_JOURNAL_BYTES)
        throw new Error('Deletion journal exceeds local size limit')
      // Never overwrite the independently preserved latest journal accidentally.
      await writeFile(journalPath, contents, { flag: 'wx', mode: 0o600 })
      process.stdout.write(
        `${JSON.stringify({ format: 'lilleri.latest-deletion-journal.v1', digest: deletionJournalDigest(journal), issuedAt: journal.body.issuedAt, tombstones: journal.body.deletions.length })}\n`,
      )
      return
    }
    const journalInfo = await lstat(journalPath)
    if (
      !journalInfo.isFile() ||
      journalInfo.isSymbolicLink() ||
      journalInfo.size > MAX_JOURNAL_BYTES
    )
      throw new Error('Deletion journal must be a bounded regular file')
    const journal = JSON.parse(await readFile(journalPath, 'utf8'))
    const verification = {
      secret,
      keyId,
      expectedDigest: args['trusted-digest'],
      minimumIssuedAt: args['minimum-issued-at'],
    }
    verifyDeletionJournal(journal, verification)
    if (journal.body.keyTombstones.length && !args['key-vault'])
      throw new Error('A journal with key tombstones requires the current independent --key-vault')
    if (journal.body.sourceErasures?.length && !args['source-journal'])
      throw new Error('Source erasure intents require current --source-journal')
    const snapshot = resolve(args.snapshot)
    const destination = resolve(args['restore-path'])
    if (isWithin(destination, snapshot) || isWithin(snapshot, destination))
      throw new Error('Snapshot and restore directories must be separate')
    const snapshotInfo = await lstat(snapshot)
    if (!snapshotInfo.isDirectory() || snapshotInfo.isSymbolicLink())
      throw new Error('Snapshot must be an offline regular PGlite directory')
    await mkdir(destination)
    await writeFile(
      resolve(destination, QUARANTINE),
      'Authenticated deletion replay has not completed. Do not start API or workers.\n',
      { flag: 'wx', mode: 0o600 },
    )
    await cp(snapshot, destination, { recursive: true, force: false, errorOnExist: true })
    handle = await openDatabase({ driver: 'pglite', path: destination, restoreQuarantine: true })
    adapters = await keyHooks(handle.db, args['key-vault'], args['source-journal'])
    const result = await replayDeletionJournal(handle.db, journal, {
      ...verification,
      keys: adapters?.keys,
      sources: adapters?.sources,
      beforeProfileErasure: (db, pid, at) =>
        cancelConnectionCreationIntents(db, pid, at).then(() => undefined),
    })
    await handle.close()
    handle = undefined
    await writeFile(resolve(destination, RELEASE), `${JSON.stringify(result, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    })
    await unlink(resolve(destination, QUARANTINE))
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } finally {
    secret.fill(0)
    adapters?.close()
    await handle?.close()
  }
}
main().catch(() => {
  // Do not echo JSON parse/schema details: journal files and paths are not log payloads.
  process.stderr.write(
    'Local deletion-aware operation failed; a created restore remains quarantined. Check the documented arguments and independent journal/key material.\n',
  )
  process.exitCode = 1
})
