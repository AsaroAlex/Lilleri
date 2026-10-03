import { IntlMessageFormat } from 'intl-messageformat'
import { MESSAGE_PAIRS } from './catalogue'
import { PROBLEM_MESSAGES } from './problems'

const banned =
  /\b(?:AI-powered|magico|magica|rivoluzionario|rivoluzionaria|super|smart|premium|ottimizza|magic|magical|revolutionary|boost)\b|scopri il segreto|livello bancario/i
export function lintCopy(message: string): string[] {
  const errors: string[] = []
  if (message.includes('!')) errors.push('exclamation_mark')
  if (banned.test(message)) errors.push('banned_operational_copy')
  return errors
}
/** Traverse the official parser's AST; this does not parse ICU syntax itself. */
export function messageArguments(message: string): string[] {
  const names = new Set<string>()
  const visit = (elements: ReturnType<IntlMessageFormat['getAst']>) => {
    for (const element of elements) {
      if (element.type !== 0 && 'value' in element) names.add(element.value)
      if ('options' in element)
        for (const option of Object.values(element.options)) visit(option.value)
      if ('children' in element) visit(element.children)
    }
  }
  visit(new IntlMessageFormat(message, 'it-IT', undefined, { ignoreTag: true }).getAst())
  return [...names].sort()
}
export function validateMessageCatalogues(): string[] {
  const errors: string[] = []
  for (const [key, pair] of Object.entries({ ...MESSAGE_PAIRS, ...PROBLEM_MESSAGES })) {
    for (const [index, locale] of ['it-IT', 'en-GB'].entries()) {
      const message = pair[index]
      if (!message) {
        errors.push(`${key}:${locale}:missing`)
        continue
      }
      for (const error of lintCopy(message)) errors.push(`${key}:${locale}:${error}`)
      try {
        new IntlMessageFormat(message, locale, undefined, { ignoreTag: true })
      } catch {
        errors.push(`${key}:${locale}:invalid_icu`)
      }
    }
    try {
      if (JSON.stringify(messageArguments(pair[0])) !== JSON.stringify(messageArguments(pair[1])))
        errors.push(`${key}:argument_mismatch`)
    } catch {
      errors.push(`${key}:argument_invalid`)
    }
  }
  return errors
}
