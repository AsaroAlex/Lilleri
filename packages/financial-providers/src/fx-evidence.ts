import type { CurrencyCode } from '@lilleri/money'

/** Provider literals only. Absence is unknown; never infer a rate from the two amounts. */
export interface ProviderFxEvidence {
  readonly version: 'provider-fx-v1'
  readonly original: { readonly amount: string; readonly currency: CurrencyCode } | null
  readonly billed: { readonly amount: string; readonly currency: CurrencyCode } | null
  readonly rate: {
    readonly decimal: string
    readonly baseCurrency: CurrencyCode
    readonly quoteCurrency: CurrencyCode
    /** Provider calendar date, independent of the viewer's timezone. */
    readonly date: string | null
  } | null
  readonly sourceReference: string | null
}
