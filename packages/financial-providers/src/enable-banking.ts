import { createHash, createPrivateKey, type KeyObject, randomBytes, sign } from 'node:crypto'
import { isIP } from 'node:net'
import type { Account } from '@lilleri/domain'
import {
  type CurrencyCode,
  isCurrencyCode,
  money,
  parseDecimal,
  toDecimalString,
} from '@lilleri/money'
import {
  type FinancialDataProviderV2,
  type InstitutionCoverage,
  type InstitutionPage,
  type ProviderConnectionGrant,
  type ProviderDiscoveryMetadata,
  type SyncProviderTransaction,
  SyntheticSyncFailure,
  type SyntheticSyncMetadata,
  type SyntheticSyncPage,
  type SyntheticSyncPageRequest,
  type SyntheticSyncProvider,
  type SyntheticSyncSnapshot,
} from './contracts.js'
import type { ProviderAccount, ProviderContext, ProviderPage } from './index.js'

/** Enable Banking aggregation API (AIS only) under Enable Banking's own AISP registration. */
export const ENABLE_BANKING_EVIDENCE = Object.freeze({
  checkedAt: '2026-10-05',
  reference: 'https://enablebanking.com/docs/api/reference/',
  rateLimits: 'https://enablebanking.com/docs/faq/',
})

export type EnableBankingFailureCode =
  | 'reconsent_required'
  | 'rate_limited'
  | 'transient'
  | 'account_unavailable'
  | 'configuration'
  | 'invalid_callback'
  | 'invalid_response'
  | 'not_found'

const ORIGIN = 'https://api.enablebanking.com'
const JWT_TTL_SECONDS = 900
const JWT_RENEW_BEFORE_SECONDS = 60
const RATE_LIMIT_FALLBACK_SECONDS = 21_600
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024
const MAX_ERROR_BYTES = 65_536
const MAX_TRANSACTION_PAGES = 200
const MAX_SNAPSHOTS = 64
const MAX_PRESENCES = 10_000
const ASPSP_CACHE_MS = 3_600_000
const INSTITUTION_PAGE_SIZE = 500
const SYNC_PAGE_SIZE = 200
const SYNC_WINDOW_DAYS = 14
const CURSOR_BYTES = 64
const FALLBACK_CONSENT_SECONDS = 90 * 86_400
const CONSENT_SAFETY_SECONDS = 600
const ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/u
const COUNTRY_PATTERN = /^[A-Z]{2}$/u
const OFFSET_CURSOR = /^o:([1-9]\d{0,8})$/u
const UNSAFE_CHARACTERS = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/gu

/** The documented ErrorResponse `error` enum: the only provider text an error may carry. */
const ERROR_CODES: ReadonlySet<string> = new Set([
  'ACCESS_DENIED',
  'ACCOUNT_DOES_NOT_EXIST',
  'ALREADY_AUTHORIZED',
  'ASPSP_ACCOUNT_NOT_ACCESSIBLE',
  'ASPSP_ERROR',
  'ASPSP_TIMEOUT',
  'ASPSP_RATE_LIMIT_EXCEEDED',
  'AUTHORIZATION_NOT_PROVIDED',
  'CLOSED_SESSION',
  'DATE_TO_WITHOUT_DATE_FROM',
  'DATE_FROM_IN_FUTURE',
  'EXPIRED_AUTHORIZATION_CODE',
  'EXPIRED_SESSION',
  'INVALID_ACCOUNT_ID',
  'INVALID_HOST',
  'UNAUTHORIZED_IP',
  'NO_ACCOUNTS_ADDED',
  'PAYMENT_NOT_FOUND',
  'PSU_HEADER_NOT_PROVIDED',
  'PSU_HEADER_INVALID',
  'REDIRECT_URI_NOT_ALLOWED',
  'REVOKED_SESSION',
  'SESSION_DOES_NOT_EXIST',
  'UNAUTHORIZED_ACCESS',
  'UNTRUSTED_PAYMENT_PARTY',
  'WEBHOOK_URI_NOT_ALLOWED',
  'WRONG_ASPSP_PROVIDED',
  'WRONG_AUTHORIZATION_CODE',
  'WRONG_DATE_INTERVAL',
  'WRONG_CREDENTIALS_PROVIDED',
  'WRONG_REQUEST_PARAMETERS',
  'WRONG_SESSION_STATUS',
  'WRONG_TRANSACTIONS_PERIOD',
  'WRONG_CONTINUATION_KEY',
  'TRANSACTION_DOES_NOT_EXIST',
  'PAYMENT_LIMIT_EXCEEDED',
  'ASPSP_PAYMENT_NOT_ACCESSIBLE',
  'INVALID_PAYMENT',
  'ASPSP_PSU_ACTION_REQUIRED',
  'PAYMENT_NOT_FINALIZED',
  'PAYMENT_SUBMISSION_NOT_SUPPORTED',
  'PAYMENT_NOT_AUTHORIZED',
  'PAYMENT_SUBMISSION_NOT_DEFERRED',
])
const ERROR_CLASSES: readonly (readonly [EnableBankingFailureCode, readonly string[]])[] = [
  [
    'reconsent_required',
    [
      'EXPIRED_SESSION',
      'REVOKED_SESSION',
      'CLOSED_SESSION',
      'ACCESS_DENIED',
      'ASPSP_PSU_ACTION_REQUIRED',
      'WRONG_SESSION_STATUS',
    ],
  ],
  ['rate_limited', ['ASPSP_RATE_LIMIT_EXCEEDED']],
  // A continuation key is session-scoped: a fresh traversal later is the recovery.
  ['transient', ['ASPSP_ERROR', 'ASPSP_TIMEOUT', 'WRONG_CONTINUATION_KEY']],
  [
    'account_unavailable',
    [
      'ACCOUNT_DOES_NOT_EXIST',
      'ASPSP_ACCOUNT_NOT_ACCESSIBLE',
      'INVALID_ACCOUNT_ID',
      'NO_ACCOUNTS_ADDED',
    ],
  ],
  [
    'invalid_callback',
    ['EXPIRED_AUTHORIZATION_CODE', 'WRONG_AUTHORIZATION_CODE', 'ALREADY_AUTHORIZED'],
  ],
  ['not_found', ['SESSION_DOES_NOT_EXIST', 'TRANSACTION_DOES_NOT_EXIST']],
  [
    'configuration',
    [
      'UNAUTHORIZED_ACCESS',
      'AUTHORIZATION_NOT_PROVIDED',
      'INVALID_HOST',
      'UNAUTHORIZED_IP',
      'REDIRECT_URI_NOT_ALLOWED',
      'WEBHOOK_URI_NOT_ALLOWED',
      'WRONG_REQUEST_PARAMETERS',
      'PSU_HEADER_NOT_PROVIDED',
      'PSU_HEADER_INVALID',
      'WRONG_ASPSP_PROVIDED',
      'WRONG_CREDENTIALS_PROVIDED',
      'WRONG_DATE_INTERVAL',
      'WRONG_TRANSACTIONS_PERIOD',
      'DATE_FROM_IN_FUTURE',
      'DATE_TO_WITHOUT_DATE_FROM',
    ],
  ],
]
const CLOSED_SESSION_ERRORS: ReadonlySet<string> = new Set([
  'SESSION_DOES_NOT_EXIST',
  'CLOSED_SESSION',
  'REVOKED_SESSION',
  'EXPIRED_SESSION',
])
const SESSION_STATES = [
  'INVALID',
  'PENDING_AUTHORIZATION',
  'RETURNED_FROM_BANK',
  'AUTHORIZED',
  'EXPIRED',
  'CLOSED',
  'REVOKED',
  'CANCELLED',
] as const
const AUTH_APPROACHES = ['REDIRECT', 'DECOUPLED', 'EMBEDDED'] as const
const SUPPLIED_PSU_HEADERS: ReadonlySet<string> = new Set(['psu-ip-address', 'psu-user-agent'])

/** Categorical only: messages never contain bodies, URLs, tokens, IBANs or names. */
export class EnableBankingFailure extends Error {
  readonly code: EnableBankingFailureCode
  /** Only a documented ErrorResponse enum value, never `message` or `detail`. */
  readonly providerError: string | null
  readonly retryAfterSeconds: number | null
  constructor(
    code: EnableBankingFailureCode,
    providerError: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(code)
    this.name = 'EnableBankingFailure'
    this.code = code
    this.providerError =
      providerError !== null && ERROR_CODES.has(providerError) ? providerError : null
    this.retryAfterSeconds =
      retryAfterSeconds !== null &&
      Number.isSafeInteger(retryAfterSeconds) &&
      retryAfterSeconds >= 1 &&
      retryAfterSeconds <= 86_400
        ? retryAfterSeconds
        : null
  }
}

