import { execFile, spawn } from 'node:child_process'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, readFile, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

const require = createRequire(new URL('../packages/database/package.json', import.meta.url))
export const pg = require('pg')
export const sourceName = /^lilleri_synthetic_[a-z0-9_]{1,40}$/
export const restoreName = /^lilleri_restore_synthetic_[a-z0-9_]{1,34}$/
export const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
export const digest = (value) => createHash('sha256').update(canonical(value)).digest('hex')
export function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...keys].sort().join(',')
  )
}
export async function privateFile(path, maximum = 1024 * 1024) {
  const handle = await open(resolve(path), constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (
      !stat.isFile() ||
      (stat.mode & 0o077) !== 0 ||
      (process.getuid && stat.uid !== process.getuid()) ||
      stat.size > maximum
    )
      throw new Error('Independent input must be a private bounded regular file')
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}
export async function signingKey(path) {
  if (!path) throw new Error('Independent signing key file is required')
  const bytes = await privateFile(path, 1024)
  if (bytes.length === 32) return bytes
  if (/^[a-f0-9]{64}\s*$/i.test(bytes.toString('utf8')))
    return Buffer.from(bytes.toString('utf8').trim(), 'hex')
  throw new Error('Signing key must contain 32 bytes')
}
export async function readConfig(path) {
  const config = JSON.parse((await privateFile(path)).toString('utf8'))
  if (
    !exactKeys(config, ['format', 'scope', 'maintenanceUrl', 'transport']) ||
    config.format !== 'lilleri.postgres-operations-config.v1' ||
    config.scope !== 'local-synthetic' ||
    typeof config.maintenanceUrl !== 'string'
  )
    throw new Error('Explicit local synthetic configuration is required')
  const client = new pg.Client({ connectionString: config.maintenanceUrl })
  const parameters = client.connectionParameters
  if (
    !sourceName.test(parameters.database) ||
    !(
      parameters.host.startsWith('/') || ['127.0.0.1', 'localhost', '::1'].includes(parameters.host)
    ) ||
    !Number.isInteger(parameters.port) ||
    parameters.port < 1 ||
    parameters.port > 65535 ||
    parameters.options ||
    parameters.ssl
  )
    throw new Error('Only an isolated local synthetic database is permitted')
  if (config.transport !== null) {
    if (
      !exactKeys(config.transport, ['type', 'container', 'socketDirectory']) ||
      config.transport.type !== 'docker' ||
      !/^lilleri-postgres-ops-[a-f0-9]{10}$/.test(config.transport.container) ||
      config.transport.socketDirectory !== '/var/run/postgresql' ||
      !parameters.host.startsWith('/')
    )
      throw new Error('Invalid isolated PostgreSQL tooling transport')
  }
  return { ...config, parameters }
}
export function connectionUrl(config, database) {
  const value = new URL(config.maintenanceUrl)
  value.pathname = `/${database}`
  return value.href
}
export async function connect(config, database) {
  const client = new pg.Client({ connectionString: connectionUrl(config, database) })
  // Query/connection promises report failure; idle driver errors must never print its
  // Client object, which contains private connection parameters and protocol fields.
  client.on('error', () => {})
  await client.connect()
  return client
}
export async function verifyTransport(config) {
  if (!config.transport) return
  const environment = { PATH: process.env.PATH }
  for (const name of ['DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'])
    if (process.env[name]) environment[name] = process.env[name]
  const inspection = await promisify(execFile)(
    'docker',
    [
      'inspect',
      '--format',
      '{"network":{{json .HostConfig.NetworkMode}},"image":{{json .Config.Image}},"mounts":{{json .Mounts}}}',
      config.transport.container,
    ],
    { env: environment, maxBuffer: 65536, timeout: 10000 },
  )
  const metadata = JSON.parse(inspection.stdout)
  const socket = await realpath(config.parameters.host)
  if (
    metadata.network !== 'none' ||
    !/^postgres:16(?:\.|$)/.test(metadata.image) ||
    !metadata.mounts?.some(
      (mount) => mount.Source === socket && mount.Destination === config.transport.socketDirectory,
    )
  )
    throw new Error('Tooling must address the same isolated PostgreSQL socket and cluster')
}
export async function assertMaintenance(client) {
  const result = await client.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')
  if (result.rows[0]?.rolsuper !== true)
    throw new Error('This synthetic drill requires a dedicated isolated maintenance administrator')
}
export async function independentPaths(archive, inputs) {
  const base = await realpath(archive)
  for (const input of inputs.filter(Boolean)) {
    const resolved = await realpath(input)
    const path = relative(base, resolved)
    if (path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)))
      throw new Error('Current recovery material must remain outside the database backup')
  }
}
export async function fileDigest(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.size < 5 || stat.size > 512 * 1024 * 1024)
      throw new Error('Synthetic dump size is invalid')
    const hash = createHash('sha256')
    for await (const chunk of file.createReadStream({ autoClose: false })) hash.update(chunk)
    return { bytes: stat.size, sha256: hash.digest('hex'), format: 'postgres-custom' }
  } finally {
    await file.close()
  }
}
export function signManifest(body, key, keyId = 'local-postgres-backup-v1') {
  return {
    body,
    keyId,
    signature: createHmac('sha256', key).update(canonical({ body, keyId })).digest('hex'),
  }
}
export function verifyManifest(input, key, expectedDigest) {
  if (
    !exactKeys(input, ['body', 'keyId', 'signature']) ||
    !exactKeys(input.body, [
      'format',
      'scope',
      'createdAt',
      'snapshot',
      'serverVersion',
      'dump',
      'migrations',
      'rls',
    ]) ||
    input.body.format !== 'lilleri.postgres-backup.v1' ||
    input.body.scope !== 'local-synthetic' ||
    input.body.snapshot !== 'repeatable-read-exported' ||
    !/^\d+\.\d+(?:\.\d+)?$/.test(input.body.serverVersion) ||
    !/^local-[a-z0-9-]{1,100}$/.test(input.keyId) ||
    !/^[a-f0-9]{64}$/.test(input.signature) ||
    !/^[a-f0-9]{64}$/.test(expectedDigest) ||
    !exactKeys(input.body.dump, ['bytes', 'sha256', 'format']) ||
    !Number.isSafeInteger(input.body.dump.bytes) ||
    input.body.dump.bytes < 5 ||
    input.body.dump.bytes > 512 * 1024 * 1024 ||
    input.body.dump.format !== 'postgres-custom' ||
    !/^[a-f0-9]{64}$/.test(input.body.dump.sha256) ||
    !Array.isArray(input.body.migrations) ||
    !input.body.migrations.length ||
    input.body.migrations.length > 1000 ||
    input.body.migrations.some(
      (row) =>
        !exactKeys(row, ['name', 'checksum']) ||
        !/^\d+[a-z0-9_]+\.sql$/.test(row.name) ||
        !/^[a-f0-9]{64}$/.test(row.checksum),
    ) ||
    new Set(input.body.migrations.map((row) => row.name)).size !== input.body.migrations.length ||
    !Array.isArray(input.body.rls) ||
    !input.body.rls.length ||
    input.body.rls.length > 1000 ||
    input.body.rls.some(
      (row) =>
        !exactKeys(row, ['table', 'enabled', 'forced']) ||
        !/^[a-z_][a-z0-9_]+$/.test(row.table) ||
        typeof row.enabled !== 'boolean' ||
        typeof row.forced !== 'boolean',
    ) ||
    new Set(input.body.rls.map((row) => row.table)).size !== input.body.rls.length ||
    !input.body.rls.some((row) => row.table === 'transactions' && row.enabled && row.forced)
  )
    throw new Error('Backup manifest schema is invalid')
  if (new Date(input.body.createdAt).toISOString() !== input.body.createdAt)
    throw new Error('Backup manifest time is invalid')
  const expected = signManifest(input.body, key, input.keyId)
  if (
    !timingSafeEqual(Buffer.from(expected.signature, 'hex'), Buffer.from(input.signature, 'hex')) ||
    !timingSafeEqual(Buffer.from(digest(input), 'hex'), Buffer.from(expectedDigest, 'hex'))
  )
    throw new Error('Backup manifest is not the independently trusted version')
  return input
}
export async function catalog(client) {
  const migrations = (
    await client.query('SELECT name, checksum FROM schema_migrations ORDER BY name')
  ).rows
  const rls = (
    await client.query(
      "SELECT relname AS table, relrowsecurity AS enabled, relforcerowsecurity AS forced FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY relname",
    )
  ).rows
  if (
    !migrations.length ||
    !rls.some((row) => row.table === 'transactions' && row.enabled && row.forced)
  )
    throw new Error('Migration and forced RLS inventory is incomplete')
  return { migrations, rls }
}
export async function reviewedMigrations(inventory) {
  for (const row of inventory) {
    const bytes = await readFile(
      new URL(`../packages/database/migrations/${row.name}`, import.meta.url),
    )
    if (createHash('sha256').update(bytes).digest('hex') !== row.checksum)
      throw new Error('Applied migration differs from the reviewed checksum')
  }
}
export async function runTool(config, tool, args, database, inputFd, outputFd) {
  if (!['pg_dump', 'pg_restore'].includes(tool)) throw new Error('Unreviewed PostgreSQL tool')
  const parameters = config.parameters
  const environment = {
    PATH: process.env.PATH,
    PGHOST: config.transport?.socketDirectory ?? parameters.host,
    PGPORT: String(parameters.port),
    PGUSER: parameters.user,
    PGPASSWORD: parameters.password ?? '',
    PGDATABASE: database,
    PGSSLMODE: 'disable',
    PGCONNECT_TIMEOUT: '10',
  }
  let command = tool
  let flags = args
  if (config.transport) {
    command = 'docker'
    flags = [
      'exec',
      '-i',
      ...Object.keys(environment)
        .filter((name) => name.startsWith('PG'))
        .flatMap((name) => ['--env', name]),
      config.transport.container,
      tool,
      ...args,
    ]
    for (const name of ['DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'])
      if (process.env[name]) environment[name] = process.env[name]
  }
  await new Promise((fulfill, reject) => {
    const child = spawn(command, flags, {
      env: environment,
      stdio: [inputFd ?? 'ignore', outputFd ?? 'ignore', 'pipe'],
    })
    let bytes = 0
    let diagnostic = ''
    const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000)
    child.stderr.on('data', (chunk) => {
      bytes += chunk.length
      diagnostic = `${diagnostic}${chunk.toString('utf8')}`.slice(-16384)
      if (bytes > 65_536) child.kill('SIGKILL')
    })
    child.once('error', () => {
      clearTimeout(timeout)
      reject(new Error('PostgreSQL tooling failed'))
    })
    child.once('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        fulfill()
        return
      }
      const error = new Error('PostgreSQL tooling failed')
      error.code = diagnostic.includes('schema "public" already exists')
        ? 'tool_schema_exists'
        : diagnostic.includes('connection to server')
          ? 'tool_connection'
          : diagnostic.includes('must have read access to the file')
            ? 'tool_input_access'
            : diagnostic.includes('input file is too short')
              ? 'tool_short_input'
              : 'tool_rejected'
      reject(error)
    })
  })
}
export async function existingDirectory(path) {
  const stat = await lstat(path)
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o077) !== 0 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error('Independent recovery directory must already exist and remain private')
  return resolve(path)
}
