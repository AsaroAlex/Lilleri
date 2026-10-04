import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import { and, asc, eq, type SQL, sql } from 'drizzle-orm'
import { integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { sourceRemovalDecisions } from './pending-lifecycle-schema.js'
import { Problem } from './problem.js'

export const fixtureProofDto = z.strictObject({
  version: z.literal('mock-fixture-retirement-v1'),
  transactionIds: z.array(z.string()),
  accountIds: z.array(z.string()),
  connectionIds: z.array(z.string()),
  transactionReferences: z.array(
    z.strictObject({ id: z.string(), accountId: z.string(), connectionId: z.string() }),
  ),
  accountReferences: z.array(z.strictObject({ id: z.string(), connectionId: z.string() })),
  protectedTransactions: z.number().int().nonnegative(),
  protectedAccounts: z.number().int().nonnegative(),
  protectedConnections: z.number().int().nonnegative(),
  userDecisions: z.number().int().nonnegative(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
})
export type FixtureProof = z.infer<typeof fixtureProofDto>
export const syntheticFixtureRetirements = pgTable('synthetic_fixture_retirements', {
  profileId: text('profile_id')
    .primaryKey()
    .references(() => schema.profiles.id, { onDelete: 'cascade' }),
  householdId: text('household_id').notNull().default(''),
  state: text('state').$type<'retired' | 'restored'>().notNull(),
  revision: integer('revision').notNull(),
  proof: jsonb('proof').$type<FixtureProof>().notNull(),
  updatedAt: text('updated_at').notNull(),
})
export const syntheticFixtureEvents = pgTable('synthetic_fixture_events', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  profileId: text('profile_id')
    .notNull()
    .references(() => schema.profiles.id, { onDelete: 'cascade' }),
  state: text('state').$type<'retired' | 'restored'>().notNull(),
  revision: integer('revision').notNull(),
  proof: jsonb('proof').$type<FixtureProof>().notNull(),
  occurredAt: text('occurred_at').notNull(),
})
export const fixtureAuditDto = z.strictObject({
  current: z
    .object({
      profileId: z.string(),
      state: z.enum(['retired', 'restored']),
      revision: z.number().int().positive(),
      proof: fixtureProofDto,
      updatedAt: z.string(),
    })
    .nullable(),
  events: z.array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      state: z.enum(['retired', 'restored']),
      revision: z.number().int().positive(),
      proof: fixtureProofDto,
      occurredAt: z.string(),
    }),
  ),
})
export const fixtureSummaryDto = z.strictObject({
  retiredTransactions: z.number().int().nonnegative(),
  retiredAccounts: z.number().int().nonnegative(),
  retiredConnections: z.number().int().nonnegative(),
  protectedTransactions: z.number().int().nonnegative(),
  protectedAccounts: z.number().int().nonnegative(),
  protectedConnections: z.number().int().nonnegative(),
  userDecisions: z.number().int().nonnegative(),
  archivePreserved: z.literal(true),
})
export async function fixtureRetirement(db: Database, profileId: string) {
  const [row] = await db
    .select()
    .from(syntheticFixtureRetirements)
    .where(eq(syntheticFixtureRetirements.profileId, profileId))
  return row?.state === 'retired' ? row : null
}
export async function assertFixturesEnabled(db: Database, profileId: string) {
  if (await fixtureRetirement(db, profileId))
    throw new Problem(
      409,
      'synthetic_fixtures_disabled',
      'I dati di prova sono stati rimossi. Per usare una banca reale serve un collegamento personale autorizzato.',
    )
}
/** Read-only preflight. A mock-labelled connection alone never proves that its CSV/manual rows are fixtures. */
export async function syntheticFixturePreflight(
  db: Database,
  profileId: string,
): Promise<FixtureProof> {
  const connections = await db
    .select()
    .from(schema.connections)
    .where(eq(schema.connections.profileId, profileId))
    .orderBy(asc(schema.connections.id))
  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.profileId, profileId))
    .orderBy(asc(schema.accounts.id))
  const transactions = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.profileId, profileId))
    .orderBy(asc(schema.transactions.id))
  const kept = new Set(
    (
      await db
        .select()
        .from(sourceRemovalDecisions)
        .where(
          and(
            eq(sourceRemovalDecisions.profileId, profileId),
            eq(sourceRemovalDecisions.choice, 'keep_manual'),
          ),
        )
    ).map((row) => row.transactionId),
  )
  const mockConnections = new Set(
    connections.filter((row) => row.providerId === 'mock-italian').map((row) => row.id),
  )
  const fixtures = transactions.filter(
    (row) =>
      mockConnections.has(row.connectionId) &&
      row.providerId === 'mock-italian' &&
      !kept.has(row.id),
  )
  const fixtureIds = new Set(fixtures.map((row) => row.id))
  const protectedTransactions = transactions.filter((row) => !fixtureIds.has(row.id))
  const protectedAccounts = new Set(protectedTransactions.map((row) => row.accountId))
  const fixtureAccounts = accounts.filter(
    (row) => mockConnections.has(row.connectionId) && !protectedAccounts.has(row.id),
  )
  const fixtureAccountIds = new Set(fixtureAccounts.map((row) => row.id))
  const fixtureConnections = connections.filter(
    (row) =>
      mockConnections.has(row.id) &&
      accounts
        .filter((account) => account.connectionId === row.id)
        .every((account) => fixtureAccountIds.has(account.id)),
  )
  const feedback = await db
    .select({ id: schema.feedback.transactionId })
    .from(schema.feedback)
    .where(eq(schema.feedback.profileId, profileId))
  const decisions = await db
    .select({ id: schema.matchDecisions.matchId })
    .from(schema.matchDecisions)
    .where(eq(schema.matchDecisions.profileId, profileId))
  const proof = {
    version: 'mock-fixture-retirement-v1' as const,
    transactionIds: fixtures.map((row) => row.id),
    accountIds: fixtureAccounts.map((row) => row.id),
    connectionIds: fixtureConnections.map((row) => row.id),
    transactionReferences: fixtures.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      connectionId: row.connectionId,
    })),
    accountReferences: fixtureAccounts.map((row) => ({
      id: row.id,
      connectionId: row.connectionId,
    })),
    protectedTransactions: protectedTransactions.length,
    protectedAccounts: accounts.length - fixtureAccounts.length,
    protectedConnections: connections.length - fixtureConnections.length,
    userDecisions: feedback.length + decisions.length + kept.size,
  }
  return { ...proof, digest: createHash('sha256').update(JSON.stringify(proof)).digest('hex') }
}
/** Operator-only bootstrap; records a reversible active-view retirement without deleting owned records or keys. */
export async function retireSyntheticFixtures(db: Database, profileId: string, at: string) {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, profileId))
      .for('update')
    if (!profile) return null
    const proof = await syntheticFixturePreflight(tx, profileId)
    const [previous] = await tx
      .select()
      .from(syntheticFixtureRetirements)
      .where(eq(syntheticFixtureRetirements.profileId, profileId))
    if (previous?.state === 'retired' && previous.proof.digest === proof.digest) return previous
    const row = {
      profileId,
      householdId: profile.householdId,
      state: 'retired' as const,
      revision: (previous?.revision ?? 0) + 1,
      proof,
      updatedAt: at,
    }
    await tx
      .insert(syntheticFixtureRetirements)
      .values(row)
      .onConflictDoUpdate({ target: syntheticFixtureRetirements.profileId, set: row })
    await tx
      .insert(syntheticFixtureEvents)
      .values({ id: `fixture_event_${randomUUID()}`, ...row, occurredAt: at })
    return row
  })
}
/** Explicit trusted rollback; never exposed as a public mutation or inferred from an omitted env var. */
export async function restoreSyntheticFixtures(db: Database, profileId: string, at: string) {
  return db.transaction(async (tx) => {
    await tx.select().from(schema.profiles).where(eq(schema.profiles.id, profileId)).for('update')
    const previous = await fixtureRetirement(tx, profileId)
    if (!previous) return
    const row = {
      ...previous,
      state: 'restored' as const,
      revision: previous.revision + 1,
      updatedAt: at,
    }
    await tx
      .update(syntheticFixtureRetirements)
      .set(row)
      .where(eq(syntheticFixtureRetirements.profileId, profileId))
    await tx
      .insert(syntheticFixtureEvents)
      .values({ id: `fixture_event_${randomUUID()}`, ...row, occurredAt: at })
  })
}
export function fixtureTransactionReadPredicate(profileId: string): SQL {
  const tx = schema.transactions
  return sql`not exists (select 1 from synthetic_fixture_retirements f join connections c on c.profile_id=f.profile_id and c.id=${tx.connectionId}
    where f.profile_id=${profileId} and f.state='retired' and c.provider_id='mock-italian'
    and ${tx.providerId}='mock-italian' and (f.proof->'transactionIds') ? ${tx.id}
      and not exists (select 1 from source_removal_decisions kept where kept.profile_id=${profileId} and kept.transaction_id=${tx.id} and kept.choice='keep_manual'))`
}
export function fixtureAccountReadPredicate(profileId: string): SQL {
  const a = schema.accounts
  // Fresh user imports protect an account even if they arrived after the original preflight.
  return sql`not exists (select 1 from synthetic_fixture_retirements f join connections c on c.profile_id=f.profile_id and c.id=${a.connectionId}
    where f.profile_id=${profileId} and f.state='retired' and c.provider_id='mock-italian' and (f.proof->'accountIds') ? ${a.id}
      and not exists (select 1 from transactions protected where protected.profile_id=${profileId} and protected.account_id=${a.id}
        and (protected.provider_id <> 'mock-italian'
          or exists(select 1 from source_removal_decisions kept where kept.profile_id=${profileId} and kept.transaction_id=protected.id and kept.choice='keep_manual'))))`
}
export function fixtureConnectionReadPredicate(profileId: string): SQL {
  const c = schema.connections
  return sql`not exists(select 1 from synthetic_fixture_retirements f
    where f.profile_id=${profileId} and f.state='retired' and ${c.providerId}='mock-italian' and (f.proof->'connectionIds') ? ${c.id}
      and not exists(select 1 from transactions protected where protected.profile_id=${profileId} and protected.connection_id=${c.id}
        and (protected.provider_id <> 'mock-italian'
          or exists(select 1 from source_removal_decisions kept where kept.profile_id=${profileId} and kept.transaction_id=protected.id and kept.choice='keep_manual'))))`
}
export async function fixtureAudit(db: Database, profileId: string) {
  const [current] = await db
    .select()
    .from(syntheticFixtureRetirements)
    .where(eq(syntheticFixtureRetirements.profileId, profileId))
  const events = await db
    .select()
    .from(syntheticFixtureEvents)
    .where(eq(syntheticFixtureEvents.profileId, profileId))
    .orderBy(asc(syntheticFixtureEvents.revision))
  return fixtureAuditDto.parse({ current: current ?? null, events })
}
export function fixtureSummary(proof: FixtureProof) {
  return {
    retiredTransactions: proof.transactionIds.length,
    retiredAccounts: proof.accountIds.length,
    retiredConnections: proof.connectionIds.length,
    protectedTransactions: proof.protectedTransactions,
    protectedAccounts: proof.protectedAccounts,
    protectedConnections: proof.protectedConnections,
    userDecisions: proof.userDecisions,
    archivePreserved: true as const,
  }
}

