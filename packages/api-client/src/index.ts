import type {
  Account,
  Analysis,
  CategoryId,
  Classification,
  Connection,
  CurrencyCode,
  Transaction,
} from '@lilleri/domain'
import { createLedgerReadClient } from './ledger-read.js'
import { createSyncClient } from './sync.js'

/** Bigint money is serialized as a base-ten string, never a JSON number. */
export type JsonValue<T> = T extends bigint
  ? string
  : T extends readonly (infer U)[]
    ? JsonValue<U>[]
    : T extends object
      ? { [P in keyof T]: JsonValue<T[P]> }
      : T
export interface MoneyDto {
  readonly amountMinor: string
  readonly currency: CurrencyCode
}
export type TransactionDto = JsonValue<Transaction>
export type AccountDto = JsonValue<Account>
export type ReconciliationMatchDto = JsonValue<Analysis['matches'][number]> & {
  /** Opaque SHA-256 token covering the decision version and source evidence. */
  readonly revision: string
}
export type AnalysisDto = Omit<JsonValue<Analysis>, 'matches'> & {
  readonly matches: readonly ReconciliationMatchDto[]
}
export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}
export interface DemoOverview {
  readonly mode: 'synthetic'
  readonly profile: { readonly id: string; readonly name: string; readonly timezone: string }
  readonly accounts: readonly AccountDto[]
  readonly transactions: readonly TransactionDto[]
  readonly connections: readonly Connection[]
  readonly analysis: AnalysisDto
}
export type ConnectionAccountKind = Account['kind']
export type ConnectionCoverageStatus = 'synthetic' | 'verified' | 'unverified' | 'unknown'
export interface ConnectionInstitutionDto {
  readonly id: string
  readonly providerId: string
  readonly name: string
  readonly countryCode: string
  readonly accountTypes: readonly {
    readonly kind: ConnectionAccountKind
    readonly availability: 'available' | 'unavailable' | 'unknown'
    readonly evidence: {
      readonly status: ConnectionCoverageStatus
      readonly environment: 'synthetic' | 'sandbox' | 'live'
      readonly reference: string | null
      readonly checkedAt: string | null
    }
    readonly historyFrom: string | null
  }[]
}
export interface ConnectionInstitutionCatalogueDto {
  readonly mode: 'synthetic'
  readonly providerId: string
  readonly environment: 'synthetic' | 'sandbox' | 'live'
  readonly institutions: readonly ConnectionInstitutionDto[]
}
export interface ConnectionAuthorizationDto {
  readonly providerId: string
  readonly institutionId: string
  readonly state: 'active' | 'requires_action' | 'expired' | 'revoked' | 'unknown'
  readonly consentExpiresAt: string | null
  readonly scaDueAt: string | null
  readonly providerSessionExpiresAt: string | null
  readonly tokenExpiresAt: string | null
  readonly requiredActions: readonly {
    readonly action: 'renew_consent' | 'perform_sca' | 'renew_session' | 'reconnect'
    readonly method: 'redirect' | 'in_place' | 'new_connection'
    readonly dueAt: string | null
    readonly evidenceReference: string
  }[]
}
export interface ConnectionProviderMetadataDto {
  readonly providerId: string
  readonly environment: 'synthetic' | 'sandbox' | 'live'
  readonly coverageVersion: string
  readonly pagination: {
    readonly maxPageSize: number
    readonly maxPages: number
    readonly maxCursorBytes: number
  }
  readonly refresh: {
    readonly userPresent: 'supported' | 'unsupported' | 'unknown'
    readonly unattendedBudget: {
      readonly requests: number
      readonly windowSeconds: number
      readonly evidenceReference: string
    } | null
  }
  readonly renewal: 'supported' | 'unsupported' | 'unknown'
}
export interface ConnectionLifecycleDto {
  readonly profileId: string
  readonly connectionId: string
  readonly consentId: string | null
  readonly revision: number
  readonly state: 'active' | 'expiring' | 'expired' | 'revoked' | 'error' | 'paused' | 'unknown'
  readonly paused: boolean
  readonly source: 'provider' | 'legacy'
  readonly authorization: ConnectionAuthorizationDto
  readonly providerMetadata: ConnectionProviderMetadataDto | null
  readonly updatedAt: string
  readonly lastSyncedAt: string | null
  readonly blockedReason: string | null
  readonly historyRecovery: {
    readonly interruptedAt: string
    readonly renewedAt: string
    readonly status: 'unverified' | 'covered' | 'bank_gap'
    readonly intervals: readonly { readonly from: string; readonly to: string }[]
    readonly evidenceJobIds: readonly string[]
  } | null
}
export interface ConnectionConsentEventDto {
  readonly id: string
  readonly profileId: string
  readonly connectionId: string
  readonly consentId: string
  readonly revision: number
  readonly action:
    | 'granted'
    | 'renewed'
    | 'paused'
    | 'resumed'
    | 'revoked'
    | 'provider_error'
    | 'provider_recovered'
    | 'legacy_imported'
  readonly source: 'provider' | 'user' | 'legacy'
  readonly authorization: ConnectionAuthorizationDto
  readonly providerMetadata: ConnectionProviderMetadataDto | null
  readonly occurredAt: string
}
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

