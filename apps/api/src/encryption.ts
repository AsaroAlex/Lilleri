import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomUUID,
} from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { profileEncryptionKeys, profileKeyTombstones } from './encryption-schema.js'

const VALUE_PREFIX = 'lilleri:v1:'
const KEY_PREFIX = 'lilleri-dek:v1:'
const MAX_PLAINTEXT_BYTES = 1_048_576
const KEY_ID = /^dek_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export class EncryptionFailure extends Error {
  readonly code = 'encryption_unavailable'
  constructor() {
    // This message is safe for a scrubbed error log: never include context, keys or ciphertext.
    super('Encrypted data is unavailable')
    this.name = 'EncryptionFailure'
  }
}

export interface EncryptionContext {
  readonly profileId: string
  readonly table: string
  readonly column: string
  readonly rowId: string
}

export interface WrappedDataKey {
  readonly keyId: string
  readonly wrappedKey: string
}

/** Real adapters own independent key durability, authentication, expiry and destruction evidence. */
export interface KeyManagementPort {
  readonly kind: 'local-synthetic' | 'sealed-volume' | 'external'
  create(profileId: string, dataKey: Uint8Array): Promise<WrappedDataKey>
  unwrap(profileId: string, keyId: string, wrappedKey: string): Promise<Buffer>
  /** A staged key identifier must belong to this provider before destruction can be certified. */
  destroyProfile(profileId: string, expectedKeyId?: string | null): Promise<void>
  /** Only removes an uncommitted candidate; must never erase the winning profile key. */
  discardCandidate(profileId: string, keyId: string): Promise<void>
}

interface Envelope {
  readonly keyId: string
  readonly nonce: string
  readonly ciphertext: string
  readonly tag: string
}

function validIdentity(value: string): boolean {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('\0')
  )
}
function assertContext(context: EncryptionContext): void {
  if (
    !validIdentity(context.profileId) ||
    !validIdentity(context.rowId) ||
    !/^[a-z][a-z0-9_]{0,63}$/.test(context.table) ||
    !/^[a-z][a-z0-9_]{0,63}$/.test(context.column)
  )
    throw new EncryptionFailure()
}
export function assertEncryptionKeyId(keyId: string): void {
  if (!KEY_ID.test(keyId)) throw new EncryptionFailure()
}
function bytes(value: string, expectedLength?: number): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/.test(value)) throw new EncryptionFailure()
  const decoded = Buffer.from(value, 'base64url')
  if (
    decoded.toString('base64url') !== value ||
    (expectedLength !== undefined && decoded.length !== expectedLength)
  )
    throw new EncryptionFailure()
  return decoded
}
function decodeEnvelope(value: string, prefix: string): Envelope {
  try {
    if (typeof value !== 'string' || !value.startsWith(prefix) || value.length > 2_000_000)
      throw new EncryptionFailure()
    const decoded: unknown = JSON.parse(bytes(value.slice(prefix.length)).toString('utf8'))
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded))
      throw new EncryptionFailure()
    const record = decoded as Record<string, unknown>
    if (
      Object.keys(record).sort().join(',') !== 'ciphertext,keyId,nonce,tag' ||
      typeof record.keyId !== 'string' ||
      typeof record.nonce !== 'string' ||
      typeof record.ciphertext !== 'string' ||
      typeof record.tag !== 'string'
    )
      throw new EncryptionFailure()
    assertEncryptionKeyId(record.keyId)
    bytes(record.nonce, 12)
    bytes(record.tag, 16)
    if (bytes(record.ciphertext).length > MAX_PLAINTEXT_BYTES) throw new EncryptionFailure()
    return record as unknown as Envelope
  } catch {
    throw new EncryptionFailure()
  }
}
function encodeEnvelope(value: Envelope, prefix: string): string {
  return prefix + Buffer.from(JSON.stringify(value)).toString('base64url')
}
function aad(context: EncryptionContext, keyId: string, purpose: string): Buffer {
  assertContext(context)
  assertEncryptionKeyId(keyId)
  return Buffer.from(
    JSON.stringify([
      'lilleri-envelope',
      1,
      purpose,
      context.profileId,
      context.table,
      context.column,
      context.rowId,
      keyId,
    ]),
  )
}
function seal(key: Buffer, keyId: string, plain: Buffer, additionalData: Buffer): Envelope {
  if (key.length !== 32 || plain.length > MAX_PLAINTEXT_BYTES) throw new EncryptionFailure()
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 })
  cipher.setAAD(additionalData)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  return {
    keyId,
    nonce: nonce.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  }
}
function open(key: Buffer, envelope: Envelope, additionalData: Buffer): Buffer {
  try {
    if (key.length !== 32) throw new EncryptionFailure()
    const decipher = createDecipheriv('aes-256-gcm', key, bytes(envelope.nonce, 12), {
      authTagLength: 16,
    })
    decipher.setAAD(additionalData)
    decipher.setAuthTag(bytes(envelope.tag, 16))
    return Buffer.concat([decipher.update(bytes(envelope.ciphertext)), decipher.final()])
  } catch {
    throw new EncryptionFailure()
  }
}

