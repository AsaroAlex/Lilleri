import type { CurrencyCode, Transaction } from '@lilleri/domain'
import type { AccountDto, TransactionDto } from './index.js'

export interface LedgerSearchQuery {
  readonly q?: string
  readonly accountId?: string
  readonly currency?: CurrencyCode
  readonly status?: Transaction['status']
  /** Inclusive financial date; booking date takes precedence over authorization. */
  readonly from?: string
  readonly to?: string
  readonly cursor?: string
  readonly limit?: number
}
export interface LedgerReadPage {
  readonly items: readonly TransactionDto[]
  readonly privacy: readonly {
    readonly transactionId: string
    readonly quiet: boolean
    readonly private: boolean
    readonly revision: number
  }[]
  readonly nextCursor: string | null
  readonly hasMore: boolean
  /** False can accompany an empty page; continue with nextCursor before no-results. */
  readonly searchComplete: boolean
  readonly revision: string
  readonly readAt: string
}
export interface LedgerHistoryProjection extends LedgerReadPage {
  readonly kind: 'owned_ledger_history'
  readonly window: { readonly from: string; readonly to: string; readonly days: 90 }
  readonly profile: { readonly id: string; readonly timezone: string }
  /** Latest observed balances retain each account's currency and balanceUpdatedAt. */
  readonly accounts: readonly AccountDto[]
  readonly policy: {
    readonly dateBasis: 'bookedOn_then_authorizedOn'
    readonly undated: 'excluded'
    readonly balances: 'current_observed_per_account'
    readonly forecast: false
    readonly aggregates: false
    readonly privacy: 'owned_records_including_quiet_private'
  }
}

export function createLedgerReadClient(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  const params = (query: LedgerSearchQuery) => {
    const values = new URLSearchParams()
    for (const [name, value] of Object.entries(query))
      if (value !== undefined) values.set(name, String(value))
    return values.size ? `?${values}` : ''
  }
  return {
    searchTransactions: (query: LedgerSearchQuery = {}, signal?: AbortSignal) =>
      request<LedgerReadPage>(`/v1/ledger/search${params(query)}`, signal ? { signal } : {}),
    ledgerProjection: (query: Omit<LedgerSearchQuery, 'from' | 'to'> = {}, signal?: AbortSignal) =>
      request<LedgerHistoryProjection>(
        `/v1/ledger/projection${params(query)}`,
        signal ? { signal } : {},
      ),
  }
}
