import { inspect } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import { ProviderJsonNumber, parseProviderJson } from './provider-json.js'
import {
  type YapilySandboxOptions,
  YapilySandboxReadAdapter,
  yapilySandboxUserReference,
} from './yapily-sandbox.js'

// Original synthetic fixtures follow the public Yapily 12.16.0 shapes. No provider credentials.
const NOW = Date.parse('2026-10-04T10:00:00Z')
const binding = {
  profileId: 'test-synthetic-profile',
  connectionId: 'test-synthetic-connection',
  grantId: 'test-synthetic-grant',
  institutionId: 'modelo-sandbox' as const,
  consentId: '11111111-2222-3333-4444-555555555555',
  consentToken: 'test-synthetic-consent-token',
}
const context = {
  profileId: binding.profileId,
  connectionId: binding.connectionId,
  grantId: binding.grantId,
  institutionId: binding.institutionId,
}
const window = { from: '2026-09-01T00:00:00Z', before: '2026-09-30T23:59:59Z' }
const userReference = yapilySandboxUserReference(binding.profileId, binding.connectionId)
const institutions = {
  meta: { count: 1 },
  data: [
    {
      id: 'modelo-sandbox',
      name: 'Original synthetic Modelo fixture',
      environmentType: 'SANDBOX',
      features: ['ACCOUNTS', 'ACCOUNT_TRANSACTIONS'],
    },
  ],
}
const consent = {
  data: {
    id: binding.consentId,
    institutionId: binding.institutionId,
    applicationUserId: userReference,
    consentToken: binding.consentToken,
    status: 'AUTHORIZED',
    featureScope: ['ACCOUNTS', 'ACCOUNT_TRANSACTIONS'],
  },
}
const accounts = {
  meta: { count: 1 },
  data: [
    {
      id: 'test-synthetic-account',
      currency: 'GBP',
      accountType: 'CURRENT',
      nickname: 'Synthetic current account',
      balance: -12.57,
      accountBalances: [
        {
          type: 'INTERIM_BOOKED',
          dateTime: '2026-10-04T09:00:00Z',
          balanceAmount: { amount: -12.57, currency: 'GBP' },
        },
      ],
      // Deliberately never copied to the result.
      accountIdentifications: [{ type: 'PAN', identification: 'synthetic-sensitive-field' }],
    },
  ],
}
const records = [
  {
    id: 'test-synthetic-booked',
    amount: -100.23,
    currency: 'GBP',
    status: 'BOOKED',
    description: 'Original synthetic booked record',
    bookingDateTime: '2026-09-02T10:00:00Z',
    valueDateTime: '2026-09-03T10:00:00Z',
    date: '2026-09-02T10:00:00Z',
    transactionAmount: { amount: -100.23, currency: 'GBP' },
  },
  {
    amount: -0.99,
    currency: 'GBP',
    status: 'PENDING',
    description: 'Original synthetic no-ID pending record',
    date: '2026-09-04T10:00:00Z',
    enrichment: { transactionHash: { hash: 'must-not-become-a-bank-identifier' } },
  },
]
function page(url: URL, data: readonly unknown[] = records) {
  const limit = Number(url.searchParams.get('limit'))
  const offset = Number(url.searchParams.get('offset'))
  const subset = data.slice(offset, offset + limit)
  return {
    meta: {
      count: subset.length,
      pagination: { totalCount: data.length, self: { limit, offset, sort: 'date' } },
    },
    data: subset,
    // Untrusted provider links must never be followed, including links to another origin.
    links: { self: 'https://untrusted.invalid/', next: 'https://untrusted.invalid/collect' },
  }
}
function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8', ...headers },
  })
}
type FixtureOverride = (
  url: URL,
  init: RequestInit | undefined,
  call: number,
) => Response | Promise<Response> | undefined
function fixture(override?: FixtureOverride, overrides: Partial<YapilySandboxOptions> = {}) {
  const calls: { url: URL; init: RequestInit | undefined }[] = []
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    calls.push({ url, init })
    const custom = await override?.(url, init, calls.length)
    if (custom) return custom
    if (url.pathname === '/institutions') return response(institutions)
    if (url.pathname.startsWith('/consents/')) return response(consent)
    if (url.pathname === '/accounts') return response(accounts)
    if (url.pathname.endsWith('/transactions')) return response(page(url))
    throw new Error('Unexpected synthetic endpoint')
  }
  const adapter = new YapilySandboxReadAdapter({
    applicationId: 'test-synthetic-application',
    applicationSecret: 'test-synthetic-application-secret',
    permissionReference: 'original-synthetic-fixture-permission-not-provider-access',
    binding,
    fetch,
    clock: () => NOW,
    limits: { pageSize: 1, retryDelayMs: 1, maxRetryDelayMs: 2 },
    ...overrides,
  })
  return { adapter, calls }
}
async function failure(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: 'SandboxReadFailure', code, message: code })
}

