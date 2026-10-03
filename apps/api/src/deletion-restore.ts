import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { exportKeyTombstones as exportStoredKeyTombstones } from './encryption.js'
import * as identity from './identity-schema.js'
import { enqueueRevocation } from './revocation-outbox.js'

const machineId = z.string().regex(/^[A-Za-z0-9_:.-]{1,200}$/)
const instant = z.iso.datetime().refine((value) => new Date(value).toISOString() === value)
const tombstone = z.strictObject({ profileId: machineId, erasedAt: instant })
const keyTombstone = z.strictObject({
  profileId: machineId,
  keyId: machineId.nullable(),
  stagedAt: instant,
  destroyedAt: instant.nullable(),
})
const revocation = z.strictObject({
  id: machineId,
  profileId: machineId,
  connectionId: machineId,
  providerId: machineId,
  consentId: machineId,
  state: z.enum(['pending', 'running', 'completed', 'failed']),
  attempts: z.number().int().min(0).max(20),
  createdAt: instant,
  nextAttemptAt: instant,
  deadlineAt: instant,
  completedAt: instant.nullable(),
  lastErrorCode: z
    .enum(['provider_unavailable', 'provider_unknown', 'deadline_exceeded', 'attempts_exhausted'])
    .nullable(),
})
export const DELETION_JOURNAL_SCHEMA = z.strictObject({
  format: z.literal('lilleri.deletion-journal.v1'),
  issuedAt: instant,
  deletions: z.array(tombstone).max(100_000),
  keyTombstones: z.array(keyTombstone).max(100_000),
  revocations: z.array(revocation).max(500_000),
})
const signedJournalSchema = z.strictObject({
  body: DELETION_JOURNAL_SCHEMA,
  keyId: machineId,
  signature: z.string().regex(/^[a-f0-9]{64}$/),
})
export type DeletionJournal = z.infer<typeof DELETION_JOURNAL_SCHEMA>
export type SignedDeletionJournal = z.infer<typeof signedJournalSchema>
export type KeyTombstone = z.infer<typeof keyTombstone>
export const DELETION_CERTIFICATE_SCHEMA = z.strictObject({
  format: z.literal('lilleri.deletion-certificate.v1'),
  certificateId: z.uuid(),
  deletionReference: z.string().regex(/^[a-f0-9]{64}$/),
  issuedAt: instant,
  erasedAt: instant,
  localFinancialDeletion: z.literal('completed'),
  keyErasure: z.enum(['not_configured', 'pending', 'destroyed_local_adapter']),
  providerRevocations: z.strictObject({
    completed: z.number().int().min(0),
    outstanding: z.number().int().min(0),
    failed: z.number().int().min(0),
  }),
  backupPolicy: z.literal('latest-authenticated-journal-replay-required'),
  externalProcessors: z.literal('not_verified'),
  scope: z.literal('local-financial-database-and-configured-key-adapter'),
})
export type DeletionCertificate = z.infer<typeof DELETION_CERTIFICATE_SCHEMA>
export interface KeyReplayHooks {
  exportTombstones?(db: Database): Promise<readonly KeyTombstone[]>
  /** Runs inside the replay transaction; must not contact a remote key service. */
  replayTombstones?(db: Database, entries: readonly KeyTombstone[]): Promise<void>
  /** Idempotent independent key-store destruction, after the transaction commits. */
  finalizeErasure?(profileId: string): Promise<void>
}

