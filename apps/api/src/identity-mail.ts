export interface IdentityMailMessage {
  readonly email: string
  readonly url: string
}
export interface IdentityDelivery {
  readonly sendVerification: (message: IdentityMailMessage) => Promise<void>
  readonly sendPasswordReset: (message: IdentityMailMessage) => Promise<void>
}
export interface ResendIdentityDeliveryOptions {
  readonly apiKey: string
  readonly from: string
  readonly baseURL: string
  /** Injected only by trusted application code, for network policy and offline tests. */
  readonly fetch?: typeof globalThis.fetch
}

/** Provider acceptance is awaited; transport failures never become a fake delivery success. */
export function createResendIdentityDelivery(
  options: ResendIdentityDeliveryOptions,
): IdentityDelivery {
  if (!options.apiKey.trim() || /[\r\n]/.test(options.apiKey))
    throw new Error('Identity mail API key is required')
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(options.from) || options.from.length > 254)
    throw new Error('Identity mail requires a verified sender e-mail address')
  const base = new URL(options.baseURL)
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    options.baseURL !== base.origin
  )
    throw new Error('Identity mail requires an exact HTTPS application origin')
  const transport = options.fetch ?? globalThis.fetch
  const send = async (message: IdentityMailMessage, kind: 'verification' | 'reset') => {
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(message.email) || message.email.length > 254)
      throw new Error('Invalid identity mail recipient')
    const link = new URL(message.url)
    if (
      link.origin !== base.origin ||
      link.username ||
      link.password ||
      (kind === 'verification'
        ? link.pathname !== '/api/auth/verify-email'
        : !/^\/api\/auth\/reset-password\/[A-Za-z0-9_-]+$/.test(link.pathname))
    )
      throw new Error('Invalid identity mail link')
    const subject =
      kind === 'verification' ? 'Conferma la tua email per Lilleri' : 'Recupera l’accesso a Lilleri'
    const text =
      kind === 'verification'
        ? `Conferma la tua email aprendo questo collegamento:\n\n${link.href}\n\nSe non hai richiesto un account Lilleri, ignora questa email.`
        : `Per scegliere una nuova password, apri questo collegamento entro 15 minuti:\n\n${link.href}\n\nSe non hai richiesto il recupero, ignora questa email. La tua password rimarrà invariata.`
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: `Lilleri <${options.from}>`,
          to: [message.email],
          subject,
          text,
        }),
      })
      if (!response.ok) throw new Error('Mail was not accepted')
      const receipt: unknown = await response.json()
      if (
        !receipt ||
        typeof receipt !== 'object' ||
        !('id' in receipt) ||
        typeof receipt.id !== 'string' ||
        !receipt.id
      )
        throw new Error('Mail receipt is unavailable')
    } catch {
      // Provider response bodies can contain message content, addresses and credentials.
      throw new Error('Identity mail delivery is unavailable')
    }
  }
  return {
    sendVerification: (message) => send(message, 'verification'),
    sendPasswordReset: (message) => send(message, 'reset'),
  }
}
