export interface IdentityMailMessage {
  readonly email: string
  readonly url: string
}
export interface IdentityDelivery {
  readonly sendVerification: (message: IdentityMailMessage) => Promise<void>
  readonly sendPasswordReset: (message: IdentityMailMessage) => Promise<void>
  /** The single notice a "Plus Fondatori" list member asked for; links to `/app?fondatori=1`. */
  readonly sendPlusAvailable?: (message: IdentityMailMessage) => Promise<void>
}
/** The only page a "Plus is available" notice may link to. */
export const PLUS_AVAILABLE_PATH = '/app?fondatori=1'
export interface ResendIdentityDeliveryOptions {
  readonly apiKey: string
  readonly from: string
  readonly baseURL: string
  /** Injected only by trusted application code, for network policy and offline tests. */
  readonly fetch?: typeof globalThis.fetch
}
export interface ScalewayIdentityDeliveryOptions {
  /** IAM API key secret scoped to Transactional Email in the Lilleri project. */
  readonly secretKey: string
  readonly projectId: string
  readonly from: string
  readonly baseURL: string
  readonly region?: 'fr-par'
  readonly fetch?: typeof globalThis.fetch
}

const EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
interface PreparedMessage {
  readonly email: string
  readonly subject: string
  readonly text: string
}
type Kind = 'verification' | 'reset' | 'plus'

function applicationOrigin(baseURL: string): URL {
  const base = new URL(baseURL)
  if (base.protocol !== 'https:' || base.username || base.password || baseURL !== base.origin)
    throw new Error('Identity mail requires an exact HTTPS application origin')
  return base
}
function assertSender(from: string) {
  if (!EMAIL.test(from) || from.length > 254)
    throw new Error('Identity mail requires a verified sender e-mail address')
}
function secret(value: string, label: string) {
  if (!value.trim() || /[\r\n]/.test(value)) throw new Error(`${label} is required`)
}
const SUBJECTS: Readonly<Record<Kind, string>> = {
  verification: 'Conferma la tua email per Lilleri',
  reset: 'Recupera l’accesso a Lilleri',
  plus: 'Lilleri Plus è disponibile per te',
}
const texts: Readonly<Record<Kind, (link: string) => string>> = {
  verification: (link) =>
    `Conferma la tua email aprendo questo collegamento:\n\n${link}\n\nSe non hai richiesto un account Lilleri, ignora questa email.`,
  reset: (link) =>
    `Per scegliere una nuova password, apri questo collegamento entro 15 minuti:\n\n${link}\n\nSe non hai richiesto il recupero, ignora questa email. La tua password rimarrà invariata.`,
  plus: (link) =>
    `Ti eri iscritto alla lista Fondatori di Lilleri Plus: ora puoi collegare la tua banca e ricevere saldi e movimenti in automatico.\n\nApri Lilleri e attiva Plus da Impostazioni › Abbonamento:\n\n${link}\n\nCome Fondatore, il prezzo con cui attivi Plus resta lo stesso finché mantieni l’abbonamento.\n\nTi scriviamo una sola volta perché lo avevi chiesto tu nell’app. Non riceverai altri messaggi su questo.`,
}
const linkAllowed = (link: URL, kind: Kind) =>
  kind === 'verification'
    ? link.pathname === '/api/auth/verify-email'
    : kind === 'reset'
      ? /^\/api\/auth\/reset-password\/[A-Za-z0-9_-]+$/.test(link.pathname)
      : `${link.pathname}${link.search}` === PLUS_AVAILABLE_PATH && !link.hash

/** Only links to this exact origin's verification/reset routes and the Plus page can be mailed. */
function prepare(base: URL, message: IdentityMailMessage, kind: Kind): PreparedMessage {
  if (!EMAIL.test(message.email) || message.email.length > 254)
    throw new Error('Invalid identity mail recipient')
  const link = new URL(message.url)
  if (link.origin !== base.origin || link.username || link.password || !linkAllowed(link, kind))
    throw new Error('Invalid identity mail link')
  return { email: message.email, subject: SUBJECTS[kind], text: texts[kind](link.href) }
}
function delivery(
  base: URL,
  transport: (message: PreparedMessage) => Promise<void>,
): IdentityDelivery {
  const send = async (message: IdentityMailMessage, kind: Kind) => {
    const prepared = prepare(base, message, kind)
    try {
      await transport(prepared)
    } catch {
      // Provider response bodies can contain message content, addresses and credentials.
      throw new Error('Identity mail delivery is unavailable')
    }
  }
  return {
    sendVerification: (message) => send(message, 'verification'),
    sendPasswordReset: (message) => send(message, 'reset'),
    sendPlusAvailable: (message) => send(message, 'plus'),
  }
}
const nonEmptyId = (value: unknown) => typeof value === 'string' && value.length > 0

/** Provider acceptance is awaited; transport failures never become a fake delivery success. */
export function createResendIdentityDelivery(
  options: ResendIdentityDeliveryOptions,
): IdentityDelivery {
  secret(options.apiKey, 'Identity mail API key')
  assertSender(options.from)
  const base = applicationOrigin(options.baseURL)
  const transport = options.fetch ?? globalThis.fetch
  return delivery(base, async (message) => {
    const response = await transport('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: `Lilleri <${options.from}>`,
        to: [message.email],
        subject: message.subject,
        text: message.text,
      }),
    })
    if (!response.ok) throw new Error('Mail was not accepted')
    const receipt: unknown = await response.json()
    if (!receipt || typeof receipt !== 'object' || !('id' in receipt) || !nonEmptyId(receipt.id))
      throw new Error('Mail receipt is unavailable')
  })
}

/** Scaleway Transactional Email: EU (Paris) processing; one recipient per API call. */
export function createScalewayIdentityDelivery(
  options: ScalewayIdentityDeliveryOptions,
): IdentityDelivery {
  secret(options.secretKey, 'Identity mail secret key')
  if (!UUID.test(options.projectId)) throw new Error('Identity mail project is required')
  assertSender(options.from)
  const base = applicationOrigin(options.baseURL)
  const region = options.region ?? 'fr-par'
  if (region !== 'fr-par') throw new Error('Identity mail region is unsupported')
  const transport = options.fetch ?? globalThis.fetch
  return delivery(base, async (message) => {
    const response = await transport(
      `https://api.scaleway.com/transactional-email/v1alpha1/regions/${region}/emails`,
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: { 'x-auth-token': options.secretKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: { email: options.from, name: 'Lilleri' },
          to: [{ email: message.email }],
          subject: message.subject,
          text: message.text,
          project_id: options.projectId,
        }),
      },
    )
    if (!response.ok) throw new Error('Mail was not accepted')
    const receipt: unknown = await response.json()
    const emails =
      receipt && typeof receipt === 'object' && 'emails' in receipt ? receipt.emails : receipt
    const accepted = Array.isArray(emails) ? emails : [emails]
    if (
      !accepted.length ||
      !accepted.every(
        (row) =>
          row &&
          typeof row === 'object' &&
          'id' in row &&
          nonEmptyId(row.id) &&
          !('status' in row && (row.status === 'failed' || row.status === 'canceled')),
      )
    )
      throw new Error('Mail receipt is unavailable')
  })
}