/** Stable bytes allow an independently stored latest-journal digest to fence older signed files. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object' && value !== null)
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
function secretBytes(secret: Uint8Array) {
  if (secret.byteLength < 32) throw new Error('Deletion journal signing key is too short')
  return secret
}
function assertJournalConsistency(body: DeletionJournal) {
  const profiles = new Set(body.deletions.map((row) => row.profileId))
  if (profiles.size !== body.deletions.length) throw new Error('Duplicate deletion tombstone')
  if (new Set(body.revocations.map((row) => row.id)).size !== body.revocations.length)
    throw new Error('Duplicate deletion revocation')
  if (
    new Set(
      body.revocations.map((row) =>
        JSON.stringify([row.profileId, row.connectionId, row.consentId]),
      ),
    ).size !== body.revocations.length
  )
    throw new Error('Duplicate deletion consent generation')
  if (new Set(body.keyTombstones.map((row) => row.profileId)).size !== body.keyTombstones.length)
    throw new Error('Duplicate deletion key tombstone')
  if ([...body.revocations, ...body.keyTombstones].some((row) => !profiles.has(row.profileId)))
    throw new Error('Deletion journal has an unrelated profile')
  if (body.deletions.some((row) => row.erasedAt > body.issuedAt))
    throw new Error('Deletion journal precedes a tombstone')
  if (
    body.keyTombstones.some(
      (row) =>
        row.stagedAt > body.issuedAt ||
        (row.destroyedAt !== null &&
          (row.destroyedAt < row.stagedAt || row.destroyedAt > body.issuedAt)),
    )
  )
    throw new Error('Invalid deletion key lifecycle time')
  if (
    body.revocations.some(
      (row) =>
        row.createdAt > body.issuedAt ||
        (row.completedAt !== null && row.completedAt > body.issuedAt),
    )
  )
    throw new Error('Deletion journal precedes a revocation effect')
  if (body.revocations.some((row) => (row.state === 'completed') !== (row.completedAt !== null)))
    throw new Error('Invalid deletion revocation completion')
}
export function signDeletionJournal(
  input: DeletionJournal,
  secret: Uint8Array,
  keyId: string,
): SignedDeletionJournal {
  const body = DELETION_JOURNAL_SCHEMA.parse(input)
  assertJournalConsistency(body)
  const id = machineId.parse(keyId)
  const signature = createHmac('sha256', secretBytes(secret))
    .update(canonical({ body, keyId: id }))
    .digest('hex')
  return { body, keyId: id, signature }
}
export function deletionJournalDigest(input: SignedDeletionJournal): string {
  return createHash('sha256')
    .update(canonical(signedJournalSchema.parse(input)))
    .digest('hex')
}
export interface JournalVerification {
  readonly secret: Uint8Array
  readonly keyId: string
  /** Obtain from the independent current journal store, never from the snapshot/file itself. */
  readonly expectedDigest: string
  readonly minimumIssuedAt: string
}
export function verifyDeletionJournal(
  input: unknown,
  verification: JournalVerification,
): SignedDeletionJournal {
  const journal = signedJournalSchema.parse(input)
  assertJournalConsistency(journal.body)
  const expected = signDeletionJournal(journal.body, verification.secret, verification.keyId)
  if (
    journal.keyId !== verification.keyId ||
    !timingSafeEqual(Buffer.from(journal.signature, 'hex'), Buffer.from(expected.signature, 'hex'))
  )
    throw new Error('Deletion journal authentication failed')
  if (!/^[a-f0-9]{64}$/.test(verification.expectedDigest))
    throw new Error('A trusted latest deletion journal digest is required')
  if (
    !timingSafeEqual(
      Buffer.from(deletionJournalDigest(journal), 'hex'),
      Buffer.from(verification.expectedDigest, 'hex'),
    )
  )
    throw new Error('Deletion journal is not the independently trusted latest version')
  if (journal.body.issuedAt < instant.parse(verification.minimumIssuedAt))
    throw new Error('Deletion journal is older than the trusted restore boundary')
  return journal
}

