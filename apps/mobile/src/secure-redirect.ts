import { Linking, Platform } from 'react-native'
import { secureRedirectUrl } from './hosted-flows'

/**
 * Hands the whole window to a bank or payment page. `left` means this page is unloading (web);
 * `opened` means another app or browser took over (native); `blocked` means nothing happened.
 */
export function leaveForSecureUrl(value: unknown): 'left' | 'opened' | 'blocked' {
  const url = secureRedirectUrl(value)
  if (!url) return 'blocked'
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url)
    return 'left'
  }
  void Linking.openURL(url)
  return 'opened'
}
