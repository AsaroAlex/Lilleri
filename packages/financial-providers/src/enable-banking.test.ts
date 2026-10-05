import { createHash, generateKeyPairSync, verify } from 'node:crypto'
import { dateOnly } from '@lilleri/domain'
import { parseDecimal } from '@lilleri/money'
import { describe, expect, it } from 'vitest'
import {
  discoverInstitutions,
  type SyncProviderTransaction,
  SyntheticSyncFailure,
  type SyntheticSyncMetadata,
  type SyntheticSyncPage,
  type SyntheticSyncPageRequest,
  type SyntheticSyncSnapshot,
  validateDiscoveryMetadata,
  validateInstitutionPage,
  validateSyntheticSyncMetadata,
} from './contracts.js'
import {
  ENABLE_BANKING_EVIDENCE,
  type EnableBankingAccount,
  type EnableBankingBalance,
  EnableBankingClient,
  EnableBankingFailure,
  EnableBankingProvider,
  type EnableBankingProviderOptions,
  type EnableBankingTransaction,
  enableBankingInstitutionId,
  mapEnableBankingAccount,
  mapEnableBankingTransaction,
  parseEnableBankingInstitutionId,
  selectEnableBankingBalance,
} from './enable-banking.js'
import { normalizeAccount, normalizeTransaction, type ProviderAccount } from './index.js'

// Original synthetic wire fixtures shaped after the public Enable Banking API reference.
const NOW = Date.parse('2026-10-05T10:00:00.000Z')
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const PRIVATE_KEY_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const APPLICATION_ID = '3f1c9a52-6b7d-4e8f-9a01-23456789abcd'
const SESSION_ID = '8d0e1f2a-3b4c-4d5e-8f60-718293a4b5c6'
const UID_CURRENT = 'a0000000-0000-4000-8000-000000000001'
const UID_CARD = 'a0000000-0000-4000-8000-000000000002'
const UID_LOAN = 'a0000000-0000-4000-8000-000000000003'
const HISTORY_FROM = '2026-07-08'
const BULLETS = String.fromCharCode(0x2022, 0x2022)
const SECRET_BODY = {
  message: 'Mario Rossi IT60X0542811101000000123456 token=sk-live-secret https://evil.example/?q=1',
  detail: { iban: 'IT60X0542811101000000123456' },
}
const context = { profileId: 'profile-eb', connectionId: 'connection-eb', grantId: SESSION_ID }
const psu = { ipAddress: '203.0.113.7', userAgent: 'LilleriTest/1.0' }

const ASPSPS = [
  {
    name: 'Banca Sintetica',
    country: 'IT',
    logo: 'https://enablebanking.com/brands/IT/sintetica.png',
    psu_types: ['personal'],
    auth_methods: [
      {
        name: 'redirect',
        title: 'Home banking',
        psu_type: 'personal',
        approach: 'REDIRECT',
        hidden_method: false,
        credentials: [],
      },
    ],
    maximum_consent_validity: 15_552_000,
    sandbox: { users: [{ username: 'synthetic-user', password: 'synthetic-secret', otp: '1' }] },
    beta: false,
    bic: 'SYNTITMM',
    required_psu_headers: ['Psu-Ip-Address', 'Psu-User-Agent'],
  },
  {
    name: 'Banca Beta',
    country: 'IT',
    psu_types: ['personal'],
    auth_methods: [{ psu_type: 'personal', approach: 'REDIRECT' }],
    maximum_consent_validity: 15_552_000,
    beta: true,
  },
  {
    name: 'Banca Embedded',
    country: 'IT',
    psu_types: ['personal'],
    auth_methods: [{ psu_type: 'personal', approach: 'EMBEDDED' }],
    maximum_consent_validity: 15_552_000,
    beta: false,
  },
  {
    name: 'Banca Breve',
    country: 'IT',
    psu_types: ['personal'],
    auth_methods: [
      { psu_type: 'personal', approach: 'EMBEDDED', hidden_method: true },
      { psu_type: 'personal', approach: 'DECOUPLED', hidden_method: false },
    ],
    maximum_consent_validity: 7_776_000,
    beta: false,
    required_psu_headers: ['Psu-Ip-Address', 'Psu-Geo-Location'],
  },
]
const SESSION_STATUS = {
  status: 'AUTHORIZED',
  aspsp: { name: 'Banca Sintetica', country: 'IT' },
  psu_type: 'personal',
  accounts: [UID_CURRENT, UID_CARD, UID_LOAN],
  accounts_data: [
    { uid: UID_CURRENT, identification_hash: 'hash-current', identification_hashes: ['x'] },
    { uid: UID_CARD, identification_hash: 'hash-card', identification_hashes: ['y'] },
    { uid: UID_LOAN, identification_hash: 'hash-loan', identification_hashes: ['z'] },
    { identification_hash: 'hash-closed', identification_hashes: ['w'] },
  ],
  access: { valid_until: '2027-04-03T09:50:00.000000+00:00' },
  created: '2026-10-01T09:00:00.000000+00:00',
}
const DETAILS: Record<string, unknown> = {
  [UID_CURRENT]: {
    uid: UID_CURRENT,
    identification_hash: 'hash-current',
    identification_hashes: ['hash-current'],
    account_id: { iban: 'IT60X0542811101000000123456' },
    name: 'Mario Rossi',
    details: 'Conto corrente',
    usage: 'PRIV',
    cash_account_type: 'CACC',
    currency: 'EUR',
    postal_address: { town_name: 'Firenze' },
  },
  [UID_CARD]: {
    uid: UID_CARD,
    identification_hash: 'hash-card',
    identification_hashes: ['hash-card'],
    account_id: { other: { identification: '4111', scheme_name: 'CPAN' } },
    product: 'Carta Oro',
    cash_account_type: 'CARD',
    currency: 'EUR',
  },
  [UID_LOAN]: {
    uid: UID_LOAN,
    identification_hash: 'hash-loan',
    identification_hashes: ['hash-loan'],
    product: 'Mutuo',
    cash_account_type: 'LOAN',
    currency: 'EUR',
  },
}
const BALANCES: Record<string, unknown[]> = {
  [UID_CURRENT]: [
    {
      name: 'Disponibile',
      balance_amount: { currency: 'EUR', amount: '1500.00' },
      balance_type: 'ITAV',
    },
    {
      name: 'Contabile',
      balance_amount: { currency: 'EUR', amount: '1234.56' },
      balance_type: 'CLBD',
      reference_date: '2026-10-04',
    },
  ],
  [UID_CARD]: [
    {
      name: 'Saldo carta',
      balance_amount: { currency: 'EUR', amount: '-185.00' },
      balance_type: 'ITBD',
      last_change_date_time: '2026-10-05T08:00:00+02:00',
    },
  ],
}
const CURRENT_PAGES: Record<string, { transactions: unknown[]; continuation_key: string | null }> =
  {
    '': {
      transactions: [
        {
          entry_reference: 'E-COOP-1',
          transaction_id: 'unstable-1',
          transaction_amount: { currency: 'EUR', amount: '84.30' },
          credit_debit_indicator: 'DBIT',
          status: 'BOOK',
          booking_date: '2026-09-28',
          value_date: '2026-09-28',
          creditor: { name: 'COOP FIRENZE' },
          creditor_account: { iban: 'IT02A0301503200000003517230' },
          remittance_information: ['PAGAMENTO POS', 'COOP FIRENZE'],
        },
        {
          entry_reference: 'E-SAL-1',
          transaction_amount: { currency: 'EUR', amount: '2350' },
          credit_debit_indicator: 'CRDT',
          status: 'BOOK',
          booking_date: '2026-09-27',
          debtor: { name: 'Datore Sintetico' },
          remittance_information: ['Stipendio settembre'],
          reference_number: 'RF18539007547034',
        },
      ],
      continuation_key: 'key-1',
    },
    'key-1': { transactions: [], continuation_key: 'key-2' },
    'key-2': {
      transactions: [
        {
          transaction_amount: { currency: 'EUR', amount: '50.00' },
          credit_debit_indicator: 'DBIT',
          status: 'PDNG',
          transaction_date: '2026-10-04',
          creditor: { name: 'Hotel Sintetico' },
        },
        {
          entry_reference: 'E-CNCL',
          transaction_amount: { currency: 'EUR', amount: '9.00' },
          credit_debit_indicator: 'DBIT',
          status: 'CNCL',
          booking_date: '2026-09-29',
        },
        {
          entry_reference: 'E-OLD',
          transaction_amount: { currency: 'EUR', amount: '10.00' },
          credit_debit_indicator: 'DBIT',
          status: 'BOOK',
          booking_date: HISTORY_FROM,
          bank_transaction_code: { description: 'Commissioni', code: 'PMNT' },
        },
        {
          transaction_amount: { currency: 'EUR', amount: '19.99' },
          credit_debit_indicator: 'DBIT',
          status: 'BOOK',
          value_date: '2026-10-02',
          remittance_information: ['NETFLIX'],
        },
      ],
      continuation_key: null,
    },
  }
const CARD_PAGE = {
  transactions: [
    {
      entry_reference: 'C-1',
      transaction_amount: { currency: 'EUR', amount: '+12.30' },
      credit_debit_indicator: 'DBIT',
      status: 'BOOK',
      booking_date: '2026-10-01',
      transaction_date: '2026-09-30',
      creditor: { name: 'Libreria' },
    },
    {
      entry_reference: 'C-USD',
      transaction_amount: { currency: 'USD', amount: '5.00' },
      credit_debit_indicator: 'DBIT',
      status: 'BOOK',
      booking_date: '2026-10-01',
    },
  ],
}

