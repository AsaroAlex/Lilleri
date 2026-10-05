import type { ProfileLocale } from '@lilleri/domain'

const messages = {
  back: ['Dettagli del servizio', 'Service details'],
  checkingTitle: ['Collega il tuo conto', 'Connect your account'],
  checking: ['Verifico il collegamento…', 'Checking the connection…'],
  failedTitle: ['Verifica non riuscita', 'Connection check failed'],
  failedHelp: [
    'Non riesco a verificare il collegamento in questo momento. Riprova tra poco.',
    'I cannot check the connection right now. Try again shortly.',
  ],
  retry: ['Verifica di nuovo', 'Check again'],
  readyTitle: ['Continua sul sito della banca', 'Continue on your bank’s website'],
  readyHelp: [
    'Autorizza la lettura dei conti presso la banca. Al termine tornerai su Lilleri.',
    'Authorise access to your accounts with your bank. You will return to Lilleri afterwards.',
  ],
  continueInBank: ['Continua in banca', 'Continue to bank'],
  signInTitle: ['Accedi per collegare il conto', 'Sign in to connect your account'],
  signInHelp: [
    'Accedi al tuo profilo Lilleri, poi torna qui per continuare.',
    'Sign in to your Lilleri profile, then return here to continue.',
  ],
  signIn: ['Accedi e continua', 'Sign in and continue'],
  activationTitle: ['Collegamento non ancora disponibile', 'Connection is not available yet'],
  activationHelp: [
    'Lilleri deve attivare il collegamento protetto per questo servizio. Non devi modificare nulla nella tua banca.',
    'Lilleri needs to activate the protected connection for this service. You do not need to change anything with your bank.',
  ],
  unsupportedTitle: ['Collegamento automatico non disponibile', 'Automatic connection unavailable'],
  unsupportedHelp: [
    'Questo servizio non consente il collegamento automatico del conto personale a Lilleri.',
    'This service does not support connecting your personal account to Lilleri automatically.',
  ],
  unverifiedTitle: ['Compatibilità da verificare', 'Compatibility needs checking'],
  unverifiedHelp: [
    'Il collegamento con questo servizio e con il tuo tipo di conto deve ancora essere verificato.',
    'Connection support for this service and your account type still needs to be verified.',
  ],
  alternatives: ['Altri modi per aggiungere il conto', 'Other ways to add your account'],
  importStatement: ['Importa un file di movimenti', 'Import a transaction file'],
  importHelp: [
    'Se hai un file CSV o XLSX, puoi controllare le colonne prima di importarlo.',
    'If you have a CSV or XLSX file, you can review the columns before importing it.',
  ],
  manualAccount: ['Aggiungi un conto manuale', 'Add a manual account'],
  bankTitle: ['Collega con la tua banca', 'Connect with your bank'],
  bankHelp: [
    'Scegli la tua banca nell’elenco del servizio di collegamento autorizzato. Prima di lasciare Lilleri ti mostriamo che cosa verrà condiviso.',
    'Choose your bank from the authorised connection service’s list. Before you leave Lilleri, we show you what will be shared.',
  ],
  connectWithBank: ['Collega con la tua banca', 'Connect with your bank'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>

export const BANK_CONNECTION_FLOW_MESSAGE_PAIRS = Object.fromEntries(
  Object.entries(messages).map(([key, value]) => [`bankConnectionFlow.${key}`, value]),
) as { readonly [K in keyof typeof messages as `bankConnectionFlow.${K}`]: (typeof messages)[K] }

export function bankConnectionFlowCopy(locale: ProfileLocale) {
  const index = locale === 'it-IT' ? 0 : 1
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, value[index]]),
  ) as Readonly<Record<keyof typeof messages, string>>
}
