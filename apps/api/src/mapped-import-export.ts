import type { Database } from '@lilleri/database'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { ProfileEncryption } from './encryption.js'
import { digestSchema, identifier, revision, savedCsvMappingDto } from './mapped-import-dto.js'
import {
  csvMappingEvents,
  mappedImportProvenance,
  savedCsvMappings,
} from './mapped-import-schema.js'

export const csvMappingEventDto = z.strictObject({
  id: identifier,
  profileId: identifier,
  accountId: identifier,
  mappingId: identifier,
  revision,
  action: z.enum(['created', 'updated', 'archived', 'restored']),
  before: savedCsvMappingDto.nullable(),
  after: savedCsvMappingDto,
  createdAt: z.string(),
})
export const mappedProvenanceDto = z.strictObject({
  profileId: identifier,
  accountId: identifier,
  observationId: identifier,
  transactionId: identifier,
  fileDigest: digestSchema,
  mappingDigest: digestSchema,
  rowNumber: z.number().int().positive(),
  identity: z.enum(['external', 'file_content_ordinal']),
  fileFormat: z.literal('xlsx').optional(),
  workbookDigest: digestSchema.optional(),
  worksheet: z.string().min(1).max(128).optional(),
  headerRow: z.number().int().min(1).max(100).optional(),
  valueOn: z.string().nullable(),
  createdAt: z.string(),
})
export const mappedImportAuditDto = z.strictObject({
  mappings: z.array(savedCsvMappingDto),
  events: z.array(csvMappingEventDto),
  provenance: z.array(mappedProvenanceDto),
})
/** Caller owns the profile-scoped snapshot transaction; no nested transaction or service dependency. */
export async function exportMappedImportAudit(
  db: Database,
  profileId: string,
  encryption?: ProfileEncryption,
) {
  const mappings = []
  for (const row of await db
    .select()
    .from(savedCsvMappings)
    .where(eq(savedCsvMappings.profileId, profileId))
    .orderBy(asc(savedCsvMappings.createdAt), asc(savedCsvMappings.id))) {
    const mapping = encryption
      ? await encryption.decryptJson(
          db,
          { profileId, table: 'saved_csv_mappings', column: 'definition', rowId: row.id },
          String(row.definition._lilleriEncrypted),
        )
      : row.definition
    const name = encryption
      ? await encryption.decryptText(
          db,
          { profileId, table: 'saved_csv_mappings', column: 'name', rowId: row.id },
          row.name,
        )
      : row.name
    mappings.push(
      savedCsvMappingDto.parse({
        id: row.id,
        profileId: row.profileId,
        accountId: row.accountId,
        name,
        mapping,
        revision: row.revision,
        archived: row.archived,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    )
  }
  const events = []
  for (const row of await db
    .select()
    .from(csvMappingEvents)
    .where(eq(csvMappingEvents.profileId, profileId))
    .orderBy(asc(csvMappingEvents.createdAt), asc(csvMappingEvents.id))) {
    const snapshot = encryption
      ? await encryption.decryptJson<{ before: unknown; after: unknown }>(
          db,
          { profileId, table: 'csv_mapping_events', column: 'snapshot', rowId: row.id },
          String(row.snapshot._lilleriEncrypted),
        )
      : row.snapshot
    events.push(
      csvMappingEventDto.parse({
        id: row.id,
        profileId: row.profileId,
        accountId: row.accountId,
        mappingId: row.mappingId,
        revision: row.revision,
        action: row.action,
        before: snapshot.before,
        after: snapshot.after,
        createdAt: row.createdAt,
      }),
    )
  }
  const provenance = []
  for (const row of await db
    .select()
    .from(mappedImportProvenance)
    .where(eq(mappedImportProvenance.profileId, profileId))
    .orderBy(asc(mappedImportProvenance.createdAt), asc(mappedImportProvenance.observationId))) {
    const { householdId: _householdId, ...fields } = row
    const { fileFormat, workbookDigest, worksheet, headerRow, ...legacy } = fields
    provenance.push(
      mappedProvenanceDto.parse(
        [fileFormat, workbookDigest, worksheet, headerRow].every((value) => value === null)
          ? legacy
          : fields,
      ),
    )
  }
  return mappedImportAuditDto.parse({ mappings, events, provenance })
}