export async function exportDeletionJournal(
  db: Database,
  options: { secret: Uint8Array; keyId: string; now?: () => string; keys?: KeyReplayHooks },
): Promise<SignedDeletionJournal> {
  return db.transaction(
    async (tx) => {
      // A consistent export includes tombstones and the outbox created by their erase transaction.
      const deletions = await tx
        .select({
          profileId: schema.profileTombstones.profileId,
          erasedAt: schema.profileTombstones.erasedAt,
        })
        .from(schema.profileTombstones)
        .orderBy(asc(schema.profileTombstones.profileId))
      const profileIds = deletions.map((row) => row.profileId)
      const revocations = profileIds.length
        ? await tx
            .select({
              id: schema.revocationJobs.id,
              profileId: schema.revocationJobs.profileId,
              connectionId: schema.revocationJobs.connectionId,
              providerId: schema.revocationJobs.providerId,
              consentId: schema.revocationJobs.consentId,
              state: schema.revocationJobs.state,
              attempts: schema.revocationJobs.attempts,
              createdAt: schema.revocationJobs.createdAt,
              nextAttemptAt: schema.revocationJobs.nextAttemptAt,
              deadlineAt: schema.revocationJobs.deadlineAt,
              completedAt: schema.revocationJobs.completedAt,
              lastErrorCode: schema.revocationJobs.lastErrorCode,
            })
            .from(schema.revocationJobs)
            .innerJoin(
              schema.profileTombstones,
              eq(schema.revocationJobs.profileId, schema.profileTombstones.profileId),
            )
            .orderBy(asc(schema.revocationJobs.id))
        : []
      const keyTombstones = (
        await (options.keys?.exportTombstones ?? exportStoredKeyTombstones)(tx)
      ).map(({ profileId, keyId, stagedAt, destroyedAt }) => ({
        profileId,
        keyId,
        stagedAt,
        destroyedAt,
      }))
      return signDeletionJournal(
        {
          format: 'lilleri.deletion-journal.v1',
          issuedAt: options.now?.() ?? new Date().toISOString(),
          deletions,
          revocations,
          keyTombstones: keyTombstones.filter((row) => profileIds.includes(row.profileId)),
        },
        options.secret,
        options.keyId,
      )
    },
    { isolationLevel: 'repeatable read' },
  )
}

export interface RestoreReplayResult {
  readonly format: 'lilleri.restore-replay.v1'
  readonly journalDigest: string
  readonly journalIssuedAt: string
  readonly tombstonesReplayed: number
  readonly restoredProfilesRemoved: number
  readonly restoredIdentityUsersRemoved: number
  readonly authenticationReset: true
  readonly revocationsOutstanding: number
  readonly keyErasure: 'not_configured' | 'completed_local_adapter'
  readonly safeToOpenLocally: true
  readonly scope: 'local-database-and-configured-key-adapter'
}
/** Run only against a quarantined restore, before its HTTP server or workers are started. */
export async function replayDeletionJournal(
  db: Database,
  input: unknown,
  options: JournalVerification & { now?: () => string; keys?: KeyReplayHooks },
): Promise<RestoreReplayResult> {
  // Authentication and rollback fencing complete before the first database mutation.
  const journal = verifyDeletionJournal(input, options)
  if (journal.body.keyTombstones.length && !options.keys?.replayTombstones)
    throw new Error('Restored key tombstones require a configured replay adapter')
  if (journal.body.keyTombstones.length && !options.keys?.finalizeErasure)
    throw new Error('Independent key destruction is required before releasing a restore')
  const now = instant.parse(options.now?.() ?? new Date().toISOString())
  const counts = await db.transaction(async (tx) => {
    let restoredProfilesRemoved = 0
    let restoredIdentityUsersRemoved = 0
    for (const deleted of journal.body.deletions) {
      // Capture restored memberships before deleting the financial profile cascades them.
      const members = await tx
        .select({ userId: identity.memberships.userId })
        .from(identity.memberships)
        .where(eq(identity.memberships.profileId, deleted.profileId))
      const consents = await tx
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.profileId, deleted.profileId))
      for (const consent of consents)
        await enqueueRevocation(
          tx,
          {
            profileId: deleted.profileId,
            connectionId: consent.connectionId,
            providerId: consent.provider,
            consentId: consent.id,
          },
          now,
        )
      await tx
        .insert(schema.profileTombstones)
        .values(deleted)
        .onConflictDoUpdate({
          target: schema.profileTombstones.profileId,
          // Keep the first erase timestamp if replaying an already scrubbed snapshot.
          set: {
            erasedAt: sql`least(${schema.profileTombstones.erasedAt}, ${deleted.erasedAt})`,
          },
        })
      const removed = await tx
        .delete(schema.profiles)
        .where(eq(schema.profiles.id, deleted.profileId))
        .returning({ id: schema.profiles.id })
      restoredProfilesRemoved += removed.length
      if (members.length) {
        const users = await tx
          .delete(identity.user)
          .where(
            inArray(
              identity.user.id,
              members.map((row) => row.userId),
            ),
          )
          .returning({ id: identity.user.id })
        restoredIdentityUsersRemoved += users.length
      }
    }
    for (const job of journal.body.revocations) {
      const values = {
        ...job,
        state: job.state === 'running' ? ('pending' as const) : job.state,
        nextAttemptAt: job.state === 'running' ? now : job.nextAttemptAt,
        leaseToken: null,
        leaseExpiresAt: null,
      }
      await tx
        .insert(schema.revocationJobs)
        .values(values)
        .onConflictDoUpdate({ target: schema.revocationJobs.id, set: values })
    }
    if (options.keys?.replayTombstones) {
      const keyProfiles = new Set(journal.body.keyTombstones.map((row) => row.profileId))
      await options.keys.replayTombstones(tx, [
        ...journal.body.keyTombstones,
        ...journal.body.deletions
          .filter((row) => !keyProfiles.has(row.profileId))
          .map((row) => ({
            profileId: row.profileId,
            keyId: null,
            stagedAt: row.erasedAt,
            destroyedAt: null,
          })),
      ])
    }
    // Restored sessions and one-time verification/reset/TOTP tokens must not regain validity.
    await tx.delete(identity.session)
    await tx.delete(identity.verification)
    return { restoredProfilesRemoved, restoredIdentityUsersRemoved }
  })
  // Failure here intentionally withholds the release result; financial deletion already persists.
  for (const deleted of journal.body.deletions)
    await options.keys?.finalizeErasure?.(deleted.profileId)
  const outstanding = journal.body.deletions.length
    ? await db
        .select({ id: schema.revocationJobs.id })
        .from(schema.revocationJobs)
        .where(
          and(
            inArray(
              schema.revocationJobs.profileId,
              journal.body.deletions.map((row) => row.profileId),
            ),
            inArray(schema.revocationJobs.state, ['pending', 'running', 'failed']),
          ),
        )
    : []
  return {
    format: 'lilleri.restore-replay.v1',
    journalDigest: deletionJournalDigest(journal),
    journalIssuedAt: journal.body.issuedAt,
    tombstonesReplayed: journal.body.deletions.length,
    ...counts,
    authenticationReset: true,
    revocationsOutstanding: outstanding.length,
    keyErasure: options.keys?.finalizeErasure ? 'completed_local_adapter' : 'not_configured',
    safeToOpenLocally: true,
    scope: 'local-database-and-configured-key-adapter',
  }
}

