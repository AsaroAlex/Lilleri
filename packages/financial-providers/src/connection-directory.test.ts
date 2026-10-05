import { CONNECTION_DIRECTORY_COUNTRY_CODES } from '@lilleri/domain'
import { describe, expect, test } from 'vitest'
import {
  buildEuropeanConnectionDirectory,
  buildItalianConnectionDirectory,
  type LiveConnectionDirectoryCapability,
} from './connection-directory.js'
import type { InstitutionCoverage } from './contracts.js'

const verifiedInstitution = (): InstitutionCoverage => ({
  id: 'app-entitled-bank-it',
  providerId: 'licensed-provider',
  name: 'Provider brand label',
  countryCode: 'IT',
  accountTypes: [
    {
      kind: 'current',
      availability: 'available',
      evidence: {
        status: 'verified',
        environment: 'live',
        reference: 'https://provider.example/coverage/italy',
        checkedAt: '2026-10-05T08:00:00.000Z',
      },
      historyFrom: null,
    },
  ],
})
const liveCapability = (
  institution = verifiedInstitution(),
): LiveConnectionDirectoryCapability => ({
  providerId: 'licensed-provider',
  environment: 'live',
  accountInformationConsent: true,
  authorizationRouteReady: true,
  institutions: [institution],
  bindings: [{ directoryId: 'intesa-sanpaolo', institutionId: institution.id }],
})
const intesa = (liveProvider: LiveConnectionDirectoryCapability, personalAccessReady = true) =>
  buildItalianConnectionDirectory({ personalAccessReady, liveProvider }).entries.find(
    (entry) => entry.id === 'intesa-sanpaolo',
  )?.automatic

