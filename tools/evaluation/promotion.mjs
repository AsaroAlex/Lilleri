import {
  digest,
  instant,
  KINDS,
  object,
  reject,
  SUBSETS,
  sha256,
  token,
  unique,
} from './dataset-contract.mjs'
import { evaluatePredictions, fraction, validatePredictions } from './metrics.mjs'

function integer(value, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) reject('invalid-policy-count')
}
function ratio(value) {
  object(value, ['numerator', 'denominator'])
  if (
    !/^\d{1,30}$/u.test(value.numerator) ||
    !/^\d{1,30}$/u.test(value.denominator) ||
    BigInt(value.denominator) === 0n ||
    BigInt(value.numerator) > BigInt(value.denominator)
  )
    reject('invalid-policy-rate')
}
export function atMost(rate, limit) {
  ratio(limit)
  return (
    BigInt(rate.denominator) > 0n &&
    BigInt(rate.numerator) * BigInt(limit.denominator) <=
      BigInt(limit.numerator) * BigInt(rate.denominator)
  )
}
export function validatePolicy(policy, corpus) {
  object(policy, [
    'schemaVersion',
    'version',
    'modelVersion',
    'modelArtifactDigest',
    'taxonomyVersion',
    'mode',
    'decisionType',
    'epsilon',
    'minAuto',
    'thresholdGrid',
    'reliabilityBinCount',
    'coverage',
    'maxBrier',
    'maxEce',
    'rollbackVersion',
  ])
  if (
    policy.schemaVersion !== 'lilleri-shadow-policy-v1' ||
    !['CONTROL', 'BALANCED'].includes(policy.mode)
  )
    reject('unsupported-policy')
  for (const key of [
    'version',
    'modelVersion',
    'taxonomyVersion',
    'decisionType',
    'rollbackVersion',
  ])
    token(policy[key])
  digest(policy.modelArtifactDigest)
  ratio(policy.epsilon)
  integer(policy.minAuto, 1)
  integer(policy.reliabilityBinCount, 2)
  if (
    policy.taxonomyVersion !== corpus.catalogue.version ||
    policy.reliabilityBinCount > 100 ||
    policy.version === policy.rollbackVersion ||
    !Number.isFinite(policy.maxBrier) ||
    policy.maxBrier < 0 ||
    policy.maxBrier > 2 ||
    !Number.isFinite(policy.maxEce) ||
    policy.maxEce < 0 ||
    policy.maxEce > 1 ||
    !Array.isArray(policy.thresholdGrid) ||
    !policy.thresholdGrid.length
  )
    reject('invalid-policy')
  if (
    policy.thresholdGrid.some(
      (value) =>
        typeof value !== 'string' || !/^(?:0(?:\.\d{1,12})?|1(?:\.0{1,12})?)$/u.test(value),
    )
  )
    reject('invalid-policy-threshold')
  unique(policy.thresholdGrid.map(Number))
  const coverage = object(policy.coverage, [
    'minTotal',
    'maxTotal',
    'minTrain',
    'minCalibration',
    'minTest',
    'minPerLeaf',
    'minPerBank',
    'minPerKind',
    'minPerSubset',
    'requiredBanks',
    'requiredKinds',
    'requiredSubsets',
    'requiredLeaves',
  ])
  for (const key of [
    'minTotal',
    'maxTotal',
    'minTrain',
    'minCalibration',
    'minTest',
    'minPerLeaf',
    'minPerBank',
    'minPerKind',
    'minPerSubset',
  ])
    integer(coverage[key], 1)
  if (coverage.maxTotal < coverage.minTotal) reject('invalid-policy-coverage')
  const allowed = {
    requiredKinds: KINDS,
    requiredSubsets: SUBSETS,
    requiredLeaves: corpus.catalogue.leaves.filter((row) => !row.quiet).map((row) => row.code),
  }
  for (const key of ['requiredBanks', 'requiredKinds', 'requiredSubsets', 'requiredLeaves']) {
    if (!Array.isArray(coverage[key]) || !coverage[key].length) reject('invalid-policy-coverage')
    unique(coverage[key])
    coverage[key].forEach(token)
    if (allowed[key] && coverage[key].some((value) => !allowed[key].includes(value)))
      reject('invalid-policy-coverage')
  }
  return policy
}
function binding(predictions, policy, corpus) {
  validatePredictions(predictions, corpus)
  if (
    predictions.modelVersion !== policy.modelVersion ||
    predictions.modelArtifactDigest !== policy.modelArtifactDigest ||
    predictions.thresholdVersion !== policy.version
  )
    reject('prediction-policy-mismatch')
}
/** Replay only. The policy can never automate quiet/private/injection/unbooked/unknown rows. */
export function shadowThreshold(corpus, predictions, threshold) {
  const rows = corpus.folds[predictions.split],
    byId = new Map(predictions.rows.map((row) => [row.id, row])),
    leaves = new Map(corpus.catalogue.leaves.map((row) => [row.code, row]))
  let auto = 0,
    wrong = 0,
    eligible = 0
  for (const row of rows) {
    if (
      row.quiet ||
      row.private ||
      row.injection ||
      row.status !== 'booked' ||
      row.kind === 'unknown'
    )
      continue
    eligible++
    const predicted = byId.get(row.id)
    if (
      predicted.categoryCode === null ||
      leaves.get(predicted.categoryCode)?.quiet ||
      predicted.score < Number(threshold)
    )
      continue
    auto++
    if (predicted.categoryCode !== row.label) wrong++
  }
  return {
    threshold,
    eligible,
    auto,
    falseAuto: fraction(wrong, auto),
    autoRate: fraction(auto, eligible),
  }
}
/** Calibration is the only split allowed to choose a threshold. Test labels never enter selection. */
export function selectThreshold(corpus, calibration, policy) {
  validatePolicy(policy, corpus)
  binding(calibration, policy, corpus)
  if (calibration.split !== 'calibration') reject('test-tuning-forbidden')
  const candidates = policy.thresholdGrid
    .map((threshold) => shadowThreshold(corpus, calibration, threshold))
    .filter((result) => result.auto >= policy.minAuto && atMost(result.falseAuto, policy.epsilon))
    .sort((a, b) => b.auto - a.auto || Number(b.threshold) - Number(a.threshold))
  return candidates[0] ?? null
}
/** A passing assessment is a review proposal. It does not activate a model or modify runtime config. */
export function assessCandidate(corpus, calibration, test, policy) {
  validatePolicy(policy, corpus)
  binding(test, policy, corpus)
  if (test.split !== 'test' || calibration.calibrationVersion !== test.calibrationVersion)
    reject('split-version-mismatch')
  const selection = selectThreshold(corpus, calibration, policy),
    reasons = []
  if (corpus.manifest.source === 'synthetic') reasons.push('synthetic-evidence-cannot-promote')
  if (corpus.manifest.purpose !== 'promotion-assessment')
    reasons.push('purpose-does-not-authorize-promotion-assessment')
  const coverage = policy.coverage,
    rows = corpus.folds.test,
    total = corpus.manifest.rows.length
  // E25's dataset contract is independent of a caller's automation threshold configuration.
  const nonQuietLeaves = corpus.catalogue.leaves.filter((leaf) => !leaf.quiet)
  if (
    total < 3000 ||
    total > 5000 ||
    corpus.catalogue.parents.length < 12 ||
    corpus.catalogue.parents.length > 16 ||
    corpus.catalogue.leaves.length < 70 ||
    corpus.catalogue.leaves.length > 110 ||
    nonQuietLeaves.some((leaf) => rows.filter((row) => row.label === leaf.code).length < 30)
  )
    reasons.push('representative-contract-not-met')
  if (
    total < coverage.minTotal ||
    total > coverage.maxTotal ||
    corpus.folds.train.length < coverage.minTrain ||
    corpus.folds.calibration.length < coverage.minCalibration ||
    rows.length < coverage.minTest
  )
    reasons.push('insufficient-corpus')
  for (const [key, field, minimum] of [
    ['requiredLeaves', 'label', coverage.minPerLeaf],
    ['requiredBanks', 'bankId', coverage.minPerBank],
    ['requiredKinds', 'kind', coverage.minPerKind],
    ['requiredSubsets', 'subset', coverage.minPerSubset],
  ])
    if (coverage[key].some((value) => rows.filter((row) => row[field] === value).length < minimum))
      reasons.push(`insufficient-${field}-coverage`)
  if (!selection) reasons.push('no-safe-calibration-threshold')
  const report = evaluatePredictions(corpus, test, { binCount: policy.reliabilityBinCount }),
    shadow = selection ? shadowThreshold(corpus, test, selection.threshold) : null
  if (shadow && (shadow.auto < policy.minAuto || !atMost(shadow.falseAuto, policy.epsilon)))
    reasons.push('test-auto-error-or-support-failed')
  if (
    report.calibration.brier === null ||
    report.calibration.ece === null ||
    report.calibration.brier > policy.maxBrier ||
    report.calibration.ece > policy.maxEce
  )
    reasons.push('calibration-quality-failed')
  if (Object.values(report.guardrailViolations).some((count) => count > 0))
    reasons.push('guardrail-violation')
  const assessment = {
    schemaVersion: 'lilleri-promotion-assessment-v1',
    policyVersion: policy.version,
    policyDigest: sha256(policy),
    manifestDigest: corpus.manifestDigest,
    calibrationPredictionDigest: sha256(calibration),
    testPredictionDigest: sha256(test),
    selection,
    shadow,
    report,
    eligibleForHumanReview: reasons.length === 0,
    reasons,
    rollbackVersion: policy.rollbackVersion,
    modelActivated: false,
    externalCalls: 0,
  }
  return { ...assessment, assessmentDigest: sha256(assessment) }
}

