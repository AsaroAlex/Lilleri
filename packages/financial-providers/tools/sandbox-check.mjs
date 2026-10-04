import { YapilySandboxReadAdapter } from '../dist/index.js'

const required = [
  'YAPILY_SANDBOX_APPLICATION_ID',
  'YAPILY_SANDBOX_APPLICATION_SECRET',
  'YAPILY_SANDBOX_PERMISSION_REFERENCE',
  'YAPILY_SANDBOX_PROFILE_ID',
  'YAPILY_SANDBOX_CONNECTION_ID',
  'YAPILY_SANDBOX_GRANT_ID',
  'YAPILY_SANDBOX_CONSENT_ID',
  'YAPILY_SANDBOX_CONSENT_TOKEN',
  'YAPILY_SANDBOX_FROM',
  'YAPILY_SANDBOX_BEFORE',
]
const missing = required.filter((name) => !process.env[name]?.trim())
const execute = process.argv.slice(2).includes('--execute')
const unknown = process.argv.slice(2).filter((argument) => argument !== '--execute')

if (unknown.length || missing.length || !execute) {
  process.stdout.write(
    `${JSON.stringify({
      provider: 'yapily-sandbox',
      environment: 'sandbox',
      status: unknown.length ? 'invalid_arguments' : missing.length ? 'blocked' : 'configured',
      execution: 'not_started',
      missing,
      requiresExplicitExecution: true,
      officialSandboxAcceptance: 'unverified',
      liveBankCoverage: 'unverified',
    })}\n`,
  )
  if (unknown.length || (execute && missing.length)) process.exitCode = 2
} else {
  let adapter
  const shutdown = () => adapter?.close()
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  try {
    const binding = {
      profileId: process.env.YAPILY_SANDBOX_PROFILE_ID,
      connectionId: process.env.YAPILY_SANDBOX_CONNECTION_ID,
      grantId: process.env.YAPILY_SANDBOX_GRANT_ID,
      institutionId: 'modelo-sandbox',
      consentId: process.env.YAPILY_SANDBOX_CONSENT_ID,
      consentToken: process.env.YAPILY_SANDBOX_CONSENT_TOKEN,
    }
    adapter = new YapilySandboxReadAdapter({
      applicationId: process.env.YAPILY_SANDBOX_APPLICATION_ID,
      applicationSecret: process.env.YAPILY_SANDBOX_APPLICATION_SECRET,
      permissionReference: process.env.YAPILY_SANDBOX_PERMISSION_REFERENCE,
      binding,
    })
    const capture = await adapter.capture(binding, {
      from: process.env.YAPILY_SANDBOX_FROM,
      before: process.env.YAPILY_SANDBOX_BEFORE,
    })
    // Financial details, bindings, tokens and provider messages never go to stdout.
    process.stdout.write(
      `${JSON.stringify({
        provider: capture.providerId,
        environment: capture.environment,
        status: 'passed',
        execution: 'read_only_sandbox',
        accountCount: capture.accounts.length,
        transactionCount: capture.transactions.length,
        transactionsWithoutId: capture.transactions.filter((record) => record.id === null).length,
        consistency: capture.consistency,
        pendingSet: capture.pendingSet,
        deletionEvidence: capture.deletionEvidence,
        observedAt: capture.observedAt,
        liveBankCoverage: 'unverified',
        productionAdmission: 'blocked',
      })}\n`,
    )
  } catch (error) {
    const known = [
      'configuration',
      'invalid_contract',
      'sandbox_only',
      'stale_generation',
      'unauthorized',
      'consent_unusable',
      'not_found',
      'unsupported',
      'rate_limited',
      'unavailable',
      'timeout',
      'cancelled',
      'bound_reached',
    ]
    process.stdout.write(
      `${JSON.stringify({
        provider: 'yapily-sandbox',
        environment: 'sandbox',
        status: 'failed',
        code: known.includes(error?.code) ? error.code : 'invalid_contract',
        officialSandboxAcceptance: 'unverified',
        liveBankCoverage: 'unverified',
      })}\n`,
    )
    process.exitCode = 1
  } finally {
    adapter?.close()
    process.removeListener('SIGINT', shutdown)
    process.removeListener('SIGTERM', shutdown)
  }
}
