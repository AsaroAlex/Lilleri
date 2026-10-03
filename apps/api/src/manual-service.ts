import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  type CurrencyCode,
  calendarDateAt,
  dateOnly,
  parseDecimal,
  type Transaction,
} from '@lilleri/domain'
import {
  merchantKey,
  normalizeTransaction,
  parseBankCsv,
  stableId,
} from '@lilleri/financial-providers'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ProfileEncryption } from './encryption.js'
import { manualReasonContext } from './financial-storage.js'
import { manualAccounts, manualBalanceEvents, manualCommands } from './manual-schema.js'
import { notFound, Problem } from './problem.js'
import { insertSourceObservation } from './retention.js'

export const MANUAL_PROVIDER_ID = 'local-manual'
const identifier = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => !value.includes('\u0000'))
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !value.includes('\u0000'))
const requestId = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/)
const revision = z.number().int().min(1).max(2_147_483_646)
const minor = z.string().regex(/^(0|-?[1-9]\d{0,17})$/)
const date = z.string().refine((value) => {
  try {
    dateOnly(value)
    return true
  } catch {
    return false
  }
}, 'Expected a valid YYYY-MM-DD date')
const currency = z.custom<CurrencyCode>((value) => {
  try {
    return typeof value === 'string' && Boolean(parseDecimal('0', value as CurrencyCode))
  } catch {
    return false
  }
})
export const manualAccountInput = z
  .object({
    requestId,
    name: text(100),
    kind: z.enum(['cash', 'current', 'card', 'savings']),
    currency,
    openingBalanceMinor: minor,
    openingOn: date,
  })
  .strict()
export const manualEntryInput = z
  .object({
    requestId,
    accountId: identifier,
    amountMinor: minor,
    currency,
    bookedOn: date,
    kind: z.enum(['expense', 'income', 'transfer']),
    description: text(200),
    merchantName: text(150).optional(),
    reference: text(150).optional(),
  })
  .strict()
  .refine((value) => {
    if (!/^(0|-?[1-9]\d{0,17})$/.test(value.amountMinor)) return false
    const amount = BigInt(value.amountMinor)
    return value.kind === 'expense'
      ? amount < 0n
      : value.kind === 'income'
        ? amount > 0n
        : amount !== 0n
  }, 'An expense is negative, income positive, and a transfer nonzero')
export const manualAdjustmentInput = z
  .object({
    requestId,
    revision,
    balanceMinor: minor,
    currency,
    reason: text(200),
  })
  .strict()
export const manualReversalInput = z
  .object({
    requestId,
    revision,
    accountRevision: revision,
    reason: text(200),
  })
  .strict()
const accountDto = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['cash', 'current', 'card', 'savings']),
  currency,
  openingOn: date,
  openingBalanceMinor: minor,
  balanceMinor: z.string(),
  balanceUpdatedAt: z.string(),
  revision,
})
const entryDto = z.object({
  transactionId: z.string(),
  accountId: z.string(),
  accountRevision: revision,
  transactionRevision: revision,
  amountMinor: z.string(),
  currency,
  balanceMinor: z.string(),
  status: z.enum(['booked', 'reversed']),
})
const adjustmentDto = z.object({
  eventId: z.string(),
  accountId: z.string(),
  revision,
  beforeMinor: z.string(),
  balanceMinor: z.string(),
  currency,
})
const eventDto = z.object({
  id: z.string(),
  profileId: z.string(),
  accountId: z.string(),
  requestId: z.string(),
  operation: z.enum(['opening', 'entry', 'import', 'adjustment', 'reversal']),
  transactionId: z.string().nullable(),
  beforeMinor: z.string(),
  afterMinor: z.string(),
  accountRevision: revision,
  reason: z.string(),
  createdAt: z.string(),
})
export const manualAuditDto = z.object({
  accountStates: z.array(
    z.object({
      profileId: z.string(),
      accountId: z.string(),
      openingOn: date,
      openingBalanceMinor: z.string(),
      revision,
    }),
  ),
  balanceEvents: z.array(eventDto),
})
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
const digest = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
const changed = () =>
  new Problem(
    409,
    'manual_balance_changed',
    'Il saldo o il movimento è cambiato. Aggiorna i dati prima di scegliere di nuovo.',
  )