/** Append-only local policy decision metadata; production never reads this journal automatically. */
export function policyTransition(journal, assessment, receipt) {
  object(receipt, [
    'action',
    'targetVersion',
    'reviewReferenceDigest',
    'occurredAt',
    'reviewedAssessmentDigest',
    'reviewedJournalDigest',
  ])
  const {
    action,
    targetVersion,
    reviewReferenceDigest,
    occurredAt,
    reviewedAssessmentDigest,
    reviewedJournalDigest,
  } = receipt
  if (digest(reviewedJournalDigest) !== sha256(journal)) reject('unreviewed-journal')
  object(journal, ['activeVersion', 'knownVersions', 'events'])
  token(journal.activeVersion)
  if (!Array.isArray(journal.knownVersions) || !Array.isArray(journal.events))
    reject('invalid-journal')
  for (const known of journal.knownVersions) {
    object(known, ['version', 'policyDigest'])
    token(known.version)
    digest(known.policyDigest)
  }
  unique(journal.knownVersions.map((known) => known.version))
  const versions = new Map(
    journal.knownVersions.map((known) => [known.version, known.policyDigest]),
  )
  let previousTime = Number.NEGATIVE_INFINITY
  let previousDigest = null,
    active = journal.events[0]?.beforeVersion ?? journal.activeVersion
  for (const event of journal.events) {
    object(event, [
      'action',
      'beforeVersion',
      'afterVersion',
      'reviewReferenceDigest',
      'occurredAt',
      'previousDigest',
      'policyDigest',
      'assessmentDigest',
      'digest',
    ])
    const { digest: claimed, ...contents } = event
    if (
      claimed !== sha256(contents) ||
      event.previousDigest !== previousDigest ||
      event.beforeVersion !== active ||
      !versions.has(event.beforeVersion) ||
      event.policyDigest !== versions.get(event.afterVersion) ||
      !['approve', 'rollback'].includes(event.action) ||
      (event.action === 'approve' ? !event.assessmentDigest : event.assessmentDigest !== null)
    )
      reject('journal-tampering')
    instant(event.occurredAt)
    if (Date.parse(event.occurredAt) < previousTime) reject('journal-clock-regression')
    previousTime = Date.parse(event.occurredAt)
    digest(event.reviewReferenceDigest)
    token(event.afterVersion)
    if (event.assessmentDigest !== null) digest(event.assessmentDigest)
    previousDigest = claimed
    active = event.afterVersion
  }
  if (active !== journal.activeVersion || !versions.has(active)) reject('invalid-journal-head')
  if (!['approve', 'rollback'].includes(action)) reject('invalid-transition')
  token(targetVersion)
  digest(reviewReferenceDigest)
  instant(occurredAt)
  if (
    journal.events.length &&
    Date.parse(occurredAt) < Date.parse(journal.events.at(-1).occurredAt)
  )
    reject('journal-clock-regression')
  if (
    action === 'approve' &&
    (!assessment.eligibleForHumanReview ||
      targetVersion !== assessment.policyVersion ||
      assessment.schemaVersion !== 'lilleri-promotion-assessment-v1' ||
      !Array.isArray(assessment.reasons) ||
      assessment.reasons.length > 0 ||
      assessment.modelActivated !== false ||
      assessment.externalCalls !== 0 ||
      assessment.report.evidence !== 'declared-authorized-offline-evaluation')
  )
    reject('unapproved-promotion')
  if (action === 'approve') {
    const { assessmentDigest, ...contents } = assessment
    if (
      digest(reviewedAssessmentDigest) !== assessmentDigest ||
      assessmentDigest !== sha256(contents)
    )
      reject('unreviewed-assessment')
    if (versions.has(targetVersion) && versions.get(targetVersion) !== assessment.policyDigest)
      reject('immutable-policy-version')
  } else if (reviewedAssessmentDigest !== null) reject('invalid-rollback-receipt')
  if (
    action === 'rollback' &&
    (!versions.has(targetVersion) || targetVersion === journal.activeVersion)
  )
    reject('unknown-rollback-version')
  const event = {
    action,
    beforeVersion: journal.activeVersion,
    afterVersion: targetVersion,
    reviewReferenceDigest,
    occurredAt,
    previousDigest,
    policyDigest:
      action === 'approve' ? digest(assessment.policyDigest) : versions.get(targetVersion),
    assessmentDigest: action === 'approve' ? assessment.assessmentDigest : null,
  }
  if (!versions.has(targetVersion)) versions.set(targetVersion, event.policyDigest)
  return {
    activeVersion: targetVersion,
    knownVersions: [...versions].map(([version, policyDigest]) => ({ version, policyDigest })),
    events: [...journal.events, { ...event, digest: sha256(event) }],
  }
}
