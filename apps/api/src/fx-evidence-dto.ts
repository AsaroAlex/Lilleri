import { dateOnly, parseDecimal } from '@lilleri/domain'
import { z } from 'zod'

const currency = z
  .string()
  .length(3)
  .refine((value) => {
    try {
      parseDecimal('0', value as Parameters<typeof parseDecimal>[1])
      return true
    } catch {
      return false
    }
  })
const calendar = z
  .string()
  .length(10)
  .refine((value) => {
    try {
      dateOnly(value)
      return true
    } catch {
      return false
    }
  })
const providerMoney = z
  .strictObject({ amount: z.string().min(1).max(100), currency })
  .refine((value) => {
    try {
      parseDecimal(value.amount, value.currency as Parameters<typeof parseDecimal>[1])
      return true
    } catch {
      return false
    }
  })
const exactMoney = z.strictObject({
  amountMinor: z
    .string()
    .regex(/^-?(0|[1-9]\d*)$/u)
    .max(100),
  currency,
})
export const providerFxEvidenceSchema = z.strictObject({
  version: z.literal('provider-fx-v1'),
  original: providerMoney.nullable(),
  billed: providerMoney.nullable(),
  rate: z
    .strictObject({
      decimal: z
        .string()
        .regex(/^(0|[1-9]\d*)(\.\d+)?$/u)
        .max(80)
        .refine((value) => /[1-9]/u.test(value)),
      baseCurrency: currency,
      quoteCurrency: currency,
      date: calendar.nullable(),
    })
    .nullable(),
  sourceReference: z
    .string()
    .min(1)
    .max(500)
    .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value))
    .nullable(),
})
export const fxPayloadDto = z.strictObject({
  version: z.literal('transaction-fx-v1'),
  state: z.enum(['unknown', 'partial', 'complete', 'conflict']),
  original: exactMoney.nullable(),
  billed: exactMoney.nullable(),
  rate: providerFxEvidenceSchema.shape.rate,
  sourceReference: providerFxEvidenceSchema.shape.sourceReference,
  ledgerAmount: exactMoney,
  issues: z.array(
    z.enum([
      'missing_original',
      'missing_billed',
      'missing_rate',
      'missing_rate_date',
      'missing_source_reference',
      'billed_ledger_mismatch',
      'rate_pair_mismatch',
      'amount_direction_mismatch',
      'future_rate_date',
    ]),
  ),
})
export const fxEvidenceEventDto = fxPayloadDto
  .extend({
    id: z.string().min(1),
    profileId: z.string().min(1),
    connectionId: z.string().min(1),
    accountId: z.string().min(1),
    transactionId: z.string().min(1),
    providerId: z.string().min(1),
    revision: z.number().int().positive(),
    observationId: z.string().nullable(),
    jobId: z.string().nullable(),
    observedAt: z.string().datetime({ offset: true }),
  })
  .strict()
export const fxEvidenceDto = z.strictObject({
  transactionId: z.string().min(1),
  state: fxPayloadDto.shape.state,
  current: fxEvidenceEventDto.nullable(),
  history: z.array(fxEvidenceEventDto),
  nextBeforeRevision: z.number().int().positive().nullable(),
})
export const fxOwnershipDto = z.array(fxEvidenceEventDto)
export type FxPayload = z.infer<typeof fxPayloadDto>
export type FxEvidenceEvent = z.infer<typeof fxEvidenceEventDto>
