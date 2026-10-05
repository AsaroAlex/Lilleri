/**
 * Actual local Expo web identity flows with Chromium's virtual verified authenticator.
 * Prerequisites: Node 22+, installed workspace dependencies and built API/database/client
 * packages; Playwright resolvable in the tooling environment; Chromium installed.
 *
 * Start a separate synthetic LOCAL_AUTH_MODE=1 API with a freshly generated
 * LOCAL_AUTH_SECRET supplied only in its process environment, API_PORT=3002,
 * LOCAL_AUTH_BASE_URL=http://localhost:3002 and an isolated PGLITE_PATH.
 * Export Expo with EXPO_PUBLIC_LOCAL_AUTH_MODE=1 and
 * EXPO_PUBLIC_API_URL=http://localhost:3002, then serve that export at localhost:5173.
 * Both hosts must be localhost for SameSite=Strict browser cookies. Configure the
 * server's allowedOrigins explicitly if choosing another UI port.
 *
 * Run: node tools/identity-ui-smoke.cjs [UI_ORIGIN] [API_ORIGIN]
 * Optional env: LILLERI_IDENTITY_UI_URL, LILLERI_LOCAL_AUTH_API_URL,
 * CHROMIUM_EXECUTABLE (default /usr/bin/chromium).
 * The script creates example.test synthetic profiles. It does not clean a user store,
 * log credentials/seeds/backup codes/tokens, or claim native-device verification.
 */
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { createRequire } = require('node:module')
const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const apiRequire = createRequire(join(__dirname, '../apps/api/package.json'))
const { createOTP } = apiRequire('@better-auth/utils/otp')
const { base32 } = apiRequire('@better-auth/utils/base32')
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone browser script runs outside cached Turborepo tasks.
const ui = process.argv[2] || process.env.LILLERI_IDENTITY_UI_URL || 'http://localhost:5173'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone browser script runs outside cached Turborepo tasks.
const api = process.argv[3] || process.env.LILLERI_LOCAL_AUTH_API_URL || 'http://localhost:3002'
const password = 'Local synthetic password 29!'
const checks = []
checks.push = function (value) {
  console.log(`PASS ${value}`)
  return Array.prototype.push.call(this, value)
}
function origin(value) {
  const url = new URL(value)
  if (url.protocol !== 'http:' || url.hostname !== 'localhost' || url.origin !== value) {
    throw new Error('Smoke targets must be exact HTTP localhost origins')
  }
}
async function bounded(promise) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Timed out waiting for a synthetic response')),
          30_000,
        )
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}
;(async () => {
  origin(ui)
  origin(api)
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone browser script runs outside cached Turborepo tasks.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', () => errors.push('pageerror'))
    const cdp = await context.newCDPSession(page)
    await cdp.send('WebAuthn.enable')
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    })
    await page.goto(ui)
    await page.getByRole('button', { name: 'Crea un profilo locale', exact: true }).click()
    const email = `ui-${randomUUID()}@example.test`
    await page
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill('Persona locale sintetica')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    const signup = page.getByRole('button', { name: 'Crea il profilo locale', exact: true })
    assert.equal(await signup.isDisabled(), true)
    await page
      .getByRole('checkbox', { name: 'Dichiaro di avere almeno 18 anni.', exact: true })
      .click()
    assert.equal(await signup.isDisabled(), true)
    await page
      .getByRole('checkbox', {
        name: 'Accetto le condizioni dell’ambiente locale.',
        exact: true,
      })
      .click()
    await signup.click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page.getByText(email, { exact: true }).waitFor()
    const overview = () =>
      page.evaluate(async (base) => {
        const r = await fetch(`${base}/v1/demo`, { credentials: 'include' })
        return { status: r.status, value: await r.json() }
      }, api)
    const data = await overview()
    assert.equal(data.status, 200)
    assert.equal(data.value.accounts.length, 0)
    assert.equal(data.value.transactions.length, 0)
    checks.push('signup adult/terms gates and authenticated empty financial profile')
    await page.getByRole('button', { name: 'Collegamenti e fonti', exact: true }).click()
    await page.getByRole('heading', { name: 'Collegamenti', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Collega la fonte locale', exact: true }).click()
    await page.waitForFunction(async (base) => {
      const r = await fetch(`${base}/v1/demo`, { credentials: 'include' })
      return r.ok && (await r.json()).transactions.length > 0
    }, api)
    checks.push('explicit mock connection after signup')
    await page
      .getByRole('button', { name: 'Passkey, secondo fattore e sessioni', exact: true })
      .click()
    await page.getByRole('button', { name: 'Aggiungi una passkey', exact: true }).click()
    await page.getByText('Passkey aggiunta.', { exact: true }).waitFor()
    checks.push('actual UI WebAuthn passkey enrollment with verified virtual authenticator')
    await page
      .getByLabel('Password per attivare il secondo fattore', { exact: true })
      .fill(password)
    await page.getByRole('button', { name: 'Prepara il secondo fattore', exact: true }).click()
    const uri = await page
      .getByLabel('Indirizzo di configurazione dell’app autenticatrice', { exact: true })
      .textContent()
    const encoded = new URL(uri).searchParams.get('secret')
    const secret = new TextDecoder().decode(base32.decode(encoded))
    const otp = createOTP(secret)
    const backups = (await page.getByLabel('Codici di recupero', { exact: true }).textContent())
      .trim()
      .split(/\s+/)
    assert.equal(backups.length, 10)
    const gen = () => otp.totp()
    await page
      .getByRole('checkbox', { name: 'Ho conservato i codici di recupero.', exact: true })
      .click()
    await page
      .getByLabel('Codice a 6 cifre per attivare il secondo fattore', { exact: true })
      .fill(await gen())
    await page
      .getByRole('button', { name: 'Conferma e attiva il secondo fattore', exact: true })
      .click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page
      .getByText('Secondo fattore attivato. I codici di recupero non sono più mostrati.', {
        exact: true,
      })
      .waitFor()
    assert.equal(
      await page
        .getByLabel('Indirizzo di configurazione dell’app autenticatrice', { exact: true })
        .count(),
      0,
    )
    checks.push('actual TOTP setup verification and setup secret dismissal')
    await page.getByRole('button', { name: 'Privacy e dati', exact: true }).click()
    await page.getByRole('button', { name: 'Esporta i dati', exact: true }).click()
    await page.getByRole('button', { name: 'Verifica la mia identità', exact: true }).waitFor()
    await page.getByLabel('Password per confermare l’identità', { exact: true }).fill(password)
    await page
      .getByLabel('Codice a 6 cifre per confermare l’identità', { exact: true })
      .fill(await gen())
    await page.getByRole('button', { name: 'Verifica la mia identità', exact: true }).click()
    await page.getByText(/Identità confermata fino alle/).waitFor()
    // Fresh step-up does not automatically replay the export.
    assert.equal(await page.getByText(/Esportazione pronta/).count(), 0)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Esporta i dati', exact: true }).click()
    await download
    checks.push('protected export requires actual password/TOTP step-up and a fresh user gesture')
    let releasePrincipal, principalReady
    const heldPrincipal = new Promise((resolve) => {
      releasePrincipal = resolve
    })
    const principalSeen = new Promise((resolve) => {
      principalReady = resolve
    })
    let holdPrincipalOnce = true
    await page.route('**/v1/auth/principal', async (route) => {
      if (!holdPrincipalOnce) return route.continue()
      holdPrincipalOnce = false
      const response = await route.fetch()
      principalReady()
      await heldPrincipal
      await route.fulfill({ response })
    })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await bounded(principalSeen)
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    releasePrincipal()
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).waitFor()
    await page.waitForTimeout(250)
    assert.equal(await page.getByRole('button', { name: 'Esporta i dati', exact: true }).count(), 0)
    assert.equal(await page.getByText(email, { exact: true }).count(), 0)
    await page.unroute('**/v1/auth/principal')
    checks.push('delayed identity principal after signout cannot restore the old session')
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).waitFor()
    assert.equal(await page.getByText(email, { exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Esporta i dati', exact: true }).count(), 0)
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).click()
    await page.getByText('Conferma il secondo fattore', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Esporta i dati', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Usa un codice di recupero', exact: true }).click()
    await page.getByLabel('Codice di recupero', { exact: true }).fill(backups[0])
    await page.getByRole('button', { name: 'Conferma il codice e accedi', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page.getByText(email, { exact: true }).waitFor()
    checks.push(
      'password signin gates financial UI until valid second factor, recovery-code fallback succeeds',
    )
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    await page.getByRole('button', { name: 'Accedi con una passkey', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page.getByText(email, { exact: true }).waitFor()
    checks.push('actual maintained passkey client signin')
    let releaseOverview, overviewReady
    const heldOverview = new Promise((resolve) => {
      releaseOverview = resolve
    })
    const overviewSeen = new Promise((resolve) => {
      overviewReady = resolve
    })
    let holdOnce = true
    await page.route('**/v1/demo', async (route) => {
      if (!holdOnce) return route.continue()
      holdOnce = false
      const response = await route.fetch()
      overviewReady()
      await heldOverview
      await route.fulfill({ response })
    })
    await page.getByRole('button', { name: 'Aggiorna', exact: true }).click()
    await bounded(overviewSeen)
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    releaseOverview()
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).waitFor()
    await page.waitForTimeout(250)
    assert.equal(await page.getByRole('button', { name: 'Esporta i dati', exact: true }).count(), 0)
    await page.unroute('**/v1/demo')
    checks.push('delayed financial overview after signout cannot resurrect stale financial display')
    await page.getByRole('button', { name: 'Accedi con una passkey', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page.getByText(email, { exact: true }).waitFor()
    const second = await context.newPage()
    second.on('pageerror', () => errors.push('pageerror'))
    await second.goto(ui)
    await second.getByRole('button', { name: 'Movimenti', exact: true }).click()
    await second.getByRole('button', { name: 'Regole', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    await second.getByRole('button', { name: 'Accedi con password', exact: true }).waitFor()
    assert.equal(await second.getByRole('button', { name: 'Regole', exact: true }).count(), 0)
    checks.push('cross-tab signout clears financial display while auth panel is hidden')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).click()
    await page.getByLabel('Codice a 6 cifre', { exact: true }).fill(await gen())
    await page.getByRole('button', { name: 'Conferma il codice e accedi', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page
      .getByRole('button', { name: 'Passkey, secondo fattore e sessioni', exact: true })
      .click()
    await page.getByRole('button', { name: 'Revoca questa sessione', exact: true }).click()
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Esporta i dati', exact: true }).count(), 0)
    checks.push('current session revoke clears identity and financial UI')
    await page.setViewportSize({ width: 320, height: 760 })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    checks.push('320px auth layout fits viewport')
    await page.setViewportSize({ width: 390, height: 844 })
    const createAnotherProfile = async () => {
      const nextEmail = `ui-${randomUUID()}@example.test`
      await page.getByRole('button', { name: 'Crea un profilo locale', exact: true }).click()
      await page
        .getByRole('textbox', { name: 'Nome del profilo', exact: true })
        .fill('Altro profilo')
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(nextEmail)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page
        .getByRole('checkbox', { name: 'Dichiaro di avere almeno 18 anni.', exact: true })
        .click()
      await page
        .getByRole('checkbox', {
          name: 'Accetto le condizioni dell’ambiente locale.',
          exact: true,
        })
        .click()
      await page.getByRole('button', { name: 'Crea il profilo locale', exact: true }).click()
      await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
      await page.getByText(nextEmail, { exact: true }).waitFor()
      return nextEmail
    }
    const renewedEmail = await createAnotherProfile()
    await page
      .getByRole('button', { name: 'Passkey, secondo fattore e sessioni', exact: true })
      .click()
    let releaseSetup, setupReady
    const heldSetup = new Promise((resolve) => {
      releaseSetup = resolve
    })
    const setupSeen = new Promise((resolve) => {
      setupReady = resolve
    })
    await page.route('**/api/auth/two-factor/enable', async (route) => {
      const response = await route.fetch()
      assert.equal(response.status(), 200)
      setupReady()
      await heldSetup
      await route.fulfill({ response })
    })
    await page
      .getByLabel('Password per attivare il secondo fattore', { exact: true })
      .fill(password)
    await page.getByRole('button', { name: 'Prepara il secondo fattore', exact: true }).click()
    await bounded(setupSeen)
    // Another tab renews the same principal's session while an older setup response is held.
    // Settings keeps the identity panel visible, so navigation cannot provide this response fence.
    const renewedStatus = await page.evaluate(
      async ({ base, email, password }) => {
        const response = await fetch(`${base}/api/auth/sign-in/email`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        return response.status
      },
      { base: api, email: renewedEmail, password },
    )
    assert.equal(renewedStatus, 200)
    const renewedOverview = page.waitForResponse((response) => response.url() === `${api}/v1/demo`)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await bounded(renewedOverview)
    await page.getByText(renewedEmail, { exact: true }).waitFor()
    releaseSetup()
    await page.getByRole('button', { name: 'Prepara il secondo fattore', exact: true }).waitFor()
    await page.waitForTimeout(250)
    assert.equal(
      await page
        .getByLabel('Indirizzo di configurazione dell’app autenticatrice', { exact: true })
        .count(),
      0,
    )
    assert.equal(await page.getByLabel('Codici di recupero', { exact: true }).count(), 0)
    await page.unroute('**/api/auth/two-factor/enable')
    checks.push(
      'same-principal session renewal rejects a delayed setup secret while Settings remains visible',
    )

    let releaseSettings, settingsReady
    const heldSettings = new Promise((resolve) => {
      releaseSettings = resolve
    })
    const settingsSeen = new Promise((resolve) => {
      settingsReady = resolve
    })
    let holdSettingsOnce = true
    await page.route('**/v1/settings', async (route) => {
      if (route.request().method() !== 'PATCH' || !holdSettingsOnce) return route.continue()
      holdSettingsOnce = false
      settingsReady()
      await heldSettings
      // Forward the original request/cookie after its session has actually been revoked.
      const response = await route.fetch()
      assert.equal(response.status(), 401)
      await route.fulfill({ response })
    })
    await page.getByRole('button', { name: 'Preferenze', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill('Modifica precedente')
    await page.getByRole('button', { name: 'Salva impostazioni', exact: true }).click()
    await bounded(settingsSeen)
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).waitFor()
    const erasedEmail = await createAnotherProfile()
    await page.getByRole('button', { name: 'Privacy e dati', exact: true }).click()
    const staleSettingsResponse = page.waitForResponse(
      (response) =>
        response.url() === `${api}/v1/settings` && response.request().method() === 'PATCH',
    )
    releaseSettings()
    await bounded(staleSettingsResponse)
    await page.waitForTimeout(250)
    await page.getByText(erasedEmail, { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Esporta i dati', exact: true }).count(), 1)
    assert.equal((await overview()).status, 200)
    await page.unroute('**/v1/settings')
    checks.push(
      'delayed child-panel 401 from a revoked old session cannot sign out the next principal',
    )

    await page
      .getByRole('button', { name: 'Passkey, secondo fattore e sessioni', exact: true })
      .click()
    await page.getByRole('button', { name: 'Conferma la mia identità', exact: true }).click()
    await page.getByLabel('Password per confermare l’identità', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Verifica la mia identità', exact: true }).click()
    await page.getByText(/Identità confermata fino alle/).waitFor()
    await page
      .getByLabel('Password per attivare il secondo fattore', { exact: true })
      .fill(password)
    await page.getByRole('button', { name: 'Prepara il secondo fattore', exact: true }).click()
    await page.getByLabel('Codici di recupero', { exact: true }).waitFor()
    const erasureObserver = await context.newPage()
    erasureObserver.on('pageerror', () => errors.push('pageerror'))
    await erasureObserver.goto(ui)
    await erasureObserver.getByRole('button', { name: 'Movimenti', exact: true }).click()
    await erasureObserver.getByRole('button', { name: 'Regole', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Elimina profilo e dati', exact: true }).click()
    await page.getByRole('button', { name: 'Conferma eliminazione', exact: true }).click()
    await page
      .getByRole('button', { name: 'Accedi con password', exact: true })
      .waitFor({ timeout: 5000 })
    await erasureObserver
      .getByRole('button', { name: 'Accedi con password', exact: true })
      .waitFor({ timeout: 5000 })
    assert.equal(await page.getByLabel('Codici di recupero', { exact: true }).count(), 0)
    assert.equal(
      await page
        .getByLabel('Indirizzo di configurazione dell’app autenticatrice', { exact: true })
        .count(),
      0,
    )
    assert.equal(await page.getByText(erasedEmail, { exact: true }).count(), 0)
    assert.equal(
      await erasureObserver.getByRole('button', { name: 'Regole', exact: true }).count(),
      0,
    )
    await page.getByText('Profilo e dati eliminati.', { exact: true }).waitFor()
    checks.push(
      'successful erasure immediately clears credentials, visible setup secrets and hidden-tab financial display',
    )
    await erasureObserver.close()
    await createAnotherProfile()
    const reopened = await overview()
    assert.equal(reopened.status, 200)
    assert.equal(reopened.value.accounts.length, 0)
    assert.equal(reopened.value.transactions.length, 0)
    assert.equal(await page.getByText('Profilo e dati eliminati.', { exact: true }).count(), 0)
    checks.push(
      'a fresh empty synthetic identity can be created after erasure without reloading the browser',
    )
    assert.equal(errors.length, 0)
    console.log(
      JSON.stringify({ checks: checks.length, cases: checks, jsErrors: errors.length }, null, 2),
    )
  } finally {
    await browser.close()
  }
})().catch(() => {
  console.error(
    `Local identity UI smoke failed after ${checks.length} completed cases. Raw errors are suppressed because browser call logs can contain recovery codes.`,
  )
  process.exitCode = 1
})
