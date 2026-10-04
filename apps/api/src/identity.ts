import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { passkey } from '@better-auth/passkey'
import { type Database, schema } from '@lilleri/database'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { and, asc, eq } from 'drizzle-orm'
import type { IdentityDelivery } from './identity-mail.js'
import { createIdentityQuota } from './identity-quota.js'
import * as identity from './identity-schema.js'
import { notFound, Problem } from './problem.js'

export const LOCAL_TERMS_VERSION = 'local-synthetic-terms-v1'
export const STEP_UP_SECONDS = 300
const SESSION_SECONDS = 90 * 24 * 60 * 60
const unavailable = () => new Problem(401, 'session_invalid', 'Accedi di nuovo per continuare.')
const reauthenticationRequired = () =>
  new Problem(401, 'reauthentication_required', 'Conferma la tua identità prima di continuare.')

export interface LocalIdentityOptions {
  readonly db: Database
  readonly baseURL: string
  readonly secret: string
  readonly environment?: string
  readonly allowedOrigins?: readonly string[]
  /** An explicit local delivery adapter; no e-mail provider or public mailbox is installed. */
  readonly deliverVerification?: (message: { email: string; url: string }) => Promise<void>
  readonly now?: () => Date
}
export interface HostedIdentityOptions
  extends Omit<LocalIdentityOptions, 'deliverVerification' | 'environment'> {
  /** An explicit reviewed version; the local synthetic draft is never a hosted acceptance. */
  readonly termsVersion: string
  readonly delivery: IdentityDelivery
}
export interface FinancialPrincipal {
  readonly userId: string
  readonly sessionId: string
  readonly profileId: string
  readonly role: 'owner' | 'editor' | 'viewer'
}

export function assertLocalIdentityConfiguration(options: Omit<LocalIdentityOptions, 'db'>) {
  const url = new URL(options.baseURL)
  if (options.environment === 'production' || process.env.NODE_ENV === 'production')
    throw new Error('Local synthetic authentication cannot run in production')
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('LOCAL_AUTH_BASE_URL must be an HTTP loopback origin')
  if (options.secret.length < 32 || !options.secret.trim())
    throw new Error('LOCAL_AUTH_SECRET must contain at least 32 characters')
  for (const origin of options.allowedOrigins ?? []) {
    const allowed = new URL(origin)
    if (
      allowed.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(allowed.hostname) ||
      allowed.origin !== origin
    )
      throw new Error('Local authentication origins must be exact HTTP loopback origins')
  }
}

export function assertHostedIdentityConfiguration(options: Omit<HostedIdentityOptions, 'db'>) {
  const url = new URL(options.baseURL)
  if (
    url.protocol !== 'https:' ||
    options.baseURL !== url.origin ||
    url.username ||
    url.password ||
    url.port ||
    isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
    !url.hostname.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname)
  )
    throw new Error('Hosted authentication requires an exact public HTTPS origin')
  if (options.secret.length < 32 || !options.secret.trim())
    throw new Error('Hosted authentication secret must contain at least 32 characters')
  if ((options.allowedOrigins ?? []).some((origin) => origin !== url.origin))
    throw new Error('Hosted authentication requires the same exact HTTPS browser origin')
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(options.termsVersion) ||
    options.termsVersion === LOCAL_TERMS_VERSION ||
    /(?:local|synthetic)/i.test(options.termsVersion)
  )
    throw new Error('Hosted authentication requires an explicit reviewed terms version')
  if (
    typeof options.delivery?.sendVerification !== 'function' ||
    typeof options.delivery?.sendPasswordReset !== 'function'
  )
    throw new Error('Hosted authentication requires verification and password recovery delivery')
}

function sanitise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitise)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !['token', 'accessToken', 'refreshToken', 'idToken', 'password', 'publicKey'].includes(
              key,
            ),
        )
        .map(([key, item]) => [key, sanitise(item)]),
    )
  return value
}

/** Explicit development-only library integration, never a production auth switch. */
export function createLocalIdentity(options: LocalIdentityOptions) {
  assertLocalIdentityConfiguration(options)
  return createIdentity(options)
}

/** Separate explicit release boundary. This never upgrades or relaxes local/demo mode. */
export function createHostedIdentity(options: HostedIdentityOptions) {
  assertHostedIdentityConfiguration(options)
  return createIdentity(
    { ...options, deliverVerification: options.delivery.sendVerification },
    options,
  )
}

