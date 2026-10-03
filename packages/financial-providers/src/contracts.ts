import type { Account } from '@lilleri/domain'
import type { FinancialDataProvider, ProviderContext } from './index.js'

export type ProviderEnvironment = 'synthetic' | 'sandbox' | 'live'
export type CoverageStatus = 'synthetic' | 'verified' | 'unverified' | 'unknown'
export type CoverageAvailability = 'available' | 'unavailable' | 'unknown'

/** Evidence applies to one environment. A sandbox check never proves live coverage. */
export interface CoverageEvidence {
  readonly status: CoverageStatus
  readonly environment: ProviderEnvironment
  readonly reference: string | null
  readonly checkedAt: string | null
}
export interface AccountTypeCoverage {
  readonly kind: Account['kind']
  readonly availability: CoverageAvailability
  readonly evidence: CoverageEvidence
  /** Received/provider-declared history, never a guessed universal history window. */
  readonly historyFrom: string | null
}
export interface InstitutionCoverage {
  readonly id: string
  readonly providerId: string
  readonly name: string
  readonly countryCode: string
  readonly accountTypes: readonly AccountTypeCoverage[]
}
export interface InstitutionPage {
  readonly institutions: readonly InstitutionCoverage[]
  readonly nextCursor: string | null
  readonly coverageVersion: string
}
export interface ProviderDiscoveryMetadata {
  readonly providerId: string
  readonly environment: ProviderEnvironment
  readonly coverageVersion: string
  readonly pagination: {
    readonly maxPageSize: number
    readonly maxPages: number
    readonly maxCursorBytes: number
  }
  readonly refresh: {
    readonly userPresent: 'supported' | 'unsupported' | 'unknown'
    /** null means unknown. It must not silently become an unlimited allowance. */
    readonly unattendedBudget: {
      readonly requests: number
      readonly windowSeconds: number
      readonly evidenceReference: string
    } | null
  }
  readonly renewal: 'supported' | 'unsupported' | 'unknown'
}
export type RequiredRenewalAction = 'renew_consent' | 'perform_sca' | 'renew_session' | 'reconnect'
export interface ProviderAuthorization {
  readonly providerId: string
  readonly institutionId: string
  readonly state: 'active' | 'requires_action' | 'expired' | 'revoked' | 'unknown'
  /** These four provider concepts deliberately remain separate. */
  readonly consentExpiresAt: string | null
  readonly scaDueAt: string | null
  readonly providerSessionExpiresAt: string | null
  readonly tokenExpiresAt: string | null
  readonly requiredActions: readonly {
    readonly action: RequiredRenewalAction
    readonly method: 'redirect' | 'in_place' | 'new_connection'
    readonly dueAt: string | null
    readonly evidenceReference: string
  }[]
}
export interface ProviderConnectionGrant {
  readonly consentExpiresAt: string
  readonly redirectUrl: string | null
  readonly authorization: ProviderAuthorization
}

/** Expanded port; the original port stays compatible with existing injected test adapters. */
export interface FinancialDataProviderV2 extends FinancialDataProvider {
  discoveryMetadata(): ProviderDiscoveryMetadata
  listInstitutions(cursor?: string | null): Promise<InstitutionPage>
  createConnection(context: ProviderContext): Promise<ProviderConnectionGrant>
  renewConnection(context: ProviderContext): Promise<ProviderConnectionGrant>
}

/** Structural capability only; validate every returned value before using it. */
export function hasExpandedProviderContract(
  provider: FinancialDataProvider,
): provider is FinancialDataProviderV2 {
  const candidate = provider as FinancialDataProvider & Partial<FinancialDataProviderV2>
  return (
    typeof candidate.discoveryMetadata === 'function' &&
    typeof candidate.listInstitutions === 'function' &&
    typeof candidate.renewConnection === 'function'
  )
}

const ACCOUNT_KINDS = ['current', 'card', 'cash', 'savings'] as const
const ENVIRONMENTS = ['synthetic', 'sandbox', 'live'] as const

