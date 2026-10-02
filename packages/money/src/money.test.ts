import { describe, expect, it } from 'vitest'
import {
  abs,
  add,
  allocate,
  CurrencyMismatchError,
  compare,
  convert,
  equals,
  fromJson,
  InvalidAmountError,
  money,
  negate,
  parseDecimal,
  percentChangeBp,
  subtract,
  sum,
  toDecimalString,
  toJson,
  UnsupportedCurrencyError,
} from './index.js'

const eur = (minor: bigint | number) => money(minor, 'EUR')

describe('parseDecimal (provider amounts → minor units)', () => {
  it.each([
    ['-84.30', -8430n],
    ['84.3', 8430n],
    ['+0.99', 99n],
    ['1234', 123400n],
    ['0', 0n],
    ['12.300', 1230n],
    ['-0.01', -1n],
    ['9999999999999.99', 999999999999999n],
  ])('parses %s as %s minor units', (input, expected) => {
    expect(parseDecimal(input, 'EUR').amountMinor).toBe(expected)
  })

  it('respects the currency exponent', () => {
    expect(parseDecimal('1500', 'JPY').amountMinor).toBe(1500n)
    expect(parseDecimal('1.234', 'KWD').amountMinor).toBe(1234n)
    expect(() => parseDecimal('1500.5', 'JPY')).toThrow(InvalidAmountError)
  })

  it.each(['1,50', '1.234,56', '1e3', '', '-', '.5', '12.', 'abc', '1 000'])(
    'rejects ambiguous input %j',
    (input) => {
      expect(() => parseDecimal(input, 'EUR')).toThrow(InvalidAmountError)
    },
  )

  it('never rounds silently on ingestion', () => {
    expect(() => parseDecimal('12.345', 'EUR')).toThrow(/refusing to round/)
  })

  it('rejects unknown currencies', () => {
    expect(() => parseDecimal('1.00', 'XYZ')).toThrow(UnsupportedCurrencyError)
  })

  it('round-trips through toDecimalString', () => {
    for (const s of ['-84.30', '0.00', '0.01', '-0.01', '1234567.89']) {
      expect(toDecimalString(parseDecimal(s, 'EUR'))).toBe(s)
    }
    expect(toDecimalString(money(1500n, 'JPY'))).toBe('1500')
    expect(toDecimalString(money(-5n, 'KWD'))).toBe('-0.005')
  })
})

describe('arithmetic', () => {
  it('adds and subtracts exactly where floats would drift', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE 754; in minor units it is exact.
    expect(add(eur(10), eur(20))).toEqual(eur(30))
    let total = eur(0)
    for (let i = 0; i < 1000; i++) total = add(total, parseDecimal('0.10', 'EUR'))
    expect(total).toEqual(eur(10000))
    expect(subtract(eur(1000), eur(1001))).toEqual(eur(-1))
  })

  it('refuses to mix currencies', () => {
    expect(() => add(eur(1), money(1, 'USD'))).toThrow(CurrencyMismatchError)
    expect(() => compare(eur(1), money(1, 'GBP'))).toThrow(CurrencyMismatchError)
    expect(() => sum([eur(1), money(1, 'CHF')])).toThrow(CurrencyMismatchError)
  })

  it('handles very large values without precision loss', () => {
    const big = money(2n ** 70n, 'EUR')
    expect(add(big, eur(1)).amountMinor).toBe(2n ** 70n + 1n)
  })

  it('sum, negate, abs, compare, equals', () => {
    expect(sum([eur(-7999), eur(-2001), eur(10000)])).toEqual(eur(0))
    expect(() => sum([])).toThrow()
    expect(sum([], 'EUR')).toEqual(eur(0))
    expect(negate(eur(5))).toEqual(eur(-5))
    expect(abs(eur(-5))).toEqual(eur(5))
    expect(compare(eur(1), eur(2))).toBe(-1)
    expect(compare(eur(2), eur(2))).toBe(0)
    expect(equals(eur(2), money(2, 'USD'))).toBe(false)
  })

  it('rejects unsafe JS numbers as minor units', () => {
    expect(() => money(0.1, 'EUR')).toThrow(InvalidAmountError)
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, 'EUR')).toThrow(InvalidAmountError)
  })
})

