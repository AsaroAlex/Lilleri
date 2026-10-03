import { randomBytes, randomUUID } from 'node:crypto'
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  createDeletionCertificate,
  deletionJournalDigest,
  exportDeletionJournal,
  replayDeletionJournal,
  signDeletionJournal,
  verifyDeletionJournal,
} from '../src/deletion-restore.js'
import { ProfileEncryption, replayKeyTombstones } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import * as identity from '../src/identity-schema.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle
const profileIds: string[] = []
const secret = randomBytes(32)
const keyId = 'local-drill-signing-v1'
const erasedAt = '2026-10-03T10:00:00.000Z'
const issuedAt = '2026-10-03T10:01:00.000Z'
const provider = new MockItalianProvider()
const minimal = () => ({
  format: 'lilleri.deletion-journal.v1' as const,
  issuedAt,
  deletions: [{ profileId: 'opaque_profile', erasedAt }],
  keyTombstones: [],
  revocations: [],
})
const verification = (journal: ReturnType<typeof signDeletionJournal>) => ({
  secret,
  keyId,
  expectedDigest: deletionJournalDigest(journal),
  minimumIssuedAt: issuedAt,
  now: () => issuedAt,
})
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  if (!handle) return
  for (const profileId of profileIds) {
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    await handle.db
      .delete(schema.profileTombstones)
      .where(eq(schema.profileTombstones.profileId, profileId))
    await handle.db
      .delete(schema.revocationJobs)
      .where(eq(schema.revocationJobs.profileId, profileId))
  }
  await handle.close()
})