/** Wrapping primitives are used only inside key adapters; no financial data goes to a KMS. */
export function wrapDataKey(profileId: string, keyId: string, key: Buffer, dataKey: Uint8Array) {
  if (dataKey.length !== 32) throw new EncryptionFailure()
  const context = {
    profileId,
    table: 'profile_encryption_keys',
    column: 'wrapped_key',
    rowId: keyId,
  }
  const copy = Buffer.from(dataKey)
  try {
    return encodeEnvelope(seal(key, keyId, copy, aad(context, keyId, 'dek')), KEY_PREFIX)
  } finally {
    copy.fill(0)
  }
}
export function unwrapDataKey(
  profileId: string,
  keyId: string,
  key: Buffer,
  wrappedKey: string,
): Buffer {
  const envelope = decodeEnvelope(wrappedKey, KEY_PREFIX)
  if (envelope.keyId !== keyId) throw new EncryptionFailure()
  const plain = open(
    key,
    envelope,
    aad(
      { profileId, table: 'profile_encryption_keys', column: 'wrapped_key', rowId: keyId },
      keyId,
      'dek',
    ),
  )
  if (plain.length !== 32) {
    plain.fill(0)
    throw new EncryptionFailure()
  }
  return plain
}
export const createEncryptionKeyId = () => `dek_${randomUUID()}`
export const isEncryptedText = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(VALUE_PREFIX)

export interface KeyTombstone {
  readonly profileId: string
  readonly keyId: string | null
  readonly stagedAt: string
  readonly destroyedAt: string | null
}
function instant(value: string): string {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value)
    throw new EncryptionFailure()
  return value
}
export async function exportKeyTombstones(db: Database): Promise<KeyTombstone[]> {
  return db.select().from(profileKeyTombstones).orderBy(asc(profileKeyTombstones.profileId))
}
/** Run in the restore transaction, before traffic. Completion still requires the current key port. */
export async function replayKeyTombstones(db: Database, entries: readonly KeyTombstone[]) {
  for (const entry of entries) {
    if (!validIdentity(entry.profileId)) throw new EncryptionFailure()
    if (entry.keyId !== null) assertEncryptionKeyId(entry.keyId)
    instant(entry.stagedAt)
    if (entry.destroyedAt !== null && instant(entry.destroyedAt) < entry.stagedAt)
      throw new EncryptionFailure()
    await db.insert(profileKeyTombstones).values(entry).onConflictDoNothing()
    if (entry.destroyedAt !== null)
      await db
        .update(profileKeyTombstones)
        .set({ destroyedAt: entry.destroyedAt })
        .where(
          and(
            eq(profileKeyTombstones.profileId, entry.profileId),
            isNull(profileKeyTombstones.destroyedAt),
          ),
        )
    await db
      .delete(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, entry.profileId))
  }
}