interface Call {
  readonly method: string
  readonly url: URL
  readonly headers: Headers
  readonly body: unknown
  readonly init: RequestInit | undefined
}
type Handler = (call: Call) => Response | Promise<Response>
type Override = (call: Call) => Response | Promise<Response> | undefined

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}
function fakeFetch(handler: Handler) {
  const calls: Call[] = []
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const call: Call = {
      method: init?.method ?? 'GET',
      url,
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      init,
    }
    calls.push(call)
    return handler(call)
  }
  return { fetch, calls }
}
function bank(override?: Override): Handler {
  return (call) => {
    const overridden = override?.(call)
    if (overridden) return overridden
    const path = call.url.pathname
    if (call.method === 'GET' && path === '/aspsps') return json({ aspsps: ASPSPS })
    if (call.method === 'GET' && path === `/sessions/${SESSION_ID}`) return json(SESSION_STATUS)
    if (call.method === 'DELETE' && path === `/sessions/${SESSION_ID}`)
      return json({ message: 'OK' })
    const match = /^\/accounts\/([^/]+)\/(details|balances|transactions)$/u.exec(path)
    const uid = match?.[1] ?? ''
    if (call.method === 'GET' && match?.[2] === 'details' && DETAILS[uid]) return json(DETAILS[uid])
    if (call.method === 'GET' && match?.[2] === 'balances' && BALANCES[uid])
      return json({ balances: BALANCES[uid] })
    if (call.method === 'GET' && match?.[2] === 'transactions') {
      if (uid === UID_CARD) return json(CARD_PAGE)
      const page = CURRENT_PAGES[call.url.searchParams.get('continuation_key') ?? '']
      if (uid === UID_CURRENT && page) return json(page)
    }
    return json({ message: 'unexpected', error: 'WRONG_REQUEST_PARAMETERS' }, 400)
  }
}
function setup(override?: Override, options: Partial<EnableBankingProviderOptions> = {}) {
  const clock = { now: NOW }
  const { fetch, calls } = fakeFetch(bank(override))
  const provider = new EnableBankingProvider({
    applicationId: APPLICATION_ID,
    privateKeyPem: PRIVATE_KEY_PEM,
    environment: 'sandbox',
    fetch,
    now: () => new Date(clock.now),
    ...options,
  })
  return { provider, calls, clock }
}
function client(handler: Handler, clock = { now: NOW }, timeoutMs?: number) {
  const { fetch, calls } = fakeFetch(handler)
  return {
    client: new EnableBankingClient({
      applicationId: APPLICATION_ID,
      privateKeyPem: PRIVATE_KEY_PEM,
      fetch,
      now: () => new Date(clock.now),
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    }),
    calls,
    clock,
  }
}
async function failure(promise: Promise<unknown>): Promise<EnableBankingFailure> {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  if (!(error instanceof EnableBankingFailure)) throw new Error('Expected EnableBankingFailure')
  return error
}
async function syncFailure(promise: Promise<unknown>): Promise<SyntheticSyncFailure> {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  if (!(error instanceof SyntheticSyncFailure)) throw new Error('Expected SyntheticSyncFailure')
  return error
}
const pathCalls = (calls: readonly Call[]) =>
  calls.map((call) => `${call.method} ${call.url.pathname}`)

// Equivalents of apps/api validateSyncSnapshot / validateSyncPage (no apps import from packages).
const RECORD_KEYS = new Set([
  'id',
  'accountId',
  'amount',
  'currency',
  'description',
  'status',
  'merchantName',
  'bookedOn',
  'authorizedOn',
  'kind',
  'reference',
  'relatedTransactionId',
  'relatedAccountId',
  'source',
  'pendingLifecycle',
  'fxEvidence',
])
function assertApiSnapshot(snapshot: SyntheticSyncSnapshot, observedBefore: string) {
  expect(Object.keys(snapshot).sort()).toEqual([
    'accounts',
    'balances',
    'historyFrom',
    'observedAt',
    'snapshotId',
  ])
  expect(snapshot.snapshotId.length).toBeGreaterThan(0)
  expect(snapshot.snapshotId.length).toBeLessThanOrEqual(200)
  expect(snapshot.accounts.length).toBeGreaterThan(0)
  expect(new Set(snapshot.accounts.map((account) => account.id)).size).toBe(
    snapshot.accounts.length,
  )
  expect(new Date(snapshot.observedAt).toISOString()).toBe(snapshot.observedAt)
  expect(Date.parse(snapshot.observedAt)).toBeLessThanOrEqual(Date.parse(observedBefore))
  for (const account of snapshot.accounts) {
    expect(Object.keys(account).sort()).toEqual([
      'balance',
      'currency',
      'id',
      'institutionName',
      'kind',
      'name',
    ])
    for (const value of [account.id, account.name, account.institutionName]) {
      expect(value.length).toBeGreaterThanOrEqual(1)
      expect(value.length).toBeLessThanOrEqual(200)
    }
    expect(['current', 'card', 'cash', 'savings']).toContain(account.kind)
    expect(account.currency).toHaveLength(3)
    expect(account.balance.length).toBeLessThanOrEqual(40)
    normalizeAccount('enable-banking', context, account, snapshot.observedAt)
  }
  expect(Object.keys(snapshot.historyFrom).sort()).toEqual(
    snapshot.accounts.map((account) => account.id).sort(),
  )
  for (const date of Object.values(snapshot.historyFrom)) if (date !== null) dateOnly(date)
  expect(snapshot.balances).toHaveLength(snapshot.accounts.length)
  expect(new Set(snapshot.balances.map((balance) => balance.accountId)).size).toBe(
    snapshot.accounts.length,
  )
  for (const balance of snapshot.balances) {
    expect(Object.keys(balance).sort()).toEqual([
      'accountId',
      'amount',
      'currency',
      'opening',
      'referenceDate',
      'type',
    ])
    const account = snapshot.accounts.find((candidate) => candidate.id === balance.accountId)
    if (!account) throw new Error('Wrong balance account')
    expect(balance.currency).toBe(account.currency)
    expect(parseDecimal(balance.amount, account.currency).amountMinor).toBe(
      parseDecimal(account.balance, account.currency).amountMinor,
    )
    if (balance.referenceDate !== null) dateOnly(balance.referenceDate)
    expect(balance.opening).toBeNull()
  }
}
function assertApiPage(
  page: SyntheticSyncPage,
  request: SyntheticSyncPageRequest,
  account: ProviderAccount,
  metadata: SyntheticSyncMetadata,
) {
  expect(Object.keys(page).sort()).toEqual([
    'coverage',
    'from',
    'nextCursor',
    'snapshotId',
    'to',
    'transactions',
  ])
  expect([page.snapshotId, page.from, page.to]).toEqual([
    request.snapshotId,
    request.from,
    request.to,
  ])
  expect(page.transactions.length).toBeLessThanOrEqual(request.pageSize)
  expect(['complete_window', 'unknown']).toContain(page.coverage)
  if (page.nextCursor !== null) {
    expect(page.nextCursor.length).toBeGreaterThan(0)
    expect(Buffer.byteLength(page.nextCursor, 'utf8')).toBeLessThanOrEqual(metadata.maxCursorBytes)
    expect(/[\p{Cc}]/u.test(page.nextCursor)).toBe(false)
  }
  for (const record of page.transactions) {
    for (const key of Object.keys(record)) expect(RECORD_KEYS.has(key)).toBe(true)
    expect(record.accountId).toBe(account.id)
    expect(record.currency).toBe(account.currency)
    expect(record.source ?? 'bank').toBe('bank')
    if (record.id !== null) {
      expect(record.id.length).toBeGreaterThanOrEqual(1)
      expect(record.id.length).toBeLessThanOrEqual(200)
      expect(record.id.startsWith('no-id:v1:')).toBe(false)
    }
    expect(record.description.length).toBeGreaterThanOrEqual(1)
    expect(record.description.length).toBeLessThanOrEqual(2000)
    expect(record.amount.length).toBeLessThanOrEqual(40)
    expect((record.merchantName ?? '').length).toBeLessThanOrEqual(500)
    expect((record.reference ?? '').length).toBeLessThanOrEqual(500)
    if (record.bookedOn !== undefined) expect(record.bookedOn).toHaveLength(10)
    if (record.authorizedOn !== undefined) expect(record.authorizedOn).toHaveLength(10)
    normalizeTransaction(
      'enable-banking',
      context,
      { ...record, id: record.id ?? 'validation-only' },
      new Date(NOW).toISOString(),
    )
    if (record.status === 'pending') expect(request.includePending).toBe(true)
    else {
      expect(record.bookedOn).toBeDefined()
      expect((record.bookedOn ?? '') >= request.from && (record.bookedOn ?? '') <= request.to).toBe(
        true,
      )
    }
  }
}
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
/** Mirrors the API's planSync windows and page loop, validating every page. */
async function drain(
  provider: EnableBankingProvider,
  snapshot: SyntheticSyncSnapshot,
  to: string,
  pageSize = 200,
): Promise<SyncProviderTransaction[]> {
  const metadata = validateSyntheticSyncMetadata(provider.syncMetadata())
  const records: SyncProviderTransaction[] = []
  for (const account of snapshot.accounts) {
    const start = snapshot.historyFrom[account.id] ?? to
    for (let from = start; from <= to; ) {
      const end = addDays(from, metadata.maxWindowDays - 1) < to ? addDays(from, 13) : to
      let cursor: string | null = null
      const seen = new Set<string>()
      do {
        const request: SyntheticSyncPageRequest = {
          snapshotId: snapshot.snapshotId,
          accountId: account.id,
          from,
          to: end,
          cursor,
          pageSize,
          includePending: end === to,
        }
        const page = await provider.getSyncPage(context, request)
        assertApiPage(page, request, account, metadata)
        records.push(...page.transactions)
        cursor = page.nextCursor
        if (cursor !== null) {
          expect(seen.has(cursor)).toBe(false)
          seen.add(cursor)
        }
      } while (cursor !== null)
      from = addDays(end, 1)
    }
  }
  return records
}
const tx = (overrides: Partial<EnableBankingTransaction> = {}): EnableBankingTransaction => ({
  entry_reference: 'REF-1',
  transaction_amount: { currency: 'EUR', amount: '84.30' },
  credit_debit_indicator: 'DBIT',
  status: 'BOOK',
  booking_date: '2026-09-28',
  ...overrides,
})
const account = (overrides: Partial<EnableBankingAccount> = {}): EnableBankingAccount => ({
  uid: UID_CURRENT,
  identification_hash: 'hash-current',
  cash_account_type: 'CACC',
  currency: 'EUR',
  ...overrides,
})
const balance = (type: string, amount: string, currency = 'EUR'): EnableBankingBalance => ({
  balance_amount: { currency, amount },
  balance_type: type,
})

