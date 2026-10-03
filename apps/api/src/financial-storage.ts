import { type Database, schema } from '@lilleri/database'
import { eq, sql } from 'drizzle-orm'
import { isEncryptedText, type ProfileEncryption } from './encryption.js'
import { profileEncryptionKeys } from './encryption-schema.js'
import { manualBalanceEvents } from './manual-schema.js'
import { csvMappingEvents, savedCsvMappings } from './mapped-import-schema.js'

export const payloadContext = (profileId: string, observationId: string) => ({
  profileId,
  table: 'source_observation_payloads',
  column: 'payload',
  rowId: observationId,
})
export const manualReasonContext = (profileId: string, eventId: string) => ({
  profileId,
  table: 'manual_balance_events',
  column: 'reason',
  rowId: eventId,
})
export function withoutHousehold<T extends { householdId: string }>(row: T) {
  const { householdId: _householdId, ...fields } = row
  return fields
}

/** Explicit upgrade before serving. Normal reads never fall back to interpreting ciphertext as text. */
export async function upgradeFinancialEncryption(db: Database, encryption: ProfileEncryption) {
  return db.transaction(async (tx) => {
    // Serialize trusted startup upgrades with other API starts on PostgreSQL.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(714589102)`)
    // Classify the legacy boundary before creating any keys. Prefix-like user text is valid input.
    const keyedProfiles = new Set(
      (await tx.select().from(profileEncryptionKeys)).map((row) => row.profileId),
    )
    const transactions = await tx.select().from(schema.transactions)
    let upgradedTransactions = 0
    for (const row of transactions) {
      const change: Partial<typeof row> = {}
      for (const column of ['description', 'merchantName', 'reference'] as const) {
        const value = row[column]
        const context = {
          profileId: row.profileId,
          table: 'transactions',
          column: column === 'merchantName' ? 'merchant_name' : column,
          rowId: row.id,
        }
        if (value !== null && keyedProfiles.has(row.profileId) && isEncryptedText(value)) {
          await encryption.decryptText(tx, context, value)
          continue
        }
        if (value !== null) change[column] = await encryption.encryptText(tx, context, value)
      }
      if (Object.keys(change).length) {
        await tx.update(schema.transactions).set(change).where(eq(schema.transactions.id, row.id))
        upgradedTransactions++
      }
    }
    const payloads = await tx.select().from(schema.observationPayloads)
    let upgradedPayloads = 0
    for (const row of payloads) {
      if (keyedProfiles.has(row.profileId) && Object.hasOwn(row.payload, '_lilleriEncrypted')) {
        if (
          Object.keys(row.payload).length !== 1 ||
          typeof row.payload._lilleriEncrypted !== 'string'
        )
          throw new Error('Encrypted payload envelope is invalid')
        await encryption.decryptJson(
          tx,
          payloadContext(row.profileId, row.observationId),
          row.payload._lilleriEncrypted,
        )
        continue
      }
      await tx
        .update(schema.observationPayloads)
        .set({
          payload: {
            _lilleriEncrypted: await encryption.encryptJson(
              tx,
              payloadContext(row.profileId, row.observationId),
              row.payload,
            ),
          },
        })
        .where(eq(schema.observationPayloads.observationId, row.observationId))
      upgradedPayloads++
    }
    const events = await tx.select().from(manualBalanceEvents)
    const mappings = await tx.select().from(savedCsvMappings)
    for (const row of mappings) {
      const context = (column: string) => ({
        profileId: row.profileId,
        table: 'saved_csv_mappings',
        column,
        rowId: row.id,
      })
      const change: Partial<typeof row> = {}
      if (keyedProfiles.has(row.profileId) && isEncryptedText(row.name))
        await encryption.decryptText(tx, context('name'), row.name)
      else change.name = await encryption.encryptText(tx, context('name'), row.name)
      if (keyedProfiles.has(row.profileId) && Object.hasOwn(row.definition, '_lilleriEncrypted')) {
        if (
          Object.keys(row.definition).length !== 1 ||
          typeof row.definition._lilleriEncrypted !== 'string'
        )
          throw new Error('Encrypted mapping envelope is invalid')
        await encryption.decryptJson(tx, context('definition'), row.definition._lilleriEncrypted)
      } else
        change.definition = {
          _lilleriEncrypted: await encryption.encryptJson(
            tx,
            context('definition'),
            row.definition,
          ),
        }
      if (Object.keys(change).length)
        await tx.update(savedCsvMappings).set(change).where(eq(savedCsvMappings.id, row.id))
    }
    const mappingEvents = await tx.select().from(csvMappingEvents)
    const plaintextMappingEvents = []
    for (const row of mappingEvents) {
      const context = {
        profileId: row.profileId,
        table: 'csv_mapping_events',
        column: 'snapshot',
        rowId: row.id,
      }
      if (keyedProfiles.has(row.profileId) && Object.hasOwn(row.snapshot, '_lilleriEncrypted')) {
        if (
          Object.keys(row.snapshot).length !== 1 ||
          typeof row.snapshot._lilleriEncrypted !== 'string'
        )
          throw new Error('Encrypted mapping audit envelope is invalid')
        await encryption.decryptJson(tx, context, row.snapshot._lilleriEncrypted)
      } else plaintextMappingEvents.push(row)
    }
    if (plaintextMappingEvents.length) {
      await tx.execute(
        sql`ALTER TABLE csv_mapping_events DISABLE TRIGGER csv_mapping_event_immutable`,
      )
      for (const row of plaintextMappingEvents)
        await tx
          .update(csvMappingEvents)
          .set({
            snapshot: {
              _lilleriEncrypted: await encryption.encryptJson(
                tx,
                {
                  profileId: row.profileId,
                  table: 'csv_mapping_events',
                  column: 'snapshot',
                  rowId: row.id,
                },
                row.snapshot,
              ),
            },
          })
          .where(eq(csvMappingEvents.id, row.id))
      await tx.execute(
        sql`ALTER TABLE csv_mapping_events ENABLE TRIGGER csv_mapping_event_immutable`,
      )
    }
    const plaintext = []
    for (const row of events) {
      if (keyedProfiles.has(row.profileId) && isEncryptedText(row.reason))
        await encryption.decryptText(tx, manualReasonContext(row.profileId, row.id), row.reason)
      else plaintext.push(row)
    }
    if (plaintext.length) {
      // This trusted, atomic storage upgrade preserves audit contents and every financial field.
      // ALTER takes an exclusive table lock; rollback also restores the enabled trigger.
      await tx.execute(
        sql`ALTER TABLE manual_balance_events DISABLE TRIGGER manual_balance_events_no_update`,
      )
      for (const row of plaintext)
        await tx
          .update(manualBalanceEvents)
          .set({
            reason: await encryption.encryptText(
              tx,
              manualReasonContext(row.profileId, row.id),
              row.reason,
            ),
          })
          .where(eq(manualBalanceEvents.id, row.id))
      await tx.execute(
        sql`ALTER TABLE manual_balance_events ENABLE TRIGGER manual_balance_events_no_update`,
      )
    }
    return {
      transactions: upgradedTransactions,
      payloads: upgradedPayloads,
      auditEvents: plaintext.length + plaintextMappingEvents.length,
    }
  })
}
