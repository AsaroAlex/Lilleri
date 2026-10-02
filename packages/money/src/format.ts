import { type CurrencyCode, currencyExponent } from './currency.js'
import type { Money } from './money.js'

/**
 * Pure amount formatter driven by a pinned locale table.
 *
 * Why not `Intl.NumberFormat` at runtime: React Native's Hermes engine lacks `formatToParts` on
 * iOS and does not support `signDisplay`/compact notation there, and platform ICU versions differ
 * between devices, servers and PDF exports. Lilleri must render the same string everywhere, so the
 * rules are encoded here and unit-tested against Node's ICU output
 * (docs/research/raw/typography-options.md §10).
 *
 * Deliberate deviations from CLDR, all documented decisions:
 * - Grouping always starts at 1.000 (CLDR it/es set minimumGroupingDigits = 2 → "1234,56 €").
 * - The minus sign is U+2212 by default (typographic minus; screen readers say "meno"/"minus").
 * - The space between number and symbol is always U+00A0 (fr-FR narrow NBSP U+202F → U+00A0,
 *   because the brand fonts lack U+202F).
 * - `symbolPosition: 'before'` renders "€ 12.438,72" for balance headers and amount columns; it is
 *   never mixed with the locale order within one screen.
 */

export type SupportedLocale = 'it-IT' | 'en-GB' | 'en-IE' | 'de-DE' | 'fr-FR' | 'es-ES' | 'nl-NL'

interface LocaleRules {
  readonly group: string
  readonly decimal: string
  /** true → "12,00 €"; false → "€12.00" */
  readonly symbolAfter: boolean
  /** space between symbol and number in the locale order */
  readonly spaced: boolean
}

const NBSP = ' '
const UNICODE_MINUS = '−'

const LOCALES: Record<SupportedLocale, LocaleRules> = {
  'it-IT': { group: '.', decimal: ',', symbolAfter: true, spaced: true },
  'de-DE': { group: '.', decimal: ',', symbolAfter: true, spaced: true },
  'es-ES': { group: '.', decimal: ',', symbolAfter: true, spaced: true },
  'fr-FR': { group: NBSP, decimal: ',', symbolAfter: true, spaced: true },
  'nl-NL': { group: '.', decimal: ',', symbolAfter: false, spaced: true },
  'en-GB': { group: ',', decimal: '.', symbolAfter: false, spaced: false },
  'en-IE': { group: ',', decimal: '.', symbolAfter: false, spaced: false },
}

const SYMBOLS: Partial<Record<CurrencyCode, string>> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
  JPY: '¥',
  CHF: 'CHF',
}

export interface FormatOptions {
  readonly locale?: SupportedLocale
  /** 'locale' follows the locale order; 'before' always puts the symbol first ("€ 12.438,72"). */
  readonly symbolPosition?: 'locale' | 'before'
  /** 'auto': minus only; 'exceptZero': explicit + for positive deltas; 'never': magnitude only. */
  readonly sign?: 'auto' | 'exceptZero' | 'never'
  /** 'unicode' → U+2212 (display); 'ascii' → "-" (CSV, inputs). */
  readonly minus?: 'unicode' | 'ascii'
  /** Hide the fraction when it is zero, e.g. for budget targets ("1.200 €"). */
  readonly trimZeroFraction?: boolean
  /** Show the ISO code instead of a symbol ("12,00 EUR"). */
  readonly currencyDisplay?: 'symbol' | 'code'
}

function groupDigits(digits: string, separator: string): string {
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i
    out += digits[i]
    if (fromEnd > 1 && fromEnd % 3 === 1) out += separator
  }
  return out
}

export function formatMoney(value: Money, options: FormatOptions = {}): string {
  const locale = options.locale ?? 'it-IT'
  const rules = LOCALES[locale]
  const exponent = currencyExponent(value.currency)
  const negative = value.amountMinor < 0n
  const magnitude = negative ? -value.amountMinor : value.amountMinor
  const raw = magnitude.toString().padStart(exponent + 1, '0')
  const intDigits = exponent === 0 ? raw : raw.slice(0, raw.length - exponent)
  let fraction = exponent === 0 ? '' : raw.slice(raw.length - exponent)
  if (options.trimZeroFraction && /^0*$/.test(fraction)) fraction = ''

  const number = groupDigits(intDigits, rules.group) + (fraction ? rules.decimal + fraction : '')
  const symbol =
    options.currencyDisplay === 'code'
      ? value.currency
      : (SYMBOLS[value.currency] ?? value.currency)
  const isCodeLike = /^[A-Z]{2,3}$/.test(symbol)

  const sign = options.sign ?? 'auto'
  const minus = options.minus === 'ascii' ? '-' : UNICODE_MINUS
  let signText = ''
  if (sign !== 'never') {
    if (negative) signText = minus
    else if (sign === 'exceptZero' && magnitude > 0n) signText = '+'
  }

  const position = options.symbolPosition ?? 'locale'
  if (position === 'before') {
    return `${signText}${symbol}${NBSP}${number}`
  }
  if (rules.symbolAfter) {
    return `${signText}${number}${NBSP}${symbol}`
  }
  const gap = rules.spaced || isCodeLike ? NBSP : ''
  return `${signText}${symbol}${gap}${number}`
}

const CURRENCY_NAMES_IT: Partial<Record<CurrencyCode, [singular: string, plural: string]>> = {
  EUR: ['euro', 'euro'],
  USD: ['dollaro statunitense', 'dollari statunitensi'],
  GBP: ['sterlina britannica', 'sterline britanniche'],
  CHF: ['franco svizzero', 'franchi svizzeri'],
  JPY: ['yen giapponese', 'yen giapponesi'],
}

/**
 * Long Italian form for screen readers: "meno 1.234,56 euro". Avoids symbols that VoiceOver and
 * TalkBack read inconsistently.
 */
export function formatMoneyAccessibleIt(value: Money): string {
  const formatted = formatMoney(value, { locale: 'it-IT', sign: 'never' })
  const number = formatted.split(NBSP)[0] ?? formatted
  const names = CURRENCY_NAMES_IT[value.currency]
  const isOne = value.amountMinor === 10n ** BigInt(currencyExponent(value.currency))
  const name = names ? (isOne ? names[0] : names[1]) : value.currency
  return `${value.amountMinor < 0n ? 'meno ' : ''}${number} ${name}`
}
