import { expoClient } from '@better-auth/expo/client'
import { type BetterAuthClientPlugin, createAuthClient } from 'better-auth/client'
import * as SecureStore from 'expo-secure-store'

/** The origin the server accepts from the apps (`expo-origin`), matching the `lilleri` scheme. */
export const NATIVE_APP_ORIGIN = 'lilleri://'
/**
 * One Better Auth Expo client plugin for the whole app: it keeps the hosted session cookie in the
 * Keychain / Keystore (expo-secure-store), never in plain storage, and adds it with the app origin
 * to every authentication request. The cookie prefix must match the server's `lilleri-hosted`.
 */
const plugin = expoClient({
  scheme: 'lilleri',
  storagePrefix: 'lilleri',
  cookiePrefix: 'lilleri-hosted',
  storage: SecureStore,
})
export function nativeAuthPlugins(): BetterAuthClientPlugin[] {
  return [plugin]
}
let reader: { getCookie: () => Promise<string> } | null = null
const cookies = () => {
  reader ??= createAuthClient({
    // Only the stored cookie is read; this client never sends a request.
    baseURL: 'https://lilleri.invalid',
    plugins: [plugin],
  }) as unknown as { getCookie: () => Promise<string> }
  return reader
}
/** API requests carry the stored session and the app origin, and never the platform's cookie jar. */
export const sessionFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers)
  const cookie = await cookies().getCookie()
  if (cookie) headers.set('cookie', cookie)
  headers.set('expo-origin', NATIVE_APP_ORIGIN)
  return fetch(input, { ...init, headers, credentials: 'omit' })
}
