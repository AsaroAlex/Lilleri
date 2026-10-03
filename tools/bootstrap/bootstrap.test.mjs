import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assessEconomics,
  finapiBenchmarkCents,
  formatEuroCents,
  netReceiptCents,
  validateZeroBudgetPolicy,
} from './economics.mjs'
import {
  assertBootstrapBrowserOrigins,
  assertSyntheticEntryPoint,
  zeroBudgetEnvironment,
} from './environment.mjs'

const policy = JSON.parse(await readFile(new URL('./policy.json', import.meta.url), 'utf8'))
const initial = JSON.parse(await readFile(new URL('./scenario.json', import.meta.url), 'utf8'))
const clone = (value) => structuredClone(value)
function funded() {
  const scenario = clone(initial)
  scenario.annualSubscribers = 100
  scenario.cashAvailableAfterObligationsCents = 1_000_000
  scenario.unknownCosts = []
  scenario.bank = {
    monthlyNetInvoiceCents: 26_000,
    monthlyCashInvoiceCents: 31_720,
    setupCashCents: 0,
    commitmentMonths: 12,
    writtenQuoteVerified: true,
    licenceRouteVerified: true,
    productionReady: true,
    billingAndPaidBenefitReady: true,
  }
  return scenario
}

test('zero-investment beta cannot be reported as profitable or bank-ready', () => {
  const report = assessEconomics(initial, policy)
  assert.equal(report.monthlyNetRevenueCents, 0)
  assert.equal(report.monthlyContributionAfterBankCents, null)
  assert.equal(report.cashRequiredCents, null)
  assert.equal(report.bankExpansion, 'blocked')
  assert.ok(report.reasons.some((reason) => reason.includes('free beta')))
  assert.ok(report.unknownCosts.length > 0)
})

test('public benchmark handles minimums and cumulative billing at tier boundaries', () => {
  assert.equal(finapiBenchmarkCents(0).totalCents, 26_000)
  assert.equal(finapiBenchmarkCents(200).totalCents, 26_000)
  assert.equal(finapiBenchmarkCents(201).totalCents, 60_000)
  assert.equal(finapiBenchmarkCents(1_000).totalCents, 130_000)
  assert.equal(finapiBenchmarkCents(5_001).accessCents, 150_027)
  assert.equal(finapiBenchmarkCents(10_000).totalCents, 385_000)
  assert.equal(finapiBenchmarkCents(50_000).totalCents, 1_270_000)
  assert.equal(finapiBenchmarkCents(100_000).totalCents, 2_170_000)
})

test('VAT precedes net revenue; PSP and optional billing fees apply to the gross charge', () => {
  assert.equal(netReceiptCents(699, 2200, 150, 70, 25), 533)
  assert.equal(netReceiptCents(6999, 2200, 150, 70, 25), 5558)
  assert.equal(netReceiptCents(6999, 2200, 150, 0, 25), 5607)
})

test('annual revenue is recognised over twelve months and never fabricated as available cash', () => {
  const scenario = funded()
  scenario.cashAvailableAfterObligationsCents = 0
  const report = assessEconomics(scenario, policy)
  assert.equal(report.monthlyNetRevenueCents, 46_317)
  assert.equal(report.cashAvailableAfterObligationsCents, 0)
  assert.ok(report.monthlyContributionAfterBankCents > 0)
  assert.equal(report.bankExpansion, 'blocked')
  assert.ok(report.reasons.some((reason) => reason.includes('unrestricted cash')))
})

test('cash reserve includes VAT cash outflows, refunds and the complete contract term', () => {
  const scenario = funded()
  scenario.bank.commitmentMonths = 24
  const report = assessEconomics(scenario, policy)
  assert.equal(report.cashCoverageMonths, 24)
  assert.equal(report.cashRequiredCents, (31_720 + 4_632) * 24)
  scenario.cashAvailableAfterObligationsCents = report.cashRequiredCents - 1
  assert.equal(assessEconomics(scenario, policy).bankExpansion, 'blocked')
  scenario.cashAvailableAfterObligationsCents += 1
  assert.equal(assessEconomics(scenario, policy).bankExpansion, 'eligible-for-further-review')
})

test('funded projection never activates checkout, connections or services', () => {
  const report = assessEconomics(funded(), policy)
  assert.equal(report.bankExpansion, 'eligible-for-further-review')
  assert.equal(report.bankConnectionsEnabled, false)
  assert.equal(report.checkoutEnabled, false)
  assert.equal(report.kind, 'planning-only-no-activation')
})

test('each missing release prerequisite and each unresolved cost prevents expansion', () => {
  for (const key of [
    'writtenQuoteVerified',
    'licenceRouteVerified',
    'productionReady',
    'billingAndPaidBenefitReady',
  ]) {
    const scenario = funded()
    scenario.bank[key] = false
    assert.equal(assessEconomics(scenario, policy).bankExpansion, 'blocked')
  }
  const scenario = funded()
  scenario.unknownCosts = ['Support cost not yet measured']
  assert.equal(assessEconomics(scenario, policy).bankExpansion, 'blocked')
})

