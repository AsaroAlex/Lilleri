import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { type CsvMapping, MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { manualAccounts, manualBalanceEvents, manualCommands } from '../src/manual-schema.js'
import { MappedImportService } from '../src/mapped-import.js'
import { exportMappedImportAudit } from '../src/mapped-import-export.js'
import {
  csvMappingEvents,
  mappedImportProvenance,
  savedCsvMappings,
} from '../src/mapped-import-schema.js'
import { cleanupExpiredObservationPayloads, sourceObservationsForExport } from '../src/retention.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle
let encryption: ProfileEncryption
let vault: string
const profiles: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const now = () => '2026-10-03T12:00:00.000Z'
const mapping: CsvMapping = {
  format: 'lilleri.csv-mapping.v1',
  delimiter: ';',
  numberLocale: 'it-IT',
  dateFormat: 'dd/MM/yyyy',
  defaultCurrency: 'EUR',
  columns: { bookedOn: 'Data', valueOn: 'Valuta', amount: 'Importo', description: 'Descrizione' },
}
const csv = 'Data;Valuta;Importo;Descrizione\n02/10/2026;03/10/2026;-12,34;Acquisto sintetico\n'
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  vault = await mkdtemp(join(tmpdir(), 'lilleri-mapped-vault-'))
  const keys = await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' })
  encryption = new ProfileEncryption(handle.db, keys, now)
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const profileId of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle.close()
  await rm(vault, { recursive: true, force: true })
})
async function fixture(clock = now) {
  const profileId = `mapped_${randomUUID()}`
  profiles.push(profileId)
  const provider = new MockItalianProvider()
  const app = await createApp({
    db: handle.db,
    financialScope: handle.withProfile,
    profileId,
    demoMode: true,
    seed: false,
    now: clock,
    provider,
    encryption,
  })
  apps.push(app)
  const response = await app.inject({
    method: 'POST',
    url: '/v1/manual/accounts',
    payload: {
      requestId: randomUUID(),
      name: 'Conto sintetico',
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '10000',
      openingOn: '2026-10-01',
    },
  })
  expect(response.statusCode, response.payload).toBe(201)
  const account = response.json<{ id: string; balanceMinor: string; revision: number }>()
  const source = new DemoService(handle.db, profileId, provider, clock, encryption)
  return { profileId, account, source, mapped: new MappedImportService(source), app }
}
async function counts(profileId: string) {
  const result: Record<string, number> = {}
  for (const [name, table] of [
    ['transactions', schema.transactions],
    ['observations', schema.observations],
    ['payloads', schema.observationPayloads],
    ['commands', manualCommands],
    ['balanceEvents', manualBalanceEvents],
    ['mappings', savedCsvMappings],
    ['mappingEvents', csvMappingEvents],
    ['provenance', mappedImportProvenance],
  ] as const)
    result[name] = (
      await handle.db.select().from(table).where(eq(table.profileId, profileId))
    ).length
  return result
}
function input(accountId: string, text = csv) {
  return { accountId, csv: text, mapping }
}
function command(
  previewRevision: string,
  accountId: string,
  text = csv,
  acknowledgeGeneratedDuplicates = false,
) {
  return {
    ...input(accountId, text),
    previewRevision,
    requestId: randomUUID(),
    acknowledgeGeneratedDuplicates,
  }
}

