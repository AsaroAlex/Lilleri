import type { Account, CurrencyCode } from '@lilleri/domain'

export interface ManualAccountDto {
  readonly id: string
  readonly name: string
  readonly kind: Account['kind']
  readonly currency: CurrencyCode
  readonly openingOn: string
  readonly openingBalanceMinor: string
  readonly balanceMinor: string
  readonly balanceUpdatedAt: string
  readonly revision: number
}
export interface ManualEntryDto {
  readonly transactionId: string
  readonly accountId: string
  readonly accountRevision: number
  readonly transactionRevision: number
  readonly amountMinor: string
  readonly currency: CurrencyCode
  readonly balanceMinor: string
  readonly status: 'booked' | 'reversed'
}
export interface ManualBalanceEventDto {
  readonly id: string
  readonly profileId: string
  readonly accountId: string
  readonly requestId: string
  readonly operation: 'opening' | 'entry' | 'import' | 'adjustment' | 'reversal'
  readonly transactionId: string | null
  readonly beforeMinor: string
  readonly afterMinor: string
  readonly accountRevision: number
  readonly reason: string
  readonly createdAt: string
}
export interface NewManualAccount {
  readonly requestId: string
  readonly name: string
  readonly kind: Account['kind']
  readonly currency: CurrencyCode
  readonly openingBalanceMinor: string
  readonly openingOn: string
}
export interface NewManualEntry {
  readonly requestId: string
  readonly accountId: string
  readonly amountMinor: string
  readonly currency: CurrencyCode
  readonly bookedOn: string
  readonly kind: 'expense' | 'income' | 'transfer'
  readonly description: string
  readonly merchantName?: string
  readonly reference?: string
}

/** Client command markers provide retry identity; these are never authentication credentials. */
export function manualRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`
}

/** Reuse the shared request function so authenticated and synthetic modes use the same errors. */
export function createManualClient(request: <T>(path: string, init?: RequestInit) => Promise<T>) {
  const accountPath = (id: string) => `/v1/manual/accounts/${encodeURIComponent(id)}`
  return {
    previewCsv: (accountId: string, csv: string) =>
      request<{
        readonly accountId: string
        readonly rowCount: number
        readonly newRows: number
        readonly unchangedRows: number
        readonly amountTotalMinor: string
        readonly newAmountTotalMinor: string
        readonly currency: CurrencyCode
        readonly manualBalanceWillChange: boolean
      }>('/v1/imports/csv/preview', { method: 'POST', body: JSON.stringify({ accountId, csv }) }),
    list: () => request<readonly ManualAccountDto[]>('/v1/manual/accounts'),
    create: (input: NewManualAccount) =>
      request<ManualAccountDto>('/v1/manual/accounts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    enter: (input: NewManualEntry) =>
      request<ManualEntryDto>('/v1/manual/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    adjust: (
      id: string,
      input: {
        readonly requestId: string
        readonly revision: number
        readonly balanceMinor: string
        readonly currency: CurrencyCode
        readonly reason: string
      },
    ) =>
      request<{
        readonly eventId: string
        readonly accountId: string
        readonly revision: number
        readonly beforeMinor: string
        readonly balanceMinor: string
        readonly currency: CurrencyCode
      }>(`${accountPath(id)}/adjust`, { method: 'POST', body: JSON.stringify(input) }),
    reverse: (
      id: string,
      input: {
        readonly requestId: string
        readonly revision: number
        readonly accountRevision: number
        readonly reason: string
      },
    ) =>
      request<ManualEntryDto>(`/v1/manual/transactions/${encodeURIComponent(id)}/reverse`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    history: (id: string) => request<readonly ManualBalanceEventDto[]>(`${accountPath(id)}/events`),
  }
}
