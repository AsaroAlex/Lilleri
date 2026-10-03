import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  type Account,
  type Analysis,
  type CategoryId,
  type Classification,
  type Connection,
  type CurrencyCode,
  parseDecimal,
  type Transaction,
} from '@lilleri/domain'
import { analyse, effectiveTransactions } from '@lilleri/engines'
import {
  type FinancialDataProvider,
  normalizeAccount,
  normalizeTransaction,
  type ProviderAccount,
  type ProviderTransaction,
  parseBankCsv,
  stableId,
} from '@lilleri/financial-providers'
import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { ManualService, recordManualImport } from './manual-service.js'
import { conflict, notFound, Problem, providerFailure } from './problem.js'
import {
  cleanupExpiredObservationPayloads,
  insertSourceObservation,
  sourceObservationsForExport,
} from './retention.js'
import {
  assertNoOutstandingRevocation,
  enqueueRevocation,
  revocationsForProfile,
} from './revocation-outbox.js'
import { SettingsService } from './settings.js'

const id = z.string().min(1).max(200)
const optionalText = z.string().max(500).optional()
const currency = z.custom<CurrencyCode>((value) => {
  try {
    return typeof value === 'string' && Boolean(parseDecimal('0', value as CurrencyCode))
  } catch {
    return false
  }
})
const accountSchema = z
  .object({
    id,
    name: z.string().min(1).max(200),
    institutionName: z.string().min(1).max(200),
    kind: z.enum(['current', 'card', 'cash', 'savings']),
    currency,
    balance: z.string().min(1).max(40),
  })
  .strict()
const recordSchema = z
  .object({
    id,
    accountId: id,
    amount: z.string().min(1).max(40),
    currency,
    description: z.string().min(1).max(2000),
    status: z.enum(['pending', 'booked', 'reversed']),
    merchantName: optionalText,
    bookedOn: z.string().length(10).optional(),
    authorizedOn: z.string().length(10).optional(),
    kind: z
      .enum(['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'])
      .optional(),
    reference: optionalText,
    relatedTransactionId: id.optional(),
    relatedAccountId: id.optional(),
    source: z.enum(['bank', 'csv', 'manual']).optional(),
  })
  .strict()
const pageSchema = z
  .object({
    transactions: z.array(recordSchema).max(200),
    nextCursor: z.string().min(1).max(1000).nullable(),
  })
  .strict()

