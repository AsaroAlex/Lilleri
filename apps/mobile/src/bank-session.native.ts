import * as WebBrowser from 'expo-web-browser'
import { emitHostedReturnUrl, secureRedirectUrl } from './hosted-flows'

/** Native: the server sends the bank's return to `lilleri://app?bank=…`. */
export const BANK_RETURN_TARGET: 'web' | 'app' = 'app'
const RETURN_URL = 'lilleri://app'
/**
 * Native: the bank opens in an authentication session over the app; its return to
 * `lilleri://app?bank=…` closes the session and the outcome is applied like a web return.
 */
export async function openBankAuthorization(
  value: unknown,
): Promise<'left' | 'opened' | 'blocked'> {
  const url = secureRedirectUrl(value)
  if (!url) return 'blocked'
  const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL)
  if (result.type === 'success') emitHostedReturnUrl(result.url)
  return 'opened'
}
