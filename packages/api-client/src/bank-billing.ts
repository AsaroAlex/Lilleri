/** Why automatic bank connection cannot start for this profile right now. */
export type BankUnavailableReason = 'provider_not_configured' | 'plus_required' | 'capacity_reached'
export interface BankInstitutionDto {
  /** Provider institution identifier, e.g. "IT:Intesa Sanpaolo". */
  readonly id: string
  readonly name: string
  readonly country: string
  /** The provider marks the integration as recently added. */
  readonly beta: boolean
  readonly maximumConsentDays: number
}
export interface BankInstitutionsDto {
  readonly providerId: string | null
  readonly available: boolean
  readonly reason: BankUnavailableReason | null
  /** May be present while `available` is false; it is then read-only information. */
  readonly institutions: readonly BankInstitutionDto[]
}
export type BankAuthorizationLanguage = 'it' | 'en'
export interface BankAuthorizationInput {
  readonly institutionId: string
  readonly language: BankAuthorizationLanguage
  /** Only to renew an existing connection with the same institution. */
  readonly connectionId?: string
}
export interface BankAuthorizationDto {
  /** The bank/provider page; the browser must leave Lilleri for it. */
  readonly url: string
  readonly expiresAt: string
}
export type BillingPlan = 'gratis' | 'plus'
export type BillingInterval = 'month' | 'year'
export interface BillingPriceDto {
  /** Plain decimal including VAT, e.g. "6.99". */
  readonly amount: string
  readonly currency: string
}
export interface BillingDto {
  readonly plan: BillingPlan
  readonly status: string | null
  readonly interval: BillingInterval | null
  readonly currentPeriodEnd: string | null
  readonly cancelAtPeriodEnd: boolean
  readonly purchaseAvailable: boolean
  readonly prices: {
    readonly month: BillingPriceDto | null
    readonly year: BillingPriceDto | null
  }
}
export interface BillingRedirectDto {
  readonly url: string
}

/** Bank authorisation and subscription routes use the existing cookie session. */
export function createBankBillingClient(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  return {
    bankInstitutions: (country: string, signal?: AbortSignal) =>
      request<BankInstitutionsDto>(
        `/v1/bank/institutions?country=${encodeURIComponent(country)}`,
        signal ? { signal } : {},
      ),
    startBankAuthorization: (input: BankAuthorizationInput) =>
      request<BankAuthorizationDto>('/v1/bank/authorizations', {
        method: 'POST',
        body: JSON.stringify({
          institutionId: input.institutionId,
          language: input.language,
          ...(input.connectionId ? { connectionId: input.connectionId } : {}),
        }),
      }),
    billing: (signal?: AbortSignal) => request<BillingDto>('/v1/billing', signal ? { signal } : {}),
    startCheckout: (interval: BillingInterval) =>
      request<BillingRedirectDto>('/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ interval }),
      }),
    openBillingPortal: () =>
      request<BillingRedirectDto>('/v1/billing/portal', { method: 'POST', body: '{}' }),
  }
}
