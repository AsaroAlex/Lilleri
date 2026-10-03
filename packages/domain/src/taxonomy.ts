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
  /** New local catalogue proposal; never an automatic migration of existing assigned records. */
  readonly localProposal?: true
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
  extra: { quiet?: true; excludedFromSpending?: true; localProposal?: true } = {},
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
  // Additive local proposals. Existing IDs/labels and assignments remain untouched.
  c('HOME_MOVING', 'home', 'expense', 'Traslochi', 'Moving services', 'home', {
    localProposal: true,
  }),
  c('HOME_CLEANING', 'home', 'expense', 'Pulizia casa', 'Home cleaning', 'home', {
    localProposal: true,
  }),
  c('HOME_GARDEN', 'home', 'expense', 'Giardino', 'Garden', 'seed', { localProposal: true }),
  c('UTILITIES_HEATING', 'utilities', 'expense', 'Riscaldamento', 'Heating', 'bolt', {
    localProposal: true,
  }),
  c('FOOD_BAKERY', 'food', 'expense', 'Panifici', 'Bakeries', 'basket', { localProposal: true }),
  c('FOOD_MARKETS', 'food', 'expense', 'Mercati alimentari', 'Food markets', 'basket', {
    localProposal: true,
  }),
  c('TRANSPORT_BICYCLE', 'transport', 'expense', 'Biciclette', 'Bicycles', 'road', {
    localProposal: true,
  }),
  c(
    'TRANSPORT_CAR_REPAIRS',
    'transport',
    'expense',
    'Riparazioni veicoli',
    'Vehicle repairs',
    'wrench',
    { localProposal: true },
  ),
  c('TRANSPORT_CAR_RENTAL', 'transport', 'expense', 'Noleggio veicoli', 'Vehicle rental', 'car', {
    localProposal: true,
  }),
  c('SHOPPING_BOOKS', 'shopping', 'expense', 'Libri', 'Books', 'book', { localProposal: true }),
  c('SHOPPING_SECONDHAND', 'shopping', 'expense', 'Seconda mano', 'Secondhand goods', 'tag', {
    localProposal: true,
  }),
  c('SHOPPING_HOUSEHOLD', 'shopping', 'expense', 'Prodotti per la casa', 'Household goods', 'bag', {
    localProposal: true,
  }),
  c('PERSONAL_HAIRDRESSER', 'personal', 'expense', 'Parrucchieri', 'Hairdressers', 'sparkle', {
    localProposal: true,
  }),
  c('PERSONAL_COSMETICS', 'personal', 'expense', 'Cosmetici', 'Cosmetics', 'sparkle', {
    localProposal: true,
  }),
  c('LEISURE_CINEMA', 'leisure', 'expense', 'Cinema', 'Cinema', 'ticket', { localProposal: true }),
  c('LEISURE_MUSEUMS', 'leisure', 'expense', 'Musei', 'Museums', 'ticket', { localProposal: true }),
  c('LEISURE_HOBBIES', 'leisure', 'expense', 'Hobby', 'Hobbies', 'sparkle', {
    localProposal: true,
  }),
  c('LEISURE_HOTELS', 'leisure', 'expense', 'Alberghi', 'Hotels', 'suitcase', {
    localProposal: true,
  }),
  c('DIGITAL_GAMES', 'digital', 'expense', 'Videogiochi', 'Video games', 'device', {
    localProposal: true,
  }),
  c('INCOME_BONUS', 'income', 'income', 'Premi e bonus', 'Bonuses', 'briefcase', {
    localProposal: true,
  }),
  c('GIVING_FLOWERS', 'giving', 'expense', 'Fiori', 'Flowers', 'gift', { localProposal: true }),
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

