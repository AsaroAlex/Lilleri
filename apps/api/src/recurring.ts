import { createHash, randomUUID } from 'node:crypto'
import type { Database } from '@lilleri/database'
import { schema } from '@lilleri/database'
import { addDays, calendarDateAt, type Transaction } from '@lilleri/domain'
import {
  detectObservedRecurring,
  detectRecurringLiabilities,
  type ObservedRecurringSeries,
  projectRecurringOccurrences,
  RECURRING_FREQUENCIES,
  RECURRING_KINDS,
  type RecurringChoice,
  type RecurringEvidence,
  type RecurringPolicy,
  type RecurringSelector,
  recurringStableKey,
} from '@lilleri/engines'
import { and, desc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { PrivacyService } from './privacy.js'
import { notFound, Problem } from './problem.js'
import { recurringPreferenceEvents, recurringPreferences } from './recurring-schema.js'
import { type DemoService, json } from './service.js'

const revision = z.number().int().min(1).max(2147483645)
const choiceSchema = z
  .object({
    status: z.enum(['observed', 'confirmed', 'not_recurring']),
    kind: z.enum(RECURRING_KINDS).nullable(),
    frequency: z.enum(RECURRING_FREQUENCIES).nullable(),
    installmentCount: z.number().int().min(1).max(10000).nullable(),
    installmentIndex: z.number().int().min(1).max(10000).nullable(),
  })
  .strict()
export const recurringChangeSchema = z
  .object({
    revision,
    status: z.enum(['observed', 'confirmed', 'not_recurring']),
    kind: z.enum(RECURRING_KINDS).optional(),
    frequency: z.enum(RECURRING_FREQUENCIES).optional(),
    installmentCount: z.number().int().min(1).max(10000).optional(),
    installmentIndex: z.number().int().min(1).max(10000).optional(),
  })
  .strict()
const selectorSchema = z
  .object({
    profileId: z.string().min(1),
    accountId: z.string().min(1),
    currency: z.string().length(3),
    direction: z.enum(['outgoing', 'incoming']),
    identityKind: z.enum(['mandate', 'creditor', 'merchant', 'legacy_merchant']),
    identityValue: z.string().min(1),
  })
  .strict()
const moneyDto = z
  .object({ amountMinor: z.string().regex(/^-?\d+$/), currency: z.string().length(3) })
  .strict()
export const recurringItemDto = z
  .object({
    id: z.string(),
    revision,
    lastChangedAt: z.string().nullable(),
    canUndo: z.boolean(),
    kind: z.enum(RECURRING_KINDS),
    frequency: z.enum(RECURRING_FREQUENCIES),
    status: z.enum(['observed', 'confirmed', 'not_recurring']),
    nextOn: z.string().nullable(),
    expectedAmount: moneyDto,
    variability: z.enum(['fixed', 'variable']),
    transactionIds: z.array(z.string()),
    firstOn: z.string(),
    latestOn: z.string(),
    statistics: z
      .object({
        observedCount: z.number().int(),
        medianMethod: z.literal('upper_absolute_minor'),
        minimumAmount: moneyDto,
        maximumAmount: moneyDto,
        dayOfMonthMedian: z.number(),
        anchorDay: z.number(),
        observedIntervalsDays: z.array(z.number()),
        amountOutsideBand: z.boolean(),
      })
      .strict(),
    remainingInstallments: z.number().int().nullable(),
    noticePeriod: z.string().nullable(),
    cancellationInstructions: z.string().nullable(),
    isEstimate: z.literal(true),
    confidence: z.null(),
    confidenceWord: z.enum(['observed_pattern', 'user_confirmed']),
    algorithmVersion: z.literal('recurring-observed-v1'),
    policyVersion: z.string(),
    evidence: z.array(z.string()),
    explanationIt: z.string(),
    forecast: z
      .object({
        status: z.enum(['estimated', 'unknown', 'work_limit']),
        occurrences: z.array(z.object({ on: z.string(), amount: moneyDto }).strict()),
      })
      .strict(),
  })
  .strict()
export const recurringResponseDto = z
  .object({
    items: z.array(recurringItemDto),
    calculatedOn: z.string(),
    horizonOn: z.string(),
    policyVersion: z.string(),
    observedLocalLedgerOnly: z.literal(true),
    alertsAvailable: z.literal(false),
  })
  .strict()
const baseline: RecurringChoice = Object.freeze({
  status: 'observed',
  kind: null,
  frequency: null,
  installmentCount: null,
  installmentIndex: null,
})
const invalid = () =>
  new Problem(
    400,
    'invalid_recurring_choice',
    'Controlla il tipo, il periodo e i dati della ricorrenza.',
  )
const changed = () =>
  new Problem(
    409,
    'recurring_changed',
    'La ricorrenza è cambiata. Aggiorna la pagina prima di correggerla.',
  )
const opaqueId = (key: string) => `recurring_${createHash('sha256').update(key).digest('hex')}`
const instant = (value: string) => {
  const time = Date.parse(value)
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value)
    throw new Error('Recurring clock is invalid')
  return value
}
function selectorFor(row: Transaction, hint: RecurringEvidence): RecurringSelector | null {
  const identity = hint.mandateReference
    ? {
        identityKind: 'mandate' as const,
        identityValue: JSON.stringify([hint.creditorId ?? null, hint.mandateReference]),
      }
    : hint.creditorId
      ? { identityKind: 'creditor' as const, identityValue: hint.creditorId }
      : hint.merchantId && hint.merchantResolution === 'resolved'
        ? { identityKind: 'merchant' as const, identityValue: hint.merchantId }
        : row.merchantKey && !['ambiguous', 'suppressed'].includes(hint.merchantResolution ?? '')
          ? { identityKind: 'legacy_merchant' as const, identityValue: row.merchantKey }
          : null
  return identity
    ? {
        profileId: row.profileId,
        accountId: row.accountId,
        currency: row.amount.currency,
        direction: row.amount.amountMinor < 0n ? 'outgoing' : 'incoming',
        ...identity,
      }
    : null
}
export type RecurringEvidenceResolver = (
  db: Database,
  data: Awaited<ReturnType<DemoService['data']>>,
) => Promise<Readonly<Record<string, RecurringEvidence>>>
type Preference = typeof recurringPreferences.$inferSelect
interface LoadedPreference {
  row: Preference
  selector: RecurringSelector
  choice: RecurringChoice
  canUndo: boolean
}
interface Audit {
  before: RecurringChoice
  after: RecurringChoice
  evidenceTransactionIds: string[]
  policyVersion: string
}
/** Pure estimates and explicit profile-owned feedback. No contract or alert is inferred. */
export class RecurringService {
  constructor(
    readonly demo: DemoService,
    readonly policy: RecurringPolicy,
    readonly evidenceResolver?: RecurringEvidenceResolver,
  ) {}
  private async encode(db: Database, table: string, column: string, rowId: string, value: unknown) {
    if (!this.demo.encryption) throw new Error('Recurring feedback requires profile encryption')
    return {
      _lilleriEncrypted: await this.demo.encryption.encryptJson(
        db,
        { profileId: this.demo.profileId, table, column, rowId },
        value,
      ),
    }
  }
  private async decode(
    db: Database,
    table: string,
    column: string,
    rowId: string,
    value: Record<string, unknown>,
  ): Promise<unknown> {
    if (
      !this.demo.encryption ||
      Object.keys(value).length !== 1 ||
      typeof value._lilleriEncrypted !== 'string'
    )
      throw new Error('Recurring encrypted envelope is invalid')
    return this.demo.encryption.decryptJson(
      db,
      { profileId: this.demo.profileId, table, column, rowId },
      value._lilleriEncrypted,
    )
  }
  private async preferences(db: Database): Promise<LoadedPreference[]> {
    const rows = await db
      .select()
      .from(recurringPreferences)
      .where(eq(recurringPreferences.profileId, this.demo.profileId))
    const result: LoadedPreference[] = []
    const events = await db
      .select()
      .from(recurringPreferenceEvents)
      .where(eq(recurringPreferenceEvents.profileId, this.demo.profileId))
    for (const row of rows) {
      const selector = selectorSchema.parse(
        await this.decode(db, 'recurring_preferences', 'selector', row.id, row.selector),
      ) as RecurringSelector
      const choice = choiceSchema.parse(
        await this.decode(db, 'recurring_preferences', 'state', row.id, row.state),
      )
      if (
        selector.profileId !== this.demo.profileId ||
        selector.accountId !== row.accountId ||
        opaqueId(recurringStableKey(selector)) !== row.id
      )
        throw new Error('Recurring encrypted scope is invalid')
      result.push({
        row,
        selector,
        choice,
        canUndo:
          events.find((event) => event.preferenceId === row.id && event.revision === row.revision)
            ?.action === 'updated',
      })
    }
    return result
  }
  private async snapshot(db: Database, at: string) {
    const profile = await this.demo.profile(db),
      data = await this.demo.data(db)
    const privacy = await new PrivacyService(
      db,
      this.demo.profileId,
      this.demo.now,
    ).analysisContext(db, data.analysis.classifications)
    const supplied =
      (await this.evidenceResolver?.(db, data)) ??
      Object.fromEntries(
        data.merchantContext.resolutions.map((item) => [
          item.transactionId,
          {
            merchantResolution: item.status,
            ...(item.status === 'resolved' && item.merchantId
              ? { merchantId: item.merchantId }
              : {}),
          },
        ]),
      )
    const evidence: Record<string, RecurringEvidence> = { ...supplied }
    const subscriptions = new Set(
      data.analysis.classifications
        .filter((item) => item.categoryId === 'subscriptions')
        .map((item) => item.transactionId),
    )
    for (const row of data.transactions) {
      const hint = evidence[row.id] ?? {}
      evidence[row.id] = {
        ...hint,
        ...(!hint.purpose && subscriptions.has(row.id) ? { purpose: 'subscription' as const } : {}),
      }
    }
    const preferences = await this.preferences(db)
    // An explicit transfer classification is the user's savings-plan declaration, scoped to source transfers.
    for (const pref of preferences)
      if (pref.choice.kind === 'recurring_transfer')
        for (const row of data.transactions)
          if (
            row.kind === 'transfer' &&
            selectorFor(row, evidence[row.id] ?? {}) &&
            recurringStableKey(selectorFor(row, evidence[row.id] ?? {}) as RecurringSelector) ===
              recurringStableKey(pref.selector)
          )
            evidence[row.id] = {
              ...evidence[row.id],
              purpose: 'recurring_transfer',
              savingsPlan: true,
            }
    const excludedTransactionIds = [
      ...new Set([
        ...privacy.excludedTransactionIds,
        ...data.merchantContext.excludedTransactionIds,
      ]),
    ]
    const privateBoundary = (row: Transaction) => {
      const hint = evidence[row.id] ?? {}
      const selector = selectorFor(row, hint)
      return hint.mandateReference || hint.creditorId
        ? selector
          ? recurringStableKey(selector)
          : null
        : row.merchantKey
          ? JSON.stringify([
              row.accountId,
              row.amount.currency,
              row.amount.amountMinor < 0n ? 'outgoing' : 'incoming',
              row.merchantKey,
            ])
          : null
    }
    const privateGroups = new Set(
      data.transactions
        .filter((row) => excludedTransactionIds.includes(row.id))
        .map(privateBoundary)
        .filter((key): key is string => key !== null),
    )
    for (const row of data.transactions) {
      const key = privateBoundary(row)
      if (key && privateGroups.has(key) && !excludedTransactionIds.includes(row.id))
        excludedTransactionIds.push(row.id)
    }
    const input = {
      profileId: this.demo.profileId,
      asOfOn: String(calendarDateAt(new Date(at), profile.timezone)),
      transactions: data.transactions,
      matches: data.analysis.matches,
      evidenceByTransactionId: evidence,
      choices: Object.fromEntries(
        preferences.map((pref) => [recurringStableKey(pref.selector), pref.choice]),
      ),
      policy: this.policy,
    }
    const series = detectObservedRecurring(input)
    return {
      profile,
      data,
      privacy: { ...privacy, excludedTransactionIds },
      evidence,
      preferences,
      input,
      series,
    }
  }
  private dto(item: ObservedRecurringSeries, prefs: LoadedPreference[], horizonOn: string) {
    const { stableKey, selector: _selector, ...fields } = item,
      id = opaqueId(stableKey)
    const pref = prefs.find((item) => item.row.id === id)
    return recurringItemDto.parse(
      json({
        ...fields,
        id,
        revision: pref?.row.revision ?? 1,
        lastChangedAt: pref?.row.updatedAt ?? null,
        canUndo: pref?.canUndo ?? false,
        forecast:
          item.status === 'not_recurring'
            ? { status: 'estimated', occurrences: [] }
            : projectRecurringOccurrences(item, horizonOn, this.policy.maxProjectedOccurrences),
      }),
    )
  }
  async list(db: Database = this.demo.db) {
    const at = instant(this.demo.now())
    const current = await this.snapshot(db, at),
      calculatedOn = current.input.asOfOn,
      horizonOn = String(
        addDays(calendarDateAt(new Date(at), current.profile.timezone), this.policy.horizonDays),
      )
    const excluded = new Set(current.privacy.excludedTransactionIds)
    return recurringResponseDto.parse({
      items: current.series
        .filter((item) => !item.transactionIds.some((id) => excluded.has(id)))
        .map((item) => this.dto(item, current.preferences, horizonOn)),
      calculatedOn,
      horizonOn,
      policyVersion: this.policy.version,
      observedLocalLedgerOnly: true,
      alertsAvailable: false,
    })
  }
  async liabilityContext(db: Database = this.demo.db, at = instant(this.demo.now())) {
    const current = await this.snapshot(db, at)
    return {
      ...detectRecurringLiabilities(current.input),
      excludedTransactionIds: current.privacy.excludedTransactionIds,
    }
  }
  private async lock(db: Database) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.demo.profileId))
      .for('update')
    if (!profile) throw notFound()
    return profile
  }
  async change(id: string, body: z.infer<typeof recurringChangeSchema>) {
    const parsed = recurringChangeSchema.safeParse(body)
    if (!parsed.success) throw invalid()
    const at = instant(this.demo.now())
    return this.demo.db.transaction(async (db) => {
      await this.lock(db)
      const current = await this.snapshot(db, at),
        item = current.series.find((item) => opaqueId(item.stableKey) === id)
      if (
        !item ||
        item.transactionIds.some((id) => current.privacy.excludedTransactionIds.includes(id))
      )
        throw notFound()
      const stored = current.preferences.find((pref) => pref.row.id === id)
      return this.persist(db, current, item.selector, stored, parsed.data, at, 'updated')
    })
  }
  async markTransaction(id: string, body: z.infer<typeof recurringChangeSchema>) {
    const parsed = recurringChangeSchema.safeParse(body)
    if (
      !parsed.success ||
      parsed.data.status !== 'confirmed' ||
      !parsed.data.kind ||
      !parsed.data.frequency
    )
      throw invalid()
    const at = instant(this.demo.now())
    return this.demo.db.transaction(async (db) => {
      await this.lock(db)
      const current = await this.snapshot(db, at),
        row = current.data.transactions.find((row) => row.id === id)
      if (!row || current.privacy.excludedTransactionIds.includes(id)) throw notFound()
      if (
        row.status !== 'booked' ||
        !row.bookedOn ||
        row.bookedOn > current.input.asOfOn ||
        row.amount.amountMinor === 0n
      )
        throw invalid()
      const selector = selectorFor(row, current.evidence[row.id] ?? {})
      if (!selector) throw invalid()
      return this.persist(
        db,
        current,
        selector,
        current.preferences.find((pref) => pref.row.id === opaqueId(recurringStableKey(selector))),
        parsed.data,
        at,
        'updated',
      )
    })
  }
  private async persist(
    db: Database,
    current: Awaited<ReturnType<RecurringService['snapshot']>>,
    selector: RecurringSelector,
    stored: LoadedPreference | undefined,
    change: z.infer<typeof recurringChangeSchema>,
    at: string,
    action: 'updated' | 'undone',
    forcedChoice?: RecurringChoice,
  ) {
    if (change.revision !== (stored?.row.revision ?? 1)) throw changed()
    if (
      Date.parse(at) <
      Math.max(
        Date.parse(current.profile.createdAt),
        Date.parse(stored?.row.updatedAt ?? current.profile.createdAt),
      )
    )
      throw changed()
    const before = stored?.choice ?? baseline
    const after: RecurringChoice =
      forcedChoice ??
      (change.status === 'observed'
        ? { ...baseline }
        : {
            ...before,
            status: change.status,
            kind: change.kind ?? before.kind,
            frequency: change.frequency ?? before.frequency,
            installmentCount: change.installmentCount ?? before.installmentCount,
            installmentIndex: change.installmentIndex ?? before.installmentIndex,
          })
    const key = recurringStableKey(selector),
      id = opaqueId(key)
    const evidence = { ...current.evidence }
    if (after.kind === 'recurring_transfer')
      for (const row of current.data.transactions) {
        const ownSelector = selectorFor(row, evidence[row.id] ?? {})
        if (row.kind === 'transfer' && ownSelector && recurringStableKey(ownSelector) === key)
          evidence[row.id] = {
            ...evidence[row.id],
            purpose: 'recurring_transfer',
            savingsPlan: true,
          }
      }
    const candidate = detectObservedRecurring({
      ...current.input,
      evidenceByTransactionId: evidence,
      choices: { ...current.input.choices, [key]: after },
    }).find((item) => item.stableKey === key)
    // Restoring observation may legitimately remove a manually asserted one-off series.
    if (!candidate && after.status !== 'observed') throw invalid()
    if (after.kind === 'installment' && !forcedChoice && candidate?.remainingInstallments === null)
      throw invalid()
    const nextRevision = change.revision + 1,
      eventId = randomUUID()
    const encodedSelector = await this.encode(db, 'recurring_preferences', 'selector', id, selector)
    const encodedState = await this.encode(db, 'recurring_preferences', 'state', id, after)
    await db
      .insert(recurringPreferences)
      .values({
        id,
        profileId: this.demo.profileId,
        accountId: selector.accountId,
        selector: encodedSelector,
        state: encodedState,
        revision: nextRevision,
        createdAt: stored?.row.createdAt ?? at,
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: recurringPreferences.id,
        set: { state: encodedState, revision: nextRevision, updatedAt: at },
      })
    const snapshot: Audit = {
      before,
      after,
      evidenceTransactionIds: [...(candidate?.transactionIds ?? [])],
      policyVersion: this.policy.version,
    }
    await db.insert(recurringPreferenceEvents).values({
      id: eventId,
      profileId: this.demo.profileId,
      accountId: selector.accountId,
      preferenceId: id,
      revision: nextRevision,
      action,
      snapshot: await this.encode(db, 'recurring_preference_events', 'snapshot', eventId, snapshot),
      occurredAt: at,
    })
    return { id, revision: nextRevision, updatedAt: at }
  }
  async undo(id: string, expectedRevision: number) {
    if (!revision.safeParse(expectedRevision).success) throw invalid()
    const at = instant(this.demo.now())
    return this.demo.db.transaction(async (db) => {
      await this.lock(db)
      const current = await this.snapshot(db, at),
        stored = current.preferences.find((pref) => pref.row.id === id)
      if (!stored || stored.row.revision !== expectedRevision) throw stored ? changed() : notFound()
      const item = current.series.find(
        (item) => item.stableKey === recurringStableKey(stored.selector),
      )
      if (item?.transactionIds.some((id) => current.privacy.excludedTransactionIds.includes(id)))
        throw notFound()
      const [latestAudit] = await db
        .select()
        .from(recurringPreferenceEvents)
        .where(
          and(
            eq(recurringPreferenceEvents.profileId, this.demo.profileId),
            eq(recurringPreferenceEvents.preferenceId, id),
            eq(recurringPreferenceEvents.revision, stored.row.revision),
          ),
        )
      if (latestAudit) {
        const audit = (await this.decode(
          db,
          'recurring_preference_events',
          'snapshot',
          latestAudit.id,
          latestAudit.snapshot,
        )) as Audit
        if (
          audit.evidenceTransactionIds.some((id) =>
            current.privacy.excludedTransactionIds.includes(id),
          )
        )
          throw notFound()
      }
      const [event] = await db
        .select()
        .from(recurringPreferenceEvents)
        .where(
          and(
            eq(recurringPreferenceEvents.profileId, this.demo.profileId),
            eq(recurringPreferenceEvents.preferenceId, id),
          ),
        )
        .orderBy(desc(recurringPreferenceEvents.revision))
        .limit(1)
      if (!event || event.action === 'undone') throw changed()
      const snapshot = (await this.decode(
        db,
        'recurring_preference_events',
        'snapshot',
        event.id,
        event.snapshot,
      )) as Audit
      const before = choiceSchema.parse(snapshot.before)
      return this.persist(
        db,
        current,
        stored.selector,
        stored,
        { revision: expectedRevision, status: before.status },
        at,
        'undone',
        before,
      )
    })
  }
  async ownedExport(db: Database = this.demo.db) {
    await this.demo.profile(db)
    const preferences = await this.preferences(db)
    const rows = await db
      .select()
      .from(recurringPreferenceEvents)
      .where(eq(recurringPreferenceEvents.profileId, this.demo.profileId))
      .orderBy(desc(recurringPreferenceEvents.revision))
    const events = []
    for (const row of rows)
      events.push({
        id: row.id,
        profileId: row.profileId,
        accountId: row.accountId,
        preferenceId: row.preferenceId,
        revision: row.revision,
        action: row.action,
        occurredAt: row.occurredAt,
        snapshot: await this.decode(
          db,
          'recurring_preference_events',
          'snapshot',
          row.id,
          row.snapshot,
        ),
      })
    return {
      recurringPreferences: preferences.map(({ row, selector, choice }) => ({
        id: row.id,
        profileId: row.profileId,
        accountId: row.accountId,
        selector,
        choice,
        revision: row.revision,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      recurringPreferenceEvents: events,
    }
  }
}
const mutationDto = z
  .object({
    id: z.string(),
    revision: z.number().int().min(2).max(2147483646),
    updatedAt: z.string(),
  })
  .strict()
export function registerRecurringRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<RecurringService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>(),
    params = z.object({ id: z.string().min(1).max(256) }).strict()
  api.get('/v1/recurring', { schema: { response: { 200: recurringResponseDto } } }, (request) =>
    resolve(request).then((service) => service.list()),
  )
  api.patch(
    '/v1/recurring/:id',
    { schema: { params, body: recurringChangeSchema, response: { 200: mutationDto } } },
    (request) =>
      resolve(request).then((service) => service.change(request.params.id, request.body)),
  )
  api.post(
    '/v1/recurring/:id/undo',
    { schema: { params, body: z.object({ revision }).strict(), response: { 200: mutationDto } } },
    (request) =>
      resolve(request).then((service) => service.undo(request.params.id, request.body.revision)),
  )
  api.post(
    '/v1/transactions/:id/recurring',
    { schema: { params, body: recurringChangeSchema, response: { 200: mutationDto } } },
    (request) =>
      resolve(request).then((service) => service.markTransaction(request.params.id, request.body)),
  )
}
