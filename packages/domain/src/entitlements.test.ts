import { describe, expect, test } from 'vitest'
import {
  admitSource,
  LATER_CAPABILITIES,
  LOCAL_SOURCE_POLICY,
  NEVER_GATED_CAPABILITIES,
  resolveEntitlements,
  type SourceAdmissionPolicy,
} from './entitlements.js'

const now = '2026-10-03T12:00:00.000Z',
  until = '2026-10-04T12:00:00.000Z',
  livePolicy: SourceAdmissionPolicy = {
    version: 'fixture-only-envelope-v1',
    liveConnectionsEnabled: true,
    gratis: { maxInstitutions: 1, maxAccounts: 2 },
    plus: { maxInstitutions: 3, maxAccounts: 6 },
  },
  gratis = resolveEntitlements({ mode: 'commercial', now })
describe('pure capability policy without billing', () => {
  test.each(['active', 'grace', 'cancelled', 'pending', 'expired', 'refunded'] as const)(
    'correctness and rights remain available for %s and after exact expiry',
    (status) => {
      const before = resolveEntitlements({
          mode: 'commercial',
          now,
          verifiedPlus: { status, validUntil: until },
        }),
        expired = resolveEntitlements({
          mode: 'commercial',
          now: until,
          verifiedPlus: { status, validUntil: until },
        })
      expect(before.plan).toBe(
        ['active', 'grace', 'cancelled'].includes(status) ? 'plus' : 'gratis',
      )
      expect(expired.plan).toBe('gratis')
      for (const capability of NEVER_GATED_CAPABILITIES) {
        expect(before.capabilities[capability]).toBe(true)
        expect(expired.capabilities[capability]).toBe(true)
      }
      for (const capability of LATER_CAPABILITIES)
        expect(before.capabilities[capability]).toBe(false)
      expect(before).toMatchObject({ purchaseAvailable: false, automaticCharge: false })
    },
  )
  test('the synthetic beta has no purchases, preview expiry or Later features', () => {
    const beta = resolveEntitlements({ mode: 'closed_beta', now })
    expect(beta.plan).toBe('closed_beta')
    expect(beta.capabilities['source.bank.multiple_institutions']).toBe(true)
    expect(beta.purchaseAvailable).toBe(false)
    expect(beta.automaticCharge).toBe(false)
    for (const capability of LATER_CAPABILITIES) expect(beta.capabilities[capability]).toBe(false)
  })
  test('invalid lifecycle dates fail rather than granting access', () => {
    expect(() => resolveEntitlements({ mode: 'commercial', now: 'not-a-date' })).toThrow()
    expect(() =>
      resolveEntitlements({
        mode: 'commercial',
        now,
        verifiedPlus: { status: 'active', validUntil: 'not-a-date' },
      }),
    ).toThrow()
  })
})
describe('future connected-source admission retains data rights', () => {
  const first = { institutionId: 'fixture-a', accountId: 'fixture-account-1' },
    second = { institutionId: 'fixture-a', accountId: 'fixture-account-2' }
  test('a Gratis reconnect is idempotent; a third account or second institution is denied', () => {
    const input = { source: 'live_bank' as const, entitlements: gratis, policy: livePolicy }
    expect(admitSource({ ...input, active: [first, second], requested: [first] })).toEqual({
      allowed: true,
    })
    expect(
      admitSource({
        ...input,
        active: [first, second],
        requested: [{ institutionId: 'fixture-a', accountId: 'third' }],
      }),
    ).toEqual({ allowed: false, code: 'connected_source_limit' })
    expect(
      admitSource({
        ...input,
        active: [first],
        requested: [{ institutionId: 'fixture-b', accountId: 'other' }],
      }),
    ).toEqual({ allowed: false, code: 'connected_source_limit' })
  })
  test('source breadth can expire while retained data, rules and free actions remain available', () => {
    const state = { status: 'active' as const, validUntil: until },
      active = [first, second],
      requested = [{ institutionId: 'fixture-b', accountId: 'other' }],
      plus = resolveEntitlements({ mode: 'commercial', now, verifiedPlus: state }),
      expired = resolveEntitlements({ mode: 'commercial', now: until, verifiedPlus: state })
    expect(
      admitSource({
        source: 'live_bank',
        entitlements: plus,
        policy: livePolicy,
        active,
        requested,
      }),
    ).toEqual({ allowed: true })
    expect(
      admitSource({
        source: 'live_bank',
        entitlements: expired,
        policy: livePolicy,
        active,
        requested,
      }),
    ).toEqual({ allowed: false, code: 'connected_source_limit' })
    for (const capability of NEVER_GATED_CAPABILITIES)
      expect(expired.capabilities[capability]).toBe(true)
    expect(active).toEqual([first, second])
    expect(requested).toEqual([{ institutionId: 'fixture-b', accountId: 'other' }])
  })
  test.each(['manual', 'csv', 'synthetic'] as const)(
    '%s sources have no commercial account envelope, including after downgrade',
    (source) => {
      const requested = Array.from({ length: 30 }, (_, index) => ({
        institutionId: `fixture-${index}`,
        accountId: `account-${index}`,
      }))
      expect(
        admitSource({
          source,
          entitlements: gratis,
          policy: LOCAL_SOURCE_POLICY,
          active: [],
          requested,
        }),
      ).toEqual({ allowed: true })
    },
  )
  test('unconfigured live connectivity and unknown Plus limits fail closed', () => {
    expect(
      admitSource({
        source: 'live_bank',
        entitlements: gratis,
        policy: LOCAL_SOURCE_POLICY,
        active: [],
        requested: [first],
      }),
    ).toEqual({ allowed: false, code: 'live_connections_unavailable' })
    const beta = resolveEntitlements({ mode: 'closed_beta', now })
    expect(
      admitSource({
        source: 'live_bank',
        entitlements: beta,
        policy: { ...LOCAL_SOURCE_POLICY, liveConnectionsEnabled: true },
        active: [],
        requested: [first],
      }),
    ).toEqual({ allowed: false, code: 'connected_source_policy_unconfigured' })
  })
})
