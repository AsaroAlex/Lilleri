/** Recognition metadata never replaces a source description or legacy merchant comparison key. */
export const MERCHANT_NORMALIZER_VERSION = 'merchant-normalizer-v1'
export const MERCHANT_DICTIONARY_VERSION = 'merchant-dictionary-local-v1'

export interface MerchantInput {
  readonly transactionId: string
  readonly profileId: string
  readonly description: string
  readonly merchantName: string | null
  /** An asserted bank name is not evidence that a bank-specific pattern was verified. */
  readonly bankPatternId?: 'generic-it-v1'
}

export interface MerchantNormalization {
  readonly transactionId: string
  readonly profileId: string
  readonly originalDescription: string
  readonly originalMerchantName: string | null
  readonly normalizedKey: string | null
  readonly candidateKeys: readonly string[]
  readonly extractedName: string | null
  readonly status: 'candidate' | 'ambiguous' | 'unknown'
  readonly source: 'provider_merchant' | 'descriptor_pattern' | 'none'
  readonly intermediary: string | null
  readonly normalizerVersion: typeof MERCHANT_NORMALIZER_VERSION
  readonly evidence: readonly string[]
}

export interface MerchantAliasValues {
  readonly normalizedKey: string
  readonly merchantId: string
  readonly displayName: string
}

/** Private profile choices have no global dictionary/training side effect. */
export interface MerchantAlias extends MerchantAliasValues {
  readonly id: string
  readonly profileId: string
  readonly revision: number
  readonly archived: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface MerchantResolution {
  readonly transactionId: string
  readonly status: 'resolved' | 'ambiguous' | 'unknown' | 'suppressed'
  readonly merchantId: string | null
  readonly displayName: string | null
  readonly normalizedKey: string | null
  readonly source: 'user' | 'dictionary' | 'none'
  readonly normalizerVersion: typeof MERCHANT_NORMALIZER_VERSION
  readonly dictionaryVersion: typeof MERCHANT_DICTIONARY_VERSION | null
  readonly aliasId: string | null
  readonly aliasRevision: number | null
  readonly evidence: readonly string[]
}

export type ItalianPaymentType =
  | 'f24'
  | 'pagopa_cbill'
  | 'mav_rav'
  | 'bill'
  | 'direct_debit'
  | 'wallet_topup'
  | 'cash_withdrawal'
  | 'card_settlement'
  | 'salary'
  | 'pension'

export interface PaymentSemanticHint {
  readonly type: ItalianPaymentType | null
  readonly status: 'hint' | 'conflict' | 'unknown'
  readonly kind: 'expense' | 'income' | 'transfer' | 'card_settlement' | 'cash_withdrawal' | null
  readonly version: 'italian-payment-hints-v1'
  readonly evidence: readonly string[]
}
