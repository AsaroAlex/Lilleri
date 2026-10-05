import { createPrivateKey } from 'node:crypto'
import { isAbsolute, resolve } from 'node:path'
import { hostedVaultMasterKey } from './encryption-local.js'
import { hostedIdentityOptionsFromEnvironment } from './hosted-readiness.js'
import type { HostedIdentityOptions } from './identity.js'

type Environment = Readonly<Record<string, string | undefined>>

export interface HostedBankConfiguration {
  readonly provider: 'enable-banking'
  readonly applicationId: string
  readonly privateKeyPem: string
  readonly environment: 'sandbox' | 'live'
  readonly countries: readonly string[]
  readonly maxActiveConnections: number | null
  readonly initialHistoryDays: number
}
export interface HostedDatabaseConfiguration {
  readonly url: string
  readonly runtimeUrl?: string
}
export interface HostedConfiguration {
  readonly host: string
  readonly port: number
  readonly baseURL: string
  readonly identity: Omit<HostedIdentityOptions, 'db'>
  readonly database: HostedDatabaseConfiguration
  readonly dataDirectory: string
  readonly vaultMasterKey: Buffer
  readonly healthHosts: readonly string[]
  readonly webDirectory: string
  readonly bank: HostedBankConfiguration | null
  readonly internalAccessToken?: string
}

/** Startup refuses incomplete or unsafe configuration. Messages name variables, never values. */
export class HostedConfigurationError extends Error {
  constructor(readonly variable: string) {
    super(`Hosted configuration is missing or invalid: ${variable}`)
    this.name = 'HostedConfigurationError'
  }
}
const present = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !/[\r\0]/.test(value)
function required(environment: Environment, name: string): string {
  const value = environment[name]
  if (!present(value)) throw new HostedConfigurationError(name)
  return value.trim()
}
function integer(
  environment: Environment,
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = environment[name]
  if (value === undefined || value === '') return fallback
  if (!/^\d{1,9}$/.test(value)) throw new HostedConfigurationError(name)
  const parsed = Number(value)
  if (parsed < min || parsed > max) throw new HostedConfigurationError(name)
  return parsed
}
/** Railway private networking (`*.railway.internal`) is an encrypted tunnel; anything else needs TLS. */
export function postgresConfiguration(value: string | undefined, name: string): string {
  if (!present(value)) throw new HostedConfigurationError(name)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new HostedConfigurationError(name)
  }
  const host = url.hostname.toLowerCase()
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !host ||
    !url.username ||
    !url.password ||
    url.hash ||
    !/^\/[^/]+$/.test(url.pathname) ||
    ['localhost', '127.0.0.1', '[::1]'].includes(host) ||
    host.endsWith('.localhost')
  )
    throw new HostedConfigurationError(name)
  const sslmode = url.searchParams.get('sslmode')
  if (url.searchParams.getAll('sslmode').length > 1) throw new HostedConfigurationError(name)
  const privateNetwork = host.endsWith('.railway.internal')
  if (!privateNetwork && !['require', 'verify-ca', 'verify-full'].includes(sslmode ?? ''))
    throw new HostedConfigurationError(name)
  if (sslmode === 'disable' || sslmode === 'allow' || sslmode === 'prefer')
    throw new HostedConfigurationError(name)
  return value
}
function internalToken(value: string) {
  const token = value.trim()
  if (token.length < 32 || /\s/.test(token))
    throw new HostedConfigurationError('INTERNAL_ACCESS_TOKEN')
  return token
}
function privateKey(environment: Environment): string {
  const encoded = environment.ENABLE_BANKING_PRIVATE_KEY_BASE64
  const raw = environment.ENABLE_BANKING_PRIVATE_KEY
  if (present(encoded) === present(raw))
    throw new HostedConfigurationError('ENABLE_BANKING_PRIVATE_KEY')
  const pem = present(encoded)
    ? Buffer.from(encoded.trim(), 'base64').toString('utf8')
    : (raw ?? '').replace(/\\n/g, '\n')
  try {
    const key = createPrivateKey(pem)
    const bits = key.asymmetricKeyDetails?.modulusLength ?? 0
    if (key.asymmetricKeyType !== 'rsa' || bits < 2048) throw new Error('weak key')
  } catch {
    throw new HostedConfigurationError('ENABLE_BANKING_PRIVATE_KEY')
  }
  return pem
}
function bankConfiguration(environment: Environment): HostedBankConfiguration | null {
  const configured = [
    'ENABLE_BANKING_APPLICATION_ID',
    'ENABLE_BANKING_PRIVATE_KEY',
    'ENABLE_BANKING_PRIVATE_KEY_BASE64',
  ].some((name) => present(environment[name]))
  if (!configured) return null
  const applicationId = required(environment, 'ENABLE_BANKING_APPLICATION_ID')
  if (!/^[A-Za-z0-9-]{8,128}$/.test(applicationId))
    throw new HostedConfigurationError('ENABLE_BANKING_APPLICATION_ID')
  const mode = required(environment, 'ENABLE_BANKING_ENVIRONMENT')
  if (mode !== 'sandbox' && mode !== 'production')
    throw new HostedConfigurationError('ENABLE_BANKING_ENVIRONMENT')
  const countries = (environment.BANK_COUNTRIES ?? 'IT')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
  if (!countries.length || countries.some((code) => !/^[A-Z]{2}$/.test(code)))
    throw new HostedConfigurationError('BANK_COUNTRIES')
  const capacity = environment.BANK_MAX_ACTIVE_CONNECTIONS
  return {
    provider: 'enable-banking',
    applicationId,
    privateKeyPem: privateKey(environment),
    environment: mode === 'production' ? 'live' : 'sandbox',
    countries: [...new Set(countries)],
    maxActiveConnections:
      capacity === undefined || capacity === ''
        ? null
        : integer(environment, 'BANK_MAX_ACTIVE_CONNECTIONS', 0, 0, 10_000_000),
    initialHistoryDays: integer(environment, 'BANK_INITIAL_HISTORY_DAYS', 90, 1, 730),
  }
}

