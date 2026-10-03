import { type CategoryId, type Classification, isCategoryId, type MatchType } from '@lilleri/domain'

/** Counts describe this sample only. Undefined rates remain null, including an empty sample. */
export interface EvaluationRate {
  readonly numerator: number
  readonly denominator: number
  readonly value: number | null
}

export type EvaluationCategory = Exclude<CategoryId, 'health' | 'uncategorised'>
export const EVALUATION_CATEGORIES: readonly EvaluationCategory[] = [
  'income',
  'groceries',
  'shopping',
  'food',
  'transport',
  'utilities',
  'subscriptions',
  'travel',
  'transfer',
]

export interface ClassificationEvaluationRow {
  readonly id: string
  readonly stratum: string
  /** null means no annotation. A null category inside an annotation means deliberately undecidable. */
  readonly expected: {
    readonly categoryId: EvaluationCategory | null
    readonly needsReview: boolean
  } | null
  readonly actual: Pick<Classification, 'categoryId' | 'needsReview' | 'source'>
}

export interface ConfusionCell {
  readonly expected: EvaluationCategory | null
  readonly predicted: EvaluationCategory | null
  readonly count: number
}

export interface CategoryEvaluation {
  readonly categoryId: EvaluationCategory
  readonly support: number
  readonly truePositive: number
  readonly falsePositive: number
  readonly falseNegative: number
  readonly precision: EvaluationRate
  readonly recall: EvaluationRate
  readonly f1: EvaluationRate
}

interface ClassificationCounts {
  readonly rows: number
  readonly annotatedRows: number
  readonly unlabelledRows: number
  readonly expectedUndecidable: number
  readonly unlabelledAutoReleased: number
  readonly autoRate: EvaluationRate
  readonly reviewRate: EvaluationRate
  readonly abstentionRate: EvaluationRate
  /** Reviewed candidates are abstentions and cannot count as correct automatic assignments. */
  readonly assignedCategoryAccuracy: EvaluationRate
  readonly undecidableAbstentionAgreement: EvaluationRate
  /** Fixture regression check includes the suggested category and review routing. */
  readonly annotationAgreement: EvaluationRate
  readonly reviewRoutingAgreement: EvaluationRate
  readonly observedAutoReleaseError: EvaluationRate
}

export interface ClassificationEvaluation extends ClassificationCounts {
  readonly confusion: readonly ConfusionCell[]
  readonly perCategory: readonly CategoryEvaluation[]
  readonly perTier: Readonly<Record<string, ClassificationCounts>>
  readonly perStratum: Readonly<Record<string, ClassificationCounts>>
}

const SOURCES: readonly Classification['source'][] = [
  'user',
  'rule',
  'preference',
  'global',
  'review',
]
const MATCH_TYPES: readonly MatchType[] = [
  'pending_to_booked',
  'duplicate',
  'internal_transfer',
  'card_settlement',
  'refund',
  'cash_transfer',
]

export const evaluationRate = (numerator: number, denominator: number): EvaluationRate => {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator < 0 ||
    denominator < numerator
  )
    throw new Error('Invalid evaluation counts')
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator }
}

function validateIds(rows: readonly { readonly id: string }[]): void {
  if (rows.some((row) => !row.id || typeof row.id !== 'string'))
    throw new Error('Evaluation rows require an identity')
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error('Duplicate evaluation identity')
}

function predictedCategory(row: ClassificationEvaluationRow): EvaluationCategory | null {
  return row.actual.needsReview || row.actual.categoryId === 'uncategorised'
    ? null
    : (row.actual.categoryId as EvaluationCategory)
}

