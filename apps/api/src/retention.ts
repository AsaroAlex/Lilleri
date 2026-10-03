import { type Database, schema } from '@lilleri/database'
import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm'
import { EncryptionFailure, type ProfileEncryption } from './encryption.js'
import { payloadContext, withoutHousehold } from './financial-storage.js'

/** The synthetic successful-ingest policy has no automatic exception/extension. */
export const RAW_PAYLOAD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function retentionInstant(value: string): string {
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) throw new Error('Invalid retention clock')
  return new Date(milliseconds).toISOString()
}
const instant = retentionInstant

/** Call inside the ingestion transaction; only a genuinely new observation gets raw content. */
export async function insertSourceObservation(
  db: Database,
  observation: typeof schema.observations.$inferInsert,
  payload: Record<string, unknown>,
  encryption?: ProfileEncryption,
): Promise<boolean> {
  const expiresAt = new Date(
    Date.parse(instant(observation.observedAt)) + RAW_PAYLOAD_RETENTION_MS,
  ).toISOString()
  const [inserted] = await db
    .insert(schema.observations)
    .values(observation)
    .onConflictDoNothing()
    .returning({ id: schema.observations.id })
  if (!inserted) return false
  await db.insert(schema.observationPayloads).values({
    profileId: observation.profileId,
    observationId: inserted.id,
    expiresAt,
    payload: encryption
      ? {
          _lilleriEncrypted: await encryption.encryptJson(
            db,
            payloadContext(observation.profileId, inserted.id),
            payload,
          ),
        }
      : payload,
  })
  return true
}

/** Metadata remains exportable; expired raw content is excluded even before physical cleanup. */
export async function sourceObservationsForExport(
  db: Database,
  profileId: string,
  now: string,
  encryption?: ProfileEncryption,
) {
  const current = instant(now)
  const rows = await db
    .select({ observation: schema.observations, content: schema.observationPayloads })
    .from(schema.observations)
    .leftJoin(
      schema.observationPayloads,
      and(
        eq(schema.observationPayloads.profileId, schema.observations.profileId),
        eq(schema.observationPayloads.observationId, schema.observations.id),
        gt(schema.observationPayloads.expiresAt, current),
      ),
    )
    .where(eq(schema.observations.profileId, profileId))
    .orderBy(asc(schema.observations.id))
  const results = []
  for (const { observation, content } of rows) {
    const metadata = withoutHousehold(observation)
    if (!content) {
      results.push(metadata)
      continue
    }
    let payload = content.payload
    if (encryption) {
      if (Object.keys(payload).length !== 1 || typeof payload._lilleriEncrypted !== 'string')
        throw new EncryptionFailure()
      payload = await encryption.decryptJson<Record<string, unknown>>(
        db,
        payloadContext(profileId, observation.id),
        payload._lilleriEncrypted,
      )
    }
    results.push({ ...metadata, payload, payloadExpiresAt: instant(content.expiresAt) })
  }
  return results
}

/** One scoped, bounded local cleanup batch. A caller schedules/repeats it explicitly. */
export async function cleanupExpiredObservationPayloads(
  db: Database,
  profileId: string,
  now: string,
  limit = 100,
): Promise<{ deleted: number }> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new Error('Retention batch limit must be an integer between 1 and 1000')
  const current = instant(now)
  return db.transaction(async (tx) => {
    await tx
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, profileId))
      .for('update')
    const expired = await tx
      .select({ id: schema.observationPayloads.observationId })
      .from(schema.observationPayloads)
      .where(
        and(
          eq(schema.observationPayloads.profileId, profileId),
          lte(schema.observationPayloads.expiresAt, current),
        ),
      )
      .orderBy(
        asc(schema.observationPayloads.expiresAt),
        asc(schema.observationPayloads.observationId),
      )
      .limit(limit)
    if (!expired.length) return { deleted: 0 }
    const deleted = await tx
      .delete(schema.observationPayloads)
      .where(
        and(
          eq(schema.observationPayloads.profileId, profileId),
          inArray(
            schema.observationPayloads.observationId,
            expired.map(({ id }) => id),
          ),
          lte(schema.observationPayloads.expiresAt, current),
        ),
      )
      .returning({ id: schema.observationPayloads.observationId })
    return { deleted: deleted.length }
  })
}
