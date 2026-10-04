import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { parseDecimal } from '@lilleri/domain'
import {
  type CsvMapping,
  csvMappingDigest,
  inspectCsvLayout,
  inspectXlsxLayout,
  previewMappedCsv,
  previewMappedXlsx,
  validateCsvMapping,
  XLSX_IMPORT_LIMITS,
} from '@lilleri/financial-providers'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { manualAccounts } from './manual-schema.js'
import { ManualService } from './manual-service.js'
import {
  csvMappingDto,
  digestSchema,
  identifier,
  issueDto,
  mappedPreviewDto,
  revision,
  savedCsvMappingDto,
} from './mapped-import-dto.js'
import {
  csvMappingEvents,
  mappedImportProvenance,
  savedCsvMappings,
} from './mapped-import-schema.js'
import { PrivacyService } from './privacy.js'
import { transactionPrivacy } from './privacy-schema.js'
import { notFound, Problem } from './problem.js'
import { DemoService } from './service.js'

export { csvMappingDto, mappedPreviewDto, savedCsvMappingDto } from './mapped-import-dto.js'

const workbookInput = z.strictObject({
  base64: z.string().min(1).max(XLSX_IMPORT_LIMITS.base64Characters),
  sheet: z.string().min(1).max(128),
  headerRow: z.number().int().min(1).max(XLSX_IMPORT_LIMITS.headerRows),
})
const importBase = z.strictObject({
  accountId: identifier,
  csv: z.string().min(1).max(262_144).optional(),
  xlsx: workbookInput.optional(),
  mapping: csvMappingDto.optional(),
  mappingId: identifier.optional(),
})
const importInput = importBase.refine(
  (value) =>
    (value.mapping !== undefined) !== (value.mappingId !== undefined) &&
    (value.csv !== undefined) !== (value.xlsx !== undefined),
  'Specify one file and an inline mapping or a saved mapping.',
)
const commitInput = importBase
  .extend({
    previewRevision: digestSchema,
    requestId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
    acknowledgeGeneratedDuplicates: z.boolean(),
    duplicateDecisions: z
      .array(
        z.strictObject({
          rowNumber: z.number().int().positive(),
          transactionId: identifier.nullable(),
        }),
      )
      .max(1000)
      .optional(),
  })
  .refine(
    (value) =>
      (value.mapping !== undefined) !== (value.mappingId !== undefined) &&
      (value.csv !== undefined) !== (value.xlsx !== undefined),
    'Specify one file and an inline mapping or a saved mapping.',
  )
const reportDto = z.strictObject({
  inserted: z.number().int().min(0),
  updated: z.number().int().min(0),
  unchanged: z.number().int().min(0),
  rejected: z.number().int().min(0),
  importedAt: z.string(),
  linked: z.number().int().min(0),
  receiptId: z.string(),
})
type ImportInput = z.infer<typeof importInput>
type CommitInput = z.infer<typeof commitInput>
const nameInput = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !value.includes('\u0000'))
const invalid = () =>
  new Problem(
    422,
    'invalid_csv_mapping',
    'Controlla le colonne, il formato delle date, gli importi e la valuta. Nessuna riga è stata importata.',
  )
const stale = () =>
  new Problem(
    409,
    'import_preview_stale',
    'Il conto, i movimenti o la mappatura sono cambiati. Mostra una nuova anteprima prima di importare.',
  )
function canonical(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    )
  return value
}
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const context = (profileId: string, table: string, column: string, rowId: string) => ({
  profileId,
  table,
  column,
  rowId,
})
function workbookBytes(base64: string): Buffer {
  if (
    base64.length > XLSX_IMPORT_LIMITS.base64Characters ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
  )
    throw invalid()
  const bytes = Buffer.from(base64, 'base64')
  if (
    !bytes.length ||
    bytes.length > XLSX_IMPORT_LIMITS.compressedBytes ||
    bytes.toString('base64') !== base64
  )
    throw invalid()
  return bytes
}

