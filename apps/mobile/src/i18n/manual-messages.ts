/** Manual account and canonical CSV forms: Italian master and British English messages. */
export const MANUAL_MESSAGE_PAIRS = {
  'manual.csvResult': [
    '{inserted, plural, one {# nuovo movimento} other {# nuovi movimenti}}, {unchanged, plural, one {# già presente} other {# già presenti}}. Nessuna riga è stata modificata.',
    '{inserted, plural, one {# new transaction} other {# new transactions}}, {unchanged} already present. No rows were changed.',
  ],
  'manual.csvRowCount': [
    '{count, plural, one {# riga valida} other {# righe valide}}',
    '{count, plural, one {# valid row} other {# valid rows}}',
  ],
  'manual.csvPreview': [
    '{inserted} nuove · {unchanged} già presenti. Variazione dei nuovi movimenti: {amount}.',
    '{inserted} new · {unchanged} already present. Balance change from new transactions: {amount}.',
  ],
  'manual.amountCurrency': ['Importo in {currency}', 'Amount in {currency}'],
  'manual.correctedCurrency': ['Saldo corretto in {currency}', 'Corrected balance in {currency}'],
  'manual.currentBalance': ['Saldo corrente: {amount}', 'Current balance: {amount}'],
  'manual.enter_an_amount_without_thousands_separators_for_example_2_50': [
    'Scrivi un importo senza separatori delle migliaia, per esempio 2,50.',
    'Enter an amount without thousands separators, for example 2.50.',
  ],
  'manual.the_amount_or_currency_is_invalid_decimal_places_must_be_exact_for_this_cur': [
    'L’importo o la valuta non è valido. Le cifre decimali devono essere esatte per questa valuta.',
    'The amount or currency is invalid. Decimal places must be exact for this currency.',
  ],
  'manual.add_transaction': ['Aggiungi movimento', 'Add transaction'],
  'manual.add_account': ['Aggiungi conto', 'Add account'],
  'manual.import_csv': ['Importa CSV', 'Import CSV'],
  'manual.correct_balance': ['Correggi il saldo', 'Correct balance'],
  'manual.opening_balance': ['Saldo iniziale', 'Opening balance'],
  'manual.manual_entry': ['Inserimento a mano', 'Manual entry'],
  'manual.csv_import': ['Importazione CSV', 'CSV import'],
  'manual.balance_correction': ['Correzione del saldo', 'Balance correction'],
  'manual.entry_reversed': ['Inserimento annullato', 'Entry reversed'],
  'manual.cash': ['Contanti', 'Cash'],
  'manual.local_accounts_are_unavailable_try_again': [
    'I conti manuali non sono disponibili. Riprova.',
    'Manual accounts are unavailable. Try again.',
  ],
  'manual.history_is_unavailable': ['Lo storico non è disponibile.', 'History is unavailable.'],
  'manual.the_change_was_saved_but_i_could_not_refresh_the_data_reload_the_page_to_se': [
    'La modifica è stata salvata, ma non riesco ad aggiornare i dati. Ricarica la pagina per vedere il saldo corrente.',
    'The change was saved, but I could not refresh the data. Reload the page to see the current balance.',
  ],
  'manual.the_balance_changed_i_refreshed_the_data_review_it_before_choosing_again': [
    'Il saldo è cambiato. Ho aggiornato i dati: controllali prima di scegliere di nuovo.',
    'The balance changed. I refreshed the data: review it before choosing again.',
  ],
  'manual.the_balance_changed_and_could_not_be_refreshed_refresh_the_data_before_choo': [
    'Il saldo è cambiato e l’aggiornamento non è riuscito. Ricarica i dati prima di scegliere di nuovo.',
    'The balance changed and could not be refreshed. Refresh the data before choosing again.',
  ],
  'manual.the_change_is_unconfirmed_retry_with_the_same_data_the_request_retains_its_': [
    'Non sappiamo ancora se la modifica è stata salvata. Riprova con gli stessi dati per evitare un doppio inserimento.',
    'We cannot yet confirm whether the change was saved. Retry with the same details to avoid adding it twice.',
  ],
  'manual.local_account_added_the_opening_balance_is_not_new_income': [
    'Conto manuale aggiunto. Il saldo iniziale non è una nuova entrata.',
    'Manual account added. The opening balance is not new income.',
  ],
  'manual.add_a_local_account_first': [
    'Aggiungi prima un conto manuale.',
    'Add a manual account first.',
  ],
  'manual.for_incoming_amounts_enter_a_positive_amount_or_choose_expense': [
    'Per un’entrata scrivi un importo positivo, oppure scegli Spesa.',
    'For incoming amounts, enter a positive amount or choose Expense.',
  ],
  'manual.cash_expense': ['Spesa in contanti', 'Cash expense'],
  'manual.manual_income': ['Entrata a mano', 'Manual income'],
  'manual.manual_transfer': ['Trasferimento a mano', 'Manual transfer'],
  'manual.transaction_added_review_and_confirm_the_link_between_accounts_before_exclu': [
    'Movimento aggiunto. Controlla e conferma il collegamento tra conti prima di escluderlo dai totali.',
    'Transaction added. Review and confirm the link between accounts before excluding it from totals.',
  ],
  'manual.transaction_added_and_balance_updated': [
    'Movimento aggiunto e saldo aggiornato.',
    'Transaction added and balance updated.',
  ],
  'manual.choose_a_local_account': ['Scegli un conto manuale.', 'Choose a manual account.'],
  'manual.balance_corrected_the_difference_is_in_history_and_does_not_count_as_income': [
    'Saldo corretto. La differenza è nello storico e non conta come entrata o spesa.',
    'Balance corrected. The difference is in history and does not count as income or spending.',
  ],
  'manual.there_is_no_entry_to_reverse': [
    'Non c’è un inserimento da annullare.',
    'There is no entry to reverse.',
  ],
  'manual.reversal_of_the_latest_entry': [
    'Annullamento dell’ultimo inserimento',
    'Reversal of the latest entry',
  ],
  'manual.entry_reversed_balance_and_totals_were_updated_history_is_retained': [
    'Inserimento annullato. Il saldo e i totali sono stati aggiornati; lo storico è conservato.',
    'Entry reversed. Balance and totals were updated; history is retained.',
  ],
  'manual.there_is_no_correction_to_reverse': [
    'Non c’è una correzione da annullare.',
    'There is no correction to reverse.',
  ],
  'manual.reversal_of_the_previous_correction': [
    'Annullamento della correzione precedente',
    'Reversal of the previous correction',
  ],
  'manual.correction_reversed_with_a_new_history_event': [
    'Correzione annullata. Il saldo è aggiornato e lo storico conserva la modifica.',
    'Correction undone. The balance is updated and the change remains in history.',
  ],
  'manual.the_csv_is_invalid': ['Il CSV non è valido.', 'The CSV is invalid.'],
  'manual.import_completed': ['Importazione completata.', 'Import completed.'],
  'manual.review_a_new_preview_before_importing': [
    'Controlla di nuovo le righe prima di importare.',
    'Review the rows again before importing.',
  ],
  'manual.manual_accounts_and_files': [
    'Conti manuali e importazione',
    'Manual accounts and imports',
  ],
  'manual.cash_wallets_and_unconnected_accounts_amounts_retain_the_account_currency_d': [
    'Tieni traccia di contanti, carte e conti non collegati. Crea un conto, aggiungi un movimento o importa un CSV. Ogni importo resta nella valuta del conto.',
    'Track cash, cards and unconnected accounts. Create an account, add a transaction or import a CSV. Each amount stays in the account currency.',
  ],
  'manual.loading_local_accounts': ['Caricamento conti manuali', 'Loading manual accounts'],
  'manual.saving': ['Salvataggio in corso', 'Saving'],
  'manual.which_balance_are_you_starting_from': [
    'Da quale saldo inizi?',
    'Which balance are you starting from?',
  ],
  'manual.the_opening_balance_is_the_balance_at_the_start_of_the_selected_date_entrie': [
    'Il saldo iniziale è quello all’inizio della data scelta. Inserimenti e CSV da quella data lo aggiorneranno. Questo conto resta non collegato a una banca.',
    'The opening balance is the balance at the start of the selected date. Entries and CSV imports from that date update it. This account remains unconnected to a bank.',
  ],
  'manual.account_name': ['Nome del conto', 'Account name'],
  'manual.wallet_or_other': ['Portafoglio o altro', 'Wallet or other'],
  'manual.manual_card': ['Carta manuale', 'Manual card'],
  'manual.savings': ['Risparmio', 'Savings'],
  'manual.account_iso_currency': [
    'Valuta del conto, per esempio EUR',
    'Account currency, for example EUR',
  ],
  'manual.tracking_start_date': ['Data del saldo iniziale', 'Opening balance date'],
  'manual.create_local_account': ['Crea conto manuale', 'Create manual account'],
  'manual.import_a_csv_with_stable_identities': [
    'Importa movimenti da un CSV',
    'Import transactions from a CSV',
  ],
  'manual.up_to_1_000_rows_and_256_kib_this_csv_format_is_supported_with_comma_separa': [
    'Fino a 1.000 righe e 256 KiB. È supportato questo formato CSV, con virgole tra le colonne, importi con punto decimale e date YYYY-MM-DD. Mantieni lo stesso id quando ripeti un’importazione. Gli abbinamenti con altre fonti vanno controllati.',
    'Up to 1,000 rows and 256 KiB. This CSV format is supported, with comma-separated columns, decimal-point amounts and YYYY-MM-DD dates. Keep the same id when repeating an import. Matches with other sources need review.',
  ],
  'manual.destination_account': ['Conto di destinazione', 'Destination account'],
  'manual.add_a_local_account_to_begin': [
    'Aggiungi un conto manuale per iniziare.',
    'Add a manual account to begin.',
  ],
  'manual.csv_content': ['Contenuto del CSV', 'CSV content'],
  'manual.paste_the_header_and_rows': ['Incolla intestazione e righe', 'Paste the header and rows'],
  'manual.review_csv_preview': ['Controlla i movimenti del CSV', 'Review CSV transactions'],
  'manual.valid_rows': ['righe valide', 'valid rows'],
  'manual.new': ['nuove ·', 'new ·'],
  'manual.already_present_balance_change_from_new_transactions': [
    'già presenti. Variazione dei nuovi movimenti:',
    'already present. Balance change from new transactions:',
  ],
  'manual.the_local_account_balance_will_update_with_new_rows_only': [
    'Il saldo del conto manuale verrà aggiornato con le sole righe nuove.',
    'The manual account balance will update with new rows only.',
  ],
  'manual.the_source_balance_remains_the_balance_declared_by_its_source_the_csv_adds_': [
    'Il saldo della fonte resta quello dichiarato dalla fonte; il CSV aggiunge solo i movimenti.',
    'The source balance remains the balance declared by its source; the CSV adds transactions only.',
  ],
  'manual.import_reviewed_rows': ['Importa righe controllate', 'Import reviewed rows'],
  'manual.local_account': ['Conto manuale', 'Manual account'],
  'manual.you_have_no_local_accounts_yet_start_with_your_cash_or_wallet_balance': [
    'Non hai ancora conti manuali. Parti dal saldo dei tuoi contanti o di un portafoglio.',
    'You have no manual accounts yet. Start with your cash or wallet balance.',
  ],
  'manual.add_your_first_account': ['Aggiungi il primo conto', 'Add your first account'],
  'manual.unconnected': ['· non collegato', '· unconnected'],
  'manual.expense': ['Spesa', 'Expense'],
  'manual.income': ['Entrata', 'Income'],
  'manual.transfer': ['Trasferimento', 'Transfer'],
  'manual.optional_description': ['Descrizione facoltativa', 'Optional description'],
  'manual.transaction_date': ['Data del movimento', 'Transaction date'],
  'manual.for_an_incoming_transfer_use_a_positive_amount_for_outgoing_transfers_use_a': [
    'Per un trasferimento in entrata usa un importo positivo; in uscita usa un importo negativo. Per contanti prelevati da un tuo conto, aggiungi qui il lato in entrata. Poi controlla il collegamento in Da controllare: richiede una conferma.',
    'For an incoming transfer, use a positive amount; for outgoing transfers, use a negative amount. For cash withdrawn from your account, add the incoming side here. Then check the link in Review: it requires confirmation.',
  ],
  'manual.optional_transfer_reference': [
    'Riferimento del trasferimento facoltativo',
    'Optional transfer reference',
  ],
  'manual.save_transaction': ['Salva movimento', 'Save transaction'],
  'manual.reverse_latest_entry': ['Annulla ultimo inserimento', 'Reverse latest entry'],
  'manual.current_balance': ['Saldo corrente:', 'Current balance:'],
  'manual.enter_the_balance_you_verified_and_the_reason_the_difference_becomes_a_hist': [
    'Scrivi il saldo che hai verificato e il motivo. La differenza diventa un evento nello storico e non una spesa o un’entrata.',
    'Enter the balance you verified and the reason. The difference becomes a history event rather than spending or income.',
  ],
  'manual.correction_reason': ['Motivo della correzione', 'Correction reason'],
  'manual.cash_counted_manually': ['Contanti contati a mano', 'Cash counted manually'],
  'manual.confirm_corrected_balance': ['Conferma saldo corretto', 'Confirm corrected balance'],
  'manual.reverse_latest_correction': ['Annulla ultima correzione', 'Reverse latest correction'],
  'manual.balance_history': ['Storico del saldo', 'Balance history'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
