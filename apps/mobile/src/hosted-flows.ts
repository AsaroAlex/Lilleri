import type {
  BankAuthorizationInput,
  BankAuthorizationLanguage,
  BankInstitutionDto,
  BankInstitutionsDto,
  BillingInterval,
  BillingPriceDto,
  SyncJobDto,
} from '@lilleri/api-client'
import type { Connection, ProfileLocale } from '@lilleri/domain'
import { type Money, parseDecimal } from '@lilleri/money'
import type { Translator } from './i18n'
import type { MessageKey } from './i18n/catalogue'

/** Provider whose renewal is a new bank authorisation, not the local lifecycle endpoint. */
export const ENABLE_BANKING_PROVIDER_ID = 'enable-banking'
/** Authorisation access never lasts longer than this, whatever a bank advertises. */
export const MAXIMUM_BANK_CONSENT_DAYS = 180
export const FIRST_SYNC_POLL_INTERVAL_MS = 3_000
export const FIRST_SYNC_POLL_LIMIT_MS = 120_000
export const PLUS_CONFIRMATION_POLL_INTERVAL_MS = 2_000
export const PLUS_CONFIRMATION_POLL_LIMIT_MS = 30_000

export const BANK_RETURN_OUTCOMES = [
  'connected',
  'cancelled',
  'expired',
  'unavailable',
  'institution_mismatch',
  'no_accounts',
] as const
export type BankReturnOutcome = (typeof BANK_RETURN_OUTCOMES)[number]
export const BILLING_RETURN_OUTCOMES = ['success', 'cancelled', 'portal'] as const
export type BillingReturnOutcome = (typeof BILLING_RETURN_OUTCOMES)[number]
export interface HostedReturn {
  readonly bank: BankReturnOutcome | null
  readonly billing: BillingReturnOutcome | null
}
export const NO_HOSTED_RETURN: HostedReturn = Object.freeze({ bank: null, billing: null })

export const BANK_RETURN_MESSAGES: Readonly<Record<BankReturnOutcome, MessageKey>> = {
  connected: 'bankReturn.connected',
  cancelled: 'bankReturn.cancelled',
  expired: 'bankReturn.expired',
  unavailable: 'bankReturn.unavailable',
  institution_mismatch: 'bankReturn.institutionMismatch',
  no_accounts: 'bankReturn.noAccounts',
}
export const BILLING_RETURN_MESSAGES: Readonly<Record<BillingReturnOutcome, MessageKey>> = {
  success: 'billingReturn.success',
  cancelled: 'billingReturn.cancelled',
  portal: 'billingReturn.portal',
}

function single<T extends string>(values: readonly string[], allowed: readonly T[]): T | null {
  const [value] = values
  return values.length === 1 && (allowed as readonly string[]).includes(value ?? '')
    ? (value as T)
    : null
}

/**
 * Read the bank/billing return state once and immediately remove it from the address bar, so a
 * reload or a shared link never replays an outcome. Unknown values are removed and ignored.
 */
export function consumeHostedReturnLocation(
  href: string,
  replace: (url: string) => void,
): HostedReturn {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return NO_HOSTED_RETURN
  }
  if (!url.searchParams.has('bank') && !url.searchParams.has('billing')) return NO_HOSTED_RETURN
  const bank = single(url.searchParams.getAll('bank'), BANK_RETURN_OUTCOMES)
  const billing = single(url.searchParams.getAll('billing'), BILLING_RETURN_OUTCOMES)
  url.searchParams.delete('bank')
  url.searchParams.delete('billing')
  replace(url.href)
  return { bank, billing }
}

/** Only an HTTPS page without embedded credentials may receive the whole window. */
export function secureRedirectUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

