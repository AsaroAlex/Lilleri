import assert from 'node:assert/strict'
import test from 'node:test'
import { lintOperationalConfiguration } from './lint-operational-configuration.mjs'

test('rejects operational defaults despite whitespace, comments, arithmetic and TypeScript wrappers', () => {
  const variants = [
    `const options = { intervalMs: /* startup */ 60 * 1000 }`,
    `const options = { 'batchLimit': 4 as number }`,
    `const leaseMs = requested ?? (30_000 satisfies number)`,
    `function run(maxAttempts: number = 8) { return maxAttempts }`,
    `class Pump { attemptTimeoutMs = 10_000 }`,
    `const fallback = 0.1; const options = { traceSampleRatio: input ?? fallback }`,
    `settings.metricsEnabled = enabled ?? true`,
    `const options = { expiringOffsetSeconds: ready ? window : 0 }`,
    `const options = { ['intervalMs']: 1000 }`,
    `settings['batchLimit'] = 4`,
    `const options = { eventsPerProfile: 50, inboxDailyLimit: input }`,
    `const options = { expiryOffsetsSeconds: [] }`,
    `const windows = [7 * 24 * 3600, 86400] as const; const options = { expiryOffsetsSeconds: input ?? windows }`,
    `const windows = [configured.window, 86400]; const options = { expiryOffsetsSeconds: windows }`,
    `const options = { inboxDailyLimit: 1 }`,
    `const maxBalanceAgeMs = 24 * 60 * 60 * 1000`,
    `const policy = { occurrenceToleranceDays: 3 }`,
    `const policy = { maxForecastOccurrences: limit ?? 120 }`,
    `const policy = { horizonDays: 62 }`,
    `const policy = { jobsPerProfile: 4 }`,
    `const retryBaseMs = input ?? 1000`,
    `const policy = { maxPagesPerSlice: 20, maxPagesPerJob: saved }`,
    `const policy = { maxRecordsPerJob: 10000 }`,
    `const policy = { maxStageBytes: 2 * 1024 * 1024 }`,
    `const policy = { maxAccounts: 50 }`,
    `const policy = { pageSize: 100 }`,
    `const policy = { trailingDays: 30 }`,
    `const policy = { windowDays: 14 }`,
    `const policy = { inactiveAfterDays: 14 }`,
    `const policy = { freeDailyRefreshes: 1 }`,
    `const policy = { maxWaitSlices: 100 }`,
    `const policy = { stageRetentionMs: 86400000 }`,
    `const foregroundDebounceMs = settings.foregroundDebounceMs ?? 60000`,
    `const policy = { foregroundSessionLimit: 1000 }`,
    `const policy = { minimumOccurrences: 3 }`,
    `const policy = { longPeriodMinimumOccurrences: 2 }`,
    `const policy = { fixedAmountToleranceBps: 200 }`,
    `const policy = { variableAmountBandBps: 3500 }`,
    `const policy = { maxProjectedOccurrences: 1000 }`,
    `const historyPageSize = input ?? 20`,
    `const policy = { toleranceDays: {weekly: 2, monthly: stored.monthly} }`,
  ]
  for (const source of variants)
    assert.equal(lintOperationalConfiguration(source).length, 1, source)
})

test('accepts central defaults, runtime reads and validation safety bounds', () => {
  const source = `
    import { DEFAULT_RUNTIME_CONFIGURATION } from './runtime-config.js'
    const defaults = DEFAULT_RUNTIME_CONFIGURATION.revocation
    const leaseMs = options.leaseMs ?? defaults.leaseMs
    const maxAttempts = configuration.maxAttempts
    const settings = {
      intervalMs: stored.payloadRetention.intervalMs,
      batchLimit: configuration.batchLimit,
      metricsEnabled: options.metricsEnabled ?? defaults.metricsEnabled,
      traceSampleRatio: Number(environment.OBSERVABILITY_TRACE_SAMPLE_RATIO),
      expiryOffsetsSeconds: saved.notifications.expiryOffsetsSeconds,
      horizonDays: configured.understanding.horizonDays,
    }
    const windows = [configured.nextWindow, ...configured.otherWindows]
    const reminders = { expiryOffsetsSeconds: windows }
    if (leaseMs < 1000 || leaseMs > 300000) throw new Error('invalid')
    const physicalRetentionPolicy = 30 * 24 * 60 * 60 * 1000
  `
  assert.deepEqual(lintOperationalConfiguration(source), [])
})

test('comments and strings cannot masquerade as operational code', () => {
  const source = `
    // maxAttempts = 8
    const documentation = 'intervalMs: 1000'
    const note = \`traceSampleRatio: 0.1\`
    const metrics = { description: 'metricsEnabled: true' }
  `
  assert.deepEqual(lintOperationalConfiguration(source), [])
})

test('fails on invalid source rather than silently accepting an incomplete parse', () => {
  assert.throws(() => lintOperationalConfiguration('const intervalMs = '))
})
