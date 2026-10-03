import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { z } from 'zod'

const identifier = z.string().min(1).max(256)
const amount = z.string().regex(/^-?(?:0|[1-9]\d*)$/)
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

const moneyDto = z.object({ amountMinor: amount, currency }).strict()
const ids = z.array(identifier)
const monthlyReason = z.enum([
  'coverage_partial',
  'coverage_unknown',
  'missing_booked_date',
  'unresolved_refund',
  'unresolved_cash_flow',
  'reconciliation_requires_review',
  'future_booked_date',
])
const safeReason = z.enum([
  'balance_meaning_unknown',
  'balance_stale',
  'balance_timestamp_invalid',
  'balance_timestamp_in_future',
  'coverage_partial',
  'coverage_unknown',
  'card_balance_not_spendable_cash',
  'pending_balance_semantics_unknown',
  'private_outflow_coverage',
  'private_recurring_coverage',
  'unresolved_pending_reconciliation',
  'unresolved_recurring_occurrence',
  'overdue_recurring_occurrence',
  'buffer_not_configured',
  'forecast_work_limit',
  'future_booked_data',
])
export const monthlyInsightDtoSchema = z
  .object({
    id: identifier,
    profileId: identifier,
    algorithmVersion: z.literal('observed-understanding-v1'),
    type: z.literal('monthly_summary'),
    month: z.string(),
    currency,
    status: z.enum(['complete', 'partial']),
    inputs: z
      .object({
        accountIds: ids,
        transactionIds: ids,
        incomeTransactionIds: ids,
        expenseTransactionIds: ids,
        refundTransactionIds: ids,
        unresolvedTransactionIds: ids,
        fromOn: z.string(),
        throughOn: z.string(),
        profileTimezone: z.string(),
      })
      .strict(),
    calculation: z
      .object({
        formula: z.literal(
          'net_spending = expenses - linked_refunds; net_flow = income - net_spending',
        ),
        incomeMinor: amount,
        expensesMinor: amount,
        linkedRefundsMinor: amount,
        unresolvedCreditsMinor: amount,
        unresolvedDebitsMinor: amount,
        bookedTransactionCount: z.number().int().nonnegative(),
      })
      .strict(),
    value: z.object({ netSpending: moneyDto, netFlow: moneyDto }).strict(),
    isEstimate: z.literal(false),
    confidence: z.null(),
    reasons: z.array(monthlyReason),
    explanationIt: z.string(),
  })
  .strict()
export const safeToSpendDtoSchema = z
  .object({
    currency,
    algorithmVersion: z.literal('observed-understanding-v1'),
    policyVersion: z.string(),
    status: z.enum(['available', 'shortfall', 'unavailable']),
    value: moneyDto.nullable(),
    isEstimate: z.literal(true),
    confidence: z.null(),
    horizonOn: z.string(),
    calculatedOn: z.string(),
    inputs: z
      .object({
        accountIds: ids,
        pendingTransactionIds: ids,
        estimatedSeriesIds: z.array(z.string()),
        estimatedOccurrences: z.array(
          z.object({ seriesId: z.string(), on: z.string(), amountMinor: amount }).strict(),
        ),
        recurringEvidenceTransactionIds: ids,
        fulfilledOccurrenceTransactionIds: ids,
      })
      .strict(),
    calculation: z
      .object({
        formula: z.literal(
          'safe_to_spend = included_balances - pending_outflows - estimated_upcoming_outflows - buffer',
        ),
        includedBalanceMinor: amount,
        pendingOutflowsMinor: amount.nullable(),
        estimatedUpcomingOutflowsMinor: amount.nullable(),
        bufferMinor: amount.nullable(),
        forecastIncomeAddedMinor: z.literal('0'),
      })
      .strict(),
    reasons: z.array(safeReason),
    explanationIt: z.string(),
  })
  .strict()
export const understandingCaptureDtoSchema = z.strictObject({
  capturedAt: z.iso.datetime(),
  inputDigest: z.string().regex(/^[a-f0-9]{64}$/),
  ledgerDigest: z.string().regex(/^[a-f0-9]{64}$/),
  privacyDigest: z.string().regex(/^[a-f0-9]{64}$/),
  policyVersion: z.string().min(1).max(200),
})
const boundaryDto = z
  .object({
    calculatedOn: z.string(),
    defaultHorizonOn: z.string(),
    maxHorizonOn: z.string(),
    policyVersion: z.string(),
  })
  .strict()
export const monthlyResponseDtoSchema = z
  .object({
    month: z.string(),
    availableMonths: z.array(z.string()),
    profileTimezone: z.string(),
    insights: z.array(monthlyInsightDtoSchema),
    boundary: boundaryDto,
    capture: understandingCaptureDtoSchema,
  })
  .strict()
export const safeResponseDtoSchema = z
  .object({
    results: z.array(safeToSpendDtoSchema),
    boundary: boundaryDto,
    scope: z.literal('selected-local-ledger-accounts'),
    observedLocalLedgerOnly: z.literal(true),
  })
  .strict()
export const monthlyQuery = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  })
  .strict()
export const safeQuery = z
  .object({
    accountIds: z.string().min(1).max(8192),
    horizonOn: z.string().length(10),
    bufferByCurrency: z.string().min(2).max(4096),
  })
  .strict()
export const bufferSchema = z.record(currency, z.string().regex(/^(?:0|[1-9]\d{0,39})$/))
