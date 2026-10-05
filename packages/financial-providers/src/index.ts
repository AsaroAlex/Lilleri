import { createHash } from 'node:crypto'
import { type Account, dateOnly, type Transaction, type TransactionKind } from '@lilleri/domain'
import { type CurrencyCode, parseDecimal } from '@lilleri/money'
import type {
  FinancialDataProviderV2,
  InstitutionPage,
  ProviderAuthorization,
  ProviderConnectionGrant,
  ProviderDiscoveryMetadata,
  SyntheticSyncMetadata,
  SyntheticSyncPage,
  SyntheticSyncPageRequest,
  SyntheticSyncSnapshot,
} from './contracts.js'
import type { ProviderFxEvidence } from './fx-evidence.js'

export * from './connection-directory.js'
export * from './contracts.js'
export { parseBankCsv } from './csv.js'
export * from './csv-mapper.js'
export * from './fx-evidence.js'
export * from './yapily-sandbox.js'
export * from './yapily-sandbox-authorisation.js'

export interface ProviderContext {
  readonly profileId: string
  readonly connectionId: string
  /** Selected institution identity from the provider's validated catalogue. */
  readonly institutionId?: string
  /** Consent generation. Required for durable revocation; never revoke a newer grant. */
  readonly grantId?: string
}
export interface ProviderAccount {
  readonly id: string
  readonly name: string
  readonly institutionName: string
  readonly kind: Account['kind']
  readonly currency: CurrencyCode
  readonly balance: string
}
export interface ProviderTransaction {
  readonly id: string
  readonly accountId: string
  readonly amount: string
  readonly currency: CurrencyCode
  readonly description: string
  readonly status: Transaction['status']
  readonly merchantName?: string
  readonly bookedOn?: string
  readonly authorizedOn?: string
  readonly kind?: TransactionKind
  readonly reference?: string
  readonly relatedTransactionId?: string
  readonly relatedAccountId?: string
  readonly source?: Transaction['source']
  /** Explicit adapter evidence; absence from a snapshot never expires or cancels a hold. */
  readonly pendingLifecycle?: {
    readonly state: 'expired' | 'cancelled' | 'reversed'
    readonly evidenceReference: string
    readonly effectiveAt: string
  }
  readonly fxEvidence?: ProviderFxEvidence
}
export interface ProviderPage {
  readonly transactions: readonly ProviderTransaction[]
  readonly nextCursor: string | null
}
export interface FinancialDataProvider {
  readonly id: string
  capabilities(): {
    readonly accountInformation: true
    readonly payments: false
    readonly synthetic: boolean
    readonly grantSpecificRevocation: boolean
  }
  createConnection(
    context: ProviderContext,
  ): Promise<{ consentExpiresAt: string; redirectUrl: string | null }>
  refreshConnection(context: ProviderContext): Promise<void>
  listAccounts(context: ProviderContext): Promise<readonly ProviderAccount[]>
  getBalances(context: ProviderContext): Promise<readonly ProviderAccount[]>
  getTransactions(
    context: ProviderContext,
    accountId: string,
    cursor?: string | null,
  ): Promise<ProviderPage>
  disconnect(context: ProviderContext): Promise<void>
}

