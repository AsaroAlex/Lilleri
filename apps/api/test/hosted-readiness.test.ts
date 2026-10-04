import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  hostedIdentityOptionsFromEnvironment,
  inspectHostedReadiness,
} from '../src/hosted-readiness.js'

const configuration = () => ({
  NODE_ENV: 'production',
  HOSTED_AUTH_MODE: '1',
  HOSTED_AUTH_BASE_URL: 'https://finance.example.com',
  HOSTED_AUTH_SECRET: 'synthetic-secret-not-for-deployment-0123456789',
  HOSTED_AUTH_TERMS_VERSION: 'reviewed-2026-10',
  IDENTITY_MAIL_PROVIDER: 'resend',
  IDENTITY_MAIL_API_KEY: 'synthetic-mail-key-not-for-deployment',
  IDENTITY_MAIL_FROM: 'identity@example.com',
  HOSTED_AUTH_TERMS_URL: 'https://finance.example.com/terms',
  HOSTED_AUTH_PRIVACY_URL: 'https://finance.example.com/privacy',
  HOSTED_NOTICE_REVIEW_REFERENCE: 'synthetic-review-reference',
  EXPO_PUBLIC_HOSTED_AUTH_MODE: '1',
  EXPO_PUBLIC_API_URL: 'https://finance.example.com',
  EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION: 'reviewed-2026-10',
  EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL: 'https://finance.example.com/terms',
  DATABASE_URL:
    'postgresql://migration:synthetic-migration-password@db.example.com/lilleri?sslmode=verify-full',
  DATABASE_RUNTIME_URL:
    'postgresql://runtime:synthetic-runtime-password@db.example.com/lilleri?sslmode=verify-full',
  DATABASE_RESIDENCY: 'EU',
  DATABASE_REGION: 'synthetic-eu-region',
  KEY_MANAGEMENT_KIND: 'external',
  KEY_MANAGEMENT_PROVIDER: 'synthetic-kms',
  KEY_MANAGEMENT_KEY_REFERENCE: 'synthetic-key-reference',
  DELETION_JOURNAL_KIND: 'external',
  DELETION_JOURNAL_STORE_REFERENCE: 'synthetic-store-reference',
  DELETION_JOURNAL_SIGNING_KEY_REFERENCE: 'synthetic-signing-reference',
  DELETION_JOURNAL_CURRENTNESS_REFERENCE: 'synthetic-currentness-reference',
  HOSTED_BACKUP_POLICY_REFERENCE: 'synthetic-backup-reference',
  HOSTED_RESTORE_DRILL_REFERENCE: 'synthetic-restore-reference',
  FINANCIAL_PROVIDER: 'yapily',
  FINANCIAL_PROVIDER_ACCOUNT_REFERENCE: 'synthetic-account-reference',
  FINANCIAL_PROVIDER_CONTRACT_REFERENCE: 'synthetic-contract-reference',
  FINANCIAL_PROVIDER_SCOPE_REVIEW_REFERENCE: 'synthetic-scope-reference',
})
const gate = (environment: Record<string, string | undefined>, id: string) =>
  inspectHostedReadiness(environment).gates.find((item) => item.id === id)

