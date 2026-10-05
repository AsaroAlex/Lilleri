import { createPrivateKey, type KeyObject, sign } from 'node:crypto'
import { dateOnly } from '@lilleri/domain'
import { ProviderJsonNumber, parseProviderJson } from './provider-json.js'

/** Reference evidence does not establish a particular application's entitlement. */
export const ENABLE_BANKING_PERSONAL_EVIDENCE = Object.freeze({
  checkedAt: '2026-10-05',
  reference: 'https://enablebanking.com/docs/api/reference/',
  authorizationMigration:
    'https://enablebanking.com/blog/2026/06/12/enable-banking-changelog-may-2026',
  apiOrigin: 'https://api.enablebanking.com',
  authorizationOrigins: Object.freeze([
    'https://auth.enablebanking.com',
    'https://tilisy.enablebanking.com',
  ]),
})

export type EnableBankingPersonalFailureCode =
  | 'configuration'
  | 'invalid_request'
  | 'invalid_contract'
  | 'application_inactive'
  | 'production_required'
  | 'ais_unavailable'
  | 'unsupported_bank'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'response_too_large'
  | 'timeout'
  | 'cancelled'
  | 'transport'
  | 'exchange_outcome_unknown'
  | 'cleanup_unverified'

/** No original exception, response body, request URL or secret is retained. */
export class EnableBankingPersonalFailure extends Error {
  constructor(readonly code: EnableBankingPersonalFailureCode) {
    super(code)
    this.name = 'EnableBankingPersonalFailure'
  }
}

export interface EnableBankingPersonalOptions {
  readonly applicationId: string
  readonly privateKeyPem: string
  readonly fetch?: typeof globalThis.fetch
  readonly clock?: () => number
  readonly timeoutMs?: number
  readonly maxResponseBytes?: number
}
export interface EnableBankingApplication {
  readonly kid: string
  readonly name: string
  readonly environment: 'PRODUCTION' | 'SANDBOX'
  readonly active: boolean
  readonly countries: readonly string[]
  readonly services: readonly ('AIS' | 'PIS')[]
  readonly redirectUrls: readonly string[]
}
export interface EnableBankingASPSP {
  readonly name: string
  readonly country: string
}
export interface EnableBankingPersonalASPSP extends EnableBankingASPSP {
  readonly logo: string
  readonly maximumConsentValidity: number
  readonly beta: boolean
  /** Visible personal methods only. An empty array denotes the bank's default method. */
  readonly authMethods: readonly {
    readonly name: string | null
    readonly title: string | null
    readonly approach: 'REDIRECT' | 'DECOUPLED' | 'EMBEDDED'
  }[]
}
export type EnableBankingJsonValue =
  | null
  | boolean
  | string
  | number
  | readonly EnableBankingJsonValue[]
  | { readonly [key: string]: EnableBankingJsonValue }
export interface EnableBankingAmount {
  readonly [key: string]: EnableBankingJsonValue
  readonly currency: string
  readonly amount: string
}
export interface EnableBankingAccount {
  readonly [key: string]: EnableBankingJsonValue | undefined
  readonly uid?: string | null
  readonly currency: string
  readonly cash_account_type: string
  readonly identification_hash: string
  readonly identification_hashes: readonly string[]
}
export interface EnableBankingBalance {
  readonly [key: string]: EnableBankingJsonValue
  readonly name: string
  readonly balance_amount: EnableBankingAmount
  readonly balance_type: string
}
export interface EnableBankingTransaction {
  readonly [key: string]: EnableBankingJsonValue | undefined
  readonly transaction_amount: EnableBankingAmount
  readonly credit_debit_indicator: 'CRDT' | 'DBIT'
  readonly status: 'BOOK' | 'CNCL' | 'HOLD' | 'OTHR' | 'PDNG' | 'RJCT' | 'SCHD'
  /** Optional source identity remains optional; it is never fabricated or deduplicated. */
  readonly entry_reference?: string | null
  /** This source ID is unstable and must not be used as a unique transaction identity. */
  readonly transaction_id?: string | null
}
export interface EnableBankingPersonalSession {
  readonly sessionId: string
  readonly accounts: readonly EnableBankingAccount[]
  readonly aspsp: EnableBankingASPSP
  readonly psuType: 'personal'
  readonly validUntil: string
}
export type EnableBankingSessionStatus =
  | 'AUTHORIZED'
  | 'CANCELLED'
  | 'CLOSED'
  | 'EXPIRED'
  | 'INVALID'
  | 'PENDING_AUTHORIZATION'
  | 'RETURNED_FROM_BANK'
  | 'REVOKED'