export class ProfileEncryption {
  constructor(
    readonly db: Database,
    readonly keys: KeyManagementPort,
    readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private async key(
    db: Database,
    profileId: string,
    create: boolean,
  ): Promise<{ keyId: string; dataKey: Buffer }> {
    try {
      return await this.loadKey(db, profileId, create)
    } catch {
      throw new EncryptionFailure()
    }
  }
  private async loadKey(
    db: Database,
    profileId: string,
    create: boolean,
  ): Promise<{ keyId: string; dataKey: Buffer }> {
    if (!validIdentity(profileId)) throw new EncryptionFailure()
    const [erased] = await db
      .select({ id: profileKeyTombstones.profileId })
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, profileId))
    if (erased) throw new EncryptionFailure()
    const [existing] = await db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, profileId))
    if (existing) {
      const dataKey = await this.keys.unwrap(profileId, existing.keyId, existing.wrappedKey)
      if (dataKey.length !== 32) {
        dataKey.fill(0)
        throw new EncryptionFailure()
      }
      return { keyId: existing.keyId, dataKey }
    }
    if (!create) throw new EncryptionFailure()
    const [profile] = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, profileId))
      .for('update')
    if (!profile) throw new EncryptionFailure()
    // Re-read after the profile lock: a competing writer may have installed its key.
    const [winner] = await db
      .select()
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, profileId))
    if (winner)
      return {
        keyId: winner.keyId,
        dataKey: await this.keys.unwrap(profileId, winner.keyId, winner.wrappedKey),
      }
    const dataKey = randomBytes(32)
    let wrapped: WrappedDataKey | undefined
    try {
      wrapped = await this.keys.create(profileId, dataKey)
      assertEncryptionKeyId(wrapped.keyId)
      const [inserted] = await db
        .insert(profileEncryptionKeys)
        .values({ profileId, ...wrapped, createdAt: instant(this.now()) })
        .onConflictDoNothing()
        .returning()
      if (inserted) return { keyId: wrapped.keyId, dataKey }
      await this.keys.discardCandidate(profileId, wrapped.keyId)
      dataKey.fill(0)
      return this.key(db, profileId, false)
    } catch {
      dataKey.fill(0)
      if (wrapped) await this.keys.discardCandidate(profileId, wrapped.keyId).catch(() => undefined)
      throw new EncryptionFailure()
    }
  }

  async encryptText(db: Database, context: EncryptionContext, plain: string): Promise<string> {
    assertContext(context)
    if (typeof plain !== 'string' || Buffer.byteLength(plain) > MAX_PLAINTEXT_BYTES)
      throw new EncryptionFailure()
    const { dataKey, keyId } = await this.key(db, context.profileId, true)
    const plainBytes = Buffer.from(plain)
    try {
      return encodeEnvelope(
        seal(dataKey, keyId, plainBytes, aad(context, keyId, 'field')),
        VALUE_PREFIX,
      )
    } finally {
      dataKey.fill(0)
      plainBytes.fill(0)
    }
  }

  async decryptText(db: Database, context: EncryptionContext, cipher: string): Promise<string> {
    assertContext(context)
    const envelope = decodeEnvelope(cipher, VALUE_PREFIX)
    const { dataKey, keyId } = await this.key(db, context.profileId, false)
    try {
      if (envelope.keyId !== keyId) throw new EncryptionFailure()
      const plain = open(dataKey, envelope, aad(context, keyId, 'field'))
      try {
        // Our writer only encrypts UTF-8 strings. Reject corrupted/non-UTF8 plaintext from adapters.
        return new TextDecoder('utf-8', { fatal: true }).decode(plain)
      } finally {
        plain.fill(0)
      }
    } catch {
      throw new EncryptionFailure()
    } finally {
      dataKey.fill(0)
    }
  }

  async encryptJson(db: Database, context: EncryptionContext, value: unknown): Promise<string> {
    try {
      const serialized = JSON.stringify(value)
      if (serialized === undefined) throw new EncryptionFailure()
      return await this.encryptText(db, context, serialized)
    } catch {
      throw new EncryptionFailure()
    }
  }
  async decryptJson<T = unknown>(
    db: Database,
    context: EncryptionContext,
    value: string,
  ): Promise<T> {
    try {
      return JSON.parse(await this.decryptText(db, context, value)) as T
    } catch {
      throw new EncryptionFailure()
    }
  }

  /** Equality only, domain-separated per profile/table/column; never use as a public identifier. */
  async blindIndex(db: Database, context: Omit<EncryptionContext, 'rowId'>, normalized: string) {
    assertContext({ ...context, rowId: 'blind-index' })
    if (typeof normalized !== 'string' || Buffer.byteLength(normalized) > MAX_PLAINTEXT_BYTES)
      throw new EncryptionFailure()
    const { dataKey } = await this.key(db, context.profileId, true)
    let indexKey: Buffer | undefined
    try {
      indexKey = Buffer.from(
        hkdfSync(
          'sha256',
          dataKey,
          Buffer.from('lilleri-blind-index-v1'),
          Buffer.from(JSON.stringify([context.profileId, context.table, context.column])),
          32,
        ),
      )
      return createHmac('sha256', indexKey).update(normalized, 'utf8').digest('hex')
    } finally {
      dataKey.fill(0)
      indexKey?.fill(0)
    }
  }

  /** Caller stages inside its deletion transaction. Never destroy an external key before commit. */
  async stageErasure(db: Database, profileId: string): Promise<void> {
    if (!validIdentity(profileId)) throw new EncryptionFailure()
    const [stored] = await db
      .select({ keyId: profileEncryptionKeys.keyId })
      .from(profileEncryptionKeys)
      .where(eq(profileEncryptionKeys.profileId, profileId))
    await db
      .insert(profileKeyTombstones)
      .values({ profileId, keyId: stored?.keyId ?? null, stagedAt: instant(this.now()) })
      .onConflictDoNothing()
    await db.delete(profileEncryptionKeys).where(eq(profileEncryptionKeys.profileId, profileId))
  }

  /** Idempotent after-commit effect; failure leaves a durable pending intent for boot-time retry. */
  async finalizeErasure(profileId: string): Promise<void> {
    const [tombstone] = await this.db
      .select()
      .from(profileKeyTombstones)
      .where(eq(profileKeyTombstones.profileId, profileId))
    if (!tombstone) throw new EncryptionFailure()
    // Always check the current independent provider, including after replay of a completed journal.
    await this.keys.destroyProfile(profileId, tombstone.keyId)
    if (tombstone.destroyedAt === null)
      await this.db
        .update(profileKeyTombstones)
        .set({ destroyedAt: [instant(this.now()), tombstone.stagedAt].sort()[1] })
        .where(
          and(
            eq(profileKeyTombstones.profileId, profileId),
            isNull(profileKeyTombstones.destroyedAt),
          ),
        )
  }
  async recoverPendingErasures(): Promise<{ completed: number; pending: number }> {
    const pending = await this.db
      .select({ profileId: profileKeyTombstones.profileId })
      .from(profileKeyTombstones)
      .where(isNull(profileKeyTombstones.destroyedAt))
      .orderBy(asc(profileKeyTombstones.profileId))
    let completed = 0
    for (const row of pending) {
      try {
        await this.finalizeErasure(row.profileId)
        completed++
      } catch {
        // No context is returned: caller can report an aggregate operational failure.
      }
    }
    return { completed, pending: pending.length - completed }
  }

  async encryptTransactionRow(db: Database, row: typeof schema.transactions.$inferInsert) {
    const encrypted = { ...row }
    for (const column of ['description', 'merchantName', 'reference'] as const) {
      const value = row[column]
      if (value !== undefined && value !== null)
        encrypted[column] = await this.encryptText(
          db,
          {
            profileId: row.profileId,
            table: 'transactions',
            column: fieldColumn(column),
            rowId: row.id,
          },
          value,
        )
    }
    return encrypted
  }
  async decryptTransactionRow(db: Database, row: typeof schema.transactions.$inferSelect) {
    const decrypted = { ...row }
    for (const column of ['description', 'merchantName', 'reference'] as const) {
      const value = row[column]
      if (value !== null)
        decrypted[column] = await this.decryptText(
          db,
          {
            profileId: row.profileId,
            table: 'transactions',
            column: fieldColumn(column),
            rowId: row.id,
          },
          value,
        )
    }
    return decrypted
  }
}
const fieldColumn = (column: 'description' | 'merchantName' | 'reference') =>
  column === 'merchantName' ? 'merchant_name' : column
