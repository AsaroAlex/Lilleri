import { createHash, timingSafeEqual } from 'node:crypto'
import { dateOnly } from '@lilleri/domain'
import {
  assertCurrencyCode,
  type CurrencyCode,
  parseDecimal,
  toDecimalString,
} from '@lilleri/money'
import type { ProviderAuthorization, ProviderDiscoveryMetadata } from './contracts.js'
import { validateProviderAuthorization } from './contracts.js'
import type { ProviderContext } from './index.js'
import { ProviderJsonNumber, parseProviderJson } from './provider-json.js'

/** Official public API 12.16.0; sandbox is an institution, not a separate API hostname. */
export const YAPILY_SANDBOX_EVIDENCE = Object.freeze({
  checkedAt: '2026-10-04',
  apiVersion: '12.16.0',
  authentication: 'https://docs.yapily.com/getting-started/integration-setup/api-authentication',
  institutions: 'https://docs.yapily.com/api-reference/institutions/get-institutions',
  consent: 'https://docs.yapily.com/api-reference/consents/get-consent',
  accounts: 'https://docs.yapily.com/api-reference/financial-data/get-accounts',
  transactions: 'https://docs.yapily.com/api-reference/financial-data/get-account-transactions',
  pagination: 'https://docs.yapily.com/data/financial-data-resources/pagination',
  consentLifecycle: 'https://docs.yapily.com/data/financial-data-resources/financial-data-consents',
  sandbox: 'https://docs.yapily.com/resources/sandbox/overview',
})

export type SandboxReadFailureCode =
  | 'configuration'
  | 'invalid_contract'
  | 'sandbox_only'
  | 'stale_generation'
  | 'unauthorized'
  | 'consent_unusable'
  | 'not_found'
  | 'unsupported'
  | 'rate_limited'
  | 'unavailable'
  | 'timeout'
  | 'cancelled'
  | 'bound_reached'

/** Neither provider bodies nor transport exception text may enter logs/job reports. */
export class SandboxReadFailure extends Error {
  constructor(
    readonly code: SandboxReadFailureCode,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(code)
    this.name = 'SandboxReadFailure'
  }
}

export interface SandboxReadLimits {
  readonly timeoutMs: number
  readonly captureTimeoutMs: number
  readonly maxResponseBytes: number
  readonly maxAccounts: number
  readonly pageSize: number
  readonly maxPages: number
  readonly maxTransactions: number
  readonly maxAttempts: number
  readonly retryDelayMs: number
  readonly maxRetryDelayMs: number
}
const DEFAULT_LIMITS: SandboxReadLimits = Object.freeze({
  timeoutMs: 10_000,
  captureTimeoutMs: 60_000,
  maxResponseBytes: 1_048_576,
  maxAccounts: 20,
  pageSize: 200,
  maxPages: 50,
  maxTransactions: 10_000,
  maxAttempts: 3,
  retryDelayMs: 250,
  maxRetryDelayMs: 5_000,
})

