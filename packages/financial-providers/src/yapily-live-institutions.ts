import type { InstitutionCoverage } from './contracts.js'
import { ProviderJsonNumber, parseProviderJson } from './provider-json.js'

/** Documentation evidence only: it does not certify an application's bank entitlement. */
export const YAPILY_LIVE_INSTITUTIONS_EVIDENCE = Object.freeze({
  checkedAt: '2026-10-05',
  referenceApiVersion: '12.13.0',
  reference: 'https://docs.yapily.com/api-reference/institutions/get-institutions',
  authentication: 'https://docs.yapily.com/getting-started/integration-setup/api-authentication',
})
const ENDPOINT = 'https://api.yapily.com/institutions'

export type LiveInstitutionDiscoveryFailureCode =
  | 'configuration'
  | 'invalid_contract'
  | 'partial_catalogue'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout'
  | 'cancelled'
  | 'bound_reached'

/** Provider messages, URLs, raw responses and transport causes never enter errors. */
export class LiveInstitutionDiscoveryFailure extends Error {
  constructor(
    readonly code: LiveInstitutionDiscoveryFailureCode,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(code)
    this.name = 'LiveInstitutionDiscoveryFailure'
  }
}

export interface YapilyLiveInstitution extends InstitutionCoverage {
  readonly providerId: 'yapily'
  readonly countryCode: 'IT'
  readonly environment: 'live'
  readonly countryCodes: readonly string[]
  /** Exact declared feature codes. Neither name nor brand is used to infer features. */
  readonly features: readonly string[]
  readonly declaredCapabilities: {
    readonly accounts: boolean
    readonly balances: boolean
    readonly transactions: boolean
    readonly redirectAuthorisation: boolean
  }
  /** The official institution schema provides no account-kind/history evidence. */
  readonly accountTypes: readonly []
  readonly connectionAvailability: 'configuration_required'
}
export interface YapilyLiveInstitutionCatalogue {
  readonly providerId: 'yapily'
  readonly environment: 'live'
  readonly countryCode: 'IT'
  readonly institutions: readonly YapilyLiveInstitution[]
  readonly observedAt: string
  readonly nextCursor: null
  readonly evidence: {
    readonly status: 'provider_declared'
    readonly reference: typeof YAPILY_LIVE_INSTITUTIONS_EVIDENCE.reference
    readonly referenceApiVersion: '12.13.0'
  }
  readonly productionAdmission: 'blocked'
}
export interface YapilyLiveInstitutionDiscoveryOptions {
  /** Server-only application credentials. No environment/browser lookup is performed. */
  readonly applicationId: string
  readonly applicationSecret: string
  readonly timeoutMs?: number
  readonly maxResponseBytes?: number
  readonly maxInstitutions?: number
  readonly fetch?: typeof globalThis.fetch
  readonly clock?: () => number
}

