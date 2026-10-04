import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { cancelRestoredConnectionCreationIntents } from '../apps/api/dist/connection-creation.js'
import {
  exportKeyTombstones,
  ProfileEncryption,
  replayKeyTombstones,
} from '../apps/api/dist/encryption.js'
import { createLocalSyntheticKeyManagement } from '../apps/api/dist/encryption-local.js'
import { recoverSourceErasures } from '../apps/api/dist/source-erasure.js'
import { createSourceErasureJournal } from '../apps/api/dist/source-erasure-journal.js'
import { eraseUnderstandingFinancialReferences } from '../apps/api/dist/understanding-persistence.js'
import { existingDirectory } from './postgres-operations-lib.mjs'

export async function recoveryHooks(db, vault, sourceDirectory) {
  await existingDirectory(vault)
  await existingDirectory(sourceDirectory)
  for (const entry of await readdir(vault)) {
    if (!/^[a-f0-9]{64}$/.test(entry)) throw new Error('Invalid current vault inventory')
    await existingDirectory(resolve(vault, entry))
  }
  const keys = await createLocalSyntheticKeyManagement({ directory: resolve(vault), mode: 'demo' })
  const encryption = new ProfileEncryption(db, keys)
  const journal = await createSourceErasureJournal({
    directory: resolve(sourceDirectory),
    anchorDirectory: resolve(vault),
    keys,
    mode: 'demo',
    requireExisting: true,
  })
  return {
    keys: {
      exportTombstones: exportKeyTombstones,
      replayTombstones: replayKeyTombstones,
      finalizeErasure: (profileId) => encryption.finalizeErasure(profileId),
    },
    sources: {
      readCurrent: () => journal.readAll(),
      verifyCurrent: (input) => journal.verifyReceipt(input),
      replayCurrent: (target, at) =>
        recoverSourceErasures(target, journal, encryption, () => at, {
          replayCreationIntents: cancelRestoredConnectionCreationIntents,
          eraseFinancialReferences: (target, input) =>
            eraseUnderstandingFinancialReferences(target, input, encryption),
        }),
    },
    close: () => journal.close(),
  }
}
