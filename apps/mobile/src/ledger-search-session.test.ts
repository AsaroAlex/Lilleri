import {
  ApiError,
  createApiClient,
  type LedgerReadPage,
  type TransactionDto,
} from '@lilleri/api-client'
import { describe, expect, test } from 'vitest'
import { LedgerSearchSession, type LedgerSearchState } from './ledger-search-session'

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const transaction = (id: string, profileId = 'owned'): TransactionDto => ({
  id,
  profileId,
  accountId: 'account',
  connectionId: 'connection',
  providerId: 'synthetic',
  providerTransactionId: id,
  revision: 1,
  source: 'bank',
  status: 'booked',
  amount: { amountMinor: '-9007199254740993', currency: 'EUR' },
  description: 'Sintetico',
  merchantName: null,
  merchantKey: null,
  bookedOn: '2026-10-01',
  authorizedOn: null,
  observedAt: '2026-10-04T00:00:00.000Z',
  kind: 'expense',
  reference: null,
  relatedTransactionId: null,
  relatedAccountId: null,
})
const page = (items: readonly TransactionDto[], cursor: string | null = null): LedgerReadPage => ({
  items,
  privacy: [],
  nextCursor: cursor,
  hasMore: cursor !== null,
  searchComplete: cursor === null,
  revision: 'a'.repeat(64),
  readAt: '2026-10-04T00:00:00.000Z',
})
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

describe('ledger UI queries and identity fences', () => {
  test('query changes abort the old request and late responses cannot replace the new result or mutate the other query', async () => {
    const old = deferred<Response>(),
      recent = deferred<Response>(),
      states: LedgerSearchState[] = []
    const calls: { url: string; init?: RequestInit }[] = []
    const client = createApiClient('http://localhost:3191', (async (url, init) => {
      calls.push({ url: String(url), ...(init ? { init } : {}) })
      return calls.length === 1 ? old.promise : recent.promise
    }) as typeof fetch)
    const controller = new LedgerSearchSession(
      client,
      (state) => states.push(state),
      () => false,
    )
    const first = controller.start({
      profileId: 'owned',
      query: {
        q: 'CAFÉ %_',
        accountId: 'my/account',
        currency: 'EUR',
        from: '2020-01-01',
        to: '2026-10-04',
      },
      history90: false,
      current: () => true,
    })
    const second = controller.start({
      profileId: 'owned',
      query: { q: 'new' },
      history90: false,
      current: () => true,
    })
    expect(calls[0]?.init?.signal?.aborted).toBe(true)
    const firstUrl = new URL(calls[0]?.url ?? '')
    expect(firstUrl.pathname).toBe('/v1/ledger/search')
    expect(firstUrl.searchParams.get('q')).toBe('CAFÉ %_')
    expect(firstUrl.searchParams.get('accountId')).toBe('my/account')
    expect(calls[0]?.init?.credentials).toBe('include')
    recent.resolve(response(page([transaction('new')])))
    await second
    old.resolve(response(page([transaction('old')])))
    await first
    expect(states.at(-1)?.items.map((item) => item.id)).toEqual(['new'])
  })

  test('changing current profile/session or going offline during a request prevents accepting any financial result', async () => {
    for (const stop of ['session', 'offline']) {
      const delayed = deferred<Response>(),
        states: LedgerSearchState[] = []
      let current = true
      const client = createApiClient(
        'http://localhost:3191',
        (() => delayed.promise) as typeof fetch,
      )
      const controller = new LedgerSearchSession(
        client,
        (state) => states.push(state),
        () => false,
      )
      const task = controller.start({
        profileId: 'owned',
        query: {},
        history90: false,
        current: () => current,
      })
      current = false
      if (stop === 'session') controller.stop()
      delayed.resolve(response(page([transaction('private')])))
      await task
      expect(states.some((state) => state.items.length > 0)).toBe(false)
    }
  })

  test('empty intermediate search pages expose continuation; next page appends exact facts and stale pagination removes the mixed view', async () => {
    const states: LedgerSearchState[] = [],
      urls: string[] = []
    const replies = [
      response(page([], 'first')),
      response(page([transaction('old')], 'second')),
      response({ code: 'ledger_changed', detail: 'Changed' }, 409),
    ]
    const client = createApiClient('http://localhost:3191', (async (url) => {
      urls.push(String(url))
      const next = replies.shift()
      if (!next) throw new Error('Missing response')
      return next
    }) as typeof fetch)
    const controller = new LedgerSearchSession(
      client,
      (state) => states.push(state),
      () => false,
    )
    await controller.start({
      profileId: 'owned',
      query: { q: 'old' },
      history90: false,
      current: () => true,
    })
    expect(states.at(-1)).toMatchObject({ items: [], searchComplete: false, nextCursor: 'first' })
    await controller.more()
    expect(states.at(-1)?.items[0]?.amount.amountMinor).toBe('-9007199254740993')
    expect(new URL(urls[1] ?? '').searchParams.get('cursor')).toBe('first')
    await controller.more()
    expect(states.at(-1)?.items).toEqual([])
    expect(states.at(-1)?.error).toBeInstanceOf(ApiError)
    expect(states.at(-1)?.nextCursor).toBeNull()
  })

  test('projection requests use the authoritative route; cross-profile results and revoked sessions invoke identity loss without publishing facts', async () => {
    const states: LedgerSearchState[] = [],
      failures: unknown[] = [],
      urls: string[] = []
    const replies = [
      response(page([transaction('foreign', 'other')])),
      response({ code: 'session_invalid', detail: 'Sign in' }, 401),
    ]
    const client = createApiClient('http://localhost:3191', (async (url) => {
      urls.push(String(url))
      return replies.shift() as Response
    }) as typeof fetch)
    const controller = new LedgerSearchSession(
      client,
      (state) => states.push(state),
      (cause) => {
        failures.push(cause)
        return true
      },
    )
    for (let index = 0; index < 2; index++)
      await controller.start({
        profileId: 'owned',
        query: { currency: 'GBP' },
        history90: true,
        current: () => true,
      })
    expect(new URL(urls[0] ?? '').pathname).toBe('/v1/ledger/projection')
    expect(failures).toHaveLength(2)
    expect(states.every((state) => state.items.length === 0)).toBe(true)
  })
})
