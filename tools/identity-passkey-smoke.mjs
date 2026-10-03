/** Executed browser evidence; requires Chromium + Playwright in the tooling environment. */
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { createApp } from '../apps/api/dist/app.js'
import * as identity from '../apps/api/dist/identity-schema.js'
import { openDatabase } from '../packages/database/dist/index.js'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const { eq } = createRequire(new URL('../apps/api/package.json', import.meta.url))('drizzle-orm')
const reserve = createServer()
await new Promise((resolve, reject) => reserve.listen(0, '127.0.0.1', resolve).on('error', reject))
const port = reserve.address().port
await new Promise((resolve, reject) =>
  reserve.close((error) => (error ? reject(error) : resolve())),
)
const baseURL = `http://localhost:${port}`
const handle = await openDatabase({ driver: 'pglite' })
const app = await createApp({
  db: handle.db,
  demoMode: false,
  localIdentity: {
    baseURL,
    secret: randomBytes(48).toString('base64'),
    allowedOrigins: [baseURL],
  },
})
const browser = await chromium.launch({
  executablePath: process.argv[2] ?? '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
})
try {
  await app.listen({ host: '127.0.0.1', port })
  const page = await browser.newPage()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
  await page.goto(`${baseURL}/health`)
  const email = `passkey-${randomUUID()}@example.invalid`
  const result = await page.evaluate(
    async ({ email }) => {
      const decode = (value) =>
        Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) =>
          character.charCodeAt(0),
        )
      const call = async (path, body) => {
        const response = await fetch(path, {
          credentials: 'include',
          ...(body
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              }
            : {}),
        })
        return { status: response.status, value: await response.json() }
      }
      const signedUp = await call('/api/auth/sign-up/email', {
        name: 'Persona passkey sintetica',
        email,
        password: 'Local synthetic password 29!',
        adultAttested: true,
        termsVersion: 'local-synthetic-terms-v1',
      })
      if (signedUp.status !== 200) throw new Error(`Signup failed: ${signedUp.status}`)
      const generated = await call('/api/auth/passkey/generate-register-options')
      if (generated.status !== 200)
        throw new Error(`Registration options failed: ${generated.status}`)
      const publicKey = generated.value
      publicKey.challenge = decode(publicKey.challenge)
      publicKey.user.id = decode(publicKey.user.id)
      publicKey.excludeCredentials = publicKey.excludeCredentials?.map((item) => ({
        ...item,
        id: decode(item.id),
      }))
      const credential = await navigator.credentials.create({ publicKey })
      const response = credential.toJSON()
      const registered = await call('/api/auth/passkey/verify-registration', {
        response,
        name: 'Autenticatore virtuale sintetico',
      })
      const replayedRegistration = await call('/api/auth/passkey/verify-registration', {
        response,
        name: 'Replay',
      })
      const list = await call('/api/auth/passkey/list-user-passkeys')
      const signedOut = await call('/api/auth/sign-out', {})
      return {
        registered: registered.status,
        replayedRegistration: replayedRegistration.status,
        passkeys: list.value.length,
        signedOut: signedOut.status,
        secretEchoed: JSON.stringify(registered.value).includes('publicKey'),
      }
    },
    { email },
  )
  assert.equal(result.registered, 200)
  assert.notEqual(result.replayedRegistration, 200)
  assert.equal(result.passkeys, 1)
  assert.equal(result.signedOut, 200)
  assert.equal(result.secretEchoed, false)

  async function authenticate({ tamperOrigin = false, userVerification = 'required' } = {}) {
    return page.evaluate(
      async ({ tamperOrigin, userVerification }) => {
        const decode = (value) =>
          Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) =>
            character.charCodeAt(0),
          )
        const response = await fetch('/api/auth/passkey/generate-authenticate-options', {
          credentials: 'include',
        })
        const publicKey = await response.json()
        publicKey.challenge = decode(publicKey.challenge)
        publicKey.userVerification = userVerification
        publicKey.allowCredentials = publicKey.allowCredentials?.map((item) => ({
          ...item,
          id: decode(item.id),
        }))
        const credential = await navigator.credentials.get({ publicKey })
        const assertion = credential.toJSON()
        if (tamperOrigin) {
          const clientData = JSON.parse(
            new TextDecoder().decode(decode(assertion.response.clientDataJSON)),
          )
          clientData.origin = 'http://attacker.example'
          assertion.response.clientDataJSON = btoa(JSON.stringify(clientData))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        }
        const verified = await fetch('/api/auth/passkey/verify-authentication', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: assertion }),
        })
        const value = await verified.json()
        const replay = await fetch('/api/auth/passkey/verify-authentication', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: assertion }),
        })
        const overview = await fetch('/v1/demo', { credentials: 'include' })
        return {
          status: verified.status,
          replay: replay.status,
          overview: overview.status,
          secretEchoed: JSON.stringify(value).includes('"token"'),
          code: value.code,
        }
      },
      { tamperOrigin, userVerification },
    )
  }
  const wrongOrigin = await authenticate({ tamperOrigin: true })
  assert.notEqual(wrongOrigin.status, 200)
  assert.equal(wrongOrigin.overview, 401)
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false })
  const noUserVerification = await authenticate({ userVerification: 'discouraged' })
  assert.equal(noUserVerification.status, 403)
  assert.equal(noUserVerification.code, 'USER_VERIFICATION_REQUIRED')
  assert.equal(noUserVerification.overview, 401)
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: true })
  const [storedKey] = await handle.db.select().from(identity.passkey)
  assert.ok(storedKey)
  await handle.db
    .update(identity.passkey)
    .set({ publicKey: 'AAAA' })
    .where(eq(identity.passkey.id, storedKey.id))
  const malformedKey = await authenticate()
  assert.notEqual(malformedKey.status, 200)
  assert.equal(malformedKey.overview, 401)
  await handle.db
    .update(identity.passkey)
    .set({ publicKey: storedKey.publicKey })
    .where(eq(identity.passkey.id, storedKey.id))
  const successful = await authenticate()
  assert.equal(successful.status, 200)
  assert.notEqual(successful.replay, 200)
  assert.equal(successful.overview, 200)
  assert.equal(successful.secretEchoed, false)
  const revoked = await page.evaluate(async () => {
    const response = await fetch('/v1/auth/sessions', { method: 'DELETE', credentials: 'include' })
    const overview = await fetch('/v1/demo', { credentials: 'include' })
    return { status: response.status, overview: overview.status }
  })
  assert.equal(revoked.status, 204)
  assert.equal(revoked.overview, 401)
  console.log(
    JSON.stringify({
      mode: 'local synthetic',
      registration: 'passed',
      registrationReplay: 'denied',
      tamperedOrigin: 'denied',
      malformedStoredPublicKey: 'denied',
      absentUserVerification: 'denied',
      passkeySignIn: 'passed',
      authenticationReplay: 'denied',
      revokedSession: 'denied',
      authenticator: 'Chromium virtual CTAP2; no native device or recovery claim',
    }),
  )
} finally {
  await browser.close()
  await app.close()
  await handle.close()
}