export interface EnableBankingSessionData {
  readonly sessionId: string
  readonly status: EnableBankingSessionStatus
  readonly accounts: readonly string[]
  readonly aspsp: EnableBankingASPSP
  readonly psuType: 'personal'
  readonly validUntil: string
}
export interface EnableBankingStartAuthorization {
  readonly aspsp: EnableBankingASPSP
  readonly state: string
  /** Exact registered HTTPS callback; this client never fetches that URL. */
  readonly redirectUrl: string
  readonly validUntil: string
  readonly authMethod?: string
}

const API_ORIGIN = 'https://api.enablebanking.com'
const AUTH_ORIGINS = ENABLE_BANKING_PERSONAL_EVIDENCE.authorizationOrigins
const SESSION_STATUSES = [
  'AUTHORIZED',
  'CANCELLED',
  'CLOSED',
  'EXPIRED',
  'INVALID',
  'PENDING_AUTHORIZATION',
  'RETURNED_FROM_BANK',
  'REVOKED',
] as const
const BALANCE_TYPES = [
  'CLAV',
  'CLBD',
  'FWAV',
  'INFO',
  'ITAV',
  'ITBD',
  'OPAV',
  'OPBD',
  'OTHR',
  'PRCD',
  'VALU',
  'XPCD',
] as const
const TRANSACTION_STATUSES = ['BOOK', 'CNCL', 'HOLD', 'OTHR', 'PDNG', 'RJCT', 'SCHD'] as const

