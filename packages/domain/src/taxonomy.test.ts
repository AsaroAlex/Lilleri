import { describe, expect, it } from 'vitest'
import {
  CANONICAL_CATEGORIES,
  canonicalCategory,
  isCanonicalCategoryCode,
  isExcludedFromSpending,
  isQuietCategory,
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
})
