import { inspect } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import {
  YapilyLiveInstitutionDiscovery,
  type YapilyLiveInstitutionDiscoveryOptions,
} from './yapily-live-institutions.js'

// Original wire fixtures. Published IDs are examples, never evidence of application access.
const NOW = Date.parse('2026-10-05T10:00:00Z')
const features = [
  'ACCOUNTS',
  'ACCOUNT_BALANCES',
  'ACCOUNT_TRANSACTIONS',
  'INITIATE_ACCOUNT_REQUEST',
]
const liveItalian = {
  id: 'bper',
  name: 'Original synthetic Italian institution',
  countries: [{ countryCode2: 'IT', displayName: 'Italy' }],
  environmentType: 'LIVE',
  features,
  // Fields outside the institution metadata contract must never be returned.
  raw: { token: 'synthetic-provider-private-field' },
  media: [{ type: 'logo', source: 'https://untrusted.invalid/image' }],
  accountTypes: ['CARD'],
  historyFrom: '2000-01-01',
  balance: '1234.56',
}
function body(records: readonly unknown[] = [liveItalian]) {
  return { meta: { count: records.length }, data: records }
}
function response(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8', ...headers },
  })
}
function fixture(
  value: unknown = body(),
  options: Partial<YapilyLiveInstitutionDiscoveryOptions> = {},
) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response(value))
  const configuration = {
    applicationId: 'original-synthetic-application-id',
    applicationSecret: 'original-synthetic-application-secret',
    fetch,
    clock: () => NOW,
    ...options,
  }
  return { discovery: new YapilyLiveInstitutionDiscovery(configuration), fetch, configuration }
}
async function failure(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    name: 'LiveInstitutionDiscoveryFailure',
    code,
    message: code,
  })
}