export function stableId(namespace: string, ...parts: readonly string[]): string {
  return `${namespace}_${createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 32)}`
}
export function merchantKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it-IT')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
export function normalizeAccount(
  providerId: string,
  context: ProviderContext,
  account: ProviderAccount,
  observedAt: string,
): Account {
  return {
    id: stableId('account', context.profileId, context.connectionId, providerId, account.id),
    profileId: context.profileId,
    connectionId: context.connectionId,
    providerAccountId: account.id,
    name: account.name,
    institutionName: account.institutionName,
    kind: account.kind,
    balance: parseDecimal(account.balance, account.currency),
    balanceUpdatedAt: observedAt,
  }
}
export function normalizeTransaction(
  providerId: string,
  context: ProviderContext,
  record: ProviderTransaction,
  observedAt: string,
): Transaction {
  if (!record.id || !record.accountId || !record.description)
    throw new Error('Missing provider identity or description')
  if (!['pending', 'booked', 'reversed'].includes(record.status))
    throw new Error('Invalid transaction status')
  if (record.status === 'booked' && !record.bookedOn)
    throw new Error('Booked transaction requires a calendar date')
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error('Invalid observation timestamp')
  if (!context.profileId || !context.connectionId)
    throw new Error('Missing profile or connection identity')
  if (record.source && !['bank', 'csv', 'manual'].includes(record.source))
    throw new Error('Invalid source')
  if (
    record.kind &&
    !['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'].includes(
      record.kind,
    )
  )
    throw new Error('Invalid transaction kind')
  const amount = parseDecimal(record.amount, record.currency)
  const transactionId = (id: string) =>
    stableId(
      'transaction',
      context.profileId,
      context.connectionId,
      providerId,
      record.accountId,
      id,
    )
  return {
    id: transactionId(record.id),
    profileId: context.profileId,
    accountId: stableId(
      'account',
      context.profileId,
      context.connectionId,
      providerId,
      record.accountId,
    ),
    connectionId: context.connectionId,
    providerId,
    providerTransactionId: record.id,
    revision: 1,
    source: record.source ?? 'bank',
    status: record.status,
    amount,
    description: record.description,
    merchantName: record.merchantName ?? null,
    merchantKey: record.merchantName ? merchantKey(record.merchantName) : null,
    bookedOn: record.bookedOn ? dateOnly(record.bookedOn) : null,
    authorizedOn: record.authorizedOn ? dateOnly(record.authorizedOn) : null,
    observedAt,
    kind: record.kind ?? (amount.amountMinor < 0n ? 'expense' : 'income'),
    reference: record.reference ?? null,
    relatedTransactionId: record.relatedTransactionId
      ? transactionId(record.relatedTransactionId)
      : null,
    relatedAccountId: record.relatedAccountId
      ? stableId(
          'account',
          context.profileId,
          context.connectionId,
          providerId,
          record.relatedAccountId,
        )
      : null,
  }
}

