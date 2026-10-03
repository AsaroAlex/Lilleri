import { z } from 'zod'

const id = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !value.includes('\0'))
const instant = z.iso.datetime().refine((value) => new Date(value).toISOString() === value)
const digest = z.string().regex(/^[a-f0-9]{64}$/)
export const sourceFactReferenceDto = z.strictObject({ id, accountId: id })
export const sourceErasureReceiptDto = z.strictObject({
  format: z.literal('lilleri.source-erasure.v1'),
  id: z.uuid(),
  profileId: id,
  connectionId: id,
  revision: z.number().int().min(1).max(2147483646),
  erasedAt: instant,
  profileKeyId: id,
  accountIds: z.array(id).max(100000),
  transactions: z.array(sourceFactReferenceDto).max(100000),
  observations: z.array(sourceFactReferenceDto).max(500000),
  consentIds: z.array(id).max(10000),
  revocationJobs: z
    .array(
      z.strictObject({
        id,
        profileId: id,
        connectionId: id,
        providerId: id,
        consentId: id,
        createdAt: instant,
      }),
    )
    .max(10000),
  manualCommandIds: z.array(id).max(100000),
  manualCommands: z.array(sourceFactReferenceDto).max(100000),
  creationIntents: z
    .array(z.strictObject({ id, providerId: id, connectionId: id, consentId: id }))
    .max(10000),
  localDeletion: z.literal('row-erasure-with-mandatory-restore-replay'),
  sourceKeyErasure: z.literal('shared-profile-key-retained'),
})
export const signedSourceErasureDto = z.strictObject({
  body: sourceErasureReceiptDto,
  keyId: digest,
  signature: digest,
})
export type SourceErasureReceipt = z.infer<typeof sourceErasureReceiptDto>
export type SignedSourceErasure = z.infer<typeof signedSourceErasureDto>
export const sourceFactProofDto = z.strictObject({
  body: z.strictObject({
    profileId: id,
    connectionId: id,
    consentId: id.nullable(),
    kind: z.enum(['account', 'transaction', 'observation', 'manual_command']),
    subjectId: id,
    accountId: id,
    erasureRevision: z.number().int().min(0).max(2147483646),
    recordedAt: instant,
    contentDigest: digest,
    payloadDigest: digest.nullable(),
  }),
  keyId: digest,
  signature: digest,
})
export type SourceFactProof = z.infer<typeof sourceFactProofDto>
export const sourceErasureAnchorDto = z.strictObject({
  format: z.literal('lilleri.source-erasure-anchor.v1'),
  profileId: id,
  receiptId: z.uuid(),
  journalKeyId: digest,
  digest,
})
export type SourceErasureAnchor = z.infer<typeof sourceErasureAnchorDto>
export function assertSourceReceipt(body: SourceErasureReceipt) {
  const unique = (rows: readonly { id: string }[]) =>
    new Set(rows.map((row) => row.id)).size === rows.length
  const accounts = new Set(body.accountIds)
  if (
    accounts.size !== body.accountIds.length ||
    !unique(body.transactions) ||
    !unique(body.observations) ||
    new Set(body.consentIds).size !== body.consentIds.length ||
    !unique(body.revocationJobs) ||
    !unique(body.creationIntents) ||
    new Set(body.manualCommandIds).size !== body.manualCommandIds.length ||
    !unique(body.manualCommands) ||
    body.manualCommands.length !== body.manualCommandIds.length ||
    body.manualCommands.some(
      (row) => !body.manualCommandIds.includes(row.id) || !accounts.has(row.accountId),
    ) ||
    body.creationIntents.some((row) => row.connectionId !== body.connectionId) ||
    [...body.transactions, ...body.observations].some((row) => !accounts.has(row.accountId)) ||
    body.revocationJobs.some(
      (row) =>
        row.profileId !== body.profileId ||
        row.connectionId !== body.connectionId ||
        !body.consentIds.includes(row.consentId) ||
        row.createdAt > body.erasedAt,
    )
  )
    throw new Error('Source erasure receipt is invalid')
}
export function canonicalSourceValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSourceValue).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalSourceValue(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
