import { z } from 'zod'

/** Engineering review only. Real-data collection still requires the privacy/DPO release review. */
export const SEMANTIC_CATALOGUE_VERSION = '2026-10-03.1'
export const countBucket = z.enum(['0', '1', '2-5', '6-20', '21-100', '101+'])
const institution = z.enum(['synthetic', 'unknown'])
const cause = z.enum(['unavailable', 'expired', 'revoked', 'invalid_request', 'unknown'])
const tier = z.enum(['user', 'rule', 'preference', 'global', 'review'])
const kind = z.enum(['classification', 'reconciliation', 'balance'])
const mode = z.enum(['control', 'balanced', 'autopilot'])
const decisionType = z.enum([
  'classification',
  'duplicate',
  'transfer',
  'settlement',
  'refund',
  'cash',
])
const empty = z.object({}).strict()

export const SEMANTIC_EVENT_CATALOGUE = {
  account_created: empty,
  consent_started: z.object({ institution }).strict(),
  consent_completed: z.object({ institution }).strict(),
  consent_failed: z.object({ institution, cause_class: cause }).strict(),
  first_picture_shown: z
    .object({
      institutions_count_bucket: countBucket,
      seconds_bucket: z.enum(['0-5', '6-30', '31-120', '121+']),
    })
    .strict(),
  wow_session: z.object({ bool: z.boolean() }).strict(),
  sync_run: z
    .object({
      status: z.enum(['completed', 'partial', 'failed', 'skipped']),
      skipped_count_bucket: countBucket,
    })
    .strict(),
  balance_mismatch_raised: empty,
  inbox_opened: empty,
  inbox_item_resolved: z.object({ kind, interactions: z.enum(['1', '2', '3+']) }).strict(),
  inbox_zero_reached: empty,
  category_corrected: z
    .object({ source_tier: tier, decision_kind: z.enum(['once', 'merchant']) })
    .strict(),
  rule_created: z.object({ origin: z.enum(['explicit', 'correction']) }).strict(),
  rule_deleted: empty,
  automation_mode_changed: z.object({ from: mode, to: mode }).strict(),
  auto_decision_overridden: z.object({ decision_type: decisionType, tier }).strict(),
  consent_renewed: z
    .object({ days_before_expiry_bucket: z.enum(['expired', '0-7', '8-30', '31+']) })
    .strict(),
  connection_expired: empty,
  export_requested: empty,
  deletion_requested: empty,
  paywall_shown: z.object({ gate: z.enum(['live_source_limit']) }).strict(),
  trial_started: empty,
  trial_reminder_sent: empty,
  subscription_started: z.object({ plan: z.enum(['plus']) }).strict(),
  subscription_cancelled: empty,
} as const
export type SemanticEventName = keyof typeof SEMANTIC_EVENT_CATALOGUE
export type SemanticProperties<N extends SemanticEventName> = z.infer<
  (typeof SEMANTIC_EVENT_CATALOGUE)[N]
>

/** Registration is not proof that a feature exists. Unimplemented producers fail closed. */
export const PLANNED_SEMANTIC_EVENTS = new Set<SemanticEventName>([
  'wow_session',
  'automation_mode_changed',
  'consent_renewed',
  'paywall_shown',
  'trial_started',
  'trial_reminder_sent',
  'subscription_started',
  'subscription_cancelled',
])

const forbidden =
  /(?:amount|balance|description|descriptor|merchant|iban|counterparty|category|transaction|account|profile|household|user|email|phone|address|token|secret|password|cookie|authorization|receipt|payload|content|query|url|path|stack|message|error(?:detail|message)|session(?:id)?|device(?:id)?|(?:connection|institution|consent|rule|event)(?:id|identifier)|^(?:ip|clientip|remoteip|ipaddress|timestamp|headers|body|raw|error)$)/i

/** Defensive lint before strict schemas. Never reads getters or emits the offending value. */
export function assertSafeTelemetryProperties(input: unknown): void {
  const seen = new Set<object>()
  let visited = 0
  const inspect = (value: unknown, depth: number) => {
    if (++visited > 512 || depth > 8)
      throw new Error('Telemetry properties exceed structural bounds')
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return
    if (typeof value === 'number' && Number.isFinite(value)) return
    if (typeof value !== 'object') throw new Error('Telemetry properties must be plain JSON')
    if (seen.has(value)) throw new Error('Telemetry properties contain a cycle')
    seen.add(value)
    if (Array.isArray(value)) {
      if (value.length > 64) throw new Error('Telemetry arrays exceed structural bounds')
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (key === 'length') continue
        if (!/^\d+$/.test(key) || !('value' in descriptor))
          throw new Error('Telemetry arrays must contain plain values')
        inspect(descriptor.value, depth + 1)
      }
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        throw new Error('Telemetry properties must be plain JSON')
      const entries = Object.getOwnPropertyDescriptors(value)
      if (Object.keys(entries).length > 32)
        throw new Error('Telemetry properties exceed structural bounds')
      for (const [key, descriptor] of Object.entries(entries)) {
        if (forbidden.test(key.replace(/[^a-z0-9]/gi, '')))
          throw new Error('Forbidden telemetry property')
        if (!('value' in descriptor)) throw new Error('Telemetry accessors are forbidden')
        inspect(descriptor.value, depth + 1)
      }
    }
    seen.delete(value)
  }
  inspect(input, 0)
}

export function parseSemanticEvent(name: unknown, properties: unknown) {
  if (typeof name !== 'string' || !Object.hasOwn(SEMANTIC_EVENT_CATALOGUE, name))
    throw new Error('Unknown semantic event')
  if (PLANNED_SEMANTIC_EVENTS.has(name as SemanticEventName))
    throw new Error('Semantic event producer is not implemented')
  assertSafeTelemetryProperties(properties)
  const parsed = SEMANTIC_EVENT_CATALOGUE[name as SemanticEventName].safeParse(properties)
  if (!parsed.success) throw new Error('Semantic properties do not match the reviewed catalogue')
  return parsed.data
}

export function telemetryCountBucket(value: number): z.infer<typeof countBucket> {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Telemetry count is invalid')
  if (value === 0) return '0'
  if (value === 1) return '1'
  if (value <= 5) return '2-5'
  if (value <= 20) return '6-20'
  if (value <= 100) return '21-100'
  return '101+'
}
