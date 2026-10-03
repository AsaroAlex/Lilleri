import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  type CsvMapping,
  csvMappingDigest,
  inspectCsvLayout,
  previewMappedCsv,
  validateCsvMapping,
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
import { notFound, Problem } from './problem.js'
import { DemoService } from './service.js'

export { csvMappingDto, mappedPreviewDto, savedCsvMappingDto } from './mapped-import-dto.js'

const importBase = z.strictObject({
  accountId: identifier,
  csv: z.string().min(1).max(262_144),
  mapping: csvMappingDto.optional(),
  mappingId: identifier.optional(),
})
const importInput = importBase.refine(
  (value) => (value.mapping !== undefined) !== (value.mappingId !== undefined),
  'Specify an inline mapping or a saved mapping.',
)
const commitInput = importBase
  .extend({
    previewRevision: digestSchema,
    requestId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
    acknowledgeGeneratedDuplicates: z.boolean(),
  })
  .refine(
    (value) => (value.mapping !== undefined) !== (value.mappingId !== undefined),
    'Specify an inline mapping or a saved mapping.',
  )
const reportDto = z.strictObject({
  inserted: z.number().int().min(0),
  updated: z.number().int().min(0),
  unchanged: z.number().int().min(0),
  rejected: z.number().int().min(0),
  importedAt: z.string(),
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
      preview = previewMappedCsv(input.csv, account.providerAccountId, selected.mapping)
    const ledger = await db
      .select({
        id: schema.transactions.id,
        revision: schema.transactions.revision,
        contentHash: schema.transactions.contentHash,
        status: schema.transactions.status,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, this.profileId),
          eq(schema.transactions.accountId, input.accountId),
        ),
      )
      .orderBy(asc(schema.transactions.id))
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
      canImport: errors.length === 0 && preview.canImport,
      previewRevision: hash({
        format: 'lilleri.mapped-preview-revision.v1',
        profileId: this.profileId,
        account,
        manual: manual ?? null,
        ledger,
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
      fileDigest: createHash('sha256').update(input.csv).digest('hex'),
      mappingDigest: input.mapping ? csvMappingDigest(validateCsvMapping(input.mapping)) : null,
      mappingId: input.mappingId ?? null,
      previewRevision: input.previewRevision,
      acknowledgeGeneratedDuplicates: input.acknowledgeGeneratedDuplicates,
    }
    return new ManualService(
      this.db,
      this.profileId,
      this.source.now,
      this.source.encryption,
    ).command('import', input.requestId, body, async (tx) => {
      const { dto } = await this.previewAt(tx, input)
      if (dto.previewRevision !== input.previewRevision) throw stale()
      if (dto.errors.length || !dto.rows.length) throw invalid()
      if (dto.duplicateCandidates.length && !input.acknowledgeGeneratedDuplicates)
        throw new Problem(
          422,
          'import_duplicate_review_required',
          'Le righe uguali possono essere acquisti distinti. Controlla l’anteprima e conferma di mantenerle tutte.',
        )
      const source = new DemoService(
        tx,
        this.profileId,
        this.source.provider,
        this.source.now,
        this.source.encryption,
        this.source.connectionLifecycleConfiguration,
      )
      return source.importRecords(
        input.accountId,
        dto.rows.map((row) => row.record as Parameters<DemoService['importRecords']>[1][number]),
        {
          sourcePayloads: dto.rows.map((row) => ({
            format: 'lilleri.csv-observation.v1',
            fileDigest: dto.fileDigest,
            mappingDigest: dto.mappingDigest,
            record: row.record,
            rowNumber: row.rowNumber,
            provenance: row.provenance,
          })),
          afterObservation: async (db, { index, transaction, observationId }) => {
            const row = dto.rows[index]
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
                createdAt: this.source.now(),
              })
              .onConflictDoNothing()
          },
        },
      )
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
    '/v1/imports/mapped/preview',
    {
      bodyLimit: 600_000,
      schema: { body: importInput, response: { 200: mappedPreviewDto, ...errors } },
    },
    async (request) => service(request).preview(request.body),
  )
  api.post(
    '/v1/imports/mapped/commit',
    { bodyLimit: 600_000, schema: { body: commitInput, response: { 200: reportDto, ...errors } } },
    async (request) => service(request).commit(request.body),
  )
}
