import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  type Classification,
  CURRENT_TAXONOMY,
  canonicalCategory,
  isCanonicalCategoryCode,
  isQuietCategory,
  type MerchantAlias,
  type OwnedCategory,
  type OwnedCategoryAssignment,
  type OwnedCategoryValues,
  TAXONOMY_VERSION,
  type Transaction,
} from '@lilleri/domain'
import { classify, normalizeMerchant, resolveMerchant } from '@lilleri/engines'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ProfileEncryption } from './encryption.js'
import {
  categoryAssignmentEvents,
  categoryAssignments,
  merchantAliasEvents,
  merchantAliases,
  ownedCategories,
  ownedCategoryEvents,
} from './merchant-taxonomy-schema.js'
import { PrivacyService } from './privacy.js'
import { transactionPrivacy } from './privacy-schema.js'
import { notFound, Problem } from './problem.js'
import { fixtureTransactionReadPredicate } from './synthetic-fixtures.js'

const id = z.string().min(1).max(200)
const revision = z.number().int().min(1).max(2_147_483_646)
const label = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value))
const digest = z.string().regex(/^[a-f0-9]{64}$/u)
const canonicalCode = z.string().refine(isCanonicalCategoryCode)
export const ownedCategoryValuesSchema = z
  .object({
    label,
    canonicalCode,
    icon: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/u),
    parentId: id.nullable(),
    position: z.number().int().min(0).max(2_147_483_646),
    hidden: z.boolean(),
  })
  .strict()