describe('server-only live Yapily application institution discovery, synthetic wire fixtures', () => {
  it('uses only the official GET with server Basic credentials and exact source IDs', async () => {
    const { discovery, fetch, configuration } = fixture()
    const result = await discovery.discover()
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.yapily.com/institutions')
    expect(init).toMatchObject({ method: 'GET', redirect: 'manual' })
    expect(init?.body).toBeUndefined()
    expect(new Headers(init?.headers).get('authorization')).toBe(
      `Basic ${Buffer.from(`${configuration.applicationId}:${configuration.applicationSecret}`).toString('base64')}`,
    )
    expect(new Headers(init?.headers).get('consent')).toBeNull()
    expect(result).toMatchObject({
      providerId: 'yapily',
      environment: 'live',
      countryCode: 'IT',
      observedAt: '2026-10-05T10:00:00.000Z',
      nextCursor: null,
      productionAdmission: 'blocked',
      evidence: { status: 'provider_declared' },
    })
    expect(result.institutions[0]).toEqual({
      id: 'bper',
      providerId: 'yapily',
      name: liveItalian.name,
      countryCode: 'IT',
      environment: 'live',
      countryCodes: ['IT'],
      features,
      accountTypes: [],
      connectionAvailability: 'configuration_required',
      declaredCapabilities: {
        accounts: true,
        balances: true,
        transactions: true,
        redirectAuthorisation: true,
      },
    })
    const serialized = JSON.stringify(result)
    for (const privateValue of [
      configuration.applicationId,
      configuration.applicationSecret,
      'synthetic-provider-private-field',
      'untrusted.invalid',
      '2000-01-01',
      '1234.56',
    ])
      expect(serialized).not.toContain(privateValue)
    expect(serialized).not.toContain('CARD')
    expect(JSON.stringify(discovery)).not.toContain(configuration.applicationSecret)
    expect(inspect(discovery)).not.toContain(configuration.applicationSecret)
  })

  it('accepts only actual IT plus LIVE; name and ID substrings do not create coverage', async () => {
    const { discovery } = fixture(
      body([
        liveItalian,
        {
          ...liveItalian,
          id: 'bank_it_by_name_only',
          name: 'Italy bank',
          countries: [{ countryCode2: 'GB' }],
        },
        { ...liveItalian, id: 'modelo-sandbox', environmentType: 'SANDBOX' },
        { ...liveItalian, id: 'bank-mock', environmentType: 'MOCK' },
        {
          ...liveItalian,
          id: 'bank-business',
          countries: [{ countryCode2: 'GB' }, { countryCode2: 'IT' }],
        },
      ]),
    )
    const result = await discovery.discover()
    expect(result.institutions.map((institution) => institution.id)).toEqual([
      'bper',
      'bank-business',
    ])
    expect(result.institutions[1]?.countryCodes).toEqual(['GB', 'IT'])
  })

  it('keeps variant identities exact, with no brand merger or account-kind inference', async () => {
    const { discovery } = fixture(
      body([
        liveItalian,
        { ...liveItalian, id: 'bper_card', name: liveItalian.name },
        { ...liveItalian, id: 'ca_cariparma_spa-business', name: liveItalian.name },
      ]),
    )
    const result = await discovery.discover()
    expect(result.institutions.map((institution) => institution.id)).toEqual([
      'bper',
      'bper_card',
      'ca_cariparma_spa-business',
    ])
    expect(
      result.institutions.every(
        (institution) =>
          institution.accountTypes.length === 0 &&
          institution.connectionAvailability === 'configuration_required',
      ),
    ).toBe(true)
  })

  it('deduplicates country codes when distinct country objects declare different BICs', async () => {
    const { discovery } = fixture(
      body([
        {
          ...liveItalian,
          countries: [
            { countryCode2: 'IT', bic: 'ONE' },
            { countryCode2: 'IT', bic: 'TWO' },
          ],
        },
      ]),
    )
    expect((await discovery.discover()).institutions[0]?.countryCodes).toEqual(['IT'])
  })

  it.each([
    ['ACCOUNTS', 'accounts'],
    ['ACCOUNT_BALANCES', 'balances'],
    ['ACCOUNT_TRANSACTIONS', 'transactions'],
    ['INITIATE_ACCOUNT_REQUEST', 'redirectAuthorisation'],
  ] as const)(
    'treats %s as a distinct declaration without aliases or inference',
    async (feature, capability) => {
      const { discovery } = fixture(
        body([{ ...liveItalian, features: features.filter((value) => value !== feature) }]),
      )
      const result = await discovery.discover()
      expect(result.institutions[0]?.declaredCapabilities[capability]).toBe(false)
    },
  )

  it('retains payment-only and balance-less feature declarations without claiming account reads', async () => {
    const { discovery } = fixture(
      body([
        {
          ...liveItalian,
          features: [
            'INITIATE_DOMESTIC_SINGLE_PAYMENT',
            'ACCOUNTS_WITHOUT_BALANCE',
            'FUTURE_FEATURE',
          ],
        },
      ]),
    )
    const institution = (await discovery.discover()).institutions[0]
    expect(institution?.features).toEqual([
      'INITIATE_DOMESTIC_SINGLE_PAYMENT',
      'ACCOUNTS_WITHOUT_BALANCE',
      'FUTURE_FEATURE',
    ])
    expect(institution?.declaredCapabilities).toEqual({
      accounts: false,
      balances: false,
      transactions: false,
      redirectAuthorisation: false,
    })
  })

  it('accepts an empty complete application catalogue without claiming global unavailability', async () => {
    const { discovery } = fixture(body([]))
    expect(await discovery.discover()).toMatchObject({
      institutions: [],
      productionAdmission: 'blocked',
    })
  })

  it.each([
    { meta: { count: 2 }, data: [liveItalian] },
    { ...body(), meta: { count: 1, pagination: { totalCount: 2 } } },
    { ...body(), meta: { count: 1, pagination: { next: { cursor: 'opaque-provider-cursor' } } } },
    { ...body(), meta: { count: 1, pagination: { self: { offset: 1 } } } },
    { ...body(), meta: { count: 1, pagination: { self: { limit: 0 } } } },
    { ...body(), meta: { count: 1, pagination: { self: { cursor: 'opaque-provider-cursor' } } } },
    { ...body(), links: { next: 'https://api.yapily.com/institutions?offset=1' } },
    { ...body(), links: { next: 'https://attacker.invalid/collect' } },
  ])(
    'rejects partial/paged catalogues without following URLs or guessing paging parameters',
    async (value) => {
      const { discovery, fetch } = fixture(value)
      await failure(discovery.discover(), 'partial_catalogue')
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('accepts coherent whole-list wrapper metadata and ignores untrusted self links', async () => {
    const { discovery, fetch } = fixture({
      ...body(),
      meta: { count: 1, pagination: { totalCount: 1, self: { offset: 0, limit: 1 }, next: null } },
      links: { self: 'https://attacker.invalid/', next: null },
    })
    expect((await discovery.discover()).institutions).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    { ...liveItalian, id: 'malformed institution id' },
    { ...liveItalian, name: 'bad\nname' },
    { ...liveItalian, environmentType: 'PRODUCTION' },
    { ...liveItalian, countries: [{ countryCode2: 'it' }] },
    { ...liveItalian, countries: [{ countryCode2: 'ITA' }] },
    { ...liveItalian, features: ['ACCOUNTS', 'ACCOUNTS'] },
    { ...liveItalian, features: ['bad feature'] },
  ])(
    'rejects malformed source metadata rather than repairing identity/country/features',
    async (record) => {
      const { discovery } = fixture(body([record]))
      await failure(discovery.discover(), 'invalid_contract')
    },
  )

  it('rejects duplicate exact IDs, including duplicates outside the IT subset', async () => {
    const { discovery } = fixture(
      body([liveItalian, { ...liveItalian, countries: [{ countryCode2: 'GB' }] }]),
    )
    await failure(discovery.discover(), 'invalid_contract')
  })

  it('enforces body/institution bounds before returning any partial list', async () => {
    const tooMany = fixture(body([liveItalian, { ...liveItalian, id: 'bank-other' }]), {
      maxInstitutions: 1,
    })
    await failure(tooMany.discovery.discover(), 'bound_reached')
    const excessive = fixture(undefined, { maxResponseBytes: 100 })
    await failure(excessive.discovery.discover(), 'bound_reached')
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [302, 'invalid_contract'],
  ] as const)(
    'reports HTTP %s categorically with no retry or raw error message',
    async (status, code) => {
      const { discovery, fetch } = fixture()
      fetch.mockResolvedValueOnce(
        response({ error: { message: 'synthetic-sensitive-bank-detail' } }, status, {
          location: 'https://attacker.invalid/',
        }),
      )
      await failure(discovery.discover(), code)
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('reports bounded Retry-After without retrying the request', async () => {
    const { discovery, fetch } = fixture()
    fetch.mockResolvedValueOnce(response({}, 429, { 'retry-after': '17' }))
    await expect(discovery.discover()).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfterSeconds: 17,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([
    new Response('{"meta":{"count":1},"data":[],"data":[]}', {
      headers: { 'content-type': 'application/json' },
    }),
    new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }),
    new Response(new Uint8Array([255]), { headers: { 'content-type': 'application/json' } }),
  ])('rejects duplicate-key JSON, unsupported media and invalid UTF-8', async (value) => {
    const { discovery, fetch } = fixture()
    fetch.mockResolvedValueOnce(value)
    await failure(discovery.discover(), 'invalid_contract')
  })

  it('rejects oversized Content-Length before reading the response', async () => {
    const { discovery, fetch } = fixture()
    fetch.mockResolvedValueOnce(response(body(), 200, { 'content-length': '8388609' }))
    await failure(discovery.discover(), 'bound_reached')
  })

  it('rejects an already-redirected response even with HTTP 200', async () => {
    const { discovery, fetch } = fixture()
    const redirected = response(body())
    Object.defineProperty(redirected, 'redirected', { value: true })
    fetch.mockResolvedValueOnce(redirected)
    await failure(discovery.discover(), 'invalid_contract')
  })

  it('sanitizes transport rejection without retaining its cause or credentials', async () => {
    const { discovery, fetch } = fixture()
    fetch.mockRejectedValueOnce(new Error('secret-at-https://private.invalid/'))
    await expect(discovery.discover()).rejects.toMatchObject({
      code: 'unavailable',
      message: 'unavailable',
    })
  })

  it('bounds a noncooperating transport and rejects concurrent work', async () => {
    const { discovery, fetch } = fixture(undefined, { timeoutMs: 20 })
    fetch.mockImplementationOnce(() => new Promise(() => {}))
    const pending = discovery.discover()
    await failure(discovery.discover(), 'bound_reached')
    await failure(pending, 'timeout')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('cancels stalled body reads promptly', async () => {
    const { discovery, fetch } = fixture()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'))
      },
    })
    fetch.mockResolvedValueOnce(
      new Response(body, { headers: { 'content-type': 'application/json' } }),
    )
    const controller = new AbortController()
    const pending = discovery.discover(controller.signal)
    await Promise.resolve()
    controller.abort()
    await failure(pending, 'cancelled')
  })

  it('discards a late response after close and refuses future work', async () => {
    const { discovery, fetch } = fixture()
    let release: ((value: Response) => void) | undefined
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    const pending = discovery.discover()
    discovery.close()
    await failure(pending, 'cancelled')
    release?.(response(body()))
    await failure(discovery.discover(), 'cancelled')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does no request for a pre-aborted signal and has no unhandled rejection', async () => {
    const { discovery, fetch } = fixture()
    const controller = new AbortController()
    controller.abort()
    await failure(discovery.discover(controller.signal), 'cancelled')
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    { applicationId: '' },
    { applicationId: 'invalid:username' },
    { applicationSecret: '\nprivate' },
    { timeoutMs: 0 },
    { maxResponseBytes: 99 },
    { maxInstitutions: 0 },
    { baseURL: 'https://attacker.invalid' },
  ])('rejects malformed or origin-overriding configuration categorically', (options) => {
    expect(() => fixture(undefined, options)).toThrowError('configuration')
  })
})
