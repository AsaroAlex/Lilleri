import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { policyTransition } from './promotion.mjs'

const allowed = ['journal', 'assessment', 'receipt', 'output'],
  args = {}
for (const raw of process.argv.slice(2)) {
  const match = /^--([a-z]+)=(.+)$/u.exec(raw)
  if (!match || !allowed.includes(match[1]) || Object.hasOwn(args, match[1]))
    throw new Error('Use exactly --journal=PATH --assessment=PATH --receipt=PATH --output=NEW_PATH')
  args[match[1]] = match[2]
}
if (allowed.some((key) => !args[key]))
  throw new Error('Journal, assessment, explicit review receipt and new output path are required')
const inputs = ['journal', 'assessment', 'receipt'].map((key) => resolve(args[key])),
  output = resolve(args.output)
if (inputs.includes(output)) throw new Error('Output cannot overwrite an input')
const [journal, assessment, receipt] = await Promise.all(
  inputs.map(async (path) => JSON.parse(await readFile(path, 'utf8'))),
)
const next = policyTransition(journal, assessment, receipt)
await writeFile(output, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
process.stdout.write(
  `${JSON.stringify({ output, activeVersion: next.activeVersion, eventCount: next.events.length, modelActivated: false, externalCalls: 0 })}\n`,
)
