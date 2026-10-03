import { SpanStatusCode } from '@opentelemetry/api'
import {
  BasicTracerProvider,
  type ReadableSpan,
  SimpleSpanProcessor,
  type SpanExporter,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base'
import {
  parseSemanticEvent,
  SEMANTIC_CATALOGUE_VERSION,
  type SemanticEventName,
  type SemanticProperties,
  telemetryCountBucket,
} from './observability-catalogue.js'
import { DEFAULT_RUNTIME_CONFIGURATION } from './runtime-config.js'

const operations = [
  'health',
  'overview',
  'transactions',
  'classification',
  'reconciliation',
  'connection_sync',
  'connection_create',
  'connection_delete',
  'connections',
  'consent_lifecycle',
  'revocation',
  'export',
  'profile_delete',
  'identity',
  'settings',
  'rules',
  'manual',
  'imports',
  'privacy',
  'notifications',
  'monthly_insights',
  'safe_to_spend',
  'support_access',
  'unknown',
] as const
export type TelemetryOperation = (typeof operations)[number]
const errorClasses = [
  'none',
  'invalid_request',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'unavailable',
  'internal',
  'unknown',
] as const
export type TelemetryErrorClass = (typeof errorClasses)[number]
const outcomes = ['completed', 'partial', 'failed', 'skipped'] as const
export type TelemetryOutcome = (typeof outcomes)[number]
const durations = [5, 25, 100, 500, 2000, 10000] as const
type SafeProperties = Readonly<Record<string, string | number | boolean>>
export interface SafeLogRecord {
  readonly version: 1
  readonly event:
    | 'request_completed'
    | 'sync_completed'
    | 'maintenance_completed'
    | 'decision_recorded'
    | 'lifecycle'
  readonly properties: SafeProperties
}
export interface SafeTrace {
  readonly operation: TelemetryOperation
  readonly statusClass: string
  readonly durationBucket: string
}
export interface ObservabilityOptions {
  readonly traceSampleRatio?: number
  readonly traceCapacity?: number
  readonly semanticCellLimit?: number
  readonly semanticMinimumCount?: number
  /** Enables a local optional sink, which additionally requires producer-supplied consent. */
  readonly optionalAnalyticsEnabled?: boolean
  readonly semanticSink?: (event: {
    version: string
    name: SemanticEventName
    properties: SafeProperties
  }) => void
  readonly logSink?: (record: SafeLogRecord) => void
  readonly monotonicNow?: () => number
  readonly metricsEnabled?: boolean
}
export interface ObservabilityRuntimeConfiguration {
  readonly traceSampleRatio: number
  readonly metricsEnabled: boolean
}
function validateConfiguration(configuration: ObservabilityRuntimeConfiguration) {
  if (
    !Number.isFinite(configuration.traceSampleRatio) ||
    configuration.traceSampleRatio < 0 ||
    configuration.traceSampleRatio > 1 ||
    typeof configuration.metricsEnabled !== 'boolean'
  )
    throw new Error('Observability configuration is invalid')
  return { ...configuration }
}
function boundedInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new Error('Observability configuration exceeds bounds')
  return value
}
function member<T extends string>(value: string, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) throw new Error('Unknown telemetry dimension')
  return value as T
}
function count(value: number) {
  return boundedInteger(value, 0, 1_000_000)
}
export function telemetryStatusClass(statusCode: number) {
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) return 'unknown'
  return `${Math.floor(statusCode / 100)}xx`
}
export function telemetryErrorClass(statusCode: number): TelemetryErrorClass {
  if (statusCode < 400 && statusCode >= 100) return 'none'
  if ([400, 413, 422].includes(statusCode)) return 'invalid_request'
  if (statusCode === 401) return 'unauthenticated'
  if (statusCode === 403) return 'forbidden'
  if (statusCode === 404) return 'not_found'
  if (statusCode === 409) return 'conflict'
  if (statusCode === 429) return 'rate_limited'
  if ([502, 503, 504].includes(statusCode)) return 'unavailable'
  if (statusCode >= 500 && statusCode <= 599) return 'internal'
  return 'unknown'
}
function durationBucket(milliseconds: number) {
  return String(durations.find((bound) => milliseconds <= bound) ?? '10000+')
}
/** Matched templates only. A raw URL or an unrecognised new route collapses to unknown. */
export function operationForRoute(
  method: string,
  routeTemplate: string | undefined,
): TelemetryOperation {
  if (!routeTemplate || routeTemplate.includes('?')) return 'unknown'
  if (routeTemplate === '/health' || routeTemplate === '/openapi.json') return 'health'
  if (routeTemplate.startsWith('/v1/auth/') || routeTemplate.startsWith('/api/auth/'))
    return 'identity'
  if (routeTemplate === '/v1/demo') return 'overview'
  if (routeTemplate === '/v1/transactions') return 'transactions'
  if (routeTemplate === '/v1/transactions/:id/classification') return 'classification'
  if (routeTemplate === '/v1/reconciliation/:id') return 'reconciliation'
  if (routeTemplate === '/v1/connections/:id/sync') return 'connection_sync'
  if (routeTemplate === '/v1/connections/mock') return 'connection_create'
  if (routeTemplate === '/v1/connections/:id' && method === 'DELETE') return 'connection_delete'
  if (routeTemplate === '/v1/institutions' || routeTemplate === '/v1/connections')
    return 'connections'
  if (routeTemplate === '/v1/revocations') return 'revocation'
  if (
    [
      '/v1/connections/:id/lifecycle',
      '/v1/connections/:id/consent-events',
      '/v1/connections/:id/pause',
      '/v1/connections/:id/resume',
      '/v1/connections/:id/renew',
    ].includes(routeTemplate)
  )
    return 'consent_lifecycle'
  if (routeTemplate === '/v1/export' || routeTemplate === '/v1/export/archive') return 'export'
  if (routeTemplate === '/v1/profile' && method === 'DELETE') return 'profile_delete'
  if (routeTemplate === '/v1/profile/deletion' && method === 'POST') return 'profile_delete'
  if (routeTemplate === '/v1/settings') return 'settings'
  if (
    /^\/v1\/rules(?:\/:[a-zA-Z]+(?:\/(?:preview|apply|disable|archive|undo|state))?)?$/.test(
      routeTemplate,
    )
  )
    return 'rules'
  if (
    /^\/v1\/manual\/(?:accounts|entries|adjustments)(?:\/:[a-zA-Z]+(?:\/(?:entries|adjustments|undo))?)?$/.test(
      routeTemplate,
    )
  )
    return 'manual'
  if (
    [
      '/v1/manual/transactions',
      '/v1/manual/transactions/:id/reverse',
      '/v1/manual/accounts/:id/adjust',
      '/v1/manual/accounts/:id/events',
    ].includes(routeTemplate)
  )
    return 'manual'
  if (
    [
      '/v1/imports/csv',
      '/v1/imports/csv/preview',
      '/v1/imports/mapped/layout',
      '/v1/imports/mapped/preview',
      '/v1/imports/mapped/commit',
      '/v1/import-mappings',
      '/v1/import-mappings/:id',
    ].includes(routeTemplate)
  )
    return 'imports'
  if (
    [
      '/v1/privacy/settings',
      '/v1/privacy/permissions',
      '/v1/privacy/permissions/:purpose',
      '/v1/transactions/:id/privacy',
    ].includes(routeTemplate)
  )
    return 'privacy'
  if (
    [
      '/v1/notifications',
      '/v1/notifications/preferences',
      '/v1/notifications/:id/seen',
      '/v1/notifications/:id/destination',
    ].includes(routeTemplate)
  )
    return 'notifications'
  if (routeTemplate === '/v1/insights/monthly') return 'monthly_insights'
  if (routeTemplate === '/v1/safe-to-spend') return 'safe_to_spend'
  if (routeTemplate === '/v1/support-access' || routeTemplate === '/v1/support-access/:id/revoke')
    return 'support_access'
  return 'unknown'
}