export interface EnableBankingOptions {
  /** Application id from the control panel; it is the JWT `kid`. */
  readonly applicationId: string
  /** RSA private key PEM (PKCS#1 or PKCS#8), at least 2048 bits. Server secret only. */
  readonly privateKeyPem: string
  readonly fetch?: typeof globalThis.fetch
  readonly now?: () => Date
  readonly timeoutMs?: number
}
/** Sent only for a user who is actually present; never for background fetches. */
export interface EnableBankingPsuHeaders {
  readonly ipAddress: string
  readonly userAgent: string
}
export interface EnableBankingApplication {
  readonly environment: 'sandbox' | 'production'
  readonly active: boolean
  readonly redirectUrls: readonly string[]
}
export type EnableBankingAuthApproach = (typeof AUTH_APPROACHES)[number]
/** Validated subsets of documented wire resources. Unused (e.g. sandbox credentials) fields are dropped. */
export interface EnableBankingAuthMethod {
  readonly name: string | null
  readonly psu_type: string | null
  readonly approach: EnableBankingAuthApproach | null
  readonly hidden_method: boolean
}
export interface EnableBankingAspsp {
  /** ASPSP identity is the exact (name, country) pair; there is no separate id. */
  readonly name: string
  readonly country: string
  readonly logo: string | null
  readonly psu_types: readonly string[]
  readonly auth_methods: readonly EnableBankingAuthMethod[]
  /** Seconds. */
  readonly maximum_consent_validity: number | null
  readonly beta: boolean
  readonly bic: string | null
  readonly required_psu_headers: readonly string[]
}
export interface EnableBankingAccount {
  /** Data-path handle, valid only while the session is AUTHORIZED. */
  readonly uid?: string | null
  /** Stable account identity across sessions and re-consent. */
  readonly identification_hash: string
  readonly account_id?: { readonly iban?: string | null } | null
  readonly details?: string | null
  readonly product?: string | null
  readonly usage?: string | null
  readonly cash_account_type: string
  readonly currency: string
}
export interface EnableBankingAmount {
  readonly currency: string
  readonly amount: string
}
export interface EnableBankingBalance {
  readonly name?: string | null
  readonly balance_amount: EnableBankingAmount
  readonly balance_type: string
  readonly reference_date?: string | null
  readonly last_change_date_time?: string | null
}
export interface EnableBankingParty {
  readonly name?: string | null
}
/** `transaction_id` is deliberately absent: it is not stable across retrievals. */
export interface EnableBankingTransaction {
  readonly entry_reference?: string | null
  readonly transaction_amount: EnableBankingAmount
  readonly credit_debit_indicator: string
  readonly status: string
  readonly booking_date?: string | null
  readonly value_date?: string | null
  readonly transaction_date?: string | null
  readonly creditor?: EnableBankingParty | null
  readonly debtor?: EnableBankingParty | null
  readonly bank_transaction_code?: { readonly description?: string | null } | null
  readonly remittance_information?: readonly string[] | null
  readonly reference_number?: string | null
}
export interface EnableBankingInstitutionRef {
  readonly name: string
  readonly country: string
}
export interface EnableBankingSession {
  readonly sessionId: string
  readonly aspsp: EnableBankingInstitutionRef
  readonly psuType: string | null
  readonly validUntil: string
  readonly accounts: readonly EnableBankingAccount[]
}
export type EnableBankingSessionState = (typeof SESSION_STATES)[number]
export interface EnableBankingSessionStatus {
  readonly status: EnableBankingSessionState
  readonly aspsp: EnableBankingInstitutionRef | null
  readonly validUntil: string | null
  readonly accounts: readonly { readonly uid: string; readonly identificationHash: string | null }[]
}
export interface EnableBankingAuthorizationRequest {
  readonly aspsp: EnableBankingInstitutionRef
  readonly state: string
  readonly redirectUrl: string
  readonly validUntil: string
  readonly language?: 'it' | 'en'
  readonly psuType?: 'personal'
}
export interface EnableBankingTransactionQuery {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly continuationKey?: string
  readonly strategy?: 'default' | 'longest'
}
export interface EnableBankingTransactionPage {
  readonly transactions: readonly EnableBankingTransaction[]
  readonly continuationKey: string | null
}

function invalid(): never {
  throw new EnableBankingFailure('invalid_response')
}
function misconfigured(): never {
  throw new EnableBankingFailure('configuration')
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalid()
  return value as Record<string, unknown>
}
function optional<T>(value: unknown, parse: (value: unknown) => T): T | null {
  return value === undefined || value === null ? null : parse(value)
}
function string(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}
function nonEmpty(value: unknown): string {
  const result = string(value)
  return result.trim() ? result : invalid()
}
function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid()
}
function list(value: unknown, max: number): readonly unknown[] {
  return Array.isArray(value) && value.length <= max ? value : invalid()
}
function strings(value: unknown, max: number): readonly string[] {
  return list(value, max).map(string)
}
function providerId(value: unknown): string {
  const result = string(value)
  return ID_PATTERN.test(result) ? result : invalid()
}
function pathId(value: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) return misconfigured()
  return encodeURIComponent(value)
}
function opaqueToken(value: unknown, max: number): boolean {
  return typeof value === 'string' && value.length <= max && /^[\x21-\x7e]+$/u.test(value)
}
function rfc3339(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/u.exec(
      value,
    )
  if (
    !match ||
    calendarDate(match[1]) === null ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    Number(match[4]) > 59 ||
    (match[5] !== undefined && (Number(match[5]) > 23 || Number(match[6]) > 59))
  )
    return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}
