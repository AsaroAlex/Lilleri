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
  /** `app` from the native apps: the bank's return opens the app instead of the website. */
  readonly returnTo?: 'web' | 'app'
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
  /** Where the shown subscription is managed: the website (Stripe) or an app store. */
  readonly channel: 'stripe' | 'app_store' | 'play_store' | 'promotional' | null
  /** The store's page to manage an App Store or Google Play subscription, when known. */
  readonly managementUrl: string | null
  readonly purchaseAvailable: boolean
  /** Plus may be bought in the native app (App Store / Google Play) right now. */
  readonly storePurchaseAvailable: boolean
  readonly prices: {
    readonly month: BillingPriceDto | null
    readonly year: BillingPriceDto | null
  }
}
export interface BillingRedirectDto {
  readonly url: string
}
/** "Plus Fondatori": a single e-mail when Plus can be bought. */
export interface PlusWaitlistDto {
  /** The caller may join: profile owner, on Gratis, while Plus cannot be bought. */
  readonly offered: boolean
  readonly joined: boolean
  readonly joinedAt: string | null
  /** 1-based place among the people still waiting; null when not waiting. */
  readonly position: number | null
  /** The single notice has already been sent. */
  readonly notified: boolean
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
          ...(input.returnTo ? { returnTo: input.returnTo } : {}),
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
    /** After an App Store / Google Play purchase or restore: re-read it now, not at the webhook. */
    refreshStorePurchase: () =>
      request<{ readonly plan: BillingPlan }>('/v1/billing/store/refresh', {
        method: 'POST',
        body: '{}',
      }),
    plusWaitlist: (signal?: AbortSignal) =>
      request<PlusWaitlistDto>('/v1/plus/waitlist', signal ? { signal } : {}),
    joinPlusWaitlist: () =>
      request<PlusWaitlistDto>('/v1/plus/waitlist', { method: 'POST', body: '{}' }),
    leavePlusWaitlist: () => request<PlusWaitlistDto>('/v1/plus/waitlist', { method: 'DELETE' }),
  }
}
