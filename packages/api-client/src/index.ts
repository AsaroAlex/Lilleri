import type {
  Account,
  Analysis,
  CategoryId,
  Classification,
  Connection,
  CurrencyCode,
  Transaction,
} from '@lilleri/domain'

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
export type AnalysisDto = JsonValue<Analysis>
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
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
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
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }
  return {
    request,
    overview: (signal?: AbortSignal) => request<DemoOverview>('/v1/demo', signal ? { signal } : {}),
    connectMock: () => request<Connection>('/v1/connections/mock', { method: 'POST', body: '{}' }),
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
    decideMatch: (matchId: string, state: 'confirmed' | 'rejected' | 'undone') =>
      request<JsonValue<Analysis>>(`/v1/reconciliation/${encodeURIComponent(matchId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ state }),
      }),
    disconnect: (connectionId: string) =>
      request<void>(`/v1/connections/${encodeURIComponent(connectionId)}`, { method: 'DELETE' }),
    exportData: () => request<unknown>('/v1/export'),
    erase: () => request<void>('/v1/profile', { method: 'DELETE' }),
  }
}