/** Local catalogue version: original stable codes and labels remain valid historical references. */
export const TAXONOMY_VERSION = 'canonical-taxonomy-local-v1'
export interface TaxonomyParent {
  readonly id: CanonicalGroup
  readonly labelIt: string
  readonly labelEn: string
  readonly selectable: false
  readonly defaultChild: string
}
export interface TaxonomyLeaf extends CanonicalCategory {
  readonly selectable: boolean
  readonly deprecated: boolean
  readonly replacementCode: string | null
}
export interface TaxonomySnapshot {
  readonly version: string
  readonly parents: readonly TaxonomyParent[]
  readonly leaves: readonly TaxonomyLeaf[]
}
const PARENT_LABELS: Readonly<Record<CanonicalGroup, readonly [string, string, string]>> = {
  income: ['Entrate', 'Income', 'INCOME_OTHER'],
  home: ['Casa', 'Home', 'HOME_MAINTENANCE'],
  utilities: ['Utenze', 'Utilities', 'UTILITIES_ENERGY'],
  food: ['Alimentazione', 'Food', 'FOOD_GROCERIES'],
  transport: ['Trasporti', 'Transport', 'TRANSPORT_PUBLIC'],
  shopping: ['Acquisti', 'Shopping', 'SHOPPING_GENERAL'],
  personal: ['Persona', 'Personal', 'PERSONAL_CARE'],
  health: ['Esercenti e servizi sanitari', 'Medical merchants and services', 'PHARMACY'],
  leisure: ['Tempo libero', 'Leisure', 'LEISURE_ENTERTAINMENT'],
  digital: ['Servizi digitali', 'Digital services', 'DIGITAL_SOFTWARE'],
  finance: ['Servizi finanziari', 'Financial services', 'FINANCE_FEES'],
  family: ['Famiglia', 'Family', 'FAMILY_CHILDREN'],
  giving: ['Regali e persone', 'Gifts and people', 'GIVING_GIFTS'],
  transfers: ['Trasferimenti', 'Transfers', 'TRANSFER_INTERNAL'],
  other: ['Altro', 'Other', 'OTHER_EXPENSE'],
}
export const CURRENT_TAXONOMY: TaxonomySnapshot = Object.freeze({
  version: TAXONOMY_VERSION,
  parents: Object.freeze(
    Object.entries(PARENT_LABELS).map(([id, [labelIt, labelEn, defaultChild]]) =>
      Object.freeze({
        id: id as CanonicalGroup,
        labelIt,
        labelEn,
        defaultChild,
        selectable: false as const,
      }),
    ),
  ),
  leaves: Object.freeze(
    CANONICAL_CATEGORIES.map((category) =>
      Object.freeze({ ...category, selectable: true, deprecated: false, replacementCode: null }),
    ),
  ),
})

export function validateTaxonomy(snapshot: TaxonomySnapshot): void {
  if (
    !snapshot.version ||
    snapshot.version.length > 100 ||
    snapshot.parents.length !== new Set(snapshot.parents.map((p) => p.id)).size ||
    snapshot.leaves.length !== new Set(snapshot.leaves.map((leaf) => leaf.code)).size
  )
    throw new Error('Invalid taxonomy identity')
  const leaves = new Map(snapshot.leaves.map((leaf) => [leaf.code, leaf]))
  const parents = new Map(snapshot.parents.map((parent) => [parent.id, parent]))
  for (const parent of parents.values()) {
    const child = leaves.get(parent.defaultChild)
    if (
      parent.selectable !== false ||
      !parent.labelIt ||
      !parent.labelEn ||
      !child ||
      child.group !== parent.id ||
      !child.selectable ||
      child.deprecated
    )
      throw new Error('Invalid taxonomy parent')
  }
  for (const leaf of leaves.values()) {
    if (
      !parents.has(leaf.group) ||
      !leaf.labelIt ||
      !leaf.labelEn ||
      (leaf.deprecated && leaf.selectable) ||
      (!leaf.deprecated && leaf.replacementCode !== null)
    )
      throw new Error('Invalid taxonomy leaf')
    if (leaf.replacementCode !== null) {
      const target = leaves.get(leaf.replacementCode)
      if (
        !target ||
        target.deprecated ||
        !target.selectable ||
        target.flow !== leaf.flow ||
        (leaf.quiet && !target.quiet)
      )
        throw new Error('Unsafe taxonomy replacement')
    }
  }
}

