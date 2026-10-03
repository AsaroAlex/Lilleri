import { type Database, schema } from '@lilleri/database'
import {
  addDays,
  type CurrencyCode,
  calendarDate,
  calendarDateAt,
  parseDecimal,
} from '@lilleri/domain'
import {
  buildMonthlyInsights,
  type Coverage,
  calculateSafeToSpend,
  detectRecurring,
  type MonthlyInsight,
  type SafeToSpendResult,
  UnderstandingInputError,
  understandingHorizon,
} from '@lilleri/engines'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { manualAccounts } from './manual-schema.js'
import { PrivacyService } from './privacy.js'
import { notFound, Problem } from './problem.js'
import { type DemoService, json } from './service.js'

export interface UnderstandingConfiguration {
  readonly version: string
  readonly maxBalanceAgeMs: number
  readonly occurrenceToleranceDays: number
  readonly maxForecastOccurrences: number
  readonly horizonDays: number
}
const invalid = () =>
  new Problem(
    400,
    'invalid_understanding_input',
    'Controlla il mese, i conti, la data e gli importi indicati.',
  )
const identifier = z.string().min(1).max(256)
const amount = z.string().regex(/^-?(?:0|[1-9]\d*)$/)
const currency = z.custom<CurrencyCode>((value) => {
  try {
    return typeof value === 'string' && Boolean(parseDecimal('0', value as CurrencyCode))
  } catch {
    return false
  }
})
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
const monthlyQuery = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  })
  .strict()
const safeQuery = z
  .object({
    accountIds: z.string().min(1).max(8192),
    horizonOn: z.string().length(10),
    bufferByCurrency: z.string().min(2).max(4096),
  })
  .strict()
const bufferSchema = z.record(currency, z.string().regex(/^(?:0|[1-9]\d{0,39})$/))

