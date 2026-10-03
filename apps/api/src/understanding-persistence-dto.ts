import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { z } from 'zod'
import { monthlyResponseDtoSchema, understandingCaptureDtoSchema } from './understanding-dto.js'

const id = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !value.includes('\0'))
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const instant = z.iso.datetime().refine((value) => new Date(value).toISOString() === value)
const currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine((value) => {
    try {
      return Boolean(parseDecimal('0', value as CurrencyCode))
    } catch {
      return false
    }
  }) as z.ZodType<CurrencyCode, string>

const calendar = z.iso.date()
const minor = z.string().regex(/^-?(?:0|[1-9]\d{0,39})$/)
export const understandingPreferenceValuesDto = z.strictObject({
  accountIds: z
    .array(id)
    .max(256)
    .refine((value) => new Set(value).size === value.length),
  bufferByCurrency: z.partialRecord(currency, z.string().regex(/^(?:0|[1-9]\d{0,39})$/)),
  horizon: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('month_end') }),
    z.strictObject({ mode: z.literal('date'), on: calendar }),
    z.strictObject({ mode: z.literal('next_salary'), on: calendar }),
  ]),
})
export type UnderstandingPreferenceValues = z.infer<typeof understandingPreferenceValuesDto>
// Defaults are an explicit user preference: no accounts or assumed cash buffer, month end.
export const DEFAULT_UNDERSTANDING_PREFERENCES = Object.freeze<UnderstandingPreferenceValues>({
  accountIds: [],
  bufferByCurrency: {},
  horizon: { mode: 'month_end' },
})
export const understandingPreferencesDto = z.strictObject({
  profileId: id,
  revision: z.number().int().min(1),
  digest,
  updatedAt: instant,
  values: understandingPreferenceValuesDto,
})
export const updateUnderstandingPreferencesDto = z.strictObject({
  revision: z.number().int().min(1).max(2147483646),
  expectedDigest: digest,
  values: understandingPreferenceValuesDto,
})
export const undoUnderstandingPreferencesDto = z.strictObject({
  revision: z.number().int().min(2).max(2147483646),
  expectedDigest: digest,
  eventId: id,
})
export const preferenceEventPayloadDto = z.strictObject({
  before: understandingPreferenceValuesDto.nullable(),
  after: understandingPreferenceValuesDto,
  undoOf: id.nullable(),
})
export const preferenceEventDto = z.strictObject({
  id,
  profileId: id,
  revision: z.number().int().min(2),
  action: z.enum(['changed', 'undone', 'source_erased']),
  digest,
  occurredAt: instant,
  payload: preferenceEventPayloadDto.nullable(),
  sourceReceiptId: id.nullable(),
})
export const snapshotAccountDto = z.strictObject({
  id,
  connectionId: id,
  currency,
  kind: z.enum(['current', 'card', 'cash', 'savings']),
  openingOn: calendar.nullable(),
})
export const snapshotTransactionDto = z.strictObject({
  id,
  accountId: id,
  connectionId: id,
  revision: z.number().int().min(1),
  amountMinor: minor,
  currency,
  status: z.enum(['pending', 'booked', 'reversed']),
  kind: z.string().min(1).max(64),
  bookedOn: calendar.nullable(),
  authorizedOn: calendar.nullable(),
  relatedTransactionId: id.nullable(),
  relatedAccountId: id.nullable(),
})
export const snapshotReferenceDto = z.strictObject({
  subjectKind: z.enum(['account', 'transaction']),
  subjectId: id,
  accountId: id,
  connectionId: id,
  erasureRevision: z.number().int().min(0),
})
export const monthlySnapshotPayloadDto = z.strictObject({
  format: z.literal('lilleri.monthly-snapshot.v1'),
  result: monthlyResponseDtoSchema,
  policy: z.strictObject({
    version: id,
    maxBalanceAgeMs: z.number().int().nonnegative(),
    occurrenceToleranceDays: z.number().int().nonnegative(),
    maxForecastOccurrences: z.number().int().positive(),
    horizonDays: z.number().int().positive(),
  }),
  inputFacts: z.strictObject({
    accounts: z.array(snapshotAccountDto),
    transactions: z.array(snapshotTransactionDto),
    confirmedRefundLinks: z.array(z.strictObject({ id, transactionIds: z.array(id).min(2) })),
  }),
  references: z.array(snapshotReferenceDto),
})
export const monthlySnapshotDto = z.strictObject({
  id,
  profileId: id,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  capturedAt: instant,
  inputDigest: digest,
  digest,
  payload: monthlySnapshotPayloadDto.nullable(),
  sourceReceiptId: id.nullable(),
})
export const captureMonthlySnapshotDto = z.strictObject({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  expectedInputDigest: digest,
  policyVersion: id,
})
export const snapshotHistoryQueryDto = z.strictObject({
  before: z.string().min(1).max(512).optional(),
})
export const snapshotHistoryDto = z.strictObject({
  items: z.array(monthlySnapshotDto),
  nextCursor: z.string().nullable(),
})
export const understandingOwnershipExportDto = z.strictObject({
  preferences: understandingPreferencesDto,
  preferenceEvents: z.array(preferenceEventDto),
  monthlySnapshots: z.array(monthlySnapshotDto),
})
export type UnderstandingOwnershipExport = z.infer<typeof understandingOwnershipExportDto>
export { understandingCaptureDtoSchema }