afterEach(() => vi.unstubAllGlobals())
describe('zero-network hosted readiness', () => {
  test('missing configuration is reported without connecting or throwing provider errors', () => {
    const fetch = vi.fn(() => {
      throw new Error('Network must remain disabled')
    })
    vi.stubGlobal('fetch', fetch)
    const report = inspectHostedReadiness({})
    expect(report.productionReady).toBe(false)
    expect(report.configurationComplete).toBe(false)
    expect(report.gates.filter((item) => item.status === 'missing')).toHaveLength(10)
    expect(report.gates.filter((item) => item.status === 'blocked')).toHaveLength(3)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('fully declared configuration neither sends mail nor becomes production evidence', () => {
    const fetch = vi.fn(() => {
      throw new Error('Network must remain disabled')
    })
    vi.stubGlobal('fetch', fetch)
    const env = configuration()
    const report = inspectHostedReadiness(env)
    expect(report.configurationComplete).toBe(true)
    expect(report.productionReady).toBe(false)
    expect(report.network).toBe('disabled')
    expect(report.gates.filter((item) => item.status === 'unverified')).toHaveLength(7)
    expect(report.gates.filter((item) => item.status === 'blocked')).toHaveLength(3)
    const options = hostedIdentityOptionsFromEnvironment(env)
    expect(options.baseURL).toBe(env.HOSTED_AUTH_BASE_URL)
    expect(typeof options.delivery.sendVerification).toBe('function')
    expect(typeof options.delivery.sendPasswordReset).toBe('function')
    expect(fetch).not.toHaveBeenCalled()
  })

  test.each([
    { HOSTED_AUTH_BASE_URL: 'http://finance.example.com' },
    { HOSTED_AUTH_BASE_URL: 'https://localhost' },
    { HOSTED_AUTH_BASE_URL: 'https://127.0.0.1' },
    { HOSTED_AUTH_BASE_URL: 'https://finance.example.com:443/' },
    { HOSTED_AUTH_BASE_URL: 'https://finance.example.com/path' },
    { HOSTED_AUTH_BASE_URL: 'https://finance.example.com?token=private' },
    { HOSTED_AUTH_SECRET: 'short' },
    { HOSTED_AUTH_TERMS_VERSION: 'local-synthetic-terms-v1' },
  ])('retains the hosted constructor restrictions: %j', (patch) => {
    expect(gate({ ...configuration(), ...patch }, 'hosted_identity')?.status).toBe('invalid')
  })

  test.each([
    { DEMO_MODE: '1' },
    { LOCAL_AUTH_MODE: '1' },
    { PGLITE_PATH: '/data/database' },
    { LOCAL_KEY_VAULT_PATH: '/data/vault' },
    { NODE_ENV: 'development' },
    { HOSTED_AUTH_MODE: '0' },
    { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    { PGSSLMODE: 'disable' },
  ])('refuses synthetic/public mode mixtures: %j', (patch) => {
    expect(gate({ ...configuration(), ...patch }, 'release_mode')?.status).toBe('invalid')
  })

  test.each([
    { IDENTITY_MAIL_PROVIDER: 'unimplemented-provider' },
    { IDENTITY_MAIL_API_KEY: 'unsafe\nsecret' },
    { IDENTITY_MAIL_FROM: 'sender-without-verified-domain' },
  ])('does not accept unsupported mail configuration: %j', (patch) => {
    expect(['invalid', 'missing']).toContain(
      gate({ ...configuration(), ...patch }, 'identity_mail')?.status,
    )
  })

  test.each([
    { HOSTED_AUTH_TERMS_URL: 'https://outside.example.com/terms' },
    { HOSTED_AUTH_PRIVACY_URL: 'https://finance.example.com/privacy?token=private' },
    { HOSTED_AUTH_PRIVACY_URL: 'https://finance.example.com/terms' },
    { HOSTED_AUTH_TERMS_URL: 'https://finance.example.com/' },
  ])('requires explicit same-origin published notice destinations: %j', (patch) => {
    expect(gate({ ...configuration(), ...patch }, 'reviewed_notices')?.status).toBe('invalid')
  })

  test.each([
    { EXPO_PUBLIC_API_URL: 'https://outside.example.com' },
    { EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION: 'other-reviewed-version' },
    { EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL: 'https://finance.example.com/other-terms' },
    { EXPO_PUBLIC_LOCAL_AUTH_MODE: '1' },
    { EXPO_PUBLIC_HOSTED_AUTH_MODE: '0' },
  ])('binds the browser to the same identity and notice configuration: %j', (patch) => {
    expect(gate({ ...configuration(), ...patch }, 'browser_identity')?.status).toBe('invalid')
  })

  test.each([
    'postgresql://runtime:private@db.example.com/lilleri',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=require',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=disable',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=verify-full&sslmode=disable',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=verify-full&ssl=false',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=verify-full&options=-c%20role=owner',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=verify-full&user=migration',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=verify-full&host=other-db.example.com',
    'postgresql://runtime:private@db.example.com/lilleri?sslmode=verify-full&sslrootcert=one&sslrootcert=two',
    'postgresql://migration:private@db.example.com/lilleri?sslmode=verify-full',
    'postgresql://%6digration:private@db.example.com/lilleri?sslmode=verify-full',
    'postgresql://runtime:private@other-db.example.com/lilleri?sslmode=verify-full',
    'postgresql://runtime:private@db.example.com/other?sslmode=verify-full',
    'postgresql://runtime:private@db.example.com:5433/lilleri?sslmode=verify-full',
    'postgresql://runtime:private@127.0.0.1/lilleri?sslmode=verify-full',
  ])('rejects weaker TLS, mixed database targets and equal principals', (runtimeURL) => {
    expect(
      gate({ ...configuration(), DATABASE_RUNTIME_URL: runtimeURL }, 'postgres_configuration')
        ?.status,
    ).toBe('invalid')
  })

  test('EU placement and privilege declarations remain unverified, including a local drill reference', () => {
    const env = configuration()
    expect(gate({ ...env, DATABASE_RESIDENCY: 'US' }, 'postgres_configuration')?.status).toBe(
      'invalid',
    )
    expect(gate(env, 'database_residency_tls_and_role_privileges')?.status).toBe('unverified')
    expect(
      gate(
        { ...env, HOSTED_RESTORE_DRILL_REFERENCE: 'lilleri.postgres-operations-drill.v1' },
        'hosted_deletion_aware_restore',
      )?.status,
    ).toBe('unverified')
  })

  test('a local filesystem journal or key vault cannot be relabelled as external', () => {
    const env = configuration()
    expect(gate({ ...env, KEY_MANAGEMENT_KIND: 'local-synthetic' }, 'external_keys')?.status).toBe(
      'invalid',
    )
    for (const key of ['SOURCE_ERASURE_JOURNAL_PATH', 'DELETION_JOURNAL_KEY_FILE'])
      expect(gate({ ...env, [key]: '/data/local-file' }, 'independent_journal')?.status).toBe(
        'invalid',
      )
    expect(gate(env, 'journal_independence_authentication_and_currentness')?.status).toBe(
      'unverified',
    )
  })

  test('public secret names are rejected regardless of suffix case', () => {
    expect(
      gate(
        { ...configuration(), EXPO_PUBLIC_auth_token: 'synthetic-public-token' },
        'public_secrets',
      )?.status,
    ).toBe('invalid')
  })

  test('never returns sensitive input or exception messages, even with malformed URLs and public secrets', () => {
    const env = {
      ...configuration(),
      DATABASE_URL: 'invalid-secret-connection-string',
      HOSTED_AUTH_BASE_URL: 'invalid-secret-origin',
      EXPO_PUBLIC_HOSTED_AUTH_SECRET: 'accidentally-public-secret',
      EXPO_PUBLIC_DATABASE_URL: 'accidentally-public-database-password',
      UNRELATED_PRIVATE_TOKEN: 'unrelated-secret',
    }
    const report = inspectHostedReadiness(env)
    expect(report.configurationComplete).toBe(false)
    expect(report.gates.find((item) => item.id === 'public_secrets')?.code).toBe(
      'public_secret_exposure',
    )
    const output = JSON.stringify(report)
    for (const key of [
      'DATABASE_URL',
      'DATABASE_RUNTIME_URL',
      'HOSTED_AUTH_BASE_URL',
      'HOSTED_AUTH_SECRET',
      'IDENTITY_MAIL_API_KEY',
      'IDENTITY_MAIL_FROM',
      'EXPO_PUBLIC_HOSTED_AUTH_SECRET',
      'EXPO_PUBLIC_DATABASE_URL',
      'UNRELATED_PRIVATE_TOKEN',
    ])
      expect(output).not.toContain(env[key as keyof typeof env])
    expect(output).not.toContain('UNRELATED_PRIVATE_TOKEN')
    const failure = (() => {
      try {
        hostedIdentityOptionsFromEnvironment(env)
      } catch (error) {
        return error
      }
    })()
    expect(failure).toBeInstanceOf(Error)
    expect(JSON.stringify(failure)).not.toContain(env.HOSTED_AUTH_BASE_URL)
    expect((failure as Error).message).toBe('Hosted identity configuration is invalid')
  })
})
