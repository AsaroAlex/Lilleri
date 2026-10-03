import { createHash, randomBytes } from 'node:crypto'
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

/**
 * Synthetic Linux/filesystem adapter. Never include this directory in a database backup.
 * A separate wrapping key for every DEK means a restored database key row is insufficient.
 * Filesystem snapshots, disk remanence and copied vaults are explicitly outside this local proof.
 */
class LocalSyntheticKeyManagement implements KeyManagementPort {
  readonly kind = 'local-synthetic' as const
  constructor(readonly directory: string) {}

  private profileDirectory(profileId: string) {
    return join(this.directory, profileToken(profileId))
  }
  private async removeKeys(directory: string) {
    const files = await readdir(directory)
    if (files.length > MAX_KEYS_PER_PROFILE + 1) throw new EncryptionFailure()
    for (const filename of files) {
      if (filename === '.destroyed') continue
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
      if ((await readdir(directory)).length >= MAX_KEYS_PER_PROFILE) throw new EncryptionFailure()
      keyId = createEncryptionKeyId()
      await writeExclusive(join(directory, `${keyId}.key`), wrappingKey)
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
      wrappingKey = await readPrivate(join(directory, `${keyId}.key`))
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
          expectedWrappingKey = await readPrivate(join(directory, `${expectedKeyId}.key`))
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
  const provider = new LocalSyntheticKeyManagement(directory)
  // A crash after the irreversible marker cannot leave a key usable on the next boot.
  await provider.cleanDestroyedProfiles()
  return provider
}