export const ownedCategoryDtoSchema = ownedCategoryValuesSchema
  .extend({
    id,
    profileId: id,
    taxonomyVersion: z.string(),
    revision,
    archived: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()
export const merchantAliasDtoSchema = z
  .object({
    id,
    profileId: id,
    normalizedKey: z.string(),
    merchantId: id,
    displayName: label,
    revision,
    archived: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()
export const merchantResolutionDtoSchema = z
  .object({
    transactionId: id,
    status: z.enum(['resolved', 'ambiguous', 'unknown', 'suppressed']),
    merchantId: id.nullable(),
    displayName: label.nullable(),
    normalizedKey: z.string().nullable(),
    source: z.enum(['user', 'dictionary', 'none']),
    normalizerVersion: z.literal('merchant-normalizer-v1'),
    dictionaryVersion: z.literal('merchant-dictionary-local-v1').nullable(),
    aliasId: id.nullable(),
    aliasRevision: revision.nullable(),
    evidence: z.array(z.string()),
  })
  .strict()
export const ownedCategoryAssignmentDtoSchema = z
  .object({
    profileId: id,
    transactionId: id,
    categoryId: id,
    categoryRevision: revision,
    canonicalCode,
    taxonomyVersion: z.string(),
    labelSnapshot: label,
    quiet: z.boolean(),
    revision,
    updatedAt: z.string(),
  })
  .strict()
const assignmentDto = ownedCategoryAssignmentDtoSchema
const canonicalLeafDto = z
  .object({
    code: z.string(),
    group: z.string(),
    flow: z.enum(['expense', 'income', 'transfer']),
    labelIt: z.string(),
    labelEn: z.string(),
    icon: z.string(),
    quiet: z.literal(true).optional(),
    excludedFromSpending: z.literal(true).optional(),
    localProposal: z.literal(true).optional(),
    selectable: z.boolean(),
    deprecated: z.boolean(),
    replacementCode: z.string().nullable(),
  })
  .strict()
export const taxonomySnapshotDtoSchema = z
  .object({
    version: z.string(),
    parents: z.array(
      z
        .object({
          id: z.string(),
          labelIt: z.string(),
          labelEn: z.string(),
          selectable: z.literal(false),
          defaultChild: z.string(),
        })
        .strict(),
    ),
    leaves: z.array(canonicalLeafDto),
  })
  .strict()
export const merchantTaxonomyListDtoSchema = z
  .object({
    taxonomy: taxonomySnapshotDtoSchema,
    aliases: z.array(merchantAliasDtoSchema),
    categories: z.array(ownedCategoryDtoSchema),
    resolutions: z.array(merchantResolutionDtoSchema),
    assignments: z.array(assignmentDto),
  })
  .strict()
const previewDto = z
  .object({
    previewRevision: digest,
    affectedTransactionIds: z.array(id),
    preservedHidden: z.literal(true),
    preservedSource: z.literal(true),
  })
  .strict()
const changed = () =>
  new Problem(
    409,
    'recognition_changed',
    'I dati o le scelte sono cambiati. Prepara una nuova anteprima prima di confermare.',
  )
const invalid = () =>
  new Problem(400, 'invalid_recognition', 'Controlla il nome, la categoria e la scelta richiesta.')
const hidden = () =>
  new Problem(
    422,
    'recognition_unavailable',
    'Questa proposta non è disponibile per i movimenti riservati.',
  )
function instant(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw invalid()
  return date.toISOString()
}
function monotonic(at: string, ...previous: readonly (string | undefined)[]) {
  if (previous.some((value) => value !== undefined && Date.parse(value) > Date.parse(at)))
    throw changed()
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    )
  return typeof value === 'bigint' ? value.toString() : value
}
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex')
const aliasSnapshot = (value: MerchantAlias) => ({
  normalizedKey: value.normalizedKey,
  merchantId: value.merchantId,
  displayName: value.displayName,
  archived: value.archived,
})
const categorySnapshot = (value: OwnedCategory) => ({
  label: value.label,
  canonicalCode: value.canonicalCode,
  icon: value.icon,
  parentId: value.parentId,
  position: value.position,
  hidden: value.hidden,
  archived: value.archived,
  taxonomyVersion: value.taxonomyVersion,
})
type History = {
  readonly before: unknown
  readonly after: unknown
  readonly affectedTransactionIds: readonly string[]
  readonly undoOf?: string
  readonly migrated?: readonly {
    readonly transactionId: string
    readonly before: OwnedCategoryAssignment
    readonly after: OwnedCategoryAssignment
  }[]
}

/** Standalone services require the server-resolved profile and its scoped financial DB handle. */
export class MerchantTaxonomyService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
    readonly encryption?: ProfileEncryption,
  ) {}
  async lock(db: Database, shared = false) {
    const [profile] = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
      .for(shared ? 'share' : 'update')
    if (!profile) throw notFound()
  }
  context(table: string, column: string, rowId: string) {
    return { profileId: this.profileId, table, column, rowId }
  }
  async text(
    db: Database,
    table: string,
    column: string,
    rowId: string,
    value: string,
    decode = false,
  ) {
    return this.encryption
      ? decode
        ? this.encryption.decryptText(db, this.context(table, column, rowId), value)
        : this.encryption.encryptText(db, this.context(table, column, rowId), value)
      : value
  }
  async json(
    db: Database,
    table: string,
    rowId: string,
    value: unknown,
    decode = false,
  ): Promise<unknown> {
    if (!this.encryption) return value
    if (decode) {
      if (
        !value ||
        typeof value !== 'object' ||
        !('_lilleriEncrypted' in value) ||
        Object.keys(value).length !== 1
      )
        throw new Problem(
          500,
          'recognition_storage_unavailable',
          'Le scelte salvate non sono disponibili.',
        )
      return this.encryption.decryptJson(
        db,
        this.context(table, 'snapshot', rowId),
        String(value._lilleriEncrypted),
      )
    }
    return {
      _lilleriEncrypted: await this.encryption.encryptJson(
        db,
        this.context(table, 'snapshot', rowId),
        value,
      ),
    }
  }
  async aliases(db: Database = this.db): Promise<MerchantAlias[]> {
    const rows = await db
      .select()
      .from(merchantAliases)
      .where(eq(merchantAliases.profileId, this.profileId))
      .orderBy(asc(merchantAliases.id))
    const result: MerchantAlias[] = []
    for (const row of rows) {
      const { householdId: _household, keyDigest: _digest, ...values } = row
      result.push(
        merchantAliasDtoSchema.parse({
          ...values,
          normalizedKey: await this.text(
            db,
            'merchant_aliases',
            'normalized_key',
            row.id,
            row.normalizedKey,
            true,
          ),
          displayName: await this.text(
            db,
            'merchant_aliases',
            'display_name',
            row.id,
            row.displayName,
            true,
          ),
        }),
      )
    }
    return result
  }
  async categories(db: Database = this.db): Promise<OwnedCategory[]> {
    const rows = await db
      .select()
      .from(ownedCategories)
      .where(eq(ownedCategories.profileId, this.profileId))
      .orderBy(asc(ownedCategories.position), asc(ownedCategories.id))
    const result: OwnedCategory[] = []
    for (const row of rows) {
      const { householdId: _household, ...values } = row
      result.push(
        ownedCategoryDtoSchema.parse({
          ...values,
          label: await this.text(db, 'owned_categories', 'label', row.id, row.label, true),
        }),
      )
    }
    return result
  }
  async assignments(db: Database = this.db): Promise<OwnedCategoryAssignment[]> {
    const rows = await db
      .select()
      .from(categoryAssignments)
      .where(eq(categoryAssignments.profileId, this.profileId))
      .orderBy(asc(categoryAssignments.transactionId))
    const result: OwnedCategoryAssignment[] = []
    for (const row of rows)
      result.push(
        assignmentDto.parse(
          await this.json(db, 'category_assignments', row.transactionId, row.snapshot, true),
        ),
      )
    return result
  }
  async ledger(db: Database) {
    const rows = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, this.profileId),
          fixtureTransactionReadPredicate(this.profileId),
        ),
      )
      .orderBy(asc(schema.transactions.id))
    const transactions: Transaction[] = []
    for (const stored of rows) {
      const row = this.encryption ? await this.encryption.decryptTransactionRow(db, stored) : stored
      const {
        householdId: _household,
        scope: _scope,
        contentHash: _hash,
        amountMinor,
        currency,
        ...values
      } = row
      transactions.push({ ...values, amount: { amountMinor, currency } })
    }
    const feedback = await db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, this.profileId))
    const preferences = await db
      .select()
      .from(schema.preferences)
      .where(eq(schema.preferences.profileId, this.profileId))
    const rules = await db
      .select()
      .from(schema.classificationRules)
      .where(eq(schema.classificationRules.profileId, this.profileId))
    const settings = await new PrivacyService(db, this.profileId, this.now).readSettings(db)
    const classifications = transactions.map((transaction) =>
      classify(transaction, {
        preferences,
        rules: rules.map((rule) => ({ ...rule, enabled: rule.enabled === 'yes' })),
        userClassifications: Object.fromEntries(
          feedback.map((item) => [item.transactionId, item.categoryId]),
        ),
        globalDictionaryEnabled: !settings.rulesOnly,
      }),
    )
    return this.analysisContext(db, transactions, classifications)
  }
  async analysisContext(
    db: Database,
    transactions: readonly Transaction[],
    classifications: readonly Classification[] = [],
  ) {
    if (transactions.some((row) => row.profileId !== this.profileId)) throw notFound()
    const privacy = await new PrivacyService(db, this.profileId, this.now).analysisContext(db, [
      ...classifications,
      // Privacy minimisation remains conservative when recognition is disabled.
      // This baseline is used only to suppress quiet merchant evidence, never as a category output.
      ...transactions.map((transaction) => classify(transaction)),
    ])
    const privacyState = await db
      .select({
        transactionId: transactionPrivacy.transactionId,
        revision: transactionPrivacy.revision,
        quiet: transactionPrivacy.quiet,
        private: transactionPrivacy.private,
      })
      .from(transactionPrivacy)
      .where(eq(transactionPrivacy.profileId, this.profileId))
      .orderBy(asc(transactionPrivacy.transactionId))
    const aliases = await this.aliases(db),
      categories = await this.categories(db),
      assignments = await this.assignments(db)
    const byCategory = new Map(categories.map((category) => [category.id, category]))
    const excluded = new Set(privacy.excludedTransactionIds)
    for (const assignment of assignments)
      if (assignment.quiet || byCategory.get(assignment.categoryId)?.hidden)
        excluded.add(assignment.transactionId)
    const resolutions = transactions.map((transaction) =>
      resolveMerchant(
        {
          transactionId: transaction.id,
          profileId: this.profileId,
          description: transaction.description,
          merchantName: transaction.merchantName,
        },
        {
          aliases,
          globalDictionaryEnabled: !privacy.rulesOnly,
          excludedTransactionIds: [...excluded],
        },
      ),
    )
    return {
      transactions,
      resolutions,
      aliases,
      categories,
      assignments,
      excludedTransactionIds: [...excluded],
      privacyRevision: privacy.revision,
      privacyState,
      rulesOnly: privacy.rulesOnly,
    }
  }
  async list() {
    return this.db.transaction(async (db) => {
      await this.lock(db, true)
      const state = await this.ledger(db)
      const visibleKeys = new Set(
        state.resolutions
          .filter((value) => value.status !== 'suppressed')
          .map((value) => value.normalizedKey)
          .filter(Boolean),
      )
      return {
        taxonomy: CURRENT_TAXONOMY,
        aliases: state.aliases.filter((alias) => visibleKeys.has(alias.normalizedKey)),
        categories: state.categories,
        resolutions: state.resolutions.filter((resolution) => resolution.status !== 'suppressed'),
        assignments: state.assignments.filter(
          (assignment) => !state.excludedTransactionIds.includes(assignment.transactionId),
        ),
      }
    })
  }
  async keyDigest(db: Database, key: string) {
    return this.encryption
      ? this.encryption.blindIndex(
          db,
          { profileId: this.profileId, table: 'merchant_aliases', column: 'normalized_key' },
          key,
        )
      : hash([this.profileId, key])
  }
  async aliasHistory(
    db: Database,
    after: MerchantAlias,
    before: MerchantAlias | null,
    action: typeof merchantAliasEvents.$inferInsert.action,
    affectedTransactionIds: readonly string[],
    at: string,
    undoOf?: string,
  ) {
    const eventId = `merchant_event_${randomUUID()}`
    await db.insert(merchantAliasEvents).values({
      id: eventId,
      profileId: this.profileId,
      aliasId: after.id,
      revision: after.revision,
      action,
      snapshot: (await this.json(db, 'merchant_alias_events', eventId, {
        before: before ? aliasSnapshot(before) : null,
        after: aliasSnapshot(after),
        affectedTransactionIds,
        ...(undoOf ? { undoOf } : {}),
      })) as Record<string, unknown>,
      occurredAt: at,
    })
  }
  async aliasPreviewIn(db: Database, transactionId: string, displayName: string, aliasId?: string) {
    if (!id.safeParse(transactionId).success || !label.safeParse(displayName).success)
      throw invalid()
    const state = await this.ledger(db)
    const transaction = state.transactions.find((item) => item.id === transactionId)
    if (!transaction) throw notFound()
    if (state.excludedTransactionIds.includes(transactionId)) throw hidden()
    const normalized = normalizeMerchant({
      transactionId,
      profileId: this.profileId,
      description: transaction.description,
      merchantName: transaction.merchantName,
    })
    if (normalized.normalizedKey === null)
      throw new Problem(
        422,
        'merchant_ambiguous',
        'Le informazioni della fonte non identificano un solo esercente.',
      )
    const existing = state.aliases.find((item) => item.normalizedKey === normalized.normalizedKey)
    if (aliasId !== undefined && existing?.id !== aliasId) throw notFound()
    const affected = state.transactions
      .filter(
        (row) =>
          !state.excludedTransactionIds.includes(row.id) &&
          normalizeMerchant({
            transactionId: row.id,
            profileId: this.profileId,
            description: row.description,
            merchantName: row.merchantName,
          }).normalizedKey === normalized.normalizedKey,
      )
      .map((row) => row.id)
    return {
      previewRevision: hash({
        profileId: this.profileId,
        operation: 'merchant',
        transactionId,
        displayName: displayName.trim(),
        aliasId: aliasId ?? null,
        state,
      }),
      affectedTransactionIds: affected,
      preservedHidden: true as const,
      preservedSource: true as const,
      normalizedKey: normalized.normalizedKey,
      existing,
    }
  }
  async previewAlias(transactionId: string, displayName: string, aliasId?: string) {
    return this.db.transaction(async (db) => {
      await this.lock(db, true)
      const { previewRevision, affectedTransactionIds, preservedHidden, preservedSource } =
        await this.aliasPreviewIn(db, transactionId, displayName, aliasId)
      return previewDto.parse({
        previewRevision,
        affectedTransactionIds,
        preservedHidden,
        preservedSource,
      })
    })
  }
  async applyAlias(
    transactionId: string,
    displayName: string,
    expectedPreview: string,
    aliasId?: string,
    expectedRevision?: number,
  ): Promise<MerchantAlias> {
    if (
      !digest.safeParse(expectedPreview).success ||
      (aliasId !== undefined && !revision.safeParse(expectedRevision).success)
    )
      throw invalid()
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const preview = await this.aliasPreviewIn(db, transactionId, displayName, aliasId)
      if (
        preview.previewRevision !== expectedPreview ||
        (preview.existing && preview.existing.revision !== expectedRevision) ||
        (!aliasId && preview.existing)
      )
        throw changed()
      const at = instant(this.now()),
        before = preview.existing ?? null,
        aliasKey = before?.id ?? `merchant_alias_${randomUUID()}`
      monotonic(at, before?.updatedAt)
      const after: MerchantAlias = {
        id: aliasKey,
        profileId: this.profileId,
        normalizedKey: preview.normalizedKey,
        merchantId: before?.merchantId ?? `merchant:private:${randomUUID()}`,
        displayName: displayName.trim(),
        revision: (before?.revision ?? 0) + 1,
        archived: false,
        createdAt: before?.createdAt ?? at,
        updatedAt: at,
      }
      const stored = {
        ...after,
        normalizedKey: await this.text(
          db,
          'merchant_aliases',
          'normalized_key',
          aliasKey,
          after.normalizedKey,
        ),
        displayName: await this.text(
          db,
          'merchant_aliases',
          'display_name',
          aliasKey,
          after.displayName,
        ),
        keyDigest: await this.keyDigest(db, after.normalizedKey),
      }
      await db
        .insert(merchantAliases)
        .values(stored)
        .onConflictDoUpdate({ target: merchantAliases.id, set: stored })
      await this.aliasHistory(
        db,
        after,
        before,
        before ? 'updated' : 'created',
        preview.affectedTransactionIds,
        at,
      )
      return after
    })
  }
  async changeAlias(aliasId: string, expectedRevision: number, action: 'archive' | 'undo') {
    if (!id.safeParse(aliasId).success || !revision.safeParse(expectedRevision).success)
      throw invalid()
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const before = (await this.aliases(db)).find((item) => item.id === aliasId)
      if (!before) throw notFound()
      if (before.revision !== expectedRevision) throw changed()
      const at = instant(this.now())
      monotonic(at, before.updatedAt)
      let values = aliasSnapshot(before),
        undoOf: string | undefined
      if (action === 'archive') values = { ...values, archived: true }
      else {
        const [event] = await db
          .select()
          .from(merchantAliasEvents)
          .where(
            and(
              eq(merchantAliasEvents.profileId, this.profileId),
              eq(merchantAliasEvents.aliasId, aliasId),
              eq(merchantAliasEvents.revision, before.revision),
            ),
          )
        if (!event || event.action === 'undone') throw changed()
        const history = (await this.json(
          db,
          'merchant_alias_events',
          event.id,
          event.snapshot,
          true,
        )) as History
        values = history.before ? (history.before as typeof values) : { ...values, archived: true }
        undoOf = event.id
      }
      const after: MerchantAlias = {
        ...before,
        ...values,
        revision: before.revision + 1,
        updatedAt: at,
      }
      await db
        .update(merchantAliases)
        .set({
          displayName: await this.text(
            db,
            'merchant_aliases',
            'display_name',
            aliasId,
            after.displayName,
          ),
          archived: after.archived,
          revision: after.revision,
          updatedAt: at,
        })
        .where(and(eq(merchantAliases.profileId, this.profileId), eq(merchantAliases.id, aliasId)))
      await this.aliasHistory(
        db,
        after,
        before,
        action === 'archive' ? 'archived' : 'undone',
        [],
        at,
        undoOf,
      )
      return after
    })
  }
  async categoryDefinition(db: Database, input: OwnedCategoryValues, ownId?: string) {
    const parsed = ownedCategoryValuesSchema.safeParse(input)
    if (!parsed.success) throw invalid()
    if (parsed.data.parentId !== null) {
      const all = await this.categories(db),
        byId = new Map(all.map((category) => [category.id, category]))
      let parent = byId.get(parsed.data.parentId),
        seen = new Set<string>()
      if (!parent || parent.archived) throw notFound()
      while (parent) {
        if (parent.id === ownId || seen.has(parent.id))
          throw new Problem(
            422,
            'category_cycle',
            'Una categoria non può essere annidata dentro sé stessa.',
          )
        seen.add(parent.id)
        parent = parent.parentId === null ? undefined : byId.get(parent.parentId)
      }
    }
    return parsed.data
  }
  async categoryHistory(
    db: Database,
    after: OwnedCategory,
    before: OwnedCategory | null,
    action: typeof ownedCategoryEvents.$inferInsert.action,
    at: string,
    extra: Partial<History> = {},
  ) {
    const eventId = `category_event_${randomUUID()}`
    await db.insert(ownedCategoryEvents).values({
      id: eventId,
      profileId: this.profileId,
      categoryId: after.id,
      revision: after.revision,
      action,
      snapshot: (await this.json(db, 'owned_category_events', eventId, {
        before: before ? categorySnapshot(before) : null,
        after: categorySnapshot(after),
        affectedTransactionIds: [],
        ...extra,
      })) as Record<string, unknown>,
      occurredAt: at,
    })
  }
  async createCategory(input: OwnedCategoryValues): Promise<OwnedCategory> {
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const values = await this.categoryDefinition(db, input),
        at = instant(this.now()),
        categoryId = `category_${randomUUID()}`
      const after: OwnedCategory = {
        ...values,
        id: categoryId,
        profileId: this.profileId,
        taxonomyVersion: TAXONOMY_VERSION,
        revision: 1,
        archived: false,
        createdAt: at,
        updatedAt: at,
      }
      await db.insert(ownedCategories).values({
        ...after,
        label: await this.text(db, 'owned_categories', 'label', categoryId, after.label),
      })
      await this.categoryHistory(db, after, null, 'created', at)
      return after
    })
  }
  async updateCategory(
    categoryId: string,
    expectedRevision: number,
    input: OwnedCategoryValues,
  ): Promise<OwnedCategory> {
    if (!revision.safeParse(expectedRevision).success) throw invalid()
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const before = (await this.categories(db)).find((category) => category.id === categoryId)
      if (!before) throw notFound()
      if (before.revision !== expectedRevision || before.archived) throw changed()
      const values = await this.categoryDefinition(db, input, categoryId),
        at = instant(this.now())
      monotonic(at, before.updatedAt)
      if (
        values.canonicalCode !== before.canonicalCode &&
        (await this.assignments(db)).some((assignment) => assignment.categoryId === categoryId)
      )
        throw new Problem(
          422,
          'category_migration_required',
          'Una categoria usata richiede una migrazione con anteprima per cambiare il significato.',
        )
      const after = { ...before, ...values, revision: before.revision + 1, updatedAt: at }
      await db
        .update(ownedCategories)
        .set({
          ...values,
          label: await this.text(db, 'owned_categories', 'label', categoryId, after.label),
          revision: after.revision,
          updatedAt: at,
        })
        .where(
          and(eq(ownedCategories.profileId, this.profileId), eq(ownedCategories.id, categoryId)),
        )
      await this.categoryHistory(db, after, before, 'updated', at)
      return after
    })
  }
  async writeAssignment(
    db: Database,
    transactionId: string,
    category: OwnedCategory,
    before: OwnedCategoryAssignment | null,
    at: string,
    preserveQuiet = false,
  ) {
    monotonic(at, before?.updatedAt, category.updatedAt)
    const after: OwnedCategoryAssignment = {
      profileId: this.profileId,
      transactionId,
      categoryId: category.id,
      categoryRevision: category.revision,
      canonicalCode: category.canonicalCode,
      taxonomyVersion: category.taxonomyVersion,
      labelSnapshot: category.label,
      quiet: preserveQuiet || isQuietCategory(category.canonicalCode),
      revision: (before?.revision ?? 1) + 1,
      updatedAt: at,
    }
    await db
      .insert(categoryAssignments)
      .values({
        profileId: this.profileId,
        transactionId,
        categoryId: category.id,
        revision: after.revision,
        snapshot: (await this.json(db, 'category_assignments', transactionId, after)) as Record<
          string,
          unknown
        >,
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: [categoryAssignments.profileId, categoryAssignments.transactionId],
        set: {
          categoryId: category.id,
          revision: after.revision,
          snapshot: (await this.json(db, 'category_assignments', transactionId, after)) as Record<
            string,
            unknown
          >,
          updatedAt: at,
        },
      })
    const eventId = `category_assignment_${randomUUID()}`
    await db.insert(categoryAssignmentEvents).values({
      id: eventId,
      profileId: this.profileId,
      transactionId,
      revision: after.revision,
      snapshot: (await this.json(db, 'category_assignment_events', eventId, {
        before,
        after,
      })) as Record<string, unknown>,
      occurredAt: at,
    })
    return after
  }
  async assignCategory(transactionId: string, categoryId: string, expectedRevision: number) {
    if (!revision.safeParse(expectedRevision).success) throw invalid()
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const state = await this.ledger(db)
      if (!state.transactions.some((transaction) => transaction.id === transactionId))
        throw notFound()
      const category = state.categories.find((value) => value.id === categoryId)
      if (!category || category.archived) throw notFound()
      const transaction = state.transactions.find((value) => value.id === transactionId)
      const flow =
        transaction && ['transfer', 'card_settlement', 'cash_withdrawal'].includes(transaction.kind)
          ? 'transfer'
          : transaction?.kind === 'income'
            ? 'income'
            : 'expense'
      if (canonicalCategory(category.canonicalCode).flow !== flow)
        throw new Problem(
          422,
          'category_flow_conflict',
          'La categoria deve conservare la natura di entrata, spesa o trasferimento.',
        )
      const before =
        state.assignments.find((value) => value.transactionId === transactionId) ?? null
      if ((before?.revision ?? 1) !== expectedRevision) throw changed()
      return this.writeAssignment(db, transactionId, category, before, instant(this.now()))
    })
  }
  async migrationPreviewIn(db: Database, categoryId: string, targetId: string | null) {
    const state = await this.ledger(db),
      before = state.categories.find((value) => value.id === categoryId),
      target = targetId === null ? null : state.categories.find((value) => value.id === targetId)
    if (!before || before.archived || (targetId !== null && (!target || target.archived)))
      throw notFound()
    if (categoryId === targetId) throw invalid()
    if (state.categories.some((category) => category.parentId === categoryId && !category.archived))
      throw new Problem(422, 'category_has_children', 'Sposta prima le categorie contenute.')
    const assignments = state.assignments.filter(
      (assignment) => assignment.categoryId === categoryId,
    )
    if (target === null && assignments.length)
      throw new Problem(
        422,
        'category_migration_required',
        'Scegli la categoria di destinazione prima di archiviare una categoria usata.',
      )
    if (
      target &&
      canonicalCategory(before.canonicalCode).flow !== canonicalCategory(target.canonicalCode).flow
    )
      throw new Problem(
        422,
        'category_flow_conflict',
        'La migrazione deve conservare la natura di entrata, spesa o trasferimento.',
      )
    return {
      previewRevision: hash({
        profileId: this.profileId,
        operation: 'category-migration',
        categoryId,
        targetId,
        state,
      }),
      affectedTransactionIds: assignments
        .filter((assignment) => !state.excludedTransactionIds.includes(assignment.transactionId))
        .map((assignment) => assignment.transactionId),
      preservedHidden: true as const,
      preservedSource: true as const,
      before,
      target,
      assignments,
    }
  }
  async previewMigration(categoryId: string, targetId: string | null) {
    return this.db.transaction(async (db) => {
      await this.lock(db, true)
      const { previewRevision, affectedTransactionIds, preservedHidden, preservedSource } =
        await this.migrationPreviewIn(db, categoryId, targetId)
      return previewDto.parse({
        previewRevision,
        affectedTransactionIds,
        preservedHidden,
        preservedSource,
      })
    })
  }
  async applyMigration(
    categoryId: string,
    targetId: string | null,
    expectedRevision: number,
    expectedPreview: string,
  ) {
    if (!revision.safeParse(expectedRevision).success || !digest.safeParse(expectedPreview).success)
      throw invalid()
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const preview = await this.migrationPreviewIn(db, categoryId, targetId)
      if (
        preview.before.revision !== expectedRevision ||
        preview.previewRevision !== expectedPreview
      )
        throw changed()
      const at = instant(this.now()),
        after = {
          ...preview.before,
          archived: true,
          revision: preview.before.revision + 1,
          updatedAt: at,
        }
      monotonic(at, preview.before.updatedAt, preview.target?.updatedAt)
      const migrated: NonNullable<History['migrated']>[number][] = []
      if (preview.target)
        for (const before of preview.assignments)
          migrated.push({
            transactionId: before.transactionId,
            before,
            after: await this.writeAssignment(
              db,
              before.transactionId,
              preview.target,
              before,
              at,
              before.quiet ||
                preview.before.hidden ||
                isQuietCategory(preview.before.canonicalCode),
            ),
          })
      await db
        .update(ownedCategories)
        .set({ archived: true, revision: after.revision, updatedAt: at })
        .where(
          and(eq(ownedCategories.profileId, this.profileId), eq(ownedCategories.id, categoryId)),
        )
      await this.categoryHistory(
        db,
        after,
        preview.before,
        targetId === null ? 'archived' : 'merged',
        at,
        { migrated, affectedTransactionIds: preview.affectedTransactionIds },
      )
      return after
    })
  }
  async undoCategory(categoryId: string, expectedRevision: number) {
    if (!revision.safeParse(expectedRevision).success) throw invalid()
    return this.db.transaction(async (db) => {
      await this.lock(db)
      const before = (await this.categories(db)).find((category) => category.id === categoryId)
      if (!before || before.revision !== expectedRevision) throw changed()
      const [event] = await db
        .select()
        .from(ownedCategoryEvents)
        .where(
          and(
            eq(ownedCategoryEvents.profileId, this.profileId),
            eq(ownedCategoryEvents.categoryId, categoryId),
            eq(ownedCategoryEvents.revision, before.revision),
          ),
        )
      if (!event || event.action === 'undone') throw changed()
      const at = instant(this.now())
      if (Date.parse(at) - Date.parse(event.occurredAt) > 30 * 86_400_000 || at < event.occurredAt)
        throw new Problem(
          422,
          'category_undo_expired',
          'La finestra di ripristino di questa modifica è terminata.',
        )
      const history = (await this.json(
        db,
        'owned_category_events',
        event.id,
        event.snapshot,
        true,
      )) as History
      const values = history.before
        ? (history.before as ReturnType<typeof categorySnapshot>)
        : { ...categorySnapshot(before), archived: true }
      if (
        values.archived &&
        (await this.categories(db)).some(
          (category) => category.parentId === categoryId && !category.archived,
        )
      )
        throw new Problem(422, 'category_has_children', 'Sposta prima le categorie contenute.')
      const assignments = await this.assignments(db)
      if (
        history.before === null &&
        assignments.some((assignment) => assignment.categoryId === categoryId)
      )
        throw new Problem(
          422,
          'category_migration_required',
          'Sposta prima i movimenti assegnati a questa categoria.',
        )
      for (const change of history.migrated ?? []) {
        const current = assignments.find(
          (assignment) => assignment.transactionId === change.transactionId,
        )
        if (
          !current ||
          current.revision !== change.after.revision ||
          current.categoryId !== change.after.categoryId
        )
          throw changed()
      }
      const after = { ...before, ...values, revision: before.revision + 1, updatedAt: at }
      const {
        label: savedLabel,
        canonicalCode: savedCode,
        icon,
        parentId,
        position,
        hidden: hiddenCategory,
      } = after
      await this.categoryDefinition(
        db,
        {
          label: savedLabel,
          canonicalCode: savedCode,
          icon,
          parentId,
          position,
          hidden: hiddenCategory,
        },
        categoryId,
      )
      await db
        .update(ownedCategories)
        .set({
          ...values,
          label: await this.text(db, 'owned_categories', 'label', categoryId, after.label),
          revision: after.revision,
          updatedAt: at,
        })
        .where(
          and(eq(ownedCategories.profileId, this.profileId), eq(ownedCategories.id, categoryId)),
        )
      for (const change of history.migrated ?? []) {
        const current = assignments.find(
          (assignment) => assignment.transactionId === change.transactionId,
        )
        if (!current) throw changed()
        const historicalCategory = {
          ...after,
          revision: change.before.categoryRevision,
          label: change.before.labelSnapshot,
          canonicalCode: change.before.canonicalCode,
          taxonomyVersion: change.before.taxonomyVersion,
          hidden: change.before.quiet,
        }
        await this.writeAssignment(
          db,
          change.transactionId,
          historicalCategory,
          current,
          at,
          change.before.quiet,
        )
      }
      await this.categoryHistory(db, after, before, 'undone', at, { undoOf: event.id })
      return after
    })
  }
  async exportAudit(db: Database = this.db) {
    const aliases = await this.aliases(db),
      categories = await this.categories(db),
      assignments = await this.assignments(db)
    const aliasEvents = [],
      categoryEvents = [],
      assignmentEvents = []
    for (const row of await db
      .select()
      .from(merchantAliasEvents)
      .where(eq(merchantAliasEvents.profileId, this.profileId))
      .orderBy(asc(merchantAliasEvents.aliasId), asc(merchantAliasEvents.revision))) {
      const { householdId: _household, ...values } = row
      aliasEvents.push({
        ...values,
        snapshot: await this.json(db, 'merchant_alias_events', row.id, row.snapshot, true),
      })
    }
    for (const row of await db
      .select()
      .from(ownedCategoryEvents)
      .where(eq(ownedCategoryEvents.profileId, this.profileId))
      .orderBy(asc(ownedCategoryEvents.categoryId), asc(ownedCategoryEvents.revision))) {
      const { householdId: _household, ...values } = row
      categoryEvents.push({
        ...values,
        snapshot: await this.json(db, 'owned_category_events', row.id, row.snapshot, true),
      })
    }
    for (const row of await db
      .select()
      .from(categoryAssignmentEvents)
      .where(eq(categoryAssignmentEvents.profileId, this.profileId))
      .orderBy(
        asc(categoryAssignmentEvents.transactionId),
        asc(categoryAssignmentEvents.revision),
      )) {
      const { householdId: _household, ...values } = row
      assignmentEvents.push({
        ...values,
        snapshot: await this.json(db, 'category_assignment_events', row.id, row.snapshot, true),
      })
    }
    return {
      taxonomyVersion: TAXONOMY_VERSION,
      aliases,
      categories,
      assignments,
      aliasEvents,
      categoryEvents,
      assignmentEvents,
    }
  }
}

export function registerMerchantTaxonomyRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => MerchantTaxonomyService,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  const aliasInput = z
    .object({ transactionId: id, displayName: label, aliasId: id.optional() })
    .strict()
  api.get(
    '/v1/merchants',
    { schema: { response: { 200: merchantTaxonomyListDtoSchema } } },
    async (request) => merchantTaxonomyListDtoSchema.parse(await resolve(request).list()),
  )
  api.post(
    '/v1/merchants/preview',
    { schema: { body: aliasInput, response: { 200: previewDto } } },
    async (request) =>
      resolve(request).previewAlias(
        request.body.transactionId,
        request.body.displayName,
        request.body.aliasId,
      ),
  )
  api.post(
    '/v1/merchants/apply',
    {
      schema: {
        body: aliasInput.extend({ previewRevision: digest, revision: revision.optional() }),
        response: { 200: merchantAliasDtoSchema },
      },
    },
    async (request) =>
      resolve(request).applyAlias(
        request.body.transactionId,
        request.body.displayName,
        request.body.previewRevision,
        request.body.aliasId,
        request.body.revision,
      ),
  )
  for (const action of ['archive', 'undo'] as const)
    api.post(
      `/v1/merchants/:id/${action}`,
      {
        schema: {
          params: z.object({ id }),
          body: z.object({ revision }).strict(),
          response: { 200: merchantAliasDtoSchema },
        },
      },
      async (request) =>
        resolve(request).changeAlias(request.params.id, request.body.revision, action),
    )
  api.post(
    '/v1/categories',
    { schema: { body: ownedCategoryValuesSchema, response: { 201: ownedCategoryDtoSchema } } },
    async (request, reply) =>
      reply.code(201).send(await resolve(request).createCategory(request.body)),
  )
  api.patch(
    '/v1/categories/:id',
    {
      schema: {
        params: z.object({ id }),
        body: ownedCategoryValuesSchema.extend({ revision }).strict(),
        response: { 200: ownedCategoryDtoSchema },
      },
    },
    async (request) => {
      const { revision: expected, ...values } = request.body
      return resolve(request).updateCategory(request.params.id, expected, values)
    },
  )
  api.post(
    '/v1/transactions/:id/category',
    {
      schema: {
        params: z.object({ id }),
        body: z.object({ categoryId: id, revision }).strict(),
        response: { 200: assignmentDto },
      },
    },
    async (request) =>
      resolve(request).assignCategory(
        request.params.id,
        request.body.categoryId,
        request.body.revision,
      ),
  )
  api.post(
    '/v1/categories/:id/migration-preview',
    {
      schema: {
        params: z.object({ id }),
        body: z.object({ targetId: id.nullable() }).strict(),
        response: { 200: previewDto },
      },
    },
    async (request) => resolve(request).previewMigration(request.params.id, request.body.targetId),
  )
  api.post(
    '/v1/categories/:id/migrate',
    {
      schema: {
        params: z.object({ id }),
        body: z.object({ targetId: id.nullable(), revision, previewRevision: digest }).strict(),
        response: { 200: ownedCategoryDtoSchema },
      },
    },
    async (request) =>
      resolve(request).applyMigration(
        request.params.id,
        request.body.targetId,
        request.body.revision,
        request.body.previewRevision,
      ),
  )
  api.post(
    '/v1/categories/:id/undo',
    {
      schema: {
        params: z.object({ id }),
        body: z.object({ revision }).strict(),
        response: { 200: ownedCategoryDtoSchema },
      },
    },
    async (request) => resolve(request).undoCategory(request.params.id, request.body.revision),
  )
}
