import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  evaluateClassifications,
  evaluateReconciliation,
} from '../packages/engines/dist/evaluation.js'
import { analyse, ENGINE_VERSION } from '../packages/engines/dist/index.js'
import {
  normalizeAccount,
  normalizeTransaction,
} from '../packages/financial-providers/dist/index.js'

const DEFAULT_FIXTURE = fileURLToPath(
  new URL('../fixtures/evaluation/synthetic-v1.json', import.meta.url),
)
// A changed byte needs a new reviewed fixture version. This runner has no training mode or dataset.
const FROZEN_DIGESTS = {
  'original-synthetic-v1': 'ca501740c90f083c0e404972465d17e89431ca3e4600b96f2698470073596d95',
}

function argumentsFrom(args) {
  const result = { fixture: DEFAULT_FIXTURE, output: null, measureLatency: false }
  for (const arg of args) {
    if (arg.startsWith('--fixture=')) result.fixture = resolve(arg.slice('--fixture='.length))
    else if (arg.startsWith('--output=')) result.output = resolve(arg.slice('--output='.length))
    else if (arg === '--measure-latency') result.measureLatency = true
    else throw new Error('Supported arguments: --fixture=PATH --output=PATH --measure-latency')
  }
  if (result.output === result.fixture || result.output === DEFAULT_FIXTURE)
    throw new Error('Cannot overwrite the frozen fixture')
  return result
}

const relationshipKey = (type, transactionIds) => JSON.stringify([type, [...transactionIds].sort()])
const sumRate = (count, denominator) => ({
  numerator: count,
  denominator,
  value: denominator === 0 ? null : count / denominator,
})

function assertUniqueIds(rows) {
  if (rows.some((row) => typeof row.id !== 'string' || !row.id))
    throw new Error('Missing synthetic fixture identity')
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error('Duplicate synthetic fixture identity')
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length === 0 ? null : sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}

