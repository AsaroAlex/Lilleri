import { describe, expect, test, vi } from 'vitest'
import {
  createResendIdentityDelivery,
  createScalewayIdentityDelivery,
} from '../src/identity-mail.js'

const baseURL = 'https://identity.lilleri.example'
const email = 'synthetic@example.invalid'
const configuration = {
  apiKey: 'synthetic-private-provider-key',
  from: 'identity@example.invalid',
  baseURL,
}

describe('configured identity mail transport without network or real recipients', () => {
  test('rejects missing keys, invalid sender addresses and non-HTTPS application origins', () => {
    expect(() => createResendIdentityDelivery({ ...configuration, apiKey: '' })).toThrow(/key/)
    expect(() =>
      createResendIdentityDelivery({ ...configuration, from: 'bad\nSender@example.invalid' }),
    ).toThrow(/sender/)
    expect(() =>
      createResendIdentityDelivery({ ...configuration, baseURL: 'http://localhost:3001' }),
    ).toThrow(/HTTPS/)
  })
  test('sends minimal Italian verification and recovery messages to the fixed provider endpoint and awaits acceptance', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ id: 'synthetic-provider-receipt' }), { status: 200 }),
      )
    const delivery = createResendIdentityDelivery({ ...configuration, fetch: transport })
    await delivery.sendVerification({
      email,
      url: `${baseURL}/api/auth/verify-email?token=synthetic-verification`,
    })
    await delivery.sendPasswordReset({
      email,
      url: `${baseURL}/api/auth/reset-password/synthetic-token?callbackURL=${encodeURIComponent(`${baseURL}/recupera-accesso`)}`,
    })
    expect(transport).toHaveBeenCalledTimes(2)
    for (const [endpoint, options] of transport.mock.calls) {
      expect(endpoint).toBe('https://api.resend.com/emails')
      expect(options?.redirect).toBe('error')
      expect(options?.signal).toBeInstanceOf(AbortSignal)
      const payload = JSON.parse(String(options?.body))
      expect(Object.keys(payload).sort()).toEqual(['from', 'subject', 'text', 'to'])
      expect(payload.to).toEqual([email])
    }
  })
  test('blocks foreign links, header injection and missing provider receipts before reporting acceptance', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    const delivery = createResendIdentityDelivery({ ...configuration, fetch: transport })
    await expect(
      delivery.sendVerification({
        email,
        url: 'https://attacker.example/api/auth/verify-email?token=synthetic',
      }),
    ).rejects.toThrow(/link/)
    await expect(
      delivery.sendPasswordReset({
        email: 'synthetic@example.invalid\nBcc:other@example.invalid',
        url: `${baseURL}/api/auth/reset-password/synthetic`,
      }),
    ).rejects.toThrow(/recipient/)
    expect(transport).not.toHaveBeenCalled()
    await expect(
      delivery.sendVerification({ email, url: `${baseURL}/api/auth/verify-email?token=synthetic` }),
    ).rejects.toThrow('Identity mail delivery is unavailable')
  })
  test('provider rejection and transport errors are safe failures without private provider details', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('private-provider-key-and-recipient', { status: 429 }))
      .mockRejectedValueOnce(new Error('private-provider-key-and-recipient'))
    const delivery = createResendIdentityDelivery({ ...configuration, fetch: transport })
    for (let attempt = 0; attempt < 2; attempt++)
      await expect(
        delivery.sendVerification({
          email,
          url: `${baseURL}/api/auth/verify-email?token=synthetic`,
        }),
      ).rejects.toThrow(/^Identity mail delivery is unavailable$/)
  })
})

describe('Scaleway Transactional Email identity transport', () => {
  const scaleway = {
    secretKey: 'synthetic-scaleway-secret',
    projectId: '11111111-2222-4333-8444-555555555555',
    from: 'identity@example.invalid',
    baseURL,
  }
  test('rejects missing secrets, malformed projects, senders and origins', () => {
    expect(() => createScalewayIdentityDelivery({ ...scaleway, secretKey: ' ' })).toThrow(/secret/)
    expect(() => createScalewayIdentityDelivery({ ...scaleway, projectId: 'project' })).toThrow(
      /project/,
    )
    expect(() => createScalewayIdentityDelivery({ ...scaleway, from: 'not-an-address' })).toThrow(
      /sender/,
    )
    expect(() =>
      createScalewayIdentityDelivery({ ...scaleway, baseURL: `${baseURL}/path` }),
    ).toThrow(/HTTPS/)
  })
  test('posts one recipient per message to the EU endpoint and awaits a receipt', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(JSON.stringify({ emails: [{ id: 'synthetic-email', status: 'new' }] }), {
          status: 200,
        }),
    )
    const delivery = createScalewayIdentityDelivery({ ...scaleway, fetch: transport })
    await delivery.sendVerification({
      email,
      url: `${baseURL}/api/auth/verify-email?token=synthetic-verification`,
    })
    const [endpoint, options] = transport.mock.calls[0] ?? []
    expect(endpoint).toBe(
      'https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails',
    )
    expect(options?.redirect).toBe('error')
    expect(new Headers(options?.headers).get('x-auth-token')).toBe(scaleway.secretKey)
    const payload = JSON.parse(String(options?.body))
    expect(payload).toEqual({
      from: { email: scaleway.from, name: 'Lilleri' },
      to: [{ email }],
      subject: 'Conferma la tua email per Lilleri',
      text: expect.stringContaining(
        `${baseURL}/api/auth/verify-email?token=synthetic-verification`,
      ),
      project_id: scaleway.projectId,
    })
  })
  test('failed, missing or rejected receipts are generic failures', async () => {
    for (const response of [
      new Response(JSON.stringify({ emails: [{ id: 'synthetic', status: 'failed' }] })),
      new Response(JSON.stringify({ emails: [] })),
      new Response('private-recipient', { status: 403 }),
    ]) {
      const delivery = createScalewayIdentityDelivery({
        ...scaleway,
        fetch: vi.fn<typeof fetch>().mockResolvedValue(response),
      })
      await expect(
        delivery.sendPasswordReset({ email, url: `${baseURL}/api/auth/reset-password/synthetic` }),
      ).rejects.toThrow(/^Identity mail delivery is unavailable$/)
    }
  })
})