function instant(value: unknown): string {
  return rfc3339(value) ?? invalid()
}
function calendarDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null
}
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}
function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}
function cleanText(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(UNSAFE_CHARACTERS, ' ').replace(/\s+/gu, ' ').trim()
    : ''
}
/** Bounds UTF-16 length (the API's string limits) without splitting a surrogate pair. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  let result = ''
  for (const character of value) {
    if (result.length + character.length > max) break
    result += character
  }
  return result.trimEnd()
}
function integerOption(value: number | undefined, fallback: number, min: number, max: number) {
  const result = value ?? fallback
  return Number.isSafeInteger(result) && result >= min && result <= max ? result : misconfigured()
}
function psuHeaders(value: EnableBankingPsuHeaders): EnableBankingPsuHeaders {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof value.ipAddress !== 'string' ||
    isIP(value.ipAddress) === 0 ||
    typeof value.userAgent !== 'string' ||
    !/^[\x20-\x7e]{1,1024}$/u.test(value.userAgent) ||
    !value.userAgent.trim()
  )
    return misconfigured()
  return { ipAddress: value.ipAddress, userAgent: value.userAgent }
}
function validInstitution(value: { readonly name: unknown; readonly country: unknown }): boolean {
  return (
    typeof value.country === 'string' &&
    COUNTRY_PATTERN.test(value.country) &&
    typeof value.name === 'string' &&
    value.name.length <= 200 &&
    value.name.trim() !== '' &&
    !/\p{Cc}/u.test(value.name) &&
    // Discovery ids and names are limited to 200 UTF-8 bytes downstream.
    Buffer.byteLength(`${value.country}:${value.name}`, 'utf8') <= 200
  )
}

function parseAuthMethod(value: unknown): EnableBankingAuthMethod {
  const item = object(value)
  const approach = optional(item.approach, string)
  return {
    name: optional(item.name, string),
    psu_type: optional(item.psu_type, string),
    approach: AUTH_APPROACHES.find((candidate) => candidate === approach) ?? null,
    hidden_method: optional(item.hidden_method, boolean) ?? false,
  }
}
function parseAspsp(value: unknown): EnableBankingAspsp {
  const item = object(value)
  return {
    name: nonEmpty(item.name),
    country: nonEmpty(item.country),
    logo: optional(item.logo, string),
    psu_types: optional(item.psu_types, (value) => strings(value, 10)) ?? [],
    auth_methods:
      optional(item.auth_methods, (value) => list(value, 100).map(parseAuthMethod)) ?? [],
    maximum_consent_validity: optional(item.maximum_consent_validity, (value) =>
      typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : invalid(),
    ),
    beta: optional(item.beta, boolean) ?? false,
    bic: optional(item.bic, string),
    required_psu_headers: optional(item.required_psu_headers, (value) => strings(value, 20)) ?? [],
  }
}
function parseAccount(value: unknown): EnableBankingAccount {
  const item = object(value)
  const accountId = optional(item.account_id, object)
  return {
    uid: optional(item.uid, providerId),
    identification_hash: nonEmpty(item.identification_hash),
    account_id: accountId === null ? null : { iban: optional(accountId.iban, string) },
    details: optional(item.details, string),
    product: optional(item.product, string),
    usage: optional(item.usage, string),
    cash_account_type: nonEmpty(item.cash_account_type),
    currency: nonEmpty(item.currency),
  }
}
function parseAmount(value: unknown): EnableBankingAmount {
  const item = object(value)
  return { currency: nonEmpty(item.currency), amount: nonEmpty(item.amount) }
}
function parseBalance(value: unknown): EnableBankingBalance {
  const item = object(value)
  return {
    name: optional(item.name, string),
    balance_amount: parseAmount(item.balance_amount),
    balance_type: nonEmpty(item.balance_type),
    reference_date: optional(item.reference_date, string),
    last_change_date_time: optional(item.last_change_date_time, string),
  }
}
function parseParty(value: unknown): EnableBankingParty | null {
  return optional(value, (value) => ({ name: optional(object(value).name, string) }))
}
function parseTransaction(value: unknown): EnableBankingTransaction {
  const item = object(value)
  return {
    entry_reference: optional(item.entry_reference, string),
    transaction_amount: parseAmount(item.transaction_amount),
    credit_debit_indicator: nonEmpty(item.credit_debit_indicator),
    status: nonEmpty(item.status),
    booking_date: optional(item.booking_date, string),
    value_date: optional(item.value_date, string),
    transaction_date: optional(item.transaction_date, string),
    creditor: parseParty(item.creditor),
    debtor: parseParty(item.debtor),
    bank_transaction_code: optional(item.bank_transaction_code, (value) => ({
      description: optional(object(value).description, string),
    })),
    remittance_information: optional(item.remittance_information, (value) => strings(value, 1000)),
    reference_number: optional(item.reference_number, string),
  }
}
function parseInstitutionRef(value: unknown): EnableBankingInstitutionRef {
  const item = object(value)
  return { name: nonEmpty(item.name), country: nonEmpty(item.country) }
}
function classify(status: number, providerError: string | null): EnableBankingFailureCode {
  if (status === 429) return 'rate_limited'
  for (const [code, errors] of ERROR_CLASSES)
    if (providerError !== null && errors.includes(providerError)) return code
  if (status === 408 || (status >= 500 && status <= 599)) return 'transient'
  if (status === 400 || status === 401 || status === 403 || status === 422) return 'configuration'
  if (status === 404) return 'not_found'
  return 'invalid_response'
}
function discard(response: Response): void {
  if (response.body && !response.body.locked) void response.body.cancel().catch(() => undefined)
}
async function readBody(response: Response, max: number): Promise<string> {
  const length = response.headers.get('content-length')
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > max)) {
    discard(response)
    return invalid()
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const chunk = await reader.read().catch(() => {
        throw new EnableBankingFailure('transient')
      })
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > max) return invalid()
      chunks.push(chunk.value)
    }
  } finally {
    void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
  } catch {
    return invalid()
  }
}

/** Low-level Enable Banking HTTP client: one attempt per call, no retries, no redirects. */
export class EnableBankingClient {
  readonly #applicationId: string
  readonly #key: KeyObject
  readonly #fetch: typeof globalThis.fetch
  readonly #now: () => Date
  readonly #timeoutMs: number
  #jwt: { readonly value: string; readonly iat: number; readonly exp: number } | null = null

