import type { CurrencyCode } from '@lilleri/domain'
export type SyncJobState =
  | 'queued'
  | 'running'
  | 'partial'
  | 'retry_wait'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'
export type SyncDegradedReason =
  | 'budget_reached'
  | 'inactive'
  | 'policy_unknown'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'timeout'
  | 'invalid_provider_contract'
  | 'bound_reached'
  | 'consent_inactive'
  | 'snapshot_expired'
  | 'history_gap'
  | 'partial'
  | null
export interface SyncReportDto {
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
  readonly rejected: number
  readonly syncedAt: string | null
  readonly payloadRecords: number
  readonly processedRecords: number
  readonly pages: number
  readonly windowsCompleted: number
  readonly windowsTotal: number
  readonly pending: number
  readonly pendingReplaced: number
  readonly pendingUnresolved: number
  readonly removedBySource: number
  readonly coverage: 'complete_requested_interval' | 'partial' | 'unknown'
  readonly historyFrom: string | null
  readonly outcomes: readonly {
    readonly transactionId: string
    readonly outcome:
      | 'inserted'
      | 'updated'
      | 'unchanged'
      | 'rejected'
      | 'duplicate_payload'
      | 'pending_replaced'
      | 'removed_by_source'
    readonly reason: string | null
  }[]
  readonly balances: readonly {
    readonly accountId: string
    readonly currency: CurrencyCode
    readonly providerAmountMinor: string
    readonly expectedAmountMinor: string | null
    readonly result: 'equal' | 'mismatch' | 'not_comparable'
    readonly reason:
      | 'opening_anchor_missing'
      | 'balance_meaning_unknown'
      | 'interval_incomplete'
      | 'same_reference'
      | 'currency_or_date_mismatch'
  }[]
  readonly issues: readonly {
    readonly id: string
    readonly kind: 'balance_mismatch' | 'removed_by_source' | 'history_gap' | 'pending_absent'
    readonly accountId: string
    readonly transactionId: string | null
  }[]
}
export interface SyncJobDto {
  readonly id: string
  readonly profileId: string
  readonly connectionId: string
  readonly consentId: string
  readonly providerId: string
  readonly requestId: string
  readonly mode: 'user_present' | 'unattended'
  readonly requestedFrom: string | null
  readonly requestedTo: string
  readonly state: SyncJobState
  readonly reason: SyncDegradedReason
  readonly configurationRevision: number
  readonly configurationDigest: string
  readonly leaseExpiresAt: string | null
  readonly leaseEpoch: number
  readonly failures: number
  readonly availableAt: string
  readonly revision: number
  readonly report: SyncReportDto
  readonly createdAt: string
  readonly updatedAt: string
  readonly completedAt: string | null
}
export interface SyncStartDto {
  readonly connectionId: string
  readonly requestId: string
  readonly mode: 'user_present'
  readonly from?: string
  readonly to?: string
}
export function createSyncClient(request: <T>(path: string, init?: RequestInit) => Promise<T>) {
  return {
    startSync: (input: SyncStartDto) =>
      request<SyncJobDto>('/v1/sync/start', { method: 'POST', body: JSON.stringify(input) }),
    resumeSync: (id: string) =>
      request<SyncJobDto>(`/v1/sync/${encodeURIComponent(id)}/resume`, {
        method: 'POST',
        body: '{}',
      }),
    syncJob: (id: string) => request<SyncJobDto>(`/v1/sync/${encodeURIComponent(id)}`),
    connectionSyncJobs: (connectionId: string) =>
      request<readonly SyncJobDto[]>(
        `/v1/connections/${encodeURIComponent(connectionId)}/sync-jobs`,
      ),
  }
}
