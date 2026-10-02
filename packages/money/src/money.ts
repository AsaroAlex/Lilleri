import { assertCurrencyCode, type CurrencyCode, currencyExponent } from './currency.js'

/**
 * An exact amount of money: an integer number of minor units (cents for EUR) and a currency.
 *
 * Invariants:
 * - `amountMinor` is a bigint; floating point is never used for money anywhere in Lilleri.
 * - Arithmetic is only defined between amounts of the same currency.
 * - Sign convention for ledger amounts: negative = money leaving the account (debit / outflow),
 *   positive = money entering the account (credit / inflow).
 */
export interface Money {
  readonly amountMinor: bigint
  readonly currency: CurrencyCode
}

export class CurrencyMismatchError extends Error {
  readonly code = 'CURRENCY_MISMATCH'
  constructor(
    readonly left: CurrencyCode,
    readonly right: CurrencyCode,
  ) {
    super(`Cannot combine ${left} and ${right} amounts without an explicit conversion`)
    this.name = 'CurrencyMismatchError'
  }
}

export class InvalidAmountError extends Error {
  readonly code = 'INVALID_AMOUNT'
  constructor(
    readonly input: string,
    reason: string,
  ) {
    super(`Invalid amount "${input}": ${reason}`)
    this.name = 'InvalidAmountError'
  }
}

export function money(amountMinor: bigint | number, currency: CurrencyCode | string): Money {
  const code = typeof currency === 'string' ? assertCurrencyCode(currency) : currency
  if (typeof amountMinor === 'number') {
    if (!Number.isSafeInteger(amountMinor)) {
      throw new InvalidAmountError(String(amountMinor), 'minor units must be a safe integer')
    }
    return Object.freeze({ amountMinor: BigInt(amountMinor), currency: code })
  }
  return Object.freeze({ amountMinor, currency: code })
}

export function zero(currency: CurrencyCode | string): Money {
  return money(0n, currency)
}

const DECIMAL_RE = /^([+-])?(\d+)(?:\.(\d+))?$/

/**
 * Parses a plain decimal string (as sent by PSD2 / Berlin Group APIs, e.g. "-84.30", "1234.5",
 * "+0.99") into exact minor units. Rejects exponents, thousands separators, commas and more
 * fractional digits than the currency allows unless they are all zeros ("12.300" for EUR is fine,
 * "12.345" is not: we never round silently on ingestion).
 */
export function parseDecimal(input: string, currency: CurrencyCode | string): Money {
  const code = assertCurrencyCode(typeof currency === 'string' ? currency : currency)
  const trimmed = input.trim()
  const match = DECIMAL_RE.exec(trimmed)
  if (!match) {
    throw new InvalidAmountError(input, 'expected a plain decimal such as "-84.30"')
  }
  const [, sign, intPart = '0', fracRaw = ''] = match
  const exponent = currencyExponent(code)
  let frac = fracRaw
  if (frac.length > exponent) {
    const extra = frac.slice(exponent)
    if (/[^0]/.test(extra)) {
      throw new InvalidAmountError(
        input,
        `${code} has ${exponent} minor digits; refusing to round "${fracRaw}" silently`,
      )
    }
    frac = frac.slice(0, exponent)
  }
  const digits = intPart + frac.padEnd(exponent, '0')
  const magnitude = BigInt(digits)
  return money(sign === '-' ? -magnitude : magnitude, code)
}

/** Canonical machine representation, e.g. "-84.30" or "1500" (JPY). Used for exports and APIs. */
export function toDecimalString(value: Money): string {
  const exponent = currencyExponent(value.currency)
  const negative = value.amountMinor < 0n
  const abs = negative ? -value.amountMinor : value.amountMinor
  const raw = abs.toString().padStart(exponent + 1, '0')
  const intPart = exponent === 0 ? raw : raw.slice(0, raw.length - exponent)
  const fracPart = exponent === 0 ? '' : `.${raw.slice(raw.length - exponent)}`
  return `${negative ? '-' : ''}${intPart}${fracPart}`
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency)
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(a.amountMinor + b.amountMinor, a.currency)
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(a.amountMinor - b.amountMinor, a.currency)
}

export function negate(a: Money): Money {
  return money(-a.amountMinor, a.currency)
}

export function abs(a: Money): Money {
  return a.amountMinor < 0n ? negate(a) : a
}

export function isZero(a: Money): boolean {
  return a.amountMinor === 0n
}

export function isNegative(a: Money): boolean {
  return a.amountMinor < 0n
}

export function isPositive(a: Money): boolean {
  return a.amountMinor > 0n
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amountMinor === b.amountMinor
}

/** -1, 0 or 1. Throws on currency mismatch: comparing EUR with USD is a bug, not a result. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b)
  if (a.amountMinor === b.amountMinor) return 0
  return a.amountMinor < b.amountMinor ? -1 : 1
}

/** Sum of a list of same-currency amounts. An empty list needs an explicit currency. */
export function sum(values: readonly Money[], currency?: CurrencyCode | string): Money {
  const first = values[0]
  const code =
    first?.currency ?? (currency === undefined ? undefined : assertCurrencyCode(currency))
  if (!code) throw new Error('sum() of an empty list requires an explicit currency')
  let total = 0n
  for (const v of values) {
    if (v.currency !== code) throw new CurrencyMismatchError(code, v.currency)
    total += v.amountMinor
  }
  return money(total, code)
}

