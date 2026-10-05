import { afterEach, describe, expect, test, vi } from 'vitest'
import { createHostedIdentityClient, createLocalIdentityClient } from './identity-client'
import {
  assertHostedIdentityClientConfiguration,
  consumeIdentityRecoveryLocation,
  resolveSameOriginNoticeUrl,
  sameOriginNoticeUrl,
} from './identity-recovery'

const origin = 'https://identity.lilleri.example'
const options = {
  termsVersion: 'beta-reviewed-fixture-v1',
  termsUrl: `${origin}/condizioni`,
  browserOrigin: origin,
}
const recoveryToken = 'synthetic-recovery-token-for-offline-test'
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hosted identity client and recovery lifecycle without real transport', () => {
  test('rejects cross-origin API/terms configuration and the local synthetic acceptance version', () => {
    expect(() => assertHostedIdentityClientConfiguration(origin, options)).not.toThrow()
    expect(() =>
      assertHostedIdentityClientConfiguration(origin, {
        ...options,
        browserOrigin: 'https://attacker.example',
      }),
    ).toThrow(/same HTTPS/)
    expect(() =>
      assertHostedIdentityClientConfiguration(origin, {
        ...options,
        termsUrl: 'https://attacker.example/terms',
      }),
    ).toThrow(/terms URL/)
    expect(() =>
      assertHostedIdentityClientConfiguration(origin, {
        ...options,
        termsVersion: 'local-synthetic-terms-v1',
      }),
    ).toThrow(/terms version/)
  })
  test('a configured same-origin terms path resolves against the browser origin and still passes validation', () => {
    const termsUrl = resolveSameOriginNoticeUrl('/legal/terms', origin)
    expect(termsUrl).toBe(`${origin}/legal/terms`)
    expect(() =>
      assertHostedIdentityClientConfiguration(origin, { ...options, termsUrl }),
    ).not.toThrow()
    expect(resolveSameOriginNoticeUrl(`${origin}/condizioni`, origin)).toBe(`${origin}/condizioni`)
    expect(resolveSameOriginNoticeUrl('/legal/terms', undefined)).toBe('/legal/terms')
    expect(resolveSameOriginNoticeUrl('', origin)).toBe('')
    for (const outside of [
      '//attacker.example/terms',
      '/\\attacker.example/terms',
      'legal/terms',
    ]) {
      const value = resolveSameOriginNoticeUrl(outside, origin)
      expect(value, outside).toBe(outside)
      expect(() =>
        assertHostedIdentityClientConfiguration(origin, { ...options, termsUrl: value }),
      ).toThrow()
    }
    expect(() =>
      assertHostedIdentityClientConfiguration(origin, {
        ...options,
        termsUrl: resolveSameOriginNoticeUrl('/legal/terms?v=2', origin),
      }),
    ).toThrow(/terms URL/)
  })
  test('the optional privacy notice link is shown only for an exact same-origin HTTPS page', () => {
    expect(sameOriginNoticeUrl('/legal/privacy', origin)).toBe(`${origin}/legal/privacy`)
    expect(sameOriginNoticeUrl(`${origin}/privacy`, origin)).toBe(`${origin}/privacy`)
    for (const value of [
      undefined,
      '',
      '/',
      '//attacker.example/privacy',
      'https://attacker.example/privacy',
      `${origin}/privacy?ref=1`,
      `${origin}/privacy#top`,
      'http://identity.lilleri.example/privacy',
      'javascript:alert(1)',
    ])
      expect(sameOriginNoticeUrl(value, origin), String(value)).toBeNull()
    expect(sameOriginNoticeUrl('/legal/privacy', undefined)).toBeNull()
  })
  test('takes a valid recovery token into memory and removes it from history before making any network request', () => {
    const replace = vi.fn<(url: string) => void>()
    const recovered = consumeIdentityRecoveryLocation(
      `${origin}/?identity=recover&token=${recoveryToken}&lang=en#access`,
      replace,
    )
    expect(recovered).toEqual({ token: recoveryToken, invalid: false })
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${origin}/?lang=en#access`)
    expect(consumeIdentityRecoveryLocation(replace.mock.calls[0]?.[0] ?? '', replace)).toEqual({
      token: null,
      invalid: false,
    })
    expect(replace).toHaveBeenCalledTimes(1)
  })
  test('removes malformed/expired recovery state and permits asking for a new link', () => {
    const replace = vi.fn<(url: string) => void>()
    expect(
      consumeIdentityRecoveryLocation(
        `${origin}/?identity=recover&token=bad&error=INVALID_TOKEN`,
        replace,
      ),
    ).toEqual({ token: null, invalid: true })
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${origin}/`)
    expect(consumeIdentityRecoveryLocation(`${origin}/?bankCallback=1`, replace)).toEqual({
      token: null,
      invalid: false,
    })
  })
  test('signup sends the configured acceptance version and recovery uses an exact same-origin callback', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(JSON.stringify({ status: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', transport)
    const client = createHostedIdentityClient(origin, options)
    await client.signUp('Persona sintetica', 'synthetic@example.invalid', 'Synthetic password 27!')
    await client.requestPasswordReset('synthetic@example.invalid')
    await client.resendVerification('synthetic@example.invalid')
    const calls = transport.mock.calls.map(([url, init]) => ({
      url: String(url),
      init,
      payload: JSON.parse(String(init?.body)),
    }))
    expect(calls).toHaveLength(3)
    expect(calls[0]?.payload).toMatchObject({
      termsVersion: options.termsVersion,
      adultAttested: true,
      callbackURL: `${origin}/`,
    })
    expect(calls[1]?.payload).toEqual({
      email: 'synthetic@example.invalid',
      redirectTo: `${origin}/?identity=recover`,
    })
    expect(calls[2]?.payload).toEqual({
      email: 'synthetic@example.invalid',
      callbackURL: `${origin}/`,
    })
    for (const call of calls) expect(call.init?.credentials).toBe('include')
    expect(calls.some((call) => call.url.includes('sign-in') || call.url.includes('/v1/'))).toBe(
      false,
    )
  })
  test('reset submits the token only in the POST body and never signs in or replays a financial command', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(JSON.stringify({ status: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', transport)
    const client = createHostedIdentityClient(origin, options)
    await client.resetPassword(recoveryToken, 'Synthetic new password 28!')
    expect(transport).toHaveBeenCalledTimes(1)
    const [url, init] = transport.mock.calls[0] ?? []
    expect(String(url)).toBe(`${origin}/api/auth/reset-password`)
    expect(String(url)).not.toContain(recoveryToken)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      token: recoveryToken,
      newPassword: 'Synthetic new password 28!',
    })
  })
  test('recovery failure stays an explicit safe error and local mode has no fake recovery transport', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ code: 'INVALID_TOKEN', message: `private-message-${recoveryToken}` }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          ),
      )
    vi.stubGlobal('fetch', transport)
    const client = createHostedIdentityClient(origin, options)
    await expect(
      client.resetPassword(recoveryToken, 'Synthetic new password 28!'),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_TOKEN' })
    const local = createLocalIdentityClient('http://localhost:3001')
    await expect(local.requestPasswordReset('synthetic@example.invalid')).rejects.toMatchObject({
      code: 'recovery_unavailable',
    })
    expect(transport).toHaveBeenCalledTimes(1)
  })
})
