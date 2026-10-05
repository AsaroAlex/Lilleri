import { generateKeyPairSync, verify } from 'node:crypto'
import { inspect } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import {
  EnableBankingPersonalClient,
  EnableBankingPersonalFailure,
  type EnableBankingPersonalOptions,
} from './enable-banking-personal.js'

// Original synthetic wire fixtures; no credentialed network request is made by these tests.
const NOW = Date.parse('2026-10-05T10:00:00Z')
const APP_ID = '93c5d89f-22af-4fd8-aedf-e7c72a6e6e97'
const SESSION_ID = '3f221bc0-58cc-4ab0-8138-84c5acd8625e'
const ACCOUNT_ID = '2d86fe26-37f3-4310-8c6e-2460ee05a93d'
const CALLBACK = 'https://owned.example.invalid/bank-callback'
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const PRIVATE_PEM = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
const application = {
  kid: APP_ID,
  name: 'Original owner application fixture',
  environment: 'PRODUCTION',
  active: true,
  redirect_urls: [CALLBACK, 'http://registered.example.invalid/legacy'],
  countries: ['IT', 'DE'],
  services: ['AIS'],
}
const aspsp = {
  name: 'Original Personal Bank — IT',
  country: 'IT',
  logo: 'https://enablebanking.com/brands/IT/Original/',
  psu_types: ['personal', 'business'],
  maximum_consent_validity: 3600,
  beta: false,
  auth_methods: [
    {
      name: 'personal-web',
      title: 'Web',
      psu_type: 'personal',
      approach: 'REDIRECT',
      hidden_method: false,
      credentials: [{ name: 'userId', required: true }],
    },
    { name: 'business-web', psu_type: 'business', approach: 'REDIRECT', hidden_method: false },
    { name: 'hidden-personal', psu_type: 'personal', approach: 'EMBEDDED', hidden_method: true },
  ],
}
const account = {
  uid: ACCOUNT_ID,
  currency: 'EUR',
  cash_account_type: 'CACC',
  identification_hash: 'original-source-hash',
  identification_hashes: ['original-source-hash'],
  account_id: { iban: 'ORIGINAL-SYNTHETIC-NOT-AN-IBAN' },
  credit_limit: { currency: 'EUR', amount: '999999999999999999.1200' },
  legal_age: null,
  details: 'Source account description',
  account_servicer: { clearing_system_member_id: { member_id: 20368 } },
}
const transaction = {
  transaction_amount: { amount: '000123456789123456789.0012300', currency: 'EUR' },
  credit_debit_indicator: 'DBIT',
  status: 'BOOK',
  booking_date: '2026-10-04',
  transaction_id: null,
  remittance_information: ['Repeated purchase', 'line\nbreak is preserved'],
  note: 'Source note',
}
function response(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8', ...headers },
  })
}
function fixture(
  routes: Record<string, unknown> = {},
  options: Partial<EnableBankingPersonalOptions> = {},
) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const url = new URL(String(input))
    return response(
      Object.hasOwn(routes, url.pathname)
        ? routes[url.pathname]
        : url.pathname === '/application'
          ? application
          : url.pathname === '/aspsps'
            ? { aspsps: [aspsp] }
            : {},
    )
  })
  const client = new EnableBankingPersonalClient({
    applicationId: APP_ID,
    privateKeyPem: PRIVATE_PEM,
    clock: () => NOW,
    fetch,
    ...options,
  })
  return { client, fetch }
}
async function ready(client: EnableBankingPersonalClient) {
  await client.getApplication()
  await client.listASPSPs('IT')
}
async function failure(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    name: 'EnableBankingPersonalFailure',
    code,
    message: code,
  })
}
const start = {
  aspsp: { name: aspsp.name, country: 'IT' },
  state: 'original-private-random-state-value',
  redirectUrl: CALLBACK,
  validUntil: '2026-10-05T10:30:00Z',
}