/** Current scoped calculation; configuration must be captured before entering the SQL role scope. */
export class UnderstandingService {
  constructor(
    readonly demo: DemoService,
    readonly configuration: UnderstandingConfiguration,
  ) {}
  private boundary(timezone: string, now: string) {
    if (!Number.isSafeInteger(this.configuration.horizonDays) || this.configuration.horizonDays < 1)
      throw invalid()
    const today = calendarDateAt(new Date(now), timezone)
    const maxHorizonOn = String(addDays(today, this.configuration.horizonDays))
    const suggestedHorizonOn = understandingHorizon({ now, timezone, nextSalaryOn: null })
    return {
      calculatedOn: String(today),
      defaultHorizonOn: suggestedHorizonOn < maxHorizonOn ? suggestedHorizonOn : maxHorizonOn,
      maxHorizonOn,
      policyVersion: this.configuration.version,
    }
  }
  private async snapshot(db: Database) {
    const profile = await this.demo.profile(db)
    const data = await this.demo.data(db)
    const privacy = await new PrivacyService(
      db,
      this.demo.profileId,
      this.demo.now,
    ).analysisContext(db, data.analysis.classifications)
    const manual = await db
      .select()
      .from(manualAccounts)
      .where(eq(manualAccounts.profileId, this.demo.profileId))
    const connections = await db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.profileId, this.demo.profileId))
    const localConnections = new Set(
      connections.filter((row) => row.providerId === 'local-manual').map((row) => row.id),
    )
    const states = new Map(
      manual
        .filter((row) =>
          data.accounts.some(
            (account) => account.id === row.accountId && localConnections.has(account.connectionId),
          ),
        )
        .map((row) => [row.accountId, row]),
    )
    const now = this.demo.now()
    return { profile, data, privacy, states, now, boundary: this.boundary(profile.timezone, now) }
  }
  async monthly(input: { month?: string | undefined } = {}) {
    if (!monthlyQuery.safeParse(input).success) throw invalid()
    return this.demo.db.transaction(
      async (db) => {
        const { profile, data, privacy, states, now, boundary } = await this.snapshot(db)
        const month = input.month ?? boundary.calculatedOn.slice(0, 7)
        const coverageByAccount: Record<string, Coverage> = {}
        for (const account of data.accounts) {
          const state = states.get(account.id)
          coverageByAccount[account.id] = state
            ? `${month}-01` >= state.openingOn
              ? 'complete'
              : 'partial'
            : 'unknown'
        }
        let insights: MonthlyInsight[]
        try {
          insights = buildMonthlyInsights({
            profileId: profile.id,
            timezone: profile.timezone,
            now,
            accounts: data.accounts,
            transactions: data.transactions,
            matches: data.analysis.matches,
            excludedTransactionIds: privacy.excludedTransactionIds,
            coverageByAccount,
            month,
          })
        } catch (error) {
          if (error instanceof UnderstandingInputError) throw invalid()
          throw error
        }
        const excluded = new Set(privacy.excludedTransactionIds)
        const availableMonths = [
          ...new Set([
            boundary.calculatedOn.slice(0, 7),
            ...data.transactions
              .filter(
                (row) =>
                  !excluded.has(row.id) &&
                  row.status === 'booked' &&
                  row.bookedOn !== null &&
                  row.bookedOn <= boundary.calculatedOn,
              )
              .map((row) => row.bookedOn?.slice(0, 7) as string),
          ]),
        ]
          .sort()
          .reverse()
        return monthlyResponseDtoSchema.parse(
          json({
            month,
            availableMonths,
            profileTimezone: profile.timezone,
            insights,
            boundary,
          }),
        )
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async safe(input: z.infer<typeof safeQuery>) {
    const checked = safeQuery.safeParse(input)
    if (!checked.success) throw invalid()
    let buffers: Record<string, string>
    try {
      buffers = bufferSchema.parse(JSON.parse(input.bufferByCurrency))
    } catch {
      throw invalid()
    }
    const selected = input.accountIds.split(',')
    if (selected.some((id) => !id || id.length > 256) || new Set(selected).size !== selected.length)
      throw invalid()
    return this.demo.db.transaction(
      async (db) => {
        const { profile, data, privacy, states, now, boundary } = await this.snapshot(db)
        if (selected.some((id) => !data.accounts.some((account) => account.id === id)))
          throw notFound()
        try {
          calendarDate(input.horizonOn)
        } catch {
          throw invalid()
        }
        if (input.horizonOn < boundary.calculatedOn || input.horizonOn > boundary.maxHorizonOn)
          throw invalid()
        const currencies = new Set(
          data.accounts
            .filter((row) => selected.includes(row.id))
            .map((row) => row.balance.currency),
        )
        if (
          Object.keys(buffers).some(
            (code) =>
              !currencies.has(code as (typeof data.accounts)[number]['balance']['currency']),
          )
        )
          throw invalid()
        let results: SafeToSpendResult[]
        try {
          results = calculateSafeToSpend({
            profileId: profile.id,
            timezone: profile.timezone,
            now,
            accounts: data.accounts,
            transactions: data.transactions,
            matches: data.analysis.matches,
            excludedTransactionIds: privacy.excludedTransactionIds,
            // Preserve hidden liabilities privately, then withhold their evidence/value in the calculator.
            recurring: detectRecurring(data.transactions, data.analysis.matches),
            includedAccountIds: selected,
            occurrenceBindings: [],
            accountKnowledge: data.accounts.map((account) => ({
              accountId: account.id,
              balanceMeaning: states.has(account.id) ? 'booked' : 'unknown',
              pendingOutflowsIncluded: states.has(account.id) ? false : null,
              coverage: states.has(account.id) ? 'complete' : 'unknown',
            })),
            policy: {
              version: this.configuration.version,
              horizonOn: input.horizonOn,
              maxBalanceAgeMs: this.configuration.maxBalanceAgeMs,
              occurrenceToleranceDays: this.configuration.occurrenceToleranceDays,
              maxForecastOccurrences: this.configuration.maxForecastOccurrences,
              bufferByCurrency: Object.fromEntries(
                Object.entries(buffers).map(([code, value]) => [code, BigInt(value)]),
              ),
            },
          })
        } catch (error) {
          if (error instanceof UnderstandingInputError) throw invalid()
          throw error
        }
        return safeResponseDtoSchema.parse(
          json({
            results,
            boundary,
            scope: 'selected-local-ledger-accounts' as const,
            observedLocalLedgerOnly: true as const,
          }),
        )
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
}

export function registerUnderstandingRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<UnderstandingService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/insights/monthly',
    { schema: { querystring: monthlyQuery, response: { 200: monthlyResponseDtoSchema } } },
    (request) => resolve(request).then((service) => service.monthly(request.query)),
  )
  api.get(
    '/v1/safe-to-spend',
    { schema: { querystring: safeQuery, response: { 200: safeResponseDtoSchema } } },
    (request) => resolve(request).then((service) => service.safe(request.query)),
  )
}
