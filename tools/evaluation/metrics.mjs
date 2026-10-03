import { digest, object, reject, sha256, token, unique } from './dataset-contract.mjs'

export const PREDICTION_VERSION = 'lilleri-evaluation-predictions-v1'
export const ABSTAIN = '__abstain__'
export function fraction(numerator, denominator) {
  if (![numerator, denominator].every((value) => Number.isSafeInteger(value) && value >= 0))
    reject('invalid-count')
  return {
    numerator: String(numerator),
    denominator: String(denominator),
    value: denominator === 0 ? null : numerator / denominator,
  }
}
export function eligible(row) {
  return (
    row.label !== null && !row.quiet && !row.private && !row.injection && row.status === 'booked'
  )
}
export function validatePredictions(value, corpus) {
  object(value, [
    'schemaVersion',
    'manifestDigest',
    'modelVersion',
    'modelArtifactDigest',
    'calibrationVersion',
    'thresholdVersion',
    'split',
    'rows',
  ])
  if (
    value.schemaVersion !== PREDICTION_VERSION ||
    !['calibration', 'test'].includes(value.split) ||
    digest(value.manifestDigest) !== corpus.manifestDigest
  )
    reject('prediction-dataset-mismatch')
  token(value.modelVersion)
  digest(value.modelArtifactDigest)
  token(value.calibrationVersion)
  token(value.thresholdVersion)
  if (!Array.isArray(value.rows)) reject('invalid-predictions')
  const expected = corpus.folds[value.split],
    ids = new Set(expected.map((row) => row.id)),
    classes = [...corpus.catalogue.leaves.map((row) => row.code), ABSTAIN]
  unique(value.rows.map((row) => row?.id))
  if (value.rows.length !== ids.size) reject('missing-prediction')
  for (const row of value.rows) {
    object(row, ['id', 'decision', 'categoryCode', 'score', 'probabilities'])
    digest(row.id)
    if (
      !ids.has(row.id) ||
      !['auto', 'review', 'abstain'].includes(row.decision) ||
      !Number.isFinite(row.score) ||
      row.score < 0 ||
      row.score > 1 ||
      (row.decision === 'abstain'
        ? row.categoryCode !== null
        : !classes.includes(row.categoryCode) || row.categoryCode === ABSTAIN)
    )
      reject('invalid-prediction')
    object(row.probabilities, classes)
    const probabilities = Object.values(row.probabilities)
    if (
      probabilities.some((p) => typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) ||
      Math.abs(probabilities.reduce((total, p) => total + p, 0) - 1) > 1e-10 ||
      Math.abs(row.probabilities[row.categoryCode ?? ABSTAIN] - row.score) > 1e-10
    )
      reject('invalid-probabilities')
  }
  return value
}
function counts(rows, predictions) {
  const byId = new Map(predictions.map((row) => [row.id, row]))
  let requiredAbstentions = 0,
    correctAbstentions = 0
  let auto = 0,
    wrongAuto = 0,
    review = 0,
    abstained = 0,
    correct = 0,
    covered = 0,
    labelled = 0
  for (const row of rows) {
    const prediction = byId.get(row.id)
    if (prediction.decision === 'auto') {
      auto++
      if (prediction.categoryCode !== row.label || !eligible(row)) wrongAuto++
    }
    if (prediction.decision === 'review') review++
    if (prediction.decision === 'abstain') abstained++
    if (row.label === null) {
      requiredAbstentions++
      if (prediction.decision === 'abstain') correctAbstentions++
    }
    if (eligible(row)) {
      labelled++
      if (prediction.categoryCode !== null) covered++
      if (prediction.categoryCode === row.label) correct++
    }
  }
  return {
    auto,
    wrongAuto,
    review,
    abstained,
    labelled,
    covered,
    correct,
    requiredAbstentions,
    correctAbstentions,
  }
}
function rates(rows, predictions) {
  const value = counts(rows, predictions)
  return {
    rows: rows.length,
    labelled: value.labelled,
    autoRate: fraction(value.auto, rows.length),
    falseAuto: fraction(value.wrongAuto, value.auto),
    reviewRate: fraction(value.review, rows.length),
    abstentionRate: fraction(value.abstained, rows.length),
    abstentionRecall: fraction(value.correctAbstentions, value.requiredAbstentions),
    labelledCoverage: fraction(value.covered, value.labelled),
    labelledAccuracy: fraction(value.correct, value.labelled),
  }
}
export function evaluatePredictions(corpus, predictions, { binCount } = {}) {
  validatePredictions(predictions, corpus)
  if (!Number.isSafeInteger(binCount) || binCount < 2 || binCount > 100)
    reject('invalid-reliability-bins')
  const rows = corpus.folds[predictions.split],
    byId = new Map(predictions.rows.map((row) => [row.id, row])),
    classes = [...corpus.catalogue.leaves.map((row) => row.code), ABSTAIN],
    parentByCode = new Map(corpus.catalogue.leaves.map((row) => [row.code, row.parent]))
  let brierSum = 0,
    calibrationCount = 0,
    parentMatches = 0
  const bins = Array.from({ length: binCount }, (_, index) => ({
      index,
      count: 0,
      correct: 0,
      scoreSum: 0,
    })),
    violations = { quietOrPrivate: 0, injection: 0, structuralAbstention: 0 }
  for (const row of rows) {
    const predicted = byId.get(row.id)
    if ((row.quiet || row.private) && predicted.decision !== 'abstain') violations.quietOrPrivate++
    if (row.injection && predicted.decision !== 'abstain') violations.injection++
    if ((row.status !== 'booked' || row.kind === 'unknown') && predicted.decision === 'auto')
      violations.structuralAbstention++
    if (!eligible(row)) continue
    calibrationCount++
    brierSum += classes.reduce(
      (sum, code) => sum + (predicted.probabilities[code] - (code === row.label ? 1 : 0)) ** 2,
      0,
    )
    const bin = bins[Math.min(binCount - 1, Math.floor(predicted.score * binCount))]
    bin.count++
    bin.scoreSum += predicted.score
    if (predicted.categoryCode === row.label) bin.correct++
    if (
      predicted.categoryCode !== null &&
      parentByCode.get(predicted.categoryCode) === parentByCode.get(row.label)
    )
      parentMatches++
  }
  const reliability = bins.map((bin) => ({
    index: bin.index,
    lower: bin.index / binCount,
    upper: (bin.index + 1) / binCount,
    count: bin.count,
    correctness: fraction(bin.correct, bin.count),
    meanConfidence: bin.count ? bin.scoreSum / bin.count : null,
  }))
  const ece = calibrationCount
    ? reliability.reduce(
        (sum, bin) =>
          bin.count ? sum + bin.count * Math.abs(bin.correctness.value - bin.meanConfidence) : sum,
        0,
      ) / calibrationCount
    : null
  const perCategory = corpus.catalogue.leaves.map((leaf) => {
    let tp = 0,
      fp = 0,
      fn = 0
    for (const row of rows.filter(
      (row) =>
        !row.quiet &&
        !row.private &&
        !row.injection &&
        row.status === 'booked' &&
        row.kind !== 'unknown',
    )) {
      const predicted = byId.get(row.id)
      if (predicted.categoryCode === leaf.code && row.label === leaf.code) tp++
      else if (predicted.categoryCode === leaf.code) fp++
      else if (row.label === leaf.code) fn++
    }
    return {
      code: leaf.code,
      support: tp + fn,
      precision: fraction(tp, tp + fp),
      recall: fraction(tp, tp + fn),
      f1: fraction(2 * tp, 2 * tp + fp + fn),
    }
  })
  const strata = (field) =>
    [...new Set(rows.map((row) => row[field]))].sort().map((value) => ({
      value,
      ...rates(
        rows.filter((row) => row[field] === value),
        predictions.rows,
      ),
    }))
  return {
    schemaVersion: 'lilleri-evaluation-report-v1',
    manifestDigest: corpus.manifestDigest,
    predictionDigest: sha256(predictions),
    split: predictions.split,
    modelVersion: predictions.modelVersion,
    modelArtifactDigest: predictions.modelArtifactDigest,
    calibrationVersion: predictions.calibrationVersion,
    thresholdVersion: predictions.thresholdVersion,
    evidence:
      corpus.manifest.source === 'synthetic'
        ? 'synthetic-tool-correctness-only'
        : 'declared-authorized-offline-evaluation',
    ...rates(rows, predictions.rows),
    perCategory,
    parentAccuracy: fraction(parentMatches, rows.filter(eligible).length),
    calibration: {
      count: calibrationCount,
      brier: calibrationCount ? brierSum / calibrationCount : null,
      ece,
      reliability,
    },
    guardrailViolations: violations,
    byBank: strata('bankId'),
    byKind: strata('kind'),
    bySubset: strata('subset'),
    trainingPerformed: false,
    externalCalls: 0,
    modelActivated: false,
  }
}
