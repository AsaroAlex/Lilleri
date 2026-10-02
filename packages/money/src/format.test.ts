import { describe, expect, it } from 'vitest'
import {
  formatMoney,
  formatMoneyAccessibleIt,
  money,
  parseDecimal,
  type SupportedLocale,
} from './index.js'

const NBSP = ' '
const MINUS = '−'
const eur = (s: string) => parseDecimal(s, 'EUR')

describe('formatMoney — Italian defaults', () => {
  it.each([
    ['12438.72', `12.438,72${NBSP}€`],
    ['1234.56', `1.234,56${NBSP}€`], // grouping from 1.000 (CLDR would print 1234,56)
    ['999.99', `999,99${NBSP}€`],
    ['0', `0,00${NBSP}€`],
    ['0.05', `0,05${NBSP}€`],
    ['1234567.89', `1.234.567,89${NBSP}€`],
    ['-84.30', `${MINUS}84,30${NBSP}€`],
    ['-1234.56', `${MINUS}1.234,56${NBSP}€`],
  ])('%s → %j', (input, expected) => {
    expect(formatMoney(eur(input))).toBe(expected)
  })

  it('symbol-first variant for balance headers', () => {
    expect(formatMoney(eur('12438.72'), { symbolPosition: 'before' })).toBe(`€${NBSP}12.438,72`)
    expect(formatMoney(eur('-12348.92'), { symbolPosition: 'before' })).toBe(
      `${MINUS}€${NBSP}12.348,92`,
    )
  })

  it('sign options', () => {
    expect(formatMoney(eur('2350'), { sign: 'exceptZero' })).toBe(`+2.350,00${NBSP}€`)
    expect(formatMoney(eur('0'), { sign: 'exceptZero' })).toBe(`0,00${NBSP}€`)
    expect(formatMoney(eur('-15.99'), { sign: 'never' })).toBe(`15,99${NBSP}€`)
    expect(formatMoney(eur('-15.99'), { minus: 'ascii' })).toBe(`-15,99${NBSP}€`)
  })

  it('other currencies and display options', () => {
    expect(formatMoney(money(-123456n, 'GBP'))).toBe(`${MINUS}1.234,56${NBSP}£`)
    expect(formatMoney(money(150000n, 'JPY'))).toBe(`150.000${NBSP}¥`)
    expect(formatMoney(money(1999n, 'CHF'))).toBe(`19,99${NBSP}CHF`)
    expect(formatMoney(money(1999n, 'SEK'))).toBe(`19,99${NBSP}SEK`)
    expect(formatMoney(eur('12'), { currencyDisplay: 'code' })).toBe(`12,00${NBSP}EUR`)
    expect(formatMoney(eur('1200'), { trimZeroFraction: true })).toBe(`1.200${NBSP}€`)
    expect(formatMoney(eur('1200.50'), { trimZeroFraction: true })).toBe(`1.200,50${NBSP}€`)
    expect(formatMoney(money(-1234n, 'KWD'))).toBe(`${MINUS}1,234${NBSP}KWD`)
  })
})

describe('formatMoney — other EU locales', () => {
  it.each<[SupportedLocale, string, string]>([
    ['de-DE', '-1234.56', `${MINUS}1.234,56${NBSP}€`],
    ['es-ES', '-1234.56', `${MINUS}1.234,56${NBSP}€`],
    ['fr-FR', '-1234.56', `${MINUS}1${NBSP}234,56${NBSP}€`],
    ['nl-NL', '-1234.56', `${MINUS}€${NBSP}1.234,56`],
    ['en-GB', '-1234.56', `${MINUS}€1,234.56`],
    ['en-IE', '12438.72', '€12,438.72'],
  ])('%s %s', (locale, input, expected) => {
    expect(formatMoney(eur(input), { locale })).toBe(expected)
  })

  it('code-like symbols are always spaced in symbol-first locales', () => {
    expect(formatMoney(money(1999n, 'CHF'), { locale: 'en-GB' })).toBe(`CHF${NBSP}19.99`)
  })
})

describe('agreement with ICU (Node Intl) where Lilleri does not deviate on purpose', () => {
  // Deviations: grouping always, U+2212 minus, NBSP instead of U+202F. Normalise ICU to them.
  const icu = (locale: string, value: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', useGrouping: 'always' })
      .format(value)
      .replace(/ /g, NBSP)
      .replace(/^-/, MINUS)
      .replace(/-(?=€)/, MINUS)

  it.each<[SupportedLocale, string]>([
    ['it-IT', '12438.72'],
    ['it-IT', '-1234.56'],
    ['it-IT', '0.5'],
    ['de-DE', '1234567.89'],
    ['es-ES', '-1234.56'],
    ['fr-FR', '12438.72'],
    ['en-GB', '12438.72'],
    ['en-IE', '-0.99'],
  ])('%s %s matches ICU after normalisation', (locale, input) => {
    expect(formatMoney(eur(input), { locale })).toBe(icu(locale, Number(input)))
  })
})

describe('accessible long form (Italian)', () => {
  it('reads naturally for screen readers', () => {
    expect(formatMoneyAccessibleIt(eur('-84.30'))).toBe('meno 84,30 euro')
    expect(formatMoneyAccessibleIt(eur('1234.56'))).toBe('1.234,56 euro')
    expect(formatMoneyAccessibleIt(money(100n, 'USD'))).toBe('1,00 dollaro statunitense')
    expect(formatMoneyAccessibleIt(money(250n, 'USD'))).toBe('2,50 dollari statunitensi')
  })
})
