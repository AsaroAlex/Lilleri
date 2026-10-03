import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  CATEGORIES,
  type CurrencyCode,
  parseDecimal,
  type RuleDefinition,
  type RulePreview,
  type RuleRecord,
  type Transaction,
} from '@lilleri/domain'
import { classify, ruleMatches } from '@lilleri/engines'
import { and, asc, desc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { notFound, Problem } from './problem.js'

const identifier = z.string().min(1).max(256)
const categoryId = z.enum(
  Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]],
)
const minor = z.string().regex(/^(0|[1-9]\d{0,17})$/)
const currency = z.custom<CurrencyCode>((value) => {
  try {
    return typeof value === 'string' && Boolean(parseDecimal('0', value as CurrencyCode))
  } catch {
    return false
  }
})
export const ruleConditionsSchema = z
  .object({
    merchantKey: z.string().trim().min(1).max(150).optional(),
    description: z
      .object({
        operator: z.enum(['equals', 'contains']),
        value: z.string().trim().min(2).max(200),
      })
      .strict()
      .optional(),
    amount: z
      .object({ currency, minMinor: minor.optional(), maxMinor: minor.optional() })
      .strict()
      .refine(
        (value) => value.minMinor !== undefined || value.maxMinor !== undefined,
        'Specify an amount bound',
      )
      .refine(
        (value) =>
          value.minMinor === undefined ||
          value.maxMinor === undefined ||
          (/^(0|[1-9]\d{0,17})$/.test(value.minMinor) &&
            /^(0|[1-9]\d{0,17})$/.test(value.maxMinor) &&
            BigInt(value.minMinor) <= BigInt(value.maxMinor)),
        'Minimum exceeds maximum',
      )
      .optional(),
    accountId: identifier.optional(),
    kind: z
      .enum(['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'])
      .optional(),
    direction: z.enum(['debit', 'credit', 'zero']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Specify a condition')
  .refine(
    (value) =>
      !value.merchantKey ||
      !['paypal', 'sumup', 'nexi', 'stripe'].includes(value.merchantKey.toLowerCase()) ||
      Boolean(value.description || value.accountId),
    'Ambiguous payment intermediaries require an account or description condition',
  )
export const ruleDefinitionSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    conditions: ruleConditionsSchema,
    categoryId,
    priority: z.number().int().min(0).max(100),
  })
  .strict()
export const ruleDtoSchema = ruleDefinitionSchema.extend({
  id: z.string(),
  profileId: z.string(),
  enabled: z.boolean(),
  archived: z.boolean(),
  revision: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const ruleEventDtoSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  ruleId: z.string(),
  revision: z.number().int().positive(),
  action: z.enum(['created', 'edited', 'applied', 'disabled', 'archived', 'undone']),
  before: ruleDefinitionSchema.extend({ enabled: z.boolean(), archived: z.boolean() }).nullable(),
  affectedTransactionIds: z.array(z.string()),
  createdAt: z.string(),
})
const revision = z.number().int().positive().max(2_147_483_646)
const previewRevision = z.string().regex(/^[a-f0-9]{64}$/)
const previewDto = z.object({
  ruleId: z.string(),
  revision,
  previewRevision,
  affectedTransactionIds: z.array(z.string()),
  matchedTransactionIds: z.array(z.string()),
  lockedTransactionIds: z.array(z.string()),
})
const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = {
  400: problemDto,
  401: problemDto,
  403: problemDto,
  404: problemDto,
  409: problemDto,
  422: problemDto,
  500: problemDto,
}
const changed = () =>
  new Problem(
    409,
    'rule_changed',
    'La regola o i movimenti sono cambiati. Aggiorna l’anteprima prima di applicare.',
  )
const toRule = (row: typeof schema.classificationRules.$inferSelect): RuleRecord => ({
  ...row,
  enabled: row.enabled === 'yes',
  archived: row.archived === 'yes',
})
const snapshot = (rule: RuleRecord) => ({
  name: rule.name,
  conditions: rule.conditions,
  categoryId: rule.categoryId,
  priority: rule.priority,
  enabled: rule.enabled,
  archived: rule.archived,
})
const transactionFromRow = (row: typeof schema.transactions.$inferSelect): Transaction => {
  const { amountMinor, currency, contentHash: _contentHash, ...rest } = row
  return { ...rest, amount: { amountMinor, currency } }
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    )
  return value
}
const digest = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex')

