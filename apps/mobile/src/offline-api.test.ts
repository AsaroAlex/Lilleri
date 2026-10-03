import { createApiClient } from '@lilleri/api-client'
import { describe, expect, test } from 'vitest'
import { matchesVerifiedOverview, offlineGatedApi } from './offline-api'

describe('financial offline boundary', () => {
  test('actual API methods and child request ports cannot send while read-only; overview retry remains available', async () => {
    const requests: { method: string; url: string }[] = []
    const client = createApiClient('http://127.0.0.1:3001', async (input, init) => {
      requests.push({ method: init?.method ?? 'GET', url: String(input) })
      return new Response(JSON.stringify({ mode: 'synthetic' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })
    let blocked = true
    const api = offlineGatedApi(
      client,
      () => blocked,
      () => 'Read only',
    )
    const calls = [
      api.correct('transaction', 'groceries', 'once', 1),
      api.disconnect('connection'),
      api.erase(),
      api.exportData(),
      api.exportArchive(),
      api.connectMock(),
      api.request('/v1/privacy', { method: 'PATCH', body: '{}' }),
      api.request('/v1/settings'),
    ]
    expect(api.request).toBe(api.request)
    expect(api.overview).toBe(api.overview)
    for (const call of calls)
      await expect(call).rejects.toMatchObject({ code: 'offline_read_only', status: 503 })
    expect(requests).toEqual([])
    await api.overview()
    expect(requests).toEqual([{ method: 'GET', url: 'http://127.0.0.1:3001/v1/demo' }])
    blocked = false
    await api.request('/v1/settings')
    expect(requests).toHaveLength(2)
  })
  test('complete original view preserves exact huge money; truncation, mutation and foreign profile are rejected', () => {
    const snapshot = {
      mode: 'synthetic',
      profile: { id: 'profile', name: 'Synthetic', timezone: 'Europe/Rome' },
      accounts: [
        {
          id: 'account',
          profileId: 'profile',
          connectionId: 'connection',
          providerAccountId: 'source-account',
          name: 'Synthetic',
          institutionName: 'Synthetic fixture',
          kind: 'current',
          balanceUpdatedAt: '2026-10-03T00:00:00.000Z',
          balance: { amountMinor: '900719925474099301', currency: 'EUR' },
        },
      ],
      transactions: [],
      connections: [],
      analysis: { matches: [], classifications: [], recurring: [], reviewItems: [], summaries: [] },
    }
    const verified = JSON.stringify(snapshot)
    expect(matchesVerifiedOverview(JSON.parse(verified), verified)).toBe(true)
    expect(matchesVerifiedOverview({ ...snapshot, accounts: [] }, verified)).toBe(false)
    expect(
      matchesVerifiedOverview(
        { ...snapshot, profile: { ...snapshot.profile, id: 'foreign' } },
        verified,
      ),
    ).toBe(false)
    expect(matchesVerifiedOverview({ ...snapshot, analysis: {} }, verified)).toBe(false)
    const invalid = {
      ...snapshot,
      accounts: [{ ...snapshot.accounts[0], balance: { amountMinor: 123, currency: 'EUR' } }],
    }
    expect(matchesVerifiedOverview(invalid, JSON.stringify(invalid))).toBe(false)
    const foreign = { ...snapshot, accounts: [{ ...snapshot.accounts[0], profileId: 'foreign' }] }
    expect(matchesVerifiedOverview(foreign, JSON.stringify(foreign))).toBe(false)
    expect(matchesVerifiedOverview(snapshot, null)).toBe(false)
  })
  test('every public destructive path invalidates before fetch, including failed source/profile erasure', async () => {
    let validCache = true
    let requests = 0
    const client = createApiClient('http://127.0.0.1:3001', async () => {
      expect(validCache, 'cache must be invalid before network I/O begins').toBe(false)
      requests++
      return new Response(JSON.stringify({ code: 'source_erasure_incomplete' }), { status: 500 })
    })
    const api = offlineGatedApi(
      client,
      () => false,
      () => '',
      () => {
        validCache = false
      },
    )
    for (const erase of [
      () => api.erase(),
      () => api.disconnect('source', 'erase'),
      () => api.request('/v1/connections/source', { method: 'DELETE', body: '{}' }),
    ]) {
      validCache = true
      await expect(erase()).rejects.toMatchObject({
        status: 500,
        code: 'source_erasure_incomplete',
      })
      expect(validCache).toBe(false)
    }
    expect(requests).toBe(3)
  })
})
