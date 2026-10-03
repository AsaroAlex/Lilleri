import type { MessageKey } from './catalogue'
import type { MessageValues, Translator } from './index'
import { PROBLEM_MESSAGES } from './problems'

/** Store copy keys and safe public codes, so a locale change does not retain old-language errors. */
export type UiMessage =
  | MessageKey
  | { readonly key: MessageKey; readonly values: MessageValues }
  | { readonly problemCode: string }

export class UiValidationError extends Error {
  constructor(readonly copyKey: MessageKey) {
    super('invalid_display_input')
  }
}

export function displayMessage(translator: Translator, value: UiMessage): string {
  if (typeof value === 'string') return translator.t(value)
  if ('key' in value) return translator.t(value.key, value.values)
  return translator.problemMessage(value.problemCode)
}

/** Call the original parent error handler first; this function cannot inspect exception detail. */
export function displayProblem(cause: unknown, fallback: MessageKey): UiMessage {
  if (cause instanceof UiValidationError) return cause.copyKey
  if (cause && typeof cause === 'object' && 'code' in cause) {
    const code = cause.code
    if (typeof code === 'string' && Object.hasOwn(PROBLEM_MESSAGES, code))
      return { problemCode: code }
  }
  return fallback
}
