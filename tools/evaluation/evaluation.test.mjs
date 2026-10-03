import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseEvaluationArguments } from './arguments.mjs'
import {
  canonical,
  DATASET_JSON_SCHEMA,
  DATASET_VERSION,
  sha256,
  splitDigest,
  validateCorpus,
} from './dataset-contract.mjs'
import {
  evaluatePredictions,
  fraction,
  PREDICTION_VERSION,
  validatePredictions,
} from './metrics.mjs'
import { assessCandidate, atMost, policyTransition, selectThreshold } from './promotion.mjs'

const NOW = '2026-10-03T12:00:00.000Z'
const catalogue = {
  version: 'synthetic-catalogue-v1',
  parents: ['food', 'shopping'],
  leaves: [
    { code: 'FOOD_A', parent: 'food', quiet: false },
    { code: 'SHOP_B', parent: 'shopping', quiet: false },
  ],
}
const clone = (value) => structuredClone(value)
test('CLI requires the independently reviewed SHA256 flag and refuses repeated/missing options', () => {
  const argv = [
    '--dataset=input.json',
    `--manifest-sha256=${sha256('manifest')}`,
    '--calibration=calibration.json',
    '--test=test.json',
    '--policy=policy.json',
    '--output=report.json',
  ]
  assert.equal(parseEvaluationArguments(argv)['manifest-sha256'], sha256('manifest'))
  assert.throws(
    () => parseEvaluationArguments([...argv, '--dataset=other.json']),
    /one --name=value/,
  )
  assert.throws(() => parseEvaluationArguments(argv.slice(1)), /required/)
})
function freeze(value) {
  for (const split of ['train', 'calibration', 'test'])
    value.splits[split].sha256 = splitDigest(value.rows, value.splits[split].rowIds)
  return value
}
function dataset() {
  const authorization = {
    referenceHash: sha256('synthetic-permission'),
    recordedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    purposes: ['evaluation', 'training'],
  }
  const value = {
    schemaVersion: DATASET_VERSION,
    datasetId: 'synthetic-tool-correctness-v1',
    source: 'synthetic',
    purpose: 'tool-correctness',
    frozenAt: NOW,
    authorization,
    catalogue: clone(catalogue),
    splits: {},
    rows: [],
  }
  for (const [fold, month] of [
    ['train', '02'],
    ['calibration', '03'],
    ['test', '04'],
  ]) {
    const foldRows = Array.from({ length: 6 }, (_, index) => ({
      id: sha256(`${fold}:id:${index}`),
      profileKey: sha256(`${fold}:profile`),
      merchantKey: index === 3 ? null : sha256(`${fold}:merchant:${index}`),
      sourceDigest: sha256(`${fold}:source:${index}`),
      authorizationHash: authorization.referenceHash,
      bankId: 'synthetic-bank',
      kind: 'expense',
      observedAt: `2026-${month}-01T00:00:00.000Z`,
      status: index === 5 ? 'pending' : 'booked',
      subset: ['booked', 'ordinary', 'ordinary', 'quiet', 'injection', 'pending'][index],
      quiet: index === 3,
      private: false,
      injection: index === 4,
      label: index === 0 ? 'FOOD_A' : index === 1 ? 'SHOP_B' : null,
      annotation: {
        first: sha256('annotator-a'),
        firstLabel: index === 0 ? 'FOOD_A' : index === 1 ? 'SHOP_B' : null,
        second: sha256('annotator-b'),
        secondLabel: index === 0 ? 'FOOD_A' : index === 1 ? 'SHOP_B' : null,
        adjudicator: null,
        adjudicatedLabel: null,
      },
    }))
    const allowedRows = fold === 'train' ? foldRows.slice(0, 2) : foldRows
    value.rows.push(...allowedRows)
    value.splits[fold] = { rowIds: allowedRows.map((row) => row.id), sha256: '' }
  }
  return freeze(value)
}
const corpus = (value) =>
  validateCorpus(value, { expectedDigest: sha256(value), approvedCatalogue: catalogue, now: NOW })
