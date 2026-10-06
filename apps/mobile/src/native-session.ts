import type { BetterAuthClientPlugin } from 'better-auth/client'

/**
 * Web: the browser keeps the HttpOnly session cookie and sends it with `credentials: include`.
 * The native implementation (`native-session.native.ts`) keeps it in the device's secure storage.
 */
export const sessionFetch: typeof fetch | undefined = undefined
export function nativeAuthPlugins(): BetterAuthClientPlugin[] {
  return []
}
