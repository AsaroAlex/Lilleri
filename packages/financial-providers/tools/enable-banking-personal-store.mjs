import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, realpath, rename, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

const maximumBytes = 16_000_000
const failure = () =>
  Object.assign(new Error('Private local storage is unavailable'), { code: 'private_storage' })
const absent = (error) => error?.code === 'ENOENT'
const inside = (root, path) => {
  const difference = relative(root, path)
  return (
    !difference ||
    (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference))
  )
}

export function assertPrivatePath(path, repositoryRoot) {
  if (
    typeof path !== 'string' ||
    !isAbsolute(path) ||
    path.includes('\0') ||
    inside(resolve(repositoryRoot), resolve(path))
  )
    throw failure()
  return resolve(path)
}

function privateStat(stat, kind) {
  if (
    (kind === 'directory' ? !stat.isDirectory() : !stat.isFile()) ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o077) !== 0 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw failure()
}

async function privateDirectory(path, repositoryRoot) {
  assertPrivatePath(path, repositoryRoot)
  await mkdir(path, { recursive: true, mode: 0o700 })
  privateStat(await lstat(path), 'directory')
  assertPrivatePath(await realpath(path), repositoryRoot)
}

export async function readPrivateFile(path, maximum = maximumBytes, repositoryRoot) {
  if (repositoryRoot) {
    assertPrivatePath(await realpath(path), repositoryRoot)
    privateStat(await lstat(dirname(path)), 'directory')
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    privateStat(stat, 'file')
    if (stat.size > maximum) throw failure()
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}

async function writeNew(path, body) {
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

function encryptValue(value, key, format) {
  const plain = Buffer.from(JSON.stringify(value))
  try {
    if (plain.length > maximumBytes) throw failure()
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, nonce)
    cipher.setAAD(Buffer.from(format))
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
    return Buffer.from(
      JSON.stringify({
        format,
        nonce: nonce.toString('base64url'),
        tag: cipher.getAuthTag().toString('base64url'),
        ciphertext: ciphertext.toString('base64url'),
      }),
    )
  } finally {
    plain.fill(0)
  }
}

function decode(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/u.test(value)) throw failure()
  const bytes = Buffer.from(value, 'base64url')
  if (bytes.toString('base64url') !== value || (length !== undefined && bytes.length !== length))
    throw failure()
  return bytes
}

function decryptValue(bytes, key, format) {
  let plain
  try {
    const envelope = JSON.parse(bytes.toString('utf8'))
    if (
      Object.keys(envelope).sort().join(',') !== 'ciphertext,format,nonce,tag' ||
      envelope.format !== format
    )
      throw failure()
    const decipher = createDecipheriv('aes-256-gcm', key, decode(envelope.nonce, 12))
    decipher.setAAD(Buffer.from(format))
    decipher.setAuthTag(decode(envelope.tag, 16))
    plain = Buffer.concat([decipher.update(decode(envelope.ciphertext)), decipher.final()])
    if (plain.length > maximumBytes) throw failure()
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain))
  } catch {
    throw failure()
  } finally {
    plain?.fill(0)
  }
}

/** Private, single-operator storage. It makes no hosted KMS or backup-erasure claim. */
export async function createPrivateSessionStore({ directory, keyPath, repositoryRoot }) {
  directory = assertPrivatePath(directory, repositoryRoot)
  keyPath = assertPrivatePath(keyPath, repositoryRoot)
  if (inside(directory, keyPath)) throw failure()
  await privateDirectory(directory, repositoryRoot)
  await privateDirectory(dirname(keyPath), repositoryRoot)
  if (inside(await realpath(directory), await realpath(dirname(keyPath)))) throw failure()
  const lockPath = resolve(directory, '.personal-session.lock')
  try {
    await writeNew(lockPath, Buffer.from('lilleri-personal-session-lock-v1\n'))
  } catch {
    throw failure()
  }
  let key
  let closed = false
  try {
    try {
      key = await readPrivateFile(keyPath, 32)
    } catch (error) {
      if (!absent(error)) throw error
      const candidate = randomBytes(32)
      try {
        await writeNew(keyPath, candidate)
      } finally {
        candidate.fill(0)
      }
      key = await readPrivateFile(keyPath, 32)
    }
    if (key.length !== 32) throw failure()
  } catch {
    key?.fill(0)
    await unlink(lockPath).catch(() => {})
    throw failure()
  }
  const sessionPath = resolve(directory, 'session.enc')
  const active = () => {
    if (closed) throw failure()
  }
  return {
    async checkWritable() {
      active()
      const probe = resolve(directory, `.writable-${randomUUID()}.tmp`)
      try {
        await writeNew(probe, Buffer.from('lilleri-personal-write-probe-v1\n'))
      } finally {
        await unlink(probe).catch(() => {})
      }
    },
    async read() {
      active()
      try {
        let bytes
        try {
          bytes = await readPrivateFile(sessionPath, 24_000_000)
        } catch (error) {
          if (absent(error)) return null
          throw error
        }
        return decryptValue(bytes, key, 'lilleri.enable-banking.personal-session.v1')
      } catch {
        throw failure()
      }
    },
    async write(value) {
      active()
      const temporary = resolve(directory, `.session-${randomUUID()}.tmp`)
      try {
        try {
          privateStat(await lstat(sessionPath), 'file')
        } catch (error) {
          if (!absent(error)) throw error
        }
        await writeNew(
          temporary,
          encryptValue(value, key, 'lilleri.enable-banking.personal-session.v1'),
        )
        await rename(temporary, sessionPath)
      } catch {
        throw failure()
      } finally {
        await unlink(temporary).catch(() => {})
      }
    },
    async exportCapture(path, value) {
      active()
      await exportPrivateCapture(path, value, repositoryRoot, key)
    },
    async clear() {
      active()
      try {
        privateStat(await lstat(sessionPath), 'file')
        await unlink(sessionPath)
      } catch (error) {
        if (!absent(error)) throw failure()
      }
    },
    async close() {
      if (closed) return
      closed = true
      key.fill(0)
      await unlink(lockPath)
    },
  }
}

/** Financial capture is written only for a separately supplied export destination; never overwritten. */
export async function exportPrivateCapture(path, value, repositoryRoot, encryptionKey) {
  const destination = assertPrivatePath(path, repositoryRoot)
  assertPrivatePath(await realpath(dirname(destination)), repositoryRoot)
  privateStat(await lstat(dirname(destination)), 'directory')
  if (!(encryptionKey instanceof Uint8Array) || encryptionKey.length !== 32) throw failure()
  const bytes = encryptValue(value, encryptionKey, 'lilleri.enable-banking.personal-capture.v1')
  try {
    if (bytes.length > maximumBytes) throw failure()
    await writeNew(destination, bytes)
  } catch {
    throw failure()
  } finally {
    bytes.fill(0)
  }
}

/** Explicit local read only: the CLI requires an interactive terminal before emitting this value. */
export async function readPrivateCapture(path, keyPath, repositoryRoot) {
  assertPrivatePath(path, repositoryRoot)
  assertPrivatePath(keyPath, repositoryRoot)
  let key
  try {
    key = await readPrivateFile(keyPath, 32, repositoryRoot)
    if (key.length !== 32) throw failure()
    return decryptValue(
      await readPrivateFile(path, 24_000_000, repositoryRoot),
      key,
      'lilleri.enable-banking.personal-capture.v1',
    )
  } catch {
    throw failure()
  } finally {
    key?.fill(0)
  }
}