async function run() {
  const args = argumentsFrom(process.argv.slice(2))
  const bytes = await readFile(args.fixture)
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (!Object.values(FROZEN_DIGESTS).includes(digest))
    throw new Error('Unreviewed, changed or non-evaluation fixture refused')
  const fixture = JSON.parse(bytes.toString('utf8'))
  if (
    fixture.format !== 'lilleri.synthetic-evaluation.v1' ||
    fixture.source !== 'original-synthetic' ||
    fixture.split !== 'frozen-evaluation-only' ||
    fixture.quietSetExcluded !== true ||
    FROZEN_DIGESTS[fixture.version] !== digest
  )
    throw new Error('Unreviewed, changed or non-evaluation fixture refused')
  assertUniqueIds(fixture.scenarios)
  const classificationRows = []
  const relationshipRows = []
  const latencies = []
  const strata = new Map()
  let unexpectedRelationships = 0
  let inputTransactions = 0
  let preservedDescriptions = 0
  for (const scenario of fixture.scenarios) {
    assertUniqueIds(scenario.accounts)
    assertUniqueIds(scenario.transactions)
    const context = {
      profileId: `synthetic-profile:${scenario.id}`,
      connectionId: `synthetic-connection:${scenario.id}`,
    }
    const started = args.measureLatency ? performance.now() : null
    const accounts = scenario.accounts.map((record) =>
      normalizeAccount('synthetic-eval', context, record, fixture.observedAt),
    )
    const transactions = scenario.transactions.map((record) =>
      normalizeTransaction('synthetic-eval', context, record, fixture.observedAt),
    )
    const byProviderId = new Map(transactions.map((row) => [row.providerTransactionId, row]))
    const options = {
      rules: (scenario.options?.rules ?? []).map((rule) => ({
        ...rule,
        profileId: context.profileId,
      })),
      preferences: (scenario.options?.preferences ?? []).map((preference) => ({
        ...preference,
        profileId: context.profileId,
      })),
      userClassifications: Object.fromEntries(
        Object.entries(scenario.options?.userClassifications ?? {}).map(([id, category]) => {
          const transaction = byProviderId.get(id)
          if (!transaction) throw new Error('User correction references missing fixture row')
          return [transaction.id, category]
        }),
      ),
    }
    // Actual outputs are computed without passing evaluation annotations into the engine.
    const actual = analyse(accounts, transactions, options)
    if (started !== null) latencies.push(performance.now() - started)
    inputTransactions += transactions.length
    const stratumCount = strata.get(scenario.stratum) ?? { scenarios: 0, transactions: 0 }
    strata.set(scenario.stratum, {
      scenarios: stratumCount.scenarios + 1,
      transactions: stratumCount.transactions + transactions.length,
    })
    for (const [index, transaction] of transactions.entries()) {
      if (transaction.description === scenario.transactions[index].description)
        preservedDescriptions += 1
    }
    const expectedById = new Map(
      scenario.expected.classifications.map((row) => [row.transactionId, row]),
    )
    if (
      expectedById.size !== transactions.length ||
      scenario.expected.classifications.length !== transactions.length ||
      [...expectedById.keys()].some((id) => !byProviderId.has(id))
    )
      throw new Error('Frozen classification fixture must annotate every input exactly once')
    const actualById = new Map(actual.classifications.map((row) => [row.transactionId, row]))
    for (const transaction of transactions) {
      const expected = expectedById.get(transaction.providerTransactionId)
      const output = actualById.get(transaction.id)
      if (!output) throw new Error('Engine omitted a classification output')
      classificationRows.push({
        id: `${scenario.id}:${transaction.providerTransactionId}`,
        stratum: scenario.stratum,
        expected: { categoryId: expected.categoryId, needsReview: expected.needsReview },
        actual: output,
      })
    }
    const expectedRelationships = new Map()
    for (const label of scenario.expected.relationships) {
      if (label.transactionIds.length !== 2 || new Set(label.transactionIds).size !== 2)
        throw new Error('Fixture relationship must label two distinct source rows')
      const ids = label.transactionIds.map((id) => {
        const transaction = byProviderId.get(id)
        if (!transaction) throw new Error('Relationship annotation references missing fixture row')
        return transaction.id
      })
      const key = relationshipKey(label.type, ids)
      if (expectedRelationships.has(key)) throw new Error('Duplicate relationship annotation')
      expectedRelationships.set(key, { ...label, transactionIds: ids })
    }
    const actualRelationships = new Map(
      actual.matches.map((match) => [relationshipKey(match.type, match.transactionIds), match]),
    )
    if (actualRelationships.size !== actual.matches.length)
      throw new Error('Engine returned duplicate relationship identity')
    for (const [key, label] of expectedRelationships) {
      relationshipRows.push({
        id: `${scenario.id}:${key}`,
        type: label.type,
        expected: label.state,
        actual: actualRelationships.get(key)?.state ?? 'absent',
      })
    }
    for (const [key, match] of actualRelationships) {
      if (expectedRelationships.has(key)) continue
      // Unexpected output lacks ground truth. Count the gap; do not silently label it correct/incorrect.
      unexpectedRelationships += 1
      relationshipRows.push({
        id: `${scenario.id}:${key}`,
        type: match.type,
        expected: null,
        actual: match.state,
      })
    }
  }
  const classification = evaluateClassifications(classificationRows)
  const reconciliation = evaluateReconciliation(relationshipRows)
  const regressionPassed =
    classification.annotationAgreement.numerator ===
      classification.annotationAgreement.denominator &&
    reconciliation.annotationAgreement.numerator ===
      reconciliation.annotationAgreement.denominator &&
    unexpectedRelationships === 0 &&
    preservedDescriptions === inputTransactions
  const report = {
    format: 'lilleri.synthetic-evaluation-report.v1',
    fixture: {
      version: fixture.version,
      sha256: digest,
      split: fixture.split,
      source: fixture.source,
      scenarios: fixture.scenarios.length,
      transactions: inputTransactions,
      strata: Object.fromEntries([...strata].sort(([a], [b]) => a.localeCompare(b))),
      quietSetExcluded: true,
      annotation: 'Single author, original synthetic cases; no independent or live audit.',
    },
    engineVersion: ENGINE_VERSION,
    evidenceBoundary:
      'Synthetic regression evidence only. Not representative accuracy, calibration, live-bank coverage or release approval.',
    regressionPassed,
    classification,
    reconciliation,
    guardrails: {
      sourceDescriptionsPreserved: sumRate(preservedDescriptions, inputTransactions),
      unexpectedUnlabelledRelationships: unexpectedRelationships,
      externalCalls: 0,
      trainingPerformed: false,
    },
    notMeasured: {
      kind: 'Kind is a provider input; this engine does not predict it.',
      hierarchicalCredit:
        'The running engine uses flat category ids, not canonical leaf predictions.',
      calibration: 'No calibrated model, probability estimates or independent calibration set.',
      costPer1000: 'Local compute cost is not instrumented; no purchased model calls.',
      schemaFailureRate: 'No external model schema; invalid fixtures stop execution.',
      liveDrift: 'No consented live sample or bank cohorts.',
      quietSetInsights:
        'This dataset excludes quiet categories; it does not validate all insight surfaces.',
    },
    measuredLocalLatency: args.measureLatency
      ? {
          unit: 'milliseconds',
          scope:
            'Per-scenario normalization and analyse, one local process; not end-to-end or load evidence.',
          samples: latencies.length,
          p50: percentile(latencies, 0.5),
          p95: percentile(latencies, 0.95),
        }
      : null,
  }
  const json = `${JSON.stringify(report, null, 2)}\n`
  if (args.output) await writeFile(args.output, json, { mode: 0o600 })
  process.stdout.write(json)
  if (!regressionPassed) process.exitCode = 1
}

await run().catch((error) => {
  process.stderr.write(`Synthetic evaluation failed: ${error.message}\n`)
  process.exitCode = 1
})
