import { describe, expect, it, vi } from 'vitest'
import { YapilySandboxReadAdapter, yapilySandboxUserReference } from './yapily-sandbox.js'
import {
  type SandboxAuthorisationActivation,
  type SandboxAuthorisationCallback,
  type SandboxAuthorisationContext,
  type SandboxAuthorisationDraft,
  type SandboxAuthorisationIntent,
  type SandboxAuthorisationStore,
  YapilySandboxAuthorisationClient,
  type YapilySandboxAuthorisationOptions,
} from './yapily-sandbox-authorisation.js'

const NOW = Date.parse('2026-10-04T10:00:00Z')
const context: SandboxAuthorisationContext = {
  profileId: 'original-synthetic-profile',
  connectionId: 'original-synthetic-connection',
  grantId: 'original-synthetic-grant',
  institutionId: 'modelo-sandbox',
}
const CONSENT_ID = '11111111-2222-3333-4444-555555555555'
const TOKEN = 'original-synthetic-consent-token'
const providerState = 'original-synthetic-provider-state'
const user = yapilySandboxUserReference(context.profileId, context.connectionId)
const features = ['INITIATE_ACCOUNT_REQUEST', 'ACCOUNTS', 'ACCOUNT_TRANSACTIONS']
const institution = {
  meta: { count: 1 },
  data: [{ id: 'modelo-sandbox', environmentType: 'SANDBOX', features }],
}
const authorisation = {
  id: CONSENT_ID,
  applicationUserId: user,
  institutionId: 'modelo-sandbox',
  status: 'AWAITING_AUTHORIZATION',
  featureScope: ['ACCOUNTS', 'ACCOUNT_TRANSACTIONS'],
  state: providerState,
  authorisationUrl: 'https://modelo.sandbox.invalid/auth?state=original-synthetic-provider-state',
}
const consent = {
  id: CONSENT_ID,
  applicationUserId: user,
  institutionId: 'modelo-sandbox',
  status: 'AUTHORIZED',
  featureScope: ['ACCOUNTS', 'ACCOUNT_TRANSACTIONS'],
  state: providerState,
  consentToken: TOKEN,
}
function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8', ...headers },
  })
}

/** Test-only port. Nothing here is exported as a production store. */
class TestStore implements SandboxAuthorisationStore {
  drafts = new Map<string, SandboxAuthorisationDraft>()
  active = new Map<string, SandboxAuthorisationIntent>()
  claimed = new Set<string>()
  currentGeneration = context.grantId
  activateAllowed = true
  stage = vi.fn(async (draft: SandboxAuthorisationDraft) => {
    if (
      [...this.drafts.values()].some(
        (existing) =>
          existing.profileId === draft.profileId &&
          existing.connectionId === draft.connectionId &&
          existing.grantId === draft.grantId,
      )
    )
      throw new Error('Original synthetic duplicate generation')
    this.drafts.set(draft.state, draft)
  })
  activate = vi.fn(
    async (draft: SandboxAuthorisationDraft, activation: SandboxAuthorisationActivation) => {
      if (!this.activateAllowed) return false
      this.active.set(draft.state, { ...draft, ...activation })
      return true
    },
  )
  claim = vi.fn(async (expected: SandboxAuthorisationContext, state: string, at: string) => {
    const intent = this.active.get(state)
    if (
      !intent ||
      this.claimed.has(state) ||
      intent.profileId !== expected.profileId ||
      intent.connectionId !== expected.connectionId ||
      intent.grantId !== expected.grantId ||
      intent.institutionId !== expected.institutionId ||
      Date.parse(intent.expiresAt) <= Date.parse(at)
    )
      return null
    this.claimed.add(state)
    return intent
  })
  current = vi.fn(
    async (expected: SandboxAuthorisationContext) => expected.grantId === this.currentGeneration,
  )
}
type Override = (
  url: URL,
  init: RequestInit | undefined,
) => Response | Promise<Response> | undefined
function fixture(override?: Override, options: Partial<YapilySandboxAuthorisationOptions> = {}) {
  const store = new TestStore()
  const calls: { url: URL; init: RequestInit | undefined }[] = []
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    calls.push({ url, init })
    const custom = await override?.(url, init)
    if (custom) return custom
    if (url.pathname === '/institutions') return response(institution)
    if (url.pathname === '/account-auth-requests') return response({ data: authorisation }, 201)
    if (url.pathname === '/consent-one-time-token') return response(consent, 201)
    if (url.pathname === `/consents/${CONSENT_ID}`) return response({ data: consent })
    if (url.pathname === '/accounts') return response({ meta: { count: 0 }, data: [] })
    throw new Error('Unexpected original synthetic fixture endpoint')
  }
  const configuration: YapilySandboxAuthorisationOptions = {
    applicationId: 'original-synthetic-app',
    applicationSecret: 'original-synthetic-secret',
    permissionReference: 'synthetic-wire-fixture-not-provider-permission',
    callbackURL: 'https://isolated.lilleri.invalid/bank/callback',
    authorisationOrigins: ['https://modelo.sandbox.invalid'],
    store,
    clock: () => NOW,
    fetch,
    ...options,
  }
  return {
    client: new YapilySandboxAuthorisationClient(configuration),
    store,
    calls,
    configuration,
  }
}
function callback(intent: SandboxAuthorisationIntent): SandboxAuthorisationCallback {
  return {
    state: intent.state,
    institutionId: 'modelo-sandbox',
    applicationUserId: user,
    kind: 'one_time_token',
    oneTimeToken: 'original-synthetic-ott',
  }
}
async function failure(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: 'SandboxReadFailure', code, message: code })
}

