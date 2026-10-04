import { type FxEvidenceEvent, fxOwnershipDto } from './fx-evidence-dto.js'

interface SourceReference {
  readonly id: string
  readonly connectionId: string
  readonly accountId?: string
  readonly providerId?: string
}
interface FxOwnershipScope {
  readonly profileId: string
  readonly exportedAt: string
  readonly accounts: readonly SourceReference[]
  readonly transactions: readonly SourceReference[]
  readonly sourceObservations: readonly SourceReference[]
  readonly jobs: readonly SourceReference[]
}

/** Export consumers cannot substitute an amount/rate version from another owned source. */
export function assertFxOwnershipReferences(
  value: readonly FxEvidenceEvent[],
  scope: FxOwnershipScope,
) {
  const events = fxOwnershipDto.parse(value),
    ids = new Set<string>(),
    groups = new Map<string, FxEvidenceEvent[]>()
  const fail = (): never => {
    throw new Error('Invalid FX ownership references')
  }
  const exportedAt = Date.parse(scope.exportedAt)
  if (!Number.isFinite(exportedAt)) fail()
  for (const event of events) {
    if (
      ids.has(event.id) ||
      event.profileId !== scope.profileId ||
      Date.parse(event.observedAt) > exportedAt
    )
      fail()
    ids.add(event.id)
    const transaction = scope.transactions.find((row) => row.id === event.transactionId),
      account = scope.accounts.find((row) => row.id === event.accountId)
    if (
      !transaction ||
      transaction.connectionId !== event.connectionId ||
      transaction.accountId !== event.accountId ||
      transaction.providerId !== event.providerId ||
      account?.connectionId !== event.connectionId
    )
      fail()
    if (event.observationId !== null) {
      const observation = scope.sourceObservations.find((row) => row.id === event.observationId)
      if (
        !observation ||
        observation.accountId !== event.accountId ||
        observation.connectionId !== event.connectionId ||
        observation.providerId !== event.providerId
      )
        fail()
    }
    if (event.jobId !== null) {
      const job = scope.jobs.find((row) => row.id === event.jobId)
      if (!job || job.connectionId !== event.connectionId || job.providerId !== event.providerId)
        fail()
    }
    const group = groups.get(event.transactionId) ?? []
    group.push(event)
    groups.set(event.transactionId, group)
  }
  for (const group of groups.values()) {
    group.sort((first, second) => first.revision - second.revision)
    for (const [index, event] of group.entries())
      if (
        event.revision !== index + 1 ||
        (index > 0 && Date.parse(group[index - 1]?.observedAt ?? '') > Date.parse(event.observedAt))
      )
        fail()
  }
}
