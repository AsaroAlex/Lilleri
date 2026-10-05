/** Real bank authorisation (institution choice, trust panel, return outcomes and first read). */
export const BANK_INSTITUTION_MESSAGE_PAIRS = {
  'bankInstitutions.back': ['Indietro', 'Back'],
  'bankInstitutions.title': ['Scegli la tua banca', 'Choose your bank'],
  'bankInstitutions.intro': [
    'Cerca la tua banca nell’elenco del servizio di collegamento e selezionala. Se trovi più voci simili, scegli quella che usi per accedere al conto.',
    'Search for your bank in the connection service’s list and select it. If several entries look similar, choose the one you use to sign in to your account.',
  ],
  'bankInstitutions.search': ['Cerca la tua banca', 'Search for your bank'],
  'bankInstitutions.clearSearch': ['Cancella la ricerca', 'Clear search'],
  'bankInstitutions.loading': ['Carico l’elenco delle banche…', 'Loading the list of banks…'],
  'bankInstitutions.loadFailed': [
    'Non riesco a caricare l’elenco delle banche. Riprova tra poco.',
    'I cannot load the list of banks. Try again shortly.',
  ],
  'bankInstitutions.retry': ['Riprova', 'Try again'],
  'bankInstitutions.listLabel': ['Banche disponibili', 'Available banks'],
  'bankInstitutions.resultCount': [
    '{count, plural, =0 {Nessuna banca corrisponde alla ricerca.} one {# banca corrisponde alla ricerca.} other {# banche corrispondono alla ricerca.}}',
    '{count, plural, =0 {No banks match your search.} one {# bank matches your search.} other {# banks match your search.}}',
  ],
  'bankInstitutions.moreResults': [
    'Mostro le prime {shown} su {count}. Scrivi altre lettere del nome per restringere l’elenco.',
    'Showing the first {shown} of {count}. Type more of the name to narrow the list.',
  ],
  'bankInstitutions.noMatchHelp': [
    'Prova con una parte del nome, per esempio senza la forma societaria.',
    'Try part of the name, for example without the company type.',
  ],
  'bankInstitutions.newIntegration': ['Nuova integrazione', 'New integration'],
  'bankInstitutions.optionNew': ['{name}, nuova integrazione', '{name}, new integration'],
  'bankInstitutions.chooseFirst': [
    'Seleziona una banca dall’elenco per continuare.',
    'Select a bank from the list to continue.',
  ],
  'bankInstitutions.continue': ['Continua con {name}', 'Continue with {name}'],
  'bankInstitutions.countryUnavailableTitle': [
    'Collegamento automatico non ancora disponibile',
    'Automatic connection is not available yet',
  ],
  'bankInstitutions.countryUnavailable': [
    'Il collegamento automatico non è ancora disponibile per le banche in questo Paese ({country}). Puoi importare un file di movimenti o aggiungere un conto manuale.',
    'Automatic connection is not yet available for banks in this country ({country}). You can import a transaction file or add a manual account.',
  ],
  'bankInstitutions.plusTitle': ['Incluso in Plus', 'Included in Plus'],
  'bankInstitutions.plusHelp': [
    'Il collegamento automatico con la banca è incluso nell’abbonamento Plus. Conti manuali, importazione di file, regole ed esportazione restano gratuiti.',
    'Automatic bank connection is included in the Plus subscription. Manual accounts, file import, rules and export remain free.',
  ],
  'bankInstitutions.plusAction': ['Scopri Plus', 'See Plus'],
  'bankInstitutions.listReadOnly': [
    'Puoi comunque controllare se la tua banca è nell’elenco.',
    'You can still check whether your bank is on the list.',
  ],
  'bankInstitutions.capacityTitle': [
    'Collegamenti automatici al completo per ora',
    'Automatic connections are full for now',
  ],
  'bankInstitutions.capacityHelp': [
    'Abbiamo raggiunto il numero di collegamenti automatici che possiamo seguire con cura. Stiamo aggiungendo nuovi posti: riprova nei prossimi giorni. Nel frattempo puoi importare un file o aggiungere un conto manuale.',
    'We have reached the number of automatic connections we can look after properly. We are adding more places: try again in the next few days. Meanwhile you can import a file or add a manual account.',
  ],
  'bankInstitutions.reviewTitle': ['Prima di andare alla tua banca', 'Before you go to your bank'],
  'bankInstitutions.reviewSelected': ['Banca scelta: {name}', 'Selected bank: {name}'],
  'bankInstitutions.trustReads': [
    'Lilleri legge conti, saldi e movimenti, in sola lettura.',
    'Lilleri reads accounts, balances and transactions, read-only.',
  ],
  'bankInstitutions.trustNoMoney': [
    'Lilleri non può spostare denaro né fare pagamenti.',
    'Lilleri cannot move money or make payments.',
  ],
  'bankInstitutions.trustCredentials': [
    'Accedi sulla pagina della tua banca: Lilleri non vede mai le tue credenziali bancarie.',
    'You sign in on your bank’s page: Lilleri never sees your bank credentials.',
  ],
  'bankInstitutions.trustProvider': [
    'Il collegamento è fornito da Enable Banking, fornitore autorizzato di servizi di informazione sui conti, che ti mostrerà i suoi termini.',
    'The connection is provided by Enable Banking, an authorised account information service provider, which will show you its terms.',
  ],
  'bankInstitutions.trustDuration': [
    'L’accesso dura fino a {days, plural, one {# giorno} other {# giorni}}. Puoi revocarlo in qualsiasi momento da Lilleri o dalla tua banca.',
    'Access lasts up to {days, plural, one {# day} other {# days}}. You can revoke it at any time from Lilleri or your bank.',
  ],
  'bankInstitutions.confirm': ['Continua su {name}', 'Continue to {name}'],
  'bankInstitutions.otherBank': ['Scegli un’altra banca', 'Choose another bank'],
  'bankInstitutions.redirecting': [
    'Ti porto alla pagina della tua banca…',
    'Taking you to your bank’s page…',
  ],
  'bankInstitutions.unsafeRedirect': [
    'Non riesco ad aprire la pagina della banca in modo sicuro. Non è stato collegato nulla: riprova tra poco.',
    'I cannot open the bank’s page securely. Nothing was connected: try again shortly.',
  ],
  'bankInstitutions.alreadyConnected': [
    'Questa banca è già collegata. Trovi il collegamento in Collegamenti, dove puoi anche rinnovarlo.',
    'This bank is already connected. You will find it in Connections, where you can also renew it.',
  ],
  'bankInstitutions.creationPending': [
    'Stiamo ancora completando un collegamento con questa banca. Attendi qualche istante, poi aggiorna.',
    'We are still completing a connection with this bank. Wait a moment, then refresh.',
  ],
  'bankInstitutions.revocationPending': [
    'Lo scollegamento precedente è ancora in corso. Attendi qualche istante prima di collegare di nuovo.',
    'The previous disconnection is still in progress. Wait a moment before connecting again.',
  ],
  'bankInstitutions.institutionUnavailable': [
    'Questa banca al momento non è disponibile. Scegline un’altra o riprova più tardi.',
    'This bank is unavailable right now. Choose another one or try again later.',
  ],
  'bankInstitutions.providerUnavailable': [
    'Il servizio di collegamento non risponde. Non è stato collegato nulla: riprova tra poco.',
    'The connection service is not responding. Nothing was connected: try again shortly.',
  ],
  'bankReturn.connected': [
    'La tua banca ha confermato l’accesso in sola lettura.',
    'Your bank has confirmed read-only access.',
  ],
  'bankReturn.cancelled': [
    'Hai annullato l’autorizzazione presso la banca. Non è stato collegato nulla.',
    'You cancelled the authorisation at your bank. Nothing was connected.',
  ],
  'bankReturn.expired': [
    'La richiesta di collegamento è scaduta prima della conferma. Non è stato collegato nulla: puoi ricominciare quando vuoi.',
    'The connection request expired before it was confirmed. Nothing was connected: you can start again whenever you like.',
  ],
  'bankReturn.unavailable': [
    'La banca o il servizio di collegamento non hanno completato la richiesta. Non è stato collegato nulla: riprova più tardi.',
    'Your bank or the connection service did not complete the request. Nothing was connected: try again later.',
  ],
  'bankReturn.institutionMismatch': [
    'La banca che ha confermato non corrisponde a quella scelta. Per sicurezza non abbiamo collegato nulla: scegli di nuovo la tua banca.',
    'The bank that confirmed does not match the one you chose. For your security nothing was connected: choose your bank again.',
  ],
  'bankReturn.noAccounts': [
    'La banca non ha condiviso alcun conto, quindi non è stato collegato nulla. Se riprovi, seleziona i conti durante l’autorizzazione.',
    'Your bank did not share any accounts, so nothing was connected. If you try again, select your accounts during authorisation.',
  ],
  'bankReturn.reading': [
    'Stiamo leggendo i movimenti dalla tua banca…',
    'We are reading the transactions from your bank…',
  ],
  'bankReturn.syncDone': [
    'Abbiamo letto i movimenti dalla tua banca. Li trovi in Movimenti.',
    'We have read the transactions from your bank. You will find them in Transactions.',
  ],
  'bankReturn.syncFailed': [
    'La prima lettura dei movimenti non è terminata. Puoi riprovare dalla scheda del collegamento.',
    'The first read of your transactions did not finish. You can try again from the connection card.',
  ],
  'bankReturn.syncSlow': [
    'La lettura richiede più tempo del solito e continua in background. Aggiorna la pagina tra qualche minuto.',
    'Reading is taking longer than usual and continues in the background. Refresh the page in a few minutes.',
  ],
  'hostedReturn.dismiss': ['Chiudi avviso', 'Dismiss notice'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