export class MappedImportService {
  constructor(readonly source: DemoService) {}
  get db() {
    return this.source.db
  }
  get profileId() {
    return this.source.profileId
  }
  async lock(db: Database, shared = false) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
      .for(shared ? 'share' : 'update')
    if (!profile) throw notFound()
  }
  async account(db: Database, accountId: string) {
    const [account] = await db
      .select()
      .from(schema.accounts)
      .where(and(eq(schema.accounts.profileId, this.profileId), eq(schema.accounts.id, accountId)))
    if (!account) throw notFound()
    return account
  }
  async decode(row: typeof savedCsvMappings.$inferSelect, db: Database) {
    const encryption = this.source.encryption
    const definition = encryption
      ? await encryption.decryptJson(
          db,
          context(this.profileId, 'saved_csv_mappings', 'definition', row.id),
          String(row.definition._lilleriEncrypted),
        )
      : row.definition
    const name = encryption
      ? await encryption.decryptText(
          db,
          context(this.profileId, 'saved_csv_mappings', 'name', row.id),
          row.name,
        )
      : row.name
    return savedCsvMappingDto.parse({
      id: row.id,
      profileId: row.profileId,
      accountId: row.accountId,
      name,
      mapping: validateCsvMapping(definition),
      revision: row.revision,
      archived: row.archived,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }
  async encode(db: Database, id: string, name: string, mapping: CsvMapping) {
    const encryption = this.source.encryption
    return {
      name: encryption
        ? await encryption.encryptText(
            db,
            context(this.profileId, 'saved_csv_mappings', 'name', id),
            name,
          )
        : name,
      definition: encryption
        ? {
            _lilleriEncrypted: await encryption.encryptJson(
              db,
              context(this.profileId, 'saved_csv_mappings', 'definition', id),
              mapping,
            ),
          }
        : (mapping as unknown as Record<string, unknown>),
    }
  }
  async event(
    db: Database,
    row: z.infer<typeof savedCsvMappingDto>,
    action: typeof csvMappingEvents.$inferInsert.action,
    before: unknown,
  ) {
    const id = `csvmap_event_${randomUUID()}`,
      snapshot = { before, after: row },
      encryption = this.source.encryption
    await db.insert(csvMappingEvents).values({
      id,
      profileId: this.profileId,
      accountId: row.accountId,
      mappingId: row.id,
      revision: row.revision,
      action,
      snapshot: encryption
        ? {
            _lilleriEncrypted: await encryption.encryptJson(
              db,
              context(this.profileId, 'csv_mapping_events', 'snapshot', id),
              snapshot,
            ),
          }
        : snapshot,
      createdAt: row.updatedAt,
    })
  }
  async list() {
    const rows = await this.db
      .select()
      .from(savedCsvMappings)
      .where(eq(savedCsvMappings.profileId, this.profileId))
      .orderBy(asc(savedCsvMappings.createdAt), asc(savedCsvMappings.id))
    const decoded = []
    for (const row of rows) decoded.push(await this.decode(row, this.db))
    return decoded
  }
  async create(input: { accountId: string; name: string; mapping: unknown }) {
    let mapping: CsvMapping
    try {
      mapping = validateCsvMapping(input.mapping)
    } catch {
      throw invalid()
    }
    return this.db.transaction(async (tx) => {
      await this.lock(tx)
      await this.account(tx, input.accountId)
      const id = `csvmap_${randomUUID()}`,
        now = this.source.now()
      const [row] = await tx
        .insert(savedCsvMappings)
        .values({
          id,
          profileId: this.profileId,
          accountId: input.accountId,
          ...(await this.encode(tx, id, input.name, mapping)),
          revision: 1,
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      if (!row) throw invalid()
      const result = await this.decode(row, tx)
      await this.event(tx, result, 'created', null)
      return result
    })
  }
  async update(
    id: string,
    input: {
      revision: number
      name?: string | undefined
      mapping?: unknown
      archived?: boolean | undefined
    },
  ) {
    return this.db.transaction(async (tx) => {
      await this.lock(tx)
      const [stored] = await tx
        .select()
        .from(savedCsvMappings)
        .where(and(eq(savedCsvMappings.profileId, this.profileId), eq(savedCsvMappings.id, id)))
        .for('update')
      if (!stored) throw notFound()
      if (stored.revision !== input.revision || stored.revision >= 2_147_483_646) throw stale()
      const before = await this.decode(stored, tx)
      let mapping: CsvMapping
      try {
        mapping = validateCsvMapping(input.mapping ?? before.mapping)
      } catch {
        throw invalid()
      }
      const [row] = await tx
        .update(savedCsvMappings)
        .set({
          ...(await this.encode(tx, id, input.name ?? before.name, mapping)),
          archived: input.archived ?? stored.archived,
          revision: stored.revision + 1,
          updatedAt: this.source.now(),
        })
        .where(and(eq(savedCsvMappings.profileId, this.profileId), eq(savedCsvMappings.id, id)))
        .returning()
      if (!row) throw notFound()
      const result = await this.decode(row, tx)
      await this.event(
        tx,
        result,
        result.archived !== before.archived
          ? result.archived
            ? 'archived'
            : 'restored'
          : 'updated',
        before,
      )
      return result
    })
  }
  async resolve(db: Database, input: ImportInput) {
    await this.account(db, input.accountId)
    if (input.mappingId) {
      const [row] = await db
        .select()
        .from(savedCsvMappings)
        .where(
          and(
            eq(savedCsvMappings.profileId, this.profileId),
            eq(savedCsvMappings.accountId, input.accountId),
            eq(savedCsvMappings.id, input.mappingId),
          ),
        )
      if (!row || row.archived) throw notFound()
      const decoded = await this.decode(row, db)
      return {
        mapping: validateCsvMapping(decoded.mapping),
        identity: { id: row.id, revision: row.revision },
      }
    }
    try {
      return { mapping: validateCsvMapping(input.mapping), identity: null }
    } catch {
      throw invalid()
    }
  }
  async previewAt(db: Database, input: ImportInput) {
    const account = await this.account(db, input.accountId),
      selected = await this.resolve(db, input),
      preview = input.xlsx
        ? await previewMappedXlsx(
            workbookBytes(input.xlsx.base64),
            account.providerAccountId,
            selected.mapping,
            { sheet: input.xlsx.sheet, headerRow: input.xlsx.headerRow },
          )
        : previewMappedCsv(input.csv ?? '', account.providerAccountId, selected.mapping)
    const ledger = await db
      .select({
        id: schema.transactions.id,
        revision: schema.transactions.revision,
        contentHash: schema.transactions.contentHash,
        status: schema.transactions.status,
        providerTransactionId: schema.transactions.providerTransactionId,
        source: schema.transactions.source,
        amountMinor: schema.transactions.amountMinor,
        currency: schema.transactions.currency,
        bookedOn: schema.transactions.bookedOn,
        reference: schema.transactions.reference,
        relatedTransactionId: schema.transactions.relatedTransactionId,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, this.profileId),
          eq(schema.transactions.accountId, input.accountId),
        ),
      )
      .orderBy(asc(schema.transactions.id))
    const data = await this.source.data(db)
    const privacy = await new PrivacyService(db, this.profileId, this.source.now).analysisContext(
      db,
      data.analysis.classifications,
    )
    const privacyFlags = await db
      .select()
      .from(transactionPrivacy)
      .where(eq(transactionPrivacy.profileId, this.profileId))
      .orderBy(asc(transactionPrivacy.transactionId))
    const excluded = new Set([
      ...privacy.excludedTransactionIds,
      ...data.merchantContext.excludedTransactionIds,
    ])
    const activeIds = new Set(data.transactions.map((transaction) => transaction.id))
    const activeTransactions = new Map(
      data.transactions.map((transaction) => [transaction.id, transaction]),
    )
    const unavailableTargets = new Set(
      data.analysis.matches
        .filter(
          (match) =>
            match.state === 'confirmed' &&
            [
              'duplicate',
              'pending_to_booked',
              'internal_transfer',
              'card_settlement',
              'cash_transfer',
            ].includes(match.type),
        )
        .flatMap((match) => match.transactionIds),
    )
    const origins = await db
      .select({
        transactionId: mappedImportProvenance.transactionId,
        providerRecordId: schema.observations.providerRecordId,
      })
      .from(mappedImportProvenance)
      .innerJoin(
        schema.observations,
        and(
          eq(schema.observations.profileId, mappedImportProvenance.profileId),
          eq(schema.observations.id, mappedImportProvenance.observationId),
        ),
      )
      .where(
        and(
          eq(mappedImportProvenance.profileId, this.profileId),
          eq(mappedImportProvenance.accountId, input.accountId),
        ),
      )
    const previousImports: z.infer<typeof mappedPreviewDto>['previousImports'] = []
    const crossSourceCandidates: z.infer<typeof mappedPreviewDto>['crossSourceCandidates'] = []
    for (const row of preview.rows) {
      const previous = origins.filter((origin) => origin.providerRecordId === row.record.id)
      const known = [...new Set(previous.map((origin) => origin.transactionId))]
      const canonical = ledger.find(
        (transaction) =>
          transaction.source === 'csv' && transaction.providerTransactionId === row.record.id,
      )
      if (known.length > 1) throw stale()
      const previousId = known[0] ?? canonical?.id
      if (previousId) {
        const transaction = ledger.find((transaction) => transaction.id === previousId)
        if (!transaction) throw stale()
        previousImports.push({
          rowNumber: row.rowNumber,
          transactionId: transaction.id,
          disposition: data.analysis.matches.some(
            (match) =>
              match.type === 'duplicate' &&
              match.state === 'confirmed' &&
              match.transactionIds.includes(transaction.id),
          )
            ? 'linked'
            : 'imported',
          linkedTransactionId: transaction.relatedTransactionId,
        })
        continue
      }
      if (row.record.status !== 'booked' || !row.record.bookedOn) continue
      const amount = parseDecimal(row.record.amount, row.record.currency).amountMinor
      for (const transaction of ledger) {
        if (
          transaction.source !== 'bank' ||
          transaction.status !== 'booked' ||
          unavailableTargets.has(transaction.id) ||
          excluded.has(transaction.id) ||
          !activeIds.has(transaction.id) ||
          !transaction.bookedOn ||
          transaction.currency !== row.record.currency ||
          transaction.amountMinor !== amount
        )
          continue
        const distance =
          Math.abs(Date.parse(row.record.bookedOn) - Date.parse(transaction.bookedOn)) / 86_400_000
        if (distance > 7) continue
        const decryptedReference =
          this.source.encryption && transaction.reference
            ? await this.source.encryption.decryptText(
                db,
                context(this.profileId, 'transactions', 'reference', transaction.id),
                transaction.reference,
              )
            : transaction.reference
        crossSourceCandidates.push({
          rowNumber: row.rowNumber,
          transactionId: transaction.id,
          bookedOn: transaction.bookedOn,
          description: activeTransactions.get(transaction.id)?.description ?? '',
          merchantName: activeTransactions.get(transaction.id)?.merchantName ?? null,
          dateDistanceDays: distance,
          sameReference: Boolean(
            row.record.reference && row.record.reference === decryptedReference,
          ),
        })
      }
    }
    const [manual] = await db
      .select()
      .from(manualAccounts)
      .where(
        and(
          eq(manualAccounts.profileId, this.profileId),
          eq(manualAccounts.accountId, input.accountId),
        ),
      )
    const errors = preview.rows.some((row) => row.record.currency !== account.currency)
      ? [
          ...preview.errors,
          { row: null, column: 'currency' as const, code: 'account_currency_mismatch' },
        ]
      : preview.errors
    const result = {
      ...preview,
      rows: errors.length ? [] : preview.rows,
      errors,
      crossSourceCandidates: errors.length ? [] : crossSourceCandidates,
      previousImports: errors.length ? [] : previousImports,
      canImport: errors.length === 0 && preview.canImport,
      previewRevision: hash({
        format: 'lilleri.mapped-preview-revision.v1',
        profileId: this.profileId,
        account,
        manual: manual ?? null,
        ledger,
        reconciliation: data.analysis.matches
          .filter((match) =>
            match.transactionIds.some((id) => ledger.some((transaction) => transaction.id === id)),
          )
          .map((match) => ({ id: match.id, revision: match.revision })),
        origins,
        privacyRevision: privacy.revision,
        privacyFlags,
        excluded: [...excluded].sort(),
        fileDigest: preview.fileDigest,
        mappingDigest: preview.mappingDigest,
        savedMapping: selected.identity,
      }),
    }
    return { dto: mappedPreviewDto.parse(result), selected }
  }
  async preview(input: ImportInput) {
    return this.db.transaction(async (tx) => {
      await this.lock(tx, true)
      return (await this.previewAt(tx, input)).dto
    })
  }
  async commit(input: CommitInput) {
    const body = {
      accountId: input.accountId,
      fileDigest: input.xlsx
        ? hash({
            workbookDigest: createHash('sha256')
              .update(workbookBytes(input.xlsx.base64))
              .digest('hex'),
            sheet: input.xlsx.sheet,
            headerRow: input.xlsx.headerRow,
          })
        : createHash('sha256')
            .update(input.csv ?? '')
            .digest('hex'),
      mappingDigest: input.mapping ? csvMappingDigest(validateCsvMapping(input.mapping)) : null,
      mappingId: input.mappingId ?? null,
      previewRevision: input.previewRevision,
      acknowledgeGeneratedDuplicates: input.acknowledgeGeneratedDuplicates,
      duplicateDecisions: input.duplicateDecisions ?? [],
    }
    return new ManualService(
      this.db,
      this.profileId,
      this.source.now,
      this.source.encryption,
      this.source.recordSourceFacts,
    ).command('import', input.requestId, body, async (tx, at) => {
      const { dto } = await this.previewAt(tx, input)
      if (dto.previewRevision !== input.previewRevision) throw stale()
      if (dto.errors.length || !dto.rows.length) throw invalid()
      if (dto.duplicateCandidates.length && !input.acknowledgeGeneratedDuplicates)
        throw new Problem(
          422,
          'import_duplicate_review_required',
          'Le righe uguali possono essere acquisti distinti. Controlla l’anteprima e conferma di mantenerle tutte.',
        )
      const decisions = new Map(
        (input.duplicateDecisions ?? []).map((decision) => [
          decision.rowNumber,
          decision.transactionId,
        ]),
      )
      if (
        decisions.size !== (input.duplicateDecisions ?? []).length ||
        [...decisions.keys()].some(
          (rowNumber) => !dto.rows.some((row) => row.rowNumber === rowNumber),
        )
      )
        throw stale()
      const links = dto.rows.map((row) => {
        const previous = dto.previousImports.find(
          (previous) => previous.rowNumber === row.rowNumber,
        )
        if (previous) {
          const saved = previous.linkedTransactionId
          if (decisions.has(row.rowNumber) && decisions.get(row.rowNumber) !== saved) throw stale()
          return saved
        }
        const candidates = dto.crossSourceCandidates.filter(
          (candidate) => candidate.rowNumber === row.rowNumber,
        )
        if (candidates.length && !decisions.has(row.rowNumber))
          throw new Problem(
            422,
            'import_cross_source_review_required',
            'Controlla i possibili duplicati e scegli se collegarli o mantenere le righe separate.',
          )
        const linkedId = decisions.get(row.rowNumber) ?? null
        if (linkedId && !candidates.some((candidate) => candidate.transactionId === linkedId))
          throw stale()
        return linkedId
      })
      const targets = links.filter(Boolean)
      if (new Set(targets).size !== targets.length)
        throw new Problem(
          422,
          'import_duplicate_target_reused',
          'Due righe non possono essere collegate allo stesso movimento bancario. Controlla le ripetizioni.',
        )
      const importedIds = new Map<number, string>()
      const source = new DemoService(
        tx,
        this.profileId,
        this.source.provider,
        () => at,
        this.source.encryption,
        this.source.connectionLifecycleConfiguration,
        this.source.recurringPolicy,
        this.source.recordSourceFacts,
      )
      const report = await source.importRecords(
        input.accountId,
        dto.rows.map((row) => row.record as Parameters<DemoService['importRecords']>[1][number]),
        {
          duplicateTransactionIds: links,
          sourcePayloads: dto.rows.map((row) => ({
            format: dto.workbook ? 'lilleri.xlsx-observation.v1' : 'lilleri.csv-observation.v1',
            ...(dto.workbook ? { workbook: dto.workbook } : {}),
            fileDigest: dto.fileDigest,
            mappingDigest: dto.mappingDigest,
            record: row.record,
            rowNumber: row.rowNumber,
            provenance: row.provenance,
          })),
          afterObservation: async (db, { index, transaction, observationId }) => {
            const row = dto.rows[index]
            if (row) importedIds.set(row.rowNumber, transaction.id)
            if (!row || !dto.fileDigest || !dto.mappingDigest) throw invalid()
            await db
              .insert(mappedImportProvenance)
              .values({
                profileId: this.profileId,
                accountId: input.accountId,
                observationId,
                transactionId: transaction.id,
                fileDigest: dto.fileDigest,
                mappingDigest: dto.mappingDigest,
                rowNumber: row.rowNumber,
                identity: row.provenance.identity,
                valueOn: row.provenance.valueOn,
                fileFormat: dto.workbook ? 'xlsx' : null,
                workbookDigest: dto.workbook?.workbookDigest ?? null,
                worksheet: dto.workbook?.sheet ?? null,
                headerRow: dto.workbook?.headerRow ?? null,
                createdAt: at,
              })
              .onConflictDoNothing()
          },
        },
      )
      for (const [index, target] of links.entries()) {
        const row = dto.rows[index],
          importedId = row ? importedIds.get(row.rowNumber) : undefined
        if (
          !row ||
          !target ||
          !importedId ||
          dto.previousImports.some((previous) => previous.rowNumber === row.rowNumber)
        )
          continue
        const match = (await source.data(tx)).analysis.matches.find(
          (match) =>
            match.type === 'duplicate' &&
            match.transactionIds.includes(importedId) &&
            match.transactionIds.includes(target),
        )
        if (!match) throw stale()
        await source.decide(match.id, 'confirmed', match.revision)
      }
      const kept = new Set(
        [...decisions]
          .filter(
            ([row, target]) =>
              target === null &&
              !dto.previousImports.some((previous) => previous.rowNumber === row),
          )
          .map(([row]) => importedIds.get(row)),
      )
      if (kept.size) {
        const { analysis } = await source.data(tx)
        for (const match of analysis.matches) {
          if (match.type === 'duplicate' && match.transactionIds.some((id) => kept.has(id))) {
            const current = (await source.data(tx)).analysis.matches.find(
              (current) => current.id === match.id,
            )
            if (current) await source.decide(current.id, 'rejected', current.revision)
          }
        }
      }
      const analysis = (await source.data(tx)).analysis
      const linked = [...importedIds.values()].filter((id) =>
        analysis.matches.some(
          (match) =>
            match.type === 'duplicate' &&
            match.state === 'confirmed' &&
            match.transactionIds.includes(id),
        ),
      ).length
      const newlyLinked = dto.rows.filter(
        (row) =>
          !dto.previousImports.some((previous) => previous.rowNumber === row.rowNumber) &&
          analysis.matches.some(
            (match) =>
              match.type === 'duplicate' &&
              match.state === 'confirmed' &&
              match.transactionIds.includes(importedIds.get(row.rowNumber) ?? ''),
          ),
      ).length
      return {
        ...report,
        inserted: report.inserted - newlyLinked,
        linked,
        receiptId: input.requestId,
      }
    })
  }
}
export function registerMappedImportRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => DemoService,
) {
  const api = app.withTypeProvider<ZodTypeProvider>(),
    errors = { 400: z.any(), 401: z.any(), 404: z.any(), 409: z.any(), 422: z.any() },
    service = (request: FastifyRequest) => new MappedImportService(resolve(request))
  api.get(
    '/v1/import-mappings',
    { schema: { response: { 200: z.array(savedCsvMappingDto), ...errors } } },
    async (request) => service(request).list(),
  )
  api.post(
    '/v1/import-mappings',
    {
      schema: {
        body: z.strictObject({ accountId: identifier, name: nameInput, mapping: csvMappingDto }),
        response: { 200: savedCsvMappingDto, ...errors },
      },
    },
    async (request) => service(request).create(request.body),
  )
  api.patch(
    '/v1/import-mappings/:id',
    {
      schema: {
        params: z.strictObject({ id: identifier }),
        body: z
          .strictObject({
            revision,
            name: nameInput.optional(),
            mapping: csvMappingDto.optional(),
            archived: z.boolean().optional(),
          })
          .refine(
            (value) =>
              value.name !== undefined ||
              value.mapping !== undefined ||
              value.archived !== undefined,
          ),
        response: { 200: savedCsvMappingDto, ...errors },
      },
    },
    async (request) => service(request).update(request.params.id, request.body),
  )
  api.post(
    '/v1/imports/mapped/layout',
    {
      bodyLimit: 600_000,
      schema: {
        body: z.strictObject({
          csv: z.string().min(1).max(262_144),
          delimiter: z.enum([',', ';', '\t']),
        }),
        response: {
          200: z.strictObject({
            format: z.literal('lilleri.csv-layout.v1'),
            fileDigest: digestSchema.nullable(),
            header: z.array(z.string()),
            rowCount: z.number().int().min(0),
            errors: z.array(issueDto),
          }),
          ...errors,
        },
      },
    },
    async (request) => inspectCsvLayout(request.body.csv, request.body.delimiter),
  )
  api.post(
    '/v1/imports/mapped/workbook',
    {
      bodyLimit: XLSX_IMPORT_LIMITS.requestBytes,
      schema: {
        body: workbookInput
          .partial({ sheet: true, headerRow: true })
          .refine(
            (value) => (value.sheet !== undefined) === (value.headerRow !== undefined),
            'Specify both sheet and header row.',
          ),
        response: {
          200: z.strictObject({
            format: z.literal('lilleri.xlsx-layout.v1'),
            workbookDigest: digestSchema.nullable(),
            sheets: z.array(z.strictObject({ name: z.string(), rows: z.number().int().min(0) })),
            selectedSheet: z.string().nullable(),
            headerRow: z.number().int().positive().nullable(),
            header: z.array(z.string()),
            rowCount: z.number().int().min(0),
            errors: z.array(issueDto),
          }),
          ...errors,
        },
      },
    },
    async (request) =>
      inspectXlsxLayout(
        workbookBytes(request.body.base64),
        request.body.sheet !== undefined && request.body.headerRow !== undefined
          ? { sheet: request.body.sheet, headerRow: request.body.headerRow }
          : undefined,
      ),
  )
  api.post(
    '/v1/imports/mapped/preview',
    {
      bodyLimit: XLSX_IMPORT_LIMITS.requestBytes,
      schema: { body: importInput, response: { 200: mappedPreviewDto, ...errors } },
    },
    async (request) => service(request).preview(request.body),
  )
  api.post(
    '/v1/imports/mapped/commit',
    {
      bodyLimit: XLSX_IMPORT_LIMITS.requestBytes,
      schema: { body: commitInput, response: { 200: reportDto, ...errors } },
    },
    async (request) => service(request).commit(request.body),
  )
}