describe('Enable Banking client', () => {
  it('signs a cached RS256 application JWT with the documented header and claims', async () => {
    const {
      client: eb,
      calls,
      clock,
    } = client(() =>
      json({ environment: 'sandbox', active: true, redirect_urls: ['https://app.example/cb'] }),
    )
    await eb.application()
    clock.now += 839_000
    await eb.application()
    clock.now += 1_000
    await eb.application()
    const tokens = calls.map((call) => call.headers.get('authorization') ?? '')
    expect(tokens[0]).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/u)
    expect(tokens[1]).toBe(tokens[0])
    expect(tokens[2]).not.toBe(tokens[0])
    for (const [index, token] of tokens.entries()) {
      const [header = '', claims = '', signature = ''] = token.slice('Bearer '.length).split('.')
      expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
        typ: 'JWT',
        alg: 'RS256',
        kid: APPLICATION_ID,
      })
      const iat = Math.floor(NOW / 1000) + (index === 2 ? 840 : 0)
      const parsed = JSON.parse(Buffer.from(claims, 'base64url').toString())
      expect(parsed).toEqual({
        iss: 'enablebanking.com',
        aud: 'api.enablebanking.com',
        iat,
        exp: iat + 900,
      })
      expect(parsed.exp - parsed.iat).toBeLessThanOrEqual(900)
      expect(
        verify(
          'sha256',
          Buffer.from(`${header}.${claims}`),
          publicKey,
          Buffer.from(signature, 'base64url'),
        ),
      ).toBe(true)
    }
  })

  it('sends only documented headers, refuses redirects and bounds every request', async () => {
    const { client: eb, calls } = client(bank())
    await eb.accountDetails(UID_CURRENT)
    await eb.accountDetails(UID_CURRENT, psu)
    const [plain, present] = calls
    expect(plain?.url.href).toBe(`https://api.enablebanking.com/accounts/${UID_CURRENT}/details`)
    expect(plain?.init?.redirect).toBe('error')
    expect(plain?.init?.signal).toBeInstanceOf(AbortSignal)
    expect(plain?.headers.get('accept')).toBe('application/json')
    expect(plain?.headers.get('content-type')).toBeNull()
    expect(plain?.headers.has('psu-ip-address')).toBe(false)
    expect(plain?.headers.has('psu-user-agent')).toBe(false)
    expect(present?.headers.get('psu-ip-address')).toBe(psu.ipAddress)
    expect(present?.headers.get('psu-user-agent')).toBe(psu.userAgent)
    await expect(eb.accountDetails(UID_CURRENT, { ...psu, ipAddress: 'nope' })).rejects.toThrow(
      'configuration',
    )
    await expect(eb.accountDetails('../sessions')).rejects.toThrow('configuration')
    expect(calls).toHaveLength(2)
  })

  it('reads the application self-check tolerantly and requires its environment', async () => {
    const { client: eb } = client(() =>
      json({ environment: 'PRODUCTION', active: false, name: 'x', countries: ['IT'], kid: 'k' }),
    )
    expect(await eb.application()).toEqual({
      environment: 'production',
      active: false,
      redirectUrls: [],
    })
    const missing = client(() => json({ active: true, redirect_urls: [] })).client
    expect((await failure(missing.application())).code).toBe('invalid_response')
  })

  it('queries personal AIS ASPSPs and drops credentials and unrepresentable entries', async () => {
    const { client: eb, calls } = client(() =>
      json({
        aspsps: [
          ...ASPSPS,
          { ...ASPSPS[0], name: 'x'.repeat(201) },
          { ...ASPSPS[0], country: 'FR' },
          ASPSPS[0],
        ],
      }),
    )
    const aspsps = await eb.aspsps('IT')
    expect(calls[0]?.url.search).toBe('?country=IT&psu_type=personal&service=AIS')
    expect(aspsps.map((aspsp) => aspsp.name)).toEqual([
      'Banca Sintetica',
      'Banca Beta',
      'Banca Embedded',
      'Banca Breve',
    ])
    expect(JSON.stringify(aspsps)).not.toContain('synthetic-secret')
    expect(aspsps[0]).toMatchObject({
      maximum_consent_validity: 15_552_000,
      beta: false,
      required_psu_headers: ['Psu-Ip-Address', 'Psu-User-Agent'],
    })
    await expect(eb.aspsps('it')).rejects.toThrow('configuration')
    const broken = client(() => json({ aspsps: [{ country: 'IT' }] })).client
    expect((await failure(broken.aspsps('IT'))).code).toBe('invalid_response')
  })

  it('starts a redirect authorization with the documented body and validates the URL', async () => {
    let url = 'https://auth.enablebanking.com/ais/start?sessionid=abc'
    const { client: eb, calls } = client(() =>
      json({ url, authorization_id: '11111111-2222-4333-8444-555555555555', psu_id_hash: 'h' }),
    )
    const input = {
      aspsp: { name: 'Banca Sintetica', country: 'IT' },
      state: 'state-token_123',
      redirectUrl: 'https://app.lilleri.example/callback/eb',
      validUntil: '2027-04-03T09:50:00.000Z',
      language: 'it' as const,
      psuType: 'personal' as const,
    }
    expect(await eb.startAuthorization(input)).toEqual({
      url,
      authorizationId: '11111111-2222-4333-8444-555555555555',
    })
    expect(calls[0]?.method).toBe('POST')
    expect(calls[0]?.url.pathname).toBe('/auth')
    expect(calls[0]?.headers.get('content-type')).toBe('application/json')
    expect(calls[0]?.body).toEqual({
      access: { valid_until: '2027-04-03T09:50:00.000+00:00', balances: true, transactions: true },
      aspsp: { name: 'Banca Sintetica', country: 'IT' },
      state: 'state-token_123',
      redirect_url: 'https://app.lilleri.example/callback/eb',
      psu_type: 'personal',
      language: 'it',
    })
    url = 'https://tilisy.enablebanking.com/start'
    expect((await eb.startAuthorization(input)).url).toBe(url)
    for (const rejected of [
      'http://auth.enablebanking.com/ais/start',
      'https://auth.enablebanking.com.evil.example/',
      'https://enablebanking.com.evil.example/',
      'https://evil.example/?next=auth.enablebanking.com',
      'https://user:pw@auth.enablebanking.com/',
      'https://auth.enablebanking.com:8443/',
      'https://enablebanking.com/',
      'not a url',
    ]) {
      url = rejected
      expect((await failure(eb.startAuthorization(input))).code).toBe('invalid_response')
    }
    const before = calls.length
    for (const bad of [
      { ...input, redirectUrl: 'http://app.lilleri.example/cb' },
      { ...input, state: '' },
      { ...input, validUntil: '2026-10-01T00:00:00Z' },
      { ...input, aspsp: { name: 'Banca', country: 'it' } },
    ])
      expect((await failure(eb.startAuthorization(bad))).code).toBe('configuration')
    expect(calls).toHaveLength(before)
  })

  it('exchanges a callback code for a session without retaining holder data', async () => {
    const { client: eb, calls } = client(() =>
      json({
        session_id: SESSION_ID,
        accounts: [DETAILS[UID_CURRENT], DETAILS[UID_CARD]],
        aspsp: { name: 'Banca Sintetica', country: 'IT' },
        psu_type: 'personal',
        access: { valid_until: '2027-04-03T09:50:00.000000+00:00', balances: true },
      }),
    )
    const session = await eb.createSession('code-123')
    expect(calls[0]?.body).toEqual({ code: 'code-123' })
    expect(session).toMatchObject({
      sessionId: SESSION_ID,
      aspsp: { name: 'Banca Sintetica', country: 'IT' },
      validUntil: '2027-04-03T09:50:00.000Z',
    })
    expect(session.accounts.map((item) => item.identification_hash)).toEqual([
      'hash-current',
      'hash-card',
    ])
    expect(JSON.stringify(session)).not.toContain('Mario Rossi')
    expect(JSON.stringify(session)).not.toContain('Firenze')
    for (const error of [
      'EXPIRED_AUTHORIZATION_CODE',
      'WRONG_AUTHORIZATION_CODE',
      'ALREADY_AUTHORIZED',
    ]) {
      const rejected = client(() => json({ ...SECRET_BODY, code: 400, error }, 400)).client
      const result = await failure(rejected.createSession('code-123'))
      expect([result.code, result.providerError]).toEqual(['invalid_callback', error])
    }
    expect((await failure(eb.createSession('bad code'))).code).toBe('invalid_callback')
  })

  it.each([
    [404, 'SESSION_DOES_NOT_EXIST'],
    [422, 'CLOSED_SESSION'],
    [422, 'REVOKED_SESSION'],
    [401, 'EXPIRED_SESSION'],
  ])('treats DELETE %i %s as an already closed session', async (status, error) => {
    const { client: eb, calls } = client(() => json({ ...SECRET_BODY, error }, status))
    await expect(eb.deleteSession(SESSION_ID)).resolves.toBeUndefined()
    expect(pathCalls(calls)).toEqual([`DELETE /sessions/${SESSION_ID}`])
  })

  it('deletes sessions and surfaces other delete failures categorically', async () => {
    const ok = client(() => json({ message: 'OK' }))
    await expect(ok.client.deleteSession(SESSION_ID)).resolves.toBeUndefined()
    const down = client(() => json({ error: 'ASPSP_ERROR' }, 500)).client
    expect((await failure(down.deleteSession(SESSION_ID))).code).toBe('transient')
    const denied = client(() => json({ error: 'UNAUTHORIZED_ACCESS' }, 401)).client
    expect((await failure(denied.deleteSession(SESSION_ID))).code).toBe('configuration')
  })

  it.each([
    [401, 'EXPIRED_SESSION', 'reconsent_required'],
    [401, 'REVOKED_SESSION', 'reconsent_required'],
    [422, 'CLOSED_SESSION', 'reconsent_required'],
    [403, 'ACCESS_DENIED', 'reconsent_required'],
    [422, 'ASPSP_PSU_ACTION_REQUIRED', 'reconsent_required'],
    [422, 'WRONG_SESSION_STATUS', 'reconsent_required'],
    [429, 'ASPSP_RATE_LIMIT_EXCEEDED', 'rate_limited'],
    [429, null, 'rate_limited'],
    [500, 'ASPSP_ERROR', 'transient'],
    [408, 'ASPSP_TIMEOUT', 'transient'],
    [408, null, 'transient'],
    [503, null, 'transient'],
    [404, 'ACCOUNT_DOES_NOT_EXIST', 'account_unavailable'],
    [422, 'ASPSP_ACCOUNT_NOT_ACCESSIBLE', 'account_unavailable'],
    [400, 'INVALID_ACCOUNT_ID', 'account_unavailable'],
    [401, 'UNAUTHORIZED_ACCESS', 'configuration'],
    [403, 'INVALID_HOST', 'configuration'],
    [403, 'UNAUTHORIZED_IP', 'configuration'],
    [400, 'REDIRECT_URI_NOT_ALLOWED', 'configuration'],
    [422, 'WRONG_REQUEST_PARAMETERS', 'configuration'],
    [400, 'PSU_HEADER_NOT_PROVIDED', 'configuration'],
    [400, 'PSU_HEADER_INVALID', 'configuration'],
    [422, 'WRONG_ASPSP_PROVIDED', 'configuration'],
    [401, null, 'configuration'],
    [404, 'SESSION_DOES_NOT_EXIST', 'not_found'],
    [400, 'EXPIRED_AUTHORIZATION_CODE', 'invalid_callback'],
    [418, null, 'invalid_response'],
  ] as const)(
    'classifies HTTP %i %s as %s without leaking the body',
    async (status, error, code) => {
      const { client: eb } = client(() =>
        json({ ...SECRET_BODY, code: status, ...(error === null ? {} : { error }) }, status),
      )
      const result = await failure(eb.balances(UID_CURRENT))
      expect(result.code).toBe(code)
      expect(result.providerError).toBe(error)
      expect(result.message).toBe(code)
      for (const leaked of ['Mario', 'IT60', 'secret', 'https://', 'evil'])
        expect(`${result.message} ${String(result.stack)}`).not.toContain(leaked)
      expect(result.retryAfterSeconds).toBe(code === 'rate_limited' ? 21_600 : null)
    },
  )

  it('keeps only documented error enums and sane Retry-After hints', async () => {
    const unknown = client(() => json({ error: 'Mario Rossi was here' }, 400)).client
    expect(await failure(unknown.balances(UID_CURRENT))).toMatchObject({
      code: 'configuration',
      providerError: null,
    })
    for (const [header, expected] of [
      ['120', 120],
      ['Mon, 05 Oct 2026 10:05:00 GMT', 300],
      ['0', 21_600],
      ['999999', 21_600],
      ['soon', 21_600],
    ] as const) {
      const limited = client(() =>
        json({ error: 'ASPSP_RATE_LIMIT_EXCEEDED' }, 429, { 'retry-after': header }),
      )
      expect((await failure(limited.client.balances(UID_CURRENT))).retryAfterSeconds).toBe(expected)
    }
  })

  it('maps transport failures, timeouts and malformed bodies categorically', async () => {
    const offline = client(() => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.1 secret')))
    const offlineError = await failure(offline.client.balances(UID_CURRENT))
    expect([offlineError.code, offlineError.message]).toEqual(['transient', 'transient'])
    const hanging = client(
      (call) =>
        new Promise<Response>((_resolve, reject) =>
          call.init?.signal?.addEventListener('abort', () => reject(call.init?.signal?.reason)),
        ),
      { now: NOW },
      5,
    )
    expect((await failure(hanging.client.balances(UID_CURRENT))).code).toBe('transient')
    for (const response of [
      () => new Response('{not json', { headers: { 'content-type': 'application/json' } }),
      () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
      () =>
        json({
          balances: [{ balance_amount: { currency: 'EUR', amount: 12.3 }, balance_type: 'CLBD' }],
        }),
      () => json({ balances: 'none' }),
    ]) {
      const broken = client(response).client
      expect((await failure(broken.balances(UID_CURRENT))).code).toBe('invalid_response')
    }
  })

  it('parses transaction pages, continuation keys and rejects invalid queries', async () => {
    const { client: eb, calls } = client(() => json({ ...CURRENT_PAGES[''], continuation_key: '' }))
    const page = await eb.transactions(UID_CURRENT, {
      dateFrom: HISTORY_FROM,
      dateTo: '2026-10-05',
      continuationKey: 'key-0',
      strategy: 'longest',
    })
    expect(Object.fromEntries(calls[0]?.url.searchParams ?? [])).toEqual({
      date_from: HISTORY_FROM,
      date_to: '2026-10-05',
      continuation_key: 'key-0',
      strategy: 'longest',
    })
    expect(page.continuationKey).toBeNull()
    expect(page.transactions).toHaveLength(2)
    expect(JSON.stringify(page.transactions)).not.toContain('unstable-1')
    expect(JSON.stringify(page.transactions)).not.toContain('IT02A0301503200000003517230')
    await expect(eb.transactions(UID_CURRENT, { dateFrom: '2026-02-30' })).rejects.toThrow(
      'configuration',
    )
  })

  it.each([
    ['an invalid application id', { applicationId: 'not/a uuid' }],
    [
      'garbage key material',
      { privateKeyPem: '-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----' },
    ],
    [
      'an ed25519 key',
      {
        privateKeyPem: generateKeyPairSync('ed25519')
          .privateKey.export({ type: 'pkcs8', format: 'pem' })
          .toString(),
      },
    ],
    [
      'a 1024-bit RSA key',
      {
        privateKeyPem: generateKeyPairSync('rsa', { modulusLength: 1024 })
          .privateKey.export({ type: 'pkcs1', format: 'pem' })
          .toString(),
      },
    ],
    [
      'a public key',
      { privateKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString() },
    ],
    ['an excessive timeout', { timeoutMs: 60_001 }],
  ])('rejects %s at construction without echoing secrets', (_label, overrides) => {
    let error: unknown
    try {
      new EnableBankingClient({
        applicationId: APPLICATION_ID,
        privateKeyPem: PRIVATE_KEY_PEM,
        ...overrides,
      })
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(EnableBankingFailure)
    expect((error as EnableBankingFailure).message).toBe('configuration')
  })

  it('accepts PKCS#1 RSA keys', () => {
    const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
    expect(
      () => new EnableBankingClient({ applicationId: APPLICATION_ID, privateKeyPem: pkcs1 }),
    ).not.toThrow()
  })
})

