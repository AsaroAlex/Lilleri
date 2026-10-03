import { describe, expect, it } from 'vitest'
import {
  type ClassificationEvaluationRow,
  evaluateClassifications,
  evaluateReconciliation,
  evaluationRate,
} from './evaluation.js'

const row = (
  id: string,
  expected: ClassificationEvaluationRow['expected'],
  categoryId: ClassificationEvaluationRow['actual']['categoryId'],
  needsReview = false,
): ClassificationEvaluationRow => ({
  id,
  stratum: 'original-synthetic',
  expected,
  actual: { categoryId, needsReview, source: needsReview ? 'review' : 'global' },
})

describe('sample-bound evaluation with explicit annotations', () => {
  it('counts mislabelling and abstention rather than treating only answered rows as accuracy', () => {
    const result = evaluateClassifications([
      row('correct', { categoryId: 'groceries', needsReview: false }, 'groceries'),
      row('wrong', { categoryId: 'groceries', needsReview: false }, 'shopping'),
      row('missed', { categoryId: 'shopping', needsReview: false }, 'uncategorised', true),
      row('undecidable', { categoryId: null, needsReview: true }, 'uncategorised', true),
      row('unsafe', { categoryId: null, needsReview: true }, 'shopping'),
    ])
    expect(result.assignedCategoryAccuracy).toEqual({ numerator: 1, denominator: 3, value: 1 / 3 })
    expect(result.observedAutoReleaseError).toEqual({ numerator: 2, denominator: 3, value: 2 / 3 })
    expect(result.reviewRate).toEqual({ numerator: 2, denominator: 5, value: 0.4 })
    expect(result.undecidableAbstentionAgreement).toEqual({
      numerator: 1,
      denominator: 2,
      value: 0.5,
    })
    expect(result.perCategory.find((item) => item.categoryId === 'groceries')).toMatchObject({
      truePositive: 1,
      falsePositive: 0,
      falseNegative: 1,
      precision: { numerator: 1, denominator: 1, value: 1 },
      recall: { numerator: 1, denominator: 2, value: 0.5 },
      f1: { numerator: 2, denominator: 3, value: 2 / 3 },
    })
    expect(result.perCategory.find((item) => item.categoryId === 'shopping')).toMatchObject({
      truePositive: 0,
      falsePositive: 2,
      falseNegative: 1,
      f1: { numerator: 0, denominator: 3, value: 0 },
    })
    expect(result.confusion.reduce((sum, cell) => sum + cell.count, 0)).toBe(5)
    expect(
      result.confusion.find((cell) => cell.expected === 'shopping' && cell.predicted === null),
    ).toMatchObject({ count: 1 })
  })

  it('does not invent truth from unlabelled automatic output', () => {
    const result = evaluateClassifications([row('unlabelled', null, 'income')])
    expect(result.unlabelledAutoReleased).toBe(1)
    expect(result.observedAutoReleaseError).toEqual({ numerator: 0, denominator: 0, value: null })
    expect(result.assignedCategoryAccuracy.value).toBeNull()
    expect(result.annotationAgreement.value).toBeNull()
    expect(result.confusion.every((cell) => cell.count === 0)).toBe(true)
    expect(result.autoRate.value).toBe(1)
  })

  it('keeps empty and absent-category denominators undefined', () => {
    const empty = evaluateClassifications([])
    expect(empty.reviewRate.value).toBeNull()
    expect(empty.observedAutoReleaseError.value).toBeNull()
    expect(empty.perCategory.every((item) => item.f1.value === null)).toBe(true)
    const onlyGroceries = evaluateClassifications([
      row('g', { categoryId: 'groceries', needsReview: false }, 'groceries'),
    ])
    expect(
      onlyGroceries.perCategory.find((item) => item.categoryId === 'travel')?.precision.value,
    ).toBeNull()
    expect(
      onlyGroceries.perCategory.find((item) => item.categoryId === 'travel')?.recall.value,
    ).toBeNull()
  })

  it('separates conflict review routing from an automatic category assignment', () => {
    const result = evaluateClassifications([
      {
        ...row('conflict', { categoryId: 'groceries', needsReview: true }, 'groceries', true),
        actual: { categoryId: 'groceries', needsReview: true, source: 'rule' },
      },
    ])
    expect(result.annotationAgreement.value).toBe(1)
    expect(result.assignedCategoryAccuracy.value).toBe(0)
    expect(result.autoRate.value).toBe(0)
    expect(result.abstentionRate.value).toBe(1)
    expect(result.perTier.rule?.observedAutoReleaseError.value).toBeNull()
  })

  it('reports tier and stratum denominators without averaging dissimilar row counts', () => {
    const result = evaluateClassifications([
      row('g1', { categoryId: 'groceries', needsReview: false }, 'groceries'),
      row('g2', { categoryId: 'groceries', needsReview: false }, 'shopping'),
      {
        ...row('u', { categoryId: null, needsReview: true }, 'uncategorised', true),
        stratum: 'unknown',
      },
    ])
    expect(result.perTier.global?.observedAutoReleaseError).toEqual({
      numerator: 1,
      denominator: 2,
      value: 0.5,
    })
    expect(result.perTier.review?.observedAutoReleaseError.value).toBeNull()
    expect(result.perStratum.unknown?.rows).toBe(1)
    expect(result.observedAutoReleaseError.denominator).toBe(2)
  })

  it('rejects duplicate identity, malformed annotations and quiet quality dimensions', () => {
    const valid = row('g', { categoryId: 'groceries', needsReview: false }, 'groceries')
    expect(() => evaluateClassifications([valid, valid])).toThrow('Duplicate evaluation identity')
    expect(() =>
      evaluateClassifications([{ ...valid, actual: { ...valid.actual, categoryId: 'health' } }]),
    ).toThrow('Quiet category')
    expect(() =>
      evaluateClassifications([
        {
          ...valid,
          expected: { categoryId: 'health', needsReview: false },
        } as unknown as ClassificationEvaluationRow,
      ]),
    ).toThrow('quiet category annotation')
    expect(() =>
      evaluateClassifications([
        {
          ...valid,
          expected: { categoryId: 'invented', needsReview: false },
        } as unknown as ClassificationEvaluationRow,
      ]),
    ).toThrow('Unknown or quiet category annotation')
    expect(() =>
      evaluateClassifications([
        {
          ...valid,
          actual: { ...valid.actual, needsReview: 'false' },
        } as unknown as ClassificationEvaluationRow,
      ]),
    ).toThrow('Invalid review output')
  })

  it('distinguishes false confirmations, missed confirmations and unlabelled candidates', () => {
    const result = evaluateReconciliation([
      { id: 'correct', type: 'internal_transfer', expected: 'confirmed', actual: 'confirmed' },
      { id: 'unsafe', type: 'internal_transfer', expected: 'suggested', actual: 'confirmed' },
      { id: 'missed', type: 'internal_transfer', expected: 'confirmed', actual: 'absent' },
      { id: 'negative', type: 'duplicate', expected: 'absent', actual: 'suggested' },
      { id: 'unknown', type: 'refund', expected: null, actual: 'confirmed' },
    ])
    expect(result.confirmedPrecision).toEqual({ numerator: 1, denominator: 2, value: 0.5 })
    expect(result.confirmedRecall).toEqual({ numerator: 1, denominator: 2, value: 0.5 })
    expect(result.observedAutoReleaseError).toEqual({ numerator: 1, denominator: 2, value: 0.5 })
    expect(result.unlabelledAutoReleased).toBe(1)
    expect(result.annotationAgreement).toEqual({ numerator: 1, denominator: 4, value: 0.25 })
    expect(result.perDecisionType.duplicate?.confirmedPrecision.value).toBeNull()
    expect(result.perDecisionType.card_settlement?.autoRate.value).toBeNull()
  })

  it('rejects unknown relationship states and invalid ratios instead of making success up', () => {
    expect(() =>
      evaluateReconciliation([
        { id: 'x', type: 'refund', expected: 'confirmed', actual: 'missing' } as never,
      ]),
    ).toThrow('Unknown reconciliation state')
    expect(() => evaluationRate(1, 0)).toThrow('Invalid evaluation counts')
    expect(() => evaluationRate(-1, 2)).toThrow('Invalid evaluation counts')
    expect(() => evaluationRate(0.5, 2)).toThrow('Invalid evaluation counts')
    expect(evaluateReconciliation([]).confirmedPrecision.value).toBeNull()
  })
})