describe('truthful public Italian connection directory', () => {
  test('lists banks, Amex and Satispay without inventing provider IDs or export support', () => {
    const directory = buildItalianConnectionDirectory()
    expect(directory.country).toBe('IT')
    expect(directory.countries).toEqual(['IT'])
    expect(directory.entries).toHaveLength(18)
    expect(directory.entries.every((entry) => entry.countryCode === 'IT')).toBe(true)
    expect(directory.prerequisites).toEqual({ privateAccess: 'required', bankProvider: 'required' })
    expect(new Set(directory.entries.map((entry) => entry.id)).size).toBe(directory.entries.length)
    expect(directory.entries.find((entry) => entry.id === 'amex')?.kind).toBe('card')
    expect(directory.entries.find((entry) => entry.id === 'satispay')?.kind).toBe('wallet')
    for (const entry of directory.entries) {
      expect(entry.automatic).toMatchObject({
        state: 'configuration_required',
        institutionId: null,
        providerId: null,
        accountKinds: [],
      })
      const url = new URL(entry.officialUrl)
      expect(url.protocol).toBe('https:')
      expect(`${url.username}${url.password}${url.search}${url.hash}`).toBe('')
    }
    for (const id of ['amex', 'satispay']) {
      const entry = directory.entries.find((item) => item.id === id)
      expect(entry?.statement).toMatchObject({
        state: 'unverified',
        formats: [],
        reason: 'pdf_not_supported',
      })
      expect(entry?.statement.guideUrl).toMatch(/^https:\/\//)
    }
  })
  test('requires an explicit exact binding, verified live per-kind coverage and admitted consent route', () => {
    expect(intesa(liveCapability())).toEqual({
      state: 'available',
      reason: null,
      providerId: 'licensed-provider',
      institutionId: 'app-entitled-bank-it',
      accountKinds: ['current'],
      evidenceUrl: 'https://provider.example/coverage/italy',
    })
    const matchedByNameOnly = {
      ...verifiedInstitution(),
      id: 'intesa-sanpaolo',
      name: 'Intesa Sanpaolo',
    }
    expect(intesa({ ...liveCapability(matchedByNameOnly), bindings: [] })).toMatchObject({
      state: 'unverified',
      institutionId: null,
    })
  })
  test.each([
    [
      'no personal access',
      (live: LiveConnectionDirectoryCapability) => live,
      false,
      'configuration_required',
    ],
    [
      'consent route unavailable',
      (live: LiveConnectionDirectoryCapability) => ({ ...live, authorizationRouteReady: false }),
      true,
      'configuration_required',
    ],
    [
      'account information not admitted',
      (live: LiveConnectionDirectoryCapability) => ({ ...live, accountInformationConsent: false }),
      true,
      'configuration_required',
    ],
    [
      'duplicate brand bindings',
      (live: LiveConnectionDirectoryCapability) => ({
        ...live,
        bindings: [...live.bindings, ...live.bindings],
      }),
      true,
      'unverified',
    ],
    [
      'missing exact institution',
      (live: LiveConnectionDirectoryCapability) => ({
        ...live,
        bindings: [{ directoryId: 'intesa-sanpaolo', institutionId: 'another-id' }],
      }),
      true,
      'unverified',
    ],
    [
      'duplicate provider IDs',
      (live: LiveConnectionDirectoryCapability) => ({
        ...live,
        institutions: [...live.institutions, ...live.institutions],
      }),
      true,
      'unverified',
    ],
    [
      'provider mismatch',
      (live: LiveConnectionDirectoryCapability) => ({ ...live, providerId: 'other-provider' }),
      true,
      'unverified',
    ],
    [
      'blank provider ID',
      (live: LiveConnectionDirectoryCapability) => ({ ...live, providerId: '' }),
      true,
      'unverified',
    ],
  ] as const)('fails closed: %s', (_label, change, personalAccessReady, state) => {
    expect(intesa(change(liveCapability()), personalAccessReady)).toMatchObject({
      state,
      institutionId: null,
      providerId: null,
      accountKinds: [],
    })
  })
  test.each([
    [
      'another country',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        countryCode: 'GB',
      }),
    ],
    [
      'sandbox evidence',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: institution.accountTypes.map((kind) => ({
          ...kind,
          evidence: { ...kind.evidence, environment: 'sandbox' },
        })),
      }),
    ],
    [
      'unknown kind availability',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: institution.accountTypes.map((kind) => ({
          ...kind,
          availability: 'unknown',
        })),
      }),
    ],
    [
      'unverified evidence',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: institution.accountTypes.map((kind) => ({
          ...kind,
          evidence: { ...kind.evidence, status: 'unverified' },
        })),
      }),
    ],
    [
      'no type evidence',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: [],
      }),
    ],
    [
      'contradictory duplicate type',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: [
          ...institution.accountTypes,
          ...institution.accountTypes.map((kind) => ({
            ...kind,
            availability: 'unavailable' as const,
          })),
        ],
      }),
    ],
    [
      'invalid checked timestamp',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: institution.accountTypes.map((kind) => ({
          ...kind,
          evidence: { ...kind.evidence, checkedAt: '2026-10-05' },
        })),
      }),
    ],
    [
      'credential-bearing evidence URL',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: institution.accountTypes.map((kind) => ({
          ...kind,
          evidence: {
            ...kind.evidence,
            reference: 'https://secret:token@provider.example/evidence',
          },
        })),
      }),
    ],
    [
      'query-bearing evidence URL',
      (institution: InstitutionCoverage): InstitutionCoverage => ({
        ...institution,
        accountTypes: institution.accountTypes.map((kind) => ({
          ...kind,
          evidence: {
            ...kind.evidence,
            reference: 'https://provider.example/evidence?token=secret',
          },
        })),
      }),
    ],
  ] as const)('rejects insufficient provider proof: %s', (_label, change) => {
    expect(intesa(liveCapability(change(verifiedInstitution())))).toMatchObject({
      state: 'unverified',
      institutionId: null,
      providerId: null,
      accountKinds: [],
    })
  })
})