const invalid = () =>
  new Problem(
    422,
    'invalid_manual_entry',
    'Controlla importo, valuta, data e descrizione. La modifica non è stata salvata.',
  )
function bounded(value: bigint) {
  if (value < -9_223_372_036_854_775_808n || value > 9_223_372_036_854_775_807n)
    throw new Problem(
      422,
      'balance_limit',
      'Il saldo supera il limite rappresentabile. La modifica non è stata salvata.',
    )
  return value
}
function parse<T>(validator: z.ZodType<T>, input: unknown): T {
  const result = validator.safeParse(input)
  if (!result.success) throw invalid()
  return result.data
}
function transactionHash(transaction: Transaction) {
  const { revision: _revision, observedAt: _observedAt, ...content } = transaction
  return digest({
    ...content,
    amount: { ...content.amount, amountMinor: content.amount.amountMinor.toString() },
  })
}
const accountSnapshot = (
  account: typeof schema.accounts.$inferSelect,
  state: typeof manualAccounts.$inferSelect,
) => ({
  id: account.id,
  name: account.name,
  kind: account.kind,
  currency: account.currency,
  openingOn: state.openingOn,
  openingBalanceMinor: state.openingBalanceMinor.toString(),
  balanceMinor: account.balanceMinor.toString(),
  balanceUpdatedAt: account.balanceUpdatedAt,
  revision: state.revision,
})

