import { readFileSync } from 'node:fs'
import Fastify from 'fastify'
import { describe, expect, test } from 'vitest'
import type { AppExtensionContext } from '../src/app.js'
import {
  appLinksFromEnvironment,
  createAppLinksExtension,
  NATIVE_APP_ID,
  NATIVE_APP_ORIGIN,
} from '../src/app-links.js'
import { LEGAL_TERMS_VERSION } from '../src/legal-pages.js'

const fingerprint = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, '0').toUpperCase(),
).join(':')
const serve = async (environment: Record<string, string>) => {
  const app = Fastify()
  await createAppLinksExtension(appLinksFromEnvironment(environment))(
    app,
    {} as AppExtensionContext,
  )
  return app
}

describe('universal links and Android App Links', () => {
  test('without store identifiers both association files stay unpublished', async () => {
    const app = await serve({})
    for (const url of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json'])
      expect((await app.inject({ url })).statusCode).toBe(404)
  })

  test('the files open only the web app path and share sign-in credentials', async () => {
    const app = await serve({
      APPLE_TEAM_ID: 'ABCDE12345',
      ANDROID_CERT_SHA256: `${fingerprint.toLowerCase()}, ${fingerprint}`,
    })
    const apple = await app.inject({ url: '/.well-known/apple-app-site-association' })
    expect(apple.statusCode).toBe(200)
    expect(apple.headers['content-type']).toContain('application/json')
    expect(apple.json()).toEqual({
      applinks: {
        details: [
          {
            appIDs: [`ABCDE12345.${NATIVE_APP_ID}`],
            components: [{ '/': '/app' }, { '/': '/app/*' }],
          },
        ],
      },
      webcredentials: { apps: [`ABCDE12345.${NATIVE_APP_ID}`] },
    })
    const android = await app.inject({ url: '/.well-known/assetlinks.json' })
    expect(android.json()).toEqual([
      {
        relation: [
          'delegate_permission/common.handle_all_urls',
          'delegate_permission/common.get_login_creds',
        ],
        target: {
          namespace: 'android_app',
          package_name: 'app.lilleri',
          sha256_cert_fingerprints: [fingerprint, fingerprint],
        },
      },
    ])
  })

  test('malformed identifiers are refused naming only the variable', () => {
    expect(() => appLinksFromEnvironment({ APPLE_TEAM_ID: 'abc' })).toThrow('APPLE_TEAM_ID')
    expect(() => appLinksFromEnvironment({ ANDROID_CERT_SHA256: 'AB:CD' })).toThrow(
      'ANDROID_CERT_SHA256',
    )
    try {
      appLinksFromEnvironment({ ANDROID_CERT_SHA256: 'secret-looking-value' })
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-looking-value')
    }
  })

  test('the native app configuration matches the server identifiers and terms version', () => {
    const read = (file: string) =>
      JSON.parse(readFileSync(new URL(`../../mobile/${file}`, import.meta.url), 'utf8'))
    const app = read('app.json').expo
    expect(app.ios.bundleIdentifier).toBe(NATIVE_APP_ID)
    expect(app.android.package).toBe(NATIVE_APP_ID)
    expect(`${app.scheme}://`).toBe(NATIVE_APP_ORIGIN)
    const env = read('eas.json').build.base.env
    // Sign-up records the terms version the app shows: it must be the published one.
    expect(env.EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION).toBe(LEGAL_TERMS_VERSION)
    expect(new URL(env.EXPO_PUBLIC_API_URL).host).toBe(env.LILLERI_APP_DOMAIN)
  })
})