describe('Modelo sandbox authorisation protocol, original synthetic wire fixtures only', () => {
  it('stages unpredictable state before provider I/O and uses the official single-attempt OTT flow', async () => {
    const { client, store, calls } = fixture()
    const intent = await client.begin(context)
    expect(store.stage).toHaveBeenCalledTimes(1)
    expect(store.stage.mock.invocationCallOrder[0]).toBeLessThan(
      store.activate.mock.invocationCallOrder[0] ?? 0,
    )
    expect(intent.state).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    expect(intent.providerState).toBe(providerState)
    expect(intent.state).not.toBe(providerState)
    const body = JSON.parse(String(calls[1]?.init?.body))
    expect(body).toEqual({
      applicationUserId: user,
      institutionId: 'modelo-sandbox',
      callback: `${intent.callbackURL}?lilleri-state=${intent.state}`,
      oneTimeToken: true,
    })
    const result = await client.complete(context, callback(intent))
    expect(result.binding).toEqual({ ...context, consentId: CONSENT_ID, consentToken: TOKEN })
    expect(result.authorization.authorization).toMatchObject({
      state: 'active',
      consentExpiresAt: null,
      scaDueAt: null,
      tokenExpiresAt: null,
      providerSessionExpiresAt: null,
    })
    expect(result).toMatchObject({ environment: 'sandbox', productionAdmission: 'blocked' })
    expect(calls.map((call) => `${call.init?.method} ${call.url.pathname}`)).toEqual([
      'GET /institutions',
      'POST /account-auth-requests',
      'GET /institutions',
      'POST /consent-one-time-token',
      `GET /consents/${CONSENT_ID}`,
    ])
    expect(JSON.parse(String(calls[3]?.init?.body))).toEqual({
      oneTimeToken: 'original-synthetic-ott',
    })
    for (const call of calls) {
      expect(call.url.origin).toBe('https://api.yapily.com')
      expect(call.init?.redirect).toBe('manual')
      const headers = new Headers(call.init?.headers)
      expect(headers.get('authorization')).toBe(
        `Basic ${Buffer.from('original-synthetic-app:original-synthetic-secret').toString('base64')}`,
      )
      expect(headers.get('consent')).toBeNull()
    }
  })

  it('passes its verified exact binding to the existing read-only sandbox adapter', async () => {
    const { client, configuration } = fixture()
    const intent = await client.begin(context)
    const result = await client.complete(context, callback(intent))
    const reader = new YapilySandboxReadAdapter({
      applicationId: configuration.applicationId,
      applicationSecret: configuration.applicationSecret,
      permissionReference: configuration.permissionReference,
      binding: result.binding,
      ...(configuration.fetch ? { fetch: configuration.fetch } : {}),
      ...(configuration.clock ? { clock: configuration.clock } : {}),
    })
    const capture = await reader.capture(context, {
      from: '2026-09-01T00:00:00Z',
      before: '2026-09-30T23:59:59Z',
    })
    expect(capture).toMatchObject({
      environment: 'sandbox',
      accounts: [],
      transactions: [],
      pendingSet: 'unknown',
    })
  })

  it('uses direct consent only when explicitly configured, with no OTT exchange', async () => {
    const { client, calls } = fixture(undefined, { tokenMode: 'consent' })
    const intent = await client.begin(context)
    expect(JSON.parse(String(calls[1]?.init?.body)).oneTimeToken).toBe(false)
    await client.complete(context, {
      state: intent.state,
      institutionId: 'modelo-sandbox',
      applicationUserId: user,
      kind: 'consent',
      consentToken: TOKEN,
    })
    expect(calls.some((call) => call.url.pathname === '/consent-one-time-token')).toBe(false)
  })

  it('produces different callback state for separate generations', async () => {
    const { client, store } = fixture()
    const first = await client.begin(context)
    store.currentGeneration = 'original-synthetic-next-grant'
    const second = await client.begin({ ...context, grantId: store.currentGeneration })
    expect(first.state).not.toBe(second.state)
    expect(first.applicationUserId).toBe(second.applicationUserId)
    expect(first.expiresAt).toBe('2026-10-04T10:10:00.000Z')
  })

  it('retains one creation per exact generation through the durable store contract', async () => {
    const { client, calls } = fixture()
    await client.begin(context)
    await failure(client.begin(context), 'invalid_contract')
    expect(calls).toHaveLength(2)
  })

  it('permits exactly one callback under concurrency and rejects replay without HTTP', async () => {
    const { client, calls } = fixture()
    const intent = await client.begin(context)
    const results = await Promise.allSettled([
      client.complete(context, callback(intent)),
      client.complete(context, callback(intent)),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const count = calls.length
    await failure(client.complete(context, callback(intent)), 'stale_generation')
    expect(calls).toHaveLength(count)
  })

  it.each([
    ['profileId', 'different-profile'],
    ['connectionId', 'different-connection'],
    ['grantId', 'different-grant'],
    ['institutionId', 'live-bank'],
  ])('rejects a mismatched %s before provider calls', async (key, value) => {
    const { client, calls } = fixture()
    const intent = await client.begin(context)
    const count = calls.length
    await failure(
      client.complete({ ...context, [key]: value }, callback(intent)),
      key === 'institutionId' ? 'sandbox_only' : 'stale_generation',
    )
    expect(calls).toHaveLength(count)
  })

  it.each([
    ['state', 'malformed'],
    ['state', 'A'.repeat(43)],
    ['applicationUserId', 'different-user'],
    ['institutionId', 'different-institution'],
  ])('rejects incorrect callback %s', async (key, value) => {
    const { client, calls } = fixture()
    const intent = await client.begin(context)
    await failure(
      client.complete(context, { ...callback(intent), [key]: value }),
      'stale_generation',
    )
    expect(calls).toHaveLength(2)
  })

  it('rejects a direct token in an OTT flow before claiming state or HTTP', async () => {
    const { client, store, calls } = fixture()
    const intent = await client.begin(context)
    await failure(
      client.complete(context, { ...callback(intent), kind: 'consent', consentToken: TOKEN }),
      'invalid_contract',
    )
    expect(store.claim).not.toHaveBeenCalled()
    expect(calls).toHaveLength(2)
  })

  it('rejects expired callback intents without provider calls', async () => {
    let now = NOW
    const { client, calls } = fixture(undefined, { clock: () => now })
    const intent = await client.begin(context)
    now += 600_000
    await failure(client.complete(context, callback(intent)), 'stale_generation')
    expect(calls).toHaveLength(2)
  })

  it('rejects a store that returns another generation despite claiming success', async () => {
    const { client, store, calls } = fixture()
    const intent = await client.begin(context)
    store.claim.mockImplementationOnce(async () => ({ ...intent, grantId: 'wrong-grant' }))
    await failure(client.complete(context, callback(intent)), 'stale_generation')
    expect(calls).toHaveLength(2)
  })

  it('keeps the draft when creation has an uncertain transport outcome and never retries', async () => {
    const { client, store, calls } = fixture((url) => {
      if (url.pathname === '/account-auth-requests') throw new Error('sensitive transport details')
    })
    await failure(client.begin(context), 'unavailable')
    expect(store.drafts.size).toBe(1)
    expect(store.activate).not.toHaveBeenCalled()
    expect(calls).toHaveLength(2)
  })

  it('does not activate a cancelled or replaced grant after provider creation', async () => {
    const { client, store } = fixture()
    store.activateAllowed = false
    await failure(client.begin(context), 'stale_generation')
    expect(store.drafts.size).toBe(1)
  })

  it.each([
    [
      { ...institution, data: [{ ...institution.data[0], environmentType: 'LIVE' }] },
      'sandbox_only',
    ],
    [{ meta: { count: 0 }, data: [] }, 'sandbox_only'],
    [{ ...institution, data: [{ ...institution.data[0], features: ['ACCOUNTS'] }] }, 'unsupported'],
    [{ ...institution, meta: { count: 2 } }, 'invalid_contract'],
  ])('does not create consent without validated sandbox discovery', async (body, code) => {
    const { client, calls } = fixture((url) =>
      url.pathname === '/institutions' ? response(body) : undefined,
    )
    await failure(client.begin(context), code)
    expect(calls).toHaveLength(1)
  })

  it.each([
    ['institutionId', 'different-institution', 'stale_generation'],
    ['applicationUserId', 'different-user', 'stale_generation'],
    [
      'authorisationUrl',
      'https://modelo.sandbox.invalid.attacker.invalid/auth',
      'invalid_contract',
    ],
    ['authorisationUrl', 'http://modelo.sandbox.invalid/auth', 'invalid_contract'],
    ['status', 'AUTHORIZED', 'consent_unusable'],
  ])('rejects incorrect creation response %s', async (key, value, code) => {
    const { client } = fixture((url) =>
      url.pathname === '/account-auth-requests'
        ? response({ data: { ...authorisation, [key]: value } }, 201)
        : undefined,
    )
    await failure(client.begin(context), code)
  })

  it.each([
    ['id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'stale_generation'],
    ['institutionId', 'different-institution', 'stale_generation'],
    ['applicationUserId', 'different-user', 'stale_generation'],
    ['state', 'different-provider-state', 'stale_generation'],
    ['status', 'AWAITING_AUTHORIZATION', 'consent_unusable'],
    ['expiresAt', '2026-10-04T09:59:59Z', 'consent_unusable'],
    ['reconfirmBy', '2026-10-04T09:59:59Z', 'consent_unusable'],
    ['expiresAt', '2026-02-30T10:00:00Z', 'invalid_contract'],
  ])('rejects incorrect exchanged consent %s', async (key, value, code) => {
    const { client, calls } = fixture((url) =>
      url.pathname === '/consent-one-time-token'
        ? response({ ...consent, [key]: value }, 201)
        : undefined,
    )
    const intent = await client.begin(context)
    await failure(client.complete(context, callback(intent)), code)
    expect(calls.some((call) => call.url.pathname === `/consents/${CONSENT_ID}`)).toBe(false)
  })

  it('rejects a token changed between OTT exchange and authoritative consent read', async () => {
    const { client } = fixture((url) =>
      url.pathname === `/consents/${CONSENT_ID}`
        ? response({ data: { ...consent, consentToken: 'changed-token' } })
        : undefined,
    )
    const intent = await client.begin(context)
    await failure(client.complete(context, callback(intent)), 'stale_generation')
  })

  it('fences a generation replaced while the final consent read settles', async () => {
    const { client, store } = fixture((url) => {
      if (url.pathname === `/consents/${CONSENT_ID}`) {
        store.currentGeneration = 'replacement-grant'
        return response({ data: consent })
      }
    })
    const intent = await client.begin(context)
    await failure(client.complete(context, callback(intent)), 'stale_generation')
  })

  it('rejects mixed callback tokens before claiming state or provider I/O', async () => {
    const { client, store, calls } = fixture()
    const intent = await client.begin(context)
    const ambiguous = { ...callback(intent), consentToken: TOKEN }
    await failure(client.complete(context, ambiguous), 'invalid_contract')
    expect(store.claim).not.toHaveBeenCalled()
    expect(calls).toHaveLength(2)
  })

  it('refuses financial read scopes missing from the accepted grant', async () => {
    const { client } = fixture((url) =>
      url.pathname === '/consent-one-time-token'
        ? response({ ...consent, featureScope: ['ACCOUNTS'] }, 201)
        : undefined,
    )
    const intent = await client.begin(context)
    await failure(client.complete(context, callback(intent)), 'unsupported')
  })

  it.each([401, 403, 404, 424, 429, 500, 302])(
    'does not retry POST after HTTP %s or follow redirects',
    async (status) => {
      const { client, calls } = fixture((url) =>
        url.pathname === '/account-auth-requests'
          ? response({ error: { message: 'sensitive-bank-message' } }, status, {
              location: 'https://attacker.invalid/',
            })
          : undefined,
      )
      await expect(client.begin(context)).rejects.toBeDefined()
      expect(calls).toHaveLength(2)
      expect(calls.every((call) => call.url.origin === 'https://api.yapily.com')).toBe(true)
    },
  )

  it('rejects excessive response length and duplicate-key JSON', async () => {
    for (const malformed of [
      response(institution, 200, { 'content-length': '4194305' }),
      new Response('{"data":[],"data":[]}', { headers: { 'content-type': 'application/json' } }),
    ]) {
      const { client } = fixture(() => malformed)
      await expect(client.begin(context)).rejects.toBeDefined()
    }
  })

  it('cancels a noncooperating transport promptly and never activates its late response', async () => {
    let release: ((response: Response) => void) | undefined
    const { client, store } = fixture((url) =>
      url.pathname === '/account-auth-requests'
        ? new Promise((resolve) => {
            release = resolve
          })
        : undefined,
    )
    const pending = client.begin(context)
    await vi.waitFor(() => expect(release).toBeDefined())
    client.close()
    await failure(pending, 'cancelled')
    release?.(response({ data: authorisation }, 201))
    await Promise.resolve()
    expect(store.activate).not.toHaveBeenCalled()
  })

  it('interrupts a stalled response body and enforces a bounded whole operation timeout', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'))
      },
    })
    const { client } = fixture(
      () => new Response(body, { headers: { 'content-type': 'application/json' } }),
      { timeoutMs: 20 },
    )
    await failure(client.begin(context), 'timeout')
  })

  it('refuses further work after close without HTTP', async () => {
    const { client, calls } = fixture()
    client.close()
    await failure(client.begin(context), 'cancelled')
    expect(calls).toHaveLength(0)
  })

  it('rejects an already-aborted signal before staging an intent', async () => {
    const { client, store, calls } = fixture()
    const controller = new AbortController()
    controller.abort()
    await failure(client.begin(context, controller.signal), 'cancelled')
    expect(store.stage).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it.each([
    { callbackURL: 'http://isolated.lilleri.invalid/bank/callback' },
    { callbackURL: 'https://isolated.lilleri.invalid/bank/callback?unexpected=1' },
    { callbackURL: 'https://127.0.0.1/bank/callback' },
    { authorisationOrigins: ['https://modelo.sandbox.invalid/'] },
    { authorisationOrigins: [] },
    { applicationId: 'forbidden:credential' },
    { timeoutMs: 0 },
  ])('rejects malformed configuration with categorical secret-free errors', (options) => {
    expect(() => fixture(undefined, options)).toThrowError('configuration')
  })
})
