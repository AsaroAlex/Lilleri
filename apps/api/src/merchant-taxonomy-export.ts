import { isQuietCategory, TAXONOMY_VERSION } from '@lilleri/domain'
import { normalizedMerchantKey } from '@lilleri/engines'
import { z } from 'zod'
import {
  merchantAliasDtoSchema,
  ownedCategoryAssignmentDtoSchema,
  ownedCategoryDtoSchema,
} from './merchant-taxonomy.js'
import type { AttestedSourceReferences } from './source-erasure-export.js'

const id = z.string().min(1).max(200),
  revision = z.number().int().min(1).max(2_147_483_646),
  instant = z.iso.datetime({ offset: true })
const aliasSnapshot = merchantAliasDtoSchema
  .omit({ id: true, profileId: true, revision: true, createdAt: true, updatedAt: true })
  .strict()
const categorySnapshot = ownedCategoryDtoSchema
  .omit({ id: true, profileId: true, revision: true, createdAt: true, updatedAt: true })
  .strict()
const alias = merchantAliasDtoSchema.extend({ createdAt: instant, updatedAt: instant }).strict()
const category = ownedCategoryDtoSchema.extend({ createdAt: instant, updatedAt: instant }).strict()
const assignment = ownedCategoryAssignmentDtoSchema.extend({ updatedAt: instant }).strict()
const identity = { id, profileId: id, revision, occurredAt: instant }
const aliasEvent = z
  .object({
    ...identity,
    aliasId: id,
    action: z.enum(['created', 'updated', 'archived', 'undone']),
    snapshot: z
      .object({
        before: aliasSnapshot.nullable(),
        after: aliasSnapshot,
        affectedTransactionIds: z.array(id),
        undoOf: id.optional(),
      })
      .strict(),
  })
  .strict()
const categoryEvent = z
  .object({
    ...identity,
    categoryId: id,
    action: z.enum(['created', 'updated', 'archived', 'merged', 'undone']),
    snapshot: z
      .object({
        before: categorySnapshot.nullable(),
        after: categorySnapshot,
        affectedTransactionIds: z.array(id),
        undoOf: id.optional(),
        migrated: z
          .array(z.object({ transactionId: id, before: assignment, after: assignment }).strict())
          .optional(),
      })
      .strict(),
  })
  .strict()
const assignmentEvent = z
  .object({
    ...identity,
    transactionId: id,
    snapshot: z.object({ before: assignment.nullable(), after: assignment }).strict(),
  })
  .strict()
/** Optional ownership addition; quiet/private history remains inside the owner's rights boundary. */
export const merchantTaxonomyExportDtoSchema = z
  .object({
    taxonomyVersion: z.literal(TAXONOMY_VERSION),
    aliases: z.array(alias),
    categories: z.array(category),
    assignments: z.array(assignment),
    aliasEvents: z.array(aliasEvent),
    categoryEvents: z.array(categoryEvent),
    assignmentEvents: z.array(assignmentEvent),
  })
  .strict()
export type MerchantTaxonomyExportDto = z.infer<typeof merchantTaxonomyExportDtoSchema>
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    )
  return value
}
const same = (first: unknown, second: unknown) =>
  JSON.stringify(stable(first)) === JSON.stringify(stable(second))
