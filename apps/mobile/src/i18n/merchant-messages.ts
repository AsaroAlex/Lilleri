/** Owner decisions: explicit Italian master and British English counterpart for every control. */
export const MERCHANT_MESSAGE_PAIRS = {
  'merchant.title': ['Esercenti e categorie', 'Merchants and categories'],
  'merchant.help': [
    'I tuoi nomi e le tue categorie valgono solo per il tuo profilo. Descrizioni e importi originali restano disponibili.',
    'Your names and categories apply only to your profile. Original descriptions and amounts remain available.',
  ],
  'merchant.noTransactions': [
    'Non ci sono movimenti disponibili per queste modifiche.',
    'No transactions are available for these changes.',
  ],
  'merchant.chooseTransaction': ['Scegli il movimento', 'Choose the transaction'],
  'merchant.name': ['Nome da mostrare', 'Display name'],
  'merchant.nameHelp': [
    'Un nome personale può essere applicato ai movimenti con la stessa origine riconosciuta. Controlla prima le modifiche.',
    'A personal name can apply to transactions with the same recognised source. Review the changes first.',
  ],
  'merchant.unknown': ['Esercente non riconosciuto', 'Merchant not recognised'],
  'merchant.ambiguous': [
    'Le informazioni sull’esercente non coincidono. Non propongo un nome comune.',
    'Merchant information conflicts. I cannot suggest a shared name.',
  ],
  'merchant.unsupported': [
    'Questo testo originale non è adatto al riconoscimento. Puoi comunque scegliere una categoria.',
    'This original text is not supported for recognition. You can still choose a category.',
  ],
  'merchant.preview': ['Controlla le modifiche', 'Review changes'],
  'merchant.previewImpact': [
    '{count, plural, =0 {Nessun movimento visibile da modificare} one {# movimento visibile da modificare} other {# movimenti visibili da modificare}}',
    '{count, plural, =0 {No visible transactions to change} one {# visible transaction to change} other {# visible transactions to change}}',
  ],
  'merchant.previewPrivacy': [
    'Le preferenze di privacy restano rispettate. I movimenti riservati non sono elencati in questa verifica.',
    'Privacy preferences remain respected. Private transactions are not listed in this review.',
  ],
  'merchant.apply': ['Applica il nome', 'Apply the name'],
  'merchant.saved': ['Modifica salvata.', 'Change saved.'],
  'merchant.conflict': [
    'I dati sono cambiati. Ho aggiornato i valori: scegli di nuovo la modifica.',
    'Data changed. I refreshed the values: choose the change again.',
  ],
  'merchant.names': ['I tuoi nomi', 'Your names'],
  'merchant.archive': ['Archivia', 'Archive'],
  'merchant.archived': ['Archiviata', 'Archived'],
  'merchant.categories': ['Le tue categorie', 'Your categories'],
  'merchant.newCategory': ['Crea una categoria', 'Create a category'],
  'merchant.editCategory': ['Modifica categoria', 'Edit category'],
  'merchant.categoryName': ['Nome della categoria', 'Category name'],
  'merchant.categoryType': ['Significato della categoria', 'Category meaning'],
  'merchant.chooseGroup': ['Scegli il gruppo', 'Choose the group'],
  'merchant.parent': ['Categoria superiore', 'Parent category'],
  'merchant.noParent': ['Nessuna categoria superiore', 'No parent category'],
  'merchant.icon': ['Icona', 'Icon'],
  'merchant.position': ['Ordine nella lista', 'List position'],
  'merchant.hidden': ['Nascondi dai riepiloghi', 'Hide from summaries'],
  'merchant.hiddenHelp': [
    'La categoria e i movimenti originali restano nei tuoi dati. La scelta non rende pubblici i movimenti riservati.',
    'The category and original transactions remain in your data. This choice does not make private transactions public.',
  ],
  'merchant.assign': ['Assegna la categoria', 'Assign category'],
  'merchant.chooseCategory': ['Scegli la tua categoria', 'Choose your category'],
  'merchant.historicalLabel': [
    'Nome al momento della scelta: {label}',
    'Name when selected: {label}',
  ],
  'merchant.migrate': ['Unisci o archivia', 'Merge or archive'],
  'merchant.migrationHelp': [
    'Scegli una destinazione per spostare le assegnazioni. Le etichette storiche e le preferenze di privacy restano conservate.',
    'Choose a destination to move assignments. Historical labels and privacy preferences remain preserved.',
  ],
  'merchant.archiveOnly': ['Archivia senza destinazione', 'Archive without a destination'],
  'merchant.applyMigration': ['Conferma unione o archivio', 'Confirm merge or archive'],
  'merchant.undoHelp': [
    'Puoi annullare l’ultima modifica di categoria entro 30 giorni, se le assegnazioni non sono cambiate nel frattempo.',
    'You can undo the last category change within 30 days if assignments have not changed since.',
  ],
  'merchant.localProposal': ['Suggerimento del catalogo', 'Catalogue suggestion'],
  'merchant.noCategories': [
    'Crea una categoria per assegnarla a un movimento.',
    'Create a category to assign it to a transaction.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