/** Local deterministic rule commands. Every write uses the same profile lock as ingest/feedback. */
export class RulesService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async lock(db: Database) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
      .for('update')
    if (!profile) throw notFound()
  }
  async list(db: Database = this.db) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
    if (!profile) throw notFound()
    return (
      await db
        .select()
        .from(schema.classificationRules)
        .where(eq(schema.classificationRules.profileId, this.profileId))
        .orderBy(desc(schema.classificationRules.priority), asc(schema.classificationRules.id))
    ).map(toRule)
  }
  async find(db: Database, id: string) {
    const [row] = await db
      .select()
      .from(schema.classificationRules)
      .where(
        and(
          eq(schema.classificationRules.profileId, this.profileId),
          eq(schema.classificationRules.id, id),
        ),
      )
    if (!row) throw notFound()
    return toRule(row)
  }
  async validateDefinition(db: Database, input: RuleDefinition): Promise<RuleDefinition> {
    const parsed = ruleDefinitionSchema.safeParse(input)
    if (!parsed.success)
      throw new Problem(
        400,
        'invalid_rule',
        'La regola contiene condizioni o categoria non valide.',
      )
    const definition = parsed.data as RuleDefinition
    if (definition.conditions.accountId) {
      const [account] = await db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.profileId, this.profileId),
            eq(schema.accounts.id, definition.conditions.accountId),
          ),
        )
      if (!account) throw notFound()
    }
    return definition
  }
  async create(input: RuleDefinition) {
    return this.db.transaction(async (tx) => {
      await this.lock(tx)
      const definition = await this.validateDefinition(tx, input)
      if ((await this.list(tx)).length >= 100)
        throw new Problem(
          422,
          'rule_limit',
          'Puoi salvare al massimo 100 regole in questo prototipo.',
        )
      const now = this.now(),
        id = `rule_${randomUUID()}`
      const [row] = await tx
        .insert(schema.classificationRules)
        .values({
          ...definition,
          id,
          profileId: this.profileId,
          enabled: 'no',
          archived: 'no',
          revision: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      if (!row) throw new Error('Rule insert failed')
      await tx.insert(schema.ruleEvents).values({
        id: `rule_event_${randomUUID()}`,
        profileId: this.profileId,
        ruleId: id,
        revision: 1,
        action: 'created',
        before: null,
        affectedTransactionIds: [],
        createdAt: now,
      })
      return toRule(row)
    })
  }
  async write(
    db: Database,
    rule: RuleRecord,
    change: RuleDefinition & { enabled: boolean; archived: boolean },
    action: typeof schema.ruleEvents.$inferInsert.action,
    affectedTransactionIds: readonly string[] = [],
  ) {
    const now = this.now(),
      nextRevision = rule.revision + 1
    const [row] = await db
      .update(schema.classificationRules)
      .set({
        ...change,
        enabled: change.enabled ? 'yes' : 'no',
        archived: change.archived ? 'yes' : 'no',
        revision: nextRevision,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.classificationRules.profileId, this.profileId),
          eq(schema.classificationRules.id, rule.id),
          eq(schema.classificationRules.revision, rule.revision),
        ),
      )
      .returning()
    if (!row) throw changed()
    await db.insert(schema.ruleEvents).values({
      id: `rule_event_${randomUUID()}`,
      profileId: this.profileId,
      ruleId: rule.id,
      revision: nextRevision,
      action,
      before: snapshot(rule),
      affectedTransactionIds,
      createdAt: now,
    })
    return toRule(row)
  }
  async edit(id: string, expectedRevision: number, input: RuleDefinition) {
    return this.db.transaction(async (tx) => {
      await this.lock(tx)
      const rule = await this.find(tx, id)
      if (rule.revision !== expectedRevision) throw changed()
      if (rule.archived)
        throw new Problem(
          409,
          'rule_archived',
          'Ripristina la regola archiviata prima di modificarla.',
        )
      const definition = await this.validateDefinition(tx, input)
      return this.write(tx, rule, { ...definition, enabled: false, archived: false }, 'edited')
    })
  }
  async state(id: string, expectedRevision: number, action: 'disable' | 'archive' | 'undo') {
    return this.db.transaction(async (tx) => {
      await this.lock(tx)
      const rule = await this.find(tx, id)
      if (rule.revision !== expectedRevision) throw changed()
      if (action === 'undo') {
        const [event] = await tx
          .select()
          .from(schema.ruleEvents)
          .where(
            and(
              eq(schema.ruleEvents.profileId, this.profileId),
              eq(schema.ruleEvents.ruleId, id),
              eq(schema.ruleEvents.revision, rule.revision),
            ),
          )
        if (!event?.before || event.action === 'undone')
          throw new Problem(
            409,
            'nothing_to_undo',
            'Non c’è una modifica da annullare per questa regola.',
          )
        // An undo that would activate a rule must go through a fresh preview. Restored drafts stay off.
        return this.write(tx, rule, { ...event.before, enabled: false }, 'undone')
      }
      const change = {
        ...snapshot(rule),
        enabled: false,
        archived: action === 'archive' || rule.archived,
      }
      if (!rule.enabled && rule.archived === change.archived) return rule
      return this.write(tx, rule, change, action === 'archive' ? 'archived' : 'disabled')
    })
  }
  async previewIn(db: Database, id: string): Promise<RulePreview> {
    const rule = await this.find(db, id)
    if (rule.archived)
      throw new Problem(
        409,
        'rule_archived',
        'Ripristina la regola archiviata prima di applicarla.',
      )
    const rows = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, this.profileId))
      .orderBy(asc(schema.transactions.id))
      .limit(10_001)
    if (rows.length > 10_000)
      throw new Problem(
        422,
        'preview_limit',
        'Questa anteprima locale supporta al massimo 10.000 movimenti.',
      )
    const feedback = await db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, this.profileId))
      .orderBy(asc(schema.feedback.transactionId))
    const preferences = await db
      .select()
      .from(schema.preferences)
      .where(eq(schema.preferences.profileId, this.profileId))
      .orderBy(asc(schema.preferences.merchantKey))
    const rules = await this.list(db)
    const candidate = { ...rule, enabled: true }
    const options = {
      rules,
      preferences,
      userClassifications: Object.fromEntries(
        feedback.map((item) => [item.transactionId, item.categoryId]),
      ),
    }
    const afterOptions = {
      ...options,
      rules: [...rules.filter((item) => item.id !== id), candidate],
    }
    const matchedTransactionIds: string[] = [],
      affectedTransactionIds: string[] = [],
      lockedTransactionIds: string[] = []
    for (const row of rows) {
      const transaction = transactionFromRow(row)
      if (!ruleMatches(transaction, candidate)) continue
      matchedTransactionIds.push(row.id)
      if (Object.hasOwn(options.userClassifications, row.id)) {
        lockedTransactionIds.push(row.id)
        continue
      }
      const before = classify(transaction, options),
        after = classify(transaction, afterOptions)
      if (JSON.stringify(before) !== JSON.stringify(after)) affectedTransactionIds.push(row.id)
    }
    const previewRevision = digest({
      format: 'rule-preview-v1',
      profileId: this.profileId,
      ruleId: id,
      ruleRevision: rule.revision,
      rows: rows.map((row) => ({
        id: row.id,
        revision: row.revision,
        contentHash: row.contentHash,
      })),
      feedback,
      preferences,
      rules: rules.map((item) => ({
        id: item.id,
        revision: item.revision,
        enabled: item.enabled,
        archived: item.archived,
      })),
      matchedTransactionIds,
      affectedTransactionIds,
      lockedTransactionIds,
    })
    return {
      ruleId: id,
      revision: rule.revision,
      previewRevision,
      matchedTransactionIds,
      affectedTransactionIds,
      lockedTransactionIds,
    }
  }
  async preview(id: string) {
    return this.db.transaction((tx) => this.previewIn(tx, id), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    })
  }
  async apply(id: string, expectedRevision: number, expectedPreviewRevision: string) {
    return this.db.transaction(async (tx) => {
      await this.lock(tx)
      const rule = await this.find(tx, id)
      if (rule.revision !== expectedRevision) throw changed()
      const preview = await this.previewIn(tx, id)
      if (preview.previewRevision !== expectedPreviewRevision) throw changed()
      if (rule.enabled) return rule
      return this.write(
        tx,
        rule,
        { ...snapshot(rule), enabled: true },
        'applied',
        preview.affectedTransactionIds,
      )
    })
  }
}