/** Synthetic fixture only: these names do not imply supported bank integrations. */
export class MockItalianProvider implements FinancialDataProviderV2 {
  readonly id = 'mock-italian'
  readonly #revoked = new Set<string>()
  readonly #failOnce = new Set<string>()
  readonly #grants = new Map<string, string | null>()
  readonly #fixture: readonly ProviderTransaction[]
  constructor(fixture: readonly ProviderTransaction[] = ITALIAN_TRANSACTIONS) {
    this.#fixture = fixture
  }
  capabilities() {
    return {
      accountInformation: true,
      payments: false,
      synthetic: true,
      grantSpecificRevocation: true,
    } as const
  }
  discoveryMetadata(): ProviderDiscoveryMetadata {
    return {
      providerId: this.id,
      environment: 'synthetic',
      coverageVersion: 'mock-italian/2026-10-03/1',
      pagination: { maxPageSize: 1, maxPages: 1, maxCursorBytes: 32 },
      refresh: {
        userPresent: 'supported',
        unattendedBudget: {
          requests: 4,
          windowSeconds: 86400,
          evidenceReference: 'synthetic-fixture-refresh-policy/1',
        },
      },
      renewal: 'supported',
    }
  }
  async listInstitutions(cursor: string | null = null): Promise<InstitutionPage> {
    if (cursor !== null) throw new Error('Invalid institution cursor')
    return {
      coverageVersion: this.discoveryMetadata().coverageVersion,
      institutions: [
        {
          id: 'synthetic-italian',
          providerId: this.id,
          name: 'Istituto dimostrativo — dati sintetici',
          countryCode: 'IT',
          accountTypes: (['current', 'savings', 'card', 'cash'] as const).map((kind) => ({
            kind,
            availability: 'available',
            evidence: {
              status: 'synthetic',
              environment: 'synthetic',
              reference: `mock-italian-fixture/${kind}/1`,
              checkedAt: '2026-10-03T00:00:00Z',
            },
            historyFrom: this.#historyFrom(kind),
          })),
        },
      ],
      nextCursor: null,
    }
  }
  #historyFrom(kind: Account['kind']): string | null {
    const accountIds =
      kind === 'current'
        ? ['conto', 'gbp']
        : kind === 'savings'
          ? ['risparmio']
          : kind === 'card'
            ? ['carta']
            : ['cash']
    const dates = this.#fixture
      .filter((record) => accountIds.includes(record.accountId) && record.bookedOn)
      .map((record) => record.bookedOn as string)
      .sort()
    return dates[0] ?? null
  }
  #authorization(): ProviderAuthorization {
    return {
      providerId: this.id,
      institutionId: 'synthetic-italian',
      state: 'active',
      consentExpiresAt: '2027-03-31T23:59:59Z',
      scaDueAt: null,
      providerSessionExpiresAt: null,
      tokenExpiresAt: null,
      requiredActions: [
        {
          action: 'renew_consent',
          method: 'in_place',
          dueAt: '2027-03-31T23:59:59Z',
          evidenceReference: 'synthetic-fixture-consent-term/1',
        },
      ],
    }
  }
  async createConnection(context: ProviderContext): Promise<ProviderConnectionGrant> {
    if (context.institutionId !== undefined && context.institutionId !== 'synthetic-italian')
      throw new Error('Unknown synthetic institution')
    this.#grants.set(context.connectionId, context.grantId ?? null)
    this.#revoked.delete(context.connectionId)
    return {
      consentExpiresAt: '2027-03-31T23:59:59Z',
      redirectUrl: null,
      authorization: this.#authorization(),
    }
  }
  async renewConnection(context: ProviderContext): Promise<ProviderConnectionGrant> {
    this.#check(context)
    return this.createConnection(context)
  }
  failNextRefresh(connectionId: string) {
    this.#failOnce.add(connectionId)
  }
  async refreshConnection(context: ProviderContext) {
    this.#check(context)
    if (this.#failOnce.delete(context.connectionId))
      throw new Error('Synthetic temporary provider outage')
  }
  async listAccounts(context: ProviderContext): Promise<readonly ProviderAccount[]> {
    this.#check(context)
    return [
      {
        id: 'conto',
        name: 'Conto quotidiano',
        institutionName: 'Banca dimostrativa',
        kind: 'current',
        currency: 'EUR',
        balance: '2438.72',
      },
      {
        id: 'risparmio',
        name: 'Risparmi',
        institutionName: 'Banca dimostrativa',
        kind: 'savings',
        currency: 'EUR',
        balance: '1200.00',
      },
      {
        id: 'carta',
        name: 'Carta dimostrativa',
        institutionName: 'Circuito dimostrativo',
        kind: 'card',
        currency: 'EUR',
        balance: '-185.00',
      },
      {
        id: 'cash',
        name: 'Contanti',
        institutionName: 'Portafoglio manuale',
        kind: 'cash',
        currency: 'EUR',
        balance: '80.00',
      },
      {
        id: 'gbp',
        name: 'Conto in sterline',
        institutionName: 'Banca dimostrativa',
        kind: 'current',
        currency: 'GBP',
        balance: '125.30',
      },
    ]
  }
  async getBalances(context: ProviderContext) {
    return this.listAccounts(context)
  }
  syncMetadata(): SyntheticSyncMetadata {
    return {
      providerId: this.id,
      environment: 'synthetic',
      evidenceReference: 'synthetic-fixture-window-policy/1',
      userPresent: 'supported',
      unattendedBudget: {
        requests: 4,
        windowSeconds: 86400,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: 'synthetic-fixture-refresh-policy/1',
      },
      maxWindowDays: 14,
      maxPageSize: 7,
      maxCursorBytes: 32,
      pendingSet: 'complete_snapshot',
      deletionEvidence: 'complete_window',
    }
  }
  #syncSnapshotId(context: ProviderContext): string {
    return stableId(
      'synthetic-snapshot',
      context.profileId,
      context.connectionId,
      context.grantId ?? '',
      createHash('sha256').update(JSON.stringify(this.#bankFixture())).digest('hex'),
    )
  }
  // Legacy demonstration collection intentionally also contains separate CSV/manual examples.
  // This explicit synthetic partition never filters an unexpected live provider response.
  #bankFixture() {
    return this.#fixture.filter((record) => record.source === undefined || record.source === 'bank')
  }
  async openSync(
    context: ProviderContext,
    _mode: 'user_present' | 'unattended',
    requestedAt?: string,
  ): Promise<SyntheticSyncSnapshot> {
    if (
      requestedAt !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(requestedAt) ||
        !Number.isFinite(Date.parse(requestedAt)) ||
        new Date(requestedAt).toISOString() !== requestedAt)
    )
      throw new Error('Invalid synthetic observation instant')
    await this.refreshConnection(context)
    const accounts = await this.listAccounts(context)
    return {
      snapshotId: this.#syncSnapshotId(context),
      accounts,
      observedAt:
        requestedAt === undefined ? new Date().toISOString() : new Date(requestedAt).toISOString(),
      historyFrom: Object.fromEntries(
        accounts.map((account) => [
          account.id,
          this.#bankFixture()
            .filter((record) => record.accountId === account.id && record.bookedOn)
            .map((record) => record.bookedOn as string)
            .sort()[0] ?? null,
        ]),
      ),
      balances: accounts.map((account) => ({
        accountId: account.id,
        currency: account.currency,
        amount: account.balance,
        type: 'unknown',
        referenceDate: null,
        opening: null,
      })),
    }
  }
  async getSyncPage(
    context: ProviderContext,
    request: SyntheticSyncPageRequest,
  ): Promise<SyntheticSyncPage> {
    this.#check(context)
    if (request.snapshotId !== this.#syncSnapshotId(context))
      throw new Error('Unknown synthetic snapshot')
    dateOnly(request.from)
    dateOnly(request.to)
    const days =
      (Date.parse(`${request.to}T00:00:00Z`) - Date.parse(`${request.from}T00:00:00Z`)) /
        86_400_000 +
      1
    if (
      days < 1 ||
      days > this.syncMetadata().maxWindowDays ||
      !Number.isSafeInteger(request.pageSize) ||
      request.pageSize < 1 ||
      request.pageSize > this.syncMetadata().maxPageSize
    )
      throw new Error('Invalid synthetic page window')
    if (request.cursor !== null && !/^(0|[1-9]\d*)$/u.test(request.cursor))
      throw new Error('Invalid cursor')
    const offset = request.cursor === null ? 0 : Number(request.cursor)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % request.pageSize !== 0)
      throw new Error('Invalid cursor')
    const items = this.#bankFixture().filter(
      (record) =>
        record.accountId === request.accountId &&
        (record.status === 'pending'
          ? request.includePending
          : Boolean(
              record.bookedOn && record.bookedOn >= request.from && record.bookedOn <= request.to,
            )),
    )
    return {
      snapshotId: request.snapshotId,
      from: request.from,
      to: request.to,
      transactions: items.slice(offset, offset + request.pageSize),
      nextCursor:
        offset + request.pageSize < items.length ? String(offset + request.pageSize) : null,
      coverage: 'complete_window',
    }
  }
  async getTransactions(
    context: ProviderContext,
    accountId: string,
    cursor: string | null = null,
  ): Promise<ProviderPage> {
    this.#check(context)
    if (cursor !== null && !/^(0|[1-9]\d*)$/u.test(cursor)) throw new Error('Invalid cursor')
    const offset = cursor === null ? 0 : Number(cursor)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % 7 !== 0)
      throw new Error('Invalid cursor')
    const items = this.#fixture.filter((record) => record.accountId === accountId)
    return {
      transactions: items.slice(offset, offset + 7),
      nextCursor: offset + 7 < items.length ? String(offset + 7) : null,
    }
  }
  async disconnect(context: ProviderContext) {
    if (
      context.grantId !== undefined &&
      this.#grants.has(context.connectionId) &&
      this.#grants.get(context.connectionId) !== context.grantId
    )
      return
    this.#revoked.add(context.connectionId)
  }
  #check(context: ProviderContext) {
    if (this.#revoked.has(context.connectionId)) throw new Error('Consent revoked')
    if (
      context.grantId !== undefined &&
      this.#grants.has(context.connectionId) &&
      this.#grants.get(context.connectionId) !== context.grantId
    )
      throw new Error('Consent generation is stale')
  }
}

