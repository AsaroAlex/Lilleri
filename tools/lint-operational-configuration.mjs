import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

export const OPERATIONAL_CONFIGURATION_CONSUMERS = Object.freeze([
  'apps/api/src/retention-maintenance.ts',
  'apps/api/src/revocation-outbox.ts',
  'apps/api/src/retention-worker.ts',
  'apps/api/src/revocation-worker.ts',
  'apps/api/src/consent-lifecycle.ts',
  'apps/api/src/observability.ts',
  'apps/api/src/notifications.ts',
  'apps/api/src/notifications-maintenance.ts',
  'apps/api/src/understanding-service.ts',
  'apps/api/src/server.ts',
])
const fields = new Set([
  'intervalMs',
  'profileLimit',
  'payloadLimit',
  'batchLimit',
  'leaseMs',
  'maxAttempts',
  'attemptTimeoutMs',
  'traceSampleRatio',
  'metricsEnabled',
  'expiringOffsetSeconds',
  'eventsPerProfile',
  'expiryOffsetsSeconds',
  'inboxDailyLimit',
  'maxBalanceAgeMs',
  'occurrenceToleranceDays',
  'maxForecastOccurrences',
  'horizonDays',
])
function keyName(node) {
  if (node?.type === 'Identifier') return node.name
  if (node?.type === 'StringLiteral') return node.value
  return null
}
function unwrapped(node) {
  while (
    node &&
    [
      'TSAsExpression',
      'TSTypeAssertion',
      'TSNonNullExpression',
      'TSSatisfiesExpression',
      'ParenthesizedExpression',
    ].includes(node.type)
  )
    node = node.expression
  return node
}
function constantValue(expression, constants, seen = new Set()) {
  const node = unwrapped(expression)
  if (!node) return undefined
  if (node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') return node.value
  if (node.type === 'ArrayExpression') {
    const values = node.elements.map((item) => constantValue(item, constants, seen))
    return values.every((value) => value !== undefined) ? values : undefined
  }
  if (node.type === 'Identifier') {
    if (seen.has(node.name) || !constants.has(node.name)) return undefined
    return constantValue(constants.get(node.name), constants, new Set([...seen, node.name]))
  }
  if (node.type === 'UnaryExpression') {
    const value = constantValue(node.argument, constants, seen)
    if (typeof value !== 'number') return undefined
    if (node.operator === '+') return value
    if (node.operator === '-') return -value
    return undefined
  }
  if (node.type !== 'BinaryExpression') return undefined
  const left = constantValue(node.left, constants, seen),
    right = constantValue(node.right, constants, seen)
  if (typeof left !== 'number' || typeof right !== 'number') return undefined
  switch (node.operator) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      return left / right
    case '%':
      return left % right
    case '**':
      return left ** right
    default:
      return undefined
  }
}
function containsLiteralDefault(expression, constants, seen = new Set()) {
  const node = unwrapped(expression)
  if (constantValue(node, constants) !== undefined) return true
  if (node?.type === 'Identifier' && constants.has(node.name) && !seen.has(node.name))
    return containsLiteralDefault(
      constants.get(node.name),
      constants,
      new Set([...seen, node.name]),
    )
  if (node?.type === 'ArrayExpression')
    return node.elements.some((item) => containsLiteralDefault(item, constants, seen))
  if (node?.type === 'SpreadElement') return containsLiteralDefault(node.argument, constants, seen)
  if (node?.type === 'LogicalExpression' && ['??', '||'].includes(node.operator))
    return containsLiteralDefault(node.right, constants, seen)
  if (node?.type === 'ConditionalExpression')
    return (
      containsLiteralDefault(node.consequent, constants, seen) ||
      containsLiteralDefault(node.alternate, constants, seen)
    )
  return false
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit)
    return
  }
  if (typeof node.type === 'string') visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'comments', 'leadingComments', 'trailingComments'].includes(key))
      continue
    if (value && typeof value === 'object') walk(value, visit)
  }
}

/** Maintained fields/consumers only; safety comparisons and lifecycle policy bounds are allowed. */
export function lintOperationalConfiguration(source, file = 'consumer.ts') {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const constants = new Map()
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') continue
    for (const item of declaration.declarations)
      if (item.id.type === 'Identifier' && item.init) constants.set(item.id.name, item.init)
  }
  const diagnostics = []
  const check = (name, expression, node) => {
    if (!fields.has(name) || !containsLiteralDefault(expression, constants)) return
    diagnostics.push({
      file,
      line: node.loc?.start.line ?? 1,
      column: (node.loc?.start.column ?? 0) + 1,
      field: name,
      code: 'operational_configuration_literal',
    })
  }
  walk(ast, (node) => {
    if (node.type === 'ObjectProperty' && (!node.computed || node.key.type === 'StringLiteral'))
      check(keyName(node.key), node.value, node)
    else if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier')
      check(node.id.name, node.init, node)
    else if (node.type === 'AssignmentPattern' && node.left.type === 'Identifier')
      check(node.left.name, node.right, node)
    else if (node.type === 'AssignmentExpression') {
      const name =
        node.left.type === 'Identifier'
          ? node.left.name
          : node.left.type === 'MemberExpression' &&
              (!node.left.computed || node.left.property.type === 'StringLiteral')
            ? keyName(node.left.property)
            : null
      check(name, node.right, node)
    } else if (
      node.type === 'ClassProperty' &&
      (!node.computed || node.key.type === 'StringLiteral')
    )
      check(keyName(node.key), node.value, node)
  })
  return diagnostics
}

async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const diagnostics = (
    await Promise.all(
      OPERATIONAL_CONFIGURATION_CONSUMERS.map(async (file) =>
        lintOperationalConfiguration(await readFile(resolve(root, file), 'utf8'), file),
      ),
    )
  ).flat()
  if (diagnostics.length) {
    for (const issue of diagnostics)
      console.error(`${issue.file}:${issue.line}:${issue.column} ${issue.code} ${issue.field}`)
    process.exitCode = 1
  } else
    console.log(
      `Operational configuration lint passed (${OPERATIONAL_CONFIGURATION_CONSUMERS.length} consumers).`,
    )
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  void main().catch(() => {
    console.error('operational_configuration_lint_failed')
    process.exitCode = 1
  })
