import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { EncryptionFailure, ProfileEncryption } from '../src/encryption.js'
import {
  createLocalSyntheticKeyManagement,
  createSealedVolumeKeyManagement,
  hostedVaultMasterKey,
} from '../src/encryption-local.js'
import { createSourceErasureJournal } from '../src/source-erasure-journal.js'

let handle: DatabaseHandle
const directories: string[] = []
const profiles: string[] = []
const now = () => '2026-10-05T12:00:00.000Z'

async function temporary(prefix: string) {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  directories.push(directory)
  return directory
}
async function profile() {
  const id = `hosted_vault_${randomUUID()}`
  profiles.push(id)
  await handle.db
    .insert(schema.profiles)
    .values({ id, name: 'Profilo', timezone: 'Europe/Rome', createdAt: now() })
  return id
}
function vaultDirectory(root: string, profileId: string) {
  return join(
    root,
    createHash('sha256').update('lilleri-local-vault-profile-v1\0').update(profileId).digest('hex'),
  )
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  if (handle) {
    for (const id of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.close()
  }
  for (const directory of directories) await rm(directory, { recursive: true, force: true })
})

describe('hosted sealed volume vault', () => {
  test('master key decoding accepts only 32 random bytes in canonical base64url', () => {
    const key = randomBytes(32)
    expect(hostedVaultMasterKey(key.toString('base64url')).equals(key)).toBe(true)
    for (const invalid of [
      undefined,
      '',
      randomBytes(31).toString('base64url'),
      randomBytes(33).toString('base64url'),
      `${randomBytes(32).toString('base64url')}=`,
      randomBytes(32).toString('base64'),
      Buffer.alloc(32, 7).toString('base64url'),
    ])
      expect(() => hostedVaultMasterKey(invalid)).toThrow(EncryptionFailure)
  })

  test('wrapping keys are sealed at rest and decrypt only with the same master key', async () => {
    const directory = await temporary('lilleri-sealed-vault-')
    const masterKey = randomBytes(32)
    const keys = await createSealedVolumeKeyManagement({ directory, masterKey })
    expect(keys.kind).toBe('sealed-volume')
    const encryption = new ProfileEncryption(handle.db, keys, now)
    const profileId = await profile()
    const context = { profileId, table: 'transactions', column: 'description', rowId: 'tx_1' }
    const cipher = await handle.db.transaction((tx) =>
      encryption.encryptText(tx, context, 'Spesa privata €12,34'),
    )
    expect(await encryption.decryptText(handle.db, context, cipher)).toBe('Spesa privata €12,34')
    const files = (await readdir(vaultDirectory(directory, profileId))).filter((name) =>
      name.endsWith('.key'),
    )
    expect(files).toHaveLength(1)
    const stored = await readFile(join(vaultDirectory(directory, profileId), files[0] as string))
    // nonce + sealed 32-byte wrapping key + tag; never the raw wrapping key
    expect(stored.length).toBe(60)

    const otherMaster = await createSealedVolumeKeyManagement({
      directory,
      masterKey: randomBytes(32),
    })
    await expect(
      new ProfileEncryption(handle.db, otherMaster, now).decryptText(handle.db, context, cipher),
    ).rejects.toThrow(EncryptionFailure)
    // A synthetic vault pointed at sealed files cannot use them either.
    const synthetic = await createLocalSyntheticKeyManagement({ directory, mode: 'demo' })
    await expect(
      new ProfileEncryption(handle.db, synthetic, now).decryptText(handle.db, context, cipher),
    ).rejects.toThrow(EncryptionFailure)
  })

  test('profile destruction removes sealed keys irreversibly', async () => {
    const directory = await temporary('lilleri-sealed-destroy-')
    const keys = await createSealedVolumeKeyManagement({ directory, masterKey: randomBytes(32) })
    const encryption = new ProfileEncryption(handle.db, keys, now)
    const profileId = await profile()
    const context = { profileId, table: 'transactions', column: 'description', rowId: 'tx_2' }
    const cipher = await handle.db.transaction((tx) =>
      encryption.encryptText(tx, context, 'Da cancellare'),
    )
    await keys.destroyProfile(profileId)
    const remaining = await readdir(vaultDirectory(directory, profileId))
    expect(remaining.filter((name) => name.endsWith('.key'))).toEqual([])
    await expect(encryption.decryptText(handle.db, context, cipher)).rejects.toThrow(
      EncryptionFailure,
    )
  })

  test('the erasure journal pairs hosted mode only with the sealed vault', async () => {
    const vault = await temporary('lilleri-sealed-journal-vault-')
    const journal = await temporary('lilleri-sealed-journal-')
    const sealed = await createSealedVolumeKeyManagement({
      directory: vault,
      masterKey: randomBytes(32),
    })
    const opened = await createSourceErasureJournal({
      directory: join(journal, 'journal'),
      anchorDirectory: vault,
      keys: sealed,
      mode: 'hosted',
    })
    opened.close()
    const syntheticVault = await temporary('lilleri-synthetic-journal-vault-')
    const synthetic = await createLocalSyntheticKeyManagement({
      directory: syntheticVault,
      mode: 'demo',
    })
    await expect(
      createSourceErasureJournal({
        directory: join(journal, 'synthetic-journal'),
        anchorDirectory: syntheticVault,
        keys: synthetic,
        mode: 'hosted',
      }),
    ).rejects.toThrow()
    await expect(
      createSourceErasureJournal({
        directory: join(journal, 'demo-journal'),
        anchorDirectory: vault,
        keys: sealed,
        mode: 'demo',
      }),
    ).rejects.toThrow()
  })
})
