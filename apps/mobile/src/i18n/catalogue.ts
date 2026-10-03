import { APP_MESSAGE_PAIRS } from './app-messages'
import { CONNECTION_MESSAGE_PAIRS } from './connection-messages'
import { IDENTITY_PANEL_MESSAGE_PAIRS } from './identity-panel-messages'
import { MANUAL_MESSAGE_PAIRS } from './manual-messages'
import { MAPPED_IMPORT_MESSAGE_PAIRS } from './mapped-import-messages'
import { MERCHANT_MESSAGE_PAIRS } from './merchant-messages'
import { PANEL_MESSAGE_PAIRS } from './panel-messages'

/** Italian is the master; every explicit key has the corresponding British English message. */
export const CORE_MESSAGE_PAIRS = {
  'nav.home': ['Home', 'Home'],
  'nav.transactions': ['Movimenti', 'Transactions'],
  'nav.review': ['Da controllare', 'Review'],
  'nav.recurring': ['Ricorrenti', 'Recurring'],
  'nav.privacy': ['Privacy', 'Privacy'],
  'nav.reviewCount': [
    'Da controllare, {count, plural, one {# movimento} other {# movimenti}}',
    'Review, {count, plural, one {# transaction} other {# transactions}}',
  ],
  'common.save': ['Salva', 'Save'],
  'common.cancel': ['Annulla', 'Cancel'],
  'common.undo': ['Annulla modifica', 'Undo change'],
  'common.close': ['Chiudi', 'Close'],
  'common.refresh': ['Aggiorna', 'Refresh'],
  'common.retry': ['Riprova', 'Try again'],
  'common.confirm': ['Conferma', 'Confirm'],
  'common.change': ['Modifica', 'Change'],
  'common.review': ['Controlla', 'Review'],
  'common.notNow': ['Non ora', 'Not now'],
  'common.why': ['Perché?', 'Why?'],
  'common.loading': ['Caricamento', 'Loading'],
  'common.saving': ['Salvataggio', 'Saving'],
  'common.unavailable': ['Non disponibile', 'Unavailable'],
  'common.dateUnknown': ['Data non comunicata', 'Date not provided'],
  'common.descriptionUnknown': ['Descrizione non disponibile', 'Description unavailable'],
  'common.lastUpdated': ['Ultimo aggiornamento: {date}', 'Last updated: {date}'],
  'common.observedAt': [
    'Osservato il {observedAt, date, medium} alle {observedAt, time, short}',
    'Observed on {observedAt, date, medium} at {observedAt, time, short}',
  ],
  'common.transactionCount': [
    '{count, plural, =0 {Nessun movimento} one {# movimento} other {# movimenti}}',
    '{count, plural, =0 {No transactions} one {# transaction} other {# transactions}}',
  ],
  'common.accountCount': [
    '{count, plural, =0 {Nessun conto} one {# conto} other {# conti}}',
    '{count, plural, =0 {No accounts} one {# account} other {# accounts}}',
  ],
  'common.currency': ['{amount} in {currency}', '{amount} in {currency}'],
  'common.problem': [
    'Il servizio non è disponibile. Riprova tra poco.',
    'The service is unavailable. Try again shortly.',
  ],
  'common.estimate': ['Stima', 'Estimate'],
  'common.synthetic': ['Dati sintetici', 'Synthetic data'],
  'common.backToTransactions': ['← Torna ai movimenti', '← Back to transactions'],
  'settings.title': ['Profilo e formato', 'Profile and display'],
  'settings.language': ['Lingua', 'Language'],
  'settings.languageHelp': [
    'La lingua cambia le etichette e il formato. Importi, valute e date dei movimenti restano invariati.',
    'Language changes labels and formatting. Transaction amounts, currencies and dates remain unchanged.',
  ],
  'settings.italian': ['Italiano', 'Italiano'],
  'settings.english': ['English', 'English'],
  'settings.displayName': ['Nome del profilo', 'Profile name'],
  'settings.timezone': ['Fuso orario', 'Time zone'],
  'settings.zoneRome': ['Italia', 'Italy'],
  'settings.zoneLondon': ['Londra', 'London'],
  'settings.zoneNewYork': ['New York', 'New York'],
  'settings.zoneTokyo': ['Tokyo', 'Tokyo'],
  'settings.save': ['Salva impostazioni', 'Save settings'],
  'settings.refresh': ['Aggiorna impostazioni', 'Refresh settings'],
  'settings.restore': ['Ripristina valori salvati', 'Restore saved values'],
  'settings.loading': ['Aggiornamento delle impostazioni', 'Updating settings'],
  'settings.format': ['Lingua e formato', 'Language and formatting'],
  'settings.currentZone': ['Fuso attuale: {timezone}', 'Current time zone: {timezone}'],
  'settings.zoneForUpdates': ['Fuso orario per gli aggiornamenti', 'Time zone for updates'],
  'settings.zoneHelp': [
    'Il fuso cambia la visualizzazione degli orari. Le date di contabilizzazione dei movimenti restano quelle della fonte.',
    'The time zone changes how times are displayed. Transaction booking dates remain the dates provided by the source.',
  ],
  'settings.lastChange': ['Ultima modifica: {date}', 'Last changed: {date}'],
  'settings.freeBetaTitle': ['Beta gratuita', 'Free beta'],
  'settings.freeBetaCopy': [
    'Stai usando dati sintetici. Questo prototipo non vende abbonamenti e non effettua addebiti.',
    'You are using synthetic data. This prototype does not sell subscriptions or charge you.',
  ],
  'settings.freeBetaCapabilities': [
    'Correggere i movimenti, usare le regole, controllare le corrispondenze, gestire la privacy, esportare ed eliminare i dati restano funzioni gratuite. Conti manuali e importazioni CSV non hanno un limite commerciale.',
    'Correcting transactions, using rules, checking links, managing privacy, exporting and deleting data remain free. Manual accounts and CSV imports have no commercial limit.',
  ],
  'settings.saved': ['Impostazioni salvate.', 'Settings saved.'],
  'settings.loadFailed': [
    'Non riesco a caricare le impostazioni. Riprova.',
    'I could not load settings. Try again.',
  ],
  'settings.refreshFailed': [
    'Non riesco ad aggiornare le impostazioni. Riprova.',
    'I could not refresh settings. Try again.',
  ],
  'settings.changed': [
    'Le impostazioni sono cambiate. Ho aggiornato i dati: controllali prima di salvare di nuovo.',
    'Settings changed. I refreshed the saved values: review them before saving again.',
  ],
  'settings.updatedAt': ['Impostazioni aggiornate: {date}', 'Settings updated: {date}'],
  'settings.beta': [
    'La prova locale è gratuita. Nessun acquisto o addebito automatico.',
    'The local trial is free. No purchases or automatic charges.',
  ],
  'home.title': ['I tuoi soldi, in ordine.', 'Your money, in order.'],
  'home.balance': ['Saldo osservato', 'Observed balance'],
  'home.spending': ['Spese', 'Spending'],
  'home.income': ['Entrate', 'Income'],
  'home.transfers': ['Trasferimenti esclusi dai totali', 'Transfers excluded from totals'],
  'home.understanding': ['Cosa è successo', 'What happened'],
  'home.safeToSpend': ['Quanto resta fino a {date}', 'What remains until {date}'],
  'home.estimateThrough': ['Stima: {amount} fino al {date}', 'Estimate: {amount} until {date}'],
  'home.calculation': ['Come lo calcoliamo', 'How we calculate it'],
  'home.insufficient': [
    'I dati disponibili non bastano per questa stima.',
    'The available data is insufficient for this estimate.',
  ],
  'home.reconciled': ['Movimenti riconciliati', 'Reconciled transactions'],
  'home.stale': [
    'Il saldo è datato. La sua data resta visibile.',
    'The balance is stale. Its observation date remains visible.',
  ],
  'ledger.title': ['Movimenti', 'Transactions'],
  'ledger.search': ['Cerca un movimento', 'Search transactions'],
  'ledger.pending': ['In attesa', 'Pending'],
  'ledger.booked': ['Contabilizzato', 'Booked'],
  'ledger.reversed': ['Stornato', 'Reversed'],
  'ledger.empty': ['Nessun movimento disponibile.', 'No transactions available.'],
  'ledger.originalDescription': ['Descrizione originale', 'Original description'],
  'ledger.normalisedDescription': ['Descrizione riconosciuta', 'Recognised description'],
  'ledger.category': ['Categoria', 'Category'],
  'ledger.onlyThis': ['Solo questo movimento', 'Only this transaction'],
  'ledger.always': ['Sì, sempre', 'Yes, always'],
  'ledger.noAutomaticFact': [
    'È una proposta, non una relazione confermata.',
    'This is a suggestion, not a confirmed link.',
  ],
  'review.empty': [
    'Niente da rivedere. Tutto è al suo posto.',
    'Nothing to review. Everything is in its place.',
  ],
  'review.count': [
    '{count, plural, one {# movimento richiede attenzione.} other {# movimenti richiedono attenzione.}}',
    '{count, plural, one {# transaction needs attention.} other {# transactions need attention.}}',
  ],
  'review.categorySaved': ['Categoria aggiornata.', 'Category updated.'],
  'recurring.title': ['Abbonamenti e ricorrenti', 'Subscriptions and recurring payments'],
  'recurring.possible': ['Possibile ricorrenza', 'Possible recurring payment'],
  'recurring.nextEstimated': ['Prossima data stimata: {date}', 'Estimated next date: {date}'],
  'recurring.notContract': [
    'La ricorrenza non conferma un contratto o un addebito futuro.',
    'A recurring pattern does not confirm a contract or a future charge.',
  ],
  'recurring.empty': ['Nessuna ricorrenza proposta.', 'No recurring payments suggested.'],
  'privacy.title': ['Le tue preferenze di riservatezza', 'Your privacy preferences'],
  'privacy.rulesTitle': ['Come riconosciamo i movimenti', 'How we recognise transactions'],
  'privacy.rulesOnly': ['Usa solo le mie regole', 'Use only my rules'],
  'privacy.rulesHelp': [
    'Usa solo le tue regole per rinunciare ai suggerimenti del dizionario degli esercenti. Le correzioni e le regole che hai scelto restano attive.',
    'Use only your rules to turn off merchant-dictionary suggestions. Your corrections and chosen rules remain active.',
  ],
  'privacy.rulesSaved': ['Preferenza di riconoscimento salvata.', 'Recognition preference saved.'],
  'privacy.serviceTitle': ['Avvisi di servizio nell’app', 'Service notices in the app'],
  'privacy.serviceChoice': [
    'Ricevi gli avvisi facoltativi nell’app',
    'Receive optional notices in the app',
  ],
  'privacy.serviceHelp': [
    'Puoi scegliere gli avvisi facoltativi. Gli avvisi essenziali di sicurezza e le informazioni sull’esportazione o sulla cancellazione restano disponibili.',
    'You can choose optional notices. Essential security notices and information about export or deletion remain available.',
  ],
  'privacy.oldGrantHelp': [
    'La scelta precedente non abilita questi avvisi. Puoi revocarla subito, oppure leggere il testo qui sopra e scegliere di nuovo.',
    'Your previous choice does not enable these notices. You can withdraw it now, or read the text above and choose again.',
  ],
  'privacy.withdrawOld': ['Revoca la scelta precedente', 'Withdraw the previous choice'],
  'privacy.oldWithdrawn': ['Scelta precedente revocata.', 'Previous choice withdrawn.'],
  'privacy.serviceSaved': ['Preferenza degli avvisi salvata.', 'Notice preference saved.'],
  'privacy.unavailableFeatures': [
    'Questa scelta riguarda l’app. Non abilita notifiche del telefono. Le funzioni di AI esterna e di analisi identificata non sono disponibili nella configurazione attuale.',
    'This choice concerns the app. It does not enable phone notifications. External AI and identified analytics are unavailable in the current configuration.',
  ],
  'privacy.transactionTitle': [
    'Scegli i movimenti da escludere dai riepiloghi',
    'Choose transactions to exclude from summaries',
  ],
  'privacy.transactionHelp': [
    'Un movimento riservato o quieto resta nella tua lista e nella tua esportazione, ma viene escluso dai riepiloghi e dalle stime di spesa. La scelta non cancella il movimento.',
    'A private or quiet transaction remains in your list and export, but is excluded from summaries and spending estimates. This choice does not delete it.',
  ],
  'privacy.search': [
    'Cerca un movimento per le preferenze di riservatezza',
    'Search transactions for privacy preferences',
  ],
  'privacy.searchPlaceholder': [
    'Cerca descrizione, esercente o data',
    'Search description, merchant or date',
  ],
  'privacy.firstResults': [
    'Mostro i primi {count} risultati. Cerca per trovare gli altri movimenti.',
    'Showing the first {count} results. Search to find other transactions.',
  ],
  'privacy.noMatches': [
    'Nessun movimento corrisponde alla ricerca.',
    'No transactions match your search.',
  ],
  'privacy.quiet': ['Movimento quieto', 'Quiet transaction'],
  'privacy.private': ['Movimento riservato', 'Private transaction'],
  'privacy.transactionSaved': [
    'Preferenza del movimento salvata.',
    'Transaction preference saved.',
  ],
  'privacy.healthHelp': [
    'I movimenti classificati come salute sono già esclusi dai riepiloghi. Queste scelte aggiungono una tua preferenza riservata e non rimuovono quella protezione.',
    'Transactions classified as health are already excluded from summaries. These choices add your private preference and do not remove that protection.',
  ],
  'privacy.reload': ['Ricarica le preferenze', 'Refresh preferences'],
  'privacy.refreshed': ['Preferenze aggiornate.', 'Preferences refreshed.'],
  'privacy.loading': ['Aggiornamento preferenze', 'Updating preferences'],
  'privacy.loadingTransaction': [
    'Caricamento preferenze del movimento',
    'Loading transaction preferences',
  ],
  'privacy.loadFailed': [
    'Non riesco a caricare le preferenze. Riprova.',
    'I could not load preferences. Try again.',
  ],
  'privacy.saveFailed': [
    'Non riesco a salvare le preferenze. Riprova.',
    'I could not save preferences. Try again.',
  ],
  'privacy.transactionLoadFailed': [
    'Non riesco a caricare questo movimento. Riprova.',
    'I could not load this transaction. Try again.',
  ],
  'privacy.changed': [
    'Le preferenze sono cambiate. Ho aggiornato i dati: controllali e scegli di nuovo.',
    'Preferences changed. I refreshed the saved values: review them and choose again.',
  ],
  'privacy.refreshFailed': [
    'Non riesco ad aggiornare le preferenze. Riprova.',
    'I could not refresh preferences. Try again.',
  ],
  'ownership.title': ['I tuoi dati', 'Your data'],
  'ownership.export': ['Esporta i dati', 'Export your data'],
  'ownership.zip': ['Scarica archivio ZIP', 'Download ZIP archive'],
  'ownership.disconnect': ['Scollega fonte', 'Disconnect source'],
  'ownership.keepHistory': ['Conserva lo storico', 'Keep history'],
  'ownership.eraseAll': ['Elimina tutto', 'Delete everything'],
  'ownership.erase': ['Elimina i dati', 'Delete your data'],
  'identity.signIn': ['Accedi', 'Sign in'],
  'identity.signOut': ['Esci', 'Sign out'],
  'identity.createProfile': ['Crea un profilo locale', 'Create a local profile'],
  'identity.create': ['Crea il profilo locale', 'Create the local profile'],
  'identity.localTitle': ['Accesso locale', 'Local sign-in'],
  'identity.email': ['Email', 'Email'],
  'identity.password': ['Password', 'Password'],
  'identity.profileName': ['Nome del profilo', 'Profile name'],
  'identity.adult': [
    'Dichiaro di avere almeno 18 anni.',
    'I confirm that I am at least 18 years old.',
  ],
  'identity.terms': [
    'Accetto le condizioni locali di prova, bozza v1.',
    'I accept the local trial terms, draft v1.',
  ],
  'identity.sessionExpired': ['Accedi di nuovo per continuare.', 'Sign in again to continue.'],
  'identity.verify': ['Conferma la tua identità', 'Verify your identity'],
  'identity.secondFactor': ['Codice di verifica', 'Verification code'],
  'identity.recoveryCode': ['Codice di recupero', 'Recovery code'],
  'identity.stepUpHelp': [
    'Conferma la tua identità, poi scegli di nuovo l’azione. Non verrà ripetuta automaticamente.',
    'Verify your identity, then choose the action again. It will not be repeated automatically.',
  ],
  'identity.passkey': ['Accedi con passkey', 'Sign in with a passkey'],
  'identity.enablePasskey': ['Aggiungi una passkey', 'Add a passkey'],
  'identity.totp': ['Verifica in due passaggi', 'Two-step verification'],
  'identity.dismissSecrets': ['Ho conservato i codici', 'I have saved the codes'],
  'identity.localOnly': [
    'Accesso locale per dati sintetici. I collegamenti bancari reali non sono disponibili.',
    'Local sign-in for synthetic data. Real bank connections are unavailable.',
  ],
  'evidence.userCorrection': [
    'Hai corretto la categoria di questo movimento.',
    'You corrected this transaction’s category.',
  ],
  'evidence.ruleConflict': [
    'Due tue regole propongono categorie diverse: scegli quella corretta.',
    'Two of your rules suggest different categories: choose the correct one.',
  ],
  'evidence.noMatch': [
    'Gli indizi disponibili non bastano per scegliere una categoria.',
    'The available evidence is insufficient to choose a category.',
  ],
  'evidence.rule': [
    'La categoria segue una tua regola per questo esercente.',
    'The category follows your rule for this merchant.',
  ],
  'evidence.preference': [
    'Hai scelto la categoria per questo esercente.',
    'You chose the category for this merchant.',
  ],
  'evidence.dictionary': [
    'Esercente riconosciuto nei dati dimostrativi: {merchant}.',
    'Merchant recognised in the demo data: {merchant}.',
  ],
  'evidence.dictionaryUnknown': [
    'Esercente riconosciuto nei dati dimostrativi.',
    'Merchant recognised in the demo data.',
  ],
  'evidence.sameAccount': [
    'I movimenti riguardano lo stesso conto.',
    'The transactions belong to the same account.',
  ],
  'evidence.providerRelated': [
    'La fonte collega esplicitamente i due movimenti.',
    'The source explicitly links the two transactions.',
  ],
  'evidence.uniqueReference': [
    'I due movimenti condividono un riferimento univoco della fonte.',
    'The two transactions share a unique source reference.',
  ],
  'evidence.sameFingerprint': [
    'Conto, esercente, data e importo coincidono.',
    'Account, merchant, date and amount match.',
  ],
  'evidence.providerAccountRelationship': [
    'La fonte collega esplicitamente i due conti.',
    'The source explicitly links the two accounts.',
  ],
  'evidence.accountRelationshipUnproven': [
    'Il collegamento tra i conti non è ancora dimostrato.',
    'The link between the accounts is not yet established.',
  ],
  'evidence.referenceUnproven': [
    'Manca un riferimento univoco condiviso.',
    'There is no shared unique reference.',
  ],
  'evidence.sameAccountCurrency': [
    'I movimenti hanno lo stesso conto e la stessa valuta.',
    'The transactions have the same account and currency.',
  ],
  'evidence.cumulativeRefund': [
    'L’importo complessivo dei rimborsi è stato confrontato con l’acquisto.',
    'The total refunds were compared with the purchase.',
  ],
  'evidence.competing': [
    'Ci sono più collegamenti possibili per uno stesso movimento.',
    'There are several possible links for the same transaction.',
  ],
  'evidence.sameAmount': ['Gli importi coincidono.', 'The amounts match.'],
  'evidence.changedAmount': [
    'L’importo è cambiato tra la prenotazione e la contabilizzazione.',
    'The amount changed between authorisation and booking.',
  ],
  'evidence.differentSources': [
    'I movimenti provengono da fonti diverse.',
    'The transactions come from different sources.',
  ],
  'evidence.ownedAccounts': [
    'Entrambi i conti sono inclusi nel profilo dimostrativo.',
    'Both accounts belong to the demo profile.',
  ],
  'evidence.oppositeAmounts': [
    'Gli importi hanno lo stesso valore con segni opposti.',
    'The amounts have equal values with opposite signs.',
  ],
  'evidence.unproven': [
    'Il collegamento tra i movimenti non è ancora dimostrato.',
    'The link between these transactions is not yet established.',
  ],
  'evidence.providerIncome': ['La fonte indica un’entrata.', 'The source identifies income.'],
  'evidence.providerExpense': ['La fonte indica una spesa.', 'The source identifies an expense.'],
  'evidence.providerTransfer': [
    'La fonte indica un trasferimento.',
    'The source identifies a transfer.',
  ],
  'evidence.providerSettlement': [
    'La fonte indica un addebito carta.',
    'The source identifies a card settlement.',
  ],
  'evidence.providerWithdrawal': [
    'La fonte indica un prelievo di contante.',
    'The source identifies a cash withdrawal.',
  ],
  'evidence.providerRefund': ['La fonte indica un rimborso.', 'The source identifies a refund.'],
  'evidence.incomeExcluded': [
    'Il movimento originale è escluso dai totali.',
    'The original transaction is excluded from totals.',
  ],
  'evidence.recurring': [
    'Tre movimenti osservati a distanza di circa un mese.',
    'Three transactions observed roughly one month apart.',
  ],
  'evidence.generic': [
    'L’indizio disponibile richiede una verifica.',
    'The available evidence needs review.',
  ],
  'category.unknown': ['Da classificare', 'Uncategorised'],
  'money.negative': ['meno {amount}', 'minus {amount}'],
  'money.currencyAmount': ['{amount} {currency}', '{amount} {currency}'],
  'format.invalidDate': ['Data non disponibile', 'Date unavailable'],
  'format.invalidTimezone': ['Fuso orario non disponibile', 'Time zone unavailable'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>

export const MESSAGE_PAIRS = {
  ...CORE_MESSAGE_PAIRS,
  ...APP_MESSAGE_PAIRS,
  ...MAPPED_IMPORT_MESSAGE_PAIRS,
  ...MANUAL_MESSAGE_PAIRS,
  ...CONNECTION_MESSAGE_PAIRS,
  ...PANEL_MESSAGE_PAIRS,
  ...MERCHANT_MESSAGE_PAIRS,
  ...IDENTITY_PANEL_MESSAGE_PAIRS,
} as const

export type MessageKey = keyof typeof MESSAGE_PAIRS
export const MESSAGE_CATALOGUES = Object.freeze({
  'it-IT': Object.freeze(
    Object.fromEntries(Object.entries(MESSAGE_PAIRS).map(([key, pair]) => [key, pair[0]])),
  ) as Readonly<Record<MessageKey, string>>,
  'en-GB': Object.freeze(
    Object.fromEntries(Object.entries(MESSAGE_PAIRS).map(([key, pair]) => [key, pair[1]])),
  ) as Readonly<Record<MessageKey, string>>,
})