export type RenewalRoute = 'bank_authorization' | 'consent_renewal'
/** Enable Banking renewal is a fresh authorisation at the bank; other providers keep theirs. */
export function renewalRoute(connection: Pick<Connection, 'providerId'>): RenewalRoute {
  return connection.providerId === ENABLE_BANKING_PROVIDER_ID
    ? 'bank_authorization'
    : 'consent_renewal'
}
export function bankAuthorizationLanguage(locale: ProfileLocale): BankAuthorizationLanguage {
  return locale === 'it-IT' ? 'it' : 'en'
}
export function bankRenewalInput(
  connection: Pick<Connection, 'id' | 'institutionId'>,
  locale: ProfileLocale,
): BankAuthorizationInput {
  return {
    institutionId: connection.institutionId,
    connectionId: connection.id,
    language: bankAuthorizationLanguage(locale),
  }
}
/** Readable institution name from an id such as "IT:Intesa Sanpaolo". */
export function bankInstitutionName(institutionId: string): string | null {
  const separator = institutionId.indexOf(':')
  const name = (separator >= 0 ? institutionId.slice(separator + 1) : institutionId).trim()
  return name || null
}
export function consentDays(maximumConsentDays: unknown): number {
  return typeof maximumConsentDays === 'number' &&
    Number.isInteger(maximumConsentDays) &&
    maximumConsentDays > 0
    ? Math.min(maximumConsentDays, MAXIMUM_BANK_CONSENT_DAYS)
    : MAXIMUM_BANK_CONSENT_DAYS
}

/**
 * Keep only well-formed institutions for the requested market. The server stays the authority on
 * availability; a malformed response is treated as a failed read, never as an empty market.
 */
export function normaliseBankInstitutions(
  value: unknown,
  country: string,
): BankInstitutionsDto | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.available !== 'boolean' || !Array.isArray(row.institutions)) return null
  const reason =
    row.reason === 'provider_not_configured' ||
    row.reason === 'plus_required' ||
    row.reason === 'capacity_reached'
      ? row.reason
      : null
  const market = country.toUpperCase()
  const seen = new Set<string>()
  const institutions: BankInstitutionDto[] = []
  for (const item of row.institutions as unknown[]) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    if (
      typeof entry.id !== 'string' ||
      !entry.id ||
      seen.has(entry.id) ||
      typeof entry.name !== 'string' ||
      !entry.name.trim() ||
      typeof entry.country !== 'string' ||
      entry.country.toUpperCase() !== market
    )
      continue
    seen.add(entry.id)
    institutions.push({
      id: entry.id,
      name: entry.name.trim(),
      country: entry.country,
      beta: entry.beta === true,
      maximumConsentDays: consentDays(entry.maximumConsentDays),
    })
  }
  return {
    providerId: typeof row.providerId === 'string' ? row.providerId : null,
    available: row.available,
    reason: row.available ? null : (reason ?? 'provider_not_configured'),
    institutions,
  }
}

export type BankAuthorizationProblem =
  | 'plus_required'
  | 'capacity_reached'
  | 'provider_not_configured'
  | 'already_connected'
  | 'creation_pending'
  | 'revocation_pending'
  | 'institution_unavailable'
  | 'provider_unavailable'
  | 'unknown'
const bankProblemCodes: Readonly<Record<string, BankAuthorizationProblem>> = {
  plus_required: 'plus_required',
  bank_capacity_reached: 'capacity_reached',
  bank_provider_unavailable: 'provider_not_configured',
  already_connected: 'already_connected',
  connection_creation_pending: 'creation_pending',
  revocation_pending: 'revocation_pending',
  institution_unavailable: 'institution_unavailable',
  provider_unavailable: 'provider_unavailable',
}
function problemCode(cause: unknown): string | null {
  return cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string'
    ? cause.code
    : null
}
function problemStatus(cause: unknown): number | null {
  return cause && typeof cause === 'object' && 'status' in cause && typeof cause.status === 'number'
    ? cause.status
    : null
}
export function bankAuthorizationProblem(cause: unknown): BankAuthorizationProblem {
  const code = problemCode(cause)
  return code && Object.hasOwn(bankProblemCodes, code)
    ? (bankProblemCodes[code] as BankAuthorizationProblem)
    : 'unknown'
}
/** Inline copy for problems that do not switch the picker to a dedicated explanation. */
export const BANK_AUTHORIZATION_PROBLEM_MESSAGES: Readonly<
  Record<Exclude<BankAuthorizationProblem, 'unknown'>, MessageKey>
