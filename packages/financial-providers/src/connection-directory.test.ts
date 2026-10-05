import { describe, expect, test } from 'vitest'
import {
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