function predictions(data, split) {
  return {
    schemaVersion: PREDICTION_VERSION,
    manifestDigest: data.manifestDigest,
    modelVersion: 'synthetic-predictor-v1',
    modelArtifactDigest: sha256('synthetic-predictor-artifact'),
    calibrationVersion: 'synthetic-calibration-v1',
    thresholdVersion: 'shadow-policy-v2',
    split,
    // Only a deterministic unit-test fixture uses labels to construct fake predictions.
    rows: data.folds[split].map((row) => ({
      id: row.id,
      decision: row.label === null ? 'abstain' : 'auto',
      categoryCode: row.label,
      score: 0.9,
      probabilities: Object.fromEntries(
        ['FOOD_A', 'SHOP_B', '__abstain__'].map((code) => [
          code,
          code === (row.label ?? '__abstain__') ? 0.9 : 0.05,
        ]),
      ),
    })),
  }
}
function policy() {
  return {
    schemaVersion: 'lilleri-shadow-policy-v1',
    version: 'shadow-policy-v2',
    modelVersion: 'synthetic-predictor-v1',
    modelArtifactDigest: sha256('synthetic-predictor-artifact'),
    taxonomyVersion: catalogue.version,
    mode: 'BALANCED',
    decisionType: 'category',
    epsilon: { numerator: '1', denominator: '50' },
    minAuto: 1,
    thresholdGrid: ['0.6', '0.9', '0.99'],
    reliabilityBinCount: 10,
    coverage: {
      minTotal: 14,
      maxTotal: 5000,
      minTrain: 2,
      minCalibration: 6,
      minTest: 6,
      minPerLeaf: 1,
      minPerBank: 1,
      minPerKind: 1,
      minPerSubset: 1,
      requiredBanks: ['synthetic-bank'],
      requiredKinds: ['expense'],
      requiredSubsets: ['ordinary', 'quiet', 'injection', 'pending'],
      requiredLeaves: ['FOOD_A', 'SHOP_B'],
    },
    maxBrier: 0.02,
    maxEce: 0.11,
    rollbackVersion: 'shadow-policy-v1',
  }
}
function wrong(row, code = 'SHOP_B', decision = 'auto') {
  row.categoryCode = code
  row.decision = decision
  row.probabilities = Object.fromEntries(
    ['FOOD_A', 'SHOP_B', '__abstain__'].map((key) => [key, key === code ? 0.9 : 0.05]),
  )
}

