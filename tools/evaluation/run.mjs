import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CURRENT_TAXONOMY } from '../../packages/domain/dist/index.js'
import { parseEvaluationArguments } from './arguments.mjs'
import { validateCorpus } from './dataset-contract.mjs'
import { assessCandidate } from './promotion.mjs'

const args = parseEvaluationArguments(process.argv.slice(2))
const output = resolve(args.output),
  inputs = ['dataset', 'calibration', 'test', 'policy'].map((key) => resolve(args[key]))
if (inputs.includes(output)) throw new Error('Output cannot overwrite an input')
const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
const [dataset, calibration, test, policy] = await Promise.all(inputs.map(read))
const approvedCatalogue = {
  version: CURRENT_TAXONOMY.version,
  parents: CURRENT_TAXONOMY.parents.map((row) => row.id),
  leaves: CURRENT_TAXONOMY.leaves.map((row) => ({
    code: row.code,
    parent: row.group,
    quiet: row.quiet === true,
  })),
}
const corpus = validateCorpus(dataset, {
  expectedDigest: args['manifest-sha256'],
  approvedCatalogue,
  now: args.now ?? new Date().toISOString(),
})
const assessment = assessCandidate(corpus, calibration, test, policy)
// Exclusive creation also protects frozen input files reached by a symlink or alternative path.
await writeFile(output, `${JSON.stringify(assessment, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
process.stdout.write(
  `${JSON.stringify({ output, assessmentDigest: assessment.assessmentDigest, eligibleForHumanReview: assessment.eligibleForHumanReview, reasons: assessment.reasons, modelActivated: false })}\n`,
)
if (!assessment.eligibleForHumanReview) process.exitCode = 2