test('positive cash cannot compensate for an unprofitable bank plan', () => {
  const scenario = funded()
  scenario.annualSubscribers = 1
  assert.equal(assessEconomics(scenario, policy).bankExpansion, 'blocked')
})

test('reject invalid costs, contradictory invoices, unknown fields and unsafe policy overrides', () => {
  for (const value of [-1, 0.1, Number.NaN, Number.MAX_SAFE_INTEGER]) {
    const scenario = funded()
    scenario.fixedMonthlyCostCents = value
    assert.throws(() => assessEconomics(scenario, policy))
  }
  const invalid = funded()
  invalid.bank.monthlyCashInvoiceCents = 1
  assert.throws(() => assessEconomics(invalid, policy))
  const foreign = funded()
  foreign.providerKey = 'not-accepted'
  assert.throws(() => assessEconomics(foreign, policy))
  for (const key of [
    'freeExpires',
    'bankConnectionsEnabled',
    'externalInferenceEnabled',
    'checkoutEnabled',
  ]) {
    const altered = clone(policy)
    altered[key] = true
    assert.throws(() => validateZeroBudgetPolicy(altered))
  }
})

test('launcher strips inherited cloud credentials, remote database and dotenv injection', () => {
  const parent = {
    PATH: '/bin',
    DATABASE_URL: 'postgres://remote.invalid',
    STRIPE_SECRET_KEY: 'test-secret',
    OPENAI_API_KEY: 'test-secret',
    OTEL_EXPORTER_OTLP_ENDPOINT: 'https://remote.invalid',
    NODE_OPTIONS: '--import injected.mjs',
    DEMO_MODE: '0',
    API_HOST: '0.0.0.0',
    EXPO_PUBLIC_API_URL: 'https://remote.invalid',
  }
  const env = zeroBudgetEnvironment(parent, '/tmp/lilleri-example', policy)
  for (const key of [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'OPENAI_API_KEY',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'NODE_OPTIONS',
  ])
    assert.equal(env[key], undefined)
  assert.equal(env.API_HOST, '127.0.0.1')
  assert.equal(env.DEMO_MODE, '1')
  assert.equal(env.EXPO_PUBLIC_API_URL, 'http://127.0.0.1:3191')
  assert.equal(env.EXPO_NO_DOTENV, '1')
  assert.equal(env.EXPO_OFFLINE, '1')
  assert.notEqual(env.LOCAL_KEY_VAULT_PATH, env.PGLITE_PATH)
  assert.equal(parent.DEMO_MODE, '0')
})

test('launcher refuses a server whose provider becomes live', () => {
  assert.throws(() => assertSyntheticEntryPoint('const provider = new LiveProvider();'))
  assertSyntheticEntryPoint(
    'const provider = new MockItalianProvider();\nassertDemoConfiguration(demoMode, process.env.NODE_ENV, host)',
  )
})

test('launcher rejects a browser port not explicitly allowed by the API', () => {
  assert.throws(() =>
    assertBootstrapBrowserOrigins("const allowedOrigins = new Set(['http://localhost:8081'])"),
  )
  assertBootstrapBrowserOrigins(
    "const allowedOrigins = new Set(['http://localhost:8181', 'http://127.0.0.1:8181'])",
  )
})

test('financial displays retain exact cents and loss signs at the supported integer limit', () => {
  assert.equal(formatEuroCents(null), 'non determinabile')
  assert.equal(formatEuroCents(-1), '-0,01 €')
  assert.equal(formatEuroCents(9_007_199_254_740_991), '90071992547409,91 €')
  assert.throws(() => formatEuroCents(0.1))
})

test('oversized commitments fail instead of silently losing precision', () => {
  const scenario = funded()
  scenario.monthlySubscribers = 1_000_000
  scenario.annualSubscribers = 1_000_000
  scenario.freeUsers = 1_000_000
  scenario.paidUserMonthlyCostCents = 1_000_000_000
  scenario.freeUserMonthlyCostCents = 1_000_000_000
  scenario.bank.commitmentMonths = 120
  assert.throws(() => assessEconomics(scenario, policy), /exact supported cent arithmetic/u)
})

test('CLI emits a disabled planning report and rejects duplicate or unknown arguments', () => {
  const entry = fileURLToPath(new URL('./report.mjs', import.meta.url))
  const invoke = (args) =>
    spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 5_000 })
  const valid = invoke(['--json'])
  assert.equal(valid.status, 0, valid.stderr)
  const report = JSON.parse(valid.stdout)
  assert.equal(report.bankExpansion, 'blocked')
  assert.equal(report.bankConnectionsEnabled, false)
  assert.equal(report.checkoutEnabled, false)
  for (const args of [['--json', '--json'], ['--activate'], ['--scenario=']])
    assert.equal(invoke(args).status, 1)
})
