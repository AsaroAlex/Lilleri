/** CSV/XLSX importer: Italian master and British English messages. */
export const MAPPED_IMPORT_MESSAGE_PAIRS = {
  'mapped.xlsxTitle': ['Importa Excel con associazioni', 'Import Excel with mappings'],
  'mapped.issueRow': ['Riga {row}{field}: {message}', 'Row {row}{field}: {message}'],
  'mapped.headersRead': [
    '{headers} intestazioni e {rows} righe lette. Associa le colonne prima dell’anteprima.',
    '{headers} headers and {rows} rows read. Map the columns before previewing.',
  ],
  'mapped.importResult': [
    '{inserted, plural, one {# nuovo movimento} other {# nuovi movimenti}}, {updated, plural, one {# aggiornato} other {# aggiornati}}, {unchanged, plural, one {# già presente} other {# già presenti}}{rejected, plural, =0 {} one {; # non acquisito} other {; # non acquisiti}}. Controlla il saldo e lo storico del conto.',
    '{inserted, plural, one {# new transaction} other {# new transactions}}, {updated} updated, {unchanged} already present{rejected, plural, =0 {} one {; # not acquired} other {; # not acquired}}. Review the account balance and history.',
  ],
  'mapped.accountChoice': [
    'Conto per importazione: {name}, {currency}',
    'Account for import: {name}, {currency}',
  ],
  'mapped.selectedFile': ['File selezionato: {name}', 'Selected file: {name}'],
  'mapped.useMapping': ['Usa {name}', 'Use {name}'],
  'mapped.mappingAction': ['{action} {name}', '{action} {name}'],
  'mapped.statusAlias': [
    'Valore dello stato {status}, {index}',
    'Source value for status {status}, {index}',
  ],
  'mapped.addStatus': ['Associa stato {status}', 'Map status {status}'],
  'mapped.layoutSummary': [
    '{rows} righe · intestazioni: {headers}',
    '{rows} rows · headers: {headers}',
  ],
  'mapped.previewSummary': [
    'Conto: {name} · {rows} righe nel file, {valid} righe valide. Non è stato importato nulla.',
    'Account: {name} · {rows} rows in the file, {valid} valid rows. Nothing has been imported.',
  ],
  'mapped.previewRow': ['Riga {row} · {date} · {amount}', 'Row {row} · {date} · {amount}'],
  'mapped.valueDateOriginal': [
    'Data valuta: {date} · originale: {original}',
    'Value date: {date} · original: {original}',
  ],
  'mapped.duplicateRows': [
    'Righe uguali da controllare: {rows}',
    'Identical rows to review: {rows}',
  ],
  'mapped.duplicateRow': [
    'Riga {row}: {date} · {amount} · {description}',
    'Row {row}: {date} · {amount} · {description}',
  ],
  'mapped.booking_date': ['Data di contabilizzazione', 'Booking date'],
  'mapped.description': ['Descrizione', 'Description'],
  'mapped.signed_amount': ['Importo con segno', 'Signed amount'],
  'mapped.outgoings': ['Uscite', 'Outgoings'],
  'mapped.incoming_amounts': ['Entrate', 'Incoming amounts'],
  'mapped.currency': ['Valuta', 'Currency'],
  'mapped.source_identifier': ['Identificatore della fonte', 'Source identifier'],
  'mapped.value_date': ['Data valuta', 'Value date'],
  'mapped.merchant': ['Esercente', 'Merchant'],
  'mapped.reference': ['Riferimento', 'Reference'],
  'mapped.status': ['Stato', 'Status'],
  'mapped.the_excel_file_is_not_a_valid_xlsx_archive': [
    'Il file Excel non è un archivio XLSX valido.',
    'The Excel file is not a valid XLSX archive.',
  ],
  'mapped.the_excel_file_exceeds_the_size_worksheet_or_cell_limits': [
    'Il file Excel supera i limiti di dimensione, fogli o celle.',
    'The Excel file exceeds the size, worksheet or cell limits.',
  ],
  'mapped.the_file_contains_unsupported_excel_content_use_a_simple_worksheet_without_': [
    'Il file contiene contenuti Excel non supportati. Usa un foglio semplice senza collegamenti o macro.',
    'The file contains unsupported Excel content. Use a simple worksheet without links or macros.',
  ],
  'mapped.the_excel_file_content_is_invalid': [
    'Il contenuto del file Excel non è valido.',
    'The Excel file content is invalid.',
  ],
  'mapped.excel_formulas_are_not_imported_export_the_cells_as_values_before_continuin': [
    'Le formule Excel non sono importate. Esporta le celle come valori prima di continuare.',
    'Excel formulas are not imported. Export the cells as values before continuing.',
  ],
  'mapped.merged_cells_make_columns_ambiguous_unmerge_the_cells_before_importing': [
    'Le celle unite rendono le colonne ambigue. Separa le celle prima di importare.',
    'Merged cells make columns ambiguous. Unmerge the cells before importing.',
  ],
  'mapped.choose_the_worksheet_to_import': [
    'Scegli il foglio da importare.',
    'Choose the worksheet to import.',
  ],
  'mapped.enter_the_header_row_from_1_to_100': [
    'Indica la riga delle intestazioni, da 1 a 100.',
    'Enter the header row, from 1 to 100.',
  ],
  'mapped.use_dates_stored_as_text_in_the_excel_worksheet_in_the_format_selected_belo': [
    'Usa date scritte come testo nel foglio Excel, nel formato scelto qui sotto.',
    'Use dates stored as text in the Excel worksheet, in the format selected below.',
  ],
  'mapped.a_numeric_cell_uses_an_unsupported_format_use_decimal_numbers_without_expon': [
    'Una cella numerica usa un formato non supportato. Usa numeri decimali senza esponenti.',
    'A numeric cell uses an unsupported format. Use decimal numbers without exponents.',
  ],
  'mapped.an_excel_cell_contains_an_unsupported_type': [
    'Una cella Excel contiene un tipo non supportato.',
    'An Excel cell contains an unsupported type.',
  ],
  'mapped.the_file_exceeds_the_256_kib_limit': [
    'Il file supera il limite di 256 KiB.',
    'The file exceeds the 256 KiB limit.',
  ],
  'mapped.the_file_exceeds_the_1_000_row_limit': [
    'Il file supera il limite di 1.000 righe.',
    'The file exceeds the 1,000-row limit.',
  ],
  'mapped.the_file_contains_too_many_columns': [
    'Il file contiene troppe colonne.',
    'The file contains too many columns.',
  ],
  'mapped.the_file_contains_unsupported_characters_use_a_utf_8_csv': [
    'Il file contiene caratteri non ammessi. Usa un CSV UTF-8.',
    'The file contains unsupported characters. Use a UTF-8 CSV.',
  ],
  'mapped.invalid_quotes_or_separators_in_the_csv': [
    'Virgolette o separatori non validi nel CSV.',
    'Invalid quotes or separators in the CSV.',
  ],
  'mapped.headers_must_be_distinct_and_non_empty': [
    'Le intestazioni devono essere distinte e non vuote.',
    'Headers must be distinct and non-empty.',
  ],
  'mapped.the_file_contains_no_rows_to_import': [
    'Il file non contiene righe da importare.',
    'The file contains no rows to import.',
  ],
  'mapped.a_mapped_column_is_missing_from_the_file': [
    'Una colonna associata non è presente nel file.',
    'A mapped column is missing from the file.',
  ],
  'mapped.the_cell_count_does_not_match_the_headers': [
    'Il numero di celle non corrisponde alle intestazioni.',
    'The cell count does not match the headers.',
  ],
  'mapped.check_the_mappings_formats_and_currency': [
    'Controlla le associazioni, i formati e la valuta.',
    'Check the mappings, formats and currency.',
  ],
  'mapped.the_selected_account_is_unavailable': [
    'Il conto scelto non è disponibile.',
    'The selected account is unavailable.',
  ],
  'mapped.the_file_currency_must_match_the_selected_account_currency': [
    'La valuta del file deve corrispondere alla valuta del conto scelto.',
    'The file currency must match the selected account currency.',
  ],
  'mapped.invalid_source_identifier': [
    'Identificatore della fonte non valido.',
    'Invalid source identifier.',
  ],
  'mapped.the_source_identifier_is_repeated_correct_the_file': [
    'L’identificatore della fonte è ripetuto: correggi il file.',
    'The source identifier is repeated: correct the file.',
  ],
  'mapped.invalid_date_for_the_selected_format': [
    'Data non valida per il formato scelto.',
    'Invalid date for the selected format.',
  ],
  'mapped.the_currency_is_invalid_for_this_transaction': [
    'La valuta non è valida per questo movimento.',
    'The currency is invalid for this transaction.',
  ],
  'mapped.the_amount_is_invalid_for_the_selected_number_format': [
    'L’importo non è valido per il formato numerico scelto.',
    'The amount is invalid for the selected number format.',
  ],
  'mapped.the_amount_exceeds_the_supported_limit': [
    'L’importo supera il limite supportato.',
    'The amount exceeds the supported limit.',
  ],
  'mapped.outgoing_and_incoming_columns_must_specify_one_amount_per_row': [
    'Uscita ed entrata devono indicare un solo importo per riga.',
    'Outgoing and incoming columns must specify one amount per row.',
  ],
  'mapped.the_description_must_be_present_and_valid': [
    'La descrizione deve essere presente e valida.',
    'The description must be present and valid.',
  ],
  'mapped.a_text_field_contains_unsupported_characters': [
    'Un campo di testo contiene caratteri non ammessi.',
    'A text field contains unsupported characters.',
  ],
  'mapped.the_status_value_does_not_match_the_selected_mappings': [
    'Il valore dello stato non corrisponde alle associazioni scelte.',
    'The status value does not match the selected mappings.',
  ],
  'mapped.review_the_identical_rows_and_choose_whether_to_keep_all_of_them': [
    'Controlla le righe uguali e scegli se mantenerle tutte.',
    'Review the identical rows and choose whether to keep all of them.',
  ],
  'mapped.source_identifiers_are_missing_identity_depends_on_file_content_a_different': [
    'Il file non contiene un codice univoco per ogni movimento. Confrontiamo il contenuto e la posizione delle righe: se cambi il file, controlla di nuovo i possibili duplicati.',
    'The file has no unique code for each transaction. We compare row content and position: if you change the file, review possible duplicates again.',
  ],
  'mapped.a_formula_like_cell_will_be_retained_as_text_without_being_evaluated': [
    'Una cella simile a una formula sarà conservata come testo, senza eseguirla.',
    'A formula-like cell will be retained as text without being evaluated.',
  ],
  'mapped.the_value_date_is_retained_separately_and_does_not_replace_the_booking_date': [
    'La data valuta è conservata separatamente e non sostituisce la data di contabilizzazione.',
    'The value date is retained separately and does not replace the booking date.',
  ],
  'mapped.day_month_year_04_10_2026': [
    'Giorno/mese/anno · 04/10/2026',
    'Day/month/year · 04/10/2026',
  ],
  'mapped.year_month_day_2026_10_04': [
    'Anno-mese-giorno · 2026-10-04',
    'Year-month-day · 2026-10-04',
  ],
  'mapped.written_italian_date_4_ottobre_2026': [
    'Data italiana estesa · 4 ottobre 2026',
    'Written Italian date · 4 ottobre 2026',
  ],
  'mapped.booked': ['Contabilizzato', 'Booked'],
  'mapped.pending': ['In attesa', 'Pending'],
  'mapped.reversed': ['Stornato', 'Reversed'],
  'mapped.the_format_needs_review_no_rows_have_been_imported': [
    'Il formato richiede una verifica. Nessuna riga è stata importata.',
    'The format needs review. No rows have been imported.',
  ],
  'mapped.the_received_mappings_do_not_match_the_current_profile': [
    'Le associazioni ricevute non corrispondono al profilo corrente.',
    'The received mappings do not match the current profile.',
  ],
  'mapped.saved_mappings_are_unavailable': [
    'Le associazioni salvate non sono disponibili.',
    'Saved mappings are unavailable.',
  ],
  'mapped.the_account_transactions_or_mappings_changed_review_the_data_and_show_a_new': [
    'Il conto, i movimenti o le associazioni sono cambiati. Controlla i dati e mostra una nuova anteprima; l’importazione non viene ripetuta automaticamente.',
    'The account, transactions or mappings changed. Review the data and show a new preview; the import is not automatically repeated.',
  ],
  'mapped.the_change_was_saved_but_i_could_not_refresh_the_data_refresh_before_contin': [
    'La modifica è stata salvata, ma non riesco ad aggiornare i dati. Ricarica prima di continuare.',
    'The change was saved, but I could not refresh the data. Refresh before continuing.',
  ],
  'mapped.the_request_is_unconfirmed_for_an_uncertain_import_retry_with_the_same_prev': [
    'Non sappiamo ancora se l’importazione è stata completata. Riprova dalla stessa anteprima per evitare un doppio inserimento.',
    'We cannot yet confirm whether the import finished. Retry from the same preview to avoid importing it twice.',
  ],
  'mapped.choose_an_account_and_add_the_file_to_import': [
    'Scegli un conto e aggiungi il file da importare.',
    'Choose an account and add the file to import.',
  ],
  'mapped.choose_the_excel_worksheet_and_enter_the_header_row_from_1_to_100': [
    'Scegli il foglio Excel e indica la riga delle intestazioni, da 1 a 100.',
    'Choose the Excel worksheet and enter the header row, from 1 to 100.',
  ],
  'mapped.map_booking_date_description_and_amount_or_outgoing_and_incoming_amounts': [
    'Associa data di contabilizzazione, descrizione e importo, oppure uscite e entrate.',
    'Map booking date, description and amount, or outgoing and incoming amounts.',
  ],
  'mapped.each_column_can_be_mapped_to_only_one_field': [
    'Ogni colonna può essere associata a un solo campo.',
    'Each column can be mapped to only one field.',
  ],
  'mapped.choose_the_currency_column_or_a_fixed_currency': [
    'Scegli la colonna della valuta oppure una valuta fissa.',
    'Choose the currency column or a fixed currency.',
  ],
  'mapped.written_italian_dates_require_the_italian_format': [
    'Le date italiane estese richiedono il formato italiano.',
    'Written Italian dates require the Italian format.',
  ],
  'mapped.map_distinct_non_empty_status_values': [
    'Associa valori dello stato distinti e non vuoti.',
    'Map distinct, non-empty status values.',
  ],
  'mapped.choose_a_worksheet_and_enter_the_header_row_no_worksheet_is_selected_automa': [
    'Scegli un foglio e indica la riga delle intestazioni. Nessun foglio è scelto automaticamente.',
    'Choose a worksheet and enter the header row. No worksheet is selected automatically.',
  ],
  'mapped.show_a_valid_preview_and_review_repeated_rows_before_importing': [
    'Mostra un’anteprima valida e controlla le righe ripetute prima di importare.',
    'Show a valid preview and review repeated rows before importing.',
  ],
  'mapped.enter_a_name_for_the_mappings_to_save': [
    'Scrivi un nome per le associazioni da salvare.',
    'Enter a name for the mappings to save.',
  ],
  'mapped.mappings_saved_for_this_account_prepare_a_new_preview_before_importing': [
    'Associazioni salvate per questo conto. Prepara una nuova anteprima prima di importare.',
    'Mappings saved for this account. Prepare a new preview before importing.',
  ],
  'mapped.mappings_restored_select_them_and_show_a_new_preview': [
    'Associazioni ripristinate. Sceglile e mostra una nuova anteprima.',
    'Mappings restored. Select them and show a new preview.',
  ],
  'mapped.mappings_archived_previously_imported_transactions_are_retained': [
    'Associazioni archiviate. I movimenti già importati sono conservati.',
    'Mappings archived. Previously imported transactions are retained.',
  ],
  'mapped.the_excel_file_exceeds_the_512_kib_limit': [
    'Il file Excel supera il limite di 512 KiB.',
    'The Excel file exceeds the 512 KiB limit.',
  ],
  'mapped.i_could_not_read_the_selected_file': [
    'Non riesco a leggere il file scelto.',
    'I could not read the selected file.',
  ],
  'mapped.optional': [' · facoltativo', ' · optional'],
  'mapped.select_column': ['Seleziona colonna', 'Select column'],
  'mapped.none': ['Nessuna', 'None'],
  'mapped.loading_current_account': ['Caricamento del conto corrente', 'Loading current account'],
  'mapped.import_csv_with_mappings': [
    'Importa movimenti da file',
    'Import transactions from a file',
  ],
  'mapped.choose_the_account_read_the_headers_and_map_the_columns_a_manual_account_ba': [
    'Scegli il conto e il file, indica quali colonne contengono data, descrizione e importo, poi controlla l’anteprima. I nuovi movimenti aggiornano il saldo dei conti manuali; il saldo dei conti collegati resta quello comunicato dalla fonte.',
    'Choose an account and file, identify the date, description and amount columns, then review the preview. New transactions update manual account balances; connected accounts keep the balance reported by the source.',
  ],
  'mapped.1_account_and_file': ['1. Conto e file', '1. Account and file'],
  'mapped.add_a_manual_account_before_importing_a_file': [
    'Aggiungi un conto a mano prima di importare un file.',
    'Add a manual account before importing a file.',
  ],
  'mapped.file_format': ['Formato del file', 'File format'],
  'mapped.excel_xlsx': ['Excel XLSX', 'Excel XLSX'],
  'mapped.utf_8_csv_content_maximum_256_kib_and_1_000_rows': [
    'Contenuto del CSV UTF-8 · massimo 256 KiB e 1.000 righe',
    'UTF-8 CSV content · maximum 256 KiB and 1,000 rows',
  ],
  'mapped.csv_to_map': ['CSV da associare', 'CSV to map'],
  'mapped.paste_file_headers_and_rows': [
    'Incolla intestazioni e righe del file',
    'Paste file headers and rows',
  ],
  'mapped.excel_xlsx_maximum_512_kib_8_worksheets_and_1_000_transactions_choose_a_sim': [
    'Excel XLSX · massimo 512 KiB, 8 fogli e 1.000 movimenti. Scegli un foglio semplice, con date scritte come testo e valori già calcolati. Il file originale viene usato per questa importazione e non viene conservato.',
    'Excel XLSX · maximum 512 KiB, 8 worksheets and 1,000 transactions. Choose a simple worksheet with text dates and already calculated values. The original file is used for this import and is not retained.',
  ],
  'mapped.choose_excel_xlsx_file': ['Scegli file Excel XLSX', 'Choose Excel XLSX file'],
  'mapped.choose_csv_file': ['Scegli file CSV', 'Choose CSV file'],
  'mapped.selected_file': ['File selezionato:', 'Selected file:'],
  'mapped.read_excel_worksheets': ['Leggi fogli Excel', 'Read Excel worksheets'],
  'mapped.excel_worksheet': ['Foglio Excel', 'Excel worksheet'],
  'mapped.worksheet_header_row_from_1_to_100': [
    'Riga delle intestazioni nel foglio, da 1 a 100',
    'Worksheet header row, from 1 to 100',
  ],
  'mapped.excel_header_row': ['Riga delle intestazioni Excel', 'Excel header row'],
  'mapped.enter_the_row_number': ['Indica il numero della riga', 'Enter the row number'],
  'mapped.separator': ['Separatore', 'Separator'],
  'mapped.semicolon': ['Punto e virgola', 'Semicolon'],
  'mapped.comma': ['Virgola', 'Comma'],
  'mapped.tab': ['Tabulazione', 'Tab'],
  'mapped.read_excel_headers': ['Leggi intestazioni Excel', 'Read Excel headers'],
  'mapped.read_csv_headers': ['Leggi intestazioni CSV', 'Read CSV headers'],
  'mapped.saved_mappings_for_your_accounts': [
    'Associazioni salvate per i tuoi conti',
    'Saved mappings for your accounts',
  ],
  'mapped.show_archived_mappings': ['Mostra associazioni archiviate', 'Show archived mappings'],
  'mapped.account_unavailable': ['Conto non disponibile', 'Account unavailable'],
  'mapped.archived': [' · archiviate', ' · archived'],
  'mapped.restore': ['Ripristina', 'Restore'],
  'mapped.archive': ['Archivia', 'Archive'],
  'mapped.no_saved_mappings_prepare_the_columns_below_and_give_the_format_a_name': [
    'Nessuna associazione salvata. Prepara le colonne qui sotto e dai un nome al formato.',
    'No saved mappings. Prepare the columns below and give the format a name.',
  ],
  'mapped.2_map_the_columns': ['2. Associa le colonne', '2. Map the columns'],
  'mapped.rows_headers': ['righe · intestazioni:', 'rows · headers:'],
  'mapped.amount_columns': ['Colonne degli importi', 'Amount columns'],
  'mapped.one_signed_amount': ['Un importo con segno', 'One signed amount'],
  'mapped.separate_outgoing_and_incoming_amounts': [
    'Uscite e entrate separate',
    'Separate outgoing and incoming amounts',
  ],
  'mapped.number_format': ['Formato numerico', 'Number format'],
  'mapped.italian_1_234_56': ['Italiano · 1.234,56', 'Italian · 1.234,56'],
  'mapped.english_1_234_56': ['Inglese · 1,234.56', 'English · 1,234.56'],
  'mapped.booking_date_format': ['Formato della data di contabilizzazione', 'Booking date format'],
  'mapped.currency_source': ['Origine della valuta', 'Currency source'],
  'mapped.fixed_currency_for_the_file': ['Valuta fissa per il file', 'Fixed currency for the file'],
  'mapped.a_currency_column': ['Una colonna della valuta', 'A currency column'],
  'mapped.fixed_currency': ['Valuta fissa', 'Fixed currency'],
  'mapped.fixed_csv_currency': ['Valuta fissa del CSV', 'Fixed CSV currency'],
  'mapped.value_date_format': ['Formato della data valuta', 'Value date format'],
  'mapped.values_are_exact_and_case_sensitive': [
    'I valori sono esatti e distinguono maiuscole e minuscole.',
    'Values are exact and case-sensitive.',
  ],
  'mapped.value_in_the_file': ['· valore nel file', '· value in the file'],
  'mapped.without_a_status_column_rows_are_treated_as_booked': [
    'Senza una colonna Stato, le righe sono trattate come contabilizzate.',
    'Without a Status column, rows are treated as booked.',
  ],
  'mapped.mapping_name_for_this_account': [
    'Nome delle associazioni per questo conto',
    'Mapping name for this account',
  ],
  'mapped.csv_mapping_name': ['Nome delle associazioni CSV', 'CSV mapping name'],
  'mapped.for_example_my_account_export': [
    'Per esempio: esportazione del mio conto',
    'For example: my account export',
  ],
  'mapped.save_mapping_changes': ['Salva modifiche alle associazioni', 'Save mapping changes'],
  'mapped.save_csv_mappings': ['Salva associazioni CSV', 'Save CSV mappings'],
  'mapped.show_import_preview': ['Mostra anteprima importazione', 'Show import preview'],
  'mapped.correct_the_file_or_mappings': [
    'Correggi il file o le associazioni',
    'Correct the file or mappings',
  ],
  'mapped.no_rows_are_imported_while_errors_remain': [
    'Nessuna riga viene importata finché restano errori.',
    'No rows are imported while errors remain.',
  ],
  'mapped.3_review_the_preview': ['3. Controlla l’anteprima', '3. Review the preview'],
  'mapped.account': ['Conto:', 'Account:'],
  'mapped.unavailable': ['Non disponibile', 'Unavailable'],
  'mapped.rows_in_the_file': ['righe nel file,', 'rows in the file,'],
  'mapped.valid_rows_nothing_has_been_imported': [
    'righe valide. Non è stato importato nulla.',
    'valid rows. Nothing has been imported.',
  ],
  'mapped.row': ['Riga', 'Row'],
  'mapped.value_date_full': ['Data valuta:', 'Value date:'],
  'mapped.original': ['· originale:', '· original:'],
  'mapped.identity': ['Come riconosciamo questa riga:', 'How we identify this row:'],
  'mapped.source_identifier_full': [
    'codice del movimento nel file',
    'transaction code in the file',
  ],
  'mapped.file_content_and_repetition_position': [
    'contenuto della riga e posizione nel file',
    'row content and position in the file',
  ],
  'mapped.show_more_preview_rows': ['Mostra altre righe dell’anteprima', 'Show more preview rows'],
  'mapped.identical_rows_to_review': ['Righe uguali da controllare:', 'Identical rows to review:'],
  'mapped.these_may_be_separate_purchases_all_will_remain_present_if_you_confirm_them': [
    'Possono essere acquisti distinti. Rimarranno tutte presenti se le confermi.',
    'These may be separate purchases. All will remain present if you confirm them.',
  ],
  'mapped.i_reviewed_the_identical_rows_and_want_to_keep_all_of_them': [
    'Ho controllato le righe uguali e voglio mantenerle tutte',
    'I reviewed the identical rows and want to keep all of them',
  ],
  'mapped.i_reviewed_the_identical_rows_and_want_to_keep_all_of_them_full': [
    'Ho controllato le righe uguali e voglio mantenerle tutte.',
    'I reviewed the identical rows and want to keep all of them.',
  ],
  'mapped.import_preview_rows': ['Importa righe dell’anteprima', 'Import preview rows'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