describe('Enable Banking mapping helpers', () => {
  it('encodes institution identities as a strict, reversible country:name pair', () => {
    expect(enableBankingInstitutionId({ name: 'Intesa Sanpaolo', country: 'IT' })).toBe(
      'IT:Intesa Sanpaolo',
    )
    for (const name of ['Intesa Sanpaolo', 'BPER Banca: Carte', 'Crédit Agricole Italia'])
      expect(
        parseEnableBankingInstitutionId(enableBankingInstitutionId({ name, country: 'IT' })),
      ).toEqual({ name, country: 'IT' })
    for (const aspsp of [
      { name: 'Banca', country: 'it' },
      { name: 'Banca', country: 'ITA' },
      { name: '', country: 'IT' },
      { name: '   ', country: 'IT' },
      { name: `Banca${String.fromCharCode(10)}Due`, country: 'IT' },
      { name: 'x'.repeat(201), country: 'IT' },
    ])
      expect(() => enableBankingInstitutionId(aspsp)).toThrow(EnableBankingFailure)
    for (const id of ['IT', 'IT:', 'it:Banca', 'ITBanca', ':Banca', `IT:${'x'.repeat(198)}`])
      expect(() => parseEnableBankingInstitutionId(id)).toThrow(EnableBankingFailure)
  })

  it('maps importable consumer accounts with masked names and the selected balance', () => {
    expect(
      mapEnableBankingAccount(
        account({
          details: '  Conto   corrente ',
          account_id: { iban: 'IT60 X054 2811 1010 0000 0123 456' },
        }),
        'Banca Sintetica',
        '+1234.5',
      ),
    ).toEqual({
      id: 'hash-current',
      name: `Conto corrente ${BULLETS}3456`,
      institutionName: 'Banca Sintetica',
      kind: 'current',
      currency: 'EUR',
      balance: '1234.50',
    })
    const kinds = ['CACC', 'CASH', 'CARD', 'SVGS'].map(
      (type) => mapEnableBankingAccount(account({ cash_account_type: type }), 'B', '0')?.kind,
    )
    expect(kinds).toEqual(['current', 'current', 'card', 'savings'])
    for (const skipped of [
      account({ cash_account_type: 'LOAN' }),
      account({ cash_account_type: 'OTHR' }),
      account({ usage: 'ORGA' }),
      account({ currency: 'XAU' }),
    ])
      expect(mapEnableBankingAccount(skipped, 'B', '0')).toBeNull()
    expect(mapEnableBankingAccount(account(), 'B', '12,30')).toBeNull()
    expect(mapEnableBankingAccount(account({ product: 'Carta Oro' }), 'B', '0')?.name).toBe(
      'Carta Oro',
    )
    expect(mapEnableBankingAccount(account({ details: ' ', product: null }), 'B', '0')?.name).toBe(
      'Conto',
    )
    const hash = 'h'.repeat(300)
    const long = mapEnableBankingAccount(
      account({
        identification_hash: hash,
        details: 'd'.repeat(500),
        account_id: { iban: 'IT60X0542811101000000123456' },
      }),
      'B',
      '0',
    )
    expect(long?.id).toBe(`ebh_${createHash('sha256').update(hash).digest('hex')}`)
    expect(long?.name.length).toBe(200)
    expect(long?.name.endsWith(`${BULLETS}3456`)).toBe(true)
  })

  it('selects balances by documented preference and normalizes amounts', () => {
    const order = ['CLBD', 'ITBD', 'XPCD', 'OPBD', 'PRCD', 'ITAV', 'CLAV', 'OPAV', 'FWAV']
    for (let index = 0; index < order.length; index++) {
      const candidates = order
        .slice(index)
        .reverse()
        .map((type) => balance(type, '1.00'))
      expect(selectEnableBankingBalance([balance('INFO', '9.00'), ...candidates])).toMatchObject({
        type: index < 5 ? 'booked' : 'available',
      })
    }
    expect(
      selectEnableBankingBalance([balance('ITAV', '2.00'), balance('XPCD', '3.00')])?.amount,
    ).toBe('3.00')
    expect(selectEnableBankingBalance([balance('INFO', '+1 234.5')])).toEqual({
      amount: '1234.50',
      currency: 'EUR',
      type: 'unknown',
      referenceDate: null,
    })
    expect(selectEnableBankingBalance([balance('CLBD', '-0.00')])?.amount).toBe('0.00')
    expect(
      selectEnableBankingBalance([
        balance('CLBD', '12,30'),
        balance('CLBD', '1e3'),
        balance('CLBD', '12.345'),
        balance('CLBD', '5.00', 'XAU'),
        balance('ITAV', '-7.5'),
      ]),
    ).toMatchObject({ amount: '-7.50', type: 'available' })
    expect(
      selectEnableBankingBalance([balance('CLBD', '1.00', 'USD'), balance('ITAV', '2.00')], 'EUR')
        ?.amount,
    ).toBe('2.00')
    expect(
      selectEnableBankingBalance([
        {
          ...balance('CLBD', '1.00'),
          reference_date: '2026-10-04',
          last_change_date_time: '2026-10-05T08:00:00Z',
        },
      ])?.referenceDate,
    ).toBe('2026-10-04')
    expect(
      selectEnableBankingBalance([
        {
          ...balance('CLBD', '1.00'),
          reference_date: 'yesterday',
          last_change_date_time: '2026-10-05T08:00:00+02:00',
        },
      ])?.referenceDate,
    ).toBe('2026-10-05')
    expect(
      selectEnableBankingBalance([{ ...balance('CLBD', '1.00'), last_change_date_time: 'today' }])
        ?.referenceDate,
    ).toBeNull()
    expect(selectEnableBankingBalance([])).toBeNull()
  })

  it('signs amounts from the indicator and tolerates surrounding spaces and a plus sign', () => {
    const amount = (value: string, credit_debit_indicator = 'DBIT') =>
      mapEnableBankingTransaction(
        tx({ transaction_amount: { currency: 'EUR', amount: value }, credit_debit_indicator }),
        'acc',
        'EUR',
      )?.amount
    expect(amount('84.30')).toBe('-84.30')
    expect(amount('2350', 'CRDT')).toBe('2350.00')
    expect(amount('+12.30')).toBe('-12.30')
    expect(amount(' 7.5 ', 'CRDT')).toBe('7.50')
    expect(amount('-12.30', 'CRDT')).toBe('12.30')
    expect(amount('-0.00')).toBe('0.00')
    expect(amount('0', 'CRDT')).toBe('0.00')
    for (const invalid of ['12,30', '1e2', '', '12.345', '1 000.00', '--1', '.5'])
      expect(amount(invalid)).toBeUndefined()
    expect(amount('1.00', 'BOTH')).toBeUndefined()
    expect(
      mapEnableBankingTransaction(
        tx({ transaction_amount: { currency: 'JPY', amount: '1500' } }),
        'acc',
        'JPY',
      )?.amount,
    ).toBe('-1500')
  })

  it('derives ids only from entry_reference and never from transaction_id', () => {
    const id = (entry_reference: string | null) =>
      mapEnableBankingTransaction(
        { ...tx({ entry_reference }), transaction_id: 'unstable' } as EnableBankingTransaction,
        'acc',
        'EUR',
      )?.id
    expect(id(' REF-1 ')).toBe('REF-1')
    expect(id(null)).toBeNull()
    expect(id('   ')).toBeNull()
    const long = 'r'.repeat(250)
    expect(id(long)).toBe(`eref_${createHash('sha256').update(long).digest('hex')}`)
    expect(id('no-id:v1:abc')).toBe(
      `eref_${createHash('sha256').update('no-id:v1:abc').digest('hex')}`,
    )
    expect(id('r'.repeat(200))).toBe('r'.repeat(200))
  })

  it('maps statuses and dates, skipping unsettled, foreign-currency and undated records', () => {
    const map = (overrides: Partial<EnableBankingTransaction>) =>
      mapEnableBankingTransaction(tx(overrides), 'acc', 'EUR')
    for (const status of ['CNCL', 'RJCT', 'SCHD', 'OTHR', 'NEW']) expect(map({ status })).toBeNull()
    expect(map({ transaction_amount: { currency: 'USD', amount: '1.00' } })).toBeNull()
    expect(map({ booking_date: null })).toBeNull()
    expect(map({ booking_date: '2026-02-30' })).toBeNull()
    expect(map({ booking_date: '2026-02-30', value_date: '2026-03-01' })?.bookedOn).toBe(
      '2026-03-01',
    )
    expect(map({ booking_date: null, transaction_date: '2026-09-01' })).toMatchObject({
      bookedOn: '2026-09-01',
      authorizedOn: '2026-09-01',
    })
    for (const status of ['PDNG', 'HOLD']) {
      const pending = map({ status, booking_date: '2026-10-01', transaction_date: '2026-10-04' })
      expect(pending?.status).toBe('pending')
      expect(pending?.bookedOn).toBeUndefined()
      expect(pending?.authorizedOn).toBe('2026-10-04')
    }
    expect(map({ status: 'PDNG', booking_date: null })).toMatchObject({ status: 'pending' })
    const booked = map({
      creditor: { name: '  COOP  ' },
      debtor: { name: 'Mario Rossi' },
      reference_number: 'RF18539007547034',
      remittance_information: ['POS'],
    })
    expect(booked).toEqual({
      id: 'REF-1',
      accountId: 'acc',
      amount: '-84.30',
      currency: 'EUR',
      description: 'POS',
      status: 'booked',
      merchantName: 'COOP',
      bookedOn: '2026-09-28',
      reference: 'RF18539007547034',
    })
    expect(
      map({ credit_debit_indicator: 'CRDT', creditor: { name: 'Me' }, debtor: { name: 'Payer' } })
        ?.merchantName,
    ).toBe('Payer')
    expect(Object.keys(map({ creditor: { name: '   ' } }) ?? {})).not.toContain('merchantName')
    expect(map({ creditor: { name: 'm'.repeat(600) } })?.merchantName).toHaveLength(500)
    expect(map({ reference_number: 'f'.repeat(600) })?.reference).toHaveLength(500)
  })

  it('falls back through description sources and strips control characters', () => {
    const description = (overrides: Partial<EnableBankingTransaction>) =>
      mapEnableBankingTransaction(tx(overrides), 'acc', 'EUR')?.description
    const bell = String.fromCharCode(7)
    const rtl = String.fromCharCode(0x202e)
    expect(description({ remittance_information: ['PAGAMENTO POS', ' COOP\tFIRENZE '] })).toBe(
      'PAGAMENTO POS COOP FIRENZE',
    )
    expect(description({ remittance_information: [`COOP${bell}${rtl}FIRENZE\r\n`] })).toBe(
      'COOP FIRENZE',
    )
    expect(description({ remittance_information: [' ', ''], creditor: { name: 'Libreria' } })).toBe(
      'Libreria',
    )
    expect(
      description({ bank_transaction_code: { description: 'Commissioni' }, debtor: { name: 'x' } }),
    ).toBe('Commissioni')
    expect(description({})).toBe('Movimento')
    expect(description({ remittance_information: [bell] })).toBe('Movimento')
    expect(description({ remittance_information: ['d'.repeat(3000)] })).toHaveLength(2000)
    const record = mapEnableBankingTransaction(tx(), 'acc', 'EUR') ?? {}
    for (const key of ['kind', 'source', 'fxEvidence'])
      expect(Object.keys(record)).not.toContain(key)
  })
})