describe('allocate (split-transaction invariant: children sum to parent)', () => {
  it('splits the Carrefour example exactly', () => {
    const parts = allocate(parseDecimal('-95.00', 'EUR'), [55, 25, 15])
    expect(parts.map(toDecimalString)).toEqual(['-55.00', '-25.00', '-15.00'])
  })

  it('distributes remainders deterministically', () => {
    expect(allocate(eur(1000), [1, 1, 1]).map((m) => m.amountMinor)).toEqual([334n, 333n, 333n])
    expect(allocate(eur(-1000), [1, 1, 1]).map((m) => m.amountMinor)).toEqual([-334n, -333n, -333n])
  })

  it('never allocates to zero-weight parts', () => {
    expect(allocate(eur(101), [1, 0, 1]).map((m) => m.amountMinor)).toEqual([51n, 0n, 50n])
  })

  it('always preserves the total (property check over many inputs)', () => {
    let seed = 42
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    for (let i = 0; i < 2000; i++) {
      const amount = BigInt(rnd(2_000_000) - 1_000_000)
      const ratios = Array.from({ length: 1 + rnd(6) }, () => rnd(100))
      if (!ratios.some((r) => r > 0)) ratios[0] = 1
      const parts = allocate(eur(amount), ratios)
      expect(sum(parts).amountMinor).toBe(amount)
    }
  })

  it('validates ratios', () => {
    expect(() => allocate(eur(1), [])).toThrow()
    expect(() => allocate(eur(1), [0, 0])).toThrow()
    expect(() => allocate(eur(1), [-1, 2])).toThrow()
  })
})

describe('convert (FX for normalised analytics only)', () => {
  it('converts with a decimal rate and rounds once, half-even', () => {
    expect(convert(parseDecimal('100.00', 'USD'), '0.9231', 'EUR')).toEqual(eur(9231))
    expect(convert(parseDecimal('10.00', 'GBP'), '1.17655', 'EUR')).toEqual(eur(1177)) // 11.7655 → 11.77 (half-even: 5 after odd 6 → up)
    expect(convert(parseDecimal('0.05', 'EUR'), '0.5', 'EUR')).toEqual(eur(2)) // 2.5 → 2 (even)
    expect(convert(parseDecimal('0.07', 'EUR'), '0.5', 'EUR')).toEqual(eur(4)) // 3.5 → 4 (even)
    expect(convert(parseDecimal('-0.07', 'EUR'), '0.5', 'EUR')).toEqual(eur(-4))
  })

  it('handles exponent changes between currencies', () => {
    expect(convert(parseDecimal('1.00', 'EUR'), '162.35', 'JPY')).toEqual(money(162n, 'JPY'))
    expect(convert(money(1000n, 'JPY'), '0.00616', 'EUR')).toEqual(eur(616))
  })

  it('rejects invalid rates', () => {
    expect(() => convert(eur(1), '0', 'USD')).toThrow()
    expect(() => convert(eur(1), '-1', 'USD')).toThrow()
    expect(() => convert(eur(1), '1,2', 'USD')).toThrow()
  })
})

describe('percentChangeBp', () => {
  it('computes basis points', () => {
    expect(percentChangeBp(eur(6364), eur(8400))).toBe(3199n) // +31.99%
    expect(percentChangeBp(eur(10000), eur(8600))).toBe(-1400n)
    expect(percentChangeBp(eur(0), eur(100))).toBeNull()
  })
})

describe('JSON representation', () => {
  it('serialises minor units as strings', () => {
    expect(toJson(eur(-8430))).toEqual({ amountMinor: '-8430', currency: 'EUR' })
    expect(fromJson({ amountMinor: '-8430', currency: 'EUR' })).toEqual(eur(-8430))
    expect(() => fromJson({ amountMinor: '-84.30', currency: 'EUR' })).toThrow(InvalidAmountError)
    expect(JSON.stringify(toJson(eur(1)))).toBe('{"amountMinor":"1","currency":"EUR"}')
  })
})