describe('mapped CSV imports with encrypted provenance and atomic reviewed commits', () => {
  test('preview uses explicit locale and value date without writing records or keys', async () => {
    const f = await fixture(),
      before = await counts(f.profileId)
    const preview = await f.mapped.preview(input(f.account.id))
    expect(preview).toMatchObject({ canImport: true, errors: [], rowCount: 1 })
    expect(preview.rows[0]).toMatchObject({
      record: { amount: '-12.34', source: 'csv', bookedOn: '2026-10-02' },
      provenance: {
        identity: 'file_content_ordinal',
        rawBookedOn: '02/10/2026',
        rawValueOn: '03/10/2026',
        valueOn: '2026-10-03',
        rawFields: { amount: '-12,34' },
      },
    })
    expect(preview.rows[0]?.record.id.length).toBeGreaterThan(128)
    expect(await counts(f.profileId)).toEqual(before)
    expect((await f.mapped.preview(input(f.account.id))).previewRevision).toBe(
      preview.previewRevision,
    )
  })

  test('commit preserves exact amount, original fields and long identity and audits balance atomically', async () => {
    const f = await fixture(),
      preview = await f.mapped.preview(input(f.account.id)),
      request = command(preview.previewRevision, f.account.id)
    expect(await f.mapped.commit(request)).toMatchObject({ inserted: 1, unchanged: 0 })
    const [transaction] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, f.profileId))
    expect(transaction).toMatchObject({
      accountId: f.account.id,
      amountMinor: -1234n,
      source: 'csv',
      revision: 1,
    })
    expect(transaction?.providerTransactionId).toBe(preview.rows[0]?.record.id)
    expect(transaction?.description).toMatch(/^lilleri:v1:/)
    const [account] = await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, f.account.id))
    const [state] = await handle.db
      .select()
      .from(manualAccounts)
      .where(eq(manualAccounts.accountId, f.account.id))
    expect(account?.balanceMinor).toBe(8766n)
    expect(state?.revision).toBe(2)
    const [stored] = await handle.db
      .select()
      .from(schema.observationPayloads)
      .where(eq(schema.observationPayloads.profileId, f.profileId))
    expect(JSON.stringify(stored?.payload)).not.toContain('Acquisto sintetico')
    expect(stored?.payload._lilleriEncrypted).toMatch(/^lilleri:v1:/)
    const observations = await sourceObservationsForExport(
      handle.db,
      f.profileId,
      now(),
      encryption,
    )
    expect(observations[0]).toMatchObject({
      payload: {
        format: 'lilleri.csv-observation.v1',
        provenance: {
          rawFields: { amount: '-12,34', description: 'Acquisto sintetico' },
          valueOn: '2026-10-03',
        },
      },
    })
    const after = await counts(f.profileId)
    expect(await f.mapped.commit(request)).toMatchObject({ inserted: 1 })
    expect(await counts(f.profileId)).toEqual(after)
    expect(
      (
        await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.account.id))
      )[0]?.balanceMinor,
    ).toBe(8766n)
    await expect(
      f.mapped.commit({ ...request, csv: csv.replace('-12,34', '-12,35') }),
    ).rejects.toMatchObject({ code: 'idempotency_key_reused', status: 409 })
  })

  test('same content without identifiers requires review and keeps both purchases distinct', async () => {
    const f = await fixture(),
      duplicate = `${csv}02/10/2026;03/10/2026;-12,34;Acquisto sintetico\n`
    const preview = await f.mapped.preview(input(f.account.id, duplicate)),
      before = await counts(f.profileId)
    expect(preview).toMatchObject({ canImport: false, errors: [] })
    expect(preview.duplicateCandidates).toHaveLength(1)
    expect(new Set(preview.rows.map((row) => row.record.id)).size).toBe(2)
    await expect(
      f.mapped.commit(command(preview.previewRevision, f.account.id, duplicate)),
    ).rejects.toMatchObject({ code: 'import_duplicate_review_required', status: 422 })
    expect(await counts(f.profileId)).toEqual(before)
    expect(
      await f.mapped.commit(command(preview.previewRevision, f.account.id, duplicate, true)),
    ).toMatchObject({ inserted: 2 })
    expect((await counts(f.profileId)).transactions).toBe(2)
    expect(
      (
        await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.account.id))
      )[0]?.balanceMinor,
    ).toBe(7532n)
  })

  test('reimport with a fresh preview and request preserves generated identity without changing balance or audit', async () => {
    const f = await fixture(),
      preview = await f.mapped.preview(input(f.account.id))
    await f.mapped.commit(command(preview.previewRevision, f.account.id))
    const before = await counts(f.profileId),
      fresh = await f.mapped.preview(input(f.account.id))
    expect(fresh.previewRevision).not.toBe(preview.previewRevision)
    expect(await f.mapped.commit(command(fresh.previewRevision, f.account.id))).toMatchObject({
      inserted: 0,
      unchanged: 1,
    })
    const after = await counts(f.profileId)
    expect(after).toEqual({ ...before, commands: (before.commands ?? 0) + 1 })
    expect(
      (
        await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.account.id))
      )[0]?.balanceMinor,
    ).toBe(8766n)
  })

  test('mapped external identifiers remain compatible with the existing canonical importer', async () => {
    const f = await fixture(),
      externalMapping: CsvMapping = {
        ...mapping,
        columns: {
          externalId: 'ID',
          bookedOn: 'Data',
          amount: 'Importo',
          description: 'Descrizione',
        },
      }
    const request = {
      accountId: f.account.id,
      csv: 'ID;Data;Importo;Descrizione\nshared;02/10/2026;-12,34;Acquisto sintetico\n',
      mapping: externalMapping,
    }
    const preview = await f.mapped.preview(request)
    await f.mapped.commit({
      ...request,
      previewRevision: preview.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
    })
    expect(
      await f.source.importCsv(
        f.account.id,
        'id,date,amount,currency,description,merchant,reference\nshared,2026-10-02,-12.34,EUR,Acquisto sintetico,,\n',
      ),
    ).toMatchObject({ inserted: 0, unchanged: 1 })
    expect((await counts(f.profileId)).transactions).toBe(1)
    expect(
      (
        await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.account.id))
      )[0]?.balanceMinor,
    ).toBe(8766n)
  })

  test('rejects a stale preview under the profile lock after account or ledger changes', async () => {
    const f = await fixture(),
      initial = await f.mapped.preview(input(f.account.id))
    await handle.db
      .update(schema.accounts)
      .set({ balanceUpdatedAt: '2026-10-03T12:01:00.000Z' })
      .where(eq(schema.accounts.id, f.account.id))
    const before = await counts(f.profileId)
    await expect(
      f.mapped.commit(command(initial.previewRevision, f.account.id)),
    ).rejects.toMatchObject({ code: 'import_preview_stale', status: 409 })
    expect(await counts(f.profileId)).toEqual(before)
    const fresh = await f.mapped.preview(input(f.account.id))
    await f.source.importCsv(
      f.account.id,
      'id,date,amount,currency,description,merchant,reference\ncanonical,2026-10-02,-1.00,EUR,Sintetico,,\n',
    )
    const after = await counts(f.profileId)
    await expect(
      f.mapped.commit(command(fresh.previewRevision, f.account.id)),
    ).rejects.toMatchObject({ code: 'import_preview_stale' })
    expect(await counts(f.profileId)).toEqual(after)
  })

  test('concurrent commits with one preview allow one mutation and reject the other as stale', async () => {
    const f = await fixture(),
      preview = await f.mapped.preview(input(f.account.id))
    const results = await Promise.allSettled([
      f.mapped.commit(command(preview.previewRevision, f.account.id)),
      f.mapped.commit(command(preview.previewRevision, f.account.id)),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'import_preview_stale' },
    })
    expect((await counts(f.profileId)).transactions).toBe(1)
    expect((await counts(f.profileId)).provenance).toBe(1)
  })

  test('saved mappings are encrypted, versioned, immutable in history and bind the preview revision', async () => {
    const f = await fixture(),
      saved = await f.mapped.create({
        accountId: f.account.id,
        name: 'Mappatura sintetica',
        mapping,
      })
    expect(saved).toMatchObject({ revision: 1, archived: false, mapping })
    const [row] = await handle.db
      .select()
      .from(savedCsvMappings)
      .where(eq(savedCsvMappings.id, saved.id))
    expect(row?.name).toMatch(/^lilleri:v1:/)
    expect(JSON.stringify(row?.definition)).not.toContain('Descrizione')
    const savedInput = { accountId: f.account.id, csv, mappingId: saved.id }
    const preview = await f.mapped.preview(savedInput)
    await f.mapped.update(saved.id, { revision: 1, name: 'Nome aggiornato' })
    await expect(f.mapped.update(saved.id, { revision: 1, archived: true })).rejects.toMatchObject({
      status: 409,
    })
    await expect(
      f.mapped.commit({
        ...savedInput,
        previewRevision: preview.previewRevision,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: false,
      }),
    ).rejects.toMatchObject({ code: 'import_preview_stale' })
    const audit = await exportMappedImportAudit(handle.db, f.profileId, encryption)
    expect(audit.events).toHaveLength(2)
    expect(audit.events.find((event) => event.revision === 2)).toMatchObject({
      action: 'updated',
      before: { name: 'Mappatura sintetica' },
      after: { name: 'Nome aggiornato' },
    })
    expect(JSON.stringify(audit)).not.toContain('householdId')
    await expect(
      handle.db
        .update(csvMappingEvents)
        .set({ action: 'archived' })
        .where(eq(csvMappingEvents.mappingId, saved.id)),
    ).rejects.toThrow()
    await expect(
      handle.db.delete(csvMappingEvents).where(eq(csvMappingEvents.mappingId, saved.id)),
    ).rejects.toThrow()
  })

  test('mapping transitions with an advancing clock retain one audit instant and export both owned formats without changing the ledger', async () => {
    let tick = Date.parse(now())
    const clock = () => {
      tick += 1_000
      return new Date(tick).toISOString()
    }
    const f = await fixture(clock),
      preview = await f.mapped.preview(input(f.account.id))
    await f.mapped.commit(command(preview.previewRevision, f.account.id))
    const ledger = await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, f.profileId)),
      accounts = await handle.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, f.profileId)),
      observations = await handle.db
        .select()
        .from(schema.observations)
        .where(eq(schema.observations.profileId, f.profileId))
    const created = await f.app.inject({
      method: 'POST',
      url: '/v1/import-mappings',
      payload: { accountId: f.account.id, name: 'Mappatura con orologio reale', mapping },
    })
    expect(created.statusCode, created.payload).toBe(200)
    const saved = created.json<{ id: string; revision: number }>()
    for (const [revision, changes] of [
      [saved.revision, { name: 'Mappatura aggiornata' }],
      [saved.revision + 1, { archived: true }],
      [saved.revision + 2, { archived: false }],
    ] as const) {
      const response = await f.app.inject({
        method: 'PATCH',
        url: `/v1/import-mappings/${saved.id}`,
        payload: { revision, ...changes },
      })
      expect(response.statusCode, response.payload).toBe(200)
    }
    const audit = await exportMappedImportAudit(handle.db, f.profileId, encryption)
    expect(audit.events.map((event) => event.action)).toEqual([
      'created',
      'updated',
      'archived',
      'restored',
    ])
    expect(new Set(audit.events.map((event) => event.createdAt)).size).toBe(4)
    for (const event of audit.events) expect(event.createdAt).toBe(event.after.updatedAt)
    const json = await f.app.inject({ url: '/v1/export' })
    expect(json.statusCode, json.payload).toBe(200)
    expect(json.json().mappedImports).toEqual(audit)
    const archive = await f.app.inject({ url: '/v1/export/archive' })
    expect(archive.statusCode, archive.payload).toBe(200)
    const files = unzipSync(archive.rawPayload),
      data = files['data.json']
    expect(data).toBeDefined()
    if (!data) throw new Error('Owned ZIP archive is missing data.json')
    expect(JSON.parse(strFromU8(data)).mappedImports).toEqual(audit)
    expect(
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, f.profileId)),
    ).toEqual(ledger)
    expect(
      await handle.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.profileId, f.profileId)),
    ).toEqual(accounts)
    expect(
      await handle.db
        .select()
        .from(schema.observations)
        .where(eq(schema.observations.profileId, f.profileId)),
    ).toEqual(observations)
  })

  test('repeats a successful receipt even after its saved mapping is archived', async () => {
    const f = await fixture(),
      saved = await f.mapped.create({ accountId: f.account.id, name: 'Riutilizzabile', mapping })
    const savedInput = { accountId: f.account.id, csv, mappingId: saved.id },
      preview = await f.mapped.preview(savedInput)
    const request = {
      ...savedInput,
      previewRevision: preview.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
    }
    const result = await f.mapped.commit(request)
    await f.mapped.update(saved.id, { revision: 1, archived: true })
    await expect(f.mapped.preview(savedInput)).rejects.toMatchObject({ status: 404 })
    expect(await f.mapped.commit(request)).toEqual(result)
    expect((await counts(f.profileId)).transactions).toBe(1)
  })

  test('foreign mapping and account identifiers remain unavailable and database scope filters all mapping history', async () => {
    const f = await fixture(),
      foreign = await fixture()
    const owned = await f.mapped.create({ accountId: f.account.id, name: 'Locale', mapping })
    const other = await foreign.mapped.create({
      accountId: foreign.account.id,
      name: 'Altro',
      mapping,
    })
    await expect(
      f.mapped.preview({ accountId: f.account.id, csv, mappingId: other.id }),
    ).rejects.toMatchObject({ status: 404 })
    await expect(f.mapped.preview(input(foreign.account.id))).rejects.toMatchObject({ status: 404 })
    await expect(f.mapped.update(other.id, { revision: 1, archived: true })).rejects.toMatchObject({
      status: 404,
    })
    await handle.withProfile(f.profileId, async (db) => {
      expect((await db.select().from(savedCsvMappings)).map((row) => row.id)).toEqual([owned.id])
      expect((await db.select().from(csvMappingEvents)).map((row) => row.mappingId)).toEqual([
        owned.id,
      ])
      expect(
        await db
          .update(savedCsvMappings)
          .set({ archived: true })
          .where(eq(savedCsvMappings.id, other.id))
          .returning(),
      ).toEqual([])
      await expect(
        db.insert(savedCsvMappings).values({
          id: `foreign_${randomUUID()}`,
          profileId: f.profileId,
          accountId: foreign.account.id,
          name: 'Invalida',
          definition: {},
          revision: 1,
          createdAt: now(),
          updatedAt: now(),
        }),
      ).rejects.toThrow()
    })
  })

  test('invalid rows and currency conflicts expose codes without partial imports or financial cells in errors', async () => {
    const f = await fixture(),
      invalid = `${csv}31/02/2026;03/10/2026;-5,00;CELLA_PRIVATA_DA_NON_ECHEGGIARE\n`
    const preview = await f.mapped.preview(input(f.account.id, invalid)),
      before = await counts(f.profileId)
    expect(preview.rows).toEqual([])
    expect(preview.errors.length).toBeGreaterThan(0)
    expect(JSON.stringify(preview.errors)).not.toContain('CELLA_PRIVATA')
    await expect(
      f.mapped.commit(command(preview.previewRevision, f.account.id, invalid)),
    ).rejects.toMatchObject({ code: 'invalid_csv_mapping' })
    expect(await counts(f.profileId)).toEqual(before)
    const wrongCurrency = await f.mapped.preview({
      ...input(f.account.id),
      mapping: { ...mapping, defaultCurrency: 'USD' },
    })
    expect(wrongCurrency).toMatchObject({
      rows: [],
      canImport: false,
      errors: [{ code: 'account_currency_mismatch' }],
    })
  })

  test('value date provenance survives raw payload expiry and history is erased with its profile', async () => {
    const f = await fixture(),
      saved = await f.mapped.create({ accountId: f.account.id, name: 'Da cancellare', mapping })
    const preview = await f.mapped.preview(input(f.account.id))
    await f.mapped.commit(command(preview.previewRevision, f.account.id))
    expect(
      await cleanupExpiredObservationPayloads(handle.db, f.profileId, '2026-11-03T12:00:00.000Z'),
    ).toEqual({ deleted: 1 })
    expect(
      (await exportMappedImportAudit(handle.db, f.profileId, encryption)).provenance[0],
    ).toMatchObject({ valueOn: '2026-10-03', identity: 'file_content_ordinal' })
    await expect(
      handle.db
        .delete(mappedImportProvenance)
        .where(eq(mappedImportProvenance.profileId, f.profileId)),
    ).rejects.toThrow()
    await f.source.erase()
    expect((await counts(f.profileId)).mappings).toBe(0)
    expect((await counts(f.profileId)).mappingEvents).toBe(0)
    expect((await counts(f.profileId)).provenance).toBe(0)
    await f.source.bootstrap(true)
    expect(
      await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, f.profileId)),
    ).toEqual([])
    await expect(f.mapped.preview(input(f.account.id))).rejects.toMatchObject({ status: 404 })
    expect(
      await handle.db.select().from(savedCsvMappings).where(eq(savedCsvMappings.id, saved.id)),
    ).toEqual([])
  })

  test('a provenance failure rolls back ledger, observations, command receipt and manual balance together', async () => {
    const f = await fixture(),
      preview = await f.mapped.preview(input(f.account.id)),
      before = await counts(f.profileId)
    await handle.db.execute(
      sql`CREATE FUNCTION synthetic_mapped_provenance_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic provenance persistence unavailable'; END; $$`,
    )
    await handle.db.execute(
      sql`CREATE TRIGGER synthetic_mapped_provenance_failure BEFORE INSERT ON mapped_import_provenance FOR EACH ROW EXECUTE FUNCTION synthetic_mapped_provenance_failure()`,
    )
    try {
      await expect(
        f.mapped.commit(command(preview.previewRevision, f.account.id)),
      ).rejects.toThrow()
      expect(await counts(f.profileId)).toEqual(before)
      expect(
        (
          await handle.db.select().from(schema.accounts).where(eq(schema.accounts.id, f.account.id))
        )[0]?.balanceMinor,
      ).toBe(10000n)
    } finally {
      await handle.db.execute(
        sql`DROP TRIGGER synthetic_mapped_provenance_failure ON mapped_import_provenance`,
      )
      await handle.db.execute(sql`DROP FUNCTION synthetic_mapped_provenance_failure()`)
    }
  })

  test('actual HTTP routes validate strict bodies, expose layout and fence stale commits within financial scope', async () => {
    const f = await fixture()
    const layout = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/layout',
      payload: { csv, delimiter: ';' },
    })
    expect(layout.statusCode, layout.payload).toBe(200)
    expect(layout.json()).toMatchObject({
      header: ['Data', 'Valuta', 'Importo', 'Descrizione'],
      rowCount: 1,
      errors: [],
    })
    const saved = await f.app.inject({
      method: 'POST',
      url: '/v1/import-mappings',
      payload: { accountId: f.account.id, name: 'Mappatura HTTP', mapping },
    })
    expect(saved.statusCode, saved.payload).toBe(200)
    expect((await f.app.inject('/v1/import-mappings')).json()).toHaveLength(1)
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/v1/imports/mapped/preview',
          payload: { ...input(f.account.id), profileId: 'foreign' },
        })
      ).statusCode,
    ).toBe(400)
    const response = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/preview',
      payload: input(f.account.id),
    })
    expect(response.statusCode, response.payload).toBe(200)
    const revision = response.json<{ previewRevision: string }>().previewRevision
    const commit = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/commit',
      payload: command(revision, f.account.id),
    })
    expect(commit.statusCode, commit.payload).toBe(200)
    expect(commit.json()).toMatchObject({ inserted: 1 })
    const stale = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/commit',
      payload: command(revision, f.account.id),
    })
    expect(stale.statusCode, stale.payload).toBe(409)
    expect(stale.json()).toMatchObject({ code: 'import_preview_stale' })
    const bad = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/preview',
      payload: input(f.account.id, csv.replace('02/10/2026', 'SEGRETO_SINTETICO')),
    })
    expect(bad.statusCode).toBe(200)
    expect(JSON.stringify(bad.json().errors)).not.toContain('SEGRETO_SINTETICO')
  })

  test('route JSON overhead is bounded separately from CSV bytes and does not reject a valid escaped file', async () => {
    const f = await fixture(),
      text = `Data;Valuta;Importo;Descrizione;Ignorata\n02/10/2026;03/10/2026;-12,34;Acquisto sintetico;"${'\t'.repeat(200_000)}"\n`
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(262_144)
    expect(Buffer.byteLength(JSON.stringify(input(f.account.id, text)), 'utf8')).toBeGreaterThan(
      300_000,
    )
    const response = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/preview',
      payload: input(f.account.id, text),
    })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json()).toMatchObject({ canImport: true, errors: [], rowCount: 1 })
    expect(JSON.stringify(response.json().rows[0].provenance.rawFields)).not.toContain('Ignorata')
  })
})