describe('official Yapily sandbox read protocol conformance, using synthetic wire fixtures', () => {
  it('uses Basic auth on only the official allowlisted read URLs with Consent only for data', async () => {
    const { adapter, calls } = fixture()
    const result = await adapter.capture(context, window)
    expect(result.transactions).toHaveLength(2)
    expect(calls.every((call) => call.url.origin === 'https://api.yapily.com')).toBe(true)
    expect(
      calls.every((call) => call.init?.method === 'GET' && call.init.redirect === 'manual'),
    ).toBe(true)
    for (const call of calls) {
      const headers = new Headers(call.init?.headers)
      expect(headers.get('authorization')).toBe(
        `Basic ${Buffer.from('test-synthetic-application:test-synthetic-application-secret').toString('base64')}`,
      )
      expect(headers.get('consent')).toBe(
        call.url.pathname.startsWith('/accounts') ? binding.consentToken : null,
      )
      expect(call.url.toString()).not.toContain(binding.consentToken)
    }
    const transactions = calls.filter((call) => call.url.pathname.endsWith('/transactions'))
    expect(transactions.map((call) => call.url.searchParams.get('offset'))).toEqual(['0', '1'])
    expect(transactions.every((call) => call.url.searchParams.get('from') === window.from)).toBe(
      true,
    )
    expect(transactions.every((call) => !call.url.searchParams.has('cursor'))).toBe(true)
  })

  it('keeps sandbox proof, page consistency and absent lifecycle terms explicit', async () => {
    const { adapter } = fixture()
    const result = await adapter.capture(context, window)
    expect(result).toMatchObject({
      environment: 'sandbox',
      coverage: 'unverified',
      consistency: 'reported_pages_only',
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
      authorization: {
        authorization: {
          consentExpiresAt: null,
          scaDueAt: null,
          providerSessionExpiresAt: null,
          tokenExpiresAt: null,
          requiredActions: [],
        },
        reconfirmBy: null,
      },
    })
    expect(adapter.discoveryMetadata().refresh.unattendedBudget).toBeNull()
    expect(adapter.discoveryMetadata().renewal).toBe('unknown')
    expect(JSON.stringify(result)).not.toContain(binding.consentToken)
    expect(JSON.stringify(result)).not.toContain('synthetic-sensitive-field')
    expect(inspect(adapter)).not.toContain('test-synthetic-application-secret')
  })

  it('retains separate provider dates, exact money, missing IDs and typed balances', async () => {
    const result = await fixture().adapter.capture(context, window)
    expect(result.transactions[0]).toMatchObject({
      amount: '-100.23',
      status: 'booked',
      bookedOn: '2026-09-02',
      valueDateTime: '2026-09-03T10:00:00Z',
    })
    expect(result.transactions[1]).toMatchObject({
      id: null,
      status: 'pending',
      bookedOn: null,
      bookingDateTime: null,
      providerDate: '2026-09-04T10:00:00Z',
    })
    expect(result.accounts[0]?.balances[0]).toMatchObject({
      amount: '-12.57',
      semantics: 'booked',
      providerType: 'INTERIM_BOOKED',
    })
  })

  it('reads numeric JSON lexemes above IEEE754 precision without rounding', async () => {
    const { adapter } = fixture((url) => {
      if (!url.pathname.endsWith('/transactions')) return undefined
      const body = JSON.stringify(page(url, [records[0]])).replaceAll(
        '-100.23',
        '-9007199254740993.01',
      )
      return new Response(body, { headers: { 'content-type': 'application/json' } })
    })
    expect((await adapter.capture(context, window)).transactions[0]?.amount).toBe(
      '-9007199254740993.01',
    )
  })

  it('preserves zero and three minor digit currencies without EUR assumptions', async () => {
    const result = await fixture((url) => {
      if (!url.pathname.endsWith('/transactions')) return undefined
      return response(
        page(url, [
          {
            ...records[0],
            currency: 'JPY',
            amount: -100,
            transactionAmount: { amount: -100, currency: 'JPY' },
          },
          { ...records[1], currency: 'KWD', amount: -0.999 },
        ]),
      )
    }).adapter.capture(context, window)
    expect(result.transactions.map((record) => record.amount)).toEqual(['-100', '-0.999'])
  })

  it('keeps consent expiry and reconfirmation separate from SCA and token validity', async () => {
    const result = await fixture((url) =>
      url.pathname.startsWith('/consents/')
        ? response({
            data: {
              ...consent.data,
              expiresAt: '2026-12-01T00:00:00Z',
              reconfirmBy: '2026-11-01T00:00:00Z',
            },
          })
        : undefined,
    ).adapter.capture(context, window)
    expect(result.authorization).toMatchObject({
      reconfirmBy: '2026-11-01T00:00:00Z',
      authorization: {
        consentExpiresAt: '2026-12-01T00:00:00Z',
        scaDueAt: null,
        tokenExpiresAt: null,
      },
    })
  })

  it.each(['LIVE', 'MOCK', 'UNKNOWN', null])(
    'refuses %s institution before any financial read',
    async (environmentType) => {
      const { adapter, calls } = fixture((url) =>
        url.pathname === '/institutions'
          ? response({ ...institutions, data: [{ ...institutions.data[0], environmentType }] })
          : undefined,
      )
      await failure(adapter.capture(context, window), 'sandbox_only')
      expect(calls).toHaveLength(1)
    },
  )

  it('refuses an unlisted sandbox institution', async () => {
    const { adapter, calls } = fixture((url) =>
      url.pathname === '/institutions' ? response({ meta: { count: 0 }, data: [] }) : undefined,
    )
    await failure(adapter.capture(context, window), 'sandbox_only')
    expect(calls).toHaveLength(1)
  })

  it.each(['id', 'institutionId', 'applicationUserId', 'consentToken'])(
    'binds consent %s to the exact trusted grant',
    async (key) => {
      const { adapter, calls } = fixture((url) =>
        url.pathname.startsWith('/consents/')
          ? response({ data: { ...consent.data, [key]: 'wrong-binding' } })
          : undefined,
      )
      await failure(adapter.capture(context, window), 'stale_generation')
      expect(calls.every((call) => !call.url.pathname.startsWith('/accounts'))).toBe(true)
    },
  )

  it.each(['EXPIRED', 'REVOKED', 'AWAITING_RE_AUTHORIZATION', 'UNKNOWN', 'NEW_UNSUPPORTED_STATUS'])(
    'denies consent status %s',
    async (status) => {
      await failure(
        fixture((url) =>
          url.pathname.startsWith('/consents/')
            ? response({ data: { ...consent.data, status } })
            : undefined,
        ).adapter.capture(context, window),
        'consent_unusable',
      )
    },
  )

  it.each(['expiresAt', 'reconfirmBy'])(
    'denies due %s without inventing a renewal method',
    async (field) => {
      await failure(
        fixture((url) =>
          url.pathname.startsWith('/consents/')
            ? response({ data: { ...consent.data, [field]: '2026-10-04T10:00:00Z' } })
            : undefined,
        ).adapter.capture(context, window),
        'consent_unusable',
      )
    },
  )

  it('rechecks consent between pages and returns no partial capture after revocation', async () => {
    let consents = 0
    const { adapter, calls } = fixture((url) => {
      if (url.pathname.startsWith('/consents/') && ++consents >= 3)
        return response({ data: { ...consent.data, status: 'REVOKED' } })
      return undefined
    })
    await failure(adapter.capture(context, window), 'consent_unusable')
    expect(calls.filter((call) => call.url.pathname.endsWith('/transactions'))).toHaveLength(1)
  })

  it.each(['ACCOUNTS', 'ACCOUNT_TRANSACTIONS'])(
    'denies a missing consent feature %s',
    async (feature) => {
      await failure(
        fixture((url) =>
          url.pathname.startsWith('/consents/')
            ? response({
                data: {
                  ...consent.data,
                  featureScope: consent.data.featureScope.filter((value) => value !== feature),
                },
              })
            : undefined,
        ).adapter.capture(context, window),
        'unsupported',
      )
    },
  )

  it.each(['profileId', 'connectionId', 'grantId', 'institutionId'])(
    'refuses changed context %s before I/O',
    async (key) => {
      const { adapter, calls } = fixture()
      await failure(adapter.capture({ ...context, [key]: 'another' }, window), 'stale_generation')
      expect(calls).toHaveLength(0)
    },
  )

  it('requires exact grant generation and explicit institution in the context', async () => {
    const { adapter, calls } = fixture()
    await failure(
      adapter.capture({ profileId: binding.profileId, connectionId: binding.connectionId }, window),
      'stale_generation',
    )
    expect(calls).toHaveLength(0)
  })

  it.each([{ transactionFrom: '2026-09-02T00:00:00Z' }, { transactionTo: '2026-09-20T00:00:00Z' }])(
    'refuses querying outside explicit consent history bounds',
    async (terms) => {
      const { adapter, calls } = fixture((url) =>
        url.pathname.startsWith('/consents/')
          ? response({ data: { ...consent.data, ...terms } })
          : undefined,
      )
      await failure(adapter.capture(context, window), 'consent_unusable')
      expect(calls.every((call) => !call.url.pathname.startsWith('/accounts'))).toBe(true)
    },
  )

  it('keeps unknown account types and headline balance semantics unknown', async () => {
    const result = await fixture((url) =>
      url.pathname === '/accounts'
        ? response({
            meta: { count: 1 },
            data: [{ id: 'unknown', currency: 'GBP', accountType: 'LOAN', balance: 12.34 }],
          })
        : undefined,
    ).adapter.capture(context, window)
    expect(result.accounts[0]).toMatchObject({
      kind: 'unknown',
      balances: [{ amount: '12.34', semantics: 'unknown', observedAt: null }],
    })
  })

  it('preserves provider-supplied booking calendar rather than shifting it by timezone', async () => {
    const result = await fixture((url) =>
      url.pathname.endsWith('/transactions')
        ? response(page(url, [{ ...records[0], bookingDateTime: '2026-09-02T00:30:00+02:00' }]))
        : undefined,
    ).adapter.capture(context, window)
    expect(result.transactions[0]?.bookedOn).toBe('2026-09-02')
  })
})

