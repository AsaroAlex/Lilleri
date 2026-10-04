import type { Database } from '@lilleri/database'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { syncIdentities, syncIdentityAliases, syncIdentityEvents } from './sync-identity-schema.js'

const id = z.string().min(1).max(200),
  at = z.string().datetime({ offset: true }),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  ordinal = z.number().int().positive().nullable(),
  revision = z.number().int().nonnegative(),
  owned = { profileId: id, connectionId: id, accountId: id, transactionId: id }
export const syncIdentityOwnershipDto = z.object({
  identities: z
    .array(
      z
        .object({
          ...owned,
          providerId: id,
          originConsentId: id,
          originRenewalRevision: revision,
          fingerprint,
          ordinal,
          createdAt: at,
        })
        .strict(),
    )
    .default([]),
  identityAliases: z
    .array(
      z
        .object({
          ...owned,
          providerId: id,
          consentId: id,
          renewalRevision: revision,
          providerRecordId: id,
          createdAt: at,
        })
        .strict(),
    )
    .default([]),
  identityEvents: z
    .array(
      z
        .object({
          ...owned,
          id,
          consentId: id,
          renewalRevision: revision,
          jobId: id,
          kind: z.enum(['no_id_ordinal', 'provider_id_changed']),
          providerRecordId: id.nullable(),
          fingerprint,
          ordinal,
          createdAt: at,
        })
        .strict(),
    )
    .default([]),
})
const strip = <T extends { householdId: string }>(value: T) => {
  const { householdId: _householdId, ...rest } = value
  return rest
}
export async function syncIdentityOwnershipExport(db: Database, profileId: string) {
  const identities = await db
    .select()
    .from(syncIdentities)
    .where(eq(syncIdentities.profileId, profileId))
    .orderBy(asc(syncIdentities.transactionId))
  const aliases = await db
    .select()
    .from(syncIdentityAliases)
    .where(eq(syncIdentityAliases.profileId, profileId))
    .orderBy(
      asc(syncIdentityAliases.transactionId),
      asc(syncIdentityAliases.consentId),
      asc(syncIdentityAliases.renewalRevision),
      asc(syncIdentityAliases.providerRecordId),
    )
  const events = await db
    .select()
    .from(syncIdentityEvents)
    .where(eq(syncIdentityEvents.profileId, profileId))
    .orderBy(asc(syncIdentityEvents.createdAt), asc(syncIdentityEvents.id))
  return syncIdentityOwnershipDto.parse({
    identities: identities.map(strip),
    identityAliases: aliases.map(strip),
    identityEvents: events.map(strip),
  })
}