export async function createDeletionCertificate(
  db: Database,
  profileId: string,
  options: {
    now?: () => string
    keyErasure?: 'not_configured' | 'pending' | 'destroyed_local_adapter'
  } = {},
) {
  const [deleted] = await db
    .select()
    .from(schema.profileTombstones)
    .where(eq(schema.profileTombstones.profileId, profileId))
  if (!deleted) throw new Error('Deletion certificate requires a committed tombstone')
  const remaining = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
  if (remaining.length) throw new Error('Deletion certificate refused for a surviving profile')
  const jobs = await db
    .select({ state: schema.revocationJobs.state })
    .from(schema.revocationJobs)
    .where(eq(schema.revocationJobs.profileId, profileId))
  return DELETION_CERTIFICATE_SCHEMA.parse({
    format: 'lilleri.deletion-certificate.v1' as const,
    certificateId: randomUUID(),
    deletionReference: createHash('sha256')
      .update(`${profileId}\0${deleted.erasedAt}`)
      .digest('hex'),
    issuedAt: instant.parse(options.now?.() ?? new Date().toISOString()),
    erasedAt: deleted.erasedAt,
    localFinancialDeletion: 'completed' as const,
    keyErasure: options.keyErasure ?? 'not_configured',
    providerRevocations: {
      completed: jobs.filter((job) => job.state === 'completed').length,
      outstanding: jobs.filter((job) => job.state !== 'completed').length,
      failed: jobs.filter((job) => job.state === 'failed').length,
    },
    backupPolicy: 'latest-authenticated-journal-replay-required' as const,
    externalProcessors: 'not_verified' as const,
    scope: 'local-financial-database-and-configured-key-adapter' as const,
  })
}
