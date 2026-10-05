import { describe, expect, it } from 'vitest'
import {
  discoverInstitutions,
  type FinancialDataProviderV2,
  type InstitutionCoverage,
  institutionPickerDecision,
  MockItalianProvider,
  type ProviderAuthorization,
  type ProviderDiscoveryMetadata,
  unknownInstitution,
  validateDiscoveryMetadata,
  validateInstitutionCoverage,
  validateInstitutionPage,
  validateProviderAuthorization,
  validateProviderConnectionGrant,
  validateSyntheticSyncMetadata,
} from './index.js'

const context = { profileId: 'profile-synthetic', connectionId: 'connection-synthetic' }
const provider = new MockItalianProvider()
const metadata = provider.discoveryMetadata()
const liveMetadata: ProviderDiscoveryMetadata = { ...metadata, environment: 'live' }

async function fixture(): Promise<InstitutionCoverage> {
  const [institution] = await discoverInstitutions(provider)
  if (!institution) throw new Error('Missing fixture institution')
  return institution
}

function pageable(
  listInstitutions: FinancialDataProviderV2['listInstitutions'],
  pagination: ProviderDiscoveryMetadata['pagination'] = {
    maxPageSize: 2,
    maxPages: 3,
    maxCursorBytes: 32,
  },
) {
  return {
    id: metadata.providerId,
    discoveryMetadata: () => ({ ...metadata, pagination }),
    listInstitutions,
  }
}

describe('coverage provenance and institution picker policy', () => {
  it('lists fixture account-type coverage without promoting it to real support', async () => {
    const institution = await fixture()
    expect(institution.id).toBe('synthetic-italian')
    expect(institution.accountTypes.map((item) => item.kind)).toEqual([
      'current',
      'savings',
      'card',
      'cash',
    ])
    for (const kind of ['current', 'savings', 'card', 'cash'] as const) {
      expect(institutionPickerDecision(institution, kind, 'synthetic')).toEqual({
        connectable: true,
        status: 'synthetic',
        reason: 'synthetic_fixture',
        manualFallback: true,
      })
      expect(institutionPickerDecision(institution, kind, 'live').connectable).toBe(false)
      expect(institutionPickerDecision(institution, kind, 'sandbox').connectable).toBe(false)
    }
  })

  it('derives fixture history from received dates and preserves missing history', async () => {
    const custom = new MockItalianProvider([
      {
        id: 'later',
        accountId: 'conto',
        amount: '-1.00',
        currency: 'EUR',
        description: 'Synthetic',
        status: 'booked',
        bookedOn: '2026-09-04',
      },
    ])
    const [institution] = await discoverInstitutions(custom)
    expect(institution?.accountTypes.find((item) => item.kind === 'current')?.historyFrom).toBe(
      '2026-09-04',
    )
    expect(institution?.accountTypes.find((item) => item.kind === 'card')?.historyFrom).toBeNull()
  })

  it('keeps any configured real-looking bank name unknown with a manual fallback', () => {
    const institution = unknownInstitution(liveMetadata, {
      id: 'unmeasured-institution',
      name: 'Banca italiana non verificata',
      countryCode: 'IT',
    })
    expect(institution.accountTypes.every((item) => item.availability === 'unknown')).toBe(true)
    expect(institutionPickerDecision(institution, 'current', 'live')).toEqual({
      connectable: false,
      status: 'unknown',
      reason: 'unknown',
      manualFallback: true,
    })
  })

  it('requires per-type verified evidence in the same environment', () => {
    const institution = validateInstitutionCoverage(
      {
        id: 'measured-institution',
        providerId: liveMetadata.providerId,
        name: 'Provider-issued test name',
        countryCode: 'IT',
        accountTypes: [
          {
            kind: 'current',
            availability: 'available',
            evidence: {
              status: 'verified',
              environment: 'live',
              reference: 'injected-test-evidence-not-real-provider-proof',
              checkedAt: '2026-10-03T12:00:00Z',
            },
            historyFrom: null,
          },
        ],
      },
      liveMetadata,
    )
    expect(institutionPickerDecision(institution, 'current', 'live').connectable).toBe(true)
    expect(institutionPickerDecision(institution, 'card', 'live').connectable).toBe(false)
    expect(institutionPickerDecision(institution, 'current', 'sandbox').reason).toBe(
      'environment_mismatch',
    )
  })

  it('never permits provider-advertised but unverified availability', () => {
    const institution = unknownInstitution(liveMetadata, {
      id: 'advertised',
      name: 'Advertised institution',
      countryCode: 'IT',
    })
    const advertised = {
      ...institution,
      accountTypes: institution.accountTypes.map((item) => ({
        ...item,
        availability: 'available' as const,
        evidence: { ...item.evidence, status: 'unverified' as const, reference: 'advertisement' },
      })),
    }
    expect(institutionPickerDecision(advertised, 'current', 'live').reason).toBe('unverified')
  })

  it.each([
    {
      status: 'verified',
      environment: 'synthetic',
      reference: 'fixture',
      checkedAt: '2026-10-03T00:00:00Z',
    },
    {
      status: 'synthetic',
      environment: 'live',
      reference: 'fixture',
      checkedAt: '2026-10-03T00:00:00Z',
    },
    { status: 'verified', environment: 'live', reference: null, checkedAt: null },
    {
      status: 'verified',
      environment: 'live',
      reference: 'bad-date',
      checkedAt: '2026-02-30T00:00:00Z',
    },
  ])('rejects contradictory or missing evidence %#', async (evidence) => {
    const institution = await fixture()
    const kind = institution.accountTypes[0]
    expect(() =>
      validateInstitutionCoverage(
        { ...institution, accountTypes: [{ ...kind, evidence }] },
        {
          ...metadata,
          environment: evidence.environment as ProviderDiscoveryMetadata['environment'],
        },
      ),
    ).toThrow('provider contract')
  })

  it('rejects guessed unknown coverage/history, duplicate kinds and undeclared secret fields', async () => {
    const synthetic = await fixture()
    const institution = unknownInstitution(liveMetadata, {
      id: 'unknown',
      name: 'Unknown',
      countryCode: 'IT',
    })
    const kind = institution.accountTypes[0]
    expect(() =>
      validateInstitutionCoverage(
        { ...institution, accountTypes: [{ ...kind, availability: 'available' }] },
        liveMetadata,
      ),
    ).toThrow('unknown coverage claim')
    expect(() =>
      validateInstitutionCoverage(
        { ...institution, accountTypes: [{ ...kind, historyFrom: '2026-01-01' }] },
        liveMetadata,
      ),
    ).toThrow('unknown history claim')
    expect(() =>
      validateInstitutionCoverage({ ...institution, accountTypes: [kind, kind] }, liveMetadata),
    ).toThrow('duplicate account type')
    expect(() =>
      validateInstitutionCoverage({ ...synthetic, accessToken: 'must-not-leak' }, metadata),
    ).toThrow('unexpected field')
  })
})