> = {
  plus_required: 'bankInstitutions.plusHelp',
  capacity_reached: 'bankInstitutions.capacityHelp',
  provider_not_configured: 'bankConnectionFlow.activationHelp',
  already_connected: 'bankInstitutions.alreadyConnected',
  creation_pending: 'bankInstitutions.creationPending',
  revocation_pending: 'bankInstitutions.revocationPending',
  institution_unavailable: 'bankInstitutions.institutionUnavailable',
  provider_unavailable: 'bankInstitutions.providerUnavailable',
}

export type BillingProblem = 'already_subscribed' | 'no_billing_account' | 'not_owner' | 'unknown'
export function billingProblem(cause: unknown): BillingProblem {
  const code = problemCode(cause),
    status = problemStatus(cause)
  if (code === 'already_subscribed') return 'already_subscribed'
  if (code === 'no_billing_account') return 'no_billing_account'
  if (status === 403 || status === 404) return 'not_owner'
  return 'unknown'
}

/** The newest automatic bank connection receives the first background synchronisation. */
export function newestBankConnection<
  T extends Pick<Connection, 'providerId' | 'createdAt' | 'status'>,
>(connections: readonly T[]): T | null {
  const candidates = connections.filter(
    (connection) => connection.providerId !== 'local-manual' && connection.status !== 'revoked',
  )
  const preferred = candidates.some(
    (connection) => connection.providerId === ENABLE_BANKING_PROVIDER_ID,
  )
    ? candidates.filter((connection) => connection.providerId === ENABLE_BANKING_PROVIDER_ID)
    : candidates
  let newest: T | null = null
  for (const connection of preferred)
    if (!newest || Date.parse(connection.createdAt) > Date.parse(newest.createdAt))
      newest = connection
  return newest
}
const terminalSyncStates: readonly SyncJobDto['state'][] = [
  'completed',
  'failed',
  'cancelled',
  'blocked',
]
export type FirstSyncOutcome = 'done' | 'failed' | null
/** Settled when the bank data has been read once, or when its latest job can no longer progress. */
export function firstSyncOutcome(
  connection: Pick<Connection, 'lastSyncedAt'>,
  jobs: readonly Pick<SyncJobDto, 'state' | 'createdAt'>[],
): FirstSyncOutcome {
  if (connection.lastSyncedAt) return 'done'
  let latest: Pick<SyncJobDto, 'state' | 'createdAt'> | null = null
  for (const job of jobs)
    if (!latest || Date.parse(job.createdAt) > Date.parse(latest.createdAt)) latest = job
  if (!latest || !terminalSyncStates.includes(latest.state)) return null
  return latest.state === 'completed' ? 'done' : 'failed'
}

/** Server prices are positive plain decimals; anything else is not shown as a price. */
export function planPriceMoney(price: BillingPriceDto | null | undefined): Money | null {
  if (!price || typeof price.amount !== 'string' || typeof price.currency !== 'string') return null
  if (!/^\d{1,9}(?:\.\d{1,6})?$/.test(price.amount)) return null
  try {
    const value = parseDecimal(price.amount, price.currency)
    return value.amountMinor > 0n ? value : null
  } catch {
    return null
  }
}
export interface PlanPriceCopy {
  readonly text: string
  readonly accessible: string
}
export function formatPlanPrice(
  translator: Pick<Translator, 't' | 'money' | 'accessibleMoney'>,
  price: BillingPriceDto | null | undefined,
  interval: BillingInterval,
): PlanPriceCopy | null {
  const value = planPriceMoney(price)
  if (!value) return null
  const key = interval === 'month' ? 'subscription.pricePerMonth' : 'subscription.pricePerYear'
  return {
    text: translator.t(key, { amount: translator.money(value) }),
    accessible: translator.t(key, { amount: translator.accessibleMoney(value) }),
  }
}
/** Instants used in plan copy must be real dates; otherwise the sentence is omitted. */
export function billingDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}