/** Exact local cash/account commands. Idempotency, ledger and audit commit together under a profile lock. */
export class ManualService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
    readonly encryption?: ProfileEncryption,
  ) {}
  async lock(db: Database) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
      .for('update')
    if (!profile) throw notFound()
    return profile
  }
  async account(db: Database, id: string) {
    const [row] = await db
      .select({ account: schema.accounts, state: manualAccounts, connection: schema.connections })
      .from(manualAccounts)
      .innerJoin(
        schema.accounts,
        and(
          eq(schema.accounts.profileId, manualAccounts.profileId),
          eq(schema.accounts.id, manualAccounts.accountId),
        ),
      )
      .innerJoin(
        schema.connections,
        and(
          eq(schema.connections.profileId, schema.accounts.profileId),
          eq(schema.connections.id, schema.accounts.connectionId),
        ),
      )
      .where(and(eq(manualAccounts.profileId, this.profileId), eq(manualAccounts.accountId, id)))
    if (!row || row.connection.providerId !== MANUAL_PROVIDER_ID) throw notFound()
    if (row.connection.status !== 'active')
      throw new Problem(
        409,
        'manual_source_inactive',
        'Questo conto locale è in pausa. La modifica non è stata salvata.',
      )
    return row
  }
  async command<T extends Record<string, unknown>>(
    operation: typeof manualCommands.$inferInsert.operation,
    key: string,
    body: unknown,
    action: (db: Database, now: string, today: string) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const profile = await this.lock(tx)
      const requestHash = digest({ operation, body })
      const [previous] = await tx
        .select()
        .from(manualCommands)
        .where(and(eq(manualCommands.profileId, this.profileId), eq(manualCommands.requestId, key)))
      if (previous) {
        if (previous.requestHash !== requestHash || previous.operation !== operation)
          throw new Problem(
            409,
            'idempotency_key_reused',
            'Questa richiesta è già stata usata con dati diversi. Avvia una nuova modifica.',
          )
        return previous.response as T
      }
      const now = new Date(this.now()).toISOString()
      const result = await action(tx, now, calendarDateAt(new Date(now), profile.timezone))
      // Audit events reference this command through a deferred FK; both become visible at commit.
      await tx.insert(manualCommands).values({
        profileId: this.profileId,
        requestId: key,
        requestHash,
        operation,
        response: result,
        createdAt: now,
      })
      return result
    })
  }
  async event(
    db: Database,
    key: string,
    input: Omit<typeof manualBalanceEvents.$inferInsert, 'id' | 'profileId' | 'requestId'>,
  ) {
    // The command FK is deferred to commit by the migration; financial state and immutable audit stay atomic.
    const id = `manual_event_${randomUUID()}`
    await db.insert(manualBalanceEvents).values({
      ...input,
      id,
      profileId: this.profileId,
      requestId: key,
      reason: this.encryption
        ? await this.encryption.encryptText(
            db,
            manualReasonContext(this.profileId, id),
            input.reason,
          )
        : input.reason,
    })
    return id
  }
  async list() {
    return this.db.transaction(
      async (tx) => {
        const [profile] = await tx
          .select({ id: schema.profiles.id })
          .from(schema.profiles)
          .where(eq(schema.profiles.id, this.profileId))
        if (!profile) throw notFound()
        const rows = await tx
          .select({ account: schema.accounts, state: manualAccounts })
          .from(manualAccounts)
          .innerJoin(
            schema.accounts,
            and(
              eq(schema.accounts.profileId, manualAccounts.profileId),
              eq(schema.accounts.id, manualAccounts.accountId),
            ),
          )
          .where(eq(manualAccounts.profileId, this.profileId))
          .orderBy(asc(schema.accounts.id))
        return rows.map((row) => accountSnapshot(row.account, row.state))
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async create(input: z.infer<typeof manualAccountInput>) {
    const body = parse(manualAccountInput, input)
    return this.command('account', body.requestId, body, async (tx, now, today) => {
      if (body.openingOn > today) throw invalid()
      const count = await tx
        .select({ id: manualAccounts.accountId })
        .from(manualAccounts)
        .where(eq(manualAccounts.profileId, this.profileId))
        .limit(101)
      if (count.length >= 100)
        throw new Problem(
          422,
          'manual_account_limit',
          'Puoi aggiungere al massimo 100 conti locali in questo prototipo.',
        )
      const connectionId = stableId('manual_source', this.profileId)
      await tx
        .insert(schema.connections)
        .values({
          id: connectionId,
          profileId: this.profileId,
          providerId: MANUAL_PROVIDER_ID,
          institutionId: 'manual',
          status: 'active',
          createdAt: now,
          lastSyncedAt: null,
        })
        .onConflictDoNothing()
      const accountId = stableId(
        'account',
        this.profileId,
        connectionId,
        MANUAL_PROVIDER_ID,
        body.requestId,
      )
      const [account] = await tx
        .insert(schema.accounts)
        .values({
          id: accountId,
          profileId: this.profileId,
          connectionId,
          providerAccountId: body.requestId,
          name: body.name,
          institutionName: 'Aggiunto a mano · non collegato',
          kind: body.kind,
          balanceMinor: BigInt(body.openingBalanceMinor),
          currency: body.currency,
          balanceUpdatedAt: now,
        })
        .returning()
      const [state] = await tx
        .insert(manualAccounts)
        .values({
          profileId: this.profileId,
          accountId,
          openingBalanceMinor: BigInt(body.openingBalanceMinor),
          openingOn: body.openingOn,
          revision: 1,
        })
        .returning()
      if (!account || !state) throw new Error('Manual account insert failed')
      await this.event(tx, body.requestId, {
        accountId,
        operation: 'opening',
        transactionId: null,
        beforeMinor: 0n,
        afterMinor: account.balanceMinor,
        accountRevision: 1,
        reason: 'Saldo iniziale dichiarato',
        createdAt: now,
      })
      return accountSnapshot(account, state)
    })
  }
  async writeBalance(
    db: Database,
    accountId: string,
    oldRevision: number,
    balance: bigint,
    now: string,
  ) {
    bounded(balance)
    if (oldRevision >= 2_147_483_646) throw changed()
    const [state] = await db
      .update(manualAccounts)
      .set({ revision: oldRevision + 1 })
      .where(
        and(
          eq(manualAccounts.profileId, this.profileId),
          eq(manualAccounts.accountId, accountId),
          eq(manualAccounts.revision, oldRevision),
        ),
      )
      .returning()
    if (!state) throw changed()
    await db
      .update(schema.accounts)
      .set({ balanceMinor: balance, balanceUpdatedAt: now })
      .where(and(eq(schema.accounts.profileId, this.profileId), eq(schema.accounts.id, accountId)))
    return state.revision
  }
  async enter(input: z.infer<typeof manualEntryInput>) {
    const body = parse(manualEntryInput, input)
    return this.command('entry', body.requestId, body, async (tx, now, today) => {
      const { account, state } = await this.account(tx, body.accountId)
      if (
        account.currency !== body.currency ||
        body.bookedOn < state.openingOn ||
        body.bookedOn > today
      )
        throw invalid()
      const amountMinor = BigInt(body.amountMinor),
        balance = bounded(account.balanceMinor + amountMinor)
      const transaction: Transaction = {
        id: stableId(
          'transaction',
          this.profileId,
          account.connectionId,
          MANUAL_PROVIDER_ID,
          account.id,
          body.requestId,
        ),
        profileId: this.profileId,
        accountId: account.id,
        connectionId: account.connectionId,
        providerId: MANUAL_PROVIDER_ID,
        providerTransactionId: body.requestId,
        revision: 1,
        source: 'manual',
        status: 'booked',
        amount: { amountMinor, currency: body.currency },
        description: body.description,
        merchantName: body.merchantName ?? null,
        merchantKey: body.merchantName ? merchantKey(body.merchantName) : null,
        bookedOn: body.bookedOn,
        authorizedOn: null,
        observedAt: now,
        kind: body.kind,
        reference: body.reference ?? null,
        relatedAccountId: null,
        relatedTransactionId: null,
      }
      const { amount, ...fields } = transaction,
        contentHash = transactionHash(transaction)
      const row = {
        ...fields,
        amountMinor: amount.amountMinor,
        currency: amount.currency,
        contentHash,
      }
      await tx
        .insert(schema.transactions)
        .values(this.encryption ? await this.encryption.encryptTransactionRow(tx, row) : row)
      await insertSourceObservation(
        tx,
        {
          id: stableId('observation', this.profileId, transaction.id, contentHash),
          profileId: this.profileId,
          connectionId: account.connectionId,
          accountId: account.id,
          providerId: MANUAL_PROVIDER_ID,
          providerRecordId: body.requestId,
          status: 'booked',
          contentHash,
          observedAt: now,
        },
        { ...body },
        this.encryption,
      )
      const accountRevision = await this.writeBalance(tx, account.id, state.revision, balance, now)
      await this.event(tx, body.requestId, {
        accountId: account.id,
        operation: 'entry',
        transactionId: transaction.id,
        beforeMinor: account.balanceMinor,
        afterMinor: balance,
        accountRevision,
        reason: body.description,
        createdAt: now,
      })
      return {
        transactionId: transaction.id,
        accountId: account.id,
        accountRevision,
        transactionRevision: 1,
        amountMinor: body.amountMinor,
        currency: body.currency,
        balanceMinor: balance.toString(),
        status: 'booked' as const,
      }
    })
  }
  async adjust(id: string, input: z.infer<typeof manualAdjustmentInput>) {
    const body = parse(manualAdjustmentInput, input)
    return this.command(
      'adjustment',
      body.requestId,
      { accountId: id, ...body },
      async (tx, now) => {
        const { account, state } = await this.account(tx, id)
        if (state.revision !== body.revision) throw changed()
        if (account.currency !== body.currency) throw invalid()
        const balance = BigInt(body.balanceMinor),
          nextRevision = await this.writeBalance(tx, id, state.revision, balance, now)
        const eventId = await this.event(tx, body.requestId, {
          accountId: id,
          operation: 'adjustment',
          transactionId: null,
          beforeMinor: account.balanceMinor,
          afterMinor: balance,
          accountRevision: nextRevision,
          reason: body.reason,
          createdAt: now,
        })
        return {
          eventId,
          accountId: id,
          revision: nextRevision,
          beforeMinor: account.balanceMinor.toString(),
          balanceMinor: balance.toString(),
          currency: account.currency,
        }
      },
    )
  }
  async reverse(id: string, input: z.infer<typeof manualReversalInput>) {
    const body = parse(manualReversalInput, input)
    return this.command(
      'reversal',
      body.requestId,
      { transactionId: id, ...body },
      async (tx, now) => {
        const [row] = await tx
          .select()
          .from(schema.transactions)
          .where(
            and(eq(schema.transactions.profileId, this.profileId), eq(schema.transactions.id, id)),
          )
        if (!row || row.providerId !== MANUAL_PROVIDER_ID || row.source !== 'manual')
          throw notFound()
        const { account, state } = await this.account(tx, row.accountId)
        if (
          row.revision !== body.revision ||
          state.revision !== body.accountRevision ||
          row.status !== 'booked'
        )
          throw changed()
        const balance = bounded(account.balanceMinor - row.amountMinor),
          nextRevision = row.revision + 1
        if (nextRevision > 2_147_483_646) throw changed()
        const decrypted = this.encryption
          ? await this.encryption.decryptTransactionRow(tx, row)
          : row
        const {
          amountMinor,
          currency,
          contentHash: _hash,
          householdId: _householdId,
          scope: _scope,
          ...rest
        } = decrypted
        const transaction: Transaction = {
          ...rest,
          revision: nextRevision,
          status: 'reversed',
          observedAt: now,
          amount: { amountMinor, currency },
        }
        const contentHash = transactionHash(transaction)
        await tx
          .update(schema.transactions)
          .set({ revision: nextRevision, status: 'reversed', observedAt: now, contentHash })
          .where(
            and(eq(schema.transactions.profileId, this.profileId), eq(schema.transactions.id, id)),
          )
        await insertSourceObservation(
          tx,
          {
            id: stableId('observation', this.profileId, id, contentHash),
            profileId: this.profileId,
            connectionId: account.connectionId,
            accountId: account.id,
            providerId: MANUAL_PROVIDER_ID,
            providerRecordId: row.providerTransactionId,
            status: 'reversed',
            contentHash,
            observedAt: now,
          },
          { transactionId: id, requestId: body.requestId, reason: body.reason, status: 'reversed' },
          this.encryption,
        )
        const accountRevision = await this.writeBalance(
          tx,
          account.id,
          state.revision,
          balance,
          now,
        )
        await this.event(tx, body.requestId, {
          accountId: account.id,
          operation: 'reversal',
          transactionId: id,
          beforeMinor: account.balanceMinor,
          afterMinor: balance,
          accountRevision,
          reason: body.reason,
          createdAt: now,
        })
        return {
          transactionId: id,
          accountId: account.id,
          accountRevision,
          transactionRevision: nextRevision,
          amountMinor: amountMinor.toString(),
          currency,
          balanceMinor: balance.toString(),
          status: 'reversed' as const,
        }
      },
    )
  }
  /** Called only for a new CSV row, inside the importer's existing transaction/profile lock. */
  async recordImported(db: Database, transaction: Transaction, now: string) {
    const [manual] = await db
      .select({ id: manualAccounts.accountId })
      .from(manualAccounts)
      .where(
        and(
          eq(manualAccounts.profileId, this.profileId),
          eq(manualAccounts.accountId, transaction.accountId),
        ),
      )
    if (!manual) return
    const { account, state } = await this.account(db, transaction.accountId)
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
    if (!profile) throw notFound()
    if (
      transaction.source !== 'csv' ||
      transaction.status !== 'booked' ||
      transaction.amount.currency !== account.currency ||
      !transaction.bookedOn ||
      transaction.bookedOn < state.openingOn ||
      transaction.bookedOn > calendarDateAt(new Date(now), profile.timezone)
    )
      throw new Problem(
        422,
        'invalid_manual_import',
        'Le righe devono usare la valuta del conto e date dall’inizio del tracciamento a oggi. Nessuna riga è stata importata.',
      )
    const key = `csv_${digest(transaction.id)}`,
      requestHash = transactionHash(transaction)
    const [previous] = await db
      .select({ key: manualCommands.requestId })
      .from(manualCommands)
      .where(and(eq(manualCommands.profileId, this.profileId), eq(manualCommands.requestId, key)))
    if (previous)
      throw new Problem(
        409,
        'manual_import_changed',
        'Questa riga appartiene già a uno storico locale. Nessuna modifica è stata salvata.',
      )
    const balance = bounded(account.balanceMinor + transaction.amount.amountMinor)
    const accountRevision = await this.writeBalance(db, account.id, state.revision, balance, now)
    const response = {
      transactionId: transaction.id,
      accountId: account.id,
      accountRevision,
      balanceMinor: balance.toString(),
      currency: account.currency,
    }
    await db.insert(manualCommands).values({
      profileId: this.profileId,
      requestId: key,
      requestHash,
      operation: 'import',
      response,
      createdAt: now,
    })
    await this.event(db, key, {
      accountId: account.id,
      operation: 'import',
      transactionId: transaction.id,
      beforeMinor: account.balanceMinor,
      afterMinor: balance,
      accountRevision,
      reason: transaction.description.slice(0, 200),
      createdAt: now,
    })
  }
  async previewCsv(accountId: string, csv: string) {
    if (Buffer.byteLength(csv, 'utf8') > 262_144)
      throw new Problem(422, 'invalid_csv', 'Il file CSV supera il limite di 256 KiB.')
    return this.db.transaction(
      async (tx) => {
        const [profile] = await tx
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.id, this.profileId))
        const [account] = await tx
          .select()
          .from(schema.accounts)
          .where(
            and(eq(schema.accounts.profileId, this.profileId), eq(schema.accounts.id, accountId)),
          )
        if (!profile || !account) throw notFound()
        const now = new Date(this.now()).toISOString()
        let records: ReturnType<typeof parseBankCsv>
        try {
          records = parseBankCsv(csv, account.providerAccountId)
          if (!records.length || records.some((record) => record.currency !== account.currency))
            throw new Error('Wrong account currency')
        } catch {
          throw new Problem(
            422,
            'invalid_csv',
            'Il CSV non è valido. Controlla colonne, identità, date, importi e valuta del conto.',
          )
        }
        const [manual] = await tx
          .select()
          .from(manualAccounts)
          .where(
            and(
              eq(manualAccounts.profileId, this.profileId),
              eq(manualAccounts.accountId, accountId),
            ),
          )
        if (
          manual &&
          records.some(
            (record) =>
              !record.bookedOn ||
              record.bookedOn < manual.openingOn ||
              record.bookedOn > calendarDateAt(new Date(now), profile.timezone),
          )
        )
          throw new Problem(
            422,
            'invalid_manual_import',
            'Le date devono andare dall’inizio del tracciamento a oggi. Nessuna riga è stata importata.',
          )
        const rows = await tx
          .select()
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.profileId, this.profileId),
              eq(schema.transactions.accountId, accountId),
            ),
          )
        const existing = new Map(rows.map((row) => [row.id, row.contentHash]))
        let newRows = 0,
          unchangedRows = 0,
          amountTotalMinor = 0n,
          newAmountTotalMinor = 0n
        for (const record of records) {
          const transaction = {
            ...normalizeTransaction(
              'csv-import',
              { profileId: this.profileId, connectionId: account.connectionId },
              record,
              now,
            ),
            accountId,
          }
          if (
            transaction.amount.amountMinor < -9_223_372_036_854_775_808n ||
            transaction.amount.amountMinor > 9_223_372_036_854_775_807n
          )
            throw new Problem(
              422,
              'invalid_csv',
              'Un importo CSV supera il limite rappresentabile. Nessuna riga è stata importata.',
            )
          const previous = existing.get(transaction.id)
          if (previous && previous !== transactionHash(transaction))
            throw new Problem(
              409,
              'csv_identity_changed',
              'Una riga usa un’identità già salvata con dati diversi. Controlla l’identità prima di importare.',
            )
          if (previous) unchangedRows++
          else {
            newRows++
            newAmountTotalMinor += transaction.amount.amountMinor
          }
          amountTotalMinor += transaction.amount.amountMinor
        }
        return {
          accountId,
          rowCount: records.length,
          newRows,
          unchangedRows,
          amountTotalMinor: amountTotalMinor.toString(),
          newAmountTotalMinor: newAmountTotalMinor.toString(),
          currency: account.currency,
          manualBalanceWillChange: Boolean(manual),
        }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async exportAudit(db: Database = this.db) {
    const accountStates = await db
      .select()
      .from(manualAccounts)
      .where(eq(manualAccounts.profileId, this.profileId))
      .orderBy(asc(manualAccounts.accountId))
    const balanceEvents = await db
      .select()
      .from(manualBalanceEvents)
      .where(eq(manualBalanceEvents.profileId, this.profileId))
      .orderBy(asc(manualBalanceEvents.accountId), asc(manualBalanceEvents.accountRevision))
    const exportedEvents = []
    for (const row of balanceEvents) {
      exportedEvents.push({
        ...row,
        reason: this.encryption
          ? await this.encryption.decryptText(
              db,
              manualReasonContext(this.profileId, row.id),
              row.reason,
            )
          : row.reason,
        beforeMinor: row.beforeMinor.toString(),
        afterMinor: row.afterMinor.toString(),
      })
    }
    return {
      accountStates: accountStates.map((row) => ({
        ...row,
        openingBalanceMinor: row.openingBalanceMinor.toString(),
      })),
      balanceEvents: exportedEvents,
    }
  }
  async history(id: string) {
    return this.db.transaction(
      async (tx) => {
        await this.account(tx, id)
        const rows = await tx
          .select()
          .from(manualBalanceEvents)
          .where(
            and(
              eq(manualBalanceEvents.profileId, this.profileId),
              eq(manualBalanceEvents.accountId, id),
            ),
          )
          .orderBy(asc(manualBalanceEvents.accountRevision))
        const events = []
        for (const row of rows) {
          events.push({
            ...row,
            reason: this.encryption
              ? await this.encryption.decryptText(
                  tx,
                  manualReasonContext(this.profileId, row.id),
                  row.reason,
                )
              : row.reason,
            beforeMinor: row.beforeMinor.toString(),
            afterMinor: row.afterMinor.toString(),
          })
        }
        return events
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
}

/** Request-resolved service keeps demo and local session profiles isolated by the caller. */
export function registerManualRoutes(
  app: FastifyInstance,
  resolve: ManualService | ((request: FastifyRequest) => ManualService),
) {
  const api = app.withTypeProvider<ZodTypeProvider>(),
    params = z.object({ id: identifier }).strict()
  const service = (request: FastifyRequest) =>
    typeof resolve === 'function' ? resolve(request) : resolve
  api.post(
    '/v1/imports/csv/preview',
    {
      bodyLimit: 600_000,
      schema: {
        body: z.object({ accountId: identifier, csv: z.string().min(1).max(262_144) }).strict(),
        response: {
          200: z.object({
            accountId: z.string(),
            rowCount: z.number().int(),
            newRows: z.number().int(),
            unchangedRows: z.number().int(),
            amountTotalMinor: z.string(),
            newAmountTotalMinor: z.string(),
            currency,
            manualBalanceWillChange: z.boolean(),
          }),
        },
      },
    },
    (request) => service(request).previewCsv(request.body.accountId, request.body.csv),
  )
  api.get(
    '/v1/manual/accounts',
    { schema: { response: { 200: z.array(accountDto) } } },
    (request) => service(request).list(),
  )
  api.post(
    '/v1/manual/accounts',
    { schema: { body: manualAccountInput, response: { 201: accountDto } } },
    async (request, reply) => reply.code(201).send(await service(request).create(request.body)),
  )
  api.post(
    '/v1/manual/transactions',
    { schema: { body: manualEntryInput, response: { 201: entryDto } } },
    async (request, reply) => reply.code(201).send(await service(request).enter(request.body)),
  )
  api.post(
    '/v1/manual/accounts/:id/adjust',
    { schema: { params, body: manualAdjustmentInput, response: { 200: adjustmentDto } } },
    (request) => service(request).adjust(request.params.id, request.body),
  )
  api.post(
    '/v1/manual/transactions/:id/reverse',
    { schema: { params, body: manualReversalInput, response: { 200: entryDto } } },
    (request) => service(request).reverse(request.params.id, request.body),
  )
  api.get(
    '/v1/manual/accounts/:id/events',
    { schema: { params, response: { 200: z.array(eventDto) } } },
    (request) => service(request).history(request.params.id),
  )
}

/** Preserve atomic CSV ingestion: never call outside the canonical insert transaction. */
export function recordManualImport(
  db: Database,
  transaction: Transaction,
  importedAt: string,
  encryption?: ProfileEncryption,
) {
  return new ManualService(db, transaction.profileId, () => importedAt, encryption).recordImported(
    db,
    transaction,
    importedAt,
  )
}