function fail(code: LiveInstitutionDiscoveryFailureCode = 'invalid_contract'): never {
  throw new LiveInstitutionDiscoveryFailure(code)
}
function text(value: unknown, max = 200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Buffer.byteLength(value, 'utf8') > max ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return fail()
  return value
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function integer(value: unknown, max: number): number {
  if (!(value instanceof ProviderJsonNumber) || !/^(?:0|[1-9]\d*)$/u.test(value.source))
    return fail()
  const result = Number(value.source)
  if (!Number.isSafeInteger(result) || result > max) return fail('bound_reached')
  return result
}
function strings(value: unknown, max: number, pattern: RegExp): readonly string[] {
  if (!Array.isArray(value)) return fail()
  if (value.length > max) return fail('bound_reached')
  const result = value.map((value) => text(value))
  if (result.some((value) => !pattern.test(value)) || new Set(result).size !== result.length)
    return fail()
  return result
}

/** Read-only application catalogue discovery, distinct from Modelo sandbox and
 * from FinancialDataProviderV2. It has no consent, account-read or connection API.
 */
export class YapilyLiveInstitutionDiscovery {
  #applicationId: string
  #applicationSecret: string
  #fetch: typeof globalThis.fetch
  #clock: () => number
  #timeoutMs: number
  #maxResponseBytes: number
  #maxInstitutions: number
  #active: AbortController | null = null
  #closed = false

  constructor(options: YapilyLiveInstitutionDiscoveryOptions) {
    try {
      const allowed = new Set([
        'applicationId',
        'applicationSecret',
        'timeoutMs',
        'maxResponseBytes',
        'maxInstitutions',
        'fetch',
        'clock',
      ])
      if (Object.keys(options).some((key) => !allowed.has(key))) fail()
      this.#applicationId = text(options.applicationId, 500)
      this.#applicationSecret = text(options.applicationSecret, 4000)
      if (this.#applicationId.includes(':') || /\s/u.test(this.#applicationId)) fail()
      this.#timeoutMs = options.timeoutMs ?? 10_000
      this.#maxResponseBytes = options.maxResponseBytes ?? 4_194_304
      this.#maxInstitutions = options.maxInstitutions ?? 2500
      for (const [value, min, max] of [
        [this.#timeoutMs, 1, 30_000],
        [this.#maxResponseBytes, 100, 8_388_608],
        [this.#maxInstitutions, 1, 10_000],
      ])
        if (
          value === undefined ||
          min === undefined ||
          max === undefined ||
          !Number.isSafeInteger(value) ||
          value < min ||
          value > max
        )
          fail()
      this.#fetch = options.fetch ?? globalThis.fetch
      this.#clock = options.clock ?? Date.now
      if (typeof this.#fetch !== 'function' || typeof this.#clock !== 'function') fail()
    } catch {
      throw new LiveInstitutionDiscoveryFailure('configuration')
    }
  }

  /** Cancels local discovery only. No remote bank consent exists in this client. */
  close(): void {
    this.#closed = true
    this.#active?.abort(new LiveInstitutionDiscoveryFailure('cancelled'))
  }

  async discover(signal?: AbortSignal): Promise<YapilyLiveInstitutionCatalogue> {
    if (this.#closed || signal?.aborted) fail('cancelled')
    if (this.#active) fail('bound_reached')
    const controller = new AbortController()
    this.#active = controller
    const onAbort = () => controller.abort(new LiveInstitutionDiscoveryFailure('cancelled'))
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
    const timer = setTimeout(
      () => controller.abort(new LiveInstitutionDiscoveryFailure('timeout')),
      this.#timeoutMs,
    )
    let stop: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
      stop = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', stop, { once: true })
      if (controller.signal.aborted) stop()
    })
    void aborted.catch(() => undefined)
    let response: Response | null = null
    try {
      controller.signal.throwIfAborted()
      const request = this.#fetch(ENDPOINT, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${this.#applicationId}:${this.#applicationSecret}`, 'utf8').toString('base64')}`,
        },
      })
      void request.then(
        (late) => {
          if (controller.signal.aborted) void late.body?.cancel().catch(() => undefined)
        },
        () => undefined,
      )
      response = await Promise.race([request, aborted])
      if (response.status !== 200) {
        const code: LiveInstitutionDiscoveryFailureCode =
          response.status === 401
            ? 'unauthorized'
            : response.status === 403
              ? 'forbidden'
              : response.status === 404
                ? 'not_found'
                : response.status === 429
                  ? 'rate_limited'
                  : response.status >= 500 && response.status <= 599
                    ? 'unavailable'
                    : 'invalid_contract'
        throw new LiveInstitutionDiscoveryFailure(
          code,
          code === 'rate_limited' ? this.#retryAfter(response.headers.get('retry-after')) : null,
        )
      }
      if (
        response.redirected ||
        (response.url && response.url !== ENDPOINT) ||
        !/^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type') ?? '') ||
        !response.body
      )
        fail()
      const length = response.headers.get('content-length')
      if (length !== null && (!/^\d+$/u.test(length) || Number(length) > this.#maxResponseBytes))
        fail('bound_reached')
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let bytes = 0
      try {
        while (true) {
          const chunk = await Promise.race([reader.read(), aborted])
          controller.signal.throwIfAborted()
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > this.#maxResponseBytes) fail('bound_reached')
          chunks.push(chunk.value)
        }
      } finally {
        void reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
      const result = this.#catalogue(
        parseProviderJson(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))),
      )
      controller.signal.throwIfAborted()
      return result
    } catch (error) {
      if (
        controller.signal.aborted &&
        controller.signal.reason instanceof LiveInstitutionDiscoveryFailure
      )
        throw controller.signal.reason
      if (error instanceof LiveInstitutionDiscoveryFailure) throw error
      throw new LiveInstitutionDiscoveryFailure(
        response === null ? 'unavailable' : 'invalid_contract',
      )
    } finally {
      clearTimeout(timer)
      if (stop) controller.signal.removeEventListener('abort', stop)
      signal?.removeEventListener('abort', onAbort)
      if (response?.body && !response.body.locked)
        void response.body.cancel().catch(() => undefined)
      this.#active = null
    }
  }

  #catalogue(value: unknown): YapilyLiveInstitutionCatalogue {
    const response = object(value)
    const meta = object(response.meta)
    if (!Array.isArray(response.data)) fail()
    if (response.data.length > this.#maxInstitutions) fail('bound_reached')
    const count = integer(meta.count, this.#maxInstitutions)
    if (count !== response.data.length) fail('partial_catalogue')
    this.#assertWholeCatalogue(meta, response, count)
    const ids = new Set<string>()
    const institutions: YapilyLiveInstitution[] = []
    for (const item of response.data) {
      const record = object(item)
      const id = text(record.id)
      if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(id) || ids.has(id)) fail()
      ids.add(id)
      const name = text(record.name, 500)
      if (!['LIVE', 'SANDBOX', 'MOCK'].includes(text(record.environmentType))) fail()
      if (!Array.isArray(record.countries) || record.countries.length < 1) fail()
      if (record.countries.length > 50) fail('bound_reached')
      const countryCodes = [
        ...new Set(record.countries.map((country) => text(object(country).countryCode2, 2))),
      ]
      if (countryCodes.some((code) => !/^[A-Z]{2}$/u.test(code))) fail()
      const features = strings(record.features, 200, /^[A-Z][A-Z0-9_]*$/u)
      if (record.environmentType !== 'LIVE' || !countryCodes.includes('IT')) continue
      institutions.push({
        id,
        providerId: 'yapily',
        name,
        countryCode: 'IT',
        environment: 'live',
        countryCodes,
        features,
        accountTypes: [],
        connectionAvailability: 'configuration_required',
        declaredCapabilities: {
          accounts: features.includes('ACCOUNTS'),
          balances: features.includes('ACCOUNT_BALANCES'),
          transactions: features.includes('ACCOUNT_TRANSACTIONS'),
          redirectAuthorisation: features.includes('INITIATE_ACCOUNT_REQUEST'),
        },
      })
    }
    return {
      providerId: 'yapily',
      environment: 'live',
      countryCode: 'IT',
      institutions,
      observedAt: new Date(this.#clock()).toISOString(),
      nextCursor: null,
      evidence: {
        status: 'provider_declared',
        reference: YAPILY_LIVE_INSTITUTIONS_EVIDENCE.reference,
        referenceApiVersion: YAPILY_LIVE_INSTITUTIONS_EVIDENCE.referenceApiVersion,
      },
      productionAdmission: 'blocked',
    }
  }

  #assertWholeCatalogue(
    meta: Record<string, unknown>,
    response: Record<string, unknown>,
    count: number,
  ): void {
    // GET /institutions documents an entire application list and no paging parameters.
    // Do not follow provider links or guess how a generic pagination wrapper works.
    if (meta.pagination !== undefined && meta.pagination !== null) {
      const pagination = object(meta.pagination)
      if (pagination.next !== undefined && pagination.next !== null) fail('partial_catalogue')
      if (
        pagination.totalCount !== undefined &&
        integer(pagination.totalCount, this.#maxInstitutions) !== count
      )
        fail('partial_catalogue')
      if (pagination.self !== undefined && pagination.self !== null) {
        const self = object(pagination.self)
        if (
          (self.offset !== undefined && integer(self.offset, this.#maxInstitutions) !== 0) ||
          (self.limit !== undefined && integer(self.limit, this.#maxInstitutions) < count) ||
          ['cursor', 'from', 'before', 'sort'].some(
            (key) => self[key] !== undefined && self[key] !== null,
          )
        )
          fail('partial_catalogue')
      }
    }
    if (response.links !== undefined && response.links !== null) {
      const links = object(response.links)
      if (links.next !== undefined && links.next !== null) fail('partial_catalogue')
    }
  }

  #retryAfter(value: string | null): number | null {
    if (!value) return null
    const seconds = /^\d+$/u.test(value)
      ? Number(value)
      : Math.ceil((Date.parse(value) - this.#clock()) / 1000)
    return Number.isSafeInteger(seconds) && seconds >= 1 && seconds <= 86_400 ? seconds : null
  }
}
