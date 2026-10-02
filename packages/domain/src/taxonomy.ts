/**
 * Canonical taxonomy (internal, stable codes) — separate from the user's visible categories.
 *
 * Users can rename, merge, hide or create categories freely; each user category maps to one
 * canonical code so global analytics, merchant knowledge and model training keep working.
 * Example: canonical FOOD_RESTAURANTS ↔ user category "Uscite con Chiara".
 *
 * Privacy (docs/compliance/privacy-model.md §5, decision D2): no category name or definition is a
 * special-category (GDPR Art. 9) inference. Merchant-type labels stay neutral ("Farmacia") and the
 * "quiet set" is excluded from insights, AI chat remarks, analytics and model-quality datasets.
 * The final label set needs counsel sign-off before beta (legal-open-questions Q2).
 */
export type CategoryFlow = 'expense' | 'income' | 'transfer'

export interface CanonicalCategory {
  readonly code: string
  readonly group: CanonicalGroup
  readonly flow: CategoryFlow
  /** Default Italian label shown when the user has not customised it. */
  readonly labelIt: string
  readonly labelEn: string
  /** Icon key from the Lilleri icon set (packages/brand). */
  readonly icon: string
  /** Quiet set: never used for insights, nudges, offers, analytics or training data. */
  readonly quiet?: true
  /** Movements in this category never count as spending or income (e.g. own-account moves). */
  readonly excludedFromSpending?: true
}

export type CanonicalGroup =
  | 'income'
  | 'home'
  | 'utilities'
  | 'food'
  | 'transport'
  | 'shopping'
  | 'personal'
  | 'health'
  | 'leisure'
  | 'digital'
  | 'finance'
  | 'family'
  | 'giving'
  | 'transfers'
  | 'other'

const c = (
  code: string,
  group: CanonicalGroup,
  flow: CategoryFlow,
  labelIt: string,
  labelEn: string,
  icon: string,
  extra: { quiet?: true; excludedFromSpending?: true } = {},
): CanonicalCategory => Object.freeze({ code, group, flow, labelIt, labelEn, icon, ...extra })

