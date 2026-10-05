import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import type { KeyManagementPort, WrappedDataKey } from './encryption.js'
import {
  assertSourceReceipt,
  canonicalSourceValue,
  type SignedSourceErasure,
  type SourceErasureAnchor,
  type SourceErasureReceipt,
  type SourceFactProof,
  signedSourceErasureDto,
  sourceErasureAnchorDto,
  sourceFactProofDto,
} from './source-erasure-dto.js'

const receiptName = /^[0-9a-f-]{36}\.json$/,
  anchorName = /^\.source-erasure-[0-9a-f-]{36}\.json$/,
  profileName = /^[a-f0-9]{64}$/
const MAX_DOCUMENT_BYTES = 1_000_000,
  MAX_ENTRIES = 100_000
const token = (profileId: string) =>
  createHash('sha256').update('lilleri-local-vault-profile-v1\0').update(profileId).digest('hex')
const failure = () => new Error('Current source erasure journal is unavailable')
const missing = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
const existing = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'EEXIST'
async function directory(path: string, create = false) {
  if (create) await mkdir(path, { recursive: true, mode: 0o700 })
  const stat = await lstat(path)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o077) !== 0 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw failure()
}
async function read(path: string, max = MAX_DOCUMENT_BYTES) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (
      !stat.isFile() ||
      stat.size > max ||
      (stat.mode & 0o077) !== 0 ||
      (process.getuid && stat.uid !== process.getuid())
    )
      throw failure()
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}
async function sync(path: string) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}
async function write(path: string, body: Buffer) {
  const handle = await open(
    path,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  )
  try {
    await handle.writeFile(body)
    await handle.sync()
  } finally {
    await handle.close()
  }
}
function digest(value: unknown) {
  return createHash('sha256').update(canonicalSourceValue(value)).digest('hex')
}
/** Independent local synthetic store; copying or rolling back this store and its vault is outside the proof. */
export class SourceErasureJournal {
  readonly keyId: string
  private queue: Promise<void> = Promise.resolve()
  private async serialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue
    let release!: () => void
    this.queue = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  }
  private currentIntents = new Map<
    string,
    { id: string; profileId: string; connectionId: string; digest: string }
  >()
  intentsForProfile(profileId: string) {
    return [...this.currentIntents.values()]
      .filter((row) => row.profileId === profileId)
      .map((row) => ({ ...row }))
  }
  private currentRevisions = new Map<string, number>()
  currentRevision(profileId: string, connectionId: string) {
    return this.currentRevisions.get(JSON.stringify([profileId, connectionId])) ?? 0
  }
  constructor(
    readonly directory: string,
    readonly anchorDirectory: string,
    private readonly secret: Buffer,
    readonly keys: KeyManagementPort,
  ) {
    if (secret.length !== 32 || (keys.kind !== 'local-synthetic' && keys.kind !== 'sealed-volume'))
      throw failure()
    this.keyId = createHash('sha256')
      .update('lilleri-source-journal-key-v1\0')
      .update(secret)
      .digest('hex')
  }
  private signature(domain: string, body: unknown) {
    return createHmac('sha256', this.secret)
      .update(canonicalSourceValue([domain, this.keyId, body]))
      .digest('hex')
  }
  signFact(body: SourceFactProof['body']): SourceFactProof {
    const value = sourceFactProofDto.shape.body.parse(body)
    if (value.erasureRevision !== this.currentRevision(value.profileId, value.connectionId))
      throw failure()
    return { body: value, keyId: this.keyId, signature: this.signature('source-fact-v1', value) }
  }
  verifyFact(input: unknown): SourceFactProof {
    const proof = sourceFactProofDto.parse(input),
      expected = this.signature('source-fact-v1', proof.body)
    if (
      proof.body.erasureRevision >
        this.currentRevision(proof.body.profileId, proof.body.connectionId) ||
      proof.keyId !== this.keyId ||
      !timingSafeEqual(Buffer.from(proof.signature, 'hex'), Buffer.from(expected, 'hex'))
    )
      throw failure()
    return proof
  }
  signReceipt(body: SourceErasureReceipt): SignedSourceErasure {
    assertSourceReceipt(body)
    const parsed = signedSourceErasureDto.shape.body.parse(body)
    return {
      body: parsed,
      keyId: this.keyId,
      signature: this.signature('source-erasure-v1', parsed),
    }
  }
  verifyReceipt(input: unknown): SignedSourceErasure {
    const signed = signedSourceErasureDto.parse(input)
    assertSourceReceipt(signed.body)
    if (
      signed.keyId !== this.keyId ||
      !timingSafeEqual(
        Buffer.from(signed.signature, 'hex'),
        Buffer.from(this.signature('source-erasure-v1', signed.body), 'hex'),
      )
    )
      throw failure()
    return signed
  }
  receiptDigest(input: SignedSourceErasure) {
    return digest(this.verifyReceipt(input))
  }
  private anchorPath(body: SourceErasureReceipt) {
    return join(this.anchorDirectory, token(body.profileId), `.source-erasure-${body.id}.json`)
  }
  async assertAnchored(input: SignedSourceErasure) {
    const signed = this.verifyReceipt(input),
      anchor = sourceErasureAnchorDto.parse(
        JSON.parse((await read(this.anchorPath(signed.body), 4096)).toString('utf8')),
      )
    if (
      anchor.profileId !== signed.body.profileId ||
      anchor.receiptId !== signed.body.id ||
      anchor.journalKeyId !== this.keyId ||
      anchor.digest !== digest(signed)
    )
      throw failure()
  }
  private async anchorIntentUnlocked(
    input: SignedSourceErasure,
    wrapped?: WrappedDataKey,
    allowDestroyedProfile = false,
  ) {
    const signed = this.verifyReceipt(input),
      body = signed.body,
      profileDirectory = join(this.anchorDirectory, token(body.profileId))
    await directory(profileDirectory)
    try {
      await this.assertAnchored(signed)
      return
    } catch (error) {
      if (!missing(error)) throw error
    }
    if (wrapped) {
      if (wrapped.keyId !== body.profileKeyId) throw failure()
      const dataKey = await this.keys.unwrap(body.profileId, wrapped.keyId, wrapped.wrappedKey)
      dataKey.fill(0)
      const key = await read(join(profileDirectory, `${body.profileKeyId}.key`), 32)
      try {
        if (key.length !== 32) throw failure()
      } finally {
        key.fill(0)
      }
    } else if (allowDestroyedProfile) {
      const destroyed = await read(join(profileDirectory, '.destroyed'), 128)
      if (destroyed.toString('utf8') !== 'lilleri-local-profile-destroyed-v1\n') throw failure()
    } else throw failure()
    const anchor: SourceErasureAnchor = {
      format: 'lilleri.source-erasure-anchor.v1',
      profileId: body.profileId,
      receiptId: body.id,
      journalKeyId: this.keyId,
      digest: digest(signed),
    }
    try {
      await write(this.anchorPath(body), Buffer.from(canonicalSourceValue(anchor)))
    } catch (error) {
      if (!existing(error)) throw error
      await this.assertAnchored(signed)
    }
    await sync(profileDirectory)
  }
  async anchorIntent(
    input: SignedSourceErasure,
    wrapped?: WrappedDataKey,
    allowDestroyedProfile = false,
  ) {
    return this.serialized(() => this.anchorIntentUnlocked(input, wrapped, allowDestroyedProfile))
  }
  async writeIntent(body: SourceErasureReceipt, wrapped: WrappedDataKey) {
    return this.serialized(() => this.writeIntentUnlocked(body, wrapped))
  }
  private async writeIntentUnlocked(body: SourceErasureReceipt, wrapped: WrappedDataKey) {
    const signed = this.signReceipt(body),
      bytes = Buffer.from(canonicalSourceValue(signed))
    if (bytes.length > MAX_DOCUMENT_BYTES) throw failure()
    try {
      await write(join(this.directory, `${body.id}.json`), bytes)
    } catch (error) {
      if (!existing(error)) throw error
      const stored = this.verifyReceipt(
        JSON.parse((await read(join(this.directory, `${body.id}.json`))).toString('utf8')),
      )
      if (digest(stored) !== digest(signed)) throw failure()
    }
    await sync(this.directory)
    // A durable request immediately fences fresh writes even if anchoring or the SQL transaction fails.
    this.currentIntents.set(body.id, {
      id: body.id,
      profileId: body.profileId,
      connectionId: body.connectionId,
      digest: digest(signed),
    })
    this.currentRevisions.set(JSON.stringify([body.profileId, body.connectionId]), body.revision)
    await this.anchorIntentUnlocked(signed, wrapped)
    this.currentRevisions.set(JSON.stringify([body.profileId, body.connectionId]), body.revision)
    return signed
  }
  /** Every independent vault anchor must have its exact authenticated current receipt. */
  async readAll(): Promise<SignedSourceErasure[]> {
    return this.serialized(() => this.readAllUnlocked())
  }
  private async readAllUnlocked(): Promise<SignedSourceErasure[]> {
    await directory(this.directory)
    await directory(this.anchorDirectory)
    const names = await readdir(this.directory)
    if (
      names.length > MAX_ENTRIES + 1 ||
      names.some((name) => name !== '.journal-key' && !receiptName.test(name))
    )
      throw failure()
    const receipts: SignedSourceErasure[] = [],
      byId = new Map<string, SignedSourceErasure>()
    for (const name of names.filter((name) => receiptName.test(name))) {
      const signed = this.verifyReceipt(
        JSON.parse((await read(join(this.directory, name))).toString('utf8')),
      )
      if (name !== `${signed.body.id}.json` || byId.has(signed.body.id)) throw failure()
      byId.set(signed.body.id, signed)
      receipts.push(signed)
    }
    const profiles = await readdir(this.anchorDirectory)
    if (profiles.length > MAX_ENTRIES || profiles.some((name) => !profileName.test(name)))
      throw failure()
    for (const name of profiles) {
      const path = join(this.anchorDirectory, name)
      await directory(path)
      const files = await readdir(path)
      if (files.length > MAX_ENTRIES) throw failure()
      for (const filename of files.filter((name) => anchorName.test(name))) {
        const anchor = sourceErasureAnchorDto.parse(
          JSON.parse((await read(join(path, filename), 4096)).toString('utf8')),
        )
        const receipt = byId.get(anchor.receiptId)
        if (
          token(anchor.profileId) !== name ||
          filename !== `.source-erasure-${anchor.receiptId}.json` ||
          !receipt
        )
          throw failure()
        await this.assertAnchored(receipt)
      }
    }
    const generations = new Set<string>()
    for (const signed of receipts) {
      const key = JSON.stringify([
        signed.body.profileId,
        signed.body.connectionId,
        signed.body.revision,
      ])
      if (generations.has(key)) throw failure()
      generations.add(key)
    }
    const sorted = receipts.sort(
      (a, b) =>
        a.body.profileId.localeCompare(b.body.profileId) ||
        a.body.connectionId.localeCompare(b.body.connectionId) ||
        a.body.revision - b.body.revision,
    )
    const revisions = new Map<string, number>(),
      clocks = new Map<string, string>()
    for (const signed of sorted) {
      const key = JSON.stringify([signed.body.profileId, signed.body.connectionId]),
        previous = revisions.get(key) ?? 0
      if (signed.body.revision !== previous + 1 || (clocks.get(key) ?? '') > signed.body.erasedAt)
        throw failure()
      revisions.set(key, signed.body.revision)
      clocks.set(key, signed.body.erasedAt)
    }
    this.currentRevisions = revisions
    this.currentIntents = new Map(
      sorted.map((signed) => [
        signed.body.id,
        {
          id: signed.body.id,
          profileId: signed.body.profileId,
          connectionId: signed.body.connectionId,
          digest: digest(signed),
        },
      ]),
    )
    return sorted
  }
  close() {
    this.secret.fill(0)
  }
}
export async function createSourceErasureJournal(options: {
  directory: string
  anchorDirectory: string
  keys: KeyManagementPort
  mode: 'demo' | 'local-auth' | 'hosted'
  requireExisting?: boolean
}) {
  // Synthetic modes keep the synthetic vault; the hosted service must use its sealed volume vault.
  if (
    options.mode === 'hosted'
      ? options.keys.kind !== 'sealed-volume'
      : !['demo', 'local-auth'].includes(options.mode) || options.keys.kind !== 'local-synthetic'
  )
    throw failure()
  const journalPath = resolve(options.directory),
    anchors = resolve(options.anchorDirectory),
    relation = relative(anchors, journalPath),
    reverse = relative(journalPath, anchors)
  if (
    relation === '' ||
    (!relation.startsWith(`..${sep}`) && relation !== '..') ||
    (!reverse.startsWith(`..${sep}`) && reverse !== '..')
  )
    throw failure()
  await directory(journalPath, !options.requireExisting)
  await directory(anchors)
  let secret: Buffer
  try {
    secret = await read(join(journalPath, '.journal-key'), 32)
  } catch (error) {
    if (!missing(error) || options.requireExisting) throw error
    const candidate = randomBytes(32)
    try {
      await write(join(journalPath, '.journal-key'), candidate)
      await sync(journalPath)
    } catch (error) {
      if (!existing(error)) throw error
    } finally {
      candidate.fill(0)
    }
    secret = await read(join(journalPath, '.journal-key'), 32)
  }
  if (secret.length !== 32) {
    secret.fill(0)
    throw failure()
  }
  const journal = new SourceErasureJournal(journalPath, anchors, secret, options.keys)
  try {
    await journal.readAll()
    return journal
  } catch (error) {
    journal.close()
    throw error
  }
}
