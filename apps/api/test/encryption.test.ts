import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { chmod, lstat, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  type EncryptionContext,
  EncryptionFailure,
  exportKeyTombstones,
  type KeyManagementPort,
  ProfileEncryption,
  replayKeyTombstones,
} from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { profileEncryptionKeys, profileKeyTombstones } from '../src/encryption-schema.js'

let handle: DatabaseHandle
let directory: string
let keys: KeyManagementPort
let encryption: ProfileEncryption
const profiles: string[] = []
const now = () => '2026-10-03T12:00:00.000Z'
const secret = 'Descrizione sintetica privata · perché 🔐 € 12,34'

async function fixture(): Promise<EncryptionContext> {
  const profileId = `encryption_${randomUUID()}`
  profiles.push(profileId)
  await handle.db.insert(schema.profiles).values({
    id: profileId,
    name: 'Profilo sintetico',
    timezone: 'Europe/Rome',
    createdAt: now(),
  })
  return { profileId, table: 'transactions', column: 'description', rowId: `tx_${randomUUID()}` }
}
function vaultProfile(profileId: string, root = directory) {
  const token = createHash('sha256')
    .update('lilleri-local-vault-profile-v1\0')
    .update(profileId)
    .digest('hex')
  return join(root, token)
}
function editEnvelope(cipher: string, edit: (record: Record<string, string>) => void): string {
  const record = JSON.parse(Buffer.from(cipher.slice('lilleri:v1:'.length), 'base64url').toString())
  edit(record)
  return `lilleri:v1:${Buffer.from(JSON.stringify(record)).toString('base64url')}`
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  directory = await mkdtemp(join(tmpdir(), 'lilleri-key-vault-'))
  keys = await createLocalSyntheticKeyManagement({ directory, mode: 'demo' })
  encryption = new ProfileEncryption(handle.db, keys, now)
})
afterAll(async () => {
  if (handle) {
    for (const id of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
    await handle.close()
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})

describe('local synthetic envelope encryption and independent key lifecycle', () => {
  test('AES-GCM randomizes repeated plaintext, preserves UTF-8 and stores only a wrapped DEK', async () => {
    const context = await fixture()
    const [first, second] = await handle.db.transaction(async (tx) => [
      await encryption.encryptText(tx, context, secret),
      await encryption.encryptText(tx, context, secret),
    ])
    expect(first).not.toBe(second)
    expect(first).not.toContain(secret)
    expect(await encryption.decryptText(handle.db, context, first as string)).toBe(secret)
    const [stored] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, context.profileId))
    expect(stored?.wrappedKey).toMatch(/^lilleri-dek:v1:/)
    expect(JSON.stringify(stored)).not.toContain(secret)
    expect(Object.keys(stored ?? {}).sort()).toEqual([
      'createdAt',
      'keyId',
      'profileId',
      'wrappedKey',
    ])
  })

  test('profile, table, column and row AAD each reject a transplanted ciphertext', async () => {
    const context = await fixture()
    const other = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    await handle.db.transaction((tx) => encryption.encryptText(tx, other, 'Altro profilo'))
    for (const changed of [
      { ...context, profileId: other.profileId },
      { ...context, table: 'accounts' },
      { ...context, column: 'reference' },
      { ...context, rowId: 'different-row' },
    ])
      await expect(encryption.decryptText(handle.db, changed, cipher)).rejects.toThrow(
        EncryptionFailure,
      )
    expect(await encryption.decryptText(handle.db, context, cipher)).toBe(secret)
  })

  test('tampering with nonce, payload or authentication tag fails without returning any plaintext', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    for (const field of ['nonce', 'ciphertext', 'tag']) {
      const corrupt = editEnvelope(cipher, (record) => {
        const original = record[field] as string
        record[field] = `${original[0] === 'A' ? 'B' : 'A'}${original.slice(1)}`
      })
      await expect(encryption.decryptText(handle.db, context, corrupt)).rejects.toEqual(
        new EncryptionFailure(),
      )
    }
  })

  test('unknown versions, legacy plaintext, extra keys and noncanonical base64 are rejected', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    for (const invalid of [
      secret,
      cipher.replace('lilleri:v1:', 'lilleri:v2:'),
      `${cipher}=`,
      'lilleri:v1:invalid-encoding',
      editEnvelope(cipher, (record) => {
        record.unexpected = 'x'
      }),
    ])
      await expect(encryption.decryptText(handle.db, context, invalid)).rejects.toEqual(
        new EncryptionFailure(),
      )
  })

  test('blind indexes are stable but separated by profile, table and column', async () => {
    const context = await fixture()
    const other = await fixture()
    const first = await handle.db.transaction((tx) =>
      encryption.blindIndex(tx, context, 'IT00SYNTHETIC'),
    )
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(await encryption.blindIndex(handle.db, context, 'IT00SYNTHETIC')).toBe(first)
    const different = await handle.db.transaction(async (tx) => [
      await encryption.blindIndex(tx, other, 'IT00SYNTHETIC'),
      await encryption.blindIndex(tx, { ...context, table: 'accounts' }, 'IT00SYNTHETIC'),
      await encryption.blindIndex(tx, { ...context, column: 'reference' }, 'IT00SYNTHETIC'),
      await encryption.blindIndex(tx, context, 'it00synthetic'),
    ])
    expect(new Set([first, ...different]).size).toBe(5)
  })

  test('transaction storage mapping encrypts designated text without changing exact financial values', async () => {
    const context = await fixture()
    const row: typeof schema.transactions.$inferSelect = {
      id: context.rowId,
      profileId: context.profileId,
      accountId: 'account-synthetic',
      connectionId: 'connection-synthetic',
      providerId: 'provider-synthetic',
      providerTransactionId: 'provider-row-synthetic',
      revision: 2,
      source: 'manual',
      status: 'booked',
      amountMinor: -9_223_372_036_854_775_808n,
      currency: 'EUR',
      description: secret,
      merchantName: 'Esercente sintetico',
      merchantKey: 'synthetic-merchant-key',
      bookedOn: '2026-10-03',
      authorizedOn: null,
      observedAt: now(),
      kind: 'expense',
      reference: null,
      relatedTransactionId: null,
      relatedAccountId: null,
      contentHash: 'synthetic-content-hash',
    }
    const encrypted = await handle.db.transaction((tx) => encryption.encryptTransactionRow(tx, row))
    expect(encrypted.description).not.toBe(row.description)
    expect(encrypted.merchantName).not.toBe(row.merchantName)
    expect(encrypted.reference).toBeNull()
    expect(encrypted.amountMinor).toBe(row.amountMinor)
    expect(
      await encryption.decryptTransactionRow(
        handle.db,
        encrypted as typeof schema.transactions.$inferSelect,
      ),
    ).toEqual(row)
  })

  test('JSON payloads preserve values and reject unserializable or oversized data with safe errors', async () => {
    const context = { ...(await fixture()), table: 'observation_payloads', column: 'payload' }
    const original = { description: secret, count: 1, empty: null, nested: ['synthetic'] }
    const cipher = await handle.db.transaction((tx) =>
      encryption.encryptJson(tx, context, original),
    )
    expect(await encryption.decryptJson(handle.db, context, cipher)).toEqual(original)
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    for (const invalid of [undefined, cycle, { bigint: 1n }])
      await expect(encryption.encryptJson(handle.db, context, invalid)).rejects.toEqual(
        new EncryptionFailure(),
      )
    await expect(encryption.encryptText(handle.db, context, 'x'.repeat(1_048_577))).rejects.toEqual(
      new EncryptionFailure(),
    )
  })

  test('rolling back staged financial erasure preserves the key and recoverable financial text', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    await expect(
      handle.db.transaction(async (tx) => {
        await encryption.stageErasure(tx, context.profileId)
        await tx.delete(schema.profiles).where(eq(schema.profiles.id, context.profileId))
        throw new Error('Synthetic identity cleanup failure')
      }),
    ).rejects.toThrow('Synthetic identity cleanup failure')
    expect(await encryption.decryptText(handle.db, context, cipher)).toBe(secret)
    expect(
      await handle.db
        .select()
        .from(profileKeyTombstones)
        .where(eq(profileKeyTombstones.profileId, context.profileId)),
    ).toHaveLength(0)
  })

  test('staging fences reads immediately and a failed after-commit destruction is retried durably', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    await handle.db.transaction((tx) => encryption.stageErasure(tx, context.profileId))
    await expect(encryption.decryptText(handle.db, context, cipher)).rejects.toThrow(
      EncryptionFailure,
    )
    const failing: KeyManagementPort = {
      kind: 'local-synthetic',
      create: (id, key) => keys.create(id, key),
      unwrap: (id, keyId, wrapped) => keys.unwrap(id, keyId, wrapped),
      discardCandidate: (id, keyId) => keys.discardCandidate(id, keyId),
      destroyProfile: async () => {
        throw new Error('Synthetic temporary key-provider outage')
      },
    }
    const unavailable = new ProfileEncryption(handle.db, failing, now)
    await expect(unavailable.finalizeErasure(context.profileId)).rejects.toThrow()
    const failedRecovery = await unavailable.recoverPendingErasures()
    expect(failedRecovery.completed).toBe(0)
    expect(failedRecovery.pending).toBeGreaterThanOrEqual(1)
    const [stillPending] = await handle.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, context.profileId))
    expect(stillPending?.destroyedAt).toBeNull()
    // PostgreSQL integration files share an archive while using independent synthetic vaults.
    // Recovery is global in production; this test adapter must never finalize another file's intent.
    const ownedRecovery = new ProfileEncryption(
      handle.db,
      {
        ...failing,
        destroyProfile: async (profileId, expectedKeyId) => {
          if (profileId !== context.profileId)
            throw new Error('Synthetic key belongs to another integration vault')
          await keys.destroyProfile(profileId, expectedKeyId)
        },
      },
      now,
    )
    expect((await ownedRecovery.recoverPendingErasures()).completed).toBe(1)
    const [tombstone] = await handle.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, context.profileId))
    expect(tombstone?.destroyedAt).toBe(now())
    expect(await readdir(vaultProfile(context.profileId))).toEqual(['.destroyed'])
    await expect(encryption.decryptText(handle.db, context, cipher)).rejects.toThrow(
      EncryptionFailure,
    )
  })

  test('a wrongly configured vault cannot certify destruction while the original vault still decrypts an old backup', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    const [backup] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, context.profileId))
    if (!backup) throw new Error('Synthetic original key missing')
    const wrongDirectory = await mkdtemp(join(tmpdir(), 'lilleri-wrong-key-vault-'))
    const restored = await openDatabase({ driver: 'pglite' })
    try {
      await restored.db.insert(schema.profiles).values({
        id: context.profileId,
        name: 'Restored synthetic original vault proof',
        timezone: 'Europe/Rome',
        createdAt: now(),
      })
      await restored.db.insert(profileEncryptionKeys).values(backup)
      const backupReader = new ProfileEncryption(restored.db, keys, now)
      await handle.db.transaction((tx) => encryption.stageErasure(tx, context.profileId))
      const wrong = new ProfileEncryption(
        handle.db,
        await createLocalSyntheticKeyManagement({ directory: wrongDirectory, mode: 'demo' }),
        now,
      )
      await expect(wrong.finalizeErasure(context.profileId)).rejects.toThrow(EncryptionFailure)
      const [intent] = await handle.db
        .select()
        .from(profileKeyTombstones)
        .where(eq(profileKeyTombstones.profileId, context.profileId))
      expect(intent?.destroyedAt).toBeNull()
      expect(await readdir(vaultProfile(context.profileId, wrongDirectory))).toEqual([])
      expect(await backupReader.decryptText(restored.db, context, cipher)).toBe(secret)
      await encryption.finalizeErasure(context.profileId)
      expect(await readdir(vaultProfile(context.profileId))).toEqual(['.destroyed'])
      await expect(backupReader.decryptText(restored.db, context, cipher)).rejects.toThrow(
        EncryptionFailure,
      )
      const [finished] = await handle.db
        .select()
        .from(profileKeyTombstones)
        .where(eq(profileKeyTombstones.profileId, context.profileId))
      expect(finished?.destroyedAt).toBe(now())
    } finally {
      await restored.close()
      await rm(wrongDirectory, { recursive: true, force: true })
    }
  })

  test('a restored database key row cannot decrypt after the independently persisted key is destroyed', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    const [backup] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, context.profileId))
    if (!backup) throw new Error('Synthetic key fixture missing')
    await handle.db.transaction((tx) => encryption.stageErasure(tx, context.profileId))
    await encryption.finalizeErasure(context.profileId)
    // Restore an old database to a separate instance, keeping the CURRENT independent vault.
    const restored = await openDatabase({ driver: 'pglite' })
    try {
      await restored.db.insert(schema.profiles).values({
        id: context.profileId,
        name: 'Restored synthetic profile',
        timezone: 'Europe/Rome',
        createdAt: now(),
      })
      await restored.db.insert(profileEncryptionKeys).values(backup)
      const currentVault = await createLocalSyntheticKeyManagement({ directory, mode: 'demo' })
      const reader = new ProfileEncryption(restored.db, currentVault, now)
      await expect(reader.decryptText(restored.db, context, cipher)).rejects.toEqual(
        new EncryptionFailure(),
      )
      await expect(
        currentVault.unwrap(context.profileId, backup.keyId, backup.wrappedKey),
      ).rejects.toEqual(new EncryptionFailure())
      await expect(currentVault.create(context.profileId, randomBytes(32))).rejects.toEqual(
        new EncryptionFailure(),
      )
    } finally {
      await restored.close()
    }
  })

  test('export/replay is idempotent and monotonic, and forbids changing or removing tombstones', async () => {
    const context = await fixture()
    await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    await handle.db.transaction((tx) => encryption.stageErasure(tx, context.profileId))
    await encryption.finalizeErasure(context.profileId)
    const entries = (await exportKeyTombstones(handle.db)).filter(
      (entry) => entry.profileId === context.profileId,
    )
    expect(entries).toHaveLength(1)
    expect(JSON.stringify(entries)).not.toContain('wrappedKey')
    await handle.db.transaction((tx) => replayKeyTombstones(tx, entries))
    await handle.db.transaction((tx) => replayKeyTombstones(tx, entries))
    await expect(
      handle.db
        .update(profileKeyTombstones)
        .set({ destroyedAt: null })
        .where(eq(profileKeyTombstones.profileId, context.profileId)),
    ).rejects.toThrow()
    await expect(
      handle.db
        .delete(profileKeyTombstones)
        .where(eq(profileKeyTombstones.profileId, context.profileId)),
    ).rejects.toThrow()
    expect(
      (await exportKeyTombstones(handle.db)).filter((row) => row.profileId === context.profileId),
    ).toEqual(entries)
  })

  test('reopening the current private vault preserves live keys and refuses unsafe filesystem permissions', async () => {
    const context = await fixture()
    const cipher = await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    const provider = await createLocalSyntheticKeyManagement({ directory, mode: 'local-auth' })
    expect(
      await new ProfileEncryption(handle.db, provider, now).decryptText(handle.db, context, cipher),
    ).toBe(secret)
    const [stored] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, context.profileId))
    const file = join(vaultProfile(context.profileId), `${stored?.keyId}.key`)
    expect((await lstat(directory)).mode & 0o077).toBe(0)
    expect((await lstat(file)).mode & 0o077).toBe(0)
    await chmod(file, 0o644)
    await expect(
      provider.unwrap(context.profileId, stored?.keyId as string, stored?.wrappedKey as string),
    ).rejects.toThrow(EncryptionFailure)
    await chmod(file, 0o600)
    await expect(
      createLocalSyntheticKeyManagement({ directory, mode: 'production' as 'demo' }),
    ).rejects.toEqual(new EncryptionFailure())
  })

  test('startup cleans a crash-left key behind an irreversible marker and rejects symlink key files', async () => {
    const context = await fixture()
    await handle.db.transaction((tx) => encryption.encryptText(tx, context, secret))
    const [stored] = await handle.db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, context.profileId))
    if (!stored) throw new Error('Synthetic key fixture missing')
    const file = join(vaultProfile(context.profileId), `${stored.keyId}.key`)
    const target = join(directory, 'synthetic-symlink-target')
    await writeFile(target, randomBytes(32), { mode: 0o600 })
    await rm(file)
    await symlink(target, file)
    await expect(keys.unwrap(context.profileId, stored.keyId, stored.wrappedKey)).rejects.toThrow(
      EncryptionFailure,
    )
    await rm(file)
    await rm(target)
    await writeFile(file, randomBytes(32), { mode: 0o600 })
    await writeFile(
      join(vaultProfile(context.profileId), '.destroyed'),
      'lilleri-local-profile-destroyed-v1\n',
      { mode: 0o600 },
    )
    const restarted = await createLocalSyntheticKeyManagement({ directory, mode: 'demo' })
    expect(await readdir(vaultProfile(context.profileId))).toEqual(['.destroyed'])
    await expect(
      restarted.unwrap(context.profileId, stored.keyId, stored.wrappedKey),
    ).rejects.toThrow(EncryptionFailure)
  })
})