function fail(message: string): never {
  throw new Error(`Invalid provider contract: ${message}`)
}
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('expected object')
  const object = value as Record<string, unknown>
  if (Object.keys(object).some((key) => !fields.includes(key))) fail('unexpected field')
  if (fields.some((key) => !Object.hasOwn(object, key))) fail('missing field')
  return object
}
function text(value: unknown, maxBytes = 200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    Buffer.byteLength(value, 'utf8') > maxBytes
  )
    fail('invalid text')
  return value
}
function member<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail('invalid enum')
  return value as T
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    fail('invalid integer bound')
  return value
}
function calendarDate(value: unknown): string {
  const result = text(value, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(result)) fail('invalid calendar date')
  const parsed = new Date(`${result}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result)
    fail('invalid calendar date')
  return result
}
function timestamp(value: unknown): string {
  const result = text(value, 40)
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/u.exec(
      result,
    )
  if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59)
    fail('invalid timestamp')
  calendarDate(match[1])
  if (match[6] && (Number(match[6]) > 23 || Number(match[7]) > 59)) fail('invalid timestamp offset')
  if (!Number.isFinite(Date.parse(result))) fail('invalid timestamp')
  return result
}
function optionalTimestamp(value: unknown): string | null {
  return value === null ? null : timestamp(value)
}

export function validateDiscoveryMetadata(value: unknown): ProviderDiscoveryMetadata {
  const metadata = record(value, [
    'providerId',
    'environment',
    'coverageVersion',
    'pagination',
    'refresh',
    'renewal',
  ])
  const pagination = record(metadata.pagination, ['maxPageSize', 'maxPages', 'maxCursorBytes'])
  const refresh = record(metadata.refresh, ['userPresent', 'unattendedBudget'])
  let unattendedBudget: ProviderDiscoveryMetadata['refresh']['unattendedBudget'] = null
  if (refresh.unattendedBudget !== null) {
    const budget = record(refresh.unattendedBudget, [
      'requests',
      'windowSeconds',
      'evidenceReference',
    ])
    unattendedBudget = {
      requests: integer(budget.requests, 0, 10_000),
      windowSeconds: integer(budget.windowSeconds, 1, 31_536_000),
      evidenceReference: text(budget.evidenceReference),
    }
  }
  return {
    providerId: text(metadata.providerId),
    environment: member(metadata.environment, ENVIRONMENTS),
    coverageVersion: text(metadata.coverageVersion),
    pagination: {
      maxPageSize: integer(pagination.maxPageSize, 1, 1000),
      maxPages: integer(pagination.maxPages, 1, 1000),
      maxCursorBytes: integer(pagination.maxCursorBytes, 1, 4096),
    },
    refresh: {
      userPresent: member(refresh.userPresent, ['supported', 'unsupported', 'unknown']),
      unattendedBudget,
    },
    renewal: member(metadata.renewal, ['supported', 'unsupported', 'unknown']),
  }
}

function validateCoverageEvidence(value: unknown): CoverageEvidence {
  const evidence = record(value, ['status', 'environment', 'reference', 'checkedAt'])
  const status = member(evidence.status, ['synthetic', 'verified', 'unverified', 'unknown'])
  const environment = member(evidence.environment, ENVIRONMENTS)
  const reference = evidence.reference === null ? null : text(evidence.reference)
  const checkedAt = optionalTimestamp(evidence.checkedAt)
  if (status === 'synthetic' && environment !== 'synthetic') fail('synthetic evidence environment')
  if (status === 'verified' && environment === 'synthetic') fail('fixture cannot prove coverage')
  if ((status === 'synthetic' || status === 'verified') && (!reference || !checkedAt))
    fail('coverage evidence required')
  if (status === 'unknown' && (reference !== null || checkedAt !== null))
    fail('unknown coverage has no verification evidence')
  return { status, environment, reference, checkedAt }
}

export function validateInstitutionCoverage(
  value: unknown,
  metadata: ProviderDiscoveryMetadata,
): InstitutionCoverage {
  const contract = validateDiscoveryMetadata(metadata)
  const institution = record(value, ['id', 'providerId', 'name', 'countryCode', 'accountTypes'])
  const providerId = text(institution.providerId)
  if (providerId !== contract.providerId) fail('institution belongs to another provider')
  const countryCode = text(institution.countryCode, 2)
  if (!/^[A-Z]{2}$/u.test(countryCode)) fail('invalid country code')
  if (
    !Array.isArray(institution.accountTypes) ||
    institution.accountTypes.length > ACCOUNT_KINDS.length
  )
    fail('invalid account type list')
  const accountTypes = institution.accountTypes.map((value): AccountTypeCoverage => {
    const item = record(value, ['kind', 'availability', 'evidence', 'historyFrom'])
    const evidence = validateCoverageEvidence(item.evidence)
    if (evidence.environment !== contract.environment) fail('coverage environment mismatch')
    const availability = member(item.availability, ['available', 'unavailable', 'unknown'])
    if (evidence.status === 'unknown' && availability !== 'unknown') fail('unknown coverage claim')
    const historyFrom = item.historyFrom === null ? null : calendarDate(item.historyFrom)
    if (evidence.status === 'unknown' && historyFrom !== null) fail('unknown history claim')
    if (availability !== 'available' && historyFrom !== null) fail('unavailable history claim')
    return { kind: member(item.kind, ACCOUNT_KINDS), availability, evidence, historyFrom }
  })
  if (new Set(accountTypes.map((item) => item.kind)).size !== accountTypes.length)
    fail('duplicate account type')
  return {
    id: text(institution.id),
    providerId,
    name: text(institution.name),
    countryCode,
    accountTypes,
  }
}

export function validateInstitutionPage(
  value: unknown,
  metadata: ProviderDiscoveryMetadata,
): InstitutionPage {
  const contract = validateDiscoveryMetadata(metadata)
  const page = record(value, ['institutions', 'nextCursor', 'coverageVersion'])
  if (text(page.coverageVersion) !== contract.coverageVersion) fail('coverage version changed')
  if (
    !Array.isArray(page.institutions) ||
    page.institutions.length > contract.pagination.maxPageSize
  )
    fail('institution page exceeds limit')
  const institutions = page.institutions.map((item) => validateInstitutionCoverage(item, contract))
  if (new Set(institutions.map((item) => item.id)).size !== institutions.length)
    fail('duplicate institution')
  const nextCursor =
    page.nextCursor === null ? null : text(page.nextCursor, contract.pagination.maxCursorBytes)
  if (nextCursor !== null && institutions.length === 0) fail('empty page cannot advance cursor')
  return { institutions, nextCursor, coverageVersion: contract.coverageVersion }
}

/** Bounded discovery fails atomically rather than returning a falsely complete partial catalogue. */
export async function discoverInstitutions(
  provider: Pick<FinancialDataProviderV2, 'id' | 'discoveryMetadata' | 'listInstitutions'>,
): Promise<readonly InstitutionCoverage[]> {
  const metadata = validateDiscoveryMetadata(provider.discoveryMetadata())
  if (metadata.providerId !== provider.id) fail('discovery provider identity mismatch')
  const result: InstitutionCoverage[] = []
  const seenCursors = new Set<string>()
  const seenIds = new Set<string>()
  let cursor: string | null = null
  for (let index = 0; index < metadata.pagination.maxPages; index++) {
    const page = validateInstitutionPage(await provider.listInstitutions(cursor), metadata)
    for (const institution of page.institutions) {
      if (seenIds.has(institution.id)) fail('institution repeated across pages')
      seenIds.add(institution.id)
      result.push(institution)
    }
    if (page.nextCursor === null) return result
    if (seenCursors.has(page.nextCursor)) fail('repeated institution cursor')
    seenCursors.add(page.nextCursor)
    cursor = page.nextCursor
  }
  return fail('institution pagination exceeded page budget')
}

export function validateProviderAuthorization(
  value: unknown,
  metadata: ProviderDiscoveryMetadata,
): ProviderAuthorization {
  const contract = validateDiscoveryMetadata(metadata)
  const authorization = record(value, [
    'providerId',
    'institutionId',
    'state',
    'consentExpiresAt',
    'scaDueAt',
    'providerSessionExpiresAt',
    'tokenExpiresAt',
    'requiredActions',
  ])
  if (text(authorization.providerId) !== contract.providerId)
    fail('authorization provider mismatch')
  const consentExpiresAt = optionalTimestamp(authorization.consentExpiresAt)
  const scaDueAt = optionalTimestamp(authorization.scaDueAt)
  const providerSessionExpiresAt = optionalTimestamp(authorization.providerSessionExpiresAt)
  const tokenExpiresAt = optionalTimestamp(authorization.tokenExpiresAt)
  if (!Array.isArray(authorization.requiredActions) || authorization.requiredActions.length > 4)
    fail('invalid renewal actions')
  const requiredActions = authorization.requiredActions.map((value) => {
    const action = record(value, ['action', 'method', 'dueAt', 'evidenceReference'])
    const kind = member(action.action, [
      'renew_consent',
      'perform_sca',
      'renew_session',
      'reconnect',
    ])
    const dueAt = optionalTimestamp(action.dueAt)
    const mappedTerm =
      kind === 'renew_consent'
        ? consentExpiresAt
        : kind === 'perform_sca'
          ? scaDueAt
          : kind === 'renew_session'
            ? providerSessionExpiresAt
            : undefined
    if (mappedTerm !== undefined && dueAt !== mappedTerm) fail('renewal action does not match term')
    const method = member(action.method, ['redirect', 'in_place', 'new_connection'])
    if (contract.renewal === 'unsupported' && method !== 'new_connection')
      fail('unsupported renewal method')
    if (contract.renewal === 'unknown') fail('unknown renewal cannot prescribe an action')
    return { action: kind, method, dueAt, evidenceReference: text(action.evidenceReference) }
  })
  if (new Set(requiredActions.map((action) => action.action)).size !== requiredActions.length)
    fail('duplicate renewal action')
  const state = member(authorization.state, [
    'active',
    'requires_action',
    'expired',
    'revoked',
    'unknown',
  ])
  if (state === 'requires_action' && requiredActions.length === 0) fail('missing required action')
  return {
    providerId: contract.providerId,
    institutionId: text(authorization.institutionId),
    state,
    consentExpiresAt,
    scaDueAt,
    providerSessionExpiresAt,
    tokenExpiresAt,
    requiredActions,
  }
}

export function validateProviderConnectionGrant(
  value: unknown,
  metadata: ProviderDiscoveryMetadata,
): ProviderConnectionGrant {
  const grant = record(value, ['consentExpiresAt', 'redirectUrl', 'authorization'])
  const consentExpiresAt = timestamp(grant.consentExpiresAt)
  const authorization = validateProviderAuthorization(grant.authorization, metadata)
  if (authorization.consentExpiresAt !== consentExpiresAt) fail('grant consent term mismatch')
  let redirectUrl: string | null = null
  if (grant.redirectUrl !== null) {
    redirectUrl = text(grant.redirectUrl, 2048)
    let url: URL
    try {
      url = new URL(redirectUrl)
    } catch {
      return fail('invalid redirect URL')
    }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password)
      fail('invalid redirect URL')
    if (metadata.environment === 'synthetic') fail('synthetic adapter must not redirect externally')
  }
  return { consentExpiresAt, redirectUrl, authorization }
}

export interface InstitutionPickerDecision {
  readonly connectable: boolean
  readonly status: CoverageStatus
  readonly reason:
    | 'synthetic_fixture'
    | 'verified_coverage'
    | 'unavailable'
    | 'unknown'
    | 'unverified'
    | 'environment_mismatch'
  readonly manualFallback: true
}

/** Call only after validation. Missing kinds are unknown; labels are never coverage evidence. */
export function institutionPickerDecision(
  institution: InstitutionCoverage,
  kind: Account['kind'],
  environment: ProviderEnvironment,
): InstitutionPickerDecision {
  const coverage = institution.accountTypes.find((item) => item.kind === kind)
  if (!coverage)
    return { connectable: false, status: 'unknown', reason: 'unknown', manualFallback: true }
  const evidence = validateCoverageEvidence(coverage.evidence)
  if (evidence.environment !== environment)
    return {
      connectable: false,
      status: coverage.evidence.status,
      reason: 'environment_mismatch',
      manualFallback: true,
    }
  if (coverage.availability === 'unavailable')
    return {
      connectable: false,
      status: coverage.evidence.status,
      reason: 'unavailable',
      manualFallback: true,
    }
  if (coverage.availability === 'unknown' || coverage.evidence.status === 'unknown')
    return {
      connectable: false,
      status: coverage.evidence.status,
      reason: 'unknown',
      manualFallback: true,
    }
  if (coverage.evidence.status === 'unverified')
    return { connectable: false, status: 'unverified', reason: 'unverified', manualFallback: true }
  const synthetic = coverage.evidence.status === 'synthetic'
  return {
    connectable: true,
    status: coverage.evidence.status,
    reason: synthetic ? 'synthetic_fixture' : 'verified_coverage',
    manualFallback: true,
  }
}

/** Useful for configured names whose actual support has not been measured. */
export function unknownInstitution(
  metadata: ProviderDiscoveryMetadata,
  institution: { readonly id: string; readonly name: string; readonly countryCode: string },
): InstitutionCoverage {
  return validateInstitutionCoverage(
    {
      ...institution,
      providerId: metadata.providerId,
      accountTypes: ACCOUNT_KINDS.map((kind) => ({
        kind,
        availability: 'unknown',
        evidence: {
          status: 'unknown',
          environment: metadata.environment,
          reference: null,
          checkedAt: null,
        },
        historyFrom: null,
      })),
    },
    metadata,
  )
}
