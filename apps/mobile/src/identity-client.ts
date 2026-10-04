import { passkeyClient } from '@better-auth/passkey/client'
import { ApiError, createApiClient } from '@lilleri/api-client'
import { createAuthClient } from 'better-auth/client'
import { twoFactorClient } from 'better-auth/client/plugins'
import {
  assertHostedIdentityClientConfiguration,
  type HostedIdentityClientOptions,
} from './identity-recovery'

export const LOCAL_TERMS_VERSION = 'local-synthetic-terms-v1'
export interface LocalIdentitySession {
  readonly user: {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly twoFactorEnabled: boolean
  }
  readonly principal: {
    readonly userId: string
    readonly sessionId: string
    readonly profileId: string
    readonly role: 'owner' | 'editor' | 'viewer'
  }
  readonly expiresAt: string
}
export interface LocalSessionRecord {
  readonly id: string
  readonly current: boolean
  readonly createdAt: string
  readonly expiresAt: string
}
export interface LocalPasskeyRecord {
  readonly id: string
  readonly name: string | null
  readonly createdAt: string
}
interface AuthFailure {
  readonly status: number
  readonly code?: string | undefined
}
function checked(result: { readonly error: AuthFailure | null }) {
  if (!result.error) return
  const { status, code } = result.error
  const detail =
    code === 'reauthentication_required'
      ? 'Conferma la tua identità prima di continuare.'
      : status === 429
        ? 'Troppi tentativi. Attendi un minuto e riprova.'
        : code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
          ? 'Non riesco a creare questo profilo. Usa un altro indirizzo o accedi.'
          : code === 'PASSWORD_TOO_SHORT' || code === 'PASSWORD_TOO_LONG'
            ? 'Usa una password da 12 a 128 caratteri.'
            : code === 'INVALID_CODE' || code === 'INVALID_BACKUP_CODE'
              ? 'Il codice non è valido. Controllalo e riprova.'
              : 'Non riesco a completare l’accesso. Controlla i dati e riprova.'
  // Library error messages and response objects may contain sensitive data: never echo them.
  throw new ApiError(status, code ?? 'authentication_failed', detail)
}
const failedResponse = () =>
  new ApiError(502, 'authentication_failed', 'Non riesco a verificare la sessione. Riprova.')
const iso = (value: string | Date) => new Date(value).toISOString()
const expiresAt = (expiry: string | Date, created: string | Date, days = 90) =>
  new Date(
    Math.min(new Date(expiry).getTime(), new Date(created).getTime() + days * 24 * 60 * 60 * 1000),
  ).toISOString()

