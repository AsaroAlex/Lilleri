import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { type CsvMapping, MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { strFromU8, unzipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  workbookFiles,
  xlsxFixture,
  zipFixture,
} from '../../../packages/financial-providers/src/xlsx-fixture.js'
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
import { PrivacyService } from '../src/privacy.js'
import { cleanupExpiredObservationPayloads, sourceObservationsForExport } from '../src/retention.js'
import { DemoService } from '../src/service.js'
import { readSourceFactEpochs, recordSourceFacts } from '../src/source-erasure.js'
import {
  createSourceErasureJournal,
  type SourceErasureJournal,
} from '../src/source-erasure-journal.js'

let handle: DatabaseHandle
let encryption: ProfileEncryption
let vault: string
const profiles: string[] = []
const apps: Awaited<ReturnType<typeof createApp>>[] = []
const journals: SourceErasureJournal[] = []
const journalDirectories: string[] = []
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
  for (const journal of journals) journal.close()
  for (const profileId of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle.close()
  await rm(vault, { recursive: true, force: true })
  for (const directory of journalDirectories) await rm(directory, { recursive: true, force: true })
})
async function fixture(clock = now, withSourceJournal = false) {
  const profileId = `mapped_${randomUUID()}`
  profiles.push(profileId)
  const provider = new MockItalianProvider()
  let journal: SourceErasureJournal | undefined
  if (withSourceJournal) {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-mapped-source-journal-'))
    journalDirectories.push(directory)
    journal = await createSourceErasureJournal({
      directory,
      anchorDirectory: vault,
      keys: encryption.keys,
      mode: 'demo',
    })
    journals.push(journal)
  }
  const app = await createApp({
    db: handle.db,
    financialScope: handle.withProfile,
    profileId,
    demoMode: true,
    seed: false,
    now: clock,
    provider,
    encryption,
    ...(journal ? { sourceErasureJournal: journal } : {}),
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
  const source = new DemoService(
    handle.db,
    profileId,
    provider,
    clock,
    encryption,
    undefined,
    undefined,
    journal
      ? (db, facts, at) =>
          recordSourceFacts(db, journal as SourceErasureJournal, facts, at, encryption)
      : undefined,
  )
  return { profileId, account, source, mapped: new MappedImportService(source), app, journal }
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

async function bankFixture() {
  const f = await fixture()
  const connection = await f.source.connect()
  const [account] = await handle.db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.connectionId, connection.id))
  if (!account) throw new Error('Synthetic bank account required')
  const transactionId = `synthetic_bank_${randomUUID()}`
  const row = {
    id: transactionId,
    profileId: f.profileId,
    accountId: account.id,
    connectionId: connection.id,
    providerId: 'mock-italian',
    providerTransactionId: transactionId,
    revision: 1,
    source: 'bank' as const,
    status: 'booked' as const,
    amountMinor: -1234n,
    currency: 'EUR' as const,
    description: 'Synthetic imported purchase',
    merchantKey: 'coop',
    merchantName: 'Coop',
    bookedOn: '2026-10-02',
    observedAt: now(),
    kind: 'expense' as const,
    reference: 'explicit-proof',
    contentHash: 'f'.repeat(64),
  }
  await handle.db
    .insert(schema.transactions)
    .values(await encryption.encryptTransactionRow(handle.db, row))
  const importMapping: CsvMapping = {
    ...mapping,
    columns: {
      ...mapping.columns,
      externalId: 'ID',
      merchant: 'Negozio',
      reference: 'Riferimento',
    },
  }
  const text = (date = '09/10/2026', id = 'file-id', reference = 'explicit-proof') =>
    `ID;Data;Valuta;Importo;Descrizione;Negozio;Riferimento\n${id};${date};09/10/2026;-12,34;Synthetic imported purchase;Coop;${reference}\n`
  return {
    ...f,
    bankAccount: account,
    bankTransaction: row,
    transactionId,
    importInput: (date = '09/10/2026', id = 'file-id', reference = 'explicit-proof') => ({
      accountId: account.id,
      csv: text(date, id, reference),
      mapping: importMapping,
    }),
  }
}

describe('mapped CSV imports with encrypted provenance and atomic reviewed commits', () => {
  test('seven-day candidates require an explicit choice; linking preserves bank corrections, receipt, source audit and idempotent reimport', async () => {
    const f = await bankFixture(),
      request = f.importInput()
    await f.source.correct(f.transactionId, 'groceries', 'once', 1)
    const before = await counts(f.profileId)
    const [bankBefore] = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, f.transactionId))
    const preview = await f.mapped.preview(request)
    expect(preview.crossSourceCandidates).toEqual([
      {
        rowNumber: 2,
        transactionId: f.transactionId,
        bookedOn: '2026-10-02',
        description: 'Synthetic imported purchase',
        merchantName: 'Coop',
        dateDistanceDays: 7,
        sameReference: true,
      },
    ])
    expect(await counts(f.profileId)).toEqual(before)
    const command = {
      ...request,
      previewRevision: preview.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
    }
    await expect(f.mapped.commit(command)).rejects.toMatchObject({
      code: 'import_cross_source_review_required',
    })
    const accepted = await f.mapped.commit({
      ...command,
      duplicateDecisions: [{ rowNumber: 2, transactionId: f.transactionId }],
    })
    expect(accepted).toMatchObject({
      inserted: 0,
      unchanged: 0,
      linked: 1,
      receiptId: command.requestId,
    })
    expect((await counts(f.profileId)).transactions).toBe((before.transactions ?? 0) + 1)
    expect(
      (
        await handle.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, f.transactionId))
      )[0],
    ).toEqual(bankBefore)
    const origin = (await exportMappedImportAudit(handle.db, f.profileId, encryption)).provenance[0]
    expect(origin).toMatchObject({ rowNumber: 2 })
    expect(origin?.transactionId).not.toBe(f.transactionId)
    const fresh = await f.mapped.preview(request)
    expect(fresh.previousImports).toEqual([
      {
        rowNumber: 2,
        transactionId: origin?.transactionId,
        disposition: 'linked',
        linkedTransactionId: f.transactionId,
      },
    ])
    expect(fresh.crossSourceCandidates).toEqual([])
    expect(
      await f.mapped.commit({
        ...command,
        previewRevision: fresh.previewRevision,
        requestId: randomUUID(),
      }),
    ).toMatchObject({ inserted: 0, linked: 1 })
    expect(
      (await f.source.data()).analysis.classifications.find(
        (row) => row.transactionId === f.transactionId,
      )?.categoryId,
    ).toBe('groceries')
    await expect(
      f.mapped.commit({
        ...command,
        previewRevision: fresh.previewRevision,
        requestId: randomUUID(),
        duplicateDecisions: [{ rowNumber: 2, transactionId: null }],
      }),
    ).rejects.toMatchObject({ code: 'import_preview_stale' })
    const match = (await f.source.data()).analysis.matches.find(
      (match) => match.type === 'duplicate' && match.transactionIds.includes(f.transactionId),
    )
    if (!match) throw new Error('Reversible duplicate evidence required')
    await f.source.decide(match.id, 'undone', match.revision)
    await cleanupExpiredObservationPayloads(handle.db, f.profileId, '2026-11-03T12:00:00.000Z')
    const undonePreview = await f.mapped.preview(request)
    expect(undonePreview.previousImports[0]?.disposition).toBe('imported')
    expect(
      await f.mapped.commit({
        ...command,
        previewRevision: undonePreview.previewRevision,
        requestId: randomUUID(),
      }),
    ).toMatchObject({ inserted: 0, linked: 0 })
    expect(
      (await f.source.data()).analysis.matches.find((current) => current.id === match.id)?.state,
    ).toBe('undone')
  })

  test('keep-separate rejects even a matching-reference proposal and reimport preserves this decision', async () => {
    const f = await bankFixture(),
      request = f.importInput(),
      preview = await f.mapped.preview(request)
    const result = await f.mapped.commit({
      ...request,
      previewRevision: preview.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
      duplicateDecisions: [{ rowNumber: 2, transactionId: null }],
    })
    expect(result).toMatchObject({ inserted: 1, linked: 0 })
    const analysis = (await f.source.data()).analysis
    const match = analysis.matches.find(
      (match) => match.type === 'duplicate' && match.transactionIds.includes(f.transactionId),
    )
    expect(match?.state).toBe('rejected')
    const decisions = await handle.db
      .select()
      .from(schema.matchDecisions)
      .where(eq(schema.matchDecisions.profileId, f.profileId))
    const fresh = await f.mapped.preview(request)
    expect(fresh.previousImports[0]?.disposition).toBe('imported')
    await f.mapped.commit({
      ...request,
      previewRevision: fresh.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
    })
    expect(
      await handle.db
        .select()
        .from(schema.matchDecisions)
        .where(eq(schema.matchDecisions.profileId, f.profileId)),
    ).toEqual(decisions)
  })

  test('a bank target already linked to another imported row stays unavailable until that decision is undone', async () => {
    const f = await bankFixture(),
      first = f.importInput(),
      preview = await f.mapped.preview(first)
    await f.mapped.commit({
      ...first,
      previewRevision: preview.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
      duplicateDecisions: [{ rowNumber: 2, transactionId: f.transactionId }],
    })
    const later = f.importInput('09/10/2026', 'another-file-id', 'different-reference')
    expect((await f.mapped.preview(later)).crossSourceCandidates).toEqual([])
    const match = (await f.source.data()).analysis.matches.find(
      (item) => item.type === 'duplicate' && item.transactionIds.includes(f.transactionId),
    )
    if (!match) throw new Error('Confirmed CSV link required')
    await f.source.decide(match.id, 'undone', match.revision)
    expect((await f.mapped.preview(later)).crossSourceCandidates).toMatchObject([
      { transactionId: f.transactionId },
    ])
  })

  test('eight-day, pending, wrong-account and private records cannot become candidates; privacy changes stale an earlier gesture', async () => {
    const f = await bankFixture()
    expect((await f.mapped.preview(f.importInput('10/10/2026'))).crossSourceCandidates).toEqual([])
    const request = f.importInput(),
      preview = await f.mapped.preview(request)
    const privacy = new PrivacyService(handle.db, f.profileId, now)
    await privacy.updateTransaction(f.transactionId, 1, { private: true, quiet: false })
    expect((await f.mapped.preview(request)).crossSourceCandidates).toEqual([])
    await expect(
      f.mapped.commit({
        ...request,
        previewRevision: preview.previewRevision,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: false,
        duplicateDecisions: [{ rowNumber: 2, transactionId: f.transactionId }],
      }),
    ).rejects.toMatchObject({ code: 'import_preview_stale' })
    await privacy.updateTransaction(f.transactionId, 2, { private: false, quiet: false })
    const wrong = await f.mapped.preview({ ...request, accountId: f.account.id })
    expect(wrong.crossSourceCandidates).toEqual([])
    const pendingMapping = {
      ...request.mapping,
      columns: { ...request.mapping.columns, status: 'Stato' },
      statusValues: { HOLD: 'pending' as const },
    }
    const pendingCsv = request.csv
      .replace('Riferimento\n', 'Riferimento;Stato\n')
      .replace('explicit-proof\n', 'explicit-proof;HOLD\n')
    expect(
      (await f.mapped.preview({ ...request, mapping: pendingMapping, csv: pendingCsv }))
        .crossSourceCandidates,
    ).toEqual([])
  })

  test('two file rows cannot consume one bank target and foreign or duplicate decision rows fail atomically over actual HTTP', async () => {
    const f = await bankFixture(),
      request = f.importInput()
    const repeated = {
      ...request,
      csv: `${request.csv}file-id-two;09/10/2026;09/10/2026;-12,34;Synthetic imported purchase;Coop;explicit-proof\n`,
    }
    const preview = await f.mapped.preview(repeated),
      before = await counts(f.profileId)
    const commit = {
      ...repeated,
      previewRevision: preview.previewRevision,
      requestId: randomUUID(),
      acknowledgeGeneratedDuplicates: false,
      duplicateDecisions: [
        { rowNumber: 2, transactionId: f.transactionId },
        { rowNumber: 3, transactionId: f.transactionId },
      ],
    }
    const rejected = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/commit',
      payload: commit,
    })
    expect(rejected.statusCode, rejected.payload).toBe(422)
    expect(rejected.json().code).toBe('import_duplicate_target_reused')
    expect(await counts(f.profileId)).toEqual(before)
    const foreign = await bankFixture()
    for (const decisions of [
      [{ rowNumber: 2, transactionId: foreign.transactionId }],
      [
        { rowNumber: 2, transactionId: null },
        { rowNumber: 2, transactionId: null },
      ],
    ]) {
      const response = await f.app.inject({
        method: 'POST',
        url: '/v1/imports/mapped/commit',
        payload: { ...commit, requestId: randomUUID(), duplicateDecisions: decisions },
      })
      expect(response.statusCode).toBe(409)
    }
    expect(await counts(f.profileId)).toEqual(before)
  })

  test.each(['csv', 'xlsx'] as const)(
    '%s HTTP commit with an advancing clock and current journal shares one signed revision instant and retries once',
    async (format) => {
      let tick = Date.parse(now())
      const clock = () => {
        tick += 1_000
        return new Date(tick).toISOString()
      }
      const f = await fixture(clock, true)
      if (!f.journal) throw new Error('Current synthetic journal is required')
      const rows = [
        ['Data', 'Valuta', 'Importo', 'Descrizione'],
        ['02/10/2026', '03/10/2026', '-12,34', 'Acquisto sintetico'],
        ['02/10/2026', '03/10/2026', '-2,00', 'Secondo acquisto sintetico'],
      ]
      const input = {
        accountId: f.account.id,
        mapping,
        ...(format === 'csv'
          ? { csv: `${rows.map((row) => row.join(';')).join('\n')}\n` }
          : {
              xlsx: {
                base64: xlsxFixture({ Movimenti: rows }).toString('base64'),
                sheet: 'Movimenti',
                headerRow: 1,
              },
            }),
      }
      const preview = await f.app.inject({
        method: 'POST',
        url: '/v1/imports/mapped/preview',
        payload: input,
      })
      expect(preview.statusCode, preview.payload).toBe(200)
      expect(preview.json()).toMatchObject({ canImport: true, rowCount: 2, errors: [] })
      const request = {
        ...input,
        previewRevision: preview.json().previewRevision,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: false,
      }
      const accepted = await f.app.inject({
        method: 'POST',
        url: '/v1/imports/mapped/commit',
        payload: request,
      })
      expect(accepted.statusCode, accepted.payload).toBe(200)
      const result = accepted.json<{ importedAt: string; inserted: number }>()
      expect(result.inserted).toBe(2)
      const proofs = await handle.withProfile(f.profileId, (db) =>
        readSourceFactEpochs(db, f.profileId, encryption, f.journal as SourceErasureJournal),
      )
      const importedProofs = proofs.filter(
        (proof) =>
          proof.kind !== 'manual_command' ||
          proof.subjectId === request.requestId ||
          proof.subjectId.startsWith('csv_'),
      )
      expect(importedProofs).toHaveLength(8)
      expect(new Set(importedProofs.map((proof) => proof.recordedAt))).toEqual(
        new Set([result.importedAt]),
      )
      for (const table of [mappedImportProvenance, manualCommands, manualBalanceEvents] as const) {
        const audit = await handle.db.select().from(table).where(eq(table.profileId, f.profileId))
        const imported = audit.filter((row) => !('operation' in row) || row.operation === 'import')
        expect(imported.length).toBeGreaterThan(0)
        expect(imported.every((row) => row.createdAt === result.importedAt)).toBe(true)
      }
      const before = await counts(f.profileId)
      const repeat = await f.app.inject({
        method: 'POST',
        url: '/v1/imports/mapped/commit',
        payload: request,
      })
      expect(repeat.statusCode, repeat.payload).toBe(200)
      expect(repeat.json()).toEqual(result)
      expect(await counts(f.profileId)).toEqual(before)
      const [account] = await handle.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, f.account.id))
      expect(account?.balanceMinor).toBe(8566n)
    },
  )

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

  test('XLSX discovery and explicit sheet/header preview are read-only and preserve physical source rows', async () => {
    const f = await fixture(),
      before = await counts(f.profileId),
      bytes = xlsxFixture({
        Movimenti: [
          ['Titolo'],
          ['Nota'],
          ['Data', 'Valuta', 'Importo', 'Descrizione'],
          ['02/10/2026', '03/10/2026', { number: '-12.34' }, 'Sintetico'],
          [null, null, null, null],
          ['02/10/2026', '03/10/2026', { number: '-2.00' }, 'Due\nrighe'],
        ],
        Altro: [
          ['Data', 'Valuta', 'Importo', 'Descrizione'],
          ['02/10/2026', '03/10/2026', { number: '-12.34' }, 'Sintetico'],
        ],
      }),
      base64 = bytes.toString('base64')
    const discovery = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/workbook',
      payload: { base64 },
    })
    expect(discovery.statusCode, discovery.payload).toBe(200)
    expect(discovery.json()).toMatchObject({
      sheets: [
        { name: 'Movimenti', rows: 6 },
        { name: 'Altro', rows: 2 },
      ],
      selectedSheet: null,
      headerRow: null,
      header: [],
      errors: [],
    })
    const selected = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/workbook',
      payload: { base64, sheet: 'Movimenti', headerRow: 3 },
    })
    expect(selected.statusCode, selected.payload).toBe(200)
    expect(selected.json()).toMatchObject({
      header: ['Data', 'Valuta', 'Importo', 'Descrizione'],
      rowCount: 2,
      errors: [],
    })
    const request = {
        accountId: f.account.id,
        mapping,
        xlsx: { base64, sheet: 'Movimenti', headerRow: 3 },
      },
      result = await f.mapped.preview(request)
    expect(result.errors).toEqual([])
    expect(result.rows.map((row) => row.rowNumber)).toEqual([4, 6])
    expect(result.rows[0]?.provenance).toMatchObject({
      valueOn: '2026-10-03',
      rawFields: { amount: '-12.34' },
    })
    expect(
      (
        await f.mapped.preview({
          ...request,
          xlsx: { ...request.xlsx, sheet: 'Altro', headerRow: 1 },
        })
      ).rows[0]?.record.id,
    ).not.toBe(result.rows[0]?.record.id)
    expect(await counts(f.profileId)).toEqual(before)
  })

  test('actual scoped XLSX commit keeps exact original tokens and permanent workbook provenance through raw expiry and both owned export formats', async () => {
    const f = await fixture(),
      bytes = xlsxFixture({
        Movimenti: [
          ['Titolo'],
          ['Nota'],
          ['Data', 'Valuta', 'Importo', 'Descrizione'],
          ['02/10/2026', '03/10/2026', { number: '-90071992547409.93' }, 'Sintetico'],
          [null, null, null, null],
          ['02/10/2026', '03/10/2026', { number: '-2.00' }, 'Due\nrighe'],
        ],
      }),
      request = {
        accountId: f.account.id,
        mapping,
        xlsx: { base64: bytes.toString('base64'), sheet: 'Movimenti', headerRow: 3 },
      },
      previewResponse = await f.app.inject({
        method: 'POST',
        url: '/v1/imports/mapped/preview',
        payload: request,
      })
    expect(previewResponse.statusCode, previewResponse.payload).toBe(200)
    const preview = previewResponse.json(),
      command = {
        ...request,
        previewRevision: preview.previewRevision,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: false,
      },
      response = await f.app.inject({
        method: 'POST',
        url: '/v1/imports/mapped/commit',
        payload: command,
      })
    expect(response.statusCode, response.payload).toBe(200)
    expect(response.json()).toMatchObject({ inserted: 2 })
    const transactions = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, f.profileId))
    expect(transactions.map((row) => row.amountMinor.toString()).sort()).toEqual([
      '-200',
      '-9007199254740993',
    ])
    const observations = await sourceObservationsForExport(
      handle.db,
      f.profileId,
      now(),
      encryption,
    )
    expect(observations).toHaveLength(2)
    expect(JSON.stringify(observations)).not.toContain(bytes.toString('base64'))
    expect(observations.find((row) => row.payload.rowNumber === 4)?.payload).toMatchObject({
      format: 'lilleri.xlsx-observation.v1',
      workbook: { format: 'xlsx', sheet: 'Movimenti', headerRow: 3 },
      provenance: { rawFields: { amount: '-90071992547409.93' } },
    })
    const rows = await handle.db
      .select()
      .from(mappedImportProvenance)
      .where(eq(mappedImportProvenance.profileId, f.profileId))
    expect(rows.map((row) => row.rowNumber).sort()).toEqual([4, 6])
    for (const row of rows)
      expect(row).toMatchObject({
        fileFormat: 'xlsx',
        workbookDigest: preview.workbook.workbookDigest,
        worksheet: 'Movimenti',
        headerRow: 3,
        fileDigest: preview.fileDigest,
        valueOn: '2026-10-03',
      })
    const before = await counts(f.profileId)
    expect(await f.mapped.commit(command)).toMatchObject({ inserted: 2 })
    expect(await counts(f.profileId)).toEqual(before)
    const fresh = await f.mapped.preview(request)
    expect(
      await f.mapped.commit({
        ...command,
        previewRevision: fresh.previewRevision,
        requestId: randomUUID(),
      }),
    ).toMatchObject({ inserted: 0, unchanged: 2 })
    expect(
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, f.profileId)),
    ).toEqual(transactions)
    expect(
      await cleanupExpiredObservationPayloads(handle.db, f.profileId, '2026-11-03T12:00:00.000Z'),
    ).toEqual({ deleted: 2 })
    const json = await f.app.inject('/v1/export')
    expect(json.statusCode, json.payload).toBe(200)
    const origins = json.json().mappedImports.provenance
    expect(origins).toHaveLength(2)
    for (const row of origins)
      expect(row).toMatchObject({
        fileFormat: 'xlsx',
        workbookDigest: preview.workbook.workbookDigest,
        worksheet: 'Movimenti',
        headerRow: 3,
      })
    const archive = await f.app.inject('/v1/export/archive')
    expect(archive.statusCode, archive.payload).toBe(200)
    const data = unzipSync(archive.rawPayload)['data.json']
    if (!data) throw new Error('Owned archive must include data.json')
    expect(JSON.parse(strFromU8(data)).mappedImports.provenance).toEqual(origins)
  })

  test('XLSX duplicate acknowledgement, stale previews and receipts bind the original workbook selection without automatic retry', async () => {
    const f = await fixture(),
      rows = [
        ['Data', 'Valuta', 'Importo', 'Descrizione'],
        ['02/10/2026', '03/10/2026', { number: '-12.34' }, 'Acquisto'],
        ['02/10/2026', '03/10/2026', { number: '-12.34' }, 'Acquisto'],
      ] as const,
      request = {
        accountId: f.account.id,
        mapping,
        xlsx: {
          base64: xlsxFixture({ Movimenti: rows, Altro: rows }).toString('base64'),
          sheet: 'Movimenti',
          headerRow: 1,
        },
      },
      preview = await f.mapped.preview(request),
      command = {
        ...request,
        previewRevision: preview.previewRevision,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: false,
      }
    await expect(f.mapped.commit(command)).rejects.toMatchObject({
      code: 'import_duplicate_review_required',
    })
    expect((await counts(f.profileId)).transactions).toBe(0)
    await f.mapped.commit({ ...command, acknowledgeGeneratedDuplicates: true })
    expect((await counts(f.profileId)).transactions).toBe(2)
    await expect(
      f.mapped.commit({
        ...command,
        acknowledgeGeneratedDuplicates: true,
        xlsx: { ...request.xlsx, sheet: 'Altro' },
      }),
    ).rejects.toMatchObject({ code: 'idempotency_key_reused' })
    await expect(
      f.mapped.commit({
        ...command,
        requestId: randomUUID(),
        acknowledgeGeneratedDuplicates: true,
      }),
    ).rejects.toMatchObject({ code: 'import_preview_stale' })
    expect((await counts(f.profileId)).transactions).toBe(2)
  })

  test('saved XLSX column mappings preserve external identity compatibility with the canonical CSV importer', async () => {
    const f = await fixture(),
      externalMapping: CsvMapping = {
        ...mapping,
        columns: { ...mapping.columns, externalId: 'ID' },
      },
      saved = await f.mapped.create({
        accountId: f.account.id,
        name: 'Colonne Excel',
        mapping: externalMapping,
      }),
      request = {
        accountId: f.account.id,
        mappingId: saved.id,
        xlsx: {
          base64: xlsxFixture({
            Movimenti: [
              ['Data', 'Valuta', 'Importro', 'Descrizione', 'ID'],
              ['02/10/2026', '03/10/2026', { number: '-12.34' }, 'Acquisto sintetico', 'shared'],
            ],
          }).toString('base64'),
          sheet: 'Movimenti',
          headerRow: 1,
        },
      }
    // A renamed source column must be rejected before any records are written.
    expect((await f.mapped.preview(request)).errors[0]?.code).toBe('missing_column')
    const corrected = {
        ...request,
        xlsx: {
          ...request.xlsx,
          base64: xlsxFixture({
            Movimenti: [
              ['Data', 'Valuta', 'Importo', 'Descrizione', 'ID'],
              ['02/10/2026', '03/10/2026', { number: '-12.34' }, 'Acquisto sintetico', 'shared'],
            ],
          }).toString('base64'),
        },
      },
      preview = await f.mapped.preview(corrected)
    await f.mapped.commit({
      ...corrected,
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
  })

  test('HTTP XLSX rejection bounds base64 and XML before writes and returns only codes for financial cells', async () => {
    const f = await fixture(),
      before = await counts(f.profileId),
      files = workbookFiles({
        Movimenti: [
          ['Data', 'Valuta', 'Importo', 'Descrizione'],
          [
            '02/10/2026',
            '03/10/2026',
            { xml: '<f>PRIVATE_FINANCIAL_CELL()</f><v>10</v>' },
            'PRIVATE_DESCRIPTION',
          ],
        ],
      }),
      request = {
        accountId: f.account.id,
        mapping,
        xlsx: { base64: zipFixture(files).toString('base64'), sheet: 'Movimenti', headerRow: 1 },
      }
    const preview = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/preview',
      payload: request,
    })
    expect(preview.statusCode, preview.payload).toBe(200)
    expect(preview.json()).toMatchObject({ rows: [], errors: [{ code: 'xlsx_formula' }] })
    expect(preview.payload).not.toContain('PRIVATE_')
    const mixed = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/preview',
      payload: { ...request, csv },
    })
    expect(mixed.statusCode).toBe(400)
    const invalidBase64 = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/workbook',
      payload: { base64: '@PRIVATE_CELL@' },
    })
    expect(invalidBase64.statusCode).toBe(422)
    expect(invalidBase64.payload).not.toContain('PRIVATE_CELL')
    const tooLarge = await f.app.inject({
      method: 'POST',
      url: '/v1/imports/mapped/workbook',
      payload: { base64: 'A'.repeat(750_000) },
    })
    expect(tooLarge.statusCode).toBe(413)
    expect(await counts(f.profileId)).toEqual(before)
  })
})
