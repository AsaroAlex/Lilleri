import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import type { Transaction } from '@lilleri/domain'
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  lt,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { ProfileEncryption } from './encryption.js'
import { pendingLifecycleReadPredicate, pendingLifecycleSourceSql } from './pending-lifecycle.js'
import { pendingLifecycles, sourceRemovalDecisions } from './pending-lifecycle-schema.js'
import { transactionPrivacy } from './privacy-schema.js'
import { notFound, Problem } from './problem.js'
import { json } from './service.js'
import { syncPresence } from './sync-schema.js'
import {
  fixtureAccountReadPredicate,
  fixtureTransactionReadPredicate,
  syntheticFixtureRetirements,
} from './synthetic-fixtures.js'

/** Bounds apply to each response, including an empty intermediate search page. */
export const LEDGER_READ_LIMITS = Object.freeze({
  maxPageSize: 100,
  defaultPageSize: 50,
  maxScannedRows: 1000,
  chunkSize: 100,
  maxItemBytes: 128 * 1024,
  maxAccounts: 200,
  cursorTtlMs: 15 * 60 * 1000,
})
const tokenKey = randomBytes(32)
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const identifier = z.string().min(1).max(256)
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  })
const queryFields = {
  q: z.string().max(160).optional(),
  accountId: identifier.optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  status: z.enum(['pending', 'booked', 'reversed']).optional(),
  cursor: z.string().min(1).max(4096).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LEDGER_READ_LIMITS.maxPageSize)
    .default(LEDGER_READ_LIMITS.defaultPageSize),
}
export const ledgerSearchQuery = z
  .object({
    ...queryFields,
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to)
export const ledgerProjectionQuery = z.object(queryFields).strict()
type SearchInput = z.infer<typeof ledgerSearchQuery>
type ProjectionInput = z.infer<typeof ledgerProjectionQuery>
interface Filters {
  readonly q: string
  readonly accountId: string | null
  readonly currency: string | null
  readonly status: Transaction['status'] | null
  readonly from: string | null
  readonly to: string | null
  readonly purpose: 'search' | 'history90'
}
const cursorSchema = z
  .object({
    version: z.literal(1),
    profileId: identifier,
    filters: z.string().length(64),
    revision: z.string().length(64),
    day: z.union([calendarDate, z.literal('')]),
    id: identifier,
    issuedAt: z.iso.datetime(),
  })
  .strict()
type Cursor = z.infer<typeof cursorSchema>
const invalidCursor = () =>
  new Problem(400, 'invalid_cursor', 'La pagina non è più disponibile. Ripeti la ricerca.')
const changed = () =>
  new Problem(
    409,
    'ledger_changed',
    'I movimenti sono cambiati. Ripeti la ricerca per vedere i dati aggiornati.',
  )
const fold = (text: string) => text.normalize('NFKC').toLowerCase()
const datedDay = sql<string>`coalesce(${schema.transactions.bookedOn}, ${schema.transactions.authorizedOn})`
const financialDay = sql<string>`coalesce(${schema.transactions.bookedOn}, ${schema.transactions.authorizedOn}, DATE '0001-01-01')`

function decodeCursor(value: string, profileId: string, filters: Filters, at: string): Cursor {
  try {
    const [body, signature, extra] = value.split('.')
    if (
      !body ||
      !signature ||
      extra ||
      !/^[a-zA-Z0-9_-]+$/.test(body) ||
      !/^[a-f0-9]{64}$/.test(signature)
    )
      throw invalidCursor()
    const expected = createHmac('sha256', tokenKey).update(body).digest()
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw invalidCursor()
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')))
    const age = Date.parse(at) - Date.parse(cursor.issuedAt)
    if (
      cursor.profileId !== profileId ||
      cursor.filters !== digest(filters) ||
      age < 0 ||
      age > LEDGER_READ_LIMITS.cursorTtlMs
    )
      throw invalidCursor()
    return cursor
  } catch {
    throw invalidCursor()
  }
}
function encodeCursor(cursor: Cursor): string {
  const body = Buffer.from(JSON.stringify(cursor)).toString('base64url')
  return `${body}.${createHmac('sha256', tokenKey).update(body).digest('hex')}`
}
/** Financial SQL DATEs follow the profile calendar, including DST and UTC day crossings. */
function historyWindow(at: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(at))
  const part = (name: string) => parts.find((item) => item.type === name)?.value
  const to = `${part('year')}-${part('month')}-${part('day')}`
  const start = new Date(`${to}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - 89)
  return { from: start.toISOString().slice(0, 10), to, days: 90 as const }
}

export class LedgerReadService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
    readonly encryption?: ProfileEncryption,
  ) {}

  async search(input: SearchInput) {
    return this.db.transaction(
      async (db) => {
        await this.profile(db)
        return this.read(db, this.filters(input, 'search'), input)
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }

  async projection(input: ProjectionInput) {
    return this.db.transaction(
      async (db) => {
        const profile = await this.profile(db)
        const readAt = this.now()
        const window = historyWindow(readAt, profile.timezone)
        const filters = this.filters({ ...input, ...window }, 'history90')
        const page = await this.read(db, filters, input, readAt)
        const accountRows = await db
          .select()
          .from(schema.accounts)
          .where(
            and(
              eq(schema.accounts.profileId, this.profileId),
              fixtureAccountReadPredicate(this.profileId),
              input.accountId ? eq(schema.accounts.id, input.accountId) : undefined,
            ),
          )
          .orderBy(asc(schema.accounts.id))
          .limit(LEDGER_READ_LIMITS.maxAccounts + 1)
        if (accountRows.length > LEDGER_READ_LIMITS.maxAccounts)
          throw new Problem(
            413,
            'ledger_projection_too_large',
            'Seleziona un conto per vedere lo storico disponibile.',
          )
        const accounts = accountRows.map(
          ({ householdId: _householdId, balanceMinor, currency, ...account }) => ({
            ...account,
            balance: { amountMinor: balanceMinor, currency },
          }),
        )
        return {
          ...page,
          kind: 'owned_ledger_history' as const,
          window,
          profile: { id: profile.id, timezone: profile.timezone },
          accounts,
          policy: {
            dateBasis: 'bookedOn_then_authorizedOn' as const,
            undated: 'excluded' as const,
            balances: 'current_observed_per_account' as const,
            forecast: false as const,
            aggregates: false as const,
            privacy: 'owned_records_including_quiet_private' as const,
          },
        }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }

  private async profile(db: Database) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
    if (!profile) throw notFound()
    return profile
  }
  private filters(input: SearchInput, purpose: Filters['purpose']): Filters {
    return {
      q: fold(input.q?.trim() ?? ''),
      accountId: input.accountId ?? null,
      currency: input.currency ?? null,
      status: input.status ?? null,
      from: input.from ?? null,
      to: input.to ?? null,
      purpose,
    }
  }
  private where(filters: Filters): SQL {
    return and(
      eq(schema.transactions.profileId, this.profileId),
      filters.accountId ? eq(schema.transactions.accountId, filters.accountId) : undefined,
      filters.currency
        ? eq(
            schema.transactions.currency,
            filters.currency as typeof schema.transactions.currency._.data,
          )
        : undefined,
      filters.status ? eq(schema.transactions.status, filters.status) : undefined,
      filters.from ? sql`${datedDay} >= ${filters.from}` : undefined,
      filters.to ? sql`${datedDay} <= ${filters.to}` : undefined,
      // Evaluate source decisions and complete replacement evidence independently of
      // the requested date window. Explicit undo must override old presence proof.
      pendingLifecycleReadPredicate(this.profileId),
      fixtureTransactionReadPredicate(this.profileId),
    ) as SQL
  }
  private after(cursor: Pick<Cursor, 'day' | 'id'> | null): SQL | undefined {
    return cursor
      ? or(
          lt(financialDay, cursor.day || '0001-01-01'),
          and(eq(financialDay, cursor.day || '0001-01-01'), gt(schema.transactions.id, cursor.id)),
        )
      : undefined
  }
  private async revision(db: Database) {
    // SQL aggregates return bounded metadata, never decrypted financial text. The
    // profile-wide token fences late bookings, deleted sources, privacy and balances.
    const hashes: string[] = []
    for (const [table, profile, key] of [
      [schema.transactions, schema.transactions.profileId, schema.transactions.id],
      [syncPresence, syncPresence.profileId, syncPresence.transactionId],
      [pendingLifecycles, pendingLifecycles.profileId, pendingLifecycles.transactionId],
      [
        sourceRemovalDecisions,
        sourceRemovalDecisions.profileId,
        sourceRemovalDecisions.transactionId,
      ],
      [transactionPrivacy, transactionPrivacy.profileId, transactionPrivacy.transactionId],
      [schema.accounts, schema.accounts.profileId, schema.accounts.id],
      [schema.profiles, schema.profiles.id, schema.profiles.id],
      [
        syntheticFixtureRetirements,
        syntheticFixtureRetirements.profileId,
        syntheticFixtureRetirements.profileId,
      ],
    ] as const) {
      const [row] = await db
        .select({
          hash: sql<string>`md5(coalesce(string_agg(md5(to_jsonb(${table})::text), '' ORDER BY ${key}), ''))`,
        })
        .from(table)
        .where(eq(profile, this.profileId))
      hashes.push(row?.hash ?? '')
    }
    return digest(hashes)
  }
  private async read(db: Database, filters: Filters, input: SearchInput, at = this.now()) {
    if (filters.accountId) {
      const [account] = await db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.profileId, this.profileId),
            eq(schema.accounts.id, filters.accountId),
          ),
        )
      if (!account) throw notFound()
    }
    const cursor = input.cursor ? decodeCursor(input.cursor, this.profileId, filters, at) : null
    const revision = await this.revision(db)
    if (cursor && cursor.revision !== revision) throw changed()
    const items: Transaction[] = []
    let scanned = 0,
      bytes = 2,
      last = cursor && { day: cursor.day, id: cursor.id }
    let byteLimited = false
    while (
      items.length < input.limit &&
      scanned < LEDGER_READ_LIMITS.maxScannedRows &&
      !byteLimited
    ) {
      const rows = await db
        .select({
          ...getTableColumns(schema.transactions),
          source: pendingLifecycleSourceSql(this.profileId),
        })
        .from(schema.transactions)
        .where(and(this.where(filters), this.after(last)))
        .orderBy(desc(financialDay), asc(schema.transactions.id))
        .limit(Math.min(LEDGER_READ_LIMITS.chunkSize, LEDGER_READ_LIMITS.maxScannedRows - scanned))
      if (!rows.length) break
      for (const stored of rows) {
        const row = this.encryption
          ? await this.encryption.decryptTransactionRow(db, stored)
          : stored
        const {
          amountMinor,
          currency,
          contentHash: _hash,
          householdId: _household,
          scope: _scope,
          ...fields
        } = row
        const transaction: Transaction = { ...fields, amount: { amountMinor, currency } }
        const matches =
          !filters.q ||
          [
            transaction.description,
            transaction.merchantName ?? '',
            transaction.reference ?? '',
          ].some((value) => fold(value).includes(filters.q))
        if (matches) {
          const itemBytes = Buffer.byteLength(JSON.stringify(json(transaction))) + 1
          if (bytes + itemBytes > LEDGER_READ_LIMITS.maxItemBytes) {
            if (!items.length)
              throw new Problem(
                413,
                'ledger_record_too_large',
                'Questo movimento non può essere mostrato nella ricerca. Usa l’esportazione dei tuoi dati.',
              )
            byteLimited = true
            break
          }
          items.push(transaction)
          bytes += itemBytes
        }
        scanned++
        last = { day: row.bookedOn ?? row.authorizedOn ?? '', id: row.id }
        if (items.length === input.limit || scanned === LEDGER_READ_LIMITS.maxScannedRows) break
      }
    }
    const [more] = last
      ? await db
          .select({ id: schema.transactions.id })
          .from(schema.transactions)
          .where(and(this.where(filters), this.after(last)))
          .limit(1)
      : []
    const privacy = items.length
      ? await db
          .select({
            transactionId: transactionPrivacy.transactionId,
            quiet: transactionPrivacy.quiet,
            private: transactionPrivacy.private,
            revision: transactionPrivacy.revision,
          })
          .from(transactionPrivacy)
          .where(
            and(
              eq(transactionPrivacy.profileId, this.profileId),
              inArray(
                transactionPrivacy.transactionId,
                items.map((item) => item.id),
              ),
            ),
          )
      : []
    return {
      items,
      privacy,
      revision,
      readAt: at,
      nextCursor:
        more && last
          ? encodeCursor({
              version: 1,
              profileId: this.profileId,
              filters: digest(filters),
              revision,
              ...last,
              issuedAt: cursor?.issuedAt ?? at,
            })
          : null,
      hasMore: Boolean(more),
      // Never report 'no results' while the bounded scan can still continue.
      searchComplete: !more,
    }
  }
}

export function registerLedgerReadRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => LedgerReadService,
  schemas: { readonly transaction: z.ZodType; readonly account: z.ZodType },
) {
  const page = z.object({
    items: z.array(schemas.transaction).max(LEDGER_READ_LIMITS.maxPageSize),
    privacy: z.array(
      z.object({
        transactionId: identifier,
        quiet: z.boolean(),
        private: z.boolean(),
        revision: z.number().int().positive(),
      }),
    ),
    revision: z.string().length(64),
    readAt: z.iso.datetime(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    searchComplete: z.boolean(),
  })
  const routes = app.withTypeProvider<ZodTypeProvider>()
  routes.get(
    '/v1/ledger/search',
    {
      schema: {
        summary: 'Owned active ledger history, encrypted text search and scoped keyset pages',
        querystring: ledgerSearchQuery,
        response: { 200: page },
      },
    },
    async (request) => json(await resolve(request).search(request.query)),
  )
  routes.get(
    '/v1/ledger/projection',
    {
      schema: {
        summary: 'Authoritative paginated history for the last 90 profile-calendar days',
        querystring: ledgerProjectionQuery,
        response: {
          200: page.extend({
            kind: z.literal('owned_ledger_history'),
            window: z.object({ from: calendarDate, to: calendarDate, days: z.literal(90) }),
            profile: z.object({ id: identifier, timezone: z.string() }),
            accounts: z.array(schemas.account).max(LEDGER_READ_LIMITS.maxAccounts),
            policy: z.object({
              dateBasis: z.literal('bookedOn_then_authorizedOn'),
              undated: z.literal('excluded'),
              balances: z.literal('current_observed_per_account'),
              forecast: z.literal(false),
              aggregates: z.literal(false),
              privacy: z.literal('owned_records_including_quiet_private'),
            }),
          }),
        },
      },
    },
    async (request) => json(await resolve(request).projection(request.query)),
  )
}