  constructor(options: EnableBankingOptions) {
    if (typeof options.applicationId !== 'string' || !ID_PATTERN.test(options.applicationId))
      misconfigured()
    let key: KeyObject
    try {
      key = createPrivateKey({ key: options.privateKeyPem, format: 'pem' })
    } catch {
      throw new EnableBankingFailure('configuration')
    }
    if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048)
      misconfigured()
    this.#applicationId = options.applicationId
    this.#key = key
    this.#timeoutMs = integerOption(options.timeoutMs, 20_000, 1, 60_000)
    this.#fetch = options.fetch ?? globalThis.fetch
    this.#now = options.now ?? (() => new Date())
  }

  async application(): Promise<EnableBankingApplication> {
    const body = object(await this.#request('GET', '/application'))
    const environment =
      typeof body.environment === 'string' ? body.environment.toLowerCase() : invalid()
    if (environment !== 'sandbox' && environment !== 'production') return invalid()
    return {
      environment,
      active: boolean(body.active),
      redirectUrls: optional(body.redirect_urls, (value) => strings(value, 100)) ?? [],
    }
  }

  /** Entries whose (name, country) cannot form a stable institution id are omitted. */
  async aspsps(
    country: string,
    psuType: 'personal' = 'personal',
  ): Promise<readonly EnableBankingAspsp[]> {
    if (typeof country !== 'string' || !COUNTRY_PATTERN.test(country) || psuType !== 'personal')
      misconfigured()
    const body = object(
      await this.#request('GET', '/aspsps', {
        query: { country, psu_type: psuType, service: 'AIS' },
      }),
    )
    const seen = new Set<string>()
    const result: EnableBankingAspsp[] = []
    for (const value of list(body.aspsps, 10_000)) {
      const aspsp = parseAspsp(value)
      if (aspsp.country !== country || !validInstitution(aspsp)) continue
      const id = enableBankingInstitutionId(aspsp)
      if (seen.has(id)) continue
      seen.add(id)
      result.push(aspsp)
    }
    return result
  }

  async startAuthorization(
    input: EnableBankingAuthorizationRequest,
  ): Promise<{ readonly url: string; readonly authorizationId: string }> {
    if (!validInstitution(input.aspsp)) misconfigured()
    if (!opaqueToken(input.state, 512)) misconfigured()
    if (input.language !== undefined && input.language !== 'it' && input.language !== 'en')
      misconfigured()
    if (input.psuType !== undefined && input.psuType !== 'personal') misconfigured()
    const validUntil = rfc3339(input.validUntil)
    if (validUntil === null || Date.parse(validUntil) <= this.#now().getTime()) misconfigured()
    let redirect: URL
    try {
      redirect = new URL(input.redirectUrl)
    } catch {
      return misconfigured()
    }
    if (redirect.protocol !== 'https:' || redirect.username || redirect.password || redirect.hash)
      misconfigured()
    const body = object(
      await this.#request('POST', '/auth', {
        body: {
          access: {
            valid_until: validUntil.replace(/Z$/u, '+00:00'),
            balances: true,
            transactions: true,
          },
          aspsp: { name: input.aspsp.name, country: input.aspsp.country },
          state: input.state,
          redirect_url: input.redirectUrl,
          psu_type: 'personal',
          ...(input.language === undefined ? {} : { language: input.language }),
        },
      }),
    )
    let url: URL
    try {
      url = new URL(string(body.url))
    } catch {
      return invalid()
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !(url.hostname === 'auth.enablebanking.com' || url.hostname.endsWith('.enablebanking.com'))
    )
      return invalid()
    return { url: url.href, authorizationId: providerId(body.authorization_id) }
  }

  async createSession(code: string): Promise<EnableBankingSession> {
    if (!opaqueToken(code, 2048)) throw new EnableBankingFailure('invalid_callback')
    const body = object(await this.#request('POST', '/sessions', { body: { code } }))
    return {
      sessionId: providerId(body.session_id),
      aspsp: parseInstitutionRef(body.aspsp),
      psuType: optional(body.psu_type, string),
      validUntil: instant(object(body.access).valid_until),
      accounts: list(body.accounts, 1000).map(parseAccount),
    }
  }

  async session(sessionId: string): Promise<EnableBankingSessionStatus> {
    const body = object(await this.#request('GET', `/sessions/${pathId(sessionId)}`))
    const status = SESSION_STATES.find((state) => state === body.status) ?? invalid()
    const data = optional(body.accounts_data, (value) =>
      list(value, 1000).flatMap((value) => {
        const item = object(value)
        const uid = optional(item.uid, providerId)
        return uid === null
          ? []
          : [{ uid, identificationHash: optional(item.identification_hash, string) }]
      }),
    )
    const access = optional(body.access, object)
    return {
      status,
      aspsp: optional(body.aspsp, parseInstitutionRef),
      validUntil: access === null ? null : optional(access.valid_until, instant),
      accounts:
        data ??
        optional(body.accounts, (value) =>
          list(value, 1000).map((uid) => ({ uid: providerId(uid), identificationHash: null })),
        ) ??
        [],
    }
  }

  /** Idempotent: an already missing, closed, revoked or expired session counts as deleted. */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.#request('DELETE', `/sessions/${pathId(sessionId)}`)
    } catch (error) {
      if (
        error instanceof EnableBankingFailure &&
        error.providerError !== null &&
        CLOSED_SESSION_ERRORS.has(error.providerError)
      )
        return
      throw error
    }
  }

  async accountDetails(uid: string, psu?: EnableBankingPsuHeaders): Promise<EnableBankingAccount> {
    return parseAccount(await this.#request('GET', `/accounts/${pathId(uid)}/details`, { psu }))
  }

  async balances(
    uid: string,
    psu?: EnableBankingPsuHeaders,
  ): Promise<readonly EnableBankingBalance[]> {
    const body = object(await this.#request('GET', `/accounts/${pathId(uid)}/balances`, { psu }))
    return list(body.balances, 100).map(parseBalance)
  }

  async transactions(
    uid: string,
    query: EnableBankingTransactionQuery,
    psu?: EnableBankingPsuHeaders,
  ): Promise<EnableBankingTransactionPage> {
    const params: Record<string, string> = {}
    if (query.dateFrom !== undefined)
      params.date_from = calendarDate(query.dateFrom) ?? misconfigured()
    if (query.dateTo !== undefined) params.date_to = calendarDate(query.dateTo) ?? misconfigured()
    if (query.continuationKey !== undefined) {
      if (!opaqueToken(query.continuationKey, 4096)) misconfigured()
      params.continuation_key = query.continuationKey
    }
    if (query.strategy !== undefined) {
      if (query.strategy !== 'default' && query.strategy !== 'longest') misconfigured()
      params.strategy = query.strategy
    }
    const body = object(
      await this.#request('GET', `/accounts/${pathId(uid)}/transactions`, { query: params, psu }),
    )
    const key = optional(body.continuation_key, string)
    if (key !== null && key !== '' && !opaqueToken(key, 4096)) invalid()
    return {
      transactions: list(body.transactions, 100_000).map(parseTransaction),
      continuationKey: key === null || key === '' ? null : key,
    }
  }

  #token(): string {
    const now = Math.floor(this.#now().getTime() / 1000)
    if (!Number.isSafeInteger(now)) return misconfigured()
    const cached = this.#jwt
    if (cached && now >= cached.iat && now < cached.exp - JWT_RENEW_BEFORE_SECONDS)
      return cached.value
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
    const exp = now + JWT_TTL_SECONDS
    const input = `${encode({ typ: 'JWT', alg: 'RS256', kid: this.#applicationId })}.${encode({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp,
    })}`
    const signature = sign('sha256', Buffer.from(input, 'utf8'), this.#key).toString('base64url')
    this.#jwt = { value: `${input}.${signature}`, iat: now, exp }
    return this.#jwt.value
  }

  async #request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options: {
      readonly query?: Readonly<Record<string, string>>
      readonly body?: unknown
      readonly psu?: EnableBankingPsuHeaders | undefined
    } = {},
  ): Promise<unknown> {
    const url = new URL(path, ORIGIN)
    if (url.origin !== ORIGIN || url.pathname !== path || url.search) misconfigured()
    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value)
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.#token()}`,
    }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.psu !== undefined) {
      const psu = psuHeaders(options.psu)
      headers['Psu-Ip-Address'] = psu.ipAddress
      headers['Psu-User-Agent'] = psu.userAgent
    }
    const fetch = this.#fetch
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(this.#timeoutMs),
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      })
    } catch {
      // Network failures, refused redirects and timeouts carry no provider content.
      throw new EnableBankingFailure('transient')
    }
    if (!response.ok) throw await this.#failure(response)
    if (method === 'DELETE') {
      discard(response)
      return null
    }
    const type = response.headers.get('content-type')
    if (type !== null && !/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/iu.test(type)) {
      discard(response)
      return invalid()
    }
    const text = await readBody(response, MAX_RESPONSE_BYTES)
    try {
      return JSON.parse(text)
    } catch {
      return invalid()
    }
  }

  async #failure(response: Response): Promise<EnableBankingFailure> {
    let providerError: string | null = null
    try {
      const body = object(JSON.parse(await readBody(response, MAX_ERROR_BYTES)))
      const candidate = body.error ?? body.error_code
      providerError = typeof candidate === 'string' && ERROR_CODES.has(candidate) ? candidate : null
    } catch {
      providerError = null
    }
    const code = classify(response.status, providerError)
    return new EnableBankingFailure(
      code,
      providerError,
      code === 'rate_limited' ? this.#retryAfter(response.headers.get('retry-after')) : null,
    )
  }

  #retryAfter(value: string | null): number {
    if (value !== null) {
      const trimmed = value.trim()
      const seconds = /^\d{1,6}$/u.test(trimmed)
        ? Number(trimmed)
        : Math.ceil((Date.parse(trimmed) - this.#now().getTime()) / 1000)
      if (Number.isSafeInteger(seconds) && seconds >= 1 && seconds <= 86_400) return seconds
    }
    return RATE_LIMIT_FALLBACK_SECONDS
  }
}

/** Stable catalogue identity: `${country}:${name}` of the exact ASPSP pair. */
export function enableBankingInstitutionId(aspsp: EnableBankingInstitutionRef): string {
  if (!validInstitution(aspsp)) return misconfigured()
  return `${aspsp.country}:${aspsp.name}`
}
export function parseEnableBankingInstitutionId(id: string): EnableBankingInstitutionRef {
  const match = typeof id === 'string' ? /^([A-Z]{2}):([\s\S]+)$/u.exec(id) : null
  const result = { name: match?.[2] ?? '', country: match?.[1] ?? '' }
  if (!validInstitution(result)) return misconfigured()
  return result
}

const ACCOUNT_KINDS: Readonly<Record<string, Account['kind']>> = Object.freeze({
  CACC: 'current',
  // ISO 20022 CASH is a cash (payment) account, not physical cash.
  CASH: 'current',
  CARD: 'card',
  SVGS: 'savings',
})
interface AccountIdentity {
  readonly id: string
  readonly name: string
  readonly kind: Account['kind']
  readonly currency: CurrencyCode
}
function accountIdentity(account: EnableBankingAccount): AccountIdentity | null {
  if (account.usage === 'ORGA') return null
  const kind = Object.hasOwn(ACCOUNT_KINDS, account.cash_account_type)
    ? ACCOUNT_KINDS[account.cash_account_type]
    : undefined
  const hash = account.identification_hash
  if (!kind || !isCurrencyCode(account.currency) || typeof hash !== 'string' || !hash.trim())
    return null
  const base = cleanText(account.details) || cleanText(account.product) || 'Conto'
  const iban = account.account_id?.iban
  const digits = typeof iban === 'string' ? iban.replace(/[^A-Za-z0-9]/gu, '') : ''
  const suffix = digits.length >= 4 ? ` \u2022\u2022${digits.slice(-4).toUpperCase()}` : ''
  return {
    id: hash.length > 200 || /\p{Cc}/u.test(hash) ? `ebh_${sha256(hash)}` : hash,
    name: `${truncate(base, 200 - suffix.length)}${suffix}`,
    kind,
    currency: account.currency,
  }
}
function decimal(value: string, currency: CurrencyCode, sign?: bigint): string | null {
  if (!/^-?\d+(?:\.\d+)?$/u.test(value) || value.length > 40) return null
  try {
    const parsed = parseDecimal(value, currency).amountMinor
    const signed = sign === undefined ? parsed : (parsed < 0n ? -parsed : parsed) * sign
    return toDecimalString(money(signed, currency))
  } catch {
    return null
  }
}
function balanceAmount(value: unknown, currency: CurrencyCode): string | null {
  if (typeof value !== 'string') return null
  const compact = value.replace(/\s+/gu, '')
  return decimal(compact.startsWith('+') ? compact.slice(1) : compact, currency)
}

