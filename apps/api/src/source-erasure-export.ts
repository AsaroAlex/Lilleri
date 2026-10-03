import { z } from 'zod'
import { type SignedSourceErasure, signedSourceErasureDto } from './source-erasure-dto.js'
export const sourceErasureOwnedDto = z.strictObject({
  signed: signedSourceErasureDto,
  appliedAt: z.iso.datetime().refine((value) => new Date(value).toISOString() === value),
})
export const sourceErasureOwnershipSchemas = {
  sourceErasures: z.array(sourceErasureOwnedDto),
} as const
export type SourceErasureVerifier = (input: unknown) => SignedSourceErasure
export interface AttestedSourceReferences {
  readonly accounts: ReadonlyMap<
    string,
    { profileId: string; connectionId: string; erasedAt: string }
  >
  readonly transactions: ReadonlyMap<
    string,
    { profileId: string; connectionId: string; accountId: string; erasedAt: string }
  >
  readonly observations: ReadonlyMap<
    string,
    { profileId: string; connectionId: string; accountId: string; erasedAt: string }
  >
}
export function validateSourceErasureOwnershipExport(
  snapshot: {
    profile: { id: string }
    exportedAt: string
    accounts: readonly { id: string; profileId: string; connectionId: string }[]
    transactions: readonly {
      id: string
      profileId: string
      connectionId: string
      accountId: string
    }[]
    sourceObservations?: readonly {
      id: string
      profileId: string
      connectionId: string
      accountId: string
    }[]
    sourceErasures?: unknown
  },
  verify?: SourceErasureVerifier,
): AttestedSourceReferences {
  const accounts = new Map<string, { profileId: string; connectionId: string; erasedAt: string }>(),
    transactions = new Map<
      string,
      { profileId: string; connectionId: string; accountId: string; erasedAt: string }
    >(),
    observations = new Map<
      string,
      { profileId: string; connectionId: string; accountId: string; erasedAt: string }
    >()
  const rows =
    snapshot.sourceErasures === undefined
      ? []
      : sourceErasureOwnershipSchemas.sourceErasures.parse(snapshot.sourceErasures)
  if (rows.length && !verify)
    throw new Error('Source erasure ownership requires a current trusted verifier')
  const seen = new Set<string>(),
    seenGenerations = new Set<string>()
  const actualAccounts = new Map(snapshot.accounts.map((row) => [row.id, row])),
    actualTx = new Map(snapshot.transactions.map((row) => [row.id, row])),
    actualObs = new Map((snapshot.sourceObservations ?? []).map((row) => [row.id, row]))
  const fail = () => {
    throw new Error('Source erasure ownership is invalid')
  }
  const exportedAt = Date.parse(snapshot.exportedAt)
  // Export V1 metadata accepts ISO offsets. Signed receipt clocks remain canonical UTC.
  if (
    !z.iso.datetime({ offset: true }).safeParse(snapshot.exportedAt).success ||
    !Number.isFinite(exportedAt)
  )
    fail()
  const chains = new Map<string, { revision: number; erasedAt: string; appliedAt: string }>()
  for (const row of [...rows].sort(
    (a, b) =>
      a.signed.body.connectionId.localeCompare(b.signed.body.connectionId) ||
      a.signed.body.revision - b.signed.body.revision,
  )) {
    if (!verify) fail()
    const signed = verify?.(row.signed)
    if (!signed) fail()
    const body = (signed as SignedSourceErasure).body,
      generation = JSON.stringify([body.connectionId, body.revision])
    if (
      body.profileId !== snapshot.profile.id ||
      seen.has(body.id) ||
      seenGenerations.has(generation) ||
      row.appliedAt < body.erasedAt ||
      Date.parse(row.appliedAt) > exportedAt
    )
      fail()
    const previous = chains.get(body.connectionId)
    if (
      body.revision !== (previous?.revision ?? 0) + 1 ||
      (previous && (body.erasedAt < previous.erasedAt || row.appliedAt < previous.appliedAt))
    )
      fail()
    chains.set(body.connectionId, {
      revision: body.revision,
      erasedAt: body.erasedAt,
      appliedAt: row.appliedAt,
    })
    seen.add(body.id)
    seenGenerations.add(generation)
    for (const id of body.accountIds) {
      const actual = actualAccounts.get(id)
      if (
        actual &&
        (actual.profileId !== body.profileId || actual.connectionId !== body.connectionId)
      )
        fail()
      const prior = accounts.get(id)
      if (prior && prior.connectionId !== body.connectionId) fail()
      accounts.set(id, {
        profileId: body.profileId,
        connectionId: body.connectionId,
        erasedAt: prior && prior.erasedAt > body.erasedAt ? prior.erasedAt : body.erasedAt,
      })
    }
    for (const [refs, map, actualRows] of [
      [body.transactions, transactions, actualTx],
      [body.observations, observations, actualObs],
    ] as const)
      for (const ref of refs) {
        const actual = actualRows.get(ref.id),
          prior = map.get(ref.id)
        if (
          actual &&
          (actual.profileId !== body.profileId ||
            actual.connectionId !== body.connectionId ||
            actual.accountId !== ref.accountId)
        )
          fail()
        if (
          prior &&
          (prior.connectionId !== body.connectionId || prior.accountId !== ref.accountId)
        )
          fail()
        map.set(ref.id, {
          profileId: body.profileId,
          connectionId: body.connectionId,
          accountId: ref.accountId,
          erasedAt: prior && prior.erasedAt > body.erasedAt ? prior.erasedAt : body.erasedAt,
        })
      }
  }
  return { accounts, transactions, observations }
}