/**
 * Splits an amount into parts proportional to integer ratios using the largest-remainder method.
 * The parts always sum exactly to the original amount (split-transaction invariant). Ties on the
 * remainder go to the earlier part, so the result is deterministic.
 *
 * allocate(€95.00, [55, 25, 15]) → [€55.00, €25.00, €15.00]
 * allocate(€10.00, [1, 1, 1])    → [€3.34, €3.33, €3.33]
 */
export function allocate(value: Money, ratios: readonly (bigint | number)[]): Money[] {
  if (ratios.length === 0) throw new Error('allocate() needs at least one ratio')
  const weights = ratios.map((r) => {
    const w = typeof r === 'number' ? BigInt(r) : r
    if (w < 0n) throw new Error('allocate() ratios must be non-negative')
    return w
  })
  const total = weights.reduce((acc, w) => acc + w, 0n)
  if (total === 0n) throw new Error('allocate() ratios must not all be zero')

  const negative = value.amountMinor < 0n
  const amount = negative ? -value.amountMinor : value.amountMinor
  const shares = weights.map((w) => (amount * w) / total)
  const remainders = weights.map((w, i) => ({ i, r: (amount * w) % total }))
  let leftover = amount - shares.reduce((acc, s) => acc + s, 0n)
  remainders.sort((x, y) => (x.r === y.r ? x.i - y.i : x.r > y.r ? -1 : 1))
  for (const { i } of remainders) {
    if (leftover === 0n) break
    if ((weights[i] ?? 0n) === 0n) continue
    shares[i] = (shares[i] ?? 0n) + 1n
    leftover -= 1n
  }
  return shares.map((s) => money(negative ? -s : s, value.currency))
}

export type RoundingMode = 'half-even' | 'half-up' | 'down'

function divRound(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  if (denominator === 0n) throw new Error('division by zero')
  const negative = numerator < 0n !== denominator < 0n
  const n = numerator < 0n ? -numerator : numerator
  const d = denominator < 0n ? -denominator : denominator
  let q = n / d
  const r = n % d
  if (mode !== 'down' && r !== 0n) {
    const twice = r * 2n
    if (twice > d || (twice === d && (mode === 'half-up' || q % 2n === 1n))) q += 1n
  }
  return negative ? -q : q
}

/**
 * Converts an amount with an exchange rate given as a decimal string ("1.0835" = 1 unit of
 * `value.currency` buys 1.0835 units of `target`). Rounds once, at the end, half-even by default.
 * Used only for display/analytics normalisation; ledger rows always keep the original amount.
 */
export function convert(
  value: Money,
  rate: string,
  target: CurrencyCode | string,
  mode: RoundingMode = 'half-even',
): Money {
  const targetCode = assertCurrencyCode(typeof target === 'string' ? target : target)
  const m = /^(\d+)(?:\.(\d+))?$/.exec(rate.trim())
  if (!m) throw new InvalidAmountError(rate, 'exchange rate must be a positive plain decimal')
  const [, i = '0', f = ''] = m
  const rateNumerator = BigInt(i + f)
  const rateDenominator = 10n ** BigInt(f.length)
  if (rateNumerator === 0n) throw new InvalidAmountError(rate, 'exchange rate must be > 0')
  const fromExp = BigInt(currencyExponent(value.currency))
  const toExp = BigInt(currencyExponent(targetCode))
  // value.amountMinor / 10^fromExp * rate * 10^toExp
  const numerator = value.amountMinor * rateNumerator * 10n ** toExp
  const denominator = rateDenominator * 10n ** fromExp
  return money(divRound(numerator, denominator, mode), targetCode)
}

/**
 * Percentage change between two same-currency amounts in basis points (1% = 100 bp), rounded
 * half-even. Returns null when the baseline is zero (no meaningful percentage).
 */
export function percentChangeBp(baseline: Money, current: Money): bigint | null {
  assertSameCurrency(baseline, current)
  if (baseline.amountMinor === 0n) return null
  const delta = current.amountMinor - baseline.amountMinor
  const base = baseline.amountMinor < 0n ? -baseline.amountMinor : baseline.amountMinor
  return divRound(delta * 10_000n, base, 'half-even')
}

/** JSON-safe representation for APIs: amounts travel as strings of minor units. */
export interface MoneyJson {
  readonly amountMinor: string
  readonly currency: CurrencyCode
}

export function toJson(value: Money): MoneyJson {
  return { amountMinor: value.amountMinor.toString(), currency: value.currency }
}

export function fromJson(json: { amountMinor: string; currency: string }): Money {
  if (!/^-?\d+$/.test(json.amountMinor)) {
    throw new InvalidAmountError(json.amountMinor, 'amountMinor must be an integer string')
  }
  return money(BigInt(json.amountMinor), json.currency)
}