function reject(): never {
  throw new Error('Invalid owned recognition export')
}
function distinct(values: readonly string[]) {
  if (new Set(values).size !== values.length) reject()
}
function rows(value: unknown): readonly Record<string, unknown>[] {
  if (
    !Array.isArray(value) ||
    value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
  )
    reject()
  return value as readonly Record<string, unknown>[]
}
/** Caller passes the complete financial export. No current/private history is silently filtered. */
export function validateMerchantTaxonomyExport(
  snapshot: Record<string, unknown>,
  attestedSourceReferences?: AttestedSourceReferences,
): void {
  if (snapshot.merchantTaxonomy === undefined) return
  const parsed = merchantTaxonomyExportDtoSchema.safeParse(snapshot.merchantTaxonomy)
  if (!parsed.success) reject()
  const data = parsed.data,
    profile = snapshot.profile as Record<string, unknown> | undefined
  if (
    !profile ||
    typeof profile.id !== 'string' ||
    typeof snapshot.exportedAt !== 'string' ||
    !instant.safeParse(snapshot.exportedAt).success
  )
    reject()
  const profileId = profile.id,
    exportedAt = Date.parse(snapshot.exportedAt)
  const accounts = rows(snapshot.accounts),
    transactions = rows(snapshot.transactions)
  const accountIds = new Set(
    accounts.filter((account) => account.profileId === profileId).map((account) => account.id),
  )
  const ownedTransactions = new Set(
    transactions
      .filter(
        (transaction) =>
          transaction.profileId === profileId && accountIds.has(transaction.accountId),
      )
      .map((transaction) => transaction.id),
  )
  const currentTransactionIds = new Set(transactions.map((row) => row.id))
  const historicallyErased = (transactionId: string, occurredAt: string) => {
    // Only the trusted caller's authenticated signed-receipt map can authorize a missing subject.
    if (currentTransactionIds.has(transactionId)) return false
    const proof = attestedSourceReferences?.transactions.get(transactionId)
    const account = proof && attestedSourceReferences?.accounts.get(proof.accountId)
    const erasedAt = proof?.erasedAt
    return !!(
      proof &&
      account &&
      proof.profileId === profileId &&
      account.profileId === profileId &&
      account.connectionId === proof.connectionId &&
      typeof erasedAt === 'string' &&
      instant.safeParse(erasedAt).success &&
      Date.parse(occurredAt) <= Date.parse(erasedAt) &&
      Date.parse(erasedAt) <= exportedAt
    )
  }
  const historicalTransaction = (transactionId: string, occurredAt: string) =>
    ownedTransactions.has(transactionId) || historicallyErased(transactionId, occurredAt)
  const aliases = new Map(data.aliases.map((row) => [row.id, row])),
    categories = new Map(data.categories.map((row) => [row.id, row]))
  distinct(data.aliases.map((row) => row.id))
  distinct(data.aliases.map((row) => row.normalizedKey))
  distinct(data.categories.map((row) => row.id))
  distinct(data.assignments.map((row) => row.transactionId))
  distinct(
    [...data.aliasEvents, ...data.categoryEvents, ...data.assignmentEvents].map(
      (event) => event.id,
    ),
  )
  for (const row of [
    ...data.aliases,
    ...data.categories,
    ...data.assignments,
    ...data.aliasEvents,
    ...data.categoryEvents,
    ...data.assignmentEvents,
  ])
    if (row.profileId !== profileId) reject()
  for (const row of [...data.aliases, ...data.categories])
    if (
      Date.parse(row.createdAt) > Date.parse(row.updatedAt) ||
      Date.parse(row.updatedAt) > exportedAt
    )
      reject()
  for (const row of data.aliases)
    if (row.normalizedKey !== normalizedMerchantKey(row.normalizedKey)) reject()
  for (const row of data.categories)
    if (
      row.taxonomyVersion !== TAXONOMY_VERSION ||
      (row.parentId !== null && !categories.has(row.parentId))
    )
      reject()
  for (const row of data.categories) {
    const seen = new Set<string>()
    let current: typeof row | undefined = row
    while (current) {
      if (seen.has(current.id)) reject()
      seen.add(current.id)
      current = current.parentId === null ? undefined : categories.get(current.parentId)
    }
  }
  const validAssignment = (row: z.infer<typeof assignment>, historical = false) => {
    const category = categories.get(row.categoryId)
    if (
      row.profileId !== profileId ||
      !(historical
        ? historicalTransaction(row.transactionId, row.updatedAt)
        : ownedTransactions.has(row.transactionId)) ||
      !category ||
      row.taxonomyVersion !== TAXONOMY_VERSION ||
      row.categoryRevision > category.revision ||
      Date.parse(row.updatedAt) > exportedAt ||
      (isQuietCategory(row.canonicalCode) && !row.quiet)
    )
      reject()
    const event = data.categoryEvents.find(
      (event) => event.categoryId === row.categoryId && event.revision === row.categoryRevision,
    )
    if (
      !event ||
      event.snapshot.after.label !== row.labelSnapshot ||
      event.snapshot.after.canonicalCode !== row.canonicalCode ||
      event.snapshot.after.taxonomyVersion !== row.taxonomyVersion
    )
      reject()
  }
  for (const row of data.assignments) validAssignment(row)
  for (const event of data.aliasEvents) {
    if (
      !aliases.has(event.aliasId) ||
      Date.parse(event.occurredAt) > exportedAt ||
      event.snapshot.after.normalizedKey !==
        normalizedMerchantKey(event.snapshot.after.normalizedKey) ||
      event.snapshot.affectedTransactionIds.some(
        (id) => !historicalTransaction(id, event.occurredAt),
      )
    )
      reject()
    if (
      event.snapshot.undoOf &&
      !data.aliasEvents.some(
        (prior) =>
          prior.id === event.snapshot.undoOf &&
          prior.aliasId === event.aliasId &&
          prior.revision < event.revision,
      )
    )
      reject()
  }
  for (const row of data.aliases) {
    const events = data.aliasEvents
      .filter((event) => event.aliasId === row.id)
      .sort((a, b) => a.revision - b.revision)
    if (
      events.length !== row.revision ||
      events[0]?.action !== 'created' ||
      events[0]?.snapshot.before !== null ||
      events[0]?.occurredAt !== row.createdAt
    )
      reject()
    for (const [index, event] of events.entries()) {
      const previous = events[index - 1]
      if (
        event.revision !== index + 1 ||
        (previous &&
          (!same(event.snapshot.before, previous.snapshot.after) ||
            Date.parse(event.occurredAt) < Date.parse(previous.occurredAt))) ||
        event.snapshot.after.merchantId !== row.merchantId
      )
        reject()
    }
    const latest = events.at(-1),
      {
        id: _id,
        profileId: _profile,
        revision: _revision,
        createdAt: _created,
        updatedAt: _updated,
        ...values
      } = row
    if (!latest || latest.occurredAt !== row.updatedAt || !same(latest.snapshot.after, values))
      reject()
  }
  for (const event of data.categoryEvents) {
    if (
      !categories.has(event.categoryId) ||
      Date.parse(event.occurredAt) > exportedAt ||
      event.snapshot.affectedTransactionIds.some(
        (id) => !historicalTransaction(id, event.occurredAt),
      )
    )
      reject()
    if (
      event.snapshot.undoOf &&
      !data.categoryEvents.some(
        (prior) =>
          prior.id === event.snapshot.undoOf &&
          prior.categoryId === event.categoryId &&
          prior.revision < event.revision,
      )
    )
      reject()
    for (const migration of event.snapshot.migrated ?? []) {
      if (
        migration.transactionId !== migration.before.transactionId ||
        migration.transactionId !== migration.after.transactionId ||
        migration.before.categoryId !== event.categoryId ||
        migration.after.revision !== migration.before.revision + 1 ||
        migration.after.updatedAt !== event.occurredAt ||
        (migration.before.quiet && !migration.after.quiet)
      )
        reject()
      validAssignment(migration.before, true)
      validAssignment(migration.after, true)
      if (
        !historicallyErased(migration.transactionId, event.occurredAt) &&
        !data.assignmentEvents.some(
          (value) =>
            value.transactionId === migration.transactionId &&
            value.revision === migration.after.revision &&
            same(value.snapshot.after, migration.after),
        )
      )
        reject()
    }
  }
  for (const row of data.categories) {
    const events = data.categoryEvents
      .filter((event) => event.categoryId === row.id)
      .sort((a, b) => a.revision - b.revision)
    if (
      events.length !== row.revision ||
      events[0]?.action !== 'created' ||
      events[0]?.snapshot.before !== null ||
      events[0]?.occurredAt !== row.createdAt
    )
      reject()
    for (const [index, event] of events.entries()) {
      const previous = events[index - 1]
      if (
        event.revision !== index + 1 ||
        (previous &&
          (!same(event.snapshot.before, previous.snapshot.after) ||
            Date.parse(event.occurredAt) < Date.parse(previous.occurredAt)))
      )
        reject()
    }
    const latest = events.at(-1),
      {
        id: _id,
        profileId: _profile,
        revision: _revision,
        createdAt: _created,
        updatedAt: _updated,
        ...values
      } = row
    if (!latest || latest.occurredAt !== row.updatedAt || !same(latest.snapshot.after, values))
      reject()
  }
  for (const event of data.assignmentEvents) {
    validAssignment(event.snapshot.after)
    if (
      event.transactionId !== event.snapshot.after.transactionId ||
      event.revision !== event.snapshot.after.revision ||
      event.occurredAt !== event.snapshot.after.updatedAt ||
      Date.parse(event.occurredAt) > exportedAt
    )
      reject()
    if (event.snapshot.before) validAssignment(event.snapshot.before)
  }
  for (const row of data.assignments) {
    const events = data.assignmentEvents
      .filter((event) => event.transactionId === row.transactionId)
      .sort((a, b) => a.revision - b.revision)
    if (
      events.length !== row.revision - 1 ||
      events[0]?.revision !== 2 ||
      events[0]?.snapshot.before !== null
    )
      reject()
    for (const [index, event] of events.entries()) {
      const previous = events[index - 1]
      if (
        event.revision !== index + 2 ||
        (previous &&
          (!same(event.snapshot.before, previous.snapshot.after) ||
            Date.parse(event.occurredAt) < Date.parse(previous.occurredAt)))
      )
        reject()
    }
    if (!same(events.at(-1)?.snapshot.after, row)) reject()
  }
  if (
    data.assignmentEvents.some(
      (event) => !data.assignments.some((row) => row.transactionId === event.transactionId),
    )
  )
    reject()
}
