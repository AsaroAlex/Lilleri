import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  assertEncryptionKeyId,
  createEncryptionKeyId,
  EncryptionFailure,
  type KeyManagementPort,
  unwrapDataKey,
  wrapDataKey,
} from './encryption.js'

const KEY_FILE = /^dek_[0-9a-f-]{36}\.key$/
const PROFILE_DIRECTORY = /^[0-9a-f]{64}$/
const SOURCE_ERASURE_ANCHOR = /^\.source-erasure-[0-9a-f-]{36}\.json$/
const MAX_KEYS_PER_PROFILE = 1000

function profileToken(profileId: string): string {
  if (!profileId || profileId.length > 200 || profileId.includes('\0'))
    throw new EncryptionFailure()
  return createHash('sha256')
    .update('lilleri-local-vault-profile-v1\0')
    .update(profileId)
    .digest('hex')
}
async function privateDirectory(path: string) {
  await mkdir(path, { recursive: true, mode: 0o700 })
  const stat = await lstat(path)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o077) !== 0 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new EncryptionFailure()
}
async function syncDirectory(path: string) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}
async function writeExclusive(path: string, value: Buffer) {
  const handle = await open(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  )
  try {
    await handle.writeFile(value)
    await handle.sync()
  } finally {
    await handle.close()
  }
}
async function readPrivate(path: string): Promise<Buffer> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (
      !stat.isFile() ||
      stat.size > 4096 ||
      (stat.mode & 0o077) !== 0 ||
      (process.getuid && stat.uid !== process.getuid())
    )
      throw new EncryptionFailure()
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}
function missing(error: unknown) {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
}
async function destroyed(directory: string): Promise<boolean> {
  try {
    const contents = await readPrivate(join(directory, '.destroyed'))
    if (contents.toString('utf8') !== 'lilleri-local-profile-destroyed-v1\n')
      throw new EncryptionFailure()
    return true
  } catch (error) {
    if (missing(error)) return false
    throw new EncryptionFailure()
  }
}

/** Seals each per-DEK wrapping key at rest; absent for the local synthetic vault. */
interface WrappingKeySealer {
  seal(profileToken: string, keyId: string, wrappingKey: Buffer): Buffer
  open(profileToken: string, keyId: string, sealed: Buffer): Buffer
}
const SEALED_KEY_BYTES = 12 + 32 + 16
function sealedKeyAad(profileToken: string, keyId: string) {
  return Buffer.from(JSON.stringify(['lilleri-sealed-vault', 1, profileToken, keyId]))
}
function masterKeySealer(masterKey: Buffer): WrappingKeySealer {
  const key = Buffer.from(masterKey)
  return {
    seal(profileToken, keyId, wrappingKey) {
      if (wrappingKey.length !== 32) throw new EncryptionFailure()
      const nonce = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 })
      cipher.setAAD(sealedKeyAad(profileToken, keyId))
      const sealed = Buffer.concat([cipher.update(wrappingKey), cipher.final()])
      return Buffer.concat([nonce, sealed, cipher.getAuthTag()])
    },
    open(profileToken, keyId, sealed) {
      try {
        if (sealed.length !== SEALED_KEY_BYTES) throw new EncryptionFailure()
        const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12), {
          authTagLength: 16,
        })
        decipher.setAAD(sealedKeyAad(profileToken, keyId))
        decipher.setAuthTag(sealed.subarray(12 + 32))
        return Buffer.concat([decipher.update(sealed.subarray(12, 12 + 32)), decipher.final()])
      } catch {
        throw new EncryptionFailure()
      }
    },
  }
}

/**
 * Linux/filesystem adapter. Never include this directory in a database backup.
 * A separate wrapping key for every DEK means a restored database key row is insufficient.
 * The synthetic vault stores wrapping keys in clear files; the hosted vault seals each one
 * with a master key held only in the host's secret environment, so neither a copied volume
 * nor a database backup alone can decrypt financial fields.
 */
class FilesystemKeyManagement implements KeyManagementPort {
  constructor(
    readonly directory: string,
    readonly kind: 'local-synthetic' | 'sealed-volume',
    private readonly sealer?: WrappingKeySealer,
  ) {}

  private profileDirectory(profileId: string) {
    return join(this.directory, profileToken(profileId))
  }
  private async readWrappingKey(profileId: string, directory: string, keyId: string) {
    const stored = await readPrivate(join(directory, `${keyId}.key`))
    if (!this.sealer) return stored
    try {
      return this.sealer.open(profileToken(profileId), keyId, stored)
    } finally {
      stored.fill(0)
    }
  }
  private async removeKeys(directory: string) {
    const files = await readdir(directory)
    if (files.filter((name) => KEY_FILE.test(name)).length > MAX_KEYS_PER_PROFILE)
      throw new EncryptionFailure()
    for (const filename of files) {
      if (filename === '.destroyed' || SOURCE_ERASURE_ANCHOR.test(filename)) continue
      if (!KEY_FILE.test(filename)) throw new EncryptionFailure()
      await unlink(join(directory, filename)).catch((error: unknown) => {
        if (!missing(error)) throw error
      })
    }
    await syncDirectory(directory)
  }
  async cleanDestroyedProfiles() {
    const directories = await readdir(this.directory)
    for (const name of directories) {
      if (!PROFILE_DIRECTORY.test(name)) throw new EncryptionFailure()
      const directory = join(this.directory, name)
      await privateDirectory(directory)
      if (await destroyed(directory)) await this.removeKeys(directory)
    }
  }

