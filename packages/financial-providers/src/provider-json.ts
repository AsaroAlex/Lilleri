/** JSON numeric lexemes stay exact until their currency/integer semantics are known. */
export class ProviderJsonNumber {
  constructor(readonly source: string) {}
}

/** Bounded JSON parser: rejects duplicate keys, dangerous keys and excessive nesting. */
export function parseProviderJson(input: string): unknown {
  let offset = 0
  let nodes = 0
  const invalid = (): never => {
    throw new Error('invalid_provider_json')
  }
  const space = () => {
    while (/^[\t\n\r ]$/u.test(input[offset] ?? '')) offset++
  }
  const string = (): string => {
    const start = offset++
    while (offset < input.length) {
      const character = input[offset++]
      if (character === '\\') offset++
      else if (character === '"') {
        const result: unknown = JSON.parse(input.slice(start, offset))
        return typeof result === 'string' ? result : invalid()
      }
    }
    return invalid()
  }
  const value = (depth: number): unknown => {
    if (depth > 32 || ++nodes > 50_000) return invalid()
    space()
    const character = input[offset]
    if (character === '"') return string()
    if (character === '{') {
      offset++
      const result: Record<string, unknown> = Object.create(null)
      space()
      if (input[offset] === '}') {
        offset++
        return result
      }
      while (offset < input.length) {
        space()
        if (input[offset] !== '"') return invalid()
        const key = string()
        if (Object.hasOwn(result, key) || ['__proto__', 'constructor', 'prototype'].includes(key))
          return invalid()
        space()
        if (input[offset++] !== ':') return invalid()
        result[key] = value(depth + 1)
        space()
        const separator = input[offset++]
        if (separator === '}') return result
        if (separator !== ',') return invalid()
      }
      return invalid()
    }
    if (character === '[') {
      offset++
      const result: unknown[] = []
      space()
      if (input[offset] === ']') {
        offset++
        return result
      }
      while (offset < input.length) {
        result.push(value(depth + 1))
        space()
        const separator = input[offset++]
        if (separator === ']') return result
        if (separator !== ',') return invalid()
      }
      return invalid()
    }
    for (const [literal, result] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ] as const) {
      if (input.startsWith(literal, offset)) {
        offset += literal.length
        return result
      }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(input.slice(offset))?.[0]
    if (!number || number.length > 80) return invalid()
    offset += number.length
    return new ProviderJsonNumber(number)
  }
  const result = value(0)
  space()
  if (offset !== input.length) return invalid()
  return result
}
