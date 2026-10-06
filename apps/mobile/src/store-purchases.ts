/** A Plus package as the App Store or Google Play sells it, with the store's own price text. */
export interface StorePackage {
  readonly id: string
  readonly interval: 'month' | 'year'
  readonly price: string
}
export type StorePurchaseOutcome = 'purchased' | 'cancelled' | 'pending'

/**
 * Web: Plus is sold through Stripe Checkout; App Store and Google Play purchases exist only in the
 * native apps (`store-purchases.native.ts`, RevenueCat).
 */
export const STORE_PURCHASES = false
export const STORE_NAME: 'App Store' | 'Google Play' | null = null
export async function storePackages(_profileId: string): Promise<readonly StorePackage[]> {
  return []
}
export async function purchaseStorePackage(
  _profileId: string,
  _packageId: string,
): Promise<StorePurchaseOutcome> {
  throw new Error('Store purchases are only available in the apps')
}
export async function restoreStorePurchases(_profileId: string): Promise<void> {
  throw new Error('Store purchases are only available in the apps')
}
export async function manageStoreSubscription(_managementUrl: string | null): Promise<void> {}
export async function forgetStoreCustomer(): Promise<void> {}
