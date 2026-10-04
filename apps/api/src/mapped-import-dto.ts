import { validateCsvMapping } from '@lilleri/financial-providers'
import { z } from 'zod'

export const identifier = z.string().min(1).max(200)
export const revision = z.number().int().min(1).max(2_147_483_646)
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/)
const columnNames = [
  'externalId',
  'bookedOn',
  'valueOn',
  'description',
  'amount',
  'debit',
  'credit',
  'currency',
  'merchant',
  'reference',
  'status',
] as const
const dateFormat = z.enum(['dd/MM/yyyy', 'yyyy-MM-dd', 'long-it'])
export const csvMappingDto = z
  .strictObject({
    format: z.literal('lilleri.csv-mapping.v1'),
    delimiter: z.enum([',', ';', '\t']),
    numberLocale: z.enum(['it-IT', 'en-GB']),
    dateFormat,
    valueDateFormat: dateFormat.optional(),
    columns: z.strictObject({
      externalId: identifier.optional(),
      bookedOn: identifier,
      valueOn: identifier.optional(),
      description: identifier,
      amount: identifier.optional(),
      debit: identifier.optional(),
      credit: identifier.optional(),
      currency: identifier.optional(),
      merchant: identifier.optional(),
      reference: identifier.optional(),
      status: identifier.optional(),
    }),
    defaultCurrency: z.string().length(3).optional(),
    statusValues: z.record(z.string(), z.enum(['pending', 'booked', 'reversed'])).optional(),
  })
  .superRefine((value, context) => {
    try {
      validateCsvMapping(value)
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Specify one amount layout, one currency source and distinct mapped columns.',
      })
    }
  })
export const savedCsvMappingDto = z.strictObject({
  id: identifier,
  profileId: identifier,
  accountId: identifier,
  name: z.string(),
  mapping: csvMappingDto,
  revision,
  archived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const issueDto = z.strictObject({
  row: z.number().int().positive().nullable(),
  column: z.enum(columnNames).nullable(),
  code: z.string(),
})
const provenanceDto = z.strictObject({
  identity: z.enum(['external', 'file_content_ordinal']),
  sourceExternalId: z.string().nullable(),
  contentFingerprint: digestSchema,
  occurrence: z.number().int().positive(),
  rawBookedOn: z.string(),
  rawValueOn: z.string().nullable(),
  rawFields: z.record(z.string(), z.string()),
  valueOn: z.string().nullable(),
})
export const mappedPreviewDto = z.strictObject({
  format: z.literal('lilleri.csv-preview.v1'),
  fileDigest: digestSchema.nullable(),
  mappingDigest: digestSchema.nullable(),
  workbook: z
    .strictObject({
      format: z.literal('xlsx'),
      workbookDigest: digestSchema,
      sheet: z.string().min(1).max(128),
      headerRow: z.number().int().min(1).max(100),
    })
    .optional(),
  header: z.array(z.string()),
  rowCount: z.number().int().min(0),
  rows: z.array(
    z.strictObject({
      rowNumber: z.number().int().positive(),
      record: z.strictObject({
        id: z.string(),
        accountId: z.string(),
        amount: z.string(),
        currency: z.string(),
        description: z.string(),
        bookedOn: z.string(),
        status: z.enum(['pending', 'booked', 'reversed']),
        source: z.literal('csv'),
        kind: z.enum(['expense', 'income']),
        merchantName: z.string().optional(),
        reference: z.string().optional(),
      }),
      provenance: provenanceDto,
    }),
  ),
  errors: z.array(issueDto),
  warnings: z.array(issueDto),
  duplicateCandidates: z.array(
    z.strictObject({
      contentFingerprint: digestSchema,
      rowNumbers: z.array(z.number().int().positive()),
      reason: z.literal('same_content_without_external_id'),
    }),
  ),
  crossSourceCandidates: z.array(
    z.strictObject({
      rowNumber: z.number().int().positive(),
      transactionId: identifier,
      bookedOn: z.string(),
      description: z.string(),
      merchantName: z.string().nullable(),
      dateDistanceDays: z.number().int().min(0).max(7),
      sameReference: z.boolean(),
    }),
  ),
  previousImports: z.array(
    z.strictObject({
      rowNumber: z.number().int().positive(),
      transactionId: identifier,
      disposition: z.enum(['linked', 'imported']),
      linkedTransactionId: identifier.nullable(),
    }),
  ),
  canImport: z.boolean(),
  previewRevision: digestSchema,
})
