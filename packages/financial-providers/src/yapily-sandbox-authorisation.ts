import { randomBytes, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import { dateOnly } from '@lilleri/domain'
import type { ProviderContext } from './index.js'
import { ProviderJsonNumber, parseProviderJson } from './provider-json.js'
import {
  type SandboxAuthorization,
  SandboxReadFailure,
  type SandboxReadFailureCode,
  type YapilySandboxBinding,
  yapilySandboxUserReference,
} from './yapily-sandbox.js'

export const YAPILY_SANDBOX_AUTHORISATION_EVIDENCE = Object.freeze({
  checkedAt: '2026-10-04',
  apiVersion: '12.16.0',
  create: 'https://docs.yapily.com/api-reference/authorisations/create-account-authorisation',
  callback: 'https://docs.yapily.com/open-banking-flow/handling-redirects/callback-url',
  exchange: 'https://docs.yapily.com/api-reference/consents/exchange-one-time-token',
})

export interface SandboxAuthorisationContext {
  readonly profileId: string
  readonly connectionId: string
  readonly grantId: string
  readonly institutionId: 'modelo-sandbox'
}
export interface SandboxAuthorisationDraft extends SandboxAuthorisationContext {
  /** Opaque state belongs in protected server storage, never logs or analytics. */
  readonly state: string
  readonly applicationUserId: string
  readonly callbackURL: string
  readonly tokenMode: 'one_time_token' | 'consent'
  readonly createdAt: string
  readonly expiresAt: string
}
export interface SandboxAuthorisationActivation {
  readonly consentId: string
  /** Provider correlation is distinct from Lilleri's callback state. */
  readonly providerState: string
  readonly authorisationURL: string
}
export type SandboxAuthorisationIntent = SandboxAuthorisationDraft & SandboxAuthorisationActivation

/** Implement with durable transactions, authenticated scope and encrypted storage.
 * No default/in-memory production implementation is installed by this package.
 */
export interface SandboxAuthorisationStore {
  /** Persist before the first provider request, for late/ambiguous creation recovery.
   * Enforce one active creation per exact generation; reject ambiguous replacement.
   */
  stage(draft: SandboxAuthorisationDraft): Promise<void>
  /** Compare the exact generation/state; return false if cancelled/replaced meanwhile. */
  activate(
    draft: SandboxAuthorisationDraft,
    activation: SandboxAuthorisationActivation,
  ): Promise<boolean>
  /** Atomically consume an active, unexpired matching state once; reject replay/concurrency. */
  claim(
    context: SandboxAuthorisationContext,
    state: string,
    at: string,
  ): Promise<SandboxAuthorisationIntent | null>
  /** The current authoritative profile/connection/grant fence. */
  current(context: SandboxAuthorisationContext): Promise<boolean>
}

/** HTTP query spelling is intentionally outside this protocol client: the official
 * callback guide does not specify the OTT query name. The trusted server ingress
 * must map the measured sandbox wire format and reject duplicate parameters.
 */
export type SandboxAuthorisationCallback = {
  readonly state: string
  readonly institutionId: string
  readonly applicationUserId: string
} & (
  | { readonly kind: 'one_time_token'; readonly oneTimeToken: string }
  | { readonly kind: 'consent'; readonly consentToken: string }
)
export interface YapilySandboxAuthorisationOptions {
  readonly applicationId: string
  readonly applicationSecret: string
  readonly permissionReference: string
  /** Exact registered HTTPS callback, with no pre-existing query or fragment. */
  readonly callbackURL: string
  /** Explicitly reviewed Modelo authorisation origins; no wildcard/prefix matching. */
  readonly authorisationOrigins: readonly string[]
  readonly store: SandboxAuthorisationStore
  /** OTT is the default. Direct consent must be selected deliberately by the operator. */
  readonly tokenMode?: 'one_time_token' | 'consent'
  readonly timeoutMs?: number
  readonly maxResponseBytes?: number
  readonly intentLifetimeMs?: number
  readonly fetch?: typeof globalThis.fetch
  readonly clock?: () => number
}
export interface SandboxAuthorisationResult {
  /** Sensitive binding: trusted callers must encrypt it before durable storage. */
  readonly binding: YapilySandboxBinding
  readonly authorization: SandboxAuthorization
  readonly environment: 'sandbox'
  readonly productionAdmission: 'blocked'
}

function fail(code: SandboxReadFailureCode = 'invalid_contract'): never {
  throw new SandboxReadFailure(code)
}
function text(value: unknown, max = 200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Buffer.byteLength(value) > max ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return fail()
  return value
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function uuid(value: unknown): string {
  const result = text(value)
  if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/iu.test(result)) return fail()
  return result
}
function same(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}
function instant(value: unknown): string {
  const result = text(value, 40)
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/u.exec(
      result,
    )
  if (
    !match ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    Number(match[4]) > 59 ||
    (match[6] && (Number(match[6]) > 23 || Number(match[7]) > 59)) ||
    !Number.isFinite(Date.parse(result))
  )
    return fail()
  dateOnly(match[1] ?? '')
  return result
}
function optionalInstant(value: unknown): string | null {
  return value === undefined || value === null ? null : instant(value)
}
function httpsURL(value: unknown): URL {
  const url = new URL(text(value, 8000))
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.port ||
    isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
    !url.hostname.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal)$/u.test(url.hostname)
  )
    return fail()
  return url
}
function assertContext(value: ProviderContext): SandboxAuthorisationContext {
  if (value.institutionId !== 'modelo-sandbox') return fail('sandbox_only')
  return {
    profileId: text(value.profileId),
    connectionId: text(value.connectionId),
    grantId: text(value.grantId),
    institutionId: 'modelo-sandbox',
  }
}
function sameContext(a: SandboxAuthorisationContext, b: SandboxAuthorisationContext): boolean {
  return (
    a.profileId === b.profileId &&
    a.connectionId === b.connectionId &&
    a.grantId === b.grantId &&
    a.institutionId === b.institutionId
  )
}
function scopes(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 200) return fail()
  const result = value.map((value) => text(value))
  if (new Set(result).size !== result.length) return fail()
  return result
}