/** Returns null for organisation, loan or unclassified accounts and unsupported currencies. */
export function mapEnableBankingAccount(
  account: EnableBankingAccount,
  institutionName: string,
  balance: string,
): ProviderAccount | null {
  const identity = accountIdentity(account)
  if (!identity) return null
  const amount = balanceAmount(balance, identity.currency)
  if (amount === null) return null
  return {
    id: identity.id,
    name: identity.name,
    institutionName: truncate(cleanText(institutionName), 200) || 'Banca',
    kind: identity.kind,
    currency: identity.currency,
    balance: amount,
  }
}

export interface EnableBankingSelectedBalance {
  /** Signed plain decimal in the currency's minor-unit precision, e.g. "-84.30". */
  readonly amount: string
  readonly currency: CurrencyCode
  readonly type: 'booked' | 'available' | 'unknown'
  readonly referenceDate: string | null
}
const BALANCE_PREFERENCE = [
  'CLBD',
  'ITBD',
  'XPCD',
  'OPBD',
  'PRCD',
  'ITAV',
  'CLAV',
  'OPAV',
  'FWAV',
] as const
const BOOKED_BALANCES: ReadonlySet<string> = new Set(['CLBD', 'ITBD', 'OPBD', 'PRCD', 'XPCD'])
const AVAILABLE_BALANCES: ReadonlySet<string> = new Set(['CLAV', 'ITAV', 'OPAV', 'FWAV'])

/** With `currency`, only balances in that currency are eligible. */
export function selectEnableBankingBalance(
  balances: readonly EnableBankingBalance[],
  currency?: string,
): EnableBankingSelectedBalance | null {
  const candidates = balances.flatMap((balance) => {
    const code = balance.balance_amount?.currency
    if (typeof code !== 'string' || !isCurrencyCode(code)) return []
    if (currency !== undefined && code !== currency) return []
    const amount = balanceAmount(balance.balance_amount.amount, code)
    return amount === null ? [] : [{ balance, amount, currency: code }]
  })
  const chosen =
    BALANCE_PREFERENCE.map((type) =>
      candidates.find((candidate) => candidate.balance.balance_type === type),
    ).find((candidate) => candidate !== undefined) ?? candidates[0]
  if (!chosen) return null
  const type = chosen.balance.balance_type
  const changed = rfc3339(chosen.balance.last_change_date_time)
  return {
    amount: chosen.amount,
    currency: chosen.currency,
    type: BOOKED_BALANCES.has(type)
      ? 'booked'
      : AVAILABLE_BALANCES.has(type)
        ? 'available'
        : 'unknown',
    referenceDate:
      calendarDate(chosen.balance.reference_date) ??
      (changed === null
        ? null
        : calendarDate(String(chosen.balance.last_change_date_time).slice(0, 10))),
  }
}

export type EnableBankingSkipReason =
  | 'cancelled'
  | 'rejected'
  | 'scheduled'
  | 'unsupported_status'
  | 'currency_mismatch'
  | 'invalid_direction'
  | 'invalid_amount'
  | 'missing_date'
const SKIP_REASONS: readonly EnableBankingSkipReason[] = [
  'cancelled',
  'rejected',
  'scheduled',
  'unsupported_status',
  'currency_mismatch',
  'invalid_direction',
  'invalid_amount',
  'missing_date',
]

function transactionId(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return null
  return trimmed.length > 200 || /\p{Cc}/u.test(trimmed) || trimmed.startsWith('no-id:v1:')
    ? `eref_${sha256(trimmed)}`
    : trimmed
}
function mapTransaction(
  transaction: EnableBankingTransaction,
  accountId: string,
  accountCurrency: CurrencyCode,
): SyncProviderTransaction | EnableBankingSkipReason {
  const status =
    transaction.status === 'BOOK'
      ? 'booked'
      : transaction.status === 'PDNG' || transaction.status === 'HOLD'
        ? 'pending'
        : null
  if (status === null)
    return transaction.status === 'CNCL'
      ? 'cancelled'
      : transaction.status === 'RJCT'
        ? 'rejected'
        : transaction.status === 'SCHD'
          ? 'scheduled'
          : 'unsupported_status'
  if (transaction.transaction_amount?.currency !== accountCurrency) return 'currency_mismatch'
  const direction =
    transaction.credit_debit_indicator === 'DBIT'
      ? -1n
      : transaction.credit_debit_indicator === 'CRDT'
        ? 1n
        : null
  if (direction === null) return 'invalid_direction'
  const raw = transaction.transaction_amount.amount
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  const amount = decimal(
    trimmed.startsWith('+') ? trimmed.slice(1) : trimmed,
    accountCurrency,
    direction,
  )
  if (amount === null) return 'invalid_amount'
  const bookedOn =
    status === 'booked'
      ? ([transaction.booking_date, transaction.value_date, transaction.transaction_date]
          .map(calendarDate)
          .find((date) => date !== null) ?? null)
      : null
  if (status === 'booked' && bookedOn === null) return 'missing_date'
  const authorizedOn = calendarDate(transaction.transaction_date)
  const counterparty = cleanText(
    direction < 0n ? transaction.creditor?.name : transaction.debtor?.name,
  )
  const description =
    [
      cleanText((transaction.remittance_information ?? []).join(' ')),
      counterparty,
      cleanText(transaction.bank_transaction_code?.description),
    ].find(Boolean) ?? 'Movimento'
  const merchantName = truncate(counterparty, 500)
  const reference = truncate(cleanText(transaction.reference_number), 500)
  return {
    id: transactionId(transaction.entry_reference),
    accountId,
    amount,
    currency: accountCurrency,
    description: truncate(description, 2000),
    status,
    ...(merchantName ? { merchantName } : {}),
    ...(bookedOn === null ? {} : { bookedOn }),
    ...(authorizedOn === null ? {} : { authorizedOn }),
    ...(reference ? { reference } : {}),
  }
}

/** Returns null for skipped records (cancelled/rejected/scheduled/other, foreign currency, malformed). */
export function mapEnableBankingTransaction(
  transaction: EnableBankingTransaction,
  accountId: string,
  accountCurrency: CurrencyCode,
): SyncProviderTransaction | null {
  const result = mapTransaction(transaction, accountId, accountCurrency)
  return typeof result === 'string' ? null : result
}

export interface EnableBankingProviderOptions extends EnableBankingOptions {
  readonly environment: 'sandbox' | 'live'
  /** ISO 3166 alpha-2 catalogue countries. Default ['IT']. */
  readonly countries?: readonly string[]
  /** Beta connectors stay hidden unless explicitly admitted. */
  readonly includeBeta?: boolean
  readonly initialHistoryDays?: number
  readonly maxTransactionsPerAccount?: number
  readonly snapshotTtlMs?: number
  readonly consentDays?: number
}
export interface EnableBankingInstitution {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly beta: boolean
  readonly maximumConsentDays: number | null
  readonly approach: EnableBankingAuthApproach | null
}
export interface EnableBankingAuthorizationStart {
  readonly url: string
  readonly authorizationId: string
  readonly validUntil: string
}
export interface EnableBankingAuthorizedAccount {
  readonly id: string
  readonly name: string
  readonly kind: Account['kind']
  readonly currency: CurrencyCode
}
export interface EnableBankingCompletedAuthorization {
  /** Store as the consent/grant id: it is the handle for every later data call. */
  readonly sessionId: string
  readonly institutionId: string
  readonly validUntil: string
  readonly accounts: readonly EnableBankingAuthorizedAccount[]
}
export interface EnableBankingSnapshotDiagnostics {
  readonly accounts: number
  readonly records: number
  /** Counts only; skipped record content is never retained. */
  readonly skipped: Readonly<Record<EnableBankingSkipReason, number>>
}

interface CollectedAccount {
  readonly account: ProviderAccount
  readonly balance: EnableBankingSelectedBalance
  readonly historyFrom: string | null
  readonly records: readonly SyncProviderTransaction[]
}
interface CachedSnapshot {
  readonly owner: string
  readonly grantId: string
  readonly expiresAt: number
  readonly records: ReadonlyMap<string, readonly SyncProviderTransaction[]>
  /** Calendar range each account's single traversal covered (continuation keys exhausted). */
  readonly ranges: ReadonlyMap<string, { readonly from: string | null; readonly to: string }>
  readonly diagnostics: EnableBankingSnapshotDiagnostics
}

