import { Linking, Platform } from 'react-native'
import Purchases, { type PurchasesPackage } from 'react-native-purchases'
import type { StorePackage, StorePurchaseOutcome } from './store-purchases'

export type { StorePackage, StorePurchaseOutcome } from './store-purchases'

declare const process: {
  env: {
    EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string
  }
}
/** RevenueCat public SDK keys (`appl_…`, `goog_…`); they identify the app, not a secret. */
const apiKey =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : undefined

export const STORE_PURCHASES = Boolean(apiKey)
export const STORE_NAME: 'App Store' | 'Google Play' | null =
  Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : null

/**
 * Purchases belong to the Lilleri profile: RevenueCat's app user id is the profile id, which the
 * server re-reads from RevenueCat before granting anything (it never trusts the device).
 */
let identified: string | null = null
async function identify(profileId: string) {
  if (!apiKey) throw new Error('Store purchases are not configured')
  if (identified === profileId) return
  if (identified === null && !(await Purchases.isConfigured()))
    Purchases.configure({ apiKey, appUserID: profileId })
  else await Purchases.logIn(profileId)
  identified = profileId
}
const intervalOf = (item: PurchasesPackage): StorePackage['interval'] | null =>
  item.packageType === Purchases.PACKAGE_TYPE.MONTHLY
    ? 'month'
    : item.packageType === Purchases.PACKAGE_TYPE.ANNUAL
      ? 'year'
      : null
async function currentPackages(profileId: string) {
  await identify(profileId)
  return (await Purchases.getOfferings()).current?.availablePackages ?? []
}

export async function storePackages(profileId: string): Promise<readonly StorePackage[]> {
  return (await currentPackages(profileId)).flatMap((item) => {
    const interval = intervalOf(item)
    return interval ? [{ id: item.identifier, interval, price: item.product.priceString }] : []
  })
}
export async function purchaseStorePackage(
  profileId: string,
  packageId: string,
): Promise<StorePurchaseOutcome> {
  const item = (await currentPackages(profileId)).find((entry) => entry.identifier === packageId)
  if (!item) throw new Error('This Plus package is no longer offered')
  try {
    await Purchases.purchasePackage(item)
    return 'purchased'
  } catch (cause) {
    const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : null
    if (code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled'
    if (code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending'
    throw cause
  }
}
export async function restoreStorePurchases(profileId: string): Promise<void> {
  await identify(profileId)
  await Purchases.restorePurchases()
}
/** iOS shows Apple's own sheet; Android opens Google Play's subscription page. */
export async function manageStoreSubscription(managementUrl: string | null): Promise<void> {
  if (Platform.OS === 'ios' && apiKey) {
    await Purchases.showManageSubscriptions()
    return
  }
  await Linking.openURL(
    managementUrl?.startsWith('https://')
      ? managementUrl
      : 'https://play.google.com/store/account/subscriptions',
  )
}
/** On sign-out the device stops acting for that profile's purchases. */
export async function forgetStoreCustomer(): Promise<void> {
  if (identified === null) return
  identified = null
  await Purchases.logOut().catch(() => {})
}