describe('country-specific European connection directory', () => {
  test('extends all 16 markets while preserving every Italian entry and unavailable live routes', () => {
    const directory = buildEuropeanConnectionDirectory()
    expect(directory.country).toBe('IT')
    expect(directory.countries).toEqual(CONNECTION_DIRECTORY_COUNTRY_CODES)
    expect(directory.entries).toHaveLength(62)
    expect(new Set(directory.entries.map((entry) => entry.id)).size).toBe(62)
    expect(directory.entries.filter((entry) => entry.countryCode === 'IT')).toEqual(
      buildItalianConnectionDirectory().entries,
    )
    expect(new Set(directory.entries.map((entry) => entry.countryCode))).toEqual(
      new Set(directory.countries),
    )
    expect(
      directory.entries.filter((entry) => entry.countryCode !== 'IT').map((entry) => entry.name),
    ).toEqual(
      expect.arrayContaining([
        'BNP Paribas',
        'Deutsche Bank',
        'BBVA',
        'bunq',
        'Monzo',
        'Starling Bank',
        'N26',
        'PKO Bank Polski',
      ]),
    )
    for (const entry of directory.entries) {
      expect(entry.automatic).toMatchObject({
        state: 'configuration_required',
        institutionId: null,
        providerId: null,
        accountKinds: [],
      })
      const officialUrl = new URL(entry.officialUrl)
      expect(officialUrl.protocol).toBe('https:')
      expect(
        `${officialUrl.username}${officialUrl.password}${officialUrl.search}${officialUrl.hash}`,
      ).toBe('')
      if (entry.countryCode !== 'IT')
        expect(entry.statement).toEqual({
          state: 'unverified',
          formats: [],
          guideUrl: null,
          evidenceUrls: [],
          reason: 'format_not_verified',
        })
    }
  })

  test('same-brand markets keep separate stable IDs and consumer sites', () => {
    const entries = buildEuropeanConnectionDirectory().entries
    expect(
      entries.filter((entry) => entry.name === 'ING').map((entry) => [entry.id, entry.countryCode]),
    ).toEqual([
      ['ing', 'IT'],
      ['ing-de', 'DE'],
      ['ing-nl', 'NL'],
    ])
    expect(
      entries.filter((entry) => entry.name === 'N26').map((entry) => [entry.id, entry.countryCode]),
    ).toEqual([
      ['n26', 'IT'],
      ['n26-de', 'DE'],
    ])
    expect(
      new Set(entries.filter((entry) => entry.name === 'Nordea').map((entry) => entry.officialUrl))
        .size,
    ).toBe(3)
  })

  test('live binding enables only the exact market, even when another entry has the same brand', () => {
    const institution: InstitutionCoverage = {
      ...verifiedInstitution(),
      id: 'app-entitled-ing-de',
      name: 'ING',
      countryCode: 'DE',
    }
    const liveProvider: LiveConnectionDirectoryCapability = {
      ...liveCapability(institution),
      bindings: [
        { directoryId: 'ing-de', institutionId: institution.id },
        { directoryId: 'ing', institutionId: institution.id },
        { directoryId: 'ing-nl', institutionId: institution.id },
      ],
    }
    const entries = buildEuropeanConnectionDirectory({
      personalAccessReady: true,
      liveProvider,
    }).entries
    expect(entries.find((entry) => entry.id === 'ing-de')?.automatic).toMatchObject({
      state: 'available',
      providerId: 'licensed-provider',
      institutionId: institution.id,
      accountKinds: ['current'],
    })
    for (const id of ['ing', 'ing-nl'])
      expect(entries.find((entry) => entry.id === id)?.automatic).toMatchObject({
        state: 'unverified',
        reason: 'coverage_not_verified',
        providerId: null,
        institutionId: null,
        accountKinds: [],
      })
    expect(entries.filter((entry) => entry.automatic.state === 'available')).toHaveLength(1)
  })

  test.each(['DK', 'NO', 'FI'] as const)(
    'Nordea %s evidence cannot activate its other national entries',
    (countryCode) => {
      const institution: InstitutionCoverage = { ...verifiedInstitution(), countryCode }
      const liveProvider: LiveConnectionDirectoryCapability = {
        ...liveCapability(institution),
        bindings: ['DK', 'NO', 'FI'].map((market) => ({
          directoryId: `nordea-${market.toLowerCase()}`,
          institutionId: institution.id,
        })),
      }
      const nordea = buildEuropeanConnectionDirectory({
        personalAccessReady: true,
        liveProvider,
      }).entries.filter((entry) => entry.name === 'Nordea')
      expect(nordea.filter((entry) => entry.automatic.state === 'available')).toHaveLength(1)
      expect(nordea.find((entry) => entry.countryCode === countryCode)?.automatic.state).toBe(
        'available',
      )
      expect(
        nordea
          .filter((entry) => entry.countryCode !== countryCode)
          .every(
            (entry) =>
              entry.automatic.state === 'unverified' &&
              entry.automatic.providerId === null &&
              entry.automatic.institutionId === null,
          ),
      ).toBe(true)
    },
  )
})
