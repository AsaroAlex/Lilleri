import type {
  ConnectionDirectory,
  ConnectionDirectoryEntry,
  ConnectionDirectoryKind,
} from '@lilleri/domain'
import type { InstitutionCoverage } from './contracts.js'

interface DirectoryBrand {
  readonly id: string
  readonly name: string
  readonly kind: ConnectionDirectoryKind
  readonly aliases: readonly string[]
  readonly officialUrl: string
  readonly automaticEvidenceUrl?: string
  readonly statement?: ConnectionDirectoryEntry['statement']
}

/** Being listed is not a coverage claim. No live provider IDs are embedded here. */
const ITALIAN_CONNECTION_BRANDS: readonly DirectoryBrand[] = [
  {
    id: 'intesa-sanpaolo',
    name: 'Intesa Sanpaolo',
    kind: 'bank',
    aliases: ['Intesa', 'Sanpaolo', 'ISP'],
    officialUrl: 'https://www.intesasanpaolo.com/',
  },
  {
    id: 'unicredit',
    name: 'UniCredit',
    kind: 'bank',
    aliases: ['Unicredit'],
    officialUrl: 'https://www.unicredit.it/',
  },
  {
    id: 'banco-bpm',
    name: 'Banco BPM',
    kind: 'bank',
    aliases: ['BPM', 'Banca Popolare di Milano', 'Banco Popolare'],
    officialUrl: 'https://www.bancobpm.it/',
  },
  {
    id: 'bper',
    name: 'BPER Banca',
    kind: 'bank',
    aliases: ['BPER', 'Banca Popolare Emilia Romagna'],
    officialUrl: 'https://www.bper.it/',
  },
  {
    id: 'credit-agricole-italia',
    name: 'Crédit Agricole Italia',
    kind: 'bank',
    aliases: ['Credit Agricole', 'Cariparma', 'FriulAdria'],
    officialUrl: 'https://www.credit-agricole.it/',
  },
  {
    id: 'monte-paschi-siena',
    name: 'Monte dei Paschi di Siena',
    kind: 'bank',
    aliases: ['MPS', 'Monte Paschi'],
    officialUrl: 'https://www.mps.it/',
  },
  {
    id: 'bnl',
    name: 'BNL BNP Paribas',
    kind: 'bank',
    aliases: ['BNL', 'Banca Nazionale del Lavoro'],
    officialUrl: 'https://bnl.it/',
  },
  {
    id: 'fineco',
    name: 'Fineco',
    kind: 'bank',
    aliases: ['FinecoBank', 'Fineco Bank'],
    officialUrl: 'https://finecobank.com/',
  },
  {
    id: 'mediolanum',
    name: 'Banca Mediolanum',
    kind: 'bank',
    aliases: ['Mediolanum'],
    officialUrl: 'https://www.bancamediolanum.it/',
  },
  {
    id: 'ing',
    name: 'ING',
    kind: 'bank',
    aliases: ['ING Italia', 'Conto Arancio'],
    officialUrl: 'https://www.ing.it/',
  },
  {
    id: 'credem',
    name: 'Credem',
    kind: 'bank',
    aliases: ['Credito Emiliano'],
    officialUrl: 'https://www.credem.it/',
  },
  {
    id: 'widiba',
    name: 'Widiba',
    kind: 'bank',
    aliases: ['Banca Widiba'],
    officialUrl: 'https://www.widiba.it/',
  },
  {
    id: 'bancoposta',
    name: 'BancoPosta',
    kind: 'bank',
    aliases: ['Poste', 'Poste Italiane', 'Banco Posta'],
    officialUrl: 'https://www.poste.it/',
  },
  {
    id: 'postepay',
    name: 'Postepay',
    kind: 'card',
    aliases: ['Postepay Evolution', 'PostePay'],
    officialUrl: 'https://postepay.poste.it/',
  },
  {
    id: 'n26',
    name: 'N26',
    kind: 'bank',
    aliases: ['Number26'],
    officialUrl: 'https://n26.com/it-it',
  },
  {
    id: 'revolut',
    name: 'Revolut',
    kind: 'bank',
    aliases: ['Revolut Italia'],
    officialUrl: 'https://www.revolut.com/it-IT/',
  },
  {
    id: 'amex',
    name: 'American Express',
    kind: 'card',
    aliases: ['Amex', 'AmericanExpress'],
    officialUrl: 'https://www.americanexpress.com/it-it/',
    statement: {
      state: 'unverified',
      formats: [],
      guideUrl:
        'https://www.americanexpress.com/it/servizio-clienti/faq.come-posso-accedere-ai-miei-estratti-conto-nell-app-amex.html',
      evidenceUrls: [
        'https://www.americanexpress.com/it/servizio-clienti/faq.come-posso-accedere-ai-miei-estratti-conto-nell-app-amex.html',
      ],
      reason: 'pdf_not_supported',
    },
  },
  {
    id: 'satispay',
    name: 'Satispay',
    kind: 'wallet',
    aliases: ['Satispay Personal'],
    officialUrl: 'https://www.satispay.com/it-it/',
    automaticEvidenceUrl: 'https://openbanking.satispay.com/',
    statement: {
      state: 'unverified',
      formats: [],
      guideUrl:
        'https://www.satispay.com/it-it/blog/welfare-benefits/valore-legale-ricevuta-pagamento-satispay/',
      evidenceUrls: [
        'https://www.satispay.com/it-it/blog/welfare-benefits/valore-legale-ricevuta-pagamento-satispay/',
      ],
      reason: 'pdf_not_supported',
    },
  },
]

