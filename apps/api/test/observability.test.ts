import Fastify from 'fastify'
import { afterEach, describe, expect, test } from 'vitest'
import {
  createObservability,
  type Observability,
  observabilityConfigurationFromEnvironment,
  operationForRoute,
  type SafeLogRecord,
  telemetryErrorClass,
} from '../src/observability.js'
import {
  assertSafeTelemetryProperties,
  PLANNED_SEMANTIC_EVENTS,
  parseSemanticEvent,
  SEMANTIC_EVENT_CATALOGUE,
  telemetryCountBucket,
} from '../src/observability-catalogue.js'
import { renderObservabilityDashboard } from '../src/observability-dashboard.js'
import { registerObservabilityHooks } from '../src/observability-hooks.js'

const collectors: Observability[] = []
function collector(options: Parameters<typeof createObservability>[0] = {}) {
  const instance = createObservability(options)
  collectors.push(instance)
  return instance
}
afterEach(async () => {
  await Promise.all(collectors.splice(0).map((instance) => instance.shutdown()))
})

describe('safe local semantic and operational observability', () => {
  test('catalogue has every PRD event without inventing implemented planned producers', () => {
    expect(Object.keys(SEMANTIC_EVENT_CATALOGUE)).toHaveLength(25)
    expect(() => parseSemanticEvent('subscription_started', { plan: 'plus' })).toThrow(
      'not implemented',
    )
    expect(PLANNED_SEMANTIC_EVENTS.has('subscription_started')).toBe(true)
    expect(
      parseSemanticEvent('sync_run', { status: 'partial', skipped_count_bucket: '2-5' }),
    ).toEqual({ status: 'partial', skipped_count_bucket: '2-5' })
  })
  test('forbidden nested keys, escaped key spellings and raw permitted-key values fail closed', () => {
    for (const key of [
      'amount_minor',
      'merchantName',
      'profile_id',
      'email',
      'description',
      'IBAN',
      'authorization',
      'accountId',
      'transaction_id',
      'userId',
      'household_id',
      'URL',
      'query',
      'error_message',
      'client_ip',
      'receipt',
      'sessionId',
      'cookie',
    ]) {
      expect(() =>
        assertSafeTelemetryProperties({ group: [{ [key]: 'sensitive-value' }] }),
      ).toThrow('Forbidden')
      expect(() => parseSemanticEvent('export_requested', { [key]: 'sensitive-value' })).toThrow()
    }
    expect(() =>
      parseSemanticEvent('consent_started', { institution: 'Real bank and personal email' }),
    ).toThrow('reviewed catalogue')
    expect(() =>
      parseSemanticEvent('category_corrected', {
        source_tier: 'user',
        decision_kind: 'once',
        from: 'health',
        to: 'religion',
      }),
    ).toThrow('reviewed catalogue')
    expect(() =>
      parseSemanticEvent('export_requested', { innocuous: 'raw financial text' }),
    ).toThrow('reviewed catalogue')
    expect(() => parseSemanticEvent('__proto__', {})).toThrow('Unknown')
  })
  test('guards never call attacker supplied getters and bound cycles/depth/arrays', () => {
    let reads = 0
    const object = Object.defineProperty({}, 'innocuous', {
      enumerable: true,
      get: () => {
        reads++
        return 'secret'
      },
    })
    const array = Object.defineProperty([null], '0', {
      enumerable: true,
      get: () => {
        reads++
        return 'secret'
      },
    })
    expect(() => assertSafeTelemetryProperties(object)).toThrow('accessors')
    expect(() => assertSafeTelemetryProperties(array)).toThrow('plain values')
    expect(reads).toBe(0)
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => assertSafeTelemetryProperties(circular)).toThrow('cycle')
    expect(() => assertSafeTelemetryProperties(Array(65).fill(false))).toThrow('bounds')
    expect(() => assertSafeTelemetryProperties(new Error('sensitive error'))).toThrow('plain JSON')
  })
  test('no-consent mode suppresses small aggregate cells and never sends optional event records', () => {
    const sent: unknown[] = []
    const instance = collector({
      semanticSink: (event) => sent.push(event),
      semanticMinimumCount: 3,
    })
    instance.emitSemantic('export_requested', {}, true)
    instance.emitSemantic('export_requested', {})
    expect(instance.snapshot().semanticAggregates).toEqual([])
    instance.emitSemantic('export_requested', {})
    expect(instance.snapshot().semanticAggregates).toEqual([
      { name: 'export_requested', properties: {}, count: 3 },
    ])
    expect(sent).toEqual([])
    expect(JSON.stringify(instance.snapshot())).not.toMatch(/profile|userId|traceId|timestamp/)
  })
  test('optional local sink requires both feature enablement and authoritative producer consent', () => {
    const sent: unknown[] = []
    const instance = collector({
      optionalAnalyticsEnabled: true,
      semanticSink: (event) => sent.push(event),
    })
    instance.emitSemantic('export_requested', {})
    expect(sent).toHaveLength(0)
    instance.emitSemantic('export_requested', {}, true)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toEqual({ version: '2026-10-03.1', name: 'export_requested', properties: {} })
  })
  test('strict count buckets never transmit exact counts and validate invalid numbers', () => {
    expect([0, 1, 2, 5, 6, 20, 21, 100, 101, 10000].map(telemetryCountBucket)).toEqual([
      '0',
      '1',
      '2-5',
      '2-5',
      '6-20',
      '6-20',
      '21-100',
      '21-100',
      '101+',
      '101+',
    ])
    for (const invalid of [-1, Number.NaN, Infinity, 1.2, Number.MAX_SAFE_INTEGER + 1])
      expect(() => telemetryCountBucket(invalid)).toThrow()
  })
  test('raw URLs collapse to bounded operation and parameter templates contain no identifiers', () => {
    expect(operationForRoute('POST', '/v1/connections/:id/sync')).toBe('connection_sync')
    expect(operationForRoute('POST', '/v1/connections/private-connection-id/sync')).toBe('unknown')
    expect(operationForRoute('GET', '/v1/export?email=sensitive')).toBe('unknown')
    expect(operationForRoute('GET', undefined)).toBe('unknown')
    expect(operationForRoute('PATCH', '/v1/transactions/:id/classification')).toBe('classification')
    for (const [route, operation] of [
      ['/v1/privacy/permissions/:purpose', 'privacy'],
      ['/v1/transactions/:id/privacy', 'privacy'],
      ['/v1/notifications/:id/destination', 'notifications'],
      ['/v1/connections/:id/consent-events', 'consent_lifecycle'],
      ['/v1/connections/:id/renew', 'consent_lifecycle'],
      ['/v1/support-access/:id/revoke', 'support_access'],
      ['/v1/import-mappings/:id', 'imports'],
      ['/v1/manual/accounts/:id/adjust', 'manual'],
      ['/v1/rules/:id/state', 'rules'],
    ]) {
      expect(operationForRoute('POST', route)).toBe(operation)
      expect(operationForRoute('POST', route?.replace(/:[a-z]+/g, 'PRIVATE-IDENTIFIER'))).toBe(
        'unknown',
      )
    }
    expect(operationForRoute('GET', '/v1/insights/monthly')).toBe('monthly_insights')
    expect(operationForRoute('GET', '/v1/safe-to-spend')).toBe('safe_to_spend')
    expect(operationForRoute('POST', '/v1/profile/deletion')).toBe('profile_delete')
    expect(operationForRoute('POST', '/v1/notifications?bank=PRIVATE')).toBe('unknown')
  })
  test('new registered HTTP routes retain only bounded operations and exclude private destination data', async () => {
    const logs: SafeLogRecord[] = []
    const instance = collector({ traceSampleRatio: 1, logSink: (record) => logs.push(record) })
    const app = Fastify({ logger: false })
    registerObservabilityHooks(app, instance)
    for (const route of [
      '/v1/notifications/:id/destination',
      '/v1/connections/:id/lifecycle',
      '/v1/privacy/permissions/:purpose',
      '/v1/import-mappings/:id',
      '/v1/support-access/:id/revoke',
      '/v1/insights/monthly',
      '/v1/safe-to-spend',
    ])
      app.get(route, async () => ({ connectionId: 'PRIVATE-DESTINATION', amount: '987654321' }))
    for (const route of [
      '/v1/notifications/PRIVATE-NOTICE/destination',
      '/v1/connections/PRIVATE-CONNECTION/lifecycle',
      '/v1/privacy/permissions/N-SERVICE',
      '/v1/import-mappings/PRIVATE-MAPPING',
      '/v1/support-access/PRIVATE-GRANT/revoke',
      '/v1/insights/monthly',
      '/v1/safe-to-spend',
    ])
      expect((await app.inject({ url: `${route}?profile=PRIVATE-PROFILE` })).statusCode).toBe(200)
    await instance.flush()
    await app.close()
    expect(logs.map((row) => row.properties.operation)).toEqual([
      'notifications',
      'consent_lifecycle',
      'privacy',
      'imports',
      'support_access',
      'monthly_insights',
      'safe_to_spend',
    ])
    const safe = JSON.stringify({ logs, metrics: instance.snapshot(), traces: instance.traces() })
    expect(safe).not.toMatch(/PRIVATE|987654321|N-SERVICE|connectionId|profileId/)
  })
  test('actual HTTP success, validation failure, unexpected error and unmatched paths emit no PII', async () => {
    const logs: SafeLogRecord[] = []
    const instance = collector({ traceSampleRatio: 1, logSink: (record) => logs.push(record) })
    const app = Fastify({ logger: false })
    registerObservabilityHooks(app, instance)
    app.get('/v1/transactions', async () => ({
      description: 'PRIVATE-TRANSACTION-DESCRIPTION',
      amountMinor: '123456789',
    }))
    app.post('/v1/connections/:id/sync', async () => {
      throw new Error('PRIVATE-ERROR-CONTENT')
    })
    app.post(
      '/v1/settings',
      {
        schema: {
          body: {
            type: 'object',
            properties: { enabled: { type: 'boolean' } },
            required: ['enabled'],
            additionalProperties: false,
          },
        },
      },
      async () => ({ ok: true }),
    )
    await app.inject({
      url: '/v1/transactions?query=PRIVATE-QUERY',
      headers: {
        cookie: 'session=PRIVATE-TOKEN',
        authorization: 'PRIVATE-HEADER',
        'x-forwarded-for': 'PRIVATE-IP',
      },
    })
    await app.inject({
      method: 'POST',
      url: '/v1/connections/PRIVATE-CONNECTION-ID/sync',
      payload: { description: 'PRIVATE-BODY' },
    })
    await app.inject({
      method: 'POST',
      url: '/v1/settings',
      payload: { enabled: 'PRIVATE-INVALID' },
    })
    await app.inject({ url: '/PRIVATE-NOT-FOUND' })
    await instance.flush()
    await app.close()
    const serialised = JSON.stringify({
      logs,
      metrics: instance.snapshot(),
      traces: instance.traces(),
      prometheus: instance.renderPrometheus(),
      dashboard: renderObservabilityDashboard(instance),
    })
    expect(serialised).not.toContain('PRIVATE')
    expect(serialised).not.toContain('123456789')
    expect(serialised).not.toMatch(
      /traceId|spanId|exception|stack|request\.url|http\.url|cookie|authorization/,
    )
    expect(logs.map((row) => row.properties.error_class)).toEqual([
      'none',
      'internal',
      'invalid_request',
      'not_found',
    ])
    expect(instance.traces()).toHaveLength(4)
    expect(
      instance
        .snapshot()
        .metrics.find(
          (row) =>
            row.name === 'lilleri_http_requests_total' &&
            row.labels.operation === 'connection_sync',
        ),
    ).toMatchObject({ value: 1, labels: { status_class: '5xx' } })
  })
  test('dynamic sampling and metrics configuration changes actual collection with no invalid rollback', async () => {
    const instance = collector({ traceSampleRatio: 0 })
    instance.startRequest('overview')(200)
    await instance.flush()
    expect(instance.traces()).toHaveLength(0)
    instance.setConfiguration({ traceSampleRatio: 1, metricsEnabled: false })
    const before = instance.snapshot().metrics
    instance.startRequest('overview')(200)
    await instance.flush()
    expect(instance.snapshot().metrics).toEqual(before)
    expect(instance.traces()).toHaveLength(1)
    expect(() => instance.setConfiguration({ traceSampleRatio: 2, metricsEnabled: true })).toThrow()
    expect(instance.configuration()).toEqual({ traceSampleRatio: 1, metricsEnabled: false })
    instance.setConfiguration({ traceSampleRatio: 0, metricsEnabled: true })
    instance.startRequest('overview')(500)
    expect(
      instance
        .snapshot()
        .metrics.find(
          (row) => row.name === 'lilleri_http_requests_total' && row.labels.status_class === '5xx',
        )?.value,
    ).toBe(1)
  })
  test('request completion is idempotent and histograms are cumulative with bounded non-negative durations', () => {
    let instant = 100
    const instance = collector({ monotonicNow: () => instant })
    const finish = instance.startRequest('overview')
    instant = 130
    finish(200)
    finish(500)
    const metrics = instance.snapshot().metrics
    expect(metrics.filter((row) => row.name === 'lilleri_http_requests_total')).toHaveLength(1)
    expect(metrics.find((row) => row.name === 'lilleri_http_duration_ms_sum')?.value).toBe(30)
    expect(
      metrics
        .filter((row) => row.name === 'lilleri_http_duration_ms_bucket')
        .map((row) => row.labels.le),
    ).toEqual(['5', '25', '100', '500', '2000', '10000', '+Inf'])
    expect(
      metrics
        .filter((row) => row.name === 'lilleri_http_duration_ms_bucket')
        .map((row) => row.value),
    ).toEqual([0, 0, 1, 1, 1, 1, 1])
    instant = 90
    instance.startRequest('unknown')(404)
    expect(instance.renderPrometheus()).not.toContain('NaN')
  })
  test('bounded trace/cell retention, invalid dimension rejection and snapshots resist external mutation', async () => {
    const instance = collector({
      traceSampleRatio: 1,
      traceCapacity: 2,
      semanticCellLimit: 1,
      semanticMinimumCount: 2,
    })
    for (let index = 0; index < 4; index++) instance.startRequest('health')(200)
    await instance.flush()
    expect(instance.traces()).toHaveLength(2)
    instance.emitSemantic('export_requested', {})
    instance.emitSemantic('export_requested', {})
    instance.emitSemantic('deletion_requested', {})
    expect(
      instance.snapshot().metrics.find((row) => row.name === 'lilleri_telemetry_dropped_total')
        ?.value,
    ).toBe(1)
    expect(() => instance.startRequest('PRIVATE-OPERATION' as 'health')).toThrow('Unknown')
    const snapshot = instance.snapshot()
    const firstMetric = snapshot.metrics[0]
    if (!firstMetric) throw new Error('Metric snapshot is absent')
    firstMetric.value = 1000
    expect(instance.snapshot().metrics[0]?.value).not.toBe(1000)
    const trace = instance.traces()
    const firstTrace = trace[0]
    if (!firstTrace) throw new Error('Trace snapshot is absent')
    firstTrace.operation = 'unknown'
    expect(instance.traces()[0]?.operation).toBe('health')
  })
  test('sync, maintenance, inbox and decisions collect real safe counters; invalid writes stay atomic', () => {
    const logs: SafeLogRecord[] = []
    const instance = collector({ logSink: (record) => logs.push(record) })
    instance.recordSync('partial', { inserted: 3, updated: 2, unchanged: 8, rejected: 1 })
    instance.recordMaintenance('retention', 'completed', 80, 0)
    instance.recordMaintenance('notifications', 'partial', 4, 1)
    instance.recordInbox('reconciliation', 'resolved')
    instance.recordDecision('reconciliation', 'undone', 'user')
    instance.recordFailure('unavailable')
    const before = instance.snapshot()
    expect(() =>
      instance.recordSync('completed', { inserted: 3, updated: 2, unchanged: 8, rejected: -1 }),
    ).toThrow()
    expect(() => instance.recordMaintenance('retention', 'failed', 2, -1)).toThrow()
    expect(instance.snapshot()).toEqual(before)
    expect(logs[0]?.properties).toEqual({ outcome: 'partial', skipped_count_bucket: '1' })
    expect(instance.renderPrometheus()).toContain(
      'lilleri_decisions_total{kind="reconciliation",outcome="undone",tier="user"} 1',
    )
    expect(instance.renderPrometheus()).toContain(
      'lilleri_maintenance_runs_total{outcome="partial",task="notifications"} 1',
    )
    expect(logs[2]?.properties).toEqual({
      task: 'notifications',
      outcome: 'partial',
      processed_bucket: '2-5',
      failed_bucket: '1',
    })
    expect(telemetryErrorClass(502)).toBe('unavailable')
  })
  test('sink failures never stop financial operations and shutdown purges local telemetry', async () => {
    const instance = collector({
      logSink: () => {
        throw new Error('PRIVATE-SINK-ERROR')
      },
    })
    expect(() => instance.startRequest('health')(200)).not.toThrow()
    expect(
      instance
        .snapshot()
        .metrics.find((row) => row.name === 'lilleri_telemetry_sink_failures_total')?.value,
    ).toBe(1)
    await instance.shutdown()
    instance.emitSemantic('export_requested', {})
    expect(instance.snapshot().metrics).toHaveLength(0)
    expect(instance.snapshot().semanticAggregates).toHaveLength(0)
    expect(instance.traces()).toHaveLength(0)
  })
  test('sampling environment defaults 10% and rejects URL/NaN/unbounded values without echoing input', () => {
    expect(observabilityConfigurationFromEnvironment({})).toEqual({ traceSampleRatio: 0.1 })
    expect(
      observabilityConfigurationFromEnvironment({ OBSERVABILITY_TRACE_SAMPLE_RATIO: '0.25' }),
    ).toEqual({ traceSampleRatio: 0.25 })
    for (const text of ['https://PRIVATE', 'NaN', '-0.1', '1.1', '', '1e-1']) {
      expect(() =>
        observabilityConfigurationFromEnvironment({ OBSERVABILITY_TRACE_SAMPLE_RATIO: text }),
      ).toThrow('is invalid')
    }
  })
})
