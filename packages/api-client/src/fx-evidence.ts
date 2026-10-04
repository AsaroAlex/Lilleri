import type { MoneyDto } from './index.js'

export interface FxEvidenceEventDto {
  readonly id: string
  readonly profileId: string
  readonly connectionId: string
  readonly accountId: string
  readonly transactionId: string
  readonly providerId: string
  readonly revision: number
  readonly observationId: string | null
  readonly jobId: string | null
  readonly observedAt: string
  readonly version: 'transaction-fx-v1'
  readonly state: 'unknown' | 'partial' | 'complete' | 'conflict'
  readonly original: MoneyDto | null
  readonly billed: MoneyDto | null
  readonly rate: {
    readonly decimal: string
    readonly baseCurrency: MoneyDto['currency']
    readonly quoteCurrency: MoneyDto['currency']
    readonly date: string | null
  } | null
  readonly sourceReference: string | null
  readonly ledgerAmount: MoneyDto
  readonly issues: readonly string[]
}
export interface FxEvidenceDto {
  readonly transactionId: string
  readonly state: FxEvidenceEventDto['state']
  readonly current: FxEvidenceEventDto | null
  readonly history: readonly FxEvidenceEventDto[]
  readonly nextBeforeRevision: number | null
}
export function createFxEvidenceClient(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  return {
    evidence: (transactionId: string, beforeRevision?: number, signal?: AbortSignal) => {
      if (beforeRevision !== undefined && (!Number.isInteger(beforeRevision) || beforeRevision < 1))
        throw new Error('Invalid FX history revision')
      return request<FxEvidenceDto>(
        `/v1/transactions/${encodeURIComponent(transactionId)}/fx-evidence${beforeRevision === undefined ? '' : `?beforeRevision=${beforeRevision}`}`,
        signal ? { signal } : {},
      )
    },
  }
}