/** Trusted server binding supplied only after a real sandbox consent has been obtained. */
export interface YapilySandboxBinding {
  readonly profileId: string
  readonly connectionId: string
  readonly grantId: string
  readonly institutionId: 'modelo-sandbox'
  readonly consentId: string
  readonly consentToken: string
}
export interface YapilySandboxOptions {
  readonly applicationId: string
  readonly applicationSecret: string
  readonly permissionReference: string
  readonly binding: YapilySandboxBinding
  readonly limits?: Partial<SandboxReadLimits>
  readonly fetch?: typeof globalThis.fetch
  readonly clock?: () => number
}
export interface SandboxReadWindow {
  /** Inclusive provider timestamp bounds, never an invented history entitlement. */
  readonly from: string
  readonly before: string
}
export interface SandboxBalance {
  readonly amount: string
  readonly currency: CurrencyCode
  readonly providerType: string
  readonly semantics: 'booked' | 'available' | 'unknown'
  readonly observedAt: string | null
}
export interface SandboxAccount {
  readonly id: string
  readonly name: string
  readonly kind: 'current' | 'card' | 'savings' | 'unknown'
  readonly currency: CurrencyCode
  readonly balances: readonly SandboxBalance[]
}
export interface SandboxTransaction {
  /** Missing source IDs stay missing; enrichment hashes are not bank identifiers. */
  readonly id: string | null
  readonly accountId: string
  readonly amount: string
  readonly currency: CurrencyCode
  readonly status: 'pending' | 'booked'
  readonly description: string
  readonly bookedOn: string | null
  readonly bookingDateTime: string | null
  readonly valueDateTime: string | null
  /** A provider `date` is not evidence of a card authorization time. */
  readonly providerDate: string | null
  readonly reference: string | null
}
export interface SandboxAuthorization {
  readonly authorization: ProviderAuthorization
  /** UK reconfirmation is kept separately; it is not an SCA or token expiry. */
  readonly reconfirmBy: string | null
  readonly transactionFrom: string | null
  readonly transactionTo: string | null
}
export interface SandboxReadCapture {
  readonly providerId: 'yapily-sandbox'
  readonly environment: 'sandbox'
  readonly institutionId: 'modelo-sandbox'
  readonly coverage: 'unverified'
  /** Offset page traversal cannot establish an immutable bank snapshot. */
  readonly consistency: 'reported_pages_only'
  readonly pendingSet: 'unknown'
  readonly deletionEvidence: 'unknown'
  readonly authorization: SandboxAuthorization
  readonly window: SandboxReadWindow
  readonly accounts: readonly SandboxAccount[]
  readonly transactions: readonly SandboxTransaction[]
  readonly observedAt: string
}

