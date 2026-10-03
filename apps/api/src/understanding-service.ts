import { createHash } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { addDays, calendarDate, calendarDateAt } from '@lilleri/domain'
import {
  buildMonthlyInsights,
  type Coverage,
  calculateSafeToSpend,
  type MonthlyInsight,
  type SafeToSpendResult,
  UnderstandingInputError,
  understandingHorizon,
} from '@lilleri/engines'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { z } from 'zod'
import { manualAccounts } from './manual-schema.js'
import { PrivacyService } from './privacy.js'
import { transactionPrivacy } from './privacy-schema.js'
import { notFound, Problem } from './problem.js'
import { RecurringService } from './recurring.js'
import { type DemoService, json } from './service.js'
import { canonicalSourceValue } from './source-erasure-dto.js'
import { sourceFactGenerations } from './source-erasure-schema.js'

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

import {
  bufferSchema,
  monthlyQuery,
  monthlyResponseDtoSchema,
  safeQuery,
  safeResponseDtoSchema,
  understandingCaptureDtoSchema,
} from './understanding-dto.js'

export {
  monthlyInsightDtoSchema,
  monthlyResponseDtoSchema,
  safeResponseDtoSchema,
  safeToSpendDtoSchema,
  understandingCaptureDtoSchema,
} from './understanding-dto.js'

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
  async captureInputs(db: Database, now = this.demo.now()) {
    const profile = await this.demo.profile(db)
    const data = await this.demo.data(db)
    const basePrivacy = await new PrivacyService(
      db,
      this.demo.profileId,
      this.demo.now,
    ).analysisContext(db, data.analysis.classifications)
    const privacy = {
      ...basePrivacy,
      excludedTransactionIds: [
        ...new Set([
          ...basePrivacy.excludedTransactionIds,
          ...data.merchantContext.excludedTransactionIds,
        ]),
      ],
    }
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
    const flags = await db
      .select()
      .from(transactionPrivacy)
      .where(eq(transactionPrivacy.profileId, this.demo.profileId))
    const sourceGenerations = await db
      .select()
      .from(sourceFactGenerations)
      .where(eq(sourceFactGenerations.profileId, this.demo.profileId))
    return {
      profile,
      data,
      privacy,
      flags,
      sourceGenerations,
      states,
      now,
      boundary: this.boundary(profile.timezone, now),
    }
  }
  captureMetadata(snapshot: UnderstandingInputSnapshot, month: string) {
    const digest = (value: unknown) =>
      createHash('sha256')
        .update(canonicalSourceValue(json(value)))
        .digest('hex')
    const { data, profile, privacy, flags, sourceGenerations, states, boundary, now } = snapshot
    // Only bounded financial/version projections are hashed; no raw descriptions, names or secrets.
    const ledgerDigest = digest({
      accounts: data.accounts.map(({ id, connectionId, kind, balance, balanceUpdatedAt }) => ({
        id,
        connectionId,
        kind,
        balance,
        balanceUpdatedAt,
      })),
      transactions: data.ledgerTransactions.map(
        ({
          id,
          accountId,
          connectionId,
          revision,
          amount,
          status,
          kind,
          bookedOn,
          authorizedOn,
          relatedTransactionId,
          relatedAccountId,
        }) => ({
          id,
          accountId,
          connectionId,
          revision,
          amount,
          status,
          kind,
          bookedOn,
          authorizedOn,
          relatedTransactionId,
          relatedAccountId,
        }),
      ),
      activeTransactionIds: data.transactions.map(({ id }) => id),
      matches: data.analysis.matches,
      manual: [...states.values()].map(({ accountId, openingOn, revision }) => ({
        accountId,
        openingOn,
        revision,
      })),
      timezone: profile.timezone,
      // Encrypted proof bytes never leave storage; their digest fences a same-ID reauthorization too.
      sourceGenerations: sourceGenerations
        .map(({ connectionId, kind, subjectId, recordedAt, proof }) => ({
          connectionId,
          kind,
          subjectId,
          recordedAt,
          proofDigest: digest(proof),
        }))
        .sort((a, b) => `${a.kind}:${a.subjectId}`.localeCompare(`${b.kind}:${b.subjectId}`)),
    })
    const privacyDigest = digest({
      ...privacy,
      excludedTransactionIds: [...privacy.excludedTransactionIds].sort(),
      flags: flags
        .map(({ transactionId, revision, quiet, private: hidden }) => ({
          transactionId,
          revision,
          quiet,
          private: hidden,
        }))
        .sort((a, b) => a.transactionId.localeCompare(b.transactionId)),
    })
    return understandingCaptureDtoSchema.parse({
      capturedAt: now,
      ledgerDigest,
      privacyDigest,
      policyVersion: this.configuration.version,
      inputDigest: digest({
        month,
        ledgerDigest,
        privacyDigest,
        calculatedOn: boundary.calculatedOn,
        policy: this.configuration,
      }),
    })
  }
  calculateMonthly(snapshot: UnderstandingInputSnapshot, requestedMonth?: string) {
    const { profile, data, privacy, states, now, boundary } = snapshot
    const month = requestedMonth ?? boundary.calculatedOn.slice(0, 7)
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
        capture: this.captureMetadata(snapshot, month),
      }),
    )
  }
  async monthly(input: { month?: string | undefined } = {}) {
    if (!monthlyQuery.safeParse(input).success) throw invalid()
    return this.demo.db.transaction(
      async (db) => this.calculateMonthly(await this.captureInputs(db), input.month),
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
        const { profile, data, privacy, states, now, boundary } = await this.captureInputs(db)
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
        const liabilities = await new RecurringService(
          this.demo,
          this.demo.recurringPolicy,
        ).liabilityContext(db, now)
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
            recurring: liabilities.series.map((series) => ({
              ...series,
              id: `recurring_${createHash('sha256').update(series.stableKey).digest('hex')}`,
            })),
            uncertainRecurringTransactionIds: liabilities.uncertainTransactionIds,
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

export type UnderstandingInputSnapshot = Awaited<ReturnType<UnderstandingService['captureInputs']>>
