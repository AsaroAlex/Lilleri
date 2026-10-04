import { assertHostedIdentityConfiguration, type HostedIdentityOptions } from './identity.js'
import { createResendIdentityDelivery } from './identity-mail.js'

type Environment = Readonly<Record<string, string | undefined>>
export type ReadinessStatus = 'missing' | 'invalid' | 'configured' | 'unverified' | 'blocked'
export interface HostedReadinessGate {
  readonly id: string
  readonly status: ReadinessStatus
  /** Fixed categorical codes; never a provider exception, URL, address or credential. */
  readonly code: string
  readonly variables: readonly string[]
}
export interface HostedReadinessReport {
  readonly format: 'lilleri.hosted-readiness.v1'
  readonly network: 'disabled'
  readonly productionReady: false
  readonly configurationComplete: boolean
  readonly gates: readonly HostedReadinessGate[]
}

const identityVariables = [
  'HOSTED_AUTH_BASE_URL',
  'HOSTED_AUTH_SECRET',
  'HOSTED_AUTH_TERMS_VERSION',
]
const mailVariables = ['IDENTITY_MAIL_PROVIDER', 'IDENTITY_MAIL_API_KEY', 'IDENTITY_MAIL_FROM']
const present = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !/[\r\n\0]/.test(value)
const reference = (value: string | undefined) => present(value) && value.length <= 2048

/** Creates the real mandatory delivery port without sending mail or opening a connection.
 * This is library configuration only. It neither starts an application nor certifies release readiness.
 */
export function hostedIdentityOptionsFromEnvironment(
  environment: Environment,
): Omit<HostedIdentityOptions, 'db'> {
  if (![...identityVariables, ...mailVariables].every((key) => present(environment[key])))
    throw new Error('Hosted identity configuration is incomplete')
  if (environment.IDENTITY_MAIL_PROVIDER !== 'resend')
    throw new Error('Hosted identity mail provider is unsupported')
  try {
    const baseURL = environment.HOSTED_AUTH_BASE_URL ?? ''
    const options: Omit<HostedIdentityOptions, 'db'> = {
      baseURL,
      secret: environment.HOSTED_AUTH_SECRET ?? '',
      termsVersion: environment.HOSTED_AUTH_TERMS_VERSION ?? '',
      delivery: createResendIdentityDelivery({
        apiKey: environment.IDENTITY_MAIL_API_KEY ?? '',
        from: environment.IDENTITY_MAIL_FROM ?? '',
        baseURL,
      }),
    }
    assertHostedIdentityConfiguration(options)
    return options
  } catch {
    throw new Error('Hosted identity configuration is invalid')
  }
}

function identityValid(environment: Environment) {
  assertHostedIdentityConfiguration({
    baseURL: environment.HOSTED_AUTH_BASE_URL ?? '',
    secret: environment.HOSTED_AUTH_SECRET ?? '',
    termsVersion: environment.HOSTED_AUTH_TERMS_VERSION ?? '',
    // Validation only: these callbacks are never installed in an application or called.
    delivery: { sendVerification: async () => {}, sendPasswordReset: async () => {} },
  })
  return true
}
function noticeURL(value: string | undefined, origin: string | undefined) {
  if (!present(value) || !present(origin)) return false
  const url = new URL(value)
  return (
    url.origin === origin &&
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    url.pathname !== '/' &&
    !url.search &&
    !url.hash
  )
}
function postgresTarget(value: string | undefined) {
  if (!present(value)) throw new Error('PostgreSQL configuration is incomplete')
  const url = new URL(value)
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    /^127\./.test(url.hostname) ||
    url.hostname.endsWith('.localhost') ||
    !url.username ||
    !url.password ||
    url.hash ||
    !/^\/[^/]+$/.test(url.pathname) ||
    url.searchParams.getAll('sslmode').length !== 1 ||
    url.searchParams.get('sslmode') !== 'verify-full' ||
    [...url.searchParams.keys()].some(
      (key) =>
        !['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].includes(key) ||
        url.searchParams.getAll(key).length !== 1 ||
        !present(url.searchParams.get(key) ?? undefined),
    )
  )
    throw new Error('PostgreSQL configuration is invalid')
  // Normalise DNS case and percent escapes before comparing targets and principals.
  const host = url.hostname.toLowerCase()
  const user = decodeURIComponent(url.username)
  const database = decodeURIComponent(url.pathname.slice(1))
  if (!present(user) || !present(database) || database.includes('/') || /[\r\n\0]/.test(user))
    throw new Error('PostgreSQL configuration is invalid')
  return { host, port: url.port || '5432', user, database }
}
function databaseValid(environment: Environment) {
  const migration = postgresTarget(environment.DATABASE_URL)
  const runtime = postgresTarget(environment.DATABASE_RUNTIME_URL)
  return (
    migration.host === runtime.host &&
    migration.port === runtime.port &&
    migration.database === runtime.database &&
    migration.user !== runtime.user &&
    environment.DATABASE_RESIDENCY === 'EU' &&
    reference(environment.DATABASE_REGION)
  )
}

