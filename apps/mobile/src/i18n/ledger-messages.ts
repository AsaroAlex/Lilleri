export const LEDGER_MESSAGE_PAIRS = {
  'ledger.historySearch': ['Cerca nello storico', 'Search transaction history'],
  'ledger.searchFields': ['Nome, descrizione o riferimento', 'Name, description or reference'],
  'ledger.allHistory': ['Tutto lo storico', 'All history'],
  'ledger.last90Days': ['Ultimi 90 giorni', 'Last 90 days'],
  'ledger.moreTransactions': ['Mostra altri movimenti', 'Show more transactions'],
  'ledger.continueSearch': ['Continua la ricerca', 'Continue searching'],
  'ledger.changed': [
    'I movimenti sono cambiati. Ripeti la ricerca.',
    'Transactions changed. Search again.',
  ],
  'ledger.allAccounts': ['Tutti i conti', 'All accounts'],
  'ledger.allCurrencies': ['Tutte le valute', 'All currencies'],
  'ledger.moreFilters': [
    'Filtra per conto, valuta e periodo',
    'Filter by account, currency and date',
  ],
  'ledger.fewerFilters': ['Nascondi filtri', 'Hide filters'],
  'ledger.fromDate': ['Dal giorno (AAAA-MM-GG)', 'From date (YYYY-MM-DD)'],
  'ledger.toDate': ['Al giorno (AAAA-MM-GG)', 'To date (YYYY-MM-DD)'],
  'ledger.windowHelp': [
    'Mostriamo i movimenti datati negli ultimi 90 giorni. Lo storico più vecchio resta disponibile in Tutto lo storico.',
    'Showing dated transactions from the last 90 days. Older records remain available in All history.',
  ],
  'ledger.offlineScope': [
    'Senza rete puoi cercare nei movimenti dell’ultimo aggiornamento salvato.',
    'Offline search covers transactions from your last saved update.',
  ],
} as const
