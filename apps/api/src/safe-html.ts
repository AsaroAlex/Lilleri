// Escaping HTML builder for server-rendered public pages: literal template text is trusted;
// every interpolation is escaped unless it is itself the output of `html` (or `trusted`).

export class SafeHtml {
  readonly value: string
  constructor(value: string) {
    this.value = value
  }
}
export type Fragment = SafeHtml | string | number | false | null | undefined | readonly Fragment[]

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (match) => ESCAPES[match] ?? '')
const fragment = (value: Fragment): string => {
  if (value instanceof SafeHtml) return value.value
  if (Array.isArray(value)) return value.map(fragment).join('')
  if (value === false || value === null || value === undefined) return ''
  return escapeHtml(String(value))
}
export function html(strings: TemplateStringsArray, ...values: readonly Fragment[]): SafeHtml {
  let output = strings[0] ?? ''
  for (let index = 0; index < values.length; index++)
    output += fragment(values[index]) + (strings[index + 1] ?? '')
  return new SafeHtml(output)
}
/** Markup from the repository itself (stylesheets, brand SVGs); never request or user data. */
export const trusted = (value: string) => new SafeHtml(value)
