import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

export const UI_COPY_CONSUMERS = Object.freeze([
  'apps/mobile/App.tsx',
  'apps/mobile/ConnectionsPanel.tsx',
  'apps/mobile/src/BankConnectionPicker.tsx',
  'apps/mobile/MappedImportPanel.tsx',
  'apps/mobile/ImportManualPanel.tsx',
  'apps/mobile/MerchantPanel.tsx',
  'apps/mobile/RecurringPanel.tsx',
  'apps/mobile/PrivacyControlsPanel.tsx',
  'apps/mobile/UnderstandingPanel.tsx',
  'apps/mobile/src/SettingsPanel.tsx',
  'apps/mobile/src/NotificationsPanel.tsx',
  'apps/mobile/src/RulesPanel.tsx',
  'apps/mobile/src/LocalIdentityPanel.tsx',
  'apps/mobile/src/LanguagePicker.tsx',
])
const attributes = new Set(['accessibilityLabel', 'accessibilityHint', 'placeholder', 'title'])
// Brand names, language autonyms and literal technical formats are not translated financial copy.
const invariant = new Set(['Lilleri', 'LL', 'Italiano', 'English', 'UTC', 'CSV', 'XLSX', 'EUR'])
const human = (value) => /\p{L}/u.test(value) && !invariant.has(value.trim())

/** Parse actual JSX; comments, URLs, selectors, original user values and technical IDs are not product copy. */
export function lintUiCopy(source) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  const violations = []
  const validationClasses = new Map()
  const visitNodes = (node, work) => {
    if (!node || typeof node !== 'object') return
    work(node)
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end'].includes(key)) continue
      if (Array.isArray(value)) for (const child of value) visitNodes(child, work)
      else visitNodes(value, work)
    }
  }
  visitNodes(ast, (node) => {
    if (
      node.type === 'ClassDeclaration' &&
      node.superClass?.name === 'Error' &&
      !node.body.body.length
    )
      validationClasses.set(node.id.name, { uses: 0, valid: true })
  })
  visitNodes(ast, (node) => {
    if (node.type !== 'NewExpression' || !validationClasses.has(node.callee?.name)) return
    const state = validationClasses.get(node.callee.name)
    const argument = node.arguments[0]
    state.uses++
    state.valid &&=
      argument?.type === 'CallExpression' &&
      (argument.callee?.name === 't' ||
        (argument.callee?.type === 'MemberExpression' && argument.callee.property?.name === 't')) &&
      argument.arguments[0]?.type === 'StringLiteral' &&
      /^[A-Za-z]\w*\.[\w.]+$/.test(argument.arguments[0].value)
  })
  const boundedValidation = (node, ancestors) =>
    ancestors.some((branch) => {
      if (branch.type !== 'ConditionalExpression') return false
      const check = branch.test
      const state = validationClasses.get(check.right?.name)
      return (
        check.type === 'BinaryExpression' &&
        check.operator === 'instanceof' &&
        check.left?.name === node.object?.name &&
        state?.valid &&
        state.uses > 0 &&
        branch.consequent.start <= node.start &&
        branch.consequent.end >= node.end
      )
    })
  const report = (node, reason) => violations.push({ line: node.loc.start.line, reason })
  const walk = (node, parent, ancestors) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'JSXText' && human(node.value.replace(/\s+/g, ' ').trim()))
      report(node, 'uncatalogued_jsx_text')
    if (node.type === 'StringLiteral') {
      if (parent?.type === 'JSXAttribute' && attributes.has(parent.name.name) && human(node.value))
        report(node, 'uncatalogued_accessible_copy')
      else if (parent?.type === 'JSXExpressionContainer' && human(node.value))
        report(node, 'uncatalogued_rendered_literal')
      else if (
        parent?.type === 'CallExpression' &&
        ['button', 'field'].includes(parent.callee?.name) &&
        parent.arguments[0] === node &&
        human(node.value)
      )
        report(node, 'uncatalogued_control_copy')
    }
    if (node.type === 'TemplateLiteral' && parent?.type === 'JSXExpressionContainer') {
      const container = ancestors.at(-2)
      const visible =
        container?.type === 'JSXElement' ||
        (container?.type === 'JSXAttribute' && attributes.has(container.name.name))
      if (visible && node.quasis.some((part) => human(part.value.cooked ?? part.value.raw)))
        report(node, 'uncatalogued_template_copy')
    }
    if (
      node.type === 'MemberExpression' &&
      !node.computed &&
      ['message', 'detail', 'explanationIt'].includes(node.property.name) &&
      !(node.property.name === 'detail' && node.object?.name === 's') &&
      !(node.property.name === 'message' && boundedValidation(node, ancestors)) &&
      (ancestors.some((entry) => entry.type === 'JSXExpressionContainer') ||
        (['cause', 'error', 'refreshCause'].includes(node.object?.name) &&
          ancestors.some(
            (entry) => entry.type === 'CallExpression' && entry.callee?.name === 'setError',
          )))
    )
      report(node, 'untrusted_or_single_language_error_copy')
    if (
      ['NewExpression', 'CallExpression'].includes(node.type) &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.object?.name === 'Intl' &&
      ['DateTimeFormat', 'NumberFormat'].includes(node.callee.property?.name) &&
      node.arguments[0]?.type === 'StringLiteral' &&
      // The machine YYYY-MM-DD builder preserves the profile calendar; it is not display copy.
      !(
        node.callee.property.name === 'DateTimeFormat' &&
        node.arguments[0].value === 'en-CA' &&
        parent?.type === 'MemberExpression' &&
        parent.property?.name === 'formatToParts'
      )
    )
      report(node, 'fixed_display_locale')
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end'].includes(key)) continue
      if (Array.isArray(value)) for (const child of value) walk(child, node, [...ancestors, node])
      else walk(value, node, [...ancestors, node])
    }
  }
  walk(ast, null, [])
  return violations
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let failures = 0
  for (const file of UI_COPY_CONSUMERS) {
    for (const violation of lintUiCopy(await readFile(file, 'utf8'))) {
      console.error(`${file}:${violation.line}: ${violation.reason}`)
      failures++
    }
  }
  if (failures) process.exitCode = 1
  else console.log(`Catalogue copy guard passed (${UI_COPY_CONSUMERS.length} UI consumers)`)
}
