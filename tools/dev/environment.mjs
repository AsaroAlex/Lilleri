import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

export const DEVELOPMENT_PORTS = Object.freeze({ gateway: 8080, api: 3191, expo: 8181, site: 3000 })

export function developmentConfiguration(parent, root) {
  if (parent.NODE_ENV === 'production')
    throw new Error('The interactive preview is development only')
  if (parent.LOCAL_AUTH_MODE === '1' || parent.EXPO_PUBLIC_LOCAL_AUTH_MODE === '1')
    throw new Error('The interactive preview uses the synthetic demo, without local authentication')
  if (parent.HOSTED_AUTH_MODE === '1' || parent.EXPO_PUBLIC_HOSTED_AUTH_MODE === '1')
    throw new Error(
      'The interactive preview uses the synthetic demo, without hosted authentication',
    )
  if (parent.DEMO_MODE !== undefined && parent.DEMO_MODE !== '1')
    throw new Error('The interactive preview requires DEMO_MODE=1')
  if (parent.DATABASE_URL || parent.DATABASE_RUNTIME_URL || parent.PG_TEST_DATABASE_URL)
    throw new Error('The interactive preview cannot use an inherited external database')
  const host = parent.DEV_HOST ?? '0.0.0.0'
  if (!['0.0.0.0', '127.0.0.1', 'localhost', '::1'].includes(host))
    throw new Error('DEV_HOST must be 0.0.0.0 or a loopback host')
  const port = Number(parent.DEV_PORT ?? parent.PORT ?? DEVELOPMENT_PORTS.gateway)
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('DEV_PORT must be an integer between 1024 and 65535')
  if (
    Object.values(DEVELOPMENT_PORTS)
      .filter((value) => value !== 8080)
      .includes(port)
  )
    throw new Error('DEV_PORT must differ from the internal service ports')
  const publicOrigin = parent.DEV_PUBLIC_ORIGIN ?? null
  if (publicOrigin !== null) {
    let url
    try {
      url = new URL(publicOrigin)
    } catch {
      throw new Error('DEV_PUBLIC_ORIGIN must be an exact HTTP or HTTPS origin')
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== publicOrigin)
      throw new Error('DEV_PUBLIC_ORIGIN must be an exact HTTP or HTTPS origin')
  }
  const env = {}
  // Allow only development toolchain settings. Never inherit provider credentials or NODE_OPTIONS.
  for (const key of [
    'PATH',
    'HOME',
    'USERPROFILE',
    'SystemRoot',
    'WINDIR',
    'TMPDIR',
    'TEMP',
    'TMP',
    'LANG',
    'TZ',
    'PNPM_HOME',
    'npm_config_cache',
    'XDG_CACHE_HOME',
    'XDG_DATA_HOME',
  ])
    if (parent[key] !== undefined) env[key] = parent[key]
  const dataPath = resolve(root, parent.DEV_DATA_PATH ?? '.lilleri/interactive/data')
  const identity = createHash('sha256').update(`${root}\n${dataPath}`).digest('hex').slice(0, 24)
  const recoveryBase = resolve(
    root,
    parent.DEV_RECOVERY_PATH ?? join(homedir(), '.lilleri-interactive'),
  )
  const recovery = join(recoveryBase, identity)
  const recoveryRelative = relative(dataPath, recovery)
  if (
    recoveryRelative === '' ||
    (!isAbsolute(recoveryRelative) && recoveryRelative.split(sep)[0] !== '..')
  )
    throw new Error('DEV_RECOVERY_PATH must keep keys and journals outside the database directory')
  Object.assign(env, {
    NODE_ENV: 'development',
    DEMO_MODE: '1',
    LOCAL_AUTH_MODE: '0',
    API_HOST: '127.0.0.1',
    API_PORT: String(DEVELOPMENT_PORTS.api),
    PGLITE_PATH: dataPath,
    LOCAL_KEY_VAULT_PATH: join(recovery, 'keys'),
    SOURCE_ERASURE_JOURNAL_PATH: join(recovery, 'source-journal'),
    EXPO_PUBLIC_API_URL: '/api',
    EXPO_PUBLIC_LOCAL_AUTH_MODE: '0',
    EXPO_PUBLIC_HOSTED_AUTH_MODE: '0',
    EXPO_OFFLINE: '1',
    EXPO_NO_TELEMETRY: '1',
    EXPO_NO_DOTENV: '1',
    TURBO_TELEMETRY_DISABLED: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_DEMO_URL: publicOrigin ?? `http://localhost:${port}`,
    npm_config_offline: 'true',
  })
  return { host, port, publicOrigin, env }
}