  async create(profileId: string, dataKey: Uint8Array) {
    const directory = this.profileDirectory(profileId)
    const wrappingKey = randomBytes(32)
    let keyId: string | undefined
    try {
      if (dataKey.length !== 32) throw new EncryptionFailure()
      await privateDirectory(directory)
      if (await destroyed(directory)) throw new EncryptionFailure()
      if (
        (await readdir(directory)).filter((name) => KEY_FILE.test(name)).length >=
        MAX_KEYS_PER_PROFILE
      )
        throw new EncryptionFailure()
      keyId = createEncryptionKeyId()
      await writeExclusive(
        join(directory, `${keyId}.key`),
        this.sealer ? this.sealer.seal(profileToken(profileId), keyId, wrappingKey) : wrappingKey,
      )
      await syncDirectory(directory)
      // A destroy marker wins over a concurrently prepared candidate.
      if (await destroyed(directory)) {
        await this.discardCandidate(profileId, keyId)
        throw new EncryptionFailure()
      }
      return { keyId, wrappedKey: wrapDataKey(profileId, keyId, wrappingKey, dataKey) }
    } catch {
      if (keyId) await this.discardCandidate(profileId, keyId).catch(() => undefined)
      throw new EncryptionFailure()
    } finally {
      wrappingKey.fill(0)
    }
  }
  async unwrap(profileId: string, keyId: string, wrappedKey: string): Promise<Buffer> {
    let wrappingKey: Buffer | undefined
    try {
      assertEncryptionKeyId(keyId)
      const directory = this.profileDirectory(profileId)
      await privateDirectory(directory)
      if (await destroyed(directory)) throw new EncryptionFailure()
      wrappingKey = await this.readWrappingKey(profileId, directory, keyId)
      if (wrappingKey.length !== 32 || (await destroyed(directory))) throw new EncryptionFailure()
      return unwrapDataKey(profileId, keyId, wrappingKey, wrappedKey)
    } catch {
      throw new EncryptionFailure()
    } finally {
      wrappingKey?.fill(0)
    }
  }
  async discardCandidate(profileId: string, keyId: string): Promise<void> {
    try {
      assertEncryptionKeyId(keyId)
      const directory = this.profileDirectory(profileId)
      await unlink(join(directory, `${keyId}.key`)).catch((error: unknown) => {
        if (!missing(error)) throw error
      })
      await syncDirectory(directory)
    } catch {
      throw new EncryptionFailure()
    }
  }
  async destroyProfile(profileId: string, expectedKeyId?: string | null): Promise<void> {
    let expectedWrappingKey: Buffer | undefined
    try {
      const directory = this.profileDirectory(profileId)
      await privateDirectory(directory)
      if (!(await destroyed(directory))) {
        if (expectedKeyId !== undefined && expectedKeyId !== null) {
          assertEncryptionKeyId(expectedKeyId)
          // A differently configured vault cannot certify destruction of another vault's key.
          expectedWrappingKey = await this.readWrappingKey(profileId, directory, expectedKeyId)
          if (expectedWrappingKey.length !== 32) throw new EncryptionFailure()
        }
        try {
          await writeExclusive(
            join(directory, '.destroyed'),
            Buffer.from('lilleri-local-profile-destroyed-v1\n'),
          )
        } catch (error) {
          if (
            error === null ||
            typeof error !== 'object' ||
            !('code' in error) ||
            error.code !== 'EEXIST' ||
            !(await destroyed(directory))
          )
            throw error
        }
        // Persist the irreversible fence before removing wrapping-key files.
        await syncDirectory(directory)
      }
      await this.removeKeys(directory)
    } catch {
      throw new EncryptionFailure()
    } finally {
      expectedWrappingKey?.fill(0)
    }
  }
}

export async function createLocalSyntheticKeyManagement(options: {
  readonly directory: string
  readonly mode: 'demo' | 'local-auth'
}): Promise<KeyManagementPort> {
  if (
    (options.mode !== 'demo' && options.mode !== 'local-auth') ||
    !options.directory ||
    options.directory.includes('\0')
  )
    throw new EncryptionFailure()
  const directory = resolve(options.directory)
  await privateDirectory(directory)
  const provider = new FilesystemKeyManagement(directory, 'local-synthetic')
  // A crash after the irreversible marker cannot leave a key usable on the next boot.
  await provider.cleanDestroyedProfiles()
  return provider
}

/** Decodes the hosted vault master key: exactly 32 random bytes, base64url without padding. */
export function hostedVaultMasterKey(value: string | undefined): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new EncryptionFailure()
  const decoded = Buffer.from(value, 'base64url')
  if (decoded.length !== 32 || decoded.toString('base64url') !== value)
    throw new EncryptionFailure()
  if (decoded.every((byte) => byte === decoded[0])) throw new EncryptionFailure()
  return decoded
}

/**
 * Hosted vault on a persistent volume that is never part of the PostgreSQL service or its
 * backups. Destroying a profile removes its sealed wrapping keys (crypto-shredding of every
 * database copy); the master key alone cannot decrypt anything without the volume files.
 */
export async function createSealedVolumeKeyManagement(options: {
  readonly directory: string
  readonly masterKey: Buffer
}): Promise<KeyManagementPort> {
  if (!options.directory || options.directory.includes('\0') || options.masterKey.length !== 32)
    throw new EncryptionFailure()
  const directory = resolve(options.directory)
  await privateDirectory(directory)
  const provider = new FilesystemKeyManagement(
    directory,
    'sealed-volume',
    masterKeySealer(options.masterKey),
  )
  await provider.cleanDestroyedProfiles()
  return provider
}