function grantOf(context: ProviderContext): string {
  const grant = context.grantId
  return typeof grant === 'string' && ID_PATTERN.test(grant) ? grant : misconfigured()
}
function ownerOf(context: ProviderContext): string {
  return JSON.stringify([context.profileId, context.connectionId, grantOf(context)])
}
function personalMethods(aspsp: EnableBankingAspsp): readonly EnableBankingAuthMethod[] {
  return aspsp.auth_methods.filter(
    (method) => method.psu_type === null || method.psu_type === 'personal',
  )
}
/** Lilleri never collects bank credentials, so embedded-only ASPSPs are not connectable. */
function connectable(aspsp: EnableBankingAspsp): boolean {
  const methods = personalMethods(aspsp)
  return methods.length === 0 || methods.some((method) => method.approach !== 'EMBEDDED')
}
function compareRecords(left: SyncProviderTransaction, right: SyncProviderTransaction): number {
  const keys = (record: SyncProviderTransaction) => [
    record.bookedOn ?? record.authorizedOn ?? '9999-12-31',
    record.status,
    record.id ?? '',
    record.description,
    record.amount,
  ]
  const a = keys(left)
  const b = keys(right)
  for (let index = 0; index < a.length; index++) {
    const x = a[index] ?? ''
    const y = b[index] ?? ''
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}
function offsetOf(cursor: string | null): number {
  if (cursor === null) return 0
  const match = typeof cursor === 'string' ? OFFSET_CURSOR.exec(cursor) : null
  if (!match) throw new SyntheticSyncFailure('snapshot_expired')
  return Number(match[1])
}
function syncFailure(error: unknown): unknown {
  if (error instanceof EnableBankingFailure && error.code === 'rate_limited')
    return new SyntheticSyncFailure(
      'rate_limited',
      error.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS,
    )
  if (error instanceof EnableBankingFailure && error.code === 'transient')
    return new SyntheticSyncFailure('unavailable')
  return error
}

/**
 * Redirect-only AIS provider. `context.grantId` is the Enable Banking session id.
 * Bank I/O happens only in `openSync` (one pass per account: details, balances and one
 * transaction traversal) because banks may count every call against a 4/day budget.
 * Snapshots live in process memory: a page request on another instance is `snapshot_expired`.
 */
export class EnableBankingProvider implements FinancialDataProviderV2, SyntheticSyncProvider {
  readonly id = 'enable-banking'
  readonly #client: EnableBankingClient
  readonly #environment: 'sandbox' | 'live'
  readonly #now: () => Date
  readonly #countries: readonly string[]
  readonly #includeBeta: boolean
  readonly #historyDays: number
  readonly #maxTransactions: number
  readonly #snapshotTtlMs: number
  readonly #consentDays: number
  readonly #catalogues = new Map<
    string,
    { readonly expiresAt: number; readonly value: Promise<readonly EnableBankingAspsp[]> }
  >()
  readonly #presence = new Map<
    string,
    { readonly psu: EnableBankingPsuHeaders; readonly expiresAt: number }
  >()
  readonly #snapshots = new Map<string, CachedSnapshot>()

  constructor(options: EnableBankingProviderOptions) {
    this.#client = new EnableBankingClient(options)
    if (options.environment !== 'sandbox' && options.environment !== 'live') misconfigured()
    this.#environment = options.environment
    this.#now = options.now ?? (() => new Date())
    const countries = options.countries ?? ['IT']
    if (
      !Array.isArray(countries) ||
      countries.length < 1 ||
      countries.length > 50 ||
      countries.some((country) => typeof country !== 'string' || !COUNTRY_PATTERN.test(country))
    )
      misconfigured()
    this.#countries = Object.freeze([...new Set(countries)])
    if (options.includeBeta !== undefined && typeof options.includeBeta !== 'boolean')
      misconfigured()
    this.#includeBeta = options.includeBeta ?? false
    this.#historyDays = integerOption(options.initialHistoryDays, 90, 1, 730)
    this.#maxTransactions = integerOption(options.maxTransactionsPerAccount, 10_000, 1, 100_000)
    this.#snapshotTtlMs = integerOption(options.snapshotTtlMs, 1_800_000, 60_000, 86_400_000)
    this.#consentDays = integerOption(options.consentDays, 180, 1, 730)
  }

  capabilities() {
    return {
      accountInformation: true,
      payments: false,
      synthetic: false,
      grantSpecificRevocation: true,
    } as const
  }

  discoveryMetadata(): ProviderDiscoveryMetadata {
    return {
      providerId: this.id,
      environment: this.#environment,
      coverageVersion: `enable-banking-${ENABLE_BANKING_EVIDENCE.checkedAt}`,
      // Catalogues are offset-paged from one cached provider list per country.
      pagination: { maxPageSize: INSTITUTION_PAGE_SIZE, maxPages: 4, maxCursorBytes: CURSOR_BYTES },
      refresh: {
        userPresent: 'supported',
        unattendedBudget: {
          requests: 4,
          windowSeconds: 86_400,
          evidenceReference: ENABLE_BANKING_EVIDENCE.rateLimits,
        },
      },
      // Renewal is a new redirect authorization that yields a new session.
      renewal: 'supported',
    }
  }

  /** Account kinds stay unknown until consent: Enable Banking does not declare them per ASPSP. */
  async listInstitutions(cursor: string | null = null): Promise<InstitutionPage> {
    const match = typeof cursor === 'string' ? OFFSET_CURSOR.exec(cursor) : null
    if (cursor !== null && !match) misconfigured()
    const start = Number(match?.[1] ?? 0)
    const catalogues = await Promise.all(this.#countries.map((country) => this.#catalogue(country)))
    const institutions = catalogues
      .flat()
      .filter((aspsp) => (this.#includeBeta || !aspsp.beta) && connectable(aspsp))
      .map(
        (aspsp): InstitutionCoverage => ({
          id: enableBankingInstitutionId(aspsp),
          providerId: this.id,
          name: aspsp.name,
          countryCode: aspsp.country,
          accountTypes: [],
        }),
      )
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    if (cursor !== null && start >= institutions.length) misconfigured()
    const end = start + INSTITUTION_PAGE_SIZE
    return {
      institutions: institutions.slice(start, end),
      nextCursor: end < institutions.length ? `o:${end}` : null,
      coverageVersion: this.discoveryMetadata().coverageVersion,
    }
  }

  /** UI picker view of one country's ASPSPs, including beta flags and the default approach. */
  async institutions(country: string): Promise<readonly EnableBankingInstitution[]> {
    if (typeof country !== 'string' || !COUNTRY_PATTERN.test(country)) misconfigured()
    return (await this.#catalogue(country)).map((aspsp) => {
      const methods = personalMethods(aspsp)
      const preferred = methods.find((method) => !method.hidden_method) ?? methods[0]
      return {
        id: enableBankingInstitutionId(aspsp),
        name: aspsp.name,
        country: aspsp.country,
        beta: aspsp.beta,
        maximumConsentDays:
          aspsp.maximum_consent_validity === null
            ? null
            : Math.floor(aspsp.maximum_consent_validity / 86_400),
        approach: preferred?.approach ?? null,
      }
    })
  }

  async startAuthorization(input: {
    readonly institutionId: string
    readonly state: string
    readonly redirectUrl: string
    readonly language: 'it' | 'en'
  }): Promise<EnableBankingAuthorizationStart> {
    const institution = parseEnableBankingInstitutionId(input.institutionId)
    if (!this.#countries.includes(institution.country)) misconfigured()
    const aspsp = (await this.#catalogue(institution.country)).find(
      (candidate) => candidate.name === institution.name,
    )
    if (!aspsp) throw new EnableBankingFailure('not_found')
    if ((aspsp.beta && !this.#includeBeta) || !connectable(aspsp)) misconfigured()
    // A missing validity uses the conservative 90-day PSD2 floor, never an assumed 180 days.
    const seconds =
      Math.min(
        this.#consentDays * 86_400,
        aspsp.maximum_consent_validity ?? FALLBACK_CONSENT_SECONDS,
      ) - CONSENT_SAFETY_SECONDS
    if (seconds < 3600) misconfigured()
    const validUntil = new Date(this.#now().getTime() + seconds * 1000).toISOString()
    const started = await this.#client.startAuthorization({
      aspsp: { name: aspsp.name, country: aspsp.country },
      state: input.state,
      redirectUrl: input.redirectUrl,
      validUntil,
      language: input.language,
      psuType: 'personal',
    })
    return { url: started.url, authorizationId: started.authorizationId, validUntil }
  }

  /** Exchanges the single-use callback code. Unusable sessions are closed best effort. */
  async completeAuthorization(code: string): Promise<EnableBankingCompletedAuthorization> {
    const session = await this.#client.createSession(code)
    if (!validInstitution(session.aspsp)) {
      await this.#closeQuietly(session.sessionId)
      return invalid()
    }
    const seen = new Set<string>()
    const accounts: EnableBankingAuthorizedAccount[] = []
    for (const account of session.accounts) {
      const identity = account.uid ? accountIdentity(account) : null
      if (!identity || seen.has(identity.id)) continue
      seen.add(identity.id)
      accounts.push(identity)
    }
    if (accounts.length === 0) {
      await this.#closeQuietly(session.sessionId)
      throw new EnableBankingFailure('invalid_callback')
    }
    return {
      sessionId: session.sessionId,
      institutionId: enableBankingInstitutionId(session.aspsp),
      validUntil: session.validUntil,
      accounts,
    }
  }

  /** Marks the PSU as present for user-initiated sync of this session (in-memory, bounded). */
  registerPresence(sessionId: string, psu: EnableBankingPsuHeaders, ttlMs = 10 * 60_000): void {
    if (typeof sessionId !== 'string' || !ID_PATTERN.test(sessionId)) misconfigured()
    const headers = psuHeaders(psu)
    const ttl = integerOption(ttlMs, 10 * 60_000, 1, 3_600_000)
    const now = this.#now().getTime()
    for (const [key, entry] of this.#presence)
      if (entry.expiresAt <= now) this.#presence.delete(key)
    this.#presence.delete(sessionId)
    while (this.#presence.size >= MAX_PRESENCES) {
      const oldest = this.#presence.keys().next().value
      if (oldest === undefined) break
      this.#presence.delete(oldest)
    }
    this.#presence.set(sessionId, { psu: headers, expiresAt: now + ttl })
  }

  async createConnection(): Promise<ProviderConnectionGrant> {
    throw new EnableBankingFailure('configuration')
  }

  async renewConnection(): Promise<ProviderConnectionGrant> {
    throw new EnableBankingFailure('configuration')
  }

  async refreshConnection(context: ProviderContext): Promise<void> {
    await this.#authorizedSession(grantOf(context))
  }

  async listAccounts(context: ProviderContext): Promise<readonly ProviderAccount[]> {
    const collected = await this.#collect(grantOf(context), false, null, this.#emptySkips())
    return collected.map((entry) => entry.account)
  }

  async getBalances(context: ProviderContext): Promise<readonly ProviderAccount[]> {
    return this.listAccounts(context)
  }

  /** Legacy port over the latest cached snapshot; never performs bank I/O. */
  async getTransactions(
    context: ProviderContext,
    accountId: string,
    cursor: string | null = null,
  ): Promise<ProviderPage> {
    const owner = ownerOf(context)
    const now = this.#now().getTime()
    const snapshot = [...this.#snapshots.values()]
      .reverse()
      .find((entry) => entry.owner === owner && entry.expiresAt > now)
    const records = snapshot?.records.get(accountId)
    if (!records) throw new SyntheticSyncFailure('snapshot_expired')
    const offset = offsetOf(cursor)
    if (cursor !== null && offset >= records.length)
      throw new SyntheticSyncFailure('snapshot_expired')
    const occurrences = new Map<string, number>()
    const transactions = records.map((record) => {
      if (record.id !== null) return { ...record, id: record.id }
      const fingerprint = JSON.stringify([
        accountId,
        record.status,
        record.amount,
        record.bookedOn ?? null,
        record.authorizedOn ?? null,
        record.description,
      ])
      const occurrence = (occurrences.get(fingerprint) ?? 0) + 1
      occurrences.set(fingerprint, occurrence)
      return { ...record, id: `ebfp_${sha256(`${fingerprint}#${occurrence}`)}` }
    })
    const end = offset + SYNC_PAGE_SIZE
    return {
      transactions: transactions.slice(offset, end),
      nextCursor: end < transactions.length ? `o:${end}` : null,
    }
  }

  async disconnect(context: ProviderContext): Promise<void> {
    const sessionId = grantOf(context)
    await this.#client.deleteSession(sessionId)
    this.#presence.delete(sessionId)
    for (const [id, snapshot] of this.#snapshots)
      if (snapshot.grantId === sessionId) this.#snapshots.delete(id)
  }

  syncMetadata(): SyntheticSyncMetadata {
    return {
      providerId: this.id,
      environment: this.#environment,
      evidenceReference: ENABLE_BANKING_EVIDENCE.reference,
      userPresent: 'supported',
      unattendedBudget: {
        requests: 4,
        windowSeconds: 86_400,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: ENABLE_BANKING_EVIDENCE.rateLimits,
      },
      maxWindowDays: SYNC_WINDOW_DAYS,
      maxPageSize: SYNC_PAGE_SIZE,
      maxCursorBytes: CURSOR_BYTES,
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
    }
  }

  /** `_requestedAt` is a fixture-only clock hint; live observation time is this adapter's clock. */
  async openSync(
    context: ProviderContext,
    mode: 'user_present' | 'unattended',
    _requestedAt?: string,
  ): Promise<SyntheticSyncSnapshot> {
    const owner = ownerOf(context)
    const sessionId = grantOf(context)
    if (mode !== 'user_present' && mode !== 'unattended') misconfigured()
    const observed = this.#now()
    const observedAt = observed.toISOString()
    const dateFrom = addDays(observedAt.slice(0, 10), 1 - this.#historyDays)
    const skipped = this.#emptySkips()
    let collected: readonly CollectedAccount[]
    try {
      collected = await this.#collect(sessionId, mode === 'user_present', dateFrom, skipped)
    } catch (error) {
      throw syncFailure(error)
    }
    const now = this.#now().getTime()
    for (const [id, snapshot] of this.#snapshots)
      if (snapshot.expiresAt <= now) this.#snapshots.delete(id)
    while (this.#snapshots.size >= MAX_SNAPSHOTS) {
      const oldest = this.#snapshots.keys().next().value
      if (oldest === undefined) break
      this.#snapshots.delete(oldest)
    }
    const snapshotId = `ebs_${randomBytes(18).toString('base64url')}`
    this.#snapshots.set(snapshotId, {
      owner,
      grantId: sessionId,
      expiresAt: now + this.#snapshotTtlMs,
      records: new Map(collected.map((entry) => [entry.account.id, entry.records])),
      // No date_to was sent, so the traversal reaches "now"; tomorrow (UTC) absorbs the
      // profile timezone being ahead of UTC.
      ranges: new Map(
        collected.map((entry) => [
          entry.account.id,
          { from: entry.historyFrom, to: addDays(observedAt.slice(0, 10), 1) },
        ]),
      ),
      diagnostics: {
        accounts: collected.length,
        records: collected.reduce((total, entry) => total + entry.records.length, 0),
        skipped: Object.freeze({ ...skipped }),
      },
    })
    return {
      snapshotId,
      accounts: collected.map((entry) => entry.account),
      historyFrom: Object.fromEntries(
        collected.map((entry) => [entry.account.id, entry.historyFrom]),
      ),
      observedAt,
      balances: collected.map((entry) => ({
        accountId: entry.account.id,
        currency: entry.account.currency,
        amount: entry.account.balance,
        type: entry.balance.type,
        referenceDate: entry.balance.referenceDate,
        opening: null,
      })),
    }
  }

  async getSyncPage(
    context: ProviderContext,
    request: SyntheticSyncPageRequest,
  ): Promise<SyntheticSyncPage> {
    const snapshot = this.#snapshot(context, request.snapshotId)
    const from = calendarDate(request.from)
    const to = calendarDate(request.to)
    if (from === null || to === null || from > to) return misconfigured()
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1
    if (
      days > SYNC_WINDOW_DAYS ||
      !Number.isSafeInteger(request.pageSize) ||
      request.pageSize < 1 ||
      request.pageSize > SYNC_PAGE_SIZE ||
      typeof request.includePending !== 'boolean'
    )
      misconfigured()
    const records = snapshot.records.get(request.accountId)
    if (!records) throw new EnableBankingFailure('not_found')
    const offset = offsetOf(request.cursor)
    const items = records.filter((record) =>
      record.status === 'pending'
        ? request.includePending
        : record.bookedOn !== undefined && record.bookedOn >= from && record.bookedOn <= to,
    )
    if (request.cursor !== null && offset >= items.length)
      throw new SyntheticSyncFailure('snapshot_expired')
    const end = offset + request.pageSize
    const range = snapshot.ranges.get(request.accountId)
    return {
      snapshotId: request.snapshotId,
      from: request.from,
      to: request.to,
      transactions: items.slice(offset, end),
      nextCursor: end < items.length ? `o:${end}` : null,
      // Every page of the bank's answer for this range was read, so a window inside it is
      // complete; deletion and pending-set evidence stay 'unknown' in the metadata.
      coverage:
        range?.from != null && from >= range.from && to <= range.to ? 'complete_window' : 'unknown',
    }
  }

  /** Counts of records the adapter skipped while opening a cached snapshot. */
  snapshotDiagnostics(snapshotId: string): EnableBankingSnapshotDiagnostics | null {
    const snapshot = this.#snapshots.get(snapshotId)
    return snapshot && snapshot.expiresAt > this.#now().getTime() ? snapshot.diagnostics : null
  }

  #snapshot(context: ProviderContext, snapshotId: string): CachedSnapshot {
    const owner = ownerOf(context)
    const snapshot = typeof snapshotId === 'string' ? this.#snapshots.get(snapshotId) : undefined
    if (snapshot && snapshot.expiresAt <= this.#now().getTime()) this.#snapshots.delete(snapshotId)
    else if (snapshot && snapshot.owner === owner) return snapshot
    throw new SyntheticSyncFailure('snapshot_expired')
  }

  #emptySkips(): Record<EnableBankingSkipReason, number> {
    return Object.fromEntries(SKIP_REASONS.map((reason) => [reason, 0])) as Record<
      EnableBankingSkipReason,
      number
    >
  }

  #catalogue(country: string): Promise<readonly EnableBankingAspsp[]> {
    const now = this.#now().getTime()
    const cached = this.#catalogues.get(country)
    if (cached && cached.expiresAt > now) return cached.value
    const value = this.#client.aspsps(country)
    this.#catalogues.set(country, { expiresAt: now + ASPSP_CACHE_MS, value })
    value.catch(() => {
      if (this.#catalogues.get(country)?.value === value) this.#catalogues.delete(country)
    })
    return value
  }

  async #closeQuietly(sessionId: string): Promise<void> {
    try {
      await this.#client.deleteSession(sessionId)
    } catch {
      // Best effort: the caller still receives the categorical callback failure.
    }
  }

  async #authorizedSession(sessionId: string): Promise<EnableBankingSessionStatus> {
    let session: EnableBankingSessionStatus
    try {
      session = await this.#client.session(sessionId)
    } catch (error) {
      if (error instanceof EnableBankingFailure && error.code === 'not_found')
        throw new EnableBankingFailure('reconsent_required', error.providerError)
      throw error
    }
    if (
      session.status !== 'AUTHORIZED' ||
      (session.validUntil !== null && Date.parse(session.validUntil) <= this.#now().getTime())
    )
      throw new EnableBankingFailure('reconsent_required')
    return session
  }

  /** PSU headers go out only for a present user, and all-or-none of an ASPSP's required set. */
  async #presenceHeaders(
    sessionId: string,
    aspsp: EnableBankingInstitutionRef | null,
  ): Promise<EnableBankingPsuHeaders | undefined> {
    const presence = this.#presence.get(sessionId)
    if (!presence) return undefined
    if (presence.expiresAt <= this.#now().getTime()) {
      this.#presence.delete(sessionId)
      return undefined
    }
    const cached = aspsp ? this.#catalogues.get(aspsp.country) : undefined
    if (aspsp && cached && cached.expiresAt > this.#now().getTime()) {
      const catalogue = await cached.value.catch(() => null)
      const required =
        catalogue?.find((candidate) => candidate.name === aspsp.name)?.required_psu_headers ?? []
      if (required.some((header) => !SUPPLIED_PSU_HEADERS.has(header.toLowerCase())))
        return undefined
    }
    return presence.psu
  }

  async #accountCall<T>(call: () => Promise<T>): Promise<T | null> {
    try {
      return await call()
    } catch (error) {
      if (error instanceof EnableBankingFailure && error.code === 'account_unavailable') return null
      throw error
    }
  }

  /** `dateFrom === null` reads accounts and balances only. */
  async #collect(
    sessionId: string,
    present: boolean,
    dateFrom: string | null,
    skipped: Record<EnableBankingSkipReason, number>,
  ): Promise<readonly CollectedAccount[]> {
    const session = await this.#authorizedSession(sessionId)
    const institutionName =
      session.aspsp && validInstitution(session.aspsp) ? session.aspsp.name : 'Banca'
    const psu = present ? await this.#presenceHeaders(sessionId, session.aspsp) : undefined
    const result: CollectedAccount[] = []
    const accountIds = new Set<string>()
    const uids = new Set<string>()
    for (const { uid } of session.accounts) {
      if (uids.has(uid)) continue
      uids.add(uid)
      const details = await this.#accountCall(() => this.#client.accountDetails(uid, psu))
      const identity = details ? accountIdentity(details) : null
      if (!details || !identity || accountIds.has(identity.id)) continue
      const balances = await this.#accountCall(() => this.#client.balances(uid, psu))
      const balance = balances ? selectEnableBankingBalance(balances, identity.currency) : null
      const account = balance
        ? mapEnableBankingAccount(details, institutionName, balance.amount)
        : null
      if (!balance || !account) continue
      let records: SyncProviderTransaction[] = []
      let historyFrom: string | null = dateFrom
      if (dateFrom !== null) {
        const fetched = await this.#accountCall(() => this.#transactions(uid, dateFrom, psu))
        if (!fetched) continue
        for (const transaction of fetched.transactions) {
          const mapped = mapTransaction(transaction, account.id, account.currency)
          if (typeof mapped === 'string') skipped[mapped]++
          else records.push(mapped)
        }
        records = records.sort(compareRecords)
        if (!fetched.exact)
          historyFrom =
            records.find((record) => record.status === 'booked' && record.bookedOn)?.bookedOn ??
            null
      }
      accountIds.add(account.id)
      result.push({ account, balance, historyFrom, records })
    }
    if (result.length === 0) throw new EnableBankingFailure('account_unavailable')
    return result
  }

  /** One traversal with identical parameters; `longest` only after a rejected default period. */
  async #transactions(
    uid: string,
    dateFrom: string,
    psu: EnableBankingPsuHeaders | undefined,
  ): Promise<{
    readonly transactions: readonly EnableBankingTransaction[]
    readonly exact: boolean
  }> {
    const exact = await this.#traverse(uid, dateFrom, 'default', psu)
    if (exact !== null) return { transactions: exact, exact: true }
    return {
      transactions: (await this.#traverse(uid, dateFrom, 'longest', psu)) ?? [],
      exact: false,
    }
  }

  async #traverse(
    uid: string,
    dateFrom: string,
    strategy: 'default' | 'longest',
    psu: EnableBankingPsuHeaders | undefined,
  ): Promise<EnableBankingTransaction[] | null> {
    const transactions: EnableBankingTransaction[] = []
    const seen = new Set<string>()
    let continuationKey: string | null = null
    for (let page = 0; page < MAX_TRANSACTION_PAGES; page++) {
      let response: EnableBankingTransactionPage
      try {
        response = await this.#client.transactions(
          uid,
          { dateFrom, strategy, ...(continuationKey === null ? {} : { continuationKey }) },
          psu,
        )
      } catch (error) {
        if (
          page === 0 &&
          strategy === 'default' &&
          error instanceof EnableBankingFailure &&
          error.providerError === 'WRONG_TRANSACTIONS_PERIOD'
        )
          return null
        throw error
      }
      transactions.push(...response.transactions)
      if (transactions.length > this.#maxTransactions) throw new SyntheticSyncFailure('unavailable')
      if (response.continuationKey === null) return transactions
      if (seen.has(response.continuationKey)) return invalid()
      seen.add(response.continuationKey)
      continuationKey = response.continuationKey
    }
    throw new SyntheticSyncFailure('unavailable')
  }
}