function createIdentity(
  options: LocalIdentityOptions,
  hosted?: HostedIdentityOptions,
  recoveryTransaction = false,
) {
  const now = options.now ?? (() => new Date())
  const origins = [...new Set([new URL(options.baseURL).origin, ...(options.allowedOrigins ?? [])])]
  const termsVersion = hosted?.termsVersion ?? LOCAL_TERMS_VERSION
  const sessionSeconds = hosted ? 30 * 24 * 60 * 60 : SESSION_SECONDS
  const consumeQuota = hosted ? createIdentityQuota(options.db, options.secret) : undefined
  const requestQuotas = new Map<string, { count: number; expiresAt: number }>()
  const deliveryState = new AsyncLocalStorage<{ failed: boolean }>()
  const deliver = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch {
      const state = deliveryState.getStore()
      if (state) state.failed = true
      throw new APIError('SERVICE_UNAVAILABLE', {
        code: 'EMAIL_DELIVERY_UNAVAILABLE',
        message: 'Invio email non disponibile. Riprova.',
      })
    }
  }
  const auth = betterAuth({
    appName: hosted ? 'Lilleri' : 'Lilleri locale — dati sintetici',
    baseURL: options.baseURL,
    basePath: '/api/auth',
    secret: options.secret,
    database: drizzleAdapter(options.db, { provider: 'pg', schema: identity.authSchema }),
    telemetry: { enabled: false },
    logger: { disabled: true },
    trustedOrigins: origins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: Boolean(options.deliverVerification),
      revokeSessionsOnPasswordReset: true,
      ...(hosted
        ? {
            resetPasswordTokenExpiresIn: 15 * 60,
            sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) =>
              deliver(() => hosted.delivery.sendPasswordReset({ email: user.email, url })),
          }
        : {}),
    },
    ...(options.deliverVerification
      ? {
          emailVerification: {
            sendOnSignUp: true,
            autoSignInAfterVerification: false,
            expiresIn: 60 * 60,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string }
              url: string
            }) =>
              hosted
                ? deliver(() => hosted.delivery.sendVerification({ email: user.email, url }))
                : options.deliverVerification?.({ email: user.email, url }),
          },
        }
      : {}),
    user: {
      additionalFields: {
        adultAttested: { type: 'boolean', required: true, input: true },
        termsVersion: { type: 'string', required: true, input: true },
      },
    },
    session: {
      expiresIn: sessionSeconds,
      updateAge: 24 * 60 * 60,
      freshAge: STEP_UP_SECONDS,
      cookieCache: { enabled: false },
    },
    advanced: {
      cookiePrefix: hosted ? 'lilleri-hosted' : 'lilleri-local',
      useSecureCookies: Boolean(hosted),
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'strict',
        secure: Boolean(hosted),
        path: '/',
      },
      disableOriginCheck: false,
      disableCSRFCheck: false,
      trustedProxyHeaders: false,
      ipAddress: { ipAddressHeaders: [], disableIpTracking: false },
    },
    rateLimit: {
      enabled: !recoveryTransaction,
      storage: 'memory',
      // The library's disabled IP tracking also disables its rate limiter. Use a
      // per-instance atomic quota with no trusted caller-supplied IP headers.
      // This loopback service has one local bucket per allowlisted auth path.
      customStorage: {
        consume: async (key, rule) => {
          if (consumeQuota) return consumeQuota(`library:${key}`, rule)
          const at = Date.now(),
            old = requestQuotas.get(key)
          const quota =
            old && old.expiresAt > at ? old : { count: 0, expiresAt: at + rule.window * 1000 }
          if (quota.count >= rule.max)
            return { allowed: false, retryAfter: Math.ceil((quota.expiresAt - at) / 1000) }
          quota.count += 1
          requestQuotas.set(key, quota)
          return { allowed: true, retryAfter: null }
        },
      },
      window: 60,
      max: 40,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/two-factor/verify-backup-code': { window: 60, max: 5 },
        ...(hosted
          ? {
              '/request-password-reset': { window: 60, max: 5 },
              '/reset-password': { window: 60, max: 5 },
              '/send-verification-email': { window: 60, max: 5 },
            }
          : {}),
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.adultAttested !== true || user.termsVersion !== termsVersion)
              throw new APIError('BAD_REQUEST', {
                code: 'ACCEPTANCE_REQUIRED',
                message: hosted
                  ? 'Conferma maggiore età e condizioni.'
                  : 'Conferma maggiore età e condizioni locali.',
              })
          },
          after: async (user) => {
            const at = now(),
              profileId = `profile_${hosted ? 'hosted' : 'local'}_${randomUUID()}`
            await options.db.transaction(async (db) => {
              await db.insert(schema.profiles).values({
                id: profileId,
                name: hosted ? 'Il mio profilo' : 'Profilo locale sintetico',
                timezone: 'Europe/Rome',
                createdAt: at.toISOString(),
              })
              await db
                .insert(identity.memberships)
                .values({ userId: user.id, profileId, role: 'owner', createdAt: at })
              await db.insert(identity.acceptances).values([
                {
                  userId: user.id,
                  kind: 'adult_attestation',
                  textVersion: '18-plus-self-attestation-v1',
                  acceptedAt: at,
                },
                {
                  userId: user.id,
                  kind: 'terms',
                  textVersion: termsVersion,
                  acceptedAt: at,
                },
              ])
            })
          },
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: hosted ? 'Lilleri' : 'Lilleri locale',
        skipVerificationOnEnable: false,
        backupCodeOptions: { storeBackupCodes: 'encrypted' },
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 60 },
      }),
      passkey({
        rpID: new URL(options.baseURL).hostname,
        rpName: hosted ? 'Lilleri' : 'Lilleri locale',
        origin: origins,
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        registration: {
          requireSession: true,
          afterVerification: async ({ verification }) => {
            if (!verification.registrationInfo?.userVerified)
              throw new APIError('FORBIDDEN', {
                code: 'USER_VERIFICATION_REQUIRED',
                message: 'Verifica utente richiesta.',
              })
          },
        },
        authentication: {
          afterVerification: async ({ verification }) => {
            if (!verification.authenticationInfo.userVerified)
              throw new APIError('FORBIDDEN', {
                code: 'USER_VERIFICATION_REQUIRED',
                message: 'Verifica utente richiesta.',
              })
          },
        },
      }),
    ],
  })

  const allowedPaths = new Set([
    '/sign-up/email',
    '/sign-in/email',
    '/sign-out',
    '/get-session',
    '/verify-email',
    '/passkey/generate-register-options',
    '/passkey/verify-registration',
    '/passkey/generate-authenticate-options',
    '/passkey/verify-authentication',
    '/passkey/list-user-passkeys',
    '/passkey/delete-passkey',
    '/passkey/update-passkey',
    '/two-factor/enable',
    '/two-factor/disable',
    '/two-factor/get-totp-uri',
    '/two-factor/verify-totp',
    '/two-factor/verify-backup-code',
    '/two-factor/generate-backup-codes',
  ])
  if (hosted)
    for (const path of ['/send-verification-email', '/request-password-reset', '/reset-password'])
      allowedPaths.add(path)
  function checkOrigin(headers: Headers, mutation: boolean) {
    const origin = headers.get('origin')
    if ((mutation && !origin) || (origin && !origins.includes(origin)))
      throw new Problem(403, 'origin_forbidden', 'Questa origine non può usare il servizio.')
  }
  async function authenticatedSession(headers: Headers) {
    const result = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    })
    const at = now().getTime()
    if (
      !result ||
      (hosted && !result.user.emailVerified) ||
      result.session.expiresAt.getTime() <= at ||
      result.session.createdAt.getTime() + sessionSeconds * 1000 <= at
    )
      throw unavailable()
    return result
  }
  async function financialPrincipal(
    headers: Headers,
    controls: { mutation?: boolean; sensitive?: boolean; ownerOnly?: boolean } = {},
  ): Promise<FinancialPrincipal> {
    checkOrigin(headers, controls.mutation ?? false)
    const result = await authenticatedSession(headers)
    const [membership] = await options.db
      .select()
      .from(identity.memberships)
      .where(eq(identity.memberships.userId, result.user.id))
      .orderBy(asc(identity.memberships.createdAt), asc(identity.memberships.profileId))
      .limit(1)
    if (!membership) throw notFound()
    if (controls.mutation && membership.role === 'viewer') throw notFound()
    if (controls.ownerOnly && membership.role !== 'owner') throw notFound()
    if (controls.sensitive) {
      const [stepUp] = await options.db
        .select()
        .from(identity.stepUps)
        .where(eq(identity.stepUps.sessionId, result.session.id))
      const age = stepUp ? now().getTime() - stepUp.verifiedAt.getTime() : Number.POSITIVE_INFINITY
      if (age < 0 || age >= STEP_UP_SECONDS * 1000) throw reauthenticationRequired()
    }
    return {
      userId: result.user.id,
      sessionId: result.session.id,
      profileId: membership.profileId,
      role: membership.role,
    }
  }
  const attempts = new Map<string, { count: number; expiresAt: number }>()
  async function reauthenticate(headers: Headers, password: string, code?: string) {
    checkOrigin(headers, true)
    const result = await authenticatedSession(headers)
    if (
      consumeQuota &&
      !(await consumeQuota(`reauthenticate:${result.user.id}`, { window: 60, max: 5 })).allowed
    )
      throw new Problem(429, 'rate_limited', 'Troppi tentativi. Riprova tra un minuto.')
    const at = now().getTime(),
      old = attempts.get(result.user.id)
    const attempt = old && old.expiresAt > at ? old : { count: 0, expiresAt: at + 60_000 }
    attempt.count += 1
    attempts.set(result.user.id, attempt)
    if (attempts.size > 1000)
      for (const [key, value] of attempts) if (value.expiresAt <= at) attempts.delete(key)
    if (attempt.count > 5)
      throw new Problem(429, 'rate_limited', 'Troppi tentativi. Riprova tra un minuto.')
    try {
      await auth.api.verifyPassword({ headers, body: { password } })
      if (result.user.twoFactorEnabled) {
        if (!code) throw unavailable()
        await auth.api.verifyTOTP({ headers, body: { code, trustDevice: false } })
      }
    } catch {
      throw unavailable()
    }
    // Session may have been revoked concurrently with password verification. An FK alone
    // is insufficient: lock/re-read and enforce lifecycle before granting step-up.
    await options.db.transaction(async (db) => {
      const [current] = await db
        .select()
        .from(identity.session)
        .where(
          and(
            eq(identity.session.id, result.session.id),
            eq(identity.session.userId, result.user.id),
          ),
        )
        .for('update')
      if (!current || current.expiresAt.getTime() <= now().getTime()) throw unavailable()
      await db
        .insert(identity.stepUps)
        .values({ sessionId: current.id, verifiedAt: now() })
        .onConflictDoUpdate({ target: identity.stepUps.sessionId, set: { verifiedAt: now() } })
    })
    return {
      verified: true as const,
      expiresAt: new Date(now().getTime() + STEP_UP_SECONDS * 1000).toISOString(),
    }
  }
  async function sessions(headers: Headers) {
    const result = await authenticatedSession(headers)
    const rows = await options.db
      .select()
      .from(identity.session)
      .where(eq(identity.session.userId, result.user.id))
      .orderBy(asc(identity.session.createdAt))
    return rows
      .filter(
        (row) =>
          row.expiresAt.getTime() > now().getTime() &&
          row.createdAt.getTime() + sessionSeconds * 1000 > now().getTime(),
      )
      .map((row) => ({
        id: row.id,
        current: row.id === result.session.id,
        createdAt: row.createdAt.toISOString(),
        expiresAt: new Date(
          Math.min(row.expiresAt.getTime(), row.createdAt.getTime() + sessionSeconds * 1000),
        ).toISOString(),
      }))
  }
  async function revokeSession(headers: Headers, id: string) {
    checkOrigin(headers, true)
    const result = await authenticatedSession(headers)
    const [owned] = await options.db
      .select()
      .from(identity.session)
      .where(and(eq(identity.session.id, id), eq(identity.session.userId, result.user.id)))
    if (!owned) throw notFound()
    await auth.api.revokeSession({ headers, body: { token: owned.token } })
  }
  async function revokeAllSessions(headers: Headers) {
    checkOrigin(headers, true)
    await authenticatedSession(headers)
    await auth.api.revokeSessions({ headers })
  }
  async function exportIdentity(headers: Headers) {
    const result = await authenticatedSession(headers)
    const acceptances = await options.db
      .select()
      .from(identity.acceptances)
      .where(eq(identity.acceptances.userId, result.user.id))
      .orderBy(asc(identity.acceptances.kind))
    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        adultAttested: result.user.adultAttested,
        termsVersion: result.user.termsVersion,
        twoFactorEnabled: result.user.twoFactorEnabled === true,
        createdAt: result.user.createdAt.toISOString(),
      },
      acceptances: acceptances.map((row) => ({
        kind: row.kind,
        textVersion: row.textVersion,
        acceptedAt: row.acceptedAt.toISOString(),
      })),
      sessions: await sessions(headers),
    }
  }
  async function eraseIdentity(principal: FinancialPrincipal, db: Database) {
    // The caller captures the verified owner before the financial transaction.
    // Use its transaction so revocation races cannot interrupt authorised erasure
    // and a credential-cleanup failure rolls back financial/tombstone/outbox writes.
    await db.delete(identity.user).where(eq(identity.user.id, principal.userId))
  }
  async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url),
      path = url.pathname.slice('/api/auth'.length)
    const recoveryCallback = Boolean(hosted && /^\/reset-password\/[A-Za-z0-9_-]+$/.test(path))
    if (!allowedPaths.has(path) && !recoveryCallback) throw notFound()
    if (hosted && url.origin !== new URL(options.baseURL).origin)
      throw new Problem(403, 'origin_forbidden', 'Questa origine non può usare il servizio.')
    checkOrigin(request.headers, !['GET', 'HEAD'].includes(request.method))
    if (hosted) {
      // Keep callback/redirect checks independent of the library's optional ambient trusted origins.
      let body: unknown
      if (request.method === 'POST') {
        try {
          body = await request.clone().json()
        } catch {
          throw new Problem(400, 'invalid_request', 'Richiesta non valida.')
        }
      }
      for (const callback of [
        url.searchParams.get('callbackURL'),
        ...(body && typeof body === 'object'
          ? ['callbackURL', 'redirectTo'].map((key) => (body as Record<string, unknown>)[key])
          : []),
      ]) {
        if (callback === undefined || callback === null || callback === '') continue
        if (typeof callback !== 'string')
          throw new Problem(400, 'invalid_request', 'Collegamento non valido.')
        let target: URL
        try {
          target = new URL(callback, options.baseURL)
        } catch {
          throw new Problem(400, 'invalid_request', 'Collegamento non valido.')
        }
        if (target.origin !== url.origin || target.username || target.password)
          throw new Problem(403, 'origin_forbidden', 'Collegamento non consentito.')
      }
    }
    if (hosted && path === '/reset-password' && !recoveryTransaction) {
      // Better Auth owns token consumption and password hashing. Run that entire flow,
      // including all-session revocation, on one trusted transaction-bound adapter.
      // Consume the quota outside it so a rejected reset cannot roll its attempt back.
      const quota = await consumeQuota?.('password-reset-command', { window: 60, max: 5 })
      if (!quota?.allowed)
        return new Response(JSON.stringify({ code: 'rate_limited' }), {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': String(quota?.retryAfter ?? 60),
          },
        })
      class ResetRejected extends Error {
        constructor(readonly response: Response) {
          super('Password reset rejected')
        }
      }
      try {
        return await options.db.transaction(async (db) => {
          const response = await createIdentity(
            { ...options, db },
            { ...hosted, db },
            true,
          ).handler(request)
          if (!response.ok) throw new ResetRejected(response)
          return response
        })
      } catch (error) {
        if (error instanceof ResetRejected) return error.response
        throw error
      }
    }
    const credentialChanges = new Set([
      '/passkey/generate-register-options',
      '/passkey/verify-registration',
      '/passkey/delete-passkey',
      '/passkey/update-passkey',
      '/two-factor/enable',
      '/two-factor/disable',
      '/two-factor/get-totp-uri',
      '/two-factor/generate-backup-codes',
    ])
    if (credentialChanges.has(path)) {
      const authenticated = await authenticatedSession(request.headers)
      const age = now().getTime() - authenticated.session.createdAt.getTime()
      if (age < 0 || age >= STEP_UP_SECONDS * 1000) {
        const [stepUp] = await options.db
          .select()
          .from(identity.stepUps)
          .where(eq(identity.stepUps.sessionId, authenticated.session.id))
        const stepUpAge = stepUp
          ? now().getTime() - stepUp.verifiedAt.getTime()
          : Number.POSITIVE_INFINITY
        if (stepUpAge < 0 || stepUpAge >= STEP_UP_SECONDS * 1000) throw reauthenticationRequired()
      }
    }
    const state = { failed: false }
    const response = await deliveryState.run(state, () => auth.handler(request))
    // The library intentionally catches background-task errors, even when awaiting them.
    // Track delivery per request so hosted registration/recovery cannot claim success.
    if (hosted && state.failed)
      return new Response(
        JSON.stringify({
          code: 'EMAIL_DELIVERY_UNAVAILABLE',
          message: 'Invio email non disponibile. Riprova.',
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        },
      )
    if (!response.headers.get('content-type')?.includes('application/json')) return response
    const headers = new Headers(response.headers)
    if (response.status === 429 && headers.has('x-retry-after'))
      headers.set('retry-after', headers.get('x-retry-after') ?? '60')
    headers.delete('content-length')
    const text = await response.text()
    if (!text) return new Response(null, { status: response.status, headers })
    return new Response(JSON.stringify(sanitise(JSON.parse(text))), {
      status: response.status,
      headers,
    })
  }
  return {
    handler,
    financialPrincipal,
    reauthenticate,
    sessions,
    revokeSession,
    revokeAllSessions,
    eraseIdentity,
    exportIdentity,
    checkOrigin,
  }
}
export type LocalIdentity = ReturnType<typeof createLocalIdentity>