/** No auto-instrumentation, global provider, remote exporter or exception recording. */
export function createObservability(options: ObservabilityOptions = {}) {
  let configuration = validateConfiguration({
    traceSampleRatio:
      options.traceSampleRatio ?? DEFAULT_RUNTIME_CONFIGURATION.observability.traceSampleRatio,
    metricsEnabled:
      options.metricsEnabled ?? DEFAULT_RUNTIME_CONFIGURATION.observability.metricsEnabled,
  })
  let sampler = new TraceIdRatioBasedSampler(configuration.traceSampleRatio)
  const capacity = boundedInteger(options.traceCapacity ?? 200, 0, 2000)
  const minimum = boundedInteger(options.semanticMinimumCount ?? 5, 2, 1000)
  const cellLimit = boundedInteger(options.semanticCellLimit ?? 512, 1, 2048)
  const monotonicNow = options.monotonicNow ?? (() => performance.now())
  const traces: SafeTrace[] = []
  const totals = new Map<
    string,
    { name: string; labels: Readonly<Record<string, string>>; value: number }
  >()
  const semantic = new Map<
    string,
    { name: SemanticEventName; properties: SafeProperties; count: number }
  >()
  const increment = (name: string, labels: Readonly<Record<string, string>>, value = 1) => {
    if (!configuration.metricsEnabled || stopped) return
    const key = JSON.stringify([name, Object.entries(labels).sort()])
    const previous = totals.get(key)
    totals.set(key, {
      name,
      labels: { ...labels },
      value: Math.min(Number.MAX_SAFE_INTEGER, (previous?.value ?? 0) + value),
    })
  }
  const log = (event: SafeLogRecord['event'], properties: SafeProperties) => {
    if (stopped) return
    try {
      options.logSink?.({ version: 1, event, properties: { ...properties } })
    } catch {
      increment('lilleri_telemetry_sink_failures_total', { sink: 'log' })
    }
  }
  const exporter: SpanExporter = {
    export(spans: ReadableSpan[], callback) {
      for (const span of spans) {
        if (capacity === 0) continue
        const operation = member(String(span.attributes.operation), operations)
        const statusClass = String(span.attributes.status_class)
        if (!['1xx', '2xx', '3xx', '4xx', '5xx', 'unknown'].includes(statusClass)) continue
        const milliseconds = span.duration[0] * 1000 + span.duration[1] / 1_000_000
        // No trace IDs, resource/process data, times, HTTP attributes, events or error messages survive.
        traces.push({ operation, statusClass, durationBucket: durationBucket(milliseconds) })
        if (traces.length > capacity) traces.splice(0, traces.length - capacity)
      }
      callback({ code: 0 })
    },
    shutdown: async () => {
      traces.splice(0)
    },
  }
  const provider = new BasicTracerProvider({
    sampler: {
      shouldSample: (parentContext, traceId) => sampler.shouldSample(parentContext, traceId),
      toString: () => sampler.toString(),
    },
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  })
  const tracer = provider.getTracer('lilleri-safe-operations', '1')
  let stopped = false
  const emitSemantic = <N extends SemanticEventName>(
    name: N,
    properties: SemanticProperties<N>,
    consentGranted = false,
  ) => {
    const safe = parseSemanticEvent(name, properties) as SafeProperties
    if (stopped) return
    const key = JSON.stringify([name, Object.entries(safe).sort()])
    const previous = semantic.get(key)
    if (previous) previous.count = Math.min(Number.MAX_SAFE_INTEGER, previous.count + 1)
    else if (semantic.size < cellLimit)
      semantic.set(key, { name, properties: { ...safe }, count: 1 })
    else increment('lilleri_telemetry_dropped_total', { kind: 'semantic_cell_limit' })
    if (options.optionalAnalyticsEnabled && consentGranted) {
      try {
        options.semanticSink?.({
          version: SEMANTIC_CATALOGUE_VERSION,
          name,
          properties: { ...safe },
        })
      } catch {
        increment('lilleri_telemetry_sink_failures_total', { sink: 'semantic' })
      }
    }
  }
  return {
    setConfiguration(next: ObservabilityRuntimeConfiguration) {
      configuration = validateConfiguration(next)
      sampler = new TraceIdRatioBasedSampler(configuration.traceSampleRatio)
    },
    configuration: () => ({ ...configuration }),
    startRequest(operation: TelemetryOperation) {
      member(operation, operations)
      const started = monotonicNow()
      const span = stopped ? undefined : tracer.startSpan(operation, { attributes: { operation } })
      let finished = false
      return (statusCode: number) => {
        if (finished || stopped) return
        finished = true
        const statusClass = telemetryStatusClass(statusCode)
        const errorClass = telemetryErrorClass(statusCode)
        const elapsed = monotonicNow() - started
        const duration = Number.isFinite(elapsed) ? Math.max(0, Math.min(3_600_000, elapsed)) : 0
        increment('lilleri_http_requests_total', { operation, status_class: statusClass })
        increment(
          'lilleri_http_errors_total',
          { operation, error_class: errorClass },
          errorClass === 'none' ? 0 : 1,
        )
        for (const bound of durations)
          increment(
            'lilleri_http_duration_ms_bucket',
            { operation, le: String(bound) },
            duration <= bound ? 1 : 0,
          )
        increment('lilleri_http_duration_ms_bucket', { operation, le: '+Inf' })
        increment('lilleri_http_duration_ms_count', { operation })
        increment('lilleri_http_duration_ms_sum', { operation }, duration)
        span?.setAttributes({ status_class: statusClass, error_class: errorClass })
        span?.setStatus({ code: errorClass === 'none' ? SpanStatusCode.OK : SpanStatusCode.ERROR })
        span?.end()
        log('request_completed', {
          operation,
          status_class: statusClass,
          error_class: errorClass,
          duration_bucket: durationBucket(duration),
        })
      }
    },
    recordSync(
      outcome: TelemetryOutcome,
      counts: { inserted: number; updated: number; unchanged: number; rejected: number },
    ) {
      member(outcome, outcomes)
      for (const field of ['inserted', 'updated', 'unchanged', 'rejected'] as const)
        count(counts[field])
      for (const field of ['inserted', 'updated', 'unchanged', 'rejected'] as const)
        increment('lilleri_sync_rows_total', { outcome, action: field }, count(counts[field]))
      increment('lilleri_sync_runs_total', { outcome })
      log('sync_completed', {
        outcome,
        skipped_count_bucket: telemetryCountBucket(counts.rejected),
      })
      emitSemantic('sync_run', {
        status: outcome,
        skipped_count_bucket: telemetryCountBucket(counts.rejected),
      })
    },
    recordMaintenance(
      task: 'retention' | 'revocation' | 'notifications',
      outcome: TelemetryOutcome,
      processed: number,
      failed: number,
    ) {
      member(task, ['retention', 'revocation', 'notifications'])
      member(outcome, outcomes)
      count(processed)
      count(failed)
      increment('lilleri_maintenance_runs_total', { task, outcome })
      increment('lilleri_maintenance_items_total', { task, result: 'processed' }, count(processed))
      increment('lilleri_maintenance_items_total', { task, result: 'failed' }, count(failed))
      log('maintenance_completed', {
        task,
        outcome,
        processed_bucket: telemetryCountBucket(processed),
        failed_bucket: telemetryCountBucket(failed),
      })
    },
    recordInbox(
      kind: 'classification' | 'reconciliation' | 'balance',
      action: 'opened' | 'resolved',
    ) {
      member(kind, ['classification', 'reconciliation', 'balance'])
      member(action, ['opened', 'resolved'])
      increment('lilleri_inbox_actions_total', { kind, action })
    },
    recordDecision(
      kind: 'classification' | 'reconciliation',
      outcome: 'confirmed' | 'rejected' | 'undone' | 'corrected',
      tier: 'user' | 'rule' | 'preference' | 'global' | 'review',
    ) {
      member(kind, ['classification', 'reconciliation'])
      member(outcome, ['confirmed', 'rejected', 'undone', 'corrected'])
      member(tier, ['user', 'rule', 'preference', 'global', 'review'])
      increment('lilleri_decisions_total', { kind, outcome, tier })
      log('decision_recorded', { kind, outcome, tier })
    },
    lifecycle(state: 'ready' | 'stopping' | 'startup_failed') {
      member(state, ['ready', 'stopping', 'startup_failed'])
      log('lifecycle', { state })
    },
    recordFailure(errorClass: TelemetryErrorClass) {
      member(errorClass, errorClasses)
      increment('lilleri_failures_total', { error_class: errorClass })
    },
    emitSemantic,
    snapshot: () => ({
      catalogueVersion: SEMANTIC_CATALOGUE_VERSION,
      metrics: [...totals.values()].map((row) => ({ ...row, labels: { ...row.labels } })),
      semanticAggregates: [...semantic.values()]
        .filter((row) => row.count >= minimum)
        .map((row) => ({ ...row, properties: { ...row.properties } })),
    }),
    traces: () => traces.map((row) => ({ ...row })),
    flush: () => provider.forceFlush(),
    renderPrometheus: () =>
      `# HELP lilleri_http_duration_ms Request duration in milliseconds, with bounded operation labels.\n# TYPE lilleri_http_duration_ms histogram\n${[
        ...totals.values(),
      ]
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        .map(
          (row) =>
            `${row.name}{${Object.entries(row.labels)
              .sort()
              .map(([key, value]) => `${key}="${value}"`)
              .join(',')}} ${row.value}`,
        )
        .join('\n')}\n`,
    shutdown: async () => {
      stopped = true
      await provider.shutdown()
      semantic.clear()
      totals.clear()
    },
  }
}
export type Observability = ReturnType<typeof createObservability>

export function observabilityConfigurationFromEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const text =
    environment.OBSERVABILITY_TRACE_SAMPLE_RATIO ??
    String(DEFAULT_RUNTIME_CONFIGURATION.observability.traceSampleRatio)
  if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(text))
    throw new Error('OBSERVABILITY_TRACE_SAMPLE_RATIO is invalid')
  const traceSampleRatio = Number(text)
  return { traceSampleRatio }
}