describe('Enable Banking provider', () => {
  it('declares live-capable metadata accepted by the contract validators', () => {
    const { provider } = setup()
    expect(provider.capabilities()).toEqual({
      accountInformation: true,
      payments: false,
      synthetic: false,
      grantSpecificRevocation: true,
    })
    expect(validateSyntheticSyncMetadata(provider.syncMetadata())).toEqual({
      providerId: 'enable-banking',
      environment: 'sandbox',
      evidenceReference: ENABLE_BANKING_EVIDENCE.reference,
      userPresent: 'supported',
      unattendedBudget: {
        requests: 4,
        windowSeconds: 86_400,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: ENABLE_BANKING_EVIDENCE.rateLimits,
      },
      maxWindowDays: 14,
      maxPageSize: 200,
      maxCursorBytes: 64,
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
    })
    const live = setup(undefined, { environment: 'live' }).provider
    expect(validateSyntheticSyncMetadata(live.syncMetadata()).environment).toBe('live')
    expect(validateDiscoveryMetadata(live.discoveryMetadata())).toMatchObject({
      environment: 'live',
      coverageVersion: 'enable-banking-2026-10-05',
      refresh: {
        userPresent: 'supported',
        unattendedBudget: { requests: 4, windowSeconds: 86_400 },
      },
      renewal: 'supported',
    })
  })

  it.each([
    ['environment', { environment: 'production' as 'live' }],
    ['countries', { countries: ['it'] }],
    ['empty countries', { countries: [] }],
    ['history', { initialHistoryDays: 731 }],
    ['history floor', { initialHistoryDays: 0 }],
    ['transactions cap', { maxTransactionsPerAccount: 0 }],
    ['snapshot ttl', { snapshotTtlMs: 1 }],
    ['consent days', { consentDays: 0 }],
  ])('rejects invalid %s options', (_label, options) => {
    expect(() => setup(undefined, options)).toThrow('configuration')
  })

  it('lists connectable, non-beta ASPSPs with unknown account kinds and caches per country', async () => {
    const { provider, calls, clock } = setup()
    const metadata = provider.discoveryMetadata()
    const page = validateInstitutionPage(await provider.listInstitutions(), metadata)
    expect(page.nextCursor).toBeNull()
    expect(page.institutions).toEqual([
      {
        id: 'IT:Banca Breve',
        providerId: 'enable-banking',
        name: 'Banca Breve',
        countryCode: 'IT',
        accountTypes: [],
      },
      {
        id: 'IT:Banca Sintetica',
        providerId: 'enable-banking',
        name: 'Banca Sintetica',
        countryCode: 'IT',
        accountTypes: [],
      },
    ])
    await provider.listInstitutions()
    expect(calls).toHaveLength(1)
    clock.now += 3_600_001
    await provider.listInstitutions()
    expect(calls).toHaveLength(2)
    const beta = setup(undefined, { includeBeta: true }).provider
    expect((await beta.listInstitutions()).institutions.map((item) => item.id)).toContain(
      'IT:Banca Beta',
    )
    await expect(provider.listInstitutions('o:0')).rejects.toThrow('configuration')
    await expect(provider.listInstitutions('o:500')).rejects.toThrow('configuration')
  })

  it('pages large catalogues within the declared discovery budget', async () => {
    const many = Array.from({ length: 1203 }, (_, index) => ({
      ...ASPSPS[0],
      name: `BCC ${String(index).padStart(4, '0')}`,
    }))
    const { provider, calls } = setup((call) =>
      call.url.pathname === '/aspsps' ? json({ aspsps: many }) : undefined,
    )
    const institutions = await discoverInstitutions(provider)
    expect(institutions).toHaveLength(1203)
    expect(new Set(institutions.map((item) => item.id)).size).toBe(1203)
    expect(calls).toHaveLength(1)
  })

  it('exposes picker details including beta flags, consent days and default approach', async () => {
    const { provider } = setup()
    expect(await provider.institutions('IT')).toEqual([
      {
        id: 'IT:Banca Sintetica',
        name: 'Banca Sintetica',
        country: 'IT',
        beta: false,
        maximumConsentDays: 180,
        approach: 'REDIRECT',
      },
      {
        id: 'IT:Banca Beta',
        name: 'Banca Beta',
        country: 'IT',
        beta: true,
        maximumConsentDays: 180,
        approach: 'REDIRECT',
      },
      {
        id: 'IT:Banca Embedded',
        name: 'Banca Embedded',
        country: 'IT',
        beta: false,
        maximumConsentDays: 180,
        approach: 'EMBEDDED',
      },
      {
        id: 'IT:Banca Breve',
        name: 'Banca Breve',
        country: 'IT',
        beta: false,
        maximumConsentDays: 90,
        approach: 'DECOUPLED',
      },
    ])
  })

  it('starts authorizations bounded by the ASPSP consent validity minus a safety margin', async () => {
    const authUrl = 'https://auth.enablebanking.com/ais/start?sessionid=s'
    const override: Override = (call) =>
      call.url.pathname === '/auth'
        ? json({ url: authUrl, authorization_id: '11111111-2222-4333-8444-555555555555' })
        : undefined
    const { provider, calls } = setup(override)
    const input = {
      institutionId: 'IT:Banca Sintetica',
      state: 'opaque-state',
      redirectUrl: 'https://app.lilleri.example/callback/eb',
      language: 'it' as const,
    }
    expect(await provider.startAuthorization(input)).toEqual({
      url: authUrl,
      authorizationId: '11111111-2222-4333-8444-555555555555',
      validUntil: '2027-04-03T09:50:00.000Z',
    })
    const body = calls.find((call) => call.url.pathname === '/auth')?.body
    expect(body).toMatchObject({
      access: { valid_until: '2027-04-03T09:50:00.000+00:00', balances: true, transactions: true },
      aspsp: { name: 'Banca Sintetica', country: 'IT' },
      psu_type: 'personal',
      language: 'it',
    })
    expect(
      (await provider.startAuthorization({ ...input, institutionId: 'IT:Banca Breve' })).validUntil,
    ).toBe('2027-01-03T09:50:00.000Z')
    const shorter = setup(override, { consentDays: 30 }).provider
    expect((await shorter.startAuthorization(input)).validUntil).toBe('2026-11-04T09:50:00.000Z')
    for (const [institutionId, code] of [
      ['IT:Banca Embedded', 'configuration'],
      ['IT:Banca Beta', 'configuration'],
      ['IT:Banca Inesistente', 'not_found'],
      ['FR:Banque', 'configuration'],
      ['Banca Sintetica', 'configuration'],
    ] as const)
      expect((await failure(provider.startAuthorization({ ...input, institutionId }))).code).toBe(
        code,
      )
  })

  it('completes authorization with importable accounts only and closes unusable sessions', async () => {
    const created = (accounts: unknown[]) => ({
      session_id: SESSION_ID,
      accounts,
      aspsp: { name: 'Banca Sintetica', country: 'IT' },
      psu_type: 'personal',
      access: { valid_until: '2027-04-03T09:50:00.000000+00:00' },
    })
    let accounts: unknown[] = [
      DETAILS[UID_CURRENT],
      DETAILS[UID_CARD],
      DETAILS[UID_LOAN],
      { ...(DETAILS[UID_CURRENT] as object), uid: null, identification_hash: 'hash-blocked' },
      { ...(DETAILS[UID_CURRENT] as object), identification_hash: 'hash-orga', usage: 'ORGA' },
    ]
    const { provider, calls } = setup((call) =>
      call.url.pathname === '/sessions' ? json(created(accounts)) : undefined,
    )
    expect(await provider.completeAuthorization('code-1')).toEqual({
      sessionId: SESSION_ID,
      institutionId: 'IT:Banca Sintetica',
      validUntil: '2027-04-03T09:50:00.000Z',
      accounts: [
        {
          id: 'hash-current',
          name: `Conto corrente ${BULLETS}3456`,
          kind: 'current',
          currency: 'EUR',
        },
        { id: 'hash-card', name: 'Carta Oro', kind: 'card', currency: 'EUR' },
      ],
    })
    expect(pathCalls(calls)).toEqual(['POST /sessions'])
    accounts = [DETAILS[UID_LOAN]]
    expect((await failure(provider.completeAuthorization('code-2'))).code).toBe('invalid_callback')
    expect(pathCalls(calls).slice(1)).toEqual(['POST /sessions', `DELETE /sessions/${SESSION_ID}`])
  })

  it('opens one bank pass per account with continuation pagination and API-valid output', async () => {
    const { provider, calls } = setup()
    const snapshot = await provider.openSync(context, 'unattended', '2030-01-01T00:00:00.000Z')
    expect(pathCalls(calls)).toEqual([
      `GET /sessions/${SESSION_ID}`,
      `GET /accounts/${UID_CURRENT}/details`,
      `GET /accounts/${UID_CURRENT}/balances`,
      `GET /accounts/${UID_CURRENT}/transactions`,
      `GET /accounts/${UID_CURRENT}/transactions`,
      `GET /accounts/${UID_CURRENT}/transactions`,
      `GET /accounts/${UID_CARD}/details`,
      `GET /accounts/${UID_CARD}/balances`,
      `GET /accounts/${UID_CARD}/transactions`,
      `GET /accounts/${UID_LOAN}/details`,
    ])
    const queries = calls
      .filter((call) => call.url.pathname.endsWith('/transactions'))
      .map((call) => Object.fromEntries(call.url.searchParams))
    expect(queries).toEqual([
      { date_from: HISTORY_FROM, strategy: 'default' },
      { date_from: HISTORY_FROM, strategy: 'default', continuation_key: 'key-1' },
      { date_from: HISTORY_FROM, strategy: 'default', continuation_key: 'key-2' },
      { date_from: HISTORY_FROM, strategy: 'default' },
    ])
    for (const call of calls) expect(call.headers.has('psu-ip-address')).toBe(false)
    assertApiSnapshot(snapshot, new Date(NOW).toISOString())
    expect(snapshot.observedAt).toBe('2026-10-05T10:00:00.000Z')
    expect(snapshot.accounts).toEqual([
      {
        id: 'hash-current',
        name: `Conto corrente ${BULLETS}3456`,
        institutionName: 'Banca Sintetica',
        kind: 'current',
        currency: 'EUR',
        balance: '1234.56',
      },
      {
        id: 'hash-card',
        name: 'Carta Oro',
        institutionName: 'Banca Sintetica',
        kind: 'card',
        currency: 'EUR',
        balance: '-185.00',
      },
    ])
    expect(snapshot.historyFrom).toEqual({
      'hash-current': HISTORY_FROM,
      'hash-card': HISTORY_FROM,
    })
    expect(snapshot.balances).toEqual([
      {
        accountId: 'hash-current',
        currency: 'EUR',
        amount: '1234.56',
        type: 'booked',
        referenceDate: '2026-10-04',
        opening: null,
      },
      {
        accountId: 'hash-card',
        currency: 'EUR',
        amount: '-185.00',
        type: 'booked',
        referenceDate: '2026-10-05',
        opening: null,
      },
    ])
    expect(provider.snapshotDiagnostics(snapshot.snapshotId)).toEqual({
      accounts: 2,
      records: 6,
      skipped: {
        cancelled: 1,
        rejected: 0,
        scheduled: 0,
        unsupported_status: 0,
        currency_mismatch: 1,
        invalid_direction: 0,
        invalid_amount: 0,
        missing_date: 0,
      },
    })
    const bankCalls = calls.length
    const records = await drain(provider, snapshot, '2026-10-05')
    expect(calls).toHaveLength(bankCalls)
    expect(
      records.map((record) => [record.accountId, record.id, record.amount, record.status]),
    ).toEqual([
      ['hash-current', 'E-OLD', '-10.00', 'booked'],
      ['hash-current', 'E-SAL-1', '2350.00', 'booked'],
      ['hash-current', 'E-COOP-1', '-84.30', 'booked'],
      ['hash-current', null, '-19.99', 'booked'],
      ['hash-current', null, '-50.00', 'pending'],
      ['hash-card', 'C-1', '-12.30', 'booked'],
    ])
    expect(JSON.stringify(records)).not.toContain('unstable-1')
    expect(JSON.stringify(records)).not.toContain('Mario Rossi')
  })

  it('serves windows, pending sets and offset cursors from the snapshot only', async () => {
    const { provider, calls, clock } = setup()
    const snapshot = await provider.openSync(context, 'unattended')
    const metadata = provider.syncMetadata()
    const current = snapshot.accounts[0] as ProviderAccount
    const request: SyntheticSyncPageRequest = {
      snapshotId: snapshot.snapshotId,
      accountId: 'hash-current',
      from: '2026-09-22',
      to: '2026-10-05',
      cursor: null,
      pageSize: 2,
      includePending: true,
    }
    const before = calls.length
    const first = await provider.getSyncPage(context, request)
    assertApiPage(first, request, current, metadata)
    expect(first.transactions.map((record) => record.id)).toEqual(['E-SAL-1', 'E-COOP-1'])
    expect(first.nextCursor).toBe('o:2')
    const second = await provider.getSyncPage(context, { ...request, cursor: 'o:2' })
    assertApiPage(second, { ...request, cursor: 'o:2' }, current, metadata)
    expect(second.transactions.map((record) => [record.id, record.status])).toEqual([
      [null, 'booked'],
      [null, 'pending'],
    ])
    expect(second.nextCursor).toBeNull()
    expect(second.coverage).toBe('unknown')
    const bookedOnly = await provider.getSyncPage(context, {
      ...request,
      includePending: false,
      pageSize: 200,
    })
    expect(bookedOnly.transactions.every((record) => record.status === 'booked')).toBe(true)
    expect(bookedOnly.transactions).toHaveLength(3)
    const narrow = await provider.getSyncPage(context, {
      ...request,
      from: '2026-09-28',
      to: '2026-09-28',
      includePending: false,
    })
    expect(narrow.transactions.map((record) => record.id)).toEqual(['E-COOP-1'])
    for (const cursor of ['o:0', 'o:01', '2', 'o:-1', 'o:abc', 'o:4', 'o:99999', ''])
      expect((await syncFailure(provider.getSyncPage(context, { ...request, cursor }))).code).toBe(
        'snapshot_expired',
      )
    for (const invalid of [
      { ...request, from: '2026-09-21' },
      { ...request, pageSize: 201 },
      { ...request, pageSize: 0 },
      { ...request, from: '2026-10-06' },
      { ...request, to: '2026-13-01' },
    ])
      expect((await failure(provider.getSyncPage(context, invalid))).code).toBe('configuration')
    expect(
      (await failure(provider.getSyncPage(context, { ...request, accountId: 'other' }))).code,
    ).toBe('not_found')
    for (const [ctx, req] of [
      [context, { ...request, snapshotId: 'ebs_unknown' }],
      [{ ...context, connectionId: 'other-connection' }, request],
      [{ ...context, grantId: '99999999-0000-4000-8000-000000000000' }, request],
    ] as const)
      expect((await syncFailure(provider.getSyncPage(ctx, req))).code).toBe('snapshot_expired')
    expect(calls).toHaveLength(before)
    clock.now += 30 * 60_000
    expect((await syncFailure(provider.getSyncPage(context, request))).code).toBe(
      'snapshot_expired',
    )
    expect(provider.snapshotDiagnostics(snapshot.snapshotId)).toBeNull()
  })

  it('sends PSU headers only for user-present syncs with a live registered presence', async () => {
    const psuCalls = (calls: readonly Call[]) =>
      calls
        .filter((call) => call.url.pathname.startsWith('/accounts/'))
        .map((call) => [call.headers.get('psu-ip-address'), call.headers.get('psu-user-agent')])
    const absent = setup()
    await absent.provider.openSync(context, 'user_present')
    expect(psuCalls(absent.calls).every(([ip, agent]) => ip === null && agent === null)).toBe(true)

    const present = setup()
    present.provider.registerPresence(SESSION_ID, psu)
    await present.provider.openSync(context, 'unattended')
    expect(psuCalls(present.calls).every(([ip]) => ip === null)).toBe(true)
    present.calls.length = 0
    await present.provider.openSync(context, 'user_present')
    expect(psuCalls(present.calls)).toHaveLength(9)
    expect(
      psuCalls(present.calls).every(
        ([ip, agent]) => ip === psu.ipAddress && agent === psu.userAgent,
      ),
    ).toBe(true)
    present.calls.length = 0
    present.clock.now += 10 * 60_000
    await present.provider.openSync(context, 'user_present')
    expect(psuCalls(present.calls).every(([ip]) => ip === null)).toBe(true)

    // Cached ASPSP data: the set required by Banca Sintetica is fully supplied.
    const cached = setup()
    await cached.provider.listInstitutions()
    cached.provider.registerPresence(SESSION_ID, psu)
    await cached.provider.openSync(context, 'user_present')
    expect(psuCalls(cached.calls).every(([ip, agent]) => ip !== null && agent !== null)).toBe(true)

    // Banca Breve requires a header Lilleri never sends, so it gets none rather than a partial set.
    const partial = setup((call) =>
      call.url.pathname === `/sessions/${SESSION_ID}`
        ? json({ ...SESSION_STATUS, aspsp: { name: 'Banca Breve', country: 'IT' } })
        : undefined,
    )
    await partial.provider.listInstitutions()
    partial.provider.registerPresence(SESSION_ID, psu)
    await partial.provider.openSync(context, 'user_present')
    expect(psuCalls(partial.calls).every(([ip, agent]) => ip === null && agent === null)).toBe(true)

    expect(() =>
      present.provider.registerPresence(SESSION_ID, { ...psu, ipAddress: '1.2.3' }),
    ).toThrow('configuration')
    expect(() => present.provider.registerPresence('bad id', psu)).toThrow('configuration')
  })

  it('maps bank throttling and outages to resumable sync failures', async () => {
    const throttled = (headers: Record<string, string>) =>
      setup((call) =>
        call.url.pathname.endsWith('/transactions')
          ? json({ ...SECRET_BODY, error: 'ASPSP_RATE_LIMIT_EXCEEDED' }, 429, headers)
          : undefined,
      ).provider
    const hinted = await syncFailure(
      throttled({ 'retry-after': '120' }).openSync(context, 'unattended'),
    )
    expect([hinted.code, hinted.retryAfterSeconds]).toEqual(['rate_limited', 120])
    const fallback = await syncFailure(throttled({}).openSync(context, 'unattended'))
    expect([fallback.code, fallback.retryAfterSeconds]).toEqual(['rate_limited', 21_600])
    const outage = setup((call) =>
      call.url.pathname.endsWith('/balances') ? json({ error: 'ASPSP_ERROR' }, 500) : undefined,
    ).provider
    expect((await syncFailure(outage.openSync(context, 'unattended'))).code).toBe('unavailable')
    const offline = setup(() => Promise.reject(new Error('socket hang up'))).provider
    expect((await syncFailure(offline.openSync(context, 'unattended'))).code).toBe('unavailable')
    const config = setup(() => json({ error: 'UNAUTHORIZED_ACCESS' }, 401)).provider
    expect((await failure(config.openSync(context, 'unattended'))).code).toBe('configuration')
  })

  it.each([
    ['EXPIRED', () => json({ ...SESSION_STATUS, status: 'EXPIRED' })],
    ['REVOKED', () => json({ ...SESSION_STATUS, status: 'REVOKED' })],
    ['CLOSED', () => json({ ...SESSION_STATUS, status: 'CLOSED' })],
    ['CANCELLED', () => json({ ...SESSION_STATUS, status: 'CANCELLED' })],
    ['INVALID', () => json({ ...SESSION_STATUS, status: 'INVALID' })],
    ['PENDING_AUTHORIZATION', () => json({ ...SESSION_STATUS, status: 'PENDING_AUTHORIZATION' })],
    [
      'a lapsed access window',
      () => json({ ...SESSION_STATUS, access: { valid_until: '2026-10-05T09:59:59Z' } }),
    ],
    ['EXPIRED_SESSION', () => json({ error: 'EXPIRED_SESSION' }, 401)],
    ['SESSION_DOES_NOT_EXIST', () => json({ error: 'SESSION_DOES_NOT_EXIST' }, 404)],
  ])('requires re-consent for %s sessions', async (_label, response) => {
    const { provider, calls } = setup((call) =>
      call.url.pathname === `/sessions/${SESSION_ID}` ? response() : undefined,
    )
    expect((await failure(provider.refreshConnection(context))).code).toBe('reconsent_required')
    expect((await failure(provider.openSync(context, 'user_present'))).code).toBe(
      'reconsent_required',
    )
    expect(calls.every((call) => call.url.pathname === `/sessions/${SESSION_ID}`)).toBe(true)
  })

  it('skips unavailable accounts and fails only when nothing importable remains', async () => {
    const gone = setup((call) =>
      call.url.pathname === `/accounts/${UID_CURRENT}/details`
        ? json({ error: 'ACCOUNT_DOES_NOT_EXIST' }, 404)
        : call.url.pathname === `/accounts/${UID_CARD}/transactions`
          ? json({ error: 'ASPSP_ACCOUNT_NOT_ACCESSIBLE' }, 422)
          : undefined,
    )
    const unavailable = await failure(gone.provider.openSync(context, 'unattended'))
    expect(unavailable.code).toBe('account_unavailable')
    const partial = setup((call) =>
      call.url.pathname === `/accounts/${UID_CURRENT}/details`
        ? json({ error: 'ACCOUNT_DOES_NOT_EXIST' }, 404)
        : undefined,
    )
    const snapshot = await partial.provider.openSync(context, 'unattended')
    expect(snapshot.accounts.map((item) => item.id)).toEqual(['hash-card'])
    expect(pathCalls(partial.calls)).not.toContain(`GET /accounts/${UID_CURRENT}/balances`)
    const noBalance = setup((call) =>
      call.url.pathname === `/accounts/${UID_CARD}/balances`
        ? json({
            balances: [
              { balance_amount: { currency: 'USD', amount: '1.00' }, balance_type: 'CLBD' },
            ],
          })
        : undefined,
    )
    const withoutCard = await noBalance.provider.openSync(context, 'unattended')
    expect(withoutCard.accounts.map((item) => item.id)).toEqual(['hash-current'])
    expect(pathCalls(noBalance.calls)).not.toContain(`GET /accounts/${UID_CARD}/transactions`)
  })

  it('bounds traversal by pages, records and repeated continuation keys', async () => {
    let page = 0
    const endless = setup((call) =>
      call.url.pathname.endsWith('/transactions')
        ? json({ transactions: [], continuation_key: `k-${++page}` })
        : undefined,
    )
    expect((await syncFailure(endless.provider.openSync(context, 'unattended'))).code).toBe(
      'unavailable',
    )
    expect(
      endless.calls.filter((call) => call.url.pathname.endsWith('/transactions')),
    ).toHaveLength(200)
    const capped = setup(undefined, { maxTransactionsPerAccount: 1 })
    expect((await syncFailure(capped.provider.openSync(context, 'unattended'))).code).toBe(
      'unavailable',
    )
    const looping = setup((call) =>
      call.url.pathname.endsWith('/transactions')
        ? json({ transactions: [], continuation_key: 'same' })
        : undefined,
    )
    expect((await failure(looping.provider.openSync(context, 'unattended'))).code).toBe(
      'invalid_response',
    )
  })

  it('falls back once to the longest strategy when the default period is rejected', async () => {
    const { provider, calls } = setup((call) => {
      if (!call.url.pathname.endsWith(`${UID_CURRENT}/transactions`)) return undefined
      if (call.url.searchParams.get('strategy') === 'default')
        return json({ error: 'WRONG_TRANSACTIONS_PERIOD' }, 422)
      return json({ transactions: CURRENT_PAGES['']?.transactions, continuation_key: null })
    })
    const snapshot = await provider.openSync(context, 'unattended')
    expect(
      calls
        .filter((call) => call.url.pathname.endsWith(`${UID_CURRENT}/transactions`))
        .map((call) => Object.fromEntries(call.url.searchParams)),
    ).toEqual([
      { date_from: HISTORY_FROM, strategy: 'default' },
      { date_from: HISTORY_FROM, strategy: 'longest' },
    ])
    expect(snapshot.historyFrom['hash-current']).toBe('2026-09-27')
    assertApiSnapshot(snapshot, new Date(NOW).toISOString())
  })

  it('serves the legacy transaction port from the cached snapshot only', async () => {
    const { provider, calls } = setup()
    expect((await syncFailure(provider.getTransactions(context, 'hash-current'))).code).toBe(
      'snapshot_expired',
    )
    await provider.openSync(context, 'unattended')
    const before = calls.length
    const page = await provider.getTransactions(context, 'hash-current')
    expect(calls).toHaveLength(before)
    expect(page.nextCursor).toBeNull()
    expect(page.transactions).toHaveLength(5)
    const derived = page.transactions.filter((record) => record.id.startsWith('ebfp_'))
    expect(derived).toHaveLength(2)
    expect(new Set(page.transactions.map((record) => record.id)).size).toBe(5)
    expect((await syncFailure(provider.getTransactions(context, 'hash-current', 'o:x'))).code).toBe(
      'snapshot_expired',
    )
  })

  it('lists accounts and balances without reading transactions', async () => {
    const { provider, calls } = setup()
    expect((await provider.getBalances(context)).map((item) => [item.id, item.balance])).toEqual([
      ['hash-current', '1234.56'],
      ['hash-card', '-185.00'],
    ])
    expect(calls.some((call) => call.url.pathname.endsWith('/transactions'))).toBe(false)
  })

  it('revokes idempotently, drops cached data and refuses non-redirect connection flows', async () => {
    let deleted = false
    const { provider, calls } = setup((call) => {
      if (call.method !== 'DELETE') return undefined
      if (deleted) return json({ error: 'SESSION_DOES_NOT_EXIST' }, 404)
      deleted = true
      return json({ message: 'OK' })
    })
    const snapshot = await provider.openSync(context, 'unattended')
    await provider.disconnect(context)
    await provider.disconnect(context)
    expect(pathCalls(calls).filter((call) => call.startsWith('DELETE'))).toHaveLength(2)
    expect(
      (
        await syncFailure(
          provider.getSyncPage(context, {
            snapshotId: snapshot.snapshotId,
            accountId: 'hash-current',
            from: '2026-09-22',
            to: '2026-10-05',
            cursor: null,
            pageSize: 10,
            includePending: true,
          }),
        )
      ).code,
    ).toBe('snapshot_expired')
    expect((await failure(provider.createConnection())).code).toBe('configuration')
    expect((await failure(provider.renewConnection())).code).toBe('configuration')
    const { grantId: _grant, ...withoutGrant } = context
    expect((await failure(provider.openSync(withoutGrant, 'unattended'))).code).toBe(
      'configuration',
    )
    expect((await failure(provider.disconnect({ ...context, grantId: '../x' }))).code).toBe(
      'configuration',
    )
  })
})
