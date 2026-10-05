import { ApiError, createApiClient } from '@lilleri/api-client'
import { describe, expect, test } from 'vitest'
import { bankAuthorizationProblem, billingProblem } from './hosted-flows'
import { offlineGatedApi } from './offline-api'

interface Sent {
  readonly method: string
  readonly url: string
  readonly body: unknown
  readonly credentials: RequestCredentials | undefined
  readonly contentType: string | null
  readonly signal: AbortSignal | null | undefined
}
function recordingClient(responses: (() => Response)[] = []) {
  const sent: Sent[] = []
  const client = createApiClient('https://app.lilleri.example/', async (input, init) => {
    sent.push({
      method: init?.method ?? 'GET',
      url: String(input),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      credentials: init?.credentials,
      contentType: new Headers(init?.headers).get('Content-Type'),
      signal: init?.signal,
    })
    const next = responses.shift()
    return next
      ? next()
      : new Response(JSON.stringify({ url: 'https://example.invalid/ok' }), {
          headers: { 'Content-Type': 'application/json' },
        })
  })
  return { client, sent }
}
const problem = (status: number, code: string) => () =>
  new Response(JSON.stringify({ status, code, detail: 'PRIVATE_SERVER_DETAIL' }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })

describe('bank and billing API client request shapes', () => {
  test('bank institutions are read for one market with the cookie session and an abort signal', async () => {
    const { client, sent } = recordingClient()
    const abort = new AbortController()
    await client.bankInstitutions('IT', abort.signal)
    await client.bankInstitutions('I T&x=1')
    expect(sent[0]).toMatchObject({
      method: 'GET',
      url: 'https://app.lilleri.example/v1/bank/institutions?country=IT',
      body: undefined,
      credentials: 'include',
      signal: abort.signal,
    })
    expect(sent[1]?.url).toBe(
      'https://app.lilleri.example/v1/bank/institutions?country=I%20T%26x%3D1',
    )
  })
  test('a bank authorisation sends only the institution, language and optional renewal connection', async () => {
    const { client, sent } = recordingClient()
    await client.startBankAuthorization({ institutionId: 'IT:Intesa Sanpaolo', language: 'it' })
    await client.startBankAuthorization({
      institutionId: 'IT:Intesa Sanpaolo',
      language: 'en',
      connectionId: 'connection-1',
    })
    expect(
      sent.map(({ method, url, body, contentType }) => ({ method, url, body, contentType })),
    ).toEqual([
      {
        method: 'POST',
        url: 'https://app.lilleri.example/v1/bank/authorizations',
        body: { institutionId: 'IT:Intesa Sanpaolo', language: 'it' },
        contentType: 'application/json',
      },
      {
        method: 'POST',
        url: 'https://app.lilleri.example/v1/bank/authorizations',
        body: { institutionId: 'IT:Intesa Sanpaolo', language: 'en', connectionId: 'connection-1' },
        contentType: 'application/json',
      },
    ])
  })
  test('billing reads, checkout and portal use their documented routes and bodies', async () => {
    const { client, sent } = recordingClient()
    const abort = new AbortController()
    await client.billing(abort.signal)
    await client.startCheckout('month')
    await client.startCheckout('year')
    await client.openBillingPortal()
    expect(sent.map(({ method, url, body }) => ({ method, url, body }))).toEqual([
      { method: 'GET', url: 'https://app.lilleri.example/v1/billing', body: undefined },
      {
        method: 'POST',
        url: 'https://app.lilleri.example/v1/billing/checkout',
        body: { interval: 'month' },
      },
      {
        method: 'POST',
        url: 'https://app.lilleri.example/v1/billing/checkout',
        body: { interval: 'year' },
      },
      { method: 'POST', url: 'https://app.lilleri.example/v1/billing/portal', body: {} },
    ])
    expect(sent[0]?.signal).toBe(abort.signal)
    expect(sent.every((request) => request.credentials === 'include')).toBe(true)
  })
  test('problem codes surface as typed errors without exposing server detail in the UI mapping', async () => {
    const { client } = recordingClient([
      problem(409, 'plus_required'),
      problem(409, 'bank_capacity_reached'),
      problem(502, 'provider_unavailable'),
      problem(409, 'already_subscribed'),
      problem(409, 'no_billing_account'),
      problem(403, 'forbidden'),
    ])
    const failures = await Promise.allSettled([
      client.startBankAuthorization({ institutionId: 'IT:A', language: 'it' }),
      client.startBankAuthorization({ institutionId: 'IT:A', language: 'it' }),
      client.startBankAuthorization({ institutionId: 'IT:A', language: 'it' }),
      client.startCheckout('month'),
      client.openBillingPortal(),
      client.startCheckout('year'),
    ])
    const reasons = failures.map((result) =>
      result.status === 'rejected' ? (result.reason as ApiError) : null,
    )
    expect(reasons.every((reason) => reason instanceof ApiError)).toBe(true)
    expect(reasons.slice(0, 3).map(bankAuthorizationProblem)).toEqual([
      'plus_required',
      'capacity_reached',
      'provider_unavailable',
    ])
    expect(reasons.slice(3).map(billingProblem)).toEqual([
      'already_subscribed',
      'no_billing_account',
      'not_owner',
    ])
  })
  test('the offline boundary also fences bank and billing requests', async () => {
    const { client, sent } = recordingClient()
    const api = offlineGatedApi(
      client,
      () => true,
      () => 'Read only',
    )
    for (const call of [
      api.bankInstitutions('IT'),
      api.startBankAuthorization({ institutionId: 'IT:A', language: 'it' }),
      api.billing(),
      api.startCheckout('month'),
      api.openBillingPortal(),
    ])
      await expect(call).rejects.toMatchObject({ status: 503, code: 'offline_read_only' })
    expect(sent).toEqual([])
  })
})