function fail(code: EnableBankingPersonalFailureCode = 'invalid_contract'): never {
  throw new EnableBankingPersonalFailure(code)
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function text(value: unknown, max = 512): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Buffer.byteLength(value) > max ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return fail()
  return value
}
function uuid(value: unknown): string {
  const result = text(value, 36)
  if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/iu.test(result)) return fail()
  return result
}
function country(value: unknown): string {
  const result = text(value, 2)
  if (!/^[A-Z]{2}$/u.test(result)) return fail()
  return result
}
function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : fail()
}
function array(value: unknown, max = 10_000): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) return fail()
  return value
}
function enumeration<const T extends string>(value: unknown, choices: readonly T[]): T {
  return typeof value === 'string' && choices.includes(value as T) ? (value as T) : fail()
}
function instant(value: unknown): string {
  const result = text(value, 50)
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/u.exec(
      result,
    )
  if (
    !match ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    Number(match[4]) > 59 ||
    (match[6] !== undefined && (Number(match[6]) > 23 || Number(match[7]) > 59)) ||
    !Number.isFinite(Date.parse(result))
  )
    return fail()
  try {
    dateOnly(match[1] ?? '')
  } catch {
    return fail()
  }
  return result
}
function date(value: unknown): string {
  try {
    return dateOnly(text(value, 10))
  } catch {
    return fail()
  }
}
function httpsUrl(value: unknown, callback = false): string {
  const result = text(value, 8192)
  try {
    const url = new URL(result)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      result.includes('#') ||
      (callback && result.includes('?'))
    )
      return fail()
    return result
  } catch {
    return fail()
  }
}
function aspsp(value: unknown): EnableBankingASPSP {
  const source = object(value)
  return { name: text(source.name), country: country(source.country) }
}
/** Convert only safe integer JSON numerals; monetary values must be source strings. */
function json(value: unknown): EnableBankingJsonValue {
  if (value instanceof ProviderJsonNumber) {
    const number = Number(value.source)
    if (!/^-?(0|[1-9]\d*)$/u.test(value.source) || !Number.isSafeInteger(number)) return fail()
    return number
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(json)
  const source = object(value)
  return Object.fromEntries(Object.entries(source).map(([key, child]) => [key, json(child)]))
}
function amount(value: unknown): EnableBankingAmount {
  const source = object(value)
  const currency = text(source.currency, 3)
  const decimal = text(source.amount, 128)
  if (!/^[A-Z]{3}$/u.test(currency) || !/^[+-]?\d+(?:\.\d+)?$/u.test(decimal)) return fail()
  return source as EnableBankingAmount
}
function financialRecord(value: unknown): Record<string, EnableBankingJsonValue> {
  const source = object(json(value)) as Record<string, EnableBankingJsonValue>
  const checkAmounts = (item: EnableBankingJsonValue): void => {
    if (!item || typeof item !== 'object') return
    if (Array.isArray(item)) {
      for (const child of item) checkAmounts(child)
      return
    }
    if (Object.hasOwn(item, 'amount')) amount(item)
    for (const child of Object.values(item)) checkAmounts(child)
  }
  checkAmounts(source)
  return source
}
function optionalText(source: Record<string, unknown>, key: string, max = 4096): void {
  if (source[key] !== undefined && source[key] !== null) text(source[key], max)
}
function account(value: unknown): EnableBankingAccount {
  const source = financialRecord(value)
  if (source.uid !== undefined && source.uid !== null) uuid(source.uid)
  if (!/^[A-Z]{3}$/u.test(text(source.currency, 3))) return fail()
  text(source.cash_account_type, 16)
  text(source.identification_hash, 8192)
  for (const value of array(source.identification_hashes, 100)) text(value, 8192)
  return source as EnableBankingAccount
}
function balance(value: unknown): EnableBankingBalance {
  const source = financialRecord(value)
  text(source.name)
  amount(source.balance_amount)
  enumeration(source.balance_type, BALANCE_TYPES)
  if (source.reference_date !== undefined && source.reference_date !== null)
    date(source.reference_date)
  if (source.last_change_date_time !== undefined && source.last_change_date_time !== null)
    instant(source.last_change_date_time)
  optionalText(source, 'last_committed_transaction')
  return source as unknown as EnableBankingBalance
}
function transaction(value: unknown): EnableBankingTransaction {
  const source = financialRecord(value)
  amount(source.transaction_amount)
  enumeration(source.credit_debit_indicator, ['CRDT', 'DBIT'])
  enumeration(source.status, TRANSACTION_STATUSES)
  optionalText(source, 'entry_reference')
  optionalText(source, 'transaction_id')
  for (const key of ['booking_date', 'value_date', 'transaction_date'])
    if (source[key] !== undefined && source[key] !== null) date(source[key])
  if (source.remittance_information !== undefined && source.remittance_information !== null)
    array(source.remittance_information, 1000).forEach((value) => {
      if (typeof value !== 'string') fail()
    })
  return source as unknown as EnableBankingTransaction
}

/** Server/owner-machine AIS client. Never installed in the shared demonstration runtime. */
export class EnableBankingPersonalClient {
  readonly #applicationId: string
  readonly #key: KeyObject
  readonly #fetch: typeof globalThis.fetch
  readonly #clock: () => number
  readonly #timeoutMs: number
  readonly #maxResponseBytes: number
  readonly #active = new Set<AbortController>()
  readonly #catalogues = new Map<string, readonly EnableBankingPersonalASPSP[]>()
  #application: EnableBankingApplication | null = null
  #closed = false

  constructor(options: EnableBankingPersonalOptions) {
    try {
      this.#applicationId = uuid(options.applicationId)
      if (
        typeof options.privateKeyPem !== 'string' ||
        Buffer.byteLength(options.privateKeyPem) > 32_768
      )
        fail()
      this.#key = createPrivateKey(options.privateKeyPem)
      if (
        this.#key.type !== 'private' ||
        this.#key.asymmetricKeyType !== 'rsa' ||
        (this.#key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
      )
        fail()
      this.#fetch = options.fetch ?? globalThis.fetch
      this.#clock = options.clock ?? Date.now
      this.#timeoutMs = options.timeoutMs ?? 15_000
      this.#maxResponseBytes = options.maxResponseBytes ?? 4_194_304
      if (typeof this.#fetch !== 'function' || typeof this.#clock !== 'function') fail()
      for (const [value, min, max] of [
        [this.#timeoutMs, 1, 60_000],
        [this.#maxResponseBytes, 100, 8_388_608],
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
      this.#now()
    } catch {
      throw new EnableBankingPersonalFailure('configuration')
    }
  }

  close(): void {
    this.#closed = true
    for (const controller of this.#active)
      controller.abort(new EnableBankingPersonalFailure('cancelled'))
  }

  async getApplication(): Promise<EnableBankingApplication> {
    this.#application = null
    this.#catalogues.clear()
    const source = object(await this.#request('/application'))
    const kid = uuid(source.kid)
    if (kid !== this.#applicationId) return fail()
    const result: EnableBankingApplication = {
      kid,
      name: text(source.name),
      environment: enumeration(source.environment, ['PRODUCTION', 'SANDBOX']),
      active: boolean(source.active),
      countries: array(source.countries, 300).map(country),
      services: array(source.services, 2).map((value) => enumeration(value, ['AIS', 'PIS'])),
      // Registration metadata is returned truthfully; requesting auth requires HTTPS below.
      redirectUrls: array(source.redirect_urls, 100).map((value) => text(value, 8192)),
    }
    this.#application = result
    return result
  }

  async listASPSPs(countryCode: string): Promise<readonly EnableBankingPersonalASPSP[]> {
    const code = this.#input(() => country(countryCode))
    this.#ready(code)
    this.#catalogues.delete(code)
    const query = new URLSearchParams({ country: code, psu_type: 'personal', service: 'AIS' })
    const source = object(await this.#request(`/aspsps?${query}`))
    const result: EnableBankingPersonalASPSP[] = []
    for (const entry of array(source.aspsps)) {
      const row = object(entry)
      const identity = aspsp(row)
      const psuTypes = array(row.psu_types, 2).map((value) =>
        enumeration(value, ['personal', 'business']),
      )
      const methods = array(row.auth_methods, 100).map((value) => {
        const method = object(value)
        return {
          psuType: enumeration(method.psu_type, ['personal', 'business']),
          hidden: boolean(method.hidden_method),
          name: method.name === undefined || method.name === null ? null : text(method.name),
          title: method.title === undefined || method.title === null ? null : text(method.title),
          approach: enumeration(method.approach, ['REDIRECT', 'DECOUPLED', 'EMBEDDED']),
        }
      })
      // Filter exact country and personal capability; brand names never imply coverage.
      if (identity.country !== code || !psuTypes.includes('personal')) continue
      const authMethods = methods
        .filter((method) => method.psuType === 'personal' && !method.hidden)
        .map(({ name, title, approach }) => ({ name, title, approach }))
      if (methods.length > 0 && authMethods.length === 0) continue
      const maximumConsentValidity =
        row.maximum_consent_validity instanceof ProviderJsonNumber
          ? Number(row.maximum_consent_validity.source)
          : NaN
      if (!Number.isSafeInteger(maximumConsentValidity) || maximumConsentValidity < 1) return fail()
      result.push({
        ...identity,
        logo: httpsUrl(row.logo),
        beta: boolean(row.beta),
        maximumConsentValidity,
        authMethods,
      })
    }
    this.#catalogues.set(code, result)
    return result
  }

  async startAuthorization(
    input: EnableBankingStartAuthorization,
  ): Promise<{ readonly authorizationId: string; readonly url: string }> {
    const request = this.#input(() => ({
      aspsp: aspsp(input.aspsp),
      state: text(input.state, 1024),
      redirectUrl: httpsUrl(input.redirectUrl, true),
      validUntil: instant(input.validUntil),
      authMethod: input.authMethod === undefined ? undefined : text(input.authMethod),
    }))
    const application = this.#ready(request.aspsp.country)
    if (!application.redirectUrls.includes(request.redirectUrl)) return fail('invalid_request')
    if (Buffer.byteLength(request.state) < 16) return fail('invalid_request')
    const matches = (this.#catalogues.get(request.aspsp.country) ?? []).filter(
      (bank) => bank.name === request.aspsp.name && bank.country === request.aspsp.country,
    )
    if (matches.length !== 1) return fail('unsupported_bank')
    const bank = matches[0]
    if (!bank) return fail('unsupported_bank')
    if (
      request.authMethod !== undefined &&
      !bank.authMethods.some((method) => method.name === request.authMethod)
    )
      return fail('unsupported_bank')
    const lifetime = Date.parse(request.validUntil) - this.#now()
    if (lifetime <= 0 || lifetime > bank.maximumConsentValidity * 1000)
      return fail('invalid_request')
    const body = {
      access: { balances: true, transactions: true, valid_until: request.validUntil },
      aspsp: request.aspsp,
      state: request.state,
      redirect_url: request.redirectUrl,
      psu_type: 'personal',
      ...(request.authMethod === undefined ? {} : { auth_method: request.authMethod }),
    }
    const source = object(await this.#request('/auth', 'POST', body))
    const url = httpsUrl(source.url)
    if (!AUTH_ORIGINS.includes(new URL(url).origin)) return fail()
    return { authorizationId: uuid(source.authorization_id), url }
  }

  async exchangeCode(code: string): Promise<EnableBankingPersonalSession> {
    this.#ready()
    const validCode = this.#input(() => text(code, 8192))
    let source: Record<string, unknown>
    let sessionId: string
    try {
      source = object(await this.#request('/sessions', 'POST', { code: validCode }))
      sessionId = uuid(source.session_id)
    } catch (error) {
      // An unobserved/malformed creation response must never be treated as proof of no session.
      if (
        error instanceof EnableBankingPersonalFailure &&
        ['unauthorized', 'forbidden', 'not_found', 'rate_limited'].includes(error.code)
      )
        return fail(error.code)
      return fail('exchange_outcome_unknown')
    }
    try {
      return {
        sessionId,
        accounts: array(source.accounts, 1000).map(account),
        aspsp: aspsp(source.aspsp),
        psuType: enumeration(source.psu_type, ['personal']),
        validUntil: instant(object(source.access).valid_until),
      }
    } catch {
      // Close only the exact newly returned session, once. No creation retry or guessed identifier.
      try {
        await this.deleteSession(sessionId)
      } catch {
        return fail('cleanup_unverified')
      }
      return fail('invalid_contract')
    }
  }

  async getSession(sessionId: string): Promise<EnableBankingSessionData> {
    this.#ready()
    const id = this.#input(() => uuid(sessionId))
    const source = object(await this.#request(`/sessions/${id}`))
    return {
      sessionId: id,
      status: enumeration(source.status, SESSION_STATUSES),
      accounts: array(source.accounts, 1000).map(uuid),
      aspsp: aspsp(source.aspsp),
      psuType: enumeration(source.psu_type, ['personal']),
      validUntil: instant(object(source.access).valid_until),
    }
  }

  async getBalances(accountId: string): Promise<readonly EnableBankingBalance[]> {
    this.#ready()
    const id = this.#input(() => uuid(accountId))
    return array(object(await this.#request(`/accounts/${id}/balances`)).balances, 1000).map(
      balance,
    )
  }

  async getTransactions(
    accountId: string,
    input: {
      readonly dateFrom: string
      readonly dateTo: string
      readonly continuationKey?: string
    },
  ): Promise<{
    readonly transactions: readonly EnableBankingTransaction[]
    readonly continuationKey: string | null
  }> {
    this.#ready()
    const request = this.#input(() => ({
      id: uuid(accountId),
      dateFrom: date(input.dateFrom),
      dateTo: date(input.dateTo),
      continuationKey:
        input.continuationKey === undefined ? undefined : text(input.continuationKey, 8192),
    }))
    if (request.dateFrom > request.dateTo) return fail('invalid_request')
    const query = new URLSearchParams({ date_from: request.dateFrom, date_to: request.dateTo })
    if (request.continuationKey !== undefined)
      query.set('continuation_key', request.continuationKey)
    const source = object(await this.#request(`/accounts/${request.id}/transactions?${query}`))
    return {
      transactions: array(source.transactions).map(transaction),
      continuationKey:
        source.continuation_key === undefined || source.continuation_key === null
          ? null
          : text(source.continuation_key, 8192),
    }
  }

  /** Deletes only the provider session. Bank-side consent closure is not guaranteed. */
  async deleteSession(sessionId: string): Promise<void> {
    this.#ready()
    const id = this.#input(() => uuid(sessionId))
    const source = object(await this.#request(`/sessions/${id}`, 'DELETE'))
    if (source.message !== undefined && source.message !== 'OK') return fail()
  }

  #input<T>(read: () => T): T {
    try {
      return read()
    } catch {
      return fail('invalid_request')
    }
  }
  #now(): number {
    let now: number
    try {
      now = this.#clock()
    } catch {
      return fail('configuration')
    }
    if (!Number.isSafeInteger(now) || now < 0 || now > 8_640_000_000_000_000)
      return fail('configuration')
    return now
  }
  #ready(countryCode?: string): EnableBankingApplication {
    if (this.#closed) return fail('cancelled')
    const application = this.#application
    if (!application) return fail('configuration')
    if (!application.active) return fail('application_inactive')
    if (application.environment !== 'PRODUCTION') return fail('production_required')
    if (
      !application.services.includes('AIS') ||
      (countryCode !== undefined && !application.countries.includes(countryCode))
    )
      return fail('ais_unavailable')
    return application
  }
  #jwt(): string {
    const iat = Math.floor(this.#now() / 1000)
    const header = Buffer.from(
      JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: this.#applicationId }),
    ).toString('base64url')
    const body = Buffer.from(
      JSON.stringify({
        iss: 'enablebanking.com',
        aud: 'api.enablebanking.com',
        iat,
        exp: iat + 3600,
      }),
    ).toString('base64url')
    const content = `${header}.${body}`
    return `${content}.${sign('RSA-SHA256', Buffer.from(content), this.#key).toString('base64url')}`
  }

  async #request(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<unknown> {
    if (this.#closed) return fail('cancelled')
    const controller = new AbortController()
    this.#active.add(controller)
    const timer = setTimeout(
      () => controller.abort(new EnableBankingPersonalFailure('timeout')),
      this.#timeoutMs,
    )
    let abortHandler: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
      abortHandler = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', abortHandler, { once: true })
    })
    void aborted.catch(() => undefined)
    let response: Response | undefined
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const request = this.#fetch(`${API_ORIGIN}${path}`, {
        method,
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.#jwt()}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      void request.then(
        (late) => {
          if (controller.signal.aborted) void late.body?.cancel().catch(() => undefined)
        },
        () => undefined,
      )
      response = await Promise.race([request, aborted])
      if (response.status !== 200)
        return fail(
          response.status === 401
            ? 'unauthorized'
            : response.status === 403
              ? 'forbidden'
              : response.status === 404
                ? 'not_found'
                : response.status === 408
                  ? 'timeout'
                  : response.status === 429
                    ? 'rate_limited'
                    : response.status >= 500
                      ? 'provider_unavailable'
                      : 'invalid_contract',
        )
      if (
        !/^application\/(?:json|[\w.-]+\+json)(?:\s*;|$)/iu.test(
          response.headers.get('content-type') ?? '',
        )
      )
        return fail()
      const length = response.headers.get('content-length')
      if (length !== null && (!/^\d+$/u.test(length) || Number(length) > this.#maxResponseBytes))
        return fail('response_too_large')
      if (!response.body) return fail()
      reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let bytes = 0
      for (;;) {
        const chunk = await Promise.race([reader.read(), aborted])
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > this.#maxResponseBytes) return fail('response_too_large')
        chunks.push(chunk.value)
      }
      const payload = new Uint8Array(bytes)
      let offset = 0
      for (const chunk of chunks) {
        payload.set(chunk, offset)
        offset += chunk.byteLength
      }
      try {
        return parseProviderJson(new TextDecoder('utf-8', { fatal: true }).decode(payload))
      } catch {
        return fail()
      }
    } catch (error) {
      if (controller.signal.aborted) {
        const reason: unknown = controller.signal.reason
        return fail(reason instanceof EnableBankingPersonalFailure ? reason.code : 'cancelled')
      }
      return fail(error instanceof EnableBankingPersonalFailure ? error.code : 'transport')
    } finally {
      clearTimeout(timer)
      if (abortHandler) controller.signal.removeEventListener('abort', abortHandler)
      this.#active.delete(controller)
      if (reader) void reader.cancel().catch(() => undefined)
      else void response?.body?.cancel().catch(() => undefined)
    }
  }
}
