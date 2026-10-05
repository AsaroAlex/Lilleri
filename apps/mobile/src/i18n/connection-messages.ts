export const CONNECTION_MESSAGE_PAIRS = {
  'connections.setupTitle': ['Colleghiamo la tua banca.', 'Connect your bank.'],
  'connections.setupHelp': [
    'Banche, carte e wallet, in un solo posto. Scegli una fonte per vedere come collegarla; l’aggiornamento automatico deve ancora essere attivato.',
    'Banks, cards and wallets in one place. Choose a source to see how to connect it; automatic updates still need activation.',
  ],
  'connections.setupIdentity': ['Accesso personale protetto', 'Protected personal sign-in'],
  'connections.setupProvider': ['Servizio di collegamento bancario', 'Bank connection service'],
  'connections.setupConsent': ['Autorizzazione nella tua banca', 'Authorisation at your bank'],
  'connections.setupPending': ['Da configurare', 'Needs setup'],
  'connections.setupWaiting': ['Dopo la configurazione', 'After setup'],
  'connections.historyInterruption': [
    'Accesso interrotto dal {from} al rinnovo del {to}.',
    'Access interrupted from {from} until renewal on {to}.',
  ],
  'connections.historyUnverified': [
    'Una sincronizzazione completa deve ancora verificare quali date sono recuperabili. Le date mancanti non sono note.',
    'A complete sync must still verify which dates can be recovered. Missing dates are unknown.',
  ],
  'connections.historyBankGap': [
    'Intervallo non acquisito dalla banca: dal {from} al {to}. Un file può integrare lo storico; le righe importate non dimostrano da sole la completezza del periodo.',
    'Interval not acquired from the bank: {from} to {to}. A file can supplement history; imported rows alone do not prove the period is complete.',
  ],
  'connections.recoverImport': [
    'Recupera con CSV o Excel: {name}',
    'Recover with CSV or Excel: {name}',
  ],
  'connections.title': ['Collegamenti', 'Connections'],
  'connections.kind.current': ['Conto corrente', 'Current account'],
  'connections.kind.savings': ['Risparmi', 'Savings'],
  'connections.kind.card': ['Carta', 'Card'],
  'connections.kind.cash': ['Contanti', 'Cash'],
  'connections.state.active': ['Attivo', 'Active'],
  'connections.state.expiring': ['Da rinnovare a breve', 'Renewal due soon'],
  'connections.state.expired': ['Autorizzazione scaduta', 'Authorisation expired'],
  'connections.state.revoked': ['Scollegato', 'Disconnected'],
  'connections.state.error': ['Richiede una verifica', 'Needs checking'],
  'connections.state.paused': ['In pausa', 'Paused'],
  'connections.state.unknown': ['Autorizzazione da verificare', 'Authorisation needs checking'],
  'connections.state.unavailable': ['Stato non disponibile', 'Status unavailable'],
  'connections.event.granted': ['Autorizzazione della fonte', 'Source authorised'],
  'connections.event.renewed': ['Autorizzazione rinnovata', 'Authorisation renewed'],
  'connections.event.paused': ['Collegamento in pausa', 'Connection paused'],
  'connections.event.resumed': ['Collegamento ripreso', 'Connection resumed'],
  'connections.event.revoked': ['Collegamento scollegato', 'Connection disconnected'],
  'connections.event.provider_error': [
    'Problema segnalato dalla fonte',
    'Problem reported by the source',
  ],
  'connections.event.provider_recovered': [
    'Fonte nuovamente disponibile',
    'Source available again',
  ],
  'connections.event.legacy_imported': [
    'Storico precedente ricostruito',
    'Previous history reconstructed',
  ],
  'connections.dateUnknown': ['Non comunicata dalla fonte', 'Not provided by the source'],
  'connections.coverage.unknown': ['Copertura non verificata', 'Coverage unverified'],
  'connections.coverage.unavailable': ['Non ancora collegabile', 'Connection unavailable'],
  'connections.coverage.synthetic': [
    'Disponibile solo nella simulazione',
    'Available only in the simulation',
  ],
  'connections.coverage.unverified': [
    'Disponibilità dichiarata, non verificata',
    'Availability declared, unverified',
  ],
  'connections.coverage.sandbox': [
    'Verificata nel solo ambiente di prova',
    'Verified in the test environment only',
  ],
  'connections.coverage.verified': [
    'Copertura verificata nella configurazione',
    'Coverage verified in this configuration',
  ],
  'connections.loadingProfile': [
    'Caricamento dei collegamenti del profilo corrente',
    'Loading connections for the current profile',
  ],
  'connections.loading': [
    'Aggiornamento dello stato dei collegamenti…',
    'Updating connection status…',
  ],
  'connections.syntheticDisclosure': [
    'Questa versione usa solo dati sintetici. Nessuna banca reale viene collegata. La fonte dimostrativa fornisce saldi e movimenti e non dispone pagamenti.',
    'This version uses synthetic data only. No real bank is connected. The demonstration source provides balances and transactions and cannot make payments.',
  ],
  'connections.availableKinds': ['Disponibilità per tipo di conto', 'Availability by account type'],
  'connections.syntheticKinds': [
    'Il collegamento include i conti della simulazione. L’elenco non indica banche reali supportate.',
    'The connection includes the simulation accounts. This list does not indicate support for real banks.',
  ],
  'connections.linked': [
    'Fonte dimostrativa già collegata',
    'Demonstration source already connected',
  ],
  'connections.connect': ['Collega la fonte dimostrativa', 'Connect the demonstration source'],
  'connections.connected': [
    'Fonte dimostrativa collegata. Controlla qui lo stato e l’ultima acquisizione.',
    'Demonstration source connected. Check its status and last acquisition here.',
  ],
  'connections.manualUnavailable': [
    'Non ancora collegabile — aggiungi il saldo a mano.',
    'Connection unavailable — add the balance manually.',
  ],
  'connections.manual': ['Aggiungi il saldo a mano', 'Add the balance manually'],
  'connections.noCoverage': [
    'Nessuna copertura disponibile nella configurazione corrente. Puoi aggiungere un conto a mano.',
    'No coverage is available in the current configuration. You can add an account manually.',
  ],
  'connections.useManual': ['Usa un conto manuale', 'Use a manual account'],
  'connections.source': ['Fonte dimostrativa', 'Demonstration source'],
  'connections.accounts': [
    '{count, plural, one {# conto incluso} other {# conti inclusi}}{names}',
    '{count, plural, one {# account included} other {# accounts included}}{names}',
  ],
  'connections.lastAcquisition': ['Ultima acquisizione: {date}', 'Last acquisition: {date}'],
  'connections.consentExpiry': [
    'Scadenza dell’autorizzazione: {date}',
    'Authorisation expiry: {date}',
  ],
  'connections.scaDue': [
    'Autenticazione richiesta dalla fonte: {date}',
    'Authentication required by the source: {date}',
  ],
  'connections.sessionExpiry': [
    'Scadenza della sessione della fonte: {date}',
    'Source session expiry: {date}',
  ],
  'connections.tokenExpiry': [
    'Scadenza del token della fonte: {date}',
    'Source token expiry: {date}',
  ],
  'connections.legacyDates': [
    'Le date disponibili provengono dallo storico precedente; la fonte non ha comunicato gli altri termini.',
    'The available dates come from previous history; the source has not provided its other terms.',
  ],
  'connections.pausedHelp': [
    'La pausa interrompe gli aggiornamenti e conserva lo storico. L’autorizzazione continua a seguire la sua scadenza.',
    'Pausing stops updates and preserves history. The authorisation retains its expiry date.',
  ],
  'connections.expiredHelp': [
    'I dati salvati restano visibili con la loro data. Rinnova l’autorizzazione prima di aggiornare{resume}.',
    'Saved data remains visible with its date. Renew the authorisation before updating{resume}.',
  ],
  'connections.orResume': [' o riprendere il collegamento', ' or resuming the connection'],
  'connections.revokedHelp': [
    'Gli aggiornamenti sono interrotti. Lo storico resta disponibile; una nuova autorizzazione richiede un’altra scelta esplicita.',
    'Updates have stopped. History remains available; a new authorisation requires another explicit choice.',
  ],
  'connections.update': ['Aggiorna questa fonte', 'Update this source'],
  'connections.resume': ['Riprendi il collegamento', 'Resume connection'],
  'connections.resumed': [
    'Collegamento ripreso. Puoi scegliere Aggiorna questa fonte.',
    'Connection resumed. You can select Update this source.',
  ],
  'connections.pause': ['Metti in pausa', 'Pause'],
  'connections.paused': [
    'Collegamento in pausa. Lo storico e la scadenza sono conservati.',
    'Connection paused. History and expiry are preserved.',
  ],
  'connections.renew': ['Rinnova autorizzazione dimostrativa', 'Renew demonstration authorisation'],
  'connections.renewed': [
    'Rinnovo confermato dalla fonte dimostrativa. Controlla la scadenza comunicata qui sopra.',
    'Renewal confirmed by the demonstration source. Check the expiry shown above.',
  ],
  'connections.closeHistory': ['Chiudi storico autorizzazione', 'Close authorisation history'],
  'connections.history': ['Storico autorizzazione', 'Authorisation history'],
  'connections.eventLegacy': [
    'Evento ricostruito dallo storico',
    'Event reconstructed from history',
  ],
  'connections.eventUser': ['Scelta tua', 'Your choice'],
  'connections.eventProvider': ['Informazione della fonte', 'Source information'],
  'connections.noEvents': [
    'Nessun evento registrato. Lo stato precedente resta distinto da una nuova autorizzazione.',
    'No event is recorded. Previous status remains separate from a new authorisation.',
  ],
  'connections.noConnections': [
    'Non hai collegamenti. Puoi usare la fonte dimostrativa o aggiungere un saldo a mano.',
    'You have no connections. Use the demonstration source or add a balance manually.',
  ],
  'connections.savedRefreshFailed': [
    'La modifica è stata confermata, ma l’aggiornamento dei dati non è riuscito. Ricarica per vedere lo stato corrente.',
    'The change was confirmed, but data could not be refreshed. Reload to see the current status.',
  ],
  'connections.changed': [
    'Il collegamento è cambiato. Ho aggiornato i dati: controllali prima di scegliere di nuovo.',
    'The connection has changed. Data has been refreshed: check it before choosing again.',
  ],
  'connections.refreshFailed': [
    'Il collegamento richiede una verifica e non riesco ad aggiornare lo stato. Ricarica prima di continuare.',
    'The connection needs checking and its status could not be refreshed. Reload before continuing.',
  ],
  'connections.syncHistory': ['Storico aggiornamenti', 'Update history'],
  'connections.syncContinue': ['Continua aggiornamento', 'Continue update'],
  'connections.syncCheck': ['Controlla progresso', 'Check progress'],
  'connections.syncNone': [
    'Nessun aggiornamento durevole registrato.',
    'No durable update is recorded.',
  ],
  'connections.syncProgress': [
    '{pages, plural, one {# pagina acquisita} other {# pagine acquisite}} · {done} di {total} finestre completate',
    '{pages, plural, one {# page acquired} other {# pages acquired}} · {done} of {total} windows completed',
  ],
  'connections.syncFinancialUnchanged': [
    'Finché l’acquisizione è incompleta, saldi e ultima acquisizione restano quelli già salvati.',
    'While acquisition is incomplete, balances and the last acquisition remain as previously saved.',
  ],
  'connections.syncCompleted': [
    'Aggiornamento completato: {inserted} nuovi, {updated} aggiornati, {unchanged} invariati; {rejected} non acquisiti con motivo nel report.',
    'Update completed: {inserted} new, {updated} updated, {unchanged} unchanged; {rejected} not acquired, with reasons in the report.',
  ],
  'connections.syncBalanceUnknown': [
    'Confronto del saldo non disponibile: mancano termini comparabili della fonte.',
    'Balance comparison unavailable: comparable source terms are missing.',
  ],
  'connections.syncBalanceEqual': [
    'Confronto del saldo: coincide per tipo, data e intervallo documentati.',
    'Balance comparison: matches for the documented type, date and interval.',
  ],
  'connections.syncBalanceMismatch': [
    'Confronto del saldo: c’è una differenza da verificare. Nessun aggiustamento automatico è stato creato.',
    'Balance comparison: a difference needs checking. No automatic adjustment was created.',
  ],
  'connections.syncCoverageUnknown': [
    'Copertura dell’intervallo non verificata.',
    'Coverage of the interval is unverified.',
  ],
  'connections.syncCoverageComplete': [
    'Intervallo richiesto acquisito; la copertura precedente resta distinta.',
    'Requested interval acquired; earlier coverage remains separate.',
  ],
  'connections.syncPendingUnknown': [
    '{count, plural, one {# movimento pendente assente richiede una verifica; la riserva è conservata.} other {# movimenti pendenti assenti richiedono una verifica; le riserve sono conservate.}}',
    '{count, plural, one {# absent pending transaction needs checking; its reservation is preserved.} other {# absent pending transactions need checking; their reservations are preserved.}}',
  ],
  'connections.syncSourceRemoval': [
    '{count, plural, one {# movimento non compare in due acquisizioni complete. Lo storico e l’importo sono conservati per la verifica.} other {# movimenti non compaiono in due acquisizioni complete. Storico e importi sono conservati per la verifica.}}',
    '{count, plural, one {# transaction is absent from two complete acquisitions. Its history and amount are preserved for review.} other {# transactions are absent from two complete acquisitions. History and amounts are preserved for review.}}',
  ],
  'connections.syncAutomatic': [
    'Questo aggiornamento automatico viene ripreso dal pianificatore. Puoi controllarne il progresso.',
    'This automatic update is resumed by the scheduler. You can check its progress.',
  ],
  'connections.job.queued': ['Aggiornamento pronto da avviare', 'Update ready to start'],
  'connections.job.running': ['Aggiornamento in corso', 'Update in progress'],
  'connections.job.partial': [
    'Acquisizione parziale da continuare',
    'Partial acquisition to continue',
  ],
  'connections.job.retry_wait': [
    'La fonte richiede di attendere prima del prossimo tentativo',
    'The source requires waiting before another attempt',
  ],
  'connections.job.blocked': ['Aggiornamento sospeso', 'Update suspended'],
  'connections.job.completed': ['Acquisizione completata', 'Acquisition completed'],
  'connections.job.failed': ['Acquisizione non completata', 'Acquisition not completed'],
  'connections.job.cancelled': ['Aggiornamento annullato', 'Update cancelled'],
  'connections.reason.budget_reached': [
    'Limite di aggiornamento raggiunto. Lo storico resta disponibile.',
    'Update limit reached. History remains available.',
  ],
  'connections.reason.inactive': [
    'Gli aggiornamenti automatici sono in pausa per inattività.',
    'Automatic updates are paused due to inactivity.',
  ],
  'connections.reason.policy_unknown': [
    'La fonte non dichiara una politica di aggiornamento utilizzabile.',
    'The source has not declared a usable update policy.',
  ],
  'connections.reason.provider_unavailable': [
    'La fonte è temporaneamente non disponibile. I dati salvati restano disponibili.',
    'The source is temporarily unavailable. Saved data remains available.',
  ],
  'connections.reason.rate_limited': [
    'La fonte ha raggiunto il proprio limite di richieste.',
    'The source has reached its request limit.',
  ],
  'connections.reason.timeout': [
    'La fonte non ha risposto entro il tempo disponibile.',
    'The source did not respond within the available time.',
  ],
  'connections.reason.invalid_provider_contract': [
    'La risposta della fonte richiede una verifica.',
    'The source response needs checking.',
  ],
  'connections.reason.bound_reached': [
    'L’acquisizione supera i limiti configurati e richiede una verifica.',
    'The acquisition exceeds configured limits and needs checking.',
  ],
  'connections.reason.consent_inactive': [
    'Il consenso non consente altri aggiornamenti. Controlla l’autorizzazione.',
    'Consent does not allow further updates. Check the authorisation.',
  ],
  'connections.reason.snapshot_expired': [
    'La sessione di acquisizione della fonte non è più disponibile.',
    'The source acquisition session is no longer available.',
  ],
  'connections.reason.history_gap': [
    'La fonte non ha dichiarato l’inizio dello storico per tutti i conti.',
    'The source has not declared the start of history for every account.',
  ],
  'connections.reason.partial': [
    'Puoi acquisire la prossima tranche con una nuova scelta esplicita.',
    'You can acquire the next slice with another explicit choice.',
  ],
  'connections.syncRetryAt': [
    'Prossimo tentativo disponibile: {date}',
    'Next attempt available: {date}',
  ],
  'connections.reloadAvailability': [
    'Ricarica stato e disponibilità',
    'Reload status and availability',
  ],
  'connections.availabilityUpdated': [
    'Stato e disponibilità aggiornati.',
    'Status and availability updated.',
  ],
  'connections.disconnectChoice': [
    'Scollega e scegli i dati',
    'Disconnect and choose what happens to data',
  ],
  'connections.disconnectQuestion': [
    'Cosa vuoi fare dei dati della fonte?',
    'What would you like to do with this source’s data?',
  ],
  'connections.disconnectMandate': [
    'Scollegare interrompe i futuri aggiornamenti e richiede la revoca dell’autorizzazione della fonte.',
    'Disconnecting stops future updates and requests revocation of the source’s authorisation.',
  ],
  'connections.dataChoiceLabel': ['Dati dopo lo scollegamento', 'Data after disconnecting'],
  'connections.retainChoice': ['Conserva lo storico', 'Keep the history'],
  'connections.eraseChoice': ['Elimina i dati della fonte', 'Erase this source’s data'],
  'connections.retainExplanation': [
    'Saldi, movimenti e modifiche già salvati restano disponibili. Non saranno raccolti nuovi dati da questa autorizzazione.',
    'Previously saved balances, transactions and edits remain available. No new data will be collected under this authorisation.',
  ],
  'connections.eraseExplanation': [
    'Elimina dall’archivio attuale i saldi, i movimenti e il contenuto grezzo di questa fonte. La ricevuta di eliminazione protegge dal ripristino dei dati cancellati; i dati delle altre fonti restano conservati.',
    'Erase this source’s balances, transactions and raw content from the current archive. An erasure receipt protects against restoring erased data; other sources’ data is retained.',
  ],
  'connections.sharedKeyDisclosure': [
    'La chiave di cifratura è condivisa dal profilo e resta necessaria per gli altri dati. Questa operazione non dichiara la distruzione di una chiave dedicata alla fonte.',
    'The profile shares its encryption key, which remains necessary for other data. This operation does not claim destruction of a key dedicated to this source.',
  ],
  'connections.eraseAcknowledgement': [
    'Confermo di voler eliminare i dati salvati di questa fonte.',
    'I confirm that I want to erase this source’s saved data.',
  ],
  'connections.confirmErase': ['Scollega ed elimina i dati', 'Disconnect and erase data'],
  'connections.confirmRetain': ['Scollega e conserva lo storico', 'Disconnect and keep history'],
  'connections.cancelDisconnect': ['Annulla', 'Cancel'],
  'connections.erased': [
    'Fonte scollegata e dati eliminati dall’archivio attuale.',
    'Source disconnected and data erased from the current archive.',
  ],
  'connections.disconnected': [
    'Fonte scollegata. Lo storico resta disponibile.',
    'Source disconnected. History remains available.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
