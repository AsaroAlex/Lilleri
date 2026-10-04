import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  type Account,
  type Analysis,
  type CategoryId,
  type Classification,
  type Connection,
  type CurrencyCode,
  canonicalCategoryId,
  parseDecimal,
  type Transaction,
} from '@lilleri/domain'
import {
  analyse,
  DEFAULT_RECURRING_POLICY,
  effectiveTransactions,
  type RecurringPolicy,
} from '@lilleri/engines'
import {
  discoverInstitutions,
  type FinancialDataProvider,
  hasExpandedProviderContract,
  institutionPickerDecision,
  normalizeAccount,
  normalizeTransaction,
  type ProviderAccount,
  type ProviderTransaction,
  parseBankCsv,
  stableId,
  validateProviderConnectionGrant,
} from '@lilleri/financial-providers'
import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { cancelConnectionCreationIntents } from './connection-creation.js'
import {
  assertLifecycleAllowsRefresh,
  type ConsentLifecycleOptions,
  ConsentLifecycleService,
  recordConsentGranted,
  recordConsentRevoked,
} from './consent-lifecycle.js'
import type { ProfileEncryption } from './encryption.js'
import { withoutHousehold } from './financial-storage.js'
import { ManualService, recordManualImport } from './manual-service.js'
import { MerchantTaxonomyService } from './merchant-taxonomy.js'
import { augmentOwnershipExport } from './ownership-export.js'
import { PrivacyService } from './privacy.js'
import { conflict, notFound, Problem, providerFailure } from './problem.js'
import { RecurringService } from './recurring.js'
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
import { DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION } from './runtime-config.js'
import { SettingsService } from './settings.js'
import type { SourceFacts } from './source-erasure.js'
import { activeSyncTransactions, syncReviewItems } from './sync-ledger.js'

