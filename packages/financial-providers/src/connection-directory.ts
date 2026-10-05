import {
  CONNECTION_DIRECTORY_COUNTRY_CODES,
  type ConnectionDirectory,
  type ConnectionDirectoryCountryCode,
  type ConnectionDirectoryEntry,
  type ConnectionDirectoryKind,
} from '@lilleri/domain'
import type { InstitutionCoverage } from './contracts.js'

interface DirectoryBrand {
  readonly id: string
  readonly name: string
  readonly countryCode: ConnectionDirectoryCountryCode
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
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Intesa', 'Sanpaolo', 'ISP'],
    officialUrl: 'https://www.intesasanpaolo.com/',
  },
  {
    id: 'unicredit',
    name: 'UniCredit',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Unicredit'],
    officialUrl: 'https://www.unicredit.it/',
  },
  {
    id: 'banco-bpm',
    name: 'Banco BPM',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['BPM', 'Banca Popolare di Milano', 'Banco Popolare'],
    officialUrl: 'https://www.bancobpm.it/',
  },
  {
    id: 'bper',
    name: 'BPER Banca',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['BPER', 'Banca Popolare Emilia Romagna'],
    officialUrl: 'https://www.bper.it/',
  },
  {
    id: 'credit-agricole-italia',
    name: 'Crédit Agricole Italia',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Credit Agricole', 'Cariparma', 'FriulAdria'],
    officialUrl: 'https://www.credit-agricole.it/',
  },
  {
    id: 'monte-paschi-siena',
    name: 'Monte dei Paschi di Siena',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['MPS', 'Monte Paschi'],
    officialUrl: 'https://www.mps.it/',
  },
  {
    id: 'bnl',
    name: 'BNL BNP Paribas',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['BNL', 'Banca Nazionale del Lavoro'],
    officialUrl: 'https://bnl.it/',
  },
  {
    id: 'fineco',
    name: 'Fineco',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['FinecoBank', 'Fineco Bank'],
    officialUrl: 'https://finecobank.com/',
  },
  {
    id: 'mediolanum',
    name: 'Banca Mediolanum',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Mediolanum'],
    officialUrl: 'https://www.bancamediolanum.it/',
  },
  {
    id: 'ing',
    name: 'ING',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['ING Italia', 'Conto Arancio'],
    officialUrl: 'https://www.ing.it/',
  },
  {
    id: 'credem',
    name: 'Credem',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Credito Emiliano'],
    officialUrl: 'https://www.credem.it/',
  },
  {
    id: 'widiba',
    name: 'Widiba',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Banca Widiba'],
    officialUrl: 'https://www.widiba.it/',
  },
  {
    id: 'bancoposta',
    name: 'BancoPosta',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Poste', 'Poste Italiane', 'Banco Posta'],
    officialUrl: 'https://www.poste.it/',
  },
  {
    id: 'postepay',
    name: 'Postepay',
    countryCode: 'IT',
    kind: 'card',
    aliases: ['Postepay Evolution', 'PostePay'],
    officialUrl: 'https://postepay.poste.it/',
  },
  {
    id: 'n26',
    name: 'N26',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Number26'],
    officialUrl: 'https://n26.com/it-it',
  },
  {
    id: 'revolut',
    name: 'Revolut',
    countryCode: 'IT',
    kind: 'bank',
    aliases: ['Revolut Italia'],
    officialUrl: 'https://www.revolut.com/it-IT/',
  },
  {
    id: 'amex',
    name: 'American Express',
    countryCode: 'IT',
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
    countryCode: 'IT',
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

/** Retail brands are market-specific. Names and sites are never provider coverage evidence. */
const EUROPEAN_CONNECTION_BRANDS: readonly DirectoryBrand[] = [
  {
    id: 'bnp-paribas-fr',
    name: 'BNP Paribas',
    countryCode: 'FR',
    kind: 'bank',
    aliases: ['BNP', 'BNP Paribas France'],
    officialUrl: 'https://mabanque.bnpparibas/',
  },
  {
    id: 'la-banque-postale-fr',
    name: 'La Banque Postale',
    countryCode: 'FR',
    kind: 'bank',
    aliases: ['Banque Postale', 'LBP'],
    officialUrl: 'https://www.labanquepostale.fr/',
  },
  {
    id: 'societe-generale-fr',
    name: 'Société Générale',
    countryCode: 'FR',
    kind: 'bank',
    aliases: ['SG', 'Societe Generale'],
    officialUrl: 'https://particuliers.sg.fr/',
  },
  {
    id: 'boursobank-fr',
    name: 'BoursoBank',
    countryCode: 'FR',
    kind: 'bank',
    aliases: ['Boursorama', 'Boursorama Banque'],
    officialUrl: 'https://www.boursobank.com/',
  },
  {
    id: 'deutsche-bank-de',
    name: 'Deutsche Bank',
    countryCode: 'DE',
    kind: 'bank',
    aliases: ['Deutsche Bank Deutschland'],
    officialUrl: 'https://www.deutsche-bank.de/pk.html',
  },
  {
    id: 'commerzbank-de',
    name: 'Commerzbank',
    countryCode: 'DE',
    kind: 'bank',
    aliases: ['Commerzbank Deutschland'],
    officialUrl: 'https://www.commerzbank.de/',
  },
  {
    id: 'berliner-sparkasse-de',
    name: 'Berliner Sparkasse',
    countryCode: 'DE',
    kind: 'bank',
    aliases: ['Sparkasse Berlin'],
    officialUrl: 'https://www.berliner-sparkasse.de/de/home.html',
  },
  {
    id: 'ing-de',
    name: 'ING',
    countryCode: 'DE',
    kind: 'bank',
    aliases: ['ING Deutschland', 'ING DiBa'],
    officialUrl: 'https://www.ing.de/',
  },
  {
    id: 'n26-de',
    name: 'N26',
    countryCode: 'DE',
    kind: 'bank',
    aliases: ['Number26', 'N26 Deutschland', 'N26 Germany'],
    officialUrl: 'https://n26.com/de-de',
  },
  {
    id: 'santander-es',
    name: 'Santander',
    countryCode: 'ES',
    kind: 'bank',
    aliases: ['Banco Santander', 'Santander España'],
    officialUrl: 'https://www.bancosantander.es/particulares',
  },
  {
    id: 'bbva-es',
    name: 'BBVA',
    countryCode: 'ES',
    kind: 'bank',
    aliases: ['Banco Bilbao Vizcaya Argentaria', 'BBVA España'],
    officialUrl: 'https://www.bbva.es/personas.html',
  },
  {
    id: 'caixabank-es',
    name: 'CaixaBank',
    countryCode: 'ES',
    kind: 'bank',
    aliases: ['Caixa', 'CaixaBank España'],
    officialUrl: 'https://www.caixabank.es/particular/home/particulares_es.html',
  },
  {
    id: 'sabadell-es',
    name: 'Banco Sabadell',
    countryCode: 'ES',
    kind: 'bank',
    aliases: ['Sabadell', 'Banc Sabadell'],
    officialUrl: 'https://www.bancsabadell.com/bsnacional/es/particulares/',
  },
  {
    id: 'cgd-pt',
    name: 'Caixa Geral de Depósitos',
    countryCode: 'PT',
    kind: 'bank',
    aliases: ['CGD', 'Caixa Geral de Depositos'],
    officialUrl: 'https://www.cgd.pt/Particulares/Pages/Particulares_v2.aspx',
  },
  {
    id: 'millennium-bcp-pt',
    name: 'Millennium bcp',
    countryCode: 'PT',
    kind: 'bank',
    aliases: ['Banco Comercial Português', 'Banco Comercial Portugues', 'Millennium'],
    officialUrl: 'https://www.millenniumbcp.pt/',
  },
  {
    id: 'ing-nl',
    name: 'ING',
    countryCode: 'NL',
    kind: 'bank',
    aliases: ['ING Nederland', 'ING Netherlands'],
    officialUrl: 'https://www.ing.nl/particulier',
  },
  {
    id: 'abn-amro-nl',
    name: 'ABN AMRO',
    countryCode: 'NL',
    kind: 'bank',
    aliases: ['ABN', 'ABN AMRO Nederland'],
    officialUrl: 'https://www.abnamro.nl/en/personal/index.html',
  },
  {
    id: 'rabobank-nl',
    name: 'Rabobank',
    countryCode: 'NL',
    kind: 'bank',
    aliases: ['Rabo', 'Rabobank Nederland'],
    officialUrl: 'https://www.rabobank.nl/particulieren',
  },
  {
    id: 'bunq-nl',
    name: 'bunq',
    countryCode: 'NL',
    kind: 'bank',
    aliases: ['bunq Nederland'],
    officialUrl: 'https://www.bunq.com/',
  },
  {
    id: 'kbc-be',
    name: 'KBC',
    countryCode: 'BE',
    kind: 'bank',
    aliases: ['KBC Bank', 'KBC België', 'KBC Belgium'],
    officialUrl: 'https://www.kbc.be/particulieren/nl.html',
  },
  {
    id: 'bnp-paribas-fortis-be',
    name: 'BNP Paribas Fortis',
    countryCode: 'BE',
    kind: 'bank',
    aliases: ['Fortis', 'BNP Fortis'],
    officialUrl: 'https://www.bnpparibasfortis.be/en/public/individuals',
  },
  {
    id: 'erste-bank-at',
    name: 'Erste Bank',
    countryCode: 'AT',
    kind: 'bank',
    aliases: ['Erste Bank Österreich', 'Erste Bank Austria'],
    officialUrl: 'https://www.erstebank.at/de/privatkunden',
  },
  {
    id: 'bank-austria-at',
    name: 'UniCredit Bank Austria',
    countryCode: 'AT',
    kind: 'bank',
    aliases: ['Bank Austria', 'UniCredit Austria'],
    officialUrl: 'https://www.bankaustria.at/',
  },
  {
    id: 'aib-ie',
    name: 'AIB',
    countryCode: 'IE',
    kind: 'bank',
    aliases: ['Allied Irish Banks', 'AIB Ireland'],
    officialUrl: 'https://aib.ie/',
  },
  {
    id: 'bank-of-ireland-ie',
    name: 'Bank of Ireland',
    countryCode: 'IE',
    kind: 'bank',
    aliases: ['BOI', 'Bank of Ireland Republic of Ireland'],
    officialUrl: 'https://personalbanking.bankofireland.com/',
  },
  {
    id: 'barclays-gb',
    name: 'Barclays',
    countryCode: 'GB',
    kind: 'bank',
    aliases: ['Barclays UK'],
    officialUrl: 'https://www.barclays.co.uk/',
  },
  {
    id: 'hsbc-gb',
    name: 'HSBC',
    countryCode: 'GB',
    kind: 'bank',
    aliases: ['HSBC UK'],
    officialUrl: 'https://www.hsbc.co.uk/',
  },
  {
    id: 'lloyds-gb',
    name: 'Lloyds Bank',
    countryCode: 'GB',
    kind: 'bank',
    aliases: ['Lloyds', 'Lloyds UK'],
    officialUrl: 'https://www.lloydsbank.com/',
  },
  {
    id: 'natwest-gb',
    name: 'NatWest',
    countryCode: 'GB',
    kind: 'bank',
    aliases: ['National Westminster Bank', 'NatWest UK'],
    officialUrl: 'https://www.natwest.com/',
  },
  {
    id: 'monzo-gb',
    name: 'Monzo',
    countryCode: 'GB',
    kind: 'bank',
    aliases: ['Monzo Bank', 'Monzo UK'],
    officialUrl: 'https://monzo.com/',
  },
  {
    id: 'starling-gb',
    name: 'Starling Bank',
    countryCode: 'GB',
    kind: 'bank',
    aliases: ['Starling', 'Starling UK'],
    officialUrl: 'https://www.starlingbank.com/',
  },
  {
    id: 'ubs-ch',
    name: 'UBS',
    countryCode: 'CH',
    kind: 'bank',
    aliases: ['UBS Switzerland', 'UBS Schweiz'],
    officialUrl: 'https://www.ubs.com/ch/en/private.html',
  },
  {
    id: 'postfinance-ch',
    name: 'PostFinance',
    countryCode: 'CH',
    kind: 'bank',
    aliases: ['Post Finance', 'PostFinance Switzerland'],
    officialUrl: 'https://www.postfinance.ch/en/private.html',
  },
  {
    id: 'swedbank-se',
    name: 'Swedbank',
    countryCode: 'SE',
    kind: 'bank',
    aliases: ['Swedbank Sverige', 'Swedbank Sweden'],
    officialUrl: 'https://www.swedbank.se/',
  },
  {
    id: 'seb-se',
    name: 'SEB',
    countryCode: 'SE',
    kind: 'bank',
    aliases: ['Skandinaviska Enskilda Banken', 'SEB Sverige'],
    officialUrl: 'https://seb.se/privat',
  },
  {
    id: 'danske-bank-dk',
    name: 'Danske Bank',
    countryCode: 'DK',
    kind: 'bank',
    aliases: ['Danske', 'Danske Bank Danmark'],
    officialUrl: 'https://danskebank.dk/privat',
  },
  {
    id: 'nordea-dk',
    name: 'Nordea',
    countryCode: 'DK',
    kind: 'bank',
    aliases: ['Nordea Danmark', 'Nordea Denmark'],
    officialUrl: 'https://www.nordea.dk/',
  },
  {
    id: 'dnb-no',
    name: 'DNB',
    countryCode: 'NO',
    kind: 'bank',
    aliases: ['DNB Norge', 'DNB Norway'],
    officialUrl: 'https://www.dnb.no/',
  },
  {
    id: 'nordea-no',
    name: 'Nordea',
    countryCode: 'NO',
    kind: 'bank',
    aliases: ['Nordea Norge', 'Nordea Norway'],
    officialUrl: 'https://www.nordea.no/',
  },
  {
    id: 'danske-bank-fi',
    name: 'Danske Bank',
    countryCode: 'FI',
    kind: 'bank',
    aliases: ['Danske Bank Suomi', 'Danske Bank Finland'],
    officialUrl: 'https://danskebank.fi/sinulle',
  },
  {
    id: 'nordea-fi',
    name: 'Nordea',
    countryCode: 'FI',
    kind: 'bank',
    aliases: ['Nordea Suomi', 'Nordea Finland'],
    officialUrl: 'https://www.nordea.fi/en/',
  },
  {
    id: 'pko-bank-polski-pl',
    name: 'PKO Bank Polski',
    countryCode: 'PL',
    kind: 'bank',
    aliases: ['PKO BP', 'PKO Polski', 'PKO'],
    officialUrl: 'https://www.pkobp.pl/klient-indywidualny',
  },
  {
    id: 'bank-pekao-pl',
    name: 'Bank Pekao',
    countryCode: 'PL',
    kind: 'bank',
    aliases: ['Pekao', 'Pekao SA'],
    officialUrl: 'https://www.pekao.com.pl/klient-indywidualny.html',
  },
  {
    id: 'mbank-pl',
    name: 'mBank',
    countryCode: 'PL',
    kind: 'bank',
    aliases: ['mBank Polska', 'mBank Poland'],
    officialUrl: 'https://www.mbank.pl/indywidualny/',
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
    institution.countryCode !== brand.countryCode
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
  return buildConnectionDirectory(ITALIAN_CONNECTION_BRANDS, ['IT'], 'it-2026-10-05-v1', runtime)
}

/** All listed markets. Listing a brand is separate from admitting its live provider coverage. */
export function buildEuropeanConnectionDirectory(
  runtime: ConnectionDirectoryRuntime = { personalAccessReady: false },
): ConnectionDirectory {
  return buildConnectionDirectory(
    [...ITALIAN_CONNECTION_BRANDS, ...EUROPEAN_CONNECTION_BRANDS],
    CONNECTION_DIRECTORY_COUNTRY_CODES,
    'eu-2026-10-05-v1',
    runtime,
  )
}

function buildConnectionDirectory(
  brands: readonly DirectoryBrand[],
  countries: readonly ConnectionDirectoryCountryCode[],
  revision: string,
  runtime: ConnectionDirectoryRuntime,
): ConnectionDirectory {
  const live = runtime.liveProvider
  const providerReady = Boolean(
    live?.environment === 'live' && live.accountInformationConsent && live.authorizationRouteReady,
  )
  return {
    country: 'IT',
    countries: [...countries],
    revision,
    prerequisites: {
      privateAccess: runtime.personalAccessReady ? 'ready' : 'required',
      bankProvider: providerReady ? 'ready' : 'required',
    },
    entries: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      countryCode: brand.countryCode,
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