/** Call after configuring the app's shared Problem error handler. */
export function registerRulesRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<RulesService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>(),
    params = z.object({ id: identifier }).strict()
  api.get(
    '/v1/rules',
    { schema: { response: { 200: z.array(ruleDtoSchema), ...errors } } },
    async (request) => (await resolve(request)).list(),
  )
  api.post(
    '/v1/rules',
    { schema: { body: ruleDefinitionSchema, response: { 201: ruleDtoSchema, ...errors } } },
    async (request, reply) =>
      reply.code(201).send(await (await resolve(request)).create(request.body as RuleDefinition)),
  )
  api.patch(
    '/v1/rules/:id',
    {
      schema: {
        params,
        body: z.object({ revision, definition: ruleDefinitionSchema }).strict(),
        response: { 200: ruleDtoSchema, ...errors },
      },
    },
    async (request) =>
      (await resolve(request)).edit(
        request.params.id,
        request.body.revision,
        request.body.definition as RuleDefinition,
      ),
  )
  api.post(
    '/v1/rules/:id/preview',
    { schema: { params, body: z.object({}).strict(), response: { 200: previewDto, ...errors } } },
    async (request) => {
      const result = await (await resolve(request)).preview(request.params.id)
      return {
        ...result,
        affectedTransactionIds: [...result.affectedTransactionIds],
        matchedTransactionIds: [...result.matchedTransactionIds],
        lockedTransactionIds: [...result.lockedTransactionIds],
      }
    },
  )
  api.post(
    '/v1/rules/:id/apply',
    {
      schema: {
        params,
        body: z.object({ revision, previewRevision }).strict(),
        response: { 200: ruleDtoSchema, ...errors },
      },
    },
    async (request) =>
      (await resolve(request)).apply(
        request.params.id,
        request.body.revision,
        request.body.previewRevision,
      ),
  )
  api.post(
    '/v1/rules/:id/state',
    {
      schema: {
        params,
        body: z.object({ revision, action: z.enum(['disable', 'archive', 'undo']) }).strict(),
        response: { 200: ruleDtoSchema, ...errors },
      },
    },
    async (request) =>
      (await resolve(request)).state(request.params.id, request.body.revision, request.body.action),
  )
}