export const CANONICAL_CATEGORIES = [
  // Income
  c('INCOME_SALARY', 'income', 'income', 'Stipendio', 'Salary', 'briefcase'),
  c('INCOME_PENSION', 'income', 'income', 'Pensione', 'Pension', 'briefcase'),
  c('INCOME_REIMBURSEMENT', 'income', 'income', 'Rimborsi da altri', 'Reimbursements', 'arrow-in'),
  c('INCOME_INTEREST', 'income', 'income', 'Interessi', 'Interest', 'percent'),
  c('INCOME_OTHER', 'income', 'income', 'Altre entrate', 'Other income', 'arrow-in'),
  // Home
  c('HOME_RENT', 'home', 'expense', 'Affitto', 'Rent', 'home'),
  c('HOME_MORTGAGE', 'home', 'expense', 'Mutuo', 'Mortgage', 'home'),
  c('HOME_CONDO', 'home', 'expense', 'Condominio', 'Building fees', 'building'),
  c('HOME_FURNISHING', 'home', 'expense', 'Casa e arredamento', 'Home & furnishing', 'sofa'),
  c('HOME_MAINTENANCE', 'home', 'expense', 'Manutenzione casa', 'Home maintenance', 'wrench'),
  // Utilities
  c('UTILITIES_ENERGY', 'utilities', 'expense', 'Luce e gas', 'Energy', 'bolt'),
  c('UTILITIES_WATER', 'utilities', 'expense', 'Acqua', 'Water', 'drop'),
  c(
    'UTILITIES_PHONE_INTERNET',
    'utilities',
    'expense',
    'Telefono e internet',
    'Phone & internet',
    'signal',
  ),
  // Food
  c('FOOD_GROCERIES', 'food', 'expense', 'Spesa', 'Groceries', 'basket'),
  c('FOOD_RESTAURANTS', 'food', 'expense', 'Ristoranti', 'Restaurants', 'fork'),
  c('FOOD_BARS_CAFES', 'food', 'expense', 'Bar e caffè', 'Bars & cafés', 'cup'),
  c('FOOD_DELIVERY', 'food', 'expense', 'Consegne a domicilio', 'Food delivery', 'bag'),
  // Transport
  c('TRANSPORT_FUEL', 'transport', 'expense', 'Carburante', 'Fuel', 'fuel'),
  c(
    'TRANSPORT_PUBLIC',
    'transport',
    'expense',
    'Treni e mezzi pubblici',
    'Trains & public transport',
    'train',
  ),
  c(
    'TRANSPORT_TOLLS_PARKING',
    'transport',
    'expense',
    'Pedaggi e parcheggi',
    'Tolls & parking',
    'road',
  ),
  c('TRANSPORT_TAXI', 'transport', 'expense', 'Taxi e noleggi', 'Taxi & rentals', 'car'),
  c('TRANSPORT_VEHICLE', 'transport', 'expense', 'Auto e moto', 'Vehicle', 'car'),
  // Shopping
  c('SHOPPING_GENERAL', 'shopping', 'expense', 'Acquisti', 'Shopping', 'tag'),
  c('SHOPPING_CLOTHING', 'shopping', 'expense', 'Abbigliamento', 'Clothing', 'shirt'),
  c('SHOPPING_ELECTRONICS', 'shopping', 'expense', 'Elettronica', 'Electronics', 'device'),
  // Personal (neutral labels; see privacy note above)
  c('PERSONAL_CARE', 'personal', 'expense', 'Cura della persona', 'Personal care', 'sparkle'),
  // Health-related merchant types: neutral names, quiet set
  c('PHARMACY', 'health', 'expense', 'Farmacia', 'Pharmacy', 'cross', { quiet: true }),
  c('MEDICAL_EXPENSES', 'health', 'expense', 'Spese mediche', 'Medical expenses', 'cross', {
    quiet: true,
  }),
  // Leisure
  c('LEISURE_ENTERTAINMENT', 'leisure', 'expense', 'Svago', 'Entertainment', 'ticket'),
  c('LEISURE_SPORT', 'leisure', 'expense', 'Sport e palestra', 'Sport & gym', 'dumbbell'),
  c('LEISURE_TRAVEL', 'leisure', 'expense', 'Viaggi e alloggi', 'Travel & lodging', 'suitcase'),
  // Digital
  c('DIGITAL_STREAMING', 'digital', 'expense', 'Streaming e musica', 'Streaming & music', 'play'),
  c(
    'DIGITAL_SOFTWARE',
    'digital',
    'expense',
    'Software e servizi digitali',
    'Software & cloud',
    'cloud',
  ),
  // Finance
  c('FINANCE_FEES', 'finance', 'expense', 'Commissioni e canoni', 'Bank fees', 'receipt'),
  c('FINANCE_TAXES', 'finance', 'expense', 'Tasse e imposte', 'Taxes', 'stamp'),
  c('FINANCE_INSURANCE', 'finance', 'expense', 'Assicurazioni', 'Insurance', 'umbrella'),
  c('FINANCE_LOAN', 'finance', 'expense', 'Rate e finanziamenti', 'Loan repayments', 'calendar'),
  // Family
  c('FAMILY_CHILDREN', 'family', 'expense', 'Figli', 'Children', 'heart'),
  c('FAMILY_PETS', 'family', 'expense', 'Animali', 'Pets', 'paw'),
  c('FAMILY_EDUCATION', 'family', 'expense', 'Istruzione', 'Education', 'book'),
  // Giving (quiet where it could reveal beliefs or memberships)
  c('GIVING_GIFTS', 'giving', 'expense', 'Regali', 'Gifts', 'gift'),
  c('GIVING_DONATIONS', 'giving', 'expense', 'Donazioni e offerte', 'Donations', 'gift', {
    quiet: true,
  }),
  c('GIVING_MEMBERSHIPS', 'giving', 'expense', 'Quote e tessere', 'Memberships & dues', 'card', {
    quiet: true,
  }),
  c('PEOPLE_PAYMENTS', 'giving', 'expense', 'Pagamenti a persone', 'Payments to people', 'person'),
  // Transfers: never spending, never income
  c(
    'TRANSFER_INTERNAL',
    'transfers',
    'transfer',
    'Trasferimento tra tuoi conti',
    'Transfer between your accounts',
    'arrows',
    { excludedFromSpending: true },
  ),
  c(
    'TRANSFER_CARD_SETTLEMENT',
    'transfers',
    'transfer',
    'Saldo carta di credito',
    'Credit card payment',
    'card',
    { excludedFromSpending: true },
  ),
  c(
    'TRANSFER_CASH_WITHDRAWAL',
    'transfers',
    'transfer',
    'Prelievo contanti',
    'Cash withdrawal',
    'cash',
    { excludedFromSpending: true },
  ),
  c(
    'TRANSFER_WALLET_TOPUP',
    'transfers',
    'transfer',
    'Ricarica wallet',
    'Wallet top-up',
    'wallet',
    { excludedFromSpending: true },
  ),
  c(
    'TRANSFER_SAVINGS_INVESTMENTS',
    'transfers',
    'transfer',
    'Risparmi e investimenti',
    'Savings & investments',
    'seed',
    { excludedFromSpending: true },
  ),
  // Other
  c('OTHER_EXPENSE', 'other', 'expense', 'Altro', 'Other', 'dots'),
  c('UNCATEGORIZED', 'other', 'expense', 'Da classificare', 'Uncategorised', 'question'),
] as const satisfies readonly CanonicalCategory[]

export type CanonicalCategoryCode = (typeof CANONICAL_CATEGORIES)[number]['code']

const BY_CODE: ReadonlyMap<string, CanonicalCategory> = new Map(
  CANONICAL_CATEGORIES.map((cat) => [cat.code, cat]),
)

export function isCanonicalCategoryCode(code: string): code is CanonicalCategoryCode {
  return BY_CODE.has(code)
}

export function canonicalCategory(code: CanonicalCategoryCode): CanonicalCategory {
  const cat = BY_CODE.get(code)
  if (!cat) throw new Error(`Unknown canonical category ${code}`)
  return cat
}

/** True when a movement in this category must not appear in insights, nudges or datasets. */
export function isQuietCategory(code: CanonicalCategoryCode): boolean {
  return canonicalCategory(code).quiet === true
}

/** True when the category represents money moving between the user's own pockets. */
export function isExcludedFromSpending(code: CanonicalCategoryCode): boolean {
  return canonicalCategory(code).excludedFromSpending === true
}