/** Supplied only by the server's live integration owner, after entitlement and route admission. */
export interface LiveConnectionDirectoryCapability {
  readonly providerId: string
  readonly environment: 'live'
  readonly accountInformationConsent: boolean
  readonly authorizationRouteReady: boolean
  readonly institutions: readonly InstitutionCoverage[]
  /** Exact trusted bindings. Brand names/aliases must never be fuzzy-matched to a provider ID. */
  readonly bindings: readonly { readonly directoryId: string; readonly institutionId: string }[]
}
export interface ConnectionDirectoryRuntime {
  readonly personalAccessReady: boolean
  readonly liveProvider?: LiveConnectionDirectoryCapability
}

function evidenceUrl(value: string | null): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
  } catch {
    return false
  }
}

function automaticRoute(
  brand: DirectoryBrand,
  runtime: ConnectionDirectoryRuntime,
): ConnectionDirectoryEntry['automatic'] {
  const evidence = brand.automaticEvidenceUrl ?? null
  const disabled = (
    state: 'configuration_required' | 'unverified',
    reason: 'provider_configuration_required' | 'private_access_required' | 'coverage_not_verified',
  ): ConnectionDirectoryEntry['automatic'] => ({
    state,
    reason,
    providerId: null,
    institutionId: null,
    accountKinds: [],
    evidenceUrl: evidence,
  })
  const live = runtime.liveProvider
  if (
    live?.environment !== 'live' ||
    !live.accountInformationConsent ||
    !live.authorizationRouteReady
  )
    return disabled('configuration_required', 'provider_configuration_required')
  if (!runtime.personalAccessReady)
    return disabled('configuration_required', 'private_access_required')
  if (!live.providerId.trim() || live.providerId.length > 256)
    return disabled('unverified', 'coverage_not_verified')
  const bindings = live.bindings.filter((binding) => binding.directoryId === brand.id)
  if (bindings.length !== 1) return disabled('unverified', 'coverage_not_verified')
  const binding = bindings[0]
  if (!binding) return disabled('unverified', 'coverage_not_verified')
  const institutions = live.institutions.filter(
    (institution) => institution.id === binding.institutionId,
  )
  if (institutions.length !== 1) return disabled('unverified', 'coverage_not_verified')
  const institution = institutions[0]
  if (
    !institution?.id.trim() ||
    institution.id.length > 256 ||
    institution.providerId !== live.providerId ||
    institution.countryCode !== 'IT'
  )
    return disabled('unverified', 'coverage_not_verified')
  if (
    new Set(institution.accountTypes.map((type) => type.kind)).size !==
    institution.accountTypes.length
  )
    return disabled('unverified', 'coverage_not_verified')
  const verified = institution.accountTypes.filter(
    (type) =>
      ['current', 'card', 'cash', 'savings'].includes(type.kind) &&
      type.availability === 'available' &&
      type.evidence.status === 'verified' &&
      type.evidence.environment === 'live' &&
      evidenceUrl(type.evidence.reference) &&
      type.evidence.checkedAt !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(type.evidence.checkedAt) &&
      Number.isFinite(Date.parse(type.evidence.checkedAt)),
  )
  if (!verified.length) return disabled('unverified', 'coverage_not_verified')
  return {
    state: 'available',
    reason: null,
    providerId: live.providerId,
    institutionId: institution.id,
    accountKinds: [...new Set(verified.map((type) => type.kind))],
    evidenceUrl: verified[0]?.evidence.reference ?? null,
  }
}

/** Public metadata only: never includes grants, balances, credentials, or an owner's state. */
export function buildItalianConnectionDirectory(
  runtime: ConnectionDirectoryRuntime = { personalAccessReady: false },
): ConnectionDirectory {
  const live = runtime.liveProvider
  const providerReady = Boolean(
    live?.environment === 'live' && live.accountInformationConsent && live.authorizationRouteReady,
  )
  return {
    country: 'IT',
    revision: 'it-2026-10-05-v1',
    prerequisites: {
      privateAccess: runtime.personalAccessReady ? 'ready' : 'required',
      bankProvider: providerReady ? 'ready' : 'required',
    },
    entries: ITALIAN_CONNECTION_BRANDS.map((brand) => ({
      id: brand.id,
      name: brand.name,
      kind: brand.kind,
      aliases: [...brand.aliases],
      officialUrl: brand.officialUrl,
      automatic: automaticRoute(brand, runtime),
      statement: brand.statement ?? {
        state: 'unverified',
        formats: [],
        guideUrl: null,
        evidenceUrls: [],
        reason: 'format_not_verified',
      },
    })),
  }
}
