import type { Database } from '@lilleri/database'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { connectionCreationIntents } from './connection-creation-schema.js'

const id = z.string().min(1).max(200),
  at = z.iso.datetime().refine((value) => new Date(value).toISOString() === value)
export const connectionCreationIntentDto = z.strictObject({
  id,
  profileId: id,
  providerId: id,
  institutionId: id,
  connectionId: id,
  consentId: id,
  basisDigest: z.string().regex(/^[a-f0-9]{64}$/),
  state: z.enum(['prepared', 'dispatching', 'applied', 'cancelled', 'compensating', 'compensated']),
  createdAt: at,
  dispatchedAt: at.nullable(),
  deadlineAt: at,
  settledAt: at.nullable(),
  appliedAt: at.nullable(),
  compensatedAt: at.nullable(),
  revocationJobId: id.nullable(),
  recoveryCheckedAt: at.nullable(),
})
export const connectionCreationOwnershipDto = z.strictObject({
  intents: z.array(connectionCreationIntentDto),
})
export type ConnectionCreationOwnership = z.infer<typeof connectionCreationOwnershipDto>
/** Caller-scoped reads only; no household routing, credentials, error text or provider payloads. */
export async function connectionCreationOwnershipExport(
  db: Database,
  profileId: string,
): Promise<ConnectionCreationOwnership> {
  const rows = await db
    .select()
    .from(connectionCreationIntents)
    .where(eq(connectionCreationIntents.profileId, profileId))
    .orderBy(asc(connectionCreationIntents.createdAt), asc(connectionCreationIntents.id))
  return connectionCreationOwnershipDto.parse({
    intents: rows.map(({ householdId: _householdId, ...row }) => row),
  })
}
/** Orphan intent targets need not have financial rows: preparation precedes connection insertion. */
export function assertConnectionCreationOwnershipReferences(
  value: ConnectionCreationOwnership,
  scope: {
    readonly profileId: string
    readonly exportedAt: string
    readonly connections: readonly {
      id: string
      profileId: string
      providerId: string
      institutionId: string
    }[]
    readonly consents: readonly {
      id: string
      profileId: string
      connectionId: string
      provider: string
    }[]
    readonly revocationJobs: readonly {
      id: string
      profileId: string
      connectionId: string
      consentId: string
      providerId: string
    }[]
    readonly sourceErasureReceipts?: readonly {
      profileId: string
      connectionId: string
      consentIds: readonly string[]
    }[]
  },
) {
  const parsed = connectionCreationOwnershipDto.parse(value)
  const exportedAt = Date.parse(scope.exportedAt)
  if (!Number.isFinite(exportedAt)) throw new Error('Invalid creation export clock')
  if (
    new Set(parsed.intents.map((row) => row.id)).size !== parsed.intents.length ||
    new Set(parsed.intents.map((row) => row.consentId)).size !== parsed.intents.length
  )
    throw new Error('Duplicate creation intent identity')
  for (const row of parsed.intents) {
    const createdAt = Date.parse(row.createdAt)
    const facts = [
      row.dispatchedAt,
      row.settledAt,
      row.appliedAt,
      row.compensatedAt,
      row.recoveryCheckedAt,
    ].filter((fact): fact is string => fact !== null)
    if (
      row.profileId !== scope.profileId ||
      createdAt > exportedAt ||
      Date.parse(row.deadlineAt) <= createdAt ||
      facts.some((fact) => Date.parse(fact) < createdAt || Date.parse(fact) > exportedAt) ||
      (row.state === 'applied') !== (row.appliedAt !== null) ||
      (row.state === 'compensated') !== (row.compensatedAt !== null) ||
      (row.settledAt !== null &&
        (row.dispatchedAt === null || Date.parse(row.settledAt) < Date.parse(row.dispatchedAt))) ||
      (row.appliedAt !== null && row.appliedAt !== row.settledAt) ||
      (row.state === 'compensated' && row.dispatchedAt !== null && row.settledAt === null)
    )
      throw new Error('Creation intent state or clock is invalid')
    const connection = scope.connections.find((item) => item.id === row.connectionId)
    if (
      connection &&
      (connection.profileId !== row.profileId ||
        connection.providerId !== row.providerId ||
        connection.institutionId !== row.institutionId)
    )
      throw new Error('Creation connection scope is invalid')
    if (row.state === 'applied') {
      const consent = scope.consents.find((item) => item.id === row.consentId)
      const erased = scope.sourceErasureReceipts?.some(
        (receipt) =>
          receipt.profileId === row.profileId &&
          receipt.connectionId === row.connectionId &&
          receipt.consentIds.includes(row.consentId),
      )
      if (
        ((!connection || !consent) && !erased) ||
        (consent &&
          (consent.profileId !== row.profileId ||
            consent.connectionId !== row.connectionId ||
            consent.provider !== row.providerId))
      )
        throw new Error('Applied creation grant reference is invalid')
    }
    if (row.revocationJobId !== null) {
      const job = scope.revocationJobs.find((item) => item.id === row.revocationJobId)
      if (
        !job ||
        job.profileId !== row.profileId ||
        job.connectionId !== row.connectionId ||
        job.consentId !== row.consentId ||
        job.providerId !== row.providerId
      )
        throw new Error('Creation revocation target is invalid')
    }
  }
}