describe('bounded discovery contract', () => {
  it('returns a complete catalogue across opaque cursors in order', async () => {
    const institution = await fixture()
    const calls: (string | null | undefined)[] = []
    const records = await discoverInstitutions(
      pageable(async (cursor) => {
        calls.push(cursor)
        return {
          institutions: [{ ...institution, id: cursor === null ? 'first' : 'second' }],
          nextCursor: cursor === null ? 'opaque+/=' : null,
          coverageVersion: metadata.coverageVersion,
        }
      }),
    )
    expect(calls).toEqual([null, 'opaque+/='])
    expect(records.map((item) => item.id)).toEqual(['first', 'second'])
  })

  it('rejects repeated cursors, repeated institutions and truncated page budgets', async () => {
    const institution = await fixture()
    let index = 0
    await expect(
      discoverInstitutions(
        pageable(async () => ({
          institutions: [{ ...institution, id: `item-${index++}` }],
          nextCursor: 'repeat',
          coverageVersion: metadata.coverageVersion,
        })),
      ),
    ).rejects.toThrow('repeated institution cursor')
    await expect(
      discoverInstitutions(
        pageable(async (cursor) => ({
          institutions: [institution],
          nextCursor: cursor === null ? 'next' : null,
          coverageVersion: metadata.coverageVersion,
        })),
      ),
    ).rejects.toThrow('repeated across pages')
    await expect(
      discoverInstitutions(
        pageable(
          async () => ({
            institutions: [institution],
            nextCursor: 'next',
            coverageVersion: metadata.coverageVersion,
          }),
          { ...metadata.pagination, maxPages: 1 },
        ),
      ),
    ).rejects.toThrow('page budget')
  })

  it('rejects oversize pages/cursors, empty advancing pages and coverage version drift', async () => {
    const institution = await fixture()
    const page = {
      institutions: [institution],
      nextCursor: null,
      coverageVersion: metadata.coverageVersion,
    }
    expect(() =>
      validateInstitutionPage({ ...page, institutions: [institution, institution] }, metadata),
    ).toThrow('limit')
    expect(() =>
      validateInstitutionPage({ ...page, nextCursor: 'x'.repeat(33) }, metadata),
    ).toThrow('invalid text')
    expect(() =>
      validateInstitutionPage({ ...page, institutions: [], nextCursor: 'next' }, metadata),
    ).toThrow('empty page')
    expect(() =>
      validateInstitutionPage({ ...page, coverageVersion: 'changed' }, metadata),
    ).toThrow('version changed')
    expect(() => validateInstitutionPage({ ...page, nextCursor: 'next\u0000' }, metadata)).toThrow(
      'invalid text',
    )
    await expect(
      discoverInstitutions({
        ...pageable(provider.listInstitutions.bind(provider)),
        id: 'other-provider',
      }),
    ).rejects.toThrow('identity mismatch')
  })

  it('preserves unknown/zero refresh budgets and rejects malformed budgets and limits', () => {
    expect(
      validateDiscoveryMetadata({
        ...metadata,
        refresh: { userPresent: 'unknown', unattendedBudget: null },
      }).refresh.unattendedBudget,
    ).toBeNull()
    expect(
      validateDiscoveryMetadata({
        ...metadata,
        refresh: {
          userPresent: 'unsupported',
          unattendedBudget: {
            requests: 0,
            windowSeconds: 86400,
            evidenceReference: 'no-background-access',
          },
        },
      }).refresh.unattendedBudget?.requests,
    ).toBe(0)
    expect(() =>
      validateDiscoveryMetadata({
        ...metadata,
        pagination: { ...metadata.pagination, maxPages: 0 },
      }),
    ).toThrow('integer bound')
    expect(() =>
      validateDiscoveryMetadata({
        ...metadata,
        refresh: {
          ...metadata.refresh,
          unattendedBudget: { requests: 4, windowSeconds: 0, evidenceReference: 'bad' },
        },
      }),
    ).toThrow('integer bound')
    expect(() =>
      validateDiscoveryMetadata({
        ...metadata,
        refresh: {
          ...metadata.refresh,
          unattendedBudget: { requests: 4, windowSeconds: 86400, evidenceReference: '' },
        },
      }),
    ).toThrow('invalid text')
  })

  it('admits sandbox/live resumable sync metadata and rejects unknown environments', () => {
    const sync = provider.syncMetadata()
    for (const environment of ['synthetic', 'sandbox', 'live'] as const)
      expect(validateSyntheticSyncMetadata({ ...sync, environment }).environment).toBe(environment)
    for (const environment of ['production', 'SANDBOX', '', null])
      expect(() => validateSyntheticSyncMetadata({ ...sync, environment })).toThrow('invalid enum')
  })

  it.each(['', '1', '01', '-7', '7e0', '7.0', ' 7', '7 ', '9007199254740993'])(
    'rejects noncanonical transaction cursor %s',
    async (cursor) => {
      await expect(provider.getTransactions(context, 'conto', cursor)).rejects.toThrow(
        'Invalid cursor',
      )
    },
  )
})

