export interface PendingLifecycleDto {
  readonly transactionId: string
  readonly revision: number
  readonly digest: string
  readonly state:
    | 'active'
    | 'replaced'
    | 'amount_change_review'
    | 'expired'
    | 'cancelled'
    | 'reversed'
  readonly firstSeenAt: string
  readonly updatedAt: string
  readonly replacementTransactionId: string | null
  readonly replacementRevision: number | null
  readonly pendingAmountMinor: string
  readonly replacementAmountMinor: string | null
  readonly currency: string
  readonly carried: readonly string[]
}
export interface SourceRemovalDto {
  readonly transactionId: string
  readonly revision: number
  readonly transactionRevision: number
  readonly presenceDigest: string
  readonly choice: 'keep_manual' | 'remove' | 'undone' | null
  readonly needsDecision: boolean
}
export function createPendingLifecycleClient(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  return {
    pending: () => request<readonly PendingLifecycleDto[]>('/v1/reconciliation/pending'),
    removals: () => request<readonly SourceRemovalDto[]>('/v1/reconciliation/source-removals'),
    decidePending: (row: PendingLifecycleDto, action: 'accept' | 'undo') => {
      if (row.replacementRevision === null) throw new Error('Missing replacement revision')
      return request<PendingLifecycleDto>('/v1/reconciliation/pending/decision', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: row.transactionId,
          revision: row.revision,
          expectedDigest: row.digest,
          replacementRevision: row.replacementRevision,
          action,
        }),
      })
    },
    decideRemoval: (row: SourceRemovalDto, choice: 'keep_manual' | 'remove' | 'undo') =>
      request<SourceRemovalDto>('/v1/reconciliation/source-removals/decision', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: row.transactionId,
          revision: row.revision,
          transactionRevision: row.transactionRevision,
          presenceDigest: row.presenceDigest,
          choice,
        }),
      }),
  }
}
