/**
 * ISO 4217 currencies Lilleri knows how to represent exactly.
 *
 * The exponent is the number of minor-unit digits (EUR = 2, JPY = 0, KWD = 3). Values follow
 * ISO 4217 as encoded in the dinero.js 2.0.2 currency table (verified 2026-10-02, see
 * docs/research/raw/reconciliation-and-data-model-patterns.md §3.3). Never assume 2 decimals:
 * always read the exponent of the currency.
 */
export const CURRENCY_EXPONENTS = {
  // Euro area and EU / EEA
  EUR: 2,
  BGN: 2,
  CZK: 2,
  DKK: 2,
  HUF: 2,
  PLN: 2,
  RON: 2,
  SEK: 2,
  NOK: 2,
  ISK: 0,
  CHF: 2,
  GBP: 2,
  // Common travel and online-purchase currencies
  USD: 2,
  CAD: 2,
  AUD: 2,
  NZD: 2,
  JPY: 0,
  CNY: 2,
  HKD: 2,
  SGD: 2,
  KRW: 0,
  INR: 2,
  TRY: 2,
  AED: 2,
  MAD: 2,
  EGP: 2,
  ZAR: 2,
  BRL: 2,
  MXN: 2,
  ARS: 2,
  CLP: 0,
  THB: 2,
  IDR: 2,
  ILS: 2,
  RSD: 2,
  ALL: 2,
  UAH: 2,
  // Three-decimal currencies (kept to prove the model is not EUR-shaped)
  BHD: 3,
  JOD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
} as const satisfies Record<string, 0 | 2 | 3>

export type CurrencyCode = keyof typeof CURRENCY_EXPONENTS

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCY_EXPONENTS, value)
}

export function assertCurrencyCode(value: string): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new UnsupportedCurrencyError(value)
  }
  return value
}

export function currencyExponent(currency: CurrencyCode): number {
  return CURRENCY_EXPONENTS[currency]
}

export class UnsupportedCurrencyError extends Error {
  readonly code = 'UNSUPPORTED_CURRENCY'
  constructor(readonly currency: string) {
    super(`Unsupported or unknown ISO 4217 currency: "${currency}"`)
    this.name = 'UnsupportedCurrencyError'
  }
}