describe('authenticated local deletion-aware restoration', () => {
  test('authenticates strict journal bytes and refuses changed content, keys and unknown fields', () => {
    const journal = signDeletionJournal(minimal(), secret, keyId)
    expect(verifyDeletionJournal(journal, verification(journal))).toEqual(journal)
    expect(() =>
      verifyDeletionJournal(
        { ...journal, body: { ...journal.body, issuedAt: '2026-10-03T11:00:00.000Z' } },
        verification(journal),
      ),
    ).toThrow('authentication failed')
    expect(() =>
      verifyDeletionJournal(journal, { ...verification(journal), secret: randomBytes(32) }),
    ).toThrow('authentication failed')
    expect(() =>
      verifyDeletionJournal({ ...journal, email: 'synthetic@example.test' }, verification(journal)),
    ).toThrow()
    expect(() => signDeletionJournal(minimal(), randomBytes(16), keyId)).toThrow('too short')
  })

  test('refuses an older valid signed journal using an independently supplied current digest', () => {
    const old = signDeletionJournal(minimal(), secret, keyId)
    const current = signDeletionJournal(
      { ...minimal(), issuedAt: '2026-10-03T11:00:00.000Z' },
      secret,
      keyId,
    )
    expect(() => verifyDeletionJournal(old, verification(current))).toThrow('latest version')
    expect(() =>
      verifyDeletionJournal(old, {
        ...verification(old),
        minimumIssuedAt: '2026-10-03T11:00:00.000Z',
      }),
    ).toThrow('older than')
  })

  test('rejects duplicate, unrelated and non-opaque profile/key records before writes', async () => {
    expect(() =>
      signDeletionJournal(
        { ...minimal(), deletions: [...minimal().deletions, ...minimal().deletions] },
        secret,
        keyId,
      ),
    ).toThrow('Duplicate')
    expect(() =>
      signDeletionJournal(
        {
          ...minimal(),
          keyTombstones: [
            { profileId: 'unrelated', keyId: null, stagedAt: erasedAt, destroyedAt: null },
          ],
        },
        secret,
        keyId,
      ),
    ).toThrow('unrelated')
    expect(() =>
      signDeletionJournal(
        { ...minimal(), deletions: [{ profileId: 'person@example.test', erasedAt }] },
        secret,
        keyId,
      ),
    ).toThrow()
    const id = `restore_invalid_${randomUUID()}`
    profileIds.push(id)
    await new DemoService(handle.db, id, provider, () => erasedAt).bootstrap()
    const journal = signDeletionJournal(
      { ...minimal(), deletions: [{ profileId: id, erasedAt }] },
      secret,
      keyId,
    )
    await expect(
      replayDeletionJournal(handle.db, journal, {
        ...verification(journal),
        expectedDigest: '0'.repeat(64),
      }),
    ).rejects.toThrow('latest version')
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, id)),
    ).toHaveLength(1)
  })

  test('replay rolls back profile, tombstone and auth changes when the key transaction adapter fails', async () => {
    const id = `restore_rollback_${randomUUID()}`
    profileIds.push(id)
    await new DemoService(handle.db, id, provider, () => erasedAt).bootstrap()
    const journal = signDeletionJournal(
      {
        ...minimal(),
        deletions: [{ profileId: id, erasedAt }],
        keyTombstones: [
          { profileId: id, keyId: 'synthetic_key', stagedAt: erasedAt, destroyedAt: null },
        ],
      },
      secret,
      keyId,
    )
    await expect(
      replayDeletionJournal(handle.db, journal, {
        ...verification(journal),
        keys: {
          replayTombstones: async () => {
            throw new Error('synthetic key transaction fault')
          },
          finalizeErasure: async () => {},
        },
      }),
    ).rejects.toThrow('synthetic key transaction fault')
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, id)),
    ).toHaveLength(1)
    expect(
      await handle.db
        .select()
        .from(schema.profileTombstones)
        .where(eq(schema.profileTombstones.profileId, id)),
    ).toHaveLength(0)
  })

  test('a failed independent key destruction withholds restore release and keeps financial tombstones', async () => {
    const id = `restore_key_failure_${randomUUID()}`
    profileIds.push(id)
    await new DemoService(handle.db, id, provider, () => erasedAt).bootstrap()
    const journal = signDeletionJournal(
      {
        ...minimal(),
        deletions: [{ profileId: id, erasedAt }],
        keyTombstones: [
          { profileId: id, keyId: 'synthetic_key', stagedAt: erasedAt, destroyedAt: null },
        ],
      },
      secret,
      keyId,
    )
    await expect(
      replayDeletionJournal(handle.db, journal, {
        ...verification(journal),
        keys: {
          replayTombstones: async () => {},
          finalizeErasure: async () => {
            throw new Error('synthetic independent vault fault')
          },
        },
      }),
    ).rejects.toThrow('synthetic independent vault fault')
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, id)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(schema.profileTombstones)
        .where(eq(schema.profileTombstones.profileId, id)),
    ).toHaveLength(1)
  })

  test('certificate refuses uncommitted erasure and honestly reports pending provider/key proof', async () => {
    const id = `certificate_${randomUUID()}`
    profileIds.push(id)
    const service = new DemoService(handle.db, id, provider, () => erasedAt)
    await service.bootstrap(true)
    await expect(createDeletionCertificate(handle.db, id)).rejects.toThrow('committed tombstone')
    await service.erase()
    const certificate = await createDeletionCertificate(handle.db, id, {
      now: () => issuedAt,
      keyErasure: 'pending',
    })
    expect(certificate.localFinancialDeletion).toBe('completed')
    expect(certificate.providerRevocations.outstanding).toBeGreaterThan(0)
    expect(certificate.keyErasure).toBe('pending')
    expect(certificate.externalProcessors).toBe('not_verified')
    expect(JSON.stringify(certificate)).not.toContain(id)
  })

  test('actual stale PGlite directory restore replays latest deletion, erases identity, retains revocations and blocks reseeding', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-deletion-restore-'))
    const source = join(directory, 'source')
    const snapshot = join(directory, 'backup-before-erasure')
    const restored = join(directory, 'restored-quarantined')
    const id = `restore_drill_${randomUUID()}`
    const userId = `restore_user_${randomUUID()}`
    let original: DatabaseHandle | undefined
    let recovery: DatabaseHandle | undefined
    try {
      original = await openDatabase({ driver: 'pglite', path: source })
      await new DemoService(original.db, id, provider, () => erasedAt).bootstrap(true)
      await original.db.insert(identity.user).values({
        id: userId,
        name: 'Synthetic restore user',
        email: `${userId}@example.test`,
        createdAt: new Date(erasedAt),
        updatedAt: new Date(erasedAt),
        adultAttested: true,
        termsVersion: 'synthetic',
      })
      await original.db
        .insert(identity.memberships)
        .values({ userId, profileId: id, role: 'owner', createdAt: new Date(erasedAt) })
      await original.db.insert(identity.session).values({
        id: `session_${userId}`,
        userId,
        token: randomUUID(),
        expiresAt: new Date('2026-10-04T10:00:00.000Z'),
        createdAt: new Date(erasedAt),
        updatedAt: new Date(erasedAt),
      })
      await original.db.insert(identity.verification).values({
        id: `verification_${userId}`,
        identifier: 'synthetic-reset',
        value: 'synthetic-only-token',
        expiresAt: new Date('2026-10-04T10:00:00.000Z'),
        createdAt: new Date(erasedAt),
        updatedAt: new Date(erasedAt),
      })
      await original.close()
      original = undefined
      await cp(source, snapshot, { recursive: true, errorOnExist: true, force: false })
      original = await openDatabase({ driver: 'pglite', path: source })
      await new DemoService(original.db, id, provider, () => erasedAt).erase(async (tx) => {
        await tx.delete(identity.user).where(eq(identity.user.id, userId))
      })
      const currentJournal = await exportDeletionJournal(original.db, {
        secret,
        keyId,
        now: () => issuedAt,
      })
      expect(currentJournal.body.deletions).toEqual([{ profileId: id, erasedAt }])
      expect(currentJournal.body.revocations.length).toBeGreaterThan(0)
      expect(JSON.stringify(currentJournal)).not.toContain('Synthetic restore user')
      expect(JSON.stringify(currentJournal)).not.toContain('@example.test')
      await cp(snapshot, restored, { recursive: true, errorOnExist: true, force: false })
      const quarantine = join(restored, '.lilleri-restore-quarantine')
      await writeFile(quarantine, 'Replay required', { mode: 0o600 })
      await expect(openDatabase({ driver: 'pglite', path: restored })).rejects.toThrow(
        'quarantined',
      )
      recovery = await openDatabase({ driver: 'pglite', path: restored, restoreQuarantine: true })
      expect(await recovery.db.select().from(schema.transactions)).toHaveLength(35)
      expect(await recovery.db.select().from(identity.user)).toHaveLength(1)
      const result = await replayDeletionJournal(
        recovery.db,
        currentJournal,
        verification(currentJournal),
      )
      expect(result.restoredProfilesRemoved).toBe(1)
      expect(result.restoredIdentityUsersRemoved).toBe(1)
      expect(result.revocationsOutstanding).toBeGreaterThan(0)
      expect(result.keyErasure).toBe('not_configured')
      for (const table of [
        schema.profiles,
        schema.connections,
        schema.consents,
        schema.accounts,
        schema.transactions,
        schema.observations,
        schema.observationPayloads,
        identity.user,
        identity.session,
        identity.verification,
        identity.memberships,
      ])
        expect(await recovery.db.select().from(table)).toHaveLength(0)
      const reseed = new DemoService(recovery.db, id, provider, () => issuedAt)
      await reseed.bootstrap(true)
      expect(await recovery.db.select().from(schema.profiles)).toHaveLength(0)
      const repeated = await replayDeletionJournal(
        recovery.db,
        currentJournal,
        verification(currentJournal),
      )
      expect(repeated.restoredProfilesRemoved).toBe(0)
      expect(repeated.revocationsOutstanding).toBe(result.revocationsOutstanding)
      await recovery.close()
      recovery = undefined
      await rm(quarantine)
      recovery = await openDatabase({ driver: 'pglite', path: restored })
      expect(await recovery.db.select().from(schema.profiles)).toHaveLength(0)
    } finally {
      await recovery?.close()
      await original?.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 90_000)

  test('stale wrapped keys and ciphertext stay undecryptable with the current independent local vault', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-key-restore-'))
    const source = join(directory, 'source')
    const snapshot = join(directory, 'backup-before-erasure')
    const restored = join(directory, 'restored-quarantined')
    const vault = join(directory, 'independent-current-key-vault')
    const id = `encrypted_restore_${randomUUID()}`
    let original: DatabaseHandle | undefined
    let recovery: DatabaseHandle | undefined
    try {
      const keys = await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' })
      original = await openDatabase({ driver: 'pglite', path: source })
      await new DemoService(original.db, id, provider, () => erasedAt).bootstrap(true)
      const [account] = await original.db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, id))
        .limit(1)
      if (!account) throw new Error('Synthetic restore account missing')
      const context = { profileId: id, table: 'accounts', column: 'name', rowId: account.id }
      let encryption = new ProfileEncryption(original.db, keys, () => erasedAt)
      const ciphertext = await encryption.encryptText(
        original.db,
        context,
        'Synthetic confidential account name',
      )
      await original.db
        .update(schema.accounts)
        .set({ name: ciphertext })
        .where(eq(schema.accounts.id, account.id))
      expect(await encryption.decryptText(original.db, context, ciphertext)).toBe(
        'Synthetic confidential account name',
      )
      await original.close()
      original = undefined
      await cp(source, snapshot, { recursive: true, errorOnExist: true, force: false })
      original = await openDatabase({ driver: 'pglite', path: source })
      encryption = new ProfileEncryption(original.db, keys, () => erasedAt)
      await new DemoService(original.db, id, provider, () => erasedAt, encryption).erase()
      await encryption.finalizeErasure(id)
      const journal = await exportDeletionJournal(original.db, {
        secret,
        keyId,
        now: () => issuedAt,
      })
      expect(journal.body.keyTombstones).toHaveLength(1)
      expect(journal.body.keyTombstones[0]?.keyId).toMatch(/^dek_/)
      expect(journal.body.keyTombstones[0]?.destroyedAt).toBe(erasedAt)
      await cp(snapshot, restored, { recursive: true, errorOnExist: true, force: false })
      recovery = await openDatabase({ driver: 'pglite', path: restored })
      const [restoredAccount] = await recovery.db
        .select({ name: schema.accounts.name })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
      expect(restoredAccount?.name).toBe(ciphertext)
      // Use the current external-to-the-snapshot vault, never a historical vault copy.
      const currentKeys = await createLocalSyntheticKeyManagement({
        directory: vault,
        mode: 'demo',
      })
      const recoveryEncryption = new ProfileEncryption(recovery.db, currentKeys, () => issuedAt)
      await expect(
        recoveryEncryption.decryptText(recovery.db, context, ciphertext),
      ).rejects.toThrow()
      const result = await replayDeletionJournal(recovery.db, journal, {
        ...verification(journal),
        keys: {
          replayTombstones: replayKeyTombstones,
          finalizeErasure: (profileId) => recoveryEncryption.finalizeErasure(profileId),
        },
      })
      expect(result.keyErasure).toBe('completed_local_adapter')
      await expect(
        recoveryEncryption.decryptText(recovery.db, context, ciphertext),
      ).rejects.toThrow()
      await expect(
        recoveryEncryption.encryptText(recovery.db, context, 'Resurrected'),
      ).rejects.toThrow()
      expect(await recovery.db.select().from(schema.profiles)).toHaveLength(0)
    } finally {
      await recovery?.close()
      await original?.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 90_000)
})
