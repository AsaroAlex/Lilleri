export const SOURCE_DECISION_MESSAGE_PAIRS = {
  'source.title': ['Aggiornamenti dalla banca', 'Bank updates'],
  'source.empty': [
    'Nessun aggiornamento della fonte da controllare.',
    'No source updates to review.',
  ],
  'source.removed': [
    'La fonte non restituisce più questo movimento',
    'The source no longer returns this transaction',
  ],
  'source.removedHelp': [
    'Scegli se conservarlo nei conteggi come registrazione manuale o escluderlo. Puoi annullare la decisione.',
    'Choose whether to keep it in totals as a manual record or exclude it. You can undo the decision.',
  ],
  'source.keep': ['Conserva come manuale', 'Keep as manual'],
  'source.remove': ['Escludi dai conteggi', 'Exclude from totals'],
  'source.confirmRemove': ['Conferma esclusione', 'Confirm exclusion'],
  'source.confirmHelp': [
    'Il movimento sarà escluso dai conteggi. La traccia della fonte e le tue correzioni restano disponibili.',
    'The transaction will be excluded from totals. The source record and your corrections remain available.',
  ],
  'source.kept': ['Conservato nei conteggi come manuale', 'Kept in totals as manual'],
  'source.excluded': ['Escluso dai conteggi', 'Excluded from totals'],
  'source.firstSeen': ['In sospeso dal {date}', 'Pending since {date}'],
  'source.active': ['Ancora in sospeso', 'Still pending'],
  'source.replaced': [
    'Sostituito dal movimento contabilizzato',
    'Replaced by the booked transaction',
  ],
  'source.expired': ['Scadenza comunicata dalla fonte', 'Expiry reported by the source'],
  'source.cancelled': [
    'Annullamento comunicato dalla fonte',
    'Cancellation reported by the source',
  ],
  'source.reversed': ['Storno comunicato dalla fonte', 'Reversal reported by the source'],
  'source.changed': [
    'Importo cambiato: da {pending} a {booked}',
    'Amount changed: from {pending} to {booked}',
  ],
  'source.changedHelp': [
    'La fonte collega i due movimenti. Conferma la sostituzione dopo aver confrontato gli importi.',
    'The source links both transactions. Confirm the replacement after comparing the amounts.',
  ],
  'source.accept': ['Conferma sostituzione', 'Confirm replacement'],
  'source.carried': [
    'Le correzioni compatibili sono state conservate.',
    'Compatible corrections have been preserved.',
  ],
  'source.saved': ['Decisione salvata.', 'Decision saved.'],
  'source.stale': [
    'La fonte è cambiata. L’elenco è stato aggiornato: controlla di nuovo e ripeti la scelta.',
    'The source changed. The list has been refreshed: review it again and repeat your choice.',
  ],
  'source.more': ['Mostra altri aggiornamenti', 'Show more updates'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
