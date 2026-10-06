import type { AppExtension } from './app.js'
import { securityHeaders } from './web-app.js'

/** iOS bundle identifier and Android package of the Lilleri apps (reverse DNS of lilleri.app). */
export const NATIVE_APP_ID = 'app.lilleri'
/** Origin the native apps' Better Auth Expo client sends as `expo-origin` (scheme `lilleri`). */
export const NATIVE_APP_ORIGIN = 'lilleri://'
/** Only the web application path opens in the app; API, bank callback and legal pages never do. */
export const APP_LINK_PATHS = ['/app', '/app/*'] as const

export interface AppLinksConfiguration {
  /** Apple Developer Team ID (10 upper-case letters or digits). */
  readonly appleTeamId?: string
  /** SHA-256 fingerprints of the Android signing certificates (Play App Signing and upload key). */
  readonly androidCertificates?: readonly string[]
}

const TEAM_ID = /^[A-Z0-9]{10}$/
const FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/

/** Validates the store identifiers; throws naming only the variable, never its value. */
export function appLinksFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): AppLinksConfiguration {
  const team = environment.APPLE_TEAM_ID?.trim()
  const certificates = environment.ANDROID_CERT_SHA256?.trim()
  if (team && !TEAM_ID.test(team)) throw new Error('APPLE_TEAM_ID is invalid')
  const fingerprints = certificates
    ? certificates.split(',').map((value) => value.trim().toUpperCase())
    : []
  if (fingerprints.some((value) => !FINGERPRINT.test(value)))
    throw new Error('ANDROID_CERT_SHA256 is invalid')
  return {
    ...(team ? { appleTeamId: team } : {}),
    ...(fingerprints.length ? { androidCertificates: fingerprints } : {}),
  }
}

/** `apple-app-site-association`: universal links for `/app` and shared web credentials. */
export function appleAppSiteAssociation(teamId: string) {
  const appId = `${teamId}.${NATIVE_APP_ID}`
  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: APP_LINK_PATHS.map((path) => ({ '/': path })),
        },
      ],
    },
    // Passwords and passkeys saved for the website also work in the app.
    webcredentials: { apps: [appId] },
  }
}

/** Digital Asset Links: verified App Links and shared sign-in credentials on Android. */
export function androidAssetLinks(fingerprints: readonly string[]) {
  return [
    {
      relation: [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ],
      target: {
        namespace: 'android_app',
        package_name: NATIVE_APP_ID,
        sha256_cert_fingerprints: [...fingerprints],
      },
    },
  ]
}

/**
 * Serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` once the
 * store identifiers are configured; without them both paths stay 404.
 */
export function createAppLinksExtension(configuration: AppLinksConfiguration): AppExtension {
  const files: [string, unknown][] = []
  if (configuration.appleTeamId)
    files.push([
      '/.well-known/apple-app-site-association',
      appleAppSiteAssociation(configuration.appleTeamId),
    ])
  if (configuration.androidCertificates?.length)
    files.push([
      '/.well-known/assetlinks.json',
      androidAssetLinks(configuration.androidCertificates),
    ])
  return (app) => {
    for (const [path, value] of files) {
      const body = JSON.stringify(value)
      // Served directly (no redirect) as application/json, as both platforms require.
      app.get(path, async (_request, reply) =>
        securityHeaders(reply)
          .header('Cache-Control', 'public, max-age=3600')
          .type('application/json')
          .send(body),
      )
    }
  }
}