/** Official Modelo-only protocol client. This is not FinancialDataProvider or a
 * public callback route. All mutations are single-attempt: an uncertain outcome
 * requires durable reconciliation, never blind retry or a new consent generation.
 */
export class YapilySandboxAuthorisationClient {
  #applicationId: string
  #applicationSecret: string
  #callbackURL: string
  #origins: ReadonlySet<string>
  #store: SandboxAuthorisationStore
  #mode: 'one_time_token' | 'consent'
  #fetch: typeof globalThis.fetch
  #clock: () => number
  #timeoutMs: number
  #maxResponseBytes: number
  #intentLifetimeMs: number
  #closed = false
  #active = new Set<AbortController>()

  constructor(options: YapilySandboxAuthorisationOptions) {
    try {
      this.#applicationId = text(options.applicationId, 500)
      this.#applicationSecret = text(options.applicationSecret, 4000)
      text(options.permissionReference, 500)
      if (this.#applicationId.includes(':')) fail()
      const callback = httpsURL(options.callbackURL)
      if (callback.search || callback.pathname === '/') fail()
      this.#callbackURL = callback.href
      if (options.authorisationOrigins.length < 1 || options.authorisationOrigins.length > 10)
        fail()
      this.#origins = new Set(
        options.authorisationOrigins.map((origin) => {
          const url = httpsURL(origin)
          if (origin !== url.origin) fail()
          return url.origin
        }),
      )
      this.#mode = options.tokenMode ?? 'one_time_token'
      if (!['one_time_token', 'consent'].includes(this.#mode)) fail()
      this.#store = options.store
      if (
        !['stage', 'activate', 'claim', 'current'].every(
          (key) => typeof this.#store[key as keyof SandboxAuthorisationStore] === 'function',
        )
      )
        fail()
      this.#timeoutMs = options.timeoutMs ?? 10_000
      this.#maxResponseBytes = options.maxResponseBytes ?? 1_048_576
      this.#intentLifetimeMs = options.intentLifetimeMs ?? 600_000
      for (const [value, min, max] of [
        [this.#timeoutMs, 1, 30_000],
        [this.#maxResponseBytes, 100, 4_194_304],
        [this.#intentLifetimeMs, 1000, 1_800_000],
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
    } catch {
      throw new SandboxReadFailure('configuration')
    }
  }

  /** Local cancellation only; it does not revoke any remote authorisation. */
  close(): void {
    this.#closed = true
    for (const controller of this.#active) controller.abort(new SandboxReadFailure('cancelled'))
  }

  async begin(context: ProviderContext, signal?: AbortSignal): Promise<SandboxAuthorisationIntent> {
    const binding = assertContext(context)
    return this.#operation(signal, async (signal) => {
      await this.#current(binding)
      signal.throwIfAborted()
      const created = this.#clock()
      const draft: SandboxAuthorisationDraft = {
        ...binding,
        state: randomBytes(32).toString('base64url'),
        applicationUserId: yapilySandboxUserReference(binding.profileId, binding.connectionId),
        callbackURL: this.#callbackURL,
        tokenMode: this.#mode,
        createdAt: new Date(created).toISOString(),
        expiresAt: new Date(created + this.#intentLifetimeMs).toISOString(),
      }
      await this.#store.stage(draft)
      await this.#institution(signal)
      await this.#current(binding)
      const callback = new URL(this.#callbackURL)
      callback.searchParams.set('lilleri-state', draft.state)
      const response = object(
        await this.#request('/account-auth-requests', 'POST', signal, {
          applicationUserId: draft.applicationUserId,
          institutionId: 'modelo-sandbox',
          callback: callback.href,
          oneTimeToken: this.#mode === 'one_time_token',
        }),
      )
      const data = object(response.data)
      if (
        data.applicationUserId !== draft.applicationUserId ||
        data.institutionId !== 'modelo-sandbox'
      )
        fail('stale_generation')
      if (data.status !== 'AWAITING_AUTHORIZATION') fail('consent_unusable')
      const features = scopes(data.featureScope)
      if (!features.includes('ACCOUNTS') || !features.includes('ACCOUNT_TRANSACTIONS'))
        fail('unsupported')
      const url = httpsURL(data.authorisationUrl)
      if (!this.#origins.has(url.origin)) fail('invalid_contract')
      const activation: SandboxAuthorisationActivation = {
        consentId: uuid(data.id),
        providerState: text(data.state, 500),
        authorisationURL: url.href,
      }
      await this.#current(binding)
      signal.throwIfAborted()
      if (Date.parse(draft.expiresAt) <= this.#clock()) fail('stale_generation')
      if (!(await this.#store.activate(draft, activation))) fail('stale_generation')
      signal.throwIfAborted()
      return { ...draft, ...activation }
    })
  }

  async complete(
    context: ProviderContext,
    callback: SandboxAuthorisationCallback,
    signal?: AbortSignal,
  ): Promise<SandboxAuthorisationResult> {
    const binding = assertContext(context)
    return this.#operation(signal, async (signal) => {
      const state = text(callback.state, 100)
      if (!/^[A-Za-z0-9_-]{43}$/u.test(state)) fail('stale_generation')
      const user = yapilySandboxUserReference(binding.profileId, binding.connectionId)
      if (callback.institutionId !== 'modelo-sandbox' || callback.applicationUserId !== user)
        fail('stale_generation')
      if (callback.kind !== this.#mode) fail('invalid_contract')
      if (
        (callback.kind === 'one_time_token' && 'consentToken' in callback) ||
        (callback.kind === 'consent' && 'oneTimeToken' in callback)
      )
        fail('invalid_contract')
      const token =
        callback.kind === 'one_time_token'
          ? text(callback.oneTimeToken, 16_000)
          : text(callback.consentToken, 16_000)
      await this.#current(binding)
      const now = this.#clock()
      const intent = await this.#store.claim(binding, state, new Date(now).toISOString())
      if (
        !intent ||
        !sameContext(binding, intent) ||
        !same(state, text(intent.state, 100)) ||
        intent.applicationUserId !== user ||
        intent.callbackURL !== this.#callbackURL ||
        intent.tokenMode !== this.#mode ||
        Date.parse(instant(intent.createdAt)) > now ||
        Date.parse(instant(intent.expiresAt)) <= now ||
        Date.parse(intent.expiresAt) - Date.parse(intent.createdAt) > this.#intentLifetimeMs
      )
        fail('stale_generation')
      await this.#institution(signal)
      await this.#current(binding)
      let consentToken = token
      if (callback.kind === 'one_time_token') {
        // The official exchange response is a bare Consent, unlike GET /consents.
        const exchanged = object(
          await this.#request('/consent-one-time-token', 'POST', signal, { oneTimeToken: token }),
        )
        consentToken = text(exchanged.consentToken, 16_000)
        this.#consent(exchanged, binding, intent, consentToken)
      }
      const response = object(
        await this.#request(`/consents/${uuid(intent.consentId)}`, 'GET', signal),
      )
      const authorization = this.#consent(object(response.data), binding, intent, consentToken)
      await this.#current(binding)
      signal.throwIfAborted()
      return {
        binding: { ...binding, consentId: intent.consentId, consentToken },
        authorization,
        environment: 'sandbox',
        productionAdmission: 'blocked',
      }
    })
  }

  async #current(context: SandboxAuthorisationContext): Promise<void> {
    if (!(await this.#store.current(context))) fail('stale_generation')
  }

  #consent(
    consent: Record<string, unknown>,
    context: SandboxAuthorisationContext,
    intent: SandboxAuthorisationIntent,
    token: string,
  ): SandboxAuthorization {
    if (
      uuid(consent.id) !== intent.consentId ||
      consent.institutionId !== 'modelo-sandbox' ||
      consent.applicationUserId !== intent.applicationUserId ||
      !same(text(consent.consentToken, 16_000), token) ||
      !same(text(consent.state, 500), intent.providerState)
    )
      fail('stale_generation')
    if (consent.status !== 'AUTHORIZED') fail('consent_unusable')
    const features = scopes(consent.featureScope)
    if (!features.includes('ACCOUNTS') || !features.includes('ACCOUNT_TRANSACTIONS'))
      fail('unsupported')
    const consentExpiresAt = optionalInstant(consent.expiresAt)
    const reconfirmBy = optionalInstant(consent.reconfirmBy)
    const transactionFrom = optionalInstant(consent.transactionFrom)
    const transactionTo = optionalInstant(consent.transactionTo)
    if (
      (consentExpiresAt !== null && Date.parse(consentExpiresAt) <= this.#clock()) ||
      (reconfirmBy !== null && Date.parse(reconfirmBy) <= this.#clock()) ||
      (transactionFrom !== null &&
        transactionTo !== null &&
        Date.parse(transactionFrom) > Date.parse(transactionTo))
    )
      fail('consent_unusable')
    return {
      authorization: {
        providerId: 'yapily-sandbox',
        institutionId: context.institutionId,
        state: 'active',
        consentExpiresAt,
        scaDueAt: null,
        providerSessionExpiresAt: null,
        tokenExpiresAt: null,
        requiredActions: [],
      },
      reconfirmBy,
      transactionFrom,
      transactionTo,
    }
  }

  async #institution(signal: AbortSignal): Promise<void> {
    const response = object(await this.#request('/institutions', 'GET', signal))
    if (!Array.isArray(response.data) || response.data.length > 1000) fail('bound_reached')
    const count = object(response.meta).count
    if (!(count instanceof ProviderJsonNumber) || count.source !== String(response.data.length))
      fail()
    const ids = new Set<string>()
    let admitted = false
    for (const candidate of response.data) {
      const data = object(candidate)
      const id = text(data.id)
      if (ids.has(id)) fail()
      ids.add(id)
      if (id !== 'modelo-sandbox') continue
      if (data.environmentType !== 'SANDBOX') fail('sandbox_only')
      const features = scopes(data.features)
      if (
        !features.includes('INITIATE_ACCOUNT_REQUEST') ||
        !features.includes('ACCOUNTS') ||
        !features.includes('ACCOUNT_TRANSACTIONS')
      )
        fail('unsupported')
      admitted = true
    }
    if (!admitted) fail('sandbox_only')
  }

  async #operation<T>(
    signal: AbortSignal | undefined,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (this.#closed || signal?.aborted) fail('cancelled')
    const controller = new AbortController()
    this.#active.add(controller)
    const onAbort = () => controller.abort(new SandboxReadFailure('cancelled'))
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
    const timer = setTimeout(
      () => controller.abort(new SandboxReadFailure('timeout')),
      this.#timeoutMs,
    )
    let stop: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
      stop = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', stop, { once: true })
      if (controller.signal.aborted) stop()
    })
    void aborted.catch(() => undefined)
    try {
      controller.signal.throwIfAborted()
      return await Promise.race([work(controller.signal), aborted])
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason instanceof SandboxReadFailure)
        throw controller.signal.reason
      if (error instanceof SandboxReadFailure) throw error
      throw new SandboxReadFailure('invalid_contract')
    } finally {
      clearTimeout(timer)
      if (stop) controller.signal.removeEventListener('abort', stop)
      signal?.removeEventListener('abort', onAbort)
      this.#active.delete(controller)
    }
  }

  async #request(
    path: string,
    method: 'GET' | 'POST',
    signal: AbortSignal,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    signal.throwIfAborted()
    const url = new URL(path, 'https://api.yapily.com')
    if (
      url.pathname !== path ||
      !(
        (method === 'GET' &&
          (path === '/institutions' || /^\/consents\/[a-f\d-]+$/iu.test(path))) ||
        (method === 'POST' && ['/account-auth-requests', '/consent-one-time-token'].includes(path))
      )
    )
      fail()
    let response: Response | undefined
    let stop: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
      stop = () => reject(signal.reason)
      signal.addEventListener('abort', stop, { once: true })
      if (signal.aborted) stop()
    })
    void aborted.catch(() => undefined)
    try {
      const request = this.#fetch(url, {
        method,
        redirect: 'manual',
        signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${this.#applicationId}:${this.#applicationSecret}`).toString('base64')}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      void request.then(
        (late) => {
          if (signal.aborted) void late.body?.cancel().catch(() => undefined)
        },
        () => undefined,
      )
      response = await Promise.race([request, aborted])
      signal.throwIfAborted()
      if (response.status !== (method === 'POST' ? 201 : 200)) {
        const code: SandboxReadFailureCode =
          response.status === 401
            ? 'unauthorized'
            : response.status === 403
              ? 'consent_unusable'
              : response.status === 404
                ? 'not_found'
                : response.status === 424
                  ? 'unsupported'
                  : response.status === 429
                    ? 'rate_limited'
                    : response.status >= 500 && response.status <= 599
                      ? 'unavailable'
                      : 'invalid_contract'
        throw new SandboxReadFailure(code)
      }
      if (
        response.redirected ||
        (response.url && response.url !== url.href) ||
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
          signal.throwIfAborted()
          const chunk = await Promise.race([reader.read(), aborted])
          signal.throwIfAborted()
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > this.#maxResponseBytes) fail('bound_reached')
          chunks.push(chunk.value)
        }
      } finally {
        void reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
      return parseProviderJson(
        new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
      )
    } catch (error) {
      if (signal.aborted) throw signal.reason
      if (error instanceof SandboxReadFailure) throw error
      throw new SandboxReadFailure(response ? 'invalid_contract' : 'unavailable')
    } finally {
      if (stop) signal.removeEventListener('abort', stop)
      if (response?.body && !response.body.locked)
        void response.body.cancel().catch(() => undefined)
    }
  }
}