function classificationCounts(rows: readonly ClassificationEvaluationRow[]): ClassificationCounts {
  const annotated = rows.filter((row) => row.expected !== null)
  const known = annotated.filter((row) => row.expected?.categoryId !== null)
  const undecidable = annotated.filter((row) => row.expected?.categoryId === null)
  const automatic = rows.filter((row) => predictedCategory(row) !== null)
  const annotatedAutomatic = automatic.filter((row) => row.expected !== null)
  const correctAssignments = known.filter(
    (row) => predictedCategory(row) === row.expected?.categoryId,
  ).length
  return {
    rows: rows.length,
    annotatedRows: annotated.length,
    unlabelledRows: rows.length - annotated.length,
    expectedUndecidable: undecidable.length,
    unlabelledAutoReleased: automatic.length - annotatedAutomatic.length,
    autoRate: evaluationRate(automatic.length, rows.length),
    reviewRate: evaluationRate(rows.filter((row) => row.actual.needsReview).length, rows.length),
    abstentionRate: evaluationRate(rows.length - automatic.length, rows.length),
    assignedCategoryAccuracy: evaluationRate(correctAssignments, known.length),
    undecidableAbstentionAgreement: evaluationRate(
      undecidable.filter((row) => predictedCategory(row) === null).length,
      undecidable.length,
    ),
    annotationAgreement: evaluationRate(
      annotated.filter(
        (row) =>
          (row.actual.categoryId === 'uncategorised' ? null : row.actual.categoryId) ===
            row.expected?.categoryId && row.actual.needsReview === row.expected?.needsReview,
      ).length,
      annotated.length,
    ),
    reviewRoutingAgreement: evaluationRate(
      annotated.filter((row) => row.actual.needsReview === row.expected?.needsReview).length,
      annotated.length,
    ),
    observedAutoReleaseError: evaluationRate(
      annotatedAutomatic.filter((row) => predictedCategory(row) !== row.expected?.categoryId)
        .length,
      annotatedAutomatic.length,
    ),
  }
}

function groupedClassificationCounts(
  rows: readonly ClassificationEvaluationRow[],
  key: (row: ClassificationEvaluationRow) => string,
): Readonly<Record<string, ClassificationCounts>> {
  return Object.fromEntries(
    [...new Set(rows.map(key))]
      .sort()
      .map((value) => [value, classificationCounts(rows.filter((row) => key(row) === value))]),
  )
}

/** Local flat category evaluation; canonical leaf/hierarchical and calibrated scores are separate work. */
export function evaluateClassifications(
  rows: readonly ClassificationEvaluationRow[],
): ClassificationEvaluation {
  validateIds(rows)
  for (const row of rows) {
    if (!row.stratum || typeof row.stratum !== 'string')
      throw new Error('Missing evaluation stratum')
    if (!isCategoryId(row.actual.categoryId) || !SOURCES.includes(row.actual.source))
      throw new Error('Unknown classification output')
    if (typeof row.actual.needsReview !== 'boolean') throw new Error('Invalid review output')
    // The legacy flat health category maps to quiet canonical leaves. It is excluded from quality datasets.
    if (row.actual.categoryId === 'health')
      throw new Error('Quiet category excluded from evaluation')
    if (row.expected !== null) {
      if (typeof row.expected.needsReview !== 'boolean')
        throw new Error('Invalid review annotation')
      if (
        row.expected.categoryId !== null &&
        !EVALUATION_CATEGORIES.includes(row.expected.categoryId)
      )
        throw new Error('Unknown or quiet category annotation')
    }
  }
  const annotated = rows.filter((row) => row.expected !== null)
  const labels: readonly (EvaluationCategory | null)[] = [...EVALUATION_CATEGORIES, null]
  const confusion = labels.flatMap((expected) =>
    labels.map((predicted) => ({
      expected,
      predicted,
      count: annotated.filter(
        (row) => row.expected?.categoryId === expected && predictedCategory(row) === predicted,
      ).length,
    })),
  )
  const perCategory = EVALUATION_CATEGORIES.map((categoryId) => {
    const truePositive = annotated.filter(
      (row) => row.expected?.categoryId === categoryId && predictedCategory(row) === categoryId,
    ).length
    const falsePositive = annotated.filter(
      (row) => row.expected?.categoryId !== categoryId && predictedCategory(row) === categoryId,
    ).length
    const falseNegative = annotated.filter(
      (row) => row.expected?.categoryId === categoryId && predictedCategory(row) !== categoryId,
    ).length
    return {
      categoryId,
      support: truePositive + falseNegative,
      truePositive,
      falsePositive,
      falseNegative,
      precision: evaluationRate(truePositive, truePositive + falsePositive),
      recall: evaluationRate(truePositive, truePositive + falseNegative),
      f1: evaluationRate(2 * truePositive, 2 * truePositive + falsePositive + falseNegative),
    }
  })
  return {
    ...classificationCounts(rows),
    confusion,
    perCategory,
    perTier: groupedClassificationCounts(rows, (row) => row.actual.source),
    perStratum: groupedClassificationCounts(rows, (row) => row.stratum),
  }
}