export function createApiClient(baseUrl: string, fetcher: typeof fetch = fetch) {
  const responseFor = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers)
    if (init.body !== undefined && init.body !== null && !headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json')
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      credentials: 'include',
      ...init,
      headers,
    })
    if (!response.ok) {
      let detail = 'Il servizio non è disponibile. Riprova tra poco.',
        code = 'request_failed'
      try {
        const problem = (await response.json()) as { detail?: unknown; code?: unknown }
        if (typeof problem.detail === 'string') detail = problem.detail
        if (typeof problem.code === 'string') code = problem.code
      } catch {
        /* Non-JSON failure has a safe fallback. */
      }
      throw new ApiError(response.status, code, detail)
    }
    return response
  }
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await responseFor(path, init)
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }
  return {
    ...createSyncClient(request),
    ...createLedgerReadClient(request),
    request,
    overview: (signal?: AbortSignal) => request<DemoOverview>('/v1/demo', signal ? { signal } : {}),
    connectMock: () => request<Connection>('/v1/connections/mock', { method: 'POST', body: '{}' }),
    institutions: () => request<ConnectionInstitutionCatalogueDto>('/v1/institutions'),
    connectInstitution: (institutionId: string, accountKind: ConnectionAccountKind) =>
      request<Connection>('/v1/connections', {
        method: 'POST',
        body: JSON.stringify({ institutionId, accountKind }),
      }),
    connectionLifecycle: (connectionId: string) =>
      request<ConnectionLifecycleDto>(
        `/v1/connections/${encodeURIComponent(connectionId)}/lifecycle`,
      ),
    connectionConsentEvents: (connectionId: string) =>
      request<readonly ConnectionConsentEventDto[]>(
        `/v1/connections/${encodeURIComponent(connectionId)}/consent-events`,
      ),
    pauseConnection: (connectionId: string, revision: number) =>
      request<ConnectionLifecycleDto>(`/v1/connections/${encodeURIComponent(connectionId)}/pause`, {
        method: 'POST',
        body: JSON.stringify({ revision }),
      }),
    resumeConnection: (connectionId: string, revision: number) =>
      request<ConnectionLifecycleDto>(
        `/v1/connections/${encodeURIComponent(connectionId)}/resume`,
        { method: 'POST', body: JSON.stringify({ revision }) },
      ),
    renewConnection: (connectionId: string, revision: number) =>
      request<ConnectionLifecycleDto>(`/v1/connections/${encodeURIComponent(connectionId)}/renew`, {
        method: 'POST',
        body: JSON.stringify({ revision }),
      }),
    sync: (connectionId: string) =>
      request<{
        inserted: number
        updated: number
        unchanged: number
        rejected: number
        syncedAt: string
      }>(`/v1/connections/${encodeURIComponent(connectionId)}/sync`, {
        method: 'POST',
        body: '{}',
      }),
    transactions: (cursor?: string) =>
      request<Page<TransactionDto>>(
        `/v1/transactions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      ),
    correct: (
      transactionId: string,
      categoryId: CategoryId,
      scope: 'once' | 'merchant',
      revision: number,
    ) =>
      request<Classification>(
        `/v1/transactions/${encodeURIComponent(transactionId)}/classification`,
        { method: 'PATCH', body: JSON.stringify({ categoryId, scope, revision }) },
      ),
    decideMatch: (matchId: string, state: 'confirmed' | 'rejected' | 'undone', revision: string) =>
      request<AnalysisDto>(`/v1/reconciliation/${encodeURIComponent(matchId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ state, revision }),
      }),
    disconnect: (connectionId: string, data?: 'retain' | 'erase') =>
      request<void>(`/v1/connections/${encodeURIComponent(connectionId)}`, {
        method: 'DELETE',
        ...(data ? { body: JSON.stringify({ data }) } : {}),
      }),
    exportData: () => request<unknown>('/v1/export'),
    exportArchive: async () => {
      const response = await responseFor('/v1/export/archive', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      return new Uint8Array(await response.arrayBuffer())
    },
    importCsv: (accountId: string, csv: string) =>
      request<{
        inserted: number
        updated: number
        unchanged: number
        rejected: number
        importedAt: string
      }>('/v1/imports/csv', { method: 'POST', body: JSON.stringify({ accountId, csv }) }),
    erase: () => request<void>('/v1/profile', { method: 'DELETE' }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export * from './fx-evidence.js'
export * from './ledger-read.js'
export {
  createManualClient,
  type ManualAccountDto,
  type ManualBalanceEventDto,
  type ManualEntryDto,
  manualRequestId,
} from './manual.js'
export * from './mapped-import.js'
export * from './pending-lifecycle.js'
export { createRulesClient } from './rules.js'
export * from './settings.js'
export * from './sync.js'