export type SourceFactsRecorder = (db: Database, facts: SourceFacts, at: string) => Promise<void>

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
  const { balanceMinor, currency: code, householdId: _householdId, ...rest } = row
  return { ...rest, balance: { amountMinor: balanceMinor, currency: code } }
}
async function transactionFromRow(
  db: Database,
  stored: typeof schema.transactions.$inferSelect,
  encryption?: ProfileEncryption,
): Promise<Transaction> {
  const row = encryption ? await encryption.decryptTransactionRow(db, stored) : stored
  const {
    amountMinor,
    currency: code,
    contentHash: _contentHash,
    householdId: _householdId,
    scope: _scope,
    ...rest
  } = row
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
    readonly encryption?: ProfileEncryption,
    readonly connectionLifecycleConfiguration: ConsentLifecycleOptions = DEFAULT_CONNECTION_LIFECYCLE_CONFIGURATION,
    readonly recurringPolicy: RecurringPolicy = DEFAULT_RECURRING_POLICY,
    readonly recordSourceFacts?: SourceFactsRecorder,
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
    return withoutHousehold(connection)
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
    return assertLifecycleAllowsRefresh(db, this.profileId, connection.id, this.now())
  }
  async institutions() {
    const provider = this.provider
    if (!hasExpandedProviderContract(provider))
      return {
        mode: 'synthetic' as const,
        providerId: provider.id,
        environment: 'synthetic' as const,
        institutions: [],
      }
    try {
      return {
        mode: 'synthetic' as const,
        providerId: provider.id,
        environment: provider.discoveryMetadata().environment,
        institutions: await discoverInstitutions(provider),
      }
    } catch {
      throw providerFailure()
    }
  }
  async connect(
    institutionId = 'synthetic-italian',
    accountKind: Account['kind'] = 'current',
    deferSync = false,
  ): Promise<Connection> {
    if (hasExpandedProviderContract(this.provider)) {
      const catalogue = await this.institutions()
      const institution = catalogue.institutions.find((row) => row.id === institutionId)
      if (
        !institution ||
        !institutionPickerDecision(institution, accountKind, 'synthetic').connectable
      )
        throw new Problem(
          422,
          'institution_unavailable',
          'Questa fonte non è verificata per il tipo di conto richiesto. Puoi aggiungerlo a mano o importare un CSV.',
        )
    } else if (institutionId !== 'synthetic-italian')
      throw new Problem(
        422,
        'institution_unavailable',
        'Questa fonte non è disponibile nell’ambiente dimostrativo.',
      )
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
            eq(schema.connections.institutionId, institutionId),
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
          institutionId,
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
        institutionId,
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
      if (hasExpandedProviderContract(this.provider)) {
        const discovery = this.provider.discoveryMetadata()
        const validated = validateProviderConnectionGrant(grant, discovery)
        await recordConsentGranted(
          tx,
          this.profileId,
          connectionId,
          consentId,
          { discovery, authorization: validated.authorization },
          createdAt,
        )
      }
      return { connection: value, needsSync: true }
    })
    if (result.needsSync && !deferSync) await this.sync(result.connection.id)
    return await this.connection(result.connection.id)
  }
  async collect(connectionId: string, grantId: string | null = null) {
    const context = { profileId: this.profileId, connectionId, ...(grantId ? { grantId } : {}) },
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
  async sync(connectionId: string, coordinator?: import('./sync-jobs.js').SyncCoordinator) {
    if (coordinator) return coordinator.sync(connectionId)
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
        const lifecycle = await this.assertConsent(connection, tx)
        // Hold the profile/connection lock during collection: an older request cannot overwrite a newer response.
        const batch = await this.collect(connectionId, lifecycle.consentId)
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
            this.encryption,
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
            const row = transactionRow(transaction)
            await tx
              .insert(schema.transactions)
              .values(this.encryption ? await this.encryption.encryptTransactionRow(tx, row) : row)
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
            .set(
              this.encryption
                ? await this.encryption.encryptTransactionRow(
                    tx,
                    transactionRow({ ...transaction, revision: existing.revision + 1 }),
                  )
                : transactionRow({ ...transaction, revision: existing.revision + 1 }),
            )
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
        await this.recordSourceFacts?.(
          tx,
          {
            profileId: this.profileId,
            connectionId,
            consentId: lifecycle.consentId,
            accountIds: batch.normalizedAccounts.map((account) => account.id),
            transactions: batch.canonical.map((transaction) => ({
              id: transaction.id,
              accountId: transaction.accountId,
            })),
            observations: batch.observations.map(({ record, transaction }) => ({
              id: stableId(
                'observation',
                this.profileId,
                connectionId,
                transaction.accountId,
                this.provider.id,
                record.id,
                record.status,
                hash(record),
              ),
              accountId: transaction.accountId,
            })),
          },
          batch.observedAt,
        )
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
      let records: readonly ProviderTransaction[]
      try {
        records = parseBankCsv(csv, account.providerAccountId)
      } catch {
        throw new Problem(
          422,
          'invalid_csv',
          'Il CSV non è valido. Controlla le colonne, gli importi, le date e la valuta del conto.',
        )
      }
      return new DemoService(
        tx,
        this.profileId,
        this.provider,
        this.now,
        this.encryption,
        this.connectionLifecycleConfiguration,
        this.recurringPolicy,
        this.recordSourceFacts,
      ).importRecords(accountId, records)
    })
  }
  /** Trusted parsers provide exact records directly; original mapped cells stay in the source payload. */
  async importRecords(
    accountId: string,
    records: readonly ProviderTransaction[],
    options: {
      readonly sourcePayloads?: readonly Record<string, unknown>[]
      /** Explicit, validated CSV links; preserves bank identity, revisions and corrections. */
      readonly duplicateTransactionIds?: readonly (string | null)[]
      readonly afterObservation?: (
        db: Database,
        row: {
          readonly index: number
          readonly transaction: Transaction
          readonly observationId: string
        },
      ) => Promise<void>
    } = {},
  ) {
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
      let transactions: Transaction[]
      try {
        if (
          !records.length ||
          records.length > 1000 ||
          records.some(
            (record) =>
              record.currency !== account.currency ||
              !record.id ||
              record.id.length > 200 ||
              record.id.includes('\u0000'),
          ) ||
          new Set(records.map((record) => record.id)).size !== records.length ||
          (options.sourcePayloads && options.sourcePayloads.length !== records.length) ||
          (options.duplicateTransactionIds &&
            options.duplicateTransactionIds.length !== records.length)
        )
          throw new Error('Empty CSV or wrong currency')
        transactions = records.map((record, index) => ({
          ...normalizeTransaction(
            'csv-import',
            context,
            { ...record, source: 'csv', accountId: account.providerAccountId },
            importedAt,
          ),
          accountId,
          ...(options.duplicateTransactionIds?.[index]
            ? { relatedTransactionId: options.duplicateTransactionIds[index] ?? null }
            : {}),
        }))
      } catch {
        throw new Problem(
          422,
          'invalid_csv',
          'Il CSV non è valido. Controlla le colonne, gli importi, le date e la valuta del conto.',
        )
      }
      const report = { inserted: 0, updated: 0, unchanged: 0, rejected: 0, importedAt }
      const recordedObservations: { id: string; accountId: string }[] = []
      for (const [index, transaction] of transactions.entries()) {
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
        const linkedId = options.duplicateTransactionIds?.[index]
        if (linkedId && !existing) {
          const [linked] = await tx
            .select()
            .from(schema.transactions)
            .where(
              and(
                eq(schema.transactions.profileId, this.profileId),
                eq(schema.transactions.accountId, accountId),
                eq(schema.transactions.id, linkedId),
              ),
            )
          if (
            linked?.source !== 'bank' ||
            linked.status !== 'booked' ||
            transaction.status !== 'booked' ||
            linked.amountMinor !== transaction.amount.amountMinor ||
            linked.currency !== transaction.amount.currency ||
            !linked.bookedOn ||
            !transaction.bookedOn ||
            Math.abs(Date.parse(linked.bookedOn) - Date.parse(transaction.bookedOn)) >
              7 * 86_400_000
          )
            throw conflict(
              'Il movimento collegato non corrisponde più alla riga importata. Mostra una nuova anteprima.',
            )
        }
        if (existing && existing.contentHash !== transactionHash(transaction))
          throw conflict(
            'Una riga CSV usa un’identità già salvata con dati diversi. Correggi l’identità e riprova.',
          )
        if (existing) report.unchanged++
        else {
          const row = transactionRow(transaction)
          await tx
            .insert(schema.transactions)
            .values(this.encryption ? await this.encryption.encryptTransactionRow(tx, row) : row)
          await recordManualImport(
            tx,
            transaction,
            importedAt,
            this.encryption,
            this.recordSourceFacts,
          )
          report.inserted++
        }
      }
      for (const [index, record] of records.entries()) {
        const transaction = transactions[index]
        if (!transaction) throw conflict()
        const sourcePayload =
          options.sourcePayloads?.[index] ?? (record as unknown as Record<string, unknown>)
        const contentHash = hash(sourcePayload)
        const observationId = stableId(
          'observation',
          this.profileId,
          account.connectionId,
          accountId,
          'csv-import',
          record.id,
          record.status,
          contentHash,
        )
        await insertSourceObservation(
          tx,
          {
            id: observationId,
            profileId: this.profileId,
            connectionId: account.connectionId,
            accountId,
            providerId: 'csv-import',
            providerRecordId: record.id,
            status: record.status,
            contentHash,
            observedAt: importedAt,
          },
          sourcePayload,
          this.encryption,
        )
        await options.afterObservation?.(tx, { index, transaction, observationId })
        recordedObservations.push({ id: observationId, accountId })
      }
      const [consent] = await tx
        .select()
        .from(schema.consents)
        .where(
          and(
            eq(schema.consents.profileId, this.profileId),
            eq(schema.consents.connectionId, account.connectionId),
            isNull(schema.consents.revokedAt),
          ),
        )
        .orderBy(desc(schema.consents.grantedAt), desc(schema.consents.id))
        .limit(1)
      await this.recordSourceFacts?.(
        tx,
        {
          profileId: this.profileId,
          connectionId: account.connectionId,
          consentId: consent?.id ?? null,
          accountIds: [accountId],
          transactions: transactions.map((transaction) => ({ id: transaction.id, accountId })),
          observations: recordedObservations,
        },
        importedAt,
      )
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
    ).map(({ householdId: _householdId, scope: _scope, ...rule }) => ({
      ...rule,
      enabled: rule.enabled === 'yes' && rule.archived === 'no',
    }))
    const decisions = await db
      .select()
      .from(schema.matchDecisions)
      .where(eq(schema.matchDecisions.profileId, this.profileId))
    const accounts = accountRows.map(accountFromRow)
    const ledgerTransactions: Transaction[] = []
    // A scoped PostgreSQL transaction has one client; decrypt sequentially on that client.
    for (const row of transactionRows)
      ledgerTransactions.push(await transactionFromRow(db, row, this.encryption))
    const transactions = await activeSyncTransactions(db, this.profileId, ledgerTransactions)
    const privacy = new PrivacyService(db, this.profileId, this.now)
    const context = await privacy.analysisContext(db)
    const analysisOptions = {
      rules,
      preferences,
      userClassifications: Object.fromEntries(
        feedback.map((item) => [item.transactionId, item.categoryId]),
      ),
      matchOverrides: {
        ...Object.fromEntries(decisions.map((item) => [item.matchId, item.state])),
        ...additionalMatchOverrides,
      },
      globalDictionaryEnabled: context.globalDictionaryEnabled,
    }
    const preliminary = analyse(accounts, transactions, analysisOptions)
    const excluded = await privacy.analysisContext(db, preliminary.classifications)
    const merchantContext = await new MerchantTaxonomyService(
      db,
      this.profileId,
      this.now,
      this.encryption,
    ).analysisContext(db, transactions, preliminary.classifications)
    const derived = analyse(accounts, transactions, {
      ...analysisOptions,
      excludedFromInsights: [
        ...new Set([...excluded.excludedTransactionIds, ...merchantContext.excludedTransactionIds]),
      ],
      userClassifications: {
        ...analysisOptions.userClassifications,
        ...Object.fromEntries(
          merchantContext.assignments.map((item) => [
            item.transactionId,
            canonicalCategoryId(item.canonicalCode),
          ]),
        ),
      },
      merchantResolutions: Object.fromEntries(
        merchantContext.resolutions.map((item) => [item.transactionId, item]),
      ),
    })
    const decisionRevisions = new Map(decisions.map((item) => [item.matchId, item.revision]))
    const transactionVersions = new Map(transactions.map((item) => [item.id, item]))
    const accountContexts = new Map(accounts.map((item) => [item.id, item]))
    const analysis: RevisionedAnalysis = {
      ...derived,
      reviewItems: [
        ...derived.reviewItems,
        ...(await syncReviewItems(db, this.profileId, {
          transactions: ledgerTransactions,
          classifications: derived.classifications,
          excludedTransactionIds: [
            ...excluded.excludedTransactionIds,
            ...merchantContext.excludedTransactionIds,
          ],
        })),
      ],
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
    return { accounts, transactions, ledgerTransactions, analysis, merchantContext }
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
      connections: connections.map(withoutHousehold),
      connectionLifecycles: await new ConsentLifecycleService(
        db,
        this.profileId,
        this.provider,
        this.now,
        this.connectionLifecycleConfiguration,
      ).list(db),
      accounts: data.accounts,
      transactions: data.transactions,
      analysis: data.analysis,
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
    const items: Transaction[] = []
    for (const row of rows.slice(0, limit))
      items.push(await transactionFromRow(this.db, row, this.encryption))
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
      await cancelConnectionCreationIntents(tx, this.profileId, this.now(), connectionId)
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
      await recordConsentRevoked(tx, this.profileId, connectionId, this.now())
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
    const { connectionLifecycles: _computedLifecycles, ...overview } =
      await this.overviewSnapshot(db)
    const consents = await db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.profileId, this.profileId))
    const observations = await sourceObservationsForExport(
      db,
      this.profileId,
      exportedAt,
      this.encryption,
    )
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
    ).map(({ householdId: _householdId, scope: _scope, ...rule }) => ({
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
      profile: {
        ...overview.profile,
        createdAt: new Date((await this.profile(db)).createdAt).toISOString(),
      },
      transactions: (await this.data(db)).ledgerTransactions,
      ...(await augmentOwnershipExport(db, this.profileId, this.encryption, this.now)),
      ...(await new RecurringService(this, this.recurringPolicy).ownedExport(db)),
      consents: consents.map(withoutHousehold),
      sourceObservations: observations,
      feedback: feedback.map(withoutHousehold),
      preferences: preferences.map(withoutHousehold),
      matchDecisions: matchDecisions.map(withoutHousehold),
      matchDecisionLegs: matchDecisionLegs.map(withoutHousehold),
      syncRuns: syncRuns.map(withoutHousehold),
      rules,
      ruleEvents: ruleEvents.map(withoutHousehold),
      manual: await new ManualService(db, this.profileId, this.now, this.encryption).exportAudit(
        db,
      ),
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
      await cancelConnectionCreationIntents(tx, this.profileId, this.now())
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
      await this.encryption?.stageErasure(tx, this.profileId)
      await tx
        .insert(schema.profileTombstones)
        .values({ profileId: this.profileId, erasedAt: this.now() })
        .onConflictDoNothing()
      await tx.delete(schema.profiles).where(eq(schema.profiles.id, this.profileId))
      await afterErase?.(tx)
    })
  }
}
