export const FX_MESSAGE_PAIRS = {
  'fx.title': ['Importi e cambio della fonte', 'Source amounts and exchange rate'],
  'fx.original': ['Importo originale', 'Original amount'],
  'fx.billed': ['Importo addebitato', 'Billed amount'],
  'fx.ledger': ['Importo del movimento', 'Transaction amount'],
  'fx.rate': [
    'Cambio comunicato: 1 {base} = {rate} {quote}',
    'Reported exchange rate: 1 {base} = {rate} {quote}',
  ],
  'fx.rateDate': ['Data del cambio: {date}', 'Exchange rate date: {date}'],
  'fx.source': ['Fonte: {provider}', 'Source: {provider}'],
  'fx.reference': ['Riferimento: {reference}', 'Reference: {reference}'],
  'fx.unknown': [
    'La fonte non ha comunicato gli importi e il cambio. Il dato resta sconosciuto.',
    'The source has not provided the amounts and exchange rate. The evidence remains unknown.',
  ],
  'fx.partial': [
    'La fonte ha comunicato solo una parte dei dati. Le informazioni mancanti restano sconosciute.',
    'The source provided only part of the evidence. Missing information remains unknown.',
  ],
  'fx.complete': [
    'Importi, cambio, data e riferimento comunicati dalla fonte.',
    'Amounts, rate, date and reference provided by the source.',
  ],
  'fx.conflict': [
    'Le informazioni della fonte non coincidono tra loro o con il movimento. Controlla la fonte prima di usarle.',
    'The source evidence conflicts with itself or the transaction. Check the source before using it.',
  ],
  'fx.unchanged': [
    'Questi dati documentano il cambio. L’importo del movimento e i totali in ciascuna valuta restano invariati.',
    'This evidence documents the exchange rate. The transaction amount and totals in each currency remain unchanged.',
  ],
  'fx.history': ['Versioni precedenti della fonte', 'Earlier source versions'],
  'fx.version': [
    'Versione {revision}, osservata il {date}',
    'Version {revision}, observed on {date}',
  ],
  'fx.more': ['Mostra altre versioni', 'Show more versions'],
  'fx.missing': ['Non comunicato', 'Not provided'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