describe('atomic paging, transport bounds, cancellation and categorical errors', () => {
  it.each([
    ['401', 401, 'unauthorized'],
    ['403', 403, 'consent_unusable'],
    ['404', 404, 'not_found'],
    ['424', 424, 'unsupported'],
    ['400', 400, 'invalid_contract'],
  ] as const)(
    'maps HTTP %s without leaking provider bodies or retrying',
    async (_label, status, code) => {
      const { adapter, calls } = fixture(() =>
        response({ error: { message: 'DO-NOT-LOG-PII-TOKEN' } }, status),
      )
      try {
        await adapter.capture(context, window)
        throw new Error('Expected refusal')
      } catch (error) {
        expect(error).toMatchObject({ code, message: code })
        expect(inspect(error)).not.toContain('DO-NOT-LOG-PII-TOKEN')
      }
      expect(calls).toHaveLength(1)
    },
  )

  it('retries transient HTTP failure within fixed attempts and succeeds', async () => {
    const { adapter, calls } = fixture((_url, _init, call) =>
      call === 1 ? response({}, 503) : undefined,
    )
    await adapter.capture(context, window)
    expect(calls.filter((call) => call.url.pathname === '/institutions')).toHaveLength(2)
  })

  it('bounds unavailable retries and does not include network exception text', async () => {
    const { adapter, calls } = fixture(() => {
      throw new Error('DO-NOT-LOG-PII-TOKEN')
    })
    await failure(adapter.capture(context, window), 'unavailable')
    expect(calls).toHaveLength(3)
  })

  it('honors Retry-After without keeping a worker waiting beyond the configured delay', async () => {
    const { adapter, calls } = fixture(() => response({}, 429, { 'retry-after': '20' }))
    await expect(adapter.capture(context, window)).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfterSeconds: 20,
    })
    expect(calls).toHaveLength(1)
  })

  it.each([undefined, 'invalid-delay', '99999999999999999999999'])(
    'returns rate-limit uncertainty without an immediate retry',
    async (hint) => {
      const { adapter, calls } = fixture(() =>
        response({}, 429, hint === undefined ? {} : { 'retry-after': hint }),
      )
      await expect(adapter.capture(context, window)).rejects.toMatchObject({
        code: 'rate_limited',
        retryAfterSeconds: null,
      })
      expect(calls).toHaveLength(1)
    },
  )

  it('parses HTTP date Retry-After without assuming a daily provider budget', async () => {
    const { adapter, calls } = fixture(() =>
      response({}, 429, { 'retry-after': 'Sun, 04 Oct 2026 10:00:30 GMT' }),
    )
    await expect(adapter.capture(context, window)).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfterSeconds: 30,
    })
    expect(calls).toHaveLength(1)
  })

  it('refuses redirects without forwarding credentials to their destination', async () => {
    const { adapter, calls } = fixture(
      () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://untrusted.invalid/collect' },
        }),
    )
    await failure(adapter.capture(context, window), 'invalid_contract')
    expect(calls).toHaveLength(1)
  })

  it('times out a transport that ignores AbortSignal', async () => {
    const { adapter, calls } = fixture(() => new Promise<Response>(() => undefined), {
      limits: { timeoutMs: 5, captureTimeoutMs: 100, maxAttempts: 1 },
    })
    await failure(adapter.capture(context, window), 'timeout')
    expect(calls).toHaveLength(1)
  })

  it('times out a body stream that stalls after response headers', async () => {
    const { adapter } = fixture(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(Buffer.from('{'))
            },
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
      { limits: { timeoutMs: 5, captureTimeoutMs: 100, maxAttempts: 1 } },
    )
    await failure(adapter.capture(context, window), 'timeout')
  })

  it('enforces the entire capture deadline independently of the request deadline', async () => {
    const { adapter, calls } = fixture(() => new Promise<Response>(() => undefined), {
      limits: { timeoutMs: 100, captureTimeoutMs: 5, maxAttempts: 3 },
    })
    await failure(adapter.capture(context, window), 'timeout')
    expect(calls).toHaveLength(1)
  })

  it('discards a body that arrives after a noncooperating transport was cancelled', async () => {
    let settle: ((response: Response) => void) | undefined
    const cancelled = vi.fn()
    const { adapter } = fixture(
      () =>
        new Promise<Response>((resolve) => {
          settle = resolve
        }),
    )
    const capture = adapter.capture(context, window)
    adapter.close()
    await failure(capture, 'cancelled')
    settle?.(
      new Response(new ReadableStream({ cancel: cancelled }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(cancelled).toHaveBeenCalledOnce()
  })

  it('cancels in-flight I/O even when the transport ignores AbortSignal', async () => {
    const { adapter, calls } = fixture(() => new Promise<Response>(() => undefined))
    const controller = new AbortController()
    const promise = adapter.capture(context, window, controller.signal)
    controller.abort(new Error('DO-NOT-LOG-USER-REASON'))
    await failure(promise, 'cancelled')
    expect(calls).toHaveLength(1)
  })

  it('performs zero I/O for an already cancelled caller', async () => {
    const { adapter, calls } = fixture()
    const controller = new AbortController()
    controller.abort()
    await failure(adapter.capture(context, window, controller.signal), 'cancelled')
    expect(calls).toHaveLength(0)
  })

  it('close cancels current work and rejects future reads without claiming remote revocation', async () => {
    const { adapter } = fixture(() => new Promise<Response>(() => undefined))
    const promise = adapter.capture(context, window)
    adapter.close()
    await failure(promise, 'cancelled')
    await failure(adapter.capture(context, window), 'cancelled')
  })

  it('bounds concurrent captures to one per grant', async () => {
    const { adapter } = fixture(() => new Promise<Response>(() => undefined))
    const first = adapter.capture(context, window)
    await failure(adapter.capture(context, window), 'bound_reached')
    adapter.close()
    await failure(first, 'cancelled')
  })

  it('bounds total page requests and returns no partial ledger', async () => {
    const { adapter, calls } = fixture(undefined, { limits: { pageSize: 1, maxPages: 1 } })
    await failure(adapter.capture(context, window), 'bound_reached')
    expect(calls.filter((call) => call.url.pathname.endsWith('/transactions'))).toHaveLength(1)
  })

  it('refuses changing totals between pages', async () => {
    const { adapter } = fixture((url) =>
      url.pathname.endsWith('/transactions') && url.searchParams.get('offset') === '1'
        ? response({
            ...page(url),
            meta: { count: 1, pagination: { totalCount: 3, self: { limit: 1, offset: 1 } } },
          })
        : undefined,
    )
    await failure(adapter.capture(context, window), 'invalid_contract')
  })

  it('refuses duplicate transaction IDs across pages', async () => {
    const { adapter } = fixture((url) =>
      url.pathname.endsWith('/transactions')
        ? response(page(url, [records[0], records[0]]))
        : undefined,
    )
    await failure(adapter.capture(context, window), 'invalid_contract')
  })

  it.each([
    { totalCount: 2, self: { limit: 2, offset: 0 } },
    { totalCount: 2, self: { limit: 1, offset: 1 } },
    { totalCount: 2, self: { limit: 1, offset: 0, sort: '-date' } },
    { totalCount: 2, self: { limit: 1, offset: 0, from: '2026-08-01T00:00:00Z' } },
    { totalCount: 2, self: { limit: 1, offset: 0 }, next: { cursor: 'private-beta-not-enabled' } },
  ])('rejects contradictory or undeclared pagination mode', async (pagination) => {
    await failure(
      fixture((url) =>
        url.pathname.endsWith('/transactions')
          ? response({ ...page(url), meta: { count: 1, pagination } })
          : undefined,
      ).adapter.capture(context, window),
      'invalid_contract',
    )
  })

  it('rejects truncation instead of silently assuming the short page ends history', async () => {
    await failure(
      fixture((url) =>
        url.pathname.endsWith('/transactions')
          ? response({ ...page(url), data: [], meta: { ...page(url).meta, count: 0 } })
          : undefined,
      ).adapter.capture(context, window),
      'invalid_contract',
    )
  })

  it('rejects changed account balances during capture instead of presenting a frozen snapshot', async () => {
    let reads = 0
    await failure(
      fixture((url) =>
        url.pathname === '/accounts' && ++reads === 2
          ? response({
              ...accounts,
              data: [{ ...accounts.data[0], balance: 0, accountBalances: [] }],
            })
          : undefined,
      ).adapter.capture(context, window),
      'invalid_contract',
    )
  })

  it.each([
    { amount: -0.999 },
    { currency: 'ZZZ' },
    { status: 'REVERSED' },
    { bookingDateTime: undefined },
    { bookingDateTime: '2026-02-30T10:00:00Z' },
    { transactionAmount: { amount: -100.24, currency: 'GBP' } },
    { transactionAmount: { amount: -100.23, currency: 'EUR' } },
  ])('refuses unrepresentable or contradictory transaction fields', async (changes) => {
    await failure(
      fixture((url) =>
        url.pathname.endsWith('/transactions')
          ? response(page(url, [{ ...records[0], ...changes }]))
          : undefined,
      ).adapter.capture(context, window),
      'invalid_contract',
    )
  })

  it('rejects monetary strings and exponential numeric lexemes instead of rounding', async () => {
    for (const raw of ['"-100.23"', '-10023e-2']) {
      await failure(
        fixture((url) =>
          url.pathname.endsWith('/transactions')
            ? new Response(JSON.stringify(page(url, [records[0]])).replaceAll('-100.23', raw), {
                headers: { 'content-type': 'application/json' },
              })
            : undefined,
        ).adapter.capture(context, window),
        'invalid_contract',
      )
    }
  })

  it('bounds received bytes even with no Content-Length header', async () => {
    await failure(
      fixture(
        () => new Response(' '.repeat(501), { headers: { 'content-type': 'application/json' } }),
        {
          limits: { maxResponseBytes: 500 },
        },
      ).adapter.capture(context, window),
      'bound_reached',
    )
  })

  it('rejects oversize Content-Length without reading the body', async () => {
    await failure(
      fixture(() => response({}, 200, { 'content-length': '9999999' })).adapter.capture(
        context,
        window,
      ),
      'bound_reached',
    )
  })

  it('rejects wrong content type and invalid UTF8', async () => {
    await failure(
      fixture(
        () => new Response('{}', { headers: { 'content-type': 'text/html' } }),
      ).adapter.capture(context, window),
      'invalid_contract',
    )
    await failure(
      fixture(
        () =>
          new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } }),
      ).adapter.capture(context, window),
      'invalid_contract',
    )
  })

  it('does not read env/default credentials or permit a non-Modelo configuration', () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    expect(() => fixture(undefined, { applicationId: '', fetch })).toThrow('configuration')
    expect(() => fixture(undefined, { applicationId: 'wrong:username', fetch })).toThrow(
      'configuration',
    )
    expect(() => fixture(undefined, { permissionReference: '', fetch })).toThrow('configuration')
    expect(() =>
      fixture(undefined, {
        binding: { ...binding, institutionId: 'a-live-bank' as 'modelo-sandbox' },
        fetch,
      }),
    ).toThrow('sandbox_only')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('bounded exact provider JSON parser', () => {
  it('keeps monetary numeric lexemes distinct from ordinary strings', () => {
    expect(
      parseProviderJson('{"amount":9007199254740993.01,"other":"123","nested":[true,null,false]}'),
    ).toEqual({
      amount: new ProviderJsonNumber('9007199254740993.01'),
      other: '123',
      nested: [true, null, false],
    })
  })
  it.each([
    '{"status":"AUTHORIZED","status":"REVOKED"}',
    '{"__proto__":{}}',
    '{"constructor":{}}',
    '{"prototype":{}}',
    '[1,]',
    '{"a":1,}',
    '{"a":01}',
    '{"a":NaN}',
    '{} trailing',
    '[1.0e]',
    '"unterminated',
    '{"a":truefalse}',
    `${'['.repeat(34)}0${']'.repeat(34)}`,
  ])('rejects ambiguous, unsafe or malformed JSON', (raw) => {
    expect(() => parseProviderJson(raw)).toThrow()
  })
  it('correctly handles escaped quotes and backslashes', () => {
    const input = { text: 'Quotation " with \\ and a newline\n', amount: -0.01 }
    expect(parseProviderJson(JSON.stringify(input))).toEqual({
      ...input,
      amount: new ProviderJsonNumber('-0.01'),
    })
  })
})