/** Export audit is scoped and tamper-evident; absent references are allowed only with a verified source-erasure receipt. */
export function validateFixtureOwnership(
  value: z.infer<typeof fixtureAuditDto>,
  context: {
    profileId: string
    exportedAt: string
    connections: readonly { id: string; profileId: string; providerId?: string }[]
    accounts: readonly { id: string; profileId: string; connectionId?: string }[]
    transactions: readonly {
      id: string
      profileId: string
      connectionId?: string
      providerId?: string
      accountId?: string
    }[]
    erasedSources?: readonly {
      connectionId: string
      accountIds: readonly string[]
      transactions: readonly { id: string; accountId: string }[]
    }[]
  },
) {
  const invalid = (): never => {
    throw new Error('Invalid synthetic fixture ownership audit')
  }
  const end = Date.parse(context.exportedAt)
  if (!Number.isFinite(end)) invalid()
  const connections = new Map(context.connections.map((row) => [row.id, row]))
  const accounts = new Map(context.accounts.map((row) => [row.id, row]))
  const transactions = new Map(context.transactions.map((row) => [row.id, row]))
  const erasedSources = context.erasedSources ?? []
  const erased = new Set(erasedSources.map((row) => row.connectionId))
  const proofCheck = (proof: FixtureProof) => {
    const { digest, ...facts } = proof
    if (createHash('sha256').update(JSON.stringify(facts)).digest('hex') !== digest) invalid()
    for (const ids of [proof.transactionIds, proof.accountIds, proof.connectionIds])
      if (new Set(ids).size !== ids.length) invalid()
    // Mixed account/connection references remain protected, but the fixture reference still
    // identifies the exact source receipt if a later explicit erasure removes its canonical row.
    if (
      JSON.stringify(proof.transactionReferences.map((row) => row.id)) !==
        JSON.stringify(proof.transactionIds) ||
      JSON.stringify(proof.accountReferences.map((row) => row.id)) !==
        JSON.stringify(proof.accountIds)
    )
      invalid()
    for (const reference of proof.transactionReferences) {
      const row = transactions.get(reference.id)
      if (!row) {
        if (
          !erasedSources.some(
            (source) =>
              source.connectionId === reference.connectionId &&
              source.transactions.some(
                (row) => row.id === reference.id && row.accountId === reference.accountId,
              ),
          )
        )
          invalid()
        continue
      }
      const connection = connections.get(row.connectionId ?? '')
      if (
        row.profileId !== context.profileId ||
        row.providerId !== 'mock-italian' ||
        connection?.providerId !== 'mock-italian' ||
        row.connectionId !== reference.connectionId ||
        row.accountId !== reference.accountId
      )
        invalid()
    }
    for (const reference of proof.accountReferences) {
      const row = accounts.get(reference.id)
      if (!row) {
        if (
          !erasedSources.some(
            (source) =>
              source.connectionId === reference.connectionId &&
              source.accountIds.includes(reference.id),
          )
        )
          invalid()
        continue
      }
      if (
        row.profileId !== context.profileId ||
        row.connectionId !== reference.connectionId ||
        connections.get(row.connectionId ?? '')?.providerId !== 'mock-italian'
      )
        invalid()
    }
    for (const id of proof.connectionIds) {
      const row = connections.get(id)
      if (!row) {
        if (!erased.has(id)) invalid()
        continue
      }
      if (row.profileId !== context.profileId || row.providerId !== 'mock-italian') invalid()
    }
  }
  let previousAt = -Infinity
  const eventIds = new Set<string>()
  for (const [index, event] of value.events.entries()) {
    const at = Date.parse(event.occurredAt)
    if (
      event.profileId !== context.profileId ||
      event.revision !== index + 1 ||
      eventIds.has(event.id) ||
      !Number.isFinite(at) ||
      at < previousAt ||
      at > end
    )
      invalid()
    eventIds.add(event.id)
    previousAt = at
    proofCheck(event.proof)
  }
  const last = value.events.at(-1)
  const current = value.current
  if (!current) {
    if (last) invalid()
    return
  }
  if (
    !last ||
    current.profileId !== context.profileId ||
    current.revision !== last.revision ||
    current.state !== last.state ||
    current.updatedAt !== last.occurredAt ||
    current.proof.digest !== last.proof.digest
  )
    invalid()
  proofCheck(current.proof)
}