function fail(code: SandboxReadFailureCode = 'invalid_contract'): never {
  throw new SandboxReadFailure(code)
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
function optionalText(value: unknown, max = 200): string | null {
  return value === undefined || value === null ? null : text(value, max)
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function array(value: unknown, max: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) return fail('bound_reached')
  return value
}
function integer(value: unknown, min: number, max: number): number {
  const source = value instanceof ProviderJsonNumber ? value.source : null
  if (!source || !/^(?:0|[1-9]\d*)$/u.test(source)) return fail()
  const result = Number(source)
  if (!Number.isSafeInteger(result) || result < min || result > max) return fail()
  return result
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
function currency(value: unknown): CurrencyCode {
  return assertCurrencyCode(text(value, 3))
}
function decimal(value: unknown, code: CurrencyCode): string {
  if (!(value instanceof ProviderJsonNumber)) return fail()
  // Nonplain JSON numbers (exponents) and nonminor fractions fail, rather than rounding.
  return toDecimalString(parseDecimal(value.source, code))
}
function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
function safeError(error: unknown, signal: AbortSignal): SandboxReadFailure {
  if (signal.aborted && signal.reason instanceof SandboxReadFailure) return signal.reason
  if (error instanceof SandboxReadFailure) return error
  return new SandboxReadFailure('invalid_contract')
}

/** No email, name or bank identifier is needed for the external application user reference. */
export function yapilySandboxUserReference(profileId: string, connectionId: string): string {
  return `lilleri-sandbox-${createHash('sha256')
    .update(JSON.stringify([text(profileId), text(connectionId)]))
    .digest('hex')}`
}

/**
 * Official, read-only Modelo sandbox adapter. Deliberately not FinancialDataProvider:
 * creation/renewal/revocation and durable sync admission need independent server integration.
 */
export class YapilySandboxReadAdapter {
  readonly id = 'yapily-sandbox'
  #applicationId: string
  #applicationSecret: string
  #binding: YapilySandboxBinding
  #fetch: typeof globalThis.fetch
  #clock: () => number
  #limits: SandboxReadLimits
  #closed = false
  #busy = false
  #active: AbortController | null = null

  constructor(options: YapilySandboxOptions) {
    try {
      this.#applicationId = text(options.applicationId, 500)
      this.#applicationSecret = text(options.applicationSecret, 4000)
      text(options.permissionReference, 500)
      if (this.#applicationId.includes(':')) fail('configuration')
      const binding = options.binding
      if (binding.institutionId !== 'modelo-sandbox') fail('sandbox_only')
      this.#binding = Object.freeze({
        profileId: text(binding.profileId),
        connectionId: text(binding.connectionId),
        grantId: text(binding.grantId),
        institutionId: binding.institutionId,
        consentId: text(binding.consentId),
        consentToken: text(binding.consentToken, 16_000),
      })
      if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/iu.test(this.#binding.consentId))
        fail('configuration')
      this.#limits = Object.freeze({ ...DEFAULT_LIMITS, ...options.limits })
      const bounds: Record<keyof SandboxReadLimits, readonly [number, number]> = {
        timeoutMs: [1, 30_000],
        captureTimeoutMs: [1, 120_000],
        maxResponseBytes: [100, 4_194_304],
        maxAccounts: [1, 100],
        pageSize: [1, 1000],
        maxPages: [1, 100],
        maxTransactions: [1, 100_000],
        maxAttempts: [1, 3],
        retryDelayMs: [1, 5000],
        maxRetryDelayMs: [1, 30_000],
      }
      for (const key of Object.keys(bounds) as (keyof SandboxReadLimits)[]) {
        const [min, max] = bounds[key]
        const value = this.#limits[key]
        if (!Number.isSafeInteger(value) || value < min || value > max) fail('configuration')
      }
      if (Object.keys(this.#limits).some((key) => !Object.hasOwn(bounds, key)))
        fail('configuration')
      this.#fetch = options.fetch ?? globalThis.fetch
      this.#clock = options.clock ?? Date.now
    } catch (error) {
      if (error instanceof SandboxReadFailure && error.code === 'sandbox_only') throw error
      throw new SandboxReadFailure('configuration')
    }
  }

  discoveryMetadata(): ProviderDiscoveryMetadata {
    return {
      providerId: this.id,
      environment: 'sandbox',
      coverageVersion: 'yapily-12.16.0-read-only-2026-10-04',
      pagination: { maxPageSize: 1000, maxPages: 1, maxCursorBytes: 1 },
      refresh: { userPresent: 'unknown', unattendedBudget: null },
      renewal: 'unknown',
    }
  }

  /** Local cancellation only. This never asserts remote consent revocation. */
  close(): void {
    this.#closed = true
    this.#active?.abort(new SandboxReadFailure('cancelled'))
  }

  async capture(
    context: ProviderContext,
    window: SandboxReadWindow,
    signal?: AbortSignal,
  ): Promise<SandboxReadCapture> {
    this.#assertContext(context)
    if (this.#busy) return fail('bound_reached')
    const controller = new AbortController()
    this.#active = controller
    this.#busy = true
    const onAbort = () => controller.abort(new SandboxReadFailure('cancelled'))
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
    const timeout = setTimeout(
      () => controller.abort(new SandboxReadFailure('timeout')),
      this.#limits.captureTimeoutMs,
    )
    try {
      const from = instant(window.from)
      const before = instant(window.before)
      if (Date.parse(from) > Date.parse(before)) return fail()
      const result = await this.#capture(context, { from, before }, controller.signal)
      this.#assertContext(context)
      controller.signal.throwIfAborted()
      return result
    } catch (error) {
      throw safeError(error, controller.signal)
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      this.#busy = false
      this.#active = null
    }
  }

  #assertContext(context: ProviderContext): void {
    if (this.#closed) fail('cancelled')
    const binding = this.#binding
    if (
      context.profileId !== binding.profileId ||
      context.connectionId !== binding.connectionId ||
      context.grantId !== binding.grantId ||
      context.institutionId !== binding.institutionId
    )
      fail('stale_generation')
  }

  async #capture(
    context: ProviderContext,
    window: SandboxReadWindow,
    signal: AbortSignal,
  ): Promise<SandboxReadCapture> {
    await this.#verifyInstitution(signal)
    const authorization = await this.#readAuthorization(signal)
    this.#assertWindow(window, authorization)
    const accounts = await this.#readAccounts(signal)
    const transactions: SandboxTransaction[] = []
    const identities = new Set<string>()
    let pages = 0
    for (const account of accounts) {
      let offset = 0
      let expectedCount: number | null = null
      do {
        if (++pages > this.#limits.maxPages) return fail('bound_reached')
        this.#assertContext(context)
        await this.#readAuthorization(signal)
        const response = object(
          await this.#get(`/accounts/${encodeURIComponent(account.id)}/transactions`, signal, {
            consent: true,
            query: {
              ...window,
              limit: String(this.#limits.pageSize),
              offset: String(offset),
              sort: 'date',
            },
          }),
        )
        const pagination = object(object(response.meta).pagination)
        const total = integer(pagination.totalCount, 0, this.#limits.maxTransactions)
        const self = object(pagination.self)
        if (
          integer(self.limit, 1, 1000) !== this.#limits.pageSize ||
          integer(self.offset, 0, this.#limits.maxTransactions) !== offset ||
          (self.sort !== undefined && self.sort !== 'date') ||
          (self.from !== undefined && instant(self.from) !== window.from) ||
          (self.before !== undefined && instant(self.before) !== window.before) ||
          (pagination.next !== undefined && pagination.next !== null)
        )
          return fail()
        if (expectedCount !== null && expectedCount !== total) return fail()
        expectedCount = total
        const records = array(response.data, this.#limits.pageSize)
        if (
          integer(object(response.meta).count, 0, this.#limits.pageSize) !== records.length ||
          records.length !== Math.min(this.#limits.pageSize, total - offset) ||
          transactions.length + records.length > this.#limits.maxTransactions
        )
          return fail()
        for (const record of records) {
          const transaction = this.#transaction(record, account.id)
          if (transaction.id !== null) {
            const key = JSON.stringify([account.id, transaction.id])
            if (identities.has(key)) return fail()
            identities.add(key)
          }
          transactions.push(transaction)
        }
        offset += records.length
      } while (offset < (expectedCount ?? 0))
    }
    const finalAccounts = await this.#readAccounts(signal)
    if (JSON.stringify(accounts) !== JSON.stringify(finalAccounts)) return fail()
    const finalAuthorization = await this.#readAuthorization(signal)
    this.#assertWindow(window, finalAuthorization)
    if (JSON.stringify(finalAuthorization) !== JSON.stringify(authorization)) return fail()
    return {
      providerId: 'yapily-sandbox',
      environment: 'sandbox',
      institutionId: 'modelo-sandbox',
      coverage: 'unverified',
      consistency: 'reported_pages_only',
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
      authorization,
      window,
      accounts,
      transactions,
      observedAt: new Date(this.#clock()).toISOString(),
    }
  }

  #assertWindow(window: SandboxReadWindow, authorization: SandboxAuthorization): void {
    if (
      (authorization.transactionFrom !== null &&
        Date.parse(window.from) < Date.parse(authorization.transactionFrom)) ||
      (authorization.transactionTo !== null &&
        Date.parse(window.before) > Date.parse(authorization.transactionTo))
    )
      fail('consent_unusable')
  }

  async #verifyInstitution(signal: AbortSignal): Promise<void> {
    const response = object(await this.#get('/institutions', signal))
    const institutions = array(response.data, 1000)
    if (integer(object(response.meta).count, 0, 1000) !== institutions.length) return fail()
    const ids = new Set<string>()
    let admitted = false
    for (const candidate of institutions) {
      const institution = object(candidate)
      const id = text(institution.id)
      if (ids.has(id)) return fail()
      ids.add(id)
      if (id !== this.#binding.institutionId) continue
      if (institution.environmentType !== 'SANDBOX') return fail('sandbox_only')
      const features = array(institution.features, 200).map((feature) => text(feature))
      if (!features.includes('ACCOUNTS') || !features.includes('ACCOUNT_TRANSACTIONS'))
        return fail('unsupported')
      admitted = true
    }
    if (!admitted) return fail('sandbox_only')
  }

  async #readAuthorization(signal: AbortSignal): Promise<SandboxAuthorization> {
    const response = object(await this.#get(`/consents/${this.#binding.consentId}`, signal))
    const consent = object(response.data)
    if (
      text(consent.id) !== this.#binding.consentId ||
      text(consent.institutionId) !== this.#binding.institutionId ||
      text(consent.applicationUserId) !==
        yapilySandboxUserReference(this.#binding.profileId, this.#binding.connectionId) ||
      !sameSecret(text(consent.consentToken, 16_000), this.#binding.consentToken)
    )
      return fail('stale_generation')
    if (consent.status !== 'AUTHORIZED') return fail('consent_unusable')
    const features = array(consent.featureScope, 200).map((feature) => text(feature))
    if (!features.includes('ACCOUNTS') || !features.includes('ACCOUNT_TRANSACTIONS'))
      return fail('unsupported')
    const consentExpiresAt = optionalInstant(consent.expiresAt)
    const reconfirmBy = optionalInstant(consent.reconfirmBy)
    if (
      (consentExpiresAt !== null && Date.parse(consentExpiresAt) <= this.#clock()) ||
      (reconfirmBy !== null && Date.parse(reconfirmBy) <= this.#clock())
    )
      return fail('consent_unusable')
    const authorization = validateProviderAuthorization(
      {
        providerId: this.id,
        institutionId: this.#binding.institutionId,
        state: 'active',
        consentExpiresAt,
        scaDueAt: null,
        providerSessionExpiresAt: null,
        tokenExpiresAt: null,
        requiredActions: [],
      },
      this.discoveryMetadata(),
    )
    return {
      authorization,
      reconfirmBy,
      transactionFrom: optionalInstant(consent.transactionFrom),
      transactionTo: optionalInstant(consent.transactionTo),
    }
  }

  async #readAccounts(signal: AbortSignal): Promise<readonly SandboxAccount[]> {
    const response = object(await this.#get('/accounts', signal, { consent: true }))
    const records = array(response.data, this.#limits.maxAccounts)
    if (integer(object(response.meta).count, 0, this.#limits.maxAccounts) !== records.length)
      return fail()
    const ids = new Set<string>()
    return records.map((candidate) => {
      const record = object(candidate)
      const id = text(record.id)
      if (ids.has(id)) return fail()
      ids.add(id)
      const code = currency(record.currency)
      const balances =
        record.accountBalances === undefined
          ? []
          : array(record.accountBalances, 20).map((candidate): SandboxBalance => {
              const balance = object(candidate)
              const amount = object(balance.balanceAmount)
              const balanceCurrency = currency(amount.currency)
              const type = text(balance.type)
              return {
                amount: decimal(amount.amount, balanceCurrency),
                currency: balanceCurrency,
                providerType: type,
                semantics: [
                  'CLOSING_BOOKED',
                  'INTERIM_BOOKED',
                  'OPENING_BOOKED',
                  'PREVIOUSLY_CLOSED_BOOKED',
                ].includes(type)
                  ? 'booked'
                  : [
                        'CLOSING_AVAILABLE',
                        'INTERIM_AVAILABLE',
                        'OPENING_AVAILABLE',
                        'FORWARD_AVAILABLE',
                      ].includes(type)
                    ? 'available'
                    : 'unknown',
                observedAt: optionalInstant(balance.dateTime),
              }
            })
      if (balances.length === 0 && record.balance !== undefined) {
        balances.push({
          amount: decimal(record.balance, code),
          currency: code,
          providerType: 'HEADLINE_FALLBACK',
          semantics: 'unknown',
          observedAt: null,
        })
      }
      const kind =
        record.accountType === 'CURRENT'
          ? 'current'
          : ['CREDIT_CARD', 'CHARGE_CARD', 'PREPAID_CARD'].includes(String(record.accountType))
            ? 'card'
            : ['SAVINGS', 'LIMITED_LIQUIDITY_SAVINGS_ACCOUNT'].includes(String(record.accountType))
              ? 'savings'
              : 'unknown'
      return {
        id,
        name: optionalText(record.nickname) ?? optionalText(record.description) ?? id,
        kind,
        currency: code,
        balances,
      }
    })
  }

  #transaction(value: unknown, accountId: string): SandboxTransaction {
    const record = object(value)
    const code = currency(record.currency)
    const amount = decimal(record.amount, code)
    if (record.transactionAmount !== undefined) {
      const redundant = object(record.transactionAmount)
      if (currency(redundant.currency) !== code || decimal(redundant.amount, code) !== amount)
        return fail()
    }
    if (!['BOOKED', 'PENDING'].includes(text(record.status))) return fail()
    const bookingDateTime = optionalInstant(record.bookingDateTime)
    const status = record.status === 'BOOKED' ? 'booked' : 'pending'
    if (status === 'booked' && bookingDateTime === null) return fail()
    return {
      id: optionalText(record.id),
      accountId,
      currency: code,
      amount,
      status,
      description: text(record.description, 2000),
      bookedOn: status === 'booked' ? (bookingDateTime?.slice(0, 10) ?? null) : null,
      bookingDateTime,
      valueDateTime: optionalInstant(record.valueDateTime),
      providerDate: optionalInstant(record.date),
      reference: optionalText(record.reference, 500),
    }
  }

  async #get(
    path: string,
    signal: AbortSignal,
    options: { readonly consent?: boolean; readonly query?: Readonly<Record<string, string>> } = {},
  ): Promise<unknown> {
    signal.throwIfAborted()
    // Only these documented reads can carry credentials; redirects and provider links are unused.
    if (!/^\/(?:institutions|consents\/[a-f\d-]+|accounts(?:\/[^/]+\/transactions)?)$/iu.test(path))
      return fail()
    for (let attempt = 0; attempt < this.#limits.maxAttempts; attempt++) {
      try {
        return await this.#attempt(path, signal, options)
      } catch (error) {
        const failure = safeError(error, signal)
        if (
          signal.aborted ||
          (failure.code === 'rate_limited' && failure.retryAfterSeconds === null) ||
          !['rate_limited', 'unavailable', 'timeout'].includes(failure.code) ||
          attempt + 1 === this.#limits.maxAttempts
        )
          throw failure
        const delay =
          failure.retryAfterSeconds === null
            ? this.#limits.retryDelayMs * 2 ** attempt
            : failure.retryAfterSeconds * 1000
        if (delay > this.#limits.maxRetryDelayMs) throw failure
        await this.#delay(delay, signal)
      }
    }
    return fail('unavailable')
  }

  #delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer)
        reject(signal.reason)
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, ms)
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) onAbort()
    })
  }

  async #attempt(
    path: string,
    parentSignal: AbortSignal,
    options: { readonly consent?: boolean; readonly query?: Readonly<Record<string, string>> },
  ): Promise<unknown> {
    const controller = new AbortController()
    const onAbort = () => controller.abort(parentSignal.reason)
    parentSignal.addEventListener('abort', onAbort, { once: true })
    if (parentSignal.aborted) onAbort()
    const timer = setTimeout(
      () => controller.abort(new SandboxReadFailure('timeout')),
      this.#limits.timeoutMs,
    )
    let stop: (() => void) | undefined
    const aborted = new Promise<never>((_resolve, reject) => {
      stop = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', stop, { once: true })
      if (controller.signal.aborted) stop()
    })
    let response: Response | null = null
    try {
      const url = new URL(path, 'https://api.yapily.com')
      if (url.pathname !== path) return fail()
      for (const [key, value] of Object.entries(options.query ?? {}))
        url.searchParams.set(key, value)
      controller.signal.throwIfAborted()
      const request = this.#fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${this.#applicationId}:${this.#applicationSecret}`, 'utf8').toString('base64')}`,
          ...(options.consent ? { Consent: this.#binding.consentToken } : {}),
        },
      })
      // A noncooperating transport may settle after cancellation: discard its body.
      void request.then(
        (late) => {
          if (controller.signal.aborted) void late.body?.cancel().catch(() => undefined)
        },
        () => undefined,
      )
      response = await Promise.race([request, aborted])
      if (response.status !== 200) {
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
        throw new SandboxReadFailure(code, this.#retryAfter(response.headers.get('retry-after')))
      }
      if (
        (response.url && new URL(response.url).href !== url.href) ||
        response.redirected ||
        !/^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type') ?? '') ||
        !response.body
      )
        return fail()
      const length = response.headers.get('content-length')
      if (
        length !== null &&
        (!/^\d+$/u.test(length) || Number(length) > this.#limits.maxResponseBytes)
      )
        return fail('bound_reached')
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let bytes = 0
      try {
        while (true) {
          const chunk = await Promise.race([reader.read(), aborted])
          if (chunk.done) break
          bytes += chunk.value.byteLength
          if (bytes > this.#limits.maxResponseBytes) return fail('bound_reached')
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
      if (controller.signal.aborted) throw safeError(error, controller.signal)
      if (error instanceof SandboxReadFailure) throw error
      // A fetch rejection is operational; malformed JSON is a contract failure.
      throw new SandboxReadFailure(response === null ? 'unavailable' : 'invalid_contract')
    } finally {
      clearTimeout(timer)
      if (stop) controller.signal.removeEventListener('abort', stop)
      parentSignal.removeEventListener('abort', onAbort)
      if (response?.body && !response.body.locked)
        void response.body.cancel().catch(() => undefined)
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
