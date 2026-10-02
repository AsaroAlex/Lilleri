// Conventional Commits check used by the commit-msg git hook (no external dependency).
// Accepts: type(scope)!: subject — types below; merge/revert/fixup commits are allowed.
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) process.exit(0)
const first = readFileSync(file, 'utf8').split('\n')[0]?.trim() ?? ''
const types = 'feat|fix|docs|chore|refactor|perf|test|build|ci|style|revert|research|design|brand'
const ok = new RegExp(`^(${types})(\\([a-z0-9-/]+\\))?!?: .{3,}`).test(first)
if (ok || /^(Merge|Revert|fixup!|squash!)/.test(first)) process.exit(0)
console.error(
  `\n✖ Commit message must follow Conventional Commits, e.g. "feat(reconciliation): pair internal transfers"\n  Allowed types: ${types.split('|').join(', ')}\n  Got: "${first}"\n`,
)
process.exit(1)