/** Cookies are managed by the browser; no credential or token is stored by the app. */
export function createLocalIdentityClient(baseUrl: string) {
  return createIdentityClient(baseUrl)
}
export function createHostedIdentityClient(baseUrl: string, options: HostedIdentityClientOptions) {
  assertHostedIdentityClientConfiguration(baseUrl, options)
  return createIdentityClient(baseUrl, options)
}
function createIdentityClient(baseUrl: string, hosted?: HostedIdentityClientOptions) {
  const auth = createAuthClient({
    baseURL: baseUrl,
    basePath: '/api/auth',
    fetchOptions: { credentials: 'include' },
    plugins: [passkeyClient(), twoFactorClient()],
  })
  const { request } = createApiClient(baseUrl)
  return {
    async session(): Promise<LocalIdentitySession | null> {
      const result = await auth.getSession({ query: { disableCookieCache: true } })
      if (result.error?.status === 401) return null
      checked(result)
      if (!result.data) return null
      try {
        const principal = await request<LocalIdentitySession['principal']>('/v1/auth/principal')
        const user = result.data.user
        if (user.id !== principal.userId || result.data.session.id !== principal.sessionId)
          return null
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            twoFactorEnabled: user.twoFactorEnabled === true,
          },
          principal,
          expiresAt: expiresAt(
            result.data.session.expiresAt,
            result.data.session.createdAt,
            hosted ? 30 : 90,
          ),
        }
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) return null
        throw cause
      }
    },
    async signUp(name: string, email: string, password: string) {
      const input = {
        name,
        email,
        password,
        adultAttested: true,
        termsVersion: hosted?.termsVersion ?? LOCAL_TERMS_VERSION,
        ...(hosted ? { callbackURL: `${baseUrl}/` } : {}),
      }
      checked(await auth.signUp.email(input))
    },
    async requestPasswordReset(email: string) {
      if (!hosted)
        throw new ApiError(
          400,
          'recovery_unavailable',
          'Il recupero email richiede un servizio di invio configurato.',
        )
      checked(
        await auth.requestPasswordReset({ email, redirectTo: `${baseUrl}/?identity=recover` }),
      )
    },
    async resetPassword(token: string, newPassword: string) {
      if (!hosted)
        throw new ApiError(
          400,
          'recovery_unavailable',
          'Il recupero email richiede un servizio di invio configurato.',
        )
      checked(await auth.resetPassword({ token, newPassword }))
    },
    async resendVerification(email: string) {
      if (!hosted)
        throw new ApiError(
          400,
          'recovery_unavailable',
          'La verifica email richiede un servizio di invio configurato.',
        )
      checked(await auth.sendVerificationEmail({ email, callbackURL: `${baseUrl}/` }))
    },
    async signIn(
      email: string,
      password: string,
    ): Promise<{ readonly needsSecondFactor: boolean }> {
      const result = await auth.signIn.email({ email, password })
      checked(result)
      return {
        needsSecondFactor:
          result.data !== null &&
          'twoFactorRedirect' in result.data &&
          result.data.twoFactorRedirect === true,
      }
    },
    async verifyFactor(code: string, backup: boolean) {
      checked(
        backup
          ? await auth.twoFactor.verifyBackupCode({ code, trustDevice: false })
          : await auth.twoFactor.verifyTotp({ code, trustDevice: false }),
      )
    },
    async signOut() {
      checked(await auth.signOut())
    },
    async signInPasskey() {
      checked(await auth.signIn.passkey())
    },
    async addPasskey(name: string) {
      checked(await auth.passkey.addPasskey({ name }))
    },
    async passkeys(): Promise<readonly LocalPasskeyRecord[]> {
      const result = await auth.passkey.listUserPasskeys()
      checked(result)
      if (!result.data) throw failedResponse()
      return result.data.map((key) => ({
        id: key.id,
        name: key.name ?? null,
        createdAt: iso(key.createdAt),
      }))
    },
    async deletePasskey(id: string) {
      checked(await auth.passkey.deletePasskey({ id }))
    },
    async enableTwoFactor(password: string) {
      const result = await auth.twoFactor.enable({ password })
      checked(result)
      if (result.data?.method !== 'totp') throw failedResponse()
      return { totpURI: result.data.totpURI, backupCodes: result.data.backupCodes }
    },
    async disableTwoFactor(password: string) {
      checked(await auth.twoFactor.disable({ password }))
    },
    async sessions(): Promise<readonly LocalSessionRecord[]> {
      return (
        await request<{ sessions: readonly LocalSessionRecord[] }>('/v1/auth/sessions')
      ).sessions.map((record) => ({
        ...record,
        expiresAt: expiresAt(record.expiresAt, record.createdAt, hosted ? 30 : 90),
      }))
    },
    revokeSession: (id: string) =>
      request<void>(`/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    revokeAllSessions: () => request<void>('/v1/auth/sessions', { method: 'DELETE' }),
    reauthenticate: (password: string, code?: string) =>
      request<{ verified: true; expiresAt: string }>('/v1/auth/reauthenticate', {
        method: 'POST',
        body: JSON.stringify({ password, ...(code ? { code } : {}) }),
      }),
  }
}