const booked = (
  id: string,
  amount: string,
  description: string,
  merchantName: string,
  bookedOn = '2026-10-01',
  accountId = 'conto',
): ProviderTransaction => ({
  id,
  accountId,
  amount,
  currency: 'EUR',
  description,
  merchantName,
  bookedOn,
  status: 'booked',
})
export const ITALIAN_TRANSACTIONS: readonly ProviderTransaction[] = [
  {
    ...booked(
      'salary',
      '2350.00',
      'Stipendio settembre — datore sintetico',
      'Datore sintetico',
      '2026-09-27',
    ),
    kind: 'income',
  },
  { ...booked('coop', '-84.30', 'COOP FIRENZE', 'Coop'), reference: 'bank-coop-demo-1' },
  booked('esselunga', '-56.42', 'ESSELUNGA', 'Esselunga'),
  booked('amazon', '-39.99', 'AMAZON ordine sintetico', 'Amazon'),
  ...['2026-07-02', '2026-08-02', '2026-09-02'].map((date, index) =>
    booked(`netflix-${index}`, index === 2 ? '-14.99' : '-12.99', 'NETFLIX', 'Netflix', date),
  ),
  ...['2026-07-04', '2026-08-04', '2026-09-04'].map((date, index) =>
    booked(`spotify-${index}`, '-10.99', 'SPOTIFY', 'Spotify', date),
  ),
  booked('mcdonalds', '-9.50', "McDonald's", "McDonald's"),
  booked('autostrade', '-7.20', 'AUTOSTRADE PEDAGGIO', 'Autostrade'),
  booked('enel', '-82.15', 'SDD ENEL ENERGIA', 'Enel'),
  booked('tim', '-29.90', 'SDD TIM', 'TIM'),
  booked('train', '-24.90', 'TRENITALIA', 'Trenitalia'),
  booked('deliveroo', '-18.60', 'DELIVEROO', 'Deliveroo'),
  booked('booking', '-125.00', 'BOOKING HOTEL SINTETICO', 'Booking'),
  booked('ikea', '-42.00', 'IKEA', 'IKEA'),
  booked('pharmacy', '-16.80', 'FARMACIA DEMO', 'Farmacia'),
  booked('fuel', '-45.00', 'BENZINA DEMO', 'Benzina'),
  booked('restaurant', '-36.50', 'RISTORANTE DEMO', 'Ristorante'),
  booked('unknown', '-6.50', 'SUMUP *ESERCENTE SINTETICO', ''),
  {
    ...booked('transfer-out', '-200.00', 'Giroconto verso risparmi', ''),
    kind: 'transfer',
    reference: 'transfer-demo-1',
    relatedAccountId: 'risparmio',
  },
  {
    ...booked(
      'transfer-in',
      '200.00',
      'Giroconto da conto quotidiano',
      '',
      '2026-10-01',
      'risparmio',
    ),
    kind: 'transfer',
    reference: 'transfer-demo-1',
    relatedAccountId: 'conto',
  },
  {
    ...booked('card-payment', '-185.00', 'Saldo carta', ''),
    kind: 'card_settlement',
    reference: 'settlement-demo-1',
    relatedAccountId: 'carta',
  },
  {
    ...booked('card-credit', '185.00', 'Pagamento ricevuto', '', '2026-10-01', 'carta'),
    kind: 'card_settlement',
    reference: 'settlement-demo-1',
    relatedAccountId: 'conto',
  },
  {
    ...booked('refund', '20.00', 'Rimborso Amazon', 'Amazon'),
    kind: 'refund',
    relatedTransactionId: 'amazon',
  },
  {
    ...booked('atm', '-80.00', 'Prelievo contanti', ''),
    kind: 'cash_withdrawal',
    reference: 'cash-demo-1',
    relatedAccountId: 'cash',
  },
  {
    ...booked('cash-in', '80.00', 'Contanti da prelievo', '', '2026-10-01', 'cash'),
    kind: 'transfer',
    reference: 'cash-demo-1',
    relatedAccountId: 'conto',
  },
  {
    id: 'pending-hotel',
    accountId: 'conto',
    amount: '-50.00',
    currency: 'EUR',
    description: 'Prenotazione hotel',
    merchantName: 'Booking',
    status: 'pending',
    authorizedOn: '2026-10-01',
    reference: 'reservation-demo-1',
  },
  {
    ...booked('hotel-booked', '-50.00', 'Hotel contabilizzato', 'Booking', '2026-10-02'),
    relatedTransactionId: 'pending-hotel',
    reference: 'reservation-demo-1',
  },
  {
    ...booked('coop-import', '-84.30', 'COOP FIRENZE', 'Coop'),
    source: 'csv',
    reference: 'bank-coop-demo-1',
  },
  {
    ...booked('coffee-1', '-2.00', 'BAR STESSO ACQUISTO RIPETUTO', 'Bar Demo'),
    reference: 'coffee-distinct-1',
  },
  {
    ...booked('coffee-2', '-2.00', 'BAR STESSO ACQUISTO RIPETUTO', 'Bar Demo'),
    reference: 'coffee-distinct-2',
  },
  {
    id: 'gbp-expense',
    accountId: 'gbp',
    amount: '-8.50',
    currency: 'GBP',
    description: 'Synthetic café GBP',
    merchantName: 'Café',
    bookedOn: '2026-10-01',
    status: 'booked',
  },
]
export * from './xlsx-mapper.js'
