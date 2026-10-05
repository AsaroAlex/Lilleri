import type { ProfileLocale } from '@lilleri/domain'

/** Market labels stay explicit even when the same bank is present in several countries. */
export const BANK_DIRECTORY_COUNTRY_NAMES = {
  IT: ['Italia', 'Italy'],
  FR: ['Francia', 'France'],
  DE: ['Germania', 'Germany'],
  ES: ['Spagna', 'Spain'],
  PT: ['Portogallo', 'Portugal'],
  NL: ['Paesi Bassi', 'Netherlands'],
  BE: ['Belgio', 'Belgium'],
  AT: ['Austria', 'Austria'],
  IE: ['Irlanda', 'Ireland'],
  GB: ['Regno Unito', 'United Kingdom'],
  CH: ['Svizzera', 'Switzerland'],
  SE: ['Svezia', 'Sweden'],
  DK: ['Danimarca', 'Denmark'],
  NO: ['Norvegia', 'Norway'],
  FI: ['Finlandia', 'Finland'],
  PL: ['Polonia', 'Poland'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>

export function bankCountryLabel(countryCode: string, locale: ProfileLocale): string {
  const names =
    BANK_DIRECTORY_COUNTRY_NAMES[countryCode as keyof typeof BANK_DIRECTORY_COUNTRY_NAMES]
  return names?.[locale === 'it-IT' ? 0 : 1] ?? countryCode
}

const messages = {
  title: ['Trova la tua banca', 'Find your bank'],
  intro: [
    'Conti, carte e portafogli. Scegli il servizio che usi.',
    'Accounts, cards and wallets. Choose the service you use.',
  ],
  search: ['Cerca una banca o un servizio', 'Search for a bank or service'],
  clearSearch: ['Cancella la ricerca', 'Clear search'],
  country: ['Paese', 'Country'],
  allCountries: ['Tutti i paesi', 'All countries'],
  all: ['Tutti', 'All'],
  bank: ['Banche', 'Banks'],
  card: ['Carte', 'Cards'],
  wallet: ['Portafogli', 'Wallets'],
  singularBank: ['Conto bancario', 'Bank account'],
  singularCard: ['Carta', 'Card'],
  singularWallet: ['Portafoglio', 'Wallet'],
  loading: ['Caricamento dei servizi…', 'Loading services…'],
  unavailable: [
    'Non riesco a caricare l’elenco dei servizi.',
    'The service directory could not be loaded.',
  ],
  retry: ['Riprova', 'Try again'],
  empty: ['Nessun servizio trovato', 'No services found'],
  emptyHelp: [
    'Prova un altro nome oppure cambia il paese o il tipo di servizio.',
    'Try another name or change the country or service type.',
  ],
  emptyDirectory: [
    'L’elenco dei servizi non è ancora disponibile.',
    'The service directory is not available yet.',
  ],
  clearFilters: ['Mostra tutti i servizi', 'Show all services'],
  back: ['Tutti i servizi', 'All services'],
  choose: ['Scegli', 'Choose'],
  automatic: ['Collegamento automatico', 'Automatic connection'],
  automaticReady: [
    'Puoi autorizzare la lettura dei tuoi conti sul sito della banca.',
    'You can authorise access to your accounts on your bank’s website.',
  ],
  automaticSetup: [
    'Il collegamento richiede un accesso personale, l’attivazione del servizio e la verifica della compatibilità con il tuo conto.',
    'Connecting requires personal access, service activation and verification of compatibility with your account.',
  ],
  automaticPrivateAccess: [
    'Disponibile dopo l’attivazione dell’accesso personale.',
    'Available once personal access is activated.',
  ],
  automaticProviderSetup: [
    'Il servizio bancario deve ancora essere attivato.',
    'The bank service still needs to be activated.',
  ],
  automaticUnverified: [
    'La disponibilità per questo servizio e per il tuo tipo di conto deve essere verificata.',
    'Availability for this service and your account type still needs to be verified.',
  ],
  automaticUnsupported: [
    'Il collegamento automatico di questo conto personale non è disponibile.',
    'Automatic connection is not available for this personal account.',
  ],
  connect: ['Collega il conto', 'Connect account'],
  moreOptions: ['Altre opzioni', 'More options'],
  statement: ['File dei movimenti', 'Transaction files'],
  statementReady: [
    'Importa il file dei movimenti e controlla le colonne prima di confermare.',
    'Import your transaction file and review the columns before confirming.',
  ],
  statementConditional: [
    'Se hai già un file CSV o XLSX, puoi usare l’importazione guidata. Verifica il formato nel tuo home banking.',
    'If you already have a CSV or XLSX file, use the guided import. Check the format in your online banking.',
  ],
  statementUnknown: [
    'Non è ancora verificato un export CSV o XLSX dei movimenti personali.',
    'A CSV or XLSX export of personal transactions has not been verified yet.',
  ],
  statementPdf: [
    'Il documento personale verificato è in PDF. Lilleri al momento importa file CSV e XLSX.',
    'The verified personal document is a PDF. Lilleri currently imports CSV and XLSX files.',
  ],
  statementUnsupported: [
    'Non è disponibile un formato di estratto conto importabile.',
    'An importable statement format is not available.',
  ],
  importStatement: ['Importa estratto conto', 'Import statement'],
  importExistingFile: ['Ho un file CSV o XLSX', 'I have a CSV or XLSX file'],
  personalAccessRequired: [
    'L’importazione si attiva con un accesso personale protetto.',
    'Import becomes available with protected personal access.',
  ],
  officialSite: ['Apri il sito ufficiale', 'Open official website'],
  statementGuide: ['Guida al documento', 'Document guide'],
  newWindow: ['Si apre in una nuova scheda', 'Opens in a new tab'],
  publicSetup: [
    'Collegamenti automatici da attivare. La disponibilità dipende dal servizio e dal tuo conto.',
    'Automatic connections need activation. Availability depends on the service and your account.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>

/** The application can include these pairs in its central catalogue without changing the picker. */
export const BANK_PICKER_MESSAGE_PAIRS = Object.fromEntries(
  Object.entries(messages).map(([key, value]) => [`bankPicker.${key}`, value]),
) as { readonly [K in keyof typeof messages as `bankPicker.${K}`]: (typeof messages)[K] }

export function bankPickerCopy(locale: ProfileLocale) {
  const index = locale === 'it-IT' ? 0 : 1
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, value[index]]),
  ) as Readonly<Record<keyof typeof messages, string>>
}
