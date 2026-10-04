/** Public problem codes only. Never translate or display untrusted exception text. */
export const PROBLEM_MESSAGES = {
  recognition_changed: [
    'Il riconoscimento è cambiato. Aggiorna i dati e scegli di nuovo.',
    'Recognition changed. Refresh the data and choose again.',
  ],
  recognition_unavailable: [
    'Il riconoscimento non è disponibile per questi dati.',
    'Recognition is unavailable for this data.',
  ],
  invalid_recognition: [
    'Controlla l’esercente e la categoria prima di salvare.',
    'Check the merchant and category before saving.',
  ],
  merchant_ambiguous: [
    'Più esercenti corrispondono a questo nome. Controlla la scelta.',
    'Several merchants match this name. Review your choice.',
  ],
  category_cycle: [
    'Questa relazione creerebbe un ciclo tra categorie. Scegli un’altra categoria.',
    'This relationship would create a category cycle. Choose another category.',
  ],
  category_migration_required: [
    'I movimenti usano questa categoria. Scegli prima dove spostarli.',
    'Transactions use this category. Choose where to move them first.',
  ],
  category_has_children: [
    'Questa categoria contiene altre categorie. Controllale prima di modificarla.',
    'This category contains other categories. Review them before changing it.',
  ],
  category_flow_conflict: [
    'La categoria non corrisponde al tipo di movimento. Controlla la scelta.',
    'The category does not match the transaction type. Review your choice.',
  ],
  category_undo_expired: [
    'Il tempo disponibile per annullare questa modifica è terminato.',
    'The time available to undo this change has ended.',
  ],
  recognition_storage_unavailable: [
    'Non riesco a salvare il riconoscimento. Aggiorna i dati e riprova.',
    'I could not save recognition. Refresh the data and try again.',
  ],
  balance_limit: [
    'Il saldo supera il limite disponibile. Controlla l’importo.',
    'The balance exceeds the available limit. Check the amount.',
  ],
  conflict: [
    'Il movimento è cambiato. Aggiorna i dati e scegli di nuovo.',
    'The transaction changed. Refresh the data and choose again.',
  ],
  consent_changed: [
    'Il collegamento è cambiato. Aggiorna lo stato e scegli di nuovo.',
    'The connection changed. Refresh its state and choose again.',
  ],
  consent_inactive: [
    'Il collegamento non è attivo. Controlla l’autorizzazione della fonte.',
    'The connection is inactive. Check the source authorisation.',
  ],
  consent_metadata_unavailable: [
    'La fonte non ha comunicato questi termini.',
    'The source has not provided these terms.',
  ],
  csv_identity_changed: [
    'Il file o la mappatura è cambiato. Crea una nuova anteprima.',
    'The file or mapping changed. Create a new preview.',
  ],
  export_too_large: [
    'L’archivio supera il limite locale. Nessun archivio parziale è stato creato.',
    'The archive exceeds the local limit. No partial archive was created.',
  ],
  host_forbidden: [
    'Questo indirizzo non può usare il servizio locale.',
    'This address cannot use the local service.',
  ],
  idempotency_key_reused: [
    'Questa richiesta è già associata a dati diversi. Crea una nuova anteprima.',
    'This request is already linked to different data. Create a new preview.',
  ],
  import_duplicate_review_required: [
    'Controlla i possibili duplicati prima di importare.',
    'Review possible duplicates before importing.',
  ],
  import_cross_source_review_required: [
    'Controlla i possibili duplicati bancari e scegli se collegare o conservare ogni riga.',
    'Review possible bank duplicates and choose whether to link or keep each row.',
  ],
  import_duplicate_target_reused: [
    'Due righe usano lo stesso movimento bancario. Controlla le ripetizioni e scegli di nuovo.',
    'Two rows use the same bank transaction. Review the repeated rows and choose again.',
  ],
  import_preview_stale: [
    'L’anteprima è cambiata. Creala di nuovo prima di importare.',
    'The preview changed. Create it again before importing.',
  ],
  institution_unavailable: [
    'Questa fonte non è disponibile nella configurazione attuale.',
    'This source is unavailable in the current configuration.',
  ],
  invalid_csv: [
    'Controlla il formato del file prima di importare.',
    'Check the file format before importing.',
  ],
  invalid_csv_mapping: [
    'Controlla le colonne e le convenzioni del file.',
    'Check the file columns and conventions.',
  ],
  invalid_cursor: [
    'La lista è cambiata. Ricarica i movimenti.',
    'The list changed. Reload the transactions.',
  ],
  invalid_export_snapshot: [
    'Non riesco a creare un archivio completo. Riprova.',
    'I could not create a complete archive. Try again.',
  ],
  invalid_manual_entry: [
    'Controlla l’importo, la valuta e la data del movimento.',
    'Check the transaction amount, currency and date.',
  ],
  invalid_manual_import: [
    'Controlla i dati da importare e crea una nuova anteprima.',
    'Check the import data and create a new preview.',
  ],
  invalid_privacy: [
    'Controlla la preferenza prima di salvare.',
    'Check the preference before saving.',
  ],
  invalid_rule: [
    'Controlla le condizioni e la categoria della regola.',
    'Check the rule conditions and category.',
  ],
  invalid_settings: [
    'Controlla il nome del profilo, la lingua e il fuso orario.',
    'Check the profile name, language and time zone.',
  ],
  invalid_understanding_input: [
    'Controlla il periodo e gli importi della stima.',
    'Check the estimate period and amounts.',
  ],
  invalid_understanding_preferences: [
    'Controlla i conti, il cuscinetto e la data scelti.',
    'Check your selected accounts, buffer and date.',
  ],
  understanding_changed: [
    'I dati o le scelte sono cambiati. Aggiorna e ripeti la scelta.',
    'Data or choices have changed. Refresh and make the choice again.',
  ],
  understanding_history_unavailable: [
    'Lo storico delle analisi non è disponibile. Riprova.',
    'Analysis history is unavailable. Try again.',
  ],
  manual_account_limit: [
    'È stato raggiunto il limite locale dei conti manuali.',
    'The local manual-account limit has been reached.',
  ],
  manual_balance_changed: [
    'Il saldo è cambiato. Aggiorna i dati e scegli di nuovo.',
    'The balance changed. Refresh the data and choose again.',
  ],
  manual_import_changed: [
    'I dati da importare sono cambiati. Crea una nuova anteprima.',
    'The import data changed. Create a new preview.',
  ],
  manual_source: [
    'Questa fonte manuale non richiede un collegamento bancario.',
    'This manual source does not require a bank connection.',
  ],
  manual_source_inactive: [
    'La fonte manuale non è più attiva.',
    'The manual source is no longer active.',
  ],
  merchant_unavailable: ['Questo esercente non è disponibile.', 'This merchant is unavailable.'],
  not_found: ['La risorsa richiesta non è disponibile.', 'The requested item is unavailable.'],
  nothing_to_undo: ['Non ci sono modifiche da annullare.', 'There are no changes to undo.'],
  notification_changed: [
    'L’avviso è cambiato. Ricarica gli avvisi.',
    'The notice changed. Reload notices.',
  ],
  notification_preferences_invalid: [
    'Controlla le preferenze degli avvisi.',
    'Check your notice preferences.',
  ],
  origin_forbidden: [
    'Questa origine non può usare il servizio locale.',
    'This origin cannot use the local service.',
  ],
  preview_limit: [
    'L’anteprima supera il limite locale. Riduci i dati selezionati.',
    'The preview exceeds the local limit. Reduce the selected data.',
  ],
  privacy_changed: [
    'Le preferenze sono cambiate. Aggiorna i dati e scegli di nuovo.',
    'Preferences changed. Refresh the data and choose again.',
  ],
  privacy_text_changed: [
    'Il testo della scelta è cambiato. Leggilo e scegli di nuovo.',
    'The choice text changed. Read it and choose again.',
  ],
  provider_unavailable: [
    'La fonte non è disponibile. I dati salvati restano visibili con la loro data.',
    'The source is unavailable. Saved data remains visible with its date.',
  ],
  public_identity_required: [
    'Per usare dati personali serve un accesso protetto. Questa anteprima è condivisa.',
    'Personal data needs a protected sign-in. This preview is shared.',
  ],
  rate_limited: [
    'Troppi tentativi. Attendi prima di riprovare.',
    'Too many attempts. Wait before trying again.',
  ],
  reauthentication_required: [
    'Conferma la tua identità, poi scegli di nuovo l’azione.',
    'Verify your identity, then choose the action again.',
  ],
  reconciliation_changed: [
    'I collegamenti tra movimenti sono cambiati. Aggiorna i dati.',
    'Transaction links changed. Refresh the data.',
  ],
  renewal_unsupported: [
    'Questa fonte non consente il rinnovo nella configurazione attuale.',
    'This source does not support renewal in the current configuration.',
  ],
  revocation_pending: [
    'Lo scollegamento è in corso. Attendi prima di collegare di nuovo.',
    'Disconnection is in progress. Wait before connecting again.',
  ],
  rule_archived: ['La regola è archiviata.', 'The rule is archived.'],
  rule_changed: [
    'La regola è cambiata. Aggiorna l’anteprima prima di applicarla.',
    'The rule changed. Refresh the preview before applying it.',
  ],
  rule_limit: [
    'È stato raggiunto il limite locale delle regole.',
    'The local rule limit has been reached.',
  ],
  session_invalid: ['Accedi di nuovo per continuare.', 'Sign in again to continue.'],
  settings_changed: [
    'Le impostazioni sono cambiate. Aggiorna i dati prima di salvare di nuovo.',
    'Settings changed. Refresh the data before saving again.',
  ],
  support_access_changed: [
    'L’accesso di assistenza è cambiato. Aggiorna lo stato.',
    'Support access changed. Refresh its state.',
  ],
  support_access_denied: [
    'L’accesso di assistenza non è disponibile.',
    'Support access is unavailable.',
  ],
  support_approval_duplicate: [
    'Questa approvazione è già stata registrata.',
    'This approval has already been recorded.',
  ],
  support_grant_active: [
    'Esiste già un accesso di assistenza attivo.',
    'A support access grant is already active.',
  ],
  support_grant_invalid: [
    'Controlla i termini dell’accesso di assistenza.',
    'Check the support access terms.',
  ],
  invalid_request: [
    'Controlla la richiesta prima di riprovare.',
    'Check the request before trying again.',
  ],
  request_failed: [
    'Il servizio non è disponibile. Riprova tra poco.',
    'The service is unavailable. Try again shortly.',
  ],
  forbidden: [
    'Questa azione non è disponibile per il tuo accesso.',
    'This action is unavailable for your access.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
