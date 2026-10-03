import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { validateZeroBudgetPolicy } from './economics.mjs'

export const ZERO_BUDGET_PORTS = Object.freeze({ api: 3191, web: 8181 })

export function zeroBudgetEnvironment(parent, root, policy) {
  validateZeroBudgetPolicy(policy)
  const env = {}
  // Do not inherit cloud databases, payment/provider keys, OTLP exporters or NODE_OPTIONS.
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
  ])
    if (parent[key] !== undefined) env[key] = parent[key]
  const identity = createHash('sha256').update(root).digest('hex').slice(0, 24)
  Object.assign(env, {
    NODE_ENV: 'development',
    DEMO_MODE: '1',
    LOCAL_AUTH_MODE: '0',
    API_HOST: '127.0.0.1',
    API_PORT: String(ZERO_BUDGET_PORTS.api),
    PGLITE_PATH: join(root, '.lilleri', 'zero-budget', 'data'),
    LOCAL_KEY_VAULT_PATH: join(homedir(), '.lilleri-zero-budget', identity, 'keys'),
    SOURCE_ERASURE_JOURNAL_PATH: join(
      homedir(),
      '.lilleri-zero-budget',
      identity,
      'source-journal',
    ),
    EXPO_PUBLIC_API_URL: `http://127.0.0.1:${ZERO_BUDGET_PORTS.api}`,
    EXPO_PUBLIC_LOCAL_AUTH_MODE: '0',
    EXPO_OFFLINE: '1',
    EXPO_NO_TELEMETRY: '1',
    EXPO_NO_DOTENV: '1',
    TURBO_TELEMETRY_DISABLED: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    npm_config_offline: 'true',
    CI: '1',
  })
  return env
}

/** Stop if a future server switches away from the current synthetic entry point. */
export function assertSyntheticEntryPoint(source) {
  if (
    !/const provider = new MockItalianProvider\(\);?\s/u.test(source) ||
    !source.includes('assertDemoConfiguration(demoMode, process.env.NODE_ENV, host)')
  )
    throw new Error('The zero-budget launcher requires the reviewed synthetic demo server')
}

export function assertBootstrapBrowserOrigins(source) {
  const origins = /const allowedOrigins = new Set\(\[([\s\S]*?)\]\)/u.exec(source)?.[1]
  if (
    !origins ||
    !['localhost', '127.0.0.1'].every((host) =>
      origins.includes(`'http://${host}:${ZERO_BUDGET_PORTS.web}'`),
    )
  )
    throw new Error('The API must explicitly trust both loopback browser preview origins')
}