describe('Enable Banking personal production AIS client with original wire fixtures', () => {
  it('uses the fixed official endpoint and a verifiable one-hour RS256 application JWT', async () => {
    const { client, fetch } = fixture()
    const result = await client.getApplication()
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.enablebanking.com/application')
    expect(init).toMatchObject({ method: 'GET', redirect: 'error' })
    const headers = new Headers(init?.headers)
    const token = headers.get('authorization')?.replace(/^Bearer /u, '') ?? ''
    const [header, body, signature] = token.split('.')
    expect(JSON.parse(Buffer.from(header ?? '', 'base64url').toString())).toEqual({
      typ: 'JWT',
      alg: 'RS256',
      kid: APP_ID,
    })
    expect(JSON.parse(Buffer.from(body ?? '', 'base64url').toString())).toEqual({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: NOW / 1000,
      exp: NOW / 1000 + 3600,
    })
    expect(
      verify(
        'RSA-SHA256',
        Buffer.from(`${header}.${body}`),
        publicKey,
        Buffer.from(signature ?? '', 'base64url'),
      ),
    ).toBe(true)
    expect(result).toEqual({
      kid: APP_ID,
      name: application.name,
      environment: 'PRODUCTION',
      active: true,
      countries: ['IT', 'DE'],
      services: ['AIS'],
      redirectUrls: application.redirect_urls,
    })
    expect(result).not.toHaveProperty('restricted')
    expect(JSON.stringify(client)).toBe('{}')
    expect(inspect(client)).not.toContain(PRIVATE_PEM)
    expect(inspect(client)).not.toContain(APP_ID)
  })

  it('selects exact country, personal PSU and AIS with only visible personal methods', async () => {
    const { client, fetch } = fixture({
      '/aspsps': {
        aspsps: [
          aspsp,
          { ...aspsp, name: 'Original business only', psu_types: ['business'] },
          { ...aspsp, name: 'IT name does not create coverage', country: 'DE' },
          { ...aspsp, name: 'Hidden personal only', auth_methods: [aspsp.auth_methods[2]] },
          { ...aspsp, name: 'Bank default method', auth_methods: [] },
          { ...aspsp, name: 'Original Personal Bank — IT Card' },
        ],
      },
    })
    await client.getApplication()
    const result = await client.listASPSPs('IT')
    expect(fetch.mock.calls[1]?.[0]).toBe(
      'https://api.enablebanking.com/aspsps?country=IT&psu_type=personal&service=AIS',
    )
    expect(result.map((bank) => bank.name)).toEqual([
      aspsp.name,
      'Bank default method',
      'Original Personal Bank — IT Card',
    ])
    expect(result[0]?.authMethods).toEqual([
      { name: 'personal-web', title: 'Web', approach: 'REDIRECT' },
    ])
    expect(result[1]?.authMethods).toEqual([])
    expect(JSON.stringify(result)).not.toContain('credentials')
    expect(JSON.stringify(result)).not.toContain('payments')
  })

  it('requests read-only balances and transactions and emits no banking credential or payment fields', async () => {
    const authorizationUrl = `https://auth.enablebanking.com/ais/start?sessionid=${SESSION_ID}`
    const { client, fetch } = fixture({
      '/auth': {
        authorization_id: SESSION_ID,
        url: authorizationUrl,
        psu_id_hash: 'ignored-source-hash',
      },
    })
    await ready(client)
    const result = await client.startAuthorization({
      ...start,
      authMethod: 'personal-web',
      ...{
        credentials: { userId: 'MUST-NOT-BE-SENT' },
        psu_type: 'business',
        payment: 'MUST-NOT-BE-SENT',
      },
    })
    expect(result).toEqual({ authorizationId: SESSION_ID, url: authorizationUrl })
    const [url, init] = fetch.mock.calls[2] ?? []
    expect(url).toBe('https://api.enablebanking.com/auth')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      access: { balances: true, transactions: true, valid_until: start.validUntil },
      aspsp: start.aspsp,
      state: start.state,
      redirect_url: CALLBACK,
      psu_type: 'personal',
      auth_method: 'personal-web',
    })
    expect(new Headers(init?.headers).get('psu-ip-address')).toBeNull()
    expect(new Headers(init?.headers).get('psu-user-agent')).toBeNull()
  })

  it.each([
    ['active', false, 'application_inactive'],
    ['environment', 'SANDBOX', 'production_required'],
    ['services', ['PIS'], 'ais_unavailable'],
    ['countries', ['DE'], 'ais_unavailable'],
  ])(
    'returns truthful application metadata but gates personal production operations on %s',
    async (key, value, code) => {
      const { client, fetch } = fixture({ '/application': { ...application, [key]: value } })
      const result = await client.getApplication()
      expect(result).toBeDefined()
      await failure(client.listASPSPs('IT'), String(code))
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('requires the verified application and exact discovered bank/method/registered callback', async () => {
    const { client, fetch } = fixture()
    await failure(client.startAuthorization(start), 'configuration')
    await client.getApplication()
    await failure(client.startAuthorization(start), 'unsupported_bank')
    await client.listASPSPs('IT')
    for (const input of [
      { ...start, aspsp: { ...start.aspsp, name: 'Original Personal Bank' } },
      { ...start, authMethod: 'business-web' },
      { ...start, authMethod: 'hidden-personal' },
    ])
      await failure(client.startAuthorization(input), 'unsupported_bank')
    for (const input of [
      { ...start, redirectUrl: 'https://unregistered.example.invalid/callback' },
      { ...start, redirectUrl: 'http://registered.example.invalid/legacy' },
      { ...start, redirectUrl: `${CALLBACK}?preexisting=true` },
      { ...start, redirectUrl: `${CALLBACK}#fragment` },
      { ...start, state: 'short' },
      { ...start, validUntil: '2026-10-05T12:00:00Z' },
      { ...start, validUntil: '2026-10-05T09:59:59Z' },
      { ...start, validUntil: '2026-02-30T10:30:00Z' },
    ])
      await failure(client.startAuthorization(input), 'invalid_request')
    expect(fetch).toHaveBeenCalledTimes(2)
    await client.getApplication()
    await failure(client.startAuthorization(start), 'unsupported_bank')
  })

  it.each([
    'http://auth.enablebanking.com/ais/start',
    'https://auth.enablebanking.com.evil.invalid/ais/start',
    'https://evil.invalid/?next=https://auth.enablebanking.com',
    'https://user:password@auth.enablebanking.com/ais/start',
    'https://auth.enablebanking.com/ais/start#fragment',
    'https://auth.enablebanking.com:444/ais/start',
  ])('rejects an authorization URL outside the exact documented HTTPS origin: %s', async (url) => {
    const { client } = fixture({ '/auth': { authorization_id: SESSION_ID, url } })
    await ready(client)
    await failure(client.startAuthorization(start), 'invalid_contract')
  })

  it('accepts a legitimately registered HTTPS port callback without fetching that callback', async () => {
    const redirect = 'https://localhost:8443/callback'
    const { client, fetch } = fixture({
      '/application': { ...application, redirect_urls: [redirect] },
      '/auth': { authorization_id: SESSION_ID, url: 'https://auth.enablebanking.com/ais/start' },
    })
    await ready(client)
    await client.startAuthorization({ ...start, redirectUrl: redirect })
    expect(
      fetch.mock.calls.every(([url]) => String(url).startsWith('https://api.enablebanking.com/')),
    ).toBe(true)
  })

  it('accepts the explicitly documented legacy authorization origin during the provider migration', async () => {
    const url = 'https://tilisy.enablebanking.com/ais/start?sessionid=original'
    const { client } = fixture({ '/auth': { authorization_id: SESSION_ID, url } })
    await ready(client)
    expect((await client.startAuthorization(start)).url).toBe(url)
  })

  it.each(['?', '#'])(
    'rejects even an empty registered callback query/fragment: %s',
    async (suffix) => {
      const redirectUrl = `${CALLBACK}${suffix}`
      const { client, fetch } = fixture({
        '/application': { ...application, redirect_urls: [redirectUrl] },
      })
      await ready(client)
      await failure(client.startAuthorization({ ...start, redirectUrl }), 'invalid_request')
      expect(fetch).toHaveBeenCalledTimes(2)
    },
  )

  it('exchanges one code, preserves account data and absent/null account UIDs without fabrication', async () => {
    const missingUid = { ...account }
    delete (missingUid as { uid?: string }).uid
    const { client, fetch } = fixture({
      '/sessions': {
        session_id: SESSION_ID,
        accounts: [account, missingUid, { ...account, uid: null }],
        aspsp: start.aspsp,
        psu_type: 'personal',
        access: { valid_until: '2026-10-05T11:00:00.000000+00:00' },
      },
    })
    await client.getApplication()
    const result = await client.exchangeCode('original-private-code')
    expect(result).toMatchObject({
      sessionId: SESSION_ID,
      aspsp: start.aspsp,
      psuType: 'personal',
      validUntil: '2026-10-05T11:00:00.000000+00:00',
    })
    expect(result.accounts).toEqual([account, missingUid, { ...account, uid: null }])
    expect(result.accounts[1]).not.toHaveProperty('uid')
    expect(result.accounts[2]?.uid).toBeNull()
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
      code: 'original-private-code',
    })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('reads session statuses and account UID strings without claiming a live bank consent is active', async () => {
    const { client } = fixture({
      [`/sessions/${SESSION_ID}`]: {
        status: 'REVOKED',
        accounts: [ACCOUNT_ID],
        aspsp: start.aspsp,
        psu_type: 'personal',
        access: { valid_until: '2026-10-05T11:00:00Z' },
      },
    })
    await client.getApplication()
    expect(await client.getSession(SESSION_ID)).toEqual({
      sessionId: SESSION_ID,
      status: 'REVOKED',
      accounts: [ACCOUNT_ID],
      aspsp: start.aspsp,
      psuType: 'personal',
      validUntil: '2026-10-05T11:00:00Z',
    })
  })

  it('closes the exact newly created session once if its remaining response contract is invalid', async () => {
    const { client, fetch } = fixture({
      '/sessions': {
        session_id: SESSION_ID,
        accounts: [{ ...account, currency: null }],
        aspsp: start.aspsp,
        psu_type: 'personal',
        access: { valid_until: '2026-10-05T11:00:00Z' },
      },
      [`/sessions/${SESSION_ID}`]: { message: 'OK' },
    })
    await client.getApplication()
    await failure(client.exchangeCode('original-code'), 'invalid_contract')
    expect(fetch.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['https://api.enablebanking.com/application', 'GET'],
      ['https://api.enablebanking.com/sessions', 'POST'],
      [`https://api.enablebanking.com/sessions/${SESSION_ID}`, 'DELETE'],
    ])
  })

  it('reports unverified cleanup without exposing the created session ID or retrying creation/deletion', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = new URL(String(input)).pathname
      return path === '/application'
        ? response(application)
        : path === '/sessions'
          ? response({
              session_id: SESSION_ID,
              accounts: [],
              aspsp: start.aspsp,
              psu_type: 'business',
              access: { valid_until: '2026-10-05T11:00:00Z' },
            })
          : response({ private_session: SESSION_ID, original_code: 'original-private-code' }, 503)
    })
    const { client } = fixture({}, { fetch })
    await client.getApplication()
    let error: unknown
    try {
      await client.exchangeCode('original-private-code')
    } catch (caught) {
      error = caught
    }
    expect(error).toMatchObject({ code: 'cleanup_unverified' })
    expect(inspect(error)).not.toContain(SESSION_ID)
    expect(inspect(error)).not.toContain('original-private-code')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('reports an unknown exchange outcome when no exact created session identifier can be recovered', async () => {
    for (const value of [{ accounts: [] }, { session_id: 'unusable-private-session-token' }]) {
      const { client, fetch } = fixture({ '/sessions': value })
      await client.getApplication()
      await failure(client.exchangeCode('original-code'), 'exchange_outcome_unknown')
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
    }
    const { client } = fixture(
      {},
      {
        fetch: async (input) =>
          new URL(String(input)).pathname === '/application'
            ? response(application)
            : response({ provider_private_token: 'unobserved' }, 503),
      },
    )
    await client.getApplication()
    await failure(client.exchangeCode('original-code'), 'exchange_outcome_unknown')
  })

  it('returns each balance separately with exact decimal precision and source types, no guessed total', async () => {
    const balances = [
      {
        name: 'Source Booked',
        balance_amount: { currency: 'EUR', amount: '999999999999999999999.1200' },
        balance_type: 'CLBD',
        reference_date: '2026-10-05',
      },
      {
        name: 'Source Available',
        balance_amount: { currency: 'EUR', amount: '-00001.0045000' },
        balance_type: 'ITAV',
        last_change_date_time: '2026-10-05T10:00:00Z',
      },
    ]
    const { client } = fixture({ [`/accounts/${ACCOUNT_ID}/balances`]: { balances } })
    await client.getApplication()
    const result = await client.getBalances(ACCOUNT_ID)
    expect(result).toEqual(balances)
    expect(result).not.toHaveProperty('total')
  })

  it('retains duplicate transactions, absent/null/unstable IDs and exact cursor without normalization', async () => {
    const transactions = [
      transaction,
      transaction,
      { ...transaction, entry_reference: null, transaction_id: 'unstable-source-id' },
    ]
    const cursor = 'private+/cursor?country=DE&service=PIS'
    const { client, fetch } = fixture({
      [`/accounts/${ACCOUNT_ID}/transactions`]: { transactions, continuation_key: cursor },
    })
    await client.getApplication()
    const result = await client.getTransactions(ACCOUNT_ID, {
      dateFrom: '2026-10-01',
      dateTo: '2026-10-05',
      continuationKey: cursor,
    })
    expect(result).toEqual({ transactions, continuationKey: cursor })
    expect(result.transactions).toHaveLength(3)
    expect(result.transactions[0]).not.toHaveProperty('entry_reference')
    const request = new URL(String(fetch.mock.calls[1]?.[0]))
    expect([...request.searchParams.keys()]).toEqual(['date_from', 'date_to', 'continuation_key'])
    expect(request.searchParams.get('continuation_key')).toBe(cursor)
    expect(request.searchParams.has('service')).toBe(false)
  })

  it('rejects malformed financial numbers, dates and enums instead of inventing a normalized record', async () => {
    for (const record of [
      { ...transaction, transaction_amount: { currency: 'EUR', amount: 0.1 } },
      { ...transaction, transaction_amount: { currency: 'EUR', amount: '1e3' } },
      { ...transaction, transaction_amount: { currency: 'eur', amount: '1.23' } },
      { ...transaction, status: 'PAID' },
      { ...transaction, credit_debit_indicator: 'DEBIT' },
      { ...transaction, booking_date: '2026-02-30' },
      { ...transaction, entry_reference: 22 },
      { ...transaction, balance_after_transaction: { currency: 'EUR', amount: 'NaN' } },
    ]) {
      const { client } = fixture({
        [`/accounts/${ACCOUNT_ID}/transactions`]: { transactions: [record] },
      })
      await client.getApplication()
      await failure(
        client.getTransactions(ACCOUNT_ID, { dateFrom: '2026-10-01', dateTo: '2026-10-05' }),
        'invalid_contract',
      )
    }
    const { client } = fixture({
      '/sessions': {
        session_id: SESSION_ID,
        accounts: [account],
        aspsp: start.aspsp,
        psu_type: 'business',
        access: { valid_until: '2026-10-05T11:00:00Z' },
      },
    })
    await client.getApplication()
    await failure(client.exchangeCode('original-code'), 'invalid_contract')
  })

  it('validates IDs/date ranges before requests and deletes only the exact provider session', async () => {
    const { client, fetch } = fixture({ [`/sessions/${SESSION_ID}`]: { message: 'OK' } })
    await client.getApplication()
    await failure(client.deleteSession(`${SESSION_ID}/../../payments`), 'invalid_request')
    await failure(client.getBalances('https://evil.invalid/accounts'), 'invalid_request')
    await failure(
      client.getTransactions(ACCOUNT_ID, { dateFrom: '2026-10-05', dateTo: '2026-10-01' }),
      'invalid_request',
    )
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await client.deleteSession(SESSION_ID)).toBeUndefined()
    expect(fetch.mock.calls[1]).toMatchObject([
      `https://api.enablebanking.com/sessions/${SESSION_ID}`,
      { method: 'DELETE', redirect: 'error' },
    ])
    expect(fetch.mock.calls[1]?.[1]?.body).toBeUndefined()
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [503, 'provider_unavailable'],
    [302, 'invalid_contract'],
  ])('redacts provider bodies and categorical failure %s', async (status, code) => {
    const secret = 'original-provider-private-error-token'
    const { client } = fixture(
      {},
      { fetch: async () => response({ secret, exception: PRIVATE_PEM }, status) },
    )
    let error: unknown
    try {
      await client.getApplication()
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(EnableBankingPersonalFailure)
    expect(error).toMatchObject({ code, message: code })
    expect(inspect(error)).not.toContain(secret)
    expect(inspect(error)).not.toContain(PRIVATE_PEM)
    expect(error).not.toHaveProperty('cause')
  })

  it('redacts thrown transport secrets and rejects duplicate/prototype keys or invalid UTF-8', async () => {
    const { client } = fixture(
      {},
      {
        fetch: async () => {
          throw new Error(`PRIVATE TOKEN ${PRIVATE_PEM}`)
        },
      },
    )
    await failure(client.getApplication(), 'transport')
    for (const body of ['{"name":"one","name":"two"}', '{"__proto__":{"stolen":true}}']) {
      const { client: malformed } = fixture(
        {},
        {
          fetch: async () =>
            new Response(body, { headers: { 'content-type': 'application/json' } }),
        },
      )
      await failure(malformed.getApplication(), 'invalid_contract')
    }
    const { client: invalidUtf8 } = fixture(
      {},
      {
        fetch: async () =>
          new Response(new Uint8Array([255]), { headers: { 'content-type': 'application/json' } }),
      },
    )
    await failure(invalidUtf8.getApplication(), 'invalid_contract')
  })

  it('bounds response bytes both advertised and streamed and does not parse oversized data', async () => {
    for (const headers of [{ 'content-length': '1000' }, {}]) {
      const { client } = fixture(
        {},
        { maxResponseBytes: 100, fetch: async () => response(application, 200, headers) },
      )
      await failure(client.getApplication(), 'response_too_large')
    }
  })

  it('times out ignored fetch aborts and stalled streamed responses', async () => {
    const { client } = fixture({}, { timeoutMs: 5, fetch: () => new Promise(() => undefined) })
    await failure(client.getApplication(), 'timeout')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'))
      },
    })
    const { client: stalled } = fixture(
      {},
      {
        timeoutMs: 5,
        fetch: async () =>
          new Response(stream, { headers: { 'content-type': 'application/json' } }),
      },
    )
    await failure(stalled.getApplication(), 'timeout')
  })

  it('close cancels in-flight operations, discards late responses and prevents all later requests', async () => {
    let complete: ((response: Response) => void) | undefined
    const cancel = vi.fn()
    const transport = vi.fn<typeof globalThis.fetch>(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve
        }),
    )
    const { client } = fixture({}, { fetch: transport })
    const pending = client.getApplication()
    client.close()
    await failure(pending, 'cancelled')
    complete?.(
      new Response(new ReadableStream({ cancel }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    await Promise.resolve()
    expect(cancel).toHaveBeenCalledTimes(1)
    await failure(client.getApplication(), 'cancelled')
    await failure(client.deleteSession(SESSION_ID), 'cancelled')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('rejects weak, wrong-type or malformed keys and missing application configuration safely', () => {
    const weak = generateKeyPairSync('rsa', { modulusLength: 1024 })
      .privateKey.export({ format: 'pem', type: 'pkcs8' })
      .toString()
    const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
      .privateKey.export({ format: 'pem', type: 'pkcs8' })
      .toString()
    for (const privateKeyPem of [weak, ec, 'invalid-private-token-value'])
      expect(() => fixture({}, { privateKeyPem })).toThrowError('configuration')
    for (const options of [
      { applicationId: 'not-an-application-id' },
      { timeoutMs: 0 },
      { maxResponseBytes: 99 },
      { clock: () => Number.NaN },
    ])
      expect(() => fixture({}, options)).toThrowError('configuration')
  })
})