export function hostedConfigurationFromEnvironment(
  environment: Environment,
  context: {
    readonly repositoryRoot: string
    /** The published terms version is code, tied to the served legal text, not configuration. */
    readonly termsVersion: string
    /** Trusted test/network-policy injection for outbound mail. */
    readonly fetch?: typeof globalThis.fetch
  },
): HostedConfiguration {
  if (environment.NODE_ENV !== 'production') throw new HostedConfigurationError('NODE_ENV')
  for (const name of ['DEMO_MODE', 'LOCAL_AUTH_MODE', 'EXPO_PUBLIC_LOCAL_AUTH_MODE'])
    if (environment[name] === '1') throw new HostedConfigurationError(name)
  for (const name of ['PGLITE_PATH', 'LOCAL_KEY_VAULT_PATH', 'SOURCE_ERASURE_JOURNAL_PATH'])
    if (present(environment[name])) throw new HostedConfigurationError(name)
  if (environment.NODE_TLS_REJECT_UNAUTHORIZED === '0')
    throw new HostedConfigurationError('NODE_TLS_REJECT_UNAUTHORIZED')
  const baseURL = required(environment, 'PUBLIC_BASE_URL')
  let identity: Omit<HostedIdentityOptions, 'db'>
  try {
    identity = hostedIdentityOptionsFromEnvironment(
      {
        ...environment,
        HOSTED_AUTH_BASE_URL: baseURL,
        HOSTED_AUTH_TERMS_VERSION: context.termsVersion,
      },
      context.fetch ? { fetch: context.fetch } : undefined,
    )
  } catch {
    throw new HostedConfigurationError('PUBLIC_BASE_URL, HOSTED_AUTH_SECRET or IDENTITY_MAIL_*')
  }
  let vaultMasterKey: Buffer
  try {
    vaultMasterKey = hostedVaultMasterKey(environment.LILLERI_VAULT_MASTER_KEY)
  } catch {
    throw new HostedConfigurationError('LILLERI_VAULT_MASTER_KEY')
  }
  const dataDirectory = resolve(environment.LILLERI_DATA_DIR ?? '/data')
  if (!isAbsolute(dataDirectory)) throw new HostedConfigurationError('LILLERI_DATA_DIR')
  const healthHosts = (environment.HEALTHCHECK_HOSTS ?? 'healthcheck.railway.app')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
  if (healthHosts.some((host) => !/^[a-z0-9.-]{1,253}(?::\d{1,5})?$/.test(host)))
    throw new HostedConfigurationError('HEALTHCHECK_HOSTS')
  const database: HostedDatabaseConfiguration = {
    url: postgresConfiguration(environment.DATABASE_URL, 'DATABASE_URL'),
    ...(present(environment.DATABASE_RUNTIME_URL)
      ? {
          runtimeUrl: postgresConfiguration(
            environment.DATABASE_RUNTIME_URL,
            'DATABASE_RUNTIME_URL',
          ),
        }
      : {}),
  }
  return {
    host: environment.HOST === '::' ? '::' : '0.0.0.0',
    port: integer(environment, 'PORT', 8080, 1024, 65535),
    baseURL,
    identity,
    database,
    dataDirectory,
    vaultMasterKey,
    healthHosts,
    webDirectory: resolve(context.repositoryRoot, environment.WEB_APP_DIR ?? 'apps/mobile/dist'),
    bank: bankConfiguration(environment),
    ...(present(environment.INTERNAL_ACCESS_TOKEN)
      ? { internalAccessToken: internalToken(environment.INTERNAL_ACCESS_TOKEN) }
      : {}),
  }
}