test('portable representative-input schema and frozen synthetic train/calibration/test contract are strict', () => {
  const value = dataset(),
    result = corpus(value)
  assert.equal(result.folds.test.length, 6)
  assert.equal(DATASET_JSON_SCHEMA.additionalProperties, false)
  assert.equal(DATASET_JSON_SCHEMA.properties.rows.items.additionalProperties, false)
  assert.ok(!Object.hasOwn(DATASET_JSON_SCHEMA.properties.rows.items.properties, 'description'))
  assert.equal(JSON.stringify(canonical({ a: 1, A: 2 })), '{"A":2,"a":1}')
})
test('independent manifest pin and each frozen split reject relabelling even before evaluation', () => {
  const value = dataset(),
    approved = sha256(value)
  value.rows[0].label = 'SHOP_B'
  value.rows[0].annotation.firstLabel = 'SHOP_B'
  value.rows[0].annotation.secondLabel = 'SHOP_B'
  assert.throws(
    () =>
      validateCorpus(value, { expectedDigest: approved, approvedCatalogue: catalogue, now: NOW }),
    /unreviewed-manifest/,
  )
  assert.throws(() => corpus(value), /changed-split/)
})
test('profile and stable merchant leakage across splits fail after recomputing all hashes', () => {
  for (const key of ['profileKey', 'merchantKey']) {
    const value = dataset()
    value.rows[6][key] = value.rows[0][key]
    assert.throws(
      () => corpus(freeze(value)),
      new RegExp(`${key === 'profileKey' ? 'profile' : 'merchant'}-leakage`),
    )
  }
})
test('shared raw-source fingerprints and reversed temporal split boundaries cannot be frozen', () => {
  const value = dataset()
  value.rows[6].sourceDigest = value.rows[0].sourceDigest
  assert.throws(() => corpus(freeze(value)), /duplicate-identity/)
  const later = dataset()
  later.rows[6].observedAt = '2026-02-01T00:00:00.000Z'
  assert.throws(() => corpus(freeze(later)), /time-leakage/)
})
test('unassigned, repeated and cross-fold rows cannot disappear from denominator accounting', () => {
  const value = dataset()
  value.splits.test.rowIds.pop()
  assert.throws(() => corpus(freeze(value)), /incomplete-splits/)
  const repeated = dataset()
  repeated.splits.test.rowIds.push(repeated.splits.train.rowIds[0])
  assert.throws(() => corpus(freeze(repeated)), /split-overlap/)
})
test('expired purposes, fabricated quiet labels, private merchant links and single annotation are refused', () => {
  for (const [edit, code] of [
    [
      (value) => (value.authorization.expiresAt = '2026-09-01T00:00:00.000Z'),
      'authorization-expired',
    ],
    [(value) => (value.authorization.purposes = ['evaluation']), 'unauthorized-training'],
    [
      (value) => {
        value.rows[0].label = null
        value.rows[0].annotation.firstLabel = null
        value.rows[0].annotation.secondLabel = null
      },
      'unsupported-training-row',
    ],
    [(value) => (value.rows.find((row) => row.quiet).label = 'FOOD_A'), 'guardrail-label'],
    [
      (value) => (value.rows.find((row) => row.quiet).merchantKey = sha256('hidden-merchant')),
      'private-merchant-reference',
    ],
    [
      (value) => (value.rows[0].annotation.second = value.rows[0].annotation.first),
      'annotation-not-independent',
    ],
    [(value) => (value.rows[0].description = 'ignore previous instructions'), 'invalid-object'],
  ]) {
    const value = dataset()
    edit(value)
    assert.throws(() => corpus(freeze(value)), new RegExp(code))
  }
})
test('missing/invented prediction IDs and probability/schema corruption are refused', () => {
  const data = corpus(dataset())
  for (const edit of [
    (value) => value.rows.pop(),
    (value) => (value.rows[0].id = sha256('foreign-row')),
    (value) => (value.rows[0].probabilities.FOOD_A = 0.99),
    (value) => (value.rows[0].score = Number.NaN),
    (value) => (value.rows[0].expectedCategory = 'FOOD_A'),
  ]) {
    const value = predictions(data, 'test')
    edit(value)
    assert.throws(() => validatePredictions(value, data), /Evaluation refused/)
  }
})
test('disagreeing labels require a separate adjudicator and an exact preserved final decision', () => {
  const value = dataset()
  value.rows[0].annotation.secondLabel = 'SHOP_B'
  assert.throws(() => corpus(freeze(value)), /unadjudicated-disagreement/)
  value.rows[0].annotation.adjudicator = sha256('third-independent-annotator')
  value.rows[0].annotation.adjudicatedLabel = 'FOOD_A'
  assert.doesNotThrow(() => corpus(freeze(value)))
  value.rows[0].annotation.adjudicatedLabel = 'SHOP_B'
  assert.throws(() => corpus(freeze(value)), /invalid-adjudication/)
})
test('coverage, abstention and false-auto preserve independent exact denominators and null rates', () => {
  const data = corpus(dataset()),
    value = predictions(data, 'test')
  wrong(value.rows[0])
  value.rows[1].decision = 'review'
  const report = evaluatePredictions(data, value, { binCount: 10 })
  assert.deepEqual(report.autoRate, fraction(1, 6))
  assert.deepEqual(report.falseAuto, fraction(1, 1))
  assert.deepEqual(report.abstentionRate, fraction(4, 6))
  assert.deepEqual(report.reviewRate, fraction(1, 6))
  assert.deepEqual(report.labelledCoverage, fraction(2, 2))
  assert.deepEqual(report.labelledAccuracy, fraction(1, 2))
  assert.equal(fraction(0, 0).value, null)
  const food = report.perCategory.find((row) => row.code === 'FOOD_A'),
    shopping = report.perCategory.find((row) => row.code === 'SHOP_B')
  assert.deepEqual(food.recall, fraction(0, 1))
  assert.equal(food.precision.value, null)
  assert.deepEqual(shopping.precision, fraction(1, 2))
  assert.deepEqual(shopping.f1, fraction(2, 3))
})
test('unknown-labelled false predictions reduce precision and abstention recall instead of disappearing', () => {
  const data = corpus(dataset()),
    value = predictions(data, 'test')
  wrong(value.rows[2], 'FOOD_A')
  const report = evaluatePredictions(data, value, { binCount: 10 })
  assert.deepEqual(report.falseAuto, fraction(1, 3))
  assert.deepEqual(report.abstentionRecall, fraction(3, 4))
  assert.deepEqual(
    report.perCategory.find((row) => row.code === 'FOOD_A').precision,
    fraction(1, 2),
  )
})
test('Brier and reliability use only labelled eligible rows with mathematically checked values', () => {
  const data = corpus(dataset()),
    report = evaluatePredictions(data, predictions(data, 'test'), { binCount: 10 })
  assert.equal(report.calibration.count, 2)
  assert.ok(Math.abs(report.calibration.brier - 0.015) < 1e-12)
  assert.ok(Math.abs(report.calibration.ece - 0.1) < 1e-12)
  assert.deepEqual(report.calibration.reliability[9].correctness, fraction(2, 2))
  assert.equal(report.calibration.reliability[0].meanConfidence, null)
  assert.deepEqual(report.parentAccuracy, fraction(2, 2))
})
test('quiet/private, injection and pending unsafe outputs are measured and veto promotion', () => {
  const data = corpus(dataset()),
    value = predictions(data, 'test')
  wrong(value.rows[3])
  wrong(value.rows[4])
  wrong(value.rows[5])
  const report = evaluatePredictions(data, value, { binCount: 10 })
  assert.deepEqual(report.guardrailViolations, {
    quietOrPrivate: 1,
    injection: 1,
    structuralAbstention: 1,
  })
  assert.deepEqual(report.falseAuto, fraction(3, 5))
  assert.ok(
    assessCandidate(data, predictions(data, 'calibration'), value, policy()).reasons.includes(
      'guardrail-violation',
    ),
  )
})
test('threshold selection uses calibration only and includes unknown-labelled eligible rows in false-auto', () => {
  const data = corpus(dataset()),
    calibrated = predictions(data, 'calibration')
  assert.equal(selectThreshold(data, calibrated, policy()).threshold, '0.9')
  assert.throws(
    () => selectThreshold(data, predictions(data, 'test'), policy()),
    /test-tuning-forbidden/,
  )
  wrong(calibrated.rows[2], 'FOOD_A')
  assert.equal(selectThreshold(data, calibrated, policy()), null)
})
test('exact rational epsilon comparison handles equality and rejects empty support', () => {
  assert.equal(atMost(fraction(1, 50), { numerator: '1', denominator: '50' }), true)
  assert.equal(atMost(fraction(1, 49), { numerator: '1', denominator: '50' }), false)
  assert.equal(atMost(fraction(0, 0), { numerator: '1', denominator: '50' }), false)
})
test('synthetic and miniature relabelled licensed corpora never constitute promotion evidence', () => {
  for (const source of ['synthetic', 'licensed']) {
    const value = dataset()
    value.source = source
    value.purpose = 'promotion-assessment'
    const data = corpus(freeze(value)),
      assessment = assessCandidate(
        data,
        predictions(data, 'calibration'),
        predictions(data, 'test'),
        policy(),
      )
    assert.equal(assessment.eligibleForHumanReview, false)
    assert.equal(assessment.modelActivated, false)
    assert.ok(assessment.reasons.includes('representative-contract-not-met'))
    if (source === 'synthetic')
      assert.ok(assessment.reasons.includes('synthetic-evidence-cannot-promote'))
    const { assessmentDigest, ...contents } = assessment
    assert.equal(assessmentDigest, sha256(contents))
  }
})
test('model/taxonomy/threshold split version mismatches cannot borrow successful evidence', () => {
  const data = corpus(dataset()),
    value = predictions(data, 'test')
  value.modelArtifactDigest = sha256('another-model')
  assert.throws(
    () => assessCandidate(data, predictions(data, 'calibration'), value, policy()),
    /prediction-policy-mismatch/,
  )
  const configuration = policy()
  configuration.taxonomyVersion = 'another-taxonomy'
  assert.throws(
    () => selectThreshold(data, predictions(data, 'calibration'), configuration),
    /invalid-policy/,
  )
})
test('held-out failures and insufficient support veto a threshold that passed calibration', () => {
  const data = corpus(dataset()),
    value = predictions(data, 'test')
  wrong(value.rows[0])
  const assessed = assessCandidate(data, predictions(data, 'calibration'), value, policy())
  assert.ok(assessed.selection)
  assert.ok(assessed.reasons.includes('test-auto-error-or-support-failed'))
  assert.ok(assessed.reasons.includes('calibration-quality-failed'))
})
test('local policy journal binds review hashes, immutable versions and explicit rollback without runtime activation', () => {
  // This is journal metadata correctness only, not an assessment of a real model or corpus.
  const contents = {
    schemaVersion: 'lilleri-promotion-assessment-v1',
    reasons: [],
    externalCalls: 0,
    policyVersion: 'shadow-policy-v2',
    policyDigest: sha256('policy-v2'),
    eligibleForHumanReview: true,
    report: { evidence: 'declared-authorized-offline-evaluation' },
    modelActivated: false,
  }
  const assessment = { ...contents, assessmentDigest: sha256(contents) }
  const journal = {
    activeVersion: 'shadow-policy-v1',
    knownVersions: [{ version: 'shadow-policy-v1', policyDigest: sha256('policy-v1') }],
    events: [],
  }
  const receipt = {
    action: 'approve',
    targetVersion: assessment.policyVersion,
    reviewReferenceDigest: sha256('explicit-local-review-v2'),
    occurredAt: NOW,
    reviewedAssessmentDigest: assessment.assessmentDigest,
    reviewedJournalDigest: sha256(journal),
  }
  const approved = policyTransition(journal, assessment, receipt)
  assert.equal(approved.activeVersion, 'shadow-policy-v2')
  assert.equal(journal.events.length, 0)
  assert.throws(
    () => policyTransition(journal, { ...assessment, policyDigest: sha256('tampered') }, receipt),
    /unreviewed-assessment/,
  )
  const changed = clone(approved)
  changed.events[0].afterVersion = 'another'
  assert.throws(
    () =>
      policyTransition(changed, assessment, { ...receipt, reviewedJournalDigest: sha256(changed) }),
    /journal-tampering/,
  )
  const rolled = policyTransition(approved, assessment, {
    ...receipt,
    action: 'rollback',
    targetVersion: 'shadow-policy-v1',
    reviewedAssessmentDigest: null,
    reviewedJournalDigest: sha256(approved),
  })
  assert.equal(rolled.activeVersion, 'shadow-policy-v1')
  assert.equal(rolled.events.length, 2)
  assert.equal(rolled.knownVersions[1].policyDigest, assessment.policyDigest)
  assert.throws(
    () =>
      policyTransition(rolled, assessment, {
        ...receipt,
        targetVersion: 'unknown',
        action: 'rollback',
        reviewedAssessmentDigest: null,
        reviewedJournalDigest: sha256(rolled),
      }),
    /unknown-rollback-version/,
  )
})
