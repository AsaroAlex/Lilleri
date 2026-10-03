import { describe, expect, it } from 'vitest'
import {
  CANONICAL_CATEGORIES,
  CURRENT_TAXONOMY,
  canonicalCategory,
  isCanonicalCategoryCode,
  isExcludedFromSpending,
  isQuietCategory,
  operationalCategoryForCanonical,
  previewTaxonomyMigration,
  type TaxonomySnapshot,
  validateTaxonomy,
} from './taxonomy.js'

describe('canonical taxonomy', () => {
  it('has unique codes and complete labels', () => {
    const codes = CANONICAL_CATEGORIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const cat of CANONICAL_CATEGORIES) {
      expect(cat.labelIt.length).toBeGreaterThan(1)
      expect(cat.labelEn.length).toBeGreaterThan(1)
      expect(cat.code).toMatch(/^[A-Z][A-Z_]+$/)
    }
  })

  it('transfers are the only categories excluded from spending, and all of them are', () => {
    for (const cat of CANONICAL_CATEGORIES) {
      expect(isExcludedFromSpending(cat.code)).toBe(cat.flow === 'transfer')
    }
  })

  it('keeps sensitive merchant types in the quiet set (privacy-model D2)', () => {
    expect(isQuietCategory('PHARMACY')).toBe(true)
    expect(isQuietCategory('MEDICAL_EXPENSES')).toBe(true)
    expect(isQuietCategory('GIVING_DONATIONS')).toBe(true)
    expect(isQuietCategory('GIVING_MEMBERSHIPS')).toBe(true)
    expect(isQuietCategory('FOOD_GROCERIES')).toBe(false)
  })

  it('contains no label that is itself a special-category inference', () => {
    const forbidden =
      /religion|chiesa|partito|sindacat|terapia|psicolog|salute|health|union|political/i
    for (const cat of CANONICAL_CATEGORIES) {
      expect(`${cat.labelIt} ${cat.labelEn}`).not.toMatch(forbidden)
    }
  })

  it('looks up codes', () => {
    expect(isCanonicalCategoryCode('FOOD_RESTAURANTS')).toBe(true)
    expect(isCanonicalCategoryCode('NOPE')).toBe(false)
    expect(canonicalCategory('FOOD_RESTAURANTS').labelIt).toBe('Ristoranti')
  })

  it('has nonselectable parents and an existing selectable default leaf for every group', () => {
    validateTaxonomy(CURRENT_TAXONOMY)
    expect(CURRENT_TAXONOMY.parents.length).toBe(15)
    expect(CURRENT_TAXONOMY.leaves.length).toBe(72)
    expect(CURRENT_TAXONOMY.leaves.filter((leaf) => leaf.localProposal).length).toBe(21)
    for (const parent of CURRENT_TAXONOMY.parents) {
      expect(parent.selectable).toBe(false)
      expect(
        CURRENT_TAXONOMY.leaves.find((leaf) => leaf.code === parent.defaultChild),
      ).toMatchObject({ group: parent.id, selectable: true, deprecated: false })
    }
    expect(CURRENT_TAXONOMY.leaves.map((leaf) => leaf.code)).toEqual(
      CANONICAL_CATEGORIES.map((category) => category.code),
    )
  })
  it('retains immutable current labels and permits future labels only as a separate snapshot', () => {
    const references = [
      {
        referenceId: 'tx-one',
        kind: 'transaction' as const,
        canonicalCode: 'FOOD_RESTAURANTS',
        labelSnapshot: 'La mia etichetta storica',
      },
    ]
    const target: TaxonomySnapshot = {
      ...CURRENT_TAXONOMY,
      version: 'test-v2',
      leaves: CURRENT_TAXONOMY.leaves.map((leaf) =>
        leaf.code === 'FOOD_RESTAURANTS' ? { ...leaf, labelIt: 'Nuova etichetta' } : leaf,
      ),
    }
    expect(previewTaxonomyMigration(CURRENT_TAXONOMY, target, references)[0]).toMatchObject({
      labelSnapshot: 'La mia etichetta storica',
      nextLabel: 'Nuova etichetta',
      requiresChoice: false,
    })
    expect(canonicalCategory('FOOD_RESTAURANTS').labelIt).toBe('Ristoranti')
    expect(() => {
      ;(CURRENT_TAXONOMY.leaves[0] as { labelIt: string }).labelIt = 'Mutazione'
    }).toThrow()
  })
  it('a deprecated nondefault leaf uses an explicit same-flow replacement and preserves rule/feedback history', () => {
    const target: TaxonomySnapshot = {
      ...CURRENT_TAXONOMY,
      version: 'test-v2',
      leaves: CURRENT_TAXONOMY.leaves.map((leaf) =>
        leaf.code === 'FOOD_DELIVERY'
          ? { ...leaf, deprecated: true, selectable: false, replacementCode: 'FOOD_RESTAURANTS' }
          : leaf,
      ),
    }
    const references = ['rule', 'feedback', 'transaction'].map((kind) => ({
      referenceId: `ref-${kind}`,
      kind: kind as 'rule' | 'feedback' | 'transaction',
      canonicalCode: 'FOOD_DELIVERY',
      labelSnapshot: 'Consegne precedenti',
    }))
    for (const item of previewTaxonomyMigration(CURRENT_TAXONOMY, target, references))
      expect(item).toMatchObject({
        canonicalCode: 'FOOD_DELIVERY',
        nextCanonicalCode: 'FOOD_RESTAURANTS',
        labelSnapshot: 'Consegne precedenti',
        requiresChoice: false,
      })
  })
  it('rejects quiet-to-visible or expense-to-income redirects and invalid defaults', () => {
    for (const [source, target] of [
      ['GIVING_DONATIONS', 'GIVING_GIFTS'],
      ['FOOD_DELIVERY', 'INCOME_OTHER'],
    ] as const) {
      const snapshot = {
        ...CURRENT_TAXONOMY,
        version: 'test-v2',
        leaves: CURRENT_TAXONOMY.leaves.map((leaf) =>
          leaf.code === source
            ? { ...leaf, deprecated: true, selectable: false, replacementCode: target }
            : leaf,
        ),
      }
      expect(() => validateTaxonomy(snapshot)).toThrow()
    }
    expect(() =>
      validateTaxonomy({
        ...CURRENT_TAXONOMY,
        parents: CURRENT_TAXONOMY.parents.map((parent) =>
          parent.id === 'food' ? { ...parent, defaultChild: 'INCOME_OTHER' } : parent,
        ),
      }),
    ).toThrow()
  })
  it('requires a choice when a leaf is retired without a replacement; never drops references silently', () => {
    const target: TaxonomySnapshot = {
      ...CURRENT_TAXONOMY,
      version: 'test-v2',
      leaves: CURRENT_TAXONOMY.leaves.map((leaf) =>
        leaf.code === 'FOOD_DELIVERY'
          ? { ...leaf, deprecated: true, selectable: false, replacementCode: null }
          : leaf,
      ),
    }
    const reference = {
      referenceId: 'tx-one',
      kind: 'transaction' as const,
      canonicalCode: 'FOOD_DELIVERY',
      labelSnapshot: 'Storica',
    }
    expect(previewTaxonomyMigration(CURRENT_TAXONOMY, target, [reference])[0]?.requiresChoice).toBe(
      true,
    )
    expect(() =>
      previewTaxonomyMigration(CURRENT_TAXONOMY, target, [reference, reference]),
    ).toThrow()
    expect(() =>
      previewTaxonomyMigration(
        CURRENT_TAXONOMY,
        { ...target, leaves: target.leaves.filter((leaf) => leaf.code !== 'FOOD_DELIVERY') },
        [reference],
      ),
    ).toThrow()
  })
  it('projects canonical codes into stable operational IDs without turning donation privacy into a health inference', () => {
    expect(operationalCategoryForCanonical('FOOD_GROCERIES')).toBe('groceries')
    expect(operationalCategoryForCanonical('DIGITAL_STREAMING')).toBe('subscriptions')
    expect(operationalCategoryForCanonical('TRANSFER_INTERNAL')).toBe('transfer')
    expect(operationalCategoryForCanonical('GIVING_DONATIONS')).toBe('uncategorised')
    expect(() => operationalCategoryForCanonical('UNKNOWN')).toThrow()
  })
})