export interface TaxonomyReference {
  readonly referenceId: string
  readonly kind: 'transaction' | 'rule' | 'feedback' | 'recurring' | 'watchlist' | 'baseline'
  readonly canonicalCode: string
  /** Historical user-visible label, never replaced by a newer catalogue's label. */
  readonly labelSnapshot: string
}
export interface TaxonomyMigrationItem extends TaxonomyReference {
  readonly nextCanonicalCode: string
  readonly nextLabel: string
  readonly requiresChoice: boolean
}
export function previewTaxonomyMigration(
  source: TaxonomySnapshot,
  target: TaxonomySnapshot,
  references: readonly TaxonomyReference[],
): readonly TaxonomyMigrationItem[] {
  validateTaxonomy(source)
  validateTaxonomy(target)
  const sourceLeaves = new Map(source.leaves.map((leaf) => [leaf.code, leaf]))
  const targetLeaves = new Map(target.leaves.map((leaf) => [leaf.code, leaf]))
  if (
    new Set(references.map((reference) => `${reference.kind}:${reference.referenceId}`)).size !==
    references.length
  )
    throw new Error('Duplicate taxonomy reference')
  return references.map((reference) => {
    const old = sourceLeaves.get(reference.canonicalCode)
    const current = targetLeaves.get(reference.canonicalCode)
    if (!reference.referenceId || !reference.labelSnapshot || !old || !current)
      throw new Error('Missing historical taxonomy reference')
    const next =
      current.replacementCode === null ? current : targetLeaves.get(current.replacementCode)
    if (!next) throw new Error('Missing taxonomy replacement')
    return {
      ...reference,
      nextCanonicalCode: next.code,
      nextLabel: next.labelIt,
      requiresChoice:
        !next.selectable ||
        next.deprecated ||
        old.flow !== next.flow ||
        Boolean(old.quiet && !next.quiet),
    }
  })
}

/** Compatibility projection; existing operational category IDs never change. */
export function operationalCategoryForCanonical(
  code: string,
):
  | 'income'
  | 'groceries'
  | 'shopping'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'subscriptions'
  | 'health'
  | 'travel'
  | 'transfer'
  | 'uncategorised' {
  if (!isCanonicalCategoryCode(code)) throw new Error('Unknown canonical category')
  const category = canonicalCategory(code)
  if (category.flow === 'income') return 'income'
  if (category.flow === 'transfer') return 'transfer'
  if (category.group === 'health') return 'health'
  if (code === 'FOOD_GROCERIES') return 'groceries'
  if (category.group === 'food') return 'food'
  if (category.group === 'transport') return 'transport'
  if (category.group === 'utilities' || category.group === 'home') return 'utilities'
  if (code === 'DIGITAL_STREAMING') return 'subscriptions'
  if (code === 'LEISURE_TRAVEL') return 'travel'
  if (category.group === 'shopping' || category.group === 'personal') return 'shopping'
  return 'uncategorised'
}
export const canonicalCategoryId = operationalCategoryForCanonical

export interface OwnedCategoryValues {
  readonly label: string
  readonly canonicalCode: string
  readonly icon: string
  readonly parentId: string | null
  readonly position: number
  readonly hidden: boolean
}
export interface OwnedCategory extends OwnedCategoryValues {
  readonly id: string
  readonly profileId: string
  readonly taxonomyVersion: string
  readonly revision: number
  readonly archived: boolean
  readonly createdAt: string
  readonly updatedAt: string
}
export interface OwnedCategoryAssignment {
  readonly profileId: string
  readonly transactionId: string
  readonly categoryId: string
  readonly categoryRevision: number
  readonly canonicalCode: string
  readonly taxonomyVersion: string
  readonly labelSnapshot: string
  readonly quiet: boolean
  readonly revision: number
  readonly updatedAt: string
}