export type EvaluationMatchState = 'confirmed' | 'suggested' | 'rejected' | 'undone' | 'absent'
export interface ReconciliationEvaluationRow {
  readonly id: string
  readonly type: MatchType
  /** An absent relationship is an explicit negative annotation; null means not annotated. */
  readonly expected: EvaluationMatchState | null
  readonly actual: EvaluationMatchState
}

interface ReconciliationCounts {
  readonly rows: number
  readonly annotatedRows: number
  readonly unlabelledRows: number
  readonly unlabelledAutoReleased: number
  readonly autoRate: EvaluationRate
  readonly reviewRate: EvaluationRate
  readonly observedAutoReleaseError: EvaluationRate
  readonly annotationAgreement: EvaluationRate
  readonly confirmedPrecision: EvaluationRate
  readonly confirmedRecall: EvaluationRate
  readonly confirmedF1: EvaluationRate
}

export interface ReconciliationEvaluation extends ReconciliationCounts {
  readonly perDecisionType: Readonly<Record<string, ReconciliationCounts>>
}

function reconciliationCounts(rows: readonly ReconciliationEvaluationRow[]): ReconciliationCounts {
  const annotated = rows.filter((row) => row.expected !== null)
  const auto = rows.filter((row) => row.actual === 'confirmed')
  const labelledAuto = auto.filter((row) => row.expected !== null)
  const expectedConfirmed = annotated.filter((row) => row.expected === 'confirmed')
  const truePositive = labelledAuto.filter((row) => row.expected === 'confirmed').length
  const falsePositive = labelledAuto.length - truePositive
  const falseNegative = expectedConfirmed.length - truePositive
  return {
    rows: rows.length,
    annotatedRows: annotated.length,
    unlabelledRows: rows.length - annotated.length,
    unlabelledAutoReleased: auto.length - labelledAuto.length,
    autoRate: evaluationRate(auto.length, rows.length),
    reviewRate: evaluationRate(
      rows.filter((row) => row.actual === 'suggested').length,
      rows.length,
    ),
    observedAutoReleaseError: evaluationRate(falsePositive, labelledAuto.length),
    annotationAgreement: evaluationRate(
      annotated.filter((row) => row.actual === row.expected).length,
      annotated.length,
    ),
    confirmedPrecision: evaluationRate(truePositive, truePositive + falsePositive),
    confirmedRecall: evaluationRate(truePositive, truePositive + falseNegative),
    confirmedF1: evaluationRate(2 * truePositive, 2 * truePositive + falsePositive + falseNegative),
  }
}

export function evaluateReconciliation(
  rows: readonly ReconciliationEvaluationRow[],
): ReconciliationEvaluation {
  validateIds(rows)
  const states: readonly EvaluationMatchState[] = [
    'confirmed',
    'suggested',
    'rejected',
    'undone',
    'absent',
  ]
  for (const row of rows) {
    if (!MATCH_TYPES.includes(row.type)) throw new Error('Unknown reconciliation type')
    if (!states.includes(row.actual) || (row.expected !== null && !states.includes(row.expected)))
      throw new Error('Unknown reconciliation state')
  }
  return {
    ...reconciliationCounts(rows),
    perDecisionType: Object.fromEntries(
      MATCH_TYPES.map((type) => [
        type,
        reconciliationCounts(rows.filter((row) => row.type === type)),
      ]),
    ),
  }
}