/** Pure configuration inspection: no filesystem, DNS, mail, database or key service access.
 * A configured variable is a declaration, not evidence that a resource or approval exists.
 */
export function inspectHostedReadiness(environment: Environment): HostedReadinessReport {
  const gates: HostedReadinessGate[] = []
  const configuration = (id: string, variables: readonly string[], validate: () => boolean) => {
    let status: ReadinessStatus = 'configured'
    if (!variables.every((key) => present(environment[key]))) status = 'missing'
    else {
      try {
        if (!validate()) status = 'invalid'
      } catch {
        status = 'invalid'
      }
    }
    gates.push({ id, status, code: `${id}_${status}`, variables })
  }
  configuration(
    'release_mode',
    ['NODE_ENV', 'HOSTED_AUTH_MODE'],
    () =>
      environment.NODE_ENV === 'production' &&
      environment.HOSTED_AUTH_MODE === '1' &&
      environment.DEMO_MODE !== '1' &&
      environment.LOCAL_AUTH_MODE !== '1' &&
      environment.NODE_TLS_REJECT_UNAUTHORIZED !== '0' &&
      (!present(environment.PGSSLMODE) || environment.PGSSLMODE === 'verify-full') &&
      !present(environment.PGLITE_PATH) &&
      !present(environment.LOCAL_KEY_VAULT_PATH),
  )
  configuration('hosted_identity', identityVariables, () => identityValid(environment))
  configuration('identity_mail', [...mailVariables, 'HOSTED_AUTH_BASE_URL'], () => {
    hostedIdentityOptionsFromEnvironment(environment)
    return true
  })
  configuration(
    'reviewed_notices',
    ['HOSTED_AUTH_TERMS_URL', 'HOSTED_AUTH_PRIVACY_URL', 'HOSTED_NOTICE_REVIEW_REFERENCE'],
    () =>
      noticeURL(environment.HOSTED_AUTH_TERMS_URL, environment.HOSTED_AUTH_BASE_URL) &&
      noticeURL(environment.HOSTED_AUTH_PRIVACY_URL, environment.HOSTED_AUTH_BASE_URL) &&
      environment.HOSTED_AUTH_TERMS_URL !== environment.HOSTED_AUTH_PRIVACY_URL &&
      reference(environment.HOSTED_NOTICE_REVIEW_REFERENCE),
  )
  configuration(
    'browser_identity',
    [
      'EXPO_PUBLIC_HOSTED_AUTH_MODE',
      'EXPO_PUBLIC_API_URL',
      'EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION',
      'EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL',
    ],
    () =>
      environment.EXPO_PUBLIC_HOSTED_AUTH_MODE === '1' &&
      environment.EXPO_PUBLIC_LOCAL_AUTH_MODE !== '1' &&
      environment.EXPO_PUBLIC_API_URL === environment.HOSTED_AUTH_BASE_URL &&
      environment.EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION === environment.HOSTED_AUTH_TERMS_VERSION &&
      environment.EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL === environment.HOSTED_AUTH_TERMS_URL,
  )
  const publicSecret = Object.entries(environment).some(
    ([key, value]) =>
      key.startsWith('EXPO_PUBLIC_') &&
      /(?:SECRET|PASSWORD|API_KEY|PRIVATE_KEY|DATABASE_URL|TOKEN|CREDENTIAL|SERVICE_ROLE|SIGNING_KEY)/i.test(
        key,
      ) &&
      present(value),
  )
  gates.push({
    id: 'public_secrets',
    status: publicSecret ? 'invalid' : 'configured',
    code: publicSecret ? 'public_secret_exposure' : 'public_secret_names_absent',
    variables: [],
  })
  configuration(
    'postgres_configuration',
    ['DATABASE_URL', 'DATABASE_RUNTIME_URL', 'DATABASE_RESIDENCY', 'DATABASE_REGION'],
    () => databaseValid(environment),
  )
  configuration(
    'external_keys',
    ['KEY_MANAGEMENT_KIND', 'KEY_MANAGEMENT_PROVIDER', 'KEY_MANAGEMENT_KEY_REFERENCE'],
    () =>
      environment.KEY_MANAGEMENT_KIND === 'external' &&
      /^[a-z][a-z0-9-]{0,63}$/.test(environment.KEY_MANAGEMENT_PROVIDER ?? '') &&
      reference(environment.KEY_MANAGEMENT_KEY_REFERENCE),
  )
  configuration(
    'independent_journal',
    [
      'DELETION_JOURNAL_KIND',
      'DELETION_JOURNAL_STORE_REFERENCE',
      'DELETION_JOURNAL_SIGNING_KEY_REFERENCE',
      'DELETION_JOURNAL_CURRENTNESS_REFERENCE',
    ],
    () =>
      environment.DELETION_JOURNAL_KIND === 'external' &&
      [
        'DELETION_JOURNAL_STORE_REFERENCE',
        'DELETION_JOURNAL_SIGNING_KEY_REFERENCE',
        'DELETION_JOURNAL_CURRENTNESS_REFERENCE',
      ].every((key) => reference(environment[key])) &&
      !present(environment.SOURCE_ERASURE_JOURNAL_PATH) &&
      !present(environment.DELETION_JOURNAL_KEY_FILE),
  )
  configuration(
    'backup_restore',
    ['HOSTED_BACKUP_POLICY_REFERENCE', 'HOSTED_RESTORE_DRILL_REFERENCE'],
    () =>
      reference(environment.HOSTED_BACKUP_POLICY_REFERENCE) &&
      reference(environment.HOSTED_RESTORE_DRILL_REFERENCE),
  )
  configuration(
    'provider_account',
    [
      'FINANCIAL_PROVIDER',
      'FINANCIAL_PROVIDER_ACCOUNT_REFERENCE',
      'FINANCIAL_PROVIDER_CONTRACT_REFERENCE',
      'FINANCIAL_PROVIDER_SCOPE_REVIEW_REFERENCE',
    ],
    () =>
      ['yapily', 'enable-banking'].includes(environment.FINANCIAL_PROVIDER ?? '') &&
      [
        'FINANCIAL_PROVIDER_ACCOUNT_REFERENCE',
        'FINANCIAL_PROVIDER_CONTRACT_REFERENCE',
        'FINANCIAL_PROVIDER_SCOPE_REVIEW_REFERENCE',
      ].every((key) => reference(environment[key])),
  )
  const configurationComplete = gates.every((gate) => gate.status === 'configured')
  for (const id of [
    'notice_approval_and_publication',
    'mail_account_sender_and_delivery',
    'database_residency_tls_and_role_privileges',
    'key_durability_and_destruction',
    'journal_independence_authentication_and_currentness',
    'hosted_deletion_aware_restore',
    'provider_contract_entitlement_and_scopes',
  ])
    gates.push({ id, status: 'unverified', code: `${id}_unverified`, variables: [] })
  for (const id of [
    'hosted_runtime_entrypoint',
    'external_key_and_journal_runtime_adapters',
    'official_provider_sync_runtime_adapter',
  ])
    gates.push({ id, status: 'blocked', code: `${id}_not_implemented`, variables: [] })
  return {
    format: 'lilleri.hosted-readiness.v1',
    network: 'disabled',
    productionReady: false,
    configurationComplete,
    gates,
  }
}