export type Serialized<T> = T extends bigint
  ? string
  : T extends readonly (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T
export function json<T>(value: T): Serialized<T> {
  return JSON.parse(
    JSON.stringify(value, (_, item: unknown) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  ) as Serialized<T>
}
function canonical(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    )
  return value
}
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const transactionHash = ({ revision: _revision, observedAt: _observedAt, ...value }: Transaction) =>
  hash(value)
export type RevisionedAnalysis = Omit<Analysis, 'matches'> & {
  readonly matches: readonly (Analysis['matches'][number] & { readonly revision: string })[]
}
function reconciliationRevision(
  profileId: string,
  match: Analysis['matches'][number],
  decisionRevision: number,
  transactions: ReadonlyMap<string, Transaction>,
  accounts: ReadonlyMap<string, Account>,
): string {
  const legs = [...match.transactionIds].sort().map((id) => {
    const transaction = transactions.get(id)
    if (!transaction) throw new Error('Reconciliation refers to a missing canonical transaction')
    const account = accounts.get(transaction.accountId)
    if (!account) throw new Error('Reconciliation refers to a missing canonical account')
    return {
      id,
      revision: transaction.revision,
      account: {
        id: account.id,
        profileId: account.profileId,
        connectionId: account.connectionId,
        providerAccountId: account.providerAccountId,
        kind: account.kind,
        currency: account.balance.currency,
      },
    }
  })
  // Bind user decisions and source versions; observation/freshness timestamps are excluded.
  return hash({
    format: 'reconciliation-revision-v1',
    profileId,
    matchId: match.id,
    decisionRevision,
    algorithmVersion: match.algorithmVersion,
    type: match.type,
    state: match.state,
    confidence: match.confidence,
    evidence: [...match.evidence].sort(),
    legs,
  })
}
function accountFromRow(row: typeof schema.accounts.$inferSelect): Account {
  const { balanceMinor, currency: code, ...rest } = row
  return { ...rest, balance: { amountMinor: balanceMinor, currency: code } }
}
function transactionFromRow(row: typeof schema.transactions.$inferSelect): Transaction {
  const { amountMinor, currency: code, contentHash: _contentHash, ...rest } = row
  return { ...rest, amount: { amountMinor, currency: code } }
}
function accountRow(account: Account) {
  const { balance, ...rest } = account
  return { ...rest, balanceMinor: balance.amountMinor, currency: balance.currency }
}
function transactionRow(transaction: Transaction) {
  const { amount, ...rest } = transaction
  return {
    ...rest,
    amountMinor: amount.amountMinor,
    currency: amount.currency,
    contentHash: transactionHash(transaction),
  }
}

export class DemoService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly provider: FinancialDataProvider,
    readonly now: () => string = () => new Date().toISOString(),
  ) {
    if (!provider.capabilities().synthetic || !provider.capabilities().grantSpecificRevocation)
      throw new Error('The demo API requires synthetic grant-specific revocation')
  }
  async bootstrap(seed = false) {
    if (
      (
        await this.db
          .select()
          .from(schema.profileTombstones)
          .where(eq(schema.profileTombstones.profileId, this.profileId))
      ).length
    )
      return
    await this.db
      .insert(schema.profiles)
      .values({
        id: this.profileId,
        name: 'Profilo dimostrativo',
        timezone: 'Europe/Rome',
        createdAt: this.now(),
      })
      .onConflictDoNothing()
    if (
      seed &&
      !(
        await this.db
          .select()
          .from(schema.connections)
          .where(eq(schema.connections.profileId, this.profileId))
      ).length
    )
      await this.connect()
  }
  async profile(db = this.db) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
    if (!profile) throw notFound()
    return profile
  }
  async connection(connectionId: string, db = this.db, lock = false) {
    const query = db
      .select()
      .from(schema.connections)
      .where(
        and(
          eq(schema.connections.profileId, this.profileId),
          eq(schema.connections.id, connectionId),
        ),
      )
    const [connection] = await (lock ? query.for('update') : query)
    if (!connection) throw notFound()
    return connection
  }
  async assertConsent(connection: Connection, db = this.db) {
    const [consent] = await db
      .select()
      .from(schema.consents)
      .where(
        and(
          eq(schema.consents.profileId, this.profileId),
          eq(schema.consents.connectionId, connection.id),
          isNull(schema.consents.revokedAt),
        ),
      )
      .orderBy(desc(schema.consents.grantedAt))
    if (
      connection.status !== 'active' ||
      !consent ||
      consent.revokedAt ||
      Date.parse(consent.expiresAt) <= Date.parse(this.now())
    )
      throw new Problem(
        409,
        'consent_inactive',
        'Il collegamento è stato revocato o è scaduto. Crea un nuovo collegamento dimostrativo.',
      )
  }
  async connect(): Promise<Connection> {
    const result = await this.db.transaction(async (tx) => {
      await this.profile(tx)
      await tx
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const [existing] = await tx
        .select()
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.profileId, this.profileId),
            eq(schema.connections.providerId, this.provider.id),
          ),
        )
        .orderBy(asc(schema.connections.createdAt))
      if (existing?.status === 'active') {
        try {
          await this.assertConsent(existing, tx)
          return { connection: existing, needsSync: existing.lastSyncedAt === null }
        } catch (error) {
          if (!(error instanceof Problem) || error.code !== 'consent_inactive') throw error
        }
      }
      // Regranting the synthetic connection keeps canonical account and transaction identities.
      const connectionId = existing?.id ?? `connection_${randomUUID()}`,
        consentId = `consent_${randomUUID()}`,
        createdAt = this.now()
      await assertNoOutstandingRevocation(tx, this.profileId, connectionId)
      let grant: Awaited<ReturnType<FinancialDataProvider['createConnection']>>
      try {
        grant = await this.provider.createConnection({
          profileId: this.profileId,
          connectionId,
          grantId: consentId,
        })
      } catch {
        throw providerFailure()
      }
      if (
        !Number.isFinite(Date.parse(grant.consentExpiresAt)) ||
        Date.parse(grant.consentExpiresAt) <= Date.parse(createdAt) ||
        grant.redirectUrl !== null
      )
        throw providerFailure()
      const value: Connection = {
        id: connectionId,
        profileId: this.profileId,
        providerId: this.provider.id,
        institutionId: 'synthetic-italian',
        status: 'active',
        createdAt: existing?.createdAt ?? createdAt,
        lastSyncedAt: existing?.lastSyncedAt ?? null,
      }
      await tx
        .insert(schema.connections)
        .values(value)
        .onConflictDoUpdate({ target: schema.connections.id, set: { status: 'active' } })
      await tx
        .update(schema.consents)
        .set({ revokedAt: createdAt })
        .where(
          and(
            eq(schema.consents.profileId, this.profileId),
            eq(schema.consents.connectionId, connectionId),
            isNull(schema.consents.revokedAt),
          ),
        )
      await tx.insert(schema.consents).values({
        id: consentId,
        profileId: this.profileId,
        connectionId,
        purpose: 'account_information',
        grantedAt: createdAt,
        expiresAt: grant.consentExpiresAt,
        revokedAt: null,
        provider: this.provider.id,
      })
      return { connection: value, needsSync: true }
    })
    if (result.needsSync) await this.sync(result.connection.id)
    return await this.connection(result.connection.id)
  }
  async collect(connectionId: string) {
    const context = { profileId: this.profileId, connectionId },
      observedAt = this.now()
    try {
      await this.provider.refreshConnection(context)
      const rawAccounts: ProviderAccount[] = z
        .array(accountSchema)
        .min(1)
        .max(50)
        .parse(await this.provider.listAccounts(context))
      if (new Set(rawAccounts.map((account) => account.id)).size !== rawAccounts.length)
        throw new Error('Duplicate provider account')
      const normalizedAccounts = rawAccounts.map((account) =>
        normalizeAccount(this.provider.id, context, account, observedAt),
      )
      const records: ProviderTransaction[] = []
      for (const account of rawAccounts) {
        let cursor: string | null = null,
          pages = 0
        const seen = new Set<string>()
        do {
          if (++pages > 100) throw new Error('Provider page bound')
          const page = pageSchema.parse(
            await this.provider.getTransactions(context, account.id, cursor),
          )
          for (const record of page.transactions) {
            if (record.accountId !== account.id || record.currency !== account.currency)
              throw new Error('Wrong account or currency')
            records.push(record as ProviderTransaction)
            if (records.length > 1000) throw new Error('Provider record bound')
          }
          cursor = page.nextCursor
          if (cursor) {
            if (seen.has(cursor)) throw new Error('Repeated provider cursor')
            seen.add(cursor)
          }
        } while (cursor)
      }
      const observations = records.map((record) => ({
        record,
        transaction: normalizeTransaction(this.provider.id, context, record, observedAt),
      }))
      const canonical = new Map<string, Transaction>()
      const statuses = new Map<string, string>()
      const priority = { pending: 0, booked: 1, reversed: 2 }
      for (const { transaction } of observations) {
        const observationKey = `${transaction.id}:${transaction.status}`,
          digest = transactionHash(transaction)
        if (statuses.has(observationKey) && statuses.get(observationKey) !== digest)
          throw new Error('Conflicting provider identity')
        statuses.set(observationKey, digest)
        const previous = canonical.get(transaction.id)
        if (!previous || priority[transaction.status] > priority[previous.status])
          canonical.set(transaction.id, transaction)
      }
      return { normalizedAccounts, observations, canonical: [...canonical.values()], observedAt }
    } catch {
      throw providerFailure()
    }
  }
  async sync(connectionId: string) {
    try {
      return await this.db.transaction(async (tx) => {
        await tx
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, this.profileId))
          .for('update')
        const connection = await this.connection(connectionId, tx, true)
        if (connection.providerId !== this.provider.id)
          throw new Problem(
            409,
            'manual_source',
            'Questo conto è aggiornato con inserimenti o importazioni manuali.',
          )
        await this.assertConsent(connection, tx)
        // Hold the profile/connection lock during collection: an older request cannot overwrite a newer response.
        const batch = await this.collect(connectionId)
        const report = {
          inserted: 0,
          updated: 0,
          unchanged: 0,
          rejected: 0,
          syncedAt: batch.observedAt,
        }
        for (const account of batch.normalizedAccounts) {
          const row = accountRow(account)
          await tx
            .insert(schema.accounts)
            .values(row)
            .onConflictDoUpdate({ target: schema.accounts.id, set: row })
        }
        for (const { record, transaction } of batch.observations) {
          const contentHash = hash(record)
          await insertSourceObservation(
            tx,
            {
              id: stableId(
                'observation',
                this.profileId,
                connectionId,
                transaction.accountId,
                this.provider.id,
                record.id,
                record.status,
                contentHash,
              ),
              profileId: this.profileId,
              connectionId,
              accountId: transaction.accountId,
              providerId: this.provider.id,
              providerRecordId: record.id,
              status: record.status,
              contentHash,
              observedAt: batch.observedAt,
            },
            record as unknown as Record<string, unknown>,
          )
        }
        for (const transaction of batch.canonical) {
          const [existing] = await tx
            .select()
            .from(schema.transactions)
            .where(
              and(
                eq(schema.transactions.profileId, this.profileId),
                eq(schema.transactions.id, transaction.id),
              ),
            )
            .for('update')
          if (!existing) {
            await tx.insert(schema.transactions).values(transactionRow(transaction))
            report.inserted++
            continue
          }
          if (
            ((existing.status === 'booked' || existing.status === 'reversed') &&
              transaction.status === 'pending') ||
            (existing.status === 'reversed' && transaction.status === 'booked')
          ) {
            report.rejected++
            continue
          }
          if (existing.contentHash === transactionHash(transaction)) {
            report.unchanged++
            continue
          }
          await tx
            .update(schema.transactions)
            .set(transactionRow({ ...transaction, revision: existing.revision + 1 }))
            .where(
              and(
                eq(schema.transactions.profileId, this.profileId),
                eq(schema.transactions.id, transaction.id),
              ),
            )
          report.updated++
        }
        await tx
          .update(schema.connections)
          .set({ lastSyncedAt: batch.observedAt })
          .where(
            and(
              eq(schema.connections.profileId, this.profileId),
              eq(schema.connections.id, connectionId),
            ),
          )
        await tx.insert(schema.syncRuns).values({
          id: `sync_${randomUUID()}`,
          profileId: this.profileId,
          connectionId,
          ...report,
        })
        return report
      })
    } catch (error) {
      if (error instanceof Problem) throw error
      throw providerFailure()
    }
  }
  async importCsv(accountId: string, csv: string) {
    if (Buffer.byteLength(csv, 'utf8') > 262_144)
      throw new Problem(422, 'invalid_csv', 'Il file CSV supera il limite di 256 KiB.')
    return this.db.transaction(async (tx) => {
      await tx
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const [account] = await tx
        .select()
        .from(schema.accounts)
        .where(
          and(eq(schema.accounts.profileId, this.profileId), eq(schema.accounts.id, accountId)),
        )
        .for('update')
      if (!account) throw notFound()
      const importedAt = this.now(),
        context = { profileId: this.profileId, connectionId: account.connectionId }
      let records: readonly ProviderTransaction[], transactions: readonly Transaction[]
      try {
        records = parseBankCsv(csv, account.providerAccountId)
        if (!records.length || records.some((record) => record.currency !== account.currency))
          throw new Error('Empty CSV or wrong currency')
        transactions = records.map((record) => ({
          ...normalizeTransaction('csv-import', context, record, importedAt),
          accountId,
        }))
      } catch {
        throw new Problem(
          422,
          'invalid_csv',
          'Il CSV non è valido. Controlla le colonne, gli importi, le date e la valuta del conto.',
        )
      }
      const report = { inserted: 0, updated: 0, unchanged: 0, rejected: 0, importedAt }
      for (const transaction of transactions) {
        if (
          transaction.amount.amountMinor < -9_223_372_036_854_775_808n ||
          transaction.amount.amountMinor > 9_223_372_036_854_775_807n
        )
          throw new Problem(
            422,
            'invalid_csv',
            'Un importo CSV supera il limite rappresentabile. Nessuna riga è stata importata.',
          )
        const [existing] = await tx
          .select()
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.profileId, this.profileId),
              eq(schema.transactions.id, transaction.id),
            ),
          )
        if (existing && existing.contentHash !== transactionHash(transaction))
          throw conflict(
            'Una riga CSV usa un’identità già salvata con dati diversi. Correggi l’identità e riprova.',
          )
        if (existing) report.unchanged++
        else {
          await tx.insert(schema.transactions).values(transactionRow(transaction))
          await recordManualImport(tx, transaction, importedAt)
          report.inserted++
        }
      }
      for (const [index, record] of records.entries()) {
        const transaction = transactions[index]
        if (!transaction) throw conflict()
        const contentHash = hash(record)
        await insertSourceObservation(
          tx,
          {
            id: stableId(
              'observation',
              this.profileId,
              account.connectionId,
              accountId,
              'csv-import',
              record.id,
              record.status,
              contentHash,
            ),
            profileId: this.profileId,
            connectionId: account.connectionId,
            accountId,
            providerId: 'csv-import',
            providerRecordId: record.id,
            status: record.status,
            contentHash,
            observedAt: importedAt,
          },
          record as unknown as Record<string, unknown>,
        )
      }
      return report
    })
  }
  async data(
    db = this.db,
    additionalMatchOverrides: Readonly<Record<string, 'confirmed' | 'rejected' | 'undone'>> = {},
  ) {
    const accountRows = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, this.profileId))
    const transactionRows = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, this.profileId))
      .orderBy(asc(schema.transactions.id))
    const feedback = await db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, this.profileId))
    const preferences = await db
      .select()
      .from(schema.preferences)
      .where(eq(schema.preferences.profileId, this.profileId))
    const rules = (
      await db
        .select()
        .from(schema.classificationRules)
        .where(eq(schema.classificationRules.profileId, this.profileId))
    ).map((rule) => ({
      ...rule,
      enabled: rule.enabled === 'yes' && rule.archived === 'no',
    }))
    const decisions = await db
      .select()
      .from(schema.matchDecisions)
      .where(eq(schema.matchDecisions.profileId, this.profileId))
    const accounts = accountRows.map(accountFromRow),
      transactions = transactionRows.map(transactionFromRow)
    const derived = analyse(accounts, transactions, {
      rules,
      preferences,
      userClassifications: Object.fromEntries(
        feedback.map((item) => [item.transactionId, item.categoryId]),
      ),
      matchOverrides: {
        ...Object.fromEntries(decisions.map((item) => [item.matchId, item.state])),
        ...additionalMatchOverrides,
      },
    })
    const decisionRevisions = new Map(decisions.map((item) => [item.matchId, item.revision]))
    const transactionVersions = new Map(transactions.map((item) => [item.id, item]))
    const accountContexts = new Map(accounts.map((item) => [item.id, item]))
    const analysis: RevisionedAnalysis = {
      ...derived,
      matches: derived.matches.map((match) => ({
        ...match,
        revision: reconciliationRevision(
          this.profileId,
          match,
          decisionRevisions.get(match.id) ?? 0,
          transactionVersions,
          accountContexts,
        ),
      })),
    }
    return { accounts, transactions, analysis }
  }
  async overview() {
    return this.db.transaction((tx) => this.overviewSnapshot(tx), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    })
  }
  async overviewSnapshot(db: Database) {
    const profile = await this.profile(db),
      data = await this.data(db)
    const connections = await db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.profileId, this.profileId))
    return {
      mode: 'synthetic' as const,
      profile: { id: profile.id, name: profile.name, timezone: profile.timezone },
      connections,
      ...data,
    }
  }
  async page(cursor: string | undefined, limit = 25) {
    await this.profile()
    let lastId = ''
    if (cursor) {
      try {
        if (cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor))
          throw new Error('Invalid cursor')
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
          profileId?: unknown
          lastId?: unknown
        }
        if (
          decoded.profileId !== this.profileId ||
          typeof decoded.lastId !== 'string' ||
          decoded.lastId.length > 200
        )
          throw new Error('Invalid cursor')
        lastId = decoded.lastId
      } catch {
        throw new Problem(400, 'invalid_cursor', 'Il cursore della pagina non è valido.')
      }
    }
    const rows = await this.db
      .select()
      .from(schema.transactions)
      .where(
        and(eq(schema.transactions.profileId, this.profileId), gt(schema.transactions.id, lastId)),
      )
      .orderBy(asc(schema.transactions.id))
      .limit(limit + 1)
    const items = rows.slice(0, limit).map(transactionFromRow)
    return {
      items,
      nextCursor:
        rows.length > limit
          ? Buffer.from(
              JSON.stringify({ profileId: this.profileId, lastId: items.at(-1)?.id }),
            ).toString('base64url')
          : null,
    }
  }
  async correct(
    transactionId: string,
    categoryId: CategoryId,
    scope: 'once' | 'merchant',
    revision: number,
  ): Promise<Classification> {
    return this.db.transaction(async (tx) => {
      await tx
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const [row] = await tx
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.profileId, this.profileId),
            eq(schema.transactions.id, transactionId),
          ),
        )
        .for('update')
      if (!row) throw notFound()
      if (row.revision !== revision) throw conflict()
      if (scope === 'merchant' && !row.merchantKey)
        throw new Problem(
          422,
          'merchant_unavailable',
          'Questo movimento non ha un esercente riconoscibile. Scegli la categoria solo per questo movimento.',
        )
      await tx
        .insert(schema.feedback)
        .values({
          profileId: this.profileId,
          transactionId,
          categoryId,
          scope,
          createdAt: this.now(),
        })
        .onConflictDoUpdate({
          target: [schema.feedback.profileId, schema.feedback.transactionId],
          set: { categoryId, scope, createdAt: this.now() },
        })
      if (scope === 'merchant' && row.merchantKey)
        await tx
          .insert(schema.preferences)
          .values({ profileId: this.profileId, merchantKey: row.merchantKey, categoryId })
          .onConflictDoUpdate({
            target: [schema.preferences.profileId, schema.preferences.merchantKey],
            set: { categoryId },
          })
      await tx
        .update(schema.transactions)
        .set({ revision: row.revision + 1 })
        .where(
          and(
            eq(schema.transactions.profileId, this.profileId),
            eq(schema.transactions.id, transactionId),
          ),
        )
      const classification = (await this.data(tx)).analysis.classifications.find(
        (item) => item.transactionId === transactionId,
      )
      if (!classification) throw notFound()
      return classification
    })
  }
  async decide(
    matchId: string,
    state: 'confirmed' | 'rejected' | 'undone',
    expectedRevision: string,
  ): Promise<RevisionedAnalysis> {
    return this.db.transaction(async (tx) => {
      await this.profile(tx)
      await tx
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const { transactions, analysis } = await this.data(tx)
      const match = analysis.matches.find((item) => item.id === matchId)
      if (!match) throw notFound()
      if (match.revision !== expectedRevision)
        throw new Problem(
          409,
          'reconciliation_changed',
          'Il collegamento è cambiato. Aggiorna i dati, controlla i movimenti e riprova.',
        )
      const [decision] = await tx
        .select()
        .from(schema.matchDecisions)
        .where(
          and(
            eq(schema.matchDecisions.profileId, this.profileId),
            eq(schema.matchDecisions.matchId, matchId),
          ),
        )
        .for('update')
      if (decision?.revision === 2_147_483_647)
        throw conflict('La decisione non può essere aggiornata.')
      const nextRevision = (decision?.revision ?? 0) + 1
      if (state === 'confirmed') {
        const consumes = (type: string) =>
          [
            'duplicate',
            'pending_to_booked',
            'internal_transfer',
            'card_settlement',
            'cash_transfer',
          ].includes(type)
        if (
          consumes(match.type) &&
          analysis.matches.some(
            (other) =>
              other.id !== match.id &&
              other.state === 'confirmed' &&
              consumes(other.type) &&
              other.transactionIds.some((id) => match.transactionIds.includes(id)),
          )
        )
          throw conflict(
            'Un movimento è già collegato a un’altra riconciliazione. Annulla prima quel collegamento.',
          )
        if (match.type === 'refund') {
          const eligibleIds = new Set(
            effectiveTransactions(transactions, analysis.matches)
              .filter((transaction) => transaction.status === 'booked')
              .map((transaction) => transaction.id),
          )
          if (!match.transactionIds.every((transactionId) => eligibleIds.has(transactionId)))
            throw conflict(
              'Il rimborso si riferisce a un movimento escluso. Verifica il collegamento.',
            )
          const refunds = transactions.filter(
            (item) => item.kind === 'refund' && match.transactionIds.includes(item.id),
          )
          for (const refund of refunds) {
            const original = transactions.find((item) => item.id === refund.relatedTransactionId)
            if (
              original?.status !== 'booked' ||
              original.kind !== 'expense' ||
              original.profileId !== refund.profileId ||
              original.amount.amountMinor >= 0n ||
              refund.status !== 'booked' ||
              refund.amount.amountMinor <= 0n ||
              refund.amount.currency !== original.amount.currency ||
              refund.accountId !== original.accountId
            )
              throw conflict()
            const total = transactions
              .filter(
                (item) =>
                  item.profileId === original.profileId &&
                  item.kind === 'refund' &&
                  item.relatedTransactionId === original.id &&
                  item.status === 'booked' &&
                  item.accountId === original.accountId &&
                  item.amount.amountMinor > 0n &&
                  item.amount.currency === original.amount.currency,
              )
              .reduce((amount, item) => amount + item.amount.amountMinor, 0n)
            if (total > -original.amount.amountMinor)
              throw conflict(
                'I rimborsi superano l’acquisto originale. Verifica i movimenti prima di confermare.',
              )
          }
        }
      }
      // Validate the requested state against the engine before saving any decision or legs.
      const proposed = (await this.data(tx, { [matchId]: state })).analysis
      if (
        state === 'confirmed' &&
        proposed.matches.find((item) => item.id === matchId)?.state !== 'confirmed'
      )
        throw conflict('Questo collegamento non può essere confermato con i movimenti attuali.')
      await tx
        .insert(schema.matchDecisions)
        .values({
          profileId: this.profileId,
          matchId,
          state,
          decidedAt: this.now(),
          revision: nextRevision,
        })
        .onConflictDoUpdate({
          target: [schema.matchDecisions.profileId, schema.matchDecisions.matchId],
          set: { state, decidedAt: this.now(), revision: nextRevision },
        })
      await tx
        .delete(schema.matchDecisionLegs)
        .where(
          and(
            eq(schema.matchDecisionLegs.profileId, this.profileId),
            eq(schema.matchDecisionLegs.matchId, matchId),
          ),
        )
      await tx.insert(schema.matchDecisionLegs).values(
        match.transactionIds.map((transactionId) => ({
          profileId: this.profileId,
          matchId,
          transactionId,
        })),
      )
      return (await this.data(tx)).analysis
    })
  }
  async disconnect(connectionId: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const connection = await this.connection(connectionId, tx, true)
      if (connection.providerId !== this.provider.id)
        throw new Problem(
          409,
          'manual_source',
          'Questo conto non ha un collegamento bancario da revocare.',
        )
      const consents = await tx
        .select()
        .from(schema.consents)
        .where(
          and(
            eq(schema.consents.profileId, this.profileId),
            eq(schema.consents.connectionId, connectionId),
          ),
        )
        .orderBy(desc(schema.consents.grantedAt), desc(schema.consents.id))
      for (const consent of consents)
        await enqueueRevocation(
          tx,
          {
            profileId: this.profileId,
            connectionId,
            providerId: connection.providerId,
            consentId: consent.id,
          },
          this.now(),
        )
      await tx
        .update(schema.connections)
        .set({ status: 'revoked' })
        .where(
          and(
            eq(schema.connections.profileId, this.profileId),
            eq(schema.connections.id, connectionId),
          ),
        )
      await tx
        .update(schema.consents)
        .set({ revokedAt: this.now() })
        .where(
          and(
            eq(schema.consents.profileId, this.profileId),
            eq(schema.consents.connectionId, connectionId),
            isNull(schema.consents.revokedAt),
          ),
        )
    })
    // Provider I/O belongs to the bounded background pump; local denial returns promptly.
  }
  async revocations() {
    await this.profile()
    return { revocations: await revocationsForProfile(this.db, this.profileId) }
  }
  async export() {
    return this.db.transaction((tx) => this.exportSnapshot(tx), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    })
  }
  /** Explicit bounded local maintenance; no public production scheduler is implied. */
  async cleanupExpiredPayloads(limit = 100) {
    return cleanupExpiredObservationPayloads(this.db, this.profileId, this.now(), limit)
  }
  async exportSnapshot(db: Database) {
    const exportedAt = this.now()
    const overview = await this.overviewSnapshot(db)
    const consents = await db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.profileId, this.profileId))
    const observations = await sourceObservationsForExport(db, this.profileId, exportedAt)
    const feedback = await db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, this.profileId))
    const preferences = await db
      .select()
      .from(schema.preferences)
      .where(eq(schema.preferences.profileId, this.profileId))
    const matchDecisions = await db
      .select()
      .from(schema.matchDecisions)
      .where(eq(schema.matchDecisions.profileId, this.profileId))
    const syncRuns = await db
      .select()
      .from(schema.syncRuns)
      .where(eq(schema.syncRuns.profileId, this.profileId))
    const matchDecisionLegs = await db
      .select()
      .from(schema.matchDecisionLegs)
      .where(eq(schema.matchDecisionLegs.profileId, this.profileId))
    const rules = (
      await db
        .select()
        .from(schema.classificationRules)
        .where(eq(schema.classificationRules.profileId, this.profileId))
    ).map((rule) => ({
      ...rule,
      enabled: rule.enabled === 'yes',
      archived: rule.archived === 'yes',
    }))
    const ruleEvents = await db
      .select()
      .from(schema.ruleEvents)
      .where(eq(schema.ruleEvents.profileId, this.profileId))
    return {
      exportVersion: 1 as const,
      exportedAt,
      ...overview,
      consents,
      sourceObservations: observations,
      feedback,
      preferences,
      matchDecisions,
      matchDecisionLegs,
      syncRuns,
      rules,
      ruleEvents,
      manual: await new ManualService(db, this.profileId, this.now).exportAudit(db),
      profileSettings: await new SettingsService(db, this.profileId, this.now).exportAudit(db),
      revocationJobs: await revocationsForProfile(db, this.profileId),
    }
  }
  async erase(afterErase?: (db: Database) => Promise<void>) {
    await this.db.transaction(async (tx) => {
      await this.profile(tx)
      await tx
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      const consents = await tx
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.profileId, this.profileId))
        .orderBy(desc(schema.consents.grantedAt), desc(schema.consents.id))
      for (const consent of consents)
        await enqueueRevocation(
          tx,
          {
            profileId: this.profileId,
            connectionId: consent.connectionId,
            providerId: consent.provider,
            consentId: consent.id,
          },
          this.now(),
        )
      await tx
        .insert(schema.profileTombstones)
        .values({ profileId: this.profileId, erasedAt: this.now() })
        .onConflictDoNothing()
      await tx.delete(schema.profiles).where(eq(schema.profiles.id, this.profileId))
      await afterErase?.(tx)
    })
  }
}