describe('provider-derived authorization and renewal', () => {
  it('keeps consent, SCA, session and token dates separate without fabricated terms', async () => {
    const grant = validateProviderConnectionGrant(
      await provider.createConnection(context),
      metadata,
    )
    expect(grant.authorization.consentExpiresAt).toBe('2027-03-31T23:59:59Z')
    expect(grant.authorization.scaDueAt).toBeNull()
    expect(grant.authorization.providerSessionExpiresAt).toBeNull()
    expect(grant.authorization.tokenExpiresAt).toBeNull()
    expect(grant.authorization.requiredActions[0]?.dueAt).toBe(grant.consentExpiresAt)
    expect(
      validateProviderConnectionGrant(await provider.renewConnection(context), metadata),
    ).toEqual(grant)
    await provider.disconnect(context)
    await expect(provider.renewConnection(context)).rejects.toThrow('revoked')
  })

  it('rejects stale renewal generations and unknown institutions without replacing the grant', async () => {
    const isolated = new MockItalianProvider()
    await isolated.createConnection({ ...context, grantId: 'current-generation' })
    await expect(
      isolated.renewConnection({ ...context, grantId: 'old-generation' }),
    ).rejects.toThrow('generation is stale')
    await expect(
      isolated.createConnection({
        ...context,
        institutionId: 'unmeasured-real-bank',
        grantId: 'replacement',
      }),
    ).rejects.toThrow('Unknown synthetic institution')
    await expect(
      isolated.refreshConnection({ ...context, grantId: 'current-generation' }),
    ).resolves.toBeUndefined()
  })

  it('retains unknown expiry as unknown rather than an indefinite or fixed 180-day term', () => {
    const authorization: ProviderAuthorization = {
      providerId: metadata.providerId,
      institutionId: 'unknown-term',
      state: 'unknown',
      consentExpiresAt: null,
      scaDueAt: null,
      providerSessionExpiresAt: null,
      tokenExpiresAt: null,
      requiredActions: [],
    }
    expect(
      validateProviderAuthorization(authorization, { ...liveMetadata, renewal: 'unknown' }),
    ).toEqual(authorization)
    expect(() =>
      validateProviderAuthorization(
        {
          ...authorization,
          requiredActions: [
            {
              action: 'renew_consent',
              method: 'redirect',
              dueAt: '2027-03-31T23:59:59Z',
              evidenceReference: 'invented',
            },
          ],
        },
        liveMetadata,
      ),
    ).toThrow('does not match term')
  })

  it('maps separate provider terms to actual required actions and rejects contradictory actions', async () => {
    const base = (await provider.createConnection(context)).authorization
    const authorization = {
      ...base,
      scaDueAt: '2026-10-09T12:00:00+02:00',
      providerSessionExpiresAt: '2026-10-04T12:00:00Z',
      tokenExpiresAt: '2026-10-03T12:30:00Z',
      requiredActions: [
        {
          action: 'perform_sca',
          method: 'redirect',
          dueAt: '2026-10-09T12:00:00+02:00',
          evidenceReference: 'injected-test-sca-term',
        },
      ],
    }
    expect(
      validateProviderAuthorization(authorization, liveMetadata).requiredActions[0]?.action,
    ).toBe('perform_sca')
    expect(() =>
      validateProviderAuthorization(
        {
          ...authorization,
          requiredActions: [{ ...authorization.requiredActions[0], dueAt: base.consentExpiresAt }],
        },
        liveMetadata,
      ),
    ).toThrow('does not match term')
    expect(() =>
      validateProviderAuthorization(authorization, { ...liveMetadata, renewal: 'unknown' }),
    ).toThrow('unknown renewal')
    expect(() =>
      validateProviderAuthorization(authorization, { ...liveMetadata, renewal: 'unsupported' }),
    ).toThrow('unsupported renewal method')
    expect(() =>
      validateProviderAuthorization(
        { ...base, state: 'requires_action', requiredActions: [] },
        metadata,
      ),
    ).toThrow('missing required action')
  })

  it('rejects divergent grant expiry, secret fields and insecure/external synthetic redirects', async () => {
    const grant = await provider.createConnection(context)
    expect(() =>
      validateProviderConnectionGrant(
        { ...grant, consentExpiresAt: '2027-04-01T00:00:00Z' },
        metadata,
      ),
    ).toThrow('term mismatch')
    expect(() =>
      validateProviderConnectionGrant({ ...grant, accessToken: 'must-not-leak' }, metadata),
    ).toThrow('unexpected field')
    expect(() =>
      validateProviderConnectionGrant(
        { ...grant, redirectUrl: 'https://provider.invalid/consent' },
        metadata,
      ),
    ).toThrow('must not redirect externally')
    expect(() =>
      validateProviderConnectionGrant(
        { ...grant, redirectUrl: 'http://provider.invalid/consent' },
        liveMetadata,
      ),
    ).toThrow('invalid redirect URL')
    expect(() =>
      validateProviderConnectionGrant(
        { ...grant, redirectUrl: 'https://secret@provider.invalid/consent' },
        liveMetadata,
      ),
    ).toThrow('invalid redirect URL')
    expect(
      validateProviderConnectionGrant(
        { ...grant, redirectUrl: 'https://provider.invalid/consent' },
        liveMetadata,
      ).redirectUrl,
    ).toBe('https://provider.invalid/consent')
  })
})
